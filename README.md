# Project Kit

Project Kit gets a new project ready before any code is written:

1. It interviews the user about the project.
2. It writes the docs and edits the files in the project folder.
3. It plans the work on GitHub: labels, milestones and issues.

After that, the new project just codes the issues, and it adds issues or changes docs only when the user asks for it.

## What it includes

Skills in `.claude/skills/`:

- `grill-with-docs`: interviews the user about the project. It uses `grilling` and `domain-modeling`, which also write the glossary and ADRs.
- `doc-coauthoring`: writes the docs with the user, section by section.

Templates in `templates/`: one per document, so every project's docs look the same.

Scripts in `scripts/`, a small Node.js project (the user runs `npm install` there once):

- `new-project.mjs`: creates the new project's folder with the templates and skills.
- `check-placeholders.mjs`: lists the template placeholders (like `{Project name}`) still left in the new project's docs and plan, with file and line.
- `setup-github.mjs`: a fixed script (with `zod` to check the data) that reads a project's plan (JSON) and creates it on GitHub.

## How to use it

1. In `scripts/`, the user runs `npm install` once, then `npm run new-project -- <name>`. It creates `output/<name>/` with the folders, templates and skills.
2. The user starts a Claude Code session in this repo and types `/grill-with-docs`. The user describes the project in detail and answers Claude's questions.
3. Claude fills in the docs in `output/<name>/` from the interview.
4. The user and Claude review all the docs together, until everything is clear.
5. The user creates a new, empty GitHub repo (no README, `.gitignore` or license), clones it, copies everything inside `output/<name>/` to its root (including hidden folders like `.claude/` and `.github/`), commits and pushes to `main`. Then the user tells Claude the repo as `<owner>/<repo>`.
6. Claude proposes the milestones, features, tasks and spikes. Once the user approves them, Claude writes them as JSON files in `output/<name>.backlog/`.
7. In `scripts/`, the user runs `npm run setup-github -- <name> <owner>/<repo>` once (adding `--dry-run` first shows what it will create): it checks the plan and creates the labels, milestones and issues in the new repo. It needs the GitHub CLI (`gh`) logged in.
8. The user creates a scheduled task on claude.ai for the new repo and pastes the prompt from [templates/coder-task.md](templates/coder-task.md). The user runs it with **Run now**: it codes up to 5 issues, one pull request each.
9. The user creates a second scheduled task with the settings and prompt from [templates/qa-task.md](templates/qa-task.md). It runs on its own when a pull request opens: it labels it `risk:low`, `risk:medium` or `risk:high` and comments a summary in Spanish and the details in English. It never merges.

[docs/start-checklist.md](docs/start-checklist.md) is the user's checklist: going through it makes sure every step was followed.

Claude follows [docs/documents.md](docs/documents.md), [docs/project-structure.md](docs/project-structure.md) and the templates in `templates/`.
