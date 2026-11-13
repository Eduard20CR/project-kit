#!/usr/bin/env node
// Creates a new project's labels and backlog on GitHub from JSON files.
//
// The backlog is data only: one JSON file per issue. Claude writes it with the user; this
// script never changes per project. It creates no milestones: everything stays in the backlog,
// and each sprint gets its milestone at planning time.
//
//     output/<name>.backlog/
//     └── issues/
//         ├── 01-epic.json           one file per issue
//         ├── 01-01-technical.json
//         └── 02-01-story.json
//
// Usage, from scripts/ (run `npm install` there once first):
//     npm run setup-github -- <name> <owner>/<repo> --dry-run
//     npm run setup-github -- <name> <owner>/<repo>
// It reads the backlog in output/<name>.backlog/.
//
// What it does:
// 1. Checks the whole backlog. If anything is wrong, it prints every problem and creates nothing.
// 2. With --dry-run, prints what it would create and stops. It does not call GitHub.
// 3. Otherwise, with the GitHub CLI (`gh`, logged in): creates or updates the labels, creates
//    the issues (each epic first, and each issue after the issues it depends on) and links each
//    story or technical item to its epic as a sub-issue. Issues (same title) and links that
//    already exist are skipped, so it is safe to run again.
//
// `gh` is always called with a list of arguments (never through a shell), so quotes and
// other characters in titles are safe.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// Labels the new repo gets: [name, color, description].
// Each type:* label has the description of its form in templates/issue-templates/.
// The risk:* labels are for pull requests (the QA task sets them), never for issues.
const LABELS = [
  ["type:epic", "3E4B9E", "Groups large work. It never goes into a sprint whole; its children do."],
  ["type:story", "1D76DB", "Something the user notices. Child of an epic."],
  ["type:technical", "5319E7", "Necessary work the user does not see. Child of an epic."],
  ["type:task", "C5DEF5", "A technical piece of a story or technical item. One pull request each."],
  ["type:bug", "D73A4A", "Something that broke."],
  ["type:spike", "FBCA04", "A time-boxed investigation to be able to decide."],
  ["type:retro", "BFDADC", "One per sprint, inside its milestone. Filled in when the sprint ends."],
  ["size:S", "C2E0C6", "1 or 2 pull requests."],
  ["size:M", "7BCF8F", "3 to 5 pull requests."],
  ["size:L", "2DA44E", "More; it is split before it enters a sprint."],
  ["priority:high", "B60205", "The app is useless without it."],
  ["priority:medium", "F9D0C4", "Important, but the app already works without it."],
  ["priority:low", "EDEDED", "Nice to have."],
  ["risk:low", "0E8A16", "Quick review"],
  ["risk:medium", "FBCA04", "Review the marked lines"],
  ["risk:high", "B60205", "Infra, auth, IAM, secrets, prompts or data deletion: full review"],
  ["blocked", "000000", "Waiting on an answer from the user"],
  ["manual-step", "C5DEF5", "Only the user can do this"],
];

// ---------------------------------------------------------------------------
// 1. The shape of the backlog
// ---------------------------------------------------------------------------

const text = z.string().trim().min(1, "must be a non-empty string");

// Fields of a story and a technical item, besides their form. `epic` and `depends_on` are issue ids.
const child = {
  id: text,
  epic: text,
  title: text,
  size: z.enum(["S", "M", "L"], { error: "must be S, M or L" }),
  priority: z.enum(["high", "medium", "low"], { error: "must be high, medium or low" }),
  depends_on: z.array(text).optional(),
};

// One schema per type. strictObject rejects any field that is not listed.
const issueSchema = z.discriminatedUnion(
  "type",
  [
    z.strictObject({ id: text, type: z.literal("epic"), title: text, groups: text }),
    z.strictObject({ ...child, type: z.literal("story"), story: text }),
    z.strictObject({ ...child, type: z.literal("technical"), why: text }),
  ],
  { error: "must be epic, story or technical" },
);

// The sections of each issue body, in the order of its form: [field, heading].
// "Acceptance criteria" and "Out of scope" stay empty: they are written when the story is refined.
// "Depends on" is not in the forms; it is added at the end when the issue has depends_on.
const BODY_SECTIONS = {
  epic: [["groups", "What it groups"]],
  story: [
    ["story", "User story"],
    ["acceptance", "Acceptance criteria"],
    ["out_of_scope", "Out of scope"],
    ["depends_on", "Depends on"],
  ],
  technical: [
    ["why", "Why"],
    ["depends_on", "Depends on"],
  ],
};

// ---------------------------------------------------------------------------
// 2. Read and check the backlog
// ---------------------------------------------------------------------------

/** Reads a JSON file and checks it against a schema. Returns the data, or undefined. */
function readFile(path, schema, problems) {
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    problems.push(`${path}: invalid JSON (${error.message})`);
    return undefined;
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path.length ? `'${issue.path.join(".")}' ` : "";
      problems.push(`${path}: ${field}${issue.message}`);
    }
    return undefined;
  }
  return result.data;
}

/** Returns each value that appears more than once, once. */
function findDuplicates(values) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

/** Puts each issue after its epic and the issues it depends on. Reports the first cycle. */
function sortByDependencies(issues, problems) {
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const sorted = [];
  const path = []; // the ids being visited right now, to spot a cycle

  function visit(issue) {
    if (sorted.includes(issue) || problems.length) return;
    if (path.includes(issue.id)) {
      const cycle = [...path.slice(path.indexOf(issue.id)), issue.id];
      problems.push(`${issue.file}: dependency cycle: ${cycle.join(" -> ")}`);
      return;
    }
    path.push(issue.id);
    for (const id of [issue.epic, ...(issue.depends_on ?? [])]) {
      if (id) visit(byId.get(id));
    }
    path.pop();
    sorted.push(issue);
  }

  issues.forEach(visit);
  return sorted;
}

/** Returns the issues in creation order. Exits if the backlog is wrong. */
function loadBacklog(backlogDir) {
  const problems = [];
  const issuesDir = join(backlogDir, "issues");

  const files = existsSync(issuesDir) ? readdirSync(issuesDir).filter((name) => name.endsWith(".json")).sort() : [];
  if (files.length === 0) problems.push(`${issuesDir}: no issue files (*.json) found`);

  const issues = [];
  for (const name of files) {
    const issue = readFile(join(issuesDir, name), issueSchema, problems);
    if (issue) issues.push({ ...issue, file: name });
  }

  // Checks that need more than one file.
  for (const field of ["id", "title"]) {
    for (const value of findDuplicates(issues.map((i) => i[field]))) {
      const files = issues.filter((i) => i[field] === value).map((i) => i.file);
      problems.push(`${files.join(", ")}: duplicate ${field} '${value}'`);
    }
  }

  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  for (const issue of issues) {
    if (issue.epic && byId.get(issue.epic)?.type !== "epic") {
      problems.push(`${issue.file}: 'epic' must be the id of an epic, not '${issue.epic}'`);
    }
    for (const id of issue.depends_on ?? []) {
      if (!byId.has(id)) problems.push(`${issue.file}: 'depends_on' has an unknown id '${id}'`);
      if (id === issue.id) problems.push(`${issue.file}: 'depends_on' has the issue itself`);
    }
  }

  const sorted = problems.length ? [] : sortByDependencies(issues, problems);
  if (problems.length) {
    console.error("The backlog has problems. Nothing was created.");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  return sorted;
}

// ---------------------------------------------------------------------------
// 3. Build the labels and bodies of each issue
// ---------------------------------------------------------------------------

/** The labels of an issue: its type, and the size and priority of a story or technical item. */
function labelsOf(issue) {
  if (issue.type === "epic") return ["type:epic"];
  return [`type:${issue.type}`, `size:${issue.size}`, `priority:${issue.priority}`];
}

/** Builds the Markdown body with the form headings. issueRef(id) writes another issue, e.g. "#12". */
function buildBody(issue, issueRef) {
  const sections = BODY_SECTIONS[issue.type].flatMap(([field, heading]) => {
    const value = issue[field];
    if (field === "depends_on") {
      return value?.length ? [`### ${heading}\n\n${value.map(issueRef).join(", ")}`] : [];
    }
    return [`### ${heading}\n\n${value ?? "_No response_"}`];
  });
  return `${sections.join("\n\n")}\n`;
}

// ---------------------------------------------------------------------------
// 4. Talk to GitHub through gh
// ---------------------------------------------------------------------------

/** Runs gh with a list of arguments (no shell). Sends `payload` as JSON. Returns the JSON output. */
function gh(args, payload) {
  const result = spawnSync("gh", args, {
    input: payload ? JSON.stringify(payload) : "",
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    console.error(`Error: gh ${args.join(" ")} failed.\n${result.error?.message ?? result.stderr.trim()}`);
    console.error("Fix it and run the script again: what already exists is skipped.");
    process.exit(1);
  }
  // `gh label create` prints a message, not JSON.
  const output = result.stdout.trim();
  return output.startsWith("{") || output.startsWith("[") ? JSON.parse(output) : null;
}

/** GETs every page of a GitHub list endpoint. */
function getAll(path) {
  const items = [];
  for (let page = 1; ; page++) {
    const batch = gh(["api", `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`]);
    if (batch.length === 0) return items;
    items.push(...batch);
  }
}

function post(path, payload) {
  return gh(["api", path, "--method", "POST", "--input", "-"], payload);
}

function applyBacklog(repo, issues) {
  console.log("Labels:");
  for (const [name, color, description] of LABELS) {
    gh(["label", "create", name, "--repo", repo, "--color", color, "--description", description, "--force"]);
    console.log(`  Created or updated: ${name}`);
  }

  console.log("Issues:");
  const onGitHub = new Map(); // issue id -> { number, id } on GitHub
  // This endpoint also lists pull requests; they have a "pull_request" field.
  const existingIssues = getAll(`repos/${repo}/issues?state=all`).filter((item) => !item.pull_request);
  for (const issue of issues) {
    let found = existingIssues.find((item) => item.title === issue.title);
    if (found) {
      console.log(`  Already exists: #${found.number} ${issue.title}`);
    } else {
      found = post(`repos/${repo}/issues`, {
        title: issue.title,
        body: buildBody(issue, (id) => `#${onGitHub.get(id).number}`),
        labels: labelsOf(issue),
      });
      console.log(`  Created: #${found.number} ${issue.title}`);
    }
    onGitHub.set(issue.id, { number: found.number, id: found.id });
  }

  console.log("Sub-issues:");
  for (const issue of issues.filter((i) => i.epic)) {
    const parent = onGitHub.get(issue.epic).number;
    const child = onGitHub.get(issue.id);
    const linked = getAll(`repos/${repo}/issues/${parent}/sub_issues`).some((item) => item.number === child.number);
    if (linked) {
      console.log(`  Already linked: #${child.number} in #${parent}`);
    } else {
      post(`repos/${repo}/issues/${parent}/sub_issues`, { sub_issue_id: child.id });
      console.log(`  Linked: #${child.number} in #${parent}`);
    }
  }
}

function printDryRun(repo, issues) {
  console.log(`Dry run for ${repo}: nothing is created.\n`);
  console.log(`Labels: ${LABELS.map(([name]) => name).join(", ")}\n`);
  console.log("Milestones: none (each sprint gets its milestone at planning time)\n");
  console.log("Issues, in creation order:");
  issues.forEach((issue, index) => {
    console.log(`\n[${index + 1}] ${issue.title}`);
    console.log(`    file: ${issue.file}`);
    console.log(`    labels: ${labelsOf(issue).join(", ")}`);
    if (issue.epic) console.log(`    sub-issue of: ${issues.find((i) => i.id === issue.epic).title}`);
    console.log("    body:");
    for (const line of buildBody(issue, (id) => `#<${id}>`).trimEnd().split("\n")) {
      console.log(line ? `      ${line}` : "");
    }
  });
}

// ---------------------------------------------------------------------------
// 5. Main
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const [name, repo, ...rest] = args.filter((arg) => arg !== "--dry-run");

if (!name || !repo || rest.length || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
  console.error("Usage: npm run setup-github -- <name> <owner>/<repo> [--dry-run]");
  process.exit(1);
}

const backlogDir = join(import.meta.dirname, "..", "output", `${name}.backlog`);

const issues = loadBacklog(backlogDir);
if (dryRun) {
  printDryRun(repo, issues);
} else {
  console.log(`Repository: ${repo}`);
  applyBacklog(repo, issues);
  console.log("Done.");
}
