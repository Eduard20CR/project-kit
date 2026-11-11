# CLAUDE.md — {Project name}

{One sentence: what the app is.}

## Source of truth

`docs/` is the source of truth. Read the parts that apply before working on anything.

## Language

- English in the repo: code, docs, commits and pull requests (except the pull request Overview, in Spanish).
- {Language of the user-facing text.}

## Workflow

- Work is grouped Scrum style: milestone = sprint or epic, feature issue = user story, task issues = its sub-issues. Code tasks, not stories.
- One branch and one pull request per task. Never push to `main`, never merge.
- Write the pull request body with `.github/pull_request_template.md`: the Overview in Spanish, the rest in English.
- Run lint, typecheck and tests before pushing.
- Do not write docs, requirements, ADRs or issues. If a task needs a decision the docs do not cover, or the docs look wrong, do not decide: comment on the issue, add the `blocked` label and stop. The only exception is the milestone closing log in `docs/milestones/`, written only when asked to close a milestone.

## Golden rules

- {Project rule, linking its ADR.}

## Security

- Never put secrets in the code or the repo.
