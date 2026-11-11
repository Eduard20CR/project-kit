#!/usr/bin/env python3
"""Creates a new project's labels, milestones and issues on GitHub from a JSON plan.

The plan is data only. Claude fills it in from the plan the user approves; this script
never changes per project.

    output/<name>.plan/
    ├── milestones.json      [{"id": "M0", "title": "M0 Foundation", "done": "..."}]
    └── issues/
        ├── 01-feature.json  one file per issue
        └── 01-01-task.json

Usage:
    python3 scripts/setup_github.py output/<name>.plan <owner>/<repo> --dry-run
    python3 scripts/setup_github.py output/<name>.plan <owner>/<repo>

What it does:
1. Checks the whole plan. If anything is wrong, it prints every problem and creates nothing.
2. With --dry-run, prints what it would create and stops. It does not call GitHub.
3. Otherwise, with the GitHub CLI (`gh`, logged in): creates or updates the labels, creates
   the milestones, creates the issues (features before their tasks and spikes, and every
   issue after the issues it depends on) and links each task or spike to its feature as a
   sub-issue. Milestones, issues (same title) and links that already exist are skipped,
   so it is safe to run again.

Only the Python standard library is used, and `gh` is always called with a list of
arguments (never through a shell), so quotes and other characters in titles are safe.
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

# Labels the new repo gets: (name, color, description).
# The risk:* labels are for pull requests (the QA task sets them), never for issues.
LABELS = [
    ("type:feature", "1D76DB", "User story"),
    ("type:task", "5319E7", "Technical task, one pull request"),
    ("type:bug", "D73A4A", "Something does not work as the docs say"),
    ("type:spike", "FBCA04", "Time-boxed investigation"),
    ("risk:low", "0E8A16", "Quick review"),
    ("risk:medium", "FBCA04", "Review the marked lines"),
    ("risk:high", "B60205", "Infra, auth, IAM, secrets, prompts or data deletion: full review"),
    ("blocked", "000000", "Waiting on an answer from the user"),
    ("manual-step", "C5DEF5", "Only the user can do this"),
]

# Fields every issue file has.
COMMON_FIELDS = ["id", "type", "milestone", "title"]

# The body of each issue type, in the order of its form in templates/issue-templates/.
# Each section is (field, heading, required). The "feature" field fills the task's
# "Story" section with the feature's issue number. tests/ checks that these headings
# match the forms.
FORMS = {
    "feature": [
        ("story", "User story", True),
        ("acceptance", "Acceptance criteria", True),
        ("references", "References", True),
        ("files", "Files", False),
        ("depends_on", "Depends on", False),
        ("notes", "Notes", False),
    ],
    "task": [
        ("goal", "Goal", True),
        ("acceptance", "Acceptance criteria", True),
        ("references", "References", False),
        ("feature", "Story", False),
        ("files", "Files", False),
        ("depends_on", "Depends on", False),
        ("notes", "Notes", False),
    ],
    "spike": [
        ("question", "Question", True),
        ("timebox", "Time box", True),
        ("acceptance", "Acceptance criteria", True),
        ("depends_on", "Depends on", False),
    ],
}

# A spike has no "Story" section in its form, but it may still belong to a feature.
EXTRA_FIELDS = {"spike": ["feature"]}

# What kind of value each field holds.
TEXT_FIELDS = {"id", "type", "milestone", "title", "story", "goal", "question", "timebox", "notes", "feature"}
LIST_FIELDS = {"acceptance", "references", "files", "depends_on"}

EMPTY_SECTION = "_No response_"  # what GitHub writes for an empty form field


class PlanError(Exception):
    """The plan has problems. Holds every problem found."""

    def __init__(self, problems):
        super().__init__("\n".join(problems))
        self.problems = problems


# ---------------------------------------------------------------------------
# 1. Read and check the plan
# ---------------------------------------------------------------------------


def read_json(path, problems):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        problems.append(f"{path}: invalid JSON ({error})")
    except OSError as error:
        problems.append(f"{path}: cannot read it ({error})")
    return None


def is_text(value):
    return isinstance(value, str) and value.strip() != ""


def is_text_list(value):
    return isinstance(value, list) and all(is_text(item) for item in value)


def check_milestones(path, problems):
    """Returns the milestones as a list of dicts, or [] if the file is wrong."""
    data = read_json(path, problems)
    if data is None:
        return []
    if not isinstance(data, list) or not data:
        problems.append(f"{path}: must be a non-empty list of milestones")
        return []

    milestones = []
    seen_ids, seen_titles = set(), set()
    for position, milestone in enumerate(data, start=1):
        where = f"{path}: milestone {position}"
        if not isinstance(milestone, dict):
            problems.append(f"{where}: must be an object with id, title and done")
            continue
        unknown = sorted(set(milestone) - {"id", "title", "done"})
        if unknown:
            problems.append(f"{where}: unknown field(s) {', '.join(unknown)}")
        valid = True
        for field in ("id", "title", "done"):
            if not is_text(milestone.get(field)):
                problems.append(f"{where}: '{field}' is missing or empty")
                valid = False
        if not valid:
            continue
        if milestone["id"] in seen_ids:
            problems.append(f"{where}: duplicate id '{milestone['id']}'")
        if milestone["title"] in seen_titles:
            problems.append(f"{where}: duplicate title '{milestone['title']}'")
        seen_ids.add(milestone["id"])
        seen_titles.add(milestone["title"])
        milestones.append(milestone)
    return milestones


def check_issue_fields(path, issue, problems):
    """Checks one issue on its own. Returns False if it cannot be used at all."""
    if not isinstance(issue, dict):
        problems.append(f"{path}: must be a JSON object")
        return False

    issue_type = issue.get("type")
    if issue_type not in FORMS:
        problems.append(f"{path}: unknown type {issue_type!r} (use one of: {', '.join(FORMS)})")
        return False

    form_fields = [field for field, _, _ in FORMS[issue_type]]
    allowed = set(COMMON_FIELDS) | set(form_fields) | set(EXTRA_FIELDS.get(issue_type, []))
    unknown = sorted(set(issue) - allowed)
    if unknown:
        problems.append(f"{path}: unknown field(s) for a {issue_type}: {', '.join(unknown)}")

    required = list(COMMON_FIELDS) + [field for field, _, needed in FORMS[issue_type] if needed]
    for field in required:
        if field not in issue:
            problems.append(f"{path}: missing required field '{field}' for a {issue_type}")

    for field, value in issue.items():
        if field in TEXT_FIELDS and not is_text(value):
            problems.append(f"{path}: '{field}' must be a non-empty string")
        elif field in LIST_FIELDS and not is_text_list(value):
            problems.append(f"{path}: '{field}' must be a list of non-empty strings")
    if is_text_list(issue.get("acceptance")) and not issue["acceptance"]:
        problems.append(f"{path}: 'acceptance' needs at least one item")
    return True


def creation_order(issues, problems):
    """Orders the issues so each one comes after its feature and its depends_on.

    Keeps the file-name order wherever it can. Reports a cycle as a problem.
    """
    ids = [issue["id"] for issue in issues]
    by_id = {issue["id"]: issue for issue in issues}
    ordered, done, visiting = [], set(), []

    def visit(issue_id):
        if issue_id in done:
            return
        if issue_id in visiting:
            cycle = visiting[visiting.index(issue_id):] + [issue_id]
            problems.append(f"{by_id[issue_id]['_path']}: dependency cycle: {' -> '.join(cycle)}")
            return
        visiting.append(issue_id)
        issue = by_id[issue_id]
        before = ([issue["feature"]] if "feature" in issue else []) + issue.get("depends_on", [])
        for other in before:
            if other in by_id:
                visit(other)
        visiting.pop()
        done.add(issue_id)
        ordered.append(issue)

    for issue_id in ids:
        visit(issue_id)
    return ordered


def load_plan(plan_dir):
    """Reads and checks the whole plan. Returns (milestones, issues in creation order).

    Raises PlanError with every problem found.
    """
    plan_dir = Path(plan_dir)
    problems = []

    if not plan_dir.is_dir():
        raise PlanError([f"{plan_dir}: plan folder not found"])

    milestones_file = plan_dir / "milestones.json"
    if milestones_file.is_file():
        milestones = check_milestones(milestones_file, problems)
    else:
        problems.append(f"{milestones_file}: file not found")
        milestones = []
    milestone_ids = {milestone["id"] for milestone in milestones}

    issues_dir = plan_dir / "issues"
    files = sorted(issues_dir.glob("*.json")) if issues_dir.is_dir() else []
    if not files:
        problems.append(f"{issues_dir}: no issue files (*.json) found")

    issues = []
    for path in files:
        issue = read_json(path, problems)
        if issue is None or not check_issue_fields(path, issue, problems):
            continue
        issue["_path"] = path
        issues.append(issue)

    # Checks across files: duplicate ids and titles, and references to other ids.
    by_id, seen_titles = {}, {}
    for issue in issues:
        path = issue["_path"]
        issue_id, title = issue.get("id"), issue.get("title")
        if is_text(issue_id):
            if issue_id in by_id:
                problems.append(f"{path}: duplicate id '{issue_id}' (also in {by_id[issue_id]['_path'].name})")
            else:
                by_id[issue_id] = issue
        if is_text(title):
            if title in seen_titles:
                problems.append(f"{path}: duplicate title '{title}' (also in {seen_titles[title].name})")
            else:
                seen_titles[title] = path

    for issue in issues:
        path = issue["_path"]
        milestone = issue.get("milestone")
        if is_text(milestone) and milestones and milestone not in milestone_ids:
            problems.append(f"{path}: unknown milestone id '{milestone}'")
        feature = issue.get("feature")
        if is_text(feature):
            if feature not in by_id:
                problems.append(f"{path}: 'feature' points to an unknown id '{feature}'")
            elif by_id[feature].get("type") != "feature":
                problems.append(f"{path}: 'feature' points to '{feature}', which is a {by_id[feature].get('type')}, not a feature")
        if is_text_list(issue.get("depends_on")):
            for other in issue["depends_on"]:
                if other not in by_id:
                    problems.append(f"{path}: 'depends_on' points to an unknown id '{other}'")
                elif other == issue.get("id"):
                    problems.append(f"{path}: 'depends_on' points to the issue itself")

    if problems:
        raise PlanError(problems)

    ordered = creation_order(issues, problems)
    if problems:
        raise PlanError(problems)
    return milestones, ordered


# ---------------------------------------------------------------------------
# 2. Build the issue bodies
# ---------------------------------------------------------------------------


def build_body(issue, issue_ref):
    """Builds the Markdown body with the headings of the issue's form.

    issue_ref(id) returns how to write another issue of the plan, for example "#12".
    """
    sections = []
    for field, heading, _ in FORMS[issue["type"]]:
        value = issue.get(field)
        if not value:
            text = EMPTY_SECTION
        elif field == "acceptance":
            text = "\n".join(f"- [ ] {item}" for item in value)
        elif field == "references":
            text = ", ".join(value)
        elif field == "files":
            text = "\n".join(f"- {item}" for item in value)
        elif field == "depends_on":
            text = ", ".join(issue_ref(other) for other in value)
        elif field == "feature":
            text = issue_ref(value)
        else:
            text = value.strip()
        sections.append(f"### {heading}\n\n{text}")
    return "\n\n".join(sections) + "\n"


# ---------------------------------------------------------------------------
# 3. Talk to GitHub through gh
# ---------------------------------------------------------------------------


class GitHub:
    def __init__(self, repo):
        self.repo = repo

    def run(self, args, payload=None):
        """Runs gh with a list of arguments. Returns its output as JSON (or None)."""
        command = ["gh", *args]
        result = subprocess.run(
            command,
            input=None if payload is None else json.dumps(payload),
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(f"gh {' '.join(args)} failed:\n{result.stderr.strip()}")
        output = result.stdout.strip()
        return json.loads(output) if output.startswith(("{", "[")) else None

    def get_all(self, path):
        """GETs every page of a list endpoint."""
        items, page = [], 1
        while True:
            separator = "&" if "?" in path else "?"
            batch = self.run(["api", f"{path}{separator}per_page=100&page={page}"])
            if not batch:
                return items
            items.extend(batch)
            page += 1

    def post(self, path, payload):
        return self.run(["api", path, "--method", "POST", "--input", "-"], payload)

    def set_label(self, name, color, description):
        self.run(["label", "create", name, "--repo", self.repo,
                  "--color", color, "--description", description, "--force"])

    def milestones(self):
        return self.get_all(f"repos/{self.repo}/milestones?state=all")

    def create_milestone(self, title, description):
        return self.post(f"repos/{self.repo}/milestones", {"title": title, "description": description})

    def issues(self):
        # This endpoint also lists pull requests; they have a "pull_request" key.
        items = self.get_all(f"repos/{self.repo}/issues?state=all")
        return [item for item in items if "pull_request" not in item]

    def create_issue(self, title, body, milestone_number, label):
        return self.post(f"repos/{self.repo}/issues",
                         {"title": title, "body": body, "milestone": milestone_number, "labels": [label]})

    def sub_issue_numbers(self, parent_number):
        items = self.get_all(f"repos/{self.repo}/issues/{parent_number}/sub_issues")
        return {item["number"] for item in items}

    def add_sub_issue(self, parent_number, child_id):
        self.post(f"repos/{self.repo}/issues/{parent_number}/sub_issues", {"sub_issue_id": child_id})


def apply_plan(github, milestones, issues):
    """Creates everything that does not exist yet. Prints one line per step."""
    print("Labels:")
    for name, color, description in LABELS:
        github.set_label(name, color, description)
        print(f"  Created or updated label: {name}")

    print("Milestones:")
    existing = {milestone["title"]: milestone["number"] for milestone in github.milestones()}
    milestone_numbers = {}
    for milestone in milestones:
        title = milestone["title"]
        if title in existing:
            print(f"  Already exists: {title}")
            milestone_numbers[milestone["id"]] = existing[title]
        else:
            created = github.create_milestone(title, f"Done when: {milestone['done']}")
            milestone_numbers[milestone["id"]] = created["number"]
            print(f"  Created: {title}")

    print("Issues:")
    existing = {}
    for item in github.issues():
        existing.setdefault(item["title"], item)
    created_issues = {}  # plan id -> {"number", "id"}
    for issue in issues:
        title = issue["title"]
        if title in existing:
            found = existing[title]
            print(f"  Already exists: #{found['number']} {title}")
        else:
            body = build_body(issue, lambda other: f"#{created_issues[other]['number']}")
            found = github.create_issue(title, body, milestone_numbers[issue["milestone"]], f"type:{issue['type']}")
            print(f"  Created: #{found['number']} {title}")
        created_issues[issue["id"]] = {"number": found["number"], "id": found["id"]}

    print("Sub-issues:")
    linked = {}
    for issue in issues:
        if "feature" not in issue:
            continue
        parent = created_issues[issue["feature"]]["number"]
        child = created_issues[issue["id"]]
        if parent not in linked:
            linked[parent] = github.sub_issue_numbers(parent)
        if child["number"] in linked[parent]:
            print(f"  Already linked: #{child['number']} in #{parent}")
        else:
            github.add_sub_issue(parent, child["id"])
            linked[parent].add(child["number"])
            print(f"  Linked: #{child['number']} in #{parent}")


def print_dry_run(repo, milestones, issues):
    titles = {issue["id"]: issue["title"] for issue in issues}
    milestone_titles = {milestone["id"]: milestone["title"] for milestone in milestones}
    print(f"Dry run for {repo}: nothing is created.\n")
    print("Labels (created or updated):")
    for name, _, _ in LABELS:
        print(f"  {name}")
    print("\nMilestones:")
    for milestone in milestones:
        print(f"  {milestone['title']}  (Done when: {milestone['done']})")
    print("\nIssues, in creation order:")
    for position, issue in enumerate(issues, start=1):
        print(f"\n[{position}] {issue['title']}")
        print(f"    file: {issue['_path'].name}")
        print(f"    label: type:{issue['type']}")
        print(f"    milestone: {milestone_titles[issue['milestone']]}")
        if "feature" in issue:
            print(f"    sub-issue of: {titles[issue['feature']]}")
        body = build_body(issue, lambda other: f"#<{other}>")
        print("    body:")
        for line in body.splitlines():
            print(f"      {line}" if line else "")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Create labels, milestones and issues from a JSON plan.")
    parser.add_argument("plan_dir", help="the plan folder, e.g. output/<name>.plan")
    parser.add_argument("repo", help="the GitHub repo, as <owner>/<repo>")
    parser.add_argument("--dry-run", action="store_true", help="print what would be created and change nothing")
    args = parser.parse_args(argv)

    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", args.repo):
        print(f"Error: '{args.repo}' is not <owner>/<repo>.", file=sys.stderr)
        return 1

    try:
        milestones, issues = load_plan(args.plan_dir)
    except PlanError as error:
        print("The plan has problems. Nothing was created.", file=sys.stderr)
        for problem in error.problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1

    if args.dry_run:
        print_dry_run(args.repo, milestones, issues)
        return 0

    if shutil.which("gh") is None:
        print("Error: the GitHub CLI (gh) is not installed. Nothing was created.", file=sys.stderr)
        return 1

    print(f"Repository: {args.repo}")
    try:
        apply_plan(GitHub(args.repo), milestones, issues)
    except RuntimeError as error:
        print(f"Error: {error}", file=sys.stderr)
        print("Fix it and run the script again: what already exists is skipped.", file=sys.stderr)
        return 1
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
