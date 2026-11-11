#!/usr/bin/env node
// Creates a new project's labels, milestones and issues on GitHub from a JSON plan.
//
// The plan is data only. Claude fills it in from the plan the user approves; this script
// never changes per project.
//
//     output/<name>.plan/
//     ├── milestones.json      [{ "id": "M0", "title": "M0 Foundation", "done": "..." }]
//     └── issues/
//         ├── 01-feature.json  one file per issue
//         └── 01-01-task.json
//
// Usage (run `npm install` once in the kit first):
//     node scripts/setup-github.mjs output/<name>.plan <owner>/<repo> --dry-run
//     node scripts/setup-github.mjs output/<name>.plan <owner>/<repo>
//
// What it does:
// 1. Checks the whole plan. If anything is wrong, it prints every problem and creates nothing.
// 2. With --dry-run, prints what it would create and stops. It does not call GitHub.
// 3. Otherwise, with the GitHub CLI (`gh`, logged in): creates or updates the labels, creates
//    the milestones, creates the issues (each one after its feature and the issues it depends
//    on) and links each task or spike to its feature as a sub-issue. Milestones, issues (same
//    title) and links that already exist are skipped, so it is safe to run again.
//
// `gh` is always called with a list of arguments (never through a shell), so quotes and
// other characters in titles are safe.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { z } from "zod";

// Labels the new repo gets: [name, color, description].
// The risk:* labels are for pull requests (the QA task sets them), never for issues.
const LABELS = [
  ["type:feature", "1D76DB", "User story"],
  ["type:task", "5319E7", "Technical task, one pull request"],
  ["type:bug", "D73A4A", "Something does not work as the docs say"],
  ["type:spike", "FBCA04", "Time-boxed investigation"],
  ["risk:low", "0E8A16", "Quick review"],
  ["risk:medium", "FBCA04", "Review the marked lines"],
  ["risk:high", "B60205", "Infra, auth, IAM, secrets, prompts or data deletion: full review"],
  ["blocked", "000000", "Waiting on an answer from the user"],
  ["manual-step", "C5DEF5", "Only the user can do this"],
];

// ---------------------------------------------------------------------------
// 1. The shape of the plan
// ---------------------------------------------------------------------------

const text = z.string().trim().min(1, "must be a non-empty string");
const textList = z.array(text);

// strictObject rejects any field that is not listed.
const milestonesSchema = z
  .array(z.strictObject({ id: text, title: text, done: text }))
  .min(1, "must list at least one milestone");

// Fields every issue has. `milestone` is a milestone id; `feature` and `depends_on` are issue ids.
const common = { id: text, milestone: text, title: text };

// One schema per issue form in templates/issue-templates/.
const issueSchema = z.discriminatedUnion(
  "type",
  [
    z.strictObject({
      ...common,
      type: z.literal("feature"),
      story: text,
      acceptance: textList.min(1, "needs at least one item"),
      references: textList,
      files: textList.optional(),
      depends_on: textList.optional(),
      notes: text.optional(),
    }),
    z.strictObject({
      ...common,
      type: z.literal("task"),
      feature: text.optional(),
      goal: text,
      acceptance: textList.min(1, "needs at least one item"),
      references: textList.optional(),
      files: textList.optional(),
      depends_on: textList.optional(),
      notes: text.optional(),
    }),
    z.strictObject({
      ...common,
      type: z.literal("spike"),
      feature: text.optional(),
      question: text,
      timebox: text,
      acceptance: textList.min(1, "needs at least one item"),
      depends_on: textList.optional(),
    }),
  ],
  { error: "must be feature, task or spike" },
);

// The sections of each issue body, in the order of its form: [field, heading].
// A task's "Story" section shows the issue number of its feature.
const BODY_SECTIONS = {
  feature: [
    ["story", "User story"],
    ["acceptance", "Acceptance criteria"],
    ["references", "References"],
    ["files", "Files"],
    ["depends_on", "Depends on"],
    ["notes", "Notes"],
  ],
  task: [
    ["goal", "Goal"],
    ["acceptance", "Acceptance criteria"],
    ["references", "References"],
    ["feature", "Story"],
    ["files", "Files"],
    ["depends_on", "Depends on"],
    ["notes", "Notes"],
  ],
  spike: [
    ["question", "Question"],
    ["timebox", "Time box"],
    ["acceptance", "Acceptance criteria"],
    ["depends_on", "Depends on"],
  ],
};

// ---------------------------------------------------------------------------
// 2. Read and check the plan
// ---------------------------------------------------------------------------

/** Reads a JSON file and checks it against a schema. Returns the data, or undefined. */
function readFile(path, schema, problems) {
  if (!existsSync(path)) {
    problems.push(`${path}: file not found`);
    return undefined;
  }
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

/** Puts each issue after its feature and the issues it depends on. Reports the first cycle. */
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
    for (const id of [issue.feature, ...(issue.depends_on ?? [])]) {
      if (id) visit(byId.get(id));
    }
    path.pop();
    sorted.push(issue);
  }

  issues.forEach(visit);
  return sorted;
}

/** Returns { milestones, issues }, with the issues in creation order. Exits if the plan is wrong. */
function loadPlan(planDir) {
  const problems = [];
  const issuesDir = join(planDir, "issues");

  const milestones = readFile(join(planDir, "milestones.json"), milestonesSchema, problems) ?? [];
  const files = existsSync(issuesDir) ? readdirSync(issuesDir).filter((name) => name.endsWith(".json")).sort() : [];
  if (files.length === 0) problems.push(`${issuesDir}: no issue files (*.json) found`);

  const issues = [];
  for (const name of files) {
    const issue = readFile(join(issuesDir, name), issueSchema, problems);
    if (issue) issues.push({ ...issue, file: name });
  }

  // Checks that need more than one file.
  for (const field of ["id", "title"]) {
    for (const value of findDuplicates(milestones.map((m) => m[field]))) {
      problems.push(`milestones.json: duplicate ${field} '${value}'`);
    }
    for (const value of findDuplicates(issues.map((i) => i[field]))) {
      const files = issues.filter((i) => i[field] === value).map((i) => i.file);
      problems.push(`${files.join(", ")}: duplicate ${field} '${value}'`);
    }
  }

  const milestoneIds = new Set(milestones.map((m) => m.id));
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  for (const issue of issues) {
    if (milestones.length && !milestoneIds.has(issue.milestone)) {
      problems.push(`${issue.file}: unknown milestone id '${issue.milestone}'`);
    }
    if (issue.feature && byId.get(issue.feature)?.type !== "feature") {
      problems.push(`${issue.file}: 'feature' must be the id of a feature, not '${issue.feature}'`);
    }
    for (const id of issue.depends_on ?? []) {
      if (!byId.has(id)) problems.push(`${issue.file}: 'depends_on' has an unknown id '${id}'`);
      if (id === issue.id) problems.push(`${issue.file}: 'depends_on' has the issue itself`);
    }
  }

  const sorted = problems.length ? [] : sortByDependencies(issues, problems);
  if (problems.length) {
    console.error("The plan has problems. Nothing was created.");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  return { milestones, issues: sorted };
}

// ---------------------------------------------------------------------------
// 3. Build the issue bodies
// ---------------------------------------------------------------------------

/** Builds the Markdown body with the form headings. issueRef(id) writes another issue, e.g. "#12". */
function buildBody(issue, issueRef) {
  const format = {
    acceptance: (items) => items.map((item) => `- [ ] ${item}`).join("\n"),
    references: (items) => items.join(", "),
    files: (items) => items.map((item) => `- ${item}`).join("\n"),
    depends_on: (ids) => ids.map(issueRef).join(", "),
    feature: (id) => issueRef(id),
  };
  const sections = BODY_SECTIONS[issue.type].map(([field, heading]) => {
    const value = issue[field];
    const empty = value === undefined || value.length === 0;
    const content = empty ? "_No response_" : (format[field] ?? String)(value);
    return `### ${heading}\n\n${content}`;
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

function applyPlan(repo, milestones, issues) {
  console.log("Labels:");
  for (const [name, color, description] of LABELS) {
    gh(["label", "create", name, "--repo", repo, "--color", color, "--description", description, "--force"]);
    console.log(`  Created or updated: ${name}`);
  }

  console.log("Milestones:");
  const milestoneNumbers = new Map(); // milestone id -> GitHub number
  const existingMilestones = getAll(`repos/${repo}/milestones?state=all`);
  for (const milestone of milestones) {
    let found = existingMilestones.find((m) => m.title === milestone.title);
    if (found) {
      console.log(`  Already exists: ${milestone.title}`);
    } else {
      found = post(`repos/${repo}/milestones`, { title: milestone.title, description: `Done when: ${milestone.done}` });
      console.log(`  Created: ${milestone.title}`);
    }
    milestoneNumbers.set(milestone.id, found.number);
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
        milestone: milestoneNumbers.get(issue.milestone),
        labels: [`type:${issue.type}`],
      });
      console.log(`  Created: #${found.number} ${issue.title}`);
    }
    onGitHub.set(issue.id, { number: found.number, id: found.id });
  }

  console.log("Sub-issues:");
  for (const issue of issues.filter((i) => i.feature)) {
    const parent = onGitHub.get(issue.feature).number;
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

function printDryRun(repo, milestones, issues) {
  console.log(`Dry run for ${repo}: nothing is created.\n`);
  console.log(`Labels: ${LABELS.map(([name]) => name).join(", ")}\n`);
  console.log("Milestones:");
  for (const milestone of milestones) console.log(`  ${milestone.title} (Done when: ${milestone.done})`);
  console.log("\nIssues, in creation order:");
  issues.forEach((issue, index) => {
    console.log(`\n[${index + 1}] ${issue.title}`);
    console.log(`    file: ${issue.file}`);
    console.log(`    label: type:${issue.type}`);
    console.log(`    milestone: ${milestones.find((m) => m.id === issue.milestone).title}`);
    if (issue.feature) console.log(`    sub-issue of: ${issues.find((i) => i.id === issue.feature).title}`);
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
const [planDir, repo, ...rest] = args.filter((arg) => arg !== "--dry-run");

if (!planDir || !repo || rest.length || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
  console.error("Usage: node scripts/setup-github.mjs <plan folder> <owner>/<repo> [--dry-run]");
  process.exit(1);
}

const { milestones, issues } = loadPlan(planDir);
if (dryRun) {
  printDryRun(repo, milestones, issues);
} else {
  console.log(`Repository: ${repo}`);
  applyPlan(repo, milestones, issues);
  console.log("Done.");
}
