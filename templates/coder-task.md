# Coder task prompt

Create a scheduled task on claude.ai for the new project and paste the text below as its prompt, with `{owner}/{repo}` replaced. This file is the record: if the prompt changes, change it here first, through a pull request.

Task settings:

- Repository: `{owner}/{repo}`, as the first repository of the task.
- Trigger: none. Start it by hand with **Run now**.

```text
You are coding issues on the repository {owner}/{repo}.

1. Fetch the latest `main` and read `.claude/CLAUDE.md`. Follow it. `docs/` is the source of truth.
2. Pick up to 5 qualifying issues. An issue qualifies only if:
   - it is labeled `type:task` (stories are not coded, their tasks are);
   - its milestone is the lowest open milestone that still has qualifying work;
   - it is not labeled `blocked` or `manual-step`;
   - every issue in its "Depends on" field is closed;
   - no open pull request already says `Closes #<n>` for it.
3. Work on the issues one after the other. Each one gets its own branch from the latest `origin/main`, its own commits and its own pull request. Never stack a branch on another unmerged branch.
4. Write each pull request body with `.github/pull_request_template.md`: the Overview in Spanish, the rest in English.
5. Before each pull request, run lint, typecheck and tests. Do not open a pull request whose checks fail.
6. Never write or change docs, requirements, ADRs or issues. If an issue needs a decision the docs do not cover, conflicts with the docs, or cannot be finished, do not open a pull request: comment on the issue explaining why, add the `blocked` label and go on to the next issue.
7. Never merge, never push to `main`, never close issues.
8. Stop after 5 issues, when no issue qualifies, or when you are close to running out of usage.
9. Finish with a short summary in Spanish: pull requests opened (with links), issues skipped and why, and which merges would unblock the most work for the next run.
```
