# CLAUDE.md — {Project name}

{One sentence: what the app is.}

## Source of truth

`docs/` is the source of truth. Read the parts that apply before working on anything.

## Language

- English in the repo: code, docs, commits and pull requests.
- {Language of the user-facing text.}

## Workflow

- Work is grouped Scrum style: milestone = sprint or epic, feature issue = user story, task issues = its sub-issues. Code tasks, not stories.
- One branch and one pull request per task. Never push to `main`, never merge.
- Run lint, typecheck and tests before pushing.
- If a decision changes, add a new ADR in the same pull request.

## Golden rules

- {Project rule, linking its ADR.}

## Security

- Never put secrets in the code or the repo.
