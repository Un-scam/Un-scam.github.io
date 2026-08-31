#!/usr/bin/env node
"use strict";

// Runs when a maintainer applies approved:blacklist / approved:whitelist to
// an issue. Finds the matching company by issue_url, flips its status,
// comments, and swaps the label to "synced". No-ops (but still comments +
// swaps the label) if the status already matches, so re-labeling is safe.
//
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY (owner/repo), GITHUB_EVENT_PATH

const fs = require("fs");
const path = require("path");
const { ghClient } = require("./lib/github");

const DATA_PATH = path.join(__dirname, "..", "data", "companies.json");
const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
const gh = ghClient(TOKEN);

const LABEL_TO_STATUS = {
  "approved:blacklist": "blacklist",
  "approved:whitelist": "whitelist",
};

async function main() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const labelName = event.label && event.label.name;
  const targetStatus = LABEL_TO_STATUS[labelName];

  if (!targetStatus) {
    console.log(`Label "${labelName}" is not a status-sync label. Skipping.`);
    return;
  }

  const issueNumber = event.issue.number;
  const issueUrl = event.issue.html_url;

  const companies = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const entry = companies.find((c) => c.issue_url === issueUrl);

  if (!entry) {
    await gh(`/repos/${REPO}/issues/${issueNumber}/comments`, {
      method: "POST",
      body: JSON.stringify({
        body:
          `I couldn't match this issue to any entry in \`data/companies.json\` ` +
          `(looked for \`issue_url == "${issueUrl}"\`). No status was changed. ` +
          `Removing the \`${labelName}\` label.`,
      }),
    });
    await gh(`/repos/${REPO}/issues/${issueNumber}/labels/${encodeURIComponent(labelName)}`, {
      method: "DELETE",
    });
    return;
  }

  const changed = entry.status !== targetStatus;
  if (changed) {
    entry.status = targetStatus;
    fs.writeFileSync(DATA_PATH, JSON.stringify(companies, null, 2) + "\n");
  }

  await gh(`/repos/${REPO}/issues/${issueNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({
      body: changed
        ? `Status updated to **${targetStatus}** based on maintainer review. Thanks for the report!`
        : `Status is already **${targetStatus}**. No change needed.`,
    }),
  });

  await gh(`/repos/${REPO}/issues/${issueNumber}/labels/${encodeURIComponent(labelName)}`, {
    method: "DELETE",
  });
  await gh(`/repos/${REPO}/issues/${issueNumber}/labels`, {
    method: "POST",
    body: JSON.stringify({ labels: ["synced"] }),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
