# Project structure

New projects use this folder structure. Folders marked "only if it applies" are added only when the project needs them.

```
.claude/CLAUDE.md           rules for Claude
.github/workflows/          CI and deploy
README.md
apps/
  <app>/                    one folder per app the project needs, e.g. web/, api/, worker/
shared/                     types and constants shared by the apps (only if it applies)
db/                         database migrations, e.g. Liquibase (only if it applies)
infra/
  bootstrap/                resources created once (state, OIDC)
  modules/                  reusable Terraform modules
  environments/             one folder per environment (e.g. dev/, prod/)
scripts/
docs/
  README.md                 scope by version and conventions
  architecture.md           components, flows and repo structure
  data-model.md             data model
  c4.md                     C4 diagrams in Mermaid
  test-cases.md             real examples with the expected result
  screens.md                only the important screens
  requirements/
    functional.md           FR-XX with acceptance criteria
    non-functional.md       NFR-<AREA>-XX
  adr/                      one decision per file
  spikes/                   investigations behind decisions
```
