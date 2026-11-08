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
  check: '<path d="m5 13 4 4L19 7"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  brush: '<path d="M14 4l6 6-7.5 7.5a3 3 0 0 1-4.2 0l-1.8-1.8a3 3 0 0 1 0-4.2z"/><path d="m5 21 2-5"/>',
  edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="m13.5 5.5 4 4"/>'
};

function svg(name, cls = "") {
  const body = ICONS[name] || ICONS.doc;
  return `<svg${cls ? ` class="${cls}"` : ""} viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}

function setIcon(el, name) { if (el) el.innerHTML = svg(name); }

const $ = (id) => document.getElementById(id);
const SCREENS = ["bootScreen", "pinScreen", "authScreen", "vaultScreen"];

function storeGet(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (_) {
    return fallback;
  }
}

function storeSet(key, value) {
  try { localStorage.setItem(key, String(value)); } catch (_) { /* storage blocked */ }
}

function readJson(key, fallback) {
  try {
    const value = JSON.parse(storeGet(key, ""));
    return value === null || value === undefined ? fallback : value;
  } catch (_) {
    return fallback;
  }
}

const THEMES = [
  ["system", "System", "Follow the phone's light or dark setting"],
  ["light", "Light", "Always use the light interface"],
  ["dark", "Dark", "Always use the dark interface"],
  ["black", "Black", "Dark interface with true-black surfaces"]
];

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
  restoreTimer: null,
  qrTimer: null,
  pin: "",
  pinBusy: false,
  pinVault: null,
  pinNote: "",
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
  closing: false,
  view: storeGet("tfe_view", "grid") === "list" ? "list" : "grid",
  theme: storeGet("tfe_theme", "system"),
  treeOpen: new Set(readJson("tfe_tree_open", [])),
  folderPanelOpen: storeGet("tfe_folder_panel", "1") !== "0",
  rendered: 0,
  listEl: null,
  moreEl: null,
  pageCache: new Map(),
  imageViewer: null,
  imageGallery: [],
  slideshow: null,
  slideshowDriven: false
};

/* --------------------------------------------------------------- settings */
function applyTheme(theme) {
  const value = THEMES.some(([key]) => key === theme) ? theme : "system";
  S.theme = value;
  storeSet("tfe_theme", value);
  document.documentElement.dataset.theme = value;
  const dark = value === "dark" || value === "black"
    || (value === "system" && window.matchMedia
      && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const meta = $("themeMeta");
  if (meta) meta.setAttribute("content", value === "black" ? "#000000" : dark ? "#1e2024" : "#ffffff");
  try {
    if (window.AndroidBridge && AndroidBridge.setDarkMode) AndroidBridge.setDarkMode(dark);
  } catch (_) { /* browser */ }
}

function setupViewport() {
  const viewport = window.visualViewport;
  const apply = () => {
    if (!viewport) return;
    const hidden = Math.max(0, Math.round(
      window.innerHeight - viewport.height - viewport.offsetTop
    ));
    const keyboard = hidden > 90 ? hidden : 0;
    document.documentElement.style.setProperty("--kb", `${keyboard}px`);
    document.documentElement.classList.toggle("kb-open", keyboard > 0);
  };
  if (viewport) {
    viewport.addEventListener("resize", apply);
    viewport.addEventListener("scroll", apply);
  }
  window.addEventListener("resize", apply);
  apply();
}

function keepFieldVisible(field) {
  if (!field) return;
  setTimeout(() => {
    try { field.scrollIntoView({ block: "center", behavior: "smooth" }); }
    catch (_) { field.scrollIntoView(); }
  }, 280);
}

document.addEventListener("focusin", (event) => {
  if (event.target.matches("input, textarea, select")) {
    keepFieldVisible(event.target);
  }
});

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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || 60000);
  init.signal = controller.signal;
  let res;
  try {
    res = await fetch(path, init);
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("The app took too long to answer. Try again.");
    }
    throw new Error("The app is not answering. Try again.");
  } finally {
    clearTimeout(timer);
  }
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
  $("pinNote").hidden = true;
  $("pinNote").textContent = "";
  renderPinVault();
  showScreen("pinScreen");
}

function pinVaultChoices() {
  const status = S.status || {};
  return Array.isArray(status.vaults) ? status.vaults : [];
}

function pinVaultCurrent() {
  if (S.pinVault) return S.pinVault;
  const status = S.status || {};
  if (status.vault) return status.vault;
  const vaults = pinVaultChoices();
  return vaults.find((vault) => vault.active) || vaults.find((vault) => vault.default)
    || vaults[0] || null;
}

function renderPinVault() {
  const button = $("pinVault");
  const vault = pinVaultCurrent();
  if (!vault) {
    button.hidden = true;
    return;
  }
  button.hidden = false;
  $("pinVaultName").textContent = vault.title || String(vault.id);
  const note = S.pinVault ? "Opens after unlock" : (vault.default ? "Default vault" : "Tap to change");
  button.querySelector("small").textContent = `Storage vault · ${note}`;
}

function openPinVaultSheet() {
  const vaults = pinVaultChoices();
  const current = pinVaultCurrent();
  const body = document.createElement("div");
  if (!vaults.length) {
    body.innerHTML = "<p>No storage vaults are known yet. Unlock once, then open More → Storage vault.</p>";
    openSheet("Storage vault", body);
    return;
  }
  for (const vault of vaults) {
    const chosen = current && String(current.id) === String(vault.id);
    const subtitle = chosen
      ? (vault.default ? "Default vault" : "Opens with this PIN")
      : (vault.default ? "Default vault" : "Tap to open this one");
    const row = sheetButton("vault", vault.title || String(vault.id), subtitle, () => {
      closeSheet();
      S.pinVault = chosen && vault.active ? null : vault;
      renderPinVault();
    });
    if (chosen) {
      row.classList.add("on");
      const mark = document.createElement("span");
      mark.className = "sheet-check";
      mark.innerHTML = svg("check");
      row.append(mark);
    }
    body.append(row);
  }
  openSheet("Storage vault", body);
}

function openPinRecovery() {
  const body = document.createElement("div");
  const intro = document.createElement("p");
  intro.textContent = "A recovery code is sent to your Telegram Saved Messages. You need the same account signed in on this phone.";
  body.append(intro);
  const actions = document.createElement("div");
  actions.className = "sheet-buttons";
  const send = document.createElement("button");
  send.type = "button";
  send.className = "btn primary";
  send.textContent = "Send recovery code";
  send.addEventListener("click", async () => {
    send.disabled = true;
    try {
      await api("/api/pin/recover", { method: "POST", timeout: 60000 });
      toast("Code sent to Saved Messages in Telegram.", "success", 5000);
      showRecoveryForm();
    } catch (error) {
      toast(error.message, "error");
      send.disabled = false;
    }
  });
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn ghost";
  cancel.textContent = "Back";
  cancel.addEventListener("click", () => closeSheet());
  actions.append(send, cancel);
  body.append(actions);
  openSheet("Forgot PIN", body);
}

function showRecoveryForm() {
  const body = document.createElement("div");
  const intro = document.createElement("p");
  intro.textContent = "Type the code from Saved Messages and choose a new 4-digit PIN.";
  const code = editField("Recovery code", "", "Code from Telegram");
  code.input.inputMode = "numeric";
  code.input.autocomplete = "one-time-code";
  const pin = editField("New PIN", "", "4 digits");
  pin.input.type = "password";
  pin.input.inputMode = "numeric";
  pin.input.maxLength = 4;
  pin.input.addEventListener("input", () => {
    pin.input.value = pin.input.value.replace(/\D/g, "").slice(0, 4);
  });
  const error = document.createElement("p");
  error.className = "form-error";
  const actions = document.createElement("div");
  actions.className = "sheet-buttons";
  const go = document.createElement("button");
  go.type = "button";
  go.className = "btn primary";
  go.textContent = "Set PIN and open";
  go.addEventListener("click", async () => {
    go.disabled = true;
    error.textContent = "";
    try {
      await api("/api/pin/reset", {
        method: "POST",
        body: { code: code.input.value.trim(), pin: pin.input.value.trim() },
        timeout: 60000
      });
      closeSheet(true);
      S.pin = "";
      S.pinVault = null;
      S.status = await api("/api/status");
      toast("PIN updated. The app is unlocked.", "success");
      if (!S.status.locked) route();
      else showPin();
    } catch (err) {
      error.textContent = err.message;
      go.disabled = false;
    }
  });
  const back = document.createElement("button");
  back.type = "button";
  back.className = "btn ghost";
  back.textContent = "Back";
  back.addEventListener("click", () => openPinRecovery());
  actions.append(go, back);
  body.append(intro, code.wrap, pin.wrap, error, actions);
  openSheet("New PIN", body);
  setTimeout(() => { try { code.input.focus(); } catch (_) {} }, 120);
}

$("pinVault").addEventListener("click", openPinVaultSheet);
$("pinForgot").addEventListener("click", openPinRecovery);
setIcon($("pinVaultIcon"), "vault");
setIcon($("pinVaultChev"), "chev");

function renderPinDots() {
  $("pinDots").innerHTML = [0, 1, 2, 3]
    .map((i) => `<span${i < S.pin.length ? ' class="filled"' : ""}></span>`)
    .join("");
}

async function submitPin() {
  if (S.pinBusy) return;
  S.pinBusy = true;
  const pin = S.pin;
  try {
    await api("/api/unlock", { method: "POST", body: { pin } });
    S.pin = "";
    renderPinDots();
    await applyPendingVault(pin);
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
    $("pinNote").hidden = true;
  }
}

async function applyPendingVault(pin) {
  const target = S.pinVault;
  if (!target) return;
  S.pinVault = null;
  const active = (S.status && S.status.vault) || null;
  if (active && String(active.id) === String(target.id)) return;
  $("pinNote").hidden = false;
  $("pinNote").textContent = `Opening ${target.title || "the vault"}…`;
  try {
    await api("/api/vaults/switch", {
      method: "POST",
      body: { id: String(target.id), pin },
      timeout: 180000
    });
    S.status = { ...(S.status || {}), vault: target };
  } catch (error) {
    toast(error.message || "That vault could not be opened.", "error");
  } finally {
    $("pinNote").hidden = true;
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
  applyTheme(S.theme);
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
  watchRestore();
}

/* The phone opens its local library first, then pulls a newer vault snapshot
   in the background. Show that as the sync banner and refresh once it lands. */
function restoreRunning(status) {
  const restore = (status && status.vault_restore) || {};
  return restore.state === "pending" || restore.state === "running";
}

function watchRestore() {
  if (S.restoreTimer || !restoreRunning(S.status)) return;
  $("syncBanner").hidden = false;
  $("syncFill").style.width = "30%";
  $("syncText").textContent = "Syncing the library from Telegram…";
  S.restoreTimer = setInterval(restoreTick, 1500);
}

async function restoreTick() {
  let status;
  try {
    status = await api("/api/status");
  } catch (error) {
    return;
  }
  S.status = status;
  if (restoreRunning(status)) return;
  clearInterval(S.restoreTimer);
  S.restoreTimer = null;
  $("syncBanner").hidden = true;
  if (status.locked) {
    showPin();
    return;
  }
  const restore = status.vault_restore || {};
  if (!restore.restored) return;
  await loadNav();
  if (S.tab === "more") renderMore();
  else if (S.tab === "folders") renderFolders();
  else await loadItems({ reset: true });
  toast("Library updated from Telegram.", "success");
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
  const total = Number((status.stats && status.stats.count) || 0);
  const shown = S.items.length;
  const countText = S.tab === "files" && !S.q && !S.filterLabel
    ? (total ? `${total.toLocaleString()} file${total === 1 ? "" : "s"}` : "")
    : shown ? `${shown} shown` : "";
  $("topSub").textContent = [vault.title || name || "Telegram File Explorer", countText]
    .filter(Boolean).join(" · ");
  const browsing = S.tab === "files" && (!!S.folder || !!S.filterLabel || !!S.q);
  $("backBtn").hidden = !browsing;
  $("topLogo").hidden = browsing;
  const listTab = S.tab === "files" || S.tab === "favorites" || S.tab === "recent";
  $("viewBtn").hidden = !listTab;
  setIcon($("viewBtn"), S.view === "grid" ? "list" : "grid");
  $("viewBtn").title = S.view === "grid" ? "Switch to list view" : "Switch to grid view";
  $("selectBtn").hidden = !listTab;
  const canUpload = !!status.can_upload && (S.tab === "files" || S.tab === "folders");
  $("uploadFab").hidden = !canUpload || S.selecting;
  if (canUpload && !S.selecting) positionUploadFab();
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
  if (reset) S.cursor = "";
  const key = reset ? itemQuery().toString() : "";
  S.loading = true;
  if (reset) {
    const cached = S.pageCache.get(key);
    if (cached && Date.now() - cached.at < 45000) {
      S.items = cached.items.slice();
      S.cursor = cached.cursor;
      S.done = cached.done;
      renderItems();
    } else {
      S.items = [];
      S.cursor = "";
      S.done = false;
      $("content").innerHTML = '<div class="spinner"></div>';
      $("content").scrollTop = 0;
      renderCrumb();
    }
  }
  try {
    const data = await api(`/api/items?${itemQuery().toString()}`);
    if (seq !== loadSeq) return;
    const items = data.items || [];
    const nextCursor = data.next_cursor || "";
    const done = !nextCursor;
    if (reset) {
      const cached = S.pageCache.get(key);
      const same = Boolean(cached
        && cached.cursor === nextCursor
        && cached.done === done
        && cached.items.length === items.length
        && cached.items.every((entry, index) => entry.id === items[index].id));
      S.items = items;
      S.cursor = nextCursor;
      S.done = done;
      S.pageCache.set(key, { items: items.slice(), cursor: nextCursor, done, at: Date.now() });
      if (S.pageCache.size > 24) {
        S.pageCache.delete(S.pageCache.keys().next().value);
      }
      if (!same) {
        const top = $("content").scrollTop;
        renderItems();
        $("content").scrollTop = top;
      }
    } else {
      const start = S.items.length;
      S.items = S.items.concat(items);
      S.cursor = nextCursor;
      S.done = done;
      appendItems(start);
      updateChrome();
    }
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
  S.listEl = null;
  S.moreEl = null;
  S.rendered = 0;
  if (S.tab === "files" && !S.q && !S.filterLabel) {
    const panel = folderPanel();
    if (panel) content.append(panel);
  }
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
    updateChrome();
    return;
  }
  const list = document.createElement("div");
  list.className = S.view === "list" ? "view-list" : "grid";
  content.append(list);
  S.listEl = list;
  const more = document.createElement("div");
  more.className = "load-more";
  content.append(more);
  S.moreEl = more;
  appendItems(0);
  updateChrome();
}

function appendItems(from) {
  const list = S.listEl;
  if (!list) return;
  const fragment = document.createDocumentFragment();
  for (let index = from; index < S.items.length; index += 1) {
    const item = S.items[index];
    const node = S.view === "list" ? itemRow(item, index) : itemTile(item, index);
    if (S.selection.has(item.id)) paintTile(node, true);
    fragment.append(node);
  }
  list.append(fragment);
  S.rendered = S.items.length;
  if (S.moreEl) {
    S.moreEl.innerHTML = S.done ? "" : '<div class="spinner small"></div>';
  }
  if (S.selecting) syncSelectionChrome();
}

function directFolders() {
  const parent = S.folder || "";
  return ((S.nav && S.nav.folders) || [])
    .filter((folder) => (folder.parent || "") === parent && folder.folder !== parent);
}

function folderPanel() {
  const folders = directFolders();
  if (!folders.length) return null;
  const panel = document.createElement("div");
  panel.className = "folder-panel" + (S.folderPanelOpen ? "" : " collapsed");
  const head = document.createElement("button");
  head.type = "button";
  head.className = "folder-panel-head";
  head.innerHTML =
    `<span class="chevd">${svg("down")}</span><span>Folders</span>` +
    `<span class="count">${folders.length}</span>`;
  head.setAttribute("aria-expanded", S.folderPanelOpen ? "true" : "false");
  head.addEventListener("click", () => {
    S.folderPanelOpen = !S.folderPanelOpen;
    storeSet("tfe_folder_panel", S.folderPanelOpen ? "1" : "0");
    panel.classList.toggle("collapsed", !S.folderPanelOpen);
    head.setAttribute("aria-expanded", S.folderPanelOpen ? "true" : "false");
  });
  const cards = document.createElement("div");
  cards.className = "folder-cards";
  for (const folder of folders) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "folder-card";
    card.innerHTML =
      `<span class="fold-ico">${svg("folder")}</span>` +
      `<span class="fold-copy"><strong></strong><small></small></span>`;
    card.querySelector("strong").textContent = folder.name || folder.folder;
    card.querySelector("small").textContent =
      `${folder.direct_n || folder.n || 0} file${(folder.direct_n || folder.n) === 1 ? "" : "s"}`;
    card.addEventListener("click", () => openFolder(folder.folder));
    cards.append(card);
  }
  panel.append(head, cards);
  return panel;
}

function itemRow(item, index) {
  const row = document.createElement("div");
  row.className = "item-row selectable";
  row.setAttribute("role", "button");
  row.tabIndex = 0;
  row.dataset.id = String(item.id);
  const thumb = document.createElement("span");
  thumb.className = "thumb";
  if (item.has_thumb && item.thumb_url) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = "";
    img.src = item.thumb_url;
    thumb.append(img);
  } else {
    thumb.innerHTML = svg(itemIcon(item));
  }
  const copy = document.createElement("span");
  copy.className = "copy";
  const name = document.createElement("strong");
  name.textContent = softBreaks(item.name || "File");
  const meta = document.createElement("small");
  const bits = [shortKind(item), humanSize(item.size)];
  const date = humanDate(item.tg_date || item.added_at);
  if (date) bits.push(date);
  meta.textContent = bits.filter(Boolean).join(" · ");
  copy.append(name, meta);
  if (item.tags) {
    const tags = document.createElement("span");
    tags.className = "tags";
    tags.textContent = String(item.tags).split(",").map((tag) => `#${tag.trim()}`)
      .filter((tag) => tag.length > 1).join("  ");
    copy.append(tags);
  }
  row.append(thumb, copy);
  if (item.favorite) {
    const mark = document.createElement("span");
    mark.className = "fav-mark";
    mark.innerHTML = svg("star");
    row.append(mark);
  }
  const details = document.createElement("button");
  details.type = "button";
  details.className = "row-action";
  details.setAttribute("aria-label", "File details");
  details.innerHTML = svg("info");
  details.addEventListener("click", (event) => {
    event.stopPropagation();
    openItemInfo(item);
  });
  row.append(details);
  row.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    if (Date.now() < S.suppressClick) return;
    if (S.selecting) { toggleSelection(row, item.id); return; }
    openViewer(index);
  });
  row.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openViewer(index);
  });
  withLongPress(row, () => {
    if (S.selecting) { toggleSelection(row, item.id); return; }
    S.selecting = true;
    S.selection.add(item.id);
    paintTile(row, true);
    syncSelectionChrome();
  });
  return row;
}

function softBreaks(text) {
  return String(text).replace(/([_./\\-])/g, "$1\u200B");
}

function itemTile(item, index) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "tile selectable";
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
  const tiles = [...$("content").querySelectorAll(".selectable[data-id]")];
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
    for (const tile of $("content").querySelectorAll(".selectable.selected")) {
      paintTile(tile, false);
    }
  }
  syncSelectionChrome();
}

function toggleSelectAll() {
  const tiles = [...$("content").querySelectorAll(".selectable[data-id]")];
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

async function copyText(text) {
  try {
    if (window.AndroidBridge && AndroidBridge.copyText && AndroidBridge.copyText(text)) {
      return true;
    }
  } catch (_) { /* browser */ }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    return false;
  }
}

function selectedIds() {
  return [...S.selection];
}

async function refreshAfterBulk() {
  clearSelection();
  S.pageCache.clear();
  await loadNav();
  updateChrome();
  if (S.tab === "folders") renderFolders();
  else if (S.tab !== "more") loadItems({ reset: true });
}

function openBulkSheet() {
  const ids = selectedIds();
  if (!ids.length) { toast("Select at least one file."); return; }
  const items = S.items.filter((item) => ids.includes(item.id));
  const allFavorite = items.length > 0 && items.every((item) => item.favorite);
  const body = document.createElement("div");
  body.append(sheetButton(
    "star",
    allFavorite ? "Remove from favorites" : "Add to favorites",
    `Applies to ${ids.length} file(s)`,
    async () => {
      try {
        await api("/api/batch/favorite", {
          method: "POST",
          body: { item_ids: ids, favorite: !allFavorite }
        });
        closeSheet();
        toast(allFavorite ? "Removed from favorites." : "Added to favorites.", "success");
        await refreshAfterBulk();
      } catch (error) { toast(error.message, "error"); }
    }
  ));
  body.append(sheetButton("folder", "Move to folder", "Changes the folder of every selection", () => promptBulkFolder(false)));
  body.append(sheetButton("collection", "Copy to folder", "Keeps the originals where they are", () => promptBulkFolder(true)));
  body.append(sheetButton("edit", "Rename files", "Apply a name template to the selection", promptBulkRename));
  body.append(sheetButton("star", "Assign stars", "Tag the selection with performers", openBulkStars));
  const collections = (S.nav && S.nav.collections) || [];
  if (collections.length) {
    body.append(sheetButton("collection", "Add to collection", `${collections.length} collection(s)`, openBulkCollections));
  }
  body.append(sheetButton("telegram", "Copy Telegram links", "Copy one message link per file", copySelectedLinks));
  body.append(sheetButton("eyeOff", "Remove from library", "Hides the files; restore them from Hidden", () => {
    confirmAction(
      `Remove ${ids.length} file(s)?`,
      "They disappear from the library. The Telegram messages stay and can be restored from Hidden files.",
      "Remove",
      async () => {
        await api("/api/batch/delete", { method: "POST", body: { item_ids: ids, remote: false } });
        toast("Removed from the library.", "success", 5000);
        await refreshAfterBulk();
      }
    );
  }));
  body.append(sheetButton("trash", "Delete from Telegram", "Deletes the messages for everyone", () => {
    confirmAction(
      `Delete ${ids.length} file(s) from Telegram?`,
      "The channel messages are deleted for every member. This cannot be undone.",
      "Delete",
      async () => {
        await api("/api/batch/delete", { method: "POST", body: { item_ids: ids, remote: true } });
        toast("Deleted from Telegram.", "success");
        await refreshAfterBulk();
      }
    );
  }, true));
  openSheet(`${ids.length} selected`, body);
}

function promptBulkFolder(copy) {
  const ids = selectedIds();
  promptText(
    copy ? "Copy to folder" : "Move to folder",
    "Folder",
    S.folder || "",
    "Top level / Sub folder",
    copy ? "Copy here" : "Move here",
    async (folder) => {
      if (!folder) throw new Error("Type a folder name.");
      const data = await api(copy ? "/api/batch/copy" : "/api/batch/move", {
        method: "POST",
        body: { item_ids: ids, folder },
        timeout: 180000
      });
      toast(
        copy
          ? `Copied ${data.copied || ids.length} file(s) to ${data.folder}.`
          : `Moved ${data.moved || ids.length} file(s) to ${data.folder}.`,
        "success"
      );
      await refreshAfterBulk();
    }
  );
}

async function copySelectedLinks() {
  const ids = selectedIds();
  if (!ids.length) return;
  try {
    const data = await api(`/api/batch/info?ids=${ids.join(",")}`);
    const lines = (data.items || []).map((item) =>
      item.telegram_link ? `${item.name} — ${item.telegram_link}` : item.name
    );
    const ok = await copyText(lines.join("\n"));
    closeSheet();
    toast(ok ? `Copied ${lines.length} link(s).` : "The clipboard is not available.", ok ? "success" : "error");
  } catch (error) { toast(error.message, "error"); }
}

function openBulkCollections() {
  const collections = (S.nav && S.nav.collections) || [];
  const ids = selectedIds();
  const body = document.createElement("div");
  if (!collections.length) {
    body.innerHTML = "<p>No collections yet. Create one in More → Collections.</p>";
    openSheet("Add to collection", body);
    return;
  }
  for (const collection of collections) {
    body.append(sheetButton(
      "collection",
      collection.name,
      `${Number(collection.n) || 0} file(s)`,
      async () => {
        try {
          await api(`/api/collections/${collection.id}/items`, {
            method: "POST",
            body: { item_ids: ids, remove: false }
          });
          closeSheet();
          toast(`Added to ${collection.name}.`, "success");
          await refreshAfterBulk();
        } catch (error) { toast(error.message, "error"); }
      }
    ));
  }
  openSheet("Add to collection", body);
}

function promptBulkRename() {
  const ids = selectedIds();
  if (!ids.length) { toast("Select files first.", "error"); return; }
  const body = document.createElement("div");
  const field = editField("Name template", "{name}", "Placeholders: {name} {ext} {folder} {date} {nn}");
  field.input.autocomplete = "off";
  const note = document.createElement("p");
  note.className = "muted small";
  note.textContent = "Tap a placeholder to insert it. The original extension is added when {ext} is missing.";
  const chips = document.createElement("div");
  chips.className = "template-chips";
  const preview = document.createElement("div");
  preview.className = "batch-preview";
  const error = document.createElement("p");
  error.className = "form-error";
  let timer = null;
  const run = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const data = await api("/api/batch/rename", {
          method: "POST",
          body: { item_ids: ids, template: field.input.value, preview: true }
        });
        const changed = (data.renames || []).filter((entry) => entry.from !== entry.to);
        preview.innerHTML = "";
        if (!changed.length) {
          const empty = document.createElement("p");
          empty.className = "muted small";
          empty.textContent = "This template keeps the current names.";
          preview.append(empty);
          return;
        }
        for (const entry of changed.slice(0, 200)) {
          const row = document.createElement("div");
          row.className = "batch-row";
          row.innerHTML = '<span class="batch-from"></span><span class="batch-arrow">→</span><span class="batch-to"></span>';
          row.querySelector(".batch-from").textContent = entry.from;
          row.querySelector(".batch-to").textContent = entry.to;
          preview.append(row);
        }
        if (changed.length > 200) {
          const rest = document.createElement("p");
          rest.className = "muted small";
          rest.textContent = `and ${changed.length - 200} more file(s)`;
          preview.append(rest);
        }
      } catch (err) {
        preview.innerHTML = "";
        const p = document.createElement("p");
        p.className = "muted small";
        p.textContent = err.message;
        preview.append(p);
      }
    }, 300);
  };
  for (const token of ["{name}", "{ext}", "{folder}", "{date}", "{nn}"]) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = token;
    chip.addEventListener("click", () => {
      const start = field.input.selectionStart ?? field.input.value.length;
      const end = field.input.selectionEnd ?? start;
      const value = field.input.value;
      field.input.value = value.slice(0, start) + token + value.slice(end);
      field.input.focus();
      try { field.input.setSelectionRange(start + token.length, start + token.length); } catch (_) { /* ignore */ }
      run();
    });
    chips.append(chip);
  }
  field.input.addEventListener("input", run);
  const actions = document.createElement("div");
  actions.className = "sheet-buttons";
  const go = document.createElement("button");
  go.type = "button";
  go.className = "btn primary";
  go.textContent = `Rename ${ids.length === 1 ? "1 file" : `${ids.length} files`}`;
  go.addEventListener("click", async () => {
    go.disabled = true;
    error.textContent = "";
    try {
      const data = await api("/api/batch/rename", {
        method: "POST",
        body: { item_ids: ids, template: field.input.value, preview: false }
      });
      closeSheet();
      toast(data.applied ? `${data.applied} file(s) renamed.` : "Names already match.", "success");
      if (data.warnings) toast(`${data.warnings} Telegram caption(s) could not be updated.`, "info", 7000);
      await refreshAfterBulk();
    } catch (err) {
      error.textContent = err.message;
      go.disabled = false;
    }
  });
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn ghost";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => closeSheet());
  actions.append(go, cancel);
  body.append(field.wrap, note, chips, preview, error, actions);
  openSheet("Rename selected files", body);
  run();
}

async function openBulkStars() {
  const ids = selectedIds();
  if (!ids.length) { toast("Select files first.", "error"); return; }
  const body = document.createElement("div");
  body.innerHTML = '<div class="spinner"></div>';
  openSheet("Assign stars", body);
  let stars = [];
  try {
    const data = await api("/api/stars?limit=2000");
    stars = data.stars || [];
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message;
    body.append(p);
    return;
  }
  const chosen = new Set();
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Search performers";
  search.autocomplete = "off";
  search.className = "star-search";
  const list = document.createElement("div");
  const render = () => {
    const term = search.value.trim().toLowerCase();
    list.innerHTML = "";
    const shown = stars.filter((star) => !term
      || String(star.name || "").toLowerCase().includes(term)
      || String(star.aliases || "").toLowerCase().includes(term));
    if (!shown.length) {
      const empty = document.createElement("p");
      empty.className = "muted small";
      empty.textContent = stars.length
        ? "No performers match that search."
        : "No performers yet. Create one below.";
      list.append(empty);
      return;
    }
    for (const star of shown) {
      const picked = chosen.has(Number(star.id));
      const row = document.createElement("button");
      row.type = "button";
      row.className = "sheet-action" + (picked ? " on" : "");
      row.innerHTML = `${svg(picked ? "check" : "user")}`
        + '<span class="copy"><strong></strong><small></small></span>';
      row.querySelector("strong").textContent = star.name || "Unnamed performer";
      row.querySelector("small").textContent = picked
        ? `Assigned · ${starMeta(star)}`
        : starMeta(star);
      row.addEventListener("click", () => {
        const id = Number(star.id);
        if (chosen.has(id)) chosen.delete(id);
        else chosen.add(id);
        render();
      });
      list.append(row);
    }
  };
  search.addEventListener("input", render);
  render();
  const create = document.createElement("div");
  create.className = "star-pick-new";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "New performer name";
  nameInput.maxLength = 80;
  nameInput.autocomplete = "off";
  const createBtn = document.createElement("button");
  createBtn.type = "button";
  createBtn.className = "btn";
  createBtn.textContent = "Create";
  createBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    if (!name) { toast("Enter a name for the new performer.", "error"); return; }
    createBtn.disabled = true;
    try {
      const created = await api("/api/stars", { method: "POST", body: { name } });
      stars.push(created);
      chosen.add(Number(created.id));
      nameInput.value = "";
      render();
      toast(`Created ${created.name}. Save to assign it.`, "success", 5000);
    } catch (error) {
      toast(error.message, "error");
    } finally {
      createBtn.disabled = false;
    }
  });
  create.append(nameInput, createBtn);
  const save = document.createElement("button");
  save.type = "button";
  save.className = "btn primary details-save";
  save.textContent = "Save stars";
  save.addEventListener("click", async () => {
    if (!chosen.size) { toast("Choose at least one performer.", "error"); return; }
    save.disabled = true;
    try {
      const data = await api("/api/items/stars", {
        method: "POST",
        body: { item_ids: ids, star_ids: [...chosen] }
      });
      closeSheet();
      toast(`Added ${data.files || ids.length} file(s) to ${data.stars || chosen.size} performer(s).`, "success");
      await refreshAfterBulk();
    } catch (error) {
      save.disabled = false;
      toast(error.message, "error");
    }
  });
  body.innerHTML = "";
  body.append(search, list, create, save);
}

$("selectMore").addEventListener("click", openBulkSheet);

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
function saveTreeOpen() {
  storeSet("tfe_tree_open", JSON.stringify([...S.treeOpen]));
}

function renderFolders() {
  const content = $("content");
  content.innerHTML = "";
  S.listEl = null;
  S.moreEl = null;
  const folders = (S.nav && S.nav.folders) || [];
  if (!folders.length) {
    content.innerHTML = `<div class="empty">${svg("folder")}<strong>No folders yet</strong><p>Folders you create in the desktop app show up here after a sync.</p></div>`;
    updateChrome();
    return;
  }
  const byParent = new Map();
  for (const folder of folders) {
    const parent = folder.parent || "";
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(folder);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => String(a.name || a.folder).localeCompare(String(b.name || b.folder)));
  }
  const toolbar = document.createElement("div");
  toolbar.className = "tree-toolbar";
  const expand = document.createElement("button");
  expand.type = "button";
  expand.textContent = "Expand all";
  expand.addEventListener("click", () => {
    S.treeOpen = new Set(folders.filter((folder) => (byParent.get(folder.folder) || []).length)
      .map((folder) => folder.folder));
    saveTreeOpen();
    renderFolders();
  });
  const collapse = document.createElement("button");
  collapse.type = "button";
  collapse.textContent = "Collapse all";
  collapse.addEventListener("click", () => {
    S.treeOpen.clear();
    saveTreeOpen();
    renderFolders();
  });
  toolbar.append(expand, collapse);

  const tree = document.createElement("div");
  tree.className = "tree";

  const paint = (folder, depth) => {
    const children = byParent.get(folder.folder) || [];
    const hasChildren = children.length > 0;
    const open = hasChildren && S.treeOpen.has(folder.folder);
    const row = document.createElement("div");
    row.className = "tree-row" + (open ? " open" : "");
    row.setAttribute("role", "treeitem");
    row.setAttribute("aria-expanded", hasChildren ? String(open) : "false");
    row.setAttribute("aria-level", String(depth + 1));
    row.style.paddingLeft = `${6 + Math.min(depth, 6) * 14}px`;
    row.dataset.folder = folder.folder;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "tree-toggle" + (hasChildren ? (open ? " open" : "") : " blank");
    toggle.innerHTML = svg("chev");
    toggle.setAttribute("aria-label", open ? "Collapse folder" : "Expand folder");
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!hasChildren) return;
      if (S.treeOpen.has(folder.folder)) S.treeOpen.delete(folder.folder);
      else S.treeOpen.add(folder.folder);
      saveTreeOpen();
      renderFolders();
    });

    const icon = document.createElement("span");
    icon.className = "tree-ico";
    if (folder.icon) icon.textContent = folder.icon;
    else icon.innerHTML = svg("folder");
    const copy = document.createElement("span");
    copy.className = "tree-copy";
    const name = document.createElement("strong");
    name.textContent = folder.name || folder.folder;
    const meta = document.createElement("small");
    const direct = folder.direct_n || 0;
    meta.textContent = `${folder.n || 0} file${folder.n === 1 ? "" : "s"} · ${humanSize(folder.size)}`
      + (direct && direct !== folder.n ? ` · ${direct} here` : "");
    copy.append(name, meta);

    const actions = document.createElement("span");
    actions.className = "tree-actions";
    const zip = document.createElement("button");
    zip.type = "button";
    zip.setAttribute("aria-label", `Download ${name.textContent} as a ZIP file`);
    zip.innerHTML = svg("download");
    zip.addEventListener("click", (event) => {
      event.stopPropagation();
      downloadFolder(folder);
    });
    actions.append(zip);

    row.append(toggle, icon, copy, actions);
    row.addEventListener("click", () => openFolder(folder.folder));
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openFolder(folder.folder);
    });
    tree.append(row);
    if (open) {
      for (const child of children) paint(child, depth + 1);
    }
  };

  for (const folder of byParent.get("") || []) paint(folder, 0);
  content.append(toolbar, tree);
  updateChrome();
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
  destroyImageViewer();
  const stage = $("viewerStage");
  stage.classList.remove("reader", "image-mode");
  stage.innerHTML = "";
  $("viewer").hidden = true;
  S.viewerIndex = -1;
}

function currentItem() {
  return S.items[S.viewerIndex] || null;
}

function updateViewerChrome(item) {
  $("viewerName").textContent = item.name || "File";
  const bits = [shortKind(item), humanSize(item.size)];
  if (item.folder) bits.push(item.folder);
  $("viewerMeta").textContent = bits.join(" · ");
  const galleryNav = Boolean(S.imageViewer && S.imageGallery.length > 1);
  const prevOn = galleryNav || S.viewerIndex > 0;
  const nextOn = galleryNav || (S.viewerIndex >= 0 && S.viewerIndex < S.items.length - 1);
  $("viewerPrev").disabled = !prevOn;
  $("viewerNext").disabled = !nextOn;
  $("viewerPrev").style.opacity = prevOn ? "1" : ".3";
  $("viewerNext").style.opacity = nextOn ? "1" : ".3";
  updateViewerFavorite(item);
}

function renderViewer() {
  const item = currentItem();
  if (!item) { closeViewer(); return; }
  if (item.part_of && item.part_of.count > 1) { closeViewer(); openItemInfo(item); return; }

  const stage = $("viewerStage");
  destroyImageViewer();
  stage.classList.remove("reader", "image-mode");
  stage.innerHTML = "";
  updateViewerChrome(item);
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
    openImageViewer(item, stage);
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

function destroyImageViewer() {
  stopSlideshow();
  if (S.imageViewer) {
    try { S.imageViewer.destroy(); } catch (_) { /* already gone */ }
  }
  S.imageViewer = null;
  S.imageGallery = [];
}

function imageGalleryItems(fallback) {
  const gallery = S.items.filter((entry) =>
    ["image", "gif", "sticker"].includes(entry.kind || "")
    && !(entry.part_of && entry.part_of.count > 1));
  if (!gallery.length) gallery.push(fallback);
  return gallery;
}

function openImageViewer(item, stage) {
  const galleryItems = imageGalleryItems(item);
  const start = Math.max(0, galleryItems.findIndex((entry) => entry.id === item.id));
  S.imageGallery = galleryItems;
  stage.classList.add("image-mode");
  if (!window.Viewer) {
    stage.classList.remove("image-mode");
    const img = document.createElement("img");
    img.alt = item.name || "";
    img.src = item.stream_url || `/api/stream/${item.id}`;
    stage.append(img);
    img.addEventListener("error", () => showViewerFallback(item, stage,
      "This image cannot be shown. Download it to open in another app."));
    return;
  }
  const holder = document.createElement("div");
  holder.className = "image-gallery";
  for (const entry of galleryItems) {
    const img = document.createElement("img");
    img.src = entry.thumb_url || entry.stream_url || `/api/stream/${entry.id}`;
    img.dataset.original = entry.stream_url || `/api/stream/${entry.id}`;
    img.dataset.id = String(entry.id);
    img.alt = entry.name || "";
    holder.append(img);
  }
  stage.append(holder);
  const toolbar = {
    zoomIn: 1, zoomOut: 1, oneToOne: 1, reset: 1,
    rotateLeft: 1, rotateRight: 1, flipHorizontal: 1, flipVertical: 1
  };
  if (galleryItems.length > 1) {
    Object.assign(toolbar, {
      prev: 1,
      next: 1,
      play: {
        // Viewer.js's own slideshow preloads every image; the app-level timer
        // steps through Telegram streams one at a time instead.
        click(event) { toggleSlideshow(event.currentTarget); }
      }
    });
  }
  try {
    S.imageViewer = new Viewer(holder, {
      inline: true,
      initialViewIndex: start,
      navbar: galleryItems.length > 1 ? { show: true, position: "top" } : false,
      title: false,
      button: false,
      toolbar,
      keyboard: false,
      focus: false,
      transition: false,
      backdrop: false,
      loading: true,
      loop: true,
      toggleOnDblclick: false,
      url(image) { return image.dataset.original || image.src; }
    });
  } catch (_) {
    S.imageViewer = null;
    stage.classList.remove("image-mode");
    const img = document.createElement("img");
    img.src = item.stream_url || `/api/stream/${item.id}`;
    stage.append(img);
    return;
  }
  holder.addEventListener("view", (event) => {
    const index = event.detail ? Number(event.detail.index) : 0;
    const entry = galleryItems[index];
    if (!entry) return;
    S.viewerIndex = Math.max(0, S.items.findIndex((candidate) => candidate.id === entry.id));
    updateViewerChrome(entry);
  });
  updateViewerChrome(item);
}

function toggleSlideshow(button) {
  if (S.slideshow) { stopSlideshow(); toast("Slideshow stopped."); return; }
  if (!S.imageViewer || S.imageGallery.length < 2) return;
  S.slideshowDriven = true;
  S.slideshow = setInterval(() => {
    if (!S.imageViewer) { stopSlideshow(); return; }
    S.imageViewer.next();
  }, 4000);
  if (button) button.classList.add("viewer-slideshow-on");
  toast("Slideshow on — it advances every 4 seconds.", "success");
}

function stopSlideshow() {
  if (S.slideshow) clearInterval(S.slideshow);
  S.slideshow = null;
  S.slideshowDriven = false;
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
function stepViewer(delta) {
  if (S.imageViewer && S.imageGallery.length > 1) {
    if (delta < 0) S.imageViewer.prev();
    else S.imageViewer.next();
    return;
  }
  const next = S.viewerIndex + delta;
  if (next < 0 || next >= S.items.length) return;
  S.viewerIndex = next;
  renderViewer();
}
$("viewerPrev").addEventListener("click", () => stepViewer(-1));
$("viewerNext").addEventListener("click", () => stepViewer(1));
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

  const head = document.createElement("div");
  head.className = "details-head";
  const thumb = document.createElement("div");
  thumb.className = "details-thumb";
  if (item.has_thumb && item.thumb_url) {
    const img = document.createElement("img");
    img.alt = "";
    img.loading = "lazy";
    img.src = item.thumb_url;
    thumb.append(img);
  } else {
    thumb.innerHTML = svg(itemIcon(item));
  }
  const headCopy = document.createElement("div");
  headCopy.className = "details-copy";
  const headName = document.createElement("strong");
  headName.textContent = item.name || "File";
  const headMeta = document.createElement("small");
  headMeta.textContent = [shortKind(item), humanSize(item.size),
    humanDate(item.tg_date || item.added_at)].filter(Boolean).join(" · ");
  headCopy.append(headName, headMeta);
  head.append(thumb, headCopy);
  body.append(head);

  const quick = document.createElement("div");
  quick.className = "details-actions";

  const favorite = document.createElement("button");
  favorite.type = "button";
  favorite.innerHTML = `${svg("star")}<span>${item.favorite ? "Favorited" : "Favorite"}</span>`;
  favorite.classList.toggle("on", Boolean(item.favorite));
  favorite.addEventListener("click", async () => {
    favorite.disabled = true;
    try {
      const next = !item.favorite;
      const data = await api(`/api/items/${item.id}`, { method: "PATCH", body: { favorite: next } });
      item.favorite = next;
      patchItem(item, data.item || {}, { favorite: next });
      favorite.classList.toggle("on", next);
      favorite.querySelector("span").textContent = next ? "Favorited" : "Favorite";
      if (!$("viewer").hidden) updateViewerFavorite(item);
      toast(next ? "Added to favorites." : "Removed from favorites.", "success");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      favorite.disabled = false;
    }
  });
  quick.append(favorite);

  const download = document.createElement("button");
  download.type = "button";
  download.innerHTML = `${svg("download")}<span>Download</span>`;
  download.addEventListener("click", () => { closeSheet(); downloadItem(item); });
  quick.append(download);

  if (item.telegram_link) {
    const link = document.createElement("button");
    link.type = "button";
    link.innerHTML = `${svg("telegram")}<span>Telegram</span>`;
    link.addEventListener("click", () => openExternal(item.telegram_link));
    quick.append(link);
  }
  if (item.kind === "video" || item.kind === "document") {
    const imdb = document.createElement("button");
    imdb.type = "button";
    imdb.innerHTML = `${svg("movie")}<span>${item.movie ? "IMDb" : "Look up"}</span>`;
    imdb.addEventListener("click", () => promptMovie(item));
    quick.append(imdb);
  }
  body.append(quick);

  if (item.movie && item.movie.title) body.append(movieCard(item));

  const facts = [
    ["Type", shortKind(item)],
    ["Size", humanSize(item.size)],
    ["Date", humanDate(item.tg_date || item.added_at)],
    ["Resolution", item.width && item.height ? `${item.width} × ${item.height}` : ""],
    ["Duration", humanDuration(item.duration)],
    ["Stars", (item.stars || []).map((star) => star.name).filter(Boolean).join(", ")],
    ["Collections", (item.collections || []).map((entry) => entry.name).filter(Boolean).join(", ")],
    ["Caption", item.caption || ""]
  ].filter(([, value]) => value);
  if (item.part_of && item.part_of.count > 1) {
    facts.push(["Split file", `${item.part_of.count} parts · ${humanSize(item.part_of.size)}`]);
  }
  if (facts.length) {
    const label = document.createElement("div");
    label.className = "detail-section";
    label.textContent = "Details";
    body.append(label);
    for (const [name, value] of facts) {
      const row = document.createElement("div");
      row.className = "info-row";
      row.innerHTML = "<span></span><b></b>";
      row.querySelector("span").textContent = name;
      row.querySelector("b").textContent = value;
      body.append(row);
    }
  }

  const editLabel = document.createElement("div");
  editLabel.className = "detail-section";
  editLabel.textContent = "Edit";
  body.append(editLabel);

  const grid = document.createElement("div");
  grid.className = "edit-grid";
  const nameField = editField("Name", item.name || "", "Shown in this app only");
  const folderField = editField("Folder", item.folder || "", "Top level / Sub folder");
  folderField.input.setAttribute("list", "folderSuggestions");
  const tagsField = editField("Tags", item.tags || "", "Separate tags with spaces or commas");
  const noteField = editField("Note", item.note || "", "Private note kept in your library", "textarea");
  grid.append(nameField.wrap, folderField.wrap, tagsField.wrap, noteField.wrap);

  const folderList = document.createElement("datalist");
  folderList.id = "folderSuggestions";
  for (const entry of (S.nav && S.nav.folders) || []) {
    if (!entry.folder) continue;
    const option = document.createElement("option");
    option.value = entry.folder;
    folderList.append(option);
  }
  grid.append(folderList);

  const tagList = ((S.nav && S.nav.tags) || []).slice(0, 12);
  if (tagList.length) {
    const suggest = document.createElement("div");
    suggest.className = "tag-suggest";
    for (const entry of tagList) {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "tag-pill";
      pill.textContent = `#${entry.tag}`;
      pill.addEventListener("click", () => {
        const current = tagsField.input.value.split(/[\s,]+/).filter(Boolean);
        if (!current.includes(entry.tag)) current.push(entry.tag);
        tagsField.input.value = current.join(" ");
      });
      suggest.append(pill);
    }
    tagsField.wrap.append(suggest);
  }
  body.append(grid);

  const save = document.createElement("button");
  save.type = "button";
  save.className = "btn primary details-save";
  save.textContent = "Save changes";
  save.addEventListener("click", async () => {
    const payload = {};
    const name = nameField.input.value.trim();
    if (name && name !== (item.name || "")) payload.name = name;
    const folder = folderField.input.value.trim();
    if (folder !== (item.folder || "")) payload.folder = folder;
    const tags = tagsField.input.value.trim();
    if (tags !== (item.tags || "")) payload.tags = tags;
    const note = noteField.input.value.trim();
    if (note !== (item.note || "")) payload.note = note;
    if (!Object.keys(payload).length) { toast("Nothing changed."); return; }
    save.disabled = true;
    try {
      const data = await api(`/api/items/${item.id}`, { method: "PATCH", body: payload });
      Object.assign(item, data.item || {}, payload);
      patchItem(item, data.item || {}, payload);
      S.pageCache.clear();
      closeSheet();
      await loadNav();
      if (S.tab === "folders") renderFolders();
      else if (S.tab !== "more") renderItems();
      updateChrome();
      if (!$("viewer").hidden) updateViewerChrome(item);
      toast("Saved.", "success");
    } catch (error) {
      save.disabled = false;
      toast(error.message, "error");
    }
  });
  body.append(save);

  const manageLabel = document.createElement("div");
  manageLabel.className = "detail-section";
  manageLabel.textContent = "Manage";
  body.append(manageLabel);

  if (item.hidden) {
    body.append(sheetButton(
      "eyeOff",
      "Restore to library",
      "Show this file in the lists again",
      () => restoreItem(item)
    ));
  }
  if (item.telegram_link) {
    body.append(sheetButton(
      "telegram",
      "Copy Telegram link",
      "Paste it in chats or a browser",
      async () => {
        const ok = await copyText(item.telegram_link);
        toast(
          ok ? "Link copied." : "The clipboard is not available.",
          ok ? "success" : "error"
        );
      }
    ));
  }
  body.append(sheetButton(
    "user",
    "Stars in this file",
    (item.stars || []).map((star) => star.name).filter(Boolean).join(", ") || "Assign performers",
    () => openItemStars(item)
  ));
  if (item.kind === "video") {
    body.append(sheetButton(
      "image",
      "Choose thumbnail",
      item.has_thumb ? "Pick a different frame from the video" : "Pick a frame from the video",
      () => openThumbPicker(item)
    ));
  }
  if (item.kind === "image" && item.has_thumb) {
    body.append(sheetButton(
      "user",
      "Use as star portrait",
      "Make this picture the face of a performer",
      () => openPortraitPicker(item)
    ));
  }
  body.append(sheetButton("info", "Inspect file", "Read the metadata stored inside it", () => inspectItemSheet(item)));
  body.append(sheetButton("clock", "Other versions", "Earlier revisions of this file", () => openRevisions(item)));
  body.append(sheetButton("collection", "Add to collection", "Group it with related files", () => openItemCollections(item)));
  body.append(sheetButton(
    "trash",
    item.hidden ? "Delete…" : "Delete…",
    "Remove from the library or from Telegram",
    () => openItemDelete(item),
    true
  ));

  openSheet("File details", body);
}

function restoreItem(item) {
  confirmAction(
    "Restore to library?",
    `${item.name || "This file"} becomes visible again in every screen.`,
    "Restore",
    async () => {
      const data = await api(`/api/items/${item.id}`, {
        method: "PATCH",
        body: { hidden: false }
      });
      Object.assign(item, data.item || {}, { hidden: false });
      closeSheet();
      S.pageCache.clear();
      await loadNav();
      updateChrome();
      if (S.tab === "folders") renderFolders();
      else if (S.tab !== "more") renderItems();
      toast("Restored to the library.", "success");
    }
  );
}

function openItemDelete(item) {
  const body = document.createElement("div");
  const text = document.createElement("p");
  text.textContent = "Choose what should happen to this file.";
  body.append(text);
  body.append(sheetButton(
    "eyeOff",
    "Remove from library",
    "Hides it here and in future syncs. The Telegram message stays.",
    () => confirmAction(
      "Remove from library?",
      `${item.name || "This file"} disappears from the lists. Restore it from Hidden files.`,
      "Remove",
      async () => {
        await api(`/api/items/${item.id}`, { method: "DELETE" });
        await afterItemGone(item);
        toast("Removed from the library.", "success", 5000);
      }
    )
  ));
  body.append(sheetButton(
    "trash",
    "Delete from Telegram",
    "Deletes the channel message for every member. This cannot be undone.",
    () => confirmAction(
      "Delete from Telegram?",
      `${item.name || "This file"} is deleted for every member of the channel. This cannot be undone.`,
      "Delete",
      async () => {
        await api(`/api/items/${item.id}?remote=true`, { method: "DELETE" });
        await afterItemGone(item);
        toast("Deleted from Telegram.", "success");
      }
    ),
    true
  ));
  openSheet(item.hidden ? "Restore or delete" : "Delete file", body);
}

async function afterItemGone(item) {
  if (!$("viewer").hidden && currentItem() && currentItem().id === item.id) closeViewer();
  S.items = S.items.filter((entry) => entry.id !== item.id);
  S.pageCache.clear();
  await loadNav();
  updateChrome();
  if (S.tab === "folders") renderFolders();
  else if (S.tab !== "more") renderItems();
}

async function inspectItemSheet(item) {
  const body = document.createElement("div");
  body.innerHTML = '<div class="spinner"></div>'
    + '<p class="muted small">Downloading the file to read its details…</p>';
  openSheet("File details", body);
  try {
    const data = await api(`/api/items/${item.id}/inspect`, {
      method: "POST",
      body: {},
      timeout: 600000
    });
    if (data.item) Object.assign(item, data.item);
    const info = data.info || {};
    const fields = info.fields || [];
    body.innerHTML = "";
    if (info.note) {
      const note = document.createElement("p");
      note.className = "muted small";
      note.textContent = info.note;
      body.append(note);
    }
    for (const pair of fields) {
      const row = document.createElement("div");
      row.className = "info-row";
      row.innerHTML = "<span></span><b></b>";
      row.querySelector("span").textContent = String(pair[0] ?? "");
      row.querySelector("b").textContent = String(pair[1] ?? "");
      body.append(row);
    }
    if (!fields.length && !info.note) {
      const empty = document.createElement("p");
      empty.textContent = "No extra details were found inside this file.";
      body.append(empty);
    }
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message;
    body.append(p);
  }
}

async function openRevisions(item) {
  const body = document.createElement("div");
  body.innerHTML = '<div class="spinner"></div>';
  openSheet("Other versions", body);
  try {
    const data = await api(`/api/items/${item.id}/revisions`);
    const items = data.items || [];
    body.innerHTML = "";
    if (!items.length) {
      body.innerHTML = "<p>This file has no other versions.</p>";
      return;
    }
    for (const entry of items) {
      body.append(sheetButton(
        "doc",
        entry.name || "Version",
        [shortKind(entry), humanSize(entry.size), humanDate(entry.tg_date || entry.added_at)]
          .filter(Boolean).join(" · "),
        () => openItemInfo(entry)
      ));
    }
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message;
    body.append(p);
  }
}

async function openItemStars(item) {
  const body = document.createElement("div");
  body.innerHTML = '<div class="spinner"></div>';
  openSheet("Stars in this file", body);
  let stars = [];
  try {
    const data = await api(`/api/stars?item=${item.id}`);
    stars = data.stars || [];
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message;
    body.append(p);
    return;
  }
  const chosen = new Set(
    stars.filter((star) => star.assigned).map((star) => Number(star.id))
  );
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Search performers";
  search.autocomplete = "off";
  search.className = "star-search";
  const list = document.createElement("div");
  const render = () => {
    const term = search.value.trim().toLowerCase();
    list.innerHTML = "";
    const shown = stars.filter((star) => !term
      || String(star.name || "").toLowerCase().includes(term)
      || String(star.aliases || "").toLowerCase().includes(term));
    if (!shown.length) {
      const empty = document.createElement("p");
      empty.className = "muted small";
      empty.textContent = stars.length
        ? "No performers match that search."
        : "No performers yet. Create one below.";
      list.append(empty);
      return;
    }
    for (const star of shown) {
      const picked = chosen.has(Number(star.id));
      const row = document.createElement("button");
      row.type = "button";
      row.className = "sheet-action" + (picked ? " on" : "");
      row.innerHTML = `${svg(picked ? "check" : "user")}`
        + '<span class="copy"><strong></strong><small></small></span>';
      row.querySelector("strong").textContent = star.name || "Unnamed performer";
      row.querySelector("small").textContent = picked
        ? `Assigned · ${starMeta(star)}`
        : starMeta(star);
      row.addEventListener("click", () => {
        const id = Number(star.id);
        if (chosen.has(id)) chosen.delete(id);
        else chosen.add(id);
        render();
      });
      list.append(row);
    }
  };
  search.addEventListener("input", render);
  render();

  const create = document.createElement("div");
  create.className = "star-pick-new";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "New performer name";
  nameInput.maxLength = 80;
  nameInput.autocomplete = "off";
  const createBtn = document.createElement("button");
  createBtn.type = "button";
  createBtn.className = "btn";
  createBtn.textContent = "Create";
  createBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    if (!name) { toast("Enter a name for the new performer.", "error"); return; }
    createBtn.disabled = true;
    try {
      const created = await api("/api/stars", { method: "POST", body: { name } });
      stars.push(created);
      chosen.add(Number(created.id));
      nameInput.value = "";
      render();
      toast(`Created ${created.name}. Save to assign it.`, "success", 5000);
    } catch (error) {
      toast(error.message, "error");
    } finally {
      createBtn.disabled = false;
    }
  });
  create.append(nameInput, createBtn);

  const save = document.createElement("button");
  save.type = "button";
  save.className = "btn primary details-save";
  save.textContent = "Save stars";
  save.addEventListener("click", async () => {
    save.disabled = true;
    try {
      const data = await api(`/api/items/${item.id}/stars`, {
        method: "PUT",
        body: { star_ids: [...chosen] }
      });
      item.stars = data.stars || [];
      patchItem(item, { stars: item.stars });
      S.pageCache.clear();
      closeSheet();
      await loadNav();
      if (S.tab === "folders") renderFolders();
      else if (S.tab !== "more") renderItems();
      if (!$("viewer").hidden) updateViewerChrome(item);
      toast(
        item.stars.length
          ? `Saved ${item.stars.length} performer(s).`
          : "Stars cleared.",
        "success"
      );
    } catch (error) {
      save.disabled = false;
      toast(error.message, "error");
    }
  });

  body.innerHTML = "";
  body.append(search, list, create, save);
}

function openThumbPicker(item) {
  if (!(window.AndroidBridge && AndroidBridge.frameAt)) {
    toast("Choosing a thumbnail needs the Android app.", "error");
    return;
  }
  let duration = Number(item.duration) || 0;
  const body = document.createElement("div");
  const info = document.createElement("p");
  info.className = "muted small";
  info.textContent = "Reading frames from Telegram…";
  const grid = document.createElement("div");
  grid.className = "thumb-picker";
  body.append(info, grid);
  openSheet("Choose thumbnail", body);
  const url = `/api/stream/${item.id}`;
  if (duration < 1 && AndroidBridge.durationOf) {
    let probed = 0;
    try { probed = Number(AndroidBridge.durationOf(url)) || 0; } catch (_) { probed = 0; }
    if (probed > 0) {
      duration = probed / 1000;
      item.duration = duration;
    }
  }
  if (duration < 1) {
    info.textContent = "This video's length could not be read, so frames cannot be picked.";
    body.append(sheetButton(
      "sync",
      "Try again",
      "Read the video length and frames once more",
      () => openThumbPicker(item)
    ));
    return;
  }
  const times = [];
  for (let step = 1; step <= 9; step += 1) {
    times.push(Math.round(duration * 1000 * (step / 10)));
  }
  let pending = times.length;
  let usable = 0;
  let picked = false;
  times.forEach((time, index) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "thumb-cell";
    cell.innerHTML = '<div class="spinner small"></div>';
    grid.append(cell);
    setTimeout(() => {
      if (picked) return;
      let data = "";
      try { data = AndroidBridge.frameAt(url, time); } catch (_) { data = ""; }
      pending -= 1;
      cell.innerHTML = "";
      if (data && data.indexOf("data:image/") === 0) {
        usable += 1;
        const img = document.createElement("img");
        img.src = data;
        img.alt = "";
        cell.append(img);
        const label = document.createElement("small");
        label.textContent = humanDuration(time / 1000);
        cell.append(label);
        cell.addEventListener("click", () => {
          picked = true;
          chooseThumbFrame(item, data);
        });
      } else {
        cell.classList.add("empty");
        cell.textContent = "No frame";
      }
      if (!pending) {
        info.textContent = usable
          ? "Tap the picture you want as the thumbnail."
          : "No frames could be read from this video.";
      }
    }, index * 500);
  });
  body.append(sheetButton(
    "sync",
    "Read the frames again",
    "Try another pass over the video",
    () => openThumbPicker(item)
  ));
}

async function chooseThumbFrame(item, dataUrl) {
  const body = document.createElement("div");
  body.innerHTML = '<div class="spinner"></div><p class="muted small">Saving the thumbnail…</p>';
  openSheet("Choose thumbnail", body);
  try {
    const data = await api(`/api/items/${item.id}/thumb/image`, {
      method: "POST",
      body: { image: dataUrl },
      timeout: 120000
    });
    const updated = (data && data.item) || {};
    Object.assign(item, updated);
    patchItem(item, updated);
    S.pageCache.clear();
    closeSheet();
    if (S.tab === "folders") renderFolders();
    else if (S.tab !== "more") renderItems();
    if (!$("viewer").hidden) updateViewerChrome(item);
    toast("Thumbnail updated.", "success");
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message;
    body.append(p);
  }
}

async function openPortraitPicker(item) {
  const body = document.createElement("div");
  body.innerHTML = '<div class="spinner"></div>';
  openSheet("Use as star portrait", body);
  let stars = [];
  try {
    const data = await api("/api/stars?limit=2000");
    stars = data.stars || [];
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message;
    body.append(p);
    return;
  }
  body.innerHTML = "";
  if (!stars.length) {
    body.innerHTML = "<p>No performers yet. Create one in More → Stars first.</p>";
    return;
  }
  for (const star of stars) {
    body.append(sheetButton(
      "user",
      star.name || "Unnamed performer",
      `Use this picture for ${star.name || "the performer"}`,
      async () => {
        try {
          const updated = await api(`/api/stars/${star.id}/image/from-item`, {
            method: "POST",
            body: { item_id: item.id }
          });
          closeSheet();
          toast(`Portrait updated for ${updated.name || star.name}.`, "success");
        } catch (error) { toast(error.message, "error"); }
      }
    ));
  }
  openSheet("Use as star portrait", body);
}

function openItemCollections(item) {
  const collections = (S.nav && S.nav.collections) || [];
  const body = document.createElement("div");
  if (!collections.length) {
    body.innerHTML = "<p>No collections yet. Create one in More → Collections.</p>";
    openSheet("Add to collection", body);
    return;
  }
  for (const collection of collections) {
    body.append(sheetButton(
      "collection",
      collection.name,
      `${Number(collection.n) || 0} file(s)`,
      async () => {
        try {
          await api(`/api/collections/${collection.id}/items`, {
            method: "POST",
            body: { item_ids: [item.id], remove: false }
          });
          closeSheet();
          await loadNav();
          toast(`Added to ${collection.name}.`, "success");
        } catch (error) { toast(error.message, "error"); }
      }
    ));
  }
  openSheet("Add to collection", body);
}

function editField(label, value, placeholder, type = "text") {
  const wrap = document.createElement("label");
  wrap.className = "edit-field";
  const caption = document.createElement("span");
  caption.textContent = label;
  let input;
  if (type === "textarea") {
    input = document.createElement("textarea");
    input.rows = 3;
  } else {
    input = document.createElement("input");
    input.type = "text";
  }
  input.value = value;
  if (placeholder) input.placeholder = placeholder;
  input.autocomplete = "off";
  wrap.append(caption, input);
  return { wrap, input };
}

function patchItem(item, extra, fallback) {
  const index = S.items.findIndex((entry) => entry.id === item.id);
  if (index < 0) return;
  S.items[index] = { ...S.items[index], ...(extra || {}), ...(fallback || {}) };
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
function themeLabel(theme) {
  const entry = THEMES.find(([key]) => key === theme) || THEMES[0];
  return entry[1];
}

function toggleView() {
  S.view = S.view === "grid" ? "list" : "grid";
  storeSet("tfe_view", S.view);
  updateChrome();
  if (S.tab === "folders" || S.tab === "more") return;
  const top = $("content").scrollTop;
  renderItems();
  $("content").scrollTop = top;
}

function openThemeSheet() {
  const body = document.createElement("div");
  for (const [key, title, subtitle] of THEMES) {
    const row = sheetButton("brush", title, subtitle, () => {
      applyTheme(key);
      closeSheet();
      toast(`${title} theme applied.`, "success");
    });
    if (S.theme === key) {
      row.classList.add("on");
      const mark = document.createElement("span");
      mark.className = "sheet-check";
      mark.innerHTML = svg("check");
      row.append(mark);
    }
    body.append(row);
  }
  openSheet("Appearance", body);
}

function openMenuSheet() {
  const body = document.createElement("div");
  const status = S.status || {};
  body.append(sheetButton(
    S.view === "grid" ? "list" : "grid",
    S.view === "grid" ? "Use list view" : "Use grid view",
    "Switch how files are shown",
    () => { closeSheet(); toggleView(); }
  ));
  body.append(sheetButton(
    "sort", "Sort files", `${sortLabel(S.sort)} · ${S.dir === "desc" ? "Descending" : "Ascending"}`,
    () => { closeSheet(); openSortSheet(); }
  ));
  if (S.tab === "files" || S.tab === "favorites" || S.tab === "recent") {
    body.append(sheetButton("select", "Select files", "Pick several files to download", () => {
      closeSheet();
      S.selecting = true;
      syncSelectionChrome();
    }));
  }
  body.append(sheetButton("brush", "Appearance", `Theme: ${themeLabel(S.theme)}`, () => {
    closeSheet();
    openThemeSheet();
  }));
  if (status.can_upload) {
    body.append(sheetButton("upload", "Upload files", "Add files to this channel", () => {
      closeSheet();
      openUploadPicker();
    }));
  }
  body.append(sheetButton("sync", "Sync now", "Fetch new files from Telegram", () => {
    closeSheet();
    startSync(false);
  }));
  if (status.pin_set) {
    body.append(sheetButton("lock", "Lock now", "Require the PIN again", () => {
      closeSheet();
      lockNow();
    }));
  }
  body.append(sheetButton("menu", "All settings", "Vault, tags, stars, PIN and more", () => {
    closeSheet();
    switchTab("more");
  }));
  openSheet("Options", body);
}

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
  list.append(moreRow("user", "Stars", `${Number(nav.stars) || 0} performer(s)`, () => openStarsSheet()));
  list.append(moreRow("eyeOff", "Hidden files", "Files marked hidden in the desktop app", () => useFilter("hidden", "", "Hidden files")));

  list.append(moreRow("sync", "Sync now", "Fetch new files from Telegram", () => startSync(false)));
  list.append(moreRow("sync", "Full re-scan", "Re-read the channel and remove deletions", () => confirmAction(
    "Full re-scan?",
    "This reads the whole channel and can take a while for large vaults.",
    "Start full scan",
    () => startSync(true)
  )));
  list.append(moreRow("info", "Server status", "Check the storage bot on your server", openServerSheet));
  list.append(moreRow("files", "Storage report", "What this vault holds and the largest files", openStorageReport));
  list.append(moreRow("collection", "Duplicate files", "Find copies that waste space", openDuplicatesSheet));
  list.append(moreRow("folder", "Folders", "Create, rename and remove folders", openFoldersSheet));
  list.append(moreRow("check", "Saved views", "Reuse folder and filter combinations", openSavedViewsSheet));
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

function infoRow(name, value) {
  const row = document.createElement("div");
  row.className = "info-row";
  row.innerHTML = "<span></span><b></b>";
  row.querySelector("span").textContent = name;
  row.querySelector("b").textContent = value;
  return row;
}

const SERVER_STATES = {
  online: "Online",
  stale: "Last seen a while ago",
  offline: "Offline",
  none: "No heartbeat yet",
  unknown: "Unknown"
};

function plainAge(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  if (value < 90) return `${value} second${value === 1 ? "" : "s"}`;
  const minutes = Math.round(value / 60);
  if (minutes < 90) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

async function openServerSheet() {
  const body = document.createElement("div");
  body.innerHTML = '<div class="spinner"></div><p class="muted small">Checking the storage bot…</p>';
  openSheet("Server status", body);
  let data;
  try {
    data = await api("/api/server", { timeout: 30000 });
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message;
    body.append(p);
    body.append(sheetButton("sync", "Try again", "", openServerSheet));
    return;
  }
  const state = data.state || "unknown";
  const facts = [["Status", SERVER_STATES[state] || "Unknown"]];
  if (typeof data.age === "number") {
    facts.push(["Last heartbeat", `${plainAge(data.age)} ago`]);
  } else if (data.reason) {
    facts.push(["Detail", data.reason]);
  }
  if (data.version) facts.push(["Bot version", String(data.version)]);
  if (data.files) facts.push(["Files indexed", String(data.files)]);
  if (data.uptime) facts.push(["Uptime", plainAge(data.uptime)]);
  body.innerHTML = "";
  for (const [name, value] of facts) body.append(infoRow(name, value));
  const note = document.createElement("p");
  note.className = "muted small";
  note.textContent = state === "online"
    ? "The storage bot answered recently, so /commands and file links work from any device."
    : "The app keeps working — the library lives in Telegram. If this stays red, the server bot is down or restarting.";
  body.append(note);
  body.append(sheetButton("sync", "Refresh", "Check again", openServerSheet));
  body.append(sheetButton(
    "telegram",
    "Reconnect Telegram",
    "Rebuild the connection without leaving the app",
    async () => {
      toast("Reconnecting…");
      try {
        await api("/api/reconnect", { method: "POST", timeout: 120000 });
        toast("Telegram reconnected.", "success");
      } catch (error) { toast(error.message, "error"); }
    }
  ));
}

async function openStorageReport() {
  const body = document.createElement("div");
  body.innerHTML = '<div class="spinner"></div><p class="muted small">Reading the library…</p>';
  openSheet("Storage report", body);
  try {
    const data = await api("/api/reports/stats", { timeout: 120000 });
    const kinds = data.kinds || [];
    const largest = data.largest || [];
    body.innerHTML = "";
    const totalCount = kinds.reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);
    const totalSize = kinds.reduce((sum, entry) => sum + (Number(entry.size) || 0), 0);
    body.append(infoRow("Files", String(totalCount)));
    body.append(infoRow("Size", humanSize(totalSize)));
    body.append(infoRow("Collections", String(data.collections ?? 0)));
    body.append(infoRow("Saved views", String(data.views ?? 0)));
    if (kinds.length) {
      const label = document.createElement("div");
      label.className = "detail-section";
      label.textContent = "By type";
      body.append(label);
      for (const entry of kinds) {
        body.append(infoRow(entry.label || entry.kind || "File",
          `${entry.count} · ${humanSize(entry.size)}`));
      }
    }
    if (largest.length) {
      const label = document.createElement("div");
      label.className = "detail-section";
      label.textContent = "Largest files";
      body.append(label);
      for (const entry of largest) {
        body.append(sheetButton(
          itemIcon(entry),
          entry.name || "File",
          [shortKind(entry), humanSize(entry.size)].filter(Boolean).join(" · "),
          () => openItemInfo(entry)
        ));
      }
    }
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message;
    body.append(p);
  }
}

async function openDuplicatesSheet() {
  const body = document.createElement("div");
  body.innerHTML = '<div class="spinner"></div><p class="muted small">Looking for identical files…</p>';
  openSheet("Duplicate files", body);
  try {
    const data = await api("/api/reports/duplicates?limit=100", { timeout: 120000 });
    const groups = data.groups || [];
    body.innerHTML = "";
    if (!groups.length) {
      body.innerHTML = "<p>No duplicate files found.</p>";
      return;
    }
    body.append(infoRow("Groups", String(data.group_count ?? groups.length)));
    body.append(infoRow("Could be saved", humanSize(data.wasted)));
    for (const group of groups) {
      body.append(sheetButton(
        "doc",
        group.name || "File",
        `${group.count} copies · ${humanSize(group.size)} each`,
        () => openDuplicateGroup(group)
      ));
    }
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message;
    body.append(p);
  }
}

function openDuplicateGroup(group) {
  const body = document.createElement("div");
  for (const entry of group.items || []) {
    body.append(sheetButton(
      itemIcon(entry),
      entry.name || "Copy",
      [humanDate(entry.tg_date || entry.added_at), entry.folder || "No folder"].filter(Boolean).join(" · "),
      () => openItemInfo(entry)
    ));
  }
  openSheet(`${group.count} copies`, body);
}

async function openFoldersSheet() {
  const body = document.createElement("div");
  body.innerHTML = '<div class="spinner"></div>';
  openSheet("Folders", body);
  try {
    const data = await api("/api/nav");
    const folders = data.folders || [];
    body.innerHTML = "";
    if (!folders.length) body.innerHTML = "<p>No folders yet.</p>";
    for (const entry of folders) {
      body.append(sheetButton(
        "folder",
        `${entry.icon ? entry.icon + " " : ""}${entry.folder}`,
        `${Number(entry.n) || 0} file(s)${entry.note ? " · " + entry.note : ""}`,
        () => openFolderActions(entry)
      ));
    }
    body.append(sheetButton("folder", "New folder", "Create an empty folder", () => {
      promptText("New folder", "Folder path", "", "Top level / Sub folder", "Create", async (name) => {
        if (!name) throw new Error("Type a folder name.");
        await api("/api/folders", { method: "POST", body: { name } });
        await loadNav();
        toast("Folder created.", "success");
        setTimeout(openFoldersSheet, 80);
      });
    }));
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message;
    body.append(p);
  }
}

function openFolderActions(entry) {
  const body = document.createElement("div");
  const text = document.createElement("p");
  text.className = "muted small";
  text.textContent = `${Number(entry.n) || 0} file(s) · ${humanSize(entry.size)}`;
  body.append(text);
  body.append(sheetButton("folder", "Open folder", "Browse the files inside", () => {
    closeSheet();
    openFolder(entry.folder);
  }));
  body.append(sheetButton("edit", "Rename folder", "Files keep their place in the new name", () => {
    promptText("Rename folder", "New name", entry.folder, "Top level / Sub folder", "Rename", async (name) => {
      if (!name) throw new Error("Type a folder name.");
      await api("/api/folders", { method: "PATCH", body: { name: entry.folder, new_name: name } });
      await loadNav();
      toast("Folder renamed.", "success");
      setTimeout(openFoldersSheet, 80);
    });
  }));
  body.append(sheetButton("brush", "Folder icon", "An emoji shown with the folder", () => {
    const icons = ["", "📁", "🎬", "🖼️", "🎵", "📚", "🗄️", "⭐", "🔥", "💎"];
    const grid = document.createElement("div");
    grid.className = "vault-icons";
    for (const icon of icons) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "vault-icon" + (icon === (entry.icon || "") ? " on" : "");
      button.textContent = icon || "∅";
      button.addEventListener("click", async () => {
        try {
          await api("/api/folders", {
            method: "PATCH",
            body: { name: entry.folder, icon }
          });
          await loadNav();
          toast("Folder icon saved.", "success");
          openFoldersSheet();
        } catch (error) { toast(error.message, "error"); }
      });
      grid.append(button);
    }
    const wrap = document.createElement("div");
    wrap.append(grid);
    openSheet("Folder icon", wrap);
  }));
  body.append(sheetButton("edit", "Folder note", "A short reminder shown in this list", () => {
    promptText("Folder note", "Note", entry.note || "", "Optional note", "Save", async (note) => {
      await api("/api/folders", { method: "PATCH", body: { name: entry.folder, note } });
      await loadNav();
      toast("Folder note saved.", "success");
      setTimeout(openFoldersSheet, 80);
    });
  }));
  body.append(sheetButton("trash", "Remove folder", "Only empty folders can be removed", () => {
    confirmAction(
      "Remove folder?",
      `${entry.folder} is deleted when it holds no files.`,
      "Remove",
      async () => {
        await api(`/api/folders?name=${encodeURIComponent(entry.folder)}`, { method: "DELETE" });
        await loadNav();
        toast("Folder removed.", "success");
        setTimeout(openFoldersSheet, 80);
      }
    );
  }, true));
  openSheet(entry.name || entry.folder, body);
}

async function openSavedViewsSheet() {
  const body = document.createElement("div");
  body.innerHTML = '<div class="spinner"></div>';
  openSheet("Saved views", body);
  let views = [];
  try {
    const data = await api("/api/saved-views");
    views = data.views || [];
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message;
    body.append(p);
    return;
  }
  body.innerHTML = "";
  if (!views.length) body.innerHTML = "<p>No saved views yet.</p>";
  for (const view of views) {
    body.append(sheetButton(
      "check",
      view.name || "View",
      viewSummary(view),
      () => applyMobileView(view)
    ));
  }
  body.append(sheetButton("check", "Save the current view", "Store the folder, filters and search", saveMobileView));
}

function viewSummary(view) {
  const data = (view && view.data) || {};
  const bits = [];
  if (data.folder) bits.push(data.folder);
  const filters = data.filters || {};
  if (filters.tag) bits.push(`#${filters.tag}`);
  if (filters.kind) bits.push(filters.kind);
  if (data.starId) bits.push("star");
  if (data.collection) bits.push("collection");
  return bits.join(" · ") || "All files";
}

function applyMobileView(view) {
  const data = (view && view.data) || {};
  const filters = data.filters || {};
  clearFilters(false);
  S.tab = "files";
  S.folder = data.folder || "";
  S.kind = filters.kind || data.kind || "all";
  S.tag = filters.tag || data.tag || "";
  S.filterLabel = S.tag ? `Tag: ${S.tag}` : "";
  if (data.sort) S.sort = data.sort;
  if (data.dir) S.dir = data.dir;
  closeSheet();
  for (const button of $("tabs").querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.tab === "files");
  }
  resetSearch();
  renderCrumb();
  updateChrome();
  renderChips();
  loadItems({ reset: true });
  $("content").scrollTop = 0;
}

function saveMobileView() {
  promptText("Save this view", "View name", "", "My view", "Save", async (name) => {
    const filters = {};
    if (S.kind) filters.kind = S.kind;
    if (S.tag) filters.tag = S.tag;
    const data = { navMode: "all", folder: S.folder || "", sort: S.sort, dir: S.dir, filters };
    await api("/api/saved-views", { method: "POST", body: { name: name || "My view", data } });
    await loadNav();
    toast("View saved.", "success");
    setTimeout(openSavedViewsSheet, 80);
  });
}


async function openVaultSheet() {
  const body = document.createElement("div");
  body.innerHTML = '<div class="spinner"></div>';
  openSheet("Storage vaults", body);
  await loadVaultSheet(body, false);
}

async function loadVaultSheet(body, refresh) {
  try {
    const data = await api(`/api/vaults${refresh ? "?refresh=true" : ""}`, {
      timeout: refresh ? 120000 : 20000
    });
    const vaults = data.vaults || [];
    body.innerHTML = "";
    if (!vaults.length) {
      body.innerHTML = "<p>No storage vaults found. Create one in the desktop app, then refresh.</p>";
      return;
    }
    for (const vault of vaults) {
      const active = String((S.status.vault || {}).id) === String(vault.id);
      const flags = [
        active ? "Current vault" : "Tap to switch",
        vault.default ? "default" : ""
      ].filter(Boolean).join(" · ");
      const row = sheetButton(
        "vault",
        `${vault.icon || "🗄️"}  ${vault.title || String(vault.id)}`,
        flags,
        async () => {
          closeSheet();
          if (active) return;
          if ((S.status || {}).pin_set) {
            openSwitchPin(vault, (pin) => switchToVault(vault, pin));
            return;
          }
          try { await switchToVault(vault, ""); }
          catch (error) { toast(error.message, "error"); }
        }
      );
      body.append(row);
    }
    const current = vaults.find(
      (vault) => String(vault.id) === String(((S.status || {}).vault || {}).id)
    );
    if (current) {
      body.append(sheetButton(
        current.default ? "star" : "check",
        current.default ? "Stop opening on launch" : "Open this vault on launch",
        current.default
          ? "Currently the default vault"
          : `${current.title || "This vault"} will be selected at the PIN screen`,
        async () => {
          try {
            const data = await api("/api/vaults/default", {
              method: "POST",
              body: { id: current.default ? "" : String(current.id) }
            });
            S.status = { ...(S.status || {}), vault: data.vault || S.status.vault, vaults: data.vaults || [] };
            S.vaults = data.vaults || [];
            toast(
              current.default
                ? "The last used vault opens on launch."
                : `${current.title || "This vault"} opens on launch.`,
              "success"
            );
            await loadVaultSheet(body, false);
          } catch (error) { toast(error.message, "error"); }
        }
      ));
      body.append(sheetButton("edit", "Rename this vault", "Change the channel title", () => promptVaultName(current)));
      body.append(sheetButton("brush", "Vault icon", "Pick the emoji shown in the vault lists", () => openVaultIconSheet(current)));
      body.append(sheetButton("key", "Add the storage bot", "Give the bot admin access to this vault", async () => {
        try {
          const result = await api("/api/vaults/bot", { method: "POST", body: { id: String(current.id) } });
          toast(
            result && result.added ? "The storage bot now has access." :
            (result && result.message) || "The bot was not added.",
            result && result.added ? "success" : "error"
          );
        } catch (error) { toast(error.message, "error"); }
      }));
    }
    body.append(sheetButton("vault", "New storage vault", "Create a private channel in Telegram", openCreateVault));
    body.append(sheetButton(
      "sync",
      "Refresh list",
      "Look for vaults created elsewhere",
      async () => {
        body.innerHTML = '<div class="spinner"></div><p class="muted small">Looking for vaults in Telegram…</p>';
        await loadVaultSheet(body, true);
      }
    ));
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = refresh
      ? `${error.message} Showing the known vaults instead.`
      : error.message;
    body.append(p);
    body.append(sheetButton(
      refresh ? "vault" : "sync",
      refresh ? "Show the known vaults" : "Try again",
      "",
      () => loadVaultSheet(body, false)
    ));
  }
}

async function switchToVault(vault, pin) {
  toast("Switching vault…");
  await api("/api/vaults/switch", {
    method: "POST",
    body: { id: String(vault.id), pin },
    timeout: 180000
  });
  S.status = await api("/api/status");
  clearFilters(false);
  S.folder = "";
  await loadNav();
  updateChrome();
  if (S.tab === "more") renderMore();
  else loadItems({ reset: true });
  toast(`Switched to ${vault.title || "the new vault"}`, "success");
  pollSync();
}

function openSwitchPin(vault, onPin) {
  const body = document.createElement("div");
  const text = document.createElement("p");
  text.textContent = `Enter your 4-digit PIN to open ${vault.title || "this vault"}.`;
  const input = document.createElement("input");
  input.type = "password";
  input.inputMode = "numeric";
  input.maxLength = 4;
  input.autocomplete = "off";
  input.placeholder = "4 digits";
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 4);
  });
  const error = document.createElement("p");
  error.className = "form-error";
  error.hidden = true;
  const actions = document.createElement("div");
  actions.className = "sheet-buttons";
  const go = document.createElement("button");
  go.type = "button";
  go.className = "btn primary";
  go.textContent = "Switch";
  go.addEventListener("click", async () => {
    if (input.value.length !== 4) {
      error.textContent = "Enter the 4-digit PIN.";
      error.hidden = false;
      return;
    }
    go.disabled = true;
    try {
      await onPin(input.value);
      closeSheet();
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
      input.value = "";
      input.focus();
      go.disabled = false;
    }
  });
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn ghost";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => closeSheet());
  actions.append(go, cancel);
  body.append(text, input, error, actions);
  openSheet("Switch storage", body);
  setTimeout(() => input.focus(), 50);
}

function promptText(title, label, value, placeholder, actionLabel, onSave) {
  const body = document.createElement("div");
  const field = editField(label, value || "", placeholder);
  field.input.autocomplete = "off";
  const error = document.createElement("p");
  error.className = "form-error";
  const actions = document.createElement("div");
  actions.className = "sheet-buttons";
  const go = document.createElement("button");
  go.type = "button";
  go.className = "btn primary";
  go.textContent = actionLabel;
  const run = async () => {
    go.disabled = true;
    error.textContent = "";
    try {
      await onSave(field.input.value.trim());
      closeSheet();
    } catch (err) {
      error.textContent = err.message;
      go.disabled = false;
    }
  };
  go.addEventListener("click", run);
  field.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); run(); }
  });
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn ghost";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => closeSheet());
  actions.append(go, cancel);
  body.append(field.wrap, error, actions);
  openSheet(title, body);
  setTimeout(() => field.input.focus(), 50);
}

function promptVaultName(vault) {
  promptText(
    "Rename vault",
    "Channel title",
    vault.title || "",
    "Main Storage",
    "Rename",
    async (title) => {
      if (!title) throw new Error("Type a name for the vault.");
      const data = await api("/api/vaults/rename", {
        method: "POST",
        body: { id: String(vault.id), title }
      });
      S.status = { ...(S.status || {}), vault: data.vault || S.status.vault, vaults: data.vaults || [] };
      toast("Vault renamed.", "success");
    }
  );
}

const VAULT_ICONS = [
  "🗄️", "📦", "🗃️", "💾", "🎞️",
  "📚", "🔐", "🚀", "🌙", "🔥",
  "💎", "🧊", "🌊", "🍀", "⚡",
  "🎬", "🖼️", "📀", "🧰", "🧿"
];

function openVaultIconSheet(vault) {
  const body = document.createElement("div");
  body.className = "vault-icons";
  for (const icon of VAULT_ICONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "vault-icon" + (icon === (vault.icon || "🗄️") ? " on" : "");
    button.textContent = icon;
    button.addEventListener("click", async () => {
      try {
        const data = await api("/api/vaults/icon", {
          method: "POST",
          body: { id: String(vault.id), icon }
        });
        S.status = { ...(S.status || {}), vault: data.vault || S.status.vault, vaults: data.vaults || [] };
        closeSheet();
        toast("Vault icon updated.", "success");
      } catch (error) { toast(error.message, "error"); }
    });
    body.append(button);
  }
  openSheet("Vault icon", body);
}

function openCreateVault() {
  promptText(
    "New storage vault",
    "Name",
    "",
    "Main Storage 2",
    "Create vault",
    async (name) => {
      if (!name) throw new Error("Give the new vault a name.");
      toast("Creating the channel in Telegram…");
      const data = await api("/api/vaults/create", {
        method: "POST",
        body: { name },
        timeout: 180000
      });
      S.status = { ...(S.status || {}), vault: data.vault || null, vaults: data.vaults || [] };
      clearFilters(false);
      S.folder = "";
      await loadNav();
      updateChrome();
      if (S.tab === "more") renderMore();
      else loadItems({ reset: true });
      const bot = data.bot || {};
      toast(
        bot.added ? `Created ${name} and added the storage bot.` :
        `Created ${name}. ${bot.message || ""}`.trim(),
        "success",
        6000
      );
      pollSync();
    }
  );
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
  if (tags.length) {
    body.append(sheetButton(
      "edit",
      "Tag colours and groups",
      "Colour-code tags and group related ones",
      openTagManager
    ));
  }
  openSheet("Tags", body);
}

const TAG_COLORS = ["", "#229ED9", "#7c5cff", "#e0457b", "#f0a020", "#27ae60", "#8e44ad", "#e74c3c", "#0ca678", "#6b7280"];

function openTagManager() {
  const body = document.createElement("div");
  const tags = (S.nav && S.nav.tags) || [];
  if (!tags.length) {
    body.innerHTML = "<p>No tags yet. Add tags to files first.</p>";
  }
  for (const tag of tags) {
    body.append(sheetButton(
      "tag",
      tag.tag,
      [tag.group || "", `${tag.count} file${tag.count === 1 ? "" : "s"}`, tag.color || ""]
        .filter(Boolean).join(" · "),
      () => promptTagMeta(tag)
    ));
  }
  openSheet("Tag colours and groups", body);
}

function promptTagMeta(tag) {
  const body = document.createElement("div");
  const note = document.createElement("p");
  note.className = "muted small";
  note.textContent = `Tag #${tag.tag}`;
  let color = tag.color || "";
  const colourField = document.createElement("div");
  colourField.className = "edit-field";
  const colourLabel = document.createElement("span");
  colourLabel.textContent = "Colour";
  const swatches = document.createElement("div");
  swatches.className = "swatch-row";
  const paint = () => {
    swatches.innerHTML = "";
    for (const value of TAG_COLORS) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "swatch" + (value ? "" : " none") + (value === color ? " active" : "");
      dot.title = value || "No colour";
      if (value) dot.style.setProperty("--swatch", value);
      dot.addEventListener("click", () => { color = value; paint(); });
      swatches.append(dot);
    }
  };
  paint();
  colourField.append(colourLabel, swatches);
  const group = editField("Group", tag.group || "", "Optional group");
  group.input.autocomplete = "off";
  const error = document.createElement("p");
  error.className = "form-error";
  const actions = document.createElement("div");
  actions.className = "sheet-buttons";
  const go = document.createElement("button");
  go.type = "button";
  go.className = "btn primary";
  go.textContent = "Save";
  go.addEventListener("click", async () => {
    go.disabled = true;
    error.textContent = "";
    try {
      await api("/api/tags/meta", {
        method: "POST",
        body: { tag: tag.tag, color, group: group.input.value.trim() }
      });
      await loadNav();
      closeSheet();
      toast("Tag saved.", "success");
      setTimeout(openTagManager, 80);
    } catch (err) {
      error.textContent = err.message;
      go.disabled = false;
    }
  });
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn ghost";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => { closeSheet(); setTimeout(openTagManager, 80); });
  actions.append(go, cancel);
  body.append(note, colourField, group.wrap, error, actions);
  openSheet("Tag colour and group", body);
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
      body.innerHTML = "<p>No collections yet. Create one below.</p>";
    }
    for (const collection of collections) {
      body.append(sheetButton(
        "collection",
        collection.name || "Collection",
        `${collection.n || 0} file${collection.n === 1 ? "" : "s"}`,
        () => useFilter("collection", collection.id, `Collection: ${collection.name}`)
      ));
    }
    body.append(sheetButton("collection", "New collection", "Create an empty collection", () => {
      promptText("New collection", "Name", "", "Collection name", "Create", async (name) => {
        if (!name) throw new Error("Type a name.");
        await api("/api/collections", { method: "POST", body: { name } });
        await loadNav();
        if (S.tab === "more") renderMore();
        toast("Collection created.", "success");
        setTimeout(openCollectionsSheet, 80);
      });
    }));
    if (collections.length) {
      body.append(sheetButton("edit", "Organise collections", "Rename or remove a collection", () => {
        const list = document.createElement("div");
        for (const collection of collections) {
          list.append(sheetButton(
            "collection",
            collection.name || "Collection",
            `${collection.n || 0} file(s)`,
            () => openCollectionActions(collection)
          ));
        }
        openSheet("Organise collections", list);
      }));
    }
  } catch (error) {
    body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message;
    body.append(p);
  }
}

function openCollectionActions(collection) {
  const body = document.createElement("div");
  body.append(sheetButton("edit", "Rename", "Change the collection name", () => {
    promptText("Rename collection", "Name", collection.name || "", "Collection name", "Rename", async (name) => {
      if (!name) throw new Error("Type a name.");
      await api(`/api/collections/${collection.id}`, { method: "PATCH", body: { name } });
      await loadNav();
      if (S.tab === "more") renderMore();
      toast("Collection renamed.", "success");
      setTimeout(openCollectionsSheet, 80);
    });
  }));
  body.append(sheetButton("trash", "Delete collection", "Files stay where they are", () => {
    confirmAction(
      "Delete collection?",
      `${collection.name || "This collection"} is removed. The files inside stay untouched.`,
      "Delete",
      async () => {
        await api(`/api/collections/${collection.id}`, { method: "DELETE" });
        await loadNav();
        if (S.tab === "more") renderMore();
        toast("Collection deleted.", "success");
        setTimeout(openCollectionsSheet, 80);
      }
    );
  }, true));
  openSheet(collection.name || "Collection", body);
}

const STAR_OPEN_KEY = "tfe_star_open";

function starInitials(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "★";
  const first = (words[0][0] || "").toUpperCase();
  const last = words.length > 1 ? (words[words.length - 1][0] || "").toUpperCase() : "";
  return first + last;
}

function starLetter(name) {
  const match = String(name || "").trim().match(/^[a-z]/i);
  return match ? match[0].toUpperCase() : "#";
}

function starLetters(stars) {
  const letters = [...new Set(stars.map((star) => starLetter(star.name)))];
  return letters.sort((a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)));
}

function starMeta(star) {
  const n = Number(star.n) || 0;
  const bits = [`${n} file${n === 1 ? "" : "s"}`];
  const videos = Number(star.videos) || 0;
  const images = Number(star.images) || 0;
  if (videos) bits.push(`${videos} video${videos === 1 ? "" : "s"}`);
  if (images) bits.push(`${images} image${images === 1 ? "" : "s"}`);
  return bits.join(" · ");
}

function starAvatar(star) {
  const avatar = document.createElement("span");
  avatar.className = "star-avatar";
  const fallback = () => {
    avatar.classList.add("initial");
    avatar.textContent = starInitials(star.name);
  };
  if (star.image_url) {
    const image = document.createElement("img");
    image.src = star.image_url;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => { image.remove(); fallback(); });
    avatar.append(image);
  } else {
    fallback();
  }
  return avatar;
}

function starRow(star) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "star-row";
  const copy = document.createElement("span");
  copy.className = "star-copy";
  const name = document.createElement("strong");
  name.textContent = star.name || "Unnamed performer";
  const meta = document.createElement("small");
  meta.textContent = starMeta(star);
  copy.append(name, meta);
  row.append(starAvatar(star), copy);
  if (star.favorite) {
    const fav = document.createElement("span");
    fav.className = "star-fav";
    fav.innerHTML = svg("star");
    row.append(fav);
  }
  row.addEventListener("click", () => useFilter("star", star.id, `Star: ${star.name}`));
  return row;
}

async function openStarsSheet(query = "") {
  const body = document.createElement("div");
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Find a performer";
  search.autocomplete = "off";
  search.className = "star-search";
  search.value = query;
  const tools = document.createElement("div");
  tools.className = "tree-toolbar";
  const expand = document.createElement("button");
  expand.type = "button";
  expand.textContent = "Expand all";
  const collapse = document.createElement("button");
  collapse.type = "button";
  collapse.textContent = "Collapse all";
  tools.append(expand, collapse);
  const list = document.createElement("div");
  list.innerHTML = '<div class="spinner"></div>';
  body.append(search, tools, list);
  openSheet("Stars", body);

  let stars = [];
  let openSet = null;
  const saved = storeGet(STAR_OPEN_KEY, null);
  if (saved !== null) {
    try { openSet = new Set(JSON.parse(saved) || []); } catch (_) { openSet = new Set(); }
  }
  const persistOpen = () => {
    storeSet(STAR_OPEN_KEY, JSON.stringify([...(openSet || [])]));
  };

  const paintGroups = () => {
    list.innerHTML = "";
    const letters = starLetters(stars);
    const groups = new Map();
    for (const star of stars) {
      const letter = starLetter(star.name);
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter).push(star);
    }
    for (const letter of letters) {
      const members = groups.get(letter);
      const open = openSet ? openSet.has(letter) : true;
      const section = document.createElement("section");
      section.className = "star-group" + (open ? " open" : "");
      const head = document.createElement("button");
      head.type = "button";
      head.className = "star-letter";
      head.setAttribute("aria-expanded", String(open));
      head.innerHTML = `<span class="star-chev">${svg("chev")}</span>`
        + '<span class="star-letter-name"></span><span class="star-letter-count"></span>';
      head.querySelector(".star-letter-name").textContent = letter;
      head.querySelector(".star-letter-count").textContent =
        `${members.length} performer${members.length === 1 ? "" : "s"}`;
      head.addEventListener("click", () => {
        if (!openSet) openSet = new Set(letters);
        if (openSet.has(letter)) openSet.delete(letter);
        else openSet.add(letter);
        persistOpen();
        paintGroups();
      });
      const rows = document.createElement("div");
      rows.className = "star-rows";
      if (open) for (const star of members) rows.append(starRow(star));
      section.append(head, rows);
      list.append(section);
    }
  };

  const paintResults = () => {
    list.innerHTML = "";
    const box = document.createElement("div");
    box.className = "star-results";
    for (const star of stars) box.append(starRow(star));
    list.append(box);
  };

  const paint = (text) => {
    if (!stars.length) {
      list.innerHTML = "<p>No performers found.</p>";
      tools.hidden = true;
      return;
    }
    tools.hidden = !!text;
    if (text) paintResults();
    else paintGroups();
  };

  expand.addEventListener("click", () => {
    openSet = new Set(starLetters(stars));
    persistOpen();
    paintGroups();
  });
  collapse.addEventListener("click", () => {
    openSet = new Set();
    persistOpen();
    paintGroups();
  });

  let token = 0;
  const load = async (text) => {
    const mine = ++token;
    list.innerHTML = '<div class="spinner"></div>';
    tools.hidden = true;
    try {
      const data = await api(`/api/stars?q=${encodeURIComponent(text)}`);
      if (mine !== token) return;
      stars = (data.stars || []).slice().sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || "")));
      paint(text);
    } catch (error) {
      if (mine !== token) return;
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
setIcon($("backBtn"), "back");
setIcon($("searchBtn"), "search");
setIcon($("selectBtn"), "select");
setIcon($("menuBtn"), "menu");
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

$("backBtn").addEventListener("click", () => {
  if (S.folder || S.filterLabel) { openFolder(""); return; }
  if (S.q) { $("searchClose").click(); return; }
  updateChrome();
});
$("viewBtn").addEventListener("click", toggleView);
$("menuBtn").addEventListener("click", openMenuSheet);
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
  if (document.documentElement.classList.contains("kb-open")) {
    const field = document.activeElement;
    if (field && typeof field.blur === "function") field.blur();
    return true;
  }
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
      // A phone on mobile data can need minutes for the ~45 MB snapshot,
      // and the default 60 s abort here would drop the close save.
      await api("/api/vault/save", { method: "POST", timeout: 620000 });
    } catch (error) {
      toast(error.message || "The library could not be saved.", "error");
      await new Promise((resolve) => setTimeout(resolve, 1600));
    }
  }
  AndroidBridge.finishApp();
}

initDownloadBar();
boot();
