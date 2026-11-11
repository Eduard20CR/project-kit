#!/usr/bin/env node
// Finds the template placeholders, like {Project name}, still left in a new project's docs
// and plan, and prints where each one is.
// Usage, from scripts/: npm run check-placeholders -- <name>
// It reads output/<name>/ and output/<name>.plan/. It exits with an error if it finds any.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const [name, ...rest] = process.argv.slice(2);
if (!name || rest.length) {
  console.error("Usage: npm run check-placeholders -- <name>");
  process.exit(1);
}

const output = join(import.meta.dirname, "..", "output");
const roots = [join(output, name), join(output, `${name}.plan`)];

// A placeholder is text in braces that starts with a letter and has no quotes,
// e.g. {Short title}. This skips JSON objects ({ "id": ... }) and code ({ return x; }).
const PLACEHOLDER = /\{[A-Za-z][^{}"\n]*\}/g;

// Only text files the kit fills in. The skills come from outside the kit, and files
// named "template" (e.g. docs/adr/0000-template.md) are meant to keep their placeholders.
const EXTENSIONS = [".md", ".json", ".yml", ".yaml"];
const SKIP = [".git", "node_modules", "skills", "skills-lock.json"];

/** Returns every file under a folder, skipping SKIP and files named "template". */
function listFiles(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (SKIP.includes(entry.name)) return [];
    if (entry.isDirectory()) return listFiles(path);
    const wanted = EXTENSIONS.some((ext) => entry.name.endsWith(ext)) && !entry.name.includes("template");
    return wanted ? [path] : [];
  });
}

let found = 0;
for (const root of roots) {
  if (!existsSync(root)) {
    console.error(`Error: ${root} does not exist.`);
    process.exit(1);
  }
  for (const file of listFiles(root)) {
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, index) => {
        for (const match of line.match(PLACEHOLDER) ?? []) {
          console.log(`${relative(output, file)}:${index + 1}  ${match}`);
          found++;
        }
      });
  }
}

if (found) {
  console.error(`\n${found} placeholder(s) left. Replace or remove them.`);
  process.exit(1);
}
console.log("No placeholders left.");
