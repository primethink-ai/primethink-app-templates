/**
 * pt-safe.js — XSS-safe rendering helpers for PrimeThink Live Apps.
 *
 * PURPOSE
 * -------
 * HTML apps render with `element.innerHTML = template` all over this repo, and
 * MOST of them forget to escape the interpolated user/AI/DB text — an XSS hole.
 * This module is the single, correct place for escaping. Reuse it instead of
 * hand-rolling yet another `escapeHtml` (there are ~50 slightly-different copies
 * across the apps).
 *
 * DISTILLED FROM (real duplicated implementations):
 *   todo-list, kanban-board, crm, wiki, people-directory, feedback-tracker,
 *   document-review, roadmap-management, briefing-insight-builder,
 *   recurring-calls, life-logger, task-tracker (each defines its own escapeHtml)
 *   and pt-lite.js (the canonical esc/html/raw pattern).
 *
 * REACT NOTE
 * ----------
 * React apps DO NOT need this module for normal rendering — JSX escapes every
 * interpolated `{value}` by default. The ONLY time a React app needs escaping is
 * when it uses `dangerouslySetInnerHTML` with user/AI/DB content: run that HTML
 * through a sanitiser (or avoid the pattern). `safeUrl()` is still useful in
 * React for href/src attributes built from untrusted strings.
 *
 * USAGE
 * -----
 *   import { escapeHtml, html, raw, renderInto, safeUrl } from './pt-safe.js';
 *
 *   // Tagged template — every ${...} is auto-escaped:
 *   const markup = html`<h1>${userTitle}</h1><a href="${safeUrl(link)}">open</a>`;
 *   renderInto(document.getElementById('app'), markup);
 *
 *   // Opt out of escaping for HTML you already trust (e.g. pre-rendered markdown):
 *   const block = html`<div>${raw(renderedMarkdownHtml)}</div>`;
 */

/* Marker class: a value the tagged template should insert verbatim (no escape). */
class RawHtml {
    /** @param {string} value Pre-trusted HTML string. */
    constructor(value) {
        this.value = value == null ? '' : String(value);
    }
}

/**
 * HTML-escape a value for safe interpolation into element bodies.
 * null/undefined become ''. Everything else is stringified first.
 * @param {*} v Value to escape.
 * @returns {string} Escaped string safe for innerHTML text content.
 */
export function escapeHtml(v) {
    if (v === null || v === undefined) return '';
    return String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Escape a value for use inside a double- or single-quoted HTML attribute.
 * Same rules as escapeHtml plus backtick — safe for `attr="${escapeAttr(v)}"`.
 * @param {*} v Value to escape.
 * @returns {string} Attribute-safe string.
 */
export function escapeAttr(v) {
    if (v === null || v === undefined) return '';
    return String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
}

/**
 * Wrap a string so the `html` tagged template inserts it WITHOUT escaping.
 * Use only for HTML you have already produced/escaped yourself.
 * @param {string} str Trusted HTML.
 * @returns {RawHtml} Marker consumed by html`` / renderInto.
 */
export function raw(str) {
    return new RawHtml(str);
}

/* Render one interpolated value for the html`` template. */
function renderValue(v) {
    if (v === null || v === undefined) return '';
    if (v instanceof RawHtml) return v.value;
    if (Array.isArray(v)) return v.map(renderValue).join('');
    return escapeHtml(v);
}

/**
 * Tagged template literal that auto-escapes every interpolation.
 * Interpolations may be: strings/numbers (escaped), arrays (joined & escaped
 * element-wise), nested html`` results (already safe), or raw(x) (verbatim).
 * Returns a RawHtml so nested templates are not double-escaped.
 * @param {TemplateStringsArray} strings Literal string parts.
 * @param {...*} values Interpolated values.
 * @returns {RawHtml} Safe HTML marker; pass to renderInto or .value for a string.
 */
export function html(strings, ...values) {
    try {
        let out = strings[0];
        for (let i = 0; i < values.length; i++) {
            out += renderValue(values[i]) + strings[i + 1];
        }
        return new RawHtml(out);
    } catch (e) {
        console.error('[pt-safe] html template error:', e);
        return new RawHtml('');
    }
}

/**
 * Set an element's text content safely (no markup interpreted).
 * Prefer this over innerHTML whenever you don't need HTML.
 * @param {Element} el Target element.
 * @param {*} text Text to set (stringified; null/undefined -> '').
 */
export function setText(el, text) {
    try {
        if (!el) return;
        el.textContent = text === null || text === undefined ? '' : String(text);
    } catch (e) {
        console.error('[pt-safe] setText error:', e);
    }
}

/**
 * Assign HTML to an element from a RawHtml (html`` result) or plain string.
 * A plain string is treated as UNTRUSTED and escaped; pass raw()/html`` for markup.
 * @param {Element} el Target element.
 * @param {(RawHtml|string)} htmlString RawHtml marker or (untrusted) string.
 */
export function renderInto(el, htmlString) {
    try {
        if (!el) return;
        el.innerHTML = htmlString instanceof RawHtml
            ? htmlString.value
            : escapeHtml(htmlString);
    } catch (e) {
        console.error('[pt-safe] renderInto error:', e);
    }
}

/**
 * Escape a single CSV cell: stringify, then quote if it contains a delimiter,
 * quote, or newline, doubling embedded quotes (RFC 4180). Guards against CSV
 * injection by prefixing a leading =, +, -, @ with a single quote.
 * @param {*} v Cell value.
 * @param {string} [delimiter=','] Field delimiter in use.
 * @returns {string} CSV-safe cell.
 */
export function escapeCsvCell(v, delimiter = ',') {
    let s = v === null || v === undefined ? '' : String(v);
    // Formula-injection guard for spreadsheet apps.
    if (/^[=+\-@]/.test(s)) s = '\'' + s;
    if (s.includes('"') || s.includes(delimiter) || s.includes('\n') || s.includes('\r')) {
        s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

/**
 * Remove all HTML tags from a string, returning plain text.
 * @param {*} v Input possibly containing markup.
 * @returns {string} Text with tags stripped and whitespace collapsed.
 */
export function stripTags(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Return a URL only if it is safe to use in href/src, else '#'.
 * Blocks javascript:, data:, vbscript: and other script-bearing schemes.
 * Allows http(s), mailto, tel, relative and anchor URLs.
 * @param {*} v Candidate URL.
 * @returns {string} The URL if safe, otherwise '#'.
 */
export function safeUrl(v) {
    if (v === null || v === undefined) return '#';
    const s = String(v).trim();
    if (!s) return '#';
    // Strip control chars/whitespace that can hide a scheme (e.g. "java\tscript:").
    const scheme = s.replace(/[\u0000-\u001F\u007F\s]/g, '').toLowerCase();
    if (/^(javascript|data|vbscript|file):/i.test(scheme)) return '#';
    return s;
}
