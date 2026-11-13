# Documents

The six base docs every new project gets, and what each one is for. All docs are in English.
The backlog (epics, stories and technical items) lives on GitHub, not in the docs.
Write each one from its template in `templates/` when one exists.

| File | For | What it contains |
|---|---|---|
| `README.md` | Anyone | The project's front door: the vision (the problem, who it is for, what it does and what success looks like), how to run it locally, how it is deployed, and where the rest of the docs are |
| `docs/non-functional-requirements.md` | Technical | The rules that always apply: security, performance, cost |
| `docs/architecture.md` | Technical | Where a technical person understands how and why the project is built: the architect's idea, how the pieces fit together, the main flows, and which technologies are used and why. It includes C4 levels 1 (context) and 2 (containers) in Mermaid, to see it visually. It can change during the project |
| `docs/data-model.md` | Technical | The main database schema. It can change during the project |
| `docs/adr/` | Technical | Why each important decision was made, one per file |
| `.claude/CLAUDE.md` | Claude | The rules for Claude, including the Definition of Done |

## The plan (outside the project folder)

The plan for the new repo stays in the kit, in `output/<name>.plan/`. It is data only:

| File | What it contains |
|---|---|
| `milestones.json` | The milestones: `id`, `title` and `done` (one line) |
| `issues/<id>-<type>.json` (e.g. `01-feature.json`, `01-01-task.json`) | One issue: `id`, `type` (`feature`, `task` or `spike`), `milestone`, `title`, the fields of its form in `templates/issue-templates/`, and for a task or spike, `feature` |

`templates/plan/` is the example. `scripts/setup-github.mjs` checks the plan and creates the labels, milestones and issues; it builds each issue body from the form headings.
