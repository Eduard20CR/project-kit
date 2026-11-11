# CLAUDE.md — Project Kit

This repo is a toolbox for writing the documentation of a new project before any code is written.
`docs/documents.md` lists what the kit produces for each new project.

## Language

- Everything in this repo is in English: files, commit messages, branches and pull requests.

## How to document a new project

1. Run `scripts/new-project.sh <name>`. It creates `output/<name>/` with the folder structure, the templates in place and the skills.
2. Run `/grill-with-docs` to interview Oscar about the project. It uses the `grilling` and `domain-modeling` skills.
3. Fill in the files in `output/<name>/` from the interview, with the `doc-coauthoring` skill. Remove the template placeholders.
4. Use the `skill-creator` skill if the new project needs its own skills.
5. Run `scripts/zip-project.sh <name>` and give Oscar `output/<name>.zip`. He unzips it at the root of the new repo.

All files of a new project go in `output/<name>/`, never anywhere else in this repo. `output/` is in `.gitignore`.
Follow `docs/documents.md` and `docs/project-structure.md`. All docs are in English.
A kit template in `templates/` wins over a skill's own format (for example, `domain-modeling`'s ADR format).

## How to work

- Oscar decides. Propose options with your recommendation, but do not add files, skills or decisions without his explicit OK.
- Work in small steps and explain each one in simple words.
- Do not state that something is true without checking it. If you did not verify it, say so.
- Every change to this repo goes through a pull request. Never push to `main` and never merge.
