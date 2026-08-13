/*!
 * pt-docs.js — Documents, uploads, downloads and file exports for Live Apps.
 * =============================================================================
 *
 * PURPOSE
 * -------
 * A flat, dependency-free ES module that wraps the document half of the `pt`
 * global (saveDocument / uploadFiles / getDocumentText / searchDocuments /
 * downloadDocuments / deleteDocuments / listDirectory) plus the browser-side
 * download helpers every export feature re-implements:
 *   - extractDownloadUrl() that checks EVERY response shape documented in
 *     AGENTS.md (result.result.documents[0], result.documents[0],
 *     result.download_url, result.uuid -> pt._getUrl stream)
 *   - triggerDownload / downloadBlob / downloadText that always clean up the
 *     temporary anchor and the object URL (a leak most apps have)
 *   - saveAndDownload(): pt.saveDocument + auto browser download in one call
 *   - uploadFiles()/uploadDataUrl(): build the FormData correctly (the
 *     canvas/image export path used by the badge/colour apps)
 *   - exportJson / exportMarkdown convenience wrappers
 *
 * DISTILLED FROM (real apps in primethink-live-apps/)
 * ---------------------------------------------------
 *   document-review, rfp-expert, expense-splitter, wiki, whats-new,
 *   knowledge-base-consolidator, estate-agent, contract-legal-document-manager,
 *   business-case-builder, live_apps_debug, live-page, story_forge (dataURL
 *   export), and the pt-lite.js download helpers.
 *
 * CONTRACT
 * --------
 *   - Plain ES module, no build step, no bare/npm imports, no JSX.
 *   - `pt` is a browser global injected by the platform; guard with
 *     `typeof pt !== 'undefined'`.
 *   - Never hardcode API URLs — use pt._getUrl() or a response download_url.
 *
 * USAGE
 * -----
 *   import * as docs from './pt-docs.js';
 *
 *   // client-side exports (no server round-trip)
 *   docs.downloadText(csv, 'report.csv', 'text/csv');
 *   docs.exportJson(state, 'backup.json');
 *
 *   // save to PrimeThink storage AND download
 *   await docs.saveAndDownload('report.pdf', 'PDF', 'application/pdf', markdown);
 *
 *   // uploads
 *   await docs.uploadFiles(fileInput.files, 'uploads');
 *   await docs.uploadDataUrl(canvas.toDataURL('image/png'), 'badge.png', 'badges');
 */

const MODULE = '[pt-docs]';

function requirePt() {
    if (typeof pt === 'undefined') {
        throw new Error(MODULE + ' pt global is not available (run inside a PrimeThink Live App)');
    }
    return pt;
}

function toId(v) {
    if (typeof v === 'number') {
        return v;
    }
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? v : n;
}

/* ------------------------------------------------------------------ *
 * Download-url extraction (every documented response shape)
 * ------------------------------------------------------------------ */

/**
 * Extract a download URL from the varied shapes pt.saveDocument /
 * pt.uploadFiles return. Checks, in order: result.result.documents[0],
 * result.documents[0], result.download_url, and result.uuid (built via
 * pt._getUrl so it never hardcodes a domain).
 * @param {Object} result - The API response.
 * @returns {string|null} A download URL, or null if none is present.
 */
export function extractDownloadUrl(result) {
    if (!result) {
        return null;
    }
    if (result.result && result.result.documents && result.result.documents[0] && result.result.documents[0].download_url) {
        return result.result.documents[0].download_url;
    }
    if (result.documents && result.documents[0] && result.documents[0].download_url) {
        return result.documents[0].download_url;
    }
    if (result.download_url) {
        return result.download_url;
    }
    if (result.uuid && typeof pt !== 'undefined' && typeof pt._getUrl === 'function') {
        return pt._getUrl('/api/v1/documents/uuid/' + result.uuid + '/download/stream');
    }
    return null;
}

/* ------------------------------------------------------------------ *
 * Browser-side download helpers (always clean up)
 * ------------------------------------------------------------------ */

/**
 * Trigger a browser download for a URL via a temporary anchor, cleaning the
 * anchor up afterwards.
 * @param {string} url - The URL to download.
 * @param {string} [filename] - Suggested filename.
 * @returns {void}
 */
export function triggerDownload(url, filename) {
    if (!url) {
        console.error(MODULE + ' triggerDownload: no url');
        return;
    }
    const a = document.createElement('a');
    a.href = url;
    if (filename) {
        a.download = filename;
    }
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Download a Blob, cleaning up both the anchor and the object URL.
 * @param {Blob} blob - The blob to download.
 * @param {string} filename - The filename.
 * @returns {void}
 */
export function downloadBlob(blob, filename) {
    if (!(blob instanceof Blob)) {
        console.error(MODULE + ' downloadBlob: argument is not a Blob');
        return;
    }
    const url = URL.createObjectURL(blob);
    try {
        triggerDownload(url, filename);
    } finally {
        // Revoke after the click has had a chance to start the download.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

/**
 * Download a string as a client-generated text file (CSV, JSON, MD, TXT...).
 * No server round-trip.
 * @param {string} text - The file contents.
 * @param {string} filename - The filename.
 * @param {string} [mime='text/plain;charset=utf-8'] - The MIME type.
 * @returns {void}
 */
export function downloadText(text, filename, mime = 'text/plain;charset=utf-8') {
    const blob = new Blob([text == null ? '' : String(text)], { type: mime });
    downloadBlob(blob, filename);
}

/**
 * Download an object as a pretty-printed JSON file.
 * @param {*} data - Any JSON-serialisable value.
 * @param {string} [filename='export.json'] - The filename.
 * @returns {void}
 */
export function exportJson(data, filename = 'export.json') {
    try {
        downloadText(JSON.stringify(data, null, 2), filename, 'application/json');
    } catch (err) {
        console.error(MODULE + ' exportJson failed:', err);
    }
}

/**
 * Download a Markdown string as a .md file.
 * @param {string} md - The markdown text.
 * @param {string} [filename='export.md'] - The filename.
 * @returns {void}
 */
export function exportMarkdown(md, filename = 'export.md') {
    downloadText(md, filename, 'text/markdown;charset=utf-8');
}

/* ------------------------------------------------------------------ *
 * Save-to-storage + download
 * ------------------------------------------------------------------ */

/**
 * Save content as a PrimeThink document AND trigger a browser download of it.
 * pt.saveDocument alone does NOT download — this closes that gap.
 * @param {string} filename - Filename with extension (e.g. 'report.pdf').
 * @param {string} format - 'TXT'|'MD'|'HTML'|'DOCX'|'PDF'|'CSV'|'XLSX'|'CUSTOM'.
 * @param {string} mime - MIME type (e.g. 'application/pdf').
 * @param {string} content - The document content (markdown for PDF/DOCX).
 * @param {string} [folder] - Optional storage folder.
 * @returns {Promise<Object|null>} The saveDocument result, or null on error.
 */
export async function saveAndDownload(filename, format, mime, content, folder) {
    try {
        const p = requirePt();
        const res = await p.saveDocument(filename, format, mime, content, folder || null);
        const url = extractDownloadUrl(res);
        if (url) {
            triggerDownload(url, filename);
        } else {
            console.error(MODULE + ' saveAndDownload: no download_url in response, saved only');
        }
        return res;
    } catch (err) {
        console.error(MODULE + ' saveAndDownload("' + filename + '") failed:', err);
        return null;
    }
}

/* ------------------------------------------------------------------ *
 * Uploads
 * ------------------------------------------------------------------ */

/**
 * Upload files to the chat, building the FormData for you. Accepts a FileList
 * (from `<input type="file">`), an array of File/Blob, or a single File/Blob.
 * @param {FileList|Array<File|Blob>|File|Blob} fileList - The file(s) to upload.
 * @param {string} [folder] - Optional destination folder.
 * @returns {Promise<Object|null>} The uploadFiles result (with `documents`), or null.
 */
export async function uploadFiles(fileList, folder) {
    try {
        const p = requirePt();
        let files;
        if (fileList instanceof FileList) {
            files = Array.from(fileList);
        } else if (Array.isArray(fileList)) {
            files = fileList;
        } else if (fileList) {
            files = [fileList];
        } else {
            files = [];
        }
        if (files.length === 0) {
            console.error(MODULE + ' uploadFiles: no files provided');
            return null;
        }
        const form = new FormData();
        files.forEach((f) => {
            const name = (f && f.name) ? f.name : 'file';
            form.append('files', f, name);
        });
        return await p.uploadFiles(form, folder || null);
    } catch (err) {
        console.error(MODULE + ' uploadFiles failed:', err);
        return null;
    }
}

/**
 * Convert a data URL (e.g. canvas.toDataURL()) into a Blob. Used by the
 * badge/colour/image-export apps.
 * @param {string} dataUrl - A `data:<mime>;base64,...` URL.
 * @returns {Blob} The decoded blob.
 */
export function dataUrlToBlob(dataUrl) {
    const [head, body] = String(dataUrl).split(',');
    const mimeMatch = head.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const isBase64 = /;base64/i.test(head);
    const raw = isBase64 ? atob(body) : decodeURIComponent(body);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
}

/**
 * Upload an image/file expressed as a data URL (typically from
 * canvas.toDataURL()). Builds the Blob + FormData for you.
 * @param {string} dataUrl - The data URL.
 * @param {string} filename - The destination filename (e.g. 'badge.png').
 * @param {string} [folder] - Optional destination folder.
 * @returns {Promise<Object|null>} The uploadFiles result, or null on error.
 */
export async function uploadDataUrl(dataUrl, filename, folder) {
    try {
        const p = requirePt();
        const blob = dataUrlToBlob(dataUrl);
        const file = new File([blob], filename || 'upload', { type: blob.type });
        const form = new FormData();
        form.append('files', file, file.name);
        return await p.uploadFiles(form, folder || null);
    } catch (err) {
        console.error(MODULE + ' uploadDataUrl("' + filename + '") failed:', err);
        return null;
    }
}

/* ------------------------------------------------------------------ *
 * Document reads / search / lifecycle
 * ------------------------------------------------------------------ */

/**
 * Get the extracted text of a document.
 * @param {number|string} docId - The document id (coerced to a number).
 * @param {Object} [opts] - { from, to } character range (optional).
 * @returns {Promise<Object|null>} The get_document_text result, or null on error.
 */
export async function getText(docId, opts = {}) {
    try {
        const p = requirePt();
        return await p.getDocumentText(toId(docId), opts);
    } catch (err) {
        console.error(MODULE + ' getText(' + docId + ') failed:', err);
        return null;
    }
}

/**
 * Semantic (RAG) search over documents/collections.
 * @param {string} query - The search query.
 * @param {string} [scope='ALL'] - 'ALL' | 'DOCUMENTS_ONLY' | 'COLLECTIONS_ONLY'.
 * @param {Array<number>} [docIds] - Restrict to these document ids (optional).
 * @returns {Promise<Object|null>} The search result, or null on error.
 */
export async function search(query, scope = 'ALL', docIds = null) {
    try {
        const p = requirePt();
        return await p.searchDocuments(query, scope, docIds);
    } catch (err) {
        console.error(MODULE + ' search failed:', err);
        return null;
    }
}

/**
 * Wait for a document to reach 'Ready' status (extracted + indexed).
 * @param {number|string} docId - The document id.
 * @param {Object} [opts] - { timeout=60000, rejectOnError=true }.
 * @returns {Promise<Object|null>} The ready document, or null on timeout/error.
 */
export async function waitReady(docId, opts = {}) {
    try {
        const p = requirePt();
        return await p.waitForDocumentReady(toId(docId), opts);
    } catch (err) {
        console.error(MODULE + ' waitReady(' + docId + ') failed:', err);
        return null;
    }
}

/**
 * List the contents of a folder in the chat's document storage.
 * @param {string} path - The directory path (e.g. 'reports' or '/').
 * @returns {Promise<Object|null>} The directory listing, or null on error.
 */
export async function listDir(path) {
    try {
        const p = requirePt();
        return await p.listDirectory(path);
    } catch (err) {
        console.error(MODULE + ' listDir("' + path + '") failed:', err);
        return null;
    }
}

/**
 * Delete documents by id.
 * @param {Array<number|string>} ids - The document ids to delete.
 * @returns {Promise<Object|null>} The delete result, or null on error.
 */
export async function deleteDocs(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
        return null;
    }
    try {
        const p = requirePt();
        return await p.deleteDocuments(ids.map(toId));
    } catch (err) {
        console.error(MODULE + ' deleteDocs failed:', err);
        return null;
    }
}

/**
 * Download one or more stored documents (multiple are zipped by the platform).
 * @param {Array<number|string>} ids - The document ids to download.
 * @param {boolean} [asZip] - Force a ZIP even for a single file.
 * @returns {Promise<boolean>} True if the download call succeeded.
 */
export async function downloadDocs(ids, asZip) {
    if (!Array.isArray(ids) || ids.length === 0) {
        console.error(MODULE + ' downloadDocs: no ids');
        return false;
    }
    try {
        const p = requirePt();
        const numeric = ids.map(toId);
        await p.downloadDocuments(numeric, asZip === true || numeric.length > 1);
        return true;
    } catch (err) {
        console.error(MODULE + ' downloadDocs failed:', err);
        return false;
    }
}
