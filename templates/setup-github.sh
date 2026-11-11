#!/usr/bin/env bash
# Sets up a new project's GitHub repo: labels, milestones and issues.
# The user runs it once, locally, from the kit, after they approve the plan.
# Claude fills in MILESTONES and the "Issues" section from the approved plan, and writes
# each issue body in output/<name>.issues/<file>.md using the issue form headings.
# Needs the GitHub CLI (`gh`) logged in, and `jq`. Safe to re-run: labels are updated, and
# milestones and issues that already exist (same title) are skipped.
# Usage: output/<name>.setup-github.sh <owner>/<repo>
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <owner>/<repo>" >&2
  exit 1
fi
repo="$1"
for tool in gh jq; do
  if ! command -v "$tool" > /dev/null; then
    echo "Missing tool: $tool. Install it and run this script again." >&2
    exit 1
  fi
done
issues_dir="${0%.setup-github.sh}.issues"

# Milestones: "title|done". No due dates: a milestone closes when its "done" is met.
MILESTONES=(
  "M0 Foundation|{Repo, CI and a smoke test work.}"
  "M1 {Thinnest end-to-end slice}|{What the user can do; validated with docs/test-cases.md.}"
)

# Labels: "name|color|description". The risk:* labels are for pull requests (the QA task sets them), not issues.
LABELS=(
  "type:feature|1D76DB|User story"
  "type:task|5319E7|Technical task, one pull request"
  "type:bug|D73A4A|Something does not work as the docs say"
  "type:spike|FBCA04|Time-boxed investigation"
  "risk:low|0E8A16|Quick review"
  "risk:medium|FBCA04|Review the marked lines"
  "risk:high|B60205|Infra, auth, IAM, secrets, prompts or data deletion: full review"
  "blocked|000000|Waiting on an answer from the user"
  "manual-step|C5DEF5|Only the user can do this"
)

create_labels() {
  for label in "${LABELS[@]}"; do
    IFS='|' read -r name color description <<< "$label"
    gh label create "$name" --repo "$repo" --color "$color" --description "$description" --force
  done
}

create_milestones() {
  local existing
  existing="$(gh api "repos/$repo/milestones?state=all&per_page=100" --jq '.[].title')"
  for milestone in "${MILESTONES[@]}"; do
    IFS='|' read -r title done <<< "$milestone"
    if grep -qxF "$title" <<< "$existing"; then
      echo "Milestone already exists: $title"
    else
      gh api "repos/$repo/milestones" -f title="$title" -f description="Done when: $done" > /dev/null
      echo "Created milestone: $title"
    fi
  done
}

# Prints the number of the issue with this exact title, or nothing.
# The title goes to jq as a variable (--arg), so quotes and backticks in it are safe.
find_issue() {
  local title="$1"
  gh issue list --repo "$repo" --state all --limit 1000 --json number,title \
    | jq -r --arg title "$title" '.[] | select(.title == $title) | .number' | head -n 1
}

# create_issue <title> <milestone> <labels> <body file>
# Prints the issue number. Reuses the issue if one with the same title exists.
create_issue() {
  local title="$1" milestone="$2" labels="$3" body_file="$4"
  local number
  number="$(find_issue "$title")"
  if [ -n "$number" ]; then
    echo "Issue already exists: #$number $title" >&2
  else
    local url
    url="$(gh issue create --repo "$repo" --title "$title" --milestone "$milestone" \
      --label "$labels" --body-file "$issues_dir/$body_file")"
    number="${url##*/}"
    echo "Created issue: #$number $title" >&2
  fi
  echo "$number"
}

# link_sub_issue <feature number> <task or spike number>
link_sub_issue() {
  local feature="$1" task="$2"
  local task_id
  task_id="$(gh api "repos/$repo/issues/$task" --jq .id)"
  if gh api "repos/$repo/issues/$feature/sub_issues?per_page=100" --jq '.[].number' | grep -qx "$task"; then
    echo "Sub-issue already linked: #$task in #$feature" >&2
  else
    gh api "repos/$repo/issues/$feature/sub_issues" -F sub_issue_id="$task_id" > /dev/null
    echo "Linked sub-issue: #$task in #$feature" >&2
  fi
}

echo "Repository: $repo"
create_labels
create_milestones

# Issues: create each feature, then its tasks and spikes, and link each one to the feature.
# Example (Claude replaces it with the approved plan):
feature="$(create_issue "{Feature title}" "M1 {Thinnest end-to-end slice}" "type:feature" "01-feature.md")"
task="$(create_issue "{Task title}" "M1 {Thinnest end-to-end slice}" "type:task" "01-01-task.md")"
link_sub_issue "$feature" "$task"
