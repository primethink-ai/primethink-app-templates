// ============================================================================
// ptr-ai.js — React bindings for AI generation in PrimeThink Live Apps.
//
// PURPOSE
//   Wraps the FIRE-AND-FORGET pattern (see ASYNC_FIRE_AND_FORGET_GUIDE.md) in
//   hooks so a component can kick off slow AI work without ever blocking the UI,
//   and — crucially — RESUME after a reload/tab-switch by reading the task
//   entity back out of the chat DB. The AI writes its result into that entity
//   via chatdb_edit; the frontend just watches the entity's `status`.
//
// GENERALISES THE PATTERNS IN
//   drum-sheet-library, social-media-generator, document-proofreader,
//   11plus-creative-writing, panel-stakeholder-trainer (all run in-UI AI flows).
//
// PLATFORM CONTRACT
//   * React 18 / ReactDOM are BROWSER GLOBALS — never imports 'react'.
//   * NO JSX (served raw). Hooks only.
//   * `pt` is a platform global — every call is guarded; outside the platform
//     the hooks resolve to an inert 'idle' state so the app still renders.
//   * Talks to `pt` directly (zero coupling to pt-ai.js) for standalone safety.
//
// WHY AN ENTITY, NOT pt.waitForMessageReceived?
//   waitForMessageReceived resolves in the browser and dies if the tab closes.
//   The entity-mailbox approach survives navigation: the AI keeps running
//   server-side and writes the result to the DB, which we re-read on remount.
//
// STREAMING NOTE
//   The platform DOES expose streaming (pt.addMessage({streaming:true}),
//   stream_partial_token socket events, pt.stopStreamingMessage). A `useAiStream`
//   hook is intentionally OMITTED here: token streaming ties the result's
//   survival to the open tab, which contradicts this module's resilience goal.
//   If you need live token rendering, subscribe to pt.onSocketEvent for
//   'stream_partial_token' yourself; for durable results, prefer useAiTask below.
//
// USAGE (from index.js, which MAY use JSX)
//   import { useAiTask, useAiJson, useAiQueue } from './ptr-ai.js';
//
//   function Composer() {
//       const ai = useAiTask({ entityName: 'draft_task' });
//       return (
//           <div>
//               <button disabled={ai.status === 'pending'}
//                       onClick={() => ai.run('Write a haiku about the sea')}>
//                   {ai.status === 'pending' ? 'Generating…' : 'Generate'}
//               </button>
//               {ai.status === 'done'  && <pre>{ai.result}</pre>}
//               {ai.status === 'error' && <p className="text-red-500">{ai.error}</p>}
//           </div>
//       );
//   }
//
//   // JSON result with validation:
//   function Planner() {
//       const ai = useAiJson({ entityName: 'plan_task' });
//       const go = () => ai.run('Return {"steps": string[]} for onboarding');
//       return <button onClick={go}>Plan{ai.status === 'done' ? ` (${ai.result.steps.length})` : ''}</button>;
//   }
// ============================================================================

const { useState, useEffect, useRef, useCallback } = React;

/** True when the PrimeThink `pt` global is present. */
export const ptAvailable = typeof pt !== 'undefined' && pt !== null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise pt.add()/pt.get() result to a single entity object. */
function normEntity(res) {
    if (!res) return res;
    if (res.entity) return res.entity;
    if (res.result && res.result.entity) return res.result.entity;
    return res;
}

/** Normalise pt.list() to an array. */
function normList(res) {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.entities)) return res.entities;
    return [];
}

/**
 * Extract a JSON object/array from an AI text response that may be wrapped in
 * ```json fences or surrounded by prose.
 * @param {string} text
 * @returns {*} Parsed value.
 * @throws {Error} When no valid JSON can be parsed.
 */
export function extractJson(text) {
    if (text == null) throw new Error('No text to parse');
    if (typeof text === 'object') return text; // already parsed
    const str = String(text);
    const fenced = str.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : str;
    try {
        return JSON.parse(candidate.trim());
    } catch (e) {
        // Fall back to the first {...} or [...] block.
        const block = candidate.match(/[[{][\s\S]*[\]}]/);
        if (block) return JSON.parse(block[0]);
        throw new Error('Could not parse JSON from AI response');
    }
}

/**
 * Build the fire-and-forget prompt instructing the AI to write its result back
 * into the given entity via chatdb_edit. Override via opts.buildPrompt.
 * @param {object} entity - The queued task entity (needs .id).
 * @param {string} prompt - The user's instruction.
 * @param {object} [opts]
 * @param {boolean} [opts.json=false] - Ask for a JSON result in `result`.
 * @returns {string}
 */
export function buildTaskPrompt(entity, prompt, opts = {}) {
    const shape = opts.json
        ? 'a single valid JSON value (no prose, no markdown fences)'
        : 'the generated text';
    return `TASK: Complete the request below and save the result to the database.

ENTITY ID: ${entity.id}

--- REQUEST ---
${prompt}
--- END REQUEST ---

Produce ${shape}.

After finishing, you MUST ACTUALLY CALL the tool 'chatdb_edit' with:
- entity_id: ${entity.id}
- data: {"status": "complete", "result": <the result${opts.json ? ' as a JSON value' : ' as a string'}>}
- merge: true

If anything goes wrong, ACTUALLY CALL 'chatdb_edit' with:
- entity_id: ${entity.id}
- data: {"status": "error", "error_message": "<what went wrong>"}
- merge: true

IMPORTANT: You must ACTUALLY EXECUTE the chatdb_edit tool call — do not merely describe it.`;
}

// ---------------------------------------------------------------------------
// useAiTask — one fire-and-forget task, resumable across reloads.
// ---------------------------------------------------------------------------

/**
 * Run a single AI task using the fire-and-forget entity-mailbox pattern.
 * Never blocks: run() creates a `queued` entity, fires pt.addMessage (not
 * awaited), then watches the entity via pt.onEntityChanged (+ a polling
 * fallback) until it reads `complete` or `error`. On mount it RESUMES any
 * still-pending task of the same `entityName` so a reload picks up in progress.
 *
 * @param {object} [opts]
 * @param {string} [opts.entityName='ai_task'] - Entity type used as the mailbox.
 * @param {number} [opts.timeout=300000] - ms after which a stuck task is failed.
 * @param {number} [opts.pollMs=8000] - Polling fallback interval.
 * @param {boolean} [opts.resume=true] - Resume a pending task on mount.
 * @param {function(object,string,object):string} [opts.buildPrompt] - Custom prompt builder.
 * @param {object} [opts.extraData] - Extra fields written onto the queued entity.
 * @returns {{status:('idle'|'pending'|'done'|'error'), result:*, error:(string|null),
 *            entity:(object|null), taskId:(string|number|null),
 *            run:function(string, object=):Promise<void>, reset:function():void}}
 */
export function useAiTask(opts = {}) {
    const {
        entityName = 'ai_task',
        timeout = 300000,
        pollMs = 8000,
        resume = true,
        buildPrompt,
        extraData,
        parseResult, // internal: used by useAiJson
    } = opts;

    const [status, setStatus] = useState('idle');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [entity, setEntity] = useState(null);

    const alive = useRef(true);
    const entityIdRef = useRef(null);
    const unsubRef = useRef(null);
    const pollRef = useRef(null);

    const cleanupWatchers = useCallback(() => {
        if (typeof unsubRef.current === 'function') { unsubRef.current(); unsubRef.current = null; }
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }, []);

    // Apply a fetched/updated entity to local state; returns true when settled.
    const applyEntity = useCallback((ent) => {
        if (!ent || !alive.current) return false;
        setEntity(ent);
        const d = ent.data || {};
        if (d.status === 'complete') {
            let value = d.result;
            if (parseResult) {
                try { value = parseResult(d.result != null ? d.result : d.result_text); }
                catch (e) {
                    setError(e.message || String(e));
                    setStatus('error');
                    return true;
                }
            }
            setResult(value);
            setError(null);
            setStatus('done');
            return true;
        }
        if (d.status === 'error') {
            setError(d.error_message || 'AI task failed');
            setStatus('error');
            return true;
        }
        return false; // still queued/pending
    }, [parseResult]);

    const watch = useCallback((id) => {
        cleanupWatchers();
        const startedAt = Date.now();

        const check = async () => {
            if (!alive.current || !ptAvailable) return;
            try {
                const ent = normEntity(await pt.get(id));
                const settled = applyEntity(ent);
                if (settled) { cleanupWatchers(); return; }
                // Timeout guard for tasks the AI never completes.
                if (Date.now() - startedAt > timeout) {
                    cleanupWatchers();
                    if (alive.current) {
                        setError('AI task timed out');
                        setStatus('error');
                        pt.edit(id, { status: 'error', error_message: 'Timed out' }, true).catch(() => {});
                    }
                }
            } catch (e) { /* transient — next tick retries */ }
        };

        // Event-driven acceleration (best effort) + polling backbone.
        if (typeof pt.onEntityChanged === 'function') {
            try { unsubRef.current = pt.onEntityChanged(() => check(), { entityId: id }); }
            catch (e) { /* ignore */ }
        }
        pollRef.current = setInterval(check, pollMs);
        check(); // immediate first check
    }, [applyEntity, cleanupWatchers, pollMs, timeout]);

    /**
     * Fire a new task. Non-blocking; state moves to 'pending' immediately.
     * @param {string} prompt
     * @param {object} [runOpts] - { extraData, json }.
     */
    const run = useCallback(async (prompt, runOpts = {}) => {
        if (!ptAvailable) {
            setStatus('error');
            setError('pt is unavailable — AI tasks require the PrimeThink platform.');
            return;
        }
        cleanupWatchers();
        setStatus('pending');
        setResult(null);
        setError(null);
        try {
            const created = normEntity(await pt.add(entityName, Object.assign({
                status: 'queued',
                prompt,
                result: null,
                error_message: null,
            }, extraData, runOpts.extraData)));
            if (!alive.current) return;
            entityIdRef.current = created.id;
            setEntity(created);
            const promptText = (buildPrompt || buildTaskPrompt)(
                created, prompt, { json: !!(runOpts.json || parseResult) }
            );
            // Fire-and-forget: do NOT await the AI response.
            pt.addMessage(promptText);
            watch(created.id);
        } catch (e) {
            if (alive.current) { setStatus('error'); setError(e.message || String(e)); }
        }
    }, [entityName, extraData, buildPrompt, parseResult, watch, cleanupWatchers]);

    /** Reset to idle and stop watching (does not delete the entity). */
    const reset = useCallback(() => {
        cleanupWatchers();
        entityIdRef.current = null;
        setStatus('idle');
        setResult(null);
        setError(null);
        setEntity(null);
    }, [cleanupWatchers]);

    // Mount: resume any still-pending task of this entityName.
    useEffect(() => {
        alive.current = true;
        if (resume && ptAvailable) {
            (async () => {
                try {
                    const rows = normList(await pt.list({
                        entityNames: [entityName],
                        filters: { status: 'queued' },
                        limit: 1,
                    }));
                    const pending = rows[0];
                    if (pending && alive.current) {
                        entityIdRef.current = pending.id;
                        setStatus('pending');
                        setEntity(pending);
                        watch(pending.id);
                    }
                } catch (e) { /* nothing to resume */ }
            })();
        }
        return () => { alive.current = false; cleanupWatchers(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityName, resume]);

    return { status, result, error, entity, taskId: entityIdRef.current, run, reset };
}

// ---------------------------------------------------------------------------
// useAiJson — same as useAiTask but parses/validates JSON.
// ---------------------------------------------------------------------------

/**
 * Fire-and-forget AI task whose result is parsed as JSON. On parse failure the
 * status becomes 'error' and the raw text is exposed as `rawText`.
 * @param {object} [opts] - Same options as useAiTask, plus:
 * @param {function(*):*} [opts.validate] - Throw to reject an invalid shape.
 * @returns {object} Same shape as useAiTask; `result` is the parsed value and
 *          `rawText` holds the unparsed string when parsing failed.
 */
export function useAiJson(opts = {}) {
    const rawRef = useRef(null);
    const validate = opts.validate;
    const parseResult = useCallback((raw) => {
        rawRef.current = raw;
        const parsed = extractJson(raw);
        if (validate) validate(parsed);
        return parsed;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const task = useAiTask(Object.assign({}, opts, { parseResult }));
    const runJson = useCallback((prompt, runOpts = {}) =>
        task.run(prompt, Object.assign({ json: true }, runOpts)), [task]);
    return Object.assign({}, task, { run: runJson, rawText: rawRef.current });
}

// ---------------------------------------------------------------------------
// useAiQueue — several fire-and-forget tasks in flight at once.
// ---------------------------------------------------------------------------

/**
 * Run a batch of AI prompts in parallel using the fire-and-forget pattern, and
 * track each one's status. Resilient to reloads: every task is its own entity.
 * @param {object} [opts]
 * @param {string} [opts.entityName='ai_task'] - Mailbox entity type.
 * @param {number} [opts.pollMs=8000] - Polling fallback interval.
 * @param {number} [opts.timeout=300000] - Per-task stuck-timeout in ms.
 * @param {function(object,string,object):string} [opts.buildPrompt]
 * @returns {{tasks:Array<{id:(string|number), prompt:string,
 *              status:('queued'|'complete'|'error'), result:*, error:(string|null)}>,
 *            running:boolean, done:number, total:number, errored:number,
 *            run:function(Array<(string|{prompt:string,data?:object})>):Promise<void>,
 *            reset:function():void}}
 */
export function useAiQueue(opts = {}) {
    const {
        entityName = 'ai_task',
        pollMs = 8000,
        timeout = 300000,
        buildPrompt,
    } = opts;

    const [tasks, setTasks] = useState([]); // [{id, prompt, status, result, error}]
    const [running, setRunning] = useState(false);
    const alive = useRef(true);
    const idsRef = useRef([]);
    const unsubRef = useRef(null);
    const pollRef = useRef(null);
    const startRef = useRef(0);

    const stop = useCallback(() => {
        if (typeof unsubRef.current === 'function') { unsubRef.current(); unsubRef.current = null; }
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }, []);

    const poll = useCallback(async () => {
        const ids = idsRef.current;
        if (!ids.length || !ptAvailable || !alive.current) return;
        try {
            const fetched = await Promise.all(ids.map((id) => pt.get(id).catch(() => null)));
            if (!alive.current) return;
            const now = Date.now();
            const next = fetched.map((res, i) => {
                const ent = normEntity(res);
                const d = (ent && ent.data) || {};
                let status = d.status || 'queued';
                if (status === 'queued' && now - startRef.current > timeout) status = 'error';
                return {
                    id: ids[i],
                    prompt: d.prompt || '',
                    status,
                    result: d.result != null ? d.result : null,
                    error: status === 'error' ? (d.error_message || 'Timed out') : null,
                };
            });
            setTasks(next);
            const settled = next.every((t) => t.status === 'complete' || t.status === 'error');
            if (settled) { stop(); setRunning(false); }
        } catch (e) { /* transient */ }
    }, [stop, timeout]);

    /**
     * Fire an array of prompts. Each item is a string or { prompt, data }.
     * @param {Array<(string|{prompt:string, data?:object})>} prompts
     */
    const run = useCallback(async (prompts) => {
        if (!ptAvailable) { setRunning(false); return; }
        stop();
        const items = (prompts || []).map((p) => (typeof p === 'string' ? { prompt: p } : p));
        startRef.current = Date.now();
        setRunning(true);
        try {
            const rows = items.map((it) => Object.assign({
                status: 'queued', prompt: it.prompt, result: null, error_message: null,
            }, it.data));
            let created;
            if (typeof pt.batchAdd === 'function') {
                const res = await pt.batchAdd(entityName, rows);
                created = (Array.isArray(res) ? res : [])
                    .map((r) => (r && r.entity) || r)
                    .filter((e) => e && e.id != null);
            } else {
                created = [];
                for (const row of rows) created.push(normEntity(await pt.add(entityName, row)));
            }
            if (!alive.current) return;
            idsRef.current = created.map((e) => e.id);
            setTasks(created.map((e, i) => ({
                id: e.id, prompt: items[i].prompt, status: 'queued', result: null, error: null,
            })));
            // Fire every message (not awaited).
            created.forEach((ent, i) => {
                const text = (buildPrompt || buildTaskPrompt)(ent, items[i].prompt, {});
                pt.addMessage(text);
            });
            // Watch: socket acceleration + polling backbone.
            if (typeof pt.onEntityChanged === 'function') {
                try { unsubRef.current = pt.onEntityChanged(() => poll(), { entityName }); }
                catch (e) { /* ignore */ }
            }
            pollRef.current = setInterval(poll, pollMs);
            poll();
        } catch (e) {
            if (alive.current) setRunning(false);
        }
    }, [entityName, buildPrompt, poll, pollMs, stop]);

    const reset = useCallback(() => {
        stop();
        idsRef.current = [];
        setTasks([]);
        setRunning(false);
    }, [stop]);

    useEffect(() => {
        alive.current = true;
        return () => { alive.current = false; stop(); };
    }, [stop]);

    const done = tasks.filter((t) => t.status === 'complete').length;
    const errored = tasks.filter((t) => t.status === 'error').length;
    return { tasks, running, done, errored, total: tasks.length, run, reset };
}
