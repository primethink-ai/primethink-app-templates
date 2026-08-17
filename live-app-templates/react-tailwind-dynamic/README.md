# Dynamic browser React + Tailwind Live App

A no-build PrimeThink Live App blank canvas using pinned React browser modules and Tailwind CSS. The React app intentionally returns `null`, so it imposes no predefined interface, content, entities, colors, or layout.

## Included wiring

- React and ReactDOM `19.2.8`
- HTM `3.1.1` for optional JSX-like templates without Babel
- PrimeThink's documented `@tailwindcss/browser@4.1.11` pin
- Class-based `dark:` variant and PrimeThink host-theme bridge
- An empty React root

## Page type

Deploy this complete `index.html` as a PrimeThink **HTML** page type. PrimeThink injects and initializes `window.pt`; do not bundle `primethink.js` or call `pt.init()`.

Replace the body of `App()` with your application. Keep CDN versions pinned, use Chat DB rather than `localStorage`, and clean up PrimeThink subscriptions from React effects.
