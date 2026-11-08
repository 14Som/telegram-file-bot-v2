/* In-app reader for PDF, EPUB/EPUB3, FB2, Word, HTML/XML, Markdown and text.
   PDF.js and foliate-js are loaded the first time a file needs them. */
(function () {
  "use strict";

  // PDF.js 5.5 needs these, added after Chrome 124; older Android WebViews lack them.
  if (typeof URL.parse !== "function") {
    URL.parse = function (value, base) {
      try { return new URL(value, base); } catch (error) { return null; }
    };
  }
  if (typeof Promise.try !== "function") {
    Promise.try = function (callback) {
      const args = Array.prototype.slice.call(arguments, 1);
      return new Promise((resolve) => resolve(callback.apply(undefined, args)));
    };
  }
  if (typeof Uint8Array.prototype.toHex !== "function") {
    Uint8Array.prototype.toHex = function () {
      let out = "";
      for (let i = 0; i < this.length; i += 1) out += this[i].toString(16).padStart(2, "0");
      return out;
    };
  }
  if (typeof Uint8Array.prototype.toBase64 !== "function") {
    Uint8Array.prototype.toBase64 = function () {
      let binary = "";
      for (let i = 0; i < this.length; i += 1) binary += String.fromCharCode(this[i]);
      return btoa(binary);
    };
  }
  if (typeof Map.prototype.getOrInsert !== "function") {
    Map.prototype.getOrInsert = function (key, value) {
      if (this.has(key)) return this.get(key);
      this.set(key, value);
      return value;
    };
  }
  if (typeof Map.prototype.getOrInsertComputed !== "function") {
    Map.prototype.getOrInsertComputed = function (key, compute) {
      if (this.has(key)) return this.get(key);
      const value = compute(key);
      this.set(key, value);
      return value;
    };
  }
  if (typeof WeakMap.prototype.getOrInsert !== "function") {
    WeakMap.prototype.getOrInsert = function (key, value) {
      if (this.has(key)) return this.get(key);
      this.set(key, value);
      return value;
    };
  }
  if (typeof WeakMap.prototype.getOrInsertComputed !== "function") {
    WeakMap.prototype.getOrInsertComputed = function (key, compute) {
      if (this.has(key)) return this.get(key);
      const value = compute(key);
      this.set(key, value);
      return value;
    };
  }
  const responseBytes = () =>
    this.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  if (typeof Response.prototype.bytes !== "function") {
    Response.prototype.bytes = responseBytes;
  }
  if (typeof Blob.prototype.bytes !== "function") {
    Blob.prototype.bytes = responseBytes;
  }

  const FORMAT_LABELS = {
    pdf: "PDF",
    epub: "EPUB",
    fb2: "FictionBook",
    docx: "Word document",
    doc: "Word 97–2003 document",
    html: "HTML",
    xml: "XML",
    md: "Markdown",
    txt: "Text"
  };
  const BOOK_FORMATS = { epub: 1, fb2: 1 };
  const PDF_FORMATS = { pdf: 1, doc: 1 };
  const ARTICLE_FORMATS = { docx: 1, html: 1, xml: 1, md: 1, txt: 1 };
  const STORE_PREFIX = "tfe.reader.v1.";
  const FONT_KEY = "tfe.reader.font";
  const BOOK_THEME_KEY = "tfe.reader.theme";
  const BOOK_FLOW_KEY = "tfe.reader.flow";
  const BOOK_LINE_KEY = "tfe.reader.line";
  const PDF_FIT_KEY = "tfe.reader.pdf.fit";
  const PDF_NIGHT_KEY = "tfe.reader.pdf.night";
  const BOOK_FONT_KEY = "tfe.reader.bookfont";
  const BOOK_MARGIN_KEY = "tfe.reader.margin";
  const BOOK_JUSTIFY_KEY = "tfe.reader.justify";
  const BOOK_HYPHEN_KEY = "tfe.reader.hyphen";
  const MIN_FONT = 0.8;
  const MAX_FONT = 1.8;
  const PDF_ZOOM_MIN = 0.5;
  const PDF_ZOOM_MAX = 5;
  const FIND_LIMIT = 500;
  const NOTE_COLORS = ["#ffd54a", "#8fd694", "#8fb8f0", "#f0a0bd"];
  const BOOK_FONTS = {
    serif: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif',
    sans: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    mono: 'Consolas, "Cascadia Mono", "Courier New", monospace'
  };
  const BOOK_MARGINS = [0, 4, 8];

  const BOOK_THEMES = {
    light: { page: "#fbfaf7", text: "#20242a", muted: "#4a4f57", link: "#0a66c2", pre: "#f1efe9", quote: "#c9c3b4" },
    sepia: { page: "#f4ecd8", text: "#3b3225", muted: "#6a5a42", link: "#8a5a1f", pre: "#eae0c8", quote: "#c9b18c" },
    dark: { page: "#15181d", text: "#cfd5dd", muted: "#9aa3ad", link: "#7fb2f0", pre: "#20252c", quote: "#3c4650" }
  };

  const state = {
    open: false,
    token: 0,
    item: null,
    format: "",
    host: null,
    shell: null,
    body: null,
    statusEl: null,
    statusText: null,
    progressWrap: null,
    progressSlider: null,
    progressPct: null,
    buttons: {},
    pdf: null,
    pages: 0,
    page: 1,
    pageOffset: 0,
    zoom: 1,
    pdfFit: loadPref(PDF_FIT_KEY, "width") === "page" ? "page" : "width",
    pdfNight: loadPref(PDF_NIGHT_KEY, "0") === "1",
    pdfScrollEl: null,
    pdfStackEl: null,
    pdfPageNodes: new Map(),
    pdfTextCache: new Map(),
    pdfWidth: 0,
    pdfAspect: 1.414,
    pdfOutline: [],
    pdfTocRows: [],
    pdfObserver: null,
    pdfRenderQueue: [],
    pdfRendering: 0,
    pdfRenderSeq: 0,
    pdfScrollRaf: 0,
    pdfFind: { query: "", matches: [], index: -1, token: 0 },
    bookView: null,
    bookTocItems: [],
    bookTocRows: [],
    bookFlow: loadPref(BOOK_FLOW_KEY, "paginated") === "scrolled" ? "scrolled" : "paginated",
    bookTheme: BOOK_THEMES[loadPref(BOOK_THEME_KEY, "light")] ? loadPref(BOOK_THEME_KEY, "light") : "light",
    bookLine: clamp(Number(loadPref(BOOK_LINE_KEY, "1.62")) || 1.62, 1.35, 2.2),
    bookFind: { query: "", results: [], index: -1, token: 0 },
    bookCfi: "",
    bookLabel: "",
    bookPageLabel: "",
    bookInfoOpen: false,
    bookInfoPanel: null,
    footnotePanel: null,
    footnoteView: null,
    imageView: null,
    bookFont: BOOK_FONTS[loadPref(BOOK_FONT_KEY, "serif")] ? loadPref(BOOK_FONT_KEY, "serif") : "serif",
    bookMargin: clamp(Number(loadPref(BOOK_MARGIN_KEY, "1")) || 0, 0, 2),
    bookJustify: loadPref(BOOK_JUSTIFY_KEY, "0") === "1",
    bookHyphen: loadPref(BOOK_HYPHEN_KEY, "0") === "1",
    fraction: 0,
    marks: { bookmarks: [], notes: [] },
    marksOpen: false,
    marksPanel: null,
    noteEditor: null,
    pdfHistory: { stack: [], index: -1 },
    bookHistory: { stack: [], index: -1 },
    pdfThumbsOpen: false,
    pdfThumbsPanel: null,
    pdfThumbObserver: null,
    pdfThumbSeq: 0,
    pdfThumbCache: new Map(),
    typesetOpen: false,
    typesetPanel: null,
    helpOpen: false,
    helpPanel: null,
    tts: null,
    selectionHandler: null,
    tocOpen: false,
    tocPanel: null,
    findOpen: false,
    findMode: "",
    findBar: null,
    font: loadFont(),
    blobUrls: [],
    resizeTimer: null,
    observer: null,
    lastSave: 0,
    htmlText: "",
    pdfjs: null
  };

  let pdfjsPromise = null;
  let footnotePromise = null;

  function h(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function loadPref(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function savePref(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) {}
  }

  function formatOf(item) {
    return (item && item.reader) || "";
  }

  function loadFont() {
    const value = Number(localStorage.getItem(FONT_KEY));
    return Number.isFinite(value) && value > 0 ? clamp(value, MIN_FONT, MAX_FONT) : 1;
  }

  function storeKey(item) {
    return item ? STORE_PREFIX + item.id : "";
  }

  /* The app binds a fresh local port every launch, so browser storage starts
     empty each run. Positions and marks also live in reader-state.json. */
  let readerStorePromise = null;
  let readerStore = null;
  const pendingSaves = new Map();
  let saveTimer = 0;
  let historyTimer = 0;

  function ensureReaderStore() {
    if (readerStorePromise) return readerStorePromise;
    readerStorePromise = (async () => {
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 2500) : 0;
      try {
        const response = await fetch("/api/reader/state", {
          credentials: "same-origin",
          signal: controller ? controller.signal : undefined
        });
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json();
        const remote = data && data.state && typeof data.state === "object" ? data.state : {};
        readerStore = Object.assign({}, remote, readerStore || {});
        return readerStore;
      } catch (_) {
        readerStorePromise = null;
        return readerStore || {};
      } finally {
        if (timer) clearTimeout(timer);
      }
    })();
    return readerStorePromise;
  }

  function recall(item) {
    let local = null;
    try {
      const raw = localStorage.getItem(storeKey(item));
      local = raw ? JSON.parse(raw) : null;
    } catch (_) {
      local = null;
    }
    const remote = item && readerStore ? readerStore[String(item.id)] : null;
    if (!local) return remote || null;
    if (!remote) return local;
    return (Number(remote.at) || 0) > (Number(local.at) || 0)
      ? { ...local, ...remote }
      : { ...remote, ...local };
  }

  function remember(item, data) {
    if (!item) return;
    const record = { ...(recall(item) || {}), ...data, at: Date.now() };
    try {
      localStorage.setItem(storeKey(item), JSON.stringify(record));
    } catch (_) {
      /* storage may be full; reading still works */
    }
    if (readerStore) readerStore[String(item.id)] = record;
    pendingSaves.set(String(item.id), record);
    scheduleReaderSave();
  }

  function scheduleReaderSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => flushReaderSaves(false), 700);
  }

  function flushReaderSaves(keepalive) {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = 0;
    }
    if (!pendingSaves.size) return;
    const entries = Array.from(pendingSaves.entries());
    pendingSaves.clear();
    for (const [id, record] of entries) {
      try {
        fetch(`/api/reader/state/${encodeURIComponent(id)}`, {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", "X-TFE": "1" },
          body: JSON.stringify({ record }),
          keepalive: !!keepalive
        }).catch(() => {});
      } catch (_) {}
    }
  }

  window.addEventListener("pagehide", () => {
    rememberBookPosition();
    flushReaderSaves(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      rememberBookPosition();
      flushReaderSaves(true);
    }
  });

  function rememberThrottled(item, data) {
    const now = Date.now();
    if (now - state.lastSave < 1500) return;
    state.lastSave = now;
    remember(item, data);
  }

  function rememberBookPosition() {
    if (!state.item || !state.bookView || !state.bookCfi) return;
    remember(state.item, { fraction: state.fraction, cfi: state.bookCfi });
  }

  function revokeBlobs() {
    for (const url of state.blobUrls) {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }
    state.blobUrls = [];
  }

  function setStatus(text) {
    if (state.statusText) state.statusText.textContent = text || "";
    else if (state.statusEl) state.statusEl.textContent = text || "";
  }

  function setProgress(fraction, show) {
    if (!state.progressWrap) return;
    state.progressWrap.hidden = !show;
    if (!show) return;
    const value = Math.round(clamp(Number(fraction) || 0, 0, 1) * 1000);
    state.progressSlider.value = String(value);
    state.progressPct.textContent = `${Math.round(value / 10)}%`;
  }

  function button(label, title, onClick, opts) {
    const node = h("button", "reader-btn" + (opts && opts.className ? " " + opts.className : ""), label);
    node.type = "button";
    node.title = title;
    if (opts && opts.aria) node.setAttribute("aria-label", opts.aria);
    if (onClick) node.addEventListener("click", onClick);
    return node;
  }

  /* --------------------------------------------- bookmarks, notes, history */
  function loadMarks(item) {
    const saved = recall(item) || {};
    state.marks = {
      bookmarks: Array.isArray(saved.bookmarks) ? saved.bookmarks : [],
      notes: Array.isArray(saved.notes) ? saved.notes : []
    };
  }

  function persistMarks() {
    remember(state.item, { bookmarks: state.marks.bookmarks, notes: state.marks.notes });
  }

  function pdfLabelForPage(page) {
    let label = "";
    for (const entry of state.pdfOutline) {
      if (entry.page <= page) label = entry.label;
      else break;
    }
    return label ? `${label} · Page ${page}` : `Page ${page}`;
  }

  function bookmarkLocation() {
    if (state.pdf) return { kind: "pdf", page: state.page, offset: state.pageOffset };
    if (state.bookView && state.bookCfi) {
      const label = [state.bookLabel, state.bookPageLabel ? `p. ${state.bookPageLabel}` : ""]
        .filter(Boolean)
        .join(" · ");
      return { kind: "epub", cfi: state.bookCfi, fraction: state.fraction, label };
    }
    return null;
  }

  function sameBookmark(bookmark, location) {
    if (!location) return false;
    if (location.kind === "pdf") return bookmark.kind === "pdf" && Number(bookmark.page) === location.page;
    return bookmark.kind === "epub" && !!location.cfi && bookmark.cfi === location.cfi;
  }

  function toggleBookmark() {
    const location = bookmarkLocation();
    if (!location) return false;
    const existing = state.marks.bookmarks.find((bookmark) => sameBookmark(bookmark, location));
    if (existing) {
      state.marks.bookmarks = state.marks.bookmarks.filter((bookmark) => bookmark !== existing);
      flashStatus("Bookmark removed");
    } else {
      state.marks.bookmarks.push({
        id: `b${Date.now()}`,
        ...location,
        label: location.kind === "pdf" ? pdfLabelForPage(location.page) : (location.label || `${Math.round((location.fraction || 0) * 100)}%`),
        at: Date.now()
      });
      flashStatus("Bookmark added");
    }
    persistMarks();
    renderMarksPanel();
    updateMarkButtons();
    return true;
  }

  function deleteBookmark(id) {
    state.marks.bookmarks = state.marks.bookmarks.filter((bookmark) => bookmark.id !== id);
    persistMarks();
    renderMarksPanel();
    updateMarkButtons();
  }

  function deleteNote(id) {
    const note = state.marks.notes.find((item) => item.id === id);
    if (!note) return;
    state.marks.notes = state.marks.notes.filter((item) => item !== note);
    persistMarks();
    if (note.kind === "epub" && state.bookView && note.cfi) {
      try { state.bookView.deleteAnnotation({ value: note.cfi }); } catch (_) {}
    }
    if (note.kind === "pdf") paintPdfAllNotes();
    renderMarksPanel();
  }

  function updateMarkButtons() {
    const location = bookmarkLocation();
    const active = !!state.marks.bookmarks.find((bookmark) => sameBookmark(bookmark, location));
    if (state.buttons.bookmark) {
      state.buttons.bookmark.textContent = active ? "★" : "☆";
      state.buttons.bookmark.title = active ? "Remove bookmark (Ctrl+B)" : "Bookmark this page (Ctrl+B)";
      state.buttons.bookmark.classList.toggle("active", active);
    }
    if (state.buttons.marks) {
      const count = state.marks.bookmarks.length + state.marks.notes.length;
      state.buttons.marks.textContent = count ? `Marks ${count}` : "Marks";
    }
  }

  function flashStatus(text) {
    setStatus(text);
    clearTimeout(state.statusTimer);
    state.statusTimer = setTimeout(() => {
      if (state.open) refreshStatus();
    }, 1600);
  }

  function refreshStatus() {
    if (state.pdf) setStatus(`Page ${state.page} of ${state.pages}`);
    else if (state.bookView) {
      const chapter = state.bookLabel ? ` · ${state.bookLabel}` : "";
      const page = state.bookPageLabel ? ` · p. ${state.bookPageLabel}` : "";
      setStatus(`${Math.round(state.fraction * 100)}%${chapter}${page}`);
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      try {
        const area = h("textarea", "reader-clip");
        area.value = text;
        document.body.append(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        return ok;
      } catch (_) {
        return false;
      }
    }
  }

  function marksAsMarkdown() {
    const title = (state.item && state.item.name) || "Reading notes";
    const lines = [`# ${title}`, ""];
    if (state.marks.bookmarks.length) {
      lines.push("## Bookmarks", "");
      for (const bookmark of state.marks.bookmarks) {
        lines.push(`- ${bookmark.label || (bookmark.kind === "pdf" ? `Page ${bookmark.page}` : "Bookmark")}`);
      }
      lines.push("");
    }
    if (state.marks.notes.length) {
      lines.push("## Highlights and notes", "");
      for (const note of state.marks.notes) {
        const where = note.kind === "pdf" ? `Page ${note.page}` : (note.label || "Book");
        lines.push(`> ${note.text || "(highlight)"}`, "", `— ${where}`, "");
        if (note.note) lines.push(note.note, "");
      }
    }
    if (lines.length === 2) lines.push("No bookmarks or highlights yet.");
    return lines.join("\n");
  }

  function ensureMarksPanel() {
    if (state.marksPanel) return state.marksPanel;
    const panel = h("div", "reader-marks");
    panel.hidden = true;
    const head = h("div", "reader-marks-head");
    head.append(h("span", "reader-marks-title", "Bookmarks & notes"));
    head.append(button("Copy", "Copy bookmarks and notes as Markdown", async () => {
      const ok = await copyText(marksAsMarkdown());
      flashStatus(ok ? "Notes copied to the clipboard" : "Could not copy notes");
    }, { className: "reader-marks-copy" }));
    const list = h("div", "reader-marks-list");
    panel.append(head, list);
    state.shell.append(panel);
    state.marksPanel = panel;
    return panel;
  }

  function closeMarksPanel() {
    state.marksOpen = false;
    if (state.marksPanel) state.marksPanel.hidden = true;
    if (state.buttons.marks) state.buttons.marks.classList.remove("active");
  }

  function toggleMarksPanel() {
    const panel = ensureMarksPanel();
    if (state.marksOpen) {
      closeMarksPanel();
      return;
    }
    closeToc();
    closePdfThumbs();
    closeTypeset();
    closeHelp();
    closeBookInfo();
    closeFootnote();
    state.marksOpen = true;
    panel.hidden = false;
    if (state.buttons.marks) state.buttons.marks.classList.add("active");
    renderMarksPanel();
  }

  function renderMarksPanel() {
    if (!state.marksPanel) return;
    const list = state.marksPanel.querySelector(".reader-marks-list");
    if (!list) return;
    list.replaceChildren();
    if (!state.marks.bookmarks.length && !state.marks.notes.length) {
      list.append(h("div", "reader-marks-empty", "No bookmarks or highlights yet. Use ☆ to bookmark a page, or select text to highlight it."));
      return;
    }
    if (state.marks.bookmarks.length) {
      list.append(h("div", "reader-marks-group", "Bookmarks"));
      for (const bookmark of state.marks.bookmarks) {
        list.append(markRow("bookmark", bookmark.label || "Bookmark", "", () => {
          closeMarksPanel();
          if (bookmark.kind === "pdf") navigatePdf(bookmark.page, bookmark.offset);
          else if (bookmark.cfi) bookGoTo({ cfi: bookmark.cfi });
        }, () => deleteBookmark(bookmark.id)));
      }
    }
    if (state.marks.notes.length) {
      list.append(h("div", "reader-marks-group", "Highlights and notes"));
      for (const note of state.marks.notes) {
        const label = note.text || "Highlight";
        const jumped = () => {
          closeMarksPanel();
          if (note.kind === "pdf") {
            const first = (note.rects && note.rects[0]) || { y: 0 };
            navigatePdf(note.page, first.y);
            paintPdfAllNotes();
          } else if (note.cfi) {
            bookGoTo({ cfi: note.cfi });
          }
        };
        list.append(markRow("note", label, note.note || "", jumped, () => deleteNote(note.id), note.color));
      }
    }
  }

  function markRow(kind, label, detail, onJump, onDelete, color) {
    const row = h("div", "reader-mark-row");
    const jump = h("button", "reader-mark-jump");
    jump.type = "button";
    const dot = h("span", "reader-mark-dot" + (kind === "bookmark" ? " bookmark" : ""));
    if (color) dot.style.background = color;
    else if (kind === "bookmark") dot.textContent = "★";
    const text = h("span", "reader-mark-text");
    text.append(h("span", "reader-mark-label", label));
    if (detail) text.append(h("span", "reader-mark-detail", detail));
    jump.append(dot, text);
    jump.title = label;
    jump.addEventListener("click", onJump);
    const remove = button("×", "Remove", onDelete, { className: "reader-mark-delete", aria: "Remove" });
    row.append(jump, remove);
    return row;
  }

  function closeNoteEditor() {
    if (!state.noteEditor) return;
    const data = state.noteEditor.data || {};
    state.noteEditor.root.remove();
    state.noteEditor = null;
    try {
      const doc = data.doc || document;
      const selection = doc.getSelection();
      if (selection && !selection.isCollapsed) selection.removeAllRanges();
    } catch (_) {}
  }

  function openNoteEditor(data) {
    closeNoteEditor();
    if (!data || !state.shell) return;
    const existing = data.id ? state.marks.notes.find((note) => note.id === data.id) : null;
    const source = existing || data;
    const root = h("div", "reader-note");
    const quote = h("div", "reader-note-quote", source.text || "");
    quote.title = source.text || "";
    const colors = h("div", "reader-note-colors");
    let color = source.color || NOTE_COLORS[0];
    const swatches = NOTE_COLORS.map((value) => {
      const swatch = h("button", "reader-note-color" + (value === color ? " active" : ""));
      swatch.type = "button";
      swatch.style.background = value;
      swatch.title = "Highlight colour";
      swatch.setAttribute("aria-label", "Highlight colour");
      swatch.addEventListener("click", () => {
        color = value;
        for (const node of swatches) node.classList.toggle("active", node === swatch);
      });
      colors.append(swatch);
      return swatch;
    });
    const input = h("textarea", "reader-note-text");
    input.placeholder = "Add a note (optional)";
    input.value = source.note || "";
    const actions = h("div", "reader-note-actions");
    actions.append(button("Copy", "Copy the highlighted text", async () => {
      const ok = await copyText(source.text || "");
      flashStatus(ok ? "Text copied" : "Could not copy");
    }, { className: "reader-note-copy" }));
    if (source.id) {
      actions.append(button("Delete", "Delete this highlight", () => {
        deleteNote(source.id);
        closeNoteEditor();
      }, { className: "reader-note-delete" }));
    }
    actions.append(button("Cancel", "Cancel", closeNoteEditor));
    actions.append(button("Save", "Save highlight", () => {
      const note = {
        id: source.id || `n${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        kind: source.kind,
        page: source.page,
        rects: source.rects,
        cfi: source.cfi,
        text: source.text || "",
        note: input.value.trim(),
        color,
        label: source.label || "",
        at: Date.now()
      };
      const index = state.marks.notes.findIndex((item) => item.id === note.id);
      if (index >= 0) state.marks.notes[index] = note;
      else state.marks.notes.push(note);
      persistMarks();
      if (note.kind === "epub" && state.bookView && note.cfi) {
        try { state.bookView.addAnnotation({ value: note.cfi }); } catch (_) {}
      }
      if (note.kind === "pdf") paintPdfAllNotes();
      renderMarksPanel();
      closeNoteEditor();
    }, { className: "reader-note-save" }));
    root.append(quote, colors, input, actions);
    if (Number.isFinite(data.x) && Number.isFinite(data.y) && state.shell) {
      const box = state.shell.getBoundingClientRect();
      const left = clamp(data.x - box.left + 14, 12, Math.max(12, box.width - 336));
      const top = clamp(data.y - box.top + 18, 56, Math.max(56, box.height - 250));
      root.style.left = `${left}px`;
      root.style.top = `${top}px`;
    } else if (state.shell) {
      root.style.left = `${Math.max(12, state.shell.clientWidth - 344)}px`;
      root.style.top = "64px";
    }
    state.shell.append(root);
    state.noteEditor = { root, data: source };
    input.focus({ preventScroll: true });
  }

  function pushHistory(kind, location) {
    if (!location) return;
    const history = kind === "pdf" ? state.pdfHistory : state.bookHistory;
    const key = kind === "pdf" ? `${location.page}:${Math.round((location.offset || 0) * 100)}` : (location.cfi || "");
    if (!key) return;
    const current = history.stack[history.index];
    if (current && current.key === key) return;
    history.stack = history.stack.slice(0, history.index + 1);
    history.stack.push({ ...location, key });
    if (history.stack.length > 60) history.stack.shift();
    history.index = history.stack.length - 1;
    updateHistoryButtons();
  }

  function historyStep(kind, direction) {
    const history = kind === "pdf" ? state.pdfHistory : state.bookHistory;
    const target = history.stack[history.index + direction];
    if (!target) return;
    clearTimeout(historyTimer);
    historyTimer = 0;
    history.index += direction;
    if (kind === "pdf") {
      state.pdfHistoryRestore = true;
      state.page = target.page;
      state.pageOffset = target.offset || 0;
      pdfScrollTo(target.page, target.offset || 0, false);
      updatePdfToolbar();
      renderVisiblePdfPages();
      setStatus(`Page ${target.page} of ${state.pages}`);
      rememberThrottled(state.item, { page: target.page, offset: target.offset || 0, zoom: state.zoom });
      state.pdfHistoryRestore = false;
    } else if (state.bookView) {
      state.bookHistoryRestore = true;
      state.bookView.goTo(target.cfi).catch(() => {});
      setTimeout(() => { state.bookHistoryRestore = false; }, 400);
    }
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    const pdf = !!state.pdf;
    const history = pdf ? state.pdfHistory : state.bookHistory;
    const back = state.buttons.historyBack;
    const forward = state.buttons.historyForward;
    if (back) back.disabled = history.index <= 0;
    if (forward) forward.disabled = history.index >= history.stack.length - 1;
  }

  function navigatePdf(page, offset) {
    if (!state.pdf) return;
    goPage(page, offset);
  }

  function bookGoTo(target) {
    const view = state.bookView;
    if (!view) return;
    const destination = target && typeof target === "object" && target.cfi ? target.cfi : target;
    if (!state.bookHistoryRestore && state.bookCfi) {
      pushHistory("book", { cfi: state.bookCfi, fraction: state.fraction });
    }
    try {
      const result = view.goTo(destination);
      if (result && typeof result.catch === "function") result.catch(() => {});
    } catch (_) {}
  }

  function resetHistory(kind) {
    const history = kind === "pdf" ? state.pdfHistory : state.bookHistory;
    history.stack = [];
    history.index = -1;
    updateHistoryButtons();
  }

  /* ------------------------------------------------------------ read aloud */
  function ttsSupported() {
    return typeof window.speechSynthesis !== "undefined"
      && window.speechSynthesis !== null
      && typeof window.SpeechSynthesisUtterance === "function";
  }

  function ttsChunks(text) {
    if (!text) return [];
    const clean = String(text).replace(/\s+/g, " ").trim();
    if (!clean) return [];
    const parts = clean.split(/(?<=[.!?…])\s+/);
    const chunks = [];
    let current = "";
    for (const part of parts) {
      if (!part) continue;
      if (current && (current.length + part.length > 300)) {
        chunks.push(current);
        current = part;
      } else {
        current = current ? `${current} ${part}` : part;
      }
    }
    if (current) chunks.push(current);
    return chunks.slice(0, 400);
  }

  function pickVoice() {
    try {
      const voices = window.speechSynthesis.getVoices() || [];
      return voices.find((voice) => /^en[-_]/i.test(voice.lang) && /natural|online/i.test(voice.name))
        || voices.find((voice) => /^en/i.test(voice.lang))
        || voices[0] || null;
    } catch (_) {
      return null;
    }
  }

  function updateTtsButtons() {
    const supported = ttsSupported();
    const listening = !!state.tts;
    if (state.buttons.listen) {
      state.buttons.listen.textContent = !supported ? "No voice" : listening ? "Stop" : "Listen";
      state.buttons.listen.disabled = !supported;
      state.buttons.listen.title = listening ? "Stop reading aloud (L)" : "Read aloud from here (L)";
      state.buttons.listen.classList.toggle("active", listening);
    }
  }

  function stopTts(silent) {
    const tts = state.tts;
    state.tts = null;
    if (tts && tts.timer) clearTimeout(tts.timer);
    if (!silent) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    updateTtsButtons();
  }

  function toggleTts() {
    if (state.tts) stopTts();
    else startTts();
  }

  function startTts() {
    if (!ttsSupported()) {
      flashStatus("Read aloud is not available on this PC");
      return;
    }
    stopTts(true);
    const mode = state.pdf ? "pdf" : state.bookView ? "book" : "";
    if (!mode) return;
    state.tts = {
      mode,
      token: state.token,
      chunks: [],
      timer: 0,
      lastText: "",
      stuck: 0
    };
    try { window.speechSynthesis.cancel(); } catch (_) {}
    updateTtsButtons();
    ttsStep();
  }

  function ttsStep() {
    const tts = state.tts;
    if (!tts || !state.open || tts.token !== state.token) return;
    if (tts.chunks.length) {
      speakTtsChunk(tts.chunks.shift());
      return;
    }
    if (tts.mode === "pdf") {
      if (!state.pdf) { stopTts(); return; }
      const page = state.page;
      pdfPageText(page).then((data) => {
        if (state.tts !== tts) return;
        const chunks = ttsChunks(data.combined);
        if (chunks.length) {
          tts.chunks = chunks;
          ttsStep();
          return;
        }
        if (page >= state.pages) { stopTts(); return; }
        state.pdfHistoryRestore = true;
        goPage(page + 1);
        state.pdfHistoryRestore = false;
        tts.timer = setTimeout(ttsStep, 700);
      }).catch(() => stopTts());
      return;
    }
    const doc = currentBookDoc();
    if (!doc) { stopTts(); return; }
    const text = (doc.body ? doc.body.innerText : doc.documentElement.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) { stopTts(); return; }
    if (text === tts.lastText) {
      tts.stuck += 1;
      if (tts.stuck > 1) { stopTts(); return; }
      state.bookHistoryRestore = true;
      bookStep(1);
      state.bookHistoryRestore = false;
      tts.timer = setTimeout(ttsStep, 1500);
      return;
    }
    tts.stuck = 0;
    tts.lastText = text;
    const chunks = ttsChunks(text);
    if (!chunks.length) { stopTts(); return; }
    tts.chunks = chunks;
    ttsStep();
  }

  function speakTtsChunk(text) {
    const tts = state.tts;
    if (!tts) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    const voice = pickVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    utterance.onend = () => {
      if (state.tts === tts) ttsStep();
    };
    utterance.onerror = () => {
      if (state.tts === tts) ttsStep();
    };
    tts.utterance = utterance;
    try { window.speechSynthesis.speak(utterance); } catch (_) { stopTts(); }
  }

  function currentBookDoc() {
    const view = state.bookView;
    if (!view || !view.renderer || typeof view.renderer.getContents !== "function") return null;
    let contents;
    try { contents = view.renderer.getContents() || []; } catch (_) { return null; }
    for (const entry of contents) {
      if (entry && entry.doc) return entry.doc;
    }
    return null;
  }

  /* --------------------------------------------------------------- overlays */
  function highlightGroup(rects, options) {
    const color = typeof options === "string"
      ? options
      : (options && options.color) || NOTE_COLORS[0];
    const ns = "http://www.w3.org/2000/svg";
    const group = document.createElementNS(ns, "g");
    group.setAttribute("fill", color);
    group.style.opacity = ".35";
    for (const { left, top, width, height } of rects) {
      const el = document.createElementNS(ns, "rect");
      el.setAttribute("x", left);
      el.setAttribute("y", top);
      el.setAttribute("width", Math.max(0, width));
      el.setAttribute("height", Math.max(0, height));
      group.append(el);
    }
    return group;
  }

  function closeTypeset() {
    state.typesetOpen = false;
    if (state.typesetPanel) state.typesetPanel.hidden = true;
    if (state.buttons.typeset) state.buttons.typeset.classList.remove("active");
  }

  function buildTypesetPanel() {
    if (state.typesetPanel) return state.typesetPanel;
    const panel = h("div", "reader-typeset");
    panel.hidden = true;
    const familyRow = h("div", "reader-typeset-row");
    familyRow.append(h("span", "reader-typeset-label", "Font"));
    const familyButtons = {};
    for (const [key, label] of [["serif", "Serif"], ["sans", "Sans"], ["mono", "Mono"]]) {
      const item = button(label, `${label} typeface`, () => {
        state.bookFont = key;
        savePref(BOOK_FONT_KEY, key);
        applyBookStyles();
        syncTypeset();
      }, { className: "reader-typeset-btn" });
      familyButtons[key] = item;
      familyRow.append(item);
    }
    const marginRow = h("div", "reader-typeset-row");
    marginRow.append(h("span", "reader-typeset-label", "Margins"));
    const marginButtons = {};
    [["Narrow", 0], ["Normal", 1], ["Wide", 2]].forEach(([label, value]) => {
      const item = button(label, `${label} page margins`, () => {
        state.bookMargin = value;
        savePref(BOOK_MARGIN_KEY, value);
        applyBookStyles();
        syncTypeset();
      }, { className: "reader-typeset-btn" });
      marginButtons[value] = item;
      marginRow.append(item);
    });
    const toggleRow = h("div", "reader-typeset-row");
    const justify = button("Justify", "Align text to both margins", () => {
      state.bookJustify = !state.bookJustify;
      savePref(BOOK_JUSTIFY_KEY, state.bookJustify ? "1" : "0");
      applyBookStyles();
      syncTypeset();
    }, { className: "reader-typeset-btn" });
    const hyphen = button("Hyphenate", "Break long words at line ends", () => {
      state.bookHyphen = !state.bookHyphen;
      savePref(BOOK_HYPHEN_KEY, state.bookHyphen ? "1" : "0");
      applyBookStyles();
      syncTypeset();
    }, { className: "reader-typeset-btn" });
    toggleRow.append(justify, hyphen);
    panel.append(familyRow, marginRow, toggleRow);
    state.shell.append(panel);
    state.typesetPanel = panel;
    state.typesetControls = { familyButtons, marginButtons, justify, hyphen };
    syncTypeset();
    return panel;
  }

  function syncTypeset() {
    const controls = state.typesetControls;
    if (!controls) return;
    for (const [key, node] of Object.entries(controls.familyButtons)) {
      node.classList.toggle("active", key === state.bookFont);
    }
    for (const [value, node] of Object.entries(controls.marginButtons)) {
      node.classList.toggle("active", Number(value) === state.bookMargin);
    }
    controls.justify.classList.toggle("active", state.bookJustify);
    controls.hyphen.classList.toggle("active", state.bookHyphen);
  }

  function toggleTypeset() {
    const panel = buildTypesetPanel();
    const open = !state.typesetOpen;
    closeToc();
    closePdfThumbs();
    closeMarksPanel();
    closeHelp();
    closeBookInfo();
    closeFootnote();
    state.typesetOpen = open;
    panel.hidden = !open;
    if (state.buttons.typeset) state.buttons.typeset.classList.toggle("active", open);
  }

  const HELP_ROWS = [
    ["← / →", "Previous / next page"],
    ["↑ / ↓, Space", "Scroll or turn pages"],
    ["J / K", "Scroll down / up or turn pages"],
    ["Home / End", "Start / end of the document"],
    ["+ / −", "Zoom (PDF) or text size"],
    ["Ctrl+F", "Find in document"],
    ["Ctrl+B or B", "Add or remove a bookmark"],
    ["M", "Bookmarks and notes"],
    ["L", "Read aloud"],
    ["I", "Book details"],
    ["Alt+← / Alt+→", "Back and forward between jumps"],
    ["?", "Show this help"],
    ["Esc", "Close panel, then the reader"]
  ];

  function closeHelp() {
    state.helpOpen = false;
    if (state.helpPanel) state.helpPanel.hidden = true;
    if (state.buttons.help) state.buttons.help.classList.remove("active");
  }

  function toggleHelp() {
    if (!state.helpPanel) {
      const panel = h("div", "reader-help");
      panel.hidden = true;
      const card = h("div", "reader-help-card");
      card.append(h("div", "reader-help-title", "Reader shortcuts"));
      for (const [keys, label] of HELP_ROWS) {
        const row = h("div", "reader-help-row");
        row.append(h("kbd", "reader-help-key", keys), h("span", "reader-help-label", label));
        card.append(row);
      }
      card.append(button("Close", "Close help", () => closeHelp()));
      panel.append(card);
      state.shell.append(panel);
      state.helpPanel = panel;
    }
    const open = !state.helpOpen;
    if (open) {
      closeToc();
      closePdfThumbs();
      closeMarksPanel();
      closeTypeset();
      closeBookInfo();
      closeFootnote();
      closeBookImage();
    }
    state.helpOpen = open;
    state.helpPanel.hidden = !open;
    if (state.buttons.help) state.buttons.help.classList.toggle("active", open);
  }

  function buildShell(host, format) {
    const shell = h("div", "reader-shell");
    const tools = h("div", "reader-tools");
    const left = h("div", "reader-tool-group");
    const status = h("div", "reader-tool-status");
    const statusText = h("span", "reader-status-text");
    const progressWrap = h("div", "reader-progress-wrap");
    progressWrap.hidden = true;
    const slider = h("input", "reader-progress");
    slider.type = "range";
    slider.min = "0";
    slider.max = "1000";
    slider.step = "1";
    slider.value = "0";
    slider.setAttribute("aria-label", "Reading progress");
    const pct = h("span", "reader-progress-pct", "0%");
    slider.addEventListener("input", () => {
      pct.textContent = `${Math.round(Number(slider.value) / 10)}%`;
    });
    slider.addEventListener("change", () => {
      if (!state.bookView) return;
      if (!state.bookHistoryRestore && state.bookCfi) {
        pushHistory("book", { cfi: state.bookCfi, fraction: state.fraction });
      }
      state.bookView.goToFraction(Number(slider.value) / 1000).catch(() => {});
    });
    slider.addEventListener("keydown", (event) => event.stopPropagation());
    progressWrap.append(slider, pct);
    status.append(statusText, progressWrap);
    const right = h("div", "reader-tool-group");
    tools.append(left, status, right);
    const body = h("div", "reader-body");
    body.classList.add(format);
    const families = { pdf: "pdf", doc: "pdf", epub: "book", fb2: "book",
      docx: "article", md: "article", txt: "article", xml: "article" };
    if (families[format]) body.classList.add(families[format]);
    shell.append(tools, body);
    host.append(shell);
    state.shell = shell;
    state.body = body;
    state.statusEl = status;
    state.statusText = statusText;
    state.progressWrap = progressWrap;
    state.progressSlider = slider;
    state.progressPct = pct;
    state.buttons = { left, right };
    state.observer = new ResizeObserver(() => {
      if (!state.pdf) return;
      clearTimeout(state.resizeTimer);
      state.resizeTimer = setTimeout(() => layoutPdf(true), 180);
    });
    state.observer.observe(body);
  }

  function showStatePanel(text, detail) {
    if (!state.body) return;
    const panel = h("div", "reader-state");
    panel.append(h("div", "reader-spinner"));
    panel.append(h("div", "reader-state-text", text));
    if (detail) panel.append(h("div", "reader-state-detail", detail));
    state.body.replaceChildren(panel);
    return panel;
  }

  function showFailure(error) {
    if (!state.body) return;
    const shell = h("div", "reader-state reader-fail");
    shell.append(h("div", "reader-fail-title", "This file can’t be opened here"));
    shell.append(h("div", "reader-fail-text", (error && error.message) || "The reader could not load this file."));
    if (state.format === "doc") {
      shell.append(h("div", "reader-fail-note", "Legacy .doc files are converted with Microsoft Word. Use Download or Open in app if Word is not available."));
    } else if (state.format && BOOK_FORMATS[state.format]) {
      shell.append(h("div", "reader-fail-note", "The book may be damaged, use an unsupported layout, or be protected by DRM. Download it to read it in another app."));
    }
    if (state.item && state.host) {
      const retry = h("button", "btn primary", "Try again");
      retry.type = "button";
      retry.addEventListener("click", () => open(state.host, state.item));
      shell.append(retry);
    }
    state.body.replaceChildren(shell);
    setStatus("");
  }

  function fileUrl(item) {
    // A file that was replaced in Telegram gets a new message id, so the URL
    // changes with it and WebView2 cannot answer with the old document.
    return `/api/file/${item.id}?v=${Number(item.message_id) || 0}-${Number(item.size) || 0}`;
  }

  async function fetchFull(item) {
    const response = await fetch(fileUrl(item), { credentials: "same-origin" });
    if (!response.ok) throw new Error(`The file could not be downloaded (${response.status}).`);
    return response;
  }

  async function fetchText(item, limit) {
    const response = await fetchFull(item);
    const text = await response.text();
    if (text.length <= limit) return text;
    return `${text.slice(0, limit)}\n\n… preview truncated at ${Math.round(limit / 1048576)} MB`;
  }

  async function pdfjs() {
    if (!pdfjsPromise) {
      pdfjsPromise = import("/static/vendor/pdfjs/pdf.min.mjs").then((mod) => {
        mod.GlobalWorkerOptions.workerSrc = "/static/vendor/pdfjs/pdf.worker.min.mjs";
        state.pdfjs = mod;
        return mod;
      });
      pdfjsPromise.catch(() => { pdfjsPromise = null; });
    }
    return pdfjsPromise;
  }

  async function renderThumbnail(item, size) {
    const lib = await pdfjs();
    const doc = await lib.getDocument({
      url: fileUrl(item),
      cMapUrl: "/static/vendor/pdfjs/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "/static/vendor/pdfjs/standard_fonts/",
      wasmUrl: "/static/vendor/pdfjs/wasm/"
    }).promise;
    try {
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const longest = Math.max(base.width, base.height) || 1;
      const viewport = page.getViewport({ scale: Math.max(0.05, (size || 640) / longest) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const context = canvas.getContext("2d", { alpha: false });
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL("image/jpeg", 0.86);
    } finally {
      try { doc.destroy(); } catch (_) {}
    }
  }

  /* ------------------------------------------------------------------ PDF */
  function pdfToolbar() {
    const left = state.buttons.left;
    const right = state.buttons.right;
    left.replaceChildren();
    right.replaceChildren();
    const contents = button("Contents", "Document outline", () => toggleToc());
    contents.disabled = !state.pdfOutline.length;
    const pages = button("Pages", "Page thumbnails", () => togglePdfThumbs());
    const prev = button("‹", "Previous page (←)", () => goPage(state.page - 1), { aria: "Previous page" });
    const next = button("›", "Next page (→)", () => goPage(state.page + 1), { aria: "Next page" });
    const back = button("↶", "Back to the previous jump (Alt+←)", () => historyStep("pdf", -1), { aria: "Back" });
    const forward = button("↷", "Forward to the next jump (Alt+→)", () => historyStep("pdf", 1), { aria: "Forward" });
    const input = h("input", "reader-page-input");
    input.type = "number";
    input.min = "1";
    input.inputMode = "numeric";
    input.setAttribute("aria-label", "Page number");
    input.addEventListener("focus", () => input.select());
    input.addEventListener("change", () => goPage(Number(input.value) || 1));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        goPage(Number(input.value) || 1);
        input.blur();
      }
      event.stopPropagation();
    });
    const total = h("span", "reader-page-total", "of 0");
    left.append(contents, pages, prev, input, total, next);
    const find = button("Find", "Find in document (Ctrl+F)", () => toggleFind("pdf"));
    const night = button("Night", "Invert the page colours for night reading", () => togglePdfNight());
    night.classList.toggle("active", state.pdfNight);
    const out = button("−", "Zoom out (Ctrl+−)", () => zoomBy(1 / 1.25), { aria: "Zoom out" });
    const label = h("span", "reader-zoom", "100%");
    const into = button("+", "Zoom in (Ctrl++)", () => zoomBy(1.25), { aria: "Zoom in" });
    const fit = button(state.pdfFit === "width" ? "Fit width" : "Fit page",
      "Switch between fitting the width and the whole page", () => togglePdfFit());
    const bookmark = button("☆", "Bookmark this page (Ctrl+B)", () => toggleBookmark());
    const marks = button("Marks", "Bookmarks and notes (M)", () => toggleMarksPanel());
    const listen = button(ttsSupported() ? "Listen" : "No voice", "Read aloud from here (L)", toggleTts);
    if (!ttsSupported()) listen.disabled = true;
    const help = button("?", "Reader shortcuts (?)", () => toggleHelp(), { aria: "Reader shortcuts" });
    right.append(back, forward, find, night, out, label, into, fit, bookmark, marks, listen, help);
    Object.assign(state.buttons, {
      left, right, prev, next, pageInput: input, pageTotal: total,
      zoomLabel: label, fit, night, contents, find, pages, bookmark, marks, listen,
      historyBack: back, historyForward: forward, help, typeset: null
    });
    updatePdfToolbar();
    updateMarkButtons();
    updateTtsButtons();
    updateHistoryButtons();
  }

  function updatePdfToolbar() {
    const b = state.buttons;
    if (!b.pageInput) return;
    b.pageInput.value = String(state.page);
    b.pageInput.max = String(state.pages);
    b.pageTotal.textContent = `of ${state.pages}`;
    b.prev.disabled = state.page <= 1;
    b.next.disabled = state.page >= state.pages;
    b.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
    if (b.fit) b.fit.textContent = state.pdfFit === "width" ? "Fit width" : "Fit page";
    if (b.night) b.night.classList.toggle("active", state.pdfNight);
    markPdfTocActive();
    markPdfThumbActive();
    updateMarkButtons();
  }

  function pdfBaseWidth() {
    const scroller = state.pdfScrollEl;
    if (!scroller) return 600;
    const availW = Math.max(160, scroller.clientWidth - 48);
    const availH = Math.max(160, scroller.clientHeight - 48);
    return state.pdfFit === "page"
      ? Math.max(120, Math.min(availW, availH / (state.pdfAspect || 1.414)))
      : availW;
  }

  function pdfPageTop(wrap) {
    const scroller = state.pdfScrollEl;
    if (!scroller) return 0;
    return wrap.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
  }

  function pdfScrollAnchor() {
    const scroller = state.pdfScrollEl;
    if (!scroller) return { page: state.page, offset: 0 };
    const probe = scroller.scrollTop + Math.min(scroller.clientHeight * 0.3, 200);
    let chosen = 1;
    for (const [num, node] of state.pdfPageNodes) {
      if (pdfPageTop(node.wrap) <= probe + 1) chosen = num;
      else break;
    }
    const node = state.pdfPageNodes.get(chosen);
    let offset = 0;
    if (node) {
      const height = node.wrap.offsetHeight || 1;
      offset = clamp((scroller.scrollTop + 8 - pdfPageTop(node.wrap)) / height, 0, 1);
    }
    return { page: chosen, offset };
  }

  function pdfScrollTo(page, offset, smooth) {
    const scroller = state.pdfScrollEl;
    const node = state.pdfPageNodes.get(clamp(Math.round(page) || 1, 1, state.pages));
    if (!scroller || !node) return;
    const top = pdfPageTop(node.wrap) + clamp(Number(offset) || 0, 0, 1) * (node.wrap.offsetHeight || 0);
    scroller.scrollTo({ top: Math.max(0, top - 8), behavior: smooth ? "smooth" : "auto" });
  }

  function buildPdfPages() {
    state.pdfPageNodes.clear();
    state.pdfStackEl.replaceChildren();
    const fragment = document.createDocumentFragment();
    for (let number = 1; number <= state.pages; number += 1) {
      const wrap = h("div", "reader-pdf-page");
      wrap.dataset.page = String(number);
      const placeholder = h("div", "reader-pdf-placeholder", `Page ${number}`);
      const highlights = h("div", "pdf-hl");
      const notes = h("div", "pdf-notes");
      const text = h("div", "pdf-text");
      wrap.append(placeholder, highlights, text, notes);
      fragment.append(wrap);
      state.pdfPageNodes.set(number, {
        wrap, placeholder, highlights, notes, text, canvas: null, task: null,
        textLayer: null, rendered: false, queued: false, aspect: state.pdfAspect
      });
    }
    state.pdfStackEl.append(fragment);
  }

  function layoutPdf(force) {
    const scroller = state.pdfScrollEl;
    if (!scroller || !state.pdf) return;
    const width = Math.max(120, Math.round(pdfBaseWidth() * state.zoom));
    if (!force && Math.abs(width - state.pdfWidth) < 2) return;
    const anchor = pdfScrollAnchor();
    state.pdfWidth = width;
    state.pdfRenderSeq += 1;
    for (const node of state.pdfPageNodes.values()) {
      node.wrap.style.width = `${width}px`;
      node.wrap.style.height = `${Math.round(width * (node.aspect || state.pdfAspect))}px`;
    }
    invalidatePdfRendering();
    updatePdfToolbar();
    pdfScrollTo(anchor.page, anchor.offset, false);
    renderVisiblePdfPages();
  }

  function invalidatePdfRendering() {
    state.pdfRenderQueue.length = 0;
    for (const [number, node] of state.pdfPageNodes) {
      node.queued = false;
      node.rendered = false;
      if (node.task) {
        try { node.task.cancel(); } catch (_) {}
        node.task = null;
      }
      if (node.canvas) {
        node.canvas.remove();
        node.canvas = null;
      }
      if (node.textLayer) {
        try { node.textLayer.cancel(); } catch (_) {}
        node.textLayer = null;
      }
      if (node.text) node.text.replaceChildren();
      paintPdfNotes(number);
      if (!node.placeholder.isConnected) node.wrap.insertBefore(node.placeholder, node.wrap.firstChild);
    }
  }

  function queuePdfRender(number) {
    const node = state.pdfPageNodes.get(number);
    if (!node || node.rendered || node.queued) return;
    node.queued = true;
    state.pdfRenderQueue.push(number);
    pumpPdfQueue();
  }

  async function pumpPdfQueue() {
    if (state.pdfRendering >= 2) return;
    const number = state.pdfRenderQueue.shift();
    if (number == null) return;
    state.pdfRendering += 1;
    try {
      await renderPdfPageNode(number);
    } catch (_) {
      /* a damaged page simply keeps its placeholder */
      const node = state.pdfPageNodes.get(number);
      if (node && !node.rendered) node.queued = false;
    } finally {
      state.pdfRendering -= 1;
      pumpPdfQueue();
    }
  }

  async function renderPdfPageNode(number) {
    const node = state.pdfPageNodes.get(number);
    const doc = state.pdf;
    if (!node || !doc || node.rendered) {
      if (node) node.queued = false;
      return;
    }
    const token = state.token;
    const seq = state.pdfRenderSeq;
    const page = await doc.getPage(number);
    if (token !== state.token || !state.pdf || seq !== state.pdfRenderSeq || node.rendered) {
      node.queued = false;
      return;
    }
    const base = page.getViewport({ scale: 1 });
    const width = state.pdfWidth || Math.round(node.wrap.offsetWidth) || 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: (width / base.width) * dpr });
    const cssWidth = Math.max(1, Math.round(viewport.width / dpr));
    const cssHeight = Math.max(1, Math.round(viewport.height / dpr));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const task = page.render({ canvasContext: context, viewport });
    node.task = task;
    try {
      await task.promise;
    } finally {
      if (node.task === task) node.task = null;
    }
    if (token !== state.token || !state.pdf || seq !== state.pdfRenderSeq || !node.wrap.isConnected) {
      node.queued = false;
      return;
    }
    node.canvas = canvas;
    node.aspect = cssHeight / cssWidth;
    node.wrap.style.width = `${cssWidth}px`;
    node.wrap.style.height = `${cssHeight}px`;
    node.placeholder.remove();
    node.wrap.insertBefore(canvas, node.highlights);
    node.rendered = true;
    node.queued = false;
    paintPdfHighlights(number);
    paintPdfNotes(number);
    attachPdfTextLayer(page, node, cssWidth, token, seq);
  }

  async function attachPdfTextLayer(page, node, cssWidth, token, seq) {
    const lib = state.pdfjs;
    if (!lib || !lib.TextLayer || !node.text) return;
    node.text.replaceChildren();
    try {
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: cssWidth / (base.width || 1) });
      node.text.style.setProperty("--total-scale-factor", String(viewport.scale));
      node.text.style.setProperty("--scale-factor", String(viewport.scale));
      node.text.style.setProperty("--scale-round-x", "1px");
      node.text.style.setProperty("--scale-round-y", "1px");
      if (lib.setLayerDimensions) lib.setLayerDimensions(node.text, viewport, false, false);
      const layer = new lib.TextLayer({
        textContentSource: page.streamTextContent(),
        container: node.text,
        viewport
      });
      node.textLayer = layer;
      await layer.render();
    } catch (_) {
      node.textLayer = null;
      node.text.replaceChildren();
      return;
    }
    if (token !== state.token || seq !== state.pdfRenderSeq || !node.text.isConnected) {
      if (node.textLayer) {
        try { node.textLayer.cancel(); } catch (_) {}
        node.textLayer = null;
      }
      node.text.replaceChildren();
    }
  }

  function renderVisiblePdfPages() {
    const scroller = state.pdfScrollEl;
    if (!scroller) return;
    const view = scroller.getBoundingClientRect();
    const margin = 700;
    for (const [number, node] of state.pdfPageNodes) {
      const rect = node.wrap.getBoundingClientRect();
      if (rect.bottom > view.top - margin && rect.top < view.bottom + margin) queuePdfRender(number);
    }
  }

  function prunePdfCanvases() {
    const scroller = state.pdfScrollEl;
    if (!scroller) return;
    const view = scroller.getBoundingClientRect();
    for (const node of state.pdfPageNodes.values()) {
      if (!node.rendered || node.task) continue;
      const rect = node.wrap.getBoundingClientRect();
      if (rect.bottom < view.top - 2800 || rect.top > view.bottom + 2800) {
        node.canvas.remove();
        node.canvas = null;
        node.rendered = false;
        node.queued = false;
        if (!node.placeholder.isConnected) node.wrap.insertBefore(node.placeholder, node.wrap.firstChild);
      }
    }
  }

  function setupPdfObserver() {
    if (state.pdfObserver) {
      try { state.pdfObserver.disconnect(); } catch (_) {}
      state.pdfObserver = null;
    }
    if (!state.pdfScrollEl || typeof IntersectionObserver !== "function") return;
    state.pdfObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) queuePdfRender(Number(entry.target.dataset.page));
      }
    }, { root: state.pdfScrollEl, rootMargin: "700px 0px", threshold: 0.01 });
    for (const node of state.pdfPageNodes.values()) state.pdfObserver.observe(node.wrap);
  }

  function onPdfScroll() {
    if (state.pdfScrollRaf) return;
    state.pdfScrollRaf = requestAnimationFrame(() => {
      state.pdfScrollRaf = 0;
      if (!state.pdf) return;
      const anchor = pdfScrollAnchor();
      const changed = anchor.page !== state.page;
      state.page = anchor.page;
      state.pageOffset = anchor.offset;
      if (changed) {
        updatePdfToolbar();
        updateMarkButtons();
        setStatus(`Page ${state.page} of ${state.pages}`);
      }
      rememberThrottled(state.item, { page: anchor.page, offset: anchor.offset, zoom: state.zoom });
      prunePdfCanvases();
      renderVisiblePdfPages();
    });
  }

  async function loadPdf(item, token, options) {
    const body = state.body;
    body.classList.remove("book", "article", "frame");
    body.classList.add("pdf");
    setProgress(0, false);
    const buffered = Boolean(options && options.buffer);
    const panel = showStatePanel(
      buffered ? "Preparing document…" : "Opening PDF…",
      buffered ? "" : "Reading from Telegram…"
    );
    const detail = panel.querySelector(".reader-state-detail");
    // Telethon waits for a reply with no timeout, so one dropped read would
    // leave this panel on screen forever. Stop the task when bytes stop.
    let loading = null;
    let lastByte = Date.now();
    let stalled = false;
    const watchdog = setInterval(() => {
      if (Date.now() - lastByte < 45000) return;
      clearInterval(watchdog);
      stalled = true;
      try { if (loading) loading.destroy(); } catch (_) {}
    }, 5000);
    const lib = await pdfjs();
    if (token !== state.token) { clearInterval(watchdog); return; }
    const params = {
      cMapUrl: "/static/vendor/pdfjs/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "/static/vendor/pdfjs/standard_fonts/",
      wasmUrl: "/static/vendor/pdfjs/wasm/",
      // Match the server's 2 MiB cache blocks: fewer round trips per page.
      rangeChunkSize: 2 * 1024 * 1024,
      onProgress: ({ loaded }) => {
        lastByte = Date.now();
        if (detail && loaded) {
          detail.textContent = `Downloaded ${Math.round(loaded / 1048576)} MB`;
        }
      }
    };
    let doc;
    try {
      loading = buffered
        ? lib.getDocument({ data: options.buffer, ...params })
        : lib.getDocument({ url: fileUrl(item), ...params });
      doc = await loading.promise;
    } catch (error) {
      clearInterval(watchdog);
      if (stalled) {
        throw new Error("Telegram stopped sending this PDF. Check your connection, then try again.");
      }
      throw new Error(error && error.message ? `The PDF could not be opened: ${error.message}` : "The PDF could not be opened.");
    }
    clearInterval(watchdog);
    if (token !== state.token) {
      try { doc.destroy(); } catch (_) {}
      return;
    }
    panel.remove();
    state.pdf = doc;
    state.pages = doc.numPages || 1;
    state.pdfTextCache = new Map();
    state.pdfFind = { query: "", matches: [], index: -1, token: 0 };
    state.pdfOutline = [];
    state.pdfTocRows = [];
    state.pdfThumbCache = new Map();
    if (state.pdfThumbObserver) {
      state.pdfThumbObserver.disconnect();
      state.pdfThumbObserver = null;
    }
    state.pdfThumbsPanel = null;
    state.pdfThumbItems = null;
    state.pdfThumbsOpen = false;
    state.pdfThumbSeq += 1;
    state.tocOpen = false;
    state.tocPanel = null;
    loadMarks(item);
    resetHistory("pdf");
    let aspect = 1.414;
    try {
      const first = await doc.getPage(1);
      const viewport = first.getViewport({ scale: 1 });
      if (viewport.width > 0) aspect = viewport.height / viewport.width;
    } catch (_) {}
    state.pdfAspect = aspect;
    const saved = recall(item);
    state.page = clamp(Number(saved && saved.page) || 1, 1, state.pages);
    state.pageOffset = clamp(Number(saved && saved.offset) || 0, 0, 1);
    state.zoom = clamp(Number(saved && saved.zoom) || 1, PDF_ZOOM_MIN, PDF_ZOOM_MAX);
    if (window.AndroidBridge) state.zoom = Math.min(state.zoom, 1);
    state.pdfScrollEl = h("div", "reader-pdf-scroll" + (state.pdfNight ? " night" : ""));
    state.pdfStackEl = h("div", "reader-pdf-stack");
    state.pdfScrollEl.append(state.pdfStackEl);
    state.pdfWidth = 0;
    buildPdfPages();
    body.replaceChildren(state.pdfScrollEl);
    ensureFindBar();
    body.append(state.findBar.bar);
    pdfToolbar();
    setStatus(`Page ${state.page} of ${state.pages}`);
    layoutPdf(true);
    setupPdfObserver();
    bindPdfLayers();
    state.pdfScrollEl.addEventListener("scroll", onPdfScroll, { passive: true });
    try {
      state.pdfOutline = await buildPdfOutline(doc);
    } catch (_) {
      state.pdfOutline = [];
    }
    if (token !== state.token) return;
    if (state.pdfOutline.length) installPdfToc();
    updatePdfToolbar();
    pdfScrollTo(state.page, state.pageOffset, false);
    renderVisiblePdfPages();
    setStatus(`Page ${state.page} of ${state.pages}`);
  }

  function goPage(number, offset) {
    if (!state.pdf) return;
    const target = clamp(Math.round(Number(number) || 1), 1, state.pages);
    const nextOffset = clamp(Number(offset) || 0, 0, 1);
    if (!state.pdfHistoryRestore && (target !== state.page || Math.abs(nextOffset - state.pageOffset) > 0.01)) {
      pushHistory("pdf", { page: state.page, offset: state.pageOffset });
    }
    state.page = target;
    state.pageOffset = nextOffset;
    pdfScrollTo(target, nextOffset, false);
    updatePdfToolbar();
    renderVisiblePdfPages();
    setStatus(`Page ${target} of ${state.pages}`);
    rememberThrottled(state.item, { page: target, offset: nextOffset, zoom: state.zoom });
  }

  function zoomBy(factor) {
    if (!state.pdf) return;
    state.zoom = clamp(state.zoom * factor, PDF_ZOOM_MIN, PDF_ZOOM_MAX);
    layoutPdf(true);
    rememberThrottled(state.item, { page: state.page, offset: state.pageOffset, zoom: state.zoom });
  }

  function togglePdfFit() {
    state.pdfFit = state.pdfFit === "width" ? "page" : "width";
    state.zoom = 1;
    savePref(PDF_FIT_KEY, state.pdfFit);
    layoutPdf(true);
  }

  function togglePdfNight() {
    state.pdfNight = !state.pdfNight;
    savePref(PDF_NIGHT_KEY, state.pdfNight ? "1" : "0");
    if (state.pdfScrollEl) state.pdfScrollEl.classList.toggle("night", state.pdfNight);
    if (state.buttons.night) state.buttons.night.classList.toggle("active", state.pdfNight);
  }

  async function buildPdfOutline(doc) {
    const entries = await doc.getOutline();
    const out = [];
    async function walk(items, depth) {
      for (const entry of items || []) {
        let page = 0;
        try {
          let dest = entry.dest;
          if (typeof dest === "string") dest = await doc.getDestination(dest);
          if (Array.isArray(dest) && dest.length) {
            const first = dest[0];
            if (typeof first === "number") page = first + 1;
            else if (first && typeof first === "object" && first.num != null) page = first.num + 1;
            else if (first) page = (await doc.getPageIndex(first)) + 1;
          }
        } catch (_) {}
        if (page >= 1 && page <= (doc.numPages || 1)) {
          out.push({ label: entry.title || "Untitled", page, depth });
        }
        if (entry.items && entry.items.length) await walk(entry.items, depth + 1);
      }
    }
    await walk(entries, 0);
    return out;
  }

  function installPdfToc() {
    if (!state.shell) return;
    if (state.tocPanel) state.tocPanel.remove();
    const panel = h("div", "reader-toc");
    panel.hidden = true;
    panel.append(h("div", "reader-toc-head", "Contents"));
    const list = h("div", "reader-toc-list");
    state.pdfTocRows = [];
    for (const entry of state.pdfOutline) {
      const row = h("button", "reader-toc-item", entry.label);
      row.type = "button";
      row.dataset.page = String(entry.page);
      row.dataset.label = entry.label;
      row.style.paddingLeft = `${12 + entry.depth * 14}px`;
      row.title = `${entry.label} · page ${entry.page}`;
      row.addEventListener("click", () => {
        goPage(entry.page);
        closeToc();
      });
      list.append(row);
      state.pdfTocRows.push(row);
    }
    panel.append(list);
    attachTocSearch(panel, state.pdfTocRows);
    state.shell.append(panel);
    state.tocPanel = panel;
    if (state.buttons.contents) state.buttons.contents.disabled = false;
  }

  function markPdfTocActive() {
    if (!state.pdfTocRows.length) return;
    let active = null;
    for (const row of state.pdfTocRows) {
      if (Number(row.dataset.page) <= state.page) active = row;
      else break;
    }
    for (const row of state.pdfTocRows) row.classList.toggle("active", row === active);
  }

  /* -------------------------------------------------------- page thumbnails */
  function ensurePdfThumbs() {
    if (state.pdfThumbsPanel) return state.pdfThumbsPanel;
    const panel = h("div", "reader-thumbs");
    panel.hidden = true;
    panel.append(h("div", "reader-toc-head", "Pages"));
    const list = h("div", "reader-thumbs-list");
    const items = [];
    for (let number = 1; number <= state.pages; number += 1) {
      const item = h("button", "reader-thumb");
      item.type = "button";
      item.dataset.page = String(number);
      item.title = `Page ${number}`;
      const frame = h("div", "reader-thumb-frame");
      const label = h("span", "reader-thumb-label", String(number));
      item.append(frame, label);
      item.addEventListener("click", () => {
        goPage(number);
        markPdfThumbActive();
      });
      list.append(item);
      items.push({ item, frame, page: number, done: false, busy: false });
    }
    panel.append(list);
    state.shell.append(panel);
    state.pdfThumbsPanel = panel;
    state.pdfThumbItems = items;
    if (typeof IntersectionObserver === "function") {
      state.pdfThumbObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const record = items.find((item) => item.item === entry.target);
          if (record) renderPdfThumbEntry(record);
        }
      }, { root: panel, rootMargin: "500px 0px" });
      for (const record of items) state.pdfThumbObserver.observe(record.item);
    }
    return panel;
  }

  function togglePdfThumbs() {
    const panel = ensurePdfThumbs();
    const open = !state.pdfThumbsOpen;
    if (open) {
      closeToc();
      closeMarksPanel();
      closeTypeset();
      closeHelp();
    }
    state.pdfThumbsOpen = open;
    panel.hidden = !open;
    if (state.buttons.pages) state.buttons.pages.classList.toggle("active", open);
    if (!open) return;
    markPdfThumbActive();
    renderPdfThumbs();
  }

  function closePdfThumbs() {
    state.pdfThumbsOpen = false;
    if (state.pdfThumbsPanel) state.pdfThumbsPanel.hidden = true;
    if (state.buttons.pages) state.buttons.pages.classList.remove("active");
  }

  function markPdfThumbActive() {
    if (!state.pdfThumbItems || !state.pdfThumbsOpen) return;
    let active = null;
    for (const entry of state.pdfThumbItems) {
      const on = entry.page === state.page;
      entry.item.classList.toggle("active", on);
      if (on) active = entry.item;
    }
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  async function renderPdfThumbEntry(entry) {
    if (!entry || entry.done || entry.busy || !state.pdfThumbsOpen) return;
    const local = state.pdfThumbSeq;
    entry.busy = true;
    try {
      const url = await pdfThumbUrl(entry.page);
      if (local !== state.pdfThumbSeq || !state.pdfThumbsOpen) return;
      if (url) {
        const image = document.createElement("img");
        image.alt = `Page ${entry.page}`;
        image.src = url;
        entry.frame.replaceChildren(image);
      }
      entry.done = true;
    } catch (_) {
      entry.done = true;
    } finally {
      entry.busy = false;
    }
  }

  function renderPdfThumbs() {
    const items = state.pdfThumbItems;
    if (!items || !state.pdfThumbsOpen) return;
    if (!state.pdfThumbObserver) {
      const local = state.pdfThumbSeq;
      const run = async () => {
        for (const entry of items) {
          if (local !== state.pdfThumbSeq || !state.pdfThumbsOpen) return;
          if (!entry.done && !entry.busy) await renderPdfThumbEntry(entry);
        }
      };
      run();
      return;
    }
    const at = Math.max(0, items.findIndex((entry) => entry.page === state.page));
    const start = Math.max(0, at - 1);
    const end = Math.min(items.length, at + 6);
    for (let index = start; index < end; index += 1) {
      const entry = items[index];
      if (entry && !entry.done && !entry.busy) renderPdfThumbEntry(entry);
    }
  }

  async function pdfThumbUrl(number) {
    if (state.pdfThumbCache.has(number)) return state.pdfThumbCache.get(number);
    const doc = state.pdf;
    if (!doc) return "";
    const page = await doc.getPage(number);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 130 / (base.width || 1) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const url = canvas.toDataURL("image/jpeg", 0.72);
    state.pdfThumbCache.set(number, url);
    return url;
  }

  /* --------------------------------------------------- highlights and notes */
  function paintPdfNotes(number) {
    const node = state.pdfPageNodes.get(number);
    if (!node || !node.notes) return;
    const width = node.wrap.clientWidth;
    const height = node.wrap.clientHeight;
    if (!width || !height) return;
    const fragment = document.createDocumentFragment();
    for (const note of state.marks.notes) {
      if (note.kind !== "pdf" || Number(note.page) !== number) continue;
      for (const rect of note.rects || []) {
        const mark = h("span", "pdf-note-mark");
        mark.style.left = `${rect.x * width}px`;
        mark.style.top = `${rect.y * height}px`;
        mark.style.width = `${Math.max(2, rect.w * width)}px`;
        mark.style.height = `${Math.max(2, rect.h * height)}px`;
        mark.style.background = note.color || NOTE_COLORS[0];
        mark.dataset.note = note.id;
        mark.title = note.text ? note.text.slice(0, 160) : "Highlight";
        fragment.append(mark);
      }
    }
    node.notes.replaceChildren(fragment);
  }

  function paintPdfAllNotes() {
    for (const number of state.pdfPageNodes.keys()) paintPdfNotes(number);
  }

  function bindPdfLayers() {
    const stack = state.pdfStackEl;
    if (!stack) return;
    stack.addEventListener("mouseup", onPdfSelection);
    stack.addEventListener("click", onPdfNoteClick);
    state.selectionHandler = { stack };
  }

  function onPdfNoteClick(event) {
    const mark = event.target && event.target.closest ? event.target.closest(".pdf-note-mark") : null;
    if (!mark) return;
    const note = state.marks.notes.find((item) => item.id === mark.dataset.note);
    if (!note) return;
    event.preventDefault();
    event.stopPropagation();
    openNoteEditor({ ...note, x: event.clientX, y: event.clientY });
  }

  function onPdfSelection(event) {
    if (!state.pdf || event.button !== 0) return;
    setTimeout(() => {
      if (!state.pdf || !state.shell) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return;
      const text = selection.toString().replace(/\s+/g, " ").trim();
      if (text.length < 2) return;
      const range = selection.getRangeAt(0);
      const anchor = range.startContainer;
      const element = anchor && (anchor.nodeType === 1 ? anchor : anchor.parentElement);
      const wrap = element && element.closest ? element.closest(".reader-pdf-page") : null;
      if (!wrap || !state.pdfStackEl || !state.pdfStackEl.contains(wrap)) return;
      const box = wrap.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const rects = [];
      for (const rect of range.getClientRects()) {
        if (rect.width < 1 || rect.height < 1) continue;
        if (rect.bottom < box.top - 2 || rect.top > box.bottom + 2) continue;
        rects.push({
          x: clamp((rect.left - box.left) / box.width, 0, 1),
          y: clamp((rect.top - box.top) / box.height, 0, 1),
          w: clamp(rect.width / box.width, 0, 1),
          h: clamp(rect.height / box.height, 0, 1)
        });
      }
      if (!rects.length) return;
      let x = event.clientX;
      let y = event.clientY;
      if (!x && !y) {
        const last = range.getBoundingClientRect();
        x = last.right;
        y = last.bottom;
      }
      openNoteEditor({
        kind: "pdf",
        page: Number(wrap.dataset.page),
        rects,
        text: text.slice(0, 2000),
        label: pdfLabelForPage(Number(wrap.dataset.page)),
        x, y
      });
    }, 0);
  }

  function attachTocSearch(panel, rows) {
    const input = h("input", "reader-toc-search");
    input.type = "search";
    input.placeholder = "Filter contents";
    input.setAttribute("aria-label", "Filter contents");
    const note = h("div", "reader-toc-empty", "No matching headings");
    note.hidden = true;
    input.addEventListener("keydown", (event) => event.stopPropagation());
    input.addEventListener("input", () => {
      const needle = input.value.trim().toLocaleLowerCase();
      let shown = 0;
      for (const row of rows) {
        const hit = !needle || String(row.dataset.label || "").toLocaleLowerCase().includes(needle);
        row.hidden = !hit;
        if (hit) shown += 1;
      }
      note.hidden = shown > 0;
    });
    panel.insertBefore(input, panel.children[1] || null);
    panel.append(note);
  }

  function pdfItemRect(item, viewport) {
    const lib = state.pdfjs;
    if (!lib || !item || !item.transform) return null;
    const tx = lib.Util.transform(viewport.transform, item.transform);
    const height = Math.hypot(tx[2], tx[3]) || 10;
    const raw = (item.width || 0) * height;
    const estimate = Math.max(raw, (item.str || "").length * height * 0.5, height * 0.5);
    const x = clamp(tx[4] / viewport.width, 0, 1);
    const y = clamp((tx[5] - height) / viewport.height, 0, 1);
    return {
      x,
      y,
      w: clamp(estimate / viewport.width, 0.004, Math.max(0.004, 1 - x)),
      h: clamp((height * 1.1) / viewport.height, 0.004, 0.2)
    };
  }

  async function pdfPageText(number) {
    if (state.pdfTextCache.has(number)) return state.pdfTextCache.get(number);
    const page = await state.pdf.getPage(number);
    const content = await page.getTextContent();
    const base = page.getViewport({ scale: 1 });
    let combined = "";
    const spans = [];
    for (const item of content.items || []) {
      const str = item.str || "";
      if (!str) continue;
      if (combined && !/\s$/.test(combined) && !/^\s/.test(str)) combined += " ";
      const start = combined.length;
      combined += str;
      spans.push({ start, end: combined.length, item });
    }
    const data = { combined, spans, base };
    state.pdfTextCache.set(number, data);
    return data;
  }

  async function runPdfSearch(query) {
    const bar = state.findBar;
    if (!bar || !state.pdf) return;
    const token = ++state.pdfFind.token;
    state.pdfFind.query = query;
    state.pdfFind.matches = [];
    state.pdfFind.index = -1;
    clearPdfHighlights();
    bar.results.replaceChildren();
    bar.results.hidden = true;
    bar.count.textContent = "Searching…";
    const needle = query.toLocaleLowerCase();
    const total = state.pages;
    let done = false;
    for (let number = 1; number <= total && !done; number += 1) {
      if (token !== state.pdfFind.token || !state.pdf) return;
      let data;
      try {
        data = await pdfPageText(number);
      } catch (_) {
        continue;
      }
      const haystack = data.combined.toLocaleLowerCase();
      let from = 0;
      let position = haystack.indexOf(needle, from);
      while (position !== -1) {
        const rects = [];
        for (const span of data.spans) {
          if (span.end <= position) continue;
          if (span.start >= position + needle.length) break;
          const rect = pdfItemRect(span.item, data.base);
          if (rect) rects.push(rect);
        }
        const excerpt = data.combined
          .slice(Math.max(0, position - 34), Math.min(data.combined.length, position + needle.length + 34))
          .replace(/\s+/g, " ")
          .trim();
        state.pdfFind.matches.push({ page: number, rects, excerpt });
        if (state.pdfFind.matches.length >= FIND_LIMIT) {
          done = true;
          break;
        }
        from = position + Math.max(1, needle.length);
        position = haystack.indexOf(needle, from);
      }
      if (number % 4 === 0 || number === total || done) {
        const found = state.pdfFind.matches.length;
        bar.count.textContent = `${found} ${found === 1 ? "match" : "matches"} · page ${number}/${total}`;
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (token !== state.pdfFind.token) return;
      }
    }
    if (token !== state.pdfFind.token) return;
    const found = state.pdfFind.matches.length;
    if (!found) {
      bar.count.textContent = "No matches";
      return;
    }
    state.pdfFind.index = 0;
    renderPdfFindResults();
    jumpToPdfMatch(0);
  }

  function renderPdfFindResults() {
    const bar = state.findBar;
    if (!bar) return;
    const matches = state.pdfFind.matches;
    bar.results.replaceChildren();
    if (!matches.length) {
      bar.results.hidden = true;
      return;
    }
    bar.results.hidden = false;
    const limit = Math.min(matches.length, 200);
    for (let index = 0; index < limit; index += 1) {
      const match = matches[index];
      const row = h("button", "reader-find-item" + (index === state.pdfFind.index ? " active" : ""),
        `Page ${match.page} · ${match.excerpt || "match"}`);
      row.type = "button";
      row.title = match.excerpt || `Page ${match.page}`;
      row.addEventListener("click", () => jumpToPdfMatch(index));
      bar.results.append(row);
    }
    if (matches.length > limit) {
      bar.results.append(h("div", "reader-find-note", `Showing the first ${limit} of ${matches.length} matches`));
    }
  }

  function jumpToPdfMatch(index) {
    const matches = state.pdfFind.matches;
    if (!matches.length) return;
    const target = ((index % matches.length) + matches.length) % matches.length;
    state.pdfFind.index = target;
    const match = matches[target];
    const node = state.pdfPageNodes.get(match.page);
    if (!node) return;
    state.page = match.page;
    updatePdfToolbar();
    queuePdfRender(match.page);
    const rect = (match.rects && match.rects[0]) || { y: 0 };
    const top = pdfPageTop(node.wrap) + rect.y * (node.wrap.offsetHeight || 0) - 90;
    state.pdfScrollEl.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    paintPdfMatchesRendered();
    if (state.findBar) state.findBar.count.textContent = `${target + 1} / ${matches.length}`;
    renderPdfFindResults();
    setStatus(`Page ${match.page} of ${state.pages}`);
  }

  function paintPdfHighlights(number) {
    const node = state.pdfPageNodes.get(number);
    if (!node || !node.highlights) return;
    const width = node.wrap.clientWidth;
    const height = node.wrap.clientHeight;
    if (!width || !height) return;
    const fragment = document.createDocumentFragment();
    state.pdfFind.matches.forEach((match, index) => {
      if (match.page !== number) return;
      for (const rect of match.rects || []) {
        const mark = h("span", "pdf-hl-mark" + (index === state.pdfFind.index ? " current" : ""));
        mark.style.left = `${rect.x * width}px`;
        mark.style.top = `${rect.y * height}px`;
        mark.style.width = `${Math.max(2, rect.w * width)}px`;
        mark.style.height = `${Math.max(2, rect.h * height)}px`;
        fragment.append(mark);
      }
    });
    node.highlights.replaceChildren(fragment);
  }

  function paintPdfMatchesRendered() {
    for (const [number, node] of state.pdfPageNodes) {
      if (node.rendered) paintPdfHighlights(number);
    }
  }

  function clearPdfHighlights() {
    for (const node of state.pdfPageNodes.values()) {
      if (node.highlights) node.highlights.replaceChildren();
    }
  }

  /* ---------------------------------------------------------- EPUB / FB2 */
  function bookTheme() {
    return BOOK_THEMES[state.bookTheme] || BOOK_THEMES.light;
  }

  function bookCss(scale) {
    const theme = bookTheme();
    const size = Math.round(17 * state.font * (scale || 1));
    const line = state.bookLine;
    const family = BOOK_FONTS[state.bookFont] || BOOK_FONTS.serif;
    const justify = state.bookJustify ? "justify" : "inherit";
    const hyphens = state.bookHyphen ? "auto" : "manual";
    return `
      @namespace epub "http://www.idpf.org/2007/ops";
      html { background: ${theme.page} !important; color: ${theme.text} !important; }
      body {
        font-family: ${family} !important;
        line-height: ${line} !important;
        color: ${theme.text} !important;
        text-align: ${justify} !important;
        hyphens: ${hyphens} !important;
        -webkit-hyphens: ${hyphens} !important;
      }
      p, li, dd, dt, blockquote, td, th, figcaption {
        font-size: ${size}px !important;
        line-height: ${line} !important;
        text-align: ${justify} !important;
        hyphens: ${hyphens} !important;
        -webkit-hyphens: ${hyphens} !important;
      }
      h1 { font-size: ${Math.round(size * 1.75)}px !important; line-height: 1.25 !important; }
      h2 { font-size: ${Math.round(size * 1.45)}px !important; line-height: 1.3 !important; }
      h3, h4, h5, h6 { font-size: ${Math.round(size * 1.15)}px !important; }
      a { color: ${theme.link} !important; }
      blockquote { color: ${theme.muted} !important; border-color: ${theme.quote} !important; }
      pre { white-space: pre-wrap !important; background: ${theme.pre} !important; color: ${theme.text} !important; }
      img, svg, video { max-width: 100% !important; height: auto !important; }
    `;
  }

  function footnoteCss() {
    return `${bookCss(0.86)}
      html, body { margin: 0 !important; }
      body { padding: 0 2px 12px !important; }
      a { text-decoration: underline !important; }
    `;
  }

  function applyBookStyles() {
    const view = state.bookView;
    if (!view) return;
    const theme = bookTheme();
    try { view.style.background = theme.page; } catch (_) {}
    if (!view.renderer || typeof view.renderer.setStyles !== "function") return;
    try {
      view.renderer.setAttribute("margin", `${[24, 48, 84][clamp(state.bookMargin, 0, 2)]}px`);
    } catch (_) {}
    try { view.renderer.setStyles(bookCss()); } catch (_) {}
    try {
      if (typeof view.renderer.render === "function") view.renderer.render();
    } catch (_) {}
  }

  function bookMime(item) {
    if (state.format === "epub") return "application/epub+zip";
    if (state.format === "fb2") return "application/x-fictionbook+xml";
    return item.mime || "application/octet-stream";
  }

  function flattenToc(entries, depth, out) {
    for (const entry of entries || []) {
      if (entry && entry.href) {
        out.push({ label: entry.label || "Untitled", href: entry.href, depth, id: entry.id });
      }
      if (entry && entry.subitems && entry.subitems.length) flattenToc(entry.subitems, depth + 1, out);
    }
    return out;
  }

  function bookToolbar(item, tocItems) {
    const left = state.buttons.left;
    const right = state.buttons.right;
    left.replaceChildren();
    right.replaceChildren();
    const contents = button("Contents", "Table of contents", () => toggleToc());
    contents.disabled = !tocItems.length;
    const back = button("↶", "Back to the previous jump (Alt+←)", () => historyStep("book", -1), { aria: "Back" });
    const forward = button("↷", "Forward to the next jump (Alt+→)", () => historyStep("book", 1), { aria: "Forward" });
    const prev = button("‹", "Previous page (←)", () => bookStep(-1), { aria: "Previous page" });
    const next = button("›", "Next page (→)", () => bookStep(1), { aria: "Next page" });
    left.append(contents, back, forward, prev, next);
    const find = button("Find", "Find in book (Ctrl+F)", () => toggleFind("book"));
    const flow = button("Scroll", "Switch between scrolling and page turning", toggleBookFlow);
    flow.classList.toggle("active", state.bookFlow === "scrolled");
    const theme = button(bookThemeLabel(), "Change reading theme", cycleBookTheme);
    const line = button("Line", `Line spacing (${state.bookLine.toFixed(2)})`, cycleBookLine);
    const out = button("A−", "Smaller text", () => setFont(state.font - 0.1), { aria: "Smaller text" });
    const into = button("A+", "Larger text", () => setFont(state.font + 0.1), { aria: "Larger text" });
    const typeset = button("Type", "Font, margins and alignment", () => toggleTypeset());
    const bookmark = button("☆", "Bookmark this page (Ctrl+B)", () => toggleBookmark());
    const marks = button("Marks", "Bookmarks and notes (M)", () => toggleMarksPanel());
    const listen = button(ttsSupported() ? "Listen" : "No voice", "Read aloud from here (L)", toggleTts);
    if (!ttsSupported()) listen.disabled = true;
    const info = button("Info", "Book details (I)", () => toggleBookInfo());
    const help = button("?", "Reader shortcuts (?)", () => toggleHelp(), { aria: "Reader shortcuts" });
    right.append(find, flow, theme, line, out, into, typeset, bookmark, marks, listen, info, help);
    Object.assign(state.buttons, {
      left, right, prev, next, contents, find, flow, theme, line, typeset,
      bookmark, marks, listen, info, historyBack: back, historyForward: forward, help
    });
    updateMarkButtons();
    updateTtsButtons();
    updateHistoryButtons();
  }

  function bookThemeLabel() {
    return state.bookTheme.charAt(0).toUpperCase() + state.bookTheme.slice(1);
  }

  function toggleBookFlow() {
    state.bookFlow = state.bookFlow === "scrolled" ? "paginated" : "scrolled";
    savePref(BOOK_FLOW_KEY, state.bookFlow);
    const view = state.bookView;
    if (view && view.renderer && typeof view.renderer.setAttribute === "function") {
      view.renderer.setAttribute("flow", state.bookFlow === "scrolled" ? "scrolled" : "paginated");
    }
    bookToolbar(state.item, state.bookTocItems);
  }

  function cycleBookTheme() {
    const order = ["light", "sepia", "dark"];
    const next = order[(order.indexOf(state.bookTheme) + 1) % order.length];
    state.bookTheme = next;
    savePref(BOOK_THEME_KEY, next);
    const view = state.bookView;
    if (view) view.style.background = bookTheme().page;
    applyBookStyles();
    bookToolbar(state.item, state.bookTocItems);
  }

  function cycleBookLine() {
    const order = [1.4, 1.62, 1.85, 2.1];
    let next = order[0];
    for (const value of order) {
      if (value > state.bookLine + 0.02) {
        next = value;
        break;
      }
    }
    state.bookLine = next;
    savePref(BOOK_LINE_KEY, state.bookLine.toFixed(2));
    applyBookStyles();
    bookToolbar(state.item, state.bookTocItems);
  }

  function metaText(value) {
    if (value == null) return "";
    if (Array.isArray(value)) return value.map(metaText).filter(Boolean).join(", ");
    if (typeof value === "object") return String(value.name || value.value || "").trim();
    return String(value).trim();
  }

  function metaDescription(html) {
    if (!html) return "";
    try {
      const doc = new DOMParser().parseFromString(String(html), "text/html");
      doc.querySelectorAll("script, style").forEach((node) => node.remove());
      return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
    } catch (_) {
      return String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
  }

  function sizeText(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let index = 0;
    let amount = value;
    while (amount >= 1024 && index < units.length - 1) {
      amount /= 1024;
      index += 1;
    }
    return `${amount >= 10 || index === 0 ? Math.round(amount) : amount.toFixed(1)} ${units[index]}`;
  }

  function closeBookInfo() {
    state.bookInfoOpen = false;
    if (state.bookInfoPanel) state.bookInfoPanel.remove();
    state.bookInfoPanel = null;
  }

  function toggleBookInfo() {
    if (state.bookInfoOpen) {
      closeBookInfo();
      return;
    }
    closeToc();
    closePdfThumbs();
    closeMarksPanel();
    closeTypeset();
    closeHelp();
    closeFootnote();
    closeBookImage();
    const view = state.bookView;
    const book = view && view.book;
    const meta = (book && book.metadata) || {};
    const pages = book && Array.isArray(book.pageList) ? book.pageList.length : 0;
    const where = `${Math.round(state.fraction * 100)}%`
      + (state.bookLabel ? ` · ${state.bookLabel}` : "")
      + (state.bookPageLabel ? ` · p. ${state.bookPageLabel}` : "");
    const file = state.item
      ? `${state.item.name || ""}${state.item.size ? ` · ${sizeText(state.item.size)}` : ""}`
      : "";
    const rows = [
      ["Author", metaText(meta.author)],
      ["Publisher", metaText(meta.publisher)],
      ["Published", metaText(meta.published)],
      ["Language", metaText(meta.language)],
      ["Pages", pages ? String(pages) : ""],
      ["Sections", book && book.sections ? String(book.sections.length) : ""],
      ["Position", where],
      ["File", file]
    ].filter((row) => row[1]);
    const panel = h("div", "reader-info");
    const head = h("div", "reader-info-head");
    head.append(
      h("span", "reader-info-heading", "Book details"),
      button("×", "Close details", closeBookInfo, { className: "reader-info-close", aria: "Close details" })
    );
    const body = h("div", "reader-info-body");
    body.append(h("div", "reader-info-title", metaText(meta.title) || (state.item && state.item.name) || "Book"));
    const author = metaText(meta.author);
    if (author) body.append(h("div", "reader-info-author", author));
    const grid = h("dl", "reader-info-grid");
    for (const [label, value] of rows) {
      grid.append(h("dt", "reader-info-label", label), h("dd", "reader-info-value", value));
    }
    body.append(grid);
    const description = metaDescription(meta.description);
    if (description) body.append(h("div", "reader-info-desc", description));
    panel.append(head, body);
    state.shell.append(panel);
    state.bookInfoPanel = panel;
    state.bookInfoOpen = true;
  }

  function footnoteHandler() {
    if (!footnotePromise) {
      footnotePromise = import("/static/vendor/foliate/footnotes.js").then((mod) => {
        const handler = new mod.FootnoteHandler();
        handler.addEventListener("before-render", (event) => {
          const view = event.detail && event.detail.view;
          if (!view || !state.shell) return;
          closeFootnote();
          const panel = h("div", "reader-footnote reader-footnote-pending");
          const head = h("div", "reader-footnote-head");
          head.append(h("span", "reader-footnote-title", "Note"));
          const body = h("div", "reader-footnote-body");
          body.append(view);
          panel.append(head, body);
          state.shell.append(panel);
          state.footnotePanel = panel;
          state.footnoteView = view;
        });
        handler.addEventListener("render", (event) => showFootnote(event.detail || {}));
        return handler;
      }).catch((error) => {
        footnotePromise = null;
        throw error;
      });
    }
    return footnotePromise;
  }

  function closeFootnote() {
    if (state.footnoteView) {
      try { state.footnoteView.close(); } catch (_) {}
      state.footnoteView = null;
    }
    if (state.footnotePanel) state.footnotePanel.remove();
    state.footnotePanel = null;
  }

  function showFootnote(detail) {
    if (!detail || !detail.view || !state.shell) return;
    if (state.footnoteView !== detail.view) closeFootnote();
    closeBookInfo();
    closeBookImage();
    let panel = state.footnotePanel;
    let head;
    let body;
    if (panel) {
      panel.classList.remove("reader-footnote-pending");
      head = panel.querySelector(".reader-footnote-head");
      head.replaceChildren();
      body = panel.querySelector(".reader-footnote-body");
      if (!body.contains(detail.view)) body.replaceChildren(detail.view);
    } else {
      panel = h("div", "reader-footnote");
      head = h("div", "reader-footnote-head");
      body = h("div", "reader-footnote-body");
      body.append(detail.view);
      panel.append(head, body);
      state.shell.append(panel);
      state.footnotePanel = panel;
      state.footnoteView = detail.view;
    }
    const kind = detail.type === "endnote" || detail.type === "biblioentry" ? "Endnote" : "Note";
    head.append(h("span", "reader-footnote-title", kind));
    const actions = h("div", "reader-footnote-actions");
    if (detail.href) {
      actions.append(button("Go to note", "Jump to this note in the book", () => {
        const href = detail.href;
        closeFootnote();
        if (state.bookView && href) state.bookView.goTo(href).catch(() => {});
      }, { className: "reader-footnote-go" }));
    }
    actions.append(button("×", "Close note", closeFootnote, { className: "reader-footnote-close", aria: "Close note" }));
    head.append(actions);
    detail.view.addEventListener("link", (event) => {
      event.preventDefault();
      const href = event.detail && event.detail.href;
      closeFootnote();
      if (state.bookView && href) state.bookView.goTo(href).catch(() => {});
    });
    const style = () => {
      try { detail.view.renderer.setAttribute("margin", "8px"); } catch (_) {}
      try { detail.view.renderer.setStyles(footnoteCss()); } catch (_) {}
      try { detail.view.renderer.render(); } catch (_) {}
    };
    requestAnimationFrame(() => {
      style();
      requestAnimationFrame(style);
    });
  }

  async function openExternalLink(url) {
    const value = String(url || "").trim();
    if (!/^https?:\/\//i.test(value)) {
      flashStatus("This link can’t be opened here");
      return;
    }
    flashStatus("Opening link in your browser…");
    try {
      const response = await fetch("/api/reader/open-url", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-TFE": "1" },
        body: JSON.stringify({ url: value })
      });
      if (!response.ok) {
        let detail = "";
        try { detail = (await response.json()).detail || ""; } catch (_) {}
        flashStatus(detail || "Could not open the link");
      }
    } catch (_) {
      flashStatus("Could not open the link");
    }
  }

  function closeBookImage() {
    if (state.imageView) state.imageView.remove();
    state.imageView = null;
  }

  function showBookImage(src, alt) {
    if (!src || !state.shell) return;
    closeBookImage();
    closeBookInfo();
    closeFootnote();
    const root = h("div", "reader-image");
    root.addEventListener("click", (event) => {
      if (event.target === root) closeBookImage();
    });
    const img = h("img", "reader-image-img");
    img.src = src;
    img.alt = alt || "Book image";
    const close = button("×", "Close image", closeBookImage, { className: "reader-image-close", aria: "Close image" });
    root.append(img, close);
    state.shell.append(root);
    state.imageView = root;
  }

  function toggleToc() {
    const panel = state.tocPanel || (state.shell && state.shell.querySelector(".reader-toc"));
    if (!panel) return;
    closeBookInfo();
    closeFootnote();
    state.tocOpen = !state.tocOpen;
    panel.hidden = !state.tocOpen;
    if (state.buttons.contents) state.buttons.contents.classList.toggle("active", state.tocOpen);
  }

  function closeToc() {
    state.tocOpen = false;
    if (state.tocPanel) state.tocPanel.hidden = true;
    if (state.buttons.contents) state.buttons.contents.classList.remove("active");
  }

  function installToc(view) {
    if (state.tocPanel) state.tocPanel.remove();
    const items = flattenToc(view.book && view.book.toc, 0, []);
    state.bookTocItems = items;
    bookToolbar(state.item, items);
    state.bookTocRows = [];
    if (!items.length) return;
    const panel = h("div", "reader-toc");
    panel.hidden = true;
    panel.append(h("div", "reader-toc-head", "Contents"));
    const list = h("div", "reader-toc-list");
    for (const entry of items) {
      const row = h("button", "reader-toc-item", entry.label);
      row.type = "button";
      row.dataset.id = entry.id == null ? "" : String(entry.id);
      row.dataset.label = entry.label;
      row.style.paddingLeft = `${12 + entry.depth * 14}px`;
      row.title = entry.label;
      row.addEventListener("click", () => {
        if (!state.bookView) return;
        pushHistory("book", { cfi: state.bookCfi, fraction: state.fraction });
        state.bookView.goTo(entry.href).catch(() => {});
        closeToc();
      });
      list.append(row);
      state.bookTocRows.push(row);
    }
    panel.append(list);
    attachTocSearch(panel, state.bookTocRows);
    state.shell.append(panel);
    state.tocPanel = panel;
  }

  function markBookTocActive(tocItem) {
    if (!state.bookTocRows.length) return;
    const id = tocItem && tocItem.id != null ? String(tocItem.id) : "";
    for (const row of state.bookTocRows) row.classList.toggle("active", row.dataset.id === id);
  }

  async function loadBook(item, token) {
    state.body.classList.add("book");
    setProgress(0, false);
    showStatePanel("Opening book…", "Unpacking the book and laying out its pages.");
    await import("/static/vendor/foliate/view.js");
    if (token !== state.token) return;
    try { state.footnoteHandler = await footnoteHandler(); } catch (_) { state.footnoteHandler = null; }
    if (token !== state.token) return;
    const response = await fetchFull(item);
    const blob = await response.blob();
    if (token !== state.token) return;
    const file = new File([blob], item.name || `book.${state.format}`, { type: bookMime(item) });
    const view = document.createElement("foliate-view");
    view.className = "reader-book";
    view.style.background = bookTheme().page;
    state.body.replaceChildren(view);
    ensureFindBar();
    state.body.append(state.findBar.bar);
    state.bookView = view;
    state.bookTocItems = [];
    state.bookTocRows = [];
    state.tocPanel = null;
    state.tocOpen = false;
    state.bookCfi = "";
    state.bookLabel = "";
    state.bookPageLabel = "";
    loadMarks(item);
    resetHistory("book");
    bookToolbar(item, []);
    view.addEventListener("draw-annotation", (event) => {
      const detail = event.detail || {};
      const value = detail.value || (detail.annotation && detail.annotation.value);
      const note = state.marks.notes.find((item) => item.kind === "epub" && item.cfi === value);
      if (!note) return;
      try { detail.draw(highlightGroup, { color: note.color || NOTE_COLORS[0] }); } catch (_) {}
    });
    view.addEventListener("show-annotation", (event) => {
      const detail = event.detail || {};
      const note = state.marks.notes.find((item) => item.kind === "epub" && item.cfi === detail.value);
      if (!note) return;
      openNoteEditor({ ...note });
    });
    view.addEventListener("link", (event) => {
      if (token !== state.token || !state.bookView || !state.footnoteHandler) return;
      Promise.resolve(state.footnoteHandler.handle(view.book, event)).catch(() => {});
    });
    view.addEventListener("external-link", (event) => {
      if (token !== state.token) return;
      event.preventDefault();
      openExternalLink(event.detail && event.detail.href_);
    });
    view.addEventListener("create-overlay", () => {
      if (token !== state.token || !state.bookView) return;
      for (const note of state.marks.notes) {
        if (note.kind !== "epub" || !note.cfi) continue;
        try {
          const result = view.addAnnotation({ value: note.cfi });
          if (result && typeof result.catch === "function") result.catch(() => {});
        } catch (_) {}
      }
    });
    view.addEventListener("relocate", (event) => {
      if (token !== state.token || !state.bookView) return;
      const detail = event.detail || {};
      state.fraction = Number(detail.fraction) || 0;
      if (detail.cfi) state.bookCfi = detail.cfi;
      state.bookLabel = detail.tocItem && detail.tocItem.label ? detail.tocItem.label : "";
      state.bookPageLabel = detail.pageItem && detail.pageItem.label != null ? String(detail.pageItem.label) : "";
      const chapter = state.bookLabel ? ` · ${state.bookLabel}` : "";
      const page = state.bookPageLabel ? ` · p. ${state.bookPageLabel}` : "";
      setStatus(`${Math.round(state.fraction * 100)}%${chapter}${page}`);
      setProgress(state.fraction, true);
      markBookTocActive(detail.tocItem);
      updateMarkButtons();
      rememberThrottled(item, { fraction: state.fraction, cfi: state.bookCfi });
      if (!state.bookHistoryRestore) {
        clearTimeout(historyTimer);
        historyTimer = setTimeout(() => {
          historyTimer = 0;
          if (state.bookView && !state.bookHistoryRestore) {
            pushHistory("book", { cfi: state.bookCfi, fraction: state.fraction });
          }
        }, 400);
      }
      forwardBookKeys(state.bookView, token);
    });
    try {
      await view.open(file);
    } catch (error) {
      try { view.close(); } catch (_) {}
      state.bookView = null;
      throw new Error(bookErrorMessage(error));
    }
    if (token !== state.token) return;
    if (view.renderer && typeof view.renderer.setAttribute === "function") {
      view.renderer.setAttribute("flow", state.bookFlow === "scrolled" ? "scrolled" : "paginated");
    }
    installToc(view);
    applyBookStyles();
    if (state.body) state.body.addEventListener("click", onBookBodyClick);
    for (const note of state.marks.notes) {
      if (note.kind !== "epub" || !note.cfi) continue;
      try {
        const result = view.addAnnotation({ value: note.cfi });
        if (result && typeof result.catch === "function") result.catch(() => {});
      } catch (_) {}
    }
    /* The paginator lays out before the shell has its final size on first
       open, so force a relayout and an explicit goTo afterwards. */
    const saved = recall(item);
    const fraction = saved && Number.isFinite(Number(saved.fraction)) ? clamp(Number(saved.fraction), 0, 1) : 0;
    const cfi = saved && typeof saved.cfi === "string" ? saved.cfi : "";
    if (cfi) {
      try { await view.goTo(cfi); } catch (_) { try { await view.goTo({ fraction }); } catch (_) {} }
    } else {
      try { await view.goTo({ fraction }); } catch (_) {}
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (token !== state.token) return;
    try {
      if (view.renderer && typeof view.renderer.expand === "function") view.renderer.expand();
    } catch (_) {}
    forwardBookKeys(view, token);
    if (!state.bookCfi) state.fraction = fraction;
    refreshStatus();
    setProgress(state.fraction, true);
  }

  function bookErrorMessage(error) {
    const message = String((error && error.message) || "");
    if (/encrypt|drm|password|decrypt/i.test(message)) {
      return "This book is protected by DRM or a password, which this reader cannot remove. Download it and open it in an app that supports it.";
    }
    if (/not supported|File type/i.test(message)) {
      return "This file is not a standard EPUB. It may have been renamed or damaged.";
    }
    return message ? `The book could not be opened: ${message}` : "The book could not be opened.";
  }

  function bookStep(direction) {
    const view = state.bookView;
    if (!view) return;
    if (!state.bookHistoryRestore && state.bookCfi) {
      pushHistory("book", { cfi: state.bookCfi, fraction: state.fraction });
    }
    try {
      const result = direction > 0 ? view.next() : view.prev();
      if (result && typeof result.catch === "function") result.catch(() => {});
    } catch (_) {}
  }

  /* The stage keeps a 12px gutter around the reader, so clicks there need to
     reach the book instead of the viewer's backdrop. */
  function edgeClick(event) {
    if (!state.bookView || state.bookFlow !== "paginated" || !state.body) return false;
    const rect = state.body.getBoundingClientRect();
    if (!rect.width) return false;
    if (event.clientX < rect.left) { bookStep(-1); return true; }
    if (event.clientX > rect.right) { bookStep(1); return true; }
    return false;
  }

  /* Part of the page spread sits outside the book iframe, so edge clicks on
     the reader background need their own handler. */
  function onBookBodyClick(event) {
    if (!state.bookView || state.bookFlow !== "paginated") return;
    const target = event.target;
    if (target && target.closest && target.closest("button, a, input, select, textarea, .reader-toc, .reader-marks, .reader-info, .reader-footnote, .reader-find, .reader-typeset")) return;
    if (target && target.tagName === "IMG") return;
    const body = state.body;
    if (!body) return;
    const rect = body.getBoundingClientRect();
    if (!rect.width) return;
    const x = event.clientX - rect.left;
    if (x < rect.width * 0.08) bookStep(-1);
    else if (x > rect.width * 0.92) bookStep(1);
  }

  function bookScrollBy(delta) {
    const view = state.bookView;
    if (!view) return false;
    const renderer = view.renderer;
    if (renderer && typeof renderer.scrollBy === "function") {
      renderer.scrollBy(0, delta);
      return true;
    }
    bookStep(delta > 0 ? 1 : -1);
    return true;
  }

  async function runBookSearch(query) {
    const view = state.bookView;
    const bar = state.findBar;
    if (!view || !bar) return;
    const token = ++state.bookFind.token;
    state.bookFind.query = query;
    state.bookFind.results = [];
    state.bookFind.index = -1;
    bar.results.replaceChildren();
    bar.results.hidden = true;
    bar.count.textContent = "Searching…";
    try {
      for await (const result of view.search({ query })) {
        if (token !== state.bookFind.token || !state.bookView) return;
        if (result === "done") break;
        if (result && result.subitems) {
          for (const sub of result.subitems) {
            if (!sub || !sub.cfi) continue;
            state.bookFind.results.push({
              cfi: sub.cfi,
              excerpt: bookExcerpt(sub.excerpt),
              label: result.label || ""
            });
          }
        } else if (result && typeof result.progress === "number") {
          bar.count.textContent = `Searching… ${Math.round(result.progress * 100)}%`;
          continue;
        }
        if (state.bookFind.results.length >= 400) break;
        if (state.bookFind.results.length && state.bookFind.results.length % 25 === 0) {
          renderBookFindResults();
        }
      }
    } catch (_) {
      if (token === state.bookFind.token) bar.count.textContent = "Search failed";
      return;
    }
    if (token !== state.bookFind.token) return;
    if (!state.bookFind.results.length) {
      bar.count.textContent = "No matches";
      return;
    }
    state.bookFind.index = 0;
    renderBookFindResults();
    jumpToBookMatch(0);
  }

  function bookExcerpt(value) {
    if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
    if (value && typeof value === "object") {
      const text = `${value.pre || ""}${value.match || ""}${value.post || ""}`;
      return text.replace(/\s+/g, " ").trim();
    }
    return "";
  }

  function renderBookFindResults() {
    const bar = state.findBar;
    if (!bar) return;
    const results = state.bookFind.results;
    bar.results.replaceChildren();
    if (!results.length) {
      bar.results.hidden = true;
      return;
    }
    bar.results.hidden = false;
    const limit = Math.min(results.length, 200);
    for (let index = 0; index < limit; index += 1) {
      const result = results[index];
      const label = result.label ? `${result.label} · ` : "";
      const row = h("button", "reader-find-item" + (index === state.bookFind.index ? " active" : ""),
        `${label}${result.excerpt || "match"}`);
      row.type = "button";
      row.title = result.excerpt || "match";
      row.addEventListener("click", () => jumpToBookMatch(index));
      bar.results.append(row);
    }
    if (results.length > limit) {
      bar.results.append(h("div", "reader-find-note", `Showing the first ${limit} of ${results.length} matches`));
    }
  }

  function jumpToBookMatch(index) {
    const view = state.bookView;
    const results = state.bookFind.results;
    if (!view || !results.length) return;
    const target = ((index % results.length) + results.length) % results.length;
    state.bookFind.index = target;
    if (!state.bookHistoryRestore && state.bookCfi) {
      pushHistory("book", { cfi: state.bookCfi, fraction: state.fraction });
    }
    view.goTo(results[target].cfi).catch(() => {});
    if (state.findBar) state.findBar.count.textContent = `${target + 1} / ${results.length}`;
    renderBookFindResults();
  }

  /* The book iframe swallows key events, so mirror them on the app window. */
  const forwardedDocs = new WeakSet();
  function forwardBookKeys(view, token) {
    if (!view || !view.renderer || typeof view.renderer.getContents !== "function") return;
    let contents;
    try { contents = view.renderer.getContents() || []; } catch (_) { return; }
    for (const entry of contents) {
      const doc = entry && entry.doc;
      if (!doc || forwardedDocs.has(doc)) continue;
      forwardedDocs.add(doc);
      doc.addEventListener("keydown", (event) => {
        if (token !== state.token) return;
        const forward = new KeyboardEvent("keydown", {
          key: event.key,
          code: event.code,
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          metaKey: event.metaKey,
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(forward);
        if (forward.defaultPrevented) event.preventDefault();
      });
      doc.addEventListener("mouseup", () => {
        if (token !== state.token || !state.bookView) return;
        setTimeout(() => {
          if (token !== state.token || !state.bookView) return;
          let selection;
          try { selection = doc.getSelection(); } catch (_) { return; }
          if (!selection || selection.isCollapsed || !selection.rangeCount) return;
          const text = selection.toString().replace(/\s+/g, " ").trim();
          if (text.length < 2) return;
          const range = selection.getRangeAt(0);
          let cfi = "";
          try { cfi = state.bookView.getCFI(entry.index, range); } catch (_) {}
          if (!cfi) return;
          let box;
          try { box = range.getBoundingClientRect(); } catch (_) { return; }
          const frame = doc.defaultView && doc.defaultView.frameElement;
          const origin = frame ? frame.getBoundingClientRect() : (state.shell || document.body).getBoundingClientRect();
          openNoteEditor({
            kind: "epub",
            cfi,
            doc,
            text: text.slice(0, 2000),
            label: state.bookLabel,
            x: origin.left + (box.right || box.left || 40),
            y: origin.top + (box.bottom || box.top || 40)
          });
        }, 0);
      });
      const wheelState = { total: 0, last: 0 };
      doc.addEventListener("wheel", (event) => {
        if (token !== state.token || state.bookFlow !== "paginated") return;
        event.preventDefault();
        const now = Date.now();
        wheelState.total += event.deltaY || event.deltaX || 0;
        const threshold = event.deltaMode === 1 ? 2 : 45;
        if (Math.abs(wheelState.total) >= threshold && now - wheelState.last > 240) {
          bookStep(wheelState.total > 0 ? 1 : -1);
          wheelState.total = 0;
          wheelState.last = now;
        }
      }, { passive: false });
      doc.addEventListener("click", (event) => {
        if (token !== state.token || !state.bookView) return;
        const target = event.target;
        if (target && target.closest && target.closest("a")) return;
        const img = target && target.closest ? target.closest("img") : null;
        if (img) {
          if ((img.naturalWidth || 0) >= 160 && (img.naturalHeight || 0) >= 160) {
            showBookImage(img.currentSrc || img.src, img.alt || "");
          }
          return;
        }
        if (state.bookFlow !== "paginated") return;
        let selection;
        try { selection = doc.getSelection(); } catch (_) { return; }
        if (selection && !selection.isCollapsed) return;
        const width = doc.documentElement.clientWidth || (doc.body && doc.body.clientWidth) || 0;
        if (!width) return;
        const x = event.clientX;
        if (x < width * 0.09) bookStep(-1);
        else if (x > width * 0.91) bookStep(1);
      });
    }
  }

  /* ------------------------------------------------------- find in reader */
  function ensureFindBar() {
    if (state.findBar) return state.findBar;
    const bar = h("div", "reader-find");
    bar.hidden = true;
    const row = h("div", "reader-find-row");
    const input = h("input", "reader-find-input");
    input.type = "search";
    input.placeholder = "Find in document";
    input.setAttribute("aria-label", "Find in document");
    const count = h("span", "reader-find-count", "");
    const prev = button("↑", "Previous match", () => stepFind(-1), { className: "reader-find-btn", aria: "Previous match" });
    const next = button("↓", "Next match", () => stepFind(1), { className: "reader-find-btn", aria: "Next match" });
    const close = button("×", "Close find", () => closeFind(), { className: "reader-find-btn", aria: "Close find" });
    row.append(input, count, prev, next, close);
    const results = h("div", "reader-find-results");
    results.hidden = true;
    bar.append(row, results);
    input.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Enter") {
        event.preventDefault();
        const query = input.value.trim();
        if (query) runFind(query);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeFind();
      }
    });
    state.shell.append(bar);
    state.findBar = { bar, input, count, results };
    return state.findBar;
  }

  function toggleFind(mode) {
    if (state.findOpen && state.findMode === mode) closeFind();
    else openFind(mode);
  }

  function openFind(mode) {
    const bar = ensureFindBar();
    state.findOpen = true;
    state.findMode = mode;
    bar.bar.hidden = false;
    if (mode === "pdf") {
      bar.input.placeholder = "Find in PDF";
      bar.input.value = state.pdfFind.query || "";
      if (state.pdfFind.matches.length) {
        bar.count.textContent = `${Math.max(1, state.pdfFind.index + 1)} / ${state.pdfFind.matches.length}`;
      } else {
        bar.count.textContent = "";
      }
      renderPdfFindResults();
    } else {
      bar.input.placeholder = "Find in book";
      bar.input.value = state.bookFind.query || "";
      if (state.bookFind.results.length) {
        bar.count.textContent = `${Math.max(1, state.bookFind.index + 1)} / ${state.bookFind.results.length}`;
      } else {
        bar.count.textContent = "";
      }
      renderBookFindResults();
    }
    bar.input.focus();
    bar.input.select();
  }

  function closeFind() {
    state.findOpen = false;
    state.findMode = "";
    if (state.findBar) {
      state.findBar.bar.hidden = true;
      state.findBar.results.replaceChildren();
      state.findBar.results.hidden = true;
      state.findBar.count.textContent = "";
    }
    state.pdfFind.token += 1;
    state.pdfFind.matches = [];
    state.pdfFind.index = -1;
    clearPdfHighlights();
    state.bookFind.token += 1;
    state.bookFind.results = [];
    state.bookFind.index = -1;
    if (state.bookView) {
      try { state.bookView.clearSearch(); } catch (_) {}
    }
  }

  function runFind(query) {
    if (state.findMode === "pdf") runPdfSearch(query);
    else if (state.findMode === "book") runBookSearch(query);
  }

  function stepFind(direction) {
    if (state.findMode === "pdf") {
      if (state.pdfFind.matches.length) jumpToPdfMatch(state.pdfFind.index + direction);
    } else if (state.findMode === "book") {
      if (state.bookFind.results.length) jumpToBookMatch(state.bookFind.index + direction);
    }
  }

  function clearSelection() {
    try {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) selection.removeAllRanges();
    } catch (_) {}
  }

  /* ------------------------------------------------------ articles & text */
  function articleToolbar() {
    if (state.body) {
      state.body.classList.remove("frame");
      state.body.classList.add("article");
    }
    setProgress(0, false);
    const left = state.buttons.left;
    const right = state.buttons.right;
    left.replaceChildren();
    right.replaceChildren();
    const out = button("A−", "Smaller text", () => setFont(state.font - 0.1), { aria: "Smaller text" });
    const into = button("A+", "Larger text", () => setFont(state.font + 0.1), { aria: "Larger text" });
    right.append(out, into);
  }

  function paperFor(item) {
    const paper = h("div", "reader-paper");
    paper.style.fontSize = `${Math.round(17 * state.font)}px`;
    state.body.append(paper);
    return paper;
  }

  function sanitizeHtml(html) {
    if (!window.DOMPurify) return html;
    return window.DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["script", "style", "link", "meta", "base", "object", "embed", "iframe", "form"],
      FORBID_ATTR: ["srcset", "ping"]
    });
  }

  function renderArticle(paper, html) {
    const article = h("div", "reader-article");
    article.innerHTML = sanitizeHtml(html);
    paper.replaceChildren(article);
    for (const link of article.querySelectorAll("a[href]")) {
      link.setAttribute("rel", "noreferrer noopener");
    }
    return article;
  }

  async function loadDocx(item, token) {
    articleToolbar();
    showStatePanel("Reading Word document…");
    const response = await fetchFull(item);
    const buffer = await response.arrayBuffer();
    if (token !== state.token) return;
    if (!window.mammoth) throw new Error("The Word reader is missing from this build.");
    const result = await window.mammoth.convertToHtml({ arrayBuffer: buffer });
    if (token !== state.token) return;
    state.body.replaceChildren();
    const paper = paperFor(item);
    renderArticle(paper, result.value || "<p>(This document has no text.)</p>");
    clearSelection();
    setStatus("Word document");
  }

  async function loadMarkdown(item, token) {
    articleToolbar();
    showStatePanel("Loading…");
    const text = await fetchText(item, 8 * 1024 * 1024);
    if (token !== state.token) return;
    state.body.replaceChildren();
    const paper = paperFor(item);
    if (window.marked && window.marked.parse) renderArticle(paper, window.marked.parse(text));
    else renderArticle(paper, `<pre>${escapeHtml(text)}</pre>`);
    clearSelection();
    setStatus("Markdown");
  }

  async function loadText(item, token) {
    articleToolbar();
    showStatePanel("Loading…");
    const text = await fetchText(item, 8 * 1024 * 1024);
    if (token !== state.token) return;
    state.body.replaceChildren();
    const paper = paperFor(item);
    const pre = h("pre", "reader-text");
    pre.textContent = text || "(empty file)";
    paper.append(pre);
    clearSelection();
    setStatus("Text");
  }

  async function loadHtml(item, token) {
    articleToolbar();
    showStatePanel("Loading…");
    const text = await fetchText(item, 8 * 1024 * 1024);
    if (token !== state.token) return;
    state.htmlText = text;
    state.body.replaceChildren();
    renderHtmlFrame(text);
    setStatus("HTML");
  }

  async function loadXml(item, token) {
    articleToolbar();
    showStatePanel("Loading…");
    const text = await fetchText(item, 8 * 1024 * 1024);
    if (token !== state.token) return;
    state.htmlText = "";
    state.body.replaceChildren();
    if (/<\s*html[\s>]/i.test(text.slice(0, 4096))) {
      state.htmlText = text;
      renderHtmlFrame(text);
    } else {
      const paper = paperFor(item);
      const pre = h("pre", "reader-text");
      pre.textContent = text || "(empty file)";
      paper.append(pre);
      clearSelection();
    }
    setStatus("XML");
  }

  function renderHtmlFrame(text) {
    if (state.body) {
      state.body.classList.remove("article");
      state.body.classList.add("frame");
    }
    const safe = sanitizeHtml(text);
    const size = Math.round(17 * state.font);
    const css = `
      html { background: #fbfaf7; color: #20242a; color-scheme: light; }
      body {
        max-width: 720px;
        margin: 0 auto;
        padding: 34px 26px 60px;
        font-family: Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif;
        font-size: ${size}px;
        line-height: 1.62;
        overflow-wrap: anywhere;
      }
      h1 { font-size: ${Math.round(size * 1.7)}px; line-height: 1.25; }
      h2 { font-size: ${Math.round(size * 1.4)}px; }
      h3 { font-size: ${Math.round(size * 1.15)}px; }
      a { color: #0a66c2; }
      img, svg, video { max-width: 100%; height: auto; }
      pre { white-space: pre-wrap; background: #f1efe9; padding: 12px; border-radius: 6px; }
      table { border-collapse: collapse; max-width: 100%; }
      td, th { border: 1px solid #d7d3c8; padding: 4px 8px; }
    `;
    const blob = new Blob(
      [`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${safe}</body></html>`],
      { type: "text/html" }
    );
    const url = URL.createObjectURL(blob);
    state.blobUrls.push(url);
    const frame = document.createElement("iframe");
    frame.className = "reader-frame";
    frame.setAttribute("sandbox", "");
    frame.title = state.item ? state.item.name : "HTML document";
    frame.src = url;
    state.body.append(frame);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function setFont(value) {
    state.font = clamp(Math.round(value * 10) / 10, MIN_FONT, MAX_FONT);
    try { localStorage.setItem(FONT_KEY, String(state.font)); } catch (_) {}
    const paper = state.body && state.body.querySelector(".reader-paper");
    if (paper) paper.style.fontSize = `${Math.round(17 * state.font)}px`;
    const frame = state.body && state.body.querySelector(".reader-frame");
    if (frame && state.htmlText) {
      frame.remove();
      revokeBlobs();
      renderHtmlFrame(state.htmlText);
    }
    if (BOOK_FORMATS[state.format]) applyBookStyles();
  }

  /* ------------------------------------------------------------- lifecycle */
  async function open(host, item) {
    close();
    state.open = true;
    state.token += 1;
    const token = state.token;
    state.item = item;
    state.format = formatOf(item);
    state.host = host;
    buildShell(host, state.format);
    const loaders = {
      pdf: loadPdf,
      doc: loadDocPdf,
      epub: loadBook,
      fb2: loadBook,
      docx: loadDocx,
      md: loadMarkdown,
      txt: loadText,
      html: loadHtml,
      xml: loadXml
    };
    try {
      const loader = loaders[state.format];
      if (!loader) throw new Error("This file type has no reader.");
      await ensureReaderStore();
      if (token !== state.token) return;
      await loader(item, token);
      if (token !== state.token) return;
    } catch (error) {
      if (token === state.token) showFailure(error);
    }
  }

  async function loadDocPdf(item, token) {
    showStatePanel("Downloading and converting with Word…", "Legacy .doc files are turned into a PDF once and cached on this PC.");
    const response = await fetch(`/api/doc/${item.id}/pdf`, { credentials: "same-origin" });
    if (token !== state.token) return;
    if (!response.ok) {
      let detail = "Word could not convert this document.";
      try {
        const data = await response.json();
        if (data && data.detail) detail = data.detail;
      } catch (_) {}
      throw new Error(detail);
    }
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (token !== state.token) return;
    state.body.replaceChildren();
    await loadPdf(item, token, { buffer });
  }

  function close() {
    if (!state.open && !state.shell) return;
    stopTts();
    closeNoteEditor();
    closeFootnote();
    closeBookInfo();
    closeBookImage();
    state.footnoteHandler = null;
    if (state.selectionHandler) {
      const { stack } = state.selectionHandler;
      try {
        stack.removeEventListener("mouseup", onPdfSelection);
        stack.removeEventListener("click", onPdfNoteClick);
      } catch (_) {}
      state.selectionHandler = null;
    }
    if (state.pdf && state.pdfScrollEl) {
      const anchor = pdfScrollAnchor();
      remember(state.item, { page: anchor.page, offset: anchor.offset, zoom: state.zoom });
    }
    rememberBookPosition();
    flushReaderSaves(false);
    clearTimeout(historyTimer);
    historyTimer = 0;
    state.token += 1;
    state.pdfRenderSeq += 1;
    if (state.pdfObserver) {
      try { state.pdfObserver.disconnect(); } catch (_) {}
      state.pdfObserver = null;
    }
    state.pdfRenderQueue.length = 0;
    state.pdfRendering = 0;
    if (state.pdfScrollRaf) {
      cancelAnimationFrame(state.pdfScrollRaf);
      state.pdfScrollRaf = 0;
    }
    for (const node of state.pdfPageNodes.values()) {
      if (node.task) {
        try { node.task.cancel(); } catch (_) {}
      }
    }
    if (state.pdf) {
      try { state.pdf.destroy(); } catch (_) {}
      state.pdf = null;
    }
    if (state.bookView) {
      try { state.bookView.clearSearch(); } catch (_) {}
      try { state.bookView.close(); } catch (_) {}
      state.bookView = null;
    }
    if (state.observer) {
      try { state.observer.disconnect(); } catch (_) {}
      state.observer = null;
    }
    clearTimeout(state.resizeTimer);
    revokeBlobs();
    if (state.shell) state.shell.remove();
    state.open = false;
    state.item = null;
    state.format = "";
    state.host = null;
    state.shell = null;
    state.body = null;
    state.statusEl = null;
    state.statusText = null;
    state.progressWrap = null;
    state.progressSlider = null;
    state.progressPct = null;
    state.buttons = {};
    state.pages = 0;
    state.page = 1;
    state.pageOffset = 0;
    state.zoom = 1;
    state.pdfScrollEl = null;
    state.pdfStackEl = null;
    state.pdfPageNodes = new Map();
    state.pdfTextCache = new Map();
    state.pdfWidth = 0;
    state.pdfOutline = [];
    state.pdfTocRows = [];
    state.pdfFind = { query: "", matches: [], index: -1, token: 0 };
    state.bookTocItems = [];
    state.bookTocRows = [];
    state.bookFind = { query: "", results: [], index: -1, token: 0 };
    state.fraction = 0;
    state.tocOpen = false;
    state.tocPanel = null;
    state.findOpen = false;
    state.findMode = "";
    state.findBar = null;
    state.marks = { bookmarks: [], notes: [] };
    state.marksOpen = false;
    state.marksPanel = null;
    state.noteEditor = null;
    state.pdfHistory = { stack: [], index: -1 };
    state.bookHistory = { stack: [], index: -1 };
    state.pdfThumbCache = new Map();
    if (state.pdfThumbObserver) {
      state.pdfThumbObserver.disconnect();
      state.pdfThumbObserver = null;
    }
    state.pdfThumbItems = null;
    state.pdfThumbsPanel = null;
    state.pdfThumbsOpen = false;
    state.pdfThumbSeq += 1;
    state.typesetOpen = false;
    state.typesetPanel = null;
    state.typesetControls = null;
    state.helpOpen = false;
    state.helpPanel = null;
    state.tts = null;
    state.bookCfi = "";
    state.bookLabel = "";
    state.bookPageLabel = "";
    state.bookInfoOpen = false;
    state.bookInfoPanel = null;
    state.footnotePanel = null;
    state.footnoteView = null;
    state.imageView = null;
    state.htmlText = "";
  }

  function isOpen() {
    return state.open;
  }

  function escape() {
    if (!state.open) return false;
    if (state.imageView) { closeBookImage(); return true; }
    if (state.footnotePanel) { closeFootnote(); return true; }
    if (state.bookInfoOpen) { closeBookInfo(); return true; }
    if (state.helpOpen) { closeHelp(); return true; }
    if (state.noteEditor) { closeNoteEditor(); return true; }
    if (state.findOpen) { closeFind(); return true; }
    if (state.marksOpen) { closeMarksPanel(); return true; }
    if (state.typesetOpen) { closeTypeset(); return true; }
    if (state.pdfThumbsOpen) { closePdfThumbs(); return true; }
    if (state.tocOpen) { closeToc(); return true; }
    if (state.tts) { stopTts(); return true; }
    return false;
  }

  function keydown(event) {
    if (!state.open) return false;
    const target = event.target;
    if (target && typeof target.closest === "function"
      && (target.closest("input, textarea, select") || target.isContentEditable)) return false;
    const key = event.key;
    const lower = key.toLowerCase();
    if (event.altKey && (key === "ArrowLeft" || key === "ArrowRight")) {
      event.preventDefault();
      const direction = key === "ArrowLeft" ? -1 : 1;
      if (state.pdf) historyStep("pdf", direction);
      else if (state.bookView) historyStep("book", direction);
      return true;
    }
    if ((event.ctrlKey || event.metaKey) && lower === "b") {
      event.preventDefault();
      toggleBookmark();
      return true;
    }
    if (!event.ctrlKey && !event.altKey && !event.metaKey) {
      if (lower === "b") { event.preventDefault(); toggleBookmark(); return true; }
      if (lower === "m") { event.preventDefault(); toggleMarksPanel(); return true; }
      if (lower === "l") { event.preventDefault(); toggleTts(); return true; }
      if (lower === "i") { event.preventDefault(); toggleBookInfo(); return true; }
      if (key === "?") { event.preventDefault(); toggleHelp(); return true; }
    }
    if ((event.ctrlKey || event.metaKey) && lower === "f") {
      event.preventDefault();
      if (state.pdf) openFind("pdf");
      else if (state.bookView) openFind("book");
      return true;
    }
    if (key === "Escape" && state.findOpen) {
      event.preventDefault();
      closeFind();
      return true;
    }
    if (PDF_FORMATS[state.format] && state.pdf) {
      const scroller = state.pdfScrollEl;
      const step = () => Math.max(120, (scroller.clientHeight || 600) * 0.88);
      if (key === "ArrowDown") {
        event.preventDefault();
        scroller.scrollBy({ top: 80, behavior: "auto" });
        return true;
      }
      if (key === "ArrowUp") {
        event.preventDefault();
        scroller.scrollBy({ top: -80, behavior: "auto" });
        return true;
      }
      if (key === "PageDown" || (key === " " && !event.shiftKey)) {
        event.preventDefault();
        scroller.scrollBy({ top: step(), behavior: "auto" });
        return true;
      }
      if (key === "PageUp" || (key === " " && event.shiftKey)) {
        event.preventDefault();
        scroller.scrollBy({ top: -step(), behavior: "auto" });
        return true;
      }
      if (key === "ArrowRight" || lower === "n") {
        event.preventDefault();
        goPage(state.page + 1);
        return true;
      }
      if (key === "ArrowLeft" || lower === "p") {
        event.preventDefault();
        goPage(state.page - 1);
        return true;
      }
      if (key === "Home") {
        event.preventDefault();
        goPage(1);
        return true;
      }
      if (key === "End") {
        event.preventDefault();
        goPage(state.pages);
        return true;
      }
      if (key === "+" || key === "=") {
        event.preventDefault();
        zoomBy(1.25);
        return true;
      }
      if (key === "-") {
        event.preventDefault();
        zoomBy(1 / 1.25);
        return true;
      }
      if (key === "0") {
        event.preventDefault();
        state.zoom = 1;
        layoutPdf(true);
        return true;
      }
      return false;
    }
    if (BOOK_FORMATS[state.format] && state.bookView) {
      const step = () => Math.max(160, (state.bookView.clientHeight || 700) * 0.85);
      if (key === "ArrowDown") {
        event.preventDefault();
        if (state.bookFlow === "scrolled") bookScrollBy(80);
        else bookStep(1);
        return true;
      }
      if (key === "ArrowUp") {
        event.preventDefault();
        if (state.bookFlow === "scrolled") bookScrollBy(-80);
        else bookStep(-1);
        return true;
      }
      if (key === "PageDown" || (key === " " && !event.shiftKey)) {
        event.preventDefault();
        if (state.bookFlow === "scrolled") bookScrollBy(step());
        else bookStep(1);
        return true;
      }
      if (key === "PageUp" || (key === " " && event.shiftKey)) {
        event.preventDefault();
        if (state.bookFlow === "scrolled") bookScrollBy(-step());
        else bookStep(-1);
        return true;
      }
      if (key === "ArrowRight" || lower === "n") {
        event.preventDefault();
        bookStep(1);
        return true;
      }
      if (key === "ArrowLeft" || lower === "p") {
        event.preventDefault();
        bookStep(-1);
        return true;
      }
      if (!event.ctrlKey && !event.altKey && !event.metaKey && (lower === "j" || lower === "k")) {
        event.preventDefault();
        if (state.bookFlow === "scrolled") bookScrollBy(lower === "j" ? 80 : -80);
        else bookStep(lower === "j" ? 1 : -1);
        return true;
      }
      if (key === "Home") {
        event.preventDefault();
        state.bookView.goTo(0).catch(() => {});
        return true;
      }
      if (key === "End") {
        event.preventDefault();
        state.bookView.goTo({ fraction: 1 }).catch(() => {});
        return true;
      }
    }
    if (key === "+" || key === "=") { event.preventDefault(); setFont(state.font + 0.1); return true; }
    if (key === "-") { event.preventDefault(); setFont(state.font - 0.1); return true; }
    return false;
  }

  window.TFEReader = {
    open,
    close,
    isOpen,
    keydown,
    escape,
    edgeClick,
    formatOf,
    renderThumbnail,
    label(format) { return FORMAT_LABELS[format] || "Document"; }
  };
})();
