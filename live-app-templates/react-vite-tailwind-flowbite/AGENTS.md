# AGENTS.md — invariants for this PrimeThink Live App template

Rules that hold for every app built from `react-vite-tailwind-flowbite`. Each one
exists because it already broke a shipped app. `npm run build` enforces most of
them (ESLint + `scripts/verify-dist.mjs` + `scripts/pt-doctor.mjs`); the rest are
on you.

## 1. Preserve the theme bridge verbatim

The inline `<script>` in `index.html` is a template invariant. Do not simplify it,
do not move it below the stylesheet, do not replace it with a React effect. It
must keep all three sources, in this order:

1. `?theme=` on `location.search` — only present on direct/standalone access.
2. **The `dark` / `light` class already on `<html>`** — injected by PrimeThink's
   server. The app runs in an **iframe**, so `location.search` does NOT carry the
   parent page's query params; this class is the reliable signal.
3. OS `prefers-color-scheme` — last resort only.

Plus the `pt:theme` `postMessage` listener, for live theme switches while the app
is open. `scripts/check-template-drift.mjs` (repo root) fails if this block drifts
away from the other templates.

## 2. flowbite-react 0.12 — flat exports, and never its Modal

- Flat exports only: `ModalHeader`, `TableCell`, `ToastToggle`. Dot-notation
  (`Modal.Header`, `Table.Cell`) is the legacy API and renders as `undefined`.
- **Never import `Modal` from `flowbite-react`.** It uses `@floating-ui/react`,
  which crashes at runtime under React 19 — with no build-time warning. Use
  `src/components/Modal.jsx` (portal + Tailwind) instead. Every other
  flowbite-react component (Button, TextInput, Badge, Spinner, Table…) is fine.

## 3. No `localStorage` / `sessionStorage`

Persist through the chat database: `pt.add()`, `pt.edit()`, `pt.list()`. Web
storage is per-browser, invisible to other users and to the AI, and can be
unavailable in the sandboxed iframe.

## 4. Standard Tailwind palette — every color class carries a `dark:` variant

A compiled Live App ships its own CSS, and **Tailwind v4 silently emits nothing
for a utility it does not recognise**. An invented color class is therefore not
an error anywhere — it is simply no style at all: a transparent, borderless box.

**Never use the App Studio mock-screen tokens** — `bg-scaffold`, `bg-surface`,
`text-on-surface`, `text-on-surface-variant`, `border-outline`,
`border-outline-variant`, `bg-primary-container`, `text-on-primary` and friends.
Those are a **mock-screen convention that only exists inside App Studio's host
shell**, which defines the backing `--pt-*` custom properties. Nothing defines
them in a compiled app, so they generate zero CSS. `npm run doctor` fails the
build if one appears in `src/`.

The convention for compiled Live Apps is the standard Tailwind palette, with an
explicit `dark:` variant on **every** color utility:

```jsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                border border-gray-200 dark:border-gray-700">
  <button className="focus:outline-hidden focus:ring-2 focus:ring-blue-500">…</button>
</div>
```

Dark mode is driven by the `dark` class the theme bridge (§1) puts on `<html>` —
see `@custom-variant dark (&:where(.dark, .dark *))` in `src/index.css`. A color
without a `dark:` partner just stays light when the host switches to dark.

Tailwind v4 note: the focus-ring reset is `outline-hidden`, not v3's
`outline-none`.

## 5. The AI-from-app pattern

Always: hidden message → wait → `response.message` → robust JSON extraction →
**user-visible error on failure**.

```js
import { askAIJson, extractJson } from './lib/pt-ai.js';

const rows = await askAIJson(prompt, { schemaHint: '[{"name": string}]' });
if (!Array.isArray(rows) || rows.length === 0) {
  showError('Could not read that. Please try again.'); // never fail silently
}
```

Hand-rolled equivalent, if you must:

```js
const result = await pt.addMessage(prompt, { hidden: true });          // hidden!
const response = await pt.waitForMessageReceived(result.task_id, { timeout: 120000 });
const text = response?.message || '';        // .message — NOT .text / .content
const data = extractJson(text, null);        // from src/lib/pt-ai.js
if (!data) showError('…');                   // always tell the user
```

With files: `pt.addMessage(formData, prompt, { hidden: true })`.

Other API shapes worth not guessing:

- `pt.list({ entityNames: ['task'] })` returns a **bare array**. The
  `{ entities, count, pagination }` shape needs `returnMetadata: true`.
- `pt.onEntityChanged(callback, { entityName })` — **callback first**.

## 6. Run the linter after every edit

Vite/esbuild does **not** enforce `no-undef`; it bundles an undeclared reference
silently and the app throws at runtime. `npm run lint` after each edit — not just
before you start. `npm run build` runs it first and refuses to build on errors.

## 7. `dist/` must stay flat and relative

No nested directories, no root-absolute (`/asset.js`) URLs — PrimeThink deploys
top-level files only and serves them under a chat-specific base path. Keep
`base: './'` and `assetsDir: '.'` in `vite.config.js`.
`scripts/verify-dist.mjs` enforces this and fails the build otherwise.

## Build gates

```
npm run lint     # ESLint (no-undef, react-hooks)
npm run doctor   # known-misuse scan over src/ (see scripts/pt-doctor.mjs)
npm run build    # lint -> vite build -> verify-dist -> doctor
```
