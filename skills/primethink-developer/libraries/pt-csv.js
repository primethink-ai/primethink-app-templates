/**
 * pt-csv.js — CSV import/export helpers (RFC 4180-ish).
 *
 * PURPOSE
 * -------
 * Import/export apps each ship their own CSV serialiser and parser, and the
 * parsers usually break on quoted fields, embedded commas/newlines, CRLF, or a
 * leading BOM. This is one correct, dependency-free implementation. It does NOT
 * depend on `pt` — feed it plain rows/entities and wire the result into pt.* or
 * downloadCsv yourself.
 *
 * DISTILLED FROM (real duplicated implementations):
 *   crm, bank-transactions-manager, contact-form-admin, form-submissions-admin,
 *   estate-agent-leads-dashboard, people-directory (parseCSV/downloadCSVTemplate),
 *   expense-splitter, spreadsheet, quiz-results-app, feedback-tracker (exportToCSV).
 *
 * USAGE
 * -----
 *   import { toCsv, parseCsv, downloadCsv, entitiesToRows } from './pt-csv.js';
 *
 *   const rows = entitiesToRows(contacts, ['name', 'email', 'company']);
 *   downloadCsv(rows, 'contacts.csv');
 *
 *   const parsed = parseCsv(fileText, { header: true }); // -> array of objects
 */

/**
 * Serialise rows to a CSV string. Rows may be arrays or objects; when objects,
 * supply `columns` (or they are inferred from the union of keys).
 * @param {Array<(Array|Object)>} rows Data rows.
 * @param {Object} [opts] Options.
 * @param {string[]} [opts.columns] Column keys/order (required-ish for objects).
 * @param {boolean} [opts.header=true] Emit a header row (object/columns mode).
 * @param {string} [opts.delimiter=','] Field delimiter.
 * @param {string} [opts.newline='\r\n'] Row terminator (CRLF per RFC 4180).
 * @returns {string} CSV text.
 */
export function toCsv(rows, opts) {
    const options = Object.assign({ header: true, delimiter: ',', newline: '\r\n' }, opts || {});
    try {
        const list = Array.isArray(rows) ? rows : [];
        let columns = options.columns;
        const objectMode = list.length > 0 && !Array.isArray(list[0]);

        if (objectMode && !columns) {
            const keys = new Set();
            list.forEach((r) => Object.keys(r || {}).forEach((k) => keys.add(k)));
            columns = Array.from(keys);
        }

        const escapeCell = (v) => {
            let s = v === null || v === undefined ? '' : String(v);
            if (s.includes('"') || s.includes(options.delimiter) || s.includes('\n') || s.includes('\r')) {
                s = '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
        };

        const out = [];
        if (objectMode || options.columns) {
            if (options.header) out.push(columns.map(escapeCell).join(options.delimiter));
            for (const row of list) {
                const cells = Array.isArray(row)
                    ? row
                    : columns.map((c) => (row ? row[c] : ''));
                out.push(cells.map(escapeCell).join(options.delimiter));
            }
        } else {
            // Plain array-of-arrays.
            for (const row of list) {
                out.push((row || []).map(escapeCell).join(options.delimiter));
            }
        }
        return out.join(options.newline);
    } catch (e) {
        console.error('[pt-csv] toCsv error:', e);
        return '';
    }
}

/**
 * Parse CSV text into rows. Handles quoted fields, embedded commas/newlines,
 * doubled quotes (""), CRLF/LF, and a leading BOM.
 * @param {string} text CSV source.
 * @param {Object} [opts] Options.
 * @param {string} [opts.delimiter=','] Field delimiter.
 * @param {boolean} [opts.header=false] When true, use the first row as keys and
 *   return an array of objects; otherwise return an array of string arrays.
 * @param {boolean} [opts.trim=false] Trim whitespace around each cell.
 * @returns {(string[][]|Object[])} Parsed rows.
 */
export function parseCsv(text, opts) {
    const options = Object.assign({ delimiter: ',', header: false, trim: false }, opts || {});
    const rows = [];
    try {
        if (text === null || text === undefined) return rows;
        let src = String(text);
        if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1); // strip BOM

        const delim = options.delimiter;
        let field = '';
        let row = [];
        let inQuotes = false;
        let started = false; // whether the current row has any content

        const pushField = () => {
            row.push(options.trim ? field.trim() : field);
            field = '';
        };
        const pushRow = () => {
            pushField();
            // Skip fully-empty trailing rows.
            if (row.length > 1 || row[0] !== '') rows.push(row);
            row = [];
            started = false;
        };

        for (let i = 0; i < src.length; i++) {
            const ch = src[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (src[i + 1] === '"') { field += '"'; i++; }
                    else { inQuotes = false; }
                } else {
                    field += ch;
                }
            } else if (ch === '"') {
                inQuotes = true;
                started = true;
            } else if (ch === delim) {
                pushField();
                started = true;
            } else if (ch === '\n') {
                pushRow();
            } else if (ch === '\r') {
                if (src[i + 1] === '\n') i++;
                pushRow();
            } else {
                field += ch;
                started = true;
            }
        }
        // Flush the final field/row if there was any content.
        if (field !== '' || row.length > 0 || started) pushRow();

        if (!options.header) return rows;

        // Header mode: first row -> keys, rest -> objects.
        if (rows.length === 0) return [];
        const keys = rows[0];
        return rows.slice(1).map((r) => {
            const obj = {};
            keys.forEach((k, idx) => { obj[k] = r[idx] === undefined ? '' : r[idx]; });
            return obj;
        });
    } catch (e) {
        console.error('[pt-csv] parseCsv error:', e);
        return rows;
    }
}

/**
 * Serialise rows and trigger a browser download using DOM APIs + Blob.
 * Prepends a UTF-8 BOM so Excel opens accented characters correctly. Revokes
 * the object URL after the click. No-op outside a browser (logs a warning).
 * @param {Array<(Array|Object)>} rows Data rows.
 * @param {string} [filename='export.csv'] Download filename.
 * @param {Object} [opts] Passed through to toCsv (columns/header/delimiter).
 */
export function downloadCsv(rows, filename = 'export.csv', opts) {
    try {
        if (typeof document === 'undefined' || typeof Blob === 'undefined') {
            console.error('[pt-csv] downloadCsv requires a browser environment');
            return;
        }
        const csv = toCsv(rows, opts);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
        console.error('[pt-csv] downloadCsv error:', e);
    }
}

/**
 * Convert pt entities ({ id, data:{...} }) into plain rows for toCsv/downloadCsv.
 * @param {Object[]} entities Entities from pt.list().
 * @param {(string[]|Object)} columns Either an array of data keys, or a map of
 *   { header: keyOrFn } where key can be a data field name or accessor(entity).
 * @param {Object} [opts] Options.
 * @param {boolean} [opts.includeId=false] Prepend the entity id as an 'id' column.
 * @returns {Object[]} Array of row objects keyed by header.
 */
export function entitiesToRows(entities, columns, opts) {
    const options = Object.assign({ includeId: false }, opts || {});
    try {
        const list = Array.isArray(entities) ? entities : [];
        const isArrayCols = Array.isArray(columns);
        const map = isArrayCols
            ? columns.reduce((m, k) => { m[k] = k; return m; }, {})
            : (columns || {});
        return list.map((ent) => {
            const data = (ent && ent.data) || {};
            const row = {};
            if (options.includeId) row.id = ent ? ent.id : '';
            for (const header of Object.keys(map)) {
                const accessor = map[header];
                row[header] = typeof accessor === 'function'
                    ? accessor(ent)
                    : (data[accessor] === undefined ? '' : data[accessor]);
            }
            return row;
        });
    } catch (e) {
        console.error('[pt-csv] entitiesToRows error:', e);
        return [];
    }
}

/**
 * Map parsed CSV row objects into entity `data` payloads ready for pt.add /
 * pt.batchAdd. Does not touch `pt`.
 * @param {Object[]} rows Row objects (e.g. from parseCsv with header:true).
 * @param {Object} mapping Map of { entityField: csvHeaderOrFn }. When a value
 *   is a function it receives the row and returns the field value.
 * @returns {Object[]} Array of data objects.
 */
export function rowsToEntityData(rows, mapping) {
    try {
        const list = Array.isArray(rows) ? rows : [];
        const map = mapping || {};
        return list.map((row) => {
            const data = {};
            for (const field of Object.keys(map)) {
                const source = map[field];
                data[field] = typeof source === 'function'
                    ? source(row)
                    : (row && row[source] !== undefined ? row[source] : '');
            }
            return data;
        });
    } catch (e) {
        console.error('[pt-csv] rowsToEntityData error:', e);
        return [];
    }
}
