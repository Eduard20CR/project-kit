# Milestone closing

How to close a milestone of a new project and write its closing log. The log is a short record of the state of the app each time a milestone closes, kept as context for later work. Its template is [milestone-log.md](milestone-log.md); `scripts/new-project.sh` copies it to `docs/milestones/template.md` in the new project.

## Steps

1. Check that every issue of the milestone is closed, or moved to a later milestone.
2. Write 3 short notes: what works now, how you checked the milestone's "done", and the retro (good / bad / change). Add any rule you want in `CLAUDE.md`.
3. Open a Claude Code session on the new repo and paste the prompt below, with `{Mx}` replaced and your notes at the end.
4. Review and merge the pull request it opens.
5. Close the milestone on GitHub.

This file is the record: if the prompt changes, change it here first, through a pull request.

```text
Close milestone {Mx} of this repository. This is the only time you may write in docs/: write the closing log and nothing else.

1. Fetch the latest `main` and read `.claude/CLAUDE.md`, `docs/milestones/template.md` and the description of milestone {Mx} on GitHub, with its "done".
2. List the issues and merged pull requests of milestone {Mx}. Find the ones that changed files in `docs/`.
3. Write `docs/milestones/{Mx}-<slug>.md` from the template:
   - App state, Done check and Retro come from my notes below. Use the issues and pull requests only to add links. Do not invent results: if my notes do not say how an item of the "done" was checked, write "not checked".
   - Docs fixed: the files in `docs/` changed by the pull requests of this milestone, with what changed and a link.
   - Rules added to CLAUDE.md: the rules my notes ask for. Add them to `.claude/CLAUDE.md` in the same pull request. If my notes ask for none, write "None.".
   - Remove the template placeholders and the comment at the end.
4. Open one pull request with only these files, using `.github/pull_request_template.md`. Never merge, never push to `main`, never close the milestone.

My notes:
{notes}
```
