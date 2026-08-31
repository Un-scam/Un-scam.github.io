#!/usr/bin/env node
"use strict";

// Scrapes 👍/👎 reaction counts and comment counts from each company's
// canonical issue, writes data/stats.json. Only ever touches stats.json,
// never data/companies.json, so this workflow's own commit can't match
// the companies.json path filter that triggers sync-new-companies.yml or
// this same workflow's push trigger. No loop-safety guard needed.
//
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY

const fs = require("fs");
const path = require("path");
const { ghClient } = require("./lib/github");

const DATA_PATH = path.join(__dirname, "..", "data", "companies.json");
const STATS_PATH = path.join(__dirname, "..", "data", "stats.json");

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
const gh = ghClient(TOKEN);

function issueNumberFromUrl(url) {
  const m = typeof url === "string" && url.match(/\/issues\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

function readJsonSafe(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function main() {
  const companies = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const prevStats = readJsonSafe(STATS_PATH, {});
  const stats = {};

  for (const company of companies) {
    const number = issueNumberFromUrl(company.issue_url);
    if (!number) continue; // no issue yet, nothing to scrape

    const issue = await gh(`/repos/${REPO}/issues/${number}`);
    if (!issue) continue;

    const thumbsUp = (issue.reactions && issue.reactions["+1"]) || 0;
    const thumbsDown = (issue.reactions && issue.reactions["-1"]) || 0;
    const totalVotes = thumbsUp + thumbsDown;
    const commentCount = issue.comments || 0;

    // Only bump updatedAt when the numbers actually moved. Otherwise the
    // scheduled cron (every 30 min, regardless of activity) would diff and
    // commit every single run just from the timestamp, spamming main and
    // colliding with other bot pushes.
    const prev = prevStats[company.id];
    const unchanged =
      prev && prev.thumbsUp === thumbsUp && prev.thumbsDown === thumbsDown && prev.commentCount === commentCount;

    stats[company.id] = {
      issueNumber: number,
      thumbsUp,
      thumbsDown,
      totalVotes,
      pctPositive: totalVotes ? Math.round((thumbsUp / totalVotes) * 100) : null,
      pctNegative: totalVotes ? Math.round((thumbsDown / totalVotes) * 100) : null,
      commentCount,
      updatedAt: unchanged ? prev.updatedAt : new Date().toISOString(),
    };
  }

  fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2) + "\n");
  console.log(`Wrote stats for ${Object.keys(stats).length} companies.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
