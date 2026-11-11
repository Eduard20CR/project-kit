# Project structure

New projects use this folder structure. Folders marked "only if it applies" are added only when the project needs them.

```
.claude/CLAUDE.md           rules for Claude
.github/workflows/          CI and deploy
.github/ISSUE_TEMPLATE/     issue forms: feature, task, bug, spike
.github/pull_request_template.md  pull request body: Spanish overview, English detail
README.md                   what the app is, for non-technical readers
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
  architecture.md           components, C4 levels 1-2 in Mermaid, flows, repo tree
  data-model.md             Mermaid erDiagram
  test-cases.md             real examples with the expected result
  requirements/
    functional.md           FR-XX with acceptance criteria
    non-functional.md       NFR-<AREA>-XX
  adr/                      one decision per file
  spikes/                   investigations behind decisions
  milestones/               one closing log per closed milestone
```
