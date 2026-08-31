# unscam

A public, community-maintained black/white list of companies posting
"internship" listings on LinkedIn. Flags the ones that funnel applicants
into paid "training" seminars.

No backend, no database: the site is static HTML/JS reading
[`data/companies.json`](data/companies.json), and GitHub Issues + Actions
handle all the workflow.

- **Browse:** the live site (enable GitHub Pages, see below) lists every
  company with its status, category tags, and a link to its discussion.
- **Add a company or share an experience:** see [CONTRIBUTING.md](CONTRIBUTING.md).

## How it works

- New companies are added via **pull request** to `data/companies.json`. A
  GitHub Action validates the PR (`.github/workflows/validate-pr.yml`). On
  merge, another Action (`sync-new-companies.yml`) auto-creates a GitHub
  Issue for the company and links it back into the JSON. That issue
  becomes the permanent thread for reviews and experiences.
- Status changes (blacklist ↔ whitelist) happen by commenting evidence on
  a company's issue, then a maintainer applying an `approved:blacklist` /
  `approved:whitelist` label. An Action (`sync-status-label.yml`) syncs
  that into the JSON automatically.
- Anyone can react 👍/👎 directly on a company's issue to vote it
  trustworthy or scammy, no comment required. An Action
  (`update-site.yml`) periodically scrapes those reaction counts plus the
  comment count into `data/stats.json`, and regenerates a static profile
  page per company under `companies/<id>.html` (vote %, total votes,
  LinkedIn link, evidence). It also runs on every push that adds a
  company and on every new issue comment, so most updates show up fast.
  Reaction counts specifically only refresh on the schedule, since GitHub
  Actions has no native trigger for reaction events.

See [PLAN.md](PLAN.md) for the full design writeup.

## Setup (one-time, for the maintainer)

Repo: `github.com/Un-scam/Un-scam.github.io`. Placeholders in `index.html`,
`.github/ISSUE_TEMPLATE/config.yml`, and the seed data are already pointed
at this repo. Remaining one-time steps, all done from the GitHub web UI:

1. Settings → Actions → General → Workflow permissions → set to
   "Read and write permissions" (required for the bot commits and issue
   creation in `sync-new-companies.yml` / `sync-status-label.yml` /
   `update-site.yml`).
2. Settings → Pages → deploy from `main` / root.
3. Create the label set once: `synced`, `approved:blacklist`,
   `approved:whitelist` (GitHub auto-creates `status:blacklist` /
   `status:whitelist` the first time the bot uses them, but pre-creating
   all five keeps things consistent).
4. Do **not** enable "require pull request before merging" branch
   protection on `main` unless you also allowlist `github-actions[bot]` to
   bypass it. The bot pushes directly to `main`, see `PLAN.md` for why.
5. Scheduled workflows (`update-site.yml`'s `*/30 * * * *` cron) are
   auto-disabled by GitHub after 60 days with no repo activity. Push
   something or re-enable it from the Actions tab if votes stop
   refreshing on an idle repo.
6. The two seed companies (`Globex Fake Internships`, `Acme Legit
   Internships`) in `data/companies.json` are placeholder/demo data. The
   contributor PR flow can't remove existing entries (see
   `validate-pr.yml`), so delete them yourself with a direct commit to
   `main` before treating the list as real, or leave them as a working
   example for contributors.

## Roadmap

A browser extension that warns on blacklisted companies (and highlights
whitelisted ones) directly on LinkedIn job postings, reading this same
`data/companies.json`. Not built yet. Data format and file path stay
stable specifically to support this later.
