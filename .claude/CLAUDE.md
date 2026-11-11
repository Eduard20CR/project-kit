# CLAUDE.md — Project Kit

This repo does all the work of a new project before any code is written: the interview, the docs, the zip and the plan on GitHub (labels, milestones and issues). After that, the new project codes the issues, and creates a new issue or changes a doc only when the user explicitly asks for it.
`docs/documents.md` lists what the kit produces for each new project.

## Language

- Everything in this repo is in English: files, commit messages, branches and pull requests.

## How to document a new project

1. Run `scripts/new-project.sh <name>`. It creates `output/<name>/` with the folder structure, the templates in place and the skills.
2. Run `/grill-with-docs` to interview the user about the project. It uses the `grilling` and `domain-modeling` skills.
3. Fill in the files in `output/<name>/` from the interview, with the `doc-coauthoring` skill. Remove the template placeholders.
4. Use the `skill-creator` skill if the new project needs its own skills.
5. Run `scripts/zip-project.sh <name>` and give the user `output/<name>.zip`. If it warns about leftover placeholders, fill them in and run it again. They create the new GitHub repo, unzip it at its root and push it.
6. Plan the work for the new GitHub repo, from this repo. You never create anything on GitHub: at the end, the user runs a script that does it.
   1. **Propose the plan in the chat.** It has:
      - Milestones. Each one is a vertical slice with a one-line "done" and no due date. M0 is the foundation: repo, CI and a smoke test. M1 is the thinnest slice that works end to end, checked with `docs/test-cases.md`.
      - The issues of each milestone. Each issue has one type: `feature` (a user story), `task` (technical work, one pull request) or `spike` (a time-boxed investigation).
      - The feature each task or spike belongs to. A task or spike may stand alone (for example, the M0 tasks).
   2. **Wait for the user's OK.** Change the plan until they approve it. Write no files before that.
   3. **Write one body file per issue** in `output/<name>.issues/` (for example `01-feature.md`, `01-01-task.md`). Use the headings of the matching form in `templates/issue-templates/`: `feature.yml`, `task.yml` or `spike.yml`.
   4. **Fill in `output/<name>.setup-github.sh`:**
      - Replace the example `MILESTONES` entries with the approved milestones, as `"title|done"`.
      - Replace the example at the end with one `create_issue "<title>" "<milestone title>" "type:<type>" "<body file>"` call per issue. The milestone title must match a `MILESTONES` entry exactly. Issue titles have no double quotes.
      - Create each feature before its tasks and spikes, then link each one to it with `link_sub_issue "$feature" "$task"`.
      - Each issue gets exactly one `type:*` label and never a `risk:*` label (the QA task puts `risk:*` on pull requests).
   5. **Hand it over.** Tell the user to run `output/<name>.setup-github.sh <owner>/<repo>` once. It creates the labels, the milestones and the issues. Do not run the script and do not create issues with the GitHub connector.

The kit writes the docs and the initial plan. After that, the new project codes the issues. It creates a new issue, or changes requirements, docs or ADRs, only when the user explicitly asks for it, and docs changes always go through a pull request. Its autonomous tasks (coder and QA) never create issues or change docs.
All files of a new project go in `output/<name>/`, never anywhere else in this repo. `output/` is in `.gitignore`.
Follow `docs/documents.md` and `docs/project-structure.md`. All docs are in English.
A kit template in `templates/` wins over a skill's own format (for example, `domain-modeling`'s ADR format).

## How to work

- The user decides. Propose options with your recommendation, but do not add files, skills or decisions without their explicit OK.
- Work in small steps and explain each one in simple words.
- Do not state that something is true without checking it. If you did not verify it, say so.
- Every change to this repo goes through a pull request. Never push to `main` and never merge.
