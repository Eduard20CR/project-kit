# Project Kit

Project Kit does all the work of a new project before any code is written: the interview, the docs, the zip and the plan on GitHub (labels, milestones and issues). The new project only codes the issues.

## What it includes

Skills in `.claude/skills/`:

- `grill-with-docs`: interviews you about the project. It uses `grilling` and `domain-modeling`, which also write the glossary and ADRs.
- `doc-coauthoring`: writes the docs with you, section by section.
- `skill-creator`: creates the skills the new project needs.

Templates in `templates/`: one per document, so every project's docs look the same.

## How to use it

1. Open this repo in Claude Code and tell Claude the name of the new project.
2. Claude runs `scripts/new-project.sh <name>`, which creates `output/<name>/` with the folders, templates and skills.
3. Run `/grill-with-docs` and describe the project. Claude fills in the docs from the interview.
4. Claude runs `scripts/zip-project.sh <name>` and gives you `output/<name>.zip`.
5. Create the new GitHub repo, unzip it at its root and push it.
6. Back in this repo, Claude proposes the milestones, stories and tasks and writes them into `output/<name>.setup-github.sh`. You approve and run it once with `<owner>/<repo>`: it creates the labels, milestones and issues in the new repo.
7. Create a scheduled task on claude.ai for the new repo and paste the prompt from [templates/coder-task.md](templates/coder-task.md). Run it with **Run now**: it codes up to 5 issues, one pull request each.

Claude follows [docs/documents.md](docs/documents.md), [docs/project-structure.md](docs/project-structure.md) and the templates in `templates/`.
