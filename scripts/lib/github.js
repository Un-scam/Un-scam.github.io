"use strict";

const API = "https://api.github.com";

function ghClient(token) {
  return async function gh(pathname, options = {}) {
    const res = await fetch(`${API}${pathname}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {}),
      },
    });
    if (!res.ok && res.status !== 404) {
      const body = await res.text();
      throw new Error(`GitHub API ${options.method || "GET"} ${pathname} failed: ${res.status} ${body}`);
    }
    return res.status === 204 || res.status === 404 ? null : res.json();
  };
}

module.exports = { ghClient };
