#!/usr/bin/env bash
# Creates output/<name>/ with the folder structure, the templates in place and the skills.
# Usage: scripts/new-project.sh <project-name>
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: scripts/new-project.sh <project-name>" >&2
  exit 1
fi

name="$1"
kit_root="$(cd "$(dirname "$0")/.." && pwd)"
target="$kit_root/output/$name"

if [ -e "$target" ]; then
  echo "Error: $target already exists." >&2
  exit 1
fi

# Folders from docs/project-structure.md. Optional folders (shared/, db/) and the
# app folders inside apps/ are added later, once the interview says they are needed.
folders=(
  .github/workflows
  apps
  infra/bootstrap
  infra/modules
  infra/environments
  scripts
  docs/requirements
  docs/adr
  docs/spikes
)
for folder in "${folders[@]}"; do
  mkdir -p "$target/$folder"
  touch "$target/$folder/.gitkeep"
done

# Each template goes to its place in the new project.
copy_template() {
  local template="$1"
  local destination="$2"
  mkdir -p "$(dirname "$target/$destination")"
  cp "$kit_root/templates/$template" "$target/$destination"
}
copy_template readme.md                      README.md
copy_template claude-md.md                   .claude/CLAUDE.md
copy_template architecture.md                docs/architecture.md
copy_template data-model.md                  docs/data-model.md
copy_template functional-requirements.md     docs/requirements/functional.md
copy_template non-functional-requirements.md docs/requirements/non-functional.md
copy_template test-cases.md                  docs/test-cases.md
copy_template adr.md                         docs/adr/0000-template.md

# Script that creates the labels, milestones and issues in the new repo. It stays in the kit
# (outside the zip); Claude fills it in from the plan Oscar approves.
cp "$kit_root/templates/setup-github.sh" "$kit_root/output/$name.setup-github.sh"
chmod +x "$kit_root/output/$name.setup-github.sh"
mkdir -p "$kit_root/output/$name.issues"

# GitHub issue forms, so every issue has the same fields.
mkdir -p "$target/.github/ISSUE_TEMPLATE"
cp "$kit_root"/templates/issue-templates/*.yml "$target/.github/ISSUE_TEMPLATE/"

# Pull request template: Spanish overview on top, English detail below.
cp "$kit_root/templates/pull-request.md" "$target/.github/pull_request_template.md"

# The skills travel with the project, with the lock file so they can be updated
# later with `npx skills update`.
cp -R "$kit_root/.claude/skills" "$target/.claude/skills"
cp "$kit_root/skills-lock.json" "$target/skills-lock.json"

echo "Created $target"
