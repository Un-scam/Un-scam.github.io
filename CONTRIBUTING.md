# Contributing to unscam

There are two separate flows depending on what you want to do. Use the right one, it's what keeps the data trustworthy.

## Adding a new company

Use this when a company isn't listed yet.

1. Fork the repo.
2. Add **one** new object to `data/companies.json` following this schema:

   | field | type | notes |
   |---|---|---|
   | `id` | string | unique, lowercase-kebab-case, e.g. `acme-corp` |
   | `name` | string | company name |
   | `status` | `"blacklist" \| "whitelist" \| "pending"` | use `pending` if unsure |
   | `category` | array of strings | e.g. `["internship", "remote"]`, can be `[]` |
   | `linkedinURL` | string | the company's LinkedIn page URL |
   | `issue_url` | must be `null` | **leave this alone** (a bot fills it in after merge) |
   | `submittedBy` | string | your GitHub username |
   | `dateAdded` | string | `YYYY-MM-DD` |

   Good example:

   ```json
   {
     "id": "acme-corp",
     "name": "Acme Corp",
     "status": "blacklist",
     "category": ["internship", "training-fee"],
     "linkedinURL": "https://www.linkedin.com/company/acme-corp",
     "issue_url": null,
     "submittedBy": "yourusername",
     "dateAdded": "2026-08-26"
   }
   ```

   Common rejections: setting `issue_url` yourself, editing or removing an
   existing entry in the same PR, reusing an `id`/`name` that already
   exists, wrong `dateAdded` format.

3. Open a PR using the PR template. Fill in the **Evidence** section, this
   becomes the seed content of the company's discussion issue, so be
   specific (screenshots, links, what happened).
4. An automated check validates your PR's structure. Once a maintainer
   merges it, a bot creates a GitHub Issue for that company within a
   minute or two and mentions you in it. That issue is the permanent place
   for anyone (including you) to share their experience with the company.

## Reporting new evidence or a status change on an existing company

Use this when a company is already listed but you have something to add,
or you think its status is wrong.

1. Find the company on the site and click through to its GitHub Issue.
2. Comment with your evidence. **Do not** open a PR or edit
   `data/companies.json` for this.
3. Optionally, react 👍 (trustworthy) or 👎 (scam) on the issue itself.
   No comment required. Votes are scraped periodically and shown as a
   percentage on the site and the company's profile page.
4. A maintainer reviews the thread and applies an `approved:blacklist` or
   `approved:whitelist` label to the issue. This automatically updates the
   site.
