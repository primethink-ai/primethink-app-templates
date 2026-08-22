# Tailwind CSS v4 Setup

## Overview

PrimeThink does not inject Tailwind. A Live App that uses Tailwind must declare and pin it using the setup appropriate to the app's build model.

| Live App model | How Tailwind runs | What you deploy |
|---|---|---|
| **Dynamic/no-build HTML or browser-transpiled React** | The pinned `@tailwindcss/browser` script compiles classes at runtime in the browser | Source `index.html` (and documented flat source files) |
| **Compiled React/Vite** | Installed `tailwindcss` and `@tailwindcss/vite` packages generate CSS during `npm run build` | Only the flat files inside `dist/` |
| **No Tailwind** | Use ordinary CSS; no Tailwind dependency is required | The app's normal deployment artifact |

**Version policy:**

* **New apps that use Tailwind should use Tailwind CSS v4**, but they must use the installation method for their build model. The browser build is for dynamic/no-build apps only; compiled apps use the Vite integration.
* **Existing dynamic apps** carrying a pinned Tailwind v3 script (`https://cdn.tailwindcss.com/3.4.17`) continue to work unchanged. Migrate them individually — see [Migrating an Existing Dynamic v3 App](#migrating-an-existing-dynamic-v3-app-to-v4).
* **Never mix versions or workflows.** Do not load `@tailwindcss/browser` in a compiled Vite app, do not ship npm source files as a dynamic app, and never load v3 and v4 together.

## Dynamic/no-build installation {#dynamic-no-build-installation}

Use this workflow for a simple HTML/JavaScript Live App or a dynamic React app that PrimeThink transpiles in the browser. Tailwind v4's browser build compiles utility classes at runtime with no npm or build step. It observes DOM mutations, so classes introduced by dynamic `innerHTML` rendering are compiled on the fly; no re-initialisation is required.

Add the following to the `<head>` of the app's source HTML. Include it verbatim and pin the exact version.

```html
<!-- Tailwind CSS v4 — pinned browser build -->
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.1.11"></script>

<!-- Tailwind v4 configuration (CSS-first) -->
<style type="text/tailwindcss">
    /* Class-based dark mode — REQUIRED in every Live App.
       Without this line, dark: variants follow the OS setting
       (prefers-color-scheme) and ignore the PrimeThink theme setting. */
    @custom-variant dark (&:where(.dark, .dark *));

    /* Restore pointer cursor on buttons (v4 changed the default to `default`) */
    @layer base {
        button:not(:disabled), [role="button"]:not(:disabled) {
            cursor: pointer;
        }
    }
</style>

<!-- Theme bootstrap — applies the host theme before first paint -->
<script>
(function () {
    function apply(theme) {
        var dark = theme === 'dark';
        document.documentElement.classList.toggle('dark', dark);
        document.documentElement.classList.toggle('light', !dark);
    }
    var forced = new URLSearchParams(location.search).get('theme'); // 'dark' | 'light', set by the host
    if (forced) {
        apply(forced);
    } else {
        apply(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    window.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'pt:theme') apply(e.data.theme);
    });
})();
</script>
```

!!! warning "There is no `tailwind.config` in the browser build"
    The v4 browser build does **not** read the `tailwind.config = {...}` JavaScript object used with the v3 Play CDN. Delete any such block (including `suppressWarning`) when migrating — it is silently ignored. Configuration is CSS-first, inside the `<style type="text/tailwindcss">` block.

## Compiled React/Vite installation

Use this workflow for the default compiled React starter and other apps with an npm/Vite build. Tailwind scans the source and emits normal CSS during the production build; the user's browser does not run the Tailwind compiler.

The PrimeThink React/Vite starter already pins and wires Tailwind. Run `npm install`, edit the source, and build it as documented in the generated `README.md`. For a manual Vite setup, pin both packages:

```bash
npm install --save-dev tailwindcss@4.3.3 @tailwindcss/vite@4.3.3
```

Register the Vite plugin:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // PrimeThink serves the built files below a chat-specific path.
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Keep the deployment artifact flat.
    assetsDir: '.',
    rollupOptions: {
      output: {
        entryFileNames: 'app-[hash].js',
        chunkFileNames: 'chunk-[hash].js',
        assetFileNames: '[name]-[hash][extname]'
      }
    }
  }
});
```

Import Tailwind and retain class-based dark mode in the app stylesheet:

```css
/* src/index.css */
@import "tailwindcss";

/* PrimeThink controls dark mode with a class on <html>. */
@custom-variant dark (&:where(.dark, .dark *));

@layer base {
  button:not(:disabled), [role="button"]:not(:disabled) {
    cursor: pointer;
  }
}
```

Ensure the application entry imports that stylesheet, retain the host-theme bootstrap in `index.html`, then build:

```bash
npm run build
```

Deploy the **top-level contents of `dist/`**, not the source project or the `dist` directory itself. The compiled Live App uses page type **HTML**. Do not add the `@tailwindcss/browser` script or a `text/tailwindcss` block to the built `index.html`; the generated CSS already contains Tailwind's output.

!!! important "Compile-time class discovery"
    A compiled app does not watch DOM mutations for new class names. Keep complete utility names visible in source, or map runtime values to complete literal class strings. Avoid constructing names such as `` `bg-${color}-500` ``, because the build may not generate those utilities.

## Dark Mode

Usage in markup is unchanged from v3: style with `dark:` variants throughout.

```html
<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
    <h2 class="text-gray-900 dark:text-white text-lg font-semibold">Title</h2>
    <p class="text-gray-500 dark:text-gray-400 text-sm">Description</p>
</div>
```

What changed is the mechanism underneath: v4's default dark mode follows the OS (`prefers-color-scheme`). The `@custom-variant dark` declaration switches it to the class strategy. Put that declaration in the `text/tailwindcss` block for a dynamic app or the imported source stylesheet for a compiled app. In both workflows, the theme bootstrap applies the `dark`/`light` class to `<html>` from the host's `?theme=` parameter (falling back to the OS setting), with live updates via the `pt:theme` postMessage. Both pieces are mandatory.

## Custom Theme Values

Custom colours, fonts, and other design tokens are declared with `@theme`. Put it in the `text/tailwindcss` block for a dynamic app or the imported CSS source file for a compiled app. Declared values generate the corresponding utilities automatically:

```html
<style type="text/tailwindcss">
    @custom-variant dark (&:where(.dark, .dark *));

    @theme {
        --color-brand: #0ea5e9;
        --color-brand-strong: #0284c7;
    }
</style>

<!-- These utilities now exist: -->
<button class="bg-brand hover:bg-brand-strong text-white px-4 py-2 rounded-lg">Save</button>
```

## Differences from Tailwind v3

Models and developers alike have years of v3 habit; these are the changes that bite in Live Apps.

### Renamed utilities — do not use the v3 names

| ❌ v3 (do not use) | ✅ v4 |
|--------------------|-------|
| `shadow-sm` | `shadow-xs` |
| `shadow` | `shadow-sm` |
| `drop-shadow-sm` / `drop-shadow` | `drop-shadow-xs` / `drop-shadow-sm` |
| `blur-sm` / `blur` | `blur-xs` / `blur-sm` |
| `rounded-sm` / `rounded` | `rounded-xs` / `rounded-sm` |
| `outline-none` | `outline-hidden` |
| `ring` | `ring-3` |
| `flex-shrink-*` / `flex-grow-*` | `shrink-*` / `grow-*` |
| `overflow-ellipsis` | `text-ellipsis` |
| `bg-opacity-50`, `text-opacity-50` | opacity modifiers: `bg-black/50`, `text-white/50` |

### Changed defaults

* **Borders default to `currentColor`**, not gray-200. Every `border`, `border-t/b/l/r` and `divide-*` must carry an explicit colour: `border-gray-200 dark:border-gray-700`
* **Default ring** is 1px `currentColor` (was 3px blue). Always specify width and colour: `focus:ring-2 focus:ring-blue-500`
* **Placeholder text** inherits the current colour at 50% opacity (was gray-400). Add `placeholder-gray-400 dark:placeholder-gray-500` on inputs where it matters
* **Buttons** default to `cursor: default` — restore `pointer` in the browser-build block or compiled source stylesheet as shown above
* **`hover:` styles** only apply on devices that actually support hover; touch devices no longer emulate it

### Dynamic class names

The behavior depends on the workflow:

* **Dynamic/no-build browser build:** utilities appearing in dynamically inserted markup compile automatically. Tailwind needs no re-initialisation call after rendering.
* **Compiled React/Vite:** classes are discovered at build time. Use complete literal utility names in source (including all variants) rather than assembling class names from fragments at runtime.

## Migrating an Existing Dynamic v3 App to v4

Per-app checklist — apps are migrated individually, not in bulk:

1. Replace `<script src="https://cdn.tailwindcss.com/3.4.17"></script>` (or the unpinned variant) with the full [dynamic/no-build installation](#dynamic-no-build-installation) block
2. Delete any `tailwind.config = {...}` script block, including `suppressWarning`
3. Apply the renamed-utilities table **in row order** — the `-sm → -xs` renames must run before the bare `→ -sm` renames, in both static markup and JS-built template strings, matching complete class tokens only. A regex word boundary is not enough: `\bshadow\b` still matches the `shadow` in `shadow-md` because `-` is a non-word character — use a negative lookahead such as `shadow(?![\w-])` so `shadow-md` is left alone
4. Audit every bare `border`/`divide-*` and add explicit colours
5. Verify in both themes: load with `?theme=light` while the OS is dark, and vice versa — the app must follow the parameter
6. If the app uses Flowbite, upgrade it to Flowbite v4 in the same pass — see [Flowbite UI Components](Live-Apps-Flowbite-Components.md); v3-era Flowbite does not pair with Tailwind v4

## Known Limitations

* **Browser baseline:** Tailwind v4 targets Safari 16.4+, Chrome 111+, and Firefox 128+. Confirm compatibility with client browser estates before deployment.
* **Dynamic browser build — CDN dependency:** the pinned script is fetched at load. In networks with restricted egress the app renders unstyled; serving a pinned copy from platform static assets is the mitigation.
* **Dynamic browser build — `@apply` is unverified:** `@theme` and `@custom-variant` are supported in `text/tailwindcss` blocks; avoid `@apply` there until its support is confirmed. This warning does not apply to normal compile-time Tailwind processing.

## Next Steps

- **[Flowbite UI Components](Live-Apps-Flowbite-Components.md)** - Component library built on this setup
- **[Creating Live Apps](Creating-Live-Pages.md)** - Full app file structure and boilerplate
- **[Performance and Best Practices](Live-Pages-Best-Practices.md)** - General optimisation guidance
