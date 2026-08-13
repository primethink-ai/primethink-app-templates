# Dynamic HTML + Tailwind Live App

A no-build PrimeThink Live App template. It is a complete `index.html` page with:

- PrimeThink's documented `@tailwindcss/browser@4.1.11` pin
- Class-based dark mode and the PrimeThink host-theme bridge
- Accessible loading, empty, error, and saving states
- Chat DB CRUD through the platform-injected `window.pt`
- Real-time refresh through `pt.onEntityChanged()`
- Escaped entity text before `innerHTML` rendering

## Use

1. Rename `ENTITY_NAME` (`template_task`) to a unique entity name for your app.
2. Replace the sample queue UI and data fields.
3. Create a PrimeThink Live App with page type **HTML**.
4. Upload `index.html` as a top-level app file.

PrimeThink injects and initializes `primethink.js`; do not add credentials or call `pt.init()` in the deployed app. Opening this file outside PrimeThink is only a visual preview because `window.pt` is not available.

## Important constraints

- Keep deployed files flat if you split this template into multiple files.
- Pin every CDN dependency.
- Do not use `localStorage` for app data.
- Use `pt.edit(id, updates, true)` for partial updates.
- Keep the Tailwind dark variant and host-theme bootstrap.
- Escape any untrusted value before inserting it through `innerHTML`.
