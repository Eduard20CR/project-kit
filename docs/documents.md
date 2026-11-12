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
| `docs/spikes/` | Technical | Investigations done before a decision |
| `docs/milestones/` | Everyone | One closing log per closed milestone: app state, "done" check, docs fixed, retro, rules added to CLAUDE.md. Claude writes it when the user asks to close a milestone |
| `.claude/CLAUDE.md` and `.claude/skills/` | Claude | Rules and skills for working on the project |

## The plan (outside the project folder)

The plan for the new repo stays in the kit, in `output/<name>.plan/`. It is data only:

| File | What it contains |
|---|---|
| `milestones.json` | The milestones: `id`, `title` and `done` (one line) |
| `issues/<id>-<type>.json` (e.g. `01-feature.json`, `01-01-task.json`) | One issue: `id`, `type` (`feature`, `task` or `spike`), `milestone`, `title`, the fields of its form in `templates/issue-templates/`, and for a task or spike, `feature` |

`templates/plan/` is the example. `scripts/setup-github.mjs` checks the plan and creates the labels, milestones and issues; it builds each issue body from the form headings.
