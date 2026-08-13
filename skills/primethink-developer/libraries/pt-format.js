/**
 * pt-format.js — Presentation helpers (dates, numbers, currency, strings).
 *
 * PURPOSE
 * -------
 * Every data-driven app reimplements the same date/number/string formatters,
 * usually with subtle bugs (e.g. "Invalid Date" leaking into the UI, timezone
 * drift in yyyy-mm-dd conversion, unstable avatar colours). This module is the
 * one correct copy. All date helpers tolerate null/invalid input and return ''
 * rather than 'Invalid Date'.
 *
 * DISTILLED FROM (real duplicated implementations):
 *   Dates / relative time: life-logger, recurring-calls, panel-stakeholder-trainer,
 *     gym-progress, expense-splitter, bank-transactions-manager,
 *     gantt-chart-project-manager, daily-achievement-tracker, dry-nights,
 *     antibiotic-tracker, subscription-manager, roadmap-management (isoDate),
 *     board_view, homework-journal, daily-quest-board.
 *   Duration: drum-sheet-library, metronome-timer, transcribe-live,
 *     quiz-results-app, alice-project-mc2-agent-training-academy.
 *   Currency / numbers: expense-splitter, bank-transactions-manager,
 *     subscription-manager.
 *   initials: demo-react/format.js, people-directory, crm.
 *
 * No dependencies, no `pt`, browser + Node safe (uses Intl and Date only).
 *
 * USAGE
 * -----
 *   import { formatDate, relativeTime, formatCurrency, initials } from './pt-format.js';
 *   formatDate('2024-03-15');        // "15 Mar 2024"
 *   relativeTime(Date.now() - 3*864e5); // "3 days ago"
 *   formatCurrency(1234.5, 'GBP');   // "£1,234.50"
 */

/* Coerce any input into a valid Date, or null. */
function toDate(v) {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

/* Two-digit zero pad. */
function pad2(n) {
    return String(n).padStart(2, '0');
}

/**
 * Format a date as a locale date string. Invalid/empty -> ''.
 * @param {(string|number|Date)} v Date value.
 * @param {Object} [opts] Intl.DateTimeFormat options (default: dd Mon yyyy).
 * @param {string} [locale='en-GB'] BCP-47 locale.
 * @returns {string} Formatted date or ''.
 */
export function formatDate(v, opts, locale = 'en-GB') {
    const d = toDate(v);
    if (!d) return '';
    try {
        return d.toLocaleDateString(locale, opts || { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
        console.error('[pt-format] formatDate error:', e);
        return '';
    }
}

/**
 * Format a date + time as a locale string. Invalid/empty -> ''.
 * @param {(string|number|Date)} v Date value.
 * @param {string} [locale='en-GB'] BCP-47 locale.
 * @returns {string} Formatted date-time or ''.
 */
export function formatDateTime(v, locale = 'en-GB') {
    const d = toDate(v);
    if (!d) return '';
    try {
        return d.toLocaleString(locale, {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        console.error('[pt-format] formatDateTime error:', e);
        return '';
    }
}

/**
 * Format just the time (HH:MM) of a date. Invalid/empty -> ''.
 * @param {(string|number|Date)} v Date value.
 * @param {string} [locale='en-GB'] BCP-47 locale.
 * @returns {string} Formatted time or ''.
 */
export function formatTime(v, locale = 'en-GB') {
    const d = toDate(v);
    if (!d) return '';
    try {
        return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        console.error('[pt-format] formatTime error:', e);
        return '';
    }
}

/**
 * Human relative time ("just now", "3 days ago", "in 2 hours"). Invalid -> ''.
 * @param {(string|number|Date)} v Date value.
 * @param {(string|number|Date)} [now=Date.now()] Reference point.
 * @returns {string} Relative description or ''.
 */
export function relativeTime(v, now) {
    const d = toDate(v);
    if (!d) return '';
    const ref = toDate(now) || new Date();
    const diffMs = d.getTime() - ref.getTime();
    const future = diffMs > 0;
    const abs = Math.abs(diffMs);
    const sec = Math.round(abs / 1000);
    const min = Math.round(sec / 60);
    const hr = Math.round(min / 60);
    const day = Math.round(hr / 24);
    const units = [
        [sec, 45, 'second'], [min, 45, 'minute'], [hr, 22, 'hour'],
        [day, 26, 'day'], [Math.round(day / 30), 11, 'month'],
        [Math.round(day / 365), Infinity, 'year']
    ];
    if (sec < 10) return 'just now';
    for (const [val, limit, name] of units) {
        if (val < limit) {
            const plural = val === 1 ? name : name + 's';
            return future ? `in ${val} ${plural}` : `${val} ${plural} ago`;
        }
    }
    return '';
}

/**
 * Convert a date to the yyyy-mm-dd string an <input type="date"> expects,
 * using LOCAL date parts (no timezone drift). Invalid/empty -> ''.
 * @param {(string|number|Date)} v Date value.
 * @returns {string} 'yyyy-mm-dd' or ''.
 */
export function formatDateInput(v) {
    const d = toDate(v);
    if (!d) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Today's date as a yyyy-mm-dd string (local).
 * @returns {string} 'yyyy-mm-dd'.
 */
export function todayISO() {
    return formatDateInput(new Date());
}

/**
 * Add days to a date, returning a new Date. Invalid -> null.
 * @param {(string|number|Date)} v Base date.
 * @param {number} days Days to add (may be negative).
 * @returns {(Date|null)} New Date or null.
 */
export function addDays(v, days) {
    const d = toDate(v);
    if (!d) return null;
    const out = new Date(d);
    out.setDate(out.getDate() + Number(days || 0));
    return out;
}

/**
 * Whole calendar days between two dates (b - a), ignoring time-of-day.
 * @param {(string|number|Date)} a Start date.
 * @param {(string|number|Date)} b End date.
 * @returns {(number|null)} Signed day count, or null if either is invalid.
 */
export function daysBetween(a, b) {
    const da = toDate(a);
    const db = toDate(b);
    if (!da || !db) return null;
    const utcA = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
    const utcB = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
    return Math.round((utcB - utcA) / 86400000);
}

/**
 * Start of the week containing the given date (returns a new Date at 00:00).
 * @param {(string|number|Date)} v Date value.
 * @param {number} [weekStartsOn=1] 0=Sunday, 1=Monday (default).
 * @returns {(Date|null)} New Date or null.
 */
export function startOfWeek(v, weekStartsOn = 1) {
    const d = toDate(v);
    if (!d) return null;
    const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = out.getDay();
    const diff = (day - weekStartsOn + 7) % 7;
    out.setDate(out.getDate() - diff);
    return out;
}

/**
 * Format a duration in seconds as mm:ss, or h:mm:ss when >= 1 hour.
 * e.g. formatDuration(3725) === '1:02:05', formatDuration(65) === '1:05'.
 * @param {number} seconds Duration in seconds.
 * @returns {string} Formatted duration ('' for null/invalid).
 */
export function formatDuration(seconds) {
    if (seconds === null || seconds === undefined || !isFinite(seconds)) return '';
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
    return `${m}:${pad2(s)}`;
}

/**
 * Format a number as currency. Invalid -> ''.
 * @param {number} n Amount.
 * @param {string} [currency='USD'] ISO 4217 code.
 * @param {string} [locale='en-US'] BCP-47 locale.
 * @returns {string} Formatted currency or ''.
 */
export function formatCurrency(n, currency = 'USD', locale = 'en-US') {
    if (n === null || n === undefined || isNaN(Number(n))) return '';
    try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(n));
    } catch (e) {
        console.error('[pt-format] formatCurrency error:', e);
        return String(n);
    }
}

/**
 * Format a number with grouping/decimals. Invalid -> ''.
 * @param {number} n Value.
 * @param {Object} [opts] Intl.NumberFormat options.
 * @param {string} [locale='en-US'] BCP-47 locale.
 * @returns {string} Formatted number or ''.
 */
export function formatNumber(n, opts, locale = 'en-US') {
    if (n === null || n === undefined || isNaN(Number(n))) return '';
    try {
        return new Intl.NumberFormat(locale, opts || {}).format(Number(n));
    } catch (e) {
        console.error('[pt-format] formatNumber error:', e);
        return String(n);
    }
}

/**
 * Format a ratio or percentage value. Pass a fraction (0.25) by default,
 * or set alreadyPercent=true to pass 25 directly. Invalid -> ''.
 * @param {number} n Value.
 * @param {number} [decimals=0] Fraction digits.
 * @param {boolean} [alreadyPercent=false] Treat n as a 0-100 percentage already.
 * @returns {string} e.g. '25%'.
 */
export function formatPercent(n, decimals = 0, alreadyPercent = false) {
    if (n === null || n === undefined || isNaN(Number(n))) return '';
    const val = alreadyPercent ? Number(n) : Number(n) * 100;
    return `${val.toFixed(decimals)}%`;
}

/**
 * Format a byte count as a human-readable size (KB/MB/GB, base 1024).
 * @param {number} bytes Byte count.
 * @param {number} [decimals=1] Fraction digits.
 * @returns {string} e.g. '1.5 MB' ('' for invalid).
 */
export function formatBytes(bytes, decimals = 1) {
    if (bytes === null || bytes === undefined || isNaN(Number(bytes))) return '';
    const b = Number(bytes);
    if (b === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.min(Math.floor(Math.log(Math.abs(b)) / Math.log(1024)), units.length - 1);
    return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : decimals)} ${units[i]}`;
}

/**
 * Truncate a string to n characters, appending an ellipsis when cut.
 * @param {*} s Input.
 * @param {number} n Max length (including ellipsis).
 * @param {string} [ellipsis='…'] Suffix when truncated.
 * @returns {string} Truncated string.
 */
export function truncate(s, n, ellipsis = '…') {
    s = s === null || s === undefined ? '' : String(s);
    if (s.length <= n) return s;
    return s.slice(0, Math.max(0, n - ellipsis.length)) + ellipsis;
}

/**
 * Extract up to two uppercase initials from a name.
 * @param {string} name Full name.
 * @returns {string} e.g. 'Jane Doe' -> 'JD' ('' for empty).
 */
export function initials(name) {
    if (!name) return '';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Convert a string to a URL/id-safe slug.
 * @param {*} s Input.
 * @returns {string} e.g. 'Hello World!' -> 'hello-world'.
 */
export function slugify(s) {
    if (s === null || s === undefined) return '';
    return String(s)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Choose a singular/plural word based on count (no number prefix added).
 * @param {number} n Count.
 * @param {string} one Singular form.
 * @param {string} [many] Plural form (defaults to one + 's').
 * @returns {string} The chosen word.
 */
export function pluralize(n, one, many) {
    const plural = many || (one + 's');
    return Number(n) === 1 ? one : plural;
}

/**
 * Title-case a string (capitalise the first letter of each word).
 * @param {*} s Input.
 * @returns {string} Title-cased string.
 */
export function titleCase(s) {
    if (s === null || s === undefined) return '';
    return String(s).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Deterministic HSL colour derived from a seed string — stable across reloads,
 * ideal for avatar/tag backgrounds. Same seed always yields the same colour.
 * @param {*} seed Any string/number.
 * @param {number} [saturation=65] HSL saturation %.
 * @param {number} [lightness=55] HSL lightness %.
 * @returns {string} e.g. 'hsl(210, 65%, 55%)'.
 */
export function hashColor(seed, saturation = 65, lightness = 55) {
    const str = seed === null || seed === undefined ? '' : String(seed);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Case-insensitive alphabetical comparator for Array.prototype.sort.
 * Optionally reads a key from each item.
 * @param {(string|Function)} [key] Property name or accessor fn.
 * @param {boolean} [desc=false] Descending order.
 * @returns {Function} Comparator (a, b) => number.
 */
export function sortAlpha(key, desc = false) {
    const get = typeof key === 'function'
        ? key
        : (key ? (o) => (o == null ? '' : o[key]) : (o) => o);
    const dir = desc ? -1 : 1;
    return (a, b) => {
        const av = String(get(a) == null ? '' : get(a));
        const bv = String(get(b) == null ? '' : get(b));
        return av.localeCompare(bv, undefined, { sensitivity: 'base', numeric: true }) * dir;
    };
}
