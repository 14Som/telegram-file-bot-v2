/* In-app reader for PDF, EPUB/EPUB3, FB2, Word, HTML/XML, Markdown and text.
   PDF.js and foliate-js are loaded the first time a file needs them. */
(function () {
  "use strict";

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
  const MIN_FONT = 0.8;
  const MAX_FONT = 1.8;
  const PDF_ZOOM_MIN = 0.5;
  const PDF_ZOOM_MAX = 5;

  const state = {
    open: false,
    token: 0,
    item: null,
    format: "",
    host: null,
    shell: null,
    body: null,
    statusEl: null,
    buttons: {},
    pdf: null,
    pages: 0,
    page: 1,
    zoom: 1,
    renderSeq: 0,
    bookView: null,
    fraction: 0,
    tocOpen: false,
    font: loadFont(),
    blobUrls: [],
    resizeTimer: null,
    observer: null,
    lastSave: 0,
    htmlText: "",
    pdfjs: null
  };

  let pdfjsPromise = null;

  function h(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
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

  function recall(item) {
    try {
      const raw = localStorage.getItem(storeKey(item));
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function remember(item, data) {
    if (!item) return;
    try {
      const previous = recall(item) || {};
      localStorage.setItem(storeKey(item), JSON.stringify({ ...previous, ...data, at: Date.now() }));
    } catch (_) {
      /* storage may be full; reading still works */
    }
  }

  function rememberThrottled(item, data) {
    const now = Date.now();
    if (now - state.lastSave < 1500) return;
    state.lastSave = now;
    remember(item, data);
  }

  function revokeBlobs() {
    for (const url of state.blobUrls) {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }
    state.blobUrls = [];
  }

  function setStatus(text) {
    if (state.statusEl) state.statusEl.textContent = text || "";
  }

  function button(label, title, onClick, opts) {
    const node = h("button", "reader-btn" + (opts && opts.className ? " " + opts.className : ""), label);
    node.type = "button";
    node.title = title;
    if (opts && opts.aria) node.setAttribute("aria-label", opts.aria);
    if (onClick) node.addEventListener("click", onClick);
    return node;
  }

  function buildShell(host, format) {
    const shell = h("div", "reader-shell");
    const tools = h("div", "reader-tools");
    const left = h("div", "reader-tool-group");
    const status = h("div", "reader-tool-status");
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
    state.buttons = { left, right };
    state.observer = new ResizeObserver(() => {
      if (!PDF_FORMATS[state.format] || !state.pdf) return;
      clearTimeout(state.resizeTimer);
      state.resizeTimer = setTimeout(() => renderPdfPage(state.page), 180);
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
      shell.append(h("div", "reader-fail-note", "The book may be damaged or use encryption this reader cannot open. Download it and try another reader."));
    }
    state.body.replaceChildren(shell);
    setStatus("");
  }

  async function fetchFull(item) {
    const response = await fetch(`/api/file/${item.id}`, { credentials: "same-origin" });
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

  /* ------------------------------------------------------------------ PDF */
  function pdfToolbar() {
    const left = state.buttons.left;
    const right = state.buttons.right;
    left.replaceChildren();
    right.replaceChildren();
    const prev = button("‹", "Previous page (←)", () => goPage(state.page - 1), { aria: "Previous page" });
    const next = button("›", "Next page (→)", () => goPage(state.page + 1), { aria: "Next page" });
    const input = h("input", "reader-page-input");
    input.type = "number";
    input.min = "1";
    input.inputMode = "numeric";
    input.setAttribute("aria-label", "Page number");
    input.addEventListener("change", () => goPage(Number(input.value) || 1));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        goPage(Number(input.value) || 1);
        input.blur();
      }
      event.stopPropagation();
    });
    const total = h("span", "reader-page-total", "of 0");
    left.append(prev, input, total, next);
    const out = button("−", "Zoom out", () => zoomBy(1 / 1.25), { aria: "Zoom out" });
    const label = h("span", "reader-zoom", "100%");
    const into = button("+", "Zoom in", () => zoomBy(1.25), { aria: "Zoom in" });
    const fit = button("Fit", "Fit the page to the window", () => {
      state.zoom = 1;
      renderPdfPage(state.page);
    });
    right.append(out, label, into, fit);
    state.buttons.prev = prev;
    state.buttons.next = next;
    state.buttons.pageInput = input;
    state.buttons.pageTotal = total;
    state.buttons.zoomLabel = label;
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
  }

  async function loadPdf(item, token, options) {
    const body = state.body;
    body.classList.add("pdf");
    const panel = showStatePanel(options && options.buffer ? "Preparing document…" : "Opening PDF…");
    const lib = await pdfjs();
    if (token !== state.token) return;
    const params = {
      cMapUrl: "/static/vendor/pdfjs/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "/static/vendor/pdfjs/standard_fonts/"
    };
    let doc;
    try {
      const source = options && options.buffer
        ? lib.getDocument({ data: options.buffer, ...params })
        : lib.getDocument({ url: `/api/file/${item.id}`, ...params });
      doc = await source.promise;
    } catch (error) {
      throw new Error(error && error.message ? `The PDF could not be opened: ${error.message}` : "The PDF could not be opened.");
    }
    if (token !== state.token) {
      try { doc.destroy(); } catch (_) {}
      return;
    }
    panel.remove();
    state.pdf = doc;
    state.pages = doc.numPages || 1;
    const saved = recall(item);
    state.page = clamp(Number(saved && saved.page) || 1, 1, state.pages);
    pdfToolbar();
    await renderPdfPage(state.page);
  }

  async function renderPdfPage(number, options) {
    const doc = state.pdf;
    if (!doc) return;
    const token = state.token;
    const target = clamp(Math.round(number), 1, state.pages);
    state.renderSeq += 1;
    const seq = state.renderSeq;
    const page = await doc.getPage(target);
    if (token !== state.token || !state.pdf) return;
    const base = page.getViewport({ scale: 1 });
    const area = state.body;
    const padding = 56;
    const width = Math.max(120, area.clientWidth - padding);
    const height = Math.max(160, area.clientHeight - padding);
    const fit = Math.min(width / base.width, height / base.height);
    const scale = Math.max(0.08, fit * state.zoom);
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: scale * dpr });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
    canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    if (token !== state.token || seq !== state.renderSeq || !state.pdf) return;
    state.page = target;
    let wrap = state.body.querySelector(".reader-pdf-page");
    if (!wrap) {
      wrap = h("div", "reader-pdf-page");
      state.body.replaceChildren(wrap);
    }
    wrap.replaceChildren(canvas);
    updatePdfToolbar();
    setStatus(`Page ${state.page} of ${state.pages}`);
    remember(state.item, { page: state.page });
  }

  function goPage(number) {
    if (!state.pdf) return;
    renderPdfPage(clamp(Number(number) || 1, 1, state.pages));
  }

  function zoomBy(factor) {
    if (!state.pdf) return;
    state.zoom = clamp(state.zoom * factor, PDF_ZOOM_MIN, PDF_ZOOM_MAX);
    renderPdfPage(state.page);
  }

  /* ---------------------------------------------------------- EPUB / FB2 */
  function bookCss() {
    const size = Math.round(17 * state.font);
    return `
      @namespace epub "http://www.idpf.org/2007/ops";
      html { background: #fbfaf7 !important; color: #20242a !important; }
      body {
        font-family: Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif !important;
        line-height: 1.62 !important;
        color: #20242a !important;
      }
      p, li, dd, dt, blockquote, td, th, figcaption {
        font-size: ${size}px !important;
        line-height: 1.62 !important;
      }
      h1 { font-size: ${Math.round(size * 1.75)}px !important; line-height: 1.25 !important; }
      h2 { font-size: ${Math.round(size * 1.45)}px !important; line-height: 1.3 !important; }
      h3, h4, h5, h6 { font-size: ${Math.round(size * 1.15)}px !important; }
      a { color: #0a66c2 !important; }
      img, svg, video { max-width: 100% !important; height: auto !important; }
      pre { white-space: pre-wrap !important; }
    `;
  }

  function applyBookStyles() {
    const view = state.bookView;
    if (!view || !view.renderer || typeof view.renderer.setStyles !== "function") return;
    try { view.renderer.setStyles(bookCss()); } catch (_) {}
  }

  function bookMime(item) {
    if (state.format === "epub") return "application/epub+zip";
    if (state.format === "fb2") return "application/x-fictionbook+xml";
    return item.mime || "application/octet-stream";
  }

  function flattenToc(entries, depth, out) {
    for (const entry of entries || []) {
      if (entry && entry.href) out.push({ label: entry.label || "Untitled", href: entry.href, depth });
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
    const prev = button("‹", "Previous page (←)", () => bookStep(-1), { aria: "Previous page" });
    const next = button("›", "Next page (→)", () => bookStep(1), { aria: "Next page" });
    left.append(contents, prev, next);
    const out = button("A−", "Smaller text", () => setFont(state.font - 0.1), { aria: "Smaller text" });
    const into = button("A+", "Larger text", () => setFont(state.font + 0.1), { aria: "Larger text" });
    right.append(out, into);
    state.buttons.prev = prev;
    state.buttons.next = next;
    state.buttons.contents = contents;
  }

  function toggleToc() {
    const panel = state.shell && state.shell.querySelector(".reader-toc");
    if (!panel) return;
    state.tocOpen = !state.tocOpen;
    panel.hidden = !state.tocOpen;
    if (state.buttons.contents) state.buttons.contents.classList.toggle("active", state.tocOpen);
  }

  function installToc(view) {
    const items = flattenToc(view.book && view.book.toc, 0, []);
    bookToolbar(state.item, items);
    if (!items.length) return;
    const panel = h("div", "reader-toc");
    panel.hidden = true;
    panel.append(h("div", "reader-toc-head", "Contents"));
    const list = h("div", "reader-toc-list");
    for (const entry of items) {
      const row = h("button", "reader-toc-item", entry.label);
      row.type = "button";
      row.style.paddingLeft = `${12 + entry.depth * 14}px`;
      row.title = entry.label;
      row.addEventListener("click", () => {
        if (!state.bookView) return;
        state.bookView.goTo(entry.href).catch(() => {});
        state.tocOpen = false;
        panel.hidden = true;
        if (state.buttons.contents) state.buttons.contents.classList.remove("active");
      });
      list.append(row);
    }
    panel.append(list);
    state.shell.append(panel);
  }

  async function loadBook(item, token) {
    state.body.classList.add("book");
    showStatePanel("Opening book…");
    await import("/static/vendor/foliate/view.js");
    if (token !== state.token) return;
    const response = await fetchFull(item);
    const blob = await response.blob();
    if (token !== state.token) return;
    const file = new File([blob], item.name || `book.${state.format}`, { type: bookMime(item) });
    const view = document.createElement("foliate-view");
    view.className = "reader-book";
    state.body.replaceChildren(view);
    state.bookView = view;
    bookToolbar(item, []);
    view.addEventListener("relocate", (event) => {
      if (token !== state.token || !state.bookView) return;
      const detail = event.detail || {};
      state.fraction = Number(detail.fraction) || 0;
      const chapter = detail.tocItem && detail.tocItem.label ? ` · ${detail.tocItem.label}` : "";
      setStatus(`${Math.round(state.fraction * 100)}%${chapter}`);
      rememberThrottled(item, { fraction: state.fraction });
      forwardBookKeys(state.bookView, token);
    });
    await view.open(file);
    if (token !== state.token) return;
    installToc(view);
    applyBookStyles();
    /* The paginator lays out before the shell has its final size on first
       open, so force a relayout and an explicit goTo afterwards. */
    const saved = recall(item);
    const fraction = saved && Number.isFinite(Number(saved.fraction)) ? clamp(Number(saved.fraction), 0, 1) : 0;
    try { await view.goTo({ fraction }); } catch (_) {}
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (token !== state.token) return;
    try {
      if (view.renderer && typeof view.renderer.expand === "function") view.renderer.expand();
    } catch (_) {}
    forwardBookKeys(view, token);
    setStatus(`${Math.round(state.fraction * 100)}%`);
  }

  function bookStep(direction) {
    const view = state.bookView;
    if (!view) return;
    try {
      const result = direction > 0 ? view.next() : view.prev();
      if (result && typeof result.catch === "function") result.catch(() => {});
    } catch (_) {}
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
    state.token += 1;
    state.renderSeq += 1;
    if (state.pdf) {
      try { state.pdf.destroy(); } catch (_) {}
      state.pdf = null;
    }
    if (state.bookView) {
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
    state.buttons = {};
    state.pages = 0;
    state.page = 1;
    state.zoom = 1;
    state.fraction = 0;
    state.tocOpen = false;
    state.htmlText = "";
  }

  function isOpen() {
    return state.open;
  }

  function keydown(event) {
    if (!state.open) return false;
    const target = event.target;
    if (target && typeof target.closest === "function"
      && (target.closest("input, textarea, select") || target.isContentEditable)) return false;
    const key = event.key;
    const lower = key.toLowerCase();
    if (PDF_FORMATS[state.format] && state.pdf) {
      if (key === "ArrowRight" || key === "PageDown" || (key === " " && !event.shiftKey)) {
        event.preventDefault();
        renderPdfPage(state.page + 1);
        return true;
      }
      if (key === "ArrowLeft" || key === "PageUp" || (key === " " && event.shiftKey)) {
        event.preventDefault();
        renderPdfPage(state.page - 1);
        return true;
      }
      if (lower === "n") { event.preventDefault(); renderPdfPage(state.page + 1); return true; }
      if (lower === "p") { event.preventDefault(); renderPdfPage(state.page - 1); return true; }
      if (key === "+" || key === "=") { event.preventDefault(); zoomBy(1.25); return true; }
      if (key === "-") { event.preventDefault(); zoomBy(1 / 1.25); return true; }
      if (key === "0") { event.preventDefault(); state.zoom = 1; renderPdfPage(state.page); return true; }
      return false;
    }
    if (BOOK_FORMATS[state.format] && state.bookView) {
      if (key === "ArrowRight" || key === "PageDown" || (key === " " && !event.shiftKey)) {
        event.preventDefault();
        bookStep(1);
        return true;
      }
      if (key === "ArrowLeft" || key === "PageUp" || (key === " " && event.shiftKey)) {
        event.preventDefault();
        bookStep(-1);
        return true;
      }
      if (lower === "n") { event.preventDefault(); bookStep(1); return true; }
      if (lower === "p") { event.preventDefault(); bookStep(-1); return true; }
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
    formatOf,
    label(format) { return FORMAT_LABELS[format] || "Document"; }
  };
})();
