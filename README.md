# Project Kit

Project Kit gets a new project ready before any code is written:

1. It interviews you about the project.
2. It writes the docs and creates the project folder.
3. It plans the work on GitHub: labels, milestones and issues.

After that, the new project just codes the issues. It adds an issue or changes a doc only when you ask for it.

## What it includes

Skills in `.claude/skills/`:

- `grill-with-docs`: interviews you about the project. It uses `grilling` and `domain-modeling`, which also write the glossary and ADRs.
- `doc-coauthoring`: writes the docs with you, section by section.

Templates in `templates/`: one per document, so every project's docs look the same.

Scripts in `scripts/`, a small Node.js project (run `npm install` there once):

- `new-project.mjs`: creates the new project's folder with the templates and skills.
- `check-placeholders.mjs`: lists the template placeholders (like `{Project name}`) still left in the new project's docs and plan, with file and line.
- `setup-github.mjs`: a fixed script (with `zod` to check the data) that reads a project's plan (JSON) and creates it on GitHub.

## How to use it

1. In `scripts/`, run `npm install` once, then `npm run new-project -- <name>`. It creates `output/<name>/` with the folders, templates and skills.
2. Start a Claude Code session in this repo and run `/grill-with-docs`. Describe the project and answer Claude's questions.
3. Claude fills in the docs in `output/<name>/` from the interview.
4. You and Claude review all the docs together, until everything is clear.
5. Create the new GitHub repo, copy the contents of `output/<name>/` to its root and push it.
6. Claude proposes the milestones, stories and tasks. Once you approve them, Claude writes them as JSON files in `output/<name>.plan/`.
7. In `scripts/`, you run `npm run setup-github -- <name> <owner>/<repo>` once (add `--dry-run` first to see what it will create): it checks the plan and creates the labels, milestones and issues in the new repo. It needs the GitHub CLI (`gh`) logged in.
8. Create a scheduled task on claude.ai for the new repo and paste the prompt from [templates/coder-task.md](templates/coder-task.md). Run it with **Run now**: it codes up to 5 issues, one pull request each.
9. Create a second scheduled task with the settings and prompt from [templates/qa-task.md](templates/qa-task.md). It runs on its own when a pull request opens: it labels it `risk:low`, `risk:medium` or `risk:high` and comments a summary in Spanish and the details in English. It never merges.

[docs/start-checklist.md](docs/start-checklist.md) is your checklist: go through it to be sure you followed every step.

Claude follows [docs/documents.md](docs/documents.md), [docs/project-structure.md](docs/project-structure.md) and the templates in `templates/`.
