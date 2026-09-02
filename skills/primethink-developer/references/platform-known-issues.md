# Platform Known Issues & Constraints

The single shared source of truth for PrimeThink platform limits and known library
incompatibilities. **Two consumers read this file:** the `primethink-developer` skill
(so a builder does not re-discover a known crash) and App Studio's `gap_analysis` task
(so a spec records the limits as `gap` entities with a workaround). Change it here, never
in a copy — a second copy will drift.

Format: one entry per issue, with severity, how it shows up, and the workaround that is
known to work.

- **Severity CRITICAL** — ships silently, crashes or corrupts at runtime for every user.
- **Severity HIGH** — reliably wrong behaviour, no build-time signal.
- **Severity MEDIUM** — wrong behaviour in a common path, usually visible in testing.
- **Severity LOW** — friction or polish; the app still works.

---

## Library & runtime incompatibilities

### KI-01 — flowbite-react `Modal` crashes under React 19
**Severity:** CRITICAL · **Applies to:** compiled React/Vite apps (React 19 + flowbite-react 0.12+)

Flowbite React's `Modal` renders through `@floating-ui/react`, which is incompatible with
React 19's concurrent rendering. The build succeeds; the app throws the moment a modal opens,
with a stack that points into the library rather than app code.

**Workaround:** do not import `Modal` from `flowbite-react`. Use a portal-based modal —
`createPortal` into `document.body` plus Tailwind classes for the backdrop and panel. The
compiled template ships one at `src/components/Modal.jsx`; if the generated template does not
carry it, write one (~40 lines) before the first modal. Other Flowbite components in normal
use (Button, TextInput, Select, Badge, Spinner, Table, Tabs, Toast) are unaffected.

### KI-02 — flowbite-react 0.12+ exports are flat; dot notation renders `undefined`
**Severity:** CRITICAL · **Applies to:** compiled React/Vite apps

`Modal.Header`, `Table.Cell`, `Toast.Toggle` and friends are the pre-0.12 API. In 0.12+ they
are plain property accesses that evaluate to `undefined`, so React throws error #130
("Element type is invalid") and the page is blank at first render. Property access is valid
JavaScript, so neither the bundler nor TypeScript-free linting flags it.

**Workaround:** import the flat names — `ModalHeader`, `ModalBody`, `ModalFooter`,
`TableHead`, `TableHeadCell`, `TableBody`, `TableRow`, `TableCell`, `ToastToggle`, `TabItem`,
`AccordionPanel`. Open every view and modal in the live view before reporting completion.

### KI-03 — theme bridge must read the server-injected class (iframe context)
**Severity:** HIGH · **Applies to:** every Live App (compiled and dynamic)

A Live App renders **inside an iframe** at the `/app/` subpath. `location.search` inside that
iframe does **not** contain the parent page's query parameters, so a bridge that only checks
`?theme=` and then falls back to `prefers-color-scheme` always takes the OS branch — and
overwrites the `class="light"` / `class="dark"` that PrimeThink's server injected on `<html>`.
Result: the app follows the laptop's OS theme instead of the PrimeThink setting, reproducibly,
for every user whose two settings disagree.

**Workaround:** three-source priority chain — (1) `?theme=` on `location.search` (direct
access only), (2) the existing `light`/`dark` class on `<html>` (server-injected, authoritative
in the iframe), (3) `prefers-color-scheme` as the last resort — plus a `pt:theme` postMessage
listener for live switching. Combine with the class-based dark strategy
(`@custom-variant dark (&:where(.dark, .dark *))` in Tailwind v4, `darkMode: 'class'` in v3).

### KI-04 — Vite/esbuild does not enforce `no-undef`
**Severity:** MEDIUM · **Applies to:** compiled React/Vite apps

esbuild bundles undeclared and un-imported references without complaint; the failure is a
`ReferenceError` in the browser, often on a rarely-exercised branch. Running the linter before
an edit proves nothing about the edit.

**Workaround:** run ESLint **after** every code edit (and wire `lint` into the `build` script
where the template supports it), then load the deployed app and exercise the changed path.

### KI-05 — AI reply text is on `response.message`
**Severity:** MEDIUM · **Applies to:** every Live App calling AI from app code

`pt.waitForMessageReceived()` resolves with an object whose text is `response.message`.
Reading `.text` or `.content` yields `undefined`, and because the failure lands inside a JSON
parse it usually degrades into a button that silently does nothing.

**Workaround:** read `response.message` (guard for a plain-string resolution), extract JSON
with `indexOf('[')` / `lastIndexOf(']')` rather than a non-greedy regex, and always surface a
user-visible error when parsing fails. See the AI-from-App Pattern in `SKILL.md`, or use
`askAIJson` / `extractJson` from `libraries/pt-ai.js`.

---

## Platform constraints (also used by App Studio `gap_analysis`)

These are properties of the platform, not bugs. Any requirement that depends on one of them
needs an explicit workaround in the spec.

### PC-01 — No external-contributor member type
**Severity:** HIGH

Outsiders cannot be given scoped access to a chat or app; membership is all-or-nothing within
the group. **Workaround:** email-reply ingestion into the chat, or an operator who relays.

### PC-02 — Live App permissions are UI-level only
**Severity:** HIGH

Hiding an action in the app hides it in the UI; nothing at the data layer stops a member from
reading or editing any entity in the chat's database (including via the ChatDB panel or by
asking the AI). **Workaround:** treat role logic as convenience, not security; keep genuinely
sensitive data out of the chat, or in a separate chat with restricted membership.

### PC-03 — No scheduled or cron push from a Live App
**Severity:** MEDIUM

An app only runs while someone has it open; it cannot wake itself to send reminders or run a
nightly job. **Workaround:** a goal-driven scheduled chat/task on the platform side, or an
external trigger that posts into the chat.

### PC-04 — MCP tool use requires an OpenAI model on the chat
**Severity:** MEDIUM

A chat whose agent runs a non-OpenAI model cannot call MCP tools. **Workaround:** set the
chat's model accordingly, or route the tool-using step to a chat that has one.

### PC-05 — Connectors must be verified per client
**Severity:** MEDIUM

Never assume a connector exists for a given system — availability differs per client
installation. **Workaround:** confirm the connector with the client before designing a flow
that depends on it; otherwise plan for manual import/export.

### PC-06 — Live App AI work is chat-message based (fire-and-forget)
**Severity:** MEDIUM

An app asks the AI by posting a chat message and waiting for the reply. There is no synchronous
call and no server-side job the app owns, so a long job dies with the tab if the app waits on
it inline. **Workaround:** fire-and-forget — post a hidden message, record the `task_id` in
ChatDB, and let the app pick the result up when the reply arrives (also on a later load).

---

*When a new incident produces a durable lesson, add an entry here first, then link it from
`SKILL.md` and turn it into an eval case in `evals/evals.json`.*
