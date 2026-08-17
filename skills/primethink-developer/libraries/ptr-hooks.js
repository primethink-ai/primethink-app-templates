// ============================================================================
// ptr-hooks.js — React data layer for PrimeThink Live Apps (page_type "react").
//
// PURPOSE
//   Turns the recurring "load a collection, keep it live-synced, CRUD it,
//   filter/sort/paginate it" behaviour found across the vanilla-JS apps into a
//   small set of reusable hooks, plus the usual timing/async utilities every
//   app re-implements (debounce, interval, async runner, in-memory drafts).
//
// GENERALISES THE PATTERNS IN
//   List + CRUD + live-sync ... todo-list, kanban-board, crm, feedback-tracker,
//                               people-directory, task-tracker, roadmap-management,
//                               internal-tools-registry
//   Filter / search / sort ..... crm, people-directory, bank-transactions-manager,
//                               form-submissions-admin, estate-agent-leads-dashboard
//   Settings singleton ......... apps that keep one "settings"/"config" entity
//
// PLATFORM CONTRACT
//   * React 18 + ReactDOM are BROWSER GLOBALS. This file NEVER imports 'react';
//     it reads the hooks off the global `React`.
//   * `pt` is a platform global; every call is guarded so the app still renders
//     (in local, non-persisting mode) when opened outside PrimeThink.
//   * NO JSX in this file — it is served raw (only index.js is transpiled). It
//     is hooks-only; the one place we build elements uses React.createElement.
//   * This library talks to `pt` directly (zero coupling to pt-data.js) so it is
//     safe to ship on its own.
//
// USAGE (from index.js, which MAY use JSX)
//   import { usePt, usePtCollection, useFilteredList, usePagination,
//            useDebouncedValue } from './ptr-hooks.js';
//
//   function App() {
//       const { ptAvailable, currentUser } = usePt();
//       const todos = usePtCollection('todo', { sort: { field: 'created_at', dir: 'desc' } });
//       const [q, setQ] = React.useState('');
//       const query = useDebouncedValue(q, 250);
//       const filtered = useFilteredList(todos.items, { query, fields: ['data.text'] });
//       const page = usePagination(filtered, 20);
//
//       if (todos.loading) return <p>Loading…</p>;
//       return (
//           <div>
//               <input value={q} onChange={e => setQ(e.target.value)} />
//               {page.items.map(t => (
//                   <label key={t.id}>
//                       <input type="checkbox" checked={t.data.done}
//                              onChange={() => todos.update(t.id, { done: !t.data.done })} />
//                       {t.data.text}
//                   </label>
//               ))}
//               <button onClick={() => todos.add({ text: 'New', done: false })}>Add</button>
//               <button disabled={!page.hasNext} onClick={page.next}>Next</button>
//           </div>
//       );
//   }
// ============================================================================

const { useState, useEffect, useRef, useCallback, useMemo } = React;

/** True when the PrimeThink `pt` global is present (i.e. running in-platform). */
export const ptAvailable = typeof pt !== 'undefined' && pt !== null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a pt.list() result to a plain array. pt.list returns either the
 * array directly or `{ entities, pagination, ... }` depending on options.
 * @param {*} res - Raw pt.list() result.
 * @returns {Array} The entities array (never null).
 */
export function normList(res) {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.entities)) return res.entities;
    return [];
}

/**
 * Normalise the various shapes pt.add()/pt.edit() may return to a single entity.
 * @param {*} res - Raw create/edit result.
 * @returns {object|*} The entity object when discoverable, else the raw result.
 */
export function normEntity(res) {
    if (!res) return res;
    if (res.entity) return res.entity;
    if (res.result && res.result.entity) return res.result.entity;
    return res;
}

/**
 * Coerce an id that may arrive as a string (from DOM attributes / route params)
 * into a number when it is numeric, leaving non-numeric ids untouched.
 * @param {(string|number)} id
 * @returns {(string|number)}
 */
export function toId(id) {
    if (typeof id === 'number') return id;
    if (typeof id === 'string' && id.trim() !== '' && !Number.isNaN(Number(id))) {
        return Number(id);
    }
    return id;
}

/**
 * Read a dotted path from an object, e.g. getPath(entity, 'data.text').
 * @param {object} obj
 * @param {string} path - Dot-separated property path.
 * @returns {*} The value, or undefined.
 */
function getPath(obj, path) {
    if (!obj) return undefined;
    if (path.indexOf('.') === -1) return obj[path];
    return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

/** Compare helper for sort; handles strings, numbers, dates, null. */
function compareValues(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    const as = String(a);
    const bs = String(b);
    return as.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' });
}

// ---------------------------------------------------------------------------
// usePt — platform context, cached module-level so remounts don't refetch.
// ---------------------------------------------------------------------------

let _ptContextCache = null;   // resolved { ptAvailable, chatInfo, members, currentUser, role }
let _ptContextPromise = null; // in-flight load, so concurrent mounts share one fetch

async function _loadPtContext() {
    if (!ptAvailable) {
        return { ptAvailable: false, chatInfo: null, members: [], currentUser: null, role: null };
    }
    const [membersRes, infoRes, roleRes] = await Promise.all([
        pt.getChatMembers().catch(() => []),
        pt.getChatInfo().catch(() => null),
        (typeof pt.getUserRole === 'function' ? pt.getUserRole() : Promise.resolve(null)).catch(() => null),
    ]);
    const members = Array.isArray(membersRes) ? membersRes : [];
    const currentUser = members.find((m) => m && m.is_logged_user) || null;
    return { ptAvailable: true, chatInfo: infoRes, members, currentUser, role: roleRes };
}

/**
 * Load platform context once (chat info, members, current user, role) and cache
 * it at module scope so remounting components never refetch.
 * @returns {{ptAvailable: boolean, chatInfo: (object|null), members: Array,
 *            currentUser: (object|null), role: (object|null), loading: boolean,
 *            error: (Error|null)}}
 */
export function usePt() {
    const [ctx, setCtx] = useState(_ptContextCache);
    const [loading, setLoading] = useState(!_ptContextCache);
    const [error, setError] = useState(null);

    useEffect(() => {
        let alive = true;
        if (_ptContextCache) { setCtx(_ptContextCache); setLoading(false); return; }
        if (!_ptContextPromise) _ptContextPromise = _loadPtContext();
        setLoading(true);
        _ptContextPromise.then((c) => {
            _ptContextCache = c;
            if (alive) { setCtx(c); setLoading(false); }
        }).catch((e) => {
            _ptContextPromise = null; // allow retry on next mount
            if (alive) { setError(e); setLoading(false); }
        });
        return () => { alive = false; };
    }, []);

    return {
        ptAvailable,
        chatInfo: ctx ? ctx.chatInfo : null,
        members: ctx ? ctx.members : [],
        currentUser: ctx ? ctx.currentUser : null,
        role: ctx ? ctx.role : null,
        loading,
        error,
    };
}

/**
 * Convenience wrapper returning only the cached chat members array.
 * @returns {Array} Chat members (empty until loaded / when pt is unavailable).
 */
export function usePtMembers() {
    return usePt().members;
}

// ---------------------------------------------------------------------------
// Timing / lifecycle utilities
// ---------------------------------------------------------------------------

/**
 * Run a callback exactly once after mount (like componentDidMount). If the
 * callback returns a function it is used as the unmount cleanup.
 * @param {function(): (void|function())} fn
 */
export function useOnMount(fn) {
    const ref = useRef(fn);
    ref.current = fn;
    useEffect(() => {
        const cleanup = ref.current && ref.current();
        return typeof cleanup === 'function' ? cleanup : undefined;
    }, []);
}

/**
 * Call `fn` every `ms` milliseconds using a self-cleaning interval. Pass
 * `ms == null` to pause. The latest `fn` is always used without resetting the timer.
 * @param {function(): void} fn
 * @param {(number|null)} ms
 */
export function useInterval(fn, ms) {
    const saved = useRef(fn);
    saved.current = fn;
    useEffect(() => {
        if (ms == null) return undefined;
        const id = setInterval(() => saved.current && saved.current(), ms);
        return () => clearInterval(id);
    }, [ms]);
}

/**
 * Debounce a value: returns the latest `value` only after it has been stable
 * for `ms` milliseconds. Ideal for search-as-you-type inputs.
 * @template T
 * @param {T} value
 * @param {number} [ms=250]
 * @returns {T}
 */
export function useDebouncedValue(value, ms = 250) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), ms);
        return () => clearTimeout(id);
    }, [value, ms]);
    return debounced;
}

/**
 * Return a debounced version of `fn` that only fires after `ms` of inactivity.
 * The timer is cleared on unmount. The returned function keeps a stable identity.
 * @param {function(...*): void} fn
 * @param {number} [ms=250]
 * @returns {function(...*): void}
 */
export function useDebouncedCallback(fn, ms = 250) {
    const saved = useRef(fn);
    saved.current = fn;
    const timer = useRef(null);
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    return useCallback((...args) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => saved.current && saved.current(...args), ms);
    }, [ms]);
}

/**
 * Run an async function on demand and track its lifecycle. State never updates
 * after unmount. Optionally re-runs automatically when `deps` change.
 * @template T
 * @param {function(...*): Promise<T>} fn - Async worker; receives run() args.
 * @param {Array} [deps=null] - When an array, auto-runs on mount and dep changes.
 * @returns {{data: (T|null), loading: boolean, error: (Error|null),
 *            run: function(...*): Promise<T|undefined>}}
 */
export function useAsync(fn, deps = null) {
    const [state, setState] = useState({ data: null, loading: false, error: null });
    const alive = useRef(true);
    const fnRef = useRef(fn);
    fnRef.current = fn;
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

    const run = useCallback(async (...args) => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const data = await fnRef.current(...args);
            if (alive.current) setState({ data, loading: false, error: null });
            return data;
        } catch (error) {
            if (alive.current) setState((s) => ({ ...s, loading: false, error }));
            return undefined;
        }
    }, []);

    useEffect(() => {
        if (Array.isArray(deps)) run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, Array.isArray(deps) ? deps : []);

    return { ...state, run };
}

/**
 * An IN-MEMORY draft value scoped to the component's lifetime, keyed by `key`.
 * Explicitly NOT localStorage — drafts live in a module-level Map so they
 * survive a remount within the same page session but are never persisted to
 * disk (per repo rules, only theme may use localStorage). Cleared on reload.
 * @template T
 * @param {string} key - Stable draft key (e.g. 'new-note').
 * @param {T} initial - Initial value used when no draft exists yet.
 * @returns {[T, function(T): void, function(): void]} [value, setValue, clear]
 */
const _draftStore = new Map();
export function useLocalDraft(key, initial) {
    const [value, setValue] = useState(() =>
        _draftStore.has(key) ? _draftStore.get(key) : initial
    );
    const set = useCallback((next) => {
        setValue((prev) => {
            const resolved = typeof next === 'function' ? next(prev) : next;
            _draftStore.set(key, resolved);
            return resolved;
        });
    }, [key]);
    const clear = useCallback(() => {
        _draftStore.delete(key);
        setValue(initial);
    }, [key, initial]);
    return [value, set, clear];
}

// ---------------------------------------------------------------------------
// usePtCollection — the workhorse: load, live-sync, CRUD, reorder.
// ---------------------------------------------------------------------------

/**
 * Load and manage a collection of entities of one `entityName`, with real-time
 * refresh (debounced pt.onEntityChanged) and optimistic CRUD helpers. All
 * effects clean up on unmount and no state is set after unmount.
 *
 * @param {string} entityName - The entity type to load (e.g. 'todo').
 * @param {object} [options]
 * @param {object} [options.filters] - Passed straight to pt.list filters.
 * @param {number} [options.limit=1000] - Max rows to fetch.
 * @param {{field: string, dir?: ('asc'|'desc')}} [options.sort] - Client-side sort
 *        (field is a dotted path, e.g. 'data.order' or 'created_at').
 * @param {boolean} [options.live=true] - Subscribe to pt.onEntityChanged.
 * @param {function(object): object} [options.transform] - Map each entity before storing.
 * @param {number} [options.debounceMs=150] - Debounce window for live refreshes.
 * @returns {{
 *   items: Array, loading: boolean, error: (Error|null), busy: boolean,
 *   refresh: function(): Promise<void>,
 *   add: function(object): Promise<object|undefined>,
 *   update: function((string|number), object, boolean=): Promise<object|undefined>,
 *   remove: function((string|number)): Promise<void>,
 *   reorder: function(Array<(string|number)>, string=): Promise<void>
 * }}
 */
export function usePtCollection(entityName, options = {}) {
    const {
        filters = undefined,
        limit = 1000,
        sort = null,
        live = true,
        transform = null,
        debounceMs = 150,
    } = options;

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(ptAvailable);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const alive = useRef(true);

    // Keep option references stable across renders for the load callback.
    const filtersKey = JSON.stringify(filters || null);
    const sortKey = JSON.stringify(sort || null);
    const transformRef = useRef(transform);
    transformRef.current = transform;

    const applySort = useCallback((arr) => {
        if (!sort || !sort.field) return arr;
        const dir = sort.dir === 'desc' ? -1 : 1;
        return arr.slice().sort((a, b) =>
            compareValues(getPath(a, sort.field), getPath(b, sort.field)) * dir
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortKey]);

    const refresh = useCallback(async () => {
        if (!ptAvailable) { setLoading(false); return; }
        try {
            const res = await pt.list({ entityNames: [entityName], filters, limit });
            let rows = normList(res);
            if (transformRef.current) rows = rows.map(transformRef.current);
            rows = applySort(rows);
            if (alive.current) { setItems(rows); setError(null); }
        } catch (e) {
            if (alive.current) setError(e);
        } finally {
            if (alive.current) setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityName, filtersKey, limit, applySort]);

    // Initial load + live subscription (debounced), with full cleanup.
    useEffect(() => {
        alive.current = true;
        setLoading(ptAvailable);
        refresh();

        let unsub = null;
        let timer = null;
        if (ptAvailable && live && typeof pt.onEntityChanged === 'function') {
            const debounced = () => {
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => { if (alive.current) refresh(); }, debounceMs);
            };
            try {
                // No host-side { entityName } filter: the host only stamps
                // entity_name on 'inserted' events, so a filtered subscription
                // misses updates/deletes (other users' and AI edits). Filter
                // inserts client-side; name-less events always refresh.
                unsub = pt.onEntityChanged((event) => {
                    if (event && event.entity_name && event.entity_name !== entityName) return;
                    debounced();
                });
            } catch (e) {
                // onEntityChanged unavailable — polling/refresh still works manually
                console.warn('[ptr-hooks] onEntityChanged failed:', e);
            }
        }
        return () => {
            alive.current = false;
            if (timer) clearTimeout(timer);
            if (typeof unsub === 'function') unsub();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh, live, debounceMs]);

    const add = useCallback(async (data) => {
        if (!ptAvailable) {
            const stub = { id: Date.now(), entity_name: entityName, data };
            setItems((prev) => applySort([...prev, stub]));
            return stub;
        }
        setBusy(true);
        try {
            const created = normEntity(await pt.add(entityName, data));
            await refresh();
            return created;
        } finally { if (alive.current) setBusy(false); }
    }, [entityName, refresh, applySort]);

    const update = useCallback(async (id, patch, merge = true) => {
        const rid = toId(id);
        // Optimistic local patch for snappy UI; refresh reconciles with server.
        setItems((prev) => applySort(prev.map((it) =>
            it.id === rid ? { ...it, data: merge ? { ...it.data, ...patch } : patch } : it
        )));
        if (!ptAvailable) return undefined;
        setBusy(true);
        try {
            const res = normEntity(await pt.edit(rid, patch, merge));
            await refresh();
            return res;
        } finally { if (alive.current) setBusy(false); }
    }, [refresh, applySort]);

    const remove = useCallback(async (id) => {
        const rid = toId(id);
        setItems((prev) => prev.filter((it) => it.id !== rid)); // optimistic
        if (!ptAvailable) return;
        setBusy(true);
        try {
            await pt.delete(rid);
            await refresh();
        } finally { if (alive.current) setBusy(false); }
    }, [refresh]);

    /**
     * Persist a new order by writing `orderField` (default 'order') = index for
     * the supplied id list. Uses pt.batchEdit when available, else sequential edits.
     */
    const reorder = useCallback(async (orderedIds, orderField = 'order') => {
        const ids = orderedIds.map(toId);
        // Optimistic reorder locally.
        setItems((prev) => {
            const byId = new Map(prev.map((it) => [it.id, it]));
            const next = ids.map((id, i) => {
                const it = byId.get(id);
                return it ? { ...it, data: { ...it.data, [orderField]: i } } : null;
            }).filter(Boolean);
            // append any not in the ordered list
            prev.forEach((it) => { if (!ids.includes(it.id)) next.push(it); });
            return next;
        });
        if (!ptAvailable) return;
        setBusy(true);
        try {
            const payload = ids.map((id, i) => ({ id, data: { [orderField]: i }, merge: true }));
            if (typeof pt.batchEdit === 'function') {
                await pt.batchEdit(payload);
            } else {
                for (const p of payload) await pt.edit(p.id, p.data, true);
            }
            await refresh();
        } finally { if (alive.current) setBusy(false); }
    }, [refresh]);

    return { items, loading, error, busy, refresh, add, update, remove, reorder };
}

// ---------------------------------------------------------------------------
// usePtEntity — a single entity by id, kept live.
// ---------------------------------------------------------------------------

/**
 * Load a single entity by id via pt.get (fast primary-key lookup) and keep it
 * live-synced. Returns update/remove helpers scoped to that entity.
 * @param {(string|number|null)} id - Entity id, or null/undefined to load nothing.
 * @returns {{entity: (object|null), loading: boolean, error: (Error|null),
 *            refresh: function(): Promise<void>,
 *            update: function(object, boolean=): Promise<object|undefined>,
 *            remove: function(): Promise<void>}}
 */
export function usePtEntity(id) {
    const rid = id == null ? null : toId(id);
    const [entity, setEntity] = useState(null);
    const [loading, setLoading] = useState(ptAvailable && rid != null);
    const [error, setError] = useState(null);
    const alive = useRef(true);

    const refresh = useCallback(async () => {
        if (!ptAvailable || rid == null) { setLoading(false); return; }
        try {
            const res = await pt.get(rid);
            if (alive.current) { setEntity(normEntity(res)); setError(null); }
        } catch (e) {
            if (alive.current) setError(e);
        } finally {
            if (alive.current) setLoading(false);
        }
    }, [rid]);

    useEffect(() => {
        alive.current = true;
        setLoading(ptAvailable && rid != null);
        refresh();
        let unsub = null;
        if (ptAvailable && rid != null && typeof pt.onEntityChanged === 'function') {
            try {
                unsub = pt.onEntityChanged(() => { if (alive.current) refresh(); }, { entityId: rid });
            } catch (e) { /* ignore — manual refresh still works */ }
        }
        return () => {
            alive.current = false;
            if (typeof unsub === 'function') unsub();
        };
    }, [rid, refresh]);

    const update = useCallback(async (patch, merge = true) => {
        if (rid == null) return undefined;
        setEntity((e) => (e ? { ...e, data: merge ? { ...e.data, ...patch } : patch } : e));
        if (!ptAvailable) return undefined;
        const res = normEntity(await pt.edit(rid, patch, merge));
        await refresh();
        return res;
    }, [rid, refresh]);

    const remove = useCallback(async () => {
        if (rid == null || !ptAvailable) return;
        await pt.delete(rid);
    }, [rid]);

    return { entity, loading, error, refresh, update, remove };
}

// ---------------------------------------------------------------------------
// usePtSingleton — the "one settings/config record" pattern.
// ---------------------------------------------------------------------------

/**
 * Manage a single-record entity (settings, config, profile). Loads the first
 * row of `entityName`, creating it from `defaults` on first save if missing.
 * The returned `data` merges defaults with the stored values.
 * @param {string} entityName - The singleton entity type (e.g. 'settings').
 * @param {object} [defaults={}] - Default field values.
 * @returns {{data: object, entity: (object|null), loading: boolean,
 *            error: (Error|null), save: function(object): Promise<object|undefined>,
 *            refresh: function(): Promise<void>}}
 */
export function usePtSingleton(entityName, defaults = {}) {
    const [entity, setEntity] = useState(null);
    const [loading, setLoading] = useState(ptAvailable);
    const [error, setError] = useState(null);
    const alive = useRef(true);
    const defaultsRef = useRef(defaults);
    defaultsRef.current = defaults;

    const refresh = useCallback(async () => {
        if (!ptAvailable) { setLoading(false); return; }
        try {
            const res = await pt.list({ entityNames: [entityName], limit: 1 });
            const row = normList(res)[0] || null;
            if (alive.current) { setEntity(row); setError(null); }
        } catch (e) {
            if (alive.current) setError(e);
        } finally {
            if (alive.current) setLoading(false);
        }
    }, [entityName]);

    useEffect(() => {
        alive.current = true;
        setLoading(ptAvailable);
        refresh();
        let unsub = null;
        if (ptAvailable && typeof pt.onEntityChanged === 'function') {
            try {
                // Unfiltered subscription — same reason as usePtCollection:
                // update/delete events carry no entity_name and a host-side
                // { entityName } filter would drop them.
                unsub = pt.onEntityChanged((event) => {
                    if (event && event.entity_name && event.entity_name !== entityName) return;
                    if (alive.current) refresh();
                });
            } catch (e) { /* ignore */ }
        }
        return () => {
            alive.current = false;
            if (typeof unsub === 'function') unsub();
        };
    }, [entityName, refresh]);

    /**
     * Save (merge) fields into the singleton, creating it on first save.
     * @param {object} patch - Fields to write.
     */
    const save = useCallback(async (patch) => {
        if (!ptAvailable) {
            setEntity((e) => ({ ...(e || { entity_name: entityName }), data: { ...(e && e.data), ...patch } }));
            return undefined;
        }
        let current = entity;
        if (!current) {
            // Re-check to avoid duplicate creation on races.
            const res = await pt.list({ entityNames: [entityName], limit: 1 });
            current = normList(res)[0] || null;
        }
        let saved;
        if (current && current.id != null) {
            saved = normEntity(await pt.edit(current.id, patch, true));
        } else {
            saved = normEntity(await pt.add(entityName, { ...defaultsRef.current, ...patch }));
        }
        await refresh();
        return saved;
    }, [entity, entityName, refresh]);

    const data = useMemo(
        () => ({ ...defaultsRef.current, ...((entity && entity.data) || {}) }),
        [entity]
    );

    return { data, entity, loading, error, save, refresh };
}

// ---------------------------------------------------------------------------
// Client-side filtering / sorting / pagination (pure UI state).
// ---------------------------------------------------------------------------

/**
 * Derive a filtered + sorted view of `items` from search/filter/sort UI state.
 * Pure and memoised — safe to call every render.
 * @param {Array} items - Source rows (typically usePtCollection().items).
 * @param {object} [opts]
 * @param {string} [opts.query=''] - Free-text query (case-insensitive substring).
 * @param {Array<string>} [opts.fields] - Dotted paths to search (e.g. ['data.name']).
 *        Defaults to searching every string field under `data`.
 * @param {Object<string, *>} [opts.filters] - Exact-match filters keyed by dotted path.
 *        A value of '' / null / undefined / 'all' means "no filter" for that key.
 * @param {{field: string, dir?: ('asc'|'desc')}} [opts.sort] - Sort spec.
 * @returns {Array} The filtered/sorted array (new reference only when inputs change).
 */
export function useFilteredList(items, opts = {}) {
    const { query = '', fields, filters, sort } = opts;
    const fieldsKey = JSON.stringify(fields || null);
    const filtersKey = JSON.stringify(filters || null);
    const sortKey = JSON.stringify(sort || null);

    return useMemo(() => {
        let out = Array.isArray(items) ? items.slice() : [];

        // Exact-match filters
        if (filters) {
            const active = Object.entries(filters).filter(
                ([, v]) => v !== '' && v != null && v !== 'all'
            );
            if (active.length) {
                out = out.filter((it) =>
                    active.every(([k, v]) => String(getPath(it, k)) === String(v))
                );
            }
        }

        // Free-text search
        const q = (query || '').trim().toLowerCase();
        if (q) {
            out = out.filter((it) => {
                if (fields && fields.length) {
                    return fields.some((f) => {
                        const val = getPath(it, f);
                        return val != null && String(val).toLowerCase().includes(q);
                    });
                }
                const data = it && it.data;
                if (!data) return false;
                return Object.values(data).some(
                    (v) => typeof v === 'string' && v.toLowerCase().includes(q)
                );
            });
        }

        // Sort
        if (sort && sort.field) {
            const dir = sort.dir === 'desc' ? -1 : 1;
            out.sort((a, b) => compareValues(getPath(a, sort.field), getPath(b, sort.field)) * dir);
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, query, fieldsKey, filtersKey, sortKey]);
}

/**
 * Paginate an array with page UI state. Resets to page 0 when the source length
 * changes so filtering never strands the user on an empty page.
 * @param {Array} items - The (already filtered) rows to paginate.
 * @param {number} [pageSize=20]
 * @returns {{items: Array, page: number, pageCount: number, total: number,
 *            hasPrev: boolean, hasNext: boolean, setPage: function(number): void,
 *            next: function(): void, prev: function(): void}}
 */
export function usePagination(items, pageSize = 20) {
    const list = Array.isArray(items) ? items : [];
    const total = list.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const [page, setPage] = useState(0);

    useEffect(() => {
        if (page > pageCount - 1) setPage(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageCount]);

    const clampedPage = Math.min(page, pageCount - 1);
    const start = clampedPage * pageSize;
    const pageItems = useMemo(
        () => list.slice(start, start + pageSize),
        [list, start, pageSize]
    );

    const next = useCallback(() => setPage((p) => Math.min(p + 1, pageCount - 1)), [pageCount]);
    const prev = useCallback(() => setPage((p) => Math.max(p - 1, 0)), []);

    return {
        items: pageItems,
        page: clampedPage,
        pageCount,
        total,
        hasPrev: clampedPage > 0,
        hasNext: clampedPage < pageCount - 1,
        setPage,
        next,
        prev,
    };
}
