#!/usr/bin/env node
// Creates a new project's labels, milestones and issues on GitHub from a JSON plan.
//
// The plan is data only. Claude fills it in from the plan the user approves; this script
// never changes per project.
//
//     output/<name>.plan/
//     ├── milestones.json      [{"id": "M0", "title": "M0 Foundation", "done": "..."}]
//     └── issues/
//         ├── 01-feature.json  one file per issue
//         └── 01-01-task.json
//
// Usage:
//     node scripts/setup-github.mjs output/<name>.plan <owner>/<repo> --dry-run
//     node scripts/setup-github.mjs output/<name>.plan <owner>/<repo>
//
// What it does:
// 1. Checks the whole plan. If anything is wrong, it prints every problem and creates nothing.
// 2. With --dry-run, prints what it would create and stops. It does not call GitHub.
// 3. Otherwise, with the GitHub CLI (`gh`, logged in): creates or updates the labels, creates
//    the milestones, creates the issues (features before their tasks and spikes, and every
//    issue after the issues it depends on) and links each task or spike to its feature as a
//    sub-issue. Milestones, issues (same title) and links that already exist are skipped,
//    so it is safe to run again.
//
// Only Node.js built-in modules are used, and `gh` is always called with a list of
// arguments (never through a shell), so quotes and other characters in titles are safe.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

// Labels the new repo gets: [name, color, description].
// The risk:* labels are for pull requests (the QA task sets them), never for issues.
export const LABELS = [
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

// Fields every issue file has.
const COMMON_FIELDS = ["id", "type", "milestone", "title"];

// The body of each issue type, in the order of its form in templates/issue-templates/.
// Each section is [field, heading, required]. The "feature" field fills the task's
// "Story" section with the feature's issue number. tests/ checks that these headings
// match the forms.
export const FORMS = {
  feature: [
    ["story", "User story", true],
    ["acceptance", "Acceptance criteria", true],
    ["references", "References", true],
    ["files", "Files", false],
    ["depends_on", "Depends on", false],
    ["notes", "Notes", false],
  ],
  task: [
    ["goal", "Goal", true],
    ["acceptance", "Acceptance criteria", true],
    ["references", "References", false],
    ["feature", "Story", false],
    ["files", "Files", false],
    ["depends_on", "Depends on", false],
    ["notes", "Notes", false],
  ],
  spike: [
    ["question", "Question", true],
    ["timebox", "Time box", true],
    ["acceptance", "Acceptance criteria", true],
    ["depends_on", "Depends on", false],
  ],
};

// A spike has no "Story" section in its form, but it may still belong to a feature.
const EXTRA_FIELDS = { spike: ["feature"] };

// What kind of value each field holds.
const TEXT_FIELDS = new Set(["id", "type", "milestone", "title", "story", "goal", "question", "timebox", "notes", "feature"]);
const LIST_FIELDS = new Set(["acceptance", "references", "files", "depends_on"]);

const EMPTY_SECTION = "_No response_"; // what GitHub writes for an empty form field

/** The plan has problems. Holds every problem found. */
export class PlanError extends Error {
  constructor(problems) {
    super(problems.join("\n"));
    this.problems = problems;
  }
}

// ---------------------------------------------------------------------------
// 1. Read and check the plan
// ---------------------------------------------------------------------------

function readJson(path, problems) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    problems.push(`${path}: cannot read it (${error.message})`);
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    problems.push(`${path}: invalid JSON (${error.message})`);
    return undefined;
  }
}

const isText = (value) => typeof value === "string" && value.trim() !== "";
const isTextList = (value) => Array.isArray(value) && value.every(isText);
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const has = (object, key) => Object.hasOwn(object, key);

/** Returns the valid milestones. Adds a problem for each mistake. */
function checkMilestones(path, problems) {
  const data = readJson(path, problems);
  if (data === undefined) return [];
  if (!Array.isArray(data) || data.length === 0) {
    problems.push(`${path}: must be a non-empty list of milestones`);
    return [];
  }

  const milestones = [];
  const seenIds = new Set();
  const seenTitles = new Set();
  data.forEach((milestone, index) => {
    const where = `${path}: milestone ${index + 1}`;
    if (!isObject(milestone)) {
      problems.push(`${where}: must be an object with id, title and done`);
      return;
    }
    const unknown = Object.keys(milestone).filter((key) => !["id", "title", "done"].includes(key)).sort();
    if (unknown.length) problems.push(`${where}: unknown field(s) ${unknown.join(", ")}`);
    let valid = true;
    for (const field of ["id", "title", "done"]) {
      if (!isText(milestone[field])) {
        problems.push(`${where}: '${field}' is missing or empty`);
        valid = false;
      }
    }
    if (!valid) return;
    if (seenIds.has(milestone.id)) problems.push(`${where}: duplicate id '${milestone.id}'`);
    if (seenTitles.has(milestone.title)) problems.push(`${where}: duplicate title '${milestone.title}'`);
    seenIds.add(milestone.id);
    seenTitles.add(milestone.title);
    milestones.push(milestone);
  });
  return milestones;
}

/** Checks one issue on its own. Returns false if it cannot be used at all. */
function checkIssueFields(path, issue, problems) {
  if (!isObject(issue)) {
    problems.push(`${path}: must be a JSON object`);
    return false;
  }

  const type = issue.type;
  if (!has(FORMS, type)) {
    problems.push(`${path}: unknown type ${JSON.stringify(type)} (use one of: ${Object.keys(FORMS).join(", ")})`);
    return false;
  }

  const formFields = FORMS[type].map(([field]) => field);
  const allowed = new Set([...COMMON_FIELDS, ...formFields, ...(EXTRA_FIELDS[type] ?? [])]);
  const unknown = Object.keys(issue).filter((key) => !allowed.has(key)).sort();
  if (unknown.length) problems.push(`${path}: unknown field(s) for a ${type}: ${unknown.join(", ")}`);

  const required = [...COMMON_FIELDS, ...FORMS[type].filter(([, , needed]) => needed).map(([field]) => field)];
  for (const field of required) {
    if (!has(issue, field)) problems.push(`${path}: missing required field '${field}' for a ${type}`);
  }

  for (const [field, value] of Object.entries(issue)) {
    if (TEXT_FIELDS.has(field) && !isText(value)) {
      problems.push(`${path}: '${field}' must be a non-empty string`);
    } else if (LIST_FIELDS.has(field) && !isTextList(value)) {
      problems.push(`${path}: '${field}' must be a list of non-empty strings`);
    }
  }
  if (isTextList(issue.acceptance) && issue.acceptance.length === 0) {
    problems.push(`${path}: 'acceptance' needs at least one item`);
  }
  return true;
}

/**
 * Orders the issues so each one comes after its feature and its depends_on.
 * Keeps the file-name order wherever it can. Reports a cycle as a problem.
 */
function creationOrder(issues, problems) {
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const ordered = [];
  const done = new Set();
  const visiting = [];

  function visit(id) {
    if (done.has(id)) return;
    if (visiting.includes(id)) {
      const cycle = [...visiting.slice(visiting.indexOf(id)), id];
      problems.push(`${byId.get(id).path}: dependency cycle: ${cycle.join(" -> ")}`);
      return;
    }
    visiting.push(id);
    const issue = byId.get(id);
    const before = [...(issue.fields.feature ? [issue.fields.feature] : []), ...(issue.fields.depends_on ?? [])];
    for (const other of before) {
      if (byId.has(other)) visit(other);
    }
    visiting.pop();
    done.add(id);
    ordered.push(issue);
  }

  for (const issue of issues) visit(issue.id);
  return ordered;
}

/**
 * Reads and checks the whole plan. Returns { milestones, issues } with the issues in
 * creation order. Each issue is { id, path, fields }. Throws PlanError with every problem.
 */
export function loadPlan(planDir) {
  const problems = [];
  if (!existsSync(planDir) || !statSync(planDir).isDirectory()) {
    throw new PlanError([`${planDir}: plan folder not found`]);
  }

  const milestonesFile = join(planDir, "milestones.json");
  let milestones = [];
  if (existsSync(milestonesFile)) {
    milestones = checkMilestones(milestonesFile, problems);
  } else {
    problems.push(`${milestonesFile}: file not found`);
  }
  const milestoneIds = new Set(milestones.map((milestone) => milestone.id));

  const issuesDir = join(planDir, "issues");
  const files = existsSync(issuesDir)
    ? readdirSync(issuesDir).filter((name) => name.endsWith(".json")).sort().map((name) => join(issuesDir, name))
    : [];
  if (files.length === 0) problems.push(`${issuesDir}: no issue files (*.json) found`);

  const issues = [];
  for (const path of files) {
    const fields = readJson(path, problems);
    if (fields === undefined || !checkIssueFields(path, fields, problems)) continue;
    issues.push({ id: fields.id, path, fields });
  }

  // Checks across files: duplicate ids and titles, and references to other ids.
  const byId = new Map();
  const seenTitles = new Map();
  for (const issue of issues) {
    const { id, title } = issue.fields;
    if (isText(id)) {
      if (byId.has(id)) problems.push(`${issue.path}: duplicate id '${id}' (also in ${basename(byId.get(id).path)})`);
      else byId.set(id, issue);
    }
    if (isText(title)) {
      if (seenTitles.has(title)) problems.push(`${issue.path}: duplicate title '${title}' (also in ${basename(seenTitles.get(title))})`);
      else seenTitles.set(title, issue.path);
    }
  }

  for (const issue of issues) {
    const { milestone, feature, depends_on: dependsOn, id } = issue.fields;
    if (isText(milestone) && milestones.length && !milestoneIds.has(milestone)) {
      problems.push(`${issue.path}: unknown milestone id '${milestone}'`);
    }
    if (isText(feature)) {
      if (!byId.has(feature)) {
        problems.push(`${issue.path}: 'feature' points to an unknown id '${feature}'`);
      } else if (byId.get(feature).fields.type !== "feature") {
        problems.push(`${issue.path}: 'feature' points to '${feature}', which is a ${byId.get(feature).fields.type}, not a feature`);
      }
    }
    if (isTextList(dependsOn)) {
      for (const other of dependsOn) {
        if (!byId.has(other)) problems.push(`${issue.path}: 'depends_on' points to an unknown id '${other}'`);
        else if (other === id) problems.push(`${issue.path}: 'depends_on' points to the issue itself`);
      }
    }
  }

  if (problems.length) throw new PlanError(problems);
  const ordered = creationOrder(issues, problems);
  if (problems.length) throw new PlanError(problems);
  return { milestones, issues: ordered };
}

// ---------------------------------------------------------------------------
// 2. Build the issue bodies
// ---------------------------------------------------------------------------

/**
 * Builds the Markdown body with the headings of the issue's form.
 * issueRef(id) returns how to write another issue of the plan, for example "#12".
 */
export function buildBody(fields, issueRef) {
  const sections = FORMS[fields.type].map(([field, heading]) => {
    const value = fields[field];
    let text;
    if (value === undefined || value.length === 0) text = EMPTY_SECTION;
    else if (field === "acceptance") text = value.map((item) => `- [ ] ${item}`).join("\n");
    else if (field === "references") text = value.join(", ");
    else if (field === "files") text = value.map((item) => `- ${item}`).join("\n");
    else if (field === "depends_on") text = value.map(issueRef).join(", ");
    else if (field === "feature") text = issueRef(value);
    else text = value.trim();
    return `### ${heading}\n\n${text}`;
  });
  return `${sections.join("\n\n")}\n`;
}

// ---------------------------------------------------------------------------
// 3. Talk to GitHub through gh
// ---------------------------------------------------------------------------

class GhError extends Error {}

class GitHub {
  constructor(repo) {
    this.repo = repo;
  }

  /** Runs gh with a list of arguments (no shell). Returns its output as JSON, or null. */
  run(args, payload) {
    const result = spawnSync("gh", args, {
      input: payload === undefined ? "" : JSON.stringify(payload),
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.error) throw new GhError(`gh ${args.join(" ")} failed: ${result.error.message}`);
    if (result.status !== 0) throw new GhError(`gh ${args.join(" ")} failed:\n${result.stderr.trim()}`);
    const output = result.stdout.trim();
    return output.startsWith("{") || output.startsWith("[") ? JSON.parse(output) : null;
  }

  /** GETs every page of a list endpoint. */
  getAll(path) {
    const items = [];
    const separator = path.includes("?") ? "&" : "?";
    for (let page = 1; ; page += 1) {
      const batch = this.run(["api", `${path}${separator}per_page=100&page=${page}`]);
      if (!batch || batch.length === 0) return items;
      items.push(...batch);
    }
  }

  post(path, payload) {
    return this.run(["api", path, "--method", "POST", "--input", "-"], payload);
  }

  setLabel(name, color, description) {
    this.run(["label", "create", name, "--repo", this.repo, "--color", color, "--description", description, "--force"]);
  }

  milestones() {
    return this.getAll(`repos/${this.repo}/milestones?state=all`);
  }

  createMilestone(title, description) {
    return this.post(`repos/${this.repo}/milestones`, { title, description });
  }

  issues() {
    // This endpoint also lists pull requests; they have a "pull_request" key.
    return this.getAll(`repos/${this.repo}/issues?state=all`).filter((item) => !has(item, "pull_request"));
  }

  createIssue(title, body, milestone, label) {
    return this.post(`repos/${this.repo}/issues`, { title, body, milestone, labels: [label] });
  }

  subIssueNumbers(parentNumber) {
    return new Set(this.getAll(`repos/${this.repo}/issues/${parentNumber}/sub_issues`).map((item) => item.number));
  }

  addSubIssue(parentNumber, childId) {
    this.post(`repos/${this.repo}/issues/${parentNumber}/sub_issues`, { sub_issue_id: childId });
  }
}

/** Creates everything that does not exist yet. Prints one line per step. */
function applyPlan(github, milestones, issues) {
  console.log("Labels:");
  for (const [name, color, description] of LABELS) {
    github.setLabel(name, color, description);
    console.log(`  Created or updated label: ${name}`);
  }

  console.log("Milestones:");
  const existingMilestones = new Map(github.milestones().map((milestone) => [milestone.title, milestone.number]));
  const milestoneNumbers = new Map();
  for (const milestone of milestones) {
    if (existingMilestones.has(milestone.title)) {
      console.log(`  Already exists: ${milestone.title}`);
      milestoneNumbers.set(milestone.id, existingMilestones.get(milestone.title));
    } else {
      const created = github.createMilestone(milestone.title, `Done when: ${milestone.done}`);
      milestoneNumbers.set(milestone.id, created.number);
      console.log(`  Created: ${milestone.title}`);
    }
  }

  console.log("Issues:");
  const existingIssues = new Map();
  for (const item of github.issues()) {
    if (!existingIssues.has(item.title)) existingIssues.set(item.title, item);
  }
  const onGitHub = new Map(); // plan id -> { number, id }
  for (const issue of issues) {
    const { title, type, milestone } = issue.fields;
    let found = existingIssues.get(title);
    if (found) {
      console.log(`  Already exists: #${found.number} ${title}`);
    } else {
      const body = buildBody(issue.fields, (other) => `#${onGitHub.get(other).number}`);
      found = github.createIssue(title, body, milestoneNumbers.get(milestone), `type:${type}`);
      console.log(`  Created: #${found.number} ${title}`);
    }
    onGitHub.set(issue.id, { number: found.number, id: found.id });
  }

  console.log("Sub-issues:");
  const linked = new Map();
  for (const issue of issues) {
    if (!issue.fields.feature) continue;
    const parent = onGitHub.get(issue.fields.feature).number;
    const child = onGitHub.get(issue.id);
    if (!linked.has(parent)) linked.set(parent, github.subIssueNumbers(parent));
    if (linked.get(parent).has(child.number)) {
      console.log(`  Already linked: #${child.number} in #${parent}`);
    } else {
      github.addSubIssue(parent, child.id);
      linked.get(parent).add(child.number);
      console.log(`  Linked: #${child.number} in #${parent}`);
    }
  }
}

function printDryRun(repo, milestones, issues) {
  const titles = new Map(issues.map((issue) => [issue.id, issue.fields.title]));
  const milestoneTitles = new Map(milestones.map((milestone) => [milestone.id, milestone.title]));
  console.log(`Dry run for ${repo}: nothing is created.\n`);
  console.log("Labels (created or updated):");
  for (const [name] of LABELS) console.log(`  ${name}`);
  console.log("\nMilestones:");
  for (const milestone of milestones) console.log(`  ${milestone.title}  (Done when: ${milestone.done})`);
  console.log("\nIssues, in creation order:");
  issues.forEach((issue, index) => {
    const { title, type, milestone, feature } = issue.fields;
    console.log(`\n[${index + 1}] ${title}`);
    console.log(`    file: ${basename(issue.path)}`);
    console.log(`    label: type:${type}`);
    console.log(`    milestone: ${milestoneTitles.get(milestone)}`);
    if (feature) console.log(`    sub-issue of: ${titles.get(feature)}`);
    console.log("    body:");
    for (const line of buildBody(issue.fields, (other) => `#<${other}>`).split("\n").slice(0, -1)) {
      console.log(line ? `      ${line}` : "");
    }
  });
}

function hasGh() {
  const result = spawnSync("gh", ["--version"], { encoding: "utf8" });
  return !result.error && result.status === 0;
}

export function main(argv) {
  const dryRun = argv.includes("--dry-run");
  const positional = argv.filter((arg) => arg !== "--dry-run");
  if (positional.length !== 2 || positional.some((arg) => arg.startsWith("-"))) {
    console.error("Usage: node scripts/setup-github.mjs <plan folder> <owner>/<repo> [--dry-run]");
    return 1;
  }
  const [planDir, repo] = positional;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    console.error(`Error: '${repo}' is not <owner>/<repo>.`);
    return 1;
  }

  let plan;
  try {
    plan = loadPlan(planDir);
  } catch (error) {
    if (!(error instanceof PlanError)) throw error;
    console.error("The plan has problems. Nothing was created.");
    for (const problem of error.problems) console.error(`  - ${problem}`);
    return 1;
  }

  if (dryRun) {
    printDryRun(repo, plan.milestones, plan.issues);
    return 0;
  }

  if (!hasGh()) {
    console.error("Error: the GitHub CLI (gh) is not installed. Nothing was created.");
    return 1;
  }

  console.log(`Repository: ${repo}`);
  try {
    applyPlan(new GitHub(repo), plan.milestones, plan.issues);
  } catch (error) {
    if (!(error instanceof GhError)) throw error;
    console.error(`Error: ${error.message}`);
    console.error("Fix it and run the script again: what already exists is skipped.");
    return 1;
  }
  console.log("Done.");
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
