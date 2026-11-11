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
- When you create an issue through the GitHub connector, the issue forms are not applied: write the body with the same headings as the matching form in `.github/ISSUE_TEMPLATE/`.

## Plan the work

Before coding, once `docs/` is ready:

1. Read `docs/` and propose the plan to Oscar: milestones as vertical slices, each with its "done", and the stories and tasks of each one. M0 is the foundation (repo, CI, smoke test); M1 is the thinnest slice that works end to end, checked with `docs/test-cases.md`. Create nothing on GitHub yet.
2. When Oscar approves, fill in `MILESTONES` in `scripts/setup-github.sh`. Oscar runs it once; it creates the milestones (no due dates) and the labels.
3. Create the issues with the GitHub connector: each story as a feature issue and each task as a sub-issue of its story, all in their milestone, with a `type:*` label and a `risk:*` label. Infra, auth, IAM, secrets, prompts and data deletion are always `risk:high`.

## Golden rules

- {Project rule, linking its ADR.}

## Security

- Never put secrets in the code or the repo.
