# CLAUDE.md — Project Kit

This repo does all the work of a new project before any code is written: the interview, the docs, the zip and the plan on GitHub (labels, milestones and issues). The new project only codes the issues.
`docs/documents.md` lists what the kit produces for each new project.

## Language

- Everything in this repo is in English: files, commit messages, branches and pull requests.

## How to document a new project

1. Run `scripts/new-project.sh <name>`. It creates `output/<name>/` with the folder structure, the templates in place and the skills.
2. Run `/grill-with-docs` to interview Oscar about the project. It uses the `grilling` and `domain-modeling` skills.
3. Fill in the files in `output/<name>/` from the interview, with the `doc-coauthoring` skill. Remove the template placeholders.
4. Use the `skill-creator` skill if the new project needs its own skills.
5. Run `scripts/zip-project.sh <name>` and give Oscar `output/<name>.zip`. He creates the new GitHub repo, unzips it at its root and pushes it.
6. Plan the work, from this repo, on the new GitHub repo:
   1. Propose the plan to Oscar: milestones as vertical slices with no due dates, each with its "done", and the stories and tasks of each one. M0 is the foundation (repo, CI, smoke test); M1 is the thinnest slice that works end to end, checked with `docs/test-cases.md`. Create nothing on GitHub yet.
   2. When Oscar approves, fill in `output/<name>.setup-github.sh`: the `MILESTONES` list and one `create_issue` call per story and task, linking each task to its story with `link_sub_issue`. Write each issue body in `output/<name>.issues/` with the headings of the matching form in `templates/issue-templates/`. Give each issue a `type:*` label. Do not put `risk:*` labels on issues: the QA task puts them on pull requests.
   3. Oscar runs `output/<name>.setup-github.sh <owner>/<repo>` once. It creates the labels, the milestones and the issues. Do not create issues with the GitHub connector.

The new project never writes its own requirements, docs or issues: the kit does all of that. The new project only codes the issues.
All files of a new project go in `output/<name>/`, never anywhere else in this repo. `output/` is in `.gitignore`.
Follow `docs/documents.md` and `docs/project-structure.md`. All docs are in English.
A kit template in `templates/` wins over a skill's own format (for example, `domain-modeling`'s ADR format).

## How to work

- Oscar decides. Propose options with your recommendation, but do not add files, skills or decisions without his explicit OK.
- Work in small steps and explain each one in simple words.
- Do not state that something is true without checking it. If you did not verify it, say so.
- Every change to this repo goes through a pull request. Never push to `main` and never merge.
