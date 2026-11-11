#!/usr/bin/env python3
"""A fake GitHub CLI for the tests of scripts/setup_github.py.

It understands only the gh calls that script makes. It keeps the fake repo in the
JSON file named by FAKE_GH_STATE and logs every call there, so tests can check them.
"""

import json
import os
import sys
from urllib.parse import parse_qs, urlparse


def load(path):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as file:
            return json.load(file)
    return {"calls": [], "labels": {}, "milestones": [], "issues": [], "sub_issues": {}, "next_id": 1000}


def page_of(items, query):
    per_page = int(query.get("per_page", ["30"])[0])
    page = int(query.get("page", ["1"])[0])
    return items[(page - 1) * per_page: page * per_page]


def main():
    path = os.environ["FAKE_GH_STATE"]
    state = load(path)
    args = sys.argv[1:]
    stdin = sys.stdin.read() if "--input" in args else ""
    state["calls"].append({"args": args, "stdin": stdin})
    output = None

    if args[:2] == ["label", "create"]:
        name = args[2]
        options = dict(zip(args[3::2], args[4::2]))
        state["labels"][name] = {"color": options["--color"], "description": options["--description"]}
    elif args[0] == "api":
        url = urlparse(args[1])
        query = parse_qs(url.query)
        method = args[args.index("--method") + 1] if "--method" in args else "GET"
        payload = json.loads(stdin) if stdin else {}
        parts = url.path.split("/")  # repos, owner, repo, resource, ...
        resource = parts[3:]
        if resource == ["milestones"] and method == "GET":
            output = page_of(state["milestones"], query)
        elif resource == ["milestones"] and method == "POST":
            milestone = {"number": len(state["milestones"]) + 1, "title": payload["title"],
                         "description": payload["description"]}
            state["milestones"].append(milestone)
            output = milestone
        elif resource == ["issues"] and method == "GET":
            output = page_of(state["issues"], query)
        elif resource == ["issues"] and method == "POST":
            state["next_id"] += 1
            issue = {"number": len(state["issues"]) + 1, "id": state["next_id"], **payload}
            state["issues"].append(issue)
            output = issue
        elif len(resource) == 3 and resource[0] == "issues" and resource[2] == "sub_issues":
            parent = resource[1]
            children = state["sub_issues"].setdefault(parent, [])
            if method == "GET":
                numbers = {issue["id"]: issue["number"] for issue in state["issues"]}
                output = page_of([{"number": numbers[child]} for child in children], query)
            else:
                children.append(payload["sub_issue_id"])
                output = {"number": int(parent)}
        else:
            print(f"fake gh: unknown call {args}", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"fake gh: unknown call {args}", file=sys.stderr)
        sys.exit(1)

    with open(path, "w", encoding="utf-8") as file:
        json.dump(state, file)
    if output is not None:
        print(json.dumps(output))


if __name__ == "__main__":
    main()
