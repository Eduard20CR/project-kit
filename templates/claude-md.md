# CLAUDE.md — {Project name}

{One sentence: what the app is.}

## Source of truth

`docs/` is the source of truth. Read the parts that apply before working on anything.

## Language

- English in the repo: code, docs, commits and pull requests (except the pull request Overview, in Spanish).

## Workflow

- Work is grouped Scrum style: an epic groups stories and technical items; each story or technical item is split into tasks (sub-issues), one pull request each. A sprint is a milestone; the backlog is every issue without a milestone. Code tasks, not stories or technical items.
- Only the user plans sprints: they create the sprint's milestone, choose which issues go into it and decide when they are coded. Never create a milestone, and never add an issue to a sprint or take one out of it.
- One branch and one pull request per task. Never push to `main`, never merge.
- Write the pull request body with `.github/pull_request_template.md`: the Overview in Spanish, the rest in English.
- Before pushing, run the checks that already exist in the project and apply to the change (for example lint, typecheck, tests, build).
- Do not start an issue while an issue in its "Depends on" (blocked by) is still open.
- While coding a task, do not write requirements, ADRs or issues. The one exception: when the change alters what `docs/architecture.md` or `docs/data-model.md` describe, update them in the same pull request. Never change an ADR. If a task needs a decision the docs do not cover, or the docs look wrong, do not decide: comment on the issue, add the `blocked` label and stop working on that task.
- Create a new issue, or change docs, requirements or ADRs, only when the user explicitly asks for it:
  - An issue uses the matching form in `.github/ISSUE_TEMPLATE/`, one `type:*` label and, for a story or technical item, a `size:*` and a `priority:*` label. Never put `risk:*` labels on issues: they are for pull requests.
  - Docs changes go through a pull request. A changed decision is a new ADR.

## Refining a story or technical item

A story or technical item is detailed right before it is built, when the user asks to refine it (for example, "refine #12"). Both are refined the same way:

1. Use the `grilling` skill to ask the user questions until there are no doubts left about it.
2. Write in its issue the acceptance criteria and what is out of scope.
3. Create the tasks with the task form in `.github/ISSUE_TEMPLATE/`, as its sub-issues, one pull request each. Do not add them to a sprint: the user does.
4. Check the size: if it comes out L, propose splitting it.

## Building a task

One recipe for a task: read the task, write the test in its own commit, write the code, run the checks and open the pull request. It is used in two ways: with the user in the console for the hard ones (pair programming), or by the automatic coder task for the simple ones.

With the user, the user types `/implement #n` (only the user can start this skill). Then:

1. Create the task's branch.
2. Follow the `implement` skill. It uses the `tdd` skill, which asks the user which seams to test before writing any test.
3. Commit each failing test in its own commit, before the code that makes it pass.
4. Run the checks. At the end, `implement` reviews the work with `/code-review`.
5. Open the pull request, as in "Workflow".

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
