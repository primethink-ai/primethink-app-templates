# Compiled Live Apps with the PrimeThink CLI

Use this guide when a Deep1 agent or another sandboxed coding agent must create, build, and deploy a PrimeThink Live App. For complete CLI syntax, read `cli/index.md` and its exact upstream documents.

## Choose a project model

| Need | Command/model | Deployment artifact |
|---|---|---|
| Full application with npm, nested source, React components, and local builds | Default `pt live-app new` | Top-level files inside `dist/` |
| Small no-build HTML app | `--framework html` variant | `index.html` and any documented top-level files |
| Dynamic React without a package build | Non-default React variant without Flowbite | Generated top-level source files |

Default to the compiled template for substantial new applications. Preserve an existing app's model unless the user asks to migrate it.

## Deep1 sandbox workflow: compiled default

Keep the editable source tree outside `/documents/app/`. That directory is the deployment target, not a project workspace.

```bash
# 1. Confirm required tools. Vite 8 needs Node 20.19+ or 22.12+.
pt version
node --version
npm --version

# 2. Scaffold into a destination that does not already exist.
pt live-app new ./my-app
cd ./my-app

# 3. Inspect instructions before installing or executing generated code.
cat README.md
cat package.json

# 4. Install, edit/test the app, and create the production artifact.
npm install
npm run build

# 5. Verify the expected flat artifact.
test -f dist/index.html
find dist -mindepth 2 -type f -print
```

The last `find` command should print nothing for the default PrimeThink template. Its build already runs `scripts/verify-dist.mjs` and fails for nested output, missing JS/CSS, or root-absolute asset URLs.

Before building, rename the template's sample `ENTITY_NAME` so the app does not share Chat DB records with another app. Retain PrimeThink runtime, host-theme, merge-edit, query-bounding, and subscription-cleanup patterns while replacing the sample UI.

### Deploy to `/documents/app/`

Only replace `/documents/app/` when it is the assigned Live App deployment target. Stage the result on the same filesystem, verify it, and then move it into place so stale hashed assets from earlier builds are not retained.

```bash
target=/documents/app
stage="$(mktemp -d /documents/.app-stage.XXXXXX)"
cp -R dist/. "$stage/"
test -f "$stage/index.html"

rm -rf "$target"
mv "$stage" "$target"
```

Deploy the **contents** of `dist/`; do not copy the source project or create `/documents/app/dist/`. Create the PrimeThink Live App with page type **HTML**. PrimeThink injects `window.pt` at runtime.

## Dynamic/no-build sandbox workflow

Choose one of these when npm builds are undesirable:

```bash
# HTML + Tailwind + Flowbite
pt live-app new ./my-app --framework html

# HTML + Tailwind only
pt live-app new ./my-app --framework html --no-flowbite

# Plain HTML
pt live-app new ./my-app \
  --framework html \
  --no-tailwind \
  --no-flowbite
```

Read the generated `README.md`, rename its sample entity, and edit the generated app. For a one-file template, deploy `index.html` directly:

```bash
target=/documents/app
stage="$(mktemp -d /documents/.app-stage.XXXXXX)"
cp index.html "$stage/index.html"
rm -rf "$target"
mv "$stage" "$target"
```

Dynamic React templates are also available. They use platform-provided React/Babel semantics rather than npm React; follow their generated README and do not apply Vite assumptions to them.

## Supported combinations

Flowbite requires Tailwind, leaving six valid combinations:

| Framework | Tailwind | Flowbite | Example |
|---|---:|---:|---|
| React | yes | yes | `pt live-app new ./app` |
| React | yes | no | `pt live-app new ./app --no-flowbite` |
| React | no | no | `pt live-app new ./app --no-tailwind --no-flowbite` |
| HTML | yes | yes | `pt live-app new ./app --framework html` |
| HTML | yes | no | `pt live-app new ./app --framework html --no-flowbite` |
| HTML | no | no | `pt live-app new ./app --framework html --no-tailwind --no-flowbite` |

Never pass `--no-tailwind` while leaving Flowbite enabled.

## Reproducible or custom catalogs

The default public catalog is `https://github.com/primethink-ai/primethink-app-templates` at ref `main`. Pin a tag or commit when reproducibility matters:

```bash
pt live-app new ./my-app \
  --repo-url https://github.com/acme/templates \
  --ref v2.0.0
```

A custom public HTTPS GitHub catalog defines `live-app-templates/manifest.json`. Every requested `(framework, tailwind, flowbite)` combination must match exactly one entry.

## CLI safety contract

`pt live-app new`:

- does not require a PrimeThink API token or profile;
- refuses any existing destination, including an empty directory;
- downloads at most the configured archive limits;
- rejects unsafe catalog/archive paths, duplicate files, and symbolic links;
- extracts through a temporary directory and exposes the destination atomically;
- never runs `npm install`, a package manager, a build, or generated scripts.

The agent is responsible for reading the generated README before running package installation or generated code. Do not weaken the destination refusal by deleting user work merely to make scaffolding succeed.

## Runtime rules for compiled apps

- PrimeThink supplies `window.pt`; it is not an npm dependency.
- Do not bundle `primethink.js`, call `pt.init()`, or embed tokens.
- Use relative asset URLs. The default Vite config uses `base: './'`.
- Keep output flat. The default config uses `assetsDir: '.'` and flat Rollup filenames.
- Use page type **HTML** for the compiled `dist/index.html`.
- A local Vite preview cannot persist PrimeThink data because `window.pt` exists only in the platform runtime.
