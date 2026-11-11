# Project Kit

Project Kit is a toolbox for writing the documentation of new projects before any code is written.

## What the kit produces for each new project

- Requirements
- Architecture
- ADRs (Architecture Decision Records)
- Database schema
- C4 diagram
- Real test cases: a few real examples with the expected result
- Screens: only the important ones
- The project's own README, CLAUDE.md and skills

## Undecided

- Glossary
- Open questions list

## Out of scope

- Environment inventory

## What this repo itself has

- Its own README, CLAUDE.md and skills

## Project structure

New projects use this folder structure. Folders marked "only if it applies" are added only when the project needs them.

```
.claude/CLAUDE.md           rules for Claude
.github/workflows/          CI and deploy
README.md
apps/
  web/                      frontend (src/, tests/)
  api/                      backend (src/, tests/)
packages/
  shared/                   types and constants shared by the apps (only if it applies)
db/                         database migrations, e.g. Liquibase (only if it applies)
infra/
  bootstrap/                resources created once (state, OIDC)
  modules/                  reusable Terraform modules
  main/                     the app's infrastructure
scripts/
docs/
  README.md                 scope by version and conventions
  architecture.md           components, flows and repo structure
  data-model.md             data model
  c4.md                     C4 diagrams in Mermaid
  requirements/
    functional.md           FR-XX with acceptance criteria
    non-functional.md       NFR-<AREA>-XX
  adr/                      one decision per file
  spikes/                   investigations behind decisions
```

All docs are in English.
