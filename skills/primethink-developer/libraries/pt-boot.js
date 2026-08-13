/**
 * pt-boot.js — Startup boilerplate: CDN loading, Tailwind, React mount, pt-ready.
 *
 * PURPOSE
 * -------
 * Every app repeats the same startup dance: pull in a pinned Tailwind build with
 * darkMode:'class', maybe load Chart.js / jsPDF / html2canvas / SortableJS / Quill
 * from a CDN, wait for `pt` to be initialised, then render. These helpers do it
 * once, idempotently, as Promises.
 *
 * DISTILLED FROM:
 *   demo-react/index.js (loadTailwind / loadStylesheet — generalised here),
 *   and the ~90 apps that inline `<script src="https://cdn.tailwindcss.com/...">`
 *   plus per-app CDN scripts (document-review, form-generator, not-linear-app,
 *   people-directory, recurring-calls, life-logger, transcribe-live, etc.).
 *
 * CONSTRAINTS
 * -----------
 *   - Browser-native ES module, no bundler. React & ReactDOM are PLATFORM
 *     GLOBALS — this file never imports them (keeps it JSX-free and buildless).
 *   - mountReact takes an already-created React element (or a factory returning
 *     one) so the JSX lives in your index.js, not here.
 *
 * USAGE (HTML app)
 * ----------------
 *   import { bootApp } from './pt-boot.js';
 *   bootApp({
 *     scripts: [{ src: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js', globalName: 'Chart' }],
 *     onReady: () => renderApp(),   // pt is ready, Tailwind + scripts loaded
 *   });
 *
 * USAGE (React app, from index.js where JSX is allowed)
 * -----------------------------------------------------
 *   import { mountReact } from './pt-boot.js';
 *   mountReact(() => <App />, { styles: ['./styles.css'] });
 */

const loadedScripts = new Map();     // src -> Promise
const loadedStyles = new Map();      // href -> Promise
let tailwindPromise = null;

/**
 * Load a pinned Tailwind Play CDN build and set darkMode:'class' (required so the
 * platform's <html class="dark|light"> is honoured). Idempotent.
 * @param {Object} [opts] Options.
 * @param {string} [opts.version='3.4.16'] Tailwind version to pin.
 * @param {Object} [opts.config] Extra tailwind.config to merge (darkMode forced to 'class').
 * @returns {Promise<boolean>} Resolves true on load, false on failure (app still renders, unstyled).
 */
export function loadTailwind(opts) {
    if (tailwindPromise) return tailwindPromise;
    const options = Object.assign({ version: '3.4.16', config: {} }, opts || {});
    tailwindPromise = new Promise((resolve) => {
        try {
            const s = document.createElement('script');
            s.src = `https://cdn.tailwindcss.com/${options.version}`;
            s.onload = () => {
                try {
                    window.tailwind.config = Object.assign({}, options.config, { darkMode: 'class' });
                } catch (e) {
                    console.error('[pt-boot] tailwind.config error:', e);
                }
                resolve(true);
            };
            s.onerror = () => {
                console.error('[pt-boot] Tailwind CDN failed to load');
                resolve(false);
            };
            document.head.appendChild(s);
        } catch (e) {
            console.error('[pt-boot] loadTailwind error:', e);
            resolve(false);
        }
    });
    return tailwindPromise;
}

/**
 * Load a stylesheet by href (relative hrefs resolve via the platform's base tag).
 * Idempotent per href.
 * @param {string} href Stylesheet URL.
 * @returns {Promise<boolean>} true on load, false on error.
 */
export function loadStylesheet(href) {
    if (loadedStyles.has(href)) return loadedStyles.get(href);
    const p = new Promise((resolve) => {
        try {
            const l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = href;
            l.onload = () => resolve(true);
            l.onerror = () => { console.error('[pt-boot] stylesheet failed:', href); resolve(false); };
            document.head.appendChild(l);
        } catch (e) {
            console.error('[pt-boot] loadStylesheet error:', e);
            resolve(false);
        }
    });
    loadedStyles.set(href, p);
    return p;
}

/**
 * Load an external script once, resolving when ready (and optionally once a named
 * global exists). Safe to call repeatedly with the same src.
 * @param {string} src Script URL (e.g. a CDN build of Chart.js/jsPDF/Sortable/Quill).
 * @param {Object} [opts] Options.
 * @param {string} [opts.globalName] window global to wait for / resolve (e.g. 'Chart').
 * @param {string} [opts.integrity] SRI integrity attribute.
 * @param {string} [opts.crossOrigin='anonymous'] crossorigin attribute.
 * @returns {Promise<*>} Resolves with window[globalName] (or true) when ready.
 */
export function loadScript(src, opts) {
    const options = opts || {};
    if (loadedScripts.has(src)) return loadedScripts.get(src);
    const p = new Promise((resolve, reject) => {
        try {
            // Already present?
            if (options.globalName && typeof window !== 'undefined' && window[options.globalName]) {
                resolve(window[options.globalName]);
                return;
            }
            const s = document.createElement('script');
            s.src = src;
            s.async = false; // preserve execution order across loadScripts
            if (options.integrity) { s.integrity = options.integrity; s.crossOrigin = options.crossOrigin || 'anonymous'; }
            s.onload = () => resolve(options.globalName ? window[options.globalName] : true);
            s.onerror = () => {
                loadedScripts.delete(src);
                const err = new Error('[pt-boot] script failed: ' + src);
                console.error(err.message);
                reject(err);
            };
            document.head.appendChild(s);
        } catch (e) {
            console.error('[pt-boot] loadScript error:', e);
            reject(e);
        }
    });
    loadedScripts.set(src, p);
    return p;
}

/**
 * Load a list of scripts. Each entry is a string src or { src, globalName, integrity }.
 * Loaded in order; resolves with the array of results.
 * @param {Array<(string|Object)>} list Scripts to load.
 * @returns {Promise<Array>} Results in order.
 */
export async function loadScripts(list) {
    const out = [];
    for (const item of (list || [])) {
        const src = typeof item === 'string' ? item : item.src;
        const opts = typeof item === 'string' ? {} : item;
        try {
            out.push(await loadScript(src, opts));
        } catch (e) {
            out.push(null); // keep going; caller can inspect
        }
    }
    return out;
}

/**
 * Wait until the platform-injected `pt` global is initialised (has a chatId).
 * Resolves with `pt`, or with null after the timeout (so apps can degrade
 * gracefully when opened outside PrimeThink).
 * @param {Object} [opts] Options.
 * @param {number} [opts.timeout=10000] Max wait in ms.
 * @param {number} [opts.interval=100] Poll interval in ms.
 * @returns {Promise<(Object|null)>} The pt object, or null on timeout.
 */
export function whenPtReady(opts) {
    const options = Object.assign({ timeout: 10000, interval: 100 }, opts || {});
    return new Promise((resolve) => {
        const ready = () => (typeof pt !== 'undefined' && pt && pt.chatId);
        if (ready()) { resolve(pt); return; }
        let waited = 0;
        const iv = setInterval(() => {
            if (ready()) { clearInterval(iv); resolve(pt); return; }
            waited += options.interval;
            if (waited >= options.timeout) {
                clearInterval(iv);
                console.error('[pt-boot] pt not ready after', options.timeout, 'ms — continuing without it');
                resolve(null);
            }
        }, options.interval);
    });
}

/**
 * Full startup for an HTML app: loads Tailwind (unless disabled), extra styles
 * and scripts, waits for pt, then calls onReady(pt).
 * @param {Object} [cfg] Config.
 * @param {(boolean|Object)} [cfg.tailwind=true] false to skip, or loadTailwind opts.
 * @param {string[]} [cfg.styles] Stylesheet hrefs to load.
 * @param {Array} [cfg.scripts] Scripts for loadScripts.
 * @param {number} [cfg.ptTimeout=10000] whenPtReady timeout.
 * @param {function(Object):void} [cfg.onReady] Called with pt (or null) when ready.
 * @returns {Promise<Object>} { pt, tailwind, styles, scripts } results.
 */
export async function bootApp(cfg) {
    const config = cfg || {};
    try {
        const tasks = [];
        if (config.tailwind !== false) {
            tasks.push(loadTailwind(typeof config.tailwind === 'object' ? config.tailwind : undefined));
        } else {
            tasks.push(Promise.resolve(false));
        }
        tasks.push(Promise.all((config.styles || []).map(loadStylesheet)));
        tasks.push(loadScripts(config.scripts || []));

        const [tailwind, styles, scripts] = await Promise.all(tasks);
        const ptObj = await whenPtReady({ timeout: config.ptTimeout || 10000 });
        if (typeof config.onReady === 'function') {
            try { config.onReady(ptObj); }
            catch (e) { console.error('[pt-boot] onReady threw:', e); showFatalError('App failed to start: ' + e.message); }
        }
        return { pt: ptObj, tailwind, styles, scripts };
    } catch (e) {
        console.error('[pt-boot] bootApp error:', e);
        showFatalError('App failed to start: ' + e.message);
        return { pt: null, tailwind: false, styles: [], scripts: [] };
    }
}

/**
 * Load assets then mount a React app into the platform's #root. React & ReactDOM
 * are platform globals — this never imports them. Call from index.js (where JSX
 * is transpiled) and pass an element or a factory returning one, e.g. () => <App/>.
 * @param {(Object|Function)} appElement A React element, or a zero-arg factory returning one.
 * @param {Object} [opts] Options.
 * @param {(boolean|Object)} [opts.tailwind=true] false to skip, or loadTailwind opts.
 * @param {string[]} [opts.styles] Stylesheet hrefs to load first.
 * @param {string} [opts.rootId='root'] Mount element id.
 * @returns {Promise<Object|null>} The ReactDOM root, or null on failure.
 */
export async function mountReact(appElement, opts) {
    const options = Object.assign({ tailwind: true, styles: [], rootId: 'root' }, opts || {});
    try {
        if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
            throw new Error('React/ReactDOM globals not found (are you inside PrimeThink?)');
        }
        const tasks = [];
        if (options.tailwind !== false) {
            tasks.push(loadTailwind(typeof options.tailwind === 'object' ? options.tailwind : undefined));
        }
        (options.styles || []).forEach((h) => tasks.push(loadStylesheet(h)));
        await Promise.all(tasks);

        const container = document.getElementById(options.rootId);
        if (!container) throw new Error(`mount root #${options.rootId} not found`);
        const element = typeof appElement === 'function' ? appElement() : appElement;
        const root = ReactDOM.createRoot(container);
        root.render(element);
        return root;
    } catch (e) {
        console.error('[pt-boot] mountReact error:', e);
        showFatalError('App failed to start: ' + e.message);
        return null;
    }
}

/**
 * Render a minimal, dependency-free full-screen error message (works even if
 * Tailwind never loaded). Use for unrecoverable startup failures.
 * @param {string} message Message to display.
 */
export function showFatalError(message) {
    try {
        if (typeof document === 'undefined') return;
        const div = document.createElement('div');
        div.setAttribute('role', 'alert');
        div.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
            'padding:2rem;font-family:system-ui,sans-serif;background:#fff;color:#b91c1c;z-index:99999;text-align:center;';
        const inner = document.createElement('div');
        const h = document.createElement('h1');
        h.style.cssText = 'font-size:1.1rem;margin:0 0 .5rem;';
        h.textContent = 'Something went wrong';
        const p = document.createElement('p');
        p.style.cssText = 'font-size:.9rem;color:#374151;margin:0;';
        p.textContent = message == null ? '' : String(message);
        inner.appendChild(h);
        inner.appendChild(p);
        div.appendChild(inner);
        document.body.appendChild(div);
    } catch (e) {
        console.error('[pt-boot] showFatalError error:', e, 'original message:', message);
    }
}
