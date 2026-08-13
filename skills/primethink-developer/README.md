# PrimeThink Developer Skill

The canonical, editable copy of this skill is:

```text
~/workspaceNW/primethink-official/primethink-app-templates/skills/primethink-developer
```

Do not copy the skill into an assistant-specific directory. Install symlinks instead so edits made through Kiro or Claude are always saved in this repository.

## Install or repair the persistent links

```bash
cd ~/workspaceNW/primethink-official/primethink-app-templates/skills/primethink-developer
./install.sh
```

The installer idempotently links both locations to this directory:

- `~/.kiro/skills/primethink-developer`
- `~/.claude/skills/primethink-developer`

It replaces stale symlinks but refuses to overwrite a real file or directory.

## Verify

```bash
readlink ~/.kiro/skills/primethink-developer
readlink ~/.claude/skills/primethink-developer
```

Both commands should print the canonical path above. Restart the assistant session after first installation so it reloads the skill.

## Continuous reference updates

`references/` is generated from the documentation repository at:

```text
~/workspaceNW/primethink-official/primethink-documentation/docs
```

The sibling repository is discovered automatically. Set `PRIMETHINK_DOCS_DIR` only when the documentation checkout lives elsewhere.

```bash
# Report changed documentation sources
python build_skill_references.py --diff

# Copy exact source documents into references/
python build_skill_references.py --sync

# Also regenerate condensed summaries with Claude Code
python build_skill_references.py --review

# Override the docs checkout location when necessary
PRIMETHINK_DOCS_DIR=/path/to/docs python build_skill_references.py --diff
```

Generated files under `references/` should not be edited by hand. `libraries/` and `SKILL.md` remain hand-maintained.

