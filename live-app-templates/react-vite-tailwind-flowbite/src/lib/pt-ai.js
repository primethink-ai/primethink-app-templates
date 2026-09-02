/*!
 * pt-ai.js — AI messaging for PrimeThink Live Apps, done right.
 *
 * COMPILED-APP EDITION. Adapted verbatim from
 * skills/primethink-developer/libraries/pt-ai.js, with one change: it reads the
 * platform global as `window.pt` instead of the bare `pt` binding, so it bundles
 * cleanly under Vite/Rollup without relying on a lint-declared global. Keep the
 * two in sync.
 * =============================================================================
 *
 * PURPOSE
 * -------
 * A flat, dependency-free ES module that wraps the AI half of the `pt` global
 * (addMessage / waitForMessageReceived / waitForAllMessagesReceived) with the
 * correct patterns, so apps stop hand-rolling brittle variants:
 *   - a single `askAI()` with a sane 5-minute default timeout
 *   - `askAIJson()` that strips ```json fences, repairs trailing commas and
 *     smart quotes, and retries once on parse failure
 *   - the FIRE-AND-FORGET task pattern (ASYNC_FIRE_AND_FORGET_GUIDE.md): a task
 *     entity records status queued/running/complete/error so the AI writes the
 *     result back via chatdb_edit and a reload — or another user — picks it up
 *   - real-time task updates via pt.onEntityChanged (NOT hand-rolled polling)
 *
 * >>> DO NOT hand-roll `setInterval` loops that call pt.get() to await the AI. <<<
 * That approach dies when the tab closes and hammers the API. Prefer:
 *   - askAI()          for a quick answer you can wait for (< a few minutes)
 *   - startAiTask() +  for long / parallel / survive-navigation work: the AI
 *     resumeAiTasks()  writes the result into the DB; the frontend just reads it.
 *   - onAiTaskChanged() for near-instant reaction to those DB writes.
 *
 * DISTILLED FROM (real apps in primethink-live-apps/)
 * ---------------------------------------------------
 *   drum-sheet-library, social-media-generator, briefing-insight-builder,
 *   business-planning-workflow, sustainability-sourcing-analysis,
 *   document-review, document-proofreader, panel-stakeholder-trainer,
 *   diet-coach, 11plus-creative-writing, story_forge, timeline-extractor,
 *   specs-comparison-tool, form-generator, and the pt-lite.js aiTask() helper.
 *
 * CONTRACT
 * --------
 *   - Plain ES module, no npm imports, no JSX — safe to bundle or to load raw.
 *   - `pt` is a browser global injected by the platform; this edition reads it
 *     as `window.pt` and guards every entry point via requirePt().
 *
 * USAGE (compiled Vite template)
 * -----------------------------
 *   import { askAI, askAIJson, extractJson } from './lib/pt-ai.js';
 *   import * as ai from './lib/pt-ai.js';   // …or the whole namespace
 *
 *   // quick answer
 *   const text = await ai.askAI('Summarise this in one sentence: ' + doc);
 *
 *   // structured answer
 *   const plan = await ai.askAIJson('Return {"steps": string[]} for a launch plan.');
 *
 *   // fire-and-forget (survives tab close / runs in parallel)
 *   await ai.startAiTask('post_task', 'Write a LinkedIn post', {
 *       payload: { topic: 'AI agents' },
 *       resultSchema: '{"post": string}'
 *   });
 *   // on load, or when the tab regains focus:
 *   await ai.resumeAiTasks('post_task', {
 *       onComplete: (task) => render(task.data.result),
 *       onError:    (task) => showError(task.data.error_message)
 *   });
 */

// pt-doctor-allow-file: add-message-not-hidden
// This library passes the flag through a variable — `sendOpts = { hidden: ... }`
// — which the doctor's argument-span heuristic cannot see; and startAiTask()
// deliberately posts a VISIBLE fire-and-forget message so the user can watch the
// task run in the chat.

const MODULE = '[pt-ai]';

/** Default timeout for a single blocking AI answer (5 minutes). */
export const DEFAULT_TIMEOUT = 300000;

function requirePt() {
    if (typeof window === 'undefined' || !window.pt) {
        throw new Error(MODULE + ' window.pt is not available (run inside a PrimeThink Live App)');
    }
    return window.pt;
}

function toId(v) {
    if (typeof v === 'number') {
        return v;
    }
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? v : n;
}

/* ------------------------------------------------------------------ *
 * Prompt building
 * ------------------------------------------------------------------ */

/**
 * Join prompt parts into one string, dropping empty/null parts. Accepts strings
 * or { label, value } pairs (rendered as "LABEL:\nvalue"). A tidy replacement
 * for the ad-hoc template-literal prompt soup in most apps.
 * @param {Array<string|{label:string, value:*}>} parts - The prompt fragments.
 * @returns {string} The assembled prompt.
 */
export function buildPrompt(parts) {
    if (!Array.isArray(parts)) {
        return String(parts == null ? '' : parts);
    }
    return parts
        .map(p => {
            if (p == null || p === '') {
                return '';
            }
            if (typeof p === 'object' && 'label' in p) {
                const val = typeof p.value === 'object' ? JSON.stringify(p.value, null, 2) : String(p.value);
                return p.label + ':\n' + val;
            }
            return String(p);
        })
        .filter(Boolean)
        .join('\n\n');
}

/* ------------------------------------------------------------------ *
 * JSON extraction / repair
 * ------------------------------------------------------------------ */

/**
 * Repair the common ways AI-emitted JSON is invalid: smart quotes, trailing
 * commas before } or ], and stray non-breaking spaces.
 * @param {string} s - The candidate JSON string.
 * @returns {string} A repaired string (still may not be valid JSON).
 */
function repairJson(s) {
    return String(s)
        // smart double quotes -> "
        .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
        // smart single quotes/apostrophes -> '
        .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, '\'')
        // non-breaking / zero-width spaces
        .replace(/[\u00A0\u200B\uFEFF]/g, ' ')
        // trailing commas: {"a":1,}  or  [1,2,]
        .replace(/,\s*([}\]])/g, '$1');
}

/**
 * Extract and parse a JSON value from a raw AI response, tolerating ```json
 * fences, surrounding prose, and the common JSON defects above.
 * @param {string} text - The raw AI text.
 * @param {*} [fallback=null] - Value returned when nothing parses.
 * @returns {*} The parsed value, or `fallback`.
 */
export function extractJson(text, fallback = null) {
    if (text == null) {
        return fallback;
    }
    let s = String(text).trim();

    // 1. Prefer a fenced ```json ... ``` block.
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
        s = fence[1].trim();
    }

    // 2. Try as-is, then repaired.
    const candidates = [s, repairJson(s)];

    // 3. Fall back to the outermost {...} or [...] block, raw then repaired.
    const block = s.match(/[{[][\s\S]*[}\]]/);
    if (block) {
        candidates.push(block[0], repairJson(block[0]));
    }

    for (const c of candidates) {
        try {
            return JSON.parse(c);
        } catch (err) {
            /* try next candidate */
        }
    }
    console.error(MODULE + ' extractJson: could not parse AI output as JSON');
    return fallback;
}

/* ------------------------------------------------------------------ *
 * Blocking asks (send + await the chat response)
 * ------------------------------------------------------------------ */

/**
 * Send a prompt to the AI and await its reply text. Use for answers you expect
 * within a few minutes; for long/parallel/survive-navigation work use
 * startAiTask() instead.
 * @param {string} prompt - The prompt text.
 * @param {Object} [opts] - { timeout=DEFAULT_TIMEOUT, files, hidden=true }.
 *        `files` may be an HTMLFormElement or FormData to attach documents.
 * @returns {Promise<string>} The AI reply text ('' on failure).
 */
export async function askAI(prompt, opts = {}) {
    try {
        const p = requirePt();
        const timeout = opts.timeout || DEFAULT_TIMEOUT;
        const sendOpts = { hidden: opts.hidden !== false };
        let res;
        if (opts.files) {
            res = await p.addMessage(opts.files, prompt, sendOpts);
        } else {
            res = await p.addMessage(prompt, sendOpts);
        }
        if (!res || !res.task_id) {
            throw new Error('addMessage returned no task_id');
        }
        const reply = await p.waitForMessageReceived(res.task_id, { timeout });
        return (reply && reply.message) || '';
    } catch (err) {
        console.error(MODULE + ' askAI failed:', err);
        return '';
    }
}

/**
 * Ask the AI for JSON and return the parsed value. Appends a strict
 * "JSON only" instruction (plus an optional schema hint), then extracts and
 * repairs the response, retrying once with a firmer instruction on failure.
 * @param {string} prompt - The task/question.
 * @param {Object} [opts] - { schemaHint, timeout, retries=1, fallback=null, files }.
 *        `schemaHint` is an example/shape string shown to the AI.
 * @returns {Promise<*>} The parsed JSON value, or `fallback` if all attempts fail.
 */
export async function askAIJson(prompt, opts = {}) {
    const retries = opts.retries == null ? 1 : opts.retries;
    const fallback = opts.fallback == null ? null : opts.fallback;
    const schemaLine = opts.schemaHint
        ? '\n\nReturn EXACTLY this JSON shape (no extra keys):\n' + opts.schemaHint
        : '';

    let instruction = 'Respond with ONLY valid JSON. No prose, no markdown fences.';
    for (let attempt = 0; attempt <= retries; attempt++) {
        const full = prompt + schemaLine + '\n\n' + instruction;
        const text = await askAI(full, { timeout: opts.timeout, files: opts.files });
        const parsed = extractJson(text, undefined);
        if (parsed !== undefined) {
            return parsed;
        }
        // Firm up the instruction for the retry.
        instruction = 'Your previous reply was not valid JSON. Respond with ONLY a single ' +
            'valid JSON value — no explanation, no code fences, no trailing commas.';
        if (attempt < retries) {
            console.error(MODULE + ' askAIJson: retrying (attempt ' + (attempt + 2) + ')');
        }
    }
    return fallback;
}

/**
 * Send many prompts in parallel and await all replies.
 * @param {Array<string>} prompts - The prompts.
 * @param {Object} [opts] - { timeout, failFast=false, onProgress, hidden=true }.
 * @returns {Promise<Array<string>>} Reply texts in the same order (''/null for failures).
 */
export async function askAIMany(prompts, opts = {}) {
    if (!Array.isArray(prompts) || prompts.length === 0) {
        return [];
    }
    try {
        const p = requirePt();
        const sendOpts = { hidden: opts.hidden !== false };
        const sent = await Promise.all(prompts.map(pr => p.addMessage(pr, sendOpts)));
        const taskIds = sent.map(r => r && r.task_id).filter(Boolean);
        const replies = await p.waitForAllMessagesReceived(taskIds, {
            timeout: opts.timeout || DEFAULT_TIMEOUT,
            failFast: opts.failFast === true,
            onProgress: opts.onProgress
        });
        return (replies || []).map(r => (r && r.message) || '');
    } catch (err) {
        console.error(MODULE + ' askAIMany failed:', err);
        return [];
    }
}

/**
 * Cancel a streaming AI message.
 * @param {string} streamingTaskId - The streaming task id to stop.
 * @returns {Promise<boolean>} True if the stop call succeeded.
 */
export async function stopAI(streamingTaskId) {
    try {
        const p = requirePt();
        if (typeof p.stopStreamingMessage !== 'function') {
            console.error(MODULE + ' stopAI: pt.stopStreamingMessage unavailable');
            return false;
        }
        await p.stopStreamingMessage(streamingTaskId);
        return true;
    } catch (err) {
        console.error(MODULE + ' stopAI failed:', err);
        return false;
    }
}

/* ------------------------------------------------------------------ *
 * Fire-and-forget task pattern (ASYNC_FIRE_AND_FORGET_GUIDE.md)
 * ------------------------------------------------------------------ */

/**
 * Build the standard fire-and-forget prompt: it tells the AI what to do, which
 * entity to write into, and to ACTUALLY CALL chatdb_edit with the result.
 * @param {Object} entity - The created task entity (needs `id` and `data`).
 * @param {Object} cfg - { instruction, resultSchema, resultKey }.
 * @returns {string} The prompt to send with pt.addMessage (do NOT await).
 */
function buildTaskPrompt(entity, cfg) {
    const resultKey = cfg.resultKey || 'result';
    const schema = cfg.resultSchema
        ? '\nThe ' + resultKey + ' must match this shape: ' + cfg.resultSchema + '\n'
        : '';
    return 'TASK: ' + (cfg.instruction || 'Complete the task described by the input data below.') + '\n\n' +
        'ENTITY ID: ' + entity.id + '\n\n' +
        '--- INPUT DATA ---\n' + JSON.stringify(entity.data, null, 2) + '\n--- END INPUT ---\n' +
        schema + '\n' +
        'When finished you MUST ACTUALLY CALL the tool `chatdb_edit` with:\n' +
        '- entity_id: ' + entity.id + '\n' +
        '- data: {"status": "complete", "' + resultKey + '": <your result>}\n' +
        '- merge: true\n\n' +
        'If you hit an error, ACTUALLY CALL `chatdb_edit` with:\n' +
        '- entity_id: ' + entity.id + '\n' +
        '- data: {"status": "error", "error_message": "<what went wrong>"}\n' +
        '- merge: true\n\n' +
        'IMPORTANT: actually EXECUTE the chatdb_edit tool call. Do not just describe it.';
}

/**
 * Start a fire-and-forget AI task: create a `status:'queued'` entity, then fire
 * an AI message (NOT awaited) instructing the AI to write the result back into
 * that entity via chatdb_edit. Survives tab close, runs server-side, and can be
 * resumed later with resumeAiTasks() / watched with onAiTaskChanged().
 *
 * @param {string} entityName - The task entity type (e.g. 'post_task').
 * @param {string} instruction - What the AI should produce.
 * @param {Object} [opts] - { payload={}, resultSchema, resultKey='result', extraData={} }.
 *        `payload` is the input data the AI works from; `extraData` is merged
 *        into the seed entity (e.g. a batch_id or UI grouping key).
 * @returns {Promise<Object|null>} The created task entity ({status:'queued'}), or null.
 */
export async function startAiTask(entityName, instruction, opts = {}) {
    try {
        const p = requirePt();
        const seed = Object.assign(
            { status: 'queued', result: null, error_message: null },
            opts.payload || {},
            opts.extraData || {}
        );
        const created = await p.add(entityName, seed);
        const entity = created && created.entity ? created.entity : created;
        if (!entity || entity.id == null) {
            throw new Error('failed to create task entity');
        }
        const prompt = buildTaskPrompt(entity, {
            instruction: instruction,
            resultSchema: opts.resultSchema,
            resultKey: opts.resultKey
        });
        // FIRE-AND-FORGET: do NOT await the AI response.
        p.addMessage(prompt);
        return entity;
    } catch (err) {
        console.error(MODULE + ' startAiTask("' + entityName + '") failed:', err);
        return null;
    }
}

/**
 * Resume fire-and-forget tasks after a reload / focus: read every task entity,
 * fire callbacks for the ones already complete/errored, and — via
 * onAiTaskChanged — keep firing them as still-pending tasks finish. Also
 * marks tasks stuck in 'queued' past `timeout` as errored.
 *
 * @param {string} entityName - The task entity type.
 * @param {Object} handlers - { onComplete(task), onError(task), onPending(task), onUpdate(task) }.
 * @param {Object} [opts] - { timeout=300000, watch=true }. `watch:false` does a
 *        one-shot sweep with no live subscription.
 * @returns {Promise<function>} An unsubscribe function for the live watcher.
 */
export async function resumeAiTasks(entityName, handlers = {}, opts = {}) {
    const timeout = opts.timeout || DEFAULT_TIMEOUT;
    const watch = opts.watch !== false;
    const seen = new Set();

    function dispatch(task) {
        if (!task || task.data == null) {
            return;
        }
        const status = task.data.status;
        if (handlers.onUpdate) {
            try { handlers.onUpdate(task); } catch (e) { console.error(MODULE + ' onUpdate threw:', e); }
        }
        if (status === 'complete') {
            if (seen.has('done:' + task.id)) return;
            seen.add('done:' + task.id);
            if (handlers.onComplete) {
                try { handlers.onComplete(task); } catch (e) { console.error(MODULE + ' onComplete threw:', e); }
            }
        } else if (status === 'error') {
            if (seen.has('done:' + task.id)) return;
            seen.add('done:' + task.id);
            if (handlers.onError) {
                try { handlers.onError(task); } catch (e) { console.error(MODULE + ' onError threw:', e); }
            }
        } else {
            // queued / running — check for a stuck task.
            const created = new Date(task.created_at || Date.now()).getTime();
            if (Date.now() - created > timeout) {
                markTimedOut(task);
            } else if (handlers.onPending) {
                try { handlers.onPending(task); } catch (e) { console.error(MODULE + ' onPending threw:', e); }
            }
        }
    }

    async function markTimedOut(task) {
        if (seen.has('done:' + task.id)) {
            return;
        }
        seen.add('done:' + task.id);
        try {
            const p = requirePt();
            await p.edit(task.id, {
                status: 'error',
                error_message: 'AI task timed out after ' + Math.round(timeout / 1000) + 's'
            }, true);
        } catch (e) {
            console.error(MODULE + ' markTimedOut failed:', e);
        }
        if (handlers.onError) {
            try {
                handlers.onError(Object.assign({}, task, {
                    data: Object.assign({}, task.data, { status: 'error' })
                }));
            } catch (e) {
                console.error(MODULE + ' onError threw:', e);
            }
        }
    }

    // Initial sweep.
    try {
        const p = requirePt();
        // pt.list() returns a BARE ARRAY unless you pass returnMetadata: true,
        // in which case it returns { entities, count, pagination }. Handle both.
        const res = await p.list({ entityNames: [entityName], limit: 1000 });
        const tasks = Array.isArray(res) ? res : ((res && res.entities) || []);
        tasks.forEach(dispatch);
    } catch (err) {
        console.error(MODULE + ' resumeAiTasks initial sweep failed:', err);
    }

    if (!watch) {
        return function () {};
    }
    return onAiTaskChanged(entityName, dispatch);
}

/**
 * React to changes on a fire-and-forget task entity type in near-real-time by
 * fetching the changed entity and passing it to `cb`. Wraps pt.onEntityChanged
 * — this is the recommended alternative to hand-rolled setInterval polling.
 * @param {string} entityName - The task entity type.
 * @param {function} cb - Called with the changed task entity.
 * @returns {function} Unsubscribe function.
 */
export function onAiTaskChanged(entityName, cb) {
    if (typeof window === 'undefined' || !window.pt || typeof window.pt.onEntityChanged !== 'function') {
        console.error(MODULE + ' onAiTaskChanged: pt.onEntityChanged unavailable');
        return function () {};
    }
    let handle = null;
    try {
        handle = window.pt.onEntityChanged(async (event) => {
            try {
                const ids = [];
                if (event && event.entity_id != null) {
                    ids.push(event.entity_id);
                }
                if (event && Array.isArray(event.updated_entity_ids)) {
                    ids.push(...event.updated_entity_ids);
                }
                if (event && Array.isArray(event.inserted_entity_ids)) {
                    ids.push(...event.inserted_entity_ids);
                }
                for (const id of ids) {
                    const task = await window.pt.get(toId(id));
                    if (task && task.entity_name === entityName) {
                        cb(task);
                    }
                }
            } catch (err) {
                console.error(MODULE + ' onAiTaskChanged handler failed:', err);
            }
        });
        // NOTE: deliberately NO { entityName } runtime filter — the host only
        // stamps entity_name on 'inserted' events, so a filtered subscription
        // never sees the UPDATED event that signals task completion. The
        // handler above already fetches each entity and filters by
        // task.entity_name client-side, which covers all event kinds.
    } catch (err) {
        console.error(MODULE + ' onAiTaskChanged subscribe failed:', err);
        return function () {};
    }
    return typeof handle === 'function'
        ? handle
        : (handle && handle.unsubscribe ? handle.unsubscribe : function () {});
}
