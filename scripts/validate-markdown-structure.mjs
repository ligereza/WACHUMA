import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseHeadings(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headings = [];
  const content = [];
  let inFence = false;
  let hasHeading = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (match) {
      const level = match[1].length;
      headings.push({ level, line: index + 1, title: match[2] });
      hasHeading = true;
      continue;
    }
    if (line.trim()) content.push({ line: index + 1, hasHeading });
  }
  return { lines, headings, content };
}

export function validateMarkdown(markdown, file = "<input>") {
  const { lines, headings, content } = parseHeadings(markdown);
  const errors = [];

  for (const entry of content.filter((item) => !item.hasHeading)) {
    errors.push(`${file}:${entry.line}: content appears before any heading`);
  }

  for (let index = 1; index < headings.length; index += 1) {
    const previous = headings[index - 1];
    const current = headings[index];
    if (current.level > previous.level + 1) {
      errors.push(
        `${file}:${current.line}: heading level jumps from h${previous.level} to h${current.level}`,
      );
    }
  }

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const boundary = headings.find(
      (candidate, candidateIndex) =>
        candidateIndex > index && candidate.level <= heading.level,
    );
    const end = boundary?.line ?? lines.length + 1;
    const hasBody = lines
      .slice(heading.line, end - 1)
      .some((line) => line.trim() && !/^(#{1,6})\s+/.test(line));
    if (!hasBody) {
      errors.push(
        `${file}:${heading.line}: heading has no body: ${heading.title}`,
      );
    }
  }

  return errors;
}

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await markdownFiles(path)));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = await markdownFiles(root);
  const errors = [];
  for (const file of files.sort()) {
    errors.push(...validateMarkdown(await readFile(file, "utf8"), file));
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(JSON.stringify({ markdownFiles: files.length, valid: true }));
}
