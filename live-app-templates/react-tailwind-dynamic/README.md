# Dynamic browser React + Tailwind Live App

A complete, no-build `index.html` that runs React directly in the browser. It uses:

- React and ReactDOM `19.2.8` as pinned ES modules
- HTM `3.1.1` for JSX-like templates without Babel
- PrimeThink's documented `@tailwindcss/browser@4.1.11` pin
- The PrimeThink class-based dark-mode and host-theme bridge
- Chat DB CRUD and real-time entity refresh through `window.pt`
- React's default text escaping; no `dangerouslySetInnerHTML`

## Page type

Deploy this as a PrimeThink **HTML** page type because the entry is a complete `index.html` that loads React itself. It is different from PrimeThink's native React page type, which expects `index.js`, platform-provided React globals, and platform JSX transformation.

## Use

1. Rename `ENTITY_NAME` (`react_template_note`) to a unique value.
2. Replace the sample notes component and fields.
3. Upload `index.html` as a top-level Live App file.

The file can be opened outside PrimeThink for a visual preview, but data actions remain disabled because the platform-injected and initialized `window.pt` is unavailable.

## Why HTM instead of Babel?

React 19 no longer ships the old browser UMD bundles. Pinned ES modules plus HTM keep this template small, avoid a runtime JSX compiler, and preserve a readable component model in one file.

## Important constraints

- Pin every CDN dependency and retest before changing versions.
- Do not import or bundle `primethink.js`; PrimeThink injects it.
- Do not use `localStorage` for application data.
- Use merge mode for partial edits.
- Clean up every PrimeThink real-time subscription from React effects.
