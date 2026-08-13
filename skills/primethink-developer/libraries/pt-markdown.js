/**
 * pt-markdown.js — Dependency-free Markdown → SAFE HTML renderer.
 *
 * PURPOSE
 * -------
 * Several apps hand-roll a mini markdown→HTML converter, and most of them
 * interpolate the raw markdown into innerHTML BEFORE escaping — an XSS hole.
 * This renderer escapes ALL input first, then applies markup to the escaped
 * text, and filters link URLs through safeUrl(). No external library, no CDN.
 *
 * DISTILLED FROM (real hand-rolled converters):
 *   wiki, whats-new, document-review (renderMarkdown), document-proofreader,
 *   knowledge-base-consolidator, business-case-builder, release_notes_manager,
 *   team-knowledge-base, diet-coach (simpleMarkdown), task-tracker
 *   (renderMarkdown / renderMarkdownPreview).
 *
 * SUPPORTS
 * --------
 *   headings (#..######), bold, italic, strikethrough ~~,
 *   inline `code`, fenced ```code``` blocks, links [t](url) (safeUrl-filtered,
 *   target=_blank rel="noopener noreferrer"), unordered (-, *, +) and ordered
 *   (1.) lists, blockquotes (>), tables (| a | b |), horizontal rules (---),
 *   paragraphs and single-line breaks.
 *
 * Imports escaping from './pt-safe.js' (sibling module, flat deploy).
 *
 * USAGE
 * -----
 *   import { renderMarkdown, tailwindProseClasses } from './pt-markdown.js';
 *   container.innerHTML = renderMarkdown(entity.data.body);
 *   container.className = tailwindProseClasses;
 */

import { escapeHtml, safeUrl } from './pt-safe.js';

/**
 * Tailwind class string apps apply to a rendered-markdown container so the
 * output is styled consistently in both light and dark mode. Requires the
 * @tailwindcss/typography plugin OR the Tailwind Play CDN (which bundles it).
 * @type {string}
 */
export const tailwindProseClasses =
    'prose prose-sm sm:prose max-w-none dark:prose-invert ' +
    'prose-headings:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 ' +
    'prose-code:text-pink-600 dark:prose-code:text-pink-400 ' +
    'prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800';

/* Apply inline markup to an ALREADY-ESCAPED line of text. */
function renderInline(escaped) {
    let s = escaped;

    // Inline code first, protecting its contents from further replacement.
    const codeSpans = [];
    s = s.replace(/`([^`]+)`/g, (m, code) => {
        codeSpans.push(code);
        return `\u0000CODE${codeSpans.length - 1}\u0000`;
    });

    // Links [text](url) — url is filtered through safeUrl (already escaped text).
    s = s.replace(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (m, text, url) => {
        // Unescape the URL's &amp; back to & so safeUrl sees the real scheme,
        // then re-escape for the attribute.
        const rawUrl = url.replace(/&amp;/g, '&');
        const clean = safeUrl(rawUrl).replace(/"/g, '&quot;');
        return `<a href="${clean}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });

    // Bold, italic, strikethrough.
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // Restore inline code (escaped content stays escaped).
    s = s.replace(/\u0000CODE(\d+)\u0000/g, (m, i) => `<code>${codeSpans[Number(i)]}</code>`);
    return s;
}

/* Parse a table block (array of "| a | b |" lines) into an HTML table, or null. */
function renderTable(lines) {
    if (lines.length < 2) return null;
    const isSep = /^\s*\|?[\s:-]*\|[\s:|-]*$/.test(lines[1]) && lines[1].includes('-');
    if (!isSep) return null;
    const splitRow = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const header = splitRow(lines[0]);
    const body = lines.slice(2).map(splitRow);
    let html = '<table><thead><tr>';
    html += header.map((c) => `<th>${renderInline(escapeHtml(c))}</th>`).join('');
    html += '</tr></thead><tbody>';
    for (const row of body) {
        html += '<tr>' + row.map((c) => `<td>${renderInline(escapeHtml(c))}</td>`).join('') + '</tr>';
    }
    html += '</tbody></table>';
    return html;
}

/**
 * Render a Markdown string to safe HTML (block + inline).
 * @param {string} md Markdown source.
 * @param {Object} [opts] Options.
 * @param {boolean} [opts.breaks=true] Convert single newlines inside paragraphs to <br>.
 * @returns {string} Safe HTML string.
 */
export function renderMarkdown(md, opts) {
    if (md === null || md === undefined) return '';
    const options = Object.assign({ breaks: true }, opts || {});
    try {
        const src = String(md).replace(/\r\n?/g, '\n');
        const lines = src.split('\n');
        const out = [];
        let i = 0;
        let listType = null; // 'ul' | 'ol' | null
        let paragraph = [];

        const closeList = () => {
            if (listType) { out.push(`</${listType}>`); listType = null; }
        };
        const flushParagraph = () => {
            if (paragraph.length) {
                const joined = paragraph.map((l) => renderInline(escapeHtml(l))).join(options.breaks ? '<br>' : ' ');
                out.push(`<p>${joined}</p>`);
                paragraph = [];
            }
        };

        while (i < lines.length) {
            const line = lines[i];

            // Fenced code block.
            const fence = line.match(/^```(.*)$/);
            if (fence) {
                flushParagraph(); closeList();
                const code = [];
                i++;
                while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
                i++; // skip closing fence
                out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
                continue;
            }

            // Horizontal rule.
            if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
                flushParagraph(); closeList();
                out.push('<hr>');
                i++;
                continue;
            }

            // Heading.
            const heading = line.match(/^(#{1,6})\s+(.*)$/);
            if (heading) {
                flushParagraph(); closeList();
                const level = heading[1].length;
                out.push(`<h${level}>${renderInline(escapeHtml(heading[2].trim()))}</h${level}>`);
                i++;
                continue;
            }

            // Blockquote (consume consecutive > lines).
            if (/^\s*>\s?/.test(line)) {
                flushParagraph(); closeList();
                const quote = [];
                while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
                    quote.push(lines[i].replace(/^\s*>\s?/, ''));
                    i++;
                }
                out.push(`<blockquote>${quote.map((l) => renderInline(escapeHtml(l))).join('<br>')}</blockquote>`);
                continue;
            }

            // Table (needs a header + separator row).
            if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:-]*\|[\s:|-]*$/.test(lines[i + 1])) {
                const block = [];
                while (i < lines.length && lines[i].includes('|')) { block.push(lines[i]); i++; }
                const table = renderTable(block);
                if (table) { flushParagraph(); closeList(); out.push(table); continue; }
                // Not a real table: fall through by pushing lines back as paragraph.
                block.forEach((l) => paragraph.push(l));
                continue;
            }

            // Unordered list item.
            const ul = line.match(/^\s*[-*+]\s+(.*)$/);
            if (ul) {
                flushParagraph();
                if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
                out.push(`<li>${renderInline(escapeHtml(ul[1]))}</li>`);
                i++;
                continue;
            }

            // Ordered list item.
            const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
            if (ol) {
                flushParagraph();
                if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
                out.push(`<li>${renderInline(escapeHtml(ol[1]))}</li>`);
                i++;
                continue;
            }

            // Blank line ends the current block.
            if (/^\s*$/.test(line)) {
                flushParagraph(); closeList();
                i++;
                continue;
            }

            // Default: paragraph text.
            closeList();
            paragraph.push(line);
            i++;
        }

        flushParagraph();
        closeList();
        return out.join('\n');
    } catch (e) {
        console.error('[pt-markdown] renderMarkdown error:', e);
        return escapeHtml(String(md));
    }
}

/**
 * Render inline-only Markdown (bold/italic/code/links/strikethrough) with no
 * block elements — for titles, list-item previews, table cells, etc.
 * @param {string} md Markdown source (single line).
 * @returns {string} Safe inline HTML.
 */
export function renderMarkdownInline(md) {
    if (md === null || md === undefined) return '';
    try {
        return renderInline(escapeHtml(String(md)));
    } catch (e) {
        console.error('[pt-markdown] renderMarkdownInline error:', e);
        return escapeHtml(String(md));
    }
}

/**
 * Strip Markdown syntax down to plain text (for previews, search, summaries).
 * @param {string} md Markdown source.
 * @returns {string} Plain text.
 */
export function mdToPlainText(md) {
    if (md === null || md === undefined) return '';
    try {
        return String(md)
            .replace(/\r\n?/g, '\n')
            .replace(/```[\s\S]*?```/g, ' ')       // fenced code
            .replace(/`([^`]+)`/g, '$1')            // inline code
            .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')  // images
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> text
            .replace(/^#{1,6}\s+/gm, '')             // headings
            .replace(/^\s*>\s?/gm, '')               // blockquotes
            .replace(/^\s*([-*+]|\d+[.)])\s+/gm, '') // list markers
            .replace(/(\*\*|__|~~|\*|_)/g, '')        // emphasis marks
            .replace(/^\s*([-*_])\1{2,}\s*$/gm, '')  // hr
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{2,}/g, '\n')
            .trim();
    } catch (e) {
        console.error('[pt-markdown] mdToPlainText error:', e);
        return '';
    }
}
