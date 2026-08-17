# Dynamic HTML + Tailwind + Flowbite Live App

A no-build PrimeThink Live App blank canvas with Tailwind CSS and Flowbite ready to use. The page intentionally renders no predefined interface, content, entities, colors, or layout.

## Included wiring

- PrimeThink's documented `@tailwindcss/browser@4.1.11` pin
- Flowbite core `4.0.2` CSS and JavaScript
- Class-based `dark:` variant and PrimeThink host-theme bridge
- An empty `<main id="app">` entry point

## Use

1. Build your application inside `index.html`.
2. Add current Flowbite component markup only where needed.
3. Call `initFlowbite()` after dynamically inserting data-attribute components.
4. Deploy `index.html` as a PrimeThink **HTML** page.

PrimeThink injects and initializes `window.pt`; do not bundle `primethink.js`, add credentials, or call `pt.init()`. Keep CDN versions pinned, use Chat DB instead of `localStorage`, and keep deployed files flat.

## Learn how to build Live Apps

This is an intentionally blank template — it ships wiring, not an app. To build
on it, use the **primethink-developer** skill: read `SKILL.md` in your installed
skills (in the PrimeThink sandbox: `/sandbox/skills/primethink-developer/SKILL.md`).
It covers the injected `pt` API, ChatDB persistence (granular entities,
seed-if-empty demo data), app-shell layout expectations, publishing, and the
live-page refresh flow.
