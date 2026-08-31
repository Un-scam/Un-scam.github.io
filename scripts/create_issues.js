#!/usr/bin/env node
"use strict";

// Runs after a merge to main touches data/companies.json. For every entry
// missing an issue_url, creates its canonical GitHub Issue, mentions the
// submitter, and writes issue_url back into the file. If nothing is
// pending, exits immediately. This emptiness check is what stops the
// workflow's own follow-up commit from looping (see sync-new-companies.yml).
//
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY (owner/repo), GITHUB_SHA

const fs = require("fs");
const path = require("path");
const { ghClient } = require("./lib/github");

const DATA_PATH = path.join(__dirname, "..", "data", "companies.json");
const TEMPLATE_PATH = path.join(__dirname, "..", ".github", "company-issue-template.md");

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
const SHA = process.env.GITHUB_SHA;
const gh = ghClient(TOKEN);

function extractEvidence(prBody) {
  if (!prBody) return "No evidence provided.";
  const match = prBody.match(/##\s*Evidence\s*\n([\s\S]*?)(\n##\s|$)/i);
  const text = match ? match[1].trim() : "";
  return text || "No evidence provided.";
}

async function findEvidence() {
  try {
    const prs = await gh(`/repos/${REPO}/commits/${SHA}/pulls`, {
      headers: { Accept: "application/vnd.github.groot-preview+json" },
    });
    if (!prs || !prs.length) return "No evidence provided.";
    const pr = await gh(`/repos/${REPO}/pulls/${prs[0].number}`);
    return extractEvidence(pr.body);
  } catch (e) {
    console.warn(`Could not resolve originating PR for evidence text: ${e.message}`);
    return "No evidence provided.";
  }
}

async function main() {
  const companies = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const pending = companies.filter((c) => !c.issue_url);

  if (pending.length === 0) {
    console.log("No companies pending an issue. Nothing to do.");
    return;
  }

  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  // Assumes the PR-based flow of one new company per merge (documented in
  // CONTRIBUTING.md); if several land in one push, all pending entries get
  // the same evidence text as a reasonable fallback.
  const evidence = await findEvidence();

  for (const entry of pending) {
    const body = template
      .replaceAll("{{name}}", entry.name)
      .replaceAll("{{status}}", entry.status)
      .replaceAll("{{category}}", entry.category.join(", ") || "none")
      .replaceAll("{{linkedinURL}}", entry.linkedinURL)
      .replaceAll("{{evidence}}", evidence)
      .replaceAll("{{submittedBy}}", entry.submittedBy);

    const issue = await gh(`/repos/${REPO}/issues`, {
      method: "POST",
      body: JSON.stringify({
        title: entry.name,
        body,
        labels: [`status:${entry.status}`],
      }),
    });

    entry.issue_url = issue.html_url;
    console.log(`Created issue ${issue.html_url} for "${entry.name}"`);
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(companies, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
