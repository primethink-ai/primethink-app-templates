/*!
 * pt-data.js — The entity data layer every PrimeThink Live App re-implements.
 * =============================================================================
 *
 * PURPOSE
 * -------
 * A flat, dependency-free ES module that wraps the chat-database half of the
 * `pt` global (add / get / list / edit / delete / batch*) with the *correct*,
 * defensive version of the patterns that are copy-pasted (and subtly broken)
 * across the repo:
 *   - normalising pt.list()'s two return shapes (array vs {entities})
 *   - auto-paginating past the 1000-row limit
 *   - always editing with merge=true (the "lost fields" footgun)
 *   - coercing string ids from HTML datasets to ints (the #1 repo footgun)
 *   - a single settings/"singleton" entity (upsert)
 *   - reorder helpers for order / sort_index fields
 *   - debounced real-time refresh via pt.onEntityChanged (so multi-user sync
 *     does not thrash the UI)
 *   - a tiny reactive store used by the vanilla (non-React) apps
 *
 * DISTILLED FROM (real apps in primethink-live-apps/)
 * ---------------------------------------------------
 *   todo-list, kanban-board, crm, people-directory, feedback-tracker,
 *   task-tracker, board_view, life-logger, gym-progress,
 *   bank-transactions-manager, expense-splitter, recurring-calls,
 *   internal-tools-registry, demo-react/api.js, and the pt-lite.js Store.
 *
 * CONTRACT
 * --------
 *   - Plain ES module, no build step, no bare/npm imports, no JSX.
 *   - `pt` is a browser global injected by the platform; guard with
 *     `ptAvailable` before calling.
 *   - Never writes app data to localStorage.
 *   - Never adds created_at / updated_at / creator_user_id to entity data.
 *
 * USAGE
 * -----
 *   import * as db from './pt-data.js';
 *
 *   const tasks = await db.listAll('task');            // every row, auto-paged
 *   const t = await db.create('task', { text: 'Buy milk', done: false });
 *   await db.update(t.id, { done: true });             // merge=true by default
 *   await db.remove(t.id);
 *
 *   // one-settings-entity pattern
 *   const settings = await db.upsertSingleton('app_settings', { theme: 'dark' });
 *
 *   // reactive store for a vanilla app
 *   const store = db.createStore({ entityNames: ['task'] });
 *   const unsub = store.subscribe(state => render(state.task));
 *   await store.refresh();
 */

/** True when the platform has injected the `pt` global. */
export const ptAvailable = typeof pt !== 'undefined';

const MODULE = '[pt-data]';

function requirePt() {
    if (typeof pt === 'undefined') {
        throw new Error(MODULE + ' pt global is not available (run inside a PrimeThink Live App)');
    }
    return pt;
}

/* ------------------------------------------------------------------ *
 * Normalisation & id helpers
 * ------------------------------------------------------------------ */

/**
 * Normalise pt.list()/pt.paginate() results into a plain array of entities.
 * pt.list returns EITHER an array OR { entities, count, pagination }.
 * @param {Array|Object} res - The raw result from pt.list / pt.paginate.
 * @returns {Array<Object>} The entities array (never null/undefined).
 */
export function normList(res) {
    if (Array.isArray(res)) {
        return res;
    }
    if (res && Array.isArray(res.entities)) {
        return res.entities;
    }
    return [];
}

/**
 * Normalise the result of a create/edit call into the entity object.
 * Different hosts wrap the entity as { entity } or { result } or return it raw.
 * @param {Object} res - The raw result from pt.add / pt.edit / pt.get.
 * @returns {Object|null} The entity object, or null.
 */
export function normEntity(res) {
    if (!res) {
        return null;
    }
    if (res.entity) {
        return res.entity;
    }
    if (res.result && (res.result.id != null || res.result.data)) {
        return res.result;
    }
    return res;
}

/**
 * Coerce an id coming from an HTML dataset/template (always a string) into an
 * integer, leaving non-numeric ids untouched. Documented repo footgun: click
 * handlers receive `"123"` and `entity.id === 123` never matches.
 * @param {string|number} v - The id value to coerce.
 * @returns {number|string} An int when parseable, otherwise the original value.
 */
export function toId(v) {
    if (typeof v === 'number') {
        return v;
    }
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? v : n;
}

/* ------------------------------------------------------------------ *
 * CRUD
 * ------------------------------------------------------------------ */

/**
 * List entities of one type. Always returns a plain array (normalised).
 * @param {string} entityName - The entity type (e.g. 'task').
 * @param {Object} [opts] - Extra pt.list options (filters, limit, offset, sort...).
 * @returns {Promise<Array<Object>>} The matching entities (empty array on error).
 */
export async function list(entityName, opts = {}) {
    try {
        const p = requirePt();
        const options = Object.assign({ entityNames: [entityName], limit: 1000 }, opts);
        if (!options.entityNames) {
            options.entityNames = [entityName];
        }
        return normList(await p.list(options));
    } catch (err) {
        console.error(MODULE + ' list("' + entityName + '") failed:', err);
        return [];
    }
}

/**
 * List EVERY entity of a type, auto-paginating past the per-request limit.
 * Uses returnMetadata + pagination.has_more when the host provides it, and
 * otherwise falls back to an offset loop that stops on a short page.
 * @param {string} entityName - The entity type.
 * @param {Object} [opts] - Extra pt.list options (filters, sort...). `limit` is
 *                          treated as the page size (default 500).
 * @returns {Promise<Array<Object>>} All matching entities across every page.
 */
export async function listAll(entityName, opts = {}) {
    try {
        const p = requirePt();
        const pageSize = opts.limit || 500;
        const base = Object.assign({}, opts);
        delete base.limit;
        delete base.offset;

        const all = [];
        let offset = 0;
        // Hard cap so a misbehaving host cannot spin forever.
        for (let guard = 0; guard < 1000; guard++) {
            const res = await p.list(Object.assign({
                entityNames: [entityName],
                limit: pageSize,
                offset: offset,
                returnMetadata: true
            }, base));

            const batch = normList(res);
            all.push(...batch);

            const pag = res && res.pagination;
            const hasMore = pag ? !!pag.has_more : batch.length === pageSize;
            if (!hasMore || batch.length === 0) {
                break;
            }
            offset += pageSize;
        }
        return all;
    } catch (err) {
        console.error(MODULE + ' listAll("' + entityName + '") failed:', err);
        return [];
    }
}

/**
 * Get a single entity by id (fast primary-key lookup).
 * @param {number|string} id - The entity id (string ids are coerced).
 * @returns {Promise<Object|null>} The entity, or null if missing/error.
 */
export async function getById(id) {
    try {
        const p = requirePt();
        return normEntity(await p.get(toId(id)));
    } catch (err) {
        console.error(MODULE + ' getById(' + id + ') failed:', err);
        return null;
    }
}

/**
 * Create a new entity. Never pass created_at/updated_at/creator_user_id.
 * @param {string} entityName - The entity type.
 * @param {Object} data - The entity data (plain object).
 * @returns {Promise<Object|null>} The created entity, or null on error.
 */
export async function create(entityName, data) {
    try {
        const p = requirePt();
        return normEntity(await p.add(entityName, data));
    } catch (err) {
        console.error(MODULE + ' create("' + entityName + '") failed:', err);
        return null;
    }
}

/**
 * Update an entity, merging by default so untouched fields are preserved.
 * @param {number|string} id - The entity id.
 * @param {Object} patch - The fields to change.
 * @param {Object} [options] - { merge=true, ifUnchangedSince } — set merge:false
 *                             to replace the whole data object.
 * @returns {Promise<Object|null>} The updated entity (or {conflict:true,...}), or null.
 */
export async function update(id, patch, options = {}) {
    try {
        const p = requirePt();
        const merge = options.merge !== false;
        return await p.edit(toId(id), patch, merge, options.ifUnchangedSince || null);
    } catch (err) {
        console.error(MODULE + ' update(' + id + ') failed:', err);
        return null;
    }
}

/**
 * Delete an entity by id.
 * @param {number|string} id - The entity id.
 * @returns {Promise<boolean>} True if the delete call succeeded.
 */
export async function remove(id) {
    try {
        const p = requirePt();
        await p.delete(toId(id));
        return true;
    } catch (err) {
        console.error(MODULE + ' remove(' + id + ') failed:', err);
        return false;
    }
}

/* ------------------------------------------------------------------ *
 * Batch
 * ------------------------------------------------------------------ */

/**
 * Create many entities in one transaction.
 * @param {string} entityName - The entity type for every row.
 * @param {Array<Object>} dataArray - The data objects to create.
 * @returns {Promise<Array<Object>>} The successfully created entities.
 */
export async function batchCreate(entityName, dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
        return [];
    }
    try {
        const p = requirePt();
        const res = await p.batchAdd(entityName, dataArray);
        return (res || [])
            .filter(r => r && r.success)
            .map(r => r.entity)
            .filter(Boolean);
    } catch (err) {
        console.error(MODULE + ' batchCreate("' + entityName + '") failed:', err);
        return [];
    }
}

/**
 * Update many entities in one request. Each item is normalised to
 * { id, data, merge } with merge=true by default.
 * @param {Array<{id:(number|string), data:Object, merge?:boolean, ifUnchangedSince?:string}>} items
 * @returns {Promise<Array<Object>>} The raw per-item results from pt.batchEdit.
 */
export async function batchUpdate(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return [];
    }
    try {
        const p = requirePt();
        const payload = items.map(it => {
            const row = { id: toId(it.id), data: it.data, merge: it.merge !== false };
            if (it.ifUnchangedSince) {
                row.if_unchanged_since = it.ifUnchangedSince;
            }
            return row;
        });
        return (await p.batchEdit(payload)) || [];
    } catch (err) {
        console.error(MODULE + ' batchUpdate failed:', err);
        return [];
    }
}

/**
 * Delete many entities in one request.
 * @param {Array<number|string>} ids - The entity ids to delete.
 * @returns {Promise<Array<Object>>} The raw per-item results from pt.batchDelete.
 */
export async function batchRemove(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
        return [];
    }
    try {
        const p = requirePt();
        return (await p.batchDelete(ids.map(toId))) || [];
    } catch (err) {
        console.error(MODULE + ' batchRemove failed:', err);
        return [];
    }
}

/* ------------------------------------------------------------------ *
 * Singleton (the very common one-settings-entity pattern)
 * ------------------------------------------------------------------ */

/**
 * Read-or-create the single instance of a settings/config entity, then merge
 * the given data into it. Seen in crm, feedback-tracker, life-logger, etc.
 * @param {string} entityName - The singleton entity type (e.g. 'app_settings').
 * @param {Object} [data] - Fields to write/merge (also the seed on first create).
 * @returns {Promise<Object|null>} The current singleton entity, or null on error.
 */
export async function upsertSingleton(entityName, data = {}) {
    try {
        const p = requirePt();
        const existing = normList(await p.list({ entityNames: [entityName], limit: 1 }))[0];
        if (existing && existing.id != null) {
            if (Object.keys(data).length === 0) {
                return existing;
            }
            const updated = await p.edit(existing.id, data, true);
            return normEntity(updated) || Object.assign({}, existing, { data: Object.assign({}, existing.data, data) });
        }
        return normEntity(await p.add(entityName, data));
    } catch (err) {
        console.error(MODULE + ' upsertSingleton("' + entityName + '") failed:', err);
        return null;
    }
}

/* ------------------------------------------------------------------ *
 * Ordering (order / sort_index fields for drag-to-reorder lists/boards)
 * ------------------------------------------------------------------ */

/**
 * Persist a new ordering for a list of entities by writing an index field.
 * Distilled from todo-list / kanban-board / board_view drag-and-drop reorder.
 * @param {Array<Object>} items - Entities in their desired new order.
 * @param {Object} [opts] - { field='order', step=1, start=0 } — the data field
 *                          to write, and the numbering scheme.
 * @returns {Promise<Array<Object>>} The batchEdit results.
 */
export async function reorder(items, opts = {}) {
    if (!Array.isArray(items) || items.length === 0) {
        return [];
    }
    const field = opts.field || 'order';
    const step = opts.step || 1;
    const start = opts.start || 0;
    const updates = items.map((it, i) => ({
        id: it.id,
        data: { [field]: start + i * step },
        merge: true
    }));
    return batchUpdate(updates);
}

/* ------------------------------------------------------------------ *
 * Sorting / grouping helpers (pure, no pt dependency)
 * ------------------------------------------------------------------ */

/**
 * Sort entities by created_at.
 * @param {Array<Object>} items - The entities.
 * @param {boolean} [desc=true] - Newest first when true.
 * @returns {Array<Object>} A new sorted array.
 */
export function sortByCreated(items, desc = true) {
    const arr = (items || []).slice();
    arr.sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return desc ? tb - ta : ta - tb;
    });
    return arr;
}

/**
 * Sort entities by a field inside `data` (numbers or strings).
 * @param {Array<Object>} items - The entities.
 * @param {string} field - The data field to sort by.
 * @param {boolean} [desc=false] - Descending when true.
 * @returns {Array<Object>} A new sorted array.
 */
export function sortByField(items, field, desc = false) {
    const arr = (items || []).slice();
    arr.sort((a, b) => {
        const av = a && a.data ? a.data[field] : undefined;
        const bv = b && b.data ? b.data[field] : undefined;
        if (av == null && bv == null) return 0;
        if (av == null) return desc ? 1 : -1;
        if (bv == null) return desc ? -1 : 1;
        let cmp;
        if (typeof av === 'number' && typeof bv === 'number') {
            cmp = av - bv;
        } else {
            cmp = String(av).localeCompare(String(bv));
        }
        return desc ? -cmp : cmp;
    });
    return arr;
}

/**
 * Group entities by a field inside `data` (e.g. kanban column, CRM stage).
 * @param {Array<Object>} items - The entities.
 * @param {string|function} keyOrFn - A data field name, or (entity) => key.
 * @returns {Object<string, Array<Object>>} Map of key -> entities.
 */
export function groupBy(items, keyOrFn) {
    const getKey = typeof keyOrFn === 'function'
        ? keyOrFn
        : (e) => (e && e.data ? e.data[keyOrFn] : undefined);
    const out = {};
    (items || []).forEach(e => {
        const k = getKey(e);
        const key = k === undefined || k === null ? '_none' : String(k);
        (out[key] = out[key] || []).push(e);
    });
    return out;
}

/* ------------------------------------------------------------------ *
 * Real-time change subscription (debounced)
 * ------------------------------------------------------------------ */

/**
 * Subscribe to entity changes with a debounce so bursts of AI/multi-user edits
 * do not trigger a re-render/reload storm. Wraps pt.onEntityChanged.
 * @param {function} cb - Called (with the last change event) after the debounce.
 * @param {Object} [opts] - { entityNames?:string[], entityName?:string, debounceMs=300 }.
 * @returns {function} Unsubscribe function (safe to call even if unsupported).
 */
export function onEntitiesChanged(cb, opts = {}) {
    if (typeof pt === 'undefined' || typeof pt.onEntityChanged !== 'function') {
        console.error(MODULE + ' onEntitiesChanged: pt.onEntityChanged unavailable');
        return function () {};
    }
    const debounceMs = opts.debounceMs != null ? opts.debounceMs : 300;
    const names = opts.entityNames || (opts.entityName ? [opts.entityName] : null);
    let timer = null;
    let lastEvent = null;

    const handler = (event) => {
        // When filtering by name, keep only inserts whose name matches (the
        // host only reports entity_name on 'inserted' events).
        if (names && event && event.entity_name && names.indexOf(event.entity_name) === -1) {
            return;
        }
        lastEvent = event;
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            timer = null;
            try {
                cb(lastEvent);
            } catch (err) {
                console.error(MODULE + ' onEntitiesChanged callback threw:', err);
            }
        }, debounceMs);
    };

    const unsubs = [];
    try {
        // ONE unfiltered subscription on purpose: the host's { entityName }
        // filter drops every event that lacks entity_name, and the host only
        // stamps entity_name on 'inserted' events — a filtered subscription
        // would never see updates or deletes (other users' edits, AI edits).
        // The handler above does the name filtering client-side for inserts
        // and treats name-less update/delete events as a refresh trigger.
        const h = pt.onEntityChanged(handler);
        unsubs.push(typeof h === 'function' ? h : (h && h.unsubscribe));
    } catch (err) {
        console.error(MODULE + ' onEntitiesChanged: subscribe failed:', err);
    }

    return function () {
        if (timer) {
            clearTimeout(timer);
        }
        unsubs.forEach(u => {
            try {
                if (typeof u === 'function') {
                    u();
                }
            } catch (err) {
                console.error(MODULE + ' onEntitiesChanged: unsubscribe failed:', err);
            }
        });
    };
}

/* ------------------------------------------------------------------ *
 * createStore — a tiny reactive store for vanilla apps
 * ------------------------------------------------------------------ */

/**
 * Create a minimal reactive store backed by the chat DB. It loads one or more
 * entity collections, exposes get/set/subscribe/refresh, and (optionally) wires
 * up debounced real-time refresh so other users' edits appear automatically.
 * Replaces the ad-hoc `state.items = [...]; render();` seen across vanilla apps.
 *
 * @param {Object} cfg
 * @param {Array<string>} cfg.entityNames - Entity types to load into the store.
 * @param {function} [cfg.load] - Custom async loader `() => stateObject`; when
 *        omitted, each entity name is listed via listAll into `state[name]`.
 * @param {boolean} [cfg.realtime=true] - Auto-refresh on entity changes.
 * @param {number} [cfg.debounceMs=300] - Debounce for real-time refresh.
 * @returns {{ get:function, set:function, subscribe:function, refresh:function, destroy:function }}
 *
 * @example
 *   const store = createStore({ entityNames: ['task', 'label'] });
 *   store.subscribe(state => render(state.task, state.label));
 *   await store.refresh();
 */
export function createStore(cfg = {}) {
    const entityNames = cfg.entityNames || [];
    const realtime = cfg.realtime !== false;
    const debounceMs = cfg.debounceMs != null ? cfg.debounceMs : 300;
    const loader = cfg.load;

    let state = {};
    const subs = [];
    let unsubChange = null;
    let loading = false;

    function emit() {
        subs.forEach(fn => {
            try {
                fn(state);
            } catch (err) {
                console.error(MODULE + ' store subscriber threw:', err);
            }
        });
    }

    async function defaultLoad() {
        const next = {};
        await Promise.all(entityNames.map(async (name) => {
            next[name] = await listAll(name);
        }));
        return next;
    }

    async function refresh() {
        if (loading) {
            return state;
        }
        loading = true;
        try {
            state = loader ? await loader() : await defaultLoad();
        } catch (err) {
            console.error(MODULE + ' store refresh failed:', err);
        } finally {
            loading = false;
        }
        emit();
        return state;
    }

    if (realtime && entityNames.length) {
        unsubChange = onEntitiesChanged(() => { refresh(); }, {
            entityNames: entityNames,
            debounceMs: debounceMs
        });
    }

    return {
        /**
         * Get the whole state object, or one collection by entity name.
         * @param {string} [name] - Optional entity name.
         * @returns {Object|Array} The state object, or the named collection.
         */
        get(name) {
            return name ? (state[name] || []) : state;
        },
        /**
         * Replace one collection (or merge into state) locally and notify subs.
         * Does NOT write to the DB — use create/update/remove for that, then refresh.
         * @param {string|Object} nameOrPatch - Entity name, or a state patch object.
         * @param {Array} [value] - The collection when a name is passed.
         */
        set(nameOrPatch, value) {
            if (typeof nameOrPatch === 'string') {
                state = Object.assign({}, state, { [nameOrPatch]: value });
            } else {
                state = Object.assign({}, state, nameOrPatch || {});
            }
            emit();
        },
        /**
         * Subscribe to state changes.
         * @param {function} fn - Called with the state object on every change.
         * @returns {function} Unsubscribe function.
         */
        subscribe(fn) {
            subs.push(fn);
            return function () {
                const i = subs.indexOf(fn);
                if (i > -1) {
                    subs.splice(i, 1);
                }
            };
        },
        refresh,
        /** Tear down real-time subscriptions and clear subscribers. */
        destroy() {
            if (unsubChange) {
                unsubChange();
                unsubChange = null;
            }
            subs.length = 0;
        }
    };
}
