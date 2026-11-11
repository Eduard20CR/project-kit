#!/usr/bin/env bash
# Zips output/<name>/ into output/<name>.zip, ready to unzip at the root of the new repo.
# Usage: scripts/zip-project.sh <project-name>
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: scripts/zip-project.sh <project-name>" >&2
  exit 1
fi

name="$1"
kit_root="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="$kit_root/output/$name"
zip_file="$kit_root/output/$name.zip"

if [ ! -d "$source_dir" ]; then
  echo "Error: $source_dir does not exist. Run scripts/new-project.sh $name first." >&2
  exit 1
fi

# Warn, without failing, about template placeholders left in the docs. A placeholder is any
# "{...}" text from the kit's doc templates, so real braces (JSON, Mermaid, code) are never
# reported. The two template files the new project keeps on purpose are skipped.
placeholders="$(mktemp)"
trap 'rm -f "$placeholders"' EXIT
for template in readme claude-md architecture data-model functional-requirements \
  non-functional-requirements test-cases adr milestone-log; do
  grep -oE '\{[^{}]+\}' "$kit_root/templates/$template.md" || true
done | sort -u > "$placeholders"

if [ -s "$placeholders" ]; then
  leftovers="$(cd "$source_dir" && grep -rnF -f "$placeholders" --include='*.md' . \
    | grep -vE '^\./(\.claude/skills/|docs/adr/0000-template\.md:|docs/milestones/template\.md:)' || true)"
  if [ -n "$leftovers" ]; then
    echo "Warning: template placeholders are still in these files (file:line):" >&2
    echo "$leftovers" >&2
  fi
fi

rm -f "$zip_file"
# Zip from inside the folder so the files land at the root of the new repo.
(cd "$source_dir" && zip -qr "$zip_file" .)

echo "Created $zip_file"
