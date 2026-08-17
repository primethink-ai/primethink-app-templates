# Dynamic HTML + Tailwind Live App

A no-build PrimeThink Live App blank canvas with Tailwind CSS available. The page intentionally renders no predefined interface, content, entities, colors, or layout.

## Included wiring

- PrimeThink's documented `@tailwindcss/browser@4.1.11` pin
- Class-based `dark:` variant and PrimeThink host-theme bridge
- An empty `<main id="app">` entry point

## Use

1. Build your application inside `index.html` using Tailwind utilities.
2. Create a PrimeThink Live App with page type **HTML**.
3. Upload `index.html` as a top-level app file.

PrimeThink injects and initializes `window.pt`; do not bundle `primethink.js`, add credentials, or call `pt.init()`. Keep CDN versions pinned, use Chat DB instead of `localStorage`, and keep deployed files flat.
