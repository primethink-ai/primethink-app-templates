# PrimeThink Developer Skill

The canonical source is:

```text
https://github.com/primethink-ai/primethink-app-templates/tree/main/skills/primethink-developer
```

## Install for normal use

Install the complete skill recursively with the PrimeThink CLI. This downloads every library, reference, script, and metadata file from the public repository; no PrimeThink token, GitHub login, or paid service is required.

```bash
# Claude Code: all projects (default)
pt install-developer-skill

# Claude Code: current project only
pt install-developer-skill --project

# Kiro or another Agent-Skills-compatible directory
pt install-developer-skill --dir ~/.kiro/skills

# Refresh an existing installation
pt install-developer-skill --force

# Reproducible installation from a release or commit
pt install-developer-skill --ref TAG_OR_COMMIT
```

The default destination is `~/.claude/skills/primethink-developer`. `--project` uses `./.claude/skills/primethink-developer`; `--dir PATH` installs under `PATH/primethink-developer`. Restart the agent session after installation.

The installer refuses to overwrite an existing installation unless `--force` is provided. Forced replacement is staged first, so a download or extraction failure preserves the previous installation.

## Develop the canonical repository copy

Contributors editing this checkout should use symlinks instead of installing a detached copy:

```bash
cd ~/workspaceNW/primethink-official/primethink-app-templates/skills/primethink-developer
./install.sh
```

This idempotently links both `~/.kiro/skills/primethink-developer` and `~/.claude/skills/primethink-developer` to the canonical checkout. It repairs stale symlinks but refuses to replace a real file or directory, ensuring edits through either agent are saved in this repository.

Verify the development links with:

```bash
readlink ~/.kiro/skills/primethink-developer
readlink ~/.claude/skills/primethink-developer
```

## Continuous reference updates

The builder combines two sibling repositories:

```text
~/workspaceNW/primethink-official/primethink-documentation/docs
~/workspaceNW/primethink-official/primethink-cli
```

Documentation sources are portal-qualified (`user/...`, `admin/...`, and `developer/...`) so duplicate filenames cannot resolve to the wrong portal. When the PR #1 layout is present, every Markdown page is mirrored exactly under `references/portals/{user,admin,developer}/`. Focused summaries and Live App references remain progressive-disclosure entry points.

The CLI reference, user guide, and bundled CLI agent skill are copied exactly into `references/developer-guide/cli/docs/`. `references/developer-guide/compiled-live-apps.md` is hand-maintained because it adds the PrimeThink-specific Deep1 sandbox deployment workflow.

```bash
# Report changed sources
python build_skill_references.py --diff

# Copy exact portal, Live App, and CLI sources
python build_skill_references.py --sync

# Also regenerate condensed summaries with Claude Code
python build_skill_references.py --review

# Force all exact copies and indexes to be rebuilt
python build_skill_references.py --sync --force
```

Override checkout locations when necessary:

```bash
PRIMETHINK_DOCS_DIR=/path/to/docs \
PRIMETHINK_CLI_DIR=/path/to/primethink-cli \
python build_skill_references.py --sync
```

Generated portal, Live App, and CLI copies should not be edited by hand. `SKILL.md`, `libraries/`, and `references/developer-guide/compiled-live-apps.md` are hand-maintained.

