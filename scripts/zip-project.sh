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

rm -f "$zip_file"
# Zip from inside the folder so the files land at the root of the new repo.
(cd "$source_dir" && zip -qr "$zip_file" .)

echo "Created $zip_file"
