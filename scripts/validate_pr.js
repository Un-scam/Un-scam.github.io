#!/usr/bin/env node
"use strict";

// Validates data/companies.json changes in a PR against schema rules and
// the additive-only contribution model. No npm dependencies on purpose,
// so CI never needs an install step.
//
// Usage: node validate_pr.js <base.json> <head.json>
// Env:   PR_AUTHOR: the GitHub login of the PR author

const fs = require("fs");

const [, , basePath, headPath] = process.argv;
const prAuthor = (process.env.PR_AUTHOR || "").toLowerCase();

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISSUE_URL_RE = /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/;
const LINKEDIN_RE = /^https?:\/\/(www\.)?linkedin\.com\/.+/i;
const STATUSES = new Set(["blacklist", "whitelist", "pending"]);

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

function fail(errors) {
  console.error("data/companies.json validation failed:\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

let base;
try {
  base = readJson(basePath);
} catch {
  base = [];
}

let head;
try {
  head = readJson(headPath);
} catch (e) {
  fail([`data/companies.json is not valid JSON: ${e.message}`]);
}

if (!Array.isArray(head)) {
  fail(["data/companies.json must be a JSON array"]);
}

const errors = [];
const baseById = new Map(base.map((e) => [e.id, e]));
const seenIds = new Set();
const seenNames = new Set();

for (const [i, entry] of head.entries()) {
  const where = `entry #${i + 1} (${entry && entry.name ? entry.name : "unnamed"})`;

  if (!entry || typeof entry !== "object") {
    errors.push(`${where}: must be an object`);
    continue;
  }
  if (typeof entry.id !== "string" || !ID_RE.test(entry.id)) {
    errors.push(`${where}: "id" must be a lowercase kebab-case slug (e.g. "acme-corp")`);
  }
  if (typeof entry.name !== "string" || entry.name.trim() === "") {
    errors.push(`${where}: "name" is required`);
  }
  if (!STATUSES.has(entry.status)) {
    errors.push(`${where}: "status" must be one of ${[...STATUSES].join(", ")}`);
  }
  if (!Array.isArray(entry.category) || !entry.category.every((c) => typeof c === "string")) {
    errors.push(`${where}: "category" must be an array of strings (can be empty [])`);
  }
  if (typeof entry.linkedinURL !== "string" || !LINKEDIN_RE.test(entry.linkedinURL)) {
    errors.push(`${where}: "linkedinURL" must be a linkedin.com URL`);
  }
  if (entry.issue_url !== null && entry.issue_url !== undefined) {
    if (typeof entry.issue_url !== "string" || !ISSUE_URL_RE.test(entry.issue_url)) {
      errors.push(`${where}: "issue_url" must be null or a valid github issue URL`);
    }
  }
  if (typeof entry.submittedBy !== "string" || entry.submittedBy.trim() === "") {
    errors.push(`${where}: "submittedBy" is required`);
  }
  if (typeof entry.dateAdded !== "string" || !DATE_RE.test(entry.dateAdded)) {
    errors.push(`${where}: "dateAdded" must be in YYYY-MM-DD format`);
  }

  if (typeof entry.id === "string") {
    if (seenIds.has(entry.id)) errors.push(`${where}: duplicate id "${entry.id}"`);
    seenIds.add(entry.id);
  }
  if (typeof entry.name === "string") {
    const key = entry.name.toLowerCase();
    if (seenNames.has(key)) errors.push(`${where}: duplicate name "${entry.name}" (case-insensitive)`);
    seenNames.add(key);
  }

  const existing = baseById.get(entry.id);
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(entry)) {
      errors.push(
        `${where}: modifies existing entry "${entry.id}". PRs may only add new companies, not edit ` +
          `existing ones. Status changes go through that company's GitHub issue + maintainer label instead.`
      );
    }
  } else {
    // Brand new entry.
    if (entry.issue_url !== null && entry.issue_url !== undefined) {
      errors.push(
        `${where}: new entries must leave "issue_url" as null. It is filled in automatically after merge`
      );
    }
    if (
      typeof entry.submittedBy === "string" &&
      prAuthor &&
      entry.submittedBy.toLowerCase() !== prAuthor
    ) {
      errors.push(
        `${where}: "submittedBy" ("${entry.submittedBy}") must match the PR author ("${prAuthor}")`
      );
    }
  }
}

for (const baseEntry of base) {
  if (!head.some((e) => e && e.id === baseEntry.id)) {
    errors.push(`entry "${baseEntry.id}" was removed. Removing companies via PR is not allowed`);
  }
}

if (errors.length) fail(errors);

console.log(`data/companies.json validation passed (${head.length} entries).`);
