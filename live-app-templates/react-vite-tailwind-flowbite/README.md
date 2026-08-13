# Full React + Vite + Tailwind + Flowbite Live App

A production-build PrimeThink Live App starter using current pinned npm releases.

## Stack

| Package | Version |
|---|---:|
| React / ReactDOM | 19.2.8 |
| Vite | 8.2.1 |
| `@vitejs/plugin-react` | 6.0.5 |
| Tailwind CSS / `@tailwindcss/vite` | 4.3.3 |
| Flowbite | 4.0.2 |
| Flowbite React | 0.12.17 |

Vite 8 requires Node `20.19+` or `22.12+`. Exact versions are used in `package.json`; `npm install` records the full transitive dependency graph in `package-lock.json`.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

`npm run build` creates `dist/` and immediately runs `scripts/verify-dist.mjs`. The verifier fails if the output has nested directories, is missing JS/CSS, or contains root-absolute asset URLs.

## PrimeThink deployment

1. Rename `ENTITY_NAME` (`vite_template_decision`) in `src/App.jsx`.
2. Run `npm run build`.
3. Create a PrimeThink Live App with page type **HTML**.
4. Upload the **top-level files inside `dist/`**, not the source project and not the `dist` folder itself.

The Vite config intentionally uses `base: './'`, `assetsDir: '.'`, and flat Rollup output names because PrimeThink's app uploader handles top-level files only.

PrimeThink injects and initializes `window.pt` at runtime. It is not an npm dependency and must not be bundled, mocked with production credentials, or initialized with hard-coded tokens.

## Flowbite choices

- `flowbite-react` supplies the React components used in `src/App.jsx`.
- `flowbite` is also installed for templates that later need core data-attribute components.
- The setup follows Flowbite React's current Vite plugin pattern and Tailwind v4 CSS plugin.
- React components manage their own lifecycle. If you add core Flowbite data-attribute markup dynamically, import and call `initFlowbite()` after the relevant React commit and clean up component instances.

## PrimeThink rules retained

- Host-controlled, class-based dark mode with live `pt:theme` updates
- No `localStorage` for app data
- Merge mode for partial `pt.edit` calls
- Real-time subscription cleanup in React effects
- Server-side entity filtering and bounded queries
- No `dangerouslySetInnerHTML` for chat data

A local Vite preview renders the interface but cannot persist data because `window.pt` exists only in the PrimeThink runtime.
