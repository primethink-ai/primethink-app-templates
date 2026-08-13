# PrimeThink Live App templates

Six starter configurations for PrimeThink Live Apps. Each sample is a small persistent, real-time CRUD app intended to show the platform integration points rather than prescribe a product design.

| Template | Framework | Tailwind | Flowbite | Build step | Deploy as |
|---|---|---:|---:|---|---|
| [`react-vite-tailwind-flowbite`](./react-vite-tailwind-flowbite/) | React | yes | yes | `npm run build` | HTML page type; top-level `dist/` files |
| [`react-tailwind-dynamic`](./react-tailwind-dynamic/) | React | yes | no | None | HTML page type; `index.html` |
| [`react-dynamic`](./react-dynamic/) | React | no | no | None | HTML page type; `index.html` |
| [`html-tailwind-flowbite-dynamic`](./html-tailwind-flowbite-dynamic/) | HTML | yes | yes | None | HTML page type; `index.html` |
| [`html-tailwind-dynamic`](./html-tailwind-dynamic/) | HTML | yes | no | None | HTML page type; `index.html` |
| [`html-dynamic`](./html-dynamic/) | HTML | no | no | None | HTML page type; `index.html` |

Flowbite requires Tailwind, so Flowbite-without-Tailwind combinations are intentionally absent.

## CLI catalog

[`manifest.json`](./manifest.json) maps each valid feature combination to a repository-relative template path. `pt live-app new` reads this catalog, so paths do not need to follow a naming convention. Custom GitHub template repositories can implement the same manifest contract:

```json
{
  "version": 1,
  "templates": [
    {
      "id": "my-react-template",
      "framework": "react",
      "tailwind": true,
      "flowbite": true,
      "path": "live-app-templates/my-react-template"
    }
  ]
}
```

## Version policy

Versions were checked against npm and official setup documentation on 2026-08-13. The Vite project pins the then-current stable npm versions. The dynamic templates intentionally use PrimeThink's documented/tested `@tailwindcss/browser@4.1.11` pin rather than the latest npm Tailwind release.

## Shared PrimeThink conventions

- `window.pt` is injected and initialized by PrimeThink; it is not bundled.
- Application data uses Chat DB entities, never `localStorage`.
- Partial edits use merge mode.
- Every app follows PrimeThink's host-controlled light/dark theme.
- Real-time listeners are debounced and cleaned up.
- Deployed files are flat and use relative asset URLs.
- User/entity content is escaped by vanilla HTML or rendered through React's default escaping.

Read each template's README before deploying it.
