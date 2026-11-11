# Start checklist

Go through this list when you start a new project, so nothing is forgotten. Each item says who does it. The steps themselves are in the [README](../README.md) and in `.claude/CLAUDE.md`; this list only checks that they are done.

## 1. Before you start

- [ ] **The user:** Node.js is installed and `npm install` was run once in `scripts/`.
- [ ] **The user:** the GitHub CLI (`gh`) is installed and logged in.

## 2. Docs ready, before copying the project folder

- [ ] **Claude:** who the user is and what "it worked" means are clear in the README and the requirements.
- [ ] **Claude:** `docs/test-cases.md` has at least 3 real test cases.
- [ ] **Claude:** every functional requirement has acceptance criteria with the exact texts the user sees.
- [ ] **The user:** the data model was reviewed.
- [ ] **The user:** read all the docs.
- [ ] **Claude:** a new Claude session with no context read all the docs and found nothing unclear.
- [ ] **Claude:** `npm run check-placeholders -- <name>` finds nothing, in the docs or in the plan.

## 3. Repo and claude.ai

- [ ] **The user:** created the GitHub repo, copied the contents of `output/<name>/` to its root and pushed it.
- [ ] **The user:** installed the Claude GitHub App on the repo.
- [ ] **The user:** created one claude.ai project for the repo.
- [ ] **The user:** the cloud environment allows the domains the project needs, and has the secrets or variables it uses, if any.

## 4. Plan on GitHub

- [ ] **The user:** approved the plan in the chat.
- [ ] **Claude:** `npm run setup-github -- <name> <owner>/<repo> --dry-run` passes.
- [ ] **The user:** ran `npm run setup-github -- <name> <owner>/<repo>` once, and the labels, milestones and issues are on GitHub.

## 5. Coder and QA tasks

- [ ] **The user:** created the coder task from `templates/coder-task.md`.
- [ ] **The user:** created the QA task from `templates/qa-task.md`, with its trigger and filters.
- [ ] **The user:** test run: **Run now** on the coder task opens a pull request for the first M0 task, and the QA task labels it `risk:*` and comments on it.

Left out on purpose: anything a script already checks (the list only says the script passed), CI (it is an M0 task in each project's plan) and closing milestones (that happens later, see `docs/milestones/`).
