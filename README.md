# Project Kit

Project Kit is a toolbox for writing the documentation of a new project before any code is written.

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
5. Unzip it at the root of the new repo.

Claude follows [docs/documents.md](docs/documents.md), [docs/project-structure.md](docs/project-structure.md) and the templates in `templates/`.
