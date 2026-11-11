"""Tests for scripts/setup_github.py. They run the script against a fake gh (tests/fake_gh.py).

Run them from the kit root:
    python3 -m unittest discover -s tests
"""

import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

KIT = Path(__file__).resolve().parent.parent
SCRIPT = KIT / "scripts" / "setup_github.py"
FAKE_GH = KIT / "tests" / "fake_gh.py"
FORMS_DIR = KIT / "templates" / "issue-templates"
REPO = "owner/new-repo"

spec = importlib.util.spec_from_file_location("setup_github", SCRIPT)
setup_github = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup_github)

MILESTONES = [
    {"id": "M0", "title": "M0 Foundation", "done": "Repo, CI and a smoke test work."},
    {"id": "M1", "title": "M1 Upload and analyze", "done": "TC-01 to TC-03 pass."},
]

FEATURE = {
    "id": "01", "type": "feature", "milestone": "M1",
    "title": "Upload a PDF and get quotes",
    "story": "As **Mom**, I want quotes, so that I don't read 500 pages.",
    "acceptance": ["Uploading a 500-page PDF works", "Each quote shows its page"],
    "references": ["FR-01", "ADR-0005"],
}
CI_TASK = {
    "id": "00-01", "type": "task", "milestone": "M0",
    "title": "Set up CI", "goal": "CI runs on every pull request.",
    "acceptance": ["CI is green on main"],
}
TASK = {
    "id": "01-01", "type": "task", "milestone": "M1", "feature": "01",
    "title": "Create the create-job Lambda", "goal": "A job can be created.",
    "acceptance": ["POST /jobs returns 201"], "files": ["apps/api/src/create-job.ts"],
    "depends_on": ["00-01"],
}
SPIKE = {
    "id": "01-02", "type": "spike", "milestone": "M1", "feature": "01",
    "title": "Check PDF text extraction", "question": "Can unpdf read scanned pages?",
    "timebox": "2 hours", "acceptance": ["Findings written in docs/spikes/0001-unpdf.md."],
}


def read_form(path):
    """Returns the (id, label) pairs of an issue form, in order. A tiny YAML reader for our forms."""
    pairs, current_id = [], None
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.match(r"\s+id:\s*(\S+)", line)
        if match:
            current_id = match.group(1)
        match = re.match(r"\s+label:\s*(.+)", line)
        if match and current_id:
            pairs.append((current_id, match.group(1).strip()))
            current_id = None
    return pairs


class PlanTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp)
        self.plan = self.tmp / "demo.plan"
        (self.plan / "issues").mkdir(parents=True)
        self.state = self.tmp / "gh-state.json"
        bin_dir = self.tmp / "bin"
        bin_dir.mkdir()
        gh = bin_dir / "gh"
        gh.write_text(f"#!/bin/sh\nexec {sys.executable!s} {FAKE_GH!s} \"$@\"\n")
        gh.chmod(0o755)
        self.env = {**os.environ, "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}",
                    "FAKE_GH_STATE": str(self.state)}

    def write_plan(self, milestones=MILESTONES, issues=None):
        (self.plan / "milestones.json").write_text(json.dumps(milestones))
        for name, issue in (issues if issues is not None else self.default_issues()).items():
            path = self.plan / "issues" / name
            path.write_text(issue if isinstance(issue, str) else json.dumps(issue))

    def default_issues(self):
        return {"00-01-task.json": CI_TASK, "01-feature.json": FEATURE,
                "01-01-task.json": TASK, "01-02-spike.json": SPIKE}

    def run_script(self, *extra):
        return subprocess.run([sys.executable, str(SCRIPT), str(self.plan), REPO, *extra],
                              capture_output=True, text=True, env=self.env)

    def gh_state(self):
        if not self.state.exists():
            return {"calls": [], "issues": [], "milestones": [], "labels": {}, "sub_issues": {}}
        return json.loads(self.state.read_text())

    def assert_plan_error(self, issues, *expected):
        self.write_plan(issues=issues)
        result = self.run_script()
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("Nothing was created", result.stderr)
        for text in expected:
            self.assertIn(text, result.stderr)
        self.assertEqual(self.gh_state()["calls"], [], "gh must not be called when the plan is wrong")


class FormsMatchTest(unittest.TestCase):
    def test_body_headings_match_the_issue_forms(self):
        for issue_type, sections in setup_github.FORMS.items():
            form = read_form(FORMS_DIR / f"{issue_type}.yml")
            script = [(field.replace("_", "-"), heading) for field, heading, _ in sections]
            script = [("story", h) if f == "feature" else (f, h) for f, h in script]
            self.assertEqual(script, form, f"{issue_type}.yml and FORMS differ")


class ValidationTest(PlanTestCase):
    def test_the_kit_example_plan_is_valid(self):
        self.plan = KIT / "templates" / "plan"
        result = self.run_script("--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_invalid_json(self):
        self.assert_plan_error({**self.default_issues(), "02-feature.json": "{ not json"},
                               "02-feature.json", "invalid JSON")

    def test_unknown_type(self):
        self.assert_plan_error({"01-feature.json": {**FEATURE, "type": "story"}}, "unknown type 'story'")

    def test_missing_required_field(self):
        issue = {key: value for key, value in FEATURE.items() if key != "references"}
        self.assert_plan_error({"01-feature.json": issue}, "01-feature.json",
                               "missing required field 'references' for a feature")

    def test_unknown_field(self):
        self.assert_plan_error({"01-feature.json": {**FEATURE, "labels": ["risk:high"]}},
                               "unknown field(s) for a feature: labels")

    def test_wrong_value_kind(self):
        self.assert_plan_error({"01-feature.json": {**FEATURE, "acceptance": "one line"}},
                               "'acceptance' must be a list")

    def test_unknown_milestone(self):
        self.assert_plan_error({"01-feature.json": {**FEATURE, "milestone": "M9"}}, "unknown milestone id 'M9'")

    def test_feature_points_to_unknown_id(self):
        self.assert_plan_error({**self.default_issues(), "01-01-task.json": {**TASK, "feature": "99"}},
                               "'feature' points to an unknown id '99'")

    def test_feature_points_to_a_task(self):
        self.assert_plan_error({**self.default_issues(), "01-01-task.json": {**TASK, "feature": "00-01"}},
                               "which is a task, not a feature")

    def test_depends_on_unknown_id(self):
        self.assert_plan_error({**self.default_issues(), "01-01-task.json": {**TASK, "depends_on": ["77"]}},
                               "'depends_on' points to an unknown id '77'")

    def test_duplicate_id(self):
        self.assert_plan_error({**self.default_issues(), "09-task.json": {**CI_TASK, "title": "Other"}},
                               "duplicate id '00-01'")

    def test_duplicate_title(self):
        self.assert_plan_error({**self.default_issues(), "09-task.json": {**CI_TASK, "id": "09"}},
                               "duplicate title 'Set up CI'")

    def test_dependency_cycle(self):
        issues = {"00-01-task.json": {**CI_TASK, "depends_on": ["00-02"]},
                  "00-02-task.json": {**CI_TASK, "id": "00-02", "title": "Other", "depends_on": ["00-01"]}}
        self.assert_plan_error(issues, "dependency cycle")

    def test_bad_milestones_file(self):
        self.write_plan(milestones=[{"id": "M0", "title": "M0 Foundation"}, MILESTONES[0]])
        result = self.run_script()
        self.assertEqual(result.returncode, 1)
        self.assertIn("'done' is missing or empty", result.stderr)
        self.assertEqual(self.gh_state()["calls"], [])

    def test_reports_every_problem_at_once(self):
        issues = {"01-feature.json": {**FEATURE, "milestone": "M9"},
                  "02-spike.json": {**SPIKE, "id": "02", "feature": "77"}}
        self.assert_plan_error(issues, "unknown milestone id 'M9'", "unknown id '77'")


class DryRunTest(PlanTestCase):
    def test_prints_the_plan_and_calls_nothing(self):
        self.write_plan()
        result = self.run_script("--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("nothing is created", result.stdout)
        self.assertIn("Upload a PDF and get quotes", result.stdout)
        self.assertIn("sub-issue of: Upload a PDF and get quotes", result.stdout)
        self.assertEqual(self.gh_state()["calls"], [])


class CreateTest(PlanTestCase):
    def test_creates_labels_milestones_issues_and_links(self):
        self.write_plan()
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        state = self.gh_state()

        self.assertEqual(sorted(state["labels"]), sorted(name for name, _, _ in setup_github.LABELS))
        self.assertEqual([m["title"] for m in state["milestones"]], ["M0 Foundation", "M1 Upload and analyze"])
        self.assertEqual(state["milestones"][0]["description"], "Done when: Repo, CI and a smoke test work.")

        issues = {issue["title"]: issue for issue in state["issues"]}
        order = [issue["title"] for issue in state["issues"]]
        self.assertLess(order.index(FEATURE["title"]), order.index(TASK["title"]))
        self.assertLess(order.index(FEATURE["title"]), order.index(SPIKE["title"]))
        self.assertLess(order.index(CI_TASK["title"]), order.index(TASK["title"]))

        for issue in state["issues"]:
            self.assertEqual(len(issue["labels"]), 1)
            self.assertTrue(issue["labels"][0].startswith("type:"))
        self.assertEqual(issues[FEATURE["title"]]["labels"], ["type:feature"])
        self.assertEqual(issues[SPIKE["title"]]["labels"], ["type:spike"])
        self.assertEqual(issues[TASK["title"]]["milestone"], 2)
        self.assertEqual(issues[CI_TASK["title"]]["milestone"], 1)

        feature = issues[FEATURE["title"]]
        linked = state["sub_issues"][str(feature["number"])]
        self.assertEqual(sorted(linked), sorted([issues[TASK["title"]]["id"], issues[SPIKE["title"]]["id"]]))
        self.assertNotIn(str(issues[CI_TASK["title"]]["number"]), state["sub_issues"])

    def test_body_uses_the_form_headings(self):
        self.write_plan()
        self.run_script()
        issues = {issue["title"]: issue for issue in self.gh_state()["issues"]}
        feature, ci = issues[FEATURE["title"]], issues[CI_TASK["title"]]
        body = issues[TASK["title"]]["body"]
        self.assertEqual(
            body,
            "### Goal\n\nA job can be created.\n\n"
            "### Acceptance criteria\n\n- [ ] POST /jobs returns 201\n\n"
            "### References\n\n_No response_\n\n"
            f"### Story\n\n#{feature['number']}\n\n"
            "### Files\n\n- apps/api/src/create-job.ts\n\n"
            f"### Depends on\n\n#{ci['number']}\n\n"
            "### Notes\n\n_No response_\n",
        )
        self.assertIn("### References\n\nFR-01, ADR-0005", feature["body"])
        self.assertIn("- [ ] Each quote shows its page", feature["body"])

    def test_dependencies_come_first_whatever_the_file_order(self):
        early = {**CI_TASK, "id": "00-02", "title": "Deploy", "depends_on": ["00-09"]}
        late = {**CI_TASK, "id": "00-09", "title": "Bootstrap"}
        self.write_plan(issues={"00-02-task.json": early, "00-09-task.json": late})
        self.assertEqual(self.run_script().returncode, 0)
        self.assertEqual([i["title"] for i in self.gh_state()["issues"]], ["Bootstrap", "Deploy"])

    def test_running_twice_skips_what_exists(self):
        self.write_plan()
        self.assertEqual(self.run_script().returncode, 0)
        first = self.gh_state()
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        second = self.gh_state()
        self.assertEqual(second["milestones"], first["milestones"])
        self.assertEqual(second["issues"], first["issues"])
        self.assertEqual(second["sub_issues"], first["sub_issues"])
        self.assertNotIn("Created:", result.stdout)
        self.assertNotIn("Linked:", result.stdout)

    def test_titles_with_quotes_and_backticks(self):
        titles = ['Say "hello"', "It's done", "Run `npm test`", "$(rm -rf /) and ; | &"]
        issues = {f"0{n}-task.json": {**CI_TASK, "id": f"q{n}", "title": title}
                  for n, title in enumerate(titles)}
        issues["10-feature.json"] = {**FEATURE, "title": 'Feature "quoted" `x`'}
        issues["11-task.json"] = {**TASK, "id": "11", "feature": "01", "depends_on": []}
        issues["10-feature.json"]["id"] = "01"
        self.write_plan(issues=issues)
        self.assertEqual(self.run_script().returncode, 0)
        self.assertEqual(self.run_script().returncode, 0)
        created = [issue["title"] for issue in self.gh_state()["issues"]]
        for title in titles + ['Feature "quoted" `x`']:
            self.assertEqual(created.count(title), 1, title)

    def test_ignores_pull_requests_when_looking_for_issues(self):
        self.state.write_text(json.dumps({
            "calls": [], "labels": {}, "milestones": [], "sub_issues": {}, "next_id": 1000,
            "issues": [{"number": 1, "id": 1, "title": "Set up CI", "pull_request": {}}],
        }))
        self.write_plan(issues={"00-01-task.json": CI_TASK})
        self.assertEqual(self.run_script().returncode, 0)
        titles = [issue["title"] for issue in self.gh_state()["issues"]]
        self.assertEqual(titles.count("Set up CI"), 2)

    def test_finds_existing_issues_past_the_first_page(self):
        existing = [{"number": n, "id": n, "title": f"Old issue {n}"} for n in range(1, 151)]
        existing.append({"number": 151, "id": 151, "title": "Set up CI"})
        self.state.write_text(json.dumps({
            "calls": [], "labels": {}, "milestones": [], "sub_issues": {}, "next_id": 1000, "issues": existing,
        }))
        self.write_plan(issues={"00-01-task.json": CI_TASK})
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Already exists: #151 Set up CI", result.stdout)
        self.assertEqual(len(self.gh_state()["issues"]), 151)

    def test_stops_when_gh_fails(self):
        self.write_plan(issues={"00-01-task.json": CI_TASK})
        self.state.write_text("not json")  # makes the fake gh crash
        result = self.run_script()
        self.assertEqual(result.returncode, 1)
        self.assertIn("failed", result.stderr)


if __name__ == "__main__":
    unittest.main()
