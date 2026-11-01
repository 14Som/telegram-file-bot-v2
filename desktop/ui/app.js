"use strict";

/* ------------------------------------------------------------------ icons */
const SVG = {
  refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
  upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/>',
  more: '<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
  home: '<path d="m3 10 9-7 9 7"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  starFilled: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" fill="currentColor"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  folderOpen: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3z"/><path d="M3 10h18l-2 9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  forward: '<path d="M9 18l6-6-6-6"/>',
  up: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  download: '<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  backspace: '<path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="m12 9 6 6M18 9l-6 6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-4-4L7 21"/>',
  video: '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m22 8-6 4 6 4z"/>',
  audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  document: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
  sticker: '<circle cx="12" cy="12" r="9"/><path d="M8.5 10h.01M15.5 10h.01"/><path d="M8 14c1 1.6 2.3 2.4 4 2.4s3-.8 4-2.4"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  move: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5"/><path d="m9.5 13.5 2.5 2.5 2.5-2.5"/>',
  tag: '<path d="M20 13 13 20l-9-9V4h7z"/><circle cx="8" cy="8" r="1.5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7L12.5 19"/>',
  bot: '<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4"/><circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none"/><path d="M9 17h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  alert: '<path d="M12 9v5"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  sortAsc: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  sortDesc: '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  power: '<path d="M12 3v9"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/>',
  eyeOff: '<path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.4 5.2A10.5 10.5 0 0 1 12 5c5 0 8.6 4.4 9.7 6.2a1.8 1.8 0 0 1 0 1.6 17 17 0 0 1-2.2 2.9"/><path d="M6.2 6.2A16.6 16.6 0 0 0 2.3 11.2a1.8 1.8 0 0 0 0 1.6C3.4 14.6 7 19 12 19a10.5 10.5 0 0 0 4.1-.8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  filter: '<path d="M3 5h18l-7 8.2V20l-4-2v-4.8z"/>',
  note: '<path d="M4 4h10l6 6v10H4z"/><path d="M14 4v6h6"/><path d="M8 13h8M8 17h5"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8"/><path d="M10 12h4"/>',
  folderPlus: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5h5"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1.2" fill="currentColor" stroke="none"/><path d="M12 21a3 3 0 0 1 0-6c1 0 1.5-.5 1.5-1.5"/>',
  uploadFolder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 16v-6"/><path d="m9 12 3-3 3 3"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/>',
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5"/><path d="M12 12v9"/>',
  cad: '<path d="M4 20 20 4"/><path d="M14 4h6v6"/><path d="M4 14v6h6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  foldCompact: '<path d="m7 20 5-5 5 5"/><path d="m7 4 5 5 5-5"/>',
  foldExpand: '<path d="m7 9 5-5 5 5"/><path d="m7 15 5 5 5-5"/>'
};

const LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#229ED9"/><path d="M50.5 15.2 13.8 29.4c-1.5.6-1.4 2.6.1 3.1l9.2 2.9 3.5 10.9c.4 1.3 2.1 1.6 3 .5l5.3-5.9 9.4 6.9c1.1.8 2.7.2 3-1.2l5.1-24.8c.3-1.4-1-2.4-2.9-2.6zM24 35.6l20.6-13.4-16.5 16.3-.6 5.9z" fill="#fff"/><path d="m24 35.6 20.6-13.4-16.5 16.3-.6 5.9-1.2-4.2z" fill="#d8efff"/></svg>';

const FILE_GLYPHS = {
  image: "image",
  video: "play",
  audio: "audio",
  voice: "audio",
  document: "document",
  model: "cube",
  cad: "cad",
  sticker: "sticker",
  gif: "play",
  other: "file"
};

function svgRaw(name, extra) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra || ""}>${SVG[name] || ""}</svg>`;
}
function setIcon(node, name) {
  if (node) node.innerHTML = svgRaw(name);
}
function fileIcon(kind) {
  return h("span", { class: "ficon " + (kind || "other"), html: svgRaw(FILE_GLYPHS[kind] || "file") });
}

/* ---------------------------------------------------------------- helpers */
const $ = (id) => document.getElementById(id);
let fieldSeq = 0;

function h(tag, props, ...children) {
  const node = document.createElement(tag);
  const options = props || {};
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else if (key === "value") node.value = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (["checked", "disabled", "selected", "hidden", "multiple", "autofocus"].includes(key)) {
      if (value) node.setAttribute(key, "");
    } else {
      node.setAttribute(key, String(value));
    }
  }
  appendChildren(node, children);
  return node;
}
function appendChildren(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child === undefined || child === null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
}
function iconNode(name, cls) {
  return h("span", { class: cls || "", html: svgRaw(name) });
}
function externalLink(href, text) {
  return h("a", { href, target: "_blank", rel: "noopener noreferrer", text });
}
function field(labelText, input, hint) {
  const id = input.id || `field-${++fieldSeq}`;
  input.id = id;
  const wrap = h("div", { class: "field" }, h("label", { for: id, text: labelText }), input);
  if (hint) wrap.append(h("div", { class: "hint", text: hint }));
  return wrap;
}
function inputEl(options) {
  const node = h("input");
  for (const [key, value] of Object.entries(options || {})) {
    if (key === "value") node.value = value;
    else node.setAttribute(key, String(value));
  }
  return node;
}
function btn(label, cls, onClick, type) {
  const node = h("button", { class: cls || "btn", type: type || "button" }, label);
  if (onClick) node.addEventListener("click", onClick);
  return node;
}
function fmtSize(bytes) {
  if (bytes === null || bytes === undefined) return "—";
  const value = Number(bytes);
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  const digits = index === 0 ? 0 : size >= 100 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(digits)} ${units[index]}`;
}
const dateFmt = new Intl.DateTimeFormat(undefined, {
  year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit"
});
const shortDateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" });
function fmtDate(iso, short) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return (short ? shortDateFmt : dateFmt).format(date);
}
function fmtDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${minutes}:${String(secs).padStart(2, "0")}`;
}
function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
function initials(text) {
  const parts = (text || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}
function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
function toast(message, kind, duration) {
  const root = $("toastRoot");
  if (!root || !message) return;
  const marks = { success: "✓", error: "!", info: "i" };
  const node = h("div", { class: `toast ${kind || "info"}`, role: "status" },
    h("span", { class: "toast-mark", text: marks[kind] || marks.info }),
    h("span", { class: "toast-text", text: message })
  );
  root.append(node);
  const timer = setTimeout(
    () => node.remove(),
    duration || (kind === "error" ? 6000 : 3500)
  );
  node.addEventListener("click", () => {
    clearTimeout(timer);
    node.remove();
  });
}
function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/* ------------------------------------------------------------------ state */
const PREFS_COOKIE = "tfe_prefs";
const THEME_VALUES = ["system", "light", "dark", "mica", "acrylic"];
const SORT_VALUES = ["date", "name", "size", "kind", "folder", "added", "star"];

function loadPrefs() {
  try {
    const match = document.cookie.match(/(?:^|;\s*)tfe_prefs=([^;]+)/);
    const saved = match ? JSON.parse(decodeURIComponent(match[1])) : {};
    return saved && typeof saved === "object" ? saved : {};
  } catch (_) {
    return {};
  }
}
function savePrefs(patch) {
  try {
    const next = { ...loadPrefs(), ...patch };
    document.cookie = `${PREFS_COOKIE}=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (_) {
    /* preferences are best-effort */
  }
}
function filterStateFrom(saved) {
  const data = saved && typeof saved === "object" ? saved : {};
  return {
    min: typeof data.min === "string" ? data.min : "",
    max: typeof data.max === "string" ? data.max : "",
    after: typeof data.after === "string" ? data.after : "",
    before: typeof data.before === "string" ? data.before : "",
    note: Boolean(data.note),
    recursive: Boolean(data.recursive)
  };
}
function loadFilterState() {
  try {
    if (SAVED_PREFS.filters) return filterStateFrom(SAVED_PREFS.filters);
    return filterStateFrom(JSON.parse(localStorage.getItem("tfe_filters") || "{}"));
  } catch (_) {
    return filterStateFrom({});
  }
}
const SAVED_PREFS = loadPrefs();
const CLIPBOARD = { ids: [], vault: "" };

const S = {
  status: null,
  server: null,
  authStage: "",
  authBusy: false,
  loginForced: false,
  lastPhone: "",
  loginMode: "qr",
  qr: { active: false, starting: false, timer: null, version: 0, image: "", error: "", seq: 0 },
  passwordHint: "",
  channels: [],
  channelQuery: "",
  selectedChannel: null,
  vaults: [],
  vaultMenuOpen: false,
  vaultBusy: false,
  vaultRefreshBusy: false,
  nav: { folders: [], tags: [], kinds: [], stars: 0, collections: [], views: [], stats: { count: 0, size: 0, favorites: 0, playing: 0, last_sync: null } },
  stars: [],
  starTotal: 0,
  starId: null,
  starInfo: null,
  starsLoading: false,
  items: [],
  total: 0,
  totalSize: 0,
  nextCursor: "",
  covers: {},
  coversPending: new Set(),
  coversSeq: 0,
  loading: false,
  itemsPending: false,
  loadSeq: 0,
  navMode: "all",
  folder: "",
  tag: "",
  kind: "",
  collection: null,
  watching: false,
  favorite: false,
  hiddenOnly: false,
  renderedStage: "",
  q: "",
  filters: loadFilterState(),
  theme: THEME_VALUES.includes(SAVED_PREFS.theme) ? SAVED_PREFS.theme : (localStorage.getItem("tfe_theme") || "system"),
  sort: SORT_VALUES.includes(SAVED_PREFS.sort) ? SAVED_PREFS.sort : (localStorage.getItem("tfe_sort") || "date"),
  dir: SAVED_PREFS.dir === "asc" || SAVED_PREFS.dir === "desc" ? SAVED_PREFS.dir : (localStorage.getItem("tfe_dir") || "desc"),
  view: SAVED_PREFS.view === "tiles" || SAVED_PREFS.view === "details" ? SAVED_PREFS.view : (localStorage.getItem("tfe_view") || "details"),
  selectedId: null,
  selectedFolderPath: null,
  selection: new Set(),
  selectionAnchor: null,
  history: [],
  histIndex: -1,
  syncTimer: null,
  syncFinalHandled: null,
  transferTimer: null,
  transfers: [],
  localUpload: null,
  seenTransfers: new Set(),
  refreshTimer: null,
  previewToken: 0,
  previewCollapsed: SAVED_PREFS.preview === "hidden",
  channelsTimer: null
};

/* -------------------------------------------------------------------- api */
async function api(path, options) {
  const opts = options || {};
  const init = { method: opts.method || "GET", credentials: "same-origin", headers: {} };
  if (init.method !== "GET") init.headers["X-TFE"] = "1";
  if (opts.body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  if (opts.form) init.body = opts.form;
  const response = await fetch(path, init);
  let data = null;
  try { data = await response.json(); } catch (_) { data = null; }
  if (!response.ok) {
    const message = (data && data.detail) || `Request failed (${response.status})`;
    const error = new Error(typeof message === "string" ? message : "Request failed");
    error.status = response.status;
    if (response.status === 403 && String(message).includes("authenticated")) {
      reloadForFreshSession();
    }
    throw error;
  }
  return data;
}

function reloadForFreshSession() {
  try {
    const now = Date.now();
    let entry = JSON.parse(sessionStorage.getItem("tfe_auth_reload") || "null");
    if (!entry || now - entry.ts > 10000) entry = { n: 0, ts: now };
    if (entry.n >= 2) return;
    entry.n += 1;
    sessionStorage.setItem("tfe_auth_reload", JSON.stringify(entry));
    location.reload();
  } catch (_) {
    location.reload();
  }
}

function ready() {
  return Boolean(S.status && S.status.authorized && S.status.vault);
}

/* ---------------------------------------------------------- folders/filters */
function folderEntry(path) {
  const lower = String(path || "").toLowerCase();
  return (S.nav.folders || []).find((entry) => entry.folder.toLowerCase() === lower) || null;
}
function folderIconNode(entry, cls) {
  const className = cls || "folder-ico";
  if (entry && entry.icon) return h("span", { class: `${className} emoji`, text: entry.icon, "aria-hidden": "true" });
  return h("span", { class: className, html: svgRaw("folder") });
}
function activeFilterCount() {
  let count = 0;
  for (const key of ["min", "max", "after", "before"]) {
    if (S.filters[key]) count += 1;
  }
  if (S.filters.note) count += 1;
  if (S.filters.recursive && S.folder) count += 1;
  return count;
}
function isFiltering() {
  return Boolean(
    S.tag || S.kind || S.q ||
    S.filters.min || S.filters.max || S.filters.after || S.filters.before || S.filters.note
  );
}
function updateFilterBadge() {
  const badge = $("filterBadge");
  if (!badge) return;
  const count = activeFilterCount();
  badge.hidden = count === 0;
  badge.textContent = String(count);
  $("filterBtn").classList.toggle("active", count > 0);
  $("filterBtn").title = count ? `${plural(count, "filter")} active` : "Advanced filters";
}
function visibleSubfolders() {
  if (isFiltering()) return [];
  if (S.navMode === "stars") return [];
  if (S.folder) {
    const parent = S.folder.toLowerCase();
    return (S.nav.folders || []).filter((entry) => (entry.parent || "").toLowerCase() === parent);
  }
  if (S.navMode === "all") {
    return (S.nav.folders || []).filter((entry) => !entry.parent);
  }
  return [];
}
function openFolder(path) {
  navigateScope({ navMode: "all", folder: path, kind: "", tag: "", q: "" });
}

/* ------------------------------------------------------------------ boot */
const THEME_OPTIONS = [
  { value: "system", label: "System", note: "Follow Windows", swatch: "system" },
  { value: "light", label: "Light", note: "Bright surfaces", swatch: "light" },
  { value: "dark", label: "Dark", note: "Dim surfaces", swatch: "dark" },
  { value: "mica", label: "Mica", note: "Windows 11 tint", swatch: "mica" },
  { value: "acrylic", label: "Acrylic", note: "Translucent glass", swatch: "acrylic" }
];

function applyTheme(theme) {
  S.theme = theme || "system";
  if (S.theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = S.theme;
  localStorage.setItem("tfe_theme", S.theme);
  savePrefs({ theme: S.theme });
}
function themeGrid() {
  const grid = h("div", { class: "theme-grid" });
  const render = () => {
    grid.replaceChildren();
    for (const option of THEME_OPTIONS) {
      const active = S.theme === option.value;
      const card = h("button", {
        class: "theme-card" + (active ? " active" : ""),
        type: "button",
        title: option.note,
        "aria-pressed": active ? "true" : "false"
      },
        h("span", { class: `theme-swatch ${option.swatch}`, "aria-hidden": "true" },
          h("span", { class: "theme-swatch-side" }),
          h("span", { class: "theme-swatch-main" })
        ),
        h("span", { class: "theme-card-text" },
          h("strong", { text: option.label }),
          h("small", { text: option.note })
        )
      );
      card.addEventListener("click", () => {
        applyTheme(option.value);
        render();
      });
      grid.append(card);
    }
  };
  render();
  return grid;
}

function init() {
  applyTheme(S.theme);
  $("brandLogo").innerHTML = LOGO;
  $("loginLogo").innerHTML = LOGO;
  document.querySelectorAll("[data-icon]").forEach((node) => setIcon(node, node.dataset.icon));
  setIcon($("uploadIcon"), "upload");
  setIcon($("uploadFilesIcon"), "upload");
  setIcon($("uploadFolderIcon"), "uploadFolder");
  setIcon($("filterIcon"), "filter");
  setIcon($("syncBtn"), "refresh");
  setIcon($("moreBtn"), "more");
  setIcon($("lockBtn"), "lock");
  setIcon($("cacheBtn"), "trash");
  setIcon($("quitBtn"), "power");
  setIcon($("vaultChipCaret"), "chevron");
  setIcon($("vaultRefreshBtn"), "refresh");
  setIcon($("vaultNewIcon"), "plus");
  setIcon($("vaultBotIcon"), "bot");
  $("lockLogo").innerHTML = LOGO;
  buildLockPad();
  setIcon($("backBtn"), "back");
  setIcon($("forwardBtn"), "forward");
  setIcon($("upBtn"), "up");
  applyPreviewState();
  document.querySelector(".search-icon").innerHTML = svgRaw("search");
  $("sortDirBtn").innerHTML = svgRaw(S.dir === "asc" ? "sortAsc" : "sortDesc");
  setupScrollbars();
  $("uploadsClose").innerHTML = svgRaw("close");
  $("viewerClose").innerHTML = svgRaw("close");
  $("viewerDownload").innerHTML = svgRaw("download");
  $("viewerPrev").innerHTML = svgRaw("chevronLeft");
  $("viewerNext").innerHTML = svgRaw("chevron");
  $("viewerMpv").innerHTML = svgRaw("external");
  document.querySelector('[data-view="details"]').innerHTML = svgRaw("list");
  document.querySelector('[data-view="tiles"]').innerHTML = svgRaw("grid");
  document.querySelector(".preview-empty-icon").innerHTML = svgRaw("file");
  document.querySelector(".empty-icon").innerHTML = svgRaw("folderOpen");
  document.querySelector(".drop-icon").innerHTML = svgRaw("upload");
  document.querySelectorAll(".view-toggle button").forEach((node) => {
    node.classList.toggle("active", node.dataset.view === S.view);
  });
  bindEvents();
  updateViewButtons();
  boot();
}

async function boot() {
  try {
    S.status = await api("/api/status");
  } catch (error) {
    showLoginFatal(error.message);
    return;
  }
  updateChrome();
  if (S.status.locked) {
    showLock();
  } else {
    await enterUnlocked();
    if (ready()) maybePromptPinSetup();
  }
  setInterval(periodicStatus, 20000);
  refreshServer();
  setInterval(refreshServer, 30000);
  window.addEventListener("online", () => { updateChrome(); if (ready() && !S.status.locked) refreshLibrary(false); });
  window.addEventListener("offline", updateChrome);
}

async function applyPendingVault() {
  if (!pendingVault) return;
  const target = pendingVault;
  pendingVault = null;
  const current = S.status && S.status.vault;
  if (current && String(current.id) === target.id) return;
  setStatus(`Opening ${target.title}…`);
  try {
    const data = await api("/api/vaults/switch", {
      method: "POST",
      body: { id: target.id }
    });
    S.status = {
      ...(S.status || {}),
      vault: data.vault || null,
      vaults: data.vaults || []
    };
    S.vaults = data.vaults || [];
    S.syncFinalHandled = null;
    resetVaultView();
    updateChrome();
    toast(`Now using ${target.title}.`, "success", 4000);
    waitForVaultSync();
  } catch (error) {
    toast(error.message, "error");
  }
}

async function enterUnlocked() {
  if (ready()) {
    hideLogin();
    refreshServer();
    await applyPendingVault();
    await refreshLibrary(true);
    resetHistory();
    if (S.status.sync && S.status.sync.running) pollSync();
    if (!S.status.sync || !S.status.sync.running) {
      if ((S.nav.stats.count || 0) === 0) {
        setTimeout(() => startSync(true), 500);
      }
    }
    fetchTransfers(true);
  } else {
    renderLogin();
    showLogin();
  }
}

async function periodicStatus() {
  try {
    S.status = await api("/api/status");
    updateChrome();
    if (S.status.locked) {
      if ($("lockOverlay").hidden) showLock();
      return;
    }
    if (!ready()) {
      if ($("loginOverlay").hidden) {
        renderLogin();
        showLogin();
      } else if (!S.authStage && S.renderedStage !== loginStage()) {
        // Only swap stages on real changes; never wipe a half-typed form.
        renderLogin();
      }
    } else if (S.loginForced === false) {
      hideLogin();
    }
    if (S.status.sync && S.status.sync.running && !S.syncTimer) pollSync();
    if (!S.server && ready() && !S.status.locked) refreshServer();
  } catch (_) {
    /* transient; next tick retries */
  }
}

/* --------------------------------------------------------------- chrome */
function updateChrome() {
  const st = S.status;
  const dot = $("connDot");
  const text = $("connText");
  const chip = $("vaultChip");
  dot.className = "conn-dot";
  if (!navigator.onLine) {
    dot.classList.add("bad");
    text.textContent = "No internet";
  } else if (!st) {
    dot.classList.add("bad");
    text.textContent = "Offline";
  } else if (st.state === "error" && !st.authorized) {
    dot.classList.add("bad");
    text.textContent = "Connection problem";
  } else if (!st.has_api && !st.quick_api) {
    dot.classList.add("warn");
    text.textContent = "Setup needed";
  } else if (!st.authorized) {
    dot.classList.add("warn");
    text.textContent = "Sign-in needed";
  } else if (!st.vault) {
    dot.classList.add("warn");
    text.textContent = "Choose a channel";
  } else {
    dot.classList.add("ok");
    text.textContent = st.sync && st.sync.running ? "Syncing…" : "Connected";
  }
  if (st && Array.isArray(st.vaults)) S.vaults = st.vaults;
  if (st && st.vault) {
    $("vaultWrap").hidden = false;
    $("vaultChipIcon").textContent = vaultIcon(st.vault);
    $("vaultChipText").textContent = st.vault.title || String(st.vault.id);
    chip.title = `Storage vault: ${st.vault.title || st.vault.id} — click to switch`;
    chip.disabled = Boolean(S.vaultBusy) || !st.authorized;
    if (S.vaultMenuOpen) renderVaultMenu();
  } else {
    $("vaultWrap").hidden = true;
    if (S.vaultMenuOpen) closeVaultMenu();
  }
  if (S.vaultMenuOpen && (!st || st.locked || !st.authorized)) closeVaultMenu();
  const lockBtn = $("lockBtn");
  lockBtn.hidden = !(st && st.pin_set);
  lockBtn.title = st && st.locked ? "Locked" : "Lock the app";
  const isReady = ready() && !(st && st.locked);
  $("syncBtn").disabled = !isReady || (st && st.sync && st.sync.running);
  $("cacheBtn").disabled = !isReady;
  $("uploadBtn").disabled = !isReady;
  $("uploadCaret").disabled = !isReady;
  $("uploadFilesOption").disabled = !isReady;
  $("uploadFolderOption").disabled = !isReady;
  $("filterBtn").disabled = !isReady;
  if (!isReady) $("uploadMenu").hidden = true;
  if (st && st.sync && st.sync.running) $("syncBtn").classList.add("spinning");
  else $("syncBtn").classList.remove("spinning");
  document.title = st && st.vault && st.vault.title
    ? `${st.vault.title} — Telegram File Explorer`
    : "Telegram File Explorer";
  updateServerChip();
}

/* ---------------------------------------------------------- server status */
const SERVER_LABELS = {
  online: "Server online",
  stale: "Server delayed",
  offline: "Server offline",
  none: "Server silent",
  unknown: "Server unknown"
};

function formatAge(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  if (value < 60) return `${value}s ago`;
  if (value < 3600) return `${Math.round(value / 60)}m ago`;
  if (value < 86400) return `${Math.round(value / 3600)}h ago`;
  return `${Math.round(value / 86400)}d ago`;
}

function formatUptime(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  if (value < 3600) return plural(Math.max(1, Math.round(value / 60)), "minute");
  if (value < 86400) return plural(Math.round(value / 3600), "hour");
  return plural(Math.round(value / 86400), "day");
}

async function refreshServer() {
  if (!ready() || (S.status && S.status.locked)) {
    S.server = null;
    updateServerChip();
    return;
  }
  try {
    S.server = await api("/api/server");
  } catch (_) {
    /* transient; the next tick retries */
  }
  updateServerChip();
}

function updateServerChip() {
  const chip = $("serverChip");
  if (!chip) return;
  const visible = Boolean(ready() && S.status && !S.status.locked);
  chip.hidden = !visible;
  if (!visible) return;
  if (!S.server) {
    chip.className = "server-chip unknown";
    $("serverText").textContent = "Checking server…";
    chip.title = "Checking the storage bot on your server";
    return;
  }
  const server = S.server;
  const state = server.state || "unknown";
  chip.className = `server-chip ${state}`;
  const label = SERVER_LABELS[state] || SERVER_LABELS.unknown;
  $("serverText").textContent = label;
  if (typeof server.age === "number") {
    chip.title = `${label} — last heartbeat ${formatAge(server.age)}`;
  } else {
    chip.title = server.reason ? `${label} — ${server.reason}` : label;
  }
}

function showServerDetails() {
  const server = S.server || {};
  const state = server.state || "unknown";
  const content = h("div", { class: "settings-section" },
    h("h3", { text: "Always-on server" }),
    h("div", { class: "settings-row" }, h("span", { text: "Status" }), h("span", { class: "value", text: SERVER_LABELS[state] || SERVER_LABELS.unknown }))
  );
  if (typeof server.age === "number") {
    content.append(
      h("div", { class: "settings-row" },
        h("span", { text: "Last heartbeat" }),
        h("span", { class: "value", text: `${formatAge(server.age)} · ${fmtDate(new Date(server.ts * 1000).toISOString())}` })
      )
    );
  } else if (server.reason) {
    content.append(
      h("div", { class: "settings-row" }, h("span", { text: "Detail" }), h("span", { class: "value", text: server.reason }))
    );
  }
  if (server.version) {
    content.append(h("div", { class: "settings-row" }, h("span", { text: "Bot version" }), h("span", { class: "value", text: server.version })));
  }
  if (server.files) {
    content.append(h("div", { class: "settings-row" }, h("span", { text: "Files indexed on the server" }), h("span", { class: "value", text: String(server.files) })));
  }
  if (server.uptime) {
    content.append(h("div", { class: "settings-row" }, h("span", { text: "Server bot uptime" }), h("span", { class: "value", text: formatUptime(server.uptime) })));
  }
  content.append(
    h("p", { class: "modal-note", text: state === "online"
      ? "The bot answered within the last few minutes, so /commands and file links work from any device."
      : "The Explorer keeps working — files and vaults live in Telegram. If this stays red, the server bot is down or restarting." })
  );
  openModal({
    title: "Server bot",
    subtitle: "The storage bot runs on your always-on server. Explorer never starts or stops it.",
    content,
    actions: [
      { label: "Refresh", onClick: async () => { S.server = null; await refreshServer(); showServerDetails(); } },
      { label: "Close", onClick: closeModal }
    ]
  });
}

/* ---------------------------------------------------------------- vaults */
const VAULT_ICONS = [
  "🗄️", "📦", "🗃️", "💾", "🎞️",
  "📚", "🔐", "🚀", "🌙", "🔥",
  "💎", "🧊", "🌊", "🍀", "⚡",
  "🎬", "🖼️", "📀", "🧰", "🧿"
];
function vaultIcon(vault) {
  return (vault && vault.icon) || "🗄️";
}
function vaultBusyReason() {
  const st = S.status || {};
  if (st.sync && st.sync.running) {
    return "Wait for the current sync to finish before switching vaults.";
  }
  if (S.localUpload) {
    return "Wait for the current upload to finish before switching vaults.";
  }
  if (S.transfers.some((transfer) => transferActive(transfer.state) || transfer.busy)) {
    return "Wait for the current uploads and downloads to finish before switching vaults.";
  }
  return "";
}

function toggleVaultMenu() {
  if (S.vaultMenuOpen) {
    closeVaultMenu();
    return;
  }
  if (!S.status || !S.status.authorized) return;
  S.vaultMenuOpen = true;
  $("vaultMenu").hidden = false;
  $("vaultChip").setAttribute("aria-expanded", "true");
  renderVaultMenu();
  if (!S.vaults.length) loadVaults(false);
}

function closeVaultMenu() {
  S.vaultMenuOpen = false;
  $("vaultMenu").hidden = true;
  $("vaultChip").setAttribute("aria-expanded", "false");
}

function renderVaultMenu() {
  if (!S.vaultMenuOpen) return;
  const busy = vaultBusyReason();
  const rows = [];
  if (S.vaultRefreshBusy && !S.vaults.length) {
    rows.push(h("div", { class: "vault-loading" },
      h("span", { class: "spinner-small" }),
      "Scanning Telegram…"
    ));
  }
  for (const vault of S.vaults) {
    const active = Boolean(vault.active);
    const isDefault = Boolean(vault.default);
    const sub = [
      isDefault ? "Opens by default" : "",
      vault.username ? `@${vault.username}` : "Private channel"
    ].filter(Boolean).join(" · ");
    const row = h("button", {
      class: "vault-item" + (active ? " active" : ""),
      type: "button",
      role: "menuitem",
      disabled: active || Boolean(busy) || S.vaultBusy,
      title: active ? "This vault is open" : (busy || `Switch to ${vault.title || vault.id}`)
    },
      h("span", { class: "vault-item-mark", text: vaultIcon(vault) }),
      h("span", { class: "vault-item-text" },
        h("span", { class: "vault-item-title", text: vault.title || String(vault.id) }),
        h("span", { class: "vault-item-sub", text: sub })
      ),
      active ? h("span", { class: "vault-item-check", html: svgRaw("check") }) : null
    );
    row.addEventListener("click", () => switchVault(vault));
    const star = h("button", {
      class: "vault-edit" + (isDefault ? " is-default" : ""),
      type: "button",
      title: isDefault
        ? `${vault.title || vault.id} opens by default — click to open the last used vault instead`
        : `Open ${vault.title || vault.id} by default on launch`,
      disabled: S.vaultBusy || !(S.status && S.status.authorized),
      html: svgRaw(isDefault ? "starFilled" : "star")
    });
    star.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleDefaultVault(vault);
    });
    const edit = h("button", {
      class: "vault-edit",
      type: "button",
      title: `Rename ${vault.title || vault.id} or change its icon`,
      disabled: S.vaultBusy || !(S.status && S.status.authorized),
      html: svgRaw("edit")
    });
    edit.addEventListener("click", (event) => {
      event.stopPropagation();
      promptEditVault(vault);
    });
    rows.push(h("div", { class: "vault-row" }, row, star, edit));
  }
  if (!rows.length) {
    rows.push(h("div", { class: "vault-empty", text: "No vaults found yet." }));
  }
  $("vaultList").replaceChildren(...rows);
  const note = $("vaultMenuNote");
  if (busy) {
    note.hidden = false;
    note.textContent = busy;
  } else if (S.vaultRefreshBusy) {
    note.hidden = false;
    note.textContent = "Scanning Telegram for storage vaults…";
  } else {
    note.hidden = true;
  }
  $("vaultNewBtn").disabled = Boolean(busy) || S.vaultBusy || !(S.status && S.status.authorized);
  $("vaultBotBtn").disabled = Boolean(busy) || S.vaultBusy || !(S.status && S.status.authorized);
  $("vaultRefreshBtn").disabled = S.vaultRefreshBusy || S.vaultBusy;
}

async function loadVaults(refresh) {
  if (!S.status || !S.status.authorized || S.vaultRefreshBusy || S.vaultBusy) return;
  S.vaultRefreshBusy = true;
  $("vaultRefreshBtn").classList.add("spinning");
  renderVaultMenu();
  try {
    const data = await api(`/api/vaults${refresh ? "?refresh=1" : ""}`);
    S.vaults = data.vaults || [];
    if (data.vault) {
      S.status = { ...S.status, vault: data.vault, vaults: S.vaults };
    }
    updateChrome();
  } catch (error) {
    toast(error.message, "error");
  } finally {
    S.vaultRefreshBusy = false;
    $("vaultRefreshBtn").classList.remove("spinning");
    renderVaultMenu();
  }
}

function resetVaultView() {
  closeViewer();
  S.selection.clear();
  S.selectionAnchor = null;
  S.selectedId = null;
  S.selectedFolderPath = null;
  S.navMode = "all";
  S.folder = "";
  S.tag = "";
  S.kind = "";
  S.collection = null;
  S.watching = false;
  S.q = "";
  S.favorite = false;
  S.hiddenOnly = false;
  S.starId = null;
  S.starInfo = null;
  S.stars = [];
  S.starTotal = 0;
  S.filters = newFilterState();
  S.items = [];
  S.total = 0;
  S.totalSize = 0;
  $("searchInput").value = "";
  $("kindSelect").value = "";
  resetHistory();
  updateFilterBadge();
  renderSidebar();
  renderSelection();
  renderPreview();
  renderItems();
}

async function afterVaultChanged(data, label, created) {
  S.status = {
    ...(S.status || {}),
    vault: data.vault || null,
    vaults: data.vaults || []
  };
  S.vaults = data.vaults || [];
  S.syncFinalHandled = null;
  resetVaultView();
  updateChrome();
  setStatus(created ? `Vault “${label}” created` : `Switched to ${label}`);
  await refreshLibrary(true);
  waitForVaultSync();
}

async function waitForVaultSync() {
  if (S.syncTimer) return;
  // The server starts the sync right after the switch; wait until the task is
  // visibly running so the normal progress poll does not report a false finish.
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const data = await api("/api/sync");
      if (data.sync && data.sync.running) {
        pollSync();
        return;
      }
    } catch (_) {
      /* one more try */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function switchVault(vault) {
  if (!vault || vault.active || S.vaultBusy) return;
  const busy = vaultBusyReason();
  if (busy) {
    toast(busy, "info");
    return;
  }
  closeVaultMenu();
  S.vaultBusy = true;
  updateChrome();
  setStatus(`Switching to ${vault.title || vault.id}…`);
  try {
    const data = await api("/api/vaults/switch", {
      method: "POST",
      body: { id: vault.id }
    });
    await afterVaultChanged(data, vault.title || vault.id, false);
    toast(`Now using ${vault.title || vault.id}.`, "success", 4000);
  } catch (error) {
    toast(error.message, "error");
  } finally {
    S.vaultBusy = false;
    updateChrome();
  }
}

async function toggleDefaultVault(vault) {
  if (!vault || S.vaultBusy) return;
  const makingDefault = !vault.default;
  S.vaultBusy = true;
  renderVaultMenu();
  try {
    const data = await api("/api/vaults/default", {
      method: "POST",
      body: { id: makingDefault ? vault.id : "" }
    });
    S.vaults = data.vaults || [];
    S.status = { ...S.status, vault: data.vault || S.status.vault, vaults: S.vaults };
    updateChrome();
    toast(
      makingDefault
        ? `${vault.title || vault.id} opens by default.`
        : "The last used vault opens on launch.",
      "success",
      4000
    );
  } catch (error) {
    toast(error.message, "error");
  } finally {
    S.vaultBusy = false;
    updateChrome();
    renderVaultMenu();
  }
}

async function addStorageBot() {
  if (S.vaultBusy || !S.status || !S.status.authorized) return;
  const vault = S.status.vault || {};
  closeVaultMenu();
  S.vaultBusy = true;
  updateChrome();
  setStatus("Adding the storage bot…");
  try {
    const data = await api("/api/vaults/bot", {
      method: "POST",
      body: { id: vault.id ? String(vault.id) : "" }
    });
    if (data.added) {
      toast(`Storage bot @${data.username} is now an admin of this vault.`, "success", 5000);
    } else {
      toast(
        data.message || "The storage bot could not be added.",
        data.reason === "no_bot" ? "info" : "error",
        7000
      );
    }
  } catch (error) {
    toast(error.message, "error");
  } finally {
    S.vaultBusy = false;
    updateChrome();
  }
}

function promptNewVault() {
  closeVaultMenu();
  const busy = vaultBusyReason();
  if (busy) {
    toast(busy, "info");
    return;
  }
  const input = inputEl({
    type: "text",
    placeholder: "e.g. Work files",
    maxlength: "128",
    autocomplete: "off"
  });
  openModal({
    title: "New storage vault",
    subtitle: "A private Telegram channel, created for you.",
    content: field(
      "Vault name",
      input,
      "The channel is created in Telegram automatically, the storage bot is added "
        + "as an admin, and it becomes the active vault. New uploads go there; your "
        + "other vaults stay untouched."
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Create vault",
        class: "primary",
        onClick: async () => {
          const name = input.value.trim();
          if (!name) {
            input.focus();
            return;
          }
          S.vaultBusy = true;
          updateChrome();
          try {
            const data = await api("/api/vaults/create", {
              method: "POST",
              body: { name }
            });
            closeModal();
            const title = (data.vault && data.vault.title) || name;
            const bot = data.bot || {};
            await afterVaultChanged(data, title, true);
            if (bot.added) {
              toast(`Vault “${title}” created — storage bot added as admin.`, "success", 5500);
            } else if (bot.reason === "error") {
              toast(
                `Vault “${title}” created, but the storage bot could not be added: ${bot.message}`,
                "error",
                8000
              );
            } else {
              toast(
                `Vault “${title}” created. No storage bot was found to add — use “Add storage bot” once in a vault where it is an admin.`,
                "info",
                9000
              );
            }
          } catch (error) {
            toast(error.message, "error");
            input.focus();
          } finally {
            S.vaultBusy = false;
            updateChrome();
          }
        }
      }
    ]
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const create = $("modalActions").querySelector(".primary");
    if (create && !create.disabled) create.click();
  });
  input.focus();
}

function promptEditVault(vault) {
  closeVaultMenu();
  const currentTitle = vault.title || String(vault.id);
  const input = inputEl({
    type: "text",
    value: currentTitle,
    maxlength: "128",
    autocomplete: "off"
  });
  let chosen = vaultIcon(vault);
  const buttons = [];
  const select = (value) => {
    chosen = value;
    for (const button of buttons) {
      button.classList.toggle("selected", button.dataset.icon === value);
    }
  };
  const grid = h("div", { class: "vault-icon-grid" });
  for (const value of VAULT_ICONS) {
    const button = h("button", {
      class: "vault-icon-option",
      type: "button",
      title: `Use ${value}`,
      "data-icon": value,
      text: value
    });
    button.addEventListener("click", () => select(value));
    buttons.push(button);
    grid.append(button);
  }
  select(chosen);
  const shuffle = h("button", { class: "btn vault-icon-shuffle", type: "button", text: "Shuffle" });
  shuffle.addEventListener("click", () => {
    const options = VAULT_ICONS.filter((value) => value !== chosen);
    select(options[Math.floor(Math.random() * options.length)]);
  });
  const content = h("div", {},
    field(
      "Vault name",
      input,
      "The Telegram channel title changes too, so the name is the same everywhere."
    ),
    h("div", { class: "field" },
      h("label", { text: "Icon" }),
      h("div", { class: "vault-icon-field" }, grid, shuffle),
      h("div", { class: "hint", text: "Pick an icon that tells this vault apart in the switcher. Shuffle picks a random one." })
    )
  );
  openModal({
    title: "Edit vault",
    subtitle: currentTitle,
    content,
    wide: true,
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Save",
        class: "primary",
        onClick: async () => {
          const name = input.value.trim();
          if (!name) {
            toast("A vault needs a name.", "error");
            input.focus();
            return;
          }
          const renamed = name !== currentTitle;
          const recoloured = chosen !== vaultIcon(vault);
          if (!renamed && !recoloured) {
            closeModal();
            return;
          }
          try {
            let data = null;
            if (renamed) {
              data = await api("/api/vaults/rename", {
                method: "POST",
                body: { id: String(vault.id), title: name }
              });
            }
            if (recoloured) {
              data = await api("/api/vaults/icon", {
                method: "POST",
                body: { id: String(vault.id), icon: chosen }
              });
            }
            closeModal();
            applyVaultUpdate(data);
            toast(renamed ? `Renamed to “${name}”.` : "Vault icon updated.", "success");
          } catch (error) {
            toast(error.message, "error", 7000);
            input.focus();
          }
        }
      }
    ]
  });
  input.focus();
  input.setSelectionRange(0, input.value.length);
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const save = $("modalActions").querySelector(".primary");
    if (save && !save.disabled) save.click();
  });
}

function applyVaultUpdate(data) {
  if (!data) return;
  if (Array.isArray(data.vaults)) S.vaults = data.vaults;
  if (data.vault) {
    S.status = { ...S.status, vault: data.vault, vaults: S.vaults };
  } else if (Array.isArray(data.vaults)) {
    S.status = { ...S.status, vaults: S.vaults };
  }
  updateChrome();
}

/* ----------------------------------------------------------------- app lock */
let pinBuffer = "";
let recoveryTimer = null;
let pendingVault = null;

function restoreLockView() {
  clearInterval(recoveryTimer);
  recoveryTimer = null;
  pinBuffer = "";
  renderLockDots();
  $("lockTitle").textContent = "Enter your PIN";
  $("lockSub").textContent = "Telegram File Explorer is locked";
  $("lockDots").hidden = false;
  $("lockPad").hidden = false;
  $("lockForgot").hidden = false;
  $("lockError").hidden = true;
  $("lockRecover").hidden = true;
  $("lockVaults").hidden = true;
  $("lockVaultBtn").hidden = false;
  $("recoverError").hidden = true;
  $("recoverStatus").hidden = true;
  $("recoverForm").hidden = true;
  $("recoverCode").value = "";
  $("recoverPin").value = "";
  $("recoverPin2").value = "";
  const send = $("recoverSend");
  send.disabled = false;
  send.textContent = "Send code to Telegram";
  renderLockVault();
}

function showLock() {
  restoreLockView();
  $("lockOverlay").hidden = false;
  hideLogin();
  closeModal();
}

function hideLock() {
  $("lockOverlay").hidden = true;
  clearInterval(recoveryTimer);
  recoveryTimer = null;
}

function backToPin() {
  pinBuffer = "";
  renderLockDots();
  $("lockTitle").textContent = "Enter your PIN";
  $("lockSub").textContent = "Telegram File Explorer is locked";
  $("lockDots").hidden = false;
  $("lockPad").hidden = false;
  $("lockForgot").hidden = false;
  $("lockVaultBtn").hidden = false;
  $("lockError").hidden = true;
  $("lockRecover").hidden = true;
  $("lockVaults").hidden = true;
  renderLockVault();
}

function lockVaultEntries() {
  const st = S.status || {};
  const entries = (st.vaults || []).map((vault) => ({
    id: String(vault.id),
    title: vault.title || String(vault.id),
    icon: vaultIcon(vault)
  }));
  const current = st.vault;
  if (current && !entries.some((entry) => entry.id === String(current.id))) {
    entries.unshift({
      id: String(current.id),
      title: current.title || String(current.id),
      icon: vaultIcon(current)
    });
  }
  return entries;
}

function renderLockVault() {
  const st = S.status || {};
  const current = st.vault
    ? { id: String(st.vault.id), title: st.vault.title || String(st.vault.id), icon: vaultIcon(st.vault) }
    : null;
  const chosen = pendingVault || current;
  $("lockVaultName").textContent = chosen ? `${chosen.icon ? chosen.icon + " " : ""}${chosen.title}` : "Choose storage";
  const note = $("lockVaultNote");
  if (!chosen) {
    note.textContent = "No storage vault found yet. Enter your PIN first to scan Telegram.";
    note.hidden = false;
  } else if (pendingVault && (!current || current.id !== pendingVault.id)) {
    note.textContent = "This vault opens as soon as you enter your PIN.";
    note.hidden = false;
  } else {
    note.hidden = true;
  }
}

function renderLockVaultList() {
  const st = S.status || {};
  const currentId = st.vault ? String(st.vault.id) : "";
  const chosenId = pendingVault ? pendingVault.id : currentId;
  const entries = lockVaultEntries();
  const list = $("lockVaultList");
  list.replaceChildren();
  if (!entries.length) {
    list.append(h("p", { class: "lock-sub", text: "No storage vaults found." }));
    return;
  }
  for (const entry of entries) {
    const chosen = entry.id === chosenId;
    const row = h("button", {
      class: "lock-vault-row" + (chosen ? " chosen" : ""),
      type: "button",
      title: chosen ? "This vault will open" : `Open ${entry.title} after the PIN`
    },
      h("span", { class: "lock-vault-row-mark", text: vaultIcon(entry) }),
      h("span", { class: "lock-vault-row-name", text: entry.title }),
      h("span", { class: "lock-vault-row-check", html: chosen ? svgRaw("check") : "" })
    );
    row.addEventListener("click", () => chooseLockVault(entry));
    list.append(row);
  }
}

function chooseLockVault(entry) {
  const current = S.status && S.status.vault;
  pendingVault = current && String(current.id) === entry.id ? null : entry;
  backToPin();
}

async function showLockVaults() {
  pinBuffer = "";
  renderLockDots();
  $("lockDots").hidden = true;
  $("lockPad").hidden = true;
  $("lockForgot").hidden = true;
  $("lockVaultBtn").hidden = true;
  $("lockVaultNote").hidden = true;
  $("lockError").hidden = true;
  $("lockRecover").hidden = true;
  $("lockTitle").textContent = "Choose storage";
  $("lockSub").textContent = "The vault you pick opens after your PIN";
  $("lockVaults").hidden = false;
  renderLockVaultList();
  try {
    S.status = await api("/api/status");
    updateChrome();
    renderLockVaultList();
  } catch (_) {
    /* keep the list from the last known status */
  }
}

function showRecovery() {
  pinBuffer = "";
  renderLockDots();
  $("lockDots").hidden = true;
  $("lockPad").hidden = true;
  $("lockForgot").hidden = true;
  $("lockVaultBtn").hidden = true;
  $("lockVaultNote").hidden = true;
  $("lockVaults").hidden = true;
  $("lockError").hidden = true;
  $("lockTitle").textContent = "Forgot your PIN?";
  $("lockSub").textContent = "Reset it with a code from Telegram";
  $("lockRecover").hidden = false;
  const st = S.status || {};
  if (st.pin_recovery === false) {
    $("recoverSend").disabled = true;
    showRecoverError("Telegram is not signed in on this PC, so a code cannot be sent.");
  } else if ($("recoverForm").hidden) {
    $("recoverSend").disabled = false;
    $("recoverError").hidden = true;
  } else {
    $("recoverCode").focus();
  }
}

function showRecoverError(message) {
  const box = $("recoverError");
  box.textContent = message;
  box.hidden = false;
}

function digitsOnly(input, max) {
  const cleaned = input.value.replace(/\D/g, "").slice(0, max);
  if (cleaned !== input.value) input.value = cleaned;
}

async function sendRecoveryCode() {
  const send = $("recoverSend");
  if (send.disabled) return;
  $("recoverError").hidden = true;
  $("recoverStatus").hidden = true;
  send.disabled = true;
  send.textContent = "Sending…";
  try {
    const result = await api("/api/pin/recover", { method: "POST" });
    $("recoverForm").hidden = false;
    $("recoverCode").value = "";
    $("recoverPin").value = "";
    $("recoverPin2").value = "";
    const status = $("recoverStatus");
    status.textContent = "Code sent to Saved Messages in Telegram. Check your phone, then set a new PIN below.";
    status.hidden = false;
    $("recoverCode").focus();
    startRecoveryCooldown(result.retry_after || 60);
  } catch (error) {
    send.disabled = false;
    send.textContent = "Send code to Telegram";
    showRecoverError(error.message || "Could not send the code.");
  }
}

function startRecoveryCooldown(seconds) {
  const send = $("recoverSend");
  let left = Math.max(1, Number(seconds) || 60);
  clearInterval(recoveryTimer);
  const tick = () => {
    if (left <= 0) {
      clearInterval(recoveryTimer);
      recoveryTimer = null;
      send.disabled = false;
      send.textContent = "Send another code";
      return;
    }
    send.disabled = true;
    send.textContent = `Send again in ${left}s`;
    left -= 1;
  };
  tick();
  recoveryTimer = setInterval(tick, 1000);
}

async function applyRecovery() {
  const code = $("recoverCode").value.trim();
  const pin = $("recoverPin").value;
  const again = $("recoverPin2").value;
  if (!/^\d{6}$/.test(code)) {
    showRecoverError("Enter the 6-digit code from Telegram.");
    $("recoverCode").focus();
    return;
  }
  if (!/^\d{4}$/.test(pin)) {
    showRecoverError("The new PIN must be exactly 4 digits.");
    $("recoverPin").focus();
    return;
  }
  if (pin !== again) {
    showRecoverError("The new PINs do not match.");
    $("recoverPin2").focus();
    return;
  }
  const button = $("recoverApply");
  button.disabled = true;
  button.textContent = "Saving…";
  try {
    await api("/api/pin/reset", { method: "POST", body: { code, pin } });
    if (S.status) {
      S.status.pin_set = true;
      S.status.locked = false;
      S.status.pin_recovery = true;
    }
    restoreLockView();
    hideLock();
    updateChrome();
    toast("PIN reset. The app is unlocked.", "success", 5000);
    await enterUnlocked();
  } catch (error) {
    showRecoverError(error.message || "Could not reset the PIN.");
    $("recoverCode").value = "";
    $("recoverCode").focus();
  } finally {
    button.disabled = false;
    button.textContent = "Set new PIN";
  }
}

function renderLockDots() {
  const dots = $("lockDots").children;
  for (let index = 0; index < dots.length; index += 1) {
    dots[index].classList.toggle("filled", index < pinBuffer.length);
  }
}

function buildLockPad() {
  const pad = $("lockPad");
  pad.replaceChildren();
  for (const key of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"]) {
    const button = h("button", { class: "lock-key", type: "button" });
    if (key === "clear") {
      button.classList.add("utility");
      button.textContent = "C";
      button.title = "Clear";
    } else if (key === "back") {
      button.classList.add("utility");
      button.innerHTML = svgRaw("backspace");
      button.title = "Backspace";
      button.setAttribute("aria-label", "Backspace");
    } else {
      button.textContent = key;
    }
    button.addEventListener("click", () => pressLockKey(key));
    pad.append(button);
  }
}

function pressLockKey(key) {
  if ($("lockOverlay").hidden) return;
  if (key === "clear") pinBuffer = "";
  else if (key === "back") pinBuffer = pinBuffer.slice(0, -1);
  else if (pinBuffer.length < 4) pinBuffer += key;
  renderLockDots();
  $("lockError").hidden = true;
  if (pinBuffer.length === 4) setTimeout(submitPin, 120);
}

async function submitPin() {
  if (pinBuffer.length !== 4 || $("lockOverlay").hidden) return;
  const pin = pinBuffer;
  try {
    await api("/api/unlock", { method: "POST", body: { pin } });
    pinBuffer = "";
    renderLockDots();
    S.status.locked = false;
    hideLock();
    updateChrome();
    await enterUnlocked();
  } catch (error) {
    pinBuffer = "";
    renderLockDots();
    const box = $("lockError");
    box.textContent = error.message || "Wrong PIN.";
    box.hidden = false;
    const card = $("lockCard");
    card.classList.remove("shake");
    void card.offsetWidth;
    card.classList.add("shake");
  }
}

async function lockNow() {
  const st = S.status || {};
  if (!st.pin_set) {
    promptPinSetup();
    return;
  }
  try {
    await api("/api/lock", { method: "POST" });
    S.status.locked = true;
    showLock();
  } catch (error) {
    toast(error.message, "error");
  }
}

async function clearCache() {
  const button = $("cacheBtn");
  if (button.disabled) return;
  button.disabled = true;
  setIcon(button, "refresh");
  button.classList.add("spinning");
  try {
    const result = await api("/api/cache/clear", { method: "POST" });
    if (!result || !result.removed) {
      toast("Nothing to clear — the cache is already empty.", "success");
    } else {
      toast(`Cleared ${fmtSize(result.freed)} of temporary files.`, "success");
      if (result.skipped) {
        toast(`${result.skipped} file(s) are in use and were left alone.`, "info");
      }
    }
  } catch (error) {
    toast(error.message || "Could not clear the cache.", "error");
  } finally {
    button.classList.remove("spinning");
    setIcon(button, "trash");
    button.disabled = false;
  }
}

function pinInput(placeholder) {
  const input = inputEl({ type: "password", inputmode: "numeric", maxlength: "4", autocomplete: "new-password", placeholder: placeholder || "4 digits" });
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 4);
  });
  return input;
}

function pinValuesMatch(pin, again) {
  if (!/^\d{4}$/.test(pin.value)) { toast("The PIN must be exactly 4 digits.", "error"); return false; }
  if (pin.value !== again.value) { toast("The PINs do not match.", "error"); return false; }
  return true;
}

function promptPinSetup() {
  const pin = pinInput();
  const again = pinInput("Repeat");
  openModal({
    title: "Create a 4-digit PIN",
    content: h("div", {},
      h("p", { text: "Lock this app with a 4-digit PIN. You will enter it every time the app opens." }),
      field("PIN", pin),
      field("Repeat PIN", again),
      h("p", { class: "modal-note", text: "Only a hash of the PIN is stored. If you forget it, choose Forgot PIN? on the lock screen to reset it with a code sent to Saved Messages in Telegram." })
    ),
    actions: [
      {
        label: "Skip for now",
        onClick: async () => {
          try { await api("/api/pin/skip", { method: "POST" }); } catch (_) { /* non-fatal */ }
          if (S.status) S.status.pin_skipped = true;
          closeModal();
        }
      },
      {
        label: "Set PIN",
        class: "primary",
        onClick: async () => {
          if (!pinValuesMatch(pin, again)) return;
          try {
            await api("/api/pin/set", { method: "POST", body: { pin: pin.value } });
            if (S.status) { S.status.pin_set = true; S.status.pin_skipped = false; }
            updateChrome();
            toast("PIN set. The app will lock on the next launch.", "success", 6000);
            closeModal();
          } catch (error) {
            toast(error.message, "error");
          }
        }
      }
    ]
  });
}

function promptPinChange() {
  const pin = pinInput();
  const again = pinInput("Repeat");
  openModal({
    title: "Change PIN",
    content: h("div", {},
      field("New PIN", pin),
      field("Repeat new PIN", again)
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Change PIN",
        class: "primary",
        onClick: async () => {
          if (!pinValuesMatch(pin, again)) return;
          try {
            await api("/api/pin/set", { method: "POST", body: { pin: pin.value } });
            toast("PIN changed.", "success");
            closeModal();
          } catch (error) {
            toast(error.message, "error");
          }
        }
      }
    ]
  });
}

function promptPinRemove() {
  const pin = pinInput("Current PIN");
  openModal({
    title: "Remove PIN?",
    content: h("div", {},
      field("Current PIN", pin),
      h("p", { class: "modal-note", text: "The app will open without a lock again." })
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Remove PIN",
        class: "danger",
        onClick: async () => {
          try {
            await api("/api/pin/remove", { method: "POST", body: { pin: pin.value } });
            if (S.status) S.status.pin_set = false;
            updateChrome();
            toast("PIN removed.", "success");
            closeModal();
          } catch (error) {
            toast(error.message, "error");
          }
        }
      }
    ]
  });
}

function maybePromptPinSetup() {
  const st = S.status || {};
  if (st.pin_set || st.pin_skipped) return;
  promptPinSetup();
}

/* ---------------------------------------------------------------- login */
function showLogin() {
  $("loginOverlay").hidden = false;
  renderLogin();
}
function hideLogin() {
  $("loginOverlay").hidden = true;
  S.loginForced = false;
  S.renderedStage = "ready";
}
function showLoginFatal(message) {
  S.status = null;
  S.renderedStage = "loading";
  $("loginOverlay").hidden = false;
  $("loginSteps").replaceChildren();
  $("loginContent").replaceChildren(
    h("h2", { text: "The app could not start" }),
    h("p", { class: "login-desc", text: message || "The local server is not responding." }),
    h("div", { class: "login-loading" }, h("div", { class: "spinner" }), "Waiting for the server…")
  );
  $("loginError").hidden = true;
  setTimeout(() => boot(), 2500);
}
function loginStage() {
  const st = S.status;
  if (!st) return "loading";
  if (S.authStage === "setup") return "setup";
  if (S.authStage === "code") return "code";
  if (S.authStage === "password") return "password";
  if (S.authStage === "channel") return "channel";
  if (S.authStage === "error") return "error";
  if (st.state === "error" && !st.authorized) return "error";
  if (!st.has_api && !st.quick_api) return "setup";
  if (!st.authorized) return "login";
  if (!st.vault) return "channel";
  return "ready";
}
function stopQrClient(cancelServer) {
  S.qr.seq += 1;
  S.qr.active = false;
  S.qr.starting = false;
  if (S.qr.timer) {
    clearTimeout(S.qr.timer);
    S.qr.timer = null;
  }
  if (cancelServer) {
    api("/api/login/qr/cancel", { method: "POST" }).catch(() => {});
  }
}
function renderLogin() {
  if (!S.status) return;
  const stage = loginStage();
  S.renderedStage = stage;
  if (stage !== "login" || S.loginMode !== "qr") stopQrClient(true);
  if (stage === "ready") {
    hideLogin();
    return;
  }
  renderLoginSteps(stage);
  $("loginError").hidden = true;
  const content = $("loginContent");
  content.replaceChildren();
  if (stage === "loading") {
    content.append(h("div", { class: "login-loading" }, h("div", { class: "spinner" }), "Connecting to the local app…"));
    return;
  }
  if (stage === "setup") renderSetupStage(content);
  else if (stage === "login" && S.loginMode === "qr") renderQrStage(content);
  else if (stage === "login") renderPhoneStage(content);
  else if (stage === "code") renderCodeStage(content);
  else if (stage === "password") renderPasswordStage(content);
  else if (stage === "channel") renderChannelStage(content);
  else if (stage === "error") renderErrorStage(content);
  $("loginFoot").textContent = stage === "channel"
    ? "Folders and tags live on this PC. Files live in the channel."
    : "Your Telegram login stays on this computer.";
}
function renderLoginSteps(stage) {
  const steps = [
    { id: "account", label: "Telegram account" },
    { id: "channel", label: "Private channel" },
    { id: "library", label: "Library" }
  ];
  let active = 0;
  let done = 0;
  if (stage === "channel") { active = 1; done = 1; }
  else if (stage === "ready") { active = 2; done = 3; }
  else if (stage === "error") { active = 0; done = 0; }
  const nodes = [];
  steps.forEach((step, index) => {
    if (index) nodes.push(h("span", { class: "step-line" }));
    const cls = index < done ? "step done" : index === active ? "step active" : "step";
    nodes.push(h("span", { class: cls }, h("span", { class: "step-dot" }), step.label));
  });
  $("loginSteps").replaceChildren(...nodes);
}
function setLoginError(message) {
  const node = $("loginError");
  node.hidden = !message;
  node.textContent = message || "";
}
function loginButton(label, form) {
  const button = h("button", { class: "btn primary", type: "submit" }, label);
  form.append(h("div", { class: "login-actions" }, button));
  return button;
}
function busyButton(button, busy, label) {
  button.disabled = busy;
  if (busy) button.replaceChildren(h("span", { class: "spinner spinner-small" }), "Working…");
  else button.textContent = label;
}
function switchCreds() {
  S.authStage = "setup";
  setLoginError("");
  renderLogin();
}
function backToQuickLogin() {
  S.authStage = "";
  S.loginMode = "qr";
  S.qr.error = "";
  S.passwordHint = "";
  setLoginError("");
  renderLogin();
}
function loginTabs(active) {
  return h("div", { class: "login-tabs", role: "tablist" },
    [
      { id: "qr", label: "QR code" },
      { id: "phone", label: "Phone code" }
    ].map((tab) => h("button", {
      class: "login-tab" + (active === tab.id ? " active" : ""),
      type: "button",
      role: "tab",
      "aria-selected": active === tab.id ? "true" : "false",
      onClick: () => setLoginMode(tab.id)
    }, tab.label))
  );
}
async function setLoginMode(mode) {
  if (S.loginMode === mode) return;
  const leavingQr = S.loginMode === "qr";
  S.loginMode = mode;
  S.qr.error = "";
  setLoginError("");
  if (leavingQr) {
    stopQrClient(false);
    try { await api("/api/login/qr/cancel", { method: "POST" }); } catch (_) { /* fresh tokens expire on their own */ }
  }
  renderLogin();
}
function credentialsNote() {
  const custom = Boolean(S.status && S.status.has_api);
  return h("div", { class: "login-cred" },
    h("span", {
      class: "login-cred-text",
      title: custom
        ? "These credentials are stored only in your Windows profile."
        : "Uses the public app credentials that ship with Telegram Desktop. Add your own later for long-term reliability."
    }, custom
      ? "Using your own API credentials."
      : "No API setup needed — using Telegram's built-in app credentials."),
    h("button", { class: "link-btn", type: "button", onClick: switchCreds },
      custom ? "Change" : "Use my own")
  );
}
function renderSetupStage(content) {
  content.append(
    h("h2", { text: "Use your own API credentials" }),
    h("p", { class: "login-desc" },
      "Optional. The built-in sign-in already works without my.telegram.org. Your own API app avoids shared-credential limits and is recommended for long-term use."
    )
  );
  const form = h("form", { novalidate: "" });
  const apiId = inputEl({ type: "text", inputmode: "numeric", placeholder: "1234567", autocomplete: "off" });
  const apiHash = inputEl({ type: "password", placeholder: "32-character API hash", autocomplete: "off" });
  form.append(
    field("API ID", apiId),
    field("API hash", apiHash, "Telegram shows both under “API development tools”. They identify the app, not your account."),
    h("details", { class: "login-help" },
      h("summary", { text: "Where do I get these?" }),
      h("ol", {},
        h("li", { text: "Open my.telegram.org/apps and sign in with your phone number." }),
        h("li", { text: "Create an app (any name, platform “Desktop”)." }),
        h("li", { text: "Copy the api_id and api_hash shown there." })
      ),
      h("div", { class: "login-note", text: "If my.telegram.org says “Too many attempts”, stop retrying for a while and try a different network or browser. Built-in sign-in keeps working meanwhile." })
    )
  );
  const submit = loginButton("Save credentials", form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoginError("");
    if (!apiId.value.trim() || !apiHash.value.trim()) {
      setLoginError("Enter both the API ID and the API hash.");
      return;
    }
    busyButton(submit, true);
    try {
      S.qr.error = "";
      S.status = await api("/api/setup", { method: "POST", body: { api_id: apiId.value.trim(), api_hash: apiHash.value.trim() } });
      S.authStage = "";
      updateChrome();
      if (S.status.authorized) afterAuthorized(S.status);
      else { S.loginMode = "qr"; renderLogin(); }
    } catch (error) {
      setLoginError(error.message);
    } finally {
      busyButton(submit, false, "Save credentials");
    }
  });
  const back = h("button", { class: "link-btn", type: "button", text: "Back to built-in sign-in" });
  back.addEventListener("click", backToQuickLogin);
  content.append(form, h("div", { class: "login-note", text: "The API hash is stored only in your Windows profile. It is never sent anywhere except Telegram." }));
  content.append(h("div", { class: "login-help", style: "margin-top:12px" }, back));
}
function qrImageSource(svg) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function updateQrPanel(data) {
  const qr = (data && data.qr) || {};
  if (qr.svg && qr.version !== S.qr.version) {
    S.qr.version = qr.version;
    S.qr.image = qrImageSource(qr.svg);
    const image = $("qrImage");
    if (image) {
      image.src = S.qr.image;
      image.hidden = false;
    }
    const frame = $("qrFrame");
    if (frame) frame.classList.remove("waiting");
  }
  const hint = $("qrHint");
  if (hint && !S.qr.error) {
    hint.className = "qr-hint";
    hint.textContent = S.qr.image
      ? "Waiting for approval. The code refreshes automatically."
      : "Generating a fresh code…";
  }
}
function applyQrPayload(data) {
  if (!data) return "error";
  if (data.status) S.status = data.status;
  if (data.authorized) {
    stopQrClient(false);
    S.authStage = "";
    updateChrome();
    afterAuthorized(S.status);
    return "ready";
  }
  if (data.state === "password") {
    stopQrClient(false);
    S.passwordHint = "QR sign-in approved. Enter your Telegram cloud password to finish.";
    S.authStage = "password";
    setLoginError("");
    updateChrome();
    renderLogin();
    return "password";
  }
  if (data.error) {
    S.qr.error = data.error;
    stopQrClient(false);
    renderLogin();
    return "error";
  }
  updateQrPanel(data);
  return "waiting";
}
function scheduleQrPoll(delay) {
  if (!S.qr.active) return;
  if (S.qr.timer) clearTimeout(S.qr.timer);
  S.qr.timer = setTimeout(pollQr, delay);
}
async function pollQr() {
  S.qr.timer = null;
  if (!S.qr.active || S.loginMode !== "qr" || loginStage() !== "login") return;
  const seq = S.qr.seq;
  try {
    const data = await api("/api/login/qr");
    if (seq !== S.qr.seq || !S.qr.active) return;
    const result = applyQrPayload(data);
    if (result === "waiting") scheduleQrPoll(1600);
  } catch (error) {
    if (seq !== S.qr.seq || !S.qr.active) return;
    const hint = $("qrHint");
    if (hint) {
      hint.className = "qr-hint";
      hint.textContent = `${error.message} Retrying…`;
    }
    scheduleQrPoll(3000);
  }
}
async function startQrLogin() {
  if (S.qr.starting || S.qr.active) return;
  if (S.loginMode !== "qr" || loginStage() !== "login") return;
  const seq = ++S.qr.seq;
  S.qr.starting = true;
  S.qr.error = "";
  S.qr.image = "";
  S.qr.version = 0;
  try {
    const data = await api("/api/login/qr/start", { method: "POST" });
    if (seq !== S.qr.seq) return;
    S.qr.starting = false;
    if (S.loginMode !== "qr" || loginStage() !== "login") {
      stopQrClient(true);
      return;
    }
    const result = applyQrPayload(data);
    if (result === "waiting") {
      S.qr.active = true;
      scheduleQrPoll(1500);
    }
  } catch (error) {
    if (seq !== S.qr.seq) return;
    S.qr.starting = false;
    S.qr.error = error.message;
    renderLogin();
  }
}
async function restartQr() {
  stopQrClient(false);
  S.qr.error = "";
  S.qr.image = "";
  S.qr.version = 0;
  try { await api("/api/login/qr/cancel", { method: "POST" }); } catch (_) { /* old token expires anyway */ }
  if (S.loginMode !== "qr" || loginStage() !== "login") return;
  renderLogin();
}
function renderQrStage(content) {
  content.append(
    h("h2", { text: "Sign in to Telegram" }),
    h("p", { class: "login-desc", text: "Scan this code with Telegram on your phone. No SMS and no API setup." }),
    loginTabs("qr")
  );
  const hasError = Boolean(S.qr.error);
  const image = h("img", {
    class: "qr-image",
    id: "qrImage",
    alt: "Telegram sign-in QR code",
    hidden: hasError || !S.qr.image ? true : null
  });
  if (S.qr.image) image.src = S.qr.image;
  const frame = h("div", {
    class: "qr-frame" + (S.qr.image && !hasError ? "" : " waiting"),
    id: "qrFrame"
  }, image, hasError ? iconNode("alert", "qr-placeholder") : h("div", { class: "spinner" }));
  const hint = h("div", {
    class: "qr-hint" + (hasError ? " error" : ""),
    id: "qrHint",
    text: hasError
      ? S.qr.error
      : (S.qr.image ? "Waiting for approval. The code refreshes automatically." : "Generating a fresh code…")
  });
  const guide = h("div", { class: "qr-guide" },
    h("div", { class: "qr-guide-title", text: hasError ? "Sign-in unavailable" : "On your phone" }),
    hasError ? null : h("ol", { class: "qr-steps" },
      h("li", {}, "Open Telegram."),
      h("li", {}, "Go to Settings → Devices."),
      h("li", {}, "Tap Link Desktop Device, then scan this code.")
    ),
    hint
  );
  const retry = h("button", {
    class: "link-btn",
    type: "button",
    text: hasError ? "Try again" : "New code"
  });
  retry.addEventListener("click", () => { restartQr(); });
  content.append(
    h("div", { class: "qr-layout" }, frame, guide),
    h("div", { class: "qr-actions" }, retry),
    credentialsNote()
  );
  if (!hasError) {
    if (!S.qr.active && !S.qr.starting) startQrLogin();
    else if (S.qr.active && !S.qr.timer) scheduleQrPoll(0);
  }
}
function renderPhoneStage(content) {
  content.append(
    h("h2", { text: "Sign in to Telegram" }),
    h("p", { class: "login-desc", text: "Use the phone number of your Telegram account. Telegram sends the login code inside the app." }),
    loginTabs("phone")
  );
  const form = h("form", { novalidate: "" });
  const phone = inputEl({ type: "tel", placeholder: "+91 98765 43210", autocomplete: "tel", autofocus: "" });
  form.append(field("Phone number", phone, "Include the country code."));
  const submit = loginButton("Send code", form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoginError("");
    if (!phone.value.trim()) { setLoginError("Enter your phone number."); return; }
    busyButton(submit, true);
    try {
      S.passwordHint = "";
      const response = await api("/api/login/send_code", { method: "POST", body: { phone: phone.value.trim() } });
      S.status = response;
      S.lastPhone = response.phone || phone.value.trim();
      S.authStage = response.state === "password" ? "password" : "code";
      updateChrome();
      renderLogin();
    } catch (error) {
      setLoginError(error.message);
    } finally {
      busyButton(submit, false, "Send code");
    }
  });
  content.append(form, credentialsNote());
}
function renderCodeStage(content) {
  content.append(
    h("h2", { text: "Enter the login code" }),
    h("p", { class: "login-desc", text: `Telegram sent a code to ${S.lastPhone || "your Telegram app"}. It usually appears as a service message.` })
  );
  const form = h("form", { novalidate: "" });
  const code = inputEl({ type: "text", inputmode: "numeric", autocomplete: "one-time-code", maxlength: "9", placeholder: "12345", autofocus: "" });
  form.append(field("Code", code));
  const submit = loginButton("Verify", form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoginError("");
    if (!code.value.trim()) { setLoginError("Enter the code Telegram sent you."); return; }
    busyButton(submit, true);
    try {
      const response = await api("/api/login/code", { method: "POST", body: { code: code.value.trim() } });
      S.status = response;
      if (response.state === "password") {
        S.passwordHint = "";
        S.authStage = "password";
        updateChrome();
        renderLogin();
      } else if (response.authorized) {
        S.authStage = "";
        updateChrome();
        afterAuthorized(response);
      } else {
        renderLogin();
      }
    } catch (error) {
      setLoginError(error.message);
    } finally {
      busyButton(submit, false, "Verify");
    }
  });
  const resend = h("button", { class: "link-btn", type: "button", text: "Resend code" });
  resend.addEventListener("click", async () => {
    if (!S.lastPhone) return;
    resend.disabled = true;
    try {
      const response = await api("/api/login/send_code", { method: "POST", body: { phone: S.lastPhone } });
      S.status = response;
      toast("A new code was sent.", "info");
    } catch (error) {
      setLoginError(error.message);
    } finally {
      resend.disabled = false;
    }
  });
  content.append(form,
    h("div", { class: "login-help", style: "margin-top:14px; display:flex; gap:14px" },
      resend,
      h("button", { class: "link-btn", type: "button", onClick: switchCreds }, "Change account")
    )
  );
}
function renderPasswordStage(content) {
  content.append(
    h("h2", { text: "Two-step verification" }),
    h("p", { class: "login-desc", text: S.passwordHint || "This account has a cloud password. Enter it to finish signing in." })
  );
  const form = h("form", { novalidate: "" });
  const password = inputEl({ type: "password", autocomplete: "current-password", placeholder: "Your Telegram password", autofocus: "" });
  form.append(field("Password", password));
  const submit = loginButton("Sign in", form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoginError("");
    if (!password.value) { setLoginError("Enter your password."); return; }
    busyButton(submit, true);
    try {
      const response = await api("/api/login/password", { method: "POST", body: { password: password.value } });
      S.status = response;
      S.authStage = "";
      S.passwordHint = "";
      updateChrome();
      afterAuthorized(response);
    } catch (error) {
      setLoginError(error.message);
    } finally {
      busyButton(submit, false, "Sign in");
    }
  });
  content.append(form, h("div", { class: "login-note", text: "The password is sent directly to Telegram and is never stored." }));
  const back = h("button", { class: "link-btn", type: "button", text: "Use a different sign-in method" });
  back.addEventListener("click", () => {
    S.authStage = "";
    S.passwordHint = "";
    S.qr.error = "";
    setLoginError("");
    renderLogin();
  });
  content.append(h("div", { class: "login-help", style: "margin-top:12px" }, back));
}
function afterAuthorized(response) {
  if (response && response.vault) {
    hideLogin();
    updateChrome();
    refreshLibrary(true).then(() => {
      resetHistory();
      if ((S.nav.stats.count || 0) === 0) startSync(true);
    });
  } else {
    S.authStage = "channel";
    renderLogin();
  }
}
function renderChannelStage(content) {
  const heading = h("h2", { text: S.loginForced ? "Change storage channel" : "Choose your storage channel" });
  content.append(heading,
    h("p", { class: "login-desc", text: "Pick the private channel where this account stores files. If you already use the bot, choose the same channel to bring its file names into the explorer." })
  );
  const search = inputEl({ type: "search", placeholder: "Search channels", autocomplete: "off" });
  const list = h("div", { class: "channel-list", id: "channelList" }, h("div", { class: "login-loading" }, h("div", { class: "spinner" }), "Loading channels…"));
  const manual = inputEl({ type: "text", placeholder: "-1001234567890 or @channel", autocomplete: "off" });
  const save = h("button", { class: "btn primary", type: "button", text: "Use this channel" });
  const refresh = h("button", { class: "btn", type: "button" }, "Refresh");
  const cancel = S.loginForced ? h("button", { class: "btn", type: "button", text: "Cancel" }) : null;
  const actions = h("div", { class: "login-actions" }, save, refresh, cancel || "");
  const manualWrap = h("details", { class: "login-help", style: "margin-top:14px" },
    h("summary", { text: "Enter a channel ID manually" }),
    h("div", { style: "margin-top:8px" }, manual)
  );
  content.append(
    h("div", { class: "channel-search" }, search),
    list,
    actions,
    manualWrap,
    h("div", { class: "login-note", text: "The channel must be one your account is a member of. A private channel with just you is enough." })
  );
  if (cancel) cancel.addEventListener("click", () => {
    S.authStage = "";
    S.selectedChannel = null;
    hideLogin();
  });
  search.addEventListener("input", debounce(() => {
    S.channelQuery = search.value.trim();
    S.selectedChannel = null;
    loadChannels(list, search.value.trim());
  }, 250));
  refresh.addEventListener("click", () => loadChannels(list, search.value.trim()));
  save.addEventListener("click", async () => {
    setLoginError("");
    const value = manual.value.trim() || (S.selectedChannel ? String(S.selectedChannel.id) : "");
    if (!value) { setLoginError("Choose a channel from the list or enter its ID."); return; }
    busyButton(save, true);
    try {
      S.status = await api("/api/vault", { method: "POST", body: { vault: value } });
      S.selectedChannel = null;
      S.authStage = "";
      S.loginForced = false;
      updateChrome();
      hideLogin();
      toast("Channel connected.", "success");
      await refreshLibrary(true);
      resetHistory();
      if ((S.nav.stats.count || 0) === 0) startSync(true);
    } catch (error) {
      setLoginError(error.message);
    } finally {
      busyButton(save, false, "Use this channel");
    }
  });
  loadChannels(list, search.value.trim());
}
async function loadChannels(list, query) {
  list.replaceChildren(h("div", { class: "login-loading" }, h("div", { class: "spinner" }), "Loading channels…"));
  try {
    const response = await api(`/api/channels?q=${encodeURIComponent(query || "")}`);
    S.channels = response.channels || [];
    renderChannelList(list);
  } catch (error) {
    list.replaceChildren(h("div", { class: "login-note", text: error.message }));
  }
}
function renderChannelList(list) {
  if (!S.channels.length) {
    list.replaceChildren(h("div", { class: "login-note" },
      "No channels found. Create a private channel in Telegram, add this account, then press Refresh."
    ));
    return;
  }
  const nodes = S.channels.map((channel) => {
    const selected = S.selectedChannel && S.selectedChannel.id === channel.id;
    const node = h("button", { class: "channel-item" + (selected ? " selected" : ""), type: "button" },
      h("span", { class: "channel-avatar", text: initials(channel.title) }),
      h("span", { class: "channel-info" },
        h("span", { class: "channel-title", text: channel.title }),
        h("span", { class: "channel-meta", text: channel.username ? `@${channel.username}` : String(channel.id) })
      ),
      h("span", { class: "channel-badge", text: channel.broadcast ? "channel" : channel.megagroup ? "group" : "chat" })
    );
    node.addEventListener("click", () => {
      S.selectedChannel = channel;
      list.querySelectorAll(".channel-item").forEach((item) => item.classList.remove("selected"));
      node.classList.add("selected");
    });
    return node;
  });
  list.replaceChildren(...nodes);
}
function renderErrorStage(content) {
  const st = S.status;
  content.append(
    h("h2", { text: st && st.authorized ? "Choose your channel" : "Couldn’t connect to Telegram" }),
    h("p", { class: "login-desc", text: (st && st.error) || "The Telegram session could not start." })
  );
  const retry = h("button", { class: "btn primary", type: "button", text: "Retry connection" });
  retry.addEventListener("click", async () => {
    busyButton(retry, true);
    setLoginError("");
    try {
      S.status = await api("/api/reconnect", { method: "POST" });
      updateChrome();
      S.authStage = "";
      if (S.status.authorized) afterAuthorized(S.status);
      else renderLogin();
    } catch (error) {
      setLoginError(error.message);
    } finally {
      busyButton(retry, false, "Retry connection");
    }
  });
  const other = h("button", { class: "btn", type: "button", text: "Use different API credentials" });
  other.addEventListener("click", switchCreds);
  content.append(h("div", { class: "login-actions" }, retry, other));
  if (st && st.authorized) {
    const pick = h("button", { class: "btn", type: "button", text: "Choose another channel" });
    pick.addEventListener("click", () => { S.authStage = "channel"; S.loginForced = true; renderLogin(); });
    content.append(pick);
  } else if (st && (st.has_api || st.quick_api)) {
    const logout = h("button", { class: "link-btn", type: "button", text: "Sign out and start over" });
    logout.addEventListener("click", async () => {
      try {
        S.status = await api("/api/logout", { method: "POST" });
        S.authStage = "";
        updateChrome();
        renderLogin();
      } catch (error) { setLoginError(error.message); }
    });
    content.append(h("div", { class: "login-help", style: "margin-top:14px" }, logout));
  }
}

/* --------------------------------------------------------------- library */
async function refreshLibrary(initial) {
  if (!ready()) return;
  await Promise.all([loadNav(), loadItems({ reset: true, first: Boolean(initial) })]);
}
async function loadNav() {
  try {
    const data = await api("/api/nav");
    S.nav = data;
    S.covers = {};
    S.coversPending.clear();
    S.coversSeq += 1;
    renderSidebar();
    renderKindOptions();
    if (!S.itemsPending) renderItems();
  } catch (error) {
    toast(error.message, "error");
  }
}
const FOLD_KEY = "tfe_fold_collapsed";
function collapsedFolders() {
  try {
    const raw = JSON.parse(localStorage.getItem(FOLD_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw.map((v) => String(v).toLowerCase()) : []);
  } catch {
    return new Set();
  }
}
function saveCollapsedFolders(set) {
  try { localStorage.setItem(FOLD_KEY, JSON.stringify([...set])); } catch { /* keep UI-only pref best effort */ }
}
function renderSidebar() {
  const stats = S.nav.stats || {};
  $("countAll").textContent = stats.count ? String(stats.count) : "";
  $("countFav").textContent = stats.favorites ? String(stats.favorites) : "";
  $("countHidden").textContent = stats.hidden ? String(stats.hidden) : "";
  $("countPlaying").textContent = stats.playing ? String(stats.playing) : "";
  $("countStars").textContent = S.nav.stars ? String(S.nav.stars) : "";
  $("storageCount").textContent = plural(stats.count || 0, "file");
  $("storageSize").textContent = fmtSize(stats.size || 0);
  const bar = $("storageBar");
  if (bar && bar.parentElement) bar.parentElement.hidden = true;

  document.querySelectorAll("#nav .nav-item").forEach((node) => {
    const active = !S.folder && !S.tag && !S.collection &&
      ((node.dataset.nav === "all" && S.navMode === "all") ||
       (node.dataset.nav === "recent" && S.navMode === "recent") ||
       (node.dataset.nav === "continue" && S.navMode === "continue") ||
       (node.dataset.nav === "favorites" && S.navMode === "favorites") ||
       (node.dataset.nav === "stars" && S.navMode === "stars") ||
       (node.dataset.nav === "hidden" && S.navMode === "hidden"));
    node.classList.toggle("active", active);
  });

  const folderList = $("folderList");
  folderList.replaceChildren();
  const folders = S.nav.folders || [];
  const foldSet = collapsedFolders();
  const lowerPath = (entry) => String(entry.folder || "").toLowerCase();
  const parentFolders = folders.filter((entry) =>
    folders.some((other) => String(other.parent || "").toLowerCase() === lowerPath(entry)));
  const isHiddenByCollapse = (entry) => {
    const path = lowerPath(entry);
    for (const collapsed of foldSet) {
      if (path.startsWith(collapsed + "/")) return true;
    }
    return false;
  };
  updateFoldToggle(folders, parentFolders, foldSet);
  if (!folders.length) {
    folderList.append(h("div", { class: "side-empty", text: "No folders yet" }));
  } else {
    for (const folder of folders) {
      if (isHiddenByCollapse(folder)) continue;
      const depth = Math.min(folder.depth || 0, 8);
      const hasChildren = parentFolders.some((entry) => entry.folder === folder.folder);
      const open = !foldSet.has(lowerPath(folder));
      const toggle = h("span", {
        class: "tree-chev" + (open ? " open" : "") + (hasChildren ? "" : " leaf"),
        title: hasChildren ? (open ? "Collapse" : "Expand") : "",
        "aria-hidden": "true",
        html: svgRaw("chevron")
      });
      if (hasChildren) {
        toggle.addEventListener("click", (event) => {
          event.stopPropagation();
          const set = collapsedFolders();
          const key = lowerPath(folder);
          if (set.has(key)) set.delete(key); else set.add(key);
          saveCollapsedFolders(set);
          renderSidebar();
        });
      }
      const node = h("button", {
        class: "folder-item" + (S.folder.toLowerCase() === folder.folder.toLowerCase() ? " active" : ""),
        type: "button",
        title: folder.folder,
        style: `--depth:${depth}`
      },
        toggle,
        folderIconNode(folder),
        h("span", { class: "folder-name", text: folder.name || folder.folder }),
        h("span", { class: "nav-count", text: folder.n ? String(folder.n) : "" })
      );
      node.addEventListener("click", () => openFolder(folder.folder));
      node.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        openFolderMenu(event, folder);
      });
      folderList.append(node);
    }
  }

  const collectionList = $("collectionList");
  collectionList.replaceChildren();
  const collections = S.nav.collections || [];
  if (!collections.length) {
    collectionList.append(h("div", { class: "side-empty", text: "No collections yet" }));
  } else {
    for (const collection of collections) {
      const node = h("button", {
        class: "side-item" + (S.collection === collection.id ? " active" : ""),
        type: "button",
        title: collection.name
      },
        h("span", { class: "side-item-icon", html: svgRaw("layers") }),
        h("span", { class: "side-item-name", text: collection.name }),
        h("span", { class: "nav-count", text: collection.n ? String(collection.n) : "" })
      );
      node.addEventListener("click", () => navigateScope({ navMode: "collection", collection: collection.id, folder: "", tag: "", kind: "" }));
      node.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        showContextMenu(event.clientX, event.clientY, [
          { label: "Rename collection…", icon: "edit", onClick: () => promptRenameCollection(collection) },
          { label: "Delete collection", icon: "trash", danger: true, onClick: () => promptDeleteCollection(collection) }
        ]);
      });
      collectionList.append(node);
    }
  }

  const viewList = $("viewList");
  viewList.replaceChildren();
  const views = S.nav.views || [];
  if (!views.length) {
    viewList.append(h("div", { class: "side-empty", text: "Save a filter set to reuse it" }));
  } else {
    for (const view of views) {
      const node = h("button", { class: "side-item", type: "button", title: view.name },
        h("span", { class: "side-item-icon", html: svgRaw("filter") }),
        h("span", { class: "side-item-name", text: view.name })
      );
      node.addEventListener("click", () => applySavedView(view));
      node.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        showContextMenu(event.clientX, event.clientY, [
          { label: "Apply view", icon: "filter", onClick: () => applySavedView(view) },
          { label: "Delete view", icon: "trash", danger: true, onClick: () => deleteSavedView(view) }
        ]);
      });
      viewList.append(node);
    }
  }

  const tagList = $("tagList");
  tagList.replaceChildren();
  const tags = S.nav.tags || [];
  if (!tags.length) {
    tagList.append(h("div", { class: "side-empty", text: "No tags yet" }));
  } else {
    for (const tag of tags) {
      const color = tag.color || "";
      const node = h("button", {
        class: "tag-chip" + (S.tag.toLowerCase() === tag.tag.toLowerCase() ? " active" : ""),
        type: "button",
        title: `${plural(tag.count, "file")}${tag.group ? ` · ${tag.group}` : ""}`
      }, color ? h("i", { class: "tag-dot", style: `background:${color}` }) : null, `#${tag.tag}`);
      node.addEventListener("click", () => navigateScope({ navMode: "all", tag: tag.tag }));
      node.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        promptTagMeta(tag);
      });
      tagList.append(node);
    }
  }
  $("clearTagBtn").hidden = !S.tag;
  updateFilterBadge();
  updateBreadcrumb();
  updateStatusCounts();
}
function updateFoldToggle(folders, parentFolders, foldSet) {
  const btn = $("foldToggleBtn");
  if (!btn) return;
  const lowerPath = (entry) => String(entry.folder || "").toLowerCase();
  const anyOpen = parentFolders.some((entry) => !foldSet.has(lowerPath(entry)));
  btn.hidden = !parentFolders.length;
  setIcon(btn, anyOpen ? "foldCompact" : "foldExpand");
  btn.title = anyOpen ? "Collapse all folders" : "Expand all folders";
  btn.onclick = () => {
    const set = anyOpen
      ? new Set(parentFolders.map((entry) => lowerPath(entry)))
      : new Set();
    saveCollapsedFolders(set);
    renderSidebar();
  };
}
function renderKindOptions() {
  const select = $("kindSelect");
  const current = S.kind;
  const options = [h("option", { value: "", text: "All types" })];
  for (const kind of S.nav.kinds || []) {
    options.push(h("option", { value: kind.kind, text: `${kind.label} (${kind.count})` }));
  }
  select.replaceChildren(...options);
  const exists = (S.nav.kinds || []).some((kind) => kind.kind === current);
  S.kind = exists ? current : "";
  select.value = S.kind;
}
function updateStatusCounts() {
  if (isStarCatalogue()) {
    $("countText").textContent = plural((S.stars || []).length, "star");
    $("sizeText").textContent = "";
    $("loadMoreWrap").hidden = true;
    setStatus("");
    return;
  }
  const count = S.total || 0;
  const folders = visibleSubfolders().length;
  $("countText").textContent = folders
    ? `${plural(count, "item")} · ${plural(folders, "folder")}`
    : plural(count, "item");
  $("sizeText").textContent = count ? fmtSize(S.totalSize) : "";
  const wrap = $("loadMoreWrap");
  if (S.items.length < S.total) {
    wrap.hidden = false;
    $("loadMoreText").textContent = `${S.items.length} of ${S.total}`;
  } else {
    wrap.hidden = true;
  }
}
function updateBreadcrumb() {
  const nodes = [];
  const rootLabel = S.navMode === "stars" ? "Stars"
    : S.navMode === "favorites" ? "Favorites"
    : S.navMode === "recent" ? "Recent"
    : S.navMode === "continue" ? "Continue watching"
    : S.navMode === "collection" ? (collectionById(S.collection)?.name || "Collection")
    : S.navMode === "hidden" ? "Hidden" : "All files";
  const atRoot = !S.folder && !S.tag && !S.starId;
  if (atRoot) {
    nodes.push(h("span", { class: "crumb current", text: rootLabel, title: rootLabel }));
  } else {
    const root = h("button", { class: "crumb link", type: "button", text: rootLabel, title: rootLabel });
    root.addEventListener("click", () => {
      if (S.navMode === "stars") navigateScope({ navMode: "stars", starId: null, q: "" });
      else navigateScope({ navMode: S.navMode, folder: "", tag: "", kind: "", q: "" });
    });
    nodes.push(root);
  }
  if (S.starId) {
    const star = currentStar();
    nodes.push(h("span", { class: "sep", text: "›" }));
    const label = star ? star.name : "Star";
    if (S.q) {
      const crumb = h("button", { class: "crumb link", type: "button", text: label, title: label });
      crumb.addEventListener("click", () => navigateScope({ navMode: "stars", starId: S.starId, q: "" }));
      nodes.push(crumb);
    } else {
      nodes.push(h("span", { class: "crumb current", text: label, title: label }));
    }
  }
  if (S.folder) {
    const parts = S.folder.split("/");
    let path = "";
    parts.forEach((part, index) => {
      path = path ? `${path}/${part}` : part;
      nodes.push(h("span", { class: "sep", text: "›" }));
      const last = index === parts.length - 1 && !S.tag;
      if (last) {
        nodes.push(h("span", { class: "crumb current", text: part, title: path }));
      } else {
        const crumb = h("button", { class: "crumb link", type: "button", text: part, title: path });
        crumb.addEventListener("click", () => navigateScope({ navMode: "all", folder: path }));
        nodes.push(crumb);
      }
    });
  }
  if (S.tag) {
    nodes.push(h("span", { class: "sep", text: "›" }));
    nodes.push(h("span", { class: "crumb current", text: `#${S.tag}` }));
  }
  if (S.q) {
    nodes.push(h("span", { class: "sep", text: "·" }));
    nodes.push(h("span", { class: "crumb current", text: `“${S.q}”` }));
  }
  $("breadcrumb").replaceChildren(...nodes);
  $("upBtn").disabled = !(S.folder || S.tag || S.kind || S.q || S.starId || S.collection || S.watching);
  $("backBtn").disabled = S.histIndex <= 0;
  $("forwardBtn").disabled = S.histIndex >= S.history.length - 1;
}
async function loadItems(options) {
  const opts = options || {};
  const reset = opts.reset !== false;
  const seq = ++S.loadSeq;
  S.itemsPending = true;
  if (reset) {
    if (opts.first || !S.items.length) showLoading(true);
    S.items = [];
    S.total = 0;
    S.totalSize = 0;
    S.nextCursor = "";
  }
  setStatus(reset ? "Loading…" : "Loading more…");
  const params = new URLSearchParams();
  if (S.q) params.set("q", S.q);
  if (S.starId) params.set("star", String(S.starId));
  if (S.kind) params.set("kind", S.kind);
  if (S.folder) params.set("folder", S.folder);
  if (S.tag) params.set("tag", S.tag);
  if (S.favorite) params.set("favorite", "1");
  if (S.collection) params.set("collection", String(S.collection));
  if (S.watching) params.set("watching", "1");
  if (S.hiddenOnly) params.set("hidden", "1");
  if (S.filters.min !== "" && Number.isFinite(Number(S.filters.min))) {
    params.set("min_size", String(Math.max(0, Math.round(Number(S.filters.min) * 1024 * 1024))));
  }
  if (S.filters.max !== "" && Number.isFinite(Number(S.filters.max))) {
    params.set("max_size", String(Math.max(0, Math.round(Number(S.filters.max) * 1024 * 1024))));
  }
  if (S.filters.after) params.set("after", S.filters.after);
  if (S.filters.before) params.set("before", S.filters.before);
  if (S.filters.note) params.set("note", "1");
  if (S.filters.recursive && S.folder) params.set("recursive", "1");
  params.set("sort", S.sort);
  params.set("direction", S.dir);
  params.set("limit", "200");
  if (!reset && S.nextCursor) params.set("cursor", S.nextCursor);
  else params.set("offset", String(reset ? 0 : S.items.length));
  try {
    const data = await api(`/api/items?${params.toString()}`);
    if (seq !== S.loadSeq) return;
    S.items = reset ? data.items : S.items.concat(data.items);
    S.total = data.total;
    S.totalSize = data.total_size;
    S.nextCursor = data.next_cursor || "";
    S.loading = false;
    if (S.selectedId && !S.items.some((item) => item.id === S.selectedId)) {
      S.selectedId = null;
    }
    S.itemsPending = false;
    if (reset) {
      renderItems();
    } else {
      appendItemRows(data.items);
      updateStatusCounts();
      updateBreadcrumb();
      renderSelection();
      renderPreview();
    }
    if (S.starId) renderStarBanner();
    setStatus(data.total ? `${plural(data.total, "item")} in this view` : "");
    if (S.items.length < data.total) setStatus(`${S.items.length} of ${data.total} items loaded`);
  } catch (error) {
    if (seq !== S.loadSeq) return;
    S.itemsPending = false;
    showLoading(false);
    setStatus("Could not load files");
    toast(error.message, "error");
  }
}
async function loadMore() {
  if (S.loading || S.items.length >= S.total) return;
  S.loading = true;
  await loadItems({ reset: false });
  S.loading = false;
}
function showLoading(show) {
  $("loadingView").hidden = !show;
  if (show) {
    $("emptyView").hidden = true;
  }
}
function scopedEmptyContent() {
  if (S.starId) {
    return {
      title: "No files for this star yet",
      text: "Assign files from a file’s Stars menu, or select several files and use Stars in the bulk bar.",
      sync: false,
      upload: false
    };
  }
  if (S.q) {
    return {
      title: `No matches for “${S.q}”`,
      text: "Try another word, or search by tag and folder name.",
      sync: false,
      upload: false
    };
  }
  if (S.tag) {
    return {
      title: `No files tagged #${S.tag}`,
      text: "Edit a file’s tags to see it here.",
      sync: false,
      upload: true
    };
  }
  if (S.folder) {
    return {
      title: "This folder is empty",
      text: "Upload a file into this folder, or move an existing file here.",
      sync: false,
      upload: true
    };
  }
  if (S.navMode === "continue") {
    return {
      title: "Nothing to continue",
      text: "Files you have started playing appear here so you can pick them up again.",
      sync: false,
      upload: false
    };
  }
  if (S.navMode === "collection") {
    return {
      title: "This collection is empty",
      text: "Select files in All files and use Collection to add them here. A file can be in several collections.",
      sync: false,
      upload: false
    };
  }
  if (S.navMode === "favorites") {
    return {
      title: "No favorites yet",
      text: "Select a file in All files and tap Favorite.",
      sync: false,
      upload: false
    };
  }
  if (S.navMode === "hidden") {
    return {
      title: "Nothing hidden",
      text: "Files you remove from the library appear here, and you can restore them anytime.",
      sync: false,
      upload: false
    };
  }
  return {
    title: "No files here yet",
    text: "Sync with Telegram to bring your channel into this window, or upload a file.",
    sync: true,
    upload: true
  };
}
function renderItems() {
  stopHoverPreview();
  showLoading(false);
  const catalogue = isStarCatalogue();
  $("starCatalogue").hidden = !catalogue;
  $("starBanner").hidden = !S.starId;
  $("content").classList.toggle("star-page", Boolean(S.starId));
  if (catalogue) {
    $("emptyView").hidden = true;
    $("detailsView").hidden = true;
    $("tilesView").hidden = true;
    $("loadMoreWrap").hidden = true;
    $("rows").replaceChildren();
    $("tilesView").replaceChildren();
    renderStarCatalogue();
    updateBreadcrumb();
    renderSelection();
    return;
  }
  const folders = visibleSubfolders();
  if (S.selectedFolderPath && !folders.some((entry) => entry.folder.toLowerCase() === S.selectedFolderPath.toLowerCase())) {
    S.selectedFolderPath = null;
  }
  if (S.selection.size) {
    const present = new Set(S.items.map((entry) => entry.id));
    for (const id of Array.from(S.selection)) {
      if (!present.has(id)) S.selection.delete(id);
    }
    if (!S.selection.size) S.selectionAnchor = null;
  }
  const hasContent = folders.length > 0 || S.items.length > 0;
  $("emptyView").hidden = hasContent;
  $("detailsView").hidden = !hasContent || S.view !== "details";
  $("tilesView").hidden = !hasContent || S.view !== "tiles";
  $("loadMoreWrap").hidden = true;
  if (!hasContent) {
    $("rows").replaceChildren();
    $("tilesView").replaceChildren();
    const empty = scopedEmptyContent();
    $("emptyTitle").textContent = empty.title;
    $("emptyText").textContent = empty.text;
    $("emptySyncBtn").hidden = !empty.sync;
    $("emptyUploadBtn").hidden = !empty.upload;
    $("emptyFolderBtn").hidden = !empty.upload;
    updateBreadcrumb();
    renderSelection();
    return;
  }
  const rows = $("rows");
  const tiles = $("tilesView");
  rows.replaceChildren();
  tiles.replaceChildren();
  const rowFrag = document.createDocumentFragment();
  const tileFrag = document.createDocumentFragment();
  for (const folder of folders) {
    rowFrag.append(buildFolderRow(folder));
    tileFrag.append(buildFolderTile(folder));
  }
  for (const item of S.items) {
    rowFrag.append(buildRow(item));
    tileFrag.append(buildTile(item));
  }
  rows.append(rowFrag);
  tiles.append(tileFrag);
  ensureFolderCovers(folders.map((entry) => entry.folder));
  updateStatusCounts();
  updateBreadcrumb();
  updateSortArrows();
  renderSelection();
  renderPreview();
}
function appendItemRows(items) {
  if (!items || !items.length) return;
  const rowFrag = document.createDocumentFragment();
  const tileFrag = document.createDocumentFragment();
  for (const item of items) {
    rowFrag.append(buildRow(item));
    tileFrag.append(buildTile(item));
  }
  $("rows").append(rowFrag);
  $("tilesView").append(tileFrag);
}
function folderSelected(folder) {
  return Boolean(S.selectedFolderPath && S.selectedFolderPath.toLowerCase() === folder.folder.toLowerCase());
}
function buildFolderRow(folder) {
  const sub = [];
  if (folder.n) sub.push(plural(folder.n, "file"));
  if (folder.direct_n !== undefined) sub.push(`${folder.direct_n} direct`);
  if (folder.note) sub.push(folder.note.slice(0, 80));
  const nameBlock = h("div", { class: "name-block" },
    h("span", { class: "name-text", title: folder.folder },
      folder.name || folder.folder,
      folder.note ? h("span", { class: "note-mark", html: svgRaw("note") }) : null
    )
  );
  if (sub.length) nameBlock.append(h("span", { class: "name-sub", text: sub.join(" · ") }));
  return h("div", { class: "row folder-row" + (folderSelected(folder) ? " selected" : ""), "data-folder": folder.folder, tabindex: "-1" },
    h("div", { class: "cell cell-name" }, buildFolderThumb(folder), nameBlock),
    h("div", { class: "cell cell-type" }, h("span", { class: "type-cell" }, h("span", { class: "type-label", text: "Folder" }))),
    h("div", { class: "cell cell-size", text: folder.n ? fmtSize(folder.size) : "—" }),
    h("div", { class: "cell cell-date", text: "—" }),
    h("div", { class: "cell cell-folder", title: folder.parent || "", text: folder.parent || "—" })
  );
}
function buildCoverGrid(folder) {
  const covers = (folder.covers || []).slice(0, 4);
  if (!covers.length) return null;
  const grid = h("div", { class: `cover-grid n${covers.length}` });
  for (const cover of covers) {
    const image = h("img", { src: cover.url, alt: "", loading: "lazy", decoding: "async" });
    image.addEventListener("error", () => image.classList.add("broken"));
    grid.append(image);
  }
  return grid;
}
function folderIconBadge(folder) {
  return folder.icon ? h("span", { class: "cover-icon", text: folder.icon }) : null;
}
function folderCoverGrid(folder) {
  return buildCoverGrid({ covers: S.covers[folder.folder.toLowerCase()] || [] });
}
function folderGlyph(folder, large) {
  if (folder.icon) return h("span", { class: "folder-glyph" + (large ? " large" : ""), text: folder.icon });
  return h("span", { class: "folder-glyph" + (large ? " large" : ""), html: svgRaw("folder") });
}
function fillFolderThumb(host, folder) {
  const grid = folderCoverGrid(folder);
  host.classList.toggle("covers", Boolean(grid));
  host.replaceChildren();
  if (grid) {
    host.append(grid);
    const badge = folderIconBadge(folder);
    if (badge) host.append(badge);
    return;
  }
  host.append(folderGlyph(folder, false));
}
function fillFolderTile(media, folder) {
  const grid = folderCoverGrid(folder);
  media.classList.toggle("covers", Boolean(grid));
  media.replaceChildren();
  if (grid) {
    media.append(grid);
    const badge = folderIconBadge(folder);
    if (badge) media.append(badge);
  } else {
    media.append(folderGlyph(folder, true));
  }
  if (folder.n) media.append(h("span", { class: "tile-badge", text: plural(folder.n, "file") }));
  if (folder.note) media.append(h("span", { class: "tile-badge note", title: folder.note, html: svgRaw("note") }));
}
function buildFolderThumb(folder) {
  const host = h("span", {
    class: "thumb folder-thumb",
    "data-cover-folder": folder.folder,
    "data-cover-kind": "row"
  });
  fillFolderThumb(host, folder);
  return host;
}
function buildFolderTile(folder) {
  const media = h("div", {
    class: "tile-media folder-tile-media",
    "data-cover-folder": folder.folder,
    "data-cover-kind": "tile"
  });
  fillFolderTile(media, folder);
  return h("div", { class: "tile folder-tile" + (folderSelected(folder) ? " selected" : ""), "data-folder": folder.folder, tabindex: "-1" },
    media,
    h("div", { class: "tile-body" },
      h("div", { class: "tile-name", text: folder.name || folder.folder, title: folder.folder }),
      h("div", { class: "tile-meta" },
        h("span", { text: "Folder" }),
        h("span", { text: folder.n ? fmtSize(folder.size) : "—" })
      )
    )
  );
}
async function ensureFolderCovers(paths) {
  const wanted = [];
  for (const path of paths || []) {
    if (!path) continue;
    const key = path.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(S.covers, key)) continue;
    if (S.coversPending.has(key)) continue;
    S.coversPending.add(key);
    wanted.push(path);
  }
  if (!wanted.length) return;
  const seq = S.coversSeq;
  const params = new URLSearchParams();
  for (const path of wanted) params.append("folder", path);
  try {
    const data = await api(`/api/folder-covers?${params.toString()}`);
    if (seq !== S.coversSeq) return;
    const found = data.covers || {};
    for (const path of wanted) {
      const key = path.toLowerCase();
      S.covers[key] = found[key] || [];
      S.coversPending.delete(key);
    }
    patchFolderCovers(wanted);
  } catch (_) {
    for (const path of wanted) S.coversPending.delete(path.toLowerCase());
  }
}
function patchFolderCovers(paths) {
  const wanted = new Set(paths.map((path) => path.toLowerCase()));
  if (S.selectedFolderPath && wanted.has(S.selectedFolderPath.toLowerCase())) renderPreview();
  const folders = new Map((S.nav.folders || []).map((entry) => [entry.folder.toLowerCase(), entry]));
  for (const host of document.querySelectorAll("[data-cover-folder]")) {
    const key = host.dataset.coverFolder.toLowerCase();
    if (!wanted.has(key)) continue;
    const folder = folders.get(key);
    if (!folder) continue;
    if (host.dataset.coverKind === "tile") fillFolderTile(host, folder);
    else fillFolderThumb(host, folder);
  }
}
function buildThumb(item) {
  const thumb = h("span", { class: "thumb" });
  if (item.has_thumb && item.thumb_url) {
    const image = h("img", { src: item.thumb_url, alt: "", loading: "lazy", decoding: "async" });
    image.addEventListener("error", () => {
      image.remove();
      thumb.append(fileIcon(item.kind));
    });
    thumb.append(image);
  } else {
    thumb.append(fileIcon(item.kind));
  }
  return thumb;
}
function partLabel(item) {
  const part = item.part_of;
  return part && part.count > 1 ? `Part ${part.num}/${part.count}` : "";
}
function buildRow(item) {
  const nameBlock = h("div", { class: "name-block" },
    h("span", { class: "name-text", title: item.name },
      item.name,
      item.favorite ? h("span", { class: "fav-star", html: svgRaw("starFilled") }) : null
    )
  );
  const subParts = [];
  const part = partLabel(item);
  if (part) subParts.push(part);
  if (item.tag_list && item.tag_list.length) subParts.push(item.tag_list.slice(0, 3).map((tag) => `#${tag}`).join(" "));
  else if (item.caption) subParts.push(item.caption.slice(0, 90));
  if (item.meta && Array.isArray(item.meta.fields)) {
    const fields = Object.fromEntries(item.meta.fields.filter((pair) => Array.isArray(pair)));
    const hint = fields.Bounds || fields.Dimensions || (fields.Triangles ? `${fields.Triangles} triangles` : "");
    if (hint) subParts.push(hint);
  }
  if (item.note) subParts.push("Note");
  if (subParts.length) nameBlock.append(h("span", { class: "name-sub" },
    subParts.join(subParts.length > 1 ? " · " : ""),
    item.note ? h("span", { class: "note-mark", html: svgRaw("note") }) : null
  ));
  if (item.stars && item.stars.length) {
    nameBlock.append(h("span", { class: "name-sub row-stars" }, item.stars.map((star) => starChip(star))));
  }
  const typeCell = h("div", { class: "cell cell-type" },
    h("span", { class: "type-cell" }, h("span", { class: "type-label", text: item.kind_label || "File" }))
  );
  const row = h("div", { class: "row" + (S.selectedId === item.id || S.selection.has(item.id) ? " selected" : ""), "data-id": String(item.id), tabindex: "-1" },
    h("div", { class: "cell cell-name" }, buildThumb(item), nameBlock),
    typeCell,
    h("div", { class: "cell cell-size", text: fmtSize(item.size) }),
    h("div", { class: "cell cell-date", text: fmtDate(item.tg_date || item.added_at) }),
    h("div", { class: "cell cell-folder", title: item.folder || "", text: item.folder || "—" })
  );
  return row;
}
/* --------------------------------------------------------- hover preview
   Stash-style: hovering a tile enlarges the cover, and video tiles play a
   short muted loop from the middle of the clip after a short delay. Only one
   preview runs at a time; it is torn down as soon as the pointer leaves. */
const HOVER_PREVIEW_DELAY = 420;
const HOVER_PREVIEW_SECONDS = 12;
let hoverTimer = 0;
let hoverTarget = null;
let hoverVideo = null;
let hoverObserver = null;

function hoverPreviewWindow(item) {
  const duration = Number(item.duration) || 0;
  if (duration <= HOVER_PREVIEW_SECONDS + 4) return null;
  const start = Math.min(Math.max(2, duration * 0.15), duration - HOVER_PREVIEW_SECONDS);
  return { start, end: start + HOVER_PREVIEW_SECONDS };
}

function stopHoverPreview() {
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = 0; }
  if (hoverObserver) { hoverObserver.disconnect(); hoverObserver = null; }
  if (hoverVideo) {
    hoverVideo.pause();
    hoverVideo.removeAttribute("src");
    hoverVideo.load();
    hoverVideo.remove();
    hoverVideo = null;
  }
  if (hoverTarget) {
    hoverTarget.classList.remove("hover-preview");
    hoverTarget = null;
  }
}

function startHoverPreview(tile, item) {
  const media = tile.querySelector(".tile-media");
  if (!media) return;
  hoverTarget = tile;
  tile.classList.add("hover-preview");
  if (!isVideoLike(item) || !item.stream_url) return;
  const video = h("video", { class: "tile-hover-video" });
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "metadata";
  hoverVideo = video;
  video.src = item.stream_url;
  const previewWindow = hoverPreviewWindow(item);
  if (previewWindow) {
    let rewinding = false;
    video.addEventListener("loadedmetadata", () => {
      if (hoverVideo !== video) return;
      try { video.currentTime = previewWindow.start; } catch (_) {}
      const started = video.play();
      if (started && started.catch) started.catch(() => {});
    }, { once: true });
    video.addEventListener("timeupdate", () => {
      if (rewinding || hoverVideo !== video) return;
      if (video.currentTime >= previewWindow.end) {
        rewinding = true;
        try { video.currentTime = previewWindow.start; } catch (_) {}
      }
    });
    video.addEventListener("seeked", () => { rewinding = false; });
  }
  video.addEventListener("loadeddata", () => {
    if (hoverVideo === video) video.classList.add("ready");
  }, { once: true });
  video.addEventListener("error", () => {
    if (hoverVideo === video) stopHoverPreview();
  });
  media.append(video);
  if (!previewWindow) {
    const started = video.play();
    if (started && started.catch) started.catch(() => {});
  }
  if ("IntersectionObserver" in window) {
    hoverObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => !entry.isIntersecting)) stopHoverPreview();
    });
    hoverObserver.observe(video);
  }
}

function buildTile(item) {
  const media = h("div", { class: "tile-media" });
  if (item.has_thumb && item.thumb_url) {
    const image = h("img", { src: item.thumb_url, alt: "", loading: "lazy", decoding: "async" });
    image.addEventListener("error", () => { image.remove(); media.append(fileIcon(item.kind)); });
    media.append(image);
  } else {
    media.append(fileIcon(item.kind));
  }
  let badge = "";
  if ((item.kind === "video" || item.kind === "audio" || item.kind === "voice") && item.duration) badge = fmtDuration(item.duration);
  else if (item.kind === "gif") badge = "GIF";
  if (badge) media.append(h("span", { class: "tile-badge", text: badge }));
  if (item.movie && item.movie.rating) {
    media.append(h("span", {
      class: "tile-badge tile-rating",
      title: item.movie.votes ? `${item.movie.votes.toLocaleString()} IMDb votes` : "IMDb rating",
      text: `★ ${Number(item.movie.rating).toFixed(1)}`
    }));
  }
  const part = partLabel(item);
  if (part) media.append(h("span", { class: "tile-badge", text: part }));
  if (item.favorite) media.append(h("span", { class: "tile-badge", style: "right:auto;left:6px;display:grid;place-items:center", html: svgRaw("starFilled") }));
  if (item.stars && item.stars.length) media.append(tileStarsBadge(item.stars));
  if (item.note) media.append(h("span", { class: "tile-badge note", title: item.note, html: svgRaw("note") }));
  const body = h("div", { class: "tile-body" },
    h("div", { class: "tile-name", text: item.name, title: item.name }),
    h("div", { class: "tile-meta" },
      h("span", { text: item.kind_label || "File" }),
      h("span", { text: fmtSize(item.size) })
    )
  );
  return h("div", { class: "tile" + (S.selectedId === item.id || S.selection.has(item.id) ? " selected" : ""), "data-id": String(item.id), tabindex: "-1" }, media, body);
}
function updateViewButtons() {
  document.querySelectorAll(".view-toggle button").forEach((node) => {
    node.classList.toggle("active", node.dataset.view === S.view);
  });
  const hasContent = visibleSubfolders().length > 0 || S.items.length > 0;
  $("detailsView").hidden = S.view !== "details" || !hasContent;
  $("tilesView").hidden = S.view !== "tiles" || !hasContent;
}
function setView(view) {
  S.view = view === "tiles" ? "tiles" : "details";
  localStorage.setItem("tfe_view", S.view);
  savePrefs({ view: S.view });
  updateViewButtons();
  updateSortArrows();
  renderItems();
}
function applyPreviewState() {
  const collapsed = Boolean(S.previewCollapsed);
  const pane = $("previewPane");
  const shell = pane.closest(".shell");
  const button = $("previewToggle");
  pane.classList.toggle("collapsed", collapsed);
  if (shell) shell.classList.toggle("preview-collapsed", collapsed);
  button.title = collapsed ? "Show details" : "Hide details";
  button.setAttribute("aria-label", button.title);
  button.setAttribute("aria-expanded", collapsed ? "false" : "true");
  setIcon($("previewToggleIcon"), collapsed ? "chevronLeft" : "chevron");
}
function togglePreview() {
  S.previewCollapsed = !S.previewCollapsed;
  savePrefs({ preview: S.previewCollapsed ? "hidden" : "shown" });
  applyPreviewState();
}
function updateSortArrows() {
  document.querySelectorAll(".col[data-sort]").forEach((node) => {
    const arrow = node.querySelector(".sort-arrow");
    arrow.textContent = node.dataset.sort === S.sort ? (S.dir === "asc" ? "↑" : "↓") : "";
  });
  $("sortSelect").value = S.sort;
  $("sortDirBtn").innerHTML = svgRaw(S.dir === "asc" ? "sortAsc" : "sortDesc");
  $("sortDirBtn").title = S.dir === "asc" ? "Ascending" : "Descending";
}
function setSort(sort, explicitDir) {
  let dir = explicitDir;
  if (!dir) {
    if (sort === S.sort) dir = S.dir === "asc" ? "desc" : "asc";
    else dir = sort === "name" ? "asc" : "desc";
  }
  S.sort = sort;
  S.dir = dir;
  localStorage.setItem("tfe_sort", S.sort);
  localStorage.setItem("tfe_dir", S.dir);
  savePrefs({ sort: S.sort, dir: S.dir });
  updateSortArrows();
  if (!isStarCatalogue()) loadItems({ reset: true });
}
function setStatus(text) {
  $("statusText").textContent = text || "";
}
function setScope(scope, pushHistory) {
  const previous = { navMode: S.navMode, folder: S.folder, tag: S.tag, kind: S.kind, favorite: S.favorite, starId: S.starId };
  S.navMode = scope.navMode !== undefined ? scope.navMode : "all";
  S.folder = scope.folder || "";
  S.tag = scope.tag || "";
  S.starId = scope.starId !== undefined ? scope.starId : null;
  S.collection = scope.collection !== undefined && scope.collection !== null
    ? Number(scope.collection)
    : (S.navMode === "collection" ? S.collection : null);
  S.watching = scope.watching !== undefined ? Boolean(scope.watching) : S.navMode === "continue";
  if (S.watching) S.navMode = "continue";
  if (S.collection) S.navMode = "collection";
  if (S.starId) S.navMode = "stars";
  if (scope.kind !== undefined) S.kind = scope.kind;
  else if (S.folder || S.tag) S.kind = "";
  S.favorite = S.navMode === "favorites";
  S.hiddenOnly = S.navMode === "hidden";
  if (scope.sort) S.sort = scope.sort;
  if (scope.dir) S.dir = scope.dir;
  S.q = scope.q || "";
  if (S.starId) {
    const cached = starById(S.starId);
    if (cached) S.starInfo = cached;
    else if (!S.starInfo || Number(S.starInfo.id) !== Number(S.starId)) S.starInfo = null;
  } else {
    S.starInfo = null;
  }
  const search = $("searchInput");
  if (search.value !== S.q) search.value = S.q;
  S.selectedId = null;
  S.selectedFolderPath = null;
  S.selection.clear();
  S.selectionAnchor = null;
  renderSelection();
  if (pushHistory !== false) {
    const current = S.history[S.histIndex];
    const next = snapshot();
    if (!current || JSON.stringify(current) !== JSON.stringify(next)) pushSnapshot();
  }
  updateSortArrows();
  renderSidebar();
  renderPreview();
  if (isStarCatalogue()) {
    renderItems();
    loadStars();
  } else loadItems({ reset: true });
  if (S.starId && !S.starInfo) loadStarInfo(S.starId);
  void previous;
}
function navigateScope(scope) {
  setScope(scope, true);
}
function goBack() {
  if (S.histIndex <= 0) return;
  S.histIndex -= 1;
  applyHistory();
}
function goForward() {
  if (S.histIndex >= S.history.length - 1) return;
  S.histIndex += 1;
  applyHistory();
}
function handleHistoryMouseButton(event) {
  if (event.button !== 3 && event.button !== 4) return;
  event.preventDefault();
  if (event.type !== "mousedown") return;
  if (!$("lockOverlay").hidden || !$("loginOverlay").hidden) return;
  if (event.button === 4) {
    goForward();
    return;
  }
  if (document.fullscreenElement) { document.exitFullscreen(); return; }
  if (!$("modalRoot").hidden) { closeModal(); return; }
  if (!$("viewerOverlay").hidden) {
    if (VIEWER.gallery && VIEWER.gallery.fulled) { VIEWER.gallery.exit(); return; }
    closeViewer();
    return;
  }
  if (!$("contextMenu").hidden) { hideContextMenu(); return; }
  if (S.vaultMenuOpen) { closeVaultMenu(); return; }
  if (!$("uploadMenu").hidden) { $("uploadMenu").hidden = true; return; }
  goBack();
}
function applyHistory() {
  const snap = S.history[S.histIndex];
  if (!snap) return;
  S.navMode = snap.navMode;
  S.folder = snap.folder;
  S.tag = snap.tag;
  S.kind = snap.kind;
  S.starId = snap.starId || null;
  S.collection = snap.collection || null;
  S.watching = Boolean(snap.watching);
  S.favorite = snap.favorite;
  S.hiddenOnly = snap.navMode === "hidden";
  S.sort = snap.sort || S.sort;
  S.dir = snap.dir || S.dir;
  S.q = "";
  $("searchInput").value = "";
  S.selectedId = null;
  S.selectedFolderPath = null;
  S.selection.clear();
  S.selectionAnchor = null;
  renderSelection();
  S.starInfo = S.starId ? starById(S.starId) : null;
  updateSortArrows();
  renderSidebar();
  renderPreview();
  if (isStarCatalogue()) {
    renderItems();
    loadStars();
  } else loadItems({ reset: true });
  if (S.starId && !S.starInfo) loadStarInfo(S.starId);
}
function snapshot() {
  return {
    navMode: S.navMode, folder: S.folder, tag: S.tag, kind: S.kind,
    favorite: S.favorite, sort: S.sort, dir: S.dir, starId: S.starId,
    collection: S.collection, watching: S.watching
  };
}
function pushSnapshot() {
  S.history = S.history.slice(0, S.histIndex + 1);
  S.history.push(snapshot());
  if (S.history.length > 60) S.history.shift();
  S.histIndex = S.history.length - 1;
}
function resetHistory() {
  S.history = [];
  S.histIndex = -1;
  pushSnapshot();
}
function goUp() {
  if (S.starId) {
    navigateScope({ navMode: "stars", starId: null, q: "" });
    return;
  }
  if (S.collection || S.watching) {
    navigateScope({ navMode: "all", folder: "", tag: "", kind: "", q: "" });
    return;
  }
  if (S.folder) {
    const cut = S.folder.lastIndexOf("/");
    const parent = cut > 0 ? S.folder.slice(0, cut) : "";
    navigateScope({ navMode: "all", folder: parent });
    return;
  }
  if (!(S.tag || S.kind || S.q)) return;
  setScope({ navMode: S.navMode, folder: "", tag: "", kind: "", q: "" }, true);
}

/* -------------------------------------------------------------- preview */
function selectedItem() {
  if (S.selectedFolderPath) return null;
  return S.items.find((item) => item.id === S.selectedId) || null;
}
function selectedFolder() {
  return S.selectedFolderPath ? folderEntry(S.selectedFolderPath) : null;
}
function selectItem(id, options) {
  S.selectedId = id;
  S.selectedFolderPath = null;
  S.selection.clear();
  S.selectionAnchor = id;
  document.querySelectorAll(".row.selected, .tile.selected").forEach((node) => node.classList.remove("selected"));
  const node = document.querySelector(`.row[data-id="${id}"], .tile[data-id="${id}"]`);
  if (node) {
    node.classList.add("selected");
    if (options && options.scroll) node.scrollIntoView({ block: "nearest" });
  }
  renderSelection();
  renderPreview();
}
function selectFolderRow(path, options) {
  const entry = folderEntry(path);
  if (!entry) return;
  S.selectedId = null;
  S.selectedFolderPath = entry.folder;
  S.selection.clear();
  document.querySelectorAll(".row.selected, .tile.selected").forEach((node) => node.classList.remove("selected"));
  document.querySelectorAll(".row[data-folder], .tile[data-folder]").forEach((node) => {
    if (node.dataset.folder.toLowerCase() !== entry.folder.toLowerCase()) return;
    node.classList.add("selected");
    if (options && options.scroll) node.scrollIntoView({ block: "nearest" });
  });
  renderSelection();
  renderPreview();
}
function clearSelection() {
  S.selectedId = null;
  S.selectedFolderPath = null;
  S.selection.clear();
  S.selectionAnchor = null;
  document.querySelectorAll(".row.selected, .tile.selected").forEach((node) => node.classList.remove("selected"));
  renderSelection();
  renderPreview();
}
function renderSelection() {
  const bar = $("bulkBar");
  const count = S.selection.size;
  if (!count) {
    bar.hidden = true;
    return;
  }
  const loaded = S.items.filter((entry) => S.selection.has(entry.id));
  bar.hidden = false;
  $("bulkCount").textContent = `${count} selected`;
  $("bulkSize").textContent =
    loaded.length === count ? fmtSize(loaded.reduce((sum, entry) => sum + (entry.size || 0), 0)) : "";
  document.querySelectorAll(".row[data-id], .tile[data-id]").forEach((node) => {
    const id = Number(node.dataset.id);
    node.classList.toggle("selected", S.selection.has(id) || id === S.selectedId);
  });
}
function handleItemClick(id, event) {
  const ids = S.items.map((entry) => entry.id);
  if (event.shiftKey && S.selectionAnchor !== null) {
    const from = ids.indexOf(S.selectionAnchor);
    const to = ids.indexOf(id);
    if (from >= 0 && to >= 0) {
      const start = Math.min(from, to);
      const range = ids.slice(start, Math.max(from, to) + 1);
      if (event.ctrlKey || event.metaKey) {
        for (const rangeId of range) S.selection.add(rangeId);
      } else {
        S.selection = new Set(range);
      }
      S.selectedId = id;
      renderSelection();
      renderPreview();
      return;
    }
  }
  if (event.ctrlKey || event.metaKey) {
    if (S.selection.has(id)) S.selection.delete(id);
    else S.selection.add(id);
    S.selectedId = id;
    S.selectionAnchor = id;
    renderSelection();
    renderPreview();
    return;
  }
  selectItem(id);
}
function setPreviewNote(note, isFolder) {
  const block = $("previewNote");
  block.hidden = false;
  const text = $("previewNoteText");
  text.textContent = note || (isFolder ? "No note for this folder yet." : "No note for this file yet.");
  text.classList.toggle("note-empty", !note);
  $("noteBtn").textContent = note ? "Edit note" : "Add note";
}
function renderPreview() {
  const folder = selectedFolder();
  const item = folder ? null : selectedItem();
  const token = ++S.previewToken;
  const empty = $("previewEmpty");
  const body = $("previewBody");
  const media = $("previewMedia");
  if (!item && !folder) {
    empty.hidden = false;
    body.hidden = true;
    media.replaceChildren();
    $("previewMovie").hidden = true;
    $("previewMovie").replaceChildren();
    $("previewInspect").hidden = true;
    $("previewRevisions").hidden = true;
    return;
  }
  empty.hidden = true;
  body.hidden = false;
  if (folder) {
    renderFolderPreview(folder);
    return;
  }
  $("fileActions").hidden = false;
  $("folderActions").hidden = true;
  $("fileMore").hidden = false;
  $("folderMore").hidden = true;
  $("previewName").textContent = item.name;
  $("previewName").title = item.name;
  $("previewKind").textContent = `${item.kind_label || "File"}${item.mime ? ` · ${item.mime}` : ""}`;
  const meta = $("previewMeta");
  meta.replaceChildren();
  const addMeta = (label, value) => {
    meta.append(h("dt", { text: label }), h("dd", { text: value }));
  };
  addMeta("Size", fmtSize(item.size));
  addMeta("Modified", fmtDate(item.tg_date || item.added_at));
  if (item.width && item.height) addMeta("Dimensions", `${item.width} × ${item.height}`);
  if (item.duration) addMeta("Duration", fmtDuration(item.duration));
  addMeta("Folder", item.folder || "—");
  if (item.part_of && item.part_of.count > 1) {
    addMeta("Split parts", `${item.part_of.num} of ${item.part_of.count} · ${fmtSize(item.part_of.size)} complete file`);
  }
  if (item.added_at) addMeta("Added", fmtDate(item.added_at));
  addMeta("Message", `#${item.message_id}`);
  const tags = $("previewTags");
  tags.replaceChildren();
  for (const tag of item.tag_list || []) {
    const chip = h("button", { class: "tag-chip", type: "button" }, `#${tag}`);
    chip.addEventListener("click", () => navigateScope({ navMode: "all", tag }));
    tags.append(chip);
  }
  const starRow = $("previewStars");
  starRow.replaceChildren();
  for (const star of item.stars || []) starRow.append(starChip(star));
  starRow.hidden = !(item.stars && item.stars.length);
  $("favoriteBtn").textContent = item.favorite ? "Unfavorite" : "Favorite";
  $("thumbBtn").hidden = item.kind !== "video";
  $("movieBtn").hidden = !(item.kind === "video" || item.kind === "document");
  $("movieBtn").title = item.movie ? "Update the IMDb details saved for this file" : "Look up this file on IMDb";
  const viewable = Boolean(item.viewer);
  $("modelBtn").hidden = !viewable;
  $("cadBtn").hidden = !(item.family === "cad" || (item.family === "model" && !viewable));
  $("restoreBtn").hidden = !item.hidden;
  $("completeBtn").hidden = !(item.part_of && item.part_of.count > 1);
  const link = $("tgLink");
  if (item.telegram_link) {
    link.hidden = false;
    link.href = item.telegram_link;
  } else {
    link.hidden = true;
    link.removeAttribute("href");
  }
  setPreviewNote(item.note, false);
  renderMoviePanel(item);
  renderInspectBlock(item);
  loadRevisions(item, token);
  media.replaceChildren();
  renderInlinePreview(media, item, token);
}
function renderFolderPreview(folder) {
  $("fileActions").hidden = true;
  $("folderActions").hidden = false;
  $("fileMore").hidden = true;
  $("folderMore").hidden = false;
  $("previewMovie").hidden = true;
  $("previewMovie").replaceChildren();
  $("previewInspect").hidden = true;
  $("previewRevisions").hidden = true;
  $("previewStars").hidden = true;
  $("previewStars").replaceChildren();
  $("previewName").textContent = folder.name || folder.folder;
  $("previewName").title = folder.folder;
  $("previewKind").textContent =
    `Folder${folder.n ? ` · ${plural(folder.n, "file")} · ${fmtSize(folder.size)}` : " · Empty"}`;
  const meta = $("previewMeta");
  meta.replaceChildren();
  const addMeta = (label, value) => {
    meta.append(h("dt", { text: label }), h("dd", { text: value }));
  };
  addMeta("Location", folder.parent || "All files");
  addMeta("Direct files", String(folder.direct_n || 0));
  addMeta("Files inside", String(folder.n || 0));
  addMeta("Total size", fmtSize(folder.size || 0));
  const children = (S.nav.folders || []).filter(
    (entry) => (entry.parent || "").toLowerCase() === folder.folder.toLowerCase()
  );
  addMeta("Subfolders", String(children.length));
  const tags = $("previewTags");
  tags.replaceChildren();
  for (const child of children.slice(0, 8)) {
    const chip = h("button", { class: "tag-chip", type: "button", title: child.folder }, child.name || child.folder);
    chip.addEventListener("click", () => openFolder(child.folder));
    tags.append(chip);
  }
  setPreviewNote(folder.note, true);
  ensureFolderCovers([folder.folder]);
  const media = $("previewMedia");
  const grid = folderCoverGrid(folder);
  media.replaceChildren(
    grid
      ? h("div", { class: "folder-preview-covers" }, grid, folderIconBadge(folder))
      : h("div", { class: "folder-preview-large" },
          folder.icon
            ? h("span", { class: "folder-preview-emoji", text: folder.icon })
            : h("span", { class: "folder-preview-svg", html: svgRaw("folderOpen") })
        )
  );
}
function isPdf(item) {
  return (item.mime || "") === "application/pdf" || /\.pdf$/i.test(item.name || "");
}
function isText(item) {
  const mime = item.mime || "";
  return mime.startsWith("text/") || /\.(txt|md|markdown|json|csv|log|xml|yml|yaml|ini|cfg|conf|py|js|ts|css|html|htm|sh|bat|ps1|sql)$/i.test(item.name || "");
}
function isVideoMime(item) {
  return (item.mime || "").startsWith("video/");
}
function renderInlinePreview(container, item, token) {
  const kind = item.kind;
  if (kind === "image") {
    const image = h("img", { src: item.stream_url, alt: item.name, loading: "lazy" });
    container.append(image);
  } else if (kind === "gif" || (kind === "sticker" && isVideoMime(item))) {
    const video = h("video", { src: item.stream_url, autoplay: "", loop: "", muted: "", playsinline: "" });
    container.append(video);
  } else if (kind === "video") {
    const video = h("video", { src: item.stream_url, controls: "", preload: "metadata", playsinline: "" });
    if (item.thumb_url) video.poster = item.thumb_url;
    container.append(video);
  } else if (kind === "audio" || kind === "voice") {
    container.append(h("audio", { src: item.stream_url, controls: "", preload: "metadata" }));
  } else if (kind === "sticker") {
    container.append(h("img", { src: item.stream_url, alt: item.name, loading: "lazy" }));
  } else if (isPdf(item)) {
    container.append(h("iframe", { src: item.stream_url, title: item.name }));
  } else if (isText(item)) {
    const pre = h("pre", { class: "text-preview", text: "Loading preview…" });
    container.append(pre);
    fetch(`${item.stream_url}`, { headers: { Range: "bytes=0-65535" }, credentials: "same-origin" })
      .then((response) => response.text())
      .then((text) => {
        if (token !== S.previewToken) return;
        pre.textContent = text.length > 40000 ? `${text.slice(0, 40000)}\n\n… preview truncated` : text || "(empty file)";
      })
      .catch(() => { if (token === S.previewToken) pre.textContent = "Preview not available."; });
  } else {
    container.append(h("div", { class: "preview-file" }, fileIcon(kind), h("span", { text: "Preview isn’t available for this file type." }), h("span", { text: "Use Download or open it in Telegram." })));
  }
}
const VIEWER = {
  item: null,
  player: null,
  gallery: null,
  list: [],
  index: -1,
  token: 0,
  lastSave: 0,
  spriteTimer: null,
  spriteTries: 0,
  sprites: null,
  slideshow: null,
  slideshowDriven: false
};
const SLIDESHOW_MS = 4000;
function isVideoLike(item) {
  return Boolean(item) && (item.kind === "video" || item.kind === "gif" || (item.kind === "sticker" && isVideoMime(item)));
}
function viewerFamily(item) {
  const kind = item.kind || "";
  if (kind === "video") return (entry) => entry.kind === "video";
  if (kind === "audio" || kind === "voice") return (entry) => entry.kind === "audio" || entry.kind === "voice";
  if (kind === "image" || (kind === "sticker" && !isVideoMime(item))) {
    return (entry) => entry.kind === "image" || (entry.kind === "sticker" && !isVideoMime(entry));
  }
  return null;
}
function buildViewerList(item) {
  const family = viewerFamily(item);
  const list = family ? S.items.filter(family) : [];
  if (!list.some((entry) => entry.id === item.id)) list.push(item);
  return list;
}
function updateViewerBar() {
  const item = VIEWER.item;
  const list = VIEWER.list;
  $("viewerTitle").textContent = item ? item.name : "";
  $("viewerCounter").textContent = list.length > 1 ? `${VIEWER.index + 1} / ${list.length}` : "";
  $("viewerPrev").disabled = list.length < 2;
  $("viewerNext").disabled = list.length < 2;
  if (item) {
    $("viewerDownload").href = item.download_url;
    $("viewerDownload").setAttribute("download", "");
  }
  $("viewerMpv").hidden = !(item && (isVideoLike(item) || item.kind === "audio" || item.kind === "voice"));
}
function openViewerFor(item) {
  if (!item) return;
  if (item.viewer) { openModelViewer(item); return; }
  if (item.family === "cad" || item.family === "model") { openExternalItem(item); return; }
  stopHoverPreview();
  VIEWER.list = buildViewerList(item);
  VIEWER.index = Math.max(0, VIEWER.list.findIndex((entry) => entry.id === item.id));
  // The overlay must be visible before the player is built, or Video.js
  // measures a zero-height stage and stays invisible.
  $("viewerOverlay").hidden = false;
  showViewerItem(VIEWER.list[VIEWER.index]);
  $("viewerClose").focus();
}
function showViewerItem(item) {
  if (!item) return;
  saveViewerPosition(true);
  destroyViewerMedia();
  VIEWER.item = item;
  VIEWER.token += 1;
  VIEWER.spriteTries = 0;
  const token = VIEWER.token;
  const stage = $("viewerStage");
  stage.className = "viewer-stage";
  stage.replaceChildren();
  VIEWER.index = Math.max(0, VIEWER.list.findIndex((entry) => entry.id === item.id));
  updateViewerBar();
  if (isVideoLike(item)) initVideoViewer(item, token);
  else if (item.kind === "image" || item.kind === "sticker") initImageViewer(item, token);
  else if (item.kind === "audio" || item.kind === "voice") {
    stage.append(h("div", { class: "viewer-audio" },
      h("audio", { src: item.stream_url, controls: "", autoplay: "", preload: "metadata" })
    ));
  } else if (isPdf(item)) {
    stage.append(h("iframe", { src: item.stream_url, title: item.name }));
  } else if (isText(item)) {
    const pre = h("pre", { text: "Loading preview…" });
    stage.append(pre);
    fetch(item.stream_url, { headers: { Range: "bytes=0-262143" }, credentials: "same-origin" })
      .then((response) => response.text())
      .then((text) => { if (token === VIEWER.token) pre.textContent = text.length > 150000 ? `${text.slice(0, 150000)}\n\n… preview truncated` : text; })
      .catch(() => { if (token === VIEWER.token) pre.textContent = "Preview not available."; });
  } else {
    stage.append(h("div", { class: "viewer-file" }, fileIcon(item.kind), h("div", { text: item.name }), h("div", { class: "preview-kind", text: "Preview isn’t available for this file type. Use the download button above." })));
  }
}
function initVideoViewer(item, token) {
  const stage = $("viewerStage");
  const isGif = item.kind === "gif";
  stage.classList.add("video");
  const element = h("video-js", {
    id: "tfePlayer",
    class: "video-js vjs-tfe",
    controls: "",
    autoplay: "",
    playsinline: "",
    preload: "metadata"
  });
  element.append(h("source", { src: item.stream_url, type: item.mime || "video/mp4" }));
  stage.append(element);
  const player = videojs(element, {
    autoplay: true,
    controls: true,
    fill: true,
    fluid: false,
    preload: "metadata",
    playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
    poster: item.thumb_url || "",
    controlBar: { pictureInPictureToggle: true }
  });
  VIEWER.player = player;
  // The sprite thumbnails plugin only reads its state on the media's own
  // loadstart/loadedmetadata, so it has to exist before those fire — long
  // before the preview sheet is ready. The URL is swapped in later.
  VIEWER.sprites = null;
  if (!isGif) {
    try {
      VIEWER.sprites = player.spriteThumbnails({
        url: `/api/storyboard/${item.id}/sprite.jpg?v=${Number(item.thumb_version) || 0}`,
        width: 160,
        height: 90,
        columns: 5,
        rows: 6,
        interval: 3,
        downlink: 0,
        responsive: false
      });
    } catch (_) {
      /* previews are optional */
    }
  }
  if (isGif) {
    player.loop(true);
    player.muted(true);
  }
  player.one("loadedmetadata", () => {
    if (token !== VIEWER.token) return;
    const start = Number(item.play_pos || 0);
    const duration = Number(player.duration() || 0);
    if (!isGif && start > 3 && (!duration || start < duration - 3)) {
      player.currentTime(start);
      toast(`Resumed at ${fmtDuration(start)}`, "info", 2200);
    }
    if (!isGif) loadStoryboard(item, token);
  });
  player.on("timeupdate", () => {
    if (token !== VIEWER.token || isGif || player.paused()) return;
    const now = Date.now();
    if (now - VIEWER.lastSave < 5000) return;
    VIEWER.lastSave = now;
    queueViewerPosition(item, player.currentTime(), player.duration());
  });
  player.on("pause", () => { if (token === VIEWER.token && !isGif) saveViewerPosition(true); });
  player.on("ended", () => {
    if (token !== VIEWER.token || isGif) return;
    item.play_pos = 0;
    queueViewerPosition(item, 0, player.duration());
  });
  player.on("error", () => {
    if (token === VIEWER.token) showViewerFallback(item);
  });
  player.ready(() => {
    if (token !== VIEWER.token) return;
    try { const playing = player.play(); if (playing && playing.catch) playing.catch(() => {}); } catch (_) {}
    try { player.focus({ preventScroll: true }); } catch (_) {}
  });
}
function initImageViewer(item, token) {
  const stage = $("viewerStage");
  stage.classList.add("image");
  const images = VIEWER.list.filter((entry) => entry.kind === "image" || entry.kind === "sticker");
  if (!images.some((entry) => entry.id === item.id)) images.push(item);
  const gallery = h("div", { class: "viewer-gallery" });
  for (const entry of images) {
    gallery.append(h("img", {
      src: entry.thumb_url || entry.stream_url,
      "data-original": entry.stream_url,
      alt: entry.name,
      "data-id": String(entry.id)
    }));
  }
  stage.append(gallery);
  const start = Math.max(0, images.findIndex((entry) => entry.id === item.id));
  const toolbar = {
    zoomIn: 1, zoomOut: 1, oneToOne: 1, reset: 1,
    rotateLeft: 1, rotateRight: 1, flipHorizontal: 1, flipVertical: 1
  };
  if (images.length > 1) {
    Object.assign(toolbar, {
      prev: 1,
      play: {
        // Viewer.js's own play() loads every image up front, which is far too
        // much for Telegram streams, so the button drives the app-level timer.
        click(event) { toggleViewerSlideshow(event.currentTarget); }
      },
      next: 1
    });
  }
  const galleryViewer = new Viewer(gallery, {
    inline: true,
    zIndexInline: 45,
    navbar: images.length > 1 ? { show: true, position: "bottom" } : false,
    title: false,
    button: false,
    toolbar,
    keyboard: false,
    focus: false,
    transition: false,
    backdrop: false,
    loading: true,
    loop: true,
    initialViewIndex: start,
    url(image) { return image.getAttribute("data-original") || image.src; }
  });
  VIEWER.gallery = galleryViewer;
  gallery.addEventListener("view", (event) => {
    if (token !== VIEWER.token) return;
    if (!VIEWER.slideshowDriven) stopViewerSlideshow();
    const index = event.detail ? Number(event.detail.index) : 0;
    const entry = images[index];
    if (!entry) return;
    VIEWER.item = entry;
    VIEWER.index = Math.max(0, VIEWER.list.findIndex((candidate) => candidate.id === entry.id));
    updateViewerBar();
  });
}
function showViewerFallback(item) {
  const stage = $("viewerStage");
  destroyViewerMedia();
  stage.className = "viewer-stage";
  stage.replaceChildren(h("div", { class: "viewer-fallback" },
    fileIcon(item.kind),
    h("h3", { text: "This format can’t play here" }),
    h("p", { text: "MKV, HEVC and some other formats need a different decoder. mpv plays this same Telegram stream in its own window." }),
    h("button", { class: "btn primary", type: "button", text: "Open in mpv", onclick: () => openInMpv(item) })
  ));
}
function queueViewerPosition(item, position, duration) {
  if (!item) return;
  const body = { position: Number(position) || 0, duration: Number(duration) || 0 };
  item.play_pos = body.position;
  fetch(`/api/items/${item.id}/position`, {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "Content-Type": "application/json", "X-TFE": "1" },
    body: JSON.stringify(body)
  }).catch(() => {});
}
function saveViewerPosition(force) {
  const player = VIEWER.player;
  const item = VIEWER.item;
  if (!player || !item) return;
  if (!force && player.paused()) return;
  const position = Number(player.currentTime() || 0);
  if (position < 2) return;
  queueViewerPosition(item, position, player.duration());
}
function playButton() {
  return document.querySelector("#viewerStage .viewer-toolbar > ul > .viewer-play");
}
function stopViewerSlideshow() {
  if (VIEWER.slideshow) { clearInterval(VIEWER.slideshow); VIEWER.slideshow = null; }
  const button = playButton();
  if (button) button.classList.remove("viewer-playing");
}
function toggleViewerSlideshow(button) {
  if (VIEWER.slideshow) { stopViewerSlideshow(); return; }
  const viewer = VIEWER.gallery;
  if (!viewer || !viewer.images || viewer.images.length < 2) return;
  if (button) button.classList.add("viewer-playing");
  VIEWER.slideshow = setInterval(() => {
    const current = VIEWER.gallery;
    if (!current) { stopViewerSlideshow(); return; }
    VIEWER.slideshowDriven = true;
    current.view((current.index + 1) % current.images.length);
    VIEWER.slideshowDriven = false;
  }, SLIDESHOW_MS);
}
function destroyViewerMedia() {
  stopViewerSlideshow();
  if (VIEWER.spriteTimer) { clearTimeout(VIEWER.spriteTimer); VIEWER.spriteTimer = null; }
  VIEWER.sprites = null;
  if (VIEWER.gallery) { try { VIEWER.gallery.destroy(); } catch (_) {} VIEWER.gallery = null; }
  if (VIEWER.player) { try { VIEWER.player.dispose(); } catch (_) {} VIEWER.player = null; }
  $("viewerPreviews").hidden = true;
}
function closeViewer() {
  saveViewerPosition(true);
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  destroyViewerMedia();
  VIEWER.item = null;
  $("viewerStage").className = "viewer-stage";
  $("viewerStage").replaceChildren();
  $("viewerOverlay").hidden = true;
}
function stepViewer(step) {
  if (VIEWER.gallery) {
    if (step > 0) VIEWER.gallery.next();
    else VIEWER.gallery.prev();
    return;
  }
  const next = VIEWER.index + step;
  if (next < 0 || next >= VIEWER.list.length) return;
  showViewerItem(VIEWER.list[next]);
}
async function loadStoryboard(item, token) {
  if (token !== VIEWER.token) return;
  let data = null;
  try { data = await api(`/api/storyboard/${item.id}`); } catch (_) { return; }
  if (!data || token !== VIEWER.token) return;
  if (data.state === "ready") { attachSprite(data); return; }
  if (data.state === "missing-tool") { $("viewerPreviews").hidden = false; return; }
  if (data.state === "pending" && VIEWER.spriteTries < 40) {
    VIEWER.spriteTries += 1;
    VIEWER.spriteTimer = setTimeout(() => loadStoryboard(item, token), 3000);
  }
}
function attachSprite(data) {
  const sprites = VIEWER.sprites;
  if (!sprites || !sprites.options) return;
  sprites.options.url = data.url;
  sprites.options.interval = Number(data.interval) || 3;
  sprites.options.columns = Number(data.columns) || 5;
  sprites.options.rows = Number(data.rows) || 6;
  sprites.options.width = Number(data.width) || 160;
  sprites.options.height = Number(data.height) || 90;
}
function viewerTime(item) {
  if (VIEWER.player && VIEWER.item && VIEWER.item.id === item.id) {
    return Number(VIEWER.player.currentTime() || 0);
  }
  return Number(item.play_pos || 0);
}
async function openInMpv(item) {
  if (!item) return;
  let tools = null;
  try { tools = await api("/api/tools"); } catch (_) {}
  const mpv = tools && tools.mpv;
  if (!mpv || !mpv.installed) {
    promptInstallTool("mpv", () => openInMpv(item));
    return;
  }
  try {
    await api(`/api/items/${item.id}/mpv`, { method: "POST", body: { position: viewerTime(item) } });
    toast("Opening in mpv…", "info", 2500);
  } catch (error) {
    toast(error.message, "error", 6000);
  }
}
function promptInstallTool(tool, after) {
  const label = tool === "mpv" ? "mpv player" : tool === "ffmpeg" ? "ffmpeg previews" : tool;
  const size = tool === "mpv" ? 32 * 1024 * 1024 : 26 * 1024 * 1024;
  const note = h("p", { class: "modal-note", text: `It downloads once (about ${fmtSize(size)}) from the official GitHub release and is verified before use.` });
  let timer = null;
  const stop = () => { if (timer) clearInterval(timer); timer = null; };
  openModal({
    title: `Install ${label}`,
    subtitle: "Optional tool, stored on this PC only",
    content: h("div", {},
      h("p", { text: "The app downloads the tool, checks its checksum, and uses it locally. Nothing is uploaded." }),
      note
    ),
    actions: [
      { label: "Cancel", onClick: () => { stop(); closeModal(); } },
      {
        label: "Download",
        class: "primary",
        onClick: (setBusy) => new Promise((resolve) => {
          setBusy(true);
          note.textContent = "Starting the download…";
          api(`/api/tools/${tool}/install`, { method: "POST" }).then(() => {
            timer = setInterval(async () => {
              let data = null;
              try { data = await api("/api/tools"); } catch (_) { return; }
              const state = data && data[tool];
              if (!state) return;
              if (state.installed) {
                stop(); setBusy(false); closeModal(); after(); resolve();
              } else if (state.state === "error") {
                stop(); setBusy(false);
                note.textContent = state.error || "The download failed.";
                resolve();
              } else if (state.state === "extracting") {
                note.textContent = "Unpacking…";
              } else {
                note.textContent = `Downloading… ${Math.round((state.progress || 0) * 100)}%`;
              }
            }, 900);
          }).catch((error) => {
            setBusy(false);
            note.textContent = error.message;
            resolve();
          });
        })
      }
    ]
  });
}
function downloadItem(item) {
  if (!item) return;
  const link = h("a", { href: item.download_url, download: "" });
  document.body.append(link);
  link.click();
  link.remove();
}
function promptReupload(item) {
  openModal({
    title: "Fix video streaming?",
    content: h("div", {},
      h("p", { text: "The file is downloaded from Telegram, sent again as a video or audio file so it can stream, and the old copy is removed. Large files take a while." }),
      h("p", { class: "modal-note", text: `${item.name} — ${fmtSize(item.size || 0)}` })
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Re-upload",
        onClick: async () => {
          try {
            await api(`/api/items/${item.id}/reupload`, { method: "POST" });
            closeModal();
            toast("Re-uploading so the video can stream — see Transfers.", "success", 6000);
            showUploadPanel();
            startTransferPolling();
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
}
async function startMergeDownload(item) {
  if (!item || !item.part_of) return;
  try {
    await api("/api/merge", { method: "POST", body: { item_id: item.id } });
    toast(`Downloading ${plural(item.part_of.count, "part")} of ${item.part_of.base} — see Transfers.`, "success", 5000);
    showUploadPanel();
    startTransferPolling();
    await fetchTransfers(false);
  } catch (error) {
    toast(error.message, "error", 6000);
  }
}

/* ------------------------------------------------------------------- stars */
let starSeq = 0;
function isStarCatalogue() {
  return S.navMode === "stars" && !S.starId;
}
function reloadCurrentList() {
  if (isStarCatalogue()) loadStars();
  else loadItems({ reset: true });
}
function starById(id) {
  return (S.stars || []).find((star) => Number(star.id) === Number(id)) || null;
}
function currentStar() {
  if (!S.starId) return null;
  if (S.starInfo && Number(S.starInfo.id) === Number(S.starId)) return S.starInfo;
  return starById(S.starId);
}
function starChip(star) {
  const chip = h("button", {
    class: "star-chip",
    type: "button",
    title: `Open ${star.name}`,
    "data-star": String(star.id)
  }, iconNode("user", "star-chip-icon"), h("span", { text: star.name }));
  chip.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openStar(Number(star.id));
  });
  return chip;
}
function tileStarsBadge(stars) {
  const badge = h("button", {
    class: "tile-badge tile-stars",
    type: "button",
    title: stars.map((star) => star.name).join(", "),
    "data-star": String(stars[0].id)
  }, iconNode("user", "tile-star-icon"), h("span", { text: stars.length === 1 ? stars[0].name : String(stars.length) }));
  badge.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (stars.length === 1) openStar(Number(stars[0].id));
    else showStarsMenu(event, stars);
  });
  return badge;
}
function showStarsMenu(event, stars) {
  showContextMenu(event.clientX, event.clientY, stars.map((star) => ({
    label: star.name, icon: "user", onClick: () => openStar(Number(star.id))
  })));
}
function openStar(id) {
  if (!id) return;
  const cached = starById(id);
  if (cached) S.starInfo = cached;
  else if (S.starInfo && Number(S.starInfo.id) !== Number(id)) S.starInfo = null;
  navigateScope({ navMode: "stars", starId: Number(id), folder: "", tag: "", kind: "", q: "" });
}
async function loadStars() {
  const seq = ++starSeq;
  const params = new URLSearchParams();
  if (S.q) params.set("q", S.q);
  try {
    const data = await api(`/api/stars?${params.toString()}`);
    if (seq !== starSeq) return;
    S.stars = data.stars || [];
    S.starTotal = data.total || S.stars.length;
    if (isStarCatalogue()) {
      renderItems();
      updateStatusCounts();
    }
  } catch (error) {
    toast(error.message, "error");
  }
}
async function loadStarInfo(id) {
  try {
    const star = await api(`/api/stars/${id}`);
    if (Number(S.starId) !== Number(id)) return;
    S.starInfo = star;
    const index = (S.stars || []).findIndex((entry) => Number(entry.id) === Number(star.id));
    if (index >= 0) S.stars[index] = star;
    renderStarBanner();
    updateBreadcrumb();
  } catch (error) {
    toast(error.message, "error");
    if (error.status === 404) navigateScope({ navMode: "stars", starId: null, q: "" });
  }
}
function renderStarCatalogue() {
  const grid = $("starGrid");
  grid.replaceChildren();
  const stars = S.stars || [];
  const empty = $("starEmpty");
  empty.hidden = stars.length > 0;
  $("starEmptyTitle").textContent = S.q ? `No stars match “${S.q}”` : "No stars yet";
  $("starEmptyText").textContent = S.q
    ? "Try another name, or clear the search."
    : "Create a star, then assign files from a file’s Stars menu or the bulk bar.";
  for (const star of stars) {
    const card = h("button", {
      class: "star-card",
      type: "button",
      title: star.name,
      "data-star": String(star.id)
    });
    const portrait = h("span", { class: "star-portrait" });
    if (star.image_url) {
      const image = h("img", { src: star.image_url, alt: "", loading: "lazy" });
      image.addEventListener("error", () => {
        image.remove();
        portrait.classList.add("initial");
        portrait.textContent = initials(star.name);
      });
      portrait.append(image);
    } else {
      portrait.classList.add("initial");
      portrait.textContent = initials(star.name);
    }
    const metaBits = [];
    if (star.birthdate) metaBits.push(String(star.birthdate).slice(0, 4));
    if (star.country) metaBits.push(star.country);
    if (star.height) metaBits.push(star.height);
    const body = h("span", { class: "star-card-body" },
      h("span", { class: "star-name", text: star.name }),
      metaBits.length ? h("span", { class: "star-meta", text: metaBits.join(" · ") }) : null,
      h("span", { class: "star-counts", text: `${plural(star.videos || 0, "video")} · ${plural(star.images || 0, "image")}` })
    );
    card.append(portrait, body);
    if (star.favorite) card.append(h("span", { class: "star-fav", html: svgRaw("starFilled") }));
    grid.append(card);
  }
}
function renderStarBanner() {
  const banner = $("starBanner");
  const star = currentStar();
  if (!star) {
    banner.hidden = true;
    banner.replaceChildren();
    return;
  }
  banner.hidden = false;
  const portrait = h("div", { class: "star-portrait large" });
  if (star.image_url) {
    const image = h("img", { src: star.image_url, alt: "", loading: "lazy" });
    image.addEventListener("error", () => {
      image.remove();
      portrait.classList.add("initial");
      portrait.textContent = initials(star.name);
    });
    portrait.append(image);
  } else {
    portrait.classList.add("initial");
    portrait.textContent = initials(star.name);
  }
  const fav = h("button", {
    class: "icon-btn star-fav-btn" + (star.favorite ? " active" : ""),
    type: "button",
    title: star.favorite ? "Remove from favorites" : "Add to favorites",
    html: svgRaw(star.favorite ? "starFilled" : "star")
  });
  fav.addEventListener("click", async () => {
    try {
      const updated = await api(`/api/stars/${star.id}`, { method: "PATCH", body: { favorite: !star.favorite } });
      S.starInfo = updated;
      const index = (S.stars || []).findIndex((entry) => Number(entry.id) === Number(updated.id));
      if (index >= 0) S.stars[index] = updated;
      renderStarBanner();
    } catch (error) { toast(error.message, "error"); }
  });
  const facts = [
    ["Birthday", star.birthdate],
    ["Country", star.country],
    ["Height", star.height],
    ["Hair", star.hair],
    ["Eyes", star.eyes],
    ["Measurements", star.measurements],
    ["Tattoos", star.tattoos],
    ["Piercings", star.piercings],
    ["Aliases", star.aliases]
  ].filter(([, value]) => String(value || "").trim());
  const dl = h("dl", { class: "star-facts" });
  for (const [label, value] of facts) dl.append(h("dt", { text: label }), h("dd", { text: value }));
  const counts = `${plural(star.n || 0, "file")} · ${plural(star.videos || 0, "video")} · ${plural(star.images || 0, "image")} · ${fmtSize(star.total_size || 0)}`;
  const actions = h("div", { class: "star-banner-actions" },
    btn("Edit details", "btn", () => promptStarEditor(star)),
    btn("Look up online", "btn", () => promptStarLookup(star)),
    btn("Portrait", "btn", () => promptStarPortrait(star)),
    btn("All stars", "link-btn", () => navigateScope({ navMode: "stars", starId: null, q: "" }))
  );
  banner.replaceChildren(h("div", { class: "star-banner-inner" },
    portrait,
    h("div", { class: "star-banner-main" },
      h("div", { class: "star-banner-head" }, h("h2", { text: star.name }), fav),
      h("div", { class: "star-banner-counts", text: counts }),
      dl,
      star.note ? h("p", { class: "star-note", text: star.note }) : null,
      actions
    )
  ));
}
function openStarMenu(event, star) {
  event.preventDefault();
  event.stopPropagation();
  showContextMenu(event.clientX, event.clientY, [
    { label: "Open star page", icon: "user", onClick: () => openStar(star.id) },
    { separator: true },
    { label: "Edit details…", icon: "edit", onClick: () => promptStarEditor(star) },
    { label: "Look up online…", icon: "search", onClick: () => promptStarLookup(star) },
    { label: "Change portrait…", icon: "image", onClick: () => promptStarPortrait(star) },
    { separator: true },
    { label: "Delete star…", icon: "trash", danger: true, onClick: () => confirmDeleteStar(star) }
  ]);
}
async function afterStarChange(star) {
  if (star) {
    if (S.starInfo && Number(S.starInfo.id) === Number(star.id)) S.starInfo = star;
    const index = (S.stars || []).findIndex((entry) => Number(entry.id) === Number(star.id));
    if (index >= 0) S.stars[index] = star;
    else S.stars.push(star);
  }
  await loadNav();
  if (isStarCatalogue()) {
    renderStarCatalogue();
    return;
  }
  if (S.starId) {
    renderStarBanner();
    await loadItems({ reset: true });
    if (S.selectedId !== null) renderPreview();
    return;
  }
  await loadItems({ reset: true });
}
function starField(key, label, star, options, hint) {
  const opts = options || {};
  let input;
  if (opts.textarea) {
    input = h("textarea", { class: "note-input", rows: String(opts.rows || 4), maxlength: String(opts.max || 4000) });
  } else {
    input = inputEl({ type: "text", maxlength: String(opts.max || 160), autocomplete: "off" });
  }
  input.value = star ? String(star[key] || "") : "";
  return field(label, input, hint);
}
function starFieldInput(container) {
  return container.querySelector("input, textarea");
}
function promptStarEditor(star) {
  const editing = Boolean(star);
  const name = starField("name", "Name", star, { max: 80 }, "The stage name shown in the catalogue.");
  const aliases = starField("aliases", "Also known as", star, { max: 160 }, "Comma-separated aliases. Search matches these too.");
  const country = starField("country", "Country", star, { max: 80 });
  const birthdate = starField("birthdate", "Birthday", star, { max: 40 }, "YYYY-MM-DD, or just a year.");
  const height = starField("height", "Height", star, { max: 40 });
  const hair = starField("hair", "Hair", star, { max: 40 });
  const eyes = starField("eyes", "Eyes", star, { max: 40 });
  const measurements = starField("measurements", "Measurements", star, { max: 80 });
  const tattoos = starField("tattoos", "Tattoos", star, { textarea: true, rows: 3, max: 1000 });
  const piercings = starField("piercings", "Piercings", star, { max: 200 });
  const note = starField("note", "Note", star, { textarea: true, rows: 5, max: 4000 });
  const fields = { name, aliases, country, birthdate, height, hair, eyes, measurements, tattoos, piercings, note };
  const content = h("div", { class: "star-editor" },
    name,
    aliases,
    h("div", { class: "star-editor-row" }, country, birthdate),
    h("div", { class: "star-editor-row" }, height, hair, eyes),
    measurements,
    tattoos,
    piercings,
    note
  );
  const actions = [{ label: "Cancel", onClick: closeModal }];
  if (editing) {
    actions.push({ label: "Delete", class: "danger", onClick: () => { closeModal(); confirmDeleteStar(star); } });
  }
  actions.push({
    label: editing ? "Save" : "Create star",
    class: "primary",
    onClick: async (setBusy) => {
      const body = {};
      for (const [key, wrapper] of Object.entries(fields)) {
        const input = starFieldInput(wrapper);
        body[key] = input ? input.value.trim() : "";
      }
      if (!body.name) { toast("A star needs a name.", "error"); starFieldInput(name).focus(); return; }
      setBusy(true);
      try {
        const saved = editing
          ? await api(`/api/stars/${star.id}`, { method: "PATCH", body })
          : await api("/api/stars", { method: "POST", body });
        closeModal();
        toast(editing ? "Star details saved." : `Created ${saved.name}.`, "success");
        S.starInfo = saved;
        await afterStarChange(saved);
        if (!editing) openStar(saved.id);
      } catch (error) {
        toast(error.message, "error");
      } finally {
        setBusy(false);
      }
    }
  });
  openModal({
    title: editing ? "Edit star" : "New star",
    subtitle: editing ? star.name : undefined,
    wide: true,
    content,
    actions
  });
}
function confirmDeleteStar(star) {
  if (!star) return;
  openModal({
    title: "Delete star",
    subtitle: star.name,
    content: h("div", {},
      h("p", { text: `Remove ${star.name} from the catalogue?` }),
      h("p", { class: "modal-note", text: "Files stay in the library. Only the star page, its details and its assignments are deleted." })
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Delete star",
        class: "danger",
        onClick: async () => {
          try {
            await api(`/api/stars/${star.id}`, { method: "DELETE" });
            closeModal();
            S.stars = (S.stars || []).filter((entry) => Number(entry.id) !== Number(star.id));
            toast("Star deleted.", "success");
            if (Number(S.starId) === Number(star.id)) {
              S.starInfo = null;
              navigateScope({ navMode: "stars", starId: null, q: "" });
            } else {
              await afterStarChange();
            }
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
}
function promptStarLookup(star) {
  if (!star) return;
  const overwrite = inputEl({ type: "checkbox" });
  const status = h("p", { class: "modal-note", text: "IAFD is checked first, then Wikipedia. This needs an internet connection." });
  const overwriteRow = h("label", { class: "check" },
    overwrite,
    h("span", {},
      h("strong", { text: "Overwrite existing fields" }),
      h("small", { text: "Leave off to fill only the empty fields and add missing aliases." })
    )
  );
  openModal({
    title: "Look up details online",
    subtitle: star.name,
    content: h("div", {},
      status,
      overwriteRow
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Search online",
        class: "primary",
        onClick: async (setBusy) => {
          setBusy(true);
          status.textContent = "Searching IAFD…";
          try {
            const data = await api(`/api/stars/${star.id}/lookup`, {
              method: "POST",
              body: { overwrite: overwrite.checked }
            });
            const applied = data.applied || [];
            closeModal();
            const source = data.source || "the web";
            const extra = data.image ? " and set the portrait" : "";
            toast(
              applied.length
                ? `Updated ${plural(applied.length, "field")} from ${source}${extra}.`
                : `Found ${data.title || star.name} on ${source}, but every field was already filled.`,
              "success",
              6000
            );
            S.starInfo = data.star;
            await afterStarChange(data.star);
          } catch (error) {
            status.textContent = error.message;
            toast(error.message, "error", 8000);
          } finally {
            setBusy(false);
          }
        }
      }
    ]
  });
}
function promptStarPortrait(star) {
  if (!star) return;
  const file = h("input", { type: "file", accept: "image/jpeg,image/png,image/gif,image/webp", hidden: "" });
  const status = h("p", { class: "modal-note", text: "Upload a picture, or click a thumbnail from this star’s files." });
  const grid = h("div", { class: "star-portrait-grid" });
  const upload = btn("Upload image…", "btn", () => file.click());
  file.addEventListener("change", async () => {
    const chosen = file.files && file.files[0];
    file.value = "";
    if (!chosen) return;
    if (chosen.size > 12 * 1024 * 1024) { toast("Choose an image under 12 MB.", "error"); return; }
    const form = new FormData();
    form.append("file", chosen, chosen.name || "portrait.jpg");
    status.textContent = "Uploading portrait…";
    try {
      const updated = await api(`/api/stars/${star.id}/image`, { method: "POST", form });
      closeModal();
      toast("Portrait updated.", "success");
      await afterStarChange(updated);
    } catch (error) {
      status.textContent = "Upload failed.";
      toast(error.message, "error");
    }
  });
  openModal({
    title: "Star portrait",
    subtitle: star.name,
    wide: true,
    content: h("div", {}, status, h("div", { class: "star-portrait-actions" }, upload), file, grid),
    actions: [{ label: "Close", onClick: closeModal }]
  });
  api(`/api/items?star=${star.id}&limit=60&sort=date&direction=desc`)
    .then((data) => {
      if (!grid.isConnected) return;
      const items = (data.items || []).filter((entry) => entry.has_thumb);
      if (!items.length) {
        grid.append(h("p", { class: "modal-note", text: "This star has no file thumbnails yet — upload a picture instead." }));
        return;
      }
      grid.append(h("p", { class: "star-portrait-hint", text: "Thumbnails from this star’s files" }));
      for (const item of items) {
        const tile = h("button", { class: "star-portrait-choice", type: "button", title: item.name },
          h("img", { src: item.thumb_url, alt: "", loading: "lazy" })
        );
        tile.addEventListener("click", async () => {
          try {
            const updated = await api(`/api/stars/${star.id}/image/from-item`, {
              method: "POST",
              body: { item_id: item.id }
            });
            closeModal();
            toast("Portrait updated.", "success");
            await afterStarChange(updated);
          } catch (error) { toast(error.message, "error"); }
        });
        grid.append(tile);
      }
    })
    .catch(() => {});
}
async function promptStars(item) {
  const bulk = !item;
  if (bulk && !S.selection.size) return;
  let stars = [];
  try {
    const suffix = item ? `?item=${item.id}` : "";
    const data = await api(`/api/stars${suffix}`);
    stars = data.stars || [];
  } catch (error) {
    toast(error.message, "error");
    return;
  }
  const chosen = new Set(stars.filter((star) => star.assigned).map((star) => Number(star.id)));
  const list = h("div", { class: "star-pick-list" });
  const search = inputEl({ type: "search", class: "star-pick-search", placeholder: "Search stars", autocomplete: "off" });
  const empty = h("p", { class: "modal-note", text: "No stars match. Create one below." });
  const renderList = () => {
    const term = search.value.trim().toLowerCase();
    list.replaceChildren();
    const shown = stars.filter((star) => !term
      || String(star.name || "").toLowerCase().includes(term)
      || String(star.aliases || "").toLowerCase().includes(term));
    if (!shown.length) {
      empty.textContent = stars.length ? "No stars match that search." : "No stars yet. Create one below.";
      list.append(empty);
      return;
    }
    for (const star of shown) {
      const picked = chosen.has(Number(star.id));
      const row = h("button", { class: "star-pick" + (picked ? " selected" : ""), type: "button" });
      const portrait = h("span", { class: "star-pick-portrait" });
      if (star.image_url) portrait.append(h("img", { src: star.image_url, alt: "", loading: "lazy" }));
      else { portrait.classList.add("initial"); portrait.textContent = initials(star.name); }
      row.append(
        portrait,
        h("span", { class: "star-pick-body" },
          h("span", { class: "star-pick-name", text: star.name }),
          h("span", { class: "star-pick-meta", text: `${plural(star.videos || 0, "video")} · ${plural(star.images || 0, "image")}` })
        ),
        h("span", { class: "star-pick-check", html: picked ? svgRaw("check") : "" })
      );
      row.addEventListener("click", () => {
        const id = Number(star.id);
        if (chosen.has(id)) chosen.delete(id);
        else chosen.add(id);
        renderList();
      });
      list.append(row);
    }
  };
  search.addEventListener("input", renderList);
  renderList();
  const createName = inputEl({ type: "text", placeholder: "New star name", maxlength: "80", autocomplete: "off" });
  const create = btn("Create", "btn", async () => {
    const name = createName.value.trim();
    if (!name) { toast("Enter a name for the new star.", "error"); createName.focus(); return; }
    try {
      const created = await api("/api/stars", { method: "POST", body: { name } });
      stars.push(created);
      chosen.add(Number(created.id));
      createName.value = "";
      renderList();
      toast(`Created ${created.name}. Save to assign it.`, "success", 5000);
    } catch (error) { toast(error.message, "error"); }
  });
  createName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); create.click(); }
  });
  const content = h("div", {},
    h("p", { class: "modal-note", text: bulk
      ? `Tick every star that appears in the ${plural(S.selection.size, "selected file")}.`
      : "Tick every star that appears in this file." }),
    search,
    list,
    h("div", { class: "star-pick-new" }, createName, create)
  );
  openModal({
    title: bulk ? "Assign stars" : "Stars in this file",
    subtitle: bulk ? undefined : item.name,
    wide: true,
    content,
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Save",
        class: "primary",
        onClick: async (setBusy) => {
          setBusy(true);
          try {
            if (bulk) {
              if (!chosen.size) { toast("Choose at least one star.", "error"); return; }
              const data = await api("/api/items/stars", {
                method: "POST",
                body: { item_ids: Array.from(S.selection), star_ids: Array.from(chosen) }
              });
              clearSelection();
              toast(`Added ${plural(data.files, "file")} to ${plural(data.stars, "star")}.`, "success");
            } else {
              await api(`/api/items/${item.id}/stars`, {
                method: "PUT",
                body: { star_ids: Array.from(chosen) }
              });
              toast("Stars saved for this file.", "success");
            }
            closeModal();
            await Promise.all([loadNav(), loadItems({ reset: true })]);
            if (!bulk && S.items.some((entry) => entry.id === item.id)) selectItem(item.id);
            if (S.navMode === "stars") {
              if (S.starId) loadStarInfo(S.starId);
              else loadStars();
            }
          } catch (error) {
            toast(error.message, "error");
          } finally {
            setBusy(false);
          }
        }
      }
    ]
  });
  search.focus();
}

/* ------------------------------------------------------------------ movies */
function movieRuntime(seconds) {
  const total = Math.round(Number(seconds) || 0);
  if (!total) return "";
  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}
function movieVotes(count) {
  const value = Number(count) || 0;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return value ? String(value) : "";
}
function renderMoviePanel(item) {
  const panel = $("previewMovie");
  panel.replaceChildren();
  const movie = item && item.movie;
  if (!movie || !movie.title) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const head = h("div", { class: "movie-head" });
  if (item.movie_poster_url) {
    head.append(h("div", { class: "movie-poster" }, h("img", { src: item.movie_poster_url, alt: "", loading: "lazy" })));
  }
  const facts = [];
  if (movie.rating) facts.push(`★ ${Number(movie.rating).toFixed(1)}`);
  if (movie.votes) facts.push(`${movieVotes(movie.votes)} votes`);
  const runtime = movieRuntime(movie.runtime);
  if (runtime) facts.push(runtime);
  if (movie.year) facts.push(String(movie.year));
  const genres = (movie.genres || []).filter(Boolean);
  head.append(h("div", { class: "movie-title-block" },
    h("div", { class: "movie-title", text: movie.title, title: movie.title }),
    facts.length ? h("div", { class: "movie-facts", text: facts.join(" · ") }) : null,
    genres.length
      ? h("div", { class: "movie-genres" }, ...genres.map((genre) => h("span", { class: "movie-genre", text: genre })))
      : null
  ));
  const credits = h("dl", { class: "movie-credits" });
  const addCredit = (label, people) => {
    const names = (people || []).map((person) => person.name).filter(Boolean);
    if (names.length) credits.append(h("dt", { text: label }), h("dd", { text: names.join(", ") }));
  };
  addCredit("Director", movie.directors);
  addCredit("Writers", movie.writers);
  if ((movie.countries || []).length) credits.append(h("dt", { text: "Country" }), h("dd", { text: movie.countries.join(", ") }));
  if ((movie.languages || []).length) credits.append(h("dt", { text: "Language" }), h("dd", { text: movie.languages.join(", ") }));
  const starByName = new Map();
  for (const star of item.stars || []) starByName.set(String(star.name || "").toLowerCase(), star);
  let cast = null;
  const castList = (movie.cast || []).filter((person) => person && person.name);
  if (castList.length) {
    cast = h("div", {},
      h("div", { class: "movie-cast-label", text: "Cast" }),
      h("div", { class: "movie-cast" }, ...castList.slice(0, 20).map((person) => {
        const star = starByName.get(String(person.name).toLowerCase());
        const chip = h(star ? "button" : "span", {
          class: "movie-cast-chip" + (star ? " linked" : ""),
          type: star ? "button" : null,
          title: star ? `Open ${person.name}` : (person.character ? `${person.name} as ${person.character}` : person.name)
        },
          h("span", { class: "movie-cast-name", text: person.name }),
          person.character ? h("small", { text: person.character }) : null
        );
        if (star) chip.addEventListener("click", (event) => {
          event.preventDefault();
          openStar(Number(star.id));
        });
        return chip;
      }))
    );
  }
  const link = movie.url || `https://www.imdb.com/title/${movie.id}/`;
  const foot = h("div", { class: "movie-foot" },
    h("a", { class: "movie-source", href: link, target: "_blank", rel: "noopener noreferrer", title: "Open this title on IMDb" },
      "IMDb", iconNode("external", "movie-source-icon")),
    h("span", { text: "Details from IMDb" }),
    h("span", { class: "movie-foot-spacer" }),
    btn("Change…", "link-btn", () => promptMovie(item)),
    h("span", { text: "·" }),
    btn("Remove", "link-btn danger", () => clearMovieDetails(item))
  );
  panel.append(head);
  if (credits.childElementCount) panel.append(credits);
  if (cast) panel.append(cast);
  if (movie.plot) panel.append(h("p", { class: "movie-plot", text: movie.plot }));
  panel.append(foot);
}
async function clearMovieDetails(item) {
  if (!item) return;
  closeModal();
  try {
    await api(`/api/items/${item.id}/movie`, { method: "DELETE" });
    toast("IMDb details removed.", "success");
    await loadItems({ reset: true });
    if (S.items.some((entry) => entry.id === item.id)) selectItem(item.id);
    else renderPreview();
  } catch (error) { toast(error.message, "error"); }
}
function promptMovie(item) {
  if (!item) return;
  let selected = null;
  const searchInput = inputEl({ type: "search", placeholder: "Movie name", maxlength: "120", autocomplete: "off" });
  if (item.movie && item.movie.title) searchInput.value = item.movie.title;
  const searchButton = btn("Search", "btn", () => runSearch(searchInput.value));
  const status = h("p", { class: "movie-search-status", text: "" });
  const results = h("div", { class: "movie-results" });
  const addCast = inputEl({ type: "checkbox" });
  addCast.checked = true;
  const castRow = h("label", { class: "check" }, addCast,
    h("span", {},
      h("strong", { text: "Add the cast to Stars" }),
      h("small", { text: "Creates a star for each cast member that is missing and links them to this file." })
    )
  );
  const renderResults = (list) => {
    results.replaceChildren();
    if (!list.length) {
      results.append(h("p", { class: "modal-note", text: "No titles match. Try another name." }));
      return;
    }
    for (const result of list) {
      const chosen = selected && selected.id === result.id;
      const poster = h("span", { class: "movie-result-poster" });
      if (result.poster_url) poster.append(h("img", { src: result.poster_url, alt: "", loading: "lazy" }));
      else poster.append(iconNode("video"));
      const year = result.year ? ` (${result.year})` : "";
      const row = h("button", { class: "movie-result" + (chosen ? " selected" : ""), type: "button" },
        poster,
        h("span", { class: "movie-result-body" },
          h("span", { class: "movie-result-title" }, result.title, year ? h("em", { text: year }) : null),
          h("span", { class: "movie-result-meta", text: [result.type, result.stars].filter(Boolean).join(" · ") || "IMDb title" })
        ),
        h("span", { class: "movie-result-check", html: chosen ? svgRaw("check") : "" })
      );
      row.addEventListener("click", () => {
        selected = result;
        renderResults(list);
        status.textContent = `${result.title}${year} selected.`;
      });
      results.append(row);
    }
  };
  const runSearch = async (query) => {
    status.textContent = "Searching IMDb…";
    results.replaceChildren();
    searchButton.disabled = true;
    try {
      const data = await api(`/api/items/${item.id}/movie/search`, {
        method: "POST",
        body: { query: typeof query === "string" ? query.trim() : "" }
      });
      if (!searchInput.value.trim() && data.query) searchInput.value = data.query;
      selected = null;
      const list = data.results || [];
      renderResults(list);
      status.textContent = list.length
        ? `${plural(list.length, "result")} from IMDb${data.year ? ` · the file name suggests ${data.year}` : ""}.`
        : "No titles match. Try a shorter name.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      searchButton.disabled = false;
    }
  };
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); runSearch(searchInput.value); }
  });
  const content = h("div", {},
    item.movie && item.movie.title
      ? h("div", { class: "movie-current" },
          h("span", { text: `Saved: ${item.movie.title}${item.movie.year ? ` (${item.movie.year})` : ""}` }),
          btn("Remove", "link-btn danger", () => clearMovieDetails(item)))
      : null,
    h("div", { class: "movie-search-row" }, searchInput, searchButton),
    status,
    results,
    castRow,
    h("p", { class: "modal-note", text: "Search and details come from IMDb. The poster, plot, rating, cast and crew are saved in this library and shown in the details pane." })
  );
  openModal({
    title: item.movie ? "Update IMDb details" : "Add IMDb details",
    subtitle: item.name,
    wide: true,
    content,
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Save details",
        class: "primary",
        onClick: async (setBusy) => {
          if (!selected) { toast("Choose an IMDb title first.", "error"); return; }
          setBusy(true);
          status.textContent = `Saving ${selected.title}…`;
          try {
            const data = await api(`/api/items/${item.id}/movie`, {
              method: "POST",
              body: { imdb_id: selected.id, add_cast: addCast.checked }
            });
            closeModal();
            const movie = data.movie || {};
            let message = `Added IMDb details for ${movie.title || selected.title}.`;
            if (data.cast_linked) {
              message += ` ${data.cast_linked} cast linked to Stars`;
              if (data.cast_created) message += ` (${data.cast_created} new)`;
              message += ".";
            }
            toast(message, "success", 7000);
            await Promise.all([loadNav(), loadItems({ reset: true })]);
            if (S.items.some((entry) => entry.id === item.id)) selectItem(item.id);
            if (S.navMode === "stars") {
              if (S.starId) loadStarInfo(S.starId);
              else loadStars();
            }
          } catch (error) {
            status.textContent = error.message;
            toast(error.message, "error", 8000);
          } finally {
            setBusy(false);
          }
        }
      }
    ]
  });
  runSearch(searchInput.value);
  searchInput.focus();
}

/* ------------------------------------------------------------ bulk select */
function bulkIds() {
  return Array.from(S.selection);
}
function bulkDownload() {
  const ids = bulkIds();
  if (!ids.length) return;
  const link = h("a", { href: `/api/batch/download?ids=${ids.join(",")}`, download: "" });
  document.body.append(link);
  link.click();
  link.remove();
  toast(`Preparing ZIP of ${plural(ids.length, "file")}…`, "info", 5000);
}
async function bulkFavorite() {
  const ids = bulkIds();
  if (!ids.length) return;
  try {
    const data = await api("/api/batch/favorite", { method: "POST", body: { item_ids: ids, favorite: true } });
    toast(`Added ${plural(data.updated, "file")} to favorites.`, "success");
    await Promise.all([loadNav(), loadItems({ reset: true })]);
  } catch (error) { toast(error.message, "error"); }
}
async function bulkCopyLinks() {
  const ids = bulkIds();
  if (!ids.length) return;
  try {
    const data = await api(`/api/batch/info?ids=${ids.join(",")}`);
    const lines = data.items.map((item) =>
      item.telegram_link ? `${item.name} — ${item.telegram_link}` : item.name
    );
    await navigator.clipboard.writeText(lines.join("\n"));
    toast(`Copied ${plural(lines.length, "link")} to the clipboard.`, "success");
  } catch (error) { toast(error.message, "error"); }
}
function clipboardIds() {
  if (S.selection.size) return Array.from(S.selection);
  const item = selectedItem();
  return item ? [item.id] : [];
}
function copySelectionToClipboard() {
  if (isStarCatalogue()) return;
  const ids = clipboardIds();
  if (!ids.length) {
    toast(selectedFolder() ? "Open the folder to copy its files." : "Select a file first.", "error");
    return;
  }
  CLIPBOARD.ids = ids;
  toast(`Copied ${plural(ids.length, "file")}. Open another folder and press Ctrl+V.`, "success", 4000);
}
async function pasteClipboard() {
  if (isStarCatalogue()) return;
  if (!CLIPBOARD.ids.length) {
    toast("Nothing to paste. Copy files with Ctrl+C first.", "error");
    return;
  }
  const folder = S.folder || "";
  try {
    const data = await api("/api/batch/copy", { method: "POST", body: { item_ids: CLIPBOARD.ids, folder } });
    toast(`Copied ${plural(data.copied, "file")} to ${folder || "All files"}.`, "success");
    await Promise.all([loadNav(), loadItems({ reset: true })]);
  } catch (error) { toast(error.message, "error"); }
}
function folderTreePicker(current) {
  const folders = S.nav.folders || [];
  const byPath = new Map(folders.map((entry) => [entry.folder.toLowerCase(), entry]));
  const query = inputEl({ type: "search", placeholder: "Search folders, or type a new name", autocomplete: "off", spellcheck: "false" });
  const tree = h("div", { class: "picker-tree", role: "tree" });
  const empty = h("p", { class: "picker-empty", text: "No folders yet. Type a name above to create one." });
  const status = h("div", { class: "picker-status" });
  const collapsed = new Set();
  let selected = byPath.has(String(current || "").toLowerCase()) ? current : "";

  const parentOf = (entry) => byPath.get(String(entry.parent || "").toLowerCase()) || null;
  const hasChildren = (entry) => folders.some((other) => String(other.parent || "").toLowerCase() === entry.folder.toLowerCase());
  const hiddenByCollapse = (entry) => {
    for (let parent = parentOf(entry); parent; parent = parentOf(parent)) {
      if (collapsed.has(parent.folder.toLowerCase())) return true;
    }
    return false;
  };
  const ancestors = (entry) => {
    const set = new Set();
    for (let parent = parentOf(entry); parent; parent = parentOf(parent)) set.add(parent.folder.toLowerCase());
    return set;
  };
  const pathRow = (entry, depth, open, selectedPath) => {
    const path = entry.folder;
    const chevron = h("span", {
      class: "picker-chev" + (hasChildren(entry) ? (open ? " open" : "") : " leaf"),
      "aria-hidden": "true",
      html: svgRaw("chevron")
    });
    if (hasChildren(entry) && !query.value.trim()) {
      chevron.addEventListener("click", (event) => {
        event.stopPropagation();
        if (collapsed.has(path.toLowerCase())) collapsed.delete(path.toLowerCase());
        else collapsed.add(path.toLowerCase());
        render();
      });
    }
    const row = h("button", {
      class: "picker-row" + (selectedPath ? " selected" : ""),
      type: "button",
      role: "treeitem",
      "aria-selected": selectedPath ? "true" : "false",
      title: path,
      style: `--depth:${Math.min(depth, 8)}`
    },
      chevron,
      folderIconNode(entry),
      h("span", { class: "picker-name", text: entry.name || path }),
      h("span", { class: "picker-count", text: entry.n ? String(entry.n) : "" })
    );
    row.addEventListener("click", () => { selected = path; render(); });
    return row;
  };
  const render = () => {
    const needle = query.value.trim().toLowerCase();
    const keep = new Set();
    if (needle) {
      for (const entry of folders) {
        if (!entry.folder.toLowerCase().includes(needle)) continue;
        keep.add(entry.folder.toLowerCase());
        for (const path of ancestors(entry)) keep.add(path);
      }
    }
    tree.replaceChildren();
    for (const entry of folders) {
      const path = entry.folder.toLowerCase();
      if (keep.size && !keep.has(path)) continue;
      if (!needle && hiddenByCollapse(entry)) continue;
      const open = Boolean(needle) || !collapsed.has(path);
      tree.append(pathRow(entry, entry.depth || 0, open, selected.toLowerCase() === path));
    }
    const typed = query.value.trim();
    const createPath = typed.split("/").map((part) => part.trim()).filter(Boolean).join("/");
    if (createPath && !byPath.has(createPath.toLowerCase())) {
      const row = h("button", {
        class: "picker-row create" + (selected.toLowerCase() === createPath.toLowerCase() ? " selected" : ""),
        type: "button",
        title: `Create ${createPath}`,
        style: "--depth:0"
      },
        h("span", { class: "picker-chev leaf", "aria-hidden": "true", html: svgRaw("chevron") }),
        h("span", { class: "picker-plus", html: svgRaw("plus") }),
        h("span", { class: "picker-name", text: `Create “${createPath}”` })
      );
      row.addEventListener("click", () => { selected = createPath; render(); });
      tree.append(row);
    }
    if (!tree.children.length) tree.append(empty);
    status.textContent = selected || "Choose a folder";
    status.classList.toggle("unset", !selected);
  };
  query.addEventListener("input", render);
  query.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const typed = query.value.trim();
    const hit = byPath.get(typed.toLowerCase());
    if (hit) { selected = hit.folder; render(); return; }
    const createPath = typed.split("/").map((part) => part.trim()).filter(Boolean).join("/");
    if (createPath) { selected = createPath; render(); }
  });
  render();
  setTimeout(() => {
    const current = tree.querySelector(".picker-row.selected");
    if (current) current.scrollIntoView({ block: "nearest" });
  }, 0);
  return {
    element: h("div", { class: "move-picker" },
      h("div", { class: "picker-search" },
        h("span", { class: "picker-search-ico", "aria-hidden": "true", html: svgRaw("search") }),
        query
      ),
      tree,
      status
    ),
    get value() { return selected; }
  };
}
function promptBulkMove() {
  const ids = bulkIds();
  if (!ids.length) return;
  const picker = folderTreePicker(S.folder || "");
  openModal({
    title: `Move ${plural(ids.length, "file")}`,
    subtitle: "Files stay in Telegram; only their folder in the explorer changes.",
    wide: true,
    content: picker.element,
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Move here",
        class: "primary",
        onClick: async () => {
          const folder = picker.value;
          if (!folder) { toast("Choose a folder first.", "error"); return; }
          try {
            const data = await api("/api/batch/move", { method: "POST", body: { item_ids: ids, folder } });
            closeModal();
            clearSelection();
            toast(`Moved ${plural(data.moved, "file")} to ${data.folder}.`, "success");
            await Promise.all([loadNav(), loadItems({ reset: true })]);
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
}
function promptBulkDelete() {
  const ids = bulkIds();
  if (!ids.length) return;
  const loaded = S.items.filter((entry) => S.selection.has(entry.id));
  const total = loaded.reduce((sum, entry) => sum + (entry.size || 0), 0);
  const remove = h("button", { class: "modal-option", type: "button" },
    h("span", {},
      h("strong", { text: `Remove ${plural(ids.length, "file")} from this library` }),
      h("span", { text: "Hides the entries in the explorer and in future syncs. The Telegram messages are kept." })
    )
  );
  const remote = h("button", { class: "modal-option danger", type: "button" },
    h("span", {},
      h("strong", { text: `Delete ${plural(ids.length, "file")} from Telegram` }),
      h("span", { text: `Deletes the channel messages for every member${total ? ` · ${fmtSize(total)}` : ""}. This cannot be undone.` })
    )
  );
  remove.addEventListener("click", async () => {
    closeModal();
    try {
      const data = await api("/api/batch/delete", { method: "POST", body: { item_ids: ids, remote: false } });
      clearSelection();
      toast(`Removed ${plural(data.deleted, "file")} from the library. You can restore them from Hidden.`, "success", 6000);
      await Promise.all([loadNav(), refreshLibrary(false)]);
    } catch (error) { toast(error.message, "error"); }
  });
  remote.addEventListener("click", async () => {
    closeModal();
    try {
      const data = await api("/api/batch/delete", { method: "POST", body: { item_ids: ids, remote: true } });
      clearSelection();
      toast(`Deleted ${plural(data.deleted, "file")} from Telegram.`, "success");
      await Promise.all([loadNav(), refreshLibrary(false)]);
    } catch (error) { toast(error.message, "error"); }
  });
  openModal({
    title: `Delete ${plural(ids.length, "file")}?`,
    subtitle: total ? `${plural(ids.length, "file")} · ${fmtSize(total)}` : undefined,
    content: h("div", {},
      h("p", { text: "Choose what should happen to the selected files." }),
      remove,
      remote,
      h("p", { class: "modal-note", text: "You can close this dialog to keep the files." })
    ),
    actions: [{ label: "Cancel", onClick: closeModal }]
  });
}
function openBulkMenu(event) {
  showContextMenu(event.clientX, event.clientY, [
    { label: `Download ${plural(S.selection.size, "file")} (ZIP)`, icon: "download", onClick: bulkDownload },
    { label: "Move to folder…", icon: "move", onClick: promptBulkMove },
    { label: "Add to favorites", icon: "star", onClick: bulkFavorite },
    { label: "Assign stars…", icon: "user", onClick: () => promptStars(null) },
    { label: "Copy Telegram links", icon: "link", onClick: bulkCopyLinks },
    { separator: true },
    { label: `Delete ${plural(S.selection.size, "file")}…`, icon: "trash", danger: true, onClick: promptBulkDelete }
  ]);
}

/* --------------------------------------------------------------- dialogs */
function openModal(options) {
  const root = $("modalRoot");
  $("modalTitle").textContent = options.title || "";
  const subtitle = $("modalSubtitle");
  subtitle.hidden = !options.subtitle;
  subtitle.textContent = options.subtitle || "";
  const body = $("modalBody");
  body.replaceChildren();
  if (options.content) body.append(options.content);
  const actions = $("modalActions");
  actions.replaceChildren();
  for (const action of options.actions || []) {
    const button = h("button", { class: `btn ${action.class || ""}`.trim(), type: "button", text: action.label });
    button.addEventListener("click", async () => {
      if (action.onClick) {
        let busy = false;
        const setBusy = (value) => {
          busy = value;
          button.disabled = value;
          if (value) button.textContent = "Working…";
          else button.textContent = action.label;
        };
        try {
          await action.onClick(setBusy);
        } finally {
          if (!busy) setBusy(false);
        }
      }
    });
    actions.append(button);
  }
  $("modalBox").classList.toggle("wide", Boolean(options.wide));
  root.hidden = false;
  const firstInput = body.querySelector("input, textarea, select");
  if (firstInput) setTimeout(() => firstInput.focus(), 30);
}
function closeModal() {
  $("modalRoot").hidden = true;
  $("modalBody").replaceChildren();
  $("modalActions").replaceChildren();
}
function promptRename() {
  const item = selectedItem();
  if (!item) return;
  const input = inputEl({ type: "text", value: item.name, maxlength: "180", autocomplete: "off" });
  const content = h("div", {},
    field("File name", input, "The new name is saved in the library and set as the Telegram caption. Telegram keeps the original file metadata."),
    item.kind === "document" ? h("p", { class: "modal-note", text: "For documents Telegram cannot change the original filename metadata without re-uploading, but the library and caption use the new name." }) : null
  );
  openModal({
    title: "Rename file",
    content,
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Rename",
        class: "primary",
        onClick: async () => {
          const name = input.value.trim();
          if (!name) { toast("A file name cannot be empty.", "error"); return; }
          try {
            const data = await api(`/api/items/${item.id}`, { method: "PATCH", body: { name } });
            closeModal();
            if (data.warning) toast(data.warning, "info", 8000);
            else toast("Renamed.", "success");
            await Promise.all([loadNav(), loadItems({ reset: true })]);
            selectItem(item.id);
          } catch (error) {
            toast(error.message, "error");
          }
        }
      }
    ]
  });
  input.focus();
  const dot = input.value.lastIndexOf(".");
  input.setSelectionRange(0, dot > 0 ? dot : input.value.length);
}
function promptMove() {
  const item = selectedItem();
  if (!item) return;
  const picker = folderTreePicker(item.folder || "");
  openModal({
    title: "Move file",
    subtitle: item.name,
    wide: true,
    content: picker.element,
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Move here",
        class: "primary",
        onClick: async () => {
          const folder = picker.value;
          if (!folder) { toast("Choose a folder first.", "error"); return; }
          if (folder.toLowerCase() === String(item.folder || "").toLowerCase()) { closeModal(); return; }
          try {
            await api(`/api/items/${item.id}`, { method: "PATCH", body: { folder } });
            closeModal();
            toast(`Moved to ${folder}.`, "success");
            await Promise.all([loadNav(), refreshLibrary(false)]);
            if (S.items.some((entry) => entry.id === item.id)) selectItem(item.id);
            else clearSelection();
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
}
function promptTags() {
  const item = selectedItem();
  if (!item) return;
  const input = inputEl({ type: "text", value: (item.tag_list || []).join(" "), autocomplete: "off", placeholder: "summer project tutorial" });
  const content = h("div", {},
    field("Tags", input, "Separate tags with spaces or commas. Search accepts a plain word or #tag."),
    h("p", { class: "modal-note", text: "Tags are stored in the local library and mirrored to the bot index when it is linked." })
  );
  openModal({
    title: "Edit tags",
    subtitle: item.name,
    content,
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Save",
        class: "primary",
        onClick: async () => {
          try {
            await api(`/api/items/${item.id}`, { method: "PATCH", body: { tags: input.value } });
            closeModal();
            toast("Tags updated.", "success");
            await Promise.all([loadNav(), loadItems({ reset: true })]);
            selectItem(item.id);
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
}
function promptNote(item) {
  if (!item) return;
  const area = h("textarea", { class: "note-input", rows: "6", maxlength: "4000", placeholder: "Write a note only you can see…" });
  area.value = item.note || "";
  openModal({
    title: item.note ? "Edit file note" : "Add file note",
    subtitle: item.name,
    content: h("div", {},
      h("div", { class: "field" },
        h("label", { for: "file-note", text: "Note" }),
        area,
        h("div", { class: "hint", text: "Notes stay in the local index, are included in search, and are never sent to Telegram." })
      )
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Save",
        class: "primary",
        onClick: async () => {
          try {
            await api(`/api/items/${item.id}`, { method: "PATCH", body: { note: area.value } });
            closeModal();
            toast(area.value.trim() ? "Note saved." : "Note cleared.", "success");
            await loadItems({ reset: true });
            if (S.items.some((entry) => entry.id === item.id)) selectItem(item.id);
            else clearSelection();
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
  area.focus();
}
/* -------------------------------------------- collections, views and tags */
function collectionById(id) {
  return (S.nav.collections || []).find((entry) => Number(entry.id) === Number(id)) || null;
}
function promptNewCollection(afterCreate) {
  const input = inputEl({ type: "text", maxlength: "80", placeholder: "For example: Client work", autocomplete: "off" });
  openModal({
    title: "New collection",
    subtitle: "Group files across folders",
    content: h("div", {},
      field("Name", input, "A file can be in several collections. Folders still decide where a file lives."),
      h("p", { class: "modal-note", text: "Collections are part of the local library index and travel with the vault snapshot." })
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Create",
        class: "primary",
        onClick: async () => {
          try {
            const data = await api("/api/collections", { method: "POST", body: { name: input.value } });
            closeModal();
            await loadNav();
            toast(`Collection “${data.collection.name}” created.`, "success");
            if (afterCreate) await afterCreate(data.collection);
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
  input.focus();
}
function promptRenameCollection(collection) {
  const input = inputEl({ type: "text", value: collection.name, maxlength: "80", autocomplete: "off" });
  openModal({
    title: "Rename collection",
    content: field("Name", input),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Rename",
        class: "primary",
        onClick: async () => {
          const name = input.value.trim();
          if (!name) { toast("Give the collection a name.", "error"); return; }
          try {
            await api(`/api/collections/${collection.id}`, { method: "PATCH", body: { name } });
            closeModal();
            await loadNav();
            if (S.collection === collection.id) updateBreadcrumb();
            toast("Collection renamed.", "success");
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
  input.focus();
  input.select();
}
function promptDeleteCollection(collection) {
  openModal({
    title: "Delete collection?",
    subtitle: collection.name,
    content: h("p", { text: `The collection and its ${plural(collection.n || 0, "file link")} are removed. The files stay in the library.` }),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Delete",
        class: "danger",
        onClick: async () => {
          try {
            await api(`/api/collections/${collection.id}`, { method: "DELETE" });
            closeModal();
            const wasOpen = S.collection === collection.id;
            if (wasOpen) {
              S.collection = null;
              S.navMode = "all";
              S.history = S.history.filter((snap) => snap.collection !== collection.id);
              S.histIndex = Math.max(0, S.history.length - 1);
            }
            await loadNav();
            if (wasOpen) navigateScope({ navMode: "all", folder: "", tag: "", kind: "" });
            toast("Collection deleted.", "success");
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
}
async function promptCollections(item) {
  const ids = item ? [item.id] : Array.from(S.selection);
  if (!ids.length) { toast("Select files first.", "error"); return; }
  let collections = [];
  let mine = [];
  try {
    if (item) {
      const fresh = await api(`/api/items/${item.id}`);
      mine = fresh.collections || [];
    }
    collections = (await api("/api/collections")).collections || [];
  } catch (error) { toast(error.message, "error"); return; }
  const boxes = new Map();
  const list = h("div", { class: "check-list" });
  const render = () => {
    list.replaceChildren();
    if (!collections.length) {
      list.append(h("p", { class: "modal-note", text: "No collections yet. Create one below." }));
      return;
    }
    for (const collection of collections) {
      const box = h("input", { type: "checkbox" });
      box.checked = mine.includes(collection.id);
      boxes.set(collection.id, box);
      list.append(h("label", { class: "check-row" }, box,
        h("span", { class: "check-label", text: collection.name }),
        h("span", { class: "check-count", text: plural(collection.n || 0, "file") })
      ));
    }
  };
  render();
  const newName = inputEl({ type: "text", maxlength: "80", placeholder: "New collection name", autocomplete: "off" });
  const createBtn = btn("Create and add", "btn", async () => {
    try {
      const data = await api("/api/collections", { method: "POST", body: { name: newName.value } });
      collections = collections.concat([data.collection]);
      mine = mine.concat([data.collection.id]);
      newName.value = "";
      render();
      toast(`Collection “${data.collection.name}” created.`, "success");
    } catch (error) { toast(error.message, "error"); }
  });
  openModal({
    title: item ? "Collections for this file" : "Add files to a collection",
    subtitle: item ? item.name : plural(ids.length, "selected file"),
    content: h("div", {}, list,
      h("div", { class: "inline-create" }, newName, createBtn),
      h("p", { class: "modal-note", text: item
        ? "Tick the collections this file belongs to. Unticking removes it from that collection."
        : "Selected files are added to every ticked collection. Use the file’s own menu to remove it later." })
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: item ? "Save" : "Add",
        class: "primary",
        onClick: async () => {
          try {
            for (const collection of collections) {
              const box = boxes.get(collection.id);
              if (!box) continue;
              const want = box.checked;
              const has = mine.includes(collection.id);
              if (want === has) continue;
              await api(`/api/collections/${collection.id}/items`, {
                method: "POST",
                body: { item_ids: ids, remove: !want }
              });
            }
            closeModal();
            await loadNav();
            toast(item ? "Collections updated." : `Added to collection.`, "success");
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
  newName.focus();
  newName.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    createBtn.click();
  });
}
function currentViewData() {
  return {
    navMode: S.navMode, folder: S.folder, tag: S.tag, kind: S.kind,
    starId: S.starId, collection: S.collection, watching: S.watching,
    sort: S.sort, dir: S.dir, filters: { ...S.filters }
  };
}
function promptSaveView() {
  const parts = [S.navMode === "collection" ? (collectionById(S.collection)?.name || "Collection") : ""];
  if (S.folder) parts.push(S.folder);
  if (S.tag) parts.push(`#${S.tag}`);
  const input = inputEl({
    type: "text", maxlength: "80", autocomplete: "off",
    value: parts.filter(Boolean).join(" · ") || "My view"
  });
  openModal({
    title: "Save this view",
    subtitle: "Reuse the same folder, type, tag, search and filters later",
    content: h("div", {},
      field("View name", input),
      h("p", { class: "modal-note", text: "The current search text is not stored; everything else in the filter bar is." })
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Save view",
        class: "primary",
        onClick: async () => {
          try {
            await api("/api/saved-views", {
              method: "POST",
              body: { name: input.value, data: currentViewData() }
            });
            closeModal();
            await loadNav();
            toast("View saved.", "success");
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
  input.focus();
  input.select();
}
function applySavedView(view) {
  const data = view.data || {};
  S.filters = filterStateFrom(data.filters || {});
  try { localStorage.setItem("tfe_filters", JSON.stringify(S.filters)); } catch (_) { /* best effort */ }
  savePrefs({ filters: S.filters });
  updateFilterBadge();
  navigateScope({
    navMode: data.navMode || "all",
    folder: data.folder || "",
    tag: data.tag || "",
    kind: data.kind || "",
    starId: data.starId || null,
    collection: data.collection || null,
    watching: Boolean(data.watching),
    sort: data.sort || S.sort,
    dir: data.dir || S.dir
  });
}
function deleteSavedView(view) {
  openModal({
    title: "Delete saved view?",
    subtitle: view.name,
    content: h("p", { text: "The view is removed from the sidebar. Files are not changed." }),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Delete",
        class: "danger",
        onClick: async () => {
          try {
            await api(`/api/saved-views/${view.id}`, { method: "DELETE" });
            closeModal();
            await loadNav();
            toast("View deleted.", "success");
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
}
const TAG_COLORS = ["", "#229ED9", "#7c5cff", "#e0457b", "#f0a020", "#27ae60", "#8e44ad", "#e74c3c", "#0ca678", "#6b7280"];
function promptTagMeta(tag, onSaved) {
  const source = tag || { tag: "", color: "", group: "" };
  let color = source.color || "";
  const nameInput = inputEl({ type: "text", value: source.tag || "", maxlength: "80", placeholder: "Tag name", autocomplete: "off" });
  if (source.tag) nameInput.readOnly = true;
  const groupInput = inputEl({ type: "text", value: source.group || "", maxlength: "60", placeholder: "Optional group", autocomplete: "off" });
  const swatches = h("div", { class: "swatch-row" });
  const paint = () => {
    swatches.replaceChildren();
    for (const value of TAG_COLORS) {
      const dot = h("button", {
        class: "swatch" + (value === color ? " active" : "") + (value ? "" : " none"),
        type: "button",
        title: value || "No colour",
        style: value ? `--swatch:${value}` : ""
      });
      dot.addEventListener("click", () => { color = value; paint(); });
      swatches.append(dot);
    }
  };
  paint();
  openModal({
    title: "Tag colour and group",
    content: h("div", {},
      field("Tag", nameInput, "Tag names follow the file’s tags."),
      field("Colour", swatches),
      field("Group", groupInput, "Groups keep related tags together in the tag manager.")
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Save",
        class: "primary",
        onClick: async () => {
          try {
            await api("/api/tags/meta", {
              method: "POST",
              body: { tag: nameInput.value.trim(), color, group: groupInput.value.trim() }
            });
            closeModal();
            await loadNav();
            if (onSaved) onSaved();
            toast("Tag saved.", "success");
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
  if (!source.tag) nameInput.focus();
}
function promptTagManager() {
  const tags = S.nav.tags || [];
  const list = h("div", { class: "check-list" });
  if (!tags.length) {
    list.append(h("p", { class: "modal-note", text: "No tags yet. Edit a file’s tags first." }));
  } else {
    for (const tag of tags) {
      const dot = h("i", { class: "tag-dot", style: tag.color ? `background:${tag.color}` : "" });
      const row = h("button", { class: "tag-manage-row", type: "button", title: `Edit #${tag.tag}` },
        dot,
        h("span", { class: "tag-manage-name", text: `#${tag.tag}` }),
        h("span", { class: "tag-manage-group", text: tag.group || "" }),
        h("span", { class: "nav-count", text: String(tag.count || 0) })
      );
      row.addEventListener("click", () => promptTagMeta(tag, () => promptTagManager()));
      list.append(row);
    }
  }
  openModal({
    title: "Tag colours and groups",
    subtitle: "Right-click a tag in the sidebar to edit it directly",
    wide: true,
    content: h("div", {}, list,
      h("div", { class: "inline-create" },
        btn("New tag…", "btn", () => promptTagMeta(null, () => promptTagManager()))
      )
    ),
    actions: [{ label: "Close", onClick: closeModal }]
  });
}

/* ---------------------------------------------------- batch rename/report */
function promptBatchRename() {
  const ids = Array.from(S.selection);
  if (!ids.length) { toast("Select files first.", "error"); return; }
  const input = inputEl({ type: "text", value: "{name}", maxlength: "160", autocomplete: "off" });
  const preview = h("div", { class: "batch-preview" }, h("p", { class: "modal-note", text: "Reading names…" }));
  const run = debounce(async () => {
    try {
      const data = await api("/api/batch/rename", {
        method: "POST",
        body: { item_ids: ids, template: input.value, preview: true }
      });
      const changed = data.renames.filter((entry) => entry.from !== entry.to);
      preview.replaceChildren();
      if (!changed.length) {
        preview.append(h("p", { class: "modal-note", text: "This template keeps the current names." }));
        return;
      }
      for (const entry of changed.slice(0, 200)) {
        preview.append(h("div", { class: "batch-row" },
          h("span", { class: "batch-from", text: entry.from, title: entry.from }),
          h("span", { class: "batch-arrow", text: "→" }),
          h("span", { class: "batch-to", text: entry.to, title: entry.to })
        ));
      }
    } catch (error) {
      preview.replaceChildren(h("p", { class: "modal-note", text: error.message }));
    }
  }, 260);
  input.addEventListener("input", run);
  const chips = h("div", { class: "template-chips" });
  for (const token of ["{name}", "{ext}", "{folder}", "{date}", "{nn}"]) {
    const chip = btn(token, "tag-chip", () => {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      input.value = input.value.slice(0, start) + token + input.value.slice(end);
      input.focus();
      input.setSelectionRange(start + token.length, start + token.length);
      run();
    });
    chips.append(chip);
  }
  openModal({
    title: "Rename selected files",
    subtitle: plural(ids.length, "file"),
    wide: true,
    content: h("div", {},
      field("Name template", input, "Placeholders: {name} {ext} {kind} {folder} {date} {n} {nn}. The original extension is appended when {ext} is missing."),
      chips,
      preview
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Rename",
        class: "primary",
        onClick: async () => {
          try {
            const data = await api("/api/batch/rename", {
              method: "POST",
              body: { item_ids: ids, template: input.value, preview: false }
            });
            closeModal();
            toast(data.applied ? `${plural(data.applied, "file")} renamed.` : "Names already match.", "success");
            if (data.warnings) toast(`${data.warnings} Telegram caption(s) could not be updated.`, "info", 7000);
            S.selection.clear();
            await Promise.all([loadNav(), loadItems({ reset: true })]);
            renderSelection();
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
  run();
  input.focus();
}
async function promptDuplicates() {
  let report;
  try {
    report = await api("/api/reports/duplicates?limit=100");
  } catch (error) { toast(error.message, "error"); return; }
  const content = h("div", { class: "report" });
  if (!report.groups.length) {
    content.append(h("p", { text: "No files share the same name and size in this vault." }));
  }
  const reload = async () => {
    try { await Promise.all([loadNav(), loadItems({ reset: true })]); } catch (_) { /* best effort */ }
  };
  for (const group of report.groups) {
    const rows = h("div", { class: "dupe-items" });
    for (const entry of group.items) {
      const reveal = btn("Reveal", "link-btn", () => {
        closeModal();
        navigateScope({ navMode: "all", q: entry.name, folder: "", tag: "", kind: "" });
      });
      const remove = btn("Remove", "link-btn danger", async () => {
        remove.disabled = true;
        try {
          await api(`/api/items/${entry.id}?remote=0`, { method: "DELETE" });
          toast("Removed from the library. Restore it from Hidden if needed.", "success", 5000);
          await reload();
          promptDuplicates();
        } catch (error) {
          remove.disabled = false;
          toast(error.message, "error");
        }
      });
      rows.append(h("div", { class: "dupe-row" },
        h("span", { class: "dupe-name", text: entry.name, title: entry.name }),
        h("span", { class: "dupe-meta", text: `${entry.folder || "—"} · ${fmtDate(entry.tg_date || entry.added_at, true)}` }),
        reveal, remove
      ));
    }
    content.append(h("div", { class: "dupe-group" },
      h("div", { class: "dupe-head" },
        h("strong", { text: group.name }),
        h("span", { class: "dupe-meta", text: `${group.count} ${group.count === 1 ? "copy" : "copies"} · ${fmtSize(group.size)} each` })
      ),
      rows
    ));
  }
  openModal({
    title: "Duplicate files",
    subtitle: `${plural(report.group_count, "group")} · about ${fmtSize(report.wasted)} could be freed`,
    wide: true,
    content: h("div", {}, content,
      h("p", { class: "modal-note", text: "Duplicates are matched by name and size. Removing only hides the entry in this library; the Telegram message stays unless you delete it from the file menu." })
    ),
    actions: [{ label: "Close", onClick: closeModal }, { label: "Rescan", onClick: () => promptDuplicates() }]
  });
}
async function promptStorage() {
  let report;
  try {
    report = await api("/api/reports/stats");
  } catch (error) { toast(error.message, "error"); return; }
  const kinds = report.kinds || [];
  const maxSize = Math.max(1, ...kinds.map((entry) => entry.size || 0));
  const bars = h("div", { class: "storage-kinds" });
  for (const entry of kinds) {
    bars.append(h("div", { class: "storage-kind" },
      h("span", { class: "storage-kind-label", text: entry.label }),
      h("span", { class: "storage-track" }, h("i", { style: `width:${Math.max(2, (entry.size / maxSize) * 100)}%` })),
      h("span", { class: "storage-kind-value", text: `${plural(entry.count, "file")} · ${fmtSize(entry.size)}` })
    ));
  }
  if (!kinds.length) bars.append(h("p", { class: "modal-note", text: "No files indexed yet." }));
  const largest = h("div", { class: "check-list" });
  for (const entry of report.largest || []) {
    const row = h("button", { class: "tag-manage-row", type: "button", title: entry.name },
      h("span", { class: "tag-manage-name", text: entry.name }),
      h("span", { class: "tag-manage-group", text: entry.folder || "" }),
      h("span", { class: "nav-count", text: fmtSize(entry.size) })
    );
    row.addEventListener("click", () => {
      closeModal();
      navigateScope({ navMode: "all", q: entry.name, folder: "", tag: "", kind: "" });
    });
    largest.append(row);
  }
  openModal({
    title: "Storage report",
    subtitle: `${plural(kinds.reduce((sum, entry) => sum + entry.count, 0), "file")} · ${fmtSize(kinds.reduce((sum, entry) => sum + entry.size, 0))}`,
    wide: true,
    content: h("div", {},
      bars,
      h("div", { class: "report-split" },
        h("div", { class: "report-pill" }, h("strong", { text: String(report.collections || 0) }), h("span", { text: "Collections" })),
        h("div", { class: "report-pill" }, h("strong", { text: String(report.views || 0) }), h("span", { text: "Saved views" }))
      ),
      h("div", { class: "preview-note-head" }, h("span", { text: "Largest files" })),
      largest,
      h("p", { class: "modal-note", text: "Sizes are the Telegram file sizes in this vault. Open a file to download or remove it from the library." })
    ),
    actions: [{ label: "Close", onClick: closeModal }]
  });
}

/* --------------------------------------------------------- details/revisions */
function renderInspectBlock(item) {
  const block = $("previewInspect");
  const dl = $("previewInspectFields");
  const note = $("previewInspectNote");
  dl.replaceChildren();
  const meta = item && item.meta;
  const fields = meta && Array.isArray(meta.fields) ? meta.fields : [];
  const text = meta && meta.note ? String(meta.note) : "";
  if (!fields.length && !text) {
    block.hidden = true;
    note.hidden = true;
    note.textContent = "";
    $("inspectBtn").textContent = "Read";
    return;
  }
  for (const pair of fields) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    dl.append(h("dt", { text: pair[0] }), h("dd", { text: pair[1] }));
  }
  note.hidden = !text;
  note.textContent = text;
  block.hidden = false;
  $("inspectBtn").textContent = "Read again";
}
async function inspectItem(item) {
  if (!item) return;
  const button = $("inspectBtn");
  button.textContent = "Reading…";
  try {
    const data = await api(`/api/items/${item.id}/inspect`, { method: "POST", body: {} });
    const index = S.items.findIndex((entry) => entry.id === item.id);
    if (index >= 0) S.items[index] = data.item;
    if (S.selectedId === item.id) {
      renderPreview();
    } else {
      renderInspectBlock(data.item);
    }
    toast("File details read.", "success");
  } catch (error) {
    button.textContent = "Read";
    toast(error.message, "error");
  }
}
function inspectLink() {
  const item = selectedItem();
  if (!item) return;
  inspectItem(item);
}
async function loadRevisions(item, token) {
  const block = $("previewRevisions");
  const list = $("revisionList");
  block.hidden = true;
  list.replaceChildren();
  if (!item || !(item.family === "model" || item.family === "cad")) return;
  try {
    const data = await api(`/api/items/${item.id}/revisions`);
    if (token !== S.previewToken) return;
    if (!data.items || !data.items.length) return;
    for (const entry of data.items) {
      const row = h("button", { class: "revision-item", type: "button", title: entry.name },
        h("span", { class: "revision-name", text: entry.name }),
        h("span", { class: "revision-date", text: fmtDate(entry.tg_date || entry.added_at, true) })
      );
      row.addEventListener("click", () => {
        const found = S.items.find((candidate) => candidate.id === entry.id);
        if (found) selectItem(found.id, { scroll: true });
        else openViewerFor(entry);
      });
      list.append(row);
    }
    block.hidden = false;
  } catch (_) {
    block.hidden = true;
  }
}
function openModelViewer(item) {
  if (!item) return;
  if (!item.viewer || !window.TFE3D) {
    toast("This model has no built-in preview. Use Open in app instead.", "error");
    return;
  }
  window.TFE3D.open(item);
}
async function openExternalItem(item) {
  if (!item) return;
  toast("Opening in its Windows app…", "info", 4000);
  try {
    await api(`/api/items/${item.id}/open-external`, { method: "POST", body: {} });
  } catch (error) { toast(error.message, "error"); }
}
async function windowsThumbnail(item) {
  if (!item) return;
  toast("Asking Windows for a preview…", "info", 5000);
  try {
    const data = await api(`/api/items/${item.id}/thumb/windows`, { method: "POST", body: {} });
    window.__tfeThumbUpdated(data.item);
  } catch (error) { toast(error.message, "error"); }
}
window.__tfeThumbUpdated = function (item) {
  if (!item) return;
  const index = S.items.findIndex((entry) => entry.id === item.id);
  if (index >= 0) S.items[index] = item;
  if (S.view === "tiles") {
    renderItems();
  } else {
    const thumb = document.querySelector(`.row[data-id="${item.id}"] .thumb`);
    if (thumb) {
      thumb.replaceChildren();
      if (item.thumb_url) thumb.append(h("img", { src: item.thumb_url, alt: "", loading: "lazy" }));
      else thumb.append(fileIcon(item.kind));
    }
  }
  if (S.selectedId === item.id) renderPreview();
  toast("Thumbnail updated.", "success");
};

/* --------------------------------------------------------------- shortcuts */
const SHORTCUTS = [
  ["F2", "Rename file or folder"],
  ["Delete", "Delete file or empty folder"],
  ["Enter / Space", "Open file or folder"],
  ["↑ / ↓", "Move selection"],
  ["Home / End", "First / last item"],
  ["Page Up / Page Down", "Move one screen"],
  ["Backspace / Alt ↑", "Up one folder"],
  ["Ctrl C / Ctrl V", "Copy / paste file"],
  ["Ctrl B", "Show / hide details"],
  ["Ctrl F", "Search"],
  ["Ctrl A", "Select all files in this view"],
  ["Alt ← / →", "Back / forward"],
  ["Mouse Back / Forward", "Back / forward"],
  ["↑ / ↓ in player", "Volume up / down"],
  ["Shift ← / → in player", "Seek 30 seconds"],
  ["?", "Show this list"],
  ["Esc", "Close dialog or player"]
];
function shortcutGridNode() {
  const grid = h("div", { class: "shortcut-grid" });
  for (const [key, label] of SHORTCUTS) grid.append(h("kbd", { text: key }), h("span", { text: label }));
  return grid;
}
function promptShortcuts() {
  openModal({
    title: "Keyboard shortcuts",
    content: h("div", {}, shortcutGridNode(),
      h("p", { class: "modal-note", text: "In the 3D viewer drag to orbit, scroll to zoom and right-drag to pan." })
    ),
    actions: [{ label: "Close", onClick: closeModal }]
  });
}
function promptThumbPicker(item) {
  if (!item) return;
  let chosen = 0;
  let timer = null;
  let disposed = false;
  const grid = h("div", { class: "thumb-picker" });
  const status = h("p", { class: "modal-note", text: "Extracting frames from the video…" });
  const tools = h("div", { class: "thumb-picker-tools" });
  const stop = () => {
    disposed = true;
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const useFrame = async (setBusy) => {
    if (!chosen) { toast("Pick one of the frames first.", "info"); return; }
    setBusy(true);
    try {
      await api(`/api/thumb-picker/${item.id}/select`, { method: "POST", body: { index: chosen } });
      stop();
      closeModal();
      toast("Thumbnail updated.", "success");
      await loadItems({ reset: true });
      loadNav();
      if (S.items.some((entry) => entry.id === item.id)) selectItem(item.id);
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setBusy(false);
    }
  };
  openModal({
    title: "Choose a thumbnail",
    subtitle: item.name,
    wide: true,
    content: h("div", {},
      h("p", { class: "modal-note", text: "Five frames are grabbed evenly across the video. Click the one that should stand for it in the library, or shuffle for five more from random points." }),
      grid,
      status,
      tools
    ),
    actions: [
      { label: "Cancel", onClick: () => { stop(); closeModal(); } },
      { label: "Use thumbnail", class: "primary", onClick: useFrame }
    ]
  });
  const fail = (text, retry) => {
    status.textContent = text;
    tools.replaceChildren();
    if (!retry) return;
    const button = h("button", { class: "btn", type: "button", text: "Try again" });
    button.addEventListener("click", () => {
      tools.replaceChildren();
      status.textContent = "Extracting frames from the video…";
      load(true);
    });
    tools.append(button);
  };
  const showFrames = (data) => {
    status.textContent = "Click the frame you want, then press Use thumbnail.";
    grid.replaceChildren();
    for (const candidate of data.candidates || []) {
      const tile = h("button", { type: "button", class: "thumb-choice", title: fmtDuration(candidate.time) },
        h("img", { src: candidate.url, alt: "", loading: "lazy" }),
        h("span", { text: fmtDuration(candidate.time) })
      );
      tile.addEventListener("click", () => {
        chosen = candidate.index;
        grid.querySelectorAll(".thumb-choice").forEach((node) => node.classList.toggle("selected", node === tile));
      });
      grid.append(tile);
    }
    const shuffle = h("button", { class: "btn", type: "button", text: "Shuffle frames" });
    shuffle.addEventListener("click", () => shuffleFrames(shuffle));
    tools.replaceChildren(shuffle);
  };
  const shuffleFrames = async (button) => {
    if (disposed) return;
    if (timer) { clearTimeout(timer); timer = null; }
    button.disabled = true;
    chosen = 0;
    grid.replaceChildren();
    status.textContent = "Grabbing five new frames from random points…";
    let data = null;
    try {
      data = await api(`/api/thumb-picker/${item.id}/shuffle`, { method: "POST" });
    } catch (error) {
      if (!disposed) fail(error.message, true);
      return;
    }
    if (disposed || !grid.isConnected) return;
    if (data.state === "ready") { showFrames(data); return; }
    if (data.state === "error") { fail(data.reason || "Could not generate frames.", true); return; }
    timer = setTimeout(() => load(false), 1500);
  };
  const load = async (force) => {
    if (disposed) return;
    let data = null;
    try {
      data = await api(`/api/thumb-picker/${item.id}${force ? "?force=1" : ""}`);
    } catch (error) {
      if (!disposed) fail(error.message, true);
      return;
    }
    // Closing the dialog (Cancel, ×, Escape) unmounts the grid; stop then.
    if (disposed || !grid.isConnected) return;
    if (data.state === "ready") { showFrames(data); return; }
    if (data.state === "missing-tool") {
      fail("Choosing a thumbnail needs ffmpeg, which is not installed yet.", false);
      const install = h("button", { class: "btn", type: "button", text: "Install ffmpeg" });
      install.addEventListener("click", () => promptInstallTool("ffmpeg", () => promptThumbPicker(item)));
      tools.append(install);
      return;
    }
    if (data.state === "error") { fail(data.reason || "Could not generate frames.", true); return; }
    if (data.state === "unavailable") { fail(data.reason || "This file has no video frames.", false); return; }
    timer = setTimeout(() => load(false), 2000);
  };
  load(false);
}
function promptFolderProperties(target) {
  const folder = typeof target === "string" ? folderEntry(target) : target;
  if (!folder) return;
  const icon = inputEl({ type: "text", maxlength: "32", value: folder.icon || "", placeholder: "📁", autocomplete: "off" });
  const note = h("textarea", { class: "note-input", rows: "5", maxlength: "4000", placeholder: "What lives in this folder?" });
  note.value = folder.note || "";
  const palette = h("div", { class: "icon-palette" });
  const choices = ["📁", "🗂️", "🎬", "🎵", "🖼️", "📄", "📚", "🎮", "🏠", "💼", "⭐", "❤️", "🔒", "🧰", "☁️", "🎨"];
  const reset = h("button", { class: "link-btn", type: "button", text: "Use the default icon" });
  for (const value of choices) {
    const choice = h("button", {
      class: "icon-choice" + (folder.icon === value ? " active" : ""),
      type: "button",
      text: value,
      title: value
    });
    choice.addEventListener("click", () => {
      icon.value = value;
      palette.querySelectorAll(".icon-choice").forEach((node) => node.classList.toggle("active", node === choice));
    });
    palette.append(choice);
  }
  reset.addEventListener("click", () => {
    icon.value = "";
    palette.querySelectorAll(".icon-choice").forEach((node) => node.classList.remove("active"));
  });
  const content = h("div", {},
    field("Icon", icon, "Paste any emoji or short text, or pick one below."),
    palette,
    reset,
    field("Folder note", note, "Folder notes are local, searchable, and never sent to Telegram.")
  );
  openModal({
    title: "Folder icon and note",
    subtitle: folder.folder,
    content,
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Save",
        class: "primary",
        onClick: async () => {
          try {
            await api("/api/folders", { method: "PATCH", body: { name: folder.folder, icon: icon.value, note: note.value } });
            closeModal();
            await loadNav();
            if (S.selectedFolderPath) renderPreview();
            toast("Folder updated.", "success");
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
}
function newFilterState() {
  return { min: "", max: "", after: "", before: "", note: false, recursive: false };
}
function promptFilters() {
  const min = inputEl({ type: "number", min: "0", step: "0.1", value: S.filters.min, placeholder: "Any" });
  const max = inputEl({ type: "number", min: "0", step: "0.1", value: S.filters.max, placeholder: "Any" });
  const after = inputEl({ type: "date", value: S.filters.after });
  const before = inputEl({ type: "date", value: S.filters.before });
  const note = inputEl({ type: "checkbox" });
  note.checked = S.filters.note;
  const recursive = inputEl({ type: "checkbox" });
  recursive.checked = S.filters.recursive;
  recursive.disabled = !S.folder;
  const check = (input, label, hint) => h("label", { class: "check" },
    input,
    h("span", {}, h("strong", { text: label }), hint ? h("small", { text: hint }) : null)
  );
  const content = h("div", {},
    h("div", { class: "filter-grid" },
      field("Minimum size (MB)", min),
      field("Maximum size (MB)", max),
      field("Telegram date from", after),
      field("Telegram date to", before)
    ),
    h("div", { class: "filter-checks" },
      check(note, "Only files with notes"),
      S.folder ? check(recursive, "Include subfolders", `Also search inside ${S.folder}`) : null
    ),
    h("p", { class: "modal-note", text: "Filters combine with the search box, type filter, folder and tag. Dates use the file’s Telegram date." })
  );
  openModal({
    title: "Advanced filters",
    content,
    wide: true,
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Clear",
        onClick: async () => {
          S.filters = newFilterState();
          localStorage.setItem("tfe_filters", JSON.stringify(S.filters));
          savePrefs({ filters: S.filters });
          closeModal();
          updateFilterBadge();
          await loadItems({ reset: true });
        }
      },
      {
        label: "Apply",
        class: "primary",
        onClick: async () => {
          const minValue = min.value.trim();
          const maxValue = max.value.trim();
          if (minValue && maxValue && Number(minValue) > Number(maxValue)) {
            toast("The minimum size is larger than the maximum size.", "error");
            return;
          }
          if (after.value && before.value && after.value > before.value) {
            toast("The start date is after the end date.", "error");
            return;
          }
          S.filters = {
            min: minValue, max: maxValue,
            after: after.value, before: before.value,
            note: note.checked, recursive: recursive.checked
          };
          localStorage.setItem("tfe_filters", JSON.stringify(S.filters));
          savePrefs({ filters: S.filters });
          closeModal();
          updateFilterBadge();
          updateBreadcrumb();
          await loadItems({ reset: true });
        }
      }
    ]
  });
}
function promptDelete() {
  const item = selectedItem();
  if (!item) return;
  const remove = h("button", { class: "modal-option", type: "button" },
    h("span", {},
      h("strong", { text: item.hidden ? "Restore to this library" : "Remove from this library" }),
      h("span", {
        text: item.hidden
          ? "Brings the file back into All files. The Telegram message was never touched."
          : "Hides the entry in the explorer and in future syncs. The Telegram message is kept."
      })
    )
  );
  const remote = h("button", { class: "modal-option danger", type: "button" },
    h("span", {},
      h("strong", { text: "Delete from Telegram" }),
      h("span", { text: "Deletes the channel message for every member. This cannot be undone." })
    )
  );
  remove.addEventListener("click", async () => {
    closeModal();
    if (item.hidden) { await restoreItem(item); return; }
    try {
      await api(`/api/items/${item.id}?remote=0`, { method: "DELETE" });
      clearSelection();
      toast("Removed from the library. You can restore it from Hidden.", "success", 6000);
      await refreshLibrary(false);
    } catch (error) { toast(error.message, "error"); }
  });
  remote.addEventListener("click", async () => {
    closeModal();
    try {
      await api(`/api/items/${item.id}?remote=1`, { method: "DELETE" });
      clearSelection();
      toast("Deleted from Telegram.", "success");
      await refreshLibrary(false);
    } catch (error) { toast(error.message, "error"); }
  });
  openModal({
    title: item.hidden ? "Restore or delete file" : "Delete file",
    subtitle: item.name,
    content: h("div", {},
      h("p", { text: "Choose what should happen to this file." }),
      remove,
      remote,
      h("p", { class: "modal-note", text: "You can close this dialog to keep the file." })
    ),
    actions: [{ label: "Cancel", onClick: closeModal }]
  });
}
function promptFavorite() {
  const item = selectedItem();
  if (!item) return;
  toggleFavorite(item);
}
async function toggleFavorite(item) {
  try {
    await api(`/api/items/${item.id}`, { method: "PATCH", body: { favorite: !item.favorite } });
    toast(item.favorite ? "Removed from favorites." : "Added to favorites.", "success");
    await Promise.all([loadNav(), loadItems({ reset: true })]);
    if (S.items.some((entry) => entry.id === item.id)) selectItem(item.id);
    else clearSelection();
  } catch (error) { toast(error.message, "error"); }
}
async function restoreItem(item) {
  if (!item) return;
  try {
    await api(`/api/items/${item.id}`, { method: "PATCH", body: { hidden: false } });
    clearSelection();
    toast("Restored to the library.", "success");
    await Promise.all([loadNav(), loadItems({ reset: true })]);
  } catch (error) { toast(error.message, "error"); }
}
function promptNewFolder(parent) {
  const base = typeof parent === "string" ? parent : (S.folder || "");
  const input = inputEl({ type: "text", placeholder: base ? "New subfolder" : "New folder", maxlength: "180", autocomplete: "off" });
  openModal({
    title: base ? "New subfolder" : "New folder",
    subtitle: base || undefined,
    content: field("Folder name", input, "Folders are virtual; files remain in your Telegram channel. Nested paths are created automatically."),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Create",
        class: "primary",
        onClick: async () => {
          const name = input.value.trim();
          if (!name) { toast("Enter a folder name.", "error"); return; }
          const target = base ? `${base}/${name}` : name;
          try {
            const data = await api("/api/folders", { method: "POST", body: { name: target } });
            closeModal();
            await loadNav();
            openFolder(data.folder);
            toast("Folder created.", "success");
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
}
function promptRenameFolder(folder) {
  const leaf = folder.name || folder.folder;
  const input = inputEl({ type: "text", value: leaf, maxlength: "180", autocomplete: "off" });
  openModal({
    title: "Rename folder",
    subtitle: folder.folder,
    content: field("Folder name", input, "Renaming changes this folder and everything inside it. Use the Move command on files to change their folder."),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Rename",
        class: "primary",
        onClick: async () => {
          const name = input.value.trim();
          if (!name) { toast("Enter a folder name.", "error"); return; }
          try {
            const data = await api("/api/folders", { method: "PATCH", body: { name: folder.folder, new_name: name } });
            closeModal();
            const oldPath = folder.folder;
            const newPath = data.folder;
            const oldLower = oldPath.toLowerCase();
            if (S.folder.toLowerCase() === oldLower) S.folder = newPath;
            else if (S.folder.toLowerCase().startsWith(oldLower + "/")) S.folder = newPath + S.folder.slice(oldPath.length);
            if (S.selectedFolderPath) {
              const selLower = S.selectedFolderPath.toLowerCase();
              if (selLower === oldLower) S.selectedFolderPath = newPath;
              else if (selLower.startsWith(oldLower + "/")) S.selectedFolderPath = newPath + S.selectedFolderPath.slice(oldPath.length);
            }
            await loadNav();
            await loadItems({ reset: true });
            toast("Folder renamed.", "success");
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
  input.focus();
  input.select();
}
function downloadFolder(folder) {
  if (!folder) return;
  const link = h("a", {
    href: `/api/folders/download?name=${encodeURIComponent(folder.folder)}`,
    download: ""
  });
  document.body.append(link);
  link.click();
  link.remove();
  toast("Preparing ZIP download…", "info", 5000);
}
function promptDeleteFolder(folder) {
  openModal({
    title: "Delete folder?",
    subtitle: folder.folder,
    content: h("div", {},
      h("p", { text: "Only empty folders can be deleted. The files stay in Telegram and keep their names." }),
      h("p", { class: "modal-note", text: "To delete a folder with files, move or delete the files first. Subfolders must also be empty." })
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Delete",
        class: "danger",
        onClick: async () => {
          try {
            await api(`/api/folders?name=${encodeURIComponent(folder.folder)}`, { method: "DELETE" });
            closeModal();
            const target = folder.folder.toLowerCase();
            if (S.selectedFolderPath && S.selectedFolderPath.toLowerCase() === target) S.selectedFolderPath = null;
            if (S.folder.toLowerCase() === target || S.folder.toLowerCase().startsWith(target + "/")) {
              const cut = folder.folder.lastIndexOf("/");
              S.folder = cut > 0 ? folder.folder.slice(0, cut) : "";
              await loadNav();
              await loadItems({ reset: true });
            } else {
              await loadNav();
              renderItems();
            }
            toast("Folder removed.", "success");
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
}
function openFolderMenu(event, folder) {
  showContextMenu(event.clientX, event.clientY, [
    { label: "Open", icon: "folderOpen", onClick: () => openFolder(folder.folder) },
    { label: "Download as ZIP", icon: "download", onClick: () => downloadFolder(folder) },
    { separator: true },
    { label: "Icon and note…", icon: "palette", onClick: () => promptFolderProperties(folder) },
    { label: "New subfolder…", icon: "folderPlus", onClick: () => promptNewFolder(folder.folder) },
    { label: "Rename folder…", icon: "edit", onClick: () => promptRenameFolder(folder) },
    { separator: true },
    {
      label: "Delete empty folder",
      icon: "trash",
      danger: true,
      disabled: folder.n > 0,
      onClick: () => promptDeleteFolder(folder)
    }
  ]);
}
function promptSettings() {
  const st = S.status || {};
  const stats = (S.nav && S.nav.stats) || (st.stats || {});
  const displayName = st.user
    ? [st.user.first_name, st.user.last_name].filter(Boolean).join(" ") || st.user.username || "Telegram account"
    : "Not signed in";
  const account = h("div", { class: "settings-account" },
    h("span", { class: "settings-avatar", text: initials(displayName) }),
    h("span", {},
      h("div", { class: "settings-name", text: displayName }),
      h("div", { class: "settings-sub", text: st.user ? (st.user.username ? `@${st.user.username}` : st.user.phone || "") : "Connect Telegram to browse your channel." })
    )
  );
  const sectionChannel = h("div", { class: "settings-section" },
    h("h3", { text: "Storage channel" }),
    h("div", { class: "settings-row" }, h("span", { text: "Channel" }), h("span", { class: "value", text: st.vault ? st.vault.title : "Not chosen" })),
    h("div", { class: "settings-row" }, h("span", { text: "Channel ID" }), h("span", { class: "value", text: st.vault ? String(st.vault.id) : "—" })),
    h("div", { class: "settings-actions" },
      btn("Change channel…", "btn", () => {
        if (!st.authorized) { toast("Sign in first.", "error"); return; }
        closeModal();
        S.authStage = "channel";
        S.loginForced = true;
        S.selectedChannel = null;
        showLogin();
      }),
      btn("Open in Telegram", "btn", () => {
        if (!st.vault) return;
        const link = st.vault.username ? `https://t.me/${st.vault.username}` : `https://t.me/c/${Math.abs(Number(st.vault.id)) - 1000000000000}`;
        window.open(link, "_blank", "noopener");
      })
    )
  );
  const sectionLibrary = h("div", { class: "settings-section" },
    h("h3", { text: "Library" }),
    h("div", { class: "settings-row" }, h("span", { text: "Files" }), h("span", { class: "value", text: String(stats.count || 0) })),
    h("div", { class: "settings-row" }, h("span", { text: "Total size" }), h("span", { class: "value", text: fmtSize(stats.size || 0) })),
    h("div", { class: "settings-row" }, h("span", { text: "Favorites" }), h("span", { class: "value", text: String(stats.favorites || 0) })),
    h("div", { class: "settings-row" }, h("span", { text: "Last indexed" }), h("span", { class: "value", text: stats.last_sync ? fmtDate(stats.last_sync) : "Never" })),
    h("div", { class: "settings-actions" },
      btn("Sync now", "btn", () => { closeModal(); if (ready()) startSync(false); }),
      btn("Reload library", "btn", () => { closeModal(); refreshLibrary(false); })
    )
  );
  const sectionAppearance = h("div", { class: "settings-section" },
    h("h3", { text: "Appearance" }),
    themeGrid(),
    h("p", { class: "modal-note", text: "Mica tints the window with your wallpaper palette. Acrylic adds translucent glass. System follows the Windows light or dark setting." })
  );
  const sectionSecurity = h("div", { class: "settings-section" },
    h("h3", { text: "Security" }),
    h("div", { class: "settings-row" }, h("span", { text: "App lock" }), h("span", { class: "value", text: st.pin_set ? "PIN enabled" : "No PIN" })),
    h("div", { class: "settings-actions" },
      st.pin_set
        ? btn("Change PIN…", "btn", promptPinChange)
        : btn("Create PIN…", "btn", promptPinSetup),
      st.pin_set ? btn("Remove PIN…", "btn danger", promptPinRemove) : null
    ),
    h("p", { class: "modal-note", text: "The PIN is asked when the app opens and hides the library until you enter it. The lock button in the title bar locks the app immediately. Only a hash of the PIN is stored; if you forget it, Forgot PIN? on the lock screen sends a code to Saved Messages in Telegram to set a new one." })
  );
  const sectionConnection = h("div", { class: "settings-section" },
    h("h3", { text: "Connection" }),
    h("div", { class: "settings-row" }, h("span", { text: "Telegram" }), h("span", { class: "value", text: st.authorized ? "Signed in" : "Not signed in" })),
    h("div", { class: "settings-row" }, h("span", { text: "Explorer version" }), h("span", { class: "value", text: "2.0" })),
    h("div", { class: "settings-row" },
      h("span", { text: "Server bot" }),
      h("span", { class: "value", text: S.server ? (SERVER_LABELS[S.server.state] || "Unknown") : "Checking…" })
    ),
    st.state === "error" && st.error ? h("p", { class: "modal-note", text: st.error }) : null,
    h("div", { class: "settings-actions" },
      btn("Reconnect", "btn", async () => {
        try {
          S.status = await api("/api/reconnect", { method: "POST" });
          updateChrome();
          toast("Reconnected.", "success");
          closeModal();
          if (ready()) refreshLibrary(true);
          else { renderLogin(); showLogin(); }
        } catch (error) { toast(error.message, "error"); }
      }),
      st.authorized ? btn("Log out…", "btn danger", () => promptLogout()) : null,
      btn("Server details…", "btn", () => { closeModal(); showServerDetails(); }),
      btn("Quit app", "btn", quitApp)
    )
  );
  const sectionTools = h("div", { class: "settings-section" },
    h("h3", { text: "Library tools" }),
    h("div", { class: "settings-actions" },
      btn("Duplicate files…", "btn", () => { closeModal(); promptDuplicates(); }),
      btn("Storage report…", "btn", () => { closeModal(); promptStorage(); })
    ),
    h("p", { class: "modal-note", text: "Duplicates are matched by name and size. The storage report breaks the vault down by file type and lists the largest files." })
  );
  const shortcuts = h("div", { class: "settings-section" },
    h("h3", { text: "Keyboard shortcuts" }),
    shortcutGridNode()
  );
  const notes = h("div", { class: "settings-section" },
    h("h3", { text: "Good to know" }),
    h("p", { class: "modal-note", text: "Files live in your private Telegram channel. Folders, tags, favorites, collections and names are the local index; renaming also updates the Telegram caption." }),
    h("p", { class: "modal-note", text: "The Telegram session and library database are stored in your Windows profile (%APPDATA%\\TelegramFileExplorer). The bot runs on your always-on server, so this app never starts or stops it, and the bot token is never used here." }),
    h("p", { class: "modal-note", text: `Files above your Telegram account limit (${uploadLimitLabel()} per file) are split into archive parts automatically. Picking "Download complete file" on any part fetches all parts and joins them back into the original file. Deleting from Telegram removes the message from the channel.` })
  );
  const content = h("div", {}, account, sectionAppearance, sectionSecurity, sectionChannel, sectionLibrary, sectionTools, sectionConnection, shortcuts, notes);
  openModal({
    title: "Settings and help",
    subtitle: "Account, appearance, channel, library and shortcuts",
    content,
    wide: true,
    actions: [{ label: "Close", onClick: closeModal }]
  });
}
function confirmQuit() {
  openModal({
    title: "Quit Telegram File Explorer?",
    subtitle: "The window closes; the Telegram bot keeps running on your server.",
    content: h("div", {},
      h("p", { class: "modal-note", text: "The library snapshot is saved to your Telegram vault first, then the window closes. Files stay in Telegram and the bot stays online, so nothing needs starting next time." })
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      { label: "Quit app", class: "danger", onClick: () => quitApp() }
    ]
  });
}
async function quitApp() {
  if (S.quitting) return;
  S.quitting = true;
  closeModal();
  document.body.replaceChildren(
    h("div", { class: "quit-screen" },
      h("div", { class: "quit-card" },
        h("span", { class: "spinner" }),
        h("strong", { text: "Shutting down…" }),
        h("p", { text: "Saving the library snapshot to your vault. The window closes by itself; the bot stays online." })
      )
    )
  );
  try {
    await api("/api/quit", { method: "POST" });
  } catch (_) { /* the server may stop before answering */ }
  try { window.close(); } catch (_) { /* WebView window is closed by the app */ }
}
function promptLogout() {
  openModal({
    title: "Log out of Telegram?",
    content: h("div", {},
      h("p", { text: "The Telegram session on this PC will be removed. Your files stay in the channel, and the local library keeps its names and folders." }),
      h("p", { class: "modal-note", text: "You will need a new login code to use the explorer again." })
    ),
    actions: [
      { label: "Cancel", onClick: closeModal },
      {
        label: "Log out",
        class: "danger",
        onClick: async () => {
          try {
            S.status = await api("/api/logout", { method: "POST" });
            S.authStage = "";
            S.selectedChannel = null;
            S.items = [];
            S.nav = { folders: [], tags: [], kinds: [], stats: { count: 0, size: 0, favorites: 0 } };
            S.selectedId = null;
            S.navMode = "all";
            S.hiddenOnly = false;
            S.folder = "";
            S.tag = "";
            S.kind = "";
            S.q = "";
            resetHistory();
            closeModal();
            clearSelection();
            renderSidebar();
            renderItems();
            updateChrome();
            renderLogin();
            showLogin();
            toast("Logged out.", "success");
          } catch (error) { toast(error.message, "error"); }
        }
      }
    ]
  });
}

/* -------------------------------------------------------------- context */
function showContextMenu(x, y, entries) {
  const menu = $("contextMenu");
  menu.replaceChildren();
  for (const entry of entries) {
    if (!entry) continue;
    if (entry.separator) {
      menu.append(h("div", { class: "menu-sep" }));
      continue;
    }
    const node = h("button", { class: `menu-item ${entry.danger ? "danger" : ""}`.trim(), type: "button", disabled: entry.disabled ? true : null },
      iconNode(entry.icon || "file", "menu-icon"),
      h("span", { text: entry.label }),
      entry.key ? h("span", { class: "menu-key", text: entry.key }) : null
    );
    node.addEventListener("click", () => {
      hideContextMenu();
      if (!entry.disabled && entry.onClick) entry.onClick();
    });
    menu.append(node);
  }
  menu.hidden = false;
  const width = 224;
  const height = menu.offsetHeight || entries.length * 31;
  menu.style.left = `${Math.max(6, Math.min(x, window.innerWidth - width - 8))}px`;
  menu.style.top = `${Math.max(6, Math.min(y, window.innerHeight - height - 8))}px`;
}
function hideContextMenu() {
  $("contextMenu").hidden = true;
}
function openItemMenu(event, item) {
  event.preventDefault();
  selectItem(item.id);
  const entries = [
    { label: "Open", icon: "play", key: "Enter", onClick: () => openViewerFor(item) },
    item.viewer ? { label: "View 3D model", icon: "cube", onClick: () => openModelViewer(item) } : null,
    item.family === "cad" || (item.family === "model" && !item.viewer)
      ? { label: "Open in its Windows app", icon: "external", onClick: () => openExternalItem(item) }
      : null,
    { label: "Download", icon: "download", onClick: () => downloadItem(item) },
    item.kind === "video"
      ? { label: "Choose thumbnail…", icon: "image", onClick: () => promptThumbPicker(item) }
      : null,
    item.kind === "document" && !item.part_of
      ? { label: "Fix video streaming…", icon: "video", onClick: () => promptReupload(item) }
      : null,
    item.part_of && item.part_of.count > 1
      ? { label: `Download complete file (${item.part_of.count} parts)`, icon: "download", onClick: () => startMergeDownload(item) }
      : null,
    item.hidden ? { label: "Restore to library", icon: "eyeOff", onClick: () => restoreItem(item) } : null,
    { separator: true },
    { label: "Rename…", icon: "edit", key: "F2", onClick: () => promptRename() },
    { label: "Move to folder…", icon: "move", onClick: () => promptMove() },
    { label: "Edit tags…", icon: "tag", onClick: () => promptTags() },
    { label: "Add to collection…", icon: "layers", onClick: () => promptCollections(item) },
    { label: "File details…", icon: "info", onClick: () => inspectItem(item) },
    (item.family === "model" || item.family === "cad")
      ? { label: "Use Windows thumbnail", icon: "image", onClick: () => windowsThumbnail(item) }
      : null,
    { label: "Stars…", icon: "user", onClick: () => promptStars(item) },
    (item.kind === "video" || item.kind === "document") && !item.part_of
      ? { label: item.movie ? "Update IMDb details…" : "Add IMDb details…", icon: "video", onClick: () => promptMovie(item) }
      : null,
    { label: item.note ? "Edit note…" : "Add note…", icon: "note", onClick: () => promptNote(item) },
    { label: item.favorite ? "Remove from favorites" : "Add to favorites", icon: "star", onClick: () => toggleFavorite(item) },
    { separator: true }
  ];
  if (item.telegram_link) {
    entries.push({ label: "Open in Telegram", icon: "link", onClick: () => window.open(item.telegram_link, "_blank", "noopener") });
    entries.push({ separator: true });
  }
  entries.push({ label: "Delete…", icon: "trash", key: "Del", danger: true, onClick: () => promptDelete() });
  showContextMenu(event.clientX, event.clientY, entries);
}

/* --------------------------------------------------------------- uploads */
function uploadEntries(input) {
  return Array.from(input || [])
    .map((entry) => {
      const file = entry && entry.file ? entry.file : entry;
      if (!file || file.size === undefined) return null;
      const rel = String((entry && entry.rel) || file.webkitRelativePath || file.name || "").replace(/\\/g, "/");
      return { file, rel: rel || file.name };
    })
    .filter(Boolean);
}
function uploadRootLabel(entries) {
  if (entries.length === 1) return entries[0].rel;
  const first = entries[0].rel.split("/");
  return first.length > 1 && first[0] ? `${first[0]} (${plural(entries.length, "file")})` : plural(entries.length, "file");
}
function collectDroppedEntries(dataTransfer) {
  const entries = Array.from((dataTransfer && dataTransfer.items) || [])
    .map((item) => (typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null))
    .filter(Boolean);
  if (!entries.length) {
    return Promise.resolve(
      Array.from((dataTransfer && dataTransfer.files) || []).map((file) => ({ file, rel: file.name }))
    );
  }
  const collected = [];
  return (async () => {
    for (const entry of entries) await walkDroppedEntry(entry, "", collected);
    return collected;
  })();
}
function walkDroppedEntry(entry, prefix, collected) {
  return new Promise((resolve) => {
    if (!entry) { resolve(); return; }
    if (entry.isFile) {
      entry.file(
        (file) => { collected.push({ file, rel: `${prefix}${file.name}` }); resolve(); },
        () => resolve()
      );
      return;
    }
    if (!entry.isDirectory) { resolve(); return; }
    const reader = entry.createReader();
    const readBatch = () => {
      reader.readEntries(
        async (batch) => {
          if (!batch.length) { resolve(); return; }
          for (const child of batch) await walkDroppedEntry(child, `${prefix}${entry.name}/`, collected);
          readBatch();
        },
        () => resolve()
      );
    };
    readBatch();
  });
}
function uploadLimit() {
  const value = Number(S.status && S.status.max_upload);
  return Number.isFinite(value) && value > 0 ? value : 2 * 1024 * 1024 * 1024;
}
function uploadLimitLabel() {
  return `${Math.round(uploadLimit() / (1024 ** 3))} GB`;
}
function splitMax() {
  const value = Number(S.status && S.status.split_max);
  return Number.isFinite(value) && value > 0 ? value : 64 * 1024 * 1024 * 1024;
}
function startUpload(input) {
  if (!ready()) { renderLogin(); showLogin(); return; }
  if (S.localUpload) {
    toast("Wait for the current upload to finish before adding more files.", "error");
    return;
  }
  const entries = uploadEntries(input);
  if (!entries.length) return;
  const tooBig = entries.find((entry) => entry.file.size > splitMax());
  if (tooBig) {
    toast(`${tooBig.rel} is larger than the ${Math.round(splitMax() / (1024 ** 3))} GB limit this app can split into parts.`, "error", 6000);
    return;
  }
  const total = entries.reduce((sum, entry) => sum + entry.file.size, 0);
  const folder = S.folder || "";
  const client = `c${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const form = new FormData();
  form.append("paths", JSON.stringify(entries.map((entry) => entry.rel)));
  form.append("client", client);
  for (const entry of entries) form.append("files", entry.file, entry.file.name);
  if (folder) form.append("folder", folder);
  const xhr = new XMLHttpRequest();
  S.localUpload = {
    name: uploadRootLabel(entries),
    size: total,
    sent: 0,
    state: "sending",
    client,
    canceled: false,
    xhr
  };
  $("uploadBtn").disabled = true;
  renderUploads();
  showUploadPanel();
  xhr.open("POST", "/api/upload");
  xhr.setRequestHeader("X-TFE", "1");
  xhr.withCredentials = true;
  xhr.upload.onprogress = (event) => {
    if (!event.lengthComputable || !S.localUpload) return;
    S.localUpload.sent = event.loaded;
    renderUploads();
  };
  xhr.onload = async () => {
    const local = S.localUpload;
    S.localUpload = null;
    $("uploadBtn").disabled = !ready();
    if (local && local.canceled) { renderUploads(); return; }
    let data = null;
    try { data = JSON.parse(xhr.responseText || "{}"); } catch (_) { data = {}; }
    if (xhr.status >= 200 && xhr.status < 300) {
      S.transfers = data.transfers || [];
      renderUploads();
      showUploadPanel();
      startTransferPolling();
      setStatus("Uploading to Telegram…");
    } else {
      const message = (data && data.detail) || `Upload failed (${xhr.status})`;
      toast(typeof message === "string" ? message : "Upload failed.", "error", 6000);
      renderUploads();
    }
  };
  xhr.onerror = () => {
    const local = S.localUpload;
    S.localUpload = null;
    $("uploadBtn").disabled = !ready();
    if (!local || !local.canceled) {
      toast("The upload could not reach the local app.", "error");
    }
    renderUploads();
  };
  xhr.send(form);
}
function cancelLocalUpload() {
  const local = S.localUpload;
  if (!local) return;
  local.canceled = true;
  S.localUpload = null;
  try { local.xhr.abort(); } catch (_) { /* request already finished */ }
  $("uploadBtn").disabled = !ready();
  renderUploads();
  setStatus("Upload cancelled");
  toast("Upload cancelled.", "success", 3000);
  // The app may have accepted the body just before the abort landed; make
  // sure any transfers it queued for this batch are cancelled too.
  api("/api/transfers/cancel", { method: "POST", body: { client: local.client } })
    .then(() => fetchTransfers(false))
    .catch(() => {});
}
async function cancelTransfer(id) {
  try {
    await api(`/api/transfers/${encodeURIComponent(id)}/cancel`, { method: "POST" });
    toast("Cancelling…", "success", 2500);
    await fetchTransfers(false);
    startTransferPolling();
  } catch (error) {
    if (error && error.status === 404) {
      toast("That transfer already finished.", "info", 3000);
      await fetchTransfers(false);
      return;
    }
    toast(error.message || "The transfer could not be cancelled.", "error");
  }
}
function showUploadPanel() {
  $("uploadPanel").hidden = false;
}
function transferActive(state) {
  return state === "queued" || state === "uploading" || state === "splitting"
    || state === "downloading" || state === "merging";
}
function renderUploads() {
  const panel = $("uploadPanel");
  const list = $("uploadList");
  const rows = [];
  if (S.localUpload) {
    const local = S.localUpload;
    const pct = local.size ? Math.min(100, Math.round((local.sent / local.size) * 100)) : 0;
    const sub = h("div", { class: "upload-sub" }, "Sending to the app… ");
    const cancel = h("button", { class: "link-btn", type: "button", text: "Cancel" });
    cancel.addEventListener("click", cancelLocalUpload);
    sub.append(cancel);
    rows.push(h("div", { class: "upload-row" },
      h("div", { class: "upload-line" }, h("span", { class: "upload-name", text: local.name, title: local.name }), h("span", { class: "upload-pct", text: `${pct}%` })),
      h("div", { class: "upload-track" }, h("i", { style: `width:${pct}%` })),
      sub
    ));
  }
  for (const transfer of S.transfers) {
    const state = transfer.state;
    const active = transferActive(state);
    const pct = state === "merging" || state === "ready"
      ? 100
      : transfer.size ? Math.min(100, Math.round(((transfer.sent || 0) / transfer.size) * 100)) : active ? 0 : 100;
    let sub;
    if (state === "error") sub = transfer.error;
    else if (state === "cancelled") sub = "Cancelled";
    else if (state === "done") sub = transfer.parts ? `Done · ${transfer.parts} parts uploaded` : "Done";
    else if (state === "queued") sub = "Queued";
    else if (state === "splitting") sub = "Splitting into archive parts…";
    else if (state === "downloading") sub = `Downloading parts · ${fmtSize(transfer.sent || 0)} of ${fmtSize(transfer.size)}`;
    else if (state === "merging") sub = "Joining parts into one file…";
    else if (state === "ready") sub = "Complete file ready to save";
    else sub = `${fmtSize(transfer.sent || 0)} of ${fmtSize(transfer.size)}${transfer.parts ? ` · ${transfer.parts} parts` : ""}`;
    const subLine = h("div", { class: "upload-sub" });
    subLine.append(sub);
    if (state === "ready" && transfer.result_url) {
      const save = h("button", { class: "link-btn", type: "button", text: "Save file" });
      save.addEventListener("click", () => downloadItem({ download_url: transfer.result_url }));
      subLine.append(" ", save);
    }
    if (active) {
      const cancel = h("button", { class: "link-btn", type: "button", text: "Cancel" });
      cancel.addEventListener("click", () => cancelTransfer(transfer.id));
      subLine.append(" ", cancel);
    }
    const pctText = state === "error" ? "!" : state === "cancelled" ? "—" : `${pct}%`;
    rows.push(h("div", { class: `upload-row ${state}` },
      h("div", { class: "upload-line" }, h("span", { class: "upload-name", text: transfer.name, title: transfer.name }), h("span", { class: "upload-pct", text: pctText })),
      h("div", { class: "upload-track" }, h("i", { style: `width:${pct}%` })),
      subLine
    ));
  }
  if (!rows.length) {
    list.replaceChildren(h("div", { class: "upload-empty", text: "No uploads in this session." }));
  } else {
    list.replaceChildren(...rows);
  }
  panel.hidden = !S.localUpload && !S.transfers.length;
}
function startTransferPolling() {
  if (S.transferTimer) return;
  S.transferTimer = setInterval(pollTransfers, 900);
}
async function pollTransfers() {
  try {
    const data = await api("/api/transfers");
    const transfers = data.transfers || [];
    const active = transfers.filter((transfer) => transferActive(transfer.state));
    let newlyDone = 0;
    let newlyFailed = 0;
    let newlyReady = 0;
    let newlyCancelled = 0;
    for (const transfer of transfers) {
      if (transfer.state === "done" && !S.seenTransfers.has(transfer.id)) {
        S.seenTransfers.add(transfer.id);
        newlyDone += 1;
      }
      if (transfer.state === "error" && !S.seenTransfers.has(`e:${transfer.id}`)) {
        S.seenTransfers.add(`e:${transfer.id}`);
        newlyFailed += 1;
        toast(`${transfer.name}: ${transfer.error || "upload failed"}`, "error", 7000);
      }
      if (transfer.state === "ready" && !S.seenTransfers.has(`r:${transfer.id}`)) {
        S.seenTransfers.add(`r:${transfer.id}`);
        newlyReady += 1;
      }
      if (transfer.state === "cancelled" && !S.seenTransfers.has(`c:${transfer.id}`)) {
        S.seenTransfers.add(`c:${transfer.id}`);
        newlyCancelled += 1;
      }
    }
    S.transfers = transfers;
    renderUploads();
    if (newlyDone) {
      await Promise.all([loadNav(), loadItems({ reset: true })]);
      toast(`${plural(newlyDone, "upload")} complete.`, "success");
      setStatus("Upload complete");
    }
    if (newlyReady) {
      toast(`Complete file ready — click Save file in the transfers list.`, "success", 7000);
      setStatus("Merged file ready");
    }
    if (newlyCancelled) {
      // A split upload may have already sent parts; the app removes them
      // when it processes the cancel, so refresh the library.
      await Promise.all([loadNav(), loadItems({ reset: true })]);
      setStatus("Upload cancelled");
    }
    if (!active.length && !S.localUpload) {
      clearInterval(S.transferTimer);
      S.transferTimer = null;
      $("uploadBtn").disabled = !ready();
    }
  } catch (_) {
    /* transient poll failure */
  }
}
async function fetchTransfers(showPanel) {
  try {
    const data = await api("/api/transfers");
    S.transfers = data.transfers || [];
    for (const transfer of S.transfers) {
      if (transfer.state === "done") S.seenTransfers.add(transfer.id);
      if (transfer.state === "error") S.seenTransfers.add(`e:${transfer.id}`);
      if (transfer.state === "ready") S.seenTransfers.add(`r:${transfer.id}`);
    }
    renderUploads();
    if (showPanel && S.transfers.some((transfer) => transferActive(transfer.state))) {
      showUploadPanel();
      startTransferPolling();
    }
  } catch (_) { /* ignore */ }
}

/* ------------------------------------------------------------------ sync */
async function startSync(auto) {
  if (!ready()) {
    if (!auto) { renderLogin(); showLogin(); }
    return;
  }
  if (S.syncTimer) return;
  try {
    const data = await api("/api/sync", { method: "POST" });
    setStatus(data.started ? "Sync started" : "Sync already running");
    pollSync();
  } catch (error) {
    toast(error.message, "error");
  }
}
async function pollSync() {
  if (S.syncTimer) return;
  S.syncTimer = setInterval(syncTick, 800);
  await syncTick();
}
async function syncTick() {
  try {
    const data = await api("/api/sync");
    const sync = data.sync || {};
    renderSyncState(sync);
    if (!sync.running) {
      clearInterval(S.syncTimer);
      S.syncTimer = null;
      $("syncBtn").classList.remove("spinning");
      const key = sync.finished || "done";
      if (S.syncFinalHandled !== key) {
        S.syncFinalHandled = key;
        if (sync.error) toast(sync.error, "error", 7000);
        else if (sync.mode === "incremental" && !(sync.stored || 0)) toast("Up to date — no new messages.", "success", 4000);
        else toast(`Sync complete — ${plural(sync.stored || 0, "file")} indexed${sync.imported ? `, ${sync.imported} names adopted` : ""}.`, "success", 5000);
        await Promise.all([loadNav(), loadItems({ reset: true }), refreshStatusOnly()]);
        updateChrome();
      }
      setTimeout(() => { $("syncStatus").hidden = true; }, 900);
    }
  } catch (error) {
    clearInterval(S.syncTimer);
    S.syncTimer = null;
    $("syncBtn").classList.remove("spinning");
    $("syncStatus").hidden = true;
    toast(error.message, "error");
  }
}
function renderSyncState(sync) {
  const wrap = $("syncStatus");
  wrap.hidden = false;
  const track = wrap.querySelector(".sync-track");
  const bar = $("syncBar");
  if (sync.total > 0) {
    track.classList.remove("indeterminate");
    bar.style.width = `${Math.min(100, Math.round(((sync.scanned || 0) / sync.total) * 100))}%`;
  } else {
    track.classList.add("indeterminate");
    bar.style.width = "";
  }
  $("syncLabel").textContent = sync.running
    ? (sync.mode === "incremental" && !sync.total
      ? `Checking new messages · ${sync.stored || 0} stored`
      : `Scanning ${sync.scanned || 0}${sync.total ? ` of ${sync.total}` : ""} · ${sync.stored || 0} stored`)
    : `Sync ${sync.error ? "failed" : "complete"}`;
  $("syncBtn").disabled = true;
  $("syncBtn").classList.add("spinning");
  $("statusText").textContent = "Syncing with Telegram…";
  updateChrome();
}
async function refreshStatusOnly() {
  try {
    S.status = await api("/api/status");
    updateChrome();
  } catch (_) { /* ignore */ }
}

/* ---------------------------------------------------------------- events */
function bindEvents() {
  document.querySelectorAll("#nav .nav-item").forEach((node) => {
    node.addEventListener("click", () => {
      if (node.dataset.nav === "recent") navigateScope({ navMode: "recent", folder: "", tag: "", kind: "", sort: "added", dir: "desc" });
      else if (node.dataset.nav === "continue") navigateScope({ navMode: "continue", folder: "", tag: "", kind: "", watching: true, sort: "date", dir: "desc" });
      else if (node.dataset.nav === "favorites") navigateScope({ navMode: "favorites", folder: "", tag: "", kind: "", sort: "date", dir: "desc" });
      else if (node.dataset.nav === "hidden") navigateScope({ navMode: "hidden", folder: "", tag: "", kind: "", sort: "date", dir: "desc" });
      else if (node.dataset.nav === "stars") navigateScope({ navMode: "stars", folder: "", tag: "", kind: "", q: "" });
      else navigateScope({ navMode: "all", folder: "", tag: "", kind: "", sort: "date", dir: "desc" });
    });
  });
  $("backBtn").addEventListener("click", goBack);
  $("forwardBtn").addEventListener("click", goForward);
  $("upBtn").addEventListener("click", goUp);
  for (const type of ["mousedown", "mouseup", "auxclick"]) {
    window.addEventListener(type, handleHistoryMouseButton, true);
  }
  $("previewToggle").addEventListener("click", togglePreview);
  $("searchInput").addEventListener("input", debounce(() => {
    S.q = $("searchInput").value.trim();
    updateBreadcrumb();
    reloadCurrentList();
  }, 220));
  $("searchInput").addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      $("searchInput").value = "";
      S.q = "";
      updateBreadcrumb();
      reloadCurrentList();
      $("searchInput").blur();
    }
  });
  $("kindSelect").addEventListener("change", () => {
    S.kind = $("kindSelect").value;
    updateBreadcrumb();
    reloadCurrentList();
  });
  $("sortSelect").addEventListener("change", () => setSort($("sortSelect").value, $("sortSelect").value === "name" ? "asc" : "desc"));
  $("sortDirBtn").addEventListener("click", () => {
    S.dir = S.dir === "asc" ? "desc" : "asc";
    localStorage.setItem("tfe_dir", S.dir);
    savePrefs({ dir: S.dir });
    updateSortArrows();
    if (!isStarCatalogue()) loadItems({ reset: true });
  });
  document.querySelectorAll(".col[data-sort]").forEach((node) => {
    node.addEventListener("click", () => setSort(node.dataset.sort));
  });
  document.querySelectorAll(".view-toggle button").forEach((node) => {
    node.addEventListener("click", () => setView(node.dataset.view));
  });
  $("rows").addEventListener("click", (event) => {
    const chip = event.target.closest(".star-chip");
    if (chip) {
      event.preventDefault();
      event.stopPropagation();
      openStar(Number(chip.dataset.star));
      return;
    }
    const row = event.target.closest(".row");
    if (!row) return;
    if (row.dataset.folder) selectFolderRow(row.dataset.folder);
    else handleItemClick(Number(row.dataset.id), event);
  });
  $("rows").addEventListener("dblclick", (event) => {
    if (event.target.closest(".star-chip")) return;
    const row = event.target.closest(".row");
    if (!row) return;
    if (row.dataset.folder) { openFolder(row.dataset.folder); return; }
    selectItem(Number(row.dataset.id));
    const item = selectedItem();
    if (item) openViewerFor(item);
  });
  $("rows").addEventListener("contextmenu", (event) => {
    const row = event.target.closest(".row");
    if (!row) return;
    event.preventDefault();
    if (row.dataset.folder) {
      const folder = folderEntry(row.dataset.folder);
      if (!folder) return;
      selectFolderRow(folder.folder);
      openFolderMenu(event, folder);
      return;
    }
    const item = S.items.find((entry) => entry.id === Number(row.dataset.id));
    if (!item) return;
    if (S.selection.has(item.id) && S.selection.size > 1) { openBulkMenu(event); return; }
    openItemMenu(event, item);
  });
  $("tilesView").addEventListener("click", (event) => {
    const chip = event.target.closest(".tile-stars");
    if (chip) {
      event.preventDefault();
      event.stopPropagation();
      const item = S.items.find((entry) => entry.id === Number(chip.closest(".tile").dataset.id));
      if (item && item.stars) {
        if (item.stars.length === 1) openStar(Number(item.stars[0].id));
        else showStarsMenu(event, item.stars);
      }
      return;
    }
    const tile = event.target.closest(".tile");
    if (!tile) return;
    if (tile.dataset.folder) selectFolderRow(tile.dataset.folder);
    else handleItemClick(Number(tile.dataset.id), event);
  });
  $("tilesView").addEventListener("dblclick", (event) => {
    if (event.target.closest(".tile-stars")) return;
    const tile = event.target.closest(".tile");
    if (!tile) return;
    stopHoverPreview();
    if (tile.dataset.folder) { openFolder(tile.dataset.folder); return; }
    selectItem(Number(tile.dataset.id));
    const item = selectedItem();
    if (item) openViewerFor(item);
  });
  $("tilesView").addEventListener("pointerover", (event) => {
    const tile = event.target.closest(".tile");
    if (!tile || tile === hoverTarget) return;
    if (hoverTarget && hoverTarget.contains(event.target)) return;
    stopHoverPreview();
    if (tile.dataset.folder || S.view !== "tiles") return;
    const item = S.items.find((entry) => entry.id === Number(tile.dataset.id));
    if (!item) return;
    if (isVideoLike(item)) {
      hoverTarget = tile;
      hoverTimer = setTimeout(() => {
        hoverTimer = 0;
        if (hoverTarget === tile) startHoverPreview(tile, item);
      }, HOVER_PREVIEW_DELAY);
    } else if (item.kind === "image" || item.kind === "sticker") {
      startHoverPreview(tile, item);
    }
  });
  $("tilesView").addEventListener("pointerout", (event) => {
    if (!hoverTarget) return;
    if (event.relatedTarget && hoverTarget.contains(event.relatedTarget)) return;
    stopHoverPreview();
  });
  $("tilesView").addEventListener("pointercancel", stopHoverPreview);
  window.addEventListener("blur", stopHoverPreview);
  $("tilesView").addEventListener("contextmenu", (event) => {
    const tile = event.target.closest(".tile");
    if (!tile) return;
    event.preventDefault();
    if (tile.dataset.folder) {
      const folder = folderEntry(tile.dataset.folder);
      if (!folder) return;
      selectFolderRow(folder.folder);
      openFolderMenu(event, folder);
      return;
    }
    const item = S.items.find((entry) => entry.id === Number(tile.dataset.id));
    if (!item) return;
    if (S.selection.has(item.id) && S.selection.size > 1) { openBulkMenu(event); return; }
    openItemMenu(event, item);
  });
  $("content").addEventListener("click", (event) => {
    if (event.target.closest(".row, .tile, button, a, input, select, .load-more")) return;
    if (S.selection.size || S.selectedId !== null || S.selectedFolderPath) clearSelection();
  });
  $("content").addEventListener("contextmenu", (event) => {
    if (event.target.closest(".row, .tile, .star-card")) return;
    event.preventDefault();
    if (!ready()) return;
    if (S.navMode === "stars") {
      showContextMenu(event.clientX, event.clientY, [
        { label: "New star…", icon: "user", onClick: () => promptStarEditor(null) }
      ]);
      return;
    }
    showContextMenu(event.clientX, event.clientY, [
      { label: "New folder…", icon: "folderPlus", onClick: () => promptNewFolder(S.folder) },
      { separator: true },
      { label: "Upload files…", icon: "upload", onClick: () => $("fileInput").click() },
      { label: "Upload folder…", icon: "uploadFolder", onClick: () => $("folderInput").click() }
    ]);
  });
  $("starGrid").addEventListener("click", (event) => {
    const card = event.target.closest(".star-card");
    if (card) openStar(Number(card.dataset.star));
  });
  $("starGrid").addEventListener("contextmenu", (event) => {
    const card = event.target.closest(".star-card");
    if (!card) return;
    const star = starById(Number(card.dataset.star));
    if (star) openStarMenu(event, star);
  });
  $("starNewBtn").addEventListener("click", () => promptStarEditor(null));
  $("starsBtn").addEventListener("click", () => promptStars(selectedItem()));
  $("bulkStars").addEventListener("click", () => promptStars(null));
  $("newCollectionBtn").addEventListener("click", () => promptNewCollection());
  $("saveViewBtn").addEventListener("click", promptSaveView);
  $("tagMetaBtn").addEventListener("click", promptTagManager);
  $("bulkCollections").addEventListener("click", () => promptCollections(null));
  $("bulkRename").addEventListener("click", promptBatchRename);
  $("collectionsBtn").addEventListener("click", () => promptCollections(selectedItem()));
  $("inspectLink").addEventListener("click", inspectLink);
  $("inspectBtn").addEventListener("click", inspectLink);
  $("modelBtn").addEventListener("click", () => openModelViewer(selectedItem()));
  $("cadBtn").addEventListener("click", () => openExternalItem(selectedItem()));
  $("clearTagBtn").addEventListener("click", () => navigateScope({ navMode: "all", tag: "" }));
  $("newFolderBtn").addEventListener("click", () => promptNewFolder(""));
  $("filterBtn").addEventListener("click", promptFilters);
  $("syncBtn").addEventListener("click", () => startSync(false));
  $("uploadBtn").addEventListener("click", () => $("fileInput").click());
  $("uploadCaret").addEventListener("click", (event) => {
    event.stopPropagation();
    $("uploadMenu").hidden = !$("uploadMenu").hidden;
  });
  $("uploadFilesOption").addEventListener("click", () => {
    $("uploadMenu").hidden = true;
    $("fileInput").click();
  });
  $("uploadFolderOption").addEventListener("click", () => {
    $("uploadMenu").hidden = true;
    $("folderInput").click();
  });
  $("fileInput").addEventListener("change", (event) => {
    startUpload(event.target.files);
    event.target.value = "";
  });
  $("folderInput").addEventListener("change", (event) => {
    startUpload(event.target.files);
    event.target.value = "";
  });
  $("emptySyncBtn").addEventListener("click", () => startSync(false));
  $("emptyUploadBtn").addEventListener("click", () => $("fileInput").click());
  $("emptyFolderBtn").addEventListener("click", () => $("folderInput").click());
  $("loadMoreBtn").addEventListener("click", loadMore);
  $("uploadsClose").addEventListener("click", () => { $("uploadPanel").hidden = true; });
  $("moreBtn").addEventListener("click", promptSettings);
  $("quitBtn").addEventListener("click", confirmQuit);
  $("serverChip").addEventListener("click", showServerDetails);
  $("vaultChip").addEventListener("click", toggleVaultMenu);
  $("vaultRefreshBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    loadVaults(true);
  });
  $("vaultNewBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    promptNewVault();
  });
  $("vaultBotBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    addStorageBot();
  });
  $("lockBtn").addEventListener("click", lockNow);
  $("cacheBtn").addEventListener("click", clearCache);
  $("lockVaultBtn").addEventListener("click", showLockVaults);
  $("lockVaultBack").addEventListener("click", backToPin);
  $("lockForgot").addEventListener("click", showRecovery);
  $("lockBack").addEventListener("click", backToPin);
  $("recoverSend").addEventListener("click", sendRecoveryCode);
  $("recoverApply").addEventListener("click", applyRecovery);
  $("recoverCode").addEventListener("input", () => digitsOnly($("recoverCode"), 6));
  $("recoverPin").addEventListener("input", () => digitsOnly($("recoverPin"), 4));
  $("recoverPin2").addEventListener("input", () => digitsOnly($("recoverPin2"), 4));
  for (const id of ["recoverCode", "recoverPin", "recoverPin2"]) {
    $(id).addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      applyRecovery();
    });
  }
  document.addEventListener("keydown", (event) => {
    if ($("lockOverlay").hidden || !$("lockRecover").hidden || !$("lockVaults").hidden) return;
    if (/^\d$/.test(event.key)) pressLockKey(event.key);
    else if (event.key === "Backspace") pressLockKey("back");
    else if (event.key === "Escape") pressLockKey("clear");
    else if (event.key === "Enter") submitPin();
  });
  $("openBtn").addEventListener("click", () => openViewerFor(selectedItem()));
  $("downloadBtn").addEventListener("click", () => downloadItem(selectedItem()));
  $("thumbBtn").addEventListener("click", () => promptThumbPicker(selectedItem()));
  $("movieBtn").addEventListener("click", () => promptMovie(selectedItem()));
  $("completeBtn").addEventListener("click", () => startMergeDownload(selectedItem()));
  $("favoriteBtn").addEventListener("click", promptFavorite);
  $("restoreBtn").addEventListener("click", () => restoreItem(selectedItem()));
  $("renameBtn").addEventListener("click", promptRename);
  $("moveBtn").addEventListener("click", promptMove);
  $("tagsBtn").addEventListener("click", promptTags);
  $("deleteBtn").addEventListener("click", promptDelete);
  $("bulkDownload").addEventListener("click", bulkDownload);
  $("bulkFavorite").addEventListener("click", bulkFavorite);
  $("bulkMove").addEventListener("click", promptBulkMove);
  $("bulkLinks").addEventListener("click", bulkCopyLinks);
  $("bulkDelete").addEventListener("click", promptBulkDelete);
  $("bulkClear").addEventListener("click", clearSelection);
  $("folderOpenBtn").addEventListener("click", () => {
    const folder = selectedFolder();
    if (folder) openFolder(folder.folder);
  });
  $("folderZipBtn").addEventListener("click", () => downloadFolder(selectedFolder()));
  $("folderPropsBtn").addEventListener("click", () => promptFolderProperties(selectedFolder()));
  $("folderNewBtn").addEventListener("click", () => {
    const folder = selectedFolder();
    promptNewFolder(folder ? folder.folder : S.folder);
  });
  $("folderPropsLink").addEventListener("click", () => promptFolderProperties(selectedFolder()));
  $("folderRenameBtn").addEventListener("click", () => {
    const folder = selectedFolder();
    if (folder) promptRenameFolder(folder);
  });
  $("folderDeleteBtn").addEventListener("click", () => {
    const folder = selectedFolder();
    if (folder) promptDeleteFolder(folder);
  });
  $("noteBtn").addEventListener("click", () => {
    const folder = selectedFolder();
    if (folder) { promptFolderProperties(folder); return; }
    const item = selectedItem();
    if (item) promptNote(item);
  });
  $("viewerClose").addEventListener("click", closeViewer);
  $("viewerCloseFloat").addEventListener("click", closeViewer);
  $("viewerPrev").addEventListener("click", () => stepViewer(-1));
  $("viewerNext").addEventListener("click", () => stepViewer(1));
  $("viewerMpv").addEventListener("click", () => openInMpv(VIEWER.item));
  $("viewerPreviews").addEventListener("click", () => {
    const item = VIEWER.item;
    if (!item) return;
    promptInstallTool("ffmpeg", () => {
      if (VIEWER.item && VIEWER.item.id === item.id) {
        VIEWER.spriteTries = 0;
        loadStoryboard(item, VIEWER.token);
      }
    });
  });
  $("viewerStage").addEventListener("click", (event) => {
    if (event.target === $("viewerStage")) closeViewer();
  });
  $("modalClose").addEventListener("click", closeModal);
  $("modalBackdrop").addEventListener("click", closeModal);
  window.addEventListener("mousedown", (event) => {
    if (!event.target.closest("#contextMenu")) hideContextMenu();
    if (!event.target.closest(".upload-split")) $("uploadMenu").hidden = true;
    if (!event.target.closest(".vault-wrap")) closeVaultMenu();
  });
  window.addEventListener("resize", hideContextMenu);
  const contentScroll = scrollTargets($("content"));
  contentScroll.event.addEventListener("scroll", hideContextMenu);
  contentScroll.event.addEventListener("scroll", () => {
    const node = contentScroll.offset;
    if (S.loading || S.itemsPending || isStarCatalogue()) return;
    if (!S.total || S.items.length >= S.total) return;
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - 420) loadMore();
  });

  let dragDepth = 0;
  document.addEventListener("dragenter", (event) => {
    if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes("Files")) return;
    event.preventDefault();
    dragDepth += 1;
    $("dropOverlay").classList.add("active");
    $("dropTarget").textContent = S.folder || "All files";
  });
  document.addEventListener("dragover", (event) => {
    if (event.dataTransfer && Array.from(event.dataTransfer.types || []).includes("Files")) event.preventDefault();
  });
  document.addEventListener("dragleave", (event) => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) $("dropOverlay").classList.remove("active");
  });
  document.addEventListener("drop", async (event) => {
    if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes("Files")) return;
    event.preventDefault();
    dragDepth = 0;
    $("dropOverlay").classList.remove("active");
    const entries = await collectDroppedEntries(event.dataTransfer);
    if (entries.length) startUpload(entries);
  });
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("beforeunload", (event) => {
    if (S.localUpload || S.transfers.some((transfer) => transferActive(transfer.state))) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  window.addEventListener("pagehide", () => saveViewerPosition(true));
}

function handleViewerKey(event) {
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  const key = event.key.toLowerCase();
  if (key === "n" || key === "p") {
    event.preventDefault();
    stepViewer(key === "n" ? 1 : -1);
    return;
  }
  const player = VIEWER.player;
  if (!player) {
    if (VIEWER.gallery && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
      event.preventDefault();
      stepViewer(event.key === "ArrowRight" ? 1 : -1);
    }
    return;
  }
  if (player.el().contains(event.target)) return;
  const seekBy = (delta) => {
    event.preventDefault();
    const duration = Number(player.duration() || 0);
    const next = Number(player.currentTime() || 0) + delta;
    player.currentTime(Math.max(0, duration ? Math.min(duration - 0.1, next) : next));
  };
  if (event.key === " " || key === "k") {
    event.preventDefault();
    if (player.paused()) { const playing = player.play(); if (playing && playing.catch) playing.catch(() => {}); }
    else player.pause();
  } else if (event.key === "ArrowRight") seekBy(event.shiftKey ? 30 : 5);
  else if (event.key === "ArrowLeft") seekBy(event.shiftKey ? -30 : -5);
  else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    const delta = event.key === "ArrowUp" ? 0.1 : -0.1;
    player.volume(Math.max(0, Math.min(1, Number(player.volume() || 0) + delta)));
  }
  else if (key === "l") seekBy(10);
  else if (key === "j") seekBy(-10);
  else if (key === "m") { event.preventDefault(); player.muted(!player.muted()); }
  else if (key === "f") {
    event.preventDefault();
    if (player.isFullscreen()) player.exitFullscreen();
    else player.requestFullscreen();
  }
}
function entryNodes() {
  const selector = S.view === "details"
    ? "#rows .row[data-folder], #rows .row[data-id]"
    : "#tilesView .tile[data-folder], #tilesView .tile[data-id]";
  return Array.from(document.querySelectorAll(selector));
}
function pageSelectionStep() {
  const nodes = entryNodes();
  if (!nodes.length) return 0;
  const scroller = scrollTargets($("content")).offset;
  const box = scroller.getBoundingClientRect();
  const tops = new Map();
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.bottom <= box.top || rect.top >= box.bottom) continue;
    const key = Math.round(rect.top);
    tops.set(key, (tops.get(key) || 0) + 1);
  }
  const ordered = Array.from(tops.keys()).sort((a, b) => a - b);
  const perRow = Math.max(1, ...tops.values());
  const rowHeight = ordered.length > 1 ? ordered[1] - ordered[0] : nodes[0].getBoundingClientRect().height;
  const rows = Math.max(1, Math.floor(box.height / (rowHeight || 120)));
  return perRow * rows;
}
function selectEntryAt(index) {
  const folders = visibleSubfolders();
  const total = folders.length + S.items.length;
  if (!total) return false;
  index = Math.max(0, Math.min(total - 1, index));
  if (index < folders.length) selectFolderRow(folders[index].folder, { scroll: true });
  else selectItem(S.items[index - folders.length].id, { scroll: true });
  return true;
}
function moveSelectionBy(delta) {
  const folders = visibleSubfolders();
  const total = folders.length + S.items.length;
  if (!total) return false;
  const item = selectedItem();
  const folder = selectedFolder();
  let index = -1;
  if (folder) index = folders.findIndex((entry) => entry.folder === folder.folder);
  else if (item) index = folders.length + S.items.findIndex((entry) => entry.id === item.id);
  if (index < 0) return selectEntryAt(delta > 0 ? 0 : total - 1);
  return selectEntryAt(index + delta);
}
function handleKeydown(event) {
  if (event.key === "Escape") {
    if (document.fullscreenElement) return;
    if (!$("modalRoot").hidden) { closeModal(); event.preventDefault(); return; }
    if (!$("viewerOverlay").hidden) {
      if (VIEWER.gallery && VIEWER.gallery.fulled) { VIEWER.gallery.exit(); event.preventDefault(); return; }
      closeViewer(); event.preventDefault(); return;
    }
    if (!$("contextMenu").hidden) { hideContextMenu(); event.preventDefault(); return; }
    if (S.vaultMenuOpen) { closeVaultMenu(); event.preventDefault(); return; }
    if (isEditableTarget(event.target)) return;
    if (S.selection.size) {
      clearSelection();
      event.preventDefault();
      return;
    }
    if (S.q) {
      S.q = "";
      $("searchInput").value = "";
      updateBreadcrumb();
      reloadCurrentList();
      event.preventDefault();
      return;
    }
    if (S.starId) {
      navigateScope({ navMode: "stars", starId: null, q: "" });
      event.preventDefault();
    }
    return;
  }
  if (!$("loginOverlay").hidden) return;
  if (!$("modalRoot").hidden) return;
  if (!$("viewerOverlay").hidden) { handleViewerKey(event); return; }
  if (event.ctrlKey && event.key.toLowerCase() === "f") {
    event.preventDefault();
    $("searchInput").focus();
    $("searchInput").select();
    return;
  }
  if (!event.ctrlKey && !event.altKey && !event.metaKey && event.key === "?") {
    event.preventDefault();
    promptShortcuts();
    return;
  }
  if (event.altKey && event.key === "ArrowLeft") { event.preventDefault(); goBack(); return; }
  if (event.altKey && event.key === "ArrowRight") { event.preventDefault(); goForward(); return; }
  if (isEditableTarget(event.target)) return;
  if (event.ctrlKey && event.key.toLowerCase() === "a") {
    if (!S.items.length) return;
    event.preventDefault();
    for (const entry of S.items) S.selection.add(entry.id);
    renderSelection();
    return;
  }
  if (event.ctrlKey && event.key.toLowerCase() === "c") {
    event.preventDefault();
    copySelectionToClipboard();
    return;
  }
  if (event.ctrlKey && event.key.toLowerCase() === "v") {
    event.preventDefault();
    pasteClipboard();
    return;
  }
  if (event.ctrlKey && event.key.toLowerCase() === "b") {
    event.preventDefault();
    togglePreview();
    return;
  }
  const item = selectedItem();
  const folder = selectedFolder();
  if (event.key === "F2") {
    if (item) { event.preventDefault(); promptRename(); return; }
    if (folder) { event.preventDefault(); promptRenameFolder(folder); return; }
  }
  if (event.key === "Delete") {
    if (S.selection.size > 1) { event.preventDefault(); promptBulkDelete(); return; }
    if (item) { event.preventDefault(); promptDelete(); return; }
    if (folder) { event.preventDefault(); promptDeleteFolder(folder); return; }
  }
  if (event.key === "Enter" || event.key === " ") {
    if (item) { event.preventDefault(); openViewerFor(item); return; }
    if (folder) { event.preventDefault(); openFolder(folder.folder); return; }
  }
  if (event.key === "Backspace" || (event.altKey && event.key === "ArrowUp")) {
    event.preventDefault();
    goUp();
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    const folders = visibleSubfolders();
    const total = folders.length + S.items.length;
    if (!total) return;
    event.preventDefault();
    let index = -1;
    if (folder) index = folders.findIndex((entry) => entry.folder === folder.folder);
    else if (item) index = folders.length + S.items.findIndex((entry) => entry.id === item.id);
    let next = event.key === "ArrowDown" ? index + 1 : index - 1;
    if (index < 0) next = 0;
    next = Math.max(0, Math.min(total - 1, next));
    if (next < folders.length) selectFolderRow(folders[next].folder, { scroll: true });
    else selectItem(S.items[next - folders.length].id, { scroll: true });
    return;
  }
  if (event.key === "Home" || event.key === "End") {
    const total = visibleSubfolders().length + S.items.length;
    if (!total) return;
    event.preventDefault();
    selectEntryAt(event.key === "Home" ? 0 : total - 1);
    return;
  }
  if (event.key === "PageDown" || event.key === "PageUp") {
    const step = pageSelectionStep();
    if (!step) return;
    event.preventDefault();
    moveSelectionBy(event.key === "PageDown" ? step : -step);
  }
}

/* ---------------------------------------------------------- scrollbars */
const SCROLLBAR_TARGETS = [
  ".sidebar", "#content", ".preview-scroll", ".vault-list", ".upload-list",
  ".modal-body", ".channel-list", ".lock-vault-list", ".login-card",
  ".text-preview", ".viewer-stage pre", ".picker-tree", ".star-note",
  ".star-pick-list", ".star-portrait-grid", ".movie-cast", ".movie-results",
  ".check-list", ".batch-preview"
].join(",");
const scrollInstances = new Map();

function scrollbarHostIntact(node) {
  return Boolean(node.querySelector(":scope > [data-overlayscrollbars-viewport]"));
}

function enhanceScrollbars() {
  const lib = window.OverlayScrollbarsGlobal;
  if (!lib) return;
  // Render code that replaces a host's children wipes the library's viewport,
  // so rebuild those instances instead of leaving a bare flex-row host behind.
  for (const [node, instance] of scrollInstances) {
    if (node.isConnected && scrollbarHostIntact(node)) continue;
    try {
      instance.destroy();
    } catch (_) {
      /* already detached */
    }
    scrollInstances.delete(node);
  }
  for (const node of document.querySelectorAll(SCROLLBAR_TARGETS)) {
    if (scrollInstances.has(node) || !node.isConnected || !node.offsetParent) continue;
    const instance = lib.OverlayScrollbars(node, {
      scrollbars: { autoHide: "leave", autoHideDelay: 500, clickScroll: true }
    });
    if (instance) scrollInstances.set(node, instance);
  }
}

function setupScrollbars() {
  const lib = window.OverlayScrollbarsGlobal;
  if (!lib) return;
  if (lib.ClickScrollPlugin) lib.OverlayScrollbars.plugin(lib.ClickScrollPlugin);
  enhanceScrollbars();
  // Runs as a microtask, before paint, so a rebuilt list never flashes its
  // unwrapped (flex-row) layout.
  new MutationObserver(enhanceScrollbars).observe(document.body, {
    childList: true,
    subtree: true
  });
}

function scrollTargets(node) {
  const instance = scrollInstances.get(node);
  if (!instance) return { event: node, offset: node };
  const elements = instance.elements();
  return {
    event: elements.scrollEventElement || node,
    offset: elements.scrollOffsetElement || node
  };
}

/* ----------------------------------------------------------------- start */
init();
