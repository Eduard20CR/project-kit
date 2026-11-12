# CLAUDE.md — Project Kit

This repo gets a new project ready before any code is written:

1. Interview the user about the project.
2. Write the docs and edit the file in the project folder.
3. Plan the work on GitHub: labels, milestones and issues.

After that, the new project just codes the issues, and it adds issues or changes the docs only when the user asks for it.

`docs/documents.md` lists what the kit produces for each new project.

## Language

- Everything in this repo is in English: files, commit messages, branches and pull requests.

## How to document a new project

Each step starts with who does it: **User** (the person you work with) or **Claude** (you). Do only the Claude steps. When a step is the user's, tell them exactly what to do and wait until they say it is done.

1. **User: create the project folder.** The user runs `npm run new-project -- <name>` in `scripts/`. It creates `output/<name>/` (the folder structure, the templates in place and the skills) and `output/<name>.plan/` (an example plan). Do not run it yourself: if `output/<name>/` does not exist yet, ask the user to run it.
2. **User and Claude: the interview.** The user types `/grill-with-docs` in the chat to start it. Only the user can start this skill: it is set so that Claude cannot open it on its own. If the user has not typed it yet, ask them to. Then Claude interviews the user with it. It uses the `grilling` and `domain-modeling` skills. Ask one question at a time.
3. **Claude: write the docs.** Fill in the files in `output/<name>/` from the interview, with the `doc-coauthoring` skill.
   - Then run `npm run check-placeholders -- <name>` in `scripts/`. It lists every `{placeholder}` left from the templates, with file and line, in two folders: the docs (`output/<name>/`) and the plan (`output/<name>.plan/`).
   - In this step, fix only the ones in `output/<name>/`. The ones in `output/<name>.plan/` are expected: the plan is still the example until step 6.
4. **User and Claude: review the docs.** Tell the user which files to review (see "How to work": paths and one line each, not their content). Change them until the user says everything is clear.
5. **User: create the new GitHub repo.** Tell the user that `output/<name>/` is ready, and give them these steps:
   1. On GitHub, create a new, empty repository: no README, no `.gitignore` and no license, so it has nothing that clashes with the files of `output/<name>/`.
   2. Clone it to their computer.
   3. Copy everything inside `output/<name>/` (not the folder itself) to the root of the clone. Include the hidden files and folders, like `.claude/` and `.github/`.
   4. Commit and push to `main`.
   5. Tell Claude the repo as `<owner>/<repo>` (for example `my-org/my-app`). Step 6 needs it.
6. **Plan the work for the new repo, from this repo.** You never create anything on GitHub: at the end, the user runs a script that does it.
   1. **Claude: propose the plan in the chat.** Claude creates the whole plan: the milestones, and the issues of each milestone (features, tasks and spikes). What each one is:
      - **Milestone**: one stage of the project, like a sprint. It is a vertical slice: when it is done, something works from end to end (screen, API and data), not just one layer. It has a title and a one-line "done" (how we know it is finished), and no due date.
      - **Feature**: something the end user can do, written as a user story ("As a <role>, I want <capability>, so that <benefit>"). It is not coded directly: its tasks are.
      - **Task**: one piece of technical work that fits in one pull request. Most tasks belong to a feature. Some stand alone, like the setup tasks of M0.
      - **Spike**: a short, time-boxed investigation that answers a question before coding (for example, "which PDF library works best?"). Its findings go in `docs/spikes/`. It may belong to a feature or stand alone.

      Order the milestones so the project grows one stage at a time:
      - **M0, foundation**: set up the project before any feature: the repo, the environments in the architecture doc, CI (the checks that run on every pull request), the deploy, and a smoke test. A smoke test is the simplest possible check that the app starts and answers, for example "the home page loads" or "the API health check returns 200". It tests no feature: it only proves that the build and the deploy work. M0 has no features, only stand-alone tasks.
      - **M1, thinnest slice**: the smallest version of the main flow that works end to end, even if it is very basic (for example, upload one file and see one result). It proves that all the parts connect.
      - **M2 and later**: one stage each, from the most important to the least. Each one adds a feature or completes one (more cases, errors, a better UI), and everything keeps working. Polish and nice-to-haves go last.

      This is the one place where the content itself goes in the chat, because the user must approve it before any file is written. Keep it a short list: each milestone with its title and "done", and under it each issue with its id, type, title and feature. The full fields (acceptance criteria, files, references) go only in the JSON files of step 6.3.
   2. **User: approve the plan.** Wait for the user's OK. Change the plan until they approve it. Write no files before that.
   3. **Claude: write the plan as data** in `output/<name>.plan/`. Write no code and no Markdown files for the plan.
      - `milestones.json`: the approved milestones, as `{"id", "title", "done"}`.
      - `issues/`: one JSON file per issue (for example `01-feature.json`, `01-01-task.json`). Each one has `id`, `type` (`feature`, `task` or `spike`), `milestone` (a milestone id), `title`, and the fields of the matching form in `templates/issue-templates/`. `acceptance`, `references`, `files` and `depends_on` are lists. A task or spike that belongs to a feature has `feature` (the feature's id). `depends_on` lists ids from the plan.
      - Replace the example files: delete the ones the plan does not use.
      - Run `npm run check-placeholders -- <name>` again, until it finds none, in the docs or in the plan. This matters for the plan too: the example files have placeholders like `"M1 {Thinnest end-to-end slice}"`, and `setup-github` does not look for them, so one left behind would become a real milestone or issue title on GitHub.
   4. **Claude: check the plan** with `npm run setup-github -- <name> <owner>/<repo> --dry-run`, in `scripts/`. It checks every file, prints what it would create and touches nothing on GitHub. Fix the plan until it passes.
   5. **User: create the plan on GitHub.** Tell the user to run `npm run setup-github -- <name> <owner>/<repo>` in `scripts/`, once. They can run it with `--dry-run` first. It needs the GitHub CLI (`gh`) logged in. It creates the labels, the milestones and the issues, each with exactly one `type:*` label and never a `risk:*` label (the QA task puts `risk:*` on pull requests), and links each task or spike to its feature as a sub-issue.
      - Never run it yourself without `--dry-run`, and do not create issues with the GitHub connector.
      - Never edit `scripts/setup-github.mjs` for a project.

Docs changes in the new project always go through a pull request. Its autonomous tasks (coder and QA) never create issues or change docs.
All files of a new project go in `output/<name>/`, never anywhere else in this repo. `output/` is in `.gitignore`.
Follow `docs/documents.md` and `docs/project-structure.md`. All docs are in English.
A kit template in `templates/` wins over a skill's own format (for example, `domain-modeling`'s ADR format).

## How to work

- The user decides. Propose options with your recommendation, but do not add files, skills or decisions without their explicit OK.
- Work in small steps and explain each one in simple words.
- Do not state that something is true without checking it. If you did not verify it, say so.
- Do not paste in the chat the content of files you wrote or changed: the user reads them in their editor, and long text in the chat is hard to follow and costs tokens. After writing, list only the paths of the files you changed, with one line each about what changed, and ask the user to review them. The only exception is the plan proposal of step 6.1.
- Every change to this repo goes through a pull request. Never push to `main` and never merge.
