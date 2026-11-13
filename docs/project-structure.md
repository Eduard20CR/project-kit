# Project structure

New projects use this folder structure. Folders marked "only if it applies" are added only when the project needs them.

```
.claude/CLAUDE.md           rules for Claude, including the Definition of Done
.claude/skills/             skills for Claude, copied from the kit
skills-lock.json            skill versions, for `npx skills update`
.github/workflows/          CI and deploy
.github/ISSUE_TEMPLATE/     issue forms: epic, story, technical, task, bug, spike, retro
.github/pull_request_template.md  pull request body: Spanish overview, English detail
README.md                   front door: vision, how to run and deploy, where the docs are
apps/
  <app>/                    one folder per app the project needs, e.g. web/, api/, worker/
shared/                     types and constants shared by the apps (only if it applies)
db/                         database migrations, e.g. Liquibase (only if it applies)
infra/
  bootstrap/                resources created once (state, OIDC)
  modules/                  reusable Terraform modules
  environments/             one folder per environment (e.g. dev/, prod/)
scripts/                    helper scripts
docs/
  non-functional-requirements.md  rules that always apply: security, performance, cost
  architecture.md           how and why it is built: pieces, flows, technologies, C4 levels 1-2
  data-model.md             main database schema
  adr/                      why of each important decision, one per file
```
