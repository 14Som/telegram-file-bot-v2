/* Phone interface for the Telegram File Explorer backend: browses, streams,
   downloads and uploads files. */

"use strict";

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.6-4.6L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.6 4.6L21 15"/><path d="M21 20v-5h-5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="m9 5 7 7-7 7"/>',
  files: '<path d="M4 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  star: '<path d="m12 3 2.7 5.7 6.3.9-4.5 4.4 1 6.2-5.5-3-5.5 3 1-6.2L3 9.6l6.3-.9z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M8 5h3v14H8zM13 5h3v14h-3z"/>',
  download: '<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>',
  upload: '<path d="M12 20V9"/><path d="m7 13 5-5 5 5"/><path d="M5 4h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5L5 20"/>',
  video: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>',
  audio: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/>',
  archive: '<path d="M4 4h16v5H4z"/><path d="M5 9h14v11H5z"/><path d="M10 13h4"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  logout: '<path d="M10 5H5v14h5"/><path d="M14 8l4 4-4 4"/><path d="M18 12H9"/>',
  telegram: '<path d="M21 5 3 11l5 2 2 6 3-4 5 3z"/>',
  vault: '<path d="M4 6h16v12H4z"/><path d="M4 10h16"/><path d="M8 15h3"/>',
  trash: '<path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M7 7v12h10V7"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  imageOff: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m4 18 5-5M20 6l-9 9"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8 3 3-3 3-2-2-3 3"/>',
  eyeOff: '<path d="m3 3 18 18"/><path d="M10.6 5.1A9 9 0 0 1 12 5c5 0 9 4 9 7a11 11 0 0 1-2.4 3.5"/><path d="M6.3 6.3C4.2 7.9 3 9.8 3 12c0 3 4 7 9 7 1.5 0 2.9-.4 4.1-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  tag: '<path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  collection: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  movie: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v5M15 4v5"/>',
  sort: '<path d="M7 5v14M4 16l3 3 3-3"/><path d="M14 7h6M14 12h4M14 17h2"/>',
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M9 5H5v14h14v-4"/>',
  select: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8 12 3 3 5-6"/>',
  check: '<path d="m5 13 4 4L19 7"/>'
};

function svg(name, cls = "") {
  const body = ICONS[name] || ICONS.doc;
  return `<svg${cls ? ` class="${cls}"` : ""} viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}

function setIcon(el, name) { if (el) el.innerHTML = svg(name); }

const $ = (id) => document.getElementById(id);
const SCREENS = ["bootScreen", "pinScreen", "authScreen", "vaultScreen"];

const S = {
  status: null,
  tab: "files",
  kind: "all",
  q: "",
  folder: "",
  sort: "date",
  dir: "desc",
  tag: "",
  collection: null,
  star: null,
  starInfo: null,
  hidden: false,
  filterLabel: "",
  items: [],
  cursor: "",
  done: false,
  loading: false,
  nav: null,
  viewerIndex: -1,
  selection: new Set(),
  selecting: false,
  suppressClick: 0,
  syncTimer: null,
  qrTimer: null,
  pin: "",
  pinBusy: false,
  authTab: "phone",
  toastTimer: null,
  dlItems: [],
  dlNative: [],
  dlUploads: [],
  dlTimer: null,
  dlRates: {},
  dlCollapsed: false,
  localUpload: null,
  uploadClients: new Set(),
  uploadDismissed: new Set(),
  uploadSeen: new Set(),
  uploadTimer: null,
  closing: false
};

/* ------------------------------------------------------------------ utils */
function showScreen(id) {
  for (const screen of SCREENS) $(screen).hidden = screen !== id;
  $("main").hidden = id !== "main";
  if (id !== "main") closeSheet(true);
}

function emptyScreen(id) {
  for (const screen of SCREENS) $(screen).hidden = screen !== id;
  $("main").hidden = true;
}

function toast(message, kind = "") {
  const el = $("toast");
  el.textContent = message;
  el.className = "toast" + (kind ? " " + kind : "");
  el.hidden = false;
  clearTimeout(S.toastTimer);
  S.toastTimer = setTimeout(() => { el.hidden = true; }, 4200);
}

async function api(path, options = {}) {
  const method = options.method || "GET";
  const headers = { Accept: "application/json" };
  const init = { method, headers, credentials: "same-origin", cache: "no-store" };
  if (method !== "GET") headers["X-TFE"] = "1";
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }
  const res = await fetch(path, init);
  let data = {};
  try { data = await res.json(); } catch (_) { /* empty body */ }
  if (!res.ok) {
    if (res.status === 403) throw new Error("Session expired. Reopen the app.");
    if (res.status === 423) { S.status = { ...(S.status || {}), locked: true }; showPin(); }
    throw new Error(data.detail || `Request failed (${res.status})`);
  }
  return data;
}

function humanSize(size) {
  const value = Number(size) || 0;
  if (!value) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = value;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n >= 10 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

function humanDuration(seconds) {
  const total = Math.round(Number(seconds) || 0);
  if (!total) return "";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function humanDate(value) {
  if (!value) return "";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function itemIcon(item) {
  const kind = item.kind || "document";
  if (kind === "image" || kind === "sticker") return "image";
  if (kind === "video") return "video";
  if (kind === "audio" || kind === "voice") return "audio";
  if (kind === "model" || kind === "cad") return "grid";
  if (kind === "gif") return "image";
  const name = (item.name || "").toLowerCase();
  if (/\.(zip|rar|7z|tar|gz|bz2|xz)$/.test(name)) return "archive";
  return "doc";
}

function shortKind(item) {
  const kind = item.kind || "document";
  const labels = {
    image: "Image", video: "Video", audio: "Audio", voice: "Voice note",
    document: "Document", model: "3D model", cad: "CAD file",
    sticker: "Sticker", gif: "GIF", other: "File"
  };
  return labels[kind] || "File";
}

/* ------------------------------------------------------------------- boot */
async function boot() {
  showScreen("bootScreen");
  $("bootText").textContent = "Starting…";
  $("bootRetry").hidden = true;
  try {
    const status = await api("/api/status");
    S.status = status;
    route();
  } catch (error) {
    $("bootText").textContent = error.message || "The app backend is not ready.";
    $("bootRetry").hidden = false;
  }
}

function route() {
  const status = S.status || {};
  if (status.locked) return showPin();
  if (!status.authorized) return showAuth();
  if (!status.vault) return showVaultScreen();
  enterMain();
}

$("bootRetry").addEventListener("click", boot);

/* -------------------------------------------------------------------- PIN */
function showPin() {
  clearSelection();
  S.pin = "";
  renderPinDots();
  $("pinError").textContent = "";
  showScreen("pinScreen");
}

function renderPinDots() {
  $("pinDots").innerHTML = [0, 1, 2, 3]
    .map((i) => `<span${i < S.pin.length ? ' class="filled"' : ""}></span>`)
    .join("");
}

async function submitPin() {
  if (S.pinBusy) return;
  S.pinBusy = true;
  try {
    await api("/api/unlock", { method: "POST", body: { pin: S.pin } });
    S.pin = "";
    const status = await api("/api/status");
    S.status = status;
    route();
  } catch (error) {
    $("pinError").textContent = error.message;
    $("pinScreen").classList.add("shake");
    setTimeout(() => $("pinScreen").classList.remove("shake"), 400);
    S.pin = "";
    renderPinDots();
  } finally {
    S.pinBusy = false;
  }
}

$("pinPad").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-key]");
  if (!button) return;
  const key = button.dataset.key;
  if (key === "back") {
    S.pin = S.pin.slice(0, -1);
  } else if (S.pin.length < 4) {
    S.pin += key;
  }
  $("pinError").textContent = "";
  renderPinDots();
  if (S.pin.length === 4) submitPin();
});

setIcon(document.querySelector(".pin-pad .back"), "back");

/* ------------------------------------------------------------------- auth */
function showAuth() {
  showScreen("authScreen");
  $("authError").textContent = "";
  const state = (S.status && S.status.state) || "login";
  if (state === "password") return showAuthStep("password");
  if (state === "code") return showAuthStep("code");
  showAuthStep("phone");
}

function showAuthStep(step) {
  $("phoneForm").hidden = step !== "phone";
  $("codeForm").hidden = step !== "code";
  $("passwordForm").hidden = step !== "password";
  $("qrBox").hidden = step !== "qr";
  $("authTabs").hidden = step !== "phone" && step !== "qr";
  $("authError").textContent = "";
  if (step === "qr") startQr();
  else stopQr();
}

function authError(error) {
  $("authError").textContent = error.message || String(error);
}

$("authTabs").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-auth-tab]");
  if (!button) return;
  S.authTab = button.dataset.authTab;
  for (const tab of $("authTabs").querySelectorAll("button")) {
    tab.classList.toggle("active", tab === button);
  }
  showAuthStep(S.authTab);
});

$("phoneForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const phone = $("phoneInput").value.trim();
  if (!phone) { authError(new Error("Enter your phone number.")); return; }
  const button = $("sendCodeBtn");
  button.disabled = true;
  button.textContent = "Sending…";
  try {
    await api("/api/login/send_code", { method: "POST", body: { phone } });
    showAuthStep("code");
    $("codeInput").focus();
  } catch (error) {
    authError(error);
  } finally {
    button.disabled = false;
    button.textContent = "Send code";
  }
});

$("codeBackBtn").addEventListener("click", () => showAuthStep("phone"));

$("codeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = $("codeInput").value.trim();
  if (!code) { authError(new Error("Enter the code Telegram sent you.")); return; }
  const button = $("verifyCodeBtn");
  button.disabled = true;
  button.textContent = "Checking…";
  try {
    const result = await api("/api/login/code", { method: "POST", body: { code } });
    if (result.state === "password" && !result.authorized) {
      showAuthStep("password");
      $("passwordInput").focus();
      return;
    }
    await afterLogin();
  } catch (error) {
    authError(error);
  } finally {
    button.disabled = false;
    button.textContent = "Verify";
  }
});

$("passwordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = $("passwordInput").value;
  if (!password) { authError(new Error("Enter your two-step password.")); return; }
  const button = $("verifyPasswordBtn");
  button.disabled = true;
  button.textContent = "Signing in…";
  try {
    await api("/api/login/password", { method: "POST", body: { password } });
    await afterLogin();
  } catch (error) {
    authError(error);
  } finally {
    button.disabled = false;
    button.textContent = "Sign in";
  }
});

/* QR login */
async function startQr() {
  stopQr();
  $("qrImage").innerHTML = "";
  $("qrHint").textContent = "Loading QR code…";
  try {
    const payload = await api("/api/login/qr/start", { method: "POST" });
    renderQr(payload);
    S.qrTimer = setInterval(pollQr, 2000);
  } catch (error) {
    $("qrHint").textContent = error.message;
    $("qrImage").innerHTML = svg("imageOff");
  }
}

async function pollQr() {
  try {
    const payload = await api("/api/login/qr");
    renderQr(payload);
    if (payload.authorized) {
      stopQr();
      await afterLogin();
    }
  } catch (error) {
    stopQr();
    $("qrHint").textContent = error.message;
  }
}

function renderQr(payload) {
  const qr = (payload && payload.qr) || {};
  if (payload && payload.authorized) { $("qrHint").textContent = "Signed in."; return; }
  if (qr.svg) {
    $("qrImage").innerHTML = qr.svg;
    $("qrHint").textContent = "Telegram → Settings → Devices → Link Desktop Device. After linking, the QR refreshes on its own.";
  } else if (qr.url) {
    $("qrHint").textContent = "Preparing QR code…";
  } else if (payload && payload.error) {
    $("qrHint").textContent = payload.error;
  }
}

function stopQr() {
  if (S.qrTimer) clearInterval(S.qrTimer);
  S.qrTimer = null;
}

$("qrRetry").addEventListener("click", startQr);

async function afterLogin() {
  stopQr();
  S.status = await api("/api/status");
  if (!S.status.vault) showVaultScreen();
  else enterMain();
}

/* ------------------------------------------------------------------ vault */
let vaultEntries = [];

async function showVaultScreen() {
  showScreen("vaultScreen");
  $("vaultError").textContent = "";
  $("vaultList").innerHTML = '<div class="spinner"></div>';
  await loadVaultChoices(false);
}

async function loadVaultChoices(refresh) {
  try {
    let channels = [];
    if (refresh) {
      const data = await api("/api/vaults?refresh=true");
      channels = (data.vaults || []).map((v) => ({
        id: v.id, title: v.title || v.id, icon: v.icon || "🗄️"
      }));
    }
    if (!channels.length) {
      const data = await api("/api/channels");
      channels = (data.channels || []).map((c) => ({
        id: String(c.id), title: c.title || String(c.id), icon: c.broadcast ? "📦" : "🗄️"
      }));
    }
    vaultEntries = channels;
    renderVaultChoices();
  } catch (error) {
    $("vaultError").textContent = error.message;
    $("vaultList").innerHTML = "";
  }
}

function renderVaultChoices() {
  const needle = $("vaultFilter").value.trim().toLowerCase();
  const list = vaultEntries.filter((v) =>
    !needle || String(v.title).toLowerCase().includes(needle)
  );
  $("vaultList").innerHTML = "";
  if (!list.length) {
    $("vaultList").innerHTML = '<p class="muted small">No channels found. Create a vault in the desktop app first, then refresh.</p>';
    return;
  }
  for (const vault of list) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "vault-row";
    button.innerHTML =
      `<span class="vault-ico">${vault.icon || "🗄️"}</span>` +
      `<span class="vault-copy"><strong></strong><small></small></span>` +
      `<span class="chev">${svg("chev")}</span>`;
    button.querySelector("strong").textContent = vault.title;
    button.querySelector("small").textContent = vault.id;
    button.addEventListener("click", () => chooseVault(vault));
    $("vaultList").append(button);
  }
}

async function chooseVault(vault) {
  $("vaultError").textContent = "";
  $("vaultList").style.opacity = ".5";
  try {
    await api("/api/vault", { method: "POST", body: { vault: String(vault.id) } });
    S.status = await api("/api/status");
    $("vaultList").style.opacity = "1";
    enterMain();
  } catch (error) {
    $("vaultError").textContent = error.message;
    $("vaultList").style.opacity = "1";
  }
}

$("vaultFilter").addEventListener("input", renderVaultChoices);
$("vaultRefresh").addEventListener("click", async () => {
  $("vaultList").innerHTML = '<div class="spinner"></div>';
  await loadVaultChoices(true);
});
$("vaultSignOut").addEventListener("click", () => confirmAction(
  "Sign out?",
  "This removes the Telegram session from this phone. Your files and channel stay untouched.",
  "Sign out",
  async () => {
    await api("/api/logout", { method: "POST" });
    S.status = await api("/api/status");
    boot();
  }
));

/* ------------------------------------------------------------------- main */
async function enterMain() {
  showScreen("main");
  clearSelection();
  S.tab = "files";
  S.folder = "";
  S.q = "";
  S.kind = "all";
  S.sort = "date";
  S.dir = "desc";
  clearFilters(false);
  $("searchInput").value = "";
  $("searchBar").hidden = true;
  updateChrome();
  await Promise.all([loadNav(), loadItems({ reset: true })]);
  const count = (S.status.stats && S.status.stats.count) || 0;
  if (!count) startSync();
}

function updateChrome() {
  const status = S.status || {};
  const vault = status.vault || {};
  const user = status.user || {};
  $("topTitle").textContent = S.tab === "folders" ? "Folders"
    : S.tab === "favorites" ? "Favorites"
    : S.tab === "recent" ? "Recent"
    : S.tab === "more" ? "More"
    : S.filterLabel ? S.filterLabel
    : S.q ? `Search “${S.q}”`
    : S.folder ? S.folder.split("/").pop()
    : "All files";
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  $("topSub").textContent = vault.title
    ? `${vault.title}${name ? " · " + name : ""}`
    : name || "Telegram File Explorer";
  $("selectBtn").hidden = S.tab === "folders" || S.tab === "more";
  $("lockBtn").hidden = !status.pin_set;
  const canUpload = !!status.can_upload && (S.tab === "files" || S.tab === "folders");
  $("uploadFab").hidden = !canUpload;
  if (canUpload) positionUploadFab();
}

$("tabs").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-tab]");
  if (!button) return;
  switchTab(button.dataset.tab);
});

function resetSearch() {
  S.q = "";
  $("searchInput").value = "";
  $("searchBar").hidden = true;
}

let loadSeq = 0;

async function switchTab(tab) {
  clearSelection();
  S.tab = tab;
  if (tab !== "files") S.folder = "";
  for (const button of $("tabs").querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.tab === tab);
  }
  resetSearch();
  updateChrome();
  $("crumb").hidden = tab !== "files" || !S.folder;
  $("chips").hidden = tab !== "files";
  if (tab === "more") {
    loadSeq += 1;
    S.loading = false;
    $("content").innerHTML = "";
    renderMore();
    $("content").scrollTop = 0;
    return;
  }
  if (tab === "folders") {
    if (!S.nav) await loadNav();
    loadSeq += 1;
    S.loading = false;
    $("content").innerHTML = "";
    renderFolders();
    $("content").scrollTop = 0;
    return;
  }
  await loadItems({ reset: true });
  $("content").scrollTop = 0;
}

async function loadNav() {
  try {
    S.nav = await api("/api/nav");
  } catch (_) {
    S.nav = { folders: [], tags: [], collections: [] };
  }
}

/* -------------------------------------------------------------- item lists */
const KIND_CHIPS = [
  ["all", "All"], ["image", "Images"], ["video", "Videos"],
  ["audio", "Audio"], ["document", "Docs"]
];
const KIND_TITLES = {
  video: "Videos", image: "Images", document: "Docs", audio: "Audio",
  voice: "Voice notes", model: "3D models", cad: "CAD files",
  gif: "GIFs", sticker: "Stickers", other: "Other"
};

function renderChips() {
  $("chips").hidden = S.tab !== "files";
  $("chips").innerHTML = "";
  if (S.filterLabel) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip active";
    chip.textContent = `${S.filterLabel} ×`;
    chip.title = "Clear this filter";
    chip.addEventListener("click", () => clearFilters());
    $("chips").append(chip);
    const related = S.star && S.starInfo ? S.starInfo.related : null;
    if (related) {
      const entries = [["all", "All", related.total]].concat(
        (related.kinds || []).map((entry) => [entry.kind, KIND_TITLES[entry.kind] || entry.label, entry.count])
      );
      for (const [value, label, count] of entries) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chip" + (S.kind === value ? " active" : "");
        button.textContent = `${label} ${count}`;
        button.addEventListener("click", () => {
          S.kind = value;
          renderChips();
          loadItems({ reset: true });
        });
        $("chips").append(button);
      }
    }
    return;
  }
  for (const [value, label] of KIND_CHIPS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip" + (S.kind === value ? " active" : "");
    button.textContent = label;
    button.addEventListener("click", () => {
      S.kind = value;
      renderChips();
      loadItems({ reset: true });
    });
    $("chips").append(button);
  }
}

function renderCrumb() {
  const crumb = $("crumb");
  crumb.innerHTML = "";
  if (S.tab !== "files" || !S.folder) { crumb.hidden = true; return; }
  crumb.hidden = false;
  const parts = S.folder.split("/");
  const root = document.createElement("button");
  root.type = "button";
  root.textContent = "All files";
  root.addEventListener("click", () => openFolder(""));
  crumb.append(root);
  let path = "";
  parts.forEach((part, index) => {
    path = path ? `${path}/${part}` : part;
    const sep = document.createElement("span");
    sep.className = "sep";
    sep.textContent = "/";
    crumb.append(sep);
    if (index === parts.length - 1) {
      const here = document.createElement("span");
      here.className = "here";
      here.textContent = part;
      crumb.append(here);
    } else {
      const link = document.createElement("button");
      link.type = "button";
      link.textContent = part;
      const target = path;
      link.addEventListener("click", () => openFolder(target));
      crumb.append(link);
    }
  });
}

function openFolder(path) {
  clearSelection();
  S.folder = path;
  if (S.tab !== "files") {
    S.tab = "files";
    for (const button of $("tabs").querySelectorAll("button")) {
      button.classList.toggle("active", button.dataset.tab === "files");
    }
  }
  resetSearch();
  renderCrumb();
  updateChrome();
  loadItems({ reset: true });
}

function itemQuery() {
  const params = new URLSearchParams();
  params.set("limit", "60");
  params.set("sort", S.tab === "recent" ? "added" : S.sort || "date");
  params.set("direction", S.dir || "desc");
  if (S.q) params.set("q", S.q);
  if (S.tag) params.set("tag", S.tag);
  if (S.collection) params.set("collection", String(S.collection));
  if (S.star) params.set("star", String(S.star));
  if (S.hidden) params.set("hidden", "true");
  if (S.tab === "files") {
    if (S.folder) params.set("folder", S.folder);
    if (S.kind !== "all") params.set("kind", S.kind);
  }
  if (S.tab === "favorites") params.set("favorite", "true");
  if (S.cursor) params.set("cursor", S.cursor);
  return params;
}

function clearFilters(reload = true) {
  S.tag = "";
  S.collection = null;
  S.star = null;
  S.starInfo = null;
  S.hidden = false;
  S.filterLabel = "";
  S.kind = "all";
  if (reload) {
    renderChips();
    updateChrome();
    loadItems({ reset: true });
  }
}

function useFilter(kind, value, label) {
  clearSelection();
  S.tag = kind === "tag" ? value : "";
  S.collection = kind === "collection" ? value : null;
  S.star = kind === "star" ? value : null;
  S.starInfo = null;
  S.hidden = kind === "hidden";
  S.filterLabel = label;
  S.folder = "";
  if (S.tab !== "files") {
    S.tab = "files";
    for (const button of $("tabs").querySelectorAll("button")) {
      button.classList.toggle("active", button.dataset.tab === "files");
    }
  }
  resetSearch();
  closeSheet();
  $("crumb").hidden = true;
  updateChrome();
  renderChips();
  loadItems({ reset: true });
  if (S.star) {
    api(`/api/stars/${S.star}`)
      .then((star) => {
        if (S.star !== value) return;
        S.starInfo = star;
        renderChips();
      })
      .catch(() => {});
  }
}

async function loadItems({ reset = false } = {}) {
  if (!reset && S.loading) return;
  const seq = ++loadSeq;
  if (!reset && (S.done || !S.cursor)) {
    if (!S.items.length) renderItems();
    return;
  }
  S.loading = true;
  if (reset) {
    S.items = [];
    S.cursor = "";
    S.done = false;
    $("content").innerHTML = '<div class="spinner"></div>';
    $("content").scrollTop = 0;
    renderCrumb();
  }
  try {
    const data = await api(`/api/items?${itemQuery().toString()}`);
    if (seq !== loadSeq) return;
    const items = data.items || [];
    S.items = reset ? items : S.items.concat(items);
    S.cursor = data.next_cursor || "";
    S.done = !S.cursor;
    renderItems();
  } catch (error) {
    if (seq !== loadSeq) return;
    $("content").innerHTML = "";
    const node = document.createElement("div");
    node.className = "empty";
    node.innerHTML = `${svg("imageOff")}<strong>Could not load files</strong><p></p>`;
    node.querySelector("p").textContent = error.message;
    const retry = document.createElement("button");
    retry.className = "btn";
    retry.textContent = "Try again";
    retry.addEventListener("click", () => loadItems({ reset: true }));
    node.append(retry);
    $("content").append(node);
  } finally {
    if (seq === loadSeq) S.loading = false;
  }
}

function renderItems() {
  if (S.tab === "folders" || S.tab === "more") return;
  renderCrumb();
  renderChips();
  const content = $("content");
  content.innerHTML = "";
  if (!S.items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    const title = S.tab === "folders" ? "No folders yet"
      : S.tab === "favorites" ? "No favorites yet"
      : S.q ? "No matches"
      : "Library is empty";
    const text = S.tab === "favorites"
      ? "Star files in the desktop app and they appear here."
      : S.q ? "Try a different word."
      : "Sync with Telegram to bring your channel into this app.";
    empty.innerHTML = `${svg(S.tab === "folders" ? "folder" : "files")}<strong></strong><p></p>`;
    empty.querySelector("strong").textContent = title;
    empty.querySelector("p").textContent = text;
    if (!S.q) {
      const sync = document.createElement("button");
      sync.className = "btn primary";
      sync.textContent = "Sync now";
      sync.addEventListener("click", () => startSync());
      empty.append(sync);
    }
    content.append(empty);
    return;
  }
  const grid = document.createElement("div");
  grid.className = "grid";
  S.items.forEach((item, index) => grid.append(itemTile(item, index)));
  content.append(grid);
  const more = document.createElement("div");
  more.className = "load-more";
  if (!S.done) more.innerHTML = '<div class="spinner small"></div>';
  content.append(more);
  updateChrome();
  if (S.selecting) syncSelectionChrome();
}

function softBreaks(text) {
  return String(text).replace(/([_./\\-])/g, "$1\u200B");
}

function itemTile(item, index) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "tile";
  if (item.has_thumb && item.thumb_url) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = "";
    img.src = item.thumb_url;
    tile.append(img);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "fallback";
    fallback.innerHTML = svg(itemIcon(item));
    tile.append(fallback);
  }
  if (item.kind === "video" || item.kind === "gif") {
    const badge = document.createElement("span");
    badge.className = "play-badge";
    badge.innerHTML = svg("play");
    tile.append(badge);
  }
  const duration = humanDuration(item.duration);
  if (duration) {
    const badge = document.createElement("span");
    badge.className = "dur";
    badge.textContent = duration;
    tile.append(badge);
  }
  if (item.part_of && item.part_of.count > 1) {
    const part = document.createElement("span");
    part.className = "part";
    part.textContent = `${item.part_of.count} parts`;
    tile.append(part);
  }
  const caption = document.createElement("span");
  caption.className = "caption";
  caption.textContent = softBreaks(item.name || "File");
  tile.append(caption);
  tile.dataset.id = String(item.id);
  tile.addEventListener("click", () => {
    if (Date.now() < S.suppressClick) return;
    if (S.selecting) {
      toggleSelection(tile, item.id);
      return;
    }
    openViewer(index);
  });
  withLongPress(tile, () => {
    if (S.selecting) {
      toggleSelection(tile, item.id);
      return;
    }
    S.selecting = true;
    S.selection.add(item.id);
    paintTile(tile, true);
    syncSelectionChrome();
  });
  if (S.selection.has(item.id)) paintTile(tile, true);
  return tile;
}

/* ------------------------------------------------------------- selection */
function paintTile(tile, on) {
  if (!tile) return;
  tile.classList.toggle("selected", on);
  let badge = tile.querySelector(".check-badge");
  if (on && !badge) {
    badge = document.createElement("span");
    badge.className = "check-badge";
    badge.innerHTML = svg("check");
    tile.append(badge);
  } else if (!on && badge) {
    badge.remove();
  }
}

function toggleSelection(tile, id) {
  if (S.selection.has(id)) {
    S.selection.delete(id);
    paintTile(tile, false);
  } else {
    S.selection.add(id);
    paintTile(tile, true);
  }
  if (S.selecting && !S.selection.size) S.selecting = false;
  syncSelectionChrome();
}

function syncSelectionChrome() {
  const count = S.selection.size;
  const active = S.selecting;
  $("mainTopbar").hidden = active;
  $("selectTopbar").hidden = !active;
  $("selectActions").hidden = !active;
  $("tabs").hidden = active;
  const status = S.status || {};
  $("uploadFab").hidden = active || !status.can_upload
    || (S.tab !== "files" && S.tab !== "folders");
  if (!active) positionUploadFab();
  if (!active) return;
  $("selectTitle").textContent = count
    ? `${count} selected`
    : "Select files";
  const tiles = [...$("content").querySelectorAll(".tile[data-id]")];
  const all = tiles.length > 0
    && tiles.every((tile) => S.selection.has(Number(tile.dataset.id)));
  $("selectAll").textContent = all ? "Clear all" : "Select all";
  $("selectDownload").disabled = count === 0;
  $("selectDownload").textContent = count === 0
    ? "Download"
    : count === 1 ? "Download file" : `Download ZIP (${count})`;
}

function clearSelection() {
  S.selecting = false;
  if (S.selection.size) {
    S.selection.clear();
    for (const tile of $("content").querySelectorAll(".tile.selected")) {
      paintTile(tile, false);
    }
  }
  syncSelectionChrome();
}

function toggleSelectAll() {
  const tiles = [...$("content").querySelectorAll(".tile[data-id]")];
  if (!tiles.length) return;
  const all = tiles.every((tile) => S.selection.has(Number(tile.dataset.id)));
  for (const tile of tiles) {
    const id = Number(tile.dataset.id);
    if (all) S.selection.delete(id); else S.selection.add(id);
    paintTile(tile, !all);
  }
  syncSelectionChrome();
}

function downloadSelected() {
  const ids = [...S.selection];
  if (!ids.length) return;
  if (ids.length === 1) {
    const item = S.items.find((entry) => entry.id === ids[0]);
    clearSelection();
    if (item) downloadItem(item);
    return;
  }
  bridgeDownload(
    `/api/batch/download?ids=${ids.join(",")}`,
    `Selected files (${ids.length}).zip`
  );
  clearSelection();
}

function downloadFolder(folder) {
  const name = folder.name || (folder.folder || "Folder").split("/").pop();
  bridgeDownload(
    `/api/folders/download?name=${encodeURIComponent(folder.folder)}`,
    `${name}.zip`
  );
}

function withLongPress(el, onLongPress) {
  let timer = null;
  let startX = 0;
  let startY = 0;
  const cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
  };
  el.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    startX = event.clientX;
    startY = event.clientY;
    timer = setTimeout(() => {
      timer = null;
      S.suppressClick = Date.now() + 700;
      if (navigator.vibrate) navigator.vibrate(15);
      onLongPress();
    }, 450);
  });
  el.addEventListener("pointermove", (event) => {
    if (timer && (Math.abs(event.clientX - startX) > 10
      || Math.abs(event.clientY - startY) > 10)) cancel();
  });
  el.addEventListener("pointerup", cancel);
  el.addEventListener("pointercancel", cancel);
  el.addEventListener("contextmenu", (event) => event.preventDefault());
}

$("content").addEventListener("scroll", () => {
  const el = $("content");
  if (S.tab !== "files" && S.tab !== "favorites" && S.tab !== "recent") return;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 600) {
    if (!S.loading && !S.done) loadItems();
  }
});

/* ---------------------------------------------------------------- folders */
function renderFolders() {
  const content = $("content");
  content.innerHTML = "";
  const folders = (S.nav && S.nav.folders) || [];
  if (!folders.length) {
    content.innerHTML = `<div class="empty">${svg("folder")}<strong>No folders yet</strong><p>Folders you create in the desktop app show up here after a sync.</p></div>`;
    return;
  }
  const list = document.createElement("div");
  list.className = "list";
  for (const folder of folders) {
    const row = document.createElement("div");
    row.className = "row";
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    row.style.marginLeft = `${Math.min(folder.depth || 0, 4) * 12}px`;
    row.innerHTML =
      `<span class="thumb">${svg("folder")}</span>` +
      `<span class="copy"><strong></strong><small></small></span>` +
      `<span class="chev">${svg("chev")}</span>`;
    row.querySelector("strong").textContent = folder.name || folder.folder;
    row.querySelector("small").textContent =
      `${folder.n || 0} file${folder.n === 1 ? "" : "s"} · ${humanSize(folder.size)}`;
    const action = document.createElement("button");
    action.type = "button";
    action.className = "row-action";
    action.setAttribute("aria-label",
      `Download ${folder.name || folder.folder} as a ZIP file`);
    action.innerHTML = svg("download");
    action.addEventListener("click", (event) => {
      event.stopPropagation();
      downloadFolder(folder);
    });
    row.insertBefore(action, row.querySelector(".chev"));
    row.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      openFolder(folder.folder);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openFolder(folder.folder);
    });
    list.append(row);
  }
  content.append(list);
}

/* --------------------------------------------------------------- sync */
async function startSync(full = false) {
  if (S.syncTimer) { toast("A sync is already running."); return; }
  try {
    const data = await api(`/api/sync${full ? "?full=true" : ""}`, { method: "POST" });
    if (!data.started) { toast("Sync already running."); return; }
    $("syncBanner").hidden = false;
    pollSync();
  } catch (error) {
    toast(error.message, "error");
  }
}

function pollSync() {
  if (S.syncTimer) return;
  $("syncBanner").hidden = false;
  S.syncTimer = setInterval(syncTick, 900);
  syncTick();
}

async function syncTick() {
  try {
    const data = await api("/api/sync");
    const sync = data.sync || {};
    const total = Number(sync.total) || 0;
    const scanned = Number(sync.scanned) || 0;
    const pct = total ? Math.min(100, Math.round((scanned / total) * 100)) : (sync.running ? 12 : 100);
    $("syncFill").style.width = `${pct}%`;
    $("syncText").textContent = sync.running
      ? `Syncing… ${scanned.toLocaleString()}${total ? " / " + total.toLocaleString() : ""} messages`
      : "Finishing…";
    if (!sync.running) {
      clearInterval(S.syncTimer);
      S.syncTimer = null;
      $("syncBanner").hidden = true;
      if (sync.error) toast(sync.error, "error");
      else toast(`Sync complete — ${(sync.stored || 0).toLocaleString()} file(s) indexed.`, "success");
      S.status = await api("/api/status");
      await loadNav();
      if (S.tab === "more") renderMore();
      else if (S.tab === "folders") renderFolders();
      else loadItems({ reset: true });
    }
  } catch (error) {
    clearInterval(S.syncTimer);
    S.syncTimer = null;
    $("syncBanner").hidden = true;
    toast(error.message, "error");
  }
}

$("syncBtn").addEventListener("click", () => startSync());

/* ---------------------------------------------------------------- search */
$("searchBtn").addEventListener("click", () => {
  if (S.tab === "more") switchTab("files");
  const bar = $("searchBar");
  bar.hidden = !bar.hidden;
  if (!bar.hidden) {
    $("searchInput").value = S.q;
    $("searchInput").focus();
  } else if (S.q) {
    S.q = "";
    loadItems({ reset: true });
  }
});

let searchTimer = null;
$("searchInput").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const value = $("searchInput").value.trim();
    if (value === S.q) return;
    S.q = value;
    updateChrome();
    loadItems({ reset: true });
  }, 320);
});

$("searchClose").addEventListener("click", () => {
  $("searchBar").hidden = true;
  if (S.q) {
    S.q = "";
    $("searchInput").value = "";
    loadItems({ reset: true });
  }
});

/* ---------------------------------------------------------------- viewer */
function openViewer(index) {
  if (index < 0 || index >= S.items.length) return;
  const item = S.items[index];
  if (item && item.part_of && item.part_of.count > 1) { openItemInfo(item); return; }
  S.viewerIndex = index;
  renderViewer();
  $("viewer").hidden = false;
}

function closeViewer() {
  const viewer = $("viewer");
  viewer.querySelectorAll("video, audio").forEach((media) => {
    try { media.pause(); } catch (_) { /* ignore */ }
  });
  if (window.TFEReader) {
    try { window.TFEReader.close(); } catch (_) { /* ignore */ }
  }
  const stage = $("viewerStage");
  stage.classList.remove("reader");
  stage.innerHTML = "";
  $("viewer").hidden = true;
  S.viewerIndex = -1;
}

function currentItem() {
  return S.items[S.viewerIndex] || null;
}

function renderViewer() {
  const item = currentItem();
  if (!item) { closeViewer(); return; }
  if (item.part_of && item.part_of.count > 1) { closeViewer(); openItemInfo(item); return; }
  $("viewerName").textContent = item.name || "File";
  const bits = [shortKind(item), humanSize(item.size)];
  if (item.folder) bits.push(item.folder);
  $("viewerMeta").textContent = bits.join(" · ");
  $("viewerPrev").disabled = S.viewerIndex <= 0;
  $("viewerNext").disabled = S.viewerIndex >= S.items.length - 1;
  $("viewerPrev").style.opacity = S.viewerIndex <= 0 ? ".3" : "1";
  $("viewerNext").style.opacity = S.viewerIndex >= S.items.length - 1 ? ".3" : "1";

  const stage = $("viewerStage");
  stage.classList.remove("reader");
  stage.innerHTML = "";
  updateViewerFavorite(item);
  const url = item.stream_url || `/api/stream/${item.id}`;
  const kind = item.kind || "document";

  if (kind === "video") {
    if (window.AndroidBridge && typeof window.AndroidBridge.openPlayer === "function") {
      openNativePlayer(item);
      return;
    }
    showVideoElement(item, stage, url);
  } else if (kind === "audio" || kind === "voice") {
    const wrap = document.createElement("div");
    wrap.style.width = "100%";
    const artwork = document.createElement("div");
    artwork.style.cssText = "display:grid;place-items:center;padding:30px 0;color:#68717c;";
    artwork.innerHTML = svg("audio");
    artwork.querySelector("svg").style.width = "86px";
    artwork.querySelector("svg").style.height = "86px";
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.autoplay = true;
    audio.src = url;
    wrap.append(artwork, audio);
    stage.append(wrap);
    audio.addEventListener("error", () => showViewerFallback(item, stage, "This audio format cannot play here. Download it instead."));
  } else if (kind === "image" || kind === "gif" || kind === "sticker") {
    const img = document.createElement("img");
    img.alt = item.name || "";
    img.src = url;
    stage.append(img);
    img.addEventListener("error", () => showViewerFallback(item, stage, "This image cannot be shown. Download it to open in another app."));
  } else if (item.reader && window.TFEReader) {
    stage.classList.add("reader");
    const reader = window.TFEReader;
    Promise.resolve(reader.open(stage, item)).catch((error) => {
      stage.classList.remove("reader");
      showViewerFallback(item, stage, error.message || "This document could not be opened.");
    });
  } else if (item.viewer && window.TFE3D) {
    renderModelCard(item, stage);
  } else if (isTextItem(item)) {
    renderText(item, stage);
  } else {
    showViewerFallback(item, stage, previewHint(item));
  }
}

function showVideoElement(item, stage, url) {
  const video = document.createElement("video");
  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = "metadata";
  if (item.has_thumb && item.thumb_url) video.poster = item.thumb_url;
  video.src = url;
  stage.append(video);
  video.addEventListener("error", () => showViewerFallback(
    item, stage, "This video format cannot play here. Download it to open in another app."));
}

/* The phone app hands movies to its native libVLC player, which reads MKV and
   every other container straight from the local stream and lists embedded
   subtitle tracks. */
async function openNativePlayer(item) {
  const stage = $("viewerStage");
  stage.innerHTML = '<div class="viewer-fallback"><div class="spinner"></div><span>Opening the player…</span></div>';
  try {
    const info = await api(`/api/play/${item.id}/info`);
    const absolute = (path) => new URL(path, location.origin).href;
    const payload = {
      item_id: item.id,
      title: item.name || info.name || "Movie",
      url: absolute(info.stream_url || `/api/stream/${item.id}`),
      position: Number(info.play_pos) || 0,
      query: (item.movie && item.movie.title) || "",
      sidecars: (info.sidecars || []).map((sub) => ({
        label: sub.label || sub.name || "Subtitle",
        language: sub.language || "",
        lang: sub.lang || "",
        url: absolute(sub.url)
      }))
    };
    window.AndroidBridge.openPlayer(JSON.stringify(payload));
    closeViewer();
  } catch (error) {
    showVideoElement(item, stage, item.stream_url || `/api/stream/${item.id}`);
  }
}

function renderModelCard(item, stage) {
  stage.innerHTML = "";
  const box = document.createElement("div");
  box.className = "viewer-fallback";
  box.innerHTML = `${svg("cube")}<strong></strong><p class="muted small">${window.TFE3D ? (window.AndroidBridge ? "Spin the model to inspect it." : "Spin the model, then save a thumbnail if you like.") : "The 3D viewer could not be loaded."}</p>`;
  box.querySelector("strong").textContent = item.name || "3D model";
  if (window.TFE3D) {
    const open = document.createElement("button");
    open.className = "btn primary";
    open.textContent = "Open 3D viewer";
    open.addEventListener("click", () => window.TFE3D.open(item));
    box.append(open);
  }
  const download = document.createElement("button");
  download.className = "btn";
  download.textContent = "Download";
  download.addEventListener("click", () => downloadItem(item));
  box.append(download);
  stage.append(box);
}

function previewHint(item) {
  if (item.reader) return "This document cannot be opened in the reader. Download it and open it in another app.";
  if (item.viewer) return "This 3D file cannot be previewed. Download it and open it in another app.";
  return "Download this file to open it in another app.";
}

function isTextItem(item) {
  if (item.reader === "txt") return true;
  const mime = String(item.mime || "").toLowerCase();
  if (mime.startsWith("text/") && !mime.includes("html")) return true;
  return /\.(txt|md|markdown|log|json|csv|xml|ini|cfg|yaml|yml|py|js|ts|css|sh)$/i.test(item.name || "");
}

async function renderText(item, stage) {
  if (Number(item.size) > 2 * 1024 * 1024) {
    showViewerFallback(item, stage, "This text file is larger than 2 MB. Download it to read.");
    return;
  }
  const loading = document.createElement("div");
  loading.className = "viewer-fallback";
  loading.innerHTML = '<div class="spinner"></div><span>Loading text…</span>';
  stage.append(loading);
  try {
    const res = await fetch(`/api/file/${item.id}`, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`Could not load the file (${res.status}).`);
    const text = await res.text();
    stage.innerHTML = "";
    const pre = document.createElement("pre");
    pre.textContent = text;
    stage.append(pre);
  } catch (error) {
    stage.innerHTML = "";
    showViewerFallback(item, stage, error.message);
  }
}

function showViewerFallback(item, stage, message) {
  stage.innerHTML = "";
  const box = document.createElement("div");
  box.className = "viewer-fallback";
  box.innerHTML = `${svg(itemIcon(item))}<strong></strong><p class="muted small"></p>`;
  box.querySelector("strong").textContent = item.name || "File";
  box.querySelector("p").textContent = message;
  const download = document.createElement("button");
  download.className = "btn";
  download.textContent = "Download";
  download.addEventListener("click", () => downloadItem(item));
  box.append(download);
  stage.append(box);
}

$("viewerClose").addEventListener("click", closeViewer);
$("viewerPrev").addEventListener("click", () => {
  if (S.viewerIndex > 0) { S.viewerIndex -= 1; renderViewer(); }
});
$("viewerNext").addEventListener("click", () => {
  if (S.viewerIndex < S.items.length - 1) { S.viewerIndex += 1; renderViewer(); }
});
$("viewerFavorite").addEventListener("click", async () => {
  const item = currentItem();
  if (!item) return;
  const button = $("viewerFavorite");
  button.disabled = true;
  try {
    const next = !item.favorite;
    const data = await api(`/api/items/${item.id}`, { method: "PATCH", body: { favorite: next } });
    item.favorite = next;
    const index = S.items.findIndex((entry) => entry.id === item.id);
    if (index >= 0) S.items[index] = { ...S.items[index], ...(data.item || {}), favorite: next };
    updateViewerFavorite(currentItem());
    toast(next ? "Added to favorites." : "Removed from favorites.", "success");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

function updateViewerFavorite(item) {
  const button = $("viewerFavorite");
  if (!button) return;
  const on = Boolean(item && item.favorite);
  button.classList.toggle("on", on);
  button.title = on ? "Remove from favorites" : "Add to favorites";
  setIcon(button, "star");
}
$("viewerDownload").addEventListener("click", () => {
  const item = currentItem();
  if (item) downloadItem(item);
});
$("viewerInfo").addEventListener("click", () => {
  const item = currentItem();
  if (item) openItemInfo(item);
});

/* -------------------------------------------------------------- download */
function bridgeDownload(url, filename) {
  const absolute = new URL(url, location.origin).toString();
  if (window.AndroidBridge && typeof window.AndroidBridge.download === "function") {
    window.AndroidBridge.download(absolute, filename || "file");
    initDownloadBar();
    toast("Download started.", "success");
    return;
  }
  const anchor = document.createElement("a");
  anchor.href = absolute;
  anchor.download = filename || "file";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  toast("Download started.");
}

/* -------------------------------------------------------- download status */
function nativeDownloads() {
  return !!(window.AndroidBridge
    && typeof window.AndroidBridge.downloadStatus === "function");
}

function initDownloadBar() {
  if (!nativeDownloads()) return;
  S.dlCollapsed = localStorage.getItem("tfe_dl_collapsed") === "1";
  applyDownloadCollapse();
  pollDownloads();
  if (!S.dlTimer) S.dlTimer = setInterval(pollDownloads, 1000);
}

function applyDownloadCollapse() {
  const bar = $("dlBar");
  bar.classList.toggle("collapsed", S.dlCollapsed);
  $("dlToggle").setAttribute("aria-expanded", S.dlCollapsed ? "false" : "true");
}

function pollDownloads() {
  if (!nativeDownloads()) return;
  let list;
  try {
    list = JSON.parse(window.AndroidBridge.downloadStatus() || "[]");
  } catch (_) {
    return;
  }
  if (!Array.isArray(list)) return;
  const now = Date.now();
  for (const download of list) {
    const key = String(download.id);
    if (download.running) {
      const previous = S.dlRates[key];
      if (previous) {
        const seconds = (now - previous.at) / 1000;
        if (seconds > 0.4) {
          const rate = Math.max(0, (download.bytes - previous.bytes) / seconds);
          previous.rate = previous.rate ? previous.rate * 0.6 + rate * 0.4 : rate;
          previous.bytes = download.bytes;
          previous.at = now;
        }
      } else {
        S.dlRates[key] = { bytes: download.bytes, at: now, rate: 0 };
      }
    } else {
      delete S.dlRates[key];
    }
  }
  S.dlNative = list;
  mergeTransferItems();
}

function downloadPercent(download) {
  const total = Number(download.total) || 0;
  const bytes = Number(download.bytes) || 0;
  return download.done ? 100
    : total ? Math.min(100, Math.round((bytes / total) * 100))
      : download.running ? 0 : 100;
}

function downloadInfo(download) {
  const total = Number(download.total) || 0;
  const bytes = Number(download.bytes) || 0;
  if (download.kind === "upload") {
    if (download.sending) {
      return `Sending to the app · ${humanSize(bytes)} of ${humanSize(total)}`;
    }
    if (download.done) return "Uploaded to Telegram";
    if (download.failed) return download.error || "Upload failed";
    if (download.cancelled) return "Upload cancelled";
    if (download.state === "queued") return "Queued";
    if (download.state === "splitting") return "Preparing parts…";
    const rate = (S.dlRates[download.id] || {}).rate;
    return total
      ? `${humanSize(bytes)} of ${humanSize(total)}${rate ? ` · ${humanSize(rate)}/s` : ""}`
      : humanSize(bytes);
  }
  if (download.done) return "Saved to Downloads/Telegram Files";
  if (download.failed) return "Download failed";
  if (download.paused) {
    return `Paused at ${humanSize(bytes)}${total ? ` of ${humanSize(total)}` : ""}`;
  }
  const rate = (S.dlRates[String(download.id)] || {}).rate;
  return total
    ? `${humanSize(bytes)} of ${humanSize(total)}${rate ? ` · ${humanSize(rate)}/s` : ""}`
    : humanSize(bytes);
}

function downloadRow(download) {
  const pct = downloadPercent(download);
  const row = document.createElement("div");
  row.className = "dl-row " + (download.paused ? "paused"
    : download.done ? "done" : download.failed ? "failed" : "running");

  const top = document.createElement("div");
  top.className = "dl-top";
  const icon = document.createElement("span");
  icon.className = "dl-icon";
  icon.innerHTML = svg(download.paused ? "pause"
    : download.done ? "check" : download.failed ? "close"
      : download.kind === "upload" ? "upload" : "download");
  const name = document.createElement("span");
  name.className = "dl-name";
  name.textContent = download.name || "Download";
  name.title = name.textContent;
  const pctEl = document.createElement("span");
  pctEl.className = "dl-pct";
  pctEl.textContent = download.failed ? "!" : `${pct}%`;
  top.append(icon, name, pctEl);

  const track = document.createElement("div");
  track.className = "dl-track";
  const fill = document.createElement("i");
  fill.style.width = `${pct}%`;
  track.append(fill);

  const sub = document.createElement("div");
  sub.className = "dl-sub";
  const info = document.createElement("span");
  info.className = "dl-info";
  info.textContent = downloadInfo(download);
  const actions = document.createElement("span");
  actions.className = "dl-actions";
  if (download.kind === "upload") {
    if (download.sending) {
      actions.append(dlAction("Cancel", () => cancelLocalUpload()));
    } else if (download.running) {
      actions.append(dlAction("Cancel", () => cancelUpload(download.client)));
    } else {
      actions.append(dlAction("Clear", () => dismissUpload(download)));
    }
  } else {
    if (download.running) {
      actions.append(dlAction("Pause", () => window.AndroidBridge.pauseDownload(download.id)));
    }
    if (download.paused) {
      actions.append(dlAction("Resume", () => window.AndroidBridge.resumeDownload(download.id)));
    }
    if (!download.done && !download.failed) {
      actions.append(dlAction("Cancel", () => window.AndroidBridge.cancelDownload(download.id)));
    }
    if (download.done) {
      actions.append(dlAction("Open", () => window.AndroidBridge.openDownload(download.id)));
      actions.append(dlAction("Clear", () => window.AndroidBridge.clearDownload(download.id)));
    }
    if (download.failed) {
      actions.append(dlAction("Clear", () => window.AndroidBridge.clearDownload(download.id)));
    }
  }
  sub.append(info, actions);
  row.append(top, track, sub);
  return row;
}

function dlAction(label, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    try { handler(); } catch (_) { /* ignore */ }
    setTimeout(pollDownloads, 400);
  });
  return button;
}

function updateDownloadRow(row, download) {
  const pct = downloadPercent(download);
  row.querySelector(".dl-pct").textContent = download.failed ? "!" : `${pct}%`;
  row.querySelector(".dl-track > i").style.width = `${pct}%`;
  row.querySelector(".dl-info").textContent = downloadInfo(download);
}

function renderDownloads() {
  const bar = $("dlBar");
  const list = $("dlList");
  const nodes = S.dlNodes || (S.dlNodes = new Map());
  const alive = new Set();
  for (const download of S.dlItems) {
    const key = String(download.id);
    alive.add(key);
    const state = download.paused ? "paused"
      : download.done ? "done" : download.failed ? "failed"
        : download.cancelled ? "cancelled" : "running";
    const name = download.name || "Download";
    let node = nodes.get(key);
    if (!node || node.state !== state || node.name !== name) {
      const row = downloadRow(download);
      if (node && node.row.parentNode === list) {
        list.replaceChild(row, node.row);
      } else {
        list.append(row);
      }
      node = { row, state, name };
      nodes.set(key, node);
    } else {
      updateDownloadRow(node.row, download);
    }
  }
  for (const [key, node] of nodes) {
    if (!alive.has(key)) {
      node.row.remove();
      nodes.delete(key);
    }
  }
  S.dlItems.forEach((download, index) => {
    const node = nodes.get(String(download.id));
    if (node && list.children[index] !== node.row) {
      list.insertBefore(node.row, list.children[index] || null);
    }
  });
  const active = S.dlItems.filter((entry) => entry.running).length;
  const paused = S.dlItems.filter((entry) => entry.paused).length;
  const failed = S.dlItems.filter((entry) => entry.failed).length;
  const uploaded = S.dlItems.filter((entry) => entry.kind === "upload" && entry.done).length;
  const saved = S.dlItems.filter((entry) => entry.kind !== "upload" && entry.done).length;
  const parts = [];
  if (active) parts.push(`${active} active`);
  if (paused) parts.push(`${paused} paused`);
  if (failed) parts.push(`${failed} failed`);
  if (uploaded) parts.push(`${uploaded} uploaded`);
  if (saved) parts.push(`${saved} saved`);
  $("dlSummary").textContent = parts.join(" · ");
  bar.hidden = !S.dlItems.length;
  if (bar.hidden && S.dlTimer) {
    clearInterval(S.dlTimer);
    S.dlTimer = null;
  }
}

function uploadIsActive(state) {
  return state === "queued" || state === "uploading" || state === "splitting";
}

function uploadItems() {
  const items = [];
  const local = S.localUpload;
  if (local) {
    items.push({
      id: `local-${local.client}`,
      kind: "upload",
      client: local.client,
      name: local.name,
      bytes: local.sent,
      total: local.size,
      sending: true,
      running: true
    });
  }
  for (const transfer of S.dlUploads) {
    const state = String(transfer.state || "");
    items.push({
      id: `upload-${transfer.id}`,
      kind: "upload",
      client: transfer.client,
      name: transfer.name || "Upload",
      bytes: Number(transfer.sent) || 0,
      total: Number(transfer.size) || 0,
      state,
      error: transfer.error,
      running: uploadIsActive(state),
      done: state === "done",
      failed: state === "error",
      cancelled: state === "cancelled",
      paused: false
    });
  }
  return items;
}

function mergeTransferItems() {
  S.dlItems = [...uploadItems(), ...S.dlNative];
  renderDownloads();
  positionUploadFab();
}

function positionUploadFab() {
  const fab = $("uploadFab");
  if (!fab || fab.hidden) return;
  const tabs = $("tabs").offsetHeight || 0;
  const bar = $("dlBar").hidden ? 0 : $("dlBar").offsetHeight || 0;
  fab.style.bottom = `${tabs + bar + 16}px`;
}

async function downloadItem(item) {
  if (item.part_of) {
    try {
      toast("Joining file parts…");
      const data = await api("/api/merge", { method: "POST", body: { item_id: item.id } });
      const transfer = data.transfer || {};
      if (!transfer.id) throw new Error("The server did not start the merge.");
      await waitForTransfer(transfer.id);
    } catch (error) {
      toast(error.message, "error");
    }
    return;
  }
  bridgeDownload(item.download_url || `/api/download/${item.id}`, item.name || "file");
}

function waitForTransfer(id) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      try {
        const data = await api("/api/transfers");
        const transfer = (data.transfers || []).find((entry) => entry.id === id);
        if (!transfer) return;
        if (transfer.state === "ready" && transfer.result_url) {
          clearInterval(timer);
          bridgeDownload(transfer.result_url, transfer.result_name || "file");
          resolve();
        } else if (transfer.state === "error" || transfer.error) {
          clearInterval(timer);
          reject(new Error(transfer.error || "The parts could not be joined."));
        } else if (transfer.state === "cancelled") {
          clearInterval(timer);
          reject(new Error("The merge was cancelled."));
        } else if (tries > 1200) {
          clearInterval(timer);
          reject(new Error("The merge is taking too long."));
        }
      } catch (error) {
        if (tries > 8) { clearInterval(timer); reject(error); }
      }
    }, 900);
  });
}

/* ---------------------------------------------------------------- upload */
function openUploadPicker() {
  const status = S.status || {};
  if (!status.can_upload) return;
  if (!status.authorized || !status.vault) {
    toast("Log in and choose a channel first.", "error");
    return;
  }
  $("uploadInput").click();
}

function rememberUploads(list) {
  const byId = new Map(S.dlUploads.map((entry) => [entry.id, entry]));
  for (const transfer of list) byId.set(transfer.id, transfer);
  S.dlUploads = [...byId.values()]
    .filter((entry) => !S.uploadDismissed.has(`upload-${entry.id}`));
}

function startUploadPolling() {
  if (S.uploadTimer) return;
  refreshUploads();
  S.uploadTimer = setInterval(refreshUploads, 1200);
}

function stopUploadPolling() {
  if (!S.uploadTimer) return;
  clearInterval(S.uploadTimer);
  S.uploadTimer = null;
}

async function refreshUploads() {
  if (!S.uploadClients.size) return;
  let list;
  try {
    const data = await api("/api/transfers");
    list = data.transfers || [];
  } catch (_) {
    return;
  }
  const next = list
    .filter((transfer) => transfer.client && S.uploadClients.has(transfer.client))
    .filter((transfer) => !S.uploadDismissed.has(`upload-${transfer.id}`));
  const now = Date.now();
  for (const transfer of next) {
    const key = `upload-${transfer.id}`;
    if (uploadIsActive(transfer.state)) {
      const sample = S.dlRates[key];
      if (sample) {
        const seconds = (now - sample.at) / 1000;
        if (seconds > 0.4) {
          const sent = Number(transfer.sent) || 0;
          const rate = Math.max(0, (sent - sample.bytes) / seconds);
          sample.rate = sample.rate ? sample.rate * 0.6 + rate * 0.4 : rate;
          sample.bytes = sent;
          sample.at = now;
        }
      } else {
        S.dlRates[key] = { bytes: Number(transfer.sent) || 0, at: now, rate: 0 };
      }
    } else {
      delete S.dlRates[key];
    }
  }
  S.dlUploads = next;
  mergeTransferItems();
  const active = next.some((transfer) => uploadIsActive(transfer.state));
  if (active || S.localUpload) return;
  stopUploadPolling();
  const finished = next.filter((transfer) => !S.uploadSeen.has(transfer.id));
  if (!finished.length) return;
  for (const transfer of finished) S.uploadSeen.add(transfer.id);
  const done = finished.filter((transfer) => transfer.state === "done").length;
  const failed = finished.filter((transfer) => transfer.state === "error").length;
  if (done) toast(done === 1 ? "File uploaded." : `${done} files uploaded.`, "success", 5000);
  if (failed) {
    const first = finished.find((transfer) => transfer.state === "error");
    toast(
      failed === 1
        ? (first && first.error) || "The upload failed."
        : `${failed} uploads failed.`,
      "error",
      8000
    );
  }
  if (done) {
    setTimeout(() => {
      if (S.tab === "files") loadItems({ reset: true }).catch(() => {});
      loadNav().catch(() => {});
    }, 800);
  }
}

function sendUpload(files) {
  if (!files.length || S.localUpload) {
    if (S.localUpload) toast("Wait for the current upload to finish.", "error");
    return;
  }
  const limit = Number((S.status || {}).upload_limit) || 0;
  const tooBig = files.find((file) => limit && file.size > limit);
  if (tooBig) {
    toast(
      `${tooBig.name} is larger than ${humanSize(limit)}. `
      + "Use the desktop app to split it into parts.",
      "error",
      8000
    );
    return;
  }
  const empty = files.find((file) => !file.size);
  if (empty) {
    toast(`${empty.name} is empty.`, "error");
    return;
  }
  const client = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const folder = S.folder || "";
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const form = new FormData();
  form.append("client", client);
  form.append("paths", JSON.stringify(files.map((file) => file.name)));
  if (folder) form.append("folder", folder);
  for (const file of files) form.append("files", file, file.name);
  const xhr = new XMLHttpRequest();
  S.uploadClients.add(client);
  S.localUpload = {
    client,
    name: files.length === 1 ? files[0].name : `${files.length} files`,
    size: total,
    sent: 0,
    cancelled: false,
    xhr
  };
  startUploadPolling();
  mergeTransferItems();
  xhr.open("POST", "/api/upload");
  xhr.setRequestHeader("X-TFE", "1");
  xhr.withCredentials = true;
  xhr.upload.onprogress = (event) => {
    if (!event.lengthComputable || !S.localUpload) return;
    S.localUpload.sent = event.loaded;
    mergeTransferItems();
  };
  xhr.onload = () => {
    const local = S.localUpload;
    S.localUpload = null;
    if (local && local.cancelled) {
      mergeTransferItems();
      return;
    }
    let data = {};
    try { data = JSON.parse(xhr.responseText || "{}"); } catch (_) { data = {}; }
    if (xhr.status >= 200 && xhr.status < 300) {
      rememberUploads(data.transfers || []);
      toast(files.length === 1
        ? `Uploading ${files[0].name} to Telegram…`
        : `Uploading ${files.length} files to Telegram…`, "success", 5000);
      startUploadPolling();
    } else {
      const message = typeof data.detail === "string"
        ? data.detail
        : `Upload failed (${xhr.status})`;
      toast(message, "error", 8000);
      stopUploadPolling();
    }
    mergeTransferItems();
  };
  xhr.onerror = () => {
    const local = S.localUpload;
    S.localUpload = null;
    if (!local || !local.cancelled) {
      toast("The upload could not reach the app.", "error");
    }
    mergeTransferItems();
  };
  xhr.send(form);
}

function cancelLocalUpload() {
  const local = S.localUpload;
  if (!local) return;
  local.cancelled = true;
  S.localUpload = null;
  try { local.xhr.abort(); } catch (_) { /* request already finished */ }
  mergeTransferItems();
  stopUploadPolling();
  api("/api/transfers/cancel", { method: "POST", body: { client: local.client } })
    .then(refreshUploads)
    .catch(() => {});
  toast("Upload cancelled.", "success", 3000);
}

async function cancelUpload(client) {
  if (!client) return;
  try {
    await api("/api/transfers/cancel", { method: "POST", body: { client } });
    toast("Cancelling upload…", "success", 2500);
    refreshUploads();
  } catch (error) {
    toast(error.message || "The upload could not be cancelled.", "error");
  }
}

function dismissUpload(download) {
  S.uploadDismissed.add(download.id);
  S.dlUploads = S.dlUploads
    .filter((transfer) => `upload-${transfer.id}` !== download.id);
  mergeTransferItems();
}

/* ---------------------------------------------------------------- sheets */
function openSheet(title, body) {
  $("sheetTitle").textContent = title;
  const box = $("sheetBody");
  box.innerHTML = "";
  if (typeof body === "string") box.innerHTML = body;
  else box.append(body);
  $("sheetBackdrop").hidden = false;
  $("sheet").hidden = false;
}

function closeSheet(force = false) {
  if (!force && $("sheet").hidden) return false;
  const wasOpen = !$("sheet").hidden;
  $("sheet").hidden = true;
  $("sheetBackdrop").hidden = true;
  $("sheetBody").innerHTML = "";
  return wasOpen;
}

$("sheetClose").addEventListener("click", () => closeSheet());
$("sheetBackdrop").addEventListener("click", () => closeSheet());

function sheetButton(icon, title, subtitle, onClick, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sheet-action" + (danger ? " danger" : "");
  button.innerHTML = `${svg(icon)}<span class="copy"><strong></strong><small></small></span>`;
  button.querySelector("strong").textContent = title;
  button.querySelector("small").textContent = subtitle || "";
  if (!subtitle) button.querySelector("small").remove();
  button.addEventListener("click", onClick);
  return button;
}

function confirmAction(title, message, actionLabel, action) {
  const body = document.createElement("div");
  body.innerHTML = `<p></p>`;
  body.querySelector("p").textContent = message;
  const actions = document.createElement("div");
  actions.className = "sheet-buttons";
  const go = document.createElement("button");
  go.className = "btn primary";
  go.textContent = actionLabel;
  go.addEventListener("click", async () => {
    go.disabled = true;
    try { await action(); closeSheet(); }
    catch (error) { go.disabled = false; toast(error.message, "error"); }
  });
  const cancel = document.createElement("button");
  cancel.className = "btn ghost";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => closeSheet());
  actions.append(go, cancel);
  body.append(actions);
  openSheet(title, body);
}

function openItemInfo(item) {
  const body = document.createElement("div");
  if (item.movie && item.movie.title) body.append(movieCard(item));
  const rows = [
    ["Name", item.name || "—"],
    ["Type", shortKind(item)],
    ["Size", humanSize(item.size)],
    ["Folder", item.folder || "—"],
    ["Date", humanDate(item.tg_date || item.added_at) || "—"],
    ["Resolution", item.width && item.height ? `${item.width} × ${item.height}` : ""],
    ["Duration", humanDuration(item.duration)],
    ["Stars", (item.stars || []).map((star) => star.name).filter(Boolean).join(", ")],
    ["Tags", item.tags || ""],
    ["Collections", (item.collections || []).map((entry) => entry.name).filter(Boolean).join(", ")],
    ["Caption", item.caption || ""],
    ["Note", item.note || ""]
  ].filter(([, value]) => value);
  for (const [label, value] of rows) {
    const row = document.createElement("div");
    row.className = "info-row";
    row.innerHTML = "<span></span><b></b>";
    row.querySelector("span").textContent = label;
    row.querySelector("b").textContent = value;
    body.append(row);
  }
  if (item.part_of && item.part_of.count > 1) {
    const row = document.createElement("div");
    row.className = "info-row";
    row.innerHTML = "<span>Split file</span><b></b>";
    row.querySelector("b").textContent =
      `${item.part_of.count} parts · ${humanSize(item.part_of.size)}`;
    body.append(row);
  }
  const actions = document.createElement("div");
  actions.className = "sheet-buttons";
  const download = document.createElement("button");
  download.className = "btn primary";
  download.textContent = "Download";
  download.addEventListener("click", () => { closeSheet(); downloadItem(item); });
  actions.append(download);

  const favorite = document.createElement("button");
  favorite.className = "btn";
  favorite.textContent = item.favorite ? "Remove from favorites" : "Add to favorites";
  favorite.addEventListener("click", async () => {
    favorite.disabled = true;
    try {
      const next = !item.favorite;
      const data = await api(`/api/items/${item.id}`, { method: "PATCH", body: { favorite: next } });
      item.favorite = next;
      const index = S.items.findIndex((entry) => entry.id === item.id);
      if (index >= 0) S.items[index] = { ...S.items[index], ...(data.item || {}), favorite: next };
      closeSheet();
      openItemInfo(item);
      toast(next ? "Added to favorites." : "Removed from favorites.", "success");
    } catch (error) {
      favorite.disabled = false;
      toast(error.message, "error");
    }
  });
  actions.append(favorite);

  if (item.kind === "video" || item.kind === "document") {
    const imdb = document.createElement("button");
    imdb.className = "btn";
    imdb.textContent = item.movie ? "Update IMDb details" : "Look up on IMDb";
    imdb.addEventListener("click", () => promptMovie(item));
    actions.append(imdb);
  }
  if (item.telegram_link) {
    const link = document.createElement("button");
    link.className = "btn";
    link.textContent = "Open in Telegram";
    link.addEventListener("click", () => openExternal(item.telegram_link));
    actions.append(link);
  }
  body.append(actions);
  openSheet("File details", body);
}

function movieCard(item) {
  const movie = item.movie || {};
  const card = document.createElement("div");
  card.className = "movie-card";
  if (item.movie_poster_url) {
    const poster = document.createElement("div");
    poster.className = "movie-poster";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = "";
    img.src = item.movie_poster_url;
    poster.append(img);
    card.append(poster);
  }
  const copy = document.createElement("div");
  copy.className = "movie-copy";
  const title = document.createElement("strong");
  title.textContent = movie.title || "Movie";
  copy.append(title);
  const facts = [];
  if (movie.rating) facts.push(`★ ${Number(movie.rating).toFixed(1)}`);
  if (movie.votes) facts.push(`${Number(movie.votes).toLocaleString()} votes`);
  const minutes = Math.round((Number(movie.runtime) || 0) / 60);
  if (minutes) facts.push(`${minutes} min`);
  if (movie.year) facts.push(String(movie.year));
  if (facts.length) {
    const line = document.createElement("small");
    line.className = "movie-facts";
    line.textContent = facts.join(" · ");
    copy.append(line);
  }
  const genres = (movie.genres || []).filter(Boolean);
  if (genres.length) {
    const chips = document.createElement("div");
    chips.className = "movie-genres";
    for (const genre of genres.slice(0, 6)) {
      const chip = document.createElement("span");
      chip.className = "movie-genre";
      chip.textContent = genre;
      chips.append(chip);
    }
    copy.append(chips);
  }
  if (movie.plot) {
    const plot = document.createElement("p");
    plot.className = "movie-plot";
    plot.textContent = movie.plot;
    copy.append(plot);
  }
  const credits = [];
  if ((movie.directors || []).length) credits.push(`Director: ${movie.directors.join(", ")}`);
  const cast = (movie.cast || []).map((person) => person && person.name).filter(Boolean);
  if (cast.length) credits.push(`Cast: ${cast.slice(0, 6).join(", ")}`);
  if (credits.length) {
    const line = document.createElement("small");
    line.className = "movie-credits";
    line.textContent = credits.join(" · ");
    copy.append(line);
  }
  const link = document.createElement("button");
  link.className = "link-btn";
  link.textContent = "Open on IMDb";
  link.addEventListener("click", () => openExternal(movie.url || `https://www.imdb.com/title/${movie.id}/`));
  copy.append(link);
  card.append(copy);
  return card;
}

function movieSearchRow(result, onPick) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "movie-result";
  row.innerHTML =
    '<span class="movie-result-poster"></span>' +
    '<span class="movie-result-body"><strong></strong><small></small></span>';
  if (result.poster_url) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = "";
    img.src = result.poster_url;
    row.querySelector(".movie-result-poster").append(img);
  } else {
    row.querySelector(".movie-result-poster").innerHTML = svg("video");
  }
  row.querySelector("strong").textContent =
    `${result.title || "Untitled"}${result.year ? ` (${result.year})` : ""}`;
  row.querySelector("small").textContent =
    [result.type, result.stars].filter(Boolean).join(" · ") || "IMDb title";
  row.addEventListener("click", () => onPick(result));
  return row;
}

function promptMovie(item) {
  const body = document.createElement("div");
  const info = document.createElement("p");
  info.textContent = "IMDb details are saved in your library and shown in File details.";
  const searchRow = document.createElement("div");
  searchRow.className = "movie-search-row";
  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = "Movie name";
  input.autocomplete = "off";
  input.value = (item.movie && item.movie.title) || "";
  const search = document.createElement("button");
  search.type = "button";
  search.className = "btn primary";
  search.textContent = "Search";
  searchRow.append(input, search);
  const status = document.createElement("p");
  status.textContent = "";
  const results = document.createElement("div");
  results.className = "movie-results";
  const castLabel = document.createElement("label");
  castLabel.className = "movie-cast-toggle";
  const castBox = document.createElement("input");
  castBox.type = "checkbox";
  castBox.checked = true;
  castLabel.append(castBox, document.createTextNode(" Add the cast to Stars"));
  body.append(info, searchRow, status, results, castLabel);

  const attach = async (result) => {
    status.textContent = `Saving ${result.title || "movie"}…`;
    try {
      const data = await api(`/api/items/${item.id}/movie`, {
        method: "POST",
        body: { imdb_id: String(result.id), add_cast: castBox.checked }
      });
      Object.assign(item, data.item || {});
      const index = S.items.findIndex((entry) => entry.id === item.id);
      if (index >= 0) S.items[index] = { ...S.items[index], ...item };
      closeSheet();
      openItemInfo(item);
      toast("IMDb details saved.", "success");
    } catch (error) {
      status.textContent = error.message;
    }
  };

  const runSearch = async (query) => {
    status.textContent = "Searching IMDb…";
    results.innerHTML = "";
    search.disabled = true;
    try {
      const data = await api(`/api/items/${item.id}/movie/search`, {
        method: "POST",
        body: { query: String(query || "").trim() }
      });
      if (!input.value.trim() && data.query) input.value = data.query;
      const list = data.results || [];
      if (!list.length) {
        status.textContent = "No titles match. Try another name.";
        return;
      }
      status.textContent = list.length === 1 ? "1 result from IMDb." : `${list.length} results from IMDb.`;
      for (const result of list) results.append(movieSearchRow(result, attach));
    } catch (error) {
      status.textContent = error.message;
    } finally {
      search.disabled = false;
    }
  };
  search.addEventListener("click", () => runSearch(input.value));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); runSearch(input.value); }
  });

  if (item.movie && item.movie.title) {
    const remove = document.createElement("button");
    remove.className = "btn";
    remove.textContent = "Remove saved IMDb details";
    remove.addEventListener("click", async () => {
      remove.disabled = true;
      try {
        await api(`/api/items/${item.id}/movie`, { method: "DELETE" });
        item.movie = null;
        item.movie_poster_url = null;
        const index = S.items.findIndex((entry) => entry.id === item.id);
        if (index >= 0) S.items[index] = { ...S.items[index], movie: null, movie_poster_url: null };
        closeSheet();
        openItemInfo(item);
      } catch (error) {
        remove.disabled = false;
        toast(error.message, "error");
      }
    });
    body.append(remove);
  }

  openSheet("IMDb details", body);
  runSearch(input.value);
}

/* ------------------------------------------------------------------ more */
function renderMore() {
  const content = $("content");
  content.innerHTML = "";
  const status = S.status || {};
  const user = status.user || {};
  const vault = status.vault || {};
  const list = document.createElement("div");
  list.className = "list";

  const account = document.createElement("div");
  account.className = "row";
  account.style.cursor = "default";
  account.innerHTML =
    `<span class="thumb">${svg("user")}</span>` +
    `<span class="copy"><strong></strong><small></small></span>`;
  account.querySelector("strong").textContent =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || "Telegram account";
  account.querySelector("small").textContent =
    [user.username ? "@" + user.username : "", user.phone || ""].filter(Boolean).join(" · ") || "Signed in";
  list.append(account);

  list.append(moreRow("vault", "Storage vault", vault.title || "Choose a vault", openVaultSheet));
  list.append(moreRow("sort", "Sort files", `${sortLabel(S.sort)} · ${S.dir === "desc" ? "Descending" : "Ascending"}`, openSortSheet));
  if (status.can_upload) {
    list.append(moreRow("upload", "Upload files", "Add files to this channel from your phone", openUploadPicker));
  }

  const nav = S.nav || {};
  list.append(moreRow("tag", "Tags", `${(nav.tags || []).length} tag(s)`, openTagsSheet));
  list.append(moreRow("collection", "Collections", `${(nav.collections || []).length} collection(s)`, openCollectionsSheet));
  list.append(moreRow("user", "Stars", `${Number(nav.stars) || 0} performer(s)`, openStarsSheet));
  list.append(moreRow("eyeOff", "Hidden files", "Files marked hidden in the desktop app", () => useFilter("hidden", "", "Hidden files")));

  list.append(moreRow("sync", "Sync now", "Fetch new files from Telegram", () => startSync(false)));
  list.append(moreRow("sync", "Full re-scan", "Re-read the channel and remove deletions", () => confirmAction(
    "Full re-scan?",
    "This reads the whole channel and can take a while for large vaults.",
    "Start full scan",
    () => startSync(true)
  )));
  list.append(moreRow("trash", "Clear cache", "Free space used by streaming and previews", openClearCache));

  if (status.pin_set) {
    list.append(moreRow("lock", "Lock now", "Require the PIN again", lockNow));
    list.append(moreRow("key", "Remove PIN", "Turn off the 4-digit lock", openRemovePinSheet));
  } else {
    list.append(moreRow("key", "Set PIN", "Add a 4-digit lock to your library", openSetPinSheet));
  }

  const appVersion = window.AndroidBridge ? window.AndroidBridge.versionName() : status.version || "2.3";
  const uploadLimit = Number(status.upload_limit) || 0;
  list.append(moreRow("info", "About", `Version ${appVersion} · mobile app`, () => {
    openSheet("About", "<p>Telegram File Explorer for Android browses, streams, downloads and uploads the files in your Telegram storage channel.</p>"
      + (uploadLimit
        ? `<p>Uploads up to ${humanSize(uploadLimit)} go straight into the channel. Larger files need the desktop app, which splits them into parts.</p>`
        : "")
      + "<p>The 4-digit PIN is stored with your library, so it can also apply in the desktop app.</p>");
  }));
  list.append(moreRow("logout", "Sign out", "Remove the Telegram session from this phone", () => confirmAction(
    "Sign out?",
    "The Telegram session is removed from this phone. Your files and channel stay untouched.",
    "Sign out",
    async () => {
      await api("/api/logout", { method: "POST" });
      S.status = await api("/api/status");
      boot();
    }
  ), true));

  content.append(list);
  $("crumb").hidden = true;
  $("chips").hidden = true;
}

function moreRow(icon, title, subtitle, onClick, danger = false) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "row" + (danger ? " danger" : "");
  row.innerHTML =
    `<span class="thumb">${svg(icon)}</span>` +
    `<span class="copy"><strong></strong><small></small></span>` +
    `<span class="chev">${svg("chev")}</span>`;
  row.querySelector("strong").textContent = title;
  row.querySelector("small").textContent = subtitle || "";
  if (!subtitle) row.querySelector("small").remove();
  row.addEventListener("click", onClick);
  return row;
}

async function lockNow() {
  try {
    await api("/api/lock", { method: "POST" });
    S.status = await api("/api/status");
    route();
  } catch (error) { toast(error.message, "error"); }
}

function openClearCache() {
  confirmAction(
    "Clear cache?",
    "Temporary files used for streaming and previews are deleted. Your files stay in Telegram.",
    "Clear cache",
    async () => {
      const result = await api("/api/cache/clear", { method: "POST" });
      toast(result && result.removed
        ? `Cleared ${humanSize(result.freed)}.`
        : "Nothing to clear — the cache is already empty.", "success");
    }
  );
}

async function openVaultSheet() {
  const body = document.createElement("div");
  body.innerHTML = '<div class="spinner"></div>';
  openSheet("Storage vaults", body);
  try {
    const data = await api("/api/vaults?refresh=true");
    const vaults = data.vaults || [];
    body.innerHTML = "";
    if (!vaults.length) {
      body.innerHTML = "<p>No storage vaults found. Create one in the desktop app, then refresh.</p>";
      return;
    }
    for (const vault of vaults) {
      const active = String((S.status.vault || {}).id) === String(vault.id);
      const row = sheetButton(
        "vault",
        vault.title || String(vault.id),
        active ? "Current vault" : "Tap to switch",
        async () => {
          closeSheet();
          if (active) return;
          try {
            toast("Switching vault…");
            await api("/api/vaults/switch", { method: "POST", body: { id: String(vault.id) } });
            S.status = await api("/api/status");
            clearFilters(false);
            S.folder = "";
            await loadNav();
            updateChrome();
            if (S.tab === "more") renderMore();
            else loadItems({ reset: true });
            toast(`Switched to ${vault.title || "the new vault"}`, "success");
            pollSync();
          } catch (error) { toast(error.message, "error"); }
        }
      );
      body.append(row);
    }
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message;
    body.append(p);
  }
}

function sortLabel(value) {
  const found = SORTS.find(([key]) => key === value);
  return found ? found[1] : "Date modified";
}

const SORTS = [
  ["date", "Date modified"],
  ["added", "Date added"],
  ["name", "Name"],
  ["size", "Size"],
  ["kind", "Type"],
  ["folder", "Folder"],
  ["star", "Star"]
];

function openSortSheet() {
  const body = document.createElement("div");
  for (const [value, label] of SORTS) {
    const active = S.sort === value;
    const row = sheetButton(
      active ? "check" : "sort",
      label,
      active ? "Current order" : "",
      () => {
        S.sort = value;
        closeSheet();
        renderMore();
        loadItems({ reset: true });
      }
    );
    body.append(row);
  }
  body.append(sheetButton(
    "sort",
    S.dir === "desc" ? "Descending" : "Ascending",
    "Tap to flip the direction",
    () => {
      S.dir = S.dir === "desc" ? "asc" : "desc";
      openSortSheet();
      loadItems({ reset: true });
    }
  ));
  openSheet("Sort files", body);
}

function openTagsSheet() {
  const body = document.createElement("div");
  const tags = (S.nav && S.nav.tags) || [];
  if (!tags.length) {
    body.innerHTML = "<p>No tags yet. Add tags to files in the desktop app.</p>";
  }
  for (const tag of tags) {
    body.append(sheetButton(
      "tag",
      tag.tag,
      `${tag.count} file${tag.count === 1 ? "" : "s"}${tag.group ? " · " + tag.group : ""}`,
      () => useFilter("tag", tag.tag, `Tag: ${tag.tag}`)
    ));
  }
  openSheet("Tags", body);
}

async function openCollectionsSheet() {
  const body = document.createElement("div");
  body.innerHTML = '<div class="spinner"></div>';
  openSheet("Collections", body);
  try {
    const data = await api("/api/collections");
    const collections = data.collections || [];
    body.innerHTML = "";
    if (!collections.length) {
      body.innerHTML = "<p>No collections yet. Group files into collections in the desktop app.</p>";
      return;
    }
    for (const collection of collections) {
      body.append(sheetButton(
        "collection",
        collection.name || "Collection",
        `${collection.n || 0} file${collection.n === 1 ? "" : "s"}`,
        () => useFilter("collection", collection.id, `Collection: ${collection.name}`)
      ));
    }
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message;
    body.append(p);
  }
}

async function openStarsSheet(query = "") {
  const body = document.createElement("div");
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Find a performer";
  search.autocomplete = "off";
  search.value = query;
  search.style.marginBottom = "10px";
  const list = document.createElement("div");
  list.innerHTML = '<div class="spinner"></div>';
  body.append(search, list);
  openSheet("Stars", body);
  const load = async (text) => {
    list.innerHTML = '<div class="spinner"></div>';
    try {
      const data = await api(`/api/stars?q=${encodeURIComponent(text)}`);
      const stars = data.stars || [];
      list.innerHTML = "";
      if (!stars.length) {
        list.innerHTML = "<p>No performers found.</p>";
        return;
      }
      for (const star of stars) {
        list.append(sheetButton(
          "user",
          star.name,
          `${star.n || 0} file${star.n === 1 ? "" : "s"}${star.favorite ? " · favorite" : ""}`,
          () => useFilter("star", star.id, `Star: ${star.name}`)
        ));
      }
    } catch (error) {
      list.innerHTML = "";
      const p = document.createElement("p");
      p.textContent = error.message;
      list.append(p);
    }
  };
  let timer = 0;
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => load(search.value.trim()), 320);
  });
  load(query);
}

function pinForm({ title, message, actionLabel, onSubmit, needCurrent = false }) {
  const body = document.createElement("div");
  const info = document.createElement("p");
  info.textContent = message;
  body.append(info);
  const fields = {};
  const addField = (key, placeholder, mode) => {
    const input = document.createElement("input");
    input.type = mode === "password" ? "password" : "tel";
    input.inputMode = "numeric";
    input.maxLength = 4;
    input.placeholder = placeholder;
    input.style.marginBottom = "8px";
    input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, "").slice(0, 4); });
    fields[key] = input;
    body.append(input);
  };
  if (needCurrent) addField("current", "Current PIN", "password");
  addField("pin", "New PIN (4 digits)", "password");
  addField("confirm", "Repeat the PIN", "password");
  const actions = document.createElement("div");
  actions.className = "sheet-buttons";
  const go = document.createElement("button");
  go.className = "btn primary";
  go.textContent = actionLabel;
  go.addEventListener("click", async () => {
    const pin = fields.pin.value;
    if (!/^\d{4}$/.test(pin)) { toast("The PIN must be exactly 4 digits.", "error"); return; }
    if (pin !== fields.confirm.value) { toast("The PINs do not match.", "error"); return; }
    go.disabled = true;
    try {
      await onSubmit(pin, fields.current ? fields.current.value : "");
      closeSheet();
    } catch (error) {
      go.disabled = false;
      toast(error.message, "error");
    }
  });
  const cancel = document.createElement("button");
  cancel.className = "btn ghost";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => closeSheet());
  actions.append(go, cancel);
  body.append(actions);
  openSheet(title, body);
}

function openSetPinSheet() {
  pinForm({
    title: "Set PIN",
    message: "The 4-digit PIN is asked every time this app opens.",
    actionLabel: "Set PIN",
    onSubmit: async (pin) => {
      await api("/api/pin/set", { method: "POST", body: { pin } });
      S.status = await api("/api/status");
      renderMore();
      toast("PIN set.", "success");
    }
  });
}

function openRemovePinSheet() {
  const body = document.createElement("div");
  const info = document.createElement("p");
  info.textContent = "Enter the current 4-digit PIN to turn the lock off.";
  const input = document.createElement("input");
  input.type = "password";
  input.inputMode = "numeric";
  input.maxLength = 4;
  input.placeholder = "Current PIN";
  input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, "").slice(0, 4); });
  const actions = document.createElement("div");
  actions.className = "sheet-buttons";
  const go = document.createElement("button");
  go.className = "btn primary";
  go.textContent = "Remove PIN";
  go.addEventListener("click", async () => {
    if (!/^\d{4}$/.test(input.value)) { toast("Enter the 4-digit PIN.", "error"); return; }
    go.disabled = true;
    try {
      await api("/api/pin/remove", { method: "POST", body: { pin: input.value } });
      S.status = await api("/api/status");
      closeSheet();
      renderMore();
      toast("App PIN removed.", "success");
    } catch (error) {
      go.disabled = false;
      toast(error.message, "error");
    }
  });
  const cancel = document.createElement("button");
  cancel.className = "btn ghost";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => closeSheet());
  actions.append(go, cancel);
  body.append(info, input, actions);
  openSheet("Remove app PIN", body);
}

function openExternal(url) {
  if (window.AndroidBridge && typeof window.AndroidBridge.openExternal === "function") {
    window.AndroidBridge.openExternal(url);
  } else {
    window.open(url, "_blank");
  }
}

/* --------------------------------------------------------------- buttons */
setIcon($("searchBtn"), "search");
setIcon($("syncBtn"), "sync");
setIcon($("selectBtn"), "select");
setIcon($("lockBtn"), "lock");
setIcon($("uploadFab"), "upload");
setIcon($("selectCancel"), "close");
setIcon($("searchClose"), "close");
setIcon($("viewerClose"), "close");
setIcon($("viewerPrev"), "back");
setIcon($("viewerNext"), "chev");
setIcon($("viewerFavorite"), "star");
setIcon($("viewerDownload"), "download");
setIcon($("viewerInfo"), "info");
setIcon($("sheetClose"), "close");
setIcon($("dlChev"), "chev");
for (const button of $("tabs").querySelectorAll("button[data-tab]")) {
  const span = button.querySelector("span[data-icon]");
  if (span) span.innerHTML = svg(span.dataset.icon);
}

$("lockBtn").addEventListener("click", lockNow);
$("uploadFab").addEventListener("click", openUploadPicker);
$("uploadInput").addEventListener("change", () => {
  const input = $("uploadInput");
  const files = Array.from(input.files || []);
  input.value = "";
  if (files.length) sendUpload(files);
});
window.addEventListener("resize", positionUploadFab);
$("selectBtn").addEventListener("click", () => {
  if (S.tab === "folders" || S.tab === "more") return;
  S.selecting = true;
  syncSelectionChrome();
});
$("selectCancel").addEventListener("click", clearSelection);
$("selectAll").addEventListener("click", toggleSelectAll);
$("selectDownload").addEventListener("click", downloadSelected);
$("dlToggle").addEventListener("click", () => {
  S.dlCollapsed = !S.dlCollapsed;
  localStorage.setItem("tfe_dl_collapsed", S.dlCollapsed ? "1" : "0");
  applyDownloadCollapse();
});

/* Android back button: close the top layer, then step out of a folder. */
window.mobileBack = function mobileBack() {
  const model = document.getElementById("viewer3dOverlay");
  if (model && !model.hidden) { if (window.TFE3D) window.TFE3D.close(); return true; }
  if (!$("viewer").hidden) {
    if (window.TFEReader && window.TFEReader.isOpen() && window.TFEReader.escape()) return true;
    closeViewer();
    return true;
  }
  if (!$("sheet").hidden) { closeSheet(); return true; }
  if (S.selecting) { clearSelection(); return true; }
  if (!$("searchBar").hidden) { $("searchClose").click(); return true; }
  if (S.tab !== "files") { switchTab("files"); return true; }
  if (S.folder) { openFolder(""); return true; }
  if (nativeFinish()) { closeApp(); return true; }
  return false;
};

function nativeFinish() {
  return Boolean(window.AndroidBridge && typeof AndroidBridge.finishApp === "function");
}

async function closeApp() {
  if (S.closing) return;
  S.closing = true;
  if (!S.status || !S.status.locked) {
    toast("Saving the library to Telegram…");
    clearTimeout(S.toastTimer);
    try {
      await api("/api/vault/save", { method: "POST" });
    } catch (error) {
      toast(error.message || "The library could not be saved.", "error");
      await new Promise((resolve) => setTimeout(resolve, 1600));
    }
  }
  AndroidBridge.finishApp();
}

initDownloadBar();
boot();
