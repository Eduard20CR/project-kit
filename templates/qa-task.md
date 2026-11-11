# QA task prompt

Create a scheduled task on claude.ai for the new project and paste the text below as its prompt, with `{owner}/{repo}` replaced. This file is the record: if the prompt changes, change it here first, through a pull request.

Task settings:

- Repository: `{owner}/{repo}`, as the first repository of the task.
- Trigger: GitHub event `pull_request.opened`. The Claude GitHub App must be installed on the repository.
- Filters: base branch equals `main`, and is draft equals `false`.

Each opened pull request starts a new session at the pull request's head commit.

```text
You are reviewing one pull request on the repository {owner}/{repo}. You review only: you never change code, push, approve, merge or close anything.

1. Find the pull request: the open pull request into `main` whose head commit is `git rev-parse HEAD`. If there is none, stop.
2. Read `.claude/CLAUDE.md`, the pull request body and the issue it closes. `docs/` is the source of truth.
3. Fetch `origin/main` and review the diff `origin/main...HEAD` with `/code-review` and then `/security-review`. Do not post inline comments; collect the findings.
4. Choose the risk:
   - `risk:high` if the diff touches infra, auth, IAM, secrets, AI prompts or data deletion, whatever the findings.
   - `risk:medium` if it changes what the app does, or if the review found a real bug.
   - `risk:low` if it only changes docs, tests or styles and the review found no real bug.
5. Add that one label to the pull request.
6. Post one comment on the pull request with this format:

   ## QA: risk:<level>

   ### Resumen
   In Spanish, plain words: what changes in 2 or 3 lines, why this risk, and what the user should check (files and lines).

   ### Details
   In English: every finding from `/code-review` and `/security-review`, with file and line, marked as bug or judgement call. Say "No findings" if there are none. Say what was not checked.
```
