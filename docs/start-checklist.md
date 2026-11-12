# Start checklist

The user's checklist for starting a new project: go through it to be sure you followed every step. The steps themselves are in the [README](../README.md).

## 1. Before you start

- [ ] Node.js is installed and `npm install` was run once in `scripts/`.
- [ ] The GitHub CLI (`gh`) is installed and logged in.
- [ ] Ran `npm run new-project -- <name>` in `scripts/`.

## 2. Docs ready, before copying the project folder

- [ ] Who the user is and what "it worked" means are clear in the README and the requirements.
- [ ] Every functional requirement has acceptance criteria with the exact texts the user sees.
- [ ] Reviewed the data model.
- [ ] Read all the docs.
- [ ] Asked a new Claude session, with no context, to read all the docs, and it found nothing unclear.
- [ ] `npm run check-placeholders -- <name>`, in `scripts/`, finds nothing in `output/<name>/`. The plan still has placeholders: it is checked in step 4.

## 3. Repo and claude.ai

- [ ] Created the GitHub repo, copied the contents of `output/<name>/` to its root and pushed it.
- [ ] Installed the Claude GitHub App on the repo.
- [ ] Created one claude.ai project for the repo.

## 4. Plan on GitHub

- [ ] Approved the plan in the chat.
- [ ] `npm run check-placeholders -- <name>` finds nothing in the plan either.
- [ ] `npm run setup-github -- <name> <owner>/<repo> --dry-run` passes.
- [ ] Ran `npm run setup-github -- <name> <owner>/<repo>` once, and the labels, milestones and issues are on GitHub.

## 5. Coder and QA tasks

- [ ] Created the coder task from `templates/coder-task.md`.
- [ ] Created the QA task from `templates/qa-task.md`, with its trigger and filters.
- [ ] Test run: **Run now** on the coder task opens a pull request for the first M0 task, and the QA task labels it `risk:*` and comments on it.

Left out on purpose: CI (it is an M0 task in each project's plan) and closing milestones (that happens later, see `docs/milestones/`).
