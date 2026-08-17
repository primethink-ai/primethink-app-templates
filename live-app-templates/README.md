# PrimeThink Live App templates

Six intentionally blank starter configurations for PrimeThink Live Apps. Every template renders an empty page/root and avoids sample interfaces, entities, application patterns, colors, layout, and content. This gives developers and app-generating LLMs a neutral canvas while preserving only the selected stack and PrimeThink deployment wiring.

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

Versions were checked against npm and official setup documentation on 2026-08-13. The Vite project pins the then-current stable npm versions. Dynamic templates intentionally use PrimeThink's documented/tested `@tailwindcss/browser@4.1.11` pin.

## Shared conventions

- Each starter is deliberately visually and behaviorally empty; create the application from scratch.
- Selected framework and dependency wiring remains available without example component markup.
- `window.pt` is injected and initialized by PrimeThink; do not import `primethink.js` or call `pt.init()`.
- Theme-capable starters retain the host-controlled class bridge and `pt:theme` listener.
- Persistent application data should use Chat DB, never `localStorage`.
- Deployed files remain flat and use relative asset URLs where a build is required.

Read the selected template's README for its runtime, build, and deployment model.
