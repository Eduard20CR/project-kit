# Project Kit

Project Kit does all the work of a new project before any code is written: the interview, the docs, the zip and the plan on GitHub (labels, milestones and issues). After that, the new project codes the issues, and creates a new issue or changes a doc only when the user explicitly asks for it.

## What it includes

Skills in `.claude/skills/`:

- `grill-with-docs`: interviews you about the project. It uses `grilling` and `domain-modeling`, which also write the glossary and ADRs.
- `doc-coauthoring`: writes the docs with you, section by section.
- `skill-creator`: creates the skills the new project needs.

Templates in `templates/`: one per document, so every project's docs look the same.

`scripts/setup_github.py`: a fixed, tested script that reads a project's plan (JSON) and creates it on GitHub. Its tests run with `python3 -m unittest discover -s tests`.

## How to use it

1. Open this repo in Claude Code and tell Claude the name of the new project.
2. Claude runs `scripts/new-project.sh <name>`, which creates `output/<name>/` with the folders, templates and skills.
3. Run `/grill-with-docs` and describe the project. Claude fills in the docs from the interview.
4. Claude runs `scripts/zip-project.sh <name>` and gives you `output/<name>.zip`.
5. Create the new GitHub repo, unzip it at its root and push it.
6. Back in this repo, Claude proposes the milestones, stories and tasks. Once you approve them, Claude writes them as JSON files in `output/<name>.plan/`. You run `python3 scripts/setup_github.py output/<name>.plan <owner>/<repo>` once (add `--dry-run` first to see what it will create): it checks the plan and creates the labels, milestones and issues in the new repo. It needs the GitHub CLI (`gh`) logged in.
7. Create a scheduled task on claude.ai for the new repo and paste the prompt from [templates/coder-task.md](templates/coder-task.md). Run it with **Run now**: it codes up to 5 issues, one pull request each.
8. Create a second scheduled task with the settings and prompt from [templates/qa-task.md](templates/qa-task.md). It runs on its own when a pull request opens: it labels it `risk:low`, `risk:medium` or `risk:high` and comments a summary in Spanish and the details in English. It never merges.

Claude follows [docs/documents.md](docs/documents.md), [docs/project-structure.md](docs/project-structure.md) and the templates in `templates/`.
