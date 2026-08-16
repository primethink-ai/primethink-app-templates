# primethink-app-template
Template catalog used by `pt live-app new` to create PrimeThink Live Apps.

The six valid React/HTML and Tailwind/Flowbite combinations are listed in [`live-app-templates/manifest.json`](live-app-templates/manifest.json). Flowbite requires Tailwind. See [`live-app-templates/README.md`](live-app-templates/README.md) for each starter's runtime, build, and deployment model.

```bash
# Default React + Tailwind + Flowbite starter
pt live-app new ./my-app

# Pin this catalog for reproducible scaffolding
pt live-app new ./my-app \
  --repo-url https://github.com/primethink-ai/primethink-app-templates \
  --ref main
```

## Repository-owned skills

The canonical `primethink-developer` skill lives at `skills/primethink-developer`.

```bash
# Normal installation for Claude Code
pt install-developer-skill

# Kiro or another compatible skills directory
pt install-developer-skill --dir ~/.kiro/skills
```

The CLI downloads the complete public skill recursively. Repository contributors who need edits to save directly into this checkout should instead run `skills/primethink-developer/install.sh` once to link Kiro and Claude to the canonical source directory.
