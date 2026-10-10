const state = {
  urls: [],
  checksByUrl: new Map(),
  selectedUrlId: null,
  view: "overview",
  busyChecks: new Set(),
  deleting: new Set(),
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); }
    catch { data = raw; }
  }

  if (!response.ok) {
    const detail = data && typeof data === "object" ? data.detail : null;
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return data;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
}

function hostOf(value) {
  try { return new URL(value).hostname.replace(/^www\./, ""); }
  catch { return value || "Unknown URL"; }
}

function protocolMark(value) {
  try { return new URL(value).hostname.replace(/^www\./, "").slice(0, 2).toUpperCase(); }
  catch { return "↗"; }
}

function formatDate(value) {
  if (!value) return "Never checked";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatExactDate(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
}

function formatResponseTime(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return `${Number(value).toFixed(1)} ms`;
}

function latestCheck(urlId) {
  const checks = state.checksByUrl.get(Number(urlId)) || [];
  if (!checks.length) return null;
  return [...checks].sort((a, b) => new Date(b.checked_at || 0) - new Date(a.checked_at || 0))[0];
}

function statusInfo(url) {
  const check = latestCheck(url.id);
  if (url.is_active === false) return { text: "Paused", className: "status-pending", check };
  if (!check) return { text: "Awaiting check", className: "status-pending", check };
  if (check.success) return { text: "Operational", className: "status-ok", check };
  return { text: "Needs attention", className: "status-bad", check };
}

function latestTime(urlId) {
  const check = latestCheck(urlId);
  return check ? formatDate(check.checked_at) : "No checks yet";
}

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;
  toast.textContent = message;
  $("#toastRegion").append(toast);
  window.setTimeout(() => toast.remove(), 4300);
}

function setView(view) {
  state.view = view;
  $("#overviewView").classList.toggle("hidden", view !== "overview");
  $("#activityView").classList.toggle("hidden", view !== "activity");
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $("#breadcrumbCurrent").textContent = view === "overview" ? "Overview" : "Activity log";
  if (view === "activity") renderActivity();
}

function renderStats() {
  const urls = state.urls;
  const active = urls.filter((url) => url.is_active !== false);
  let healthy = 0;
  let issues = 0;
  let checkCount = 0;

  for (const url of urls) {
    const checks = state.checksByUrl.get(Number(url.id)) || [];
    checkCount += checks.length;
    const latest = latestCheck(url.id);
    if (url.is_active !== false && latest) {
      if (latest.success) healthy++;
      else issues++;
    }
  }

  $("#statTotal").textContent = urls.length;
  $("#statHealthy").textContent = healthy;
  $("#statIssues").textContent = issues;
  $("#statChecks").textContent = checkCount;
  $("#navUrlCount").textContent = active.length;
  $("#listCount").textContent = urls.length;
  $("#activityCount").textContent = checkCount;
}

function renderUrlTable() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const filtered = state.urls.filter((url) => `${url.url} ${hostOf(url.url)}`.toLowerCase().includes(query));
  const body = $("#urlTableBody");

  if (!filtered.length) {
    body.innerHTML = "";
    $("#emptyState").classList.remove("hidden");
    return;
  }
  $("#emptyState").classList.add("hidden");

  body.innerHTML = filtered.map((url) => {
    const status = statusInfo(url);
    const check = status.check;
    const selected = Number(state.selectedUrlId) === Number(url.id) ? " selected" : "";
    return `<tr class="${selected.trim()}" data-row-url-id="${Number(url.id)}">
      <td><div class="site-cell"><span class="site-icon">${escapeHtml(protocolMark(url.url))}</span><div class="site-copy"><a class="site-name" href="#" data-action="select" data-id="${Number(url.id)}">${escapeHtml(hostOf(url.url))}</a><span class="site-url">${escapeHtml(url.url)}</span></div></div></td>
      <td><span class="status-pill ${status.className}">${escapeHtml(status.text)}</span></td>
      <td class="mono ${check && check.success ? "time-value" : ""}">${check ? escapeHtml(formatResponseTime(check.response_time)) : "—"}</td>
      <td class="mono muted">${escapeHtml(latestTime(url.id))}</td>
      <td><div class="row-actions"><button class="action-button" data-action="check" data-id="${Number(url.id)}" title="Check now" aria-label="Check ${escapeHtml(hostOf(url.url))}" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.9-3L3 11"/><path d="M3 5v6h6"/><path d="M4 13a8 8 0 0 0 14.9 3L21 13"/><path d="M21 19v-6h-6"/></svg></button><button class="action-button danger" data-action="delete" data-id="${Number(url.id)}" title="Remove URL" aria-label="Remove ${escapeHtml(hostOf(url.url))}" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="m6 7 1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg></button></div></td>
    </tr>`;
  }).join("");
}

function renderDetail() {
  const url = state.urls.find((item) => Number(item.id) === Number(state.selectedUrlId));
  const content = $("#detailContent");
  if (!url) {
    content.innerHTML = `<div class="detail-placeholder"><div class="placeholder-ring"><span>↗</span></div><h3>Pick a signal.</h3><p>Select any website in your watchlist to see its latest response and recent history.</p></div>`;
    return;
  }

  const status = statusInfo(url);
  const check = status.check;
  const checks = [...(state.checksByUrl.get(Number(url.id)) || [])].sort((a, b) => new Date(b.checked_at || 0) - new Date(a.checked_at || 0));
  content.innerHTML = `
    <div class="detail-site">
      <div class="detail-site-icon">${escapeHtml(protocolMark(url.url))}</div>
      <h3>${escapeHtml(hostOf(url.url))}</h3>
      <div class="detail-url">${escapeHtml(url.url)}</div>
      <div class="detail-status"><span class="status-pill ${status.className}">${escapeHtml(status.text)}</span></div>
      <div class="detail-actions"><button class="button button-primary button-small" data-action="check" data-id="${Number(url.id)}" type="button">Check now ↗</button><button class="button button-outline button-small" data-action="delete" data-id="${Number(url.id)}" type="button">Remove</button></div>
    </div>
    <div class="detail-stats">
      <div class="detail-stat"><span class="label">LATEST HTTP</span><strong>${check && check.status_code != null ? escapeHtml(check.status_code) : "—"}</strong></div>
      <div class="detail-stat"><span class="label">RESPONSE TIME</span><strong>${escapeHtml(check ? formatResponseTime(check.response_time) : "—")}</strong></div>
    </div>
    <section class="history-section"><div class="history-head"><h3>Recent signals</h3><span class="heading-count">${checks.length}</span></div>
      ${checks.length ? checks.slice(0, 8).map((item) => `<div class="history-item"><span class="history-marker ${item.success ? "" : "bad"}"></span><div><div class="history-label">${item.success ? "Response received" : "Check failed"}${item.status_code != null ? ` · HTTP ${escapeHtml(item.status_code)}` : ""}</div><div class="history-date">${escapeHtml(formatExactDate(item.checked_at))}</div></div><span class="history-time">${escapeHtml(formatResponseTime(item.response_time))}</span></div>`).join("") : `<div class="history-empty">No checks recorded yet. Run the first one to start a history.</div>`}
    </section>`;
}

function renderActivity() {
  const rows = [];
  for (const url of state.urls) {
    const checks = state.checksByUrl.get(Number(url.id)) || [];
    for (const check of checks) rows.push({ url, check });
  }
  rows.sort((a, b) => new Date(b.check.checked_at || 0) - new Date(a.check.checked_at || 0));
  const body = $("#activityTableBody");
  if (!rows.length) {
    body.innerHTML = "";
    $("#activityEmpty").classList.remove("hidden");
    return;
  }
  $("#activityEmpty").classList.add("hidden");
  body.innerHTML = rows.map(({ url, check }) => `<tr data-row-url-id="${Number(url.id)}"><td><div class="site-cell"><span class="site-icon">${escapeHtml(protocolMark(url.url))}</span><div class="site-copy"><a href="#" class="site-name" data-action="select" data-id="${Number(url.id)}">${escapeHtml(hostOf(url.url))}</a><span class="site-url">${escapeHtml(url.url)}</span></div></div></td><td><span class="status-pill ${check.success ? "status-ok" : "status-bad"}">${check.success ? "Operational" : "Failed"}</span></td><td class="mono">${check.status_code == null ? "—" : escapeHtml(check.status_code)}</td><td class="mono ${check.success ? "time-value" : ""}">${escapeHtml(formatResponseTime(check.response_time))}</td><td class="mono muted">${escapeHtml(formatExactDate(check.checked_at))}</td></tr>`).join("");
}

async function loadData({ keepSelection = true } = {}) {
  const oldSelection = keepSelection ? state.selectedUrlId : null;
  $("#refreshButton").disabled = true;
  $("#lastUpdated").textContent = "Syncing…";
  try {
    const urls = await api("/urls");
    state.urls = Array.isArray(urls) ? urls : [];
    const checkResults = await Promise.all(state.urls.map(async (url) => {
      try {
        const checks = await api(`/urls/${url.id}/checks`);
        return [Number(url.id), Array.isArray(checks) ? checks : []];
      } catch (error) {
        console.warn(`Could not load checks for URL ${url.id}:`, error);
        return [Number(url.id), []];
      }
    }));
    state.checksByUrl = new Map(checkResults);
    state.selectedUrlId = state.urls.some((url) => Number(url.id) === Number(oldSelection)) ? Number(oldSelection) : (state.urls.length ? Number(state.urls[0].id) : null);
    renderStats();
    renderUrlTable();
    renderDetail();
    if (state.view === "activity") renderActivity();
    $("#lastUpdated").textContent = `Synced at ${new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())}`;
  } catch (error) {
    showToast(`Couldn't load the watchlist: ${error.message}`, true);
    $("#urlTableBody").innerHTML = `<tr><td colspan="5" class="loading-cell">Couldn't reach the API. Is FastAPI running?</td></tr>`;
    $("#lastUpdated").textContent = "Sync failed";
  } finally {
    $("#refreshButton").disabled = false;
  }
}

async function runCheck(urlId) {
  if (state.busyChecks.has(Number(urlId))) return;
  state.busyChecks.add(Number(urlId));
  renderUrlTable();
  try {
    await api(`/urls/${urlId}/check`, { method: "POST" });
    showToast("Check recorded.");
    await loadData();
  } catch (error) {
    showToast(`Check failed: ${error.message}`, true);
  } finally {
    state.busyChecks.delete(Number(urlId));
    renderUrlTable();
  }
}

async function deleteUrl(urlId) {
  const url = state.urls.find((item) => Number(item.id) === Number(urlId));
  if (!url || !window.confirm(`Remove ${url.url} from your watchlist?`)) return;
  state.deleting.add(Number(urlId));
  try {
    await api(`/urls/${urlId}`, { method: "DELETE" });
    showToast("URL removed.");
    if (Number(state.selectedUrlId) === Number(urlId)) state.selectedUrlId = null;
    await loadData();
  } catch (error) {
    showToast(`Couldn't remove URL: ${error.message}`, true);
  } finally {
    state.deleting.delete(Number(urlId));
    renderUrlTable();
  }
}

function openModal() {
  $("#formError").classList.add("hidden");
  $("#formError").textContent = "";
  $("#urlInput").value = "";
  $("#addModal").classList.remove("hidden");
  window.setTimeout(() => $("#urlInput").focus(), 20);
}
function closeModal() { $("#addModal").classList.add("hidden"); }

async function submitUrl(event) {
  event.preventDefault();
  const button = $("#submitUrlButton");
  const errorBox = $("#formError");
  button.disabled = true;
  button.textContent = "Adding…";
  errorBox.classList.add("hidden");
  try {
    const url = $("#urlInput").value.trim();
    const created = await api("/urls", { method: "POST", body: JSON.stringify({ url }) });
    showToast(`Added ${hostOf(created.url)} to your watchlist.`);
    closeModal();
    state.selectedUrlId = Number(created.id);
    await loadData();
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.innerHTML = 'Add to watchlist <span>↗</span>';
  }
}

document.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]");
  if (action) {
    event.preventDefault();
    event.stopPropagation();
    const id = Number(action.dataset.id);
    if (action.dataset.action === "select") {
      state.selectedUrlId = id;
      renderUrlTable();
      renderDetail();
    } else if (action.dataset.action === "check") {
      await runCheck(id);
    } else if (action.dataset.action === "delete") {
      await deleteUrl(id);
    }
    return;
  }
  const row = event.target.closest("[data-row-url-id]");
  if (row) {
    state.selectedUrlId = Number(row.dataset.rowUrlId);
    renderUrlTable();
    renderDetail();
  }
});

$$(".nav-item").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
$("#refreshButton").addEventListener("click", () => loadData());
$("#activityRefreshButton").addEventListener("click", () => loadData());
$("#addUrlButton").addEventListener("click", openModal);
$("#emptyAddButton").addEventListener("click", openModal);
$("#closeModalButton").addEventListener("click", closeModal);
$("#cancelModalButton").addEventListener("click", closeModal);
$("#addUrlForm").addEventListener("submit", submitUrl);
$("#searchInput").addEventListener("input", renderUrlTable);
$("#closeDetailsButton").addEventListener("click", () => {
  state.selectedUrlId = null;
  renderUrlTable();
  renderDetail();
});
$("#checkAllButton").addEventListener("click", async () => {
  const activeUrls = state.urls.filter((url) => url.is_active !== false);
  if (!activeUrls.length) { showToast("There are no active URLs to check."); return; }
  const button = $("#checkAllButton");
  button.disabled = true;
  button.textContent = "Checking…";
  for (const url of activeUrls) await runCheck(Number(url.id));
  button.disabled = false;
  button.textContent = "Check all ↗";
});
$("#addModal").addEventListener("click", (event) => { if (event.target === $("#addModal")) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });

loadData({ keepSelection: false });
