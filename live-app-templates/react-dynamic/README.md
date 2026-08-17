# Dynamic browser React Live App

A no-build PrimeThink Live App blank canvas using pinned React browser modules and no CSS framework. The React app intentionally returns `null`, so it imposes no predefined interface, content, entities, colors, or layout.

## Included wiring

- React and ReactDOM `19.2.8`
- HTM `3.1.1` for optional JSX-like templates without Babel
- PrimeThink host-theme bridge
- An empty React root

## Page type

Deploy this complete `index.html` as a PrimeThink **HTML** page type. PrimeThink injects and initializes `window.pt`; do not bundle `primethink.js` or call `pt.init()`.

Replace the body of `App()` with your application. Use Chat DB rather than `localStorage` for persistent data and clean up PrimeThink subscriptions from React effects.
