// ============================================================================
// ptr-editor.js — React editor library for PrimeThink Live Apps (page_type
// "react"). Built entirely with React.createElement (aliased `h`) — this file
// is served RAW (only index.js is Babel-transpiled), so it contains NO JSX.
//
// Distilled from the content-editing surfaces across: wiki, team-knowledge-base,
// business-case-builder, document-proofreader, 11plus-creative-writing,
// story_forge, knowledge-base-consolidator, briefing-insight-builder,
// release_notes_manager, whats-new. Those apps each re-implemented a
// toolbar + textarea/contenteditable + autosave + live preview; this is the
// shared, accessible, dark-mode version.
//
// Markdown is rendered to HTML via renderMarkdown() from './pt-markdown.js',
// which ESCAPES first and returns safe HTML. That is the ONLY source ever fed
// to dangerouslySetInnerHTML here (see MarkdownEditor preview) — never pass raw
// user/AI/DB strings to it.
//
// React 18 + ReactDOM are platform browser globals — never import them.
//
// USAGE (from your JSX index.js):
//   import { MarkdownEditor, RichTextEditor, useEditorAutosave } from './ptr-editor.js';
//
//   function DocEditor({ page }) {
//       const [md, setMd] = React.useState(page.body);
//       return (
//           <MarkdownEditor
//               value={md}
//               onChange={setMd}
//               onAutosave={(v) => pt.edit(page.id, { body: v }, true)}
//               preview
//           />
//       );
//   }
// ============================================================================

const h = React.createElement;
const { useState, useEffect, useRef, useCallback, useMemo } = React;

// renderMarkdown(markdownString) -> safe (already-escaped) HTML string.
// Sibling library written in parallel; namespace import so a missing export
// degrades to plain-text preview instead of throwing at link time.
import * as ptMarkdown from './pt-markdown.js';

// ----------------------------------------------------------------------------
// Low-level text helpers
// ----------------------------------------------------------------------------

/**
 * Insert `text` at the cursor of a textarea/input, replacing any selection, and
 * leave the caret after the inserted text. Mutates `el.value` and dispatches no
 * event — callers read el.value and push it into React state.
 * @param {HTMLTextAreaElement|HTMLInputElement} el
 * @param {string} text
 * @returns {string} The new full value.
 */
export function insertAtCursor(el, text) {
    if (!el) return '';
    const start = el.selectionStart != null ? el.selectionStart : el.value.length;
    const end = el.selectionEnd != null ? el.selectionEnd : el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    el.value = before + text + after;
    const caret = start + text.length;
    el.selectionStart = el.selectionEnd = caret;
    return el.value;
}

/**
 * Wrap the current textarea selection with `before`/`after` markers (e.g. '**'
 * for bold). If nothing is selected, inserts the markers with `placeholder`
 * between them and selects the placeholder. Returns the new value.
 * @param {HTMLTextAreaElement} el
 * @param {string} before
 * @param {string} [after]
 * @param {string} [placeholder]
 * @returns {string}
 */
export function wrapSelection(el, before, after, placeholder) {
    if (!el) return '';
    if (after == null) after = before;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const sel = el.value.slice(start, end) || (placeholder || '');
    const value = el.value.slice(0, start) + before + sel + after + el.value.slice(end);
    el.value = value;
    el.selectionStart = start + before.length;
    el.selectionEnd = start + before.length + sel.length;
    return value;
}

/**
 * Prefix each selected line (or the current line) with `prefix` — used for
 * headings, quotes and list items. Returns the new value.
 * @param {HTMLTextAreaElement} el
 * @param {string} prefix
 * @returns {string}
 */
export function prefixLines(el, prefix) {
    if (!el) return '';
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const lineStart = el.value.lastIndexOf('\n', start - 1) + 1;
    const block = el.value.slice(lineStart, end);
    const replaced = block.split('\n').map((l) => prefix + l).join('\n');
    const value = el.value.slice(0, lineStart) + replaced + el.value.slice(end);
    el.value = value;
    el.selectionStart = lineStart;
    el.selectionEnd = lineStart + replaced.length;
    return value;
}

// ----------------------------------------------------------------------------
// useUndoRedo
// ----------------------------------------------------------------------------

/**
 * Lightweight undo/redo history layered over a controlled value. Wraps your
 * setter so every change is recorded; exposes undo()/redo() and can/undo flags.
 * (The browser's native textarea history is lost once you setState from React,
 * so editors that mutate value programmatically need this.)
 * @template T
 * @param {T} value Current value (kept in sync with your state).
 * @param {function} setValue Your state setter.
 * @param {object} [opts]
 * @param {number} [opts.limit] Max history entries (default 100).
 * @returns {{set:function,undo:function,redo:function,canUndo:boolean,canRedo:boolean}}
 */
export function useUndoRedo(value, setValue, opts) {
    const limit = (opts && opts.limit) || 100;
    const past = useRef([]);
    const future = useRef([]);
    const current = useRef(value);
    current.current = value;

    const set = useCallback((next) => {
        past.current.push(current.current);
        if (past.current.length > limit) past.current.shift();
        future.current = [];
        setValue(next);
    }, [setValue, limit]);

    const undo = useCallback(() => {
        if (!past.current.length) return;
        const prev = past.current.pop();
        future.current.push(current.current);
        setValue(prev);
    }, [setValue]);

    const redo = useCallback(() => {
        if (!future.current.length) return;
        const next = future.current.pop();
        past.current.push(current.current);
        setValue(next);
    }, [setValue]);

    return {
        set,
        undo,
        redo,
        canUndo: past.current.length > 0,
        canRedo: future.current.length > 0
    };
}

// ----------------------------------------------------------------------------
// useEditorAutosave
// ----------------------------------------------------------------------------

/**
 * Debounced autosave with status tracking. Saves `value` via `onSave` after
 * `delayMs` of inactivity, flushes on unmount and on tab hide
 * (visibilitychange) so no edits are lost, and exposes a 'idle'|'saving'|
 * 'saved'|'error' status plus a manual flush(). Distilled from the ad-hoc
 * setTimeout autosavers in wiki, team-knowledge-base, business-case-builder.
 * @param {object} args
 * @param {*} args.value The value to persist.
 * @param {function} args.onSave async (value) => void. Errors set status 'error'.
 * @param {number} [args.delayMs] Debounce delay (default 800).
 * @param {boolean} [args.enabled] Set false to pause autosaving (default true).
 * @returns {{status:string,lastSavedAt:number|null,flush:function,error:Error|null}}
 */
export function useEditorAutosave({ value, onSave, delayMs = 800, enabled = true } = {}) {
    const [status, setStatus] = useState('idle');
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [error, setError] = useState(null);
    const timer = useRef(null);
    const latest = useRef(value);
    const savedRef = useRef(value);
    const onSaveRef = useRef(onSave);
    latest.current = value;
    onSaveRef.current = onSave;

    const doSave = useCallback(async () => {
        if (!onSaveRef.current) return;
        const v = latest.current;
        if (v === savedRef.current) return; // nothing changed
        setStatus('saving');
        try {
            await onSaveRef.current(v);
            savedRef.current = v;
            setError(null);
            setStatus('saved');
            setLastSavedAt(Date.now());
        } catch (e) {
            setError(e);
            setStatus('error');
            console.error('[ptr-editor] autosave failed:', e);
        }
    }, []);

    const flush = useCallback(() => {
        if (timer.current) { clearTimeout(timer.current); timer.current = null; }
        return doSave();
    }, [doSave]);

    // Debounced save when value changes.
    useEffect(() => {
        if (!enabled) return undefined;
        if (value === savedRef.current) return undefined;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { doSave(); }, delayMs);
        return () => { if (timer.current) clearTimeout(timer.current); };
    }, [value, delayMs, enabled, doSave]);

    // Flush on tab hide + unmount so in-flight edits are never dropped.
    useEffect(() => {
        function onVisibility() { if (document.visibilityState === 'hidden') flush(); }
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            flush();
        };
    }, [flush]);

    return { status, lastSavedAt, flush, error };
}

// ----------------------------------------------------------------------------
// Toolbar
// ----------------------------------------------------------------------------

const _TB_BTN = 'inline-flex items-center justify-center w-8 h-8 rounded text-sm font-medium text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition';

/**
 * Editor toolbar — a row of accessible command buttons. Generic enough for both
 * MarkdownEditor and RichTextEditor; pass your own `actions`.
 * @param {object} props
 * @param {Array<{id:string,label:string,icon:React.ReactNode,onAction:function}>} props.actions
 * @param {React.ReactNode} [props.trailing] Right-aligned extras (e.g. counts).
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function EditorToolbar({ actions = [], trailing, className } = {}) {
    return h('div', {
        role: 'toolbar',
        'aria-label': 'Formatting',
        className: cxLocal('flex items-center gap-1 flex-wrap px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800', className)
    },
        actions.map((a) => a.divider
            ? h('span', { key: a.id, 'aria-hidden': 'true', className: 'w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1' })
            : h('button', {
                key: a.id,
                type: 'button',
                title: a.label,
                'aria-label': a.label,
                onMouseDown: (e) => e.preventDefault(), // keep textarea focus/selection
                onClick: a.onAction,
                className: _TB_BTN
            }, a.icon)
        ),
        trailing ? h('span', { className: 'ml-auto text-xs text-gray-400 dark:text-gray-500' }, trailing) : null
    );
}

// Local class joiner (kept dependency-free; mirrors ptr-ui.cx).
function cxLocal(...parts) { return parts.filter(Boolean).join(' '); }

// ----------------------------------------------------------------------------
// MarkdownEditor
// ----------------------------------------------------------------------------

/**
 * Markdown editor: toolbar + textarea with an optional live preview pane.
 * Supports controlled (`value`+`onChange`) or uncontrolled (`defaultValue`)
 * use, Tab-to-indent, Cmd/Ctrl+B/I/K shortcuts, a character/word counter, and a
 * debounced `onAutosave`. The preview is rendered from renderMarkdown() in
 * pt-markdown.js — that output is pre-escaped safe HTML, which is why it is the
 * only value passed to dangerouslySetInnerHTML in this file.
 * @param {object} props
 * @param {string} [props.value] Controlled markdown value.
 * @param {string} [props.defaultValue] Initial value when uncontrolled.
 * @param {function} [props.onChange] Called with the new markdown string.
 * @param {function} [props.onAutosave] async (value)=>void, debounced.
 * @param {number} [props.autosaveDelay] ms (default 800).
 * @param {boolean} [props.preview] Show the side-by-side preview pane.
 * @param {string} [props.placeholder]
 * @param {number} [props.minRows]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function MarkdownEditor(props = {}) {
    const {
        value: controlledValue, defaultValue = '', onChange, onAutosave,
        autosaveDelay = 800, preview = false, placeholder = 'Write markdown\u2026',
        minRows = 10, className
    } = props;

    const isControlled = controlledValue != null;
    const [innerValue, setInnerValue] = useState(defaultValue);
    const value = isControlled ? controlledValue : innerValue;
    const taRef = useRef(null);

    const setValue = useCallback((next) => {
        if (!isControlled) setInnerValue(next);
        onChange && onChange(next);
    }, [isControlled, onChange]);

    // Autosave (only wired when onAutosave is supplied).
    const autosave = useEditorAutosave({ value, onSave: onAutosave || null, delayMs: autosaveDelay, enabled: !!onAutosave });

    const applyFromEl = useCallback(() => {
        // Read the textarea's mutated value and selection back into state.
        if (taRef.current) setValue(taRef.current.value);
    }, [setValue]);

    const doWrap = useCallback((before, after, ph) => {
        const el = taRef.current; if (!el) return;
        el.focus();
        wrapSelection(el, before, after, ph);
        applyFromEl();
    }, [applyFromEl]);

    const doPrefix = useCallback((prefix) => {
        const el = taRef.current; if (!el) return;
        el.focus();
        prefixLines(el, prefix);
        applyFromEl();
    }, [applyFromEl]);

    const doLink = useCallback(() => {
        const el = taRef.current; if (!el) return;
        el.focus();
        const sel = el.value.slice(el.selectionStart, el.selectionEnd) || 'text';
        wrapSelection(el, '[', '](url)', sel);
        applyFromEl();
    }, [applyFromEl]);

    const actions = useMemo(() => [
        { id: 'bold', label: 'Bold (Ctrl/Cmd+B)', icon: h('strong', null, 'B'), onAction: () => doWrap('**', '**', 'bold') },
        { id: 'italic', label: 'Italic (Ctrl/Cmd+I)', icon: h('em', null, 'I'), onAction: () => doWrap('*', '*', 'italic') },
        { id: 'd1', divider: true },
        { id: 'h1', label: 'Heading 1', icon: 'H1', onAction: () => doPrefix('# ') },
        { id: 'h2', label: 'Heading 2', icon: 'H2', onAction: () => doPrefix('## ') },
        { id: 'quote', label: 'Quote', icon: '\u201D', onAction: () => doPrefix('> ') },
        { id: 'd2', divider: true },
        { id: 'ul', label: 'Bulleted list', icon: '\u2022', onAction: () => doPrefix('- ') },
        { id: 'ol', label: 'Numbered list', icon: '1.', onAction: () => doPrefix('1. ') },
        { id: 'code', label: 'Inline code', icon: h('span', { className: 'font-mono' }, '\u003C\u003E'), onAction: () => doWrap('`', '`', 'code') },
        { id: 'link', label: 'Link (Ctrl/Cmd+K)', icon: '\uD83D\uDD17', onAction: doLink }
    ], [doWrap, doPrefix, doLink]);

    const onKeyDown = useCallback((e) => {
        const el = taRef.current; if (!el) return;
        // Tab-to-indent (and Shift+Tab to outdent).
        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                const start = el.selectionStart;
                const lineStart = el.value.lastIndexOf('\n', start - 1) + 1;
                if (el.value.slice(lineStart, lineStart + 4) === '    ') {
                    el.value = el.value.slice(0, lineStart) + el.value.slice(lineStart + 4);
                    el.selectionStart = el.selectionEnd = Math.max(lineStart, start - 4);
                    applyFromEl();
                }
            } else {
                insertAtCursor(el, '    ');
                applyFromEl();
            }
            return;
        }
        const mod = e.metaKey || e.ctrlKey;
        if (!mod) return;
        const k = e.key.toLowerCase();
        if (k === 'b') { e.preventDefault(); doWrap('**', '**', 'bold'); }
        else if (k === 'i') { e.preventDefault(); doWrap('*', '*', 'italic'); }
        else if (k === 'k') { e.preventDefault(); doLink(); }
    }, [applyFromEl, doWrap, doLink]);

    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    const chars = value.length;

    const statusText = onAutosave
        ? (autosave.status === 'saving' ? 'Saving\u2026' : autosave.status === 'saved' ? 'Saved' : autosave.status === 'error' ? 'Save failed' : '')
        : '';
    const counter = (statusText ? statusText + ' \u00B7 ' : '') + words + ' words \u00B7 ' + chars + ' chars';

    const previewHtml = useMemo(() => {
        if (!preview) return '';
        if (ptMarkdown && typeof ptMarkdown.renderMarkdown === 'function') return ptMarkdown.renderMarkdown(value);
        // Fallback: no markdown lib deployed — show escaped plain text, never raw.
        return escapeBasic(value).replace(/\n/g, '<br>');
    }, [preview, value]);

    return h('div', { className: cxLocal('flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800', className) },
        h(EditorToolbar, { actions, trailing: counter }),
        h('div', { className: cxLocal('flex-1 grid', preview ? 'grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700' : 'grid-cols-1') },
            h('textarea', {
                ref: taRef,
                value,
                rows: minRows,
                placeholder,
                spellCheck: true,
                'aria-label': 'Markdown source',
                onChange: (e) => setValue(e.target.value),
                onKeyDown,
                className: 'w-full resize-y px-4 py-3 font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none'
            }),
            preview ? h('div', {
                'aria-label': 'Preview',
                className: 'prose prose-sm dark:prose-invert max-w-none px-4 py-3 overflow-auto text-gray-800 dark:text-gray-100',
                // SAFE: previewHtml comes from pt-markdown.renderMarkdown(), which
                // escapes input before formatting (or from escapeBasic() fallback).
                dangerouslySetInnerHTML: { __html: previewHtml }
            }) : null
        )
    );
}

// Minimal HTML escaper for the no-markdown-lib fallback path only.
function escapeBasic(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ----------------------------------------------------------------------------
// RichTextEditor (contenteditable)
// ----------------------------------------------------------------------------

// Tags allowed to survive paste-sanitisation and clean-HTML extraction.
const _ALLOWED_TAGS = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, A: 1, P: 1, BR: 1, UL: 1, OL: 1, LI: 1, H1: 1, H2: 1, H3: 1, BLOCKQUOTE: 1, CODE: 1, PRE: 1 };

/**
 * Recursively strip disallowed tags, all attributes (except safe href on <a>)
 * and inline styles from a DOM subtree, returning clean HTML. Used both to
 * sanitise pasted content and to emit the editor's value.
 * @param {Node} root
 * @returns {string} Clean HTML string.
 */
export function sanitizeHtmlTree(root) {
    const doc = root.ownerDocument || document;
    const out = doc.createElement('div');
    function walk(node, into) {
        node.childNodes.forEach((child) => {
            if (child.nodeType === 3) { // text
                into.appendChild(doc.createTextNode(child.nodeValue));
                return;
            }
            if (child.nodeType !== 1) return; // skip comments etc.
            const tag = child.tagName;
            if (_ALLOWED_TAGS[tag]) {
                const clean = doc.createElement(tag);
                if (tag === 'A') {
                    const href = child.getAttribute('href') || '';
                    // Only allow safe schemes; drop javascript:/data: etc.
                    if (/^(https?:|mailto:|\/|#)/i.test(href)) {
                        clean.setAttribute('href', href);
                        clean.setAttribute('rel', 'noopener noreferrer');
                        clean.setAttribute('target', '_blank');
                    }
                }
                walk(child, clean);
                into.appendChild(clean);
            } else {
                // Unwrap disallowed element: keep its (sanitised) children.
                walk(child, into);
            }
        });
    }
    walk(root, out);
    return out.innerHTML;
}

/**
 * Rich text editor over a contenteditable div. It emits CLEAN HTML (via
 * sanitizeHtmlTree) on every change, sanitises pasted content by stripping
 * tags/styles/scripts, and exposes the same toolbar actions as MarkdownEditor.
 *
 * Formatting uses document.execCommand where available (still the pragmatic
 * cross-browser path for contenteditable) with a Selection/Range fallback for
 * link insertion. CAVEATS: execCommand is deprecated (though universally
 * implemented in current Chromium/Safari/Firefox) and undo/redo of programmatic
 * commands is browser-dependent; if you need deterministic history, drive a
 * MarkdownEditor + useUndoRedo instead. This is why the value is always
 * re-sanitised on read rather than trusted from the DOM.
 * @param {object} props
 * @param {string} [props.value] Controlled HTML value (clean HTML).
 * @param {function} [props.onChange] Called with clean HTML on edit.
 * @param {function} [props.onAutosave] async (html)=>void, debounced.
 * @param {number} [props.autosaveDelay]
 * @param {string} [props.placeholder]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function RichTextEditor(props = {}) {
    const {
        value = '', onChange, onAutosave, autosaveDelay = 800,
        placeholder = 'Write\u2026', className
    } = props;
    const ref = useRef(null);
    const lastEmitted = useRef(value);

    // Keep the DOM in sync with controlled value without clobbering the caret
    // during active typing (only overwrite when value diverges from what we
    // last emitted).
    useEffect(() => {
        const el = ref.current;
        if (el && value !== lastEmitted.current && value !== el.innerHTML) {
            el.innerHTML = value || '';
            lastEmitted.current = value;
        }
    }, [value]);

    const emit = useCallback(() => {
        const el = ref.current; if (!el) return;
        const clean = sanitizeHtmlTree(el);
        lastEmitted.current = clean;
        onChange && onChange(clean);
    }, [onChange]);

    useEditorAutosave({ value, onSave: onAutosave || null, delayMs: autosaveDelay, enabled: !!onAutosave });

    const exec = useCallback((command, arg) => {
        const el = ref.current; if (!el) return;
        el.focus();
        try {
            if (typeof document.execCommand === 'function') {
                document.execCommand(command, false, arg);
            }
        } catch (e) {
            console.warn('[ptr-editor] execCommand failed:', command, e);
        }
        emit();
    }, [emit]);

    const insertLink = useCallback(() => {
        const el = ref.current; if (!el) return;
        el.focus();
        const url = (typeof window !== 'undefined' && window.prompt) ? window.prompt('Link URL:', 'https://') : null;
        if (!url) return;
        if (!/^(https?:|mailto:|\/|#)/i.test(url)) return; // reject unsafe schemes
        // Prefer execCommand; fall back to manual Range insertion.
        if (typeof document.execCommand === 'function') {
            document.execCommand('createLink', false, url);
        } else {
            const sel = window.getSelection();
            if (sel && sel.rangeCount) {
                const range = sel.getRangeAt(0);
                const a = document.createElement('a');
                a.href = url;
                a.appendChild(range.extractContents());
                range.insertNode(a);
            }
        }
        emit();
    }, [emit]);

    const actions = useMemo(() => [
        { id: 'bold', label: 'Bold', icon: h('strong', null, 'B'), onAction: () => exec('bold') },
        { id: 'italic', label: 'Italic', icon: h('em', null, 'I'), onAction: () => exec('italic') },
        { id: 'underline', label: 'Underline', icon: h('u', null, 'U'), onAction: () => exec('underline') },
        { id: 'd1', divider: true },
        { id: 'h1', label: 'Heading 1', icon: 'H1', onAction: () => exec('formatBlock', 'H1') },
        { id: 'h2', label: 'Heading 2', icon: 'H2', onAction: () => exec('formatBlock', 'H2') },
        { id: 'quote', label: 'Quote', icon: '\u201D', onAction: () => exec('formatBlock', 'BLOCKQUOTE') },
        { id: 'd2', divider: true },
        { id: 'ul', label: 'Bulleted list', icon: '\u2022', onAction: () => exec('insertUnorderedList') },
        { id: 'ol', label: 'Numbered list', icon: '1.', onAction: () => exec('insertOrderedList') },
        { id: 'link', label: 'Link', icon: '\uD83D\uDD17', onAction: insertLink }
    ], [exec, insertLink]);

    const onPaste = useCallback((e) => {
        // Sanitise on paste: strip tags/styles by taking text or cleaning HTML.
        e.preventDefault();
        const cd = e.clipboardData || (typeof window !== 'undefined' && window.clipboardData);
        if (!cd) return;
        const html = cd.getData('text/html');
        let toInsert;
        if (html) {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            toInsert = sanitizeHtmlTree(tmp);
        } else {
            toInsert = escapeBasic(cd.getData('text/plain')).replace(/\n/g, '<br>');
        }
        if (typeof document.execCommand === 'function') {
            document.execCommand('insertHTML', false, toInsert);
        } else {
            const sel = window.getSelection();
            if (sel && sel.rangeCount) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                const frag = range.createContextualFragment(toInsert);
                range.insertNode(frag);
            }
        }
        emit();
    }, [emit]);

    const onKeyDown = useCallback((e) => {
        const mod = e.metaKey || e.ctrlKey;
        if (!mod) return;
        const k = e.key.toLowerCase();
        if (k === 'b') { e.preventDefault(); exec('bold'); }
        else if (k === 'i') { e.preventDefault(); exec('italic'); }
        else if (k === 'u') { e.preventDefault(); exec('underline'); }
        else if (k === 'k') { e.preventDefault(); insertLink(); }
    }, [exec, insertLink]);

    return h('div', { className: cxLocal('flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800', className) },
        h(EditorToolbar, { actions }),
        h('div', {
            ref,
            contentEditable: true,
            suppressContentEditableWarning: true,
            role: 'textbox',
            'aria-multiline': 'true',
            'aria-label': 'Rich text editor',
            'data-placeholder': placeholder,
            onInput: emit,
            onPaste,
            onKeyDown,
            className: 'prose prose-sm dark:prose-invert max-w-none min-h-[10rem] px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500'
        })
        // Note: initial content is injected via the useEffect above (not
        // dangerouslySetInnerHTML) so we control caret behaviour and never
        // render an untrusted string on mount.
    );
}

// ----------------------------------------------------------------------------
// Quill integration (aligned with the platform's Quill Editor doc)
// ----------------------------------------------------------------------------

let _quillLoading = null;

/**
 * Idempotently load Quill 2.0.2 (the version the platform docs pin — 2.0.3+ has
 * a getSemanticHTML() regression that converts spaces to &nbsp; and breaks
 * word-wrap). Injects the snow CSS + script from jsDelivr once and resolves with
 * the global `Quill`. There is no './pt-boot.js' loadScript sibling in this
 * repo, so this implements its own guarded loader (documented deviation).
 * @param {object} [opts]
 * @param {string} [opts.version] Quill version (default '2.0.2' — do not bump).
 * @returns {Promise<any>} Resolves with window.Quill.
 */
export function loadQuill(opts) {
    const version = (opts && opts.version) || '2.0.2';
    if (typeof window !== 'undefined' && window.Quill) return Promise.resolve(window.Quill);
    if (_quillLoading) return _quillLoading;
    _quillLoading = new Promise((resolve, reject) => {
        // CSS (only add once).
        if (!document.querySelector('link[data-ptr-quill]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/quill@' + version + '/dist/quill.snow.css';
            link.setAttribute('data-ptr-quill', '1');
            document.head.appendChild(link);
        }
        const existing = document.querySelector('script[data-ptr-quill]');
        if (existing) {
            existing.addEventListener('load', () => resolve(window.Quill));
            existing.addEventListener('error', reject);
            return;
        }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/quill@' + version + '/dist/quill.js';
        s.setAttribute('data-ptr-quill', '1');
        s.onload = () => resolve(window.Quill);
        s.onerror = () => reject(new Error('Failed to load Quill'));
        document.head.appendChild(s);
    });
    return _quillLoading;
}

/**
 * React wrapper around Quill 2.0.2, following the platform's Quill Editor guide:
 * strips &nbsp; from getSemanticHTML() output on change (word-wrap fix) and
 * emits clean HTML. Loads Quill lazily via loadQuill(). Prefer MarkdownEditor /
 * RichTextEditor for lightweight needs; use this when you specifically want
 * Quill's snow toolbar.
 * @param {object} props
 * @param {string} [props.value] Initial HTML (set once on init).
 * @param {function} [props.onChange] Called with cleaned HTML on text-change.
 * @param {object} [props.modules] Quill modules config (default: snow toolbar).
 * @param {string} [props.placeholder]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function QuillEditor(props = {}) {
    const { value = '', onChange, modules, placeholder, className } = props;
    const hostRef = useRef(null);
    const quillRef = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        let cancelled = false;
        loadQuill().then((Quill) => {
            if (cancelled || !hostRef.current || quillRef.current) return;
            const q = new Quill(hostRef.current, {
                theme: 'snow',
                placeholder: placeholder || '',
                modules: modules || {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ header: 1 }, { header: 2 }],
                        ['blockquote', 'code-block'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['link', 'clean']
                    ]
                }
            });
            if (value) {
                const initial = q.clipboard.convert({ html: value });
                q.setContents(initial, 'silent');
            }
            q.on('text-change', () => {
                // Strip &nbsp; per the platform doc (prevents view-mode overflow).
                const html = q.getSemanticHTML().replace(/&nbsp;/g, ' ');
                onChangeRef.current && onChangeRef.current(html);
            });
            quillRef.current = q;
        }).catch((e) => console.error('[ptr-editor] Quill load error:', e));
        return () => { cancelled = true; };
        // Intentionally init-once: Quill owns its own DOM after mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return h('div', { className: cxLocal('ptr-quill rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden', className) },
        h('div', { ref: hostRef })
    );
}
