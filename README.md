# Project Kit

Project Kit is a toolbox for writing the documentation of a new project before any code is written.

## What it includes

Skills in `.claude/skills/`:

- `grill-with-docs`: interviews you about the project. It uses `grilling` and `domain-modeling`, which also write the glossary and ADRs.
- `doc-coauthoring`: writes the docs with you, section by section.
- `skill-creator`: creates the skills the new project needs.

Templates in `templates/`: one per document, so every project's docs look the same.

## How to use it

1. Open this repo in Claude Code.
2. Run `/grill-with-docs` and describe the new project.
3. Ask Claude to write the docs with `doc-coauthoring`.

Claude follows [docs/documents.md](docs/documents.md) and [docs/project-structure.md](docs/project-structure.md).
