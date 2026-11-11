# CLAUDE.md — Project Kit

This repo does all the work of a new project before any code is written: the interview, the docs, the project folder and the plan on GitHub (labels, milestones and issues). After that, the new project codes the issues, and creates a new issue or changes a doc only when the user explicitly asks for it.
`docs/documents.md` lists what the kit produces for each new project.

## Language

- Everything in this repo is in English: files, commit messages, branches and pull requests.

## How to document a new project

Go through `docs/start-checklist.md` before moving to the next phase, and tell the user which items are still open.

1. In `scripts/`, run `npm run new-project -- <name>` (run `npm install` there once first). It creates `output/<name>/` with the folder structure, the templates in place and the skills.
2. Run `/grill-with-docs` to interview the user about the project. It uses the `grilling` and `domain-modeling` skills.
3. Fill in the files in `output/<name>/` from the interview, with the `doc-coauthoring` skill. Remove the template placeholders: `npm run check-placeholders -- <name>`, in `scripts/`, lists the ones left with file and line.
4. Use the `skill-creator` skill if the new project needs its own skills.
5. Tell the user that `output/<name>/` is ready. They create the new GitHub repo, copy the contents of `output/<name>/` to its root and push it.
6. Plan the work for the new GitHub repo, from this repo. You never create anything on GitHub: at the end, the user runs a script that does it.
   1. **Propose the plan in the chat.** It has:
      - Milestones. Each one is a vertical slice with a one-line "done" and no due date. M0 is the foundation: repo, CI and a smoke test. M1 is the thinnest slice that works end to end, checked with `docs/test-cases.md`.
      - The issues of each milestone. Each issue has one type: `feature` (a user story), `task` (technical work, one pull request) or `spike` (a time-boxed investigation).
      - The feature each task or spike belongs to. A task or spike may stand alone (for example, the M0 tasks).
   2. **Wait for the user's OK.** Change the plan until they approve it. Write no files before that.
   3. **Write the plan as data** in `output/<name>.plan/`, which `scripts/new-project.mjs` created with an example. Write no code and no Markdown files for the plan.
      - `milestones.json`: the approved milestones, as `{"id", "title", "done"}`.
      - `issues/`: one JSON file per issue (for example `01-feature.json`, `01-01-task.json`). Each one has `id`, `type` (`feature`, `task` or `spike`), `milestone` (a milestone id), `title`, and the fields of the matching form in `templates/issue-templates/`. `acceptance`, `references`, `files` and `depends_on` are lists. A task or spike that belongs to a feature has `feature` (the feature's id). `depends_on` lists ids from the plan.
      - Replace the example files. Leave no `{placeholder}` behind: run `npm run check-placeholders -- <name>` again until it finds none.
   4. **Check the plan** with `npm run setup-github -- <name> <owner>/<repo> --dry-run`, in `scripts/`. It checks every file, prints what it would create and touches nothing on GitHub. Fix the plan until it passes.
   5. **Hand it over.** Tell the user to run `npm run setup-github -- <name> <owner>/<repo>` in `scripts/` once (they can run it with `--dry-run` first). It creates the labels, the milestones and the issues, each with exactly one `type:*` label and never a `risk:*` label (the QA task puts `risk:*` on pull requests), and links each task or spike to its feature as a sub-issue. Never run it without `--dry-run` and do not create issues with the GitHub connector. Never edit `scripts/setup-github.mjs` for a project.

Docs changes in the new project always go through a pull request. Its autonomous tasks (coder and QA) never create issues or change docs.
All files of a new project go in `output/<name>/`, never anywhere else in this repo. `output/` is in `.gitignore`.
Follow `docs/documents.md` and `docs/project-structure.md`. All docs are in English.
A kit template in `templates/` wins over a skill's own format (for example, `domain-modeling`'s ADR format).

## How to work

- The user decides. Propose options with your recommendation, but do not add files, skills or decisions without their explicit OK.
- Work in small steps and explain each one in simple words.
- Do not state that something is true without checking it. If you did not verify it, say so.
- Every change to this repo goes through a pull request. Never push to `main` and never merge.
