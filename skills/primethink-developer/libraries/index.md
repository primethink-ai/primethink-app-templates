# PrimeThink Live App Libraries

A flat set of dependency-light **ES-module** libraries distilled from the recurring
code across every Live App in this repo. Copy the files you need into an app folder
and import from them — there is no build step and no package to install.

The libraries come in two families:

- **`pt-*.js`** — framework-agnostic. Usable from HTML apps and React apps alike.
  The `pt-*` files import cleanly in any JavaScript environment (verified: all 12
  import with **zero side effects** — no `document`/`window` access at import time).
- **`ptr-*.js`** — React helpers (hooks, components). They read the platform-provided
  `React` / `ReactDOM` **globals** at module scope, so they only run in the browser
  where the platform has already defined those globals. They contain **no JSX** and
  build elements with `React.createElement` (aliased `const h = React.createElement`),
  because only the app's `index.js` entry gets the Babel JSX transform.

## Consumption models

Both models rely on the platform serving the app folder with an injected
`<base href="/api/v1/live/{chat}/app/">`, so relative `./x.js` imports resolve.

**(a) React multi-file app** — copy the files next to `index.js` and static-import:

```js
// index.js (the ONLY file that may contain JSX)
import { usePtCollection } from './ptr-hooks.js';
import { Button, Modal, ToastProvider, useToast } from './ptr-ui.js';
import { formatDate } from './pt-format.js';
```

**(b) HTML app** — use a module script, or dynamic-import from your inline script:

```html
<script type="module">
  import { list, create, update } from './pt-data.js';
  import { escapeHtml, html, renderInto } from './pt-safe.js';
  // ... app code ...
</script>
```

```js
// or lazily, inside an existing inline (non-module) script:
const { renderMarkdown } = await import('./pt-markdown.js');
```

### Flat-folder deploy constraint (important)

`test_app.sh` / `publish_app.sh` upload only **top-level** files from the app folder.
**Do not create subdirectories** — every library and every module you import must sit
directly beside `index.html` / `index.js`. All imports in these libraries are sibling
imports (`./pt-safe.js` etc.), so this holds as long as you keep the folder flat.

---

## File inventory

| File | Description | Key exports | Typical use |
|------|-------------|-------------|-------------|
| `pt-data.js` | Entity CRUD, list normalisation, batch, reorder, reactive store | `list` `listAll` `getById` `create` `update` `remove` `batchCreate` `batchUpdate` `batchRemove` `upsertSingleton` `reorder` `normList` `normEntity` `toId` `groupBy` `sortByField` `sortByCreated` `onEntitiesChanged` `createStore` | Any app that stores data in the chat DB |
| `pt-ai.js` | Fire-and-forget AI messaging + JSON extraction | `askAI` `askAIJson` `askAIMany` `stopAI` `startAiTask` `resumeAiTasks` `onAiTaskChanged` `extractJson` `buildPrompt` `DEFAULT_TIMEOUT` | Apps that ask the AI to generate/transform content |
| `pt-docs.js` | Documents: save, upload, download, export, search | `saveAndDownload` `uploadFiles` `uploadDataUrl` `extractDownloadUrl` `triggerDownload` `downloadBlob` `downloadText` `exportJson` `exportMarkdown` `getText` `search` `waitReady` `listDir` `deleteDocs` `downloadDocs` `dataUrlToBlob` | Export/download, file upload, doc search |
| `pt-safe.js` | XSS-safe rendering (escape before innerHTML) | `escapeHtml` `escapeAttr` `html` `raw` `setText` `renderInto` `safeUrl` `escapeCsvCell` `stripTags` | Every HTML app that builds markup from strings |
| `pt-format.js` | Date/number/string presentation helpers (no deps, no `pt`) | `formatDate` `formatDateTime` `formatTime` `relativeTime` `formatDuration` `formatCurrency` `formatNumber` `formatPercent` `formatBytes` `truncate` `initials` `slugify` `pluralize` `titleCase` `hashColor` `sortAlpha` `todayISO` `addDays` `daysBetween` `startOfWeek` `formatDateInput` | Displaying dates, money, labels |
| `pt-markdown.js` | Dependency-free markdown → **safe** HTML (imports `pt-safe.js`) | `renderMarkdown` `renderMarkdownInline` `mdToPlainText` `tailwindProseClasses` | Rendering AI/user markdown |
| `pt-csv.js` | CSV import/export (RFC-4180, no `pt` dep) | `toCsv` `parseCsv` `downloadCsv` `entitiesToRows` `rowsToEntityData` | Import/export tabular data |
| `pt-theme.js` | Dark-mode toggle (**only** file allowed to use localStorage) | `initTheme` `getTheme` `setTheme` `toggleTheme` `isDark` `onThemeChange` `THEME_STORAGE_KEY` | Theme switch |
| `pt-boot.js` | Startup boilerplate: pinned Tailwind, script/style loaders, React mount | `loadTailwind` `loadStylesheet` `loadScript` `loadScripts` `whenPtReady` `bootApp` `mountReact` `showFatalError` | App bootstrap |
| `pt-audio.js` | Mic recording, level metering, upload, diarized transcription | `createRecorder` `createLevelMeter` `uploadRecording` `transcribeRecording` `parseDiarizedTranscript` `playBlob` `blobToFile` `isRecordingSupported` `pickSupportedMimeType` `formatRecordingTime` `AudioError` `AUDIO_ERROR` | Voice notes, transcription |
| `pt-speech.js` | TTS, speech queue, live/dictation STT | `speak` `speakBrowser` `listVoices` `createSpeechQueue` `createLiveTranscriber` `createDictation` `clearSpeechCache` `stopAllSpeech` | Read-aloud, dictation |
| `pt-timing.js` | Drift-corrected scheduling (no deps) | `createMetronome` `createTicker` `createCountdown` `createStopwatch` `createAutoScroller` `beep` | Metronome, timers, auto-scroll |
| `ptr-hooks.js` | React data layer: collections, entity, singleton, filter/paginate | `usePtCollection` `usePtEntity` `usePtSingleton` `usePt` `usePtMembers` `useFilteredList` `usePagination` `useAsync` `useInterval` `useDebouncedValue` `useDebouncedCallback` `useOnMount` `useLocalDraft` `normList` `normEntity` `toId` `ptAvailable` | React CRUD apps |
| `ptr-router.js` | Hash-based multi-page routing | `Router` `Link` `NavTabs` `useRoute` `useParams` `useQueryState` `useTitle` `navigate` `back` `subscribe` `parseHash` `buildHash` `matchPath` `resolveRoute` `createRouter` | Multi-view React apps |
| `ptr-ai.js` | React fire-and-forget AI hooks | `useAiTask` `useAiJson` `useAiQueue` `buildTaskPrompt` `extractJson` `ptAvailable` | AI generators in React |
| `ptr-ui.js` | Shared React widget kit (36 exports) | `Button` `IconButton` `Input` `Textarea` `Select` `Checkbox` `Toggle` `Card` `Badge` `Avatar` `Modal` `Drawer` `Sidebar` `ConfirmProvider` `useConfirm` `ToastProvider` `useToast` `Tabs` `Tooltip` `SearchInput` `Pagination` `DataTable` `StatCard` `ProgressBar` `Skeleton` `Spinner` `EmptyState` `ErrorState` `PageHeader` `FileDropZone` `useFocusTrap` `useDebounced` `useId` `cx` | React UI |
| `ptr-editor.js` | Text/markdown/rich-text editors (imports `pt-markdown.js`) | `MarkdownEditor` `RichTextEditor` `QuillEditor` `EditorToolbar` `useUndoRedo` `useEditorAutosave` `insertAtCursor` `wrapSelection` `prefixLines` `sanitizeHtmlTree` `loadQuill` | Editing apps |
| `ptr-dnd.js` | Drag-and-drop / reordering (zero deps) | `useSortableList` `SortableList` `useDragBoard` `useFileDrop` `DragHandle` `arrayMove` `reindexOrder` | Reorderable lists, kanban |

---

## Core data & AI

### `pt-data.js`
Wraps `pt.add/get/list/edit/delete` and the batch calls. Normalises `pt.list()`'s two
return shapes (bare array vs `{entities}`) via `normList`; `listAll` auto-paginates.
`update` defaults `merge=true`. `reorder` writes a sequential `order` field. `createStore`
is a tiny reactive store (get/set/subscribe/refresh). Never writes
`created_at`/`updated_at`/`creator_user_id`.

```js
import { listAll, create, update, reorder } from './pt-data.js';
const todos = await listAll('todo');
const t = await create('todo', { text: 'Buy milk', done: false });
await update(t.id, { done: true });       // merge=true by default
```

### `pt-ai.js`
Fire-and-forget AI (no hand-rolled `setInterval` polling). `askAI` sends a message and
awaits the reply; `askAIJson` adds a schema hint + one retry and parses with
`extractJson` (strips ```json fences, repairs smart quotes/trailing commas). For slow
work use the task-entity pattern: `startAiTask` + `resumeAiTasks` + `onAiTaskChanged`.

```js
import { askAIJson } from './pt-ai.js';
const data = await askAIJson('List 3 fruit as {"fruit":[...]}');
```

### `pt-docs.js`
Documents and downloads. `saveAndDownload` saves via `pt.saveDocument` then triggers a
real browser download (handles every response shape through `extractDownloadUrl`, falling
back to `pt._getUrl` for the uuid stream endpoint). `uploadFiles` accepts a `FileList`,
array, or single file. All download helpers revoke the object URL and remove the temp anchor.

```js
import { exportJson, saveAndDownload } from './pt-docs.js';
exportJson(myData, 'backup.json');
await saveAndDownload('report.md', 'MARKDOWN', 'text/markdown', md);
```

## Utilities

### `pt-safe.js`
Escape **before** `innerHTML`. `escapeHtml`/`escapeAttr` for interpolation, the ``html`` ``
tagged template auto-escapes interpolations and returns a `RawHtml` wrapper (use `.value`
for the string or pass to `renderInto`); `raw()` opts a trusted fragment out. `safeUrl`
blocks `javascript:`/`data:`/`vbscript:`/`file:`.

```js
import { html, renderInto } from './pt-safe.js';
renderInto(el, html`<h1>${userTitle}</h1>`);   // userTitle is escaped
```

### `pt-format.js`
No dependencies, no `pt`. Date helpers return `''` (never `Invalid Date`) on bad input.

```js
import { formatDate, relativeTime, formatCurrency } from './pt-format.js';
formatCurrency(1234.5, 'GBP', 'en-GB');   // "£1,234.50"
relativeTime(Date.now() - 3*864e5);        // "3 days ago"
```

### `pt-markdown.js`
Escapes first, then applies markup — output is XSS-safe. Links run through `safeUrl` and
get `target=_blank rel="noopener noreferrer"`. Supports headings, bold/italic/strike,
inline+fenced code, lists, blockquotes, tables, hr. Imports `escapeHtml`/`safeUrl` from
`pt-safe.js`, so **copy `pt-safe.js` too**.

```js
import { renderMarkdown, tailwindProseClasses } from './pt-markdown.js';
el.className = tailwindProseClasses;
el.innerHTML = renderMarkdown(aiText);     // already escaped
```

### `pt-csv.js`
RFC-4180 quoting, CRLF, UTF-8 BOM for Excel. `parseCsv(toCsv(rows))` round-trips embedded
commas, newlines and quotes (verified in the smoke test).

```js
import { toCsv, parseCsv, downloadCsv } from './pt-csv.js';
downloadCsv(rows, 'contacts.csv', { columns: ['name', 'email'] });
```

### `pt-theme.js`
The **only** module permitted to use `localStorage` (key `pt-theme`, device-local UI
preference only). Toggles the `dark`/`light` class on `<html>`; follows the OS in
`'system'` mode.

```js
import { initTheme, toggleTheme } from './pt-theme.js';
initTheme();
button.onclick = toggleTheme;
```

### `pt-boot.js`
Startup boilerplate. `loadTailwind` injects the pinned CDN build with `darkMode:'class'`;
`whenPtReady` resolves `pt` (or null after timeout); `mountReact` mounts into `#root`
using the `React`/`ReactDOM` globals (no import, no JSX).

```js
import { loadTailwind, whenPtReady } from './pt-boot.js';
await loadTailwind();
await whenPtReady();
```

## Media

### `pt-audio.js`
`createRecorder()` returns `{start,pause,resume,stop,cancel,getState,dispose}`; `stop`
resolves `{blob,mimeType,durationMs,url}`. `NotAllowedError`→`PERMISSION_DENIED`,
`NotFoundError`→`NO_DEVICE`. `transcribeRecording` uploads then calls `pt.diarizeAudio`
and normalises to `{text, segments:[{speaker,start,end,text}]}`.

```js
import { createRecorder, transcribeRecording } from './pt-audio.js';
const rec = createRecorder();
await rec.start();
const { blob } = await rec.stop();
const { text, segments } = await transcribeRecording(blob);
```

### `pt-speech.js`
`speak()` uses `pt.generateVoice` with an in-memory cache and returns a handle with
`stop()`. `createSpeechQueue` plays sequentially. `createLiveTranscriber` uses
`pt.sttStreamToken` + the ElevenLabs Scribe SDK (loaded via full-URL dynamic import).
`createDictation` wraps `webkitSpeechRecognition` with auto-restart.

```js
import { speak, createSpeechQueue } from './pt-speech.js';
const h = await speak('Hello there');   // h.stop() to interrupt
```

### `pt-timing.js`
Drift-corrected scheduling built on `AudioContext` look-ahead (not `setInterval`).
Every factory returns `start`/`stop`/`dispose`.

```js
import { createMetronome, createAutoScroller } from './pt-timing.js';
const m = createMetronome({ bpm: 120 });
m.start();
```

## React hooks & routing

### `ptr-hooks.js`
`usePtCollection(entityName)` loads + live-syncs (debounced `onEntityChanged`) and returns
`{items, loading, add, update, remove, reorder}` with optimistic updates. `usePtEntity`,
`usePtSingleton`, `useFilteredList`, `usePagination`, plus generic hooks. All fetch effects
guard against setState-after-unmount via an `alive` ref. `useLocalDraft` is **in-memory**,
not localStorage.

```jsx
const { items, add, update, remove } = usePtCollection('todo');
```

### `ptr-router.js`
Hash routing. The `hashchange` listener is attached lazily and window-guarded (no
import-time side effect). `useTitle` only calls `pt.renameChat` when you pass
`{renameChat:true}`.

```jsx
import { Router, Link, useRoute } from './ptr-router.js';
<Router routes={{ '/': Home, '/note/:id': Note }} fallback={NotFound} />
<Link to="/note/1">Open</Link>
```

### `ptr-ai.js`
React fire-and-forget hooks. `useAiTask` returns
`{status, result, error, entity, taskId, run, reset}`; it resumes a pending task on mount
and cleans up its timeout/subscription. `useAiJson` parses+validates JSON; `useAiQueue`
batches prompts via `pt.batchAdd`.

```jsx
const { status, result, run } = useAiJson({ entityName: 'draft' });
run('Summarise this as {"summary":"..."}');
```

## React UI & editors

### `ptr-ui.js`
36 accessible widgets. Portals (`Modal`, `Drawer`, `ToastHost`) guard on
`ReactDOM.createPortal` with an inline fallback. `ConfirmProvider`+`useConfirm` replace
`window.confirm`; `ToastProvider`+`useToast` replace ad-hoc toasts. Imports `hashColor`
from `pt-format.js` for `Avatar`, so **copy `pt-format.js` too**.

```jsx
import { ToastProvider, useToast, DataTable, Button } from './ptr-ui.js';
const toast = useToast();
<Button variant="primary" onClick={() => toast.success('Saved')}>Save</Button>
```

### `ptr-editor.js`
`MarkdownEditor` (toolbar + live preview + word count; preview HTML comes only from
`pt-markdown.renderMarkdown`, the single justified `dangerouslySetInnerHTML`).
`RichTextEditor` (contenteditable, sanitises paste via `sanitizeHtmlTree`). `QuillEditor`
lazily loads pinned Quill 2.0.2. Imports `pt-markdown.js`, so **copy `pt-markdown.js` +
`pt-safe.js` too**.

```jsx
import { MarkdownEditor } from './ptr-editor.js';
<MarkdownEditor value={body} onChange={setBody}
                onAutosave={(v) => update(page.id, { body: v })} />
```

### `ptr-dnd.js`
Zero-dependency HTML5 drag-and-drop with keyboard reorder (Alt+Arrow). `useSortableList`
/`SortableList` for single lists; `useDragBoard` for kanban (returns a `pt.batchEdit`
payload). `reindexOrder` builds the sequential-order write step. `useFileDrop` backs
`ptr-ui.FileDropZone`.

```jsx
import { SortableList } from './ptr-dnd.js';
<SortableList items={items} onReorder={(next) => reorder(next)}
              renderItem={(it) => it.data.text} />
```

---

## Choosing what to copy

| You are building… | Copy these files |
|-------------------|------------------|
| **CRUD list app (React)** | `pt-data.js` · `ptr-hooks.js` · `ptr-ui.js` · `pt-format.js` |
| **CRUD list app (HTML)** | `pt-data.js` · `pt-safe.js` · `pt-format.js` |
| **AI generator app** | *(above)* + `pt-ai.js` and, for React, `ptr-ai.js` |
| **Multi-page app** | + `ptr-router.js` |
| **Editor app** | `ptr-editor.js` · `pt-markdown.js` · `pt-safe.js` (+ `ptr-ui.js`) |
| **Markdown rendering (any)** | `pt-markdown.js` · `pt-safe.js` |
| **Voice / transcription app** | `pt-audio.js` · `pt-speech.js` |
| **Metronome / timers / auto-scroll** | `pt-timing.js` |
| **Import / export tabular data** | `pt-csv.js` (+ `pt-docs.js` for save/download) |
| **Reorderable list / kanban** | `ptr-dnd.js` (+ `pt-data.js` for `reorder`) |
| **File upload / document download** | `pt-docs.js` |
| **Dashboards / tables** | `ptr-ui.js` (`DataTable`, `StatCard`) · `pt-format.js` |

Always add `pt-theme.js` + `pt-boot.js` (or the inline Tailwind block) for a themed,
bootstrapped app.

### Dependency edges (must copy the imported file too)
- `pt-markdown.js` → `pt-safe.js`
- `ptr-editor.js` → `pt-markdown.js` → `pt-safe.js`
- `ptr-ui.js` → `pt-format.js`

### Note on duplicated micro-helpers (intentional)
To keep each file **independently copyable**, small pure helpers are re-declared rather
than shared across the `pt-*` / `ptr-*` boundary:
`normList`/`normEntity`/`toId` (canonical in `pt-data.js`, re-declared in `ptr-hooks.js`
and privately in `ptr-ai.js`/`pt-docs.js`/`pt-ai.js`), `extractJson` (in both `pt-ai.js`
and `ptr-ai.js`), and the debounce hook (`useDebouncedValue` in `ptr-hooks.js`,
`useDebounced` in `ptr-ui.js`). Each copy is byte-for-byte-equivalent in behaviour. This
is a deliberate trade of DRY for zero-coupling; do not "fix" it by adding cross-imports
unless you also accept forcing consumers to copy extra files.

---

## Rules a consumer must still follow

1. **No `localStorage` for app/shared data.** Use the chat DB (`pt-data.js`). Only
   `pt-theme.js` may touch `localStorage`, and only for the theme preference.
2. **Escape before `innerHTML`.** Use `pt-safe.js` (`html`/`escapeHtml`/`renderInto`) or
   `textContent`. In React, never `dangerouslySetInnerHTML` user/AI/DB text (the only
   justified use is `ptr-editor`'s preview fed by the already-escaped `renderMarkdown`).
3. **Merge on edit.** `pt-data.update` and the `ptr-hooks` mutators default `merge=true`;
   if you call `pt.edit` directly, pass `true`.
4. **Pinned Tailwind with `darkMode:'class'`.** Load `https://cdn.tailwindcss.com/3.4.16`
   and set `tailwind.config = { darkMode: 'class' }` (or use `pt-boot.loadTailwind`).
   The platform does not inject Tailwind.
5. **Keep the folder flat.** Only top-level files are uploaded; no subdirectories.
6. **Only `index.js` gets the JSX transform.** Every other file (including all `ptr-*.js`)
   must be plain JS using `React.createElement`.
7. **Never write `created_at` / `updated_at` / `creator_user_id`** into entity `data`;
   the platform manages them.
8. **Don't hardcode API URLs.** Use `pt._getUrl(...)` or the `download_url` from responses.
