# Dynamic HTML + Tailwind + Flowbite Live App

A no-build PrimeThink Live App starter with:

- PrimeThink's documented `@tailwindcss/browser@4.1.11` pin
- Flowbite core `4.0.2` for data-attribute components
- Class-based light/dark host-theme handling
- Accessible Chat DB CRUD and debounced real-time refresh
- Escaped entity text before `innerHTML` rendering

## Use

1. Rename `ENTITY_NAME` (`template_task`) to a unique value.
2. Replace the sample queue UI and fields.
3. Add Flowbite component markup as needed. After rendering data-attribute components dynamically, call Flowbite's initializer for the new markup.
4. Create a PrimeThink Live App with page type **HTML**.
5. Upload `index.html` as a top-level app file.

PrimeThink injects and initializes `window.pt`; do not bundle `primethink.js`, add credentials, or call `pt.init()`. Opening the file outside PrimeThink is only a visual preview.

## Important constraints

- Pin and retest every CDN dependency before upgrading.
- Do not use `localStorage` for app data.
- Use merge mode for partial edits.
- Keep deployed files flat.
- Retain the Tailwind dark variant and host-theme bootstrap.
