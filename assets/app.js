const state = {
  companies: [],
  stats: {},
  search: "",
  status: "all",
  sortBy: "name",
};

const listEl = document.getElementById("list");
const countEl = document.getElementById("count");
const searchEl = document.getElementById("search");
const statusEl = document.getElementById("status-filter");
const sortEl = document.getElementById("sort-by");

async function loadData() {
  const [companies, stats] = await Promise.all([
    fetch("data/companies.json", { cache: "no-store" }).then((r) => r.json()),
    // stats.json is bot-generated and may not exist yet (fresh repo, or no
    // votes scraped so far), degrade gracefully to an empty object.
    fetch("data/stats.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})),
  ]);
  state.companies = companies;
  state.stats = stats;
  render();
}

function filtered() {
  let list = state.companies;

  if (state.status !== "all") {
    list = list.filter((c) => c.status === state.status);
  }
  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    list = list.filter((c) => c.name.toLowerCase().includes(q));
  }

  list = [...list].sort((a, b) => {
    if (state.sortBy === "date") return b.dateAdded.localeCompare(a.dateAdded);
    return a.name.localeCompare(b.name);
  });

  return list;
}

function statusLabel(status) {
  return { blacklist: "Blacklist", whitelist: "Whitelist", pending: "Pending" }[status] || status;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function voteSummary(companyId) {
  const s = state.stats[companyId];
  if (!s || !s.totalVotes) {
    return `<span class="vote-summary-inline empty">No votes yet</span>`;
  }
  return `
    <div class="vote-bar" title="${s.pctPositive}% positive / ${s.pctNegative}% negative">
      <div class="vote-bar-positive" style="width: ${s.pctPositive}%"></div>
    </div>
    <span class="vote-summary-inline">${s.pctPositive}% positive &middot; ${s.totalVotes} vote${s.totalVotes === 1 ? "" : "s"}</span>
  `;
}

function render() {
  const list = filtered();
  countEl.textContent = `${list.length} of ${state.companies.length} companies`;

  listEl.innerHTML = list
    .map((c) => {
      const discussLink = c.issue_url
        ? `<a href="${c.issue_url}" target="_blank" rel="noopener">Discuss &amp; vote</a>`
        : `<span class="pending-link">Discussion pending</span>`;

      const linkedinLink = c.linkedinURL
        ? `<a href="${c.linkedinURL}" target="_blank" rel="noopener">LinkedIn</a>`
        : "";

      const profileLink = `<a href="companies/${c.id}.html">Profile</a>`;

      const tags = c.category.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");

      return `
        <article class="card status-${c.status}">
          <div class="card-header">
            <h2>${escapeHtml(c.name)}</h2>
            <span class="badge badge-${c.status}">${statusLabel(c.status)}</span>
          </div>
          <div class="tags">${tags}</div>
          <div class="votes">${voteSummary(c.id)}</div>
          <div class="card-footer">
            ${profileLink} &middot; ${linkedinLink} &middot; ${discussLink}
          </div>
        </article>
      `;
    })
    .join("");
}

let searchTimeout;
searchEl.addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.search = e.target.value;
    render();
  }, 150);
});

statusEl.addEventListener("change", (e) => {
  state.status = e.target.value;
  render();
});

sortEl.addEventListener("change", (e) => {
  state.sortBy = e.target.value;
  render();
});

loadData();
