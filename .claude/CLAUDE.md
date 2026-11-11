# CLAUDE.md — Project Kit

This repo is a toolbox for writing the documentation of a new project before any code is written.
`README.md` lists what the kit produces for each new project.

## Language

- Everything in this repo is in English: files, commit messages, branches and pull requests.

## How to document a new project

1. Run `/grill-with-docs` to interview Oscar about the project. It uses the `grilling` and `domain-modeling` skills.
2. Use the `doc-coauthoring` skill to write the docs section by section from the interview.
3. Use the `skill-creator` skill to create the skills the new project needs.

The docs of a new project go in that project's own repo, never in this one, following the "Project structure" section of `README.md`. All docs are in English.
If the kit has a template for a document, use it.

## How to work

- Oscar decides. Propose options with your recommendation, but do not add files, skills or decisions without his explicit OK.
- Work in small steps and explain each one in simple words.
- Do not state that something is true without checking it. If you did not verify it, say so.
- Every change to this repo goes through a pull request. Never push to `main` and never merge.
