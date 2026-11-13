#!/usr/bin/env node
// Creates output/<name>/ with the folder structure, the templates in place and the skills,
// and output/<name>.backlog/ with an example plan.
// Usage, from scripts/: npm run new-project -- <name>

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [name, ...rest] = process.argv.slice(2);
if (!name || rest.length) {
  console.error("Usage: npm run new-project -- <name>");
  process.exit(1);
}

const kit = join(import.meta.dirname, "..");
const target = join(kit, "output", name);

if (existsSync(target)) {
  console.error(`Error: ${target} already exists.`);
  process.exit(1);
}

/** Copies a file or folder from the kit to the new project, creating the parent folders. */
function copy(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}

// Folders from docs/project-structure.md, each with a .gitkeep so git keeps it.
// Optional folders (shared/, db/) and the app folders inside apps/ are added later,
// once the interview says they are needed.
const folders = [
  ".github/workflows",
  "apps",
  "infra/bootstrap",
  "infra/modules",
  "infra/environments",
  "scripts",
  "docs/adr",
];
for (const folder of folders) {
  mkdirSync(join(target, folder), { recursive: true });
  writeFileSync(join(target, folder, ".gitkeep"), "");
}

// Each template (file or folder) goes to its place in the new project: [template, destination].
const templates = [
  ["readme.md", "README.md"],
  ["claude-md.md", ".claude/CLAUDE.md"],
  ["architecture.md", "docs/architecture.md"],
  ["data-model.md", "docs/data-model.md"],
  ["non-functional-requirements.md", "docs/non-functional-requirements.md"],
  ["adr.md", "docs/adr/0000-template.md"],
  // GitHub issue forms, so every issue has the same fields.
  ["issue-templates", ".github/ISSUE_TEMPLATE"],
  // Pull request template: Spanish overview on top, English detail below.
  ["pull-request.md", ".github/pull_request_template.md"],
];
for (const [template, destination] of templates) {
  copy(join(kit, "templates", template), join(target, destination));
}

// The skills travel with the project, with the lock file so they can be updated
// later with `npx skills update`.
copy(join(kit, ".claude", "skills"), join(target, ".claude", "skills"));
copy(join(kit, "skills-lock.json"), join(target, "skills-lock.json"));

// The plan for the new repo (milestones and issues), as data only. It stays in the kit,
// outside output/<name>/. Claude replaces the example files with the plan the user
// approves, and scripts/setup-github.mjs creates it on GitHub.
copy(join(kit, "templates", "backlog"), join(kit, "output", `${name}.backlog`));

console.log(`Created ${target}`);
