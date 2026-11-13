# CLAUDE.md — Project Kit

This repo gets a new project ready before any code is written:

1. Interview the user about the project.
2. Write the docs and edit the files in the project folder.
3. Plan the work on GitHub: the labels and the backlog (epics, stories and technical items).

After that, the new project just codes the issues, and it adds issues or changes the docs only when the user asks for it.

`docs/documents.md` lists what the kit produces for each new project.

## Language

- Everything in this repo is in English: files, commit messages, branches and pull requests.

## How to document a new project

Each step starts with who does it: **User** (the person you work with) or **Claude** (you). Do only the Claude steps. When a step is the user's, tell them exactly what to do and wait until they say it is done.

1. **User: create the project folder.** The user runs `npm run new-project -- <name>` in `scripts/`. It creates `output/<name>/` (the folder structure, the templates in place and the skills) and `output/<name>.backlog/` (an example backlog). Do not run it yourself: if `output/<name>/` does not exist yet, ask the user to run it.
2. **User and Claude: the project interview.** The user types `/grill-with-docs` in the chat to start it. Only the user can start this skill: it is set so that Claude cannot open it on its own. If the user has not typed it yet, ask them to. Then Claude interviews the user with it, until these are clear: the problem, who it is for, what it does, what success looks like, and how it is built (the architecture and the big decisions). It uses the `grilling` and `domain-modeling` skills. Ask one question at a time. While the interview goes on, `domain-modeling` writes each term as soon as it is clear in `output/<name>/GLOSSARY.md` (at the root of the project, where the skill looks for it), in the skill's own format.
3. **Claude: write the seven base docs; the user reviews them.**
   1. Fill in the seven base docs of `docs/documents.md` in `output/<name>/` from the interview, with the `doc-coauthoring` skill. `GLOSSARY.md` is already started from step 2: check that it has every domain term the other docs use, and that the docs use the glossary's words.
   2. Run `npm run check-placeholders -- <name>` in `scripts/`. It lists every `{placeholder}` left from the templates, with file and line, in two folders: the docs (`output/<name>/`) and the backlog (`output/<name>.backlog/`). In this step, fix only the ones in `output/<name>/`. The ones in `output/<name>.backlog/` are expected: the backlog is still the example until step 5.
   3. Tell the user which files to review (see "How to work": paths and one line each, not their content). Change them until the user says everything is clear.
4. **User: create the GitHub repo.** Tell the user that `output/<name>/` is ready, and give them these steps:
   1. On GitHub, create a new, empty repository: no README, no `.gitignore` and no license, so it has nothing that clashes with the files of `output/<name>/`.
   2. Clone it to their computer.
   3. Copy everything inside `output/<name>/` (not the folder itself) to the root of the clone. Include the hidden files and folders, like `.claude/` and `.github/`.
   4. Commit and push to `main`.
   5. Tell Claude the repo as `<owner>/<repo>` (for example `my-org/my-app`). Step 5 needs it.
5. **Write the backlog for the new repo, from this repo.** You never create anything on GitHub: in step 6, the user runs a script that does it.
   The user types `/to-tickets` in the chat to start it (only the user can start this skill). Follow its method (vertical slices, what blocks what, quiz the user until they approve), with the epics, stories, technical items, sizes and priorities of this step. At the end, do not publish the tickets: write the JSON files of step 5.3. "Blocked by" goes in `depends_on`.
   1. **Claude: propose the backlog in the chat.** Propose the epics, the stories and the technical items, each story and technical item with its size and its priority (`docs/documents.md` says what each size and priority means). What each type is:
      - **Epic**: groups large work. It never goes into a sprint whole: its children do.
      - **Story**: something the user notices. Child of an epic. "As a <role>, I want (or need) <action>, so that <benefit>."
      - **Technical item**: necessary work the user does not see. Child of an epic. A verb with what is done, and a "Why" line.

      This is the one place where the content itself goes in the chat, because the user must approve it before any file is written. Keep it a short list: each epic with its title, and under it each story or technical item with its id, type, title, size and priority.
   2. **User: review the backlog.** The user splits the stories that do more than one thing, deletes the ones that are not needed, adds the ones that are missing, and fixes sizes and priorities. Change the backlog until they approve it. Write no files before that.
   3. **Claude: write the backlog as data** in `output/<name>.backlog/issues/`: one JSON file per issue, with the fields in "The backlog" section of `docs/documents.md`. Write no code and no Markdown files for the backlog.
      - Replace the example files: delete the ones the backlog does not use.
      - Run `npm run check-placeholders -- <name>` again, until it finds none, in the docs or in the backlog. This matters for the backlog too: the example files have placeholders like `"{Photo upload}"`, and `setup-github` does not look for them, so one left behind would become a real issue title on GitHub.
   4. **Claude: check the backlog** with `npm run setup-github -- <name> <owner>/<repo> --dry-run`, in `scripts/`. It checks every file, prints what it would create and touches nothing on GitHub. Fix the backlog until it passes.
6. **User: upload the backlog to GitHub.** Tell the user to run `npm run setup-github -- <name> <owner>/<repo>` in `scripts/`, once. They can run it with `--dry-run` first. It needs the GitHub CLI (`gh`) logged in. It creates the labels and the issues, and no milestones: everything stays in the backlog. Each issue gets exactly one `type:*` label, each story and technical item also gets its `size:*` and `priority:*` labels, and no issue gets a `risk:*` label (the QA task puts `risk:*` on pull requests). Each story and technical item is linked to its epic as a sub-issue.
   - Never run it yourself without `--dry-run`, and do not create issues with the GitHub connector.
   - Never edit `scripts/setup-github.mjs` for a project.

Docs changes in the new project always go through a pull request. Its autonomous tasks (coder and QA) never create issues or change requirements or ADRs. The one exception: the coder task updates `docs/architecture.md` or `docs/data-model.md` in the same pull request when its change alters what they describe.
All files of a new project go in `output/<name>/`, never anywhere else in this repo. `output/` is in `.gitignore`.
Follow `docs/documents.md` and `docs/project-structure.md`. All docs are in English.
A kit template in `templates/` wins over a skill's own format (for example, `domain-modeling`'s ADR format).
The skills from mattpocock/skills are used as they are. Ignore what they say about things the kit does not have: the `/setup-matt-pocock-skills` command, the `ready-for-agent` label and the `codebase-design` skill.

## How to work

- The user decides. Propose options with your recommendation, but do not add files, skills or decisions without their explicit OK.
- Work in small steps and explain each one in simple words.
- Do not state that something is true without checking it. If you did not verify it, say so.
- Do not paste in the chat the content of files you wrote or changed: the user reads them in their editor, and long text in the chat is hard to follow and costs tokens. After writing, list only the paths of the files you changed, with one line each about what changed, and ask the user to review them. The only exception is the backlog proposal of step 5.1.
- Every change to this repo goes through a pull request. Never push to `main` and never merge.
