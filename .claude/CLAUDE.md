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
5. Run `scripts/zip-project.sh <name>` and give Oscar `output/<name>.zip`. He creates the new GitHub repo, unzips it at its root and pushes it.
6. Plan the work, from this repo, on the new GitHub repo:
   1. Propose the plan to Oscar: milestones as vertical slices with no due dates, each with its "done", and the stories and tasks of each one. M0 is the foundation (repo, CI, smoke test); M1 is the thinnest slice that works end to end, checked with `docs/test-cases.md`. Create nothing on GitHub yet.
   2. When Oscar approves, fill in `MILESTONES` in `output/<name>.setup-github.sh`. Oscar runs it once with the new repo as argument; it creates the milestones and the labels.
   3. Add the new repo to this session, then create the issues with the GitHub connector: each story as a feature issue and each task as a sub-issue of its story, all in their milestone, with a `type:*` and a `risk:*` label. Infra, auth, IAM, secrets, prompts and data deletion are always `risk:high`. Use the headings of the issue forms in `templates/issue-templates/`.

The new project never writes its own requirements, docs or issues: the kit does all of that. The new project only codes the issues.
All files of a new project go in `output/<name>/`, never anywhere else in this repo. `output/` is in `.gitignore`.
Follow `docs/documents.md` and `docs/project-structure.md`. All docs are in English.
A kit template in `templates/` wins over a skill's own format (for example, `domain-modeling`'s ADR format).

## How to work

- Oscar decides. Propose options with your recommendation, but do not add files, skills or decisions without his explicit OK.
- Work in small steps and explain each one in simple words.
- Do not state that something is true without checking it. If you did not verify it, say so.
- Every change to this repo goes through a pull request. Never push to `main` and never merge.
