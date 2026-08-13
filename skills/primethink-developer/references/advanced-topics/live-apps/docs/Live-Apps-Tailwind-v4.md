# Tailwind CSS v4 Setup

## Overview

Live Apps use Tailwind CSS for all styling. **Each app declares and pins its own Tailwind version** inside the file — the platform does not inject any Tailwind stylesheet or script.

**Version policy:**

* **All new Live Apps must use Tailwind CSS v4** via the pinned browser build described on this page
* **Existing apps** carry their own pinned Tailwind v3 script (`https://cdn.tailwindcss.com/3.4.17`) and continue to work unchanged. They are migrated to v4 individually — see [Migrating an Existing App](#migrating-an-existing-v3-app-to-v4)
* **Never mix versions.** One app = one Tailwind version. Do not add v4 to a file that still contains v3-idiom classes or a `tailwind.config` block, and never load both scripts

Tailwind v4's browser build compiles utility classes at runtime in the browser with no build step, exactly like the v3 Play CDN it replaces. It observes DOM mutations, so classes introduced by dynamic `innerHTML` rendering — the standard Live Apps pattern — are compiled on the fly. No re-initialisation is required after rendering.

## Installation

Add the following to the `<head>` of the app file. This block is the standard boilerplate for every new Live App; include it verbatim and pin the exact version.

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

!!! warning "There is no `tailwind.config` in v4"
    The v4 browser build does **not** read the `tailwind.config = {...}` JavaScript object used with the v3 Play CDN. Delete any such block (including `suppressWarning`) when migrating — it is silently ignored. All configuration is CSS-first, inside the `<style type="text/tailwindcss">` block.

## Dark Mode

Usage in markup is unchanged from v3: style with `dark:` variants throughout.

```html
<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
    <h2 class="text-gray-900 dark:text-white text-lg font-semibold">Title</h2>
    <p class="text-gray-500 dark:text-gray-400 text-sm">Description</p>
</div>
```

What changed is the mechanism underneath: v4's default dark mode follows the OS (`prefers-color-scheme`). The `@custom-variant dark` line in the installation block switches it to the class strategy, and the theme bootstrap applies the `dark`/`light` class to `<html>` from the host's `?theme=` parameter (falling back to the OS setting), with live updates via `pt:theme` postMessage. Both pieces are mandatory — an app missing either will ignore the user's PrimeThink theme setting.

## Custom Theme Values

Custom colours, fonts, and other design tokens are declared with `@theme` inside the same `text/tailwindcss` block. Declared values generate the corresponding utilities automatically:

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
* **Buttons** default to `cursor: default` — restored to `pointer` globally by the installation block above
* **`hover:` styles** only apply on devices that actually support hover; touch devices no longer emulate it

### Dynamic rendering

No change in behaviour: utilities appearing in dynamically built `innerHTML` compile automatically. Unlike component libraries, Tailwind itself needs no re-initialisation call after rendering.

## Migrating an Existing v3 App to v4

Per-app checklist — apps are migrated individually, not in bulk:

1. Replace `<script src="https://cdn.tailwindcss.com/3.4.17"></script>` (or the unpinned variant) with the full [Installation](#installation) block
2. Delete any `tailwind.config = {...}` script block, including `suppressWarning`
3. Apply the renamed-utilities table **in row order** — the `-sm → -xs` renames must run before the bare `→ -sm` renames, in both static markup and JS-built template strings, with word-boundary matching (`shadow` must not match `shadow-md`)
4. Audit every bare `border`/`divide-*` and add explicit colours
5. Verify in both themes: load with `?theme=light` while the OS is dark, and vice versa — the app must follow the parameter
6. If the app uses Flowbite, upgrade it to Flowbite v4 in the same pass — see [Flowbite UI Components](Live-Apps-Flowbite-Components.md); v3-era Flowbite does not pair with Tailwind v4

## Known Limitations

* **Browser baseline:** v4 requires Safari 16.4+, Chrome 111+, Firefox 128+. Older browsers fail hard, not gracefully — confirm against client browser estates before deploying to restricted environments
* **CDN dependency:** the pinned script is fetched at load. In networks with restricted egress the app renders unstyled; serving a pinned copy from platform static assets is the mitigation (the per-file pinning model makes this a URL swap)
* **`@apply` in the browser build is unverified.** `@theme` and `@custom-variant` are supported in `text/tailwindcss` blocks; avoid `@apply` until its support is confirmed — plain utility classes in markup cover all Live App needs

## Next Steps

- **[Flowbite UI Components](Live-Apps-Flowbite-Components.md)** - Component library built on this setup
- **[Creating Live Apps](Creating-Live-Pages.md)** - Full app file structure and boilerplate
- **[Performance and Best Practices](Live-Pages-Best-Practices.md)** - General optimisation guidance
