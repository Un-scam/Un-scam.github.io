#!/usr/bin/env node
"use strict";

// Renders a static profile page per company into companies/<id>.html from
// templates/company-page.html. Safe to run before data/stats.json exists
// (renders zeroed vote stats), lets this run standalone locally too.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "companies.json");
const STATS_PATH = path.join(ROOT, "data", "stats.json");
const TEMPLATE_PATH = path.join(ROOT, "templates", "company-page.html");
const OUT_DIR = path.join(ROOT, "companies");

function readJsonSafe(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function statusLabel(status) {
  return { blacklist: "Blacklist", whitelist: "Whitelist", pending: "Pending" }[status] || status;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function main() {
  const companies = readJsonSafe(DATA_PATH, []);
  const stats = readJsonSafe(STATS_PATH, {});
  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const c of companies) {
    const s = stats[c.id] || {};
    const totalVotes = s.totalVotes || 0;
    const pctPositiveRaw = s.pctPositive ?? 0;
    const pctNegativeRaw = s.pctNegative ?? 0;

    const html = template
      .replaceAll("{{name}}", escapeHtml(c.name))
      .replaceAll("{{status}}", c.status)
      .replaceAll("{{statusLabel}}", statusLabel(c.status))
      .replaceAll("{{category}}", escapeHtml(c.category.join(", ") || "none"))
      .replaceAll("{{linkedinURL}}", c.linkedinURL || "")
      .replaceAll("{{issueUrl}}", c.issue_url || "")
      .replaceAll("{{dateAdded}}", c.dateAdded)
      .replaceAll("{{submittedBy}}", escapeHtml(c.submittedBy))
      .replaceAll("{{thumbsUp}}", s.thumbsUp ?? 0)
      .replaceAll("{{thumbsDown}}", s.thumbsDown ?? 0)
      .replaceAll("{{totalVotes}}", totalVotes)
      .replaceAll("{{pctPositive}}", s.pctPositive == null ? "N/A" : `${s.pctPositive}%`)
      .replaceAll("{{pctNegative}}", s.pctNegative == null ? "N/A" : `${s.pctNegative}%`)
      .replaceAll("{{pctPositiveRaw}}", pctPositiveRaw)
      .replaceAll("{{pctNegativeRaw}}", pctNegativeRaw)
      .replaceAll("{{commentCount}}", s.commentCount ?? 0);

    fs.writeFileSync(path.join(OUT_DIR, `${c.id}.html`), html);
  }

  console.log(`Generated ${companies.length} company page(s) in companies/`);
}

main();
