// ============================================================================
// ptr-router.js — hash-based multi-page routing for React PrimeThink Live Apps.
//
// PURPOSE
//   PrimeThink Live Apps run inside an iframe served at a fixed platform URL, so
//   real path-based (History API) routing is not usable — but the hash fragment
//   IS ours to control and survives reloads. This module turns the ad-hoc
//   "activeTab / showView / hashchange / data-view" view-switching found in the
//   vanilla apps into a small hash router: routes with `/path/:params`, a query
//   string for shareable/reloadable view state, a <Router> that picks the match,
//   accessible <Link>s and <NavTabs>.
//
// GENERALISES THE PATTERNS IN
//   wiki, live-page, document-review, rfp-expert, business-planning-workflow,
//   briefing-insight-builder, crm, life-logger, whats-new,
//   learning-development-platform (all hand-roll view switching / tabs / hash).
//
// PLATFORM CONTRACT
//   * React 18 / ReactDOM are BROWSER GLOBALS — this file never imports 'react'.
//   * NO JSX here (served raw, not transpiled). Components are built with
//     `const h = React.createElement`.
//   * `pt` is optional; only useTitle() touches it, and only when told to.
//   * Hash format:  #/path/segment?key=value&key2=value2
//
// USAGE (from index.js, which MAY use JSX)
//   import { Router, Link, NavTabs, useRoute, useParams, useQueryState, navigate }
//       from './ptr-router.js';
//
//   const routes = [
//       { path: '/',          component: HomeView },
//       { path: '/note/:id',  component: NoteView },   // props.params.id
//       { path: '/settings',  component: SettingsView },
//   ];
//
//   function App() {
//       const { path } = useRoute();
//       return (
//           <div>
//               <NavTabs
//                   items={[{ label: 'Home', value: '/' }, { label: 'Settings', value: '/settings' }]}
//                   current={path}
//                   onChange={navigate}
//               />
//               <Link to="/note/42">Open note 42</Link>
//               <Router routes={routes} fallback={NotFound} />
//           </div>
//       );
//   }
//
//   function NoteView({ params }) {          // path '/note/:id' -> params.id === '42'
//       const [tab, setTab] = useQueryState('tab', 'body');  // #/note/42?tab=body
//       return <h1>Note {params.id} — {tab}</h1>;
//   }
// ============================================================================

const { useState, useEffect, useRef, useCallback } = React;
const h = React.createElement;

// ---------------------------------------------------------------------------
// Hash parsing / building (pure helpers)
// ---------------------------------------------------------------------------

/**
 * Split a location hash into a path + query object.
 * '#/note/42?tab=body' -> { path: '/note/42', query: { tab: 'body' } }
 * @param {string} [hash] - Hash to parse. Defaults to window.location.hash
 *   (pass a string to parse explicitly, e.g. in tests or outside the browser).
 * @returns {{path: string, query: Object<string,string>}}
 */
export function parseHash(hash) {
    let raw = hash != null
        ? String(hash)
        : ((typeof window !== 'undefined' && window.location.hash) || '');
    if (raw.startsWith('#')) raw = raw.slice(1);
    if (!raw) return { path: '/', query: {} };
    const qIndex = raw.indexOf('?');
    let path = qIndex === -1 ? raw : raw.slice(0, qIndex);
    const queryStr = qIndex === -1 ? '' : raw.slice(qIndex + 1);
    if (!path.startsWith('/')) path = '/' + path;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    const query = {};
    if (queryStr) {
        const params = new URLSearchParams(queryStr);
        params.forEach((v, k) => { query[k] = v; });
    }
    return { path, query };
}

/**
 * Build a hash string ('#/path?query') from a path and optional query object.
 * @param {string} path
 * @param {Object<string,*>} [query]
 * @returns {string}
 */
export function buildHash(path, query) {
    let out = path || '/';
    if (!out.startsWith('/')) out = '/' + out;
    if (query && Object.keys(query).length) {
        const params = new URLSearchParams();
        Object.entries(query).forEach(([k, v]) => {
            if (v !== '' && v != null) params.append(k, String(v));
        });
        const qs = params.toString();
        if (qs) out += '?' + qs;
    }
    return '#' + out;
}

/**
 * Match a route pattern with ':params' against a concrete path.
 * matchPath('/note/:id', '/note/42') -> { id: '42' } ; no match -> null.
 * @param {string} pattern
 * @param {string} path
 * @returns {(Object<string,string>|null)}
 */
export function matchPath(pattern, path) {
    const pSeg = pattern.split('/').filter(Boolean);
    const uSeg = path.split('/').filter(Boolean);
    // Support a trailing '*' wildcard segment in the pattern.
    const hasWildcard = pSeg[pSeg.length - 1] === '*';
    if (!hasWildcard && pSeg.length !== uSeg.length) return null;
    if (hasWildcard && uSeg.length < pSeg.length - 1) return null;
    const params = {};
    for (let i = 0; i < pSeg.length; i += 1) {
        const ps = pSeg[i];
        if (ps === '*') return params; // matches the rest
        const us = uSeg[i];
        if (ps.startsWith(':')) {
            params[ps.slice(1)] = decodeURIComponent(us);
        } else if (ps !== us) {
            return null;
        }
    }
    return params;
}

// ---------------------------------------------------------------------------
// Imperative navigation (works outside React too)
// ---------------------------------------------------------------------------

/**
 * Navigate to a hash path. Preserves nothing by default; pass a full path.
 * @param {string} path - e.g. '/note/42' or '/note/42?tab=body'.
 * @param {object} [opts]
 * @param {boolean} [opts.replace=false] - Replace history entry instead of pushing.
 * @param {Object<string,*>} [opts.query] - Query object (merged into the hash).
 */
export function navigate(path, opts = {}) {
    if (typeof window === 'undefined') return;
    let target = path;
    if (opts.query) {
        const [p] = path.split('?');
        target = buildHash(p, opts.query).slice(1); // strip leading '#'
    }
    const hash = target.startsWith('#') ? target : '#' + (target.startsWith('/') ? target : '/' + target);
    if (opts.replace && window.history && window.history.replaceState) {
        window.history.replaceState(null, '', hash);
        // replaceState does not emit hashchange — dispatch so subscribers update.
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
        window.location.hash = hash;
    }
}

/** Go back one entry in browser history. */
export function back() {
    if (typeof window !== 'undefined' && window.history) window.history.back();
}

// ---------------------------------------------------------------------------
// Subscription core — one hashchange listener shared by all hooks
// ---------------------------------------------------------------------------

const _subscribers = new Set();
let _listenerAttached = false;

function _emit() {
    const state = parseHash();
    _subscribers.forEach((cb) => { try { cb(state); } catch (e) { /* isolate */ } });
}

function _ensureListener() {
    if (_listenerAttached || typeof window === 'undefined') return;
    window.addEventListener('hashchange', _emit);
    _listenerAttached = true;
}

/**
 * Subscribe to hash changes. Returns an unsubscribe function.
 * @param {function({path:string, query:object}): void} cb
 * @returns {function(): void}
 */
export function subscribe(cb) {
    _ensureListener();
    _subscribers.add(cb);
    return () => { _subscribers.delete(cb); };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Subscribe to the current route. Re-renders on every hash change.
 * @returns {{path: string, query: Object<string,string>,
 *            navigate: typeof navigate, back: typeof back}}
 */
export function useRoute() {
    const [state, setState] = useState(parseHash);
    useEffect(() => {
        const unsub = subscribe(setState);
        setState(parseHash()); // re-sync in case hash changed before subscribe
        return unsub;
    }, []);
    return { path: state.path, query: state.query, navigate, back };
}

/**
 * Return the path params for the current route given a route pattern. If no
 * pattern is supplied it returns the params captured by the enclosing <Router>
 * (provided via context is not used — pass the pattern explicitly, or read
 * props.params inside a routed component).
 * @param {string} [pattern] - e.g. '/note/:id'. When omitted returns {}.
 * @returns {Object<string,string>}
 */
export function useParams(pattern) {
    const { path } = useRoute();
    if (!pattern) return {};
    return matchPath(pattern, path) || {};
}

/**
 * Two-way bind a single query-string key to state, so a view's sub-state is
 * shareable and survives reload (e.g. the active tab within a page).
 * @param {string} key - Query parameter name.
 * @param {string} [defaultValue=''] - Value used when the key is absent.
 * @returns {[string, function(string): void]} [value, setValue]
 */
export function useQueryState(key, defaultValue = '') {
    const { path, query } = useRoute();
    const value = key in query ? query[key] : defaultValue;
    const set = useCallback((next) => {
        const current = parseHash();
        const merged = { ...current.query };
        if (next === '' || next == null || next === defaultValue) {
            delete merged[key];
        } else {
            merged[key] = next;
        }
        navigate(buildHash(current.path, merged).slice(1), { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, defaultValue]);
    // `path` referenced so lint sees the dependency; value derives from query.
    void path;
    return [value, set];
}

/**
 * Set document.title, and OPTIONALLY rename the chat — but only when
 * `renameChat` is explicitly true (never rename chats implicitly).
 * @param {string} title
 * @param {object} [opts]
 * @param {boolean} [opts.renameChat=false] - When true and pt is available,
 *        call pt.renameChat(title). Off by default by design.
 */
export function useTitle(title, opts = {}) {
    const renameChat = !!opts.renameChat;
    useEffect(() => {
        if (typeof document !== 'undefined' && title) {
            const prev = document.title;
            document.title = title;
            if (renameChat && typeof pt !== 'undefined' && pt && typeof pt.renameChat === 'function') {
                pt.renameChat(title).catch((e) => console.warn('[ptr-router] renameChat failed:', e));
            }
            return () => { document.title = prev; };
        }
        return undefined;
    }, [title, renameChat]);
}

// ---------------------------------------------------------------------------
// Router core
// ---------------------------------------------------------------------------

/**
 * Pick the first matching route for a path. Exact/static routes win over
 * param routes; a wildcard '*' route is tried last.
 * @param {Array<{path:string, component:Function}>} routes
 * @param {string} path
 * @returns {{route: (object|null), params: object}}
 */
export function resolveRoute(routes, path) {
    const list = Array.isArray(routes) ? routes : [];
    // Sort so static segments and fewer params are preferred.
    const scored = list.map((r, i) => {
        const segs = r.path.split('/').filter(Boolean);
        const paramCount = segs.filter((s) => s.startsWith(':') || s === '*').length;
        const wildcard = segs.includes('*') ? 1 : 0;
        return { r, i, score: wildcard * 1000 + paramCount * 10 };
    }).sort((a, b) => a.score - b.score || a.i - b.i);

    for (const { r } of scored) {
        const params = matchPath(r.path, path);
        if (params) return { route: r, params };
    }
    return { route: null, params: {} };
}

/**
 * Build a Router component object (thin factory around <Router>). Handy when
 * you want to fix the routes once and render the returned component repeatedly.
 * @param {Array} routes
 * @param {Function} [fallback] - Component for unmatched paths.
 * @returns {Function} A component: () => element.
 */
export function createRouter(routes, fallback) {
    return function BoundRouter(props) {
        return h(Router, Object.assign({ routes, fallback }, props));
    };
}

/**
 * Hash Router component. Renders the matched route's `component`, passing
 * `{ params, query, navigate }` as props. Falls back to `fallback` (or a plain
 * "Not found" message) when nothing matches. Built with React.createElement.
 * @param {object} props
 * @param {Array<{path:string, component:Function}>} props.routes
 * @param {Function} [props.fallback] - Component rendered for unmatched paths.
 * @param {object} [props.childProps] - Extra props merged into the routed component.
 * @returns {React.ReactElement}
 */
export function Router(props) {
    const { routes, fallback, childProps } = props || {};
    const { path, query } = useRoute();
    const { route, params } = resolveRoute(routes, path);

    if (route && route.component) {
        return h(route.component, Object.assign({ params, query, navigate }, childProps));
    }
    if (fallback) {
        return h(fallback, Object.assign({ path, query, navigate }, childProps));
    }
    return h(
        'div',
        { className: 'p-6 text-sm text-gray-500 dark:text-gray-400' },
        h('p', { className: 'font-medium mb-1' }, 'Page not found'),
        h('code', { className: 'font-mono text-xs' }, path)
    );
}

// ---------------------------------------------------------------------------
// Link — accessible anchor that navigates via the hash
// ---------------------------------------------------------------------------

/**
 * Accessible link that navigates to a hash route. Renders a real
 * <a href="#/path"> (so middle-click / copy-link work) and intercepts left
 * clicks to call navigate(). Keyboard activation via the native anchor.
 * @param {object} props
 * @param {string} props.to - Target path (e.g. '/note/42').
 * @param {boolean} [props.replace=false] - Replace instead of push.
 * @param {Object<string,*>} [props.query] - Query object to append.
 * @param {string} [props.className]
 * @param {boolean} [props.active] - When true, adds aria-current="page".
 * @param {*} [props.children]
 * @returns {React.ReactElement}
 */
export function Link(props) {
    const { to, replace = false, query, className, active, children, onClick, ...rest } = props || {};
    const href = query ? buildHash(to, query) : ('#' + (to && to.startsWith('/') ? to : '/' + (to || '')));
    const handle = useCallback((e) => {
        // Respect modifier clicks / non-left buttons (open in new tab etc.)
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to, { replace, query });
        if (onClick) onClick(e);
    }, [to, replace, query, onClick]);

    return h('a', Object.assign({
        href,
        onClick: handle,
        className,
        'aria-current': active ? 'page' : undefined,
    }, rest), children);
}

// ---------------------------------------------------------------------------
// NavTabs — a tab/segment bar wired to navigation
// ---------------------------------------------------------------------------

/**
 * A horizontal tab bar. Each item is { label, value, icon? }. Calls
 * onChange(value) when a tab is clicked; the tab whose value equals `current`
 * is styled active. Built with createElement; Tailwind classes include dark:.
 * @param {object} props
 * @param {Array<{label:string, value:string, icon?:*}>} props.items
 * @param {string} props.current - The active value (e.g. a path or a key).
 * @param {function(string): void} props.onChange - Usually `navigate`.
 * @param {string} [props.className] - Extra classes for the wrapper.
 * @returns {React.ReactElement}
 */
export function NavTabs(props) {
    const { items, current, onChange, className } = props || {};
    const list = Array.isArray(items) ? items : [];
    const base = 'flex gap-1 border-b border-gray-200 dark:border-gray-700 ' + (className || '');
    return h(
        'nav',
        { className: base, role: 'tablist' },
        list.map((it, i) => {
            // `value` is the documented field; tolerate `path`/`id` so the tab bar
            // never renders with an undefined React key.
            const value = it.value != null ? it.value : (it.path != null ? it.path : it.id);
            const isActive = value === current;
            const cls = [
                'px-4 py-2 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition',
                'focus:outline-none focus:ring-2 focus:ring-sky-500',
                isActive
                    ? 'border-sky-600 text-sky-600 dark:text-sky-400 dark:border-sky-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200',
            ].join(' ');
            return h(
                'button',
                {
                    key: value != null ? String(value) : String(i),
                    type: 'button',
                    role: 'tab',
                    'aria-selected': isActive ? 'true' : 'false',
                    className: cls,
                    onClick: () => onChange && onChange(value),
                },
                it.icon != null ? h('span', { className: 'mr-1.5', 'aria-hidden': 'true' }, it.icon) : null,
                it.label
            );
        })
    );
}
