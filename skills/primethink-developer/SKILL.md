---
name: primethink-developer
description: Build PrimeThink Live Apps (both dynamic index.html apps and compiled React/Vite apps), Tasks, agents, CLI workflows, and Manage SDK integrations. Use this skill whenever the user asks to install the PrimeThink developer skill or to create, modify, build, deploy, or debug anything for PrimeThink — including pt install-developer-skill, Deep1 sandbox app development, pt live-app new, /documents/app deployment, Live Apps, Live Pages, tasks, goals, pt API data management, or Obviously Manage integrations. Also trigger for primethink.js, pt.add, pt.list, ptManage, ptManageUI, chatdb, entity names, or any PrimeThink-specific concept.
---

# PrimeThink Developer

## What is PrimeThink?

PrimeThink is an AI-powered team workspace at `app.primethink.ai`. Users chat with AI assistants, upload documents, collaborate in real-time, and build interactive applications (Live Apps) embedded directly in chat conversations.

**Core concepts:**

- **Chats** — conversations with AI assistants and other users. Each chat has its own scoped database.
- **Tasks** — predefined AI workflows with goals, initial prompts, and capabilities. Tasks tell the AI *how* to behave in a chat.
- **Live Apps** — interactive HTML applications rendered inside a chat. They use the `pt` JavaScript API to read/write data, send messages, upload files, and trigger AI processing.
- **Agents** — AI assistants powered by LLMs. Configurable with specific models, tools, and instructions.
- **Documents & Collections** — files uploaded to chats, organized in collections for RAG and reference.

## Installing or Updating This Skill

When a user asks to install this skill, use the public CLI installer rather than downloading only `SKILL.md`:

```bash
pt install-developer-skill                       # ~/.claude/skills (default)
pt install-developer-skill --project             # ./.claude/skills
pt install-developer-skill --dir ~/.kiro/skills  # Kiro or custom parent directory
pt install-developer-skill --ref TAG_OR_COMMIT   # reproducible source
```

The command recursively installs this complete directory from the public `primethink-app-templates` repository. It needs internet access but no PrimeThink token, GitHub login, or paid service. `--dir` names the parent skills directory; the installer appends `primethink-developer`.

Do not overwrite an existing installation without the user's intent. Use `--force` only when they ask to update or replace it. Replacement is downloaded and staged before the old directory moves, and unsafe paths, duplicates, symbolic links, oversized content, and missing `SKILL.md` are rejected.

Repository contributors editing the canonical checkout should run `./install.sh` instead; its symlinks ensure Kiro and Claude edits are saved back to the repository rather than a detached installed copy.

## When to Read Reference Files

Based on what you're building, read the appropriate reference before writing code:

| Building... | Read |
|---|---|
| Installing or updating the developer skill | "Installing or Updating This Skill" above + `references/developer-guide/cli/docs/cli-reference.md` |
| Dynamic/no-build app — before writing code | `libraries/index.md` — reusable modules to copy instead of re-implementing |
| Choose dynamic vs compiled Live App | "Choose the Live App workflow" below |
| Compiled app or Deep1 sandbox build | `references/developer-guide/compiled-live-apps.md` and generated template `README.md` |
| PrimeThink CLI command/API details | `references/developer-guide/cli/index.md` → exact upstream docs in `docs/` |
| Live App APIs and patterns | `references/advanced-topics/live-apps/index.md` → specific docs in `docs/` |
| Task or Agent (AI workflow instructions) | `references/ai-automation/summary.md` |
| User, admin, or developer feature outside the focused guides | `references/portals/{user,admin,developer}/index.md` |
| Live App with Obviously Manage integration | `references/advanced-topics/live-apps/docs/primethink_manage.md` |
| Obviously Manage UI components | `references/advanced-topics/live-apps/docs/primethink_manage_ui.md` |

### Reference Structure

```text
references/
├── index.md                              # PrimeThink overview
├── getting-started/summary.md            # User portal: setup and UI basics
├── core-features/summary.md              # User + admin portal core features
├── ai-automation/summary.md              # Admin + user portal agents/tasks
├── developer-guide/
│   ├── summary.md                        # Developer portal summary
│   ├── compiled-live-apps.md             # Deep1 sandbox build/deploy workflow
│   └── cli/
│       ├── index.md                      # Generated CLI reference index
│       └── docs/                         # Exact CLI reference/user guide/skill
├── advanced-topics/live-apps/
│   ├── index.md                          # Focused Live Apps overview
│   └── docs/                             # Full relevant admin/developer docs
└── portals/                              # Exact PR #1 portal mirrors
    ├── user/{index.md,docs/}
    ├── admin/{index.md,docs/}
    └── developer/{index.md,docs/}

libraries/                                # Copy-into dynamic/no-build apps
├── index.md
├── pt-*.js
└── ptr-*.js
```

> Portal, focused Live App, and CLI copies under `references/` are generated by `build_skill_references.py`; do not hand-edit them. `references/developer-guide/compiled-live-apps.md`, `libraries/`, and `SKILL.md` are maintained by hand.

Always read the relevant reference file — it contains the full API signatures, patterns, and examples you need.

## Reusable Libraries (check before writing code)

`libraries/` holds 18 flat, dependency-light ES modules for **dynamic/no-build** Live Apps.
Copy the files an app needs beside `index.html` / `index.js`; they are not npm packages.
For a compiled Vite template, follow its generated `README.md` and normal source imports instead.
Read `libraries/index.md` for the dynamic-app catalog, exports, and snippets.

```
pt-*.js   framework-agnostic (HTML apps and React apps)
  pt-data.js      entity CRUD, list normalisation, batch, reorder, reactive store
  pt-ai.js        fire-and-forget AI messaging, JSON extraction from AI replies
  pt-docs.js      save/upload/download documents, CSV/JSON/Markdown export
  pt-safe.js      escapeHtml + html`` tagged template + safeUrl (XSS safety)
  pt-format.js    dates, relative time, currency, duration, initials, slugify
  pt-markdown.js  dependency-free markdown → SAFE html
  pt-csv.js       RFC-4180 CSV import/export
  pt-theme.js     dark mode (the only file permitted to touch localStorage)
  pt-boot.js      pinned Tailwind loader, script/style loaders, React mount
  pt-audio.js     mic recording, level meter, upload, diarized transcription
  pt-speech.js    TTS, speech queue, live STT / dictation
  pt-timing.js    drift-corrected metronome, ticker, countdown, auto-scroll

ptr-*.js  React helpers — hooks + components, NO JSX (built with React.createElement)
  ptr-hooks.js    usePtCollection / usePtEntity / usePtSingleton / filter / paginate
  ptr-router.js   hash router for multi-page React apps (Router, Link, NavTabs)
  ptr-ai.js       useAiTask / useAiJson / useAiQueue (fire-and-forget)
  ptr-ui.js       widget kit: Button, Modal, Toast, DataTable, FileDropZone, …
  ptr-editor.js   MarkdownEditor, RichTextEditor, autosave, undo/redo
  ptr-dnd.js      sortable lists, kanban board moves, file drop
```

Quick recipes: CRUD list app → `pt-data.js` + `ptr-hooks.js` + `ptr-ui.js` · AI generator →
add `pt-ai.js` + `ptr-ai.js` · multi-page → `ptr-router.js` · editor → `ptr-editor.js` +
`pt-markdown.js` · voice → `pt-audio.js` + `pt-speech.js`.

## Choose the Live App Workflow

Choose before creating files:

1. **Compiled full app (default for new substantial apps):** use `pt live-app new` with its default React + Vite + Tailwind + Flowbite template. This supports a normal nested source tree and npm dependencies. Build it, then deploy only the flat files inside `dist/`.
2. **Dynamic/no-build app:** choose an HTML or React dynamic template when the app is small, must remain editable as deployed source, or the environment cannot run npm. These deploy `index.html` (or the documented dynamic entry files) directly and use the flat `libraries/` modules.
3. **Existing app:** preserve its current model unless the user asks to migrate it. Do not mix platform-transpiled dynamic React assumptions with Vite/npm assumptions.

### Deep1 sandbox workflow for compiled apps

When a Deep1 agent is asked to build a full app, it must use the CLI rather than hand-creating a source tree:

```bash
# Use a new source directory in the sandbox, outside the deployment target.
pt live-app new ./my-app
cd ./my-app

# Read README.md before executing generated code, then edit src/ as needed.
npm install
npm run build

# Deploy the CONTENTS of dist/, not the source tree or dist directory.
rm -rf /documents/app
mkdir -p /documents/app
cp -R dist/. /documents/app/
```

Before deployment, confirm `dist/index.html` exists and keep the output flat. The default template's build runs `scripts/verify-dist.mjs`, which rejects nested output and root-absolute asset URLs. Vite 8 requires Node `20.19+` or `22.12+`. The CLI itself intentionally does not run `npm install`, build commands, or generated code.

Read `references/developer-guide/compiled-live-apps.md` for variants, safety constraints, custom catalogs, and the no-build deployment path.

## Dynamic Page Types: HTML and React

A dynamic Live App is deployed as source files in the chat's `@app` folder; `page_type` tells the platform how to render the entry file.

- **`html`** (entry `canvas.html` / `index.html`) — vanilla JS; `pt` and Socket.IO are injected.
- **`react`** (entry `index.js`) — JSX transpiled in the browser by Babel standalone. React 18 + ReactDOM are platform globals; bare `import React from 'react'` does not work.

Dynamic multi-file rules:

- Extra `.js` / `.css` / `.json` / asset files resolve through the injected `<base href="/api/v1/live/{chat}/app/">`.
- Only `index.js` gets the platform JSX transform. Other dynamic modules must be plain JavaScript.
- The deployed artifact must be flat because the app uploader handles top-level files only.
- Tailwind is not injected; load and pin the documented browser build.

Compiled Vite apps are different: npm React is bundled during `npm run build`, source directories may be nested, the page type is **HTML**, and only the flat build output is copied to `/documents/app/`.

## Core Architecture (Quick Reference)

### The `pt` API

Every Live App receives the `pt` object from PrimeThink at runtime. Dynamic apps declare and pin their browser Tailwind build in `<head>`; compiled Vite apps bundle Tailwind during `npm run build`. See `references/advanced-topics/live-apps/docs/Live-Apps-Tailwind-v4.md` for the dynamic setup block.

**Data operations:**

```javascript
// Create
const entity = await pt.add('task', { text: 'Buy groceries', completed: false });

// Read
const item = await pt.get(entityId);
const items = await pt.list({ entityNames: ['task'], filters: { completed: false }, limit: 50 });

// Update (always spread existing data or use merge mode)
await pt.edit(entityId, { ...item.data, completed: true });
// or merge mode:
await pt.edit(entityId, { completed: true }, true);

// Delete
await pt.delete(entityId);

// Batch operations
await pt.batchAdd('task', [{ text: 'Task 1' }, { text: 'Task 2' }]);
await pt.batchEdit([{ id: 1, data: { done: true } }, { id: 2, data: { done: true } }]);
await pt.batchDelete([1, 2, 3]);
```

**Entity structure** (all entities share this shape):
```javascript
{
    id: 123,                          // auto-assigned integer
    entity_name: 'task',              // your entity type
    data: { text: '...', done: false }, // your payload (arbitrary JSON)
    creator_user_id: 456,             // auto-set
    created_at: '2024-03-15T...',     // auto-managed
    updated_at: '2024-03-15T...'      // auto-managed
}
```

**Chat & messaging:**

```javascript
// Send a message to chat (triggers AI processing)
const result = await pt.addMessage('Analyze this data');

// Upload files with a message
const formData = new FormData();
formData.append('files', file);
await pt.addMessage(formData, 'Process this file');

// Wait for AI response (preferred over polling)
const response = await pt.waitForMessageReceived(result.task_id, { timeout: 120000 });
// response.message = AI text, response.reasoning_steps = [{label, content}]

// Silent file upload (no AI processing)
await pt.uploadFiles(formData, 'reports/2024');

// Get chat members (cache at init, never call in loops)
const members = await pt.getChatMembers();
// members: [{ id, name, type: 'user'|'agent', is_logged_user, is_chat_owner }]

// Send push notification
await pt.sendNotification(userId, 'Title', 'Message body');
```

**Documents & media:**

```javascript
await pt.saveDocument('report.pdf', 'PDF', 'application/pdf', markdownContent);
await pt.searchDocuments('project requirements', 'DOCUMENTS_ONLY');
await pt.generateImage({ prompt: '...', size: '1024x1024', folder: 'images' });
await pt.generateVoice({ text: '...', voice: 'alloy', folder: 'audio' });
```

**Filters (MongoDB-style):**

```javascript
{ status: 'active' }                           // exact match
{ text: { $contains: 'important' } }           // partial string
{ priority: { $in: ['high', 'medium'] } }      // any of
{ completed: { $ne: 'true' } }                 // not equal
{ $or: [{ name: { $contains: q } }, { email: { $contains: q } }] }  // OR
```

### Live App Rules

- **An "app" is an app, not a webpage.** When the user asks for an app, dashboard, or tool, build an interactive multi-view UI: an app shell (topbar or sidebar navigation) with separate views/routes — use `ptr-router.js` (hash-based, iframe-safe) for React or a view-switcher for HTML. A single long scrolling page is a landing page, not an app, and is the wrong deliverable for these requests.
- **Persist app state in ChatDB — in-memory demo data is a bug.** The starter templates are intentionally BLANK canvases (stack + deployment wiring only): YOU build the data layer, and it must be ChatDB via the injected `pt` global from the first version — hardcoded `useState`-only data means nothing survives a reload and the AI cannot read or edit the app's data. Static mockups with no persistence are acceptable ONLY when the user explicitly asks for one. See "Demo Data (seed-if-empty)" below for the required pattern.
- **Granular entities, never a state blob.** One `entity_name` per domain type, one row per object (`umbrella`, `booking`, `menu_item`, ...). Do NOT stuff the whole app state into a single JSON singleton: the ChatDB panel shows entities, the AI edits individual rows, and `onEntityChanged` sync works per record — a blob defeats all three. Never create entities the app does not read (seeding "display copies" next to a blob is data duplication that silently drifts).
- **Never hand-roll PrimeThink API calls.** All data access goes through the injected `pt` global (directly or via `pt-data.js`/`ptr-hooks.js`). Do NOT invent REST endpoints (there is no `/api/chatdb/...`); do NOT `fetch` PrimeThink URLs by hand. If a helper doesn't exist in the libraries, check the references before writing any HTTP call.
- **ChatDB works only inside the PrimeThink live view.** The `pt` runtime and its tokens exist only on the platform-served page. An app deployed to an external host (Cloudflare Pages, Netlify, ...) has NO `pt` and no way to authenticate — bundle demo data for external deploys, or keep data features live-view-only.
- **No external font/CDN imports.** Do not `@import` Google Fonts or load libraries from CDNs in the deployed app: they break offline/filtered networks and third-party requests may hang the page. Use the system font stack, or self-host font files inside the app folder.
- **flowbite-react 0.12+ has FLAT exports only — dot-notation subcomponents are the LEGACY API and render as `undefined`** (React error #130, blank page at first render). Use `ModalHeader`/`ModalBody`/`ModalFooter`, `TableHead`/`TableHeadCell`/`TableBody`/`TableRow`/`TableCell`, `ToastToggle`, `TabItem`, `AccordionPanel`, ... — NEVER `Modal.Header`, `Table.Cell`, `Toast.Toggle`. The build does NOT catch this (property access is valid JS); the crash appears only when the component first renders.
- **Keep the template's root error boundary.** The react starters wrap `<App />` in a `RootErrorBoundary` (main.jsx / index.html) so a render error shows a readable message instead of a black page — never remove it, and keep it when restructuring the entry point.
- Dynamic HTML apps deploy complete HTML; dynamic React apps use platform-transpiled `index.js`. Compiled React apps deploy the generated `dist/index.html` with page type **HTML**.
- `window.pt` is injected by PrimeThink. Do not bundle `primethink.js`, add production credentials, call `pt.init()`, or install `pt` from npm.
- Always support host-controlled dark mode.
- Escape untrusted values before dynamic `innerHTML`; React escapes text by default, so avoid `dangerouslySetInnerHTML`.
- Never use `localStorage` for app data; use `pt.add/edit/list` (theme preference is the sole exception where documented).
- Keep the **deployment artifact** flat. Compiled source trees may be nested, but copy only top-level `dist/` contents to `/documents/app/`.

### Project Memory (AGENTS.md + chat memo)

Treat every live-app project as something another agent (or you, next week,
with no conversation history) must pick up cold.

- **`AGENTS.md` at the project root** (e.g. `/sandbox/lido-app/AGENTS.md`) —
  the project's own CLAUDE.md-style map. Create it right after scaffolding and
  keep it current as the app evolves:
  - what the app does (features, views/routes, admin vs user areas)
  - file structure (which file owns what)
  - ChatDB entity names WITH their data shapes
  - commands: build, publish (`publish_sandbox_path` + `clean_destination`),
    external deploys (e.g. wrangler project name)
  - conventions and decisions (theme, libraries copied into `app/lib/`, ...)
- **`/chat/memo.md`** — the chat-level pointer that survives even when the
  sandbox is not provisioned: project path, stack, entity list, open items.
- **Returning to an existing project: read `AGENTS.md` FIRST**, before
  re-reading sources. Trust it for what it covers; verify only what you are
  about to change. Update both files whenever features, structure, or entities
  change — a stale map is worse than none.

### Demo Data (seed-if-empty)

When the user asks for a demo (or the app needs starter content), the DEMO
DATA lives in the code ONLY as a seed constant. On startup the app checks
ChatDB and copies the seed in once — after that, ChatDB is the single source
of truth and every render reads from it. Never render from the constants after
seeding, and never re-seed over existing data (a reload must not duplicate or
reset user edits).

```javascript
const DEMO_DATA = {
    umbrella:  [{ code: 'A1', zone: 'front', vip: false }, /* ... */],
    menu_item: [{ name: 'Spritz', price: 7, kind: 'bar' }, /* ... */],
};

async function ensureDemoData() {
    for (const [entityName, rows] of Object.entries(DEMO_DATA)) {
        const existing = await pt.list({ entityNames: [entityName], limit: 1 });
        const count = (existing?.entities ?? existing ?? []).length;
        if (count === 0) {
            await pt.batchAdd(rows.map(data => ({ entity_name: entityName, data })));
        }
    }
}
// init: await ensureDemoData(); then load everything with pt.list per entity.
```

An optional admin "Reset demo" action may delete all rows and re-run the seed
— that is the ONLY path that overwrites existing data. On an external host
(no `pt`), fall back to rendering `DEMO_DATA` read-only in memory.

### Standard Init Pattern

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    const members = await pt.getChatMembers();
    const currentUser = members.find(m => m.is_logged_user);
    await loadState();
    await loadAndRender();
});
```

### Key Rules

1. **No localStorage** — all state goes through `pt.add/edit/list` (chat database). Cross-device, persistent, AI-accessible.
2. **Always spread on edit** — `pt.edit(id, { ...entity.data, newField: val })` or use merge mode `pt.edit(id, data, true)`.
3. **Cache members** — call `pt.getChatMembers()` once at init, not in loops.
4. **Dark mode** — every color class needs a `dark:` counterpart.
5. **XSS prevention** — always `escapeHtml()` user content before innerHTML.
6. **Server-side filtering** — use `filters:` in `pt.list()`, not client-side `.filter()`.
7. **Debounce saves** — 1s debounce for frequent state updates.
8. **waitForMessageReceived** — use this instead of polling for AI responses.
