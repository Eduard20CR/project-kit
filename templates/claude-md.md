# CLAUDE.md — {Project name}

{One sentence: what the app is.}

## Source of truth

`docs/` is the source of truth. Read the parts that apply before working on anything.

## Language

- English in the repo: code, docs, commits and pull requests (except the pull request Overview, in Spanish).

## Workflow

- Work is grouped Scrum style: milestone = sprint or epic, feature issue = user story, task issues = its sub-issues. Code tasks, not stories.
- One branch and one pull request per task. Never push to `main`, never merge.
- Write the pull request body with `.github/pull_request_template.md`: the Overview in Spanish, the rest in English.
- Before pushing, run the checks that already exist in the project and apply to the change (for example lint, typecheck, tests, build).
- Do not start an issue while an issue in its "Depends on" (blocked by) is still open.
- While coding a task, do not write requirements, ADRs or issues. The one exception: when the change alters what `docs/architecture.md` or `docs/data-model.md` describe, update them in the same pull request. Never change an ADR. If a task needs a decision the docs do not cover, or the docs look wrong, do not decide: comment on the issue, add the `blocked` label and stop working on that task.
- Create a new issue, or change docs, requirements or ADRs, only when the user explicitly asks for it:
  - An issue uses the matching form in `.github/ISSUE_TEMPLATE/`, one `type:*` label and a milestone. Never put `risk:*` labels on issues: they are for pull requests.
  - Docs changes go through a pull request. A changed decision is a new ADR.
- Write the milestone closing log in `docs/milestones/` only when asked to close a milestone.

## Definition of Done

What every pull request meets to be done:

- Acceptance criteria checked.
- Tests passing in the pipeline.
- Non-functional requirements respected.
- Reviewed by QA and approved by the user.

## Non-functional requirements

- The rule lives in its doc, `docs/non-functional-requirements.md`.
- What applies to everything is in the Definition of Done.
- What applies to one story goes in its acceptance criteria.
- The work of setting it up, done once, is a technical item.

## Bugs

- In something from the current sprint: fixed inside that story.
- In production, not urgent: a bug issue in the backlog.
- Critical: a hotfix that enters the current sprint, taking out something of similar size.

## Golden rules

- Nothing "just in case": no layers or abstractions for a future that may not come. Refactor only when it is needed.
- {Project rule, linking its ADR.}

## Security

- Never put secrets in the code or the repo.
