#!/usr/bin/env bash
# Creates the milestones and labels of a new project's GitHub repo. Oscar runs it once,
# locally, from the kit, after he approves the plan. Claude fills in MILESTONES.
# Needs the GitHub CLI (`gh`) logged in. Safe to re-run: existing labels are updated
# and existing milestones are skipped.
# Usage: output/<name>.setup-github.sh <owner>/<repo>
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <owner>/<repo>" >&2
  exit 1
fi
repo="$1"

# Milestones: "title|done". No due dates: a milestone closes when its "done" is met.
MILESTONES=(
  "M0 Foundation|{Repo, CI and a smoke test work.}"
  "M1 {Thinnest end-to-end slice}|{What the user can do; validated with docs/test-cases.md.}"
)

# Labels: "name|color|description".
LABELS=(
  "type:feature|1D76DB|User story"
  "type:task|5319E7|Technical task, one pull request"
  "type:bug|D73A4A|Something does not work as the docs say"
  "type:spike|FBCA04|Time-boxed investigation"
  "risk:low|0E8A16|Quick review"
  "risk:medium|FBCA04|Review the marked lines"
  "risk:high|B60205|Infra, auth, IAM, secrets, prompts or data deletion: full review"
  "blocked|000000|Waiting on an answer from Oscar"
  "manual-step|C5DEF5|Only Oscar can do this"
)

echo "Repository: $repo"

for label in "${LABELS[@]}"; do
  IFS='|' read -r name color description <<< "$label"
  gh label create "$name" --repo "$repo" --color "$color" --description "$description" --force
done

existing_milestones="$(gh api "repos/$repo/milestones?state=all&per_page=100" --jq '.[].title')"
for milestone in "${MILESTONES[@]}"; do
  IFS='|' read -r title done <<< "$milestone"
  if grep -qxF "$title" <<< "$existing_milestones"; then
    echo "Milestone already exists: $title"
  else
    gh api "repos/$repo/milestones" -f title="$title" -f description="Done when: $done" > /dev/null
    echo "Created milestone: $title"
  fi
done
