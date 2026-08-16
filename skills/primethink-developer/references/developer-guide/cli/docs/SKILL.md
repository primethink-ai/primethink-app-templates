---
name: primethink-cli
description: Use the PrimeThink CLI (`pt`) to interact with the PrimeThink API and scaffold Live Apps — configure token profiles, create React or HTML Live App projects, send messages to chats and agents, execute task actions, upload/download/sync files with chats and collections, and create/update/version tasks. Use when the user asks to interact with PrimeThink, initialize a PrimeThink Live App, run `pt` commands, manage PrimeThink chats/collections/tasks, or automate PrimeThink workflows.
---

# PrimeThink CLI

The PrimeThink CLI is installed as `pt` (`pip install primethink-cli`; in the source repo, `pip install -e .` or run `python primethink.py …` directly). Full documentation: `pt --help`, `pt <group> --help`, or [docs/cli-reference.md](https://github.com/primethink-ai/primethink-cli/blob/main/docs/cli-reference.md).

## Before you start

1. Check the CLI is available: `pt version` (expects `PrimeThink CLI v…`).
2. **For `pt live-app new`, skip authentication** — scaffolding only downloads a public template repository and writes a new local directory.
3. For commands that call the PrimeThink API, check a profile is configured: `pt profile list`. If none, ask the user for their API token (never invent one) and run:
   ```bash
   pt profile add --token <TOKEN> [--profile <name>] [--api-url <url>]
   ```
   Tokens live in `~/.primethink/config.json`. Never print, cat, or commit that file.
   Alternatively, in CI or containers, authentication can come from environment
   variables instead of a config file: `PRIMETHINK_TOKEN` (token), plus optional
   `PRIMETHINK_API_URL`, `PRIMETHINK_PROFILE`, and `PRIMETHINK_CONFIG_PATH`.
   Flags beat environment variables, which beat the config file.
3. Debugging a failing request: run it with `PRIMETHINK_DEBUG=1` to get `[debug]`
   request/response lines on stderr (tokens are never printed).

## Conventions that will trip you up

- **`-p` is ambiguous.** In the `pt task`, `pt agent`, and `pt search` groups, `pt image generate`, and `pt whoami`, `-p` = `--profile`. In the `pt chat` and `pt collection` groups there is NO `-p` for profile — there `-p` = `--path` (a directory inside the chat/collection) on the file commands. Always use the long forms `--profile` and `--path` to be safe.
- **Every API command** accepts `--profile <name>` (one-off profile) and `--api-url`/`-u` (one-off URL override) without changing the active profile. Prefer these over `pt profile use` when running one-off commands for the user.
- **Output is pretty-printed JSON** on stdout for API commands — pipe to `jq` to extract fields. Download/sync commands print progress lines instead.
- **Exit codes**: 0 = success, 1 = any error (message on stdout). `sync-to`/`sync-from`/`sync` are the exception: per-file failures don't abort; check the final `Sync complete: N …, M failed` line. The two-way `pt chat sync` DOES exit 1 without transferring anything if it can't fully list the chat's remote tree.
- **`pt chat sync` has no newer-wins logic.** It matches files by relative path only — no timestamps or checksums. A file present on both sides is skipped unless you pass `--prefer local` (re-upload local copy) or `--prefer remote` (overwrite local file with the chat's copy). Run `--dry-run` first when unsure; `--prefer remote` overwrites local files irreversibly, so confirm with the user before using it.
- **Sanitized-name collisions skip a file (with a warning).** If two remote documents map to the same local filename after sanitization (e.g. `.env` and `env`), `sync` keeps the first and warns that the other is ignored. Fewer local files than remote documents is expected in that case, not an error — check the warning lines.
- **Attachments** use a repeated flag: `-f a.pdf -f b.pdf` (not comma-separated).
- **Slow operations** (`image generate`, `task create/update` with `--schedule-nl`/`--schedule-prompt`) can take up to 2 minutes; don't treat the wait as a hang.

## Command map

```
pt version | install-skill | install-developer-skill
pt live-app new DIRECTORY [--framework react|html] [--tailwind/--no-tailwind] [--flowbite/--no-flowbite] [--repo-url URL] [--ref REF]
pt mcp                                    # run PrimeThink as an MCP server over stdio (needs the [mcp] extra, Python 3.10+)
pt whoami [--profile NAME]                # {"user": …, "groups": …} — verify which account a profile hits
pt profile add -t TOKEN [-p NAME] [-u URL] | use PROFILE | list | remove PROFILE

pt chat send CHAT_ID_OR_@MENTION -m "MSG" [-f FILE]... [--async]
pt chat send --agent AGENT_ID -m "MSG" [-f FILE]...      # chat target XOR --agent
pt chat list [--page N] [--page-size N] [--search TEXT] [--starred] [--archived] [--workspace-id ID] [--sort automatically|manually]
pt chat create [--name N] [--goal G | --goal-file F] [--virtual-assistant-id ID] [--type standard|direct_users] [--public] [--member USER_ID]...
pt chat rename CHAT_ID NAME
pt chat goal CHAT_ID (--goal G | --goal-file F)
pt chat messages CHAT_ID [--size N] [--before-message-id ID | --after-message-id ID] [--anchor-message-id ID]   # cursor pagination, NOT --page; before XOR after; anchor overrides both
pt chat archive CHAT_ID | unarchive CHAT_ID
pt chat delete CHAT_ID [--yes]            # DESTRUCTIVE; prompts unless --yes; prefer archive


pt chat list-files CHAT_ID [--path /dir]
pt chat upload-files CHAT_ID FILE... [--path /dir]
pt chat download-file CHAT_ID DOC_ID [-o PATH]
pt chat sync-to CHAT_ID LOCAL_DIR [--path /dir] [--pattern '*.pdf'] [--recursive]
pt chat sync-from CHAT_ID LOCAL_DIR [--path /dir]
pt chat sync CHAT_ID LOCAL_DIR [--path /dir] [--prefer local|remote] [--dry-run]   # two-way; chat only, not collections

pt collection list [--page N] [--page-size N] [--search TEXT]
pt collection list-files|upload-files|download-file|sync-to|sync-from …   # same shape as pt chat file commands

pt agent list [--search TEXT] [--type-id N]... [--status all|archived] [--task-id N]
pt agent get AGENT_ID
pt agent create --name N --public-description D --type-id N [--description TEXT | --description-file F] [--model M] [--access-type private|group|task|system|catalog]
pt agent update AGENT_ID [fields…]        # PATCH: only passed fields change; needs ≥1 field
pt agent delete AGENT_ID [--yes]          # DESTRUCTIVE; prompts unless --yes
pt agent types                            # type IDs for --type-id
# messaging an agent = pt chat send --agent AGENT_ID (there is no `pt agent send`)

pt task actions
pt task execute -a ACTION -m "MSG" [-f FILE]... [--return-original]
pt task create --name N --description D --type {private|public|group|system|catalog} [fields…]
pt task update TASK_ID [fields…]          # PATCH: only passed fields change; needs ≥1 field
pt task get TASK_ID
pt task delete TASK_ID [--yes]            # DESTRUCTIVE; prompts unless --yes
pt task duplicate TASK_ID
pt task publish TASK_ID | unpublish TASK_ID   # type → public | private; other types: task update --type
pt task export TASK_ID [-o FILE]          # portable config JSON (server fields stripped)
pt task import FILE [--profile ENV]       # create a NEW task from an exported file
pt task create-version TASK_ID [--version-name NAME]      # default name: Production
pt task upload-image TASK_ID FILE
pt image generate --prompt "…" -o out.png [--style realistic] [--size 1024x1024]

pt search documents QUERY --collection-name NAME [--search-type mmr|similarity|similarity_score_threshold] [--top-k N] [--score-threshold F]
pt search chat CHAT_ID QUERY [tuning…] [--in-chat/--no-in-chat] [--in-documents/…] [--in-collections/…]
pt search collection COLLECTION_ID QUERY [tuning…] [--metadata '{"document_name": "…"}']
pt search messages QUERY --collection-name NAME [--chat-id N] [--user-id N] [--agent-id N] [tuning…]
# `documents` and `messages` REQUIRE --collection-name (a vector store collection name, not a collection ID)
```

Notable `task create`/`update` fields: `--goal` / `--goal-file` (mutually exclusive), `--virtual-assistant-id`, `--schedule-nl "every Monday at 9am"` + `--schedule-prompt "…"`, `--canvas` / `--canvas-file` + `--page-type html`, `--extra '<json>'`, `--extra-vas 1,2,3`, `--tag-ids 4,5`, and paired toggles like `--global-memory/--no-global-memory`, `--chat-history/--no-chat-history`, `--docs-enabled/--no-docs-enabled`, `--scheduled-jobs/--no-scheduled-jobs`. Run `pt task create --help` for the full list.

## Installing PrimeThink skills

Use the installer that matches the agent's job:

```bash
pt install-skill                         # bundled, offline instructions for using this CLI
pt install-developer-skill               # full developer skill in ~/.claude/skills
pt install-developer-skill --project     # install in ./.claude/skills
pt install-developer-skill --dir PATH    # another Agent-Skills-compatible directory
pt install-developer-skill --force       # replace an existing complete installation
pt install-developer-skill --ref TAG_OR_COMMIT  # reproducible source version
```

`install-developer-skill` downloads the public [`primethink-developer`](https://github.com/primethink-ai/primethink-app-templates/tree/main/skills/primethink-developer) source. It is free and requires internet access, but no PrimeThink API token, GitHub login, or paid service. The installer recursively includes `SKILL.md`, `libraries/`, `references/`, scripts, hidden metadata, and every nested file; never replace it with a single-file `SKILL.md` download.

Default scope is `~/.claude/skills/primethink-developer`; `--project` uses `./.claude/skills/primethink-developer`, and `--dir PATH` uses `PATH/primethink-developer`. A custom public fork can be selected with `--repo-url URL`. Do not pass `--force` unless the user wants the existing complete folder replaced. The replacement is downloaded and staged before the old folder is moved, and unsafe or incomplete archives are rejected.

## Live App scaffolding

Use this before writing a new Live App unless the user already has a project:

```bash
# Recommended default for a full React project
pt live-app new ./app

# One-file HTML starter
pt live-app new ./app --framework html --no-flowbite

# No styling libraries
pt live-app new ./app --no-tailwind --no-flowbite
```

Defaults are React + Tailwind + Flowbite. Flowbite requires Tailwind, so never pass `--no-tailwind` without `--no-flowbite`. The destination must not exist; do not delete or rename user files just to make generation succeed. For reproducible work, pin a known tag or commit with `--ref`; a custom public catalog can be selected with `--repo-url`. After generation, read the generated `README.md` before editing because the default React/Flowbite variant uses Vite while the other default variants are no-build. Rename the sample entity before deployment. The command never runs `npm install` or generated code.

## MCP server

The same code runs as an MCP server via `pt mcp` (stdio), exposing every command above as a tool (`send_message`, `list_chats`, `create_task`, `search_documents`, …). It needs the optional `mcp` extra: `pip install 'primethink-cli[mcp]'` (Python 3.10+). Prefer `pt mcp` when configuring an MCP client to give it PrimeThink tools; keep using the `pt` commands here for direct shell/scripting work. Auth is shared — set `PRIMETHINK_TOKEN` in the client's server env or rely on the active profile.

## Common workflows

**Find a document ID, then download it** (IDs come from list output):
```bash
pt chat list-files 123 | jq '.documents[] | {id, filename}'
pt chat download-file 123 456 -o ./report.pdf
```

**Find a collection by name, then sync it locally:**
```bash
pt collection list --search "contracts"   # read the collection id from the JSON
pt collection sync-from <COLLECTION_ID> ./contracts
```

**Feed files to a chat, then ask about them:**
```bash
pt chat sync-to 123 ./docs --recursive
pt chat send 123 -m "Summarize the key risks in these documents"
```

**Keep a chat folder and a local directory reconciled (two-way):**
```bash
pt chat sync 123 ./workspace --dry-run   # preview: what would download/upload/skip
pt chat sync 123 ./workspace             # missing files copied both ways; files on both sides skipped
```
Use `--prefer remote` / `--prefer local` only when the user says which side wins for files present on both sides.

**Create a scheduled task:**
```bash
pt task create --name "Weekly report" --description "Compile weekly report" --type private \
  --virtual-assistant-id 7 --schedule-nl "every Friday at 4pm" \
  --schedule-prompt "Compile this week's report"
```
Verify afterwards with `pt task get <id>`.

**Deploy a task to another environment (export → git → import):**
```bash
pt task export 42 --output tasks/support_bot.json    # commit this file to git
pt task import tasks/support_bot.json --profile production
```
`import` always creates a NEW task (it does not update an existing one). Environment-specific IDs in the file (`virtual_assistant_id`, `extra_vas`, `default_evaluator_agent_id`) may need editing for the target environment. A raw `pt task get` dump also imports cleanly — server fields are stripped automatically.

## Error handling

- `No active profile` / `Profile 'X' not found` → run `pt profile list`; configure or pick an existing profile. Don't guess tokens.
- `Error: <status> - <body>` → the API rejected the request; read the body. 401/403 usually means a bad or expired token — ask the user for a new one.
- `Error connecting to API: …` → network or wrong `--api-url`; confirm the endpoint before retrying.
- `Error: No fields to update` (task update) → pass at least one field option.
- Destructive operations (`task delete`, `chat delete`, `agent delete`) prompt for confirmation — pass `--yes` only after the user has explicitly confirmed. Other irreversible operations (`profile remove`, overwriting local files via `download-file -o` / `sync-from` / `sync --prefer remote`) have no prompt; confirm with the user first.
