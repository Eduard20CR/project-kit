# Documents

The documents every new project gets, and what each one is for. All docs are in English.
Write each one from its template in `templates/` when one exists.

| File | For | What it contains |
|---|---|---|
| `README.md` | Anyone, non-technical | What the app is, how it works, roles, and what is and is not in v1 |
| `docs/architecture.md` | Technical | How the components connect: C4 levels 1 and 2 in Mermaid, main flows, technologies with their ADRs, the repository folder tree |
| `docs/data-model.md` | Technical | Tables and relations as a Mermaid `erDiagram` |
| `docs/adr/` | Technical | Why each important decision was made, one per file |
| `docs/requirements/functional.md` | Everyone | What the app does, with acceptance criteria |
| `docs/requirements/non-functional.md` | Technical | Numbers for security, cost, performance, etc. |
| `docs/test-cases.md` | Everyone | Real examples with the expected result |
| `docs/spikes/` | Technical | Investigations done before a decision |
| `docs/milestones/` | Everyone | One closing log per closed milestone: app state, "done" check, docs fixed, retro, rules added to CLAUDE.md. Claude writes it when Oscar asks to close a milestone |
| `CLAUDE.md` and skills | Claude | Rules and skills for working on the project |
