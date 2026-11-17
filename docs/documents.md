# Documents

The seven base docs every new project gets, and what each one is for. All docs are in English.
The backlog (epics, stories and technical items) lives on GitHub, not in the docs.
Write each one from its template in `templates/` when one exists.

| File | For | What it contains |
|---|---|---|
| `README.md` | Anyone | The project's front door: the vision (the problem, who it is for, what it does and what success looks like), how to run it locally, how it is deployed, and where the rest of the docs are |
| `GLOSSARY.md` | Anyone | The project's words: each domain term, what it means and the words to avoid. The `domain-modeling` skill writes it during the interview, in its own format (`.claude/skills/domain-modeling/GLOSSARY-FORMAT.md`), so it has no template in `templates/`. It has no implementation details. It can change during the project |
| `docs/non-functional-requirements.md` | Technical | The rules that always apply: security, performance, cost |
| `docs/architecture.md` | Technical | Where a technical person understands how and why the project is built: the architect's idea, how the pieces fit together, the main flows, and which technologies are used and why. It includes C4 levels 1 (context) and 2 (containers) in Mermaid, to see it visually. It can change during the project |
| `docs/data-model.md` | Technical | The main database schema. It can change during the project |
| `docs/adr/` | Technical | Why each important decision was made, one per file |
| `.claude/CLAUDE.md` | Claude | The rules for Claude, including the Definition of Done |

## The backlog (outside the project folder)

The backlog for the new repo stays in the kit, in `output/<name>.backlog/`. It is data only: one JSON file per issue, in `issues/<id>-<type>.json` (e.g. `01-epic.json`, `01-01-technical.json`, `01-02-story.json`). It has no milestones: everything stays in the backlog.

| Field | In | What it contains |
|---|---|---|
| `id` | Every issue | The issue's id in the backlog (e.g. `01`, `01-01`) |
| `type` | Every issue | `epic`, `story` or `technical` |
| `epic` | Story, technical item | The id of its epic |
| `title` | Every issue | The issue's title |
| The fields of its form | Every issue | The fields of its form in `templates/issue-templates/`: `groups` for an epic, `story` for a story, `why` for a technical item |
| `size` | Story, technical item | `S`, `M` or `L` |
| `priority` | Story, technical item | `high`, `medium` or `low` |
| `depends_on` | Story, technical item (optional) | A list of ids from the backlog that must be done first |

Size:

- `S`: 1 or 2 pull requests.
- `M`: 3 to 5 pull requests.
- `L`: more; it is split before it enters a sprint.

Priority:

- `high`: the app is useless without it.
- `medium`: important, but the app already works without it.
- `low`: nice to have.

`templates/backlog/` is the example: one epic with one technical item and one story. `scripts/setup-github.mjs` checks the backlog and creates it on GitHub.
