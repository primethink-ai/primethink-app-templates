/**
 * pt-theme.js — Dark-mode / theme management for PrimeThink Live Apps.
 *
 * PURPOSE
 * -------
 * Standardises the toggleTheme/initTheme pattern copied into most apps. It
 * respects the platform's own `dark`/`light` class on <html> (the platform sets
 * one), supports an explicit light/dark choice or 'system' (prefers-color-scheme),
 * and keeps everything in sync.
 *
 * DISTILLED FROM: pt-lite.js (theme object) plus the many apps that grep-match
 *   toggleTheme/initTheme (todo-list, kanban-board, wiki, crm, life-logger, etc.).
 *
 * ⚠️ localStorage POLICY ⚠️
 * -------------------------
 * This is the ONE AND ONLY module in the whole library set permitted to use
 * localStorage, and ONLY for the user's device-local theme preference under the
 * key 'pt-theme'. NEVER store app/shared data in localStorage — it is invisible
 * to other chat participants and to the AI. Use the chat DB (pt.add/edit/list)
 * for everything else.
 *
 * USAGE
 * -----
 *   import { initTheme, toggleTheme, isDark, onThemeChange } from './pt-theme.js';
 *   initTheme();                          // call once at startup
 *   button.onclick = () => toggleTheme();
 *   onThemeChange((mode, dark) => updateIcon(dark));
 */

/** localStorage key holding the theme preference. The only permitted key. */
export const THEME_STORAGE_KEY = 'pt-theme';

const VALID = ['light', 'dark', 'system'];
const listeners = new Set();
let mql = null; // MediaQueryList for prefers-color-scheme

function readStored() {
    try {
        const v = localStorage.getItem(THEME_STORAGE_KEY);
        return VALID.includes(v) ? v : 'system';
    } catch (e) {
        console.error('[pt-theme] localStorage read failed:', e);
        return 'system';
    }
}

function writeStored(mode) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
        console.error('[pt-theme] localStorage write failed:', e);
    }
}

function systemPrefersDark() {
    try {
        return typeof matchMedia !== 'undefined'
            && matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {
        return false;
    }
}

/* Resolve the effective dark boolean for a given preference. */
function resolveDark(mode) {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return systemPrefersDark();
}

/* Apply the effective theme to <html> and notify listeners. */
function apply(mode) {
    const dark = resolveDark(mode);
    try {
        const root = document.documentElement;
        root.classList.toggle('dark', dark);
        root.classList.toggle('light', !dark);
    } catch (e) {
        console.error('[pt-theme] apply error:', e);
    }
    listeners.forEach((cb) => {
        try { cb(mode, dark); } catch (e) { console.error('[pt-theme] listener error:', e); }
    });
    return dark;
}

/**
 * Initialise theme handling: applies the stored preference (or 'system') and,
 * while in 'system' mode, follows OS changes live. Call once at startup.
 * @returns {string} The active preference ('light' | 'dark' | 'system').
 */
export function initTheme() {
    const mode = readStored();
    apply(mode);
    try {
        if (typeof matchMedia !== 'undefined' && !mql) {
            mql = matchMedia('(prefers-color-scheme: dark)');
            const handler = () => { if (getTheme() === 'system') apply('system'); };
            if (mql.addEventListener) mql.addEventListener('change', handler);
            else if (mql.addListener) mql.addListener(handler); // older Safari
        }
    } catch (e) {
        console.error('[pt-theme] matchMedia subscribe failed:', e);
    }
    return mode;
}

/**
 * Get the stored theme preference.
 * @returns {string} 'light' | 'dark' | 'system'.
 */
export function getTheme() {
    return readStored();
}

/**
 * Set and persist the theme preference, applying it immediately.
 * @param {string} mode 'light' | 'dark' | 'system'.
 * @returns {boolean} The resulting effective dark state.
 */
export function setTheme(mode) {
    if (!VALID.includes(mode)) {
        console.error('[pt-theme] invalid theme:', mode, '(expected light|dark|system)');
        mode = 'system';
    }
    writeStored(mode);
    return apply(mode);
}

/**
 * Toggle between light and dark. If currently 'system', switches to the
 * explicit opposite of what's showing.
 * @returns {boolean} The resulting effective dark state.
 */
export function toggleTheme() {
    return setTheme(isDark() ? 'light' : 'dark');
}

/**
 * Whether dark mode is currently effective (reads the <html> class, falling
 * back to the resolved preference).
 * @returns {boolean} True if dark.
 */
export function isDark() {
    try {
        if (document && document.documentElement.classList.contains('dark')) return true;
        if (document && document.documentElement.classList.contains('light')) return false;
    } catch (e) { /* non-browser */ }
    return resolveDark(readStored());
}

/**
 * Subscribe to theme changes. Callback receives (mode, isDark).
 * @param {function(string, boolean):void} cb Change handler.
 * @returns {function():void} Unsubscribe function.
 */
export function onThemeChange(cb) {
    if (typeof cb !== 'function') return () => {};
    listeners.add(cb);
    return () => listeners.delete(cb);
}
