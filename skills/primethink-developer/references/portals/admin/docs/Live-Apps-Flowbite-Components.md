# Flowbite UI Components

## Overview

**Flowbite v4** is the recommended UI component library for Live Apps that need common interactive patterns — modals, dropdowns, tabs, drawers, toasts, tooltips — without writing bespoke JavaScript for each one. Its interactive behaviour is driven through declarative `data-*` attributes rather than inline event handlers, matching the Live Apps event-binding conventions, and its v4 theming system ships light and dark styling out of the box.

Use Flowbite when an app needs standard UI chrome. A working modal becomes a short block of known markup with two data attributes and zero custom show/hide JavaScript.

## Prerequisite: Tailwind CSS v4

**Flowbite v4 requires Tailwind CSS v4**, but installation depends on the Live App model. A dynamic/no-build app uses the pinned Tailwind browser build plus the class-based dark variant and theme bootstrap. A compiled React/Vite app uses the installed Tailwind Vite plugin and generated CSS; do not add the browser-build script to it. See **[Tailwind CSS v4 Setup](Live-Apps-Tailwind-v4.md)** for both workflows.

Hard rules:

* ❌ **Never load Flowbite v4 into an app running Tailwind v3.** Existing apps still pinned to `cdn.tailwindcss.com/3.4.17` must be migrated to Tailwind v4 first (per the migration checklist on the Tailwind page) in the same pass as adopting Flowbite
* ❌ **Never mix Flowbite v2-era markup with the v4 stylesheet.** Flowbite v4 restructured component styling around CSS variables and semantic tokens; markup copied from old examples, old apps, or v2-trained model output will render incorrectly. Always copy component markup from the current Flowbite documentation linked in the [Component Reference](#component-reference)

## Version and Installation

### Dynamic/no-build HTML or JavaScript

Use **Flowbite 4.0.2** — pin the version explicitly, as with every CDN resource in a dynamic Live App.

```html
<head>
    <!-- Tailwind CSS v4 setup block goes here first — see Tailwind CSS v4 Setup -->

    <!-- Flowbite v4 styles — pinned -->
    <link href="https://cdn.jsdelivr.net/npm/flowbite@4.0.2/dist/flowbite.min.css" rel="stylesheet">
</head>
<body>
    <!-- App markup -->

    <!-- Flowbite v4 script — pinned, loaded before the app's own script -->
    <script src="https://cdn.jsdelivr.net/npm/flowbite@4.0.2/dist/flowbite.min.js"></script>
    <script>
        // App code — initFlowbite() and component classes are now available
    </script>
</body>
```

!!! note "Load order matters"
    Load `flowbite.min.js` **before** the app's own script so that `initFlowbite()` and the component classes (`Modal`, `Dropdown`, etc.) exist when the app code runs.

### Compiled React and `flowbite-react`

The compiled React starter installs Tailwind, Flowbite, and `flowbite-react` as npm dependencies and processes their classes during the Vite build. It does not use the CDN tags above. The starter pins `flowbite-react@0.12.17`; this version exposes subcomponents as flat named exports. Import and render those names directly:

```jsx
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Toast,
  ToastToggle
} from 'flowbite-react';

function Example({ open, onClose }) {
  return (
    <Modal show={open} onClose={onClose}>
      <ModalHeader>Project details</ModalHeader>
      <ModalBody>Content</ModalBody>
      <ModalFooter>Actions</ModalFooter>
    </Modal>
  );
}
```

Do not use the legacy dot-notation API:

```jsx
// ❌ Legacy API: these subcomponents are undefined in flowbite-react 0.12+
<Modal.Header>Project details</Modal.Header>
<Table.Cell>Value</Table.Cell>
<Toast.Toggle />
```

Property access such as `Modal.Header` is valid JavaScript, so the application can build successfully. React fails only when it tries to render the undefined component, commonly with error 130 and a blank app.

!!! warning "Keep the generated root error boundary"
    Every generated React starter wraps `App` in a `RootErrorBoundary` in `src/main.jsx` or `index.html`. Keep that wrapper when restructuring the entry point. It turns render-time failures into a readable message instead of leaving an empty page; it does not replace using the supported component exports.

## How Flowbite Works

Flowbite offers two ways to drive its interactive components. Both are supported in Live Apps.

### 1. Data attributes (preferred)

Add `data-*` attributes and Flowbite wires up the behaviour automatically — for a modal, `data-modal-target` plus `data-modal-toggle`, `data-modal-show` or `data-modal-hide` on any trigger element is the complete integration. The same pattern covers dropdowns (`data-dropdown-toggle`), tabs (`data-tabs-toggle` / `data-tabs-target`), drawers (`data-drawer-target` / `data-drawer-toggle` / `data-drawer-hide`), tooltips (`data-tooltip-target`), popovers, accordions, and dismissable alerts/toasts (`data-dismiss-target`).

This is the preferred interface: declarative markup, less code to generate, no inline event handlers.

### 2. JavaScript API (for programmatic control)

Every interactive component also has a class-based API for cases where the app itself must open or close things — for example, showing a modal from a `pt.onEntityChanged` callback or after a fire-and-forget result lands:

```javascript
const modalEl = document.getElementById('task-modal');
const modal = new Modal(modalEl, {
    backdrop: 'dynamic',
    onHide: () => { /* optional callback */ }
});

modal.show();
modal.hide();

// Retrieve an instance created by the data-attribute interface
const existing = FlowbiteInstances.getInstance('Modal', 'task-modal');
if (existing) existing.hide();
```

## Themes and Dark Mode

Flowbite v4 styles components through CSS variables and ships five built-in themes (modern — the default — minimal, enterprise, playful, mono). Two practical consequences for Live Apps:

1. **Component markup uses semantic token classes**, not raw palette classes: buttons in the official examples use classes like `bg-brand`, `hover:bg-brand-strong`, `rounded-base`, `shadow-xs`, `border-default`. These tokens are defined by Flowbite's theme CSS. **Copy component markup verbatim from the linked Flowbite docs** rather than reconstructing it from raw Tailwind colours — the tokens are what make theming and dark mode work with far fewer classes
2. **Dark mode is handled by the theme variables**, keyed off the same `dark` class on `<html>` that the Tailwind v4 setup's theme bootstrap manages. With the Tailwind page's setup in place, Flowbite components follow the PrimeThink theme setting with no additional work. App-specific markup around the components (layout, cards, text) still uses standard `dark:` variants as documented on the Tailwind page

The default (modern) theme is included in `flowbite.min.css` and is the standard for Live Apps. Do not switch themes per-app without design sign-off; theme switching mechanics are noted under [Known Issues](#known-issues-and-limitations).

## Critical: Re-initialisation After Dynamic Rendering

**This is the single most important rule when using Flowbite in Live Apps.**

Flowbite binds its data-attribute listeners on page load. Live Apps render most of their DOM dynamically — building `innerHTML` from Chat DB entities — so any Flowbite component injected after the initial load is **inert** until re-initialised.

Call `initFlowbite()` at the end of every render:

```javascript
async function render() {
    // pt.list() returns a plain array by default
    const tasks = await pt.list({ entityNames: ['task'] });

    listEl.innerHTML = tasks.map(task => `
        <div class="...">
            <span>${esc(task.data.title)}</span>
            <button data-dropdown-toggle="menu-${task.id}">⋮</button>
            <div id="menu-${task.id}" class="hidden ..."><!-- dropdown items --></div>
        </div>
    `).join('');

    initFlowbite();   // ✅ REQUIRED — re-binds all data-attribute components
}
```

**Rules of thumb:**

* ✅ Call `initFlowbite()` at the end of **every** function that injects Flowbite markup
* ✅ Replace containers wholesale via `innerHTML` — discarded nodes take their listeners with them, so re-initialising fresh nodes cannot double-bind
* ❌ Never re-render a container while one of its modals or drawers is open — Flowbite appends backdrop elements to `<body>`, and destroying an open overlay's markup orphans its backdrop, leaving a dark layer that blocks the page
* ✅ Keep modals and drawers in **static markup** at the app root, outside any re-rendered container, and re-render only their inner content

## Usage Patterns in Live Apps

### Modal driven by data attributes

Structure and wiring (copy the full styled markup from the [modal docs](https://flowbite.com/docs/components/modal/)):

```html
<!-- Trigger -->
<button data-modal-target="task-modal" data-modal-toggle="task-modal" class="...">
    Add task
</button>

<!-- Modal — static markup at app root -->
<div id="task-modal" tabindex="-1" aria-hidden="true" class="hidden ...">
    <!-- header / footer per the Flowbite docs -->
    <input id="task-title" type="text" placeholder="Task title" class="...">
    <button id="save-task-btn" data-modal-hide="task-modal" class="...">Save</button>
    <button type="button" data-modal-hide="task-modal" class="...">Cancel</button>
</div>
```

```javascript
document.getElementById('save-task-btn').addEventListener('click', async () => {
    const title = document.getElementById('task-title').value.trim();
    if (!title) return;
    await pt.add('task', { title, status: 'open' });
    await render();
});
```

`data-modal-hide` on the Save button closes the modal automatically — no `Modal.hide()` call needed.

### Division of responsibilities

Let Flowbite's data attributes handle **showing and hiding** (modals, dropdowns, tabs, drawers); use the standard Live Apps delegated-listener pattern for **what happens when items are clicked** (Chat DB writes, AI calls):

```javascript
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    handleAction(btn.dataset.action, btn.dataset.id);
});
```

Never mix in inline `onclick` handlers.

### Unique IDs for repeated components

Data attributes reference their targets by ID. When rendering one Flowbite component per entity (e.g. a dropdown per row), suffix IDs with the entity ID: `data-dropdown-toggle="menu-${task.id}"` targeting `id="menu-${task.id}"`.

### Escape entity data

Flowbite components are still `innerHTML` — the standard escaping rule applies to any Chat DB values interpolated into them:

```javascript
function esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
}
```

### Reusable toasts

`data-dismiss-target` **removes the element from the DOM** on dismiss — dismissed toasts are gone, not hidden. For a reusable notification, toggle the `hidden` class manually and omit the dismiss attribute:

```javascript
function showToast(message) {
    const toast = document.getElementById('save-toast');
    document.getElementById('save-toast-msg').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}
```

## Component Reference

Full documentation for each component — markup, variants, options, and API — is on the Flowbite site. **Copy markup from these pages** (they reflect the current v4 token classes). Components marked **JS** are interactive and require `initFlowbite()` after dynamic rendering; unmarked components are CSS-only markup and always work.

| Component | Type | Documentation |
|-----------|------|---------------|
| Accordion | JS | https://flowbite.com/docs/components/accordion/ |
| Alerts (dismissible) | JS | https://flowbite.com/docs/components/alerts/ |
| Avatar | CSS | https://flowbite.com/docs/components/avatar/ |
| Badge | CSS | https://flowbite.com/docs/components/badge/ |
| Banner | JS | https://flowbite.com/docs/components/banner/ |
| Breadcrumb | CSS | https://flowbite.com/docs/components/breadcrumb/ |
| Buttons | CSS | https://flowbite.com/docs/components/buttons/ |
| Button group | CSS | https://flowbite.com/docs/components/button-group/ |
| Card | CSS | https://flowbite.com/docs/components/card/ |
| Carousel | JS | https://flowbite.com/docs/components/carousel/ |
| Clipboard (copy to clipboard) | JS | https://flowbite.com/docs/components/clipboard/ |
| Datepicker | JS | https://flowbite.com/docs/components/datepicker/ |
| Drawer | JS | https://flowbite.com/docs/components/drawer/ |
| Dropdowns | JS | https://flowbite.com/docs/components/dropdowns/ |
| Indicators | CSS | https://flowbite.com/docs/components/indicators/ |
| KBD (keyboard) | CSS | https://flowbite.com/docs/components/kbd/ |
| List group | CSS | https://flowbite.com/docs/components/list-group/ |
| Modal | JS | https://flowbite.com/docs/components/modal/ |
| Navbar (collapse) | JS | https://flowbite.com/docs/components/navbar/ |
| Pagination | CSS | https://flowbite.com/docs/components/pagination/ |
| Popover | JS | https://flowbite.com/docs/components/popover/ |
| Progress bar | CSS | https://flowbite.com/docs/components/progress/ |
| Rating | CSS | https://flowbite.com/docs/components/rating/ |
| Sidebar | JS | https://flowbite.com/docs/components/sidebar/ |
| Skeleton (loading placeholder) | CSS | https://flowbite.com/docs/components/skeleton/ |
| Speed dial | JS | https://flowbite.com/docs/components/speed-dial/ |
| Spinner | CSS | https://flowbite.com/docs/components/spinner/ |
| Stepper | CSS | https://flowbite.com/docs/components/stepper/ |
| Tables | CSS | https://flowbite.com/docs/components/tables/ |
| Tabs | JS | https://flowbite.com/docs/components/tabs/ |
| Timeline | CSS | https://flowbite.com/docs/components/timeline/ |
| Toast | JS | https://flowbite.com/docs/components/toast/ |
| Tooltips | JS | https://flowbite.com/docs/components/tooltips/ |
| Typography | CSS | https://flowbite.com/docs/typography/headings/ |

The datepicker is a core component in v4 with API methods, events, and options — no separate bundle is needed. Form elements (inputs, selects, checkboxes, toggles, file upload, range sliders) are documented at https://flowbite.com/docs/forms/input-field/ and pair directly with the existing Live Apps form patterns.

## Known Issues and Limitations

* **Dynamic/CDN runtime verification pending.** Before using Flowbite v4 CDN assets in a client-facing dynamic app, confirm that (1) dark styling follows the `dark` class and live `pt:theme` changes, and (2) semantic token utilities in official markup (`bg-brand`, `rounded-base`, etc.) render correctly with the pinned `flowbite.min.css` and Tailwind browser build. Compiled `flowbite-react` apps use the separately documented npm/Vite path.
* **Theme switching mechanics are undocumented here.** The default (modern) theme ships in `flowbite.min.css`; how alternate themes are activated has not been verified and is out of scope for standard Live Apps
* **`data-dismiss-target` removes elements from the DOM** — see [Reusable toasts](#reusable-toasts)
* **Backdrops are appended to `<body>`** — never destroy an open modal's or drawer's markup via a re-render; see the re-initialisation rules
* **v2-era markup is incompatible** — model output and older examples trained on Flowbite v1/v2 idiom (explicit `dark:` classes on every element, raw palette colours on components) must not be pasted into a v4 app
* **Charts are not included.** Flowbite's chart examples depend on ApexCharts, a separate library — load and pin it explicitly if charting is needed

## Next Steps

- **[Tailwind CSS v4 Setup](Live-Apps-Tailwind-v4.md)** - Required foundation for this library
- **[Data Management API Reference](Data-Management-API.md)** - Wire components to Chat DB operations
- **[Performance and Best Practices](Live-Pages-Best-Practices.md)** - General Live Apps optimisation
- **[Complete Examples](Live-Pages-Examples.md)** - Full application examples
