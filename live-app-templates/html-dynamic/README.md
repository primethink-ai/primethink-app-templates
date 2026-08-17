# Dynamic HTML Live App

A dependency-free, no-build PrimeThink Live App blank canvas using vanilla HTML and JavaScript. The page intentionally renders no predefined interface, content, entities, colors, or layout.

## Use

1. Build your application inside `index.html`.
2. Create a PrimeThink Live App with page type **HTML**.
3. Upload `index.html` as a top-level app file.

PrimeThink injects and initializes `window.pt`; do not bundle `primethink.js`, add credentials, or call `pt.init()`.

The host-theme bridge is retained so any light/dark styles you add can follow PrimeThink. Use Chat DB rather than `localStorage` for persistent app data, and keep deployed files flat if you split the app into multiple files.
