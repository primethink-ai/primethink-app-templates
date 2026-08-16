# PrimeThink CLI — Command Reference

Complete reference for every command in the PrimeThink CLI (`pt`), version 1.2.0.

Commands are organized into noun groups: `profile`, `live-app`, `chat`, `collection`, `agent`, `task`, `search`, and `image`.

## Table of Contents

- [Global Conventions](#global-conventions)
- [General Commands](#general-commands)
  - [`pt version`](#pt-version)
  - [`pt whoami`](#pt-whoami)
  - [`pt mcp`](#pt-mcp)
  - [`pt install-skill`](#pt-install-skill)
  - [`pt install-developer-skill`](#pt-install-developer-skill)
- [Live Apps: `pt live-app`](#live-apps-pt-live-app)
  - [`pt live-app new`](#pt-live-app-new)
- [Profiles: `pt profile`](#profiles-pt-profile)
  - [`pt profile add`](#pt-profile-add)
  - [`pt profile use`](#pt-profile-use)
  - [`pt profile list`](#pt-profile-list)
  - [`pt profile remove`](#pt-profile-remove)
- [Chats: `pt chat`](#chats-pt-chat)
  - [`pt chat send`](#pt-chat-send)
  - [`pt chat list`](#pt-chat-list)
  - [`pt chat create`](#pt-chat-create)
  - [`pt chat rename`](#pt-chat-rename)
  - [`pt chat goal`](#pt-chat-goal)
  - [`pt chat messages`](#pt-chat-messages)
  - [`pt chat archive`](#pt-chat-archive)
  - [`pt chat unarchive`](#pt-chat-unarchive)
  - [`pt chat delete`](#pt-chat-delete)
  - [`pt chat list-files`](#pt-chat-list-files)
  - [`pt chat upload-files`](#pt-chat-upload-files)
  - [`pt chat download-file`](#pt-chat-download-file)
  - [`pt chat sync-to`](#pt-chat-sync-to)
  - [`pt chat sync-from`](#pt-chat-sync-from)
  - [`pt chat sync`](#pt-chat-sync)
- [Collections: `pt collection`](#collections-pt-collection)
  - [`pt collection list`](#pt-collection-list)
  - [`pt collection list-files`](#pt-collection-list-files)
  - [`pt collection upload-files`](#pt-collection-upload-files)
  - [`pt collection download-file`](#pt-collection-download-file)
  - [`pt collection sync-to`](#pt-collection-sync-to)
  - [`pt collection sync-from`](#pt-collection-sync-from)
- [Agents: `pt agent`](#agents-pt-agent)
  - [`pt agent list`](#pt-agent-list)
  - [`pt agent get`](#pt-agent-get)
  - [`pt agent create`](#pt-agent-create)
  - [`pt agent update`](#pt-agent-update)
  - [`pt agent delete`](#pt-agent-delete)
  - [`pt agent types`](#pt-agent-types)
- [Tasks: `pt task`](#tasks-pt-task)
  - [`pt task actions`](#pt-task-actions)
  - [`pt task execute`](#pt-task-execute)
  - [`pt task create`](#pt-task-create)
  - [`pt task update`](#pt-task-update)
  - [`pt task get`](#pt-task-get)
  - [`pt task delete`](#pt-task-delete)
  - [`pt task duplicate`](#pt-task-duplicate)
  - [`pt task publish`](#pt-task-publish)
  - [`pt task unpublish`](#pt-task-unpublish)
  - [`pt task export`](#pt-task-export)
  - [`pt task import`](#pt-task-import)
  - [`pt task create-version`](#pt-task-create-version)
  - [`pt task upload-image`](#pt-task-upload-image)
- [Search: `pt search`](#search-pt-search)
  - [`pt search documents`](#pt-search-documents)
  - [`pt search chat`](#pt-search-chat)
  - [`pt search collection`](#pt-search-collection)
  - [`pt search messages`](#pt-search-messages)
- [Images: `pt image`](#images-pt-image)
  - [`pt image generate`](#pt-image-generate)
- [MCP Server (`pt mcp`)](#mcp-server-pt-mcp)
- [Exit Codes and Errors](#exit-codes-and-errors)
- [Timeouts](#timeouts)

---

## Global Conventions

### Connection options

Every command that calls the API accepts these two options:

| Option | Description |
|---|---|
| `--profile` | Use a specific configured profile for this one request, without changing the active profile |
| `--api-url`, `-u` | Override the API URL for this one request |

> **Note on `-p`:** in the `pt task`, `pt agent`, and `pt search` groups, `pt image generate`,
> and `pt whoami`, `-p` is a short alias for `--profile`. In the `pt chat` and `pt collection`
> groups there is **no** `-p` alias for `--profile` — there `-p` is the short alias for
> `--path` (a directory inside the chat/collection) on the file commands. When in doubt,
> use the long forms.

### Output

- Commands that call the API print the JSON response, pretty-printed with 2-space indentation, to stdout. This makes output easy to pipe into `jq` or redirect to a file.
- Download and sync commands print human-readable progress lines instead.

### Authentication

All API commands authenticate with the token from the selected profile, sent as an
`Authorization: Token <token>` header. Configure a token first with
[`pt profile add`](#pt-profile-add). Configuration is stored in `~/.primethink/config.json`.

### Environment variables

Every environment variable is an optional override — when unset, the CLI uses the
config file and its built-in defaults:

| Variable | Description | Default when unset |
|---|---|---|
| `PRIMETHINK_TOKEN` | API token, bypassing the config file (useful for CI/CD and containers) | Token from the active profile |
| `PRIMETHINK_API_URL` | API base URL override | Profile's `api_url`, otherwise `https://api.primethink.ai` |
| `PRIMETHINK_PROFILE` | Profile to use when `--profile` is not passed | The active profile |
| `PRIMETHINK_CONFIG_PATH` | Custom config file path | `~/.primethink/config.json` |
| `PRIMETHINK_DEBUG` | Set to `1` (or `true`/`yes`/`on`) to print request/response debug lines to stderr | Disabled |

Precedence, highest first: command-line flag (`--profile`, `--api-url`) → environment
variable → config file → built-in default. If both `PRIMETHINK_TOKEN` and
`PRIMETHINK_PROFILE` are set, the token wins and the config file is not consulted.

---

## General Commands

### `pt version`

Display the CLI version.

```bash
pt version
# PrimeThink CLI v1.2.0
```

### `pt whoami`

Show the authenticated user and the groups they belong to, as one JSON object with `user` and `groups` keys. Handy for checking which account a profile points at before running anything else.

```bash
pt whoami [--profile NAME] [--api-url URL]
```

```bash
pt whoami | jq '.user.email'
pt whoami --profile production
```

### `pt mcp`

Run PrimeThink as an [MCP](https://modelcontextprotocol.io) server over stdio, exposing every API command as a tool that MCP clients can call. See [MCP Server (`pt mcp`)](#mcp-server-pt-mcp) for the full tool list and client configuration.

```bash
pt mcp
```

Requires the optional `mcp` dependency (`pip install 'primethink-cli[mcp]'`, Python 3.10+); if it isn't installed, `pt mcp` prints an install hint and exits 1.

### `pt install-skill`

Install the bundled [agent skill](../skills/primethink-cli/SKILL.md) — a `SKILL.md` that teaches AI coding agents (Claude Code and other Agent-Skills-compatible tools) how to use `pt` — into a skills directory. This command works offline; the skill ships inside the package.

```bash
pt install-skill [--user | --project | --dir PATH] [--force]
```

| Option | Description |
|---|---|
| `--user` | Install to `~/.claude/skills` (default) |
| `--project` | Install to `./.claude/skills` in the current directory |
| `--dir PATH` | Install to a custom skills directory (overrides `--user`/`--project`) |
| `--force` | Replace an existing installation |

The skill is installed as a `primethink-cli/` folder inside the chosen directory. Without `--force`, an existing installation is left untouched and the command exits with an error.

```bash
# Available in all your projects
pt install-skill

# Just for the current repo (commit .claude/skills to share it with your team)
pt install-skill --project

# For an agent that reads skills from a custom location
pt install-skill --dir ~/.config/my-agent/skills

# Upgrade after updating primethink-cli
pt install-skill --force
```

### `pt install-developer-skill`

Download and install the complete public [`primethink-developer`](https://github.com/primethink-ai/primethink-app-templates/tree/main/skills/primethink-developer) skill. Unlike `pt install-skill`, this skill is not bundled in the wheel: it is fetched free from public GitHub and includes the entire directory tree (`SKILL.md`, `libraries/`, `references/`, scripts, hidden metadata, and all descendants). It requires internet access, but no PrimeThink API token, GitHub credentials, or paid service.

```bash
pt install-developer-skill [--user | --project | --dir PATH] [--force] \
  [--repo-url URL] [--ref REF]
```

| Option | Default | Description |
|---|---|---|
| `--user` | selected | Install to `~/.claude/skills` |
| `--project` | — | Install to `./.claude/skills` in the current directory |
| `--dir PATH` | — | Install to a custom skills directory (overrides `--user`/`--project`) |
| `--force` | off | Replace an existing `primethink-developer/` installation |
| `--repo-url URL` | `https://github.com/primethink-ai/primethink-app-templates` | Public HTTPS GitHub source repository |
| `--ref REF` | `main` | Git branch, tag, or commit to download |

The installer downloads a bounded repository archive and recursively stages `skills/primethink-developer/`. It rejects path traversal, duplicate paths, symbolic links, oversized archives, and missing `SKILL.md`. Without `--force`, an existing installation is left untouched and no download occurs. With `--force`, the old directory is moved aside only after the complete replacement has been safely extracted; executable bits on bundled scripts are preserved.

```bash
# Available to compatible agents in all projects
pt install-developer-skill

# Commit the complete skill with one project
pt install-developer-skill --project

# Install for another Agent-Skills-compatible tool
pt install-developer-skill --dir ~/.config/my-agent/skills

# Refresh from a pinned release or commit
pt install-developer-skill --force --ref <TAG_OR_COMMIT>
```

---

## Live Apps: `pt live-app`

Create a local PrimeThink Live App project from a public GitHub template catalog. This group is local-only and does not require an API token or profile. The command downloads files but does not execute generated code or run a package manager.

### `pt live-app new`

```bash
pt live-app new DIRECTORY [OPTIONS]
```

| Option | Default | Description |
|---|---|---|
| `--framework react\|html` | `react` | Select the application framework |
| `--tailwind` / `--no-tailwind` | `--tailwind` | Include or exclude Tailwind CSS |
| `--flowbite` / `--no-flowbite` | `--flowbite` | Include or exclude Flowbite; Flowbite requires Tailwind |
| `--repo-url URL`, `--repo URL` | `https://github.com/primethink-ai/primethink-app-templates` | Public HTTPS GitHub repository containing the template catalog |
| `--ref REF` | `main` | Git branch, tag, or commit to download |

The destination must not exist, including an existing empty directory. This prevents an LLM or script from overwriting work accidentally. Generation is atomic: a download, catalog, or filesystem failure leaves no partial destination. The archive is size-limited; unsafe catalog paths, path traversal, duplicate files, and symbolic links are rejected.

Valid feature combinations:

| Framework | Tailwind | Flowbite | Default catalog template |
|---|---:|---:|---|
| React | yes | yes | `react-vite-tailwind-flowbite` |
| React | yes | no | `react-tailwind-dynamic` |
| React | no | no | `react-dynamic` |
| HTML | yes | yes | `html-tailwind-flowbite-dynamic` |
| HTML | yes | no | `html-tailwind-dynamic` |
| HTML | no | no | `html-dynamic` |

Flowbite without Tailwind is invalid and exits with a usage error before downloading anything.

```bash
# Default React project with Tailwind and Flowbite
pt live-app new ./decision-board

# One-file HTML with Tailwind but no Flowbite
pt live-app new ./queue --framework html --no-flowbite

# React with hand-written CSS and no styling libraries
pt live-app new ./focused-app --no-tailwind --no-flowbite

# Reproducible generation from another public catalog
pt live-app new ./custom \
  --repo https://github.com/acme/live-app-templates \
  --ref 4c72d51
```

After generation, read the project's `README.md`. Template build and deployment models differ: the default full React template uses Vite, while the other default templates are no-build `index.html` apps. The command deliberately does not run `npm install`, a build, or any generated scripts.

#### Custom catalog contract

A custom repository provides `live-app-templates/manifest.json` at its root. Each entry maps one feature combination to a repository-relative directory:

```json
{
  "version": 1,
  "templates": [
    {
      "id": "react-company-starter",
      "framework": "react",
      "tailwind": true,
      "flowbite": true,
      "path": "live-app-templates/react-company-starter"
    }
  ]
}
```

Each requested combination must match exactly one entry. For compatibility, repositories without a manifest can use the default catalog's conventional directory names, but new catalogs should always include the manifest.

---

## Profiles: `pt profile`

Profiles let you store multiple API tokens (e.g. for different accounts or environments) and switch between them.

### `pt profile add`

Configure an API token for a profile. Creates the profile if it doesn't exist, overwrites it if it does.

```bash
pt profile add --token YOUR_API_TOKEN [--profile NAME] [--api-url URL]
```

| Option | Required | Default | Description |
|---|---|---|---|
| `--token`, `-t` | yes | — | Your API token |
| `--profile`, `-p` | no | `default` | Profile name |
| `--api-url`, `-u` | no | `https://api.primethink.ai` | Custom API URL stored with the profile |

The profile becomes the active profile if it is the first one configured, or if it is named `default`; otherwise the command reports which profile remains active.

```bash
# Simplest setup
pt profile add --token YOUR_API_TOKEN

# A named profile pointing at a staging server
pt profile add --token STAGING_TOKEN --profile staging --api-url https://staging-api.example.com
```

### `pt profile use`

Switch the active profile.

```bash
pt profile use PROFILE
```

```bash
pt profile use staging
# ✓ Switched to profile 'staging' (API: https://staging-api.example.com)
```

### `pt profile list`

List all configured profiles. The active profile is marked with `*`.

```bash
pt profile list
# Configured profiles:
# * default (https://api.primethink.ai)
#   staging (https://staging-api.example.com)
```

### `pt profile remove`

Remove a profile. If the removed profile was active, another profile becomes active automatically (if any remain).

```bash
pt profile remove PROFILE
```

---

## Chats: `pt chat`

Create and manage chats, send messages, and work with the files stored in a chat's workspace.

> In this group there is no `-p` shorthand for `--profile`; on the file commands `-p` means `--path`.

### `pt chat send`

Send a message to a chat (by ID or mention name) **or** to an agent (by ID). Exactly one target must be given: the positional `CHAT_ID_OR_MENTION` argument or the `--agent` option — not both.

```bash
pt chat send [CHAT_ID_OR_MENTION] --message "MESSAGE" [OPTIONS]
pt chat send --agent AGENT_ID --message "MESSAGE" [OPTIONS]
```

| Option | Required | Description |
|---|---|---|
| `CHAT_ID_OR_MENTION` | one of these two | Chat ID (e.g. `123`) or mention name (e.g. `@my-assistant`) |
| `--agent`, `-a` | one of these two | Agent (virtual assistant) ID to message instead of a chat |
| `--message`, `-m` | yes | Message text |
| `--files`, `-f` | no | File to attach; repeatable |
| `--async` | no | Don't wait for the response (chat messages only) |
| `--profile` | no | Profile for this request |
| `--api-url`, `-u` | no | API URL override |

```bash
# To a chat by ID
pt chat send 123 --message "Hello from the CLI"

# To a chat by mention name, with files
pt chat send @my-assistant -m "Review these" -f doc1.pdf -f doc2.pdf

# Fire-and-forget
pt chat send 123 -m "Long-running job" --async

# Directly to an agent
pt chat send --agent 1 -m "Analyze this data" -f sales.csv
```

### `pt chat list`

List chats, paginated, with optional filters.

```bash
pt chat list [OPTIONS]
```

| Option | Default | Description |
|---|---|---|
| `--page` | 1 | Page number |
| `--page-size` | 25 | Results per page |
| `--search`, `-s` | — | Search chats by name |
| `--starred/--no-starred` | — | Filter by starred status |
| `--archived/--no-archived` | — | Filter by archived status |
| `--workspace-id` | — | Filter by chat workspace ID |
| `--sort` | server default: `automatically` | Sorting strategy: `automatically` or `manually` |

```bash
pt chat list
pt chat list --search onboarding --starred
pt chat list --workspace-id 7 --sort manually --page-size 50
```

### `pt chat create`

Create a new chat. All options are optional; unset fields are left to server defaults.

```bash
pt chat create [OPTIONS]
```

| Option | Description |
|---|---|
| `--name` | Chat name |
| `--goal` | Chat goal text |
| `--goal-file` | Read the goal from a file (mutually exclusive with `--goal`) |
| `--virtual-assistant-id` | Virtual assistant (agent) ID for the chat |
| `--workspace-id` | Chat workspace ID |
| `--parent-chat-id` | Parent chat ID |
| `--type` | Chat type: `standard` or `direct_users` (server default: `standard`) |
| `--public/--no-public` | Make the chat public |
| `--member` | User ID to add as a member; repeat the flag for multiple members |

```bash
pt chat create --name "Q3 planning"
pt chat create --name "Research" --goal-file ./research-goal.md --virtual-assistant-id 7
pt chat create --name "Team room" --member 12 --member 15 --public
```

### `pt chat rename`

Rename a chat.

```bash
pt chat rename CHAT_ID NAME
```

```bash
pt chat rename 123 "Q3 planning (archived)"
```

### `pt chat goal`

Update a chat's goal. Provide the goal inline or from a file (one of the two is required).

```bash
pt chat goal CHAT_ID (--goal TEXT | --goal-file PATH)
```

```bash
pt chat goal 123 --goal "Track the Q3 launch checklist"
pt chat goal 123 --goal-file ./goal.md
```

### `pt chat messages`

List messages in a chat. With no options, the server returns the latest page (25 messages). Pagination is cursor-based on message IDs, not page numbers.

```bash
pt chat messages CHAT_ID [OPTIONS]
```

| Option | Description |
|---|---|
| `--size` | Number of messages to return (server default: 25) |
| `--before-message-id` | Only messages older than this message ID (for paging back through history) |
| `--after-message-id` | Only messages newer than this message ID (mutually exclusive with `--before-message-id`) |
| `--anchor-message-id` | A window of roughly 25 newer + 25 older messages around this message ID (overrides the other pagination options) |

```bash
# Latest messages
pt chat messages 123

# Page back: take the oldest ID from the previous page and repeat
pt chat messages 123 --size 50 --before-message-id 900

# Jump to the context around a specific message
pt chat messages 123 --anchor-message-id 456
```

### `pt chat archive`

Archive a chat.

```bash
pt chat archive CHAT_ID [--profile NAME] [--api-url URL]
```

### `pt chat unarchive`

Unarchive a chat.

```bash
pt chat unarchive CHAT_ID [--profile NAME] [--api-url URL]
```

### `pt chat delete`

Delete a chat. Prompts for confirmation; pass `--yes` to skip the prompt. If you just want a chat out of the way, prefer [`pt chat archive`](#pt-chat-archive) — it's reversible.

```bash
pt chat delete CHAT_ID [--yes] [--profile NAME] [--api-url URL]
```

### `pt chat list-files`

List files and directories in a chat's workspace. The `--path` option addresses a directory inside the chat (e.g. `/reports/2026`).

```bash
pt chat list-files CHAT_ID [--path /subfolder] [--profile NAME] [--api-url URL]
```

Prints a JSON object with `documents` (files, including their `id`s) and `dirs` (subdirectories).

```bash
pt chat list-files 123
pt chat list-files 123 --path /reports
```

### `pt chat upload-files`

Upload one or more local files to a chat.

```bash
pt chat upload-files CHAT_ID FILE [FILE ...] [--path /subfolder] [--profile NAME] [--api-url URL]
```

```bash
pt chat upload-files 123 report.pdf data.csv
pt chat upload-files 123 notes.md --path /meeting-notes
```

### `pt chat download-file`

Download a single file from a chat. The document ID comes from `pt chat list-files`.

```bash
pt chat download-file CHAT_ID DOCUMENT_ID [--output PATH] [--profile NAME] [--api-url URL]
```

| Option | Description |
|---|---|
| `--output`, `-o` | Local output path. Defaults to the file's original name in the current directory |

```bash
pt chat download-file 123 456
pt chat download-file 123 456 --output ./downloads/report.pdf
```

### `pt chat sync-to`

Upload the contents of a local directory to a chat, preserving the directory structure.

```bash
pt chat sync-to CHAT_ID LOCAL_DIR [OPTIONS]
```

| Option | Default | Description |
|---|---|---|
| `--path`, `-p` | chat root | Target directory inside the chat |
| `--pattern` | `*` | Glob pattern to select files (e.g. `*.pdf`) |
| `--recursive`, `-r` | off | Include files in subdirectories |
| `--profile` | active profile | Profile for this request |
| `--api-url`, `-u` | profile URL | API URL override |

Per-file upload failures are reported and counted but don't abort the sync; a summary line (`Sync complete: N uploaded, M failed`) is printed at the end.

```bash
# Upload every file in ./reports (top level only)
pt chat sync-to 123 ./reports

# Recursively upload only PDFs into the chat's /archive directory
pt chat sync-to 123 ./reports --pattern '*.pdf' --recursive --path /archive
```

### `pt chat sync-from`

Download all files from a chat (recursing through its subdirectories) into a local directory, recreating the directory structure.

```bash
pt chat sync-from CHAT_ID LOCAL_DIR [--path /subfolder] [--profile NAME] [--api-url URL]
```

```bash
# Mirror the whole chat workspace locally
pt chat sync-from 123 ./chat-backup

# Only the /reports subtree
pt chat sync-from 123 ./reports --path /reports
```

### `pt chat sync`

Two-way sync between a chat folder and a local directory: downloads files that exist only in the chat, uploads files that exist only locally. Files are matched by their path relative to the synced roots.

```bash
pt chat sync CHAT_ID LOCAL_DIR [OPTIONS]
```

| Option | Default | Description |
|---|---|---|
| `--path`, `-p` | chat root | Directory inside the chat to sync against |
| `--prefer` | skip | What to do with files present on both sides: unset skips them, `local` re-uploads the local copy, `remote` downloads the chat's copy over the local one |
| `--dry-run` | off | Print what would be downloaded/uploaded/skipped without transferring anything |
| `--profile` | active profile | Profile for this request |
| `--api-url`, `-u` | profile URL | API URL override |

There is no timestamp or checksum comparison — a file present on both sides is treated as a conflict and skipped unless `--prefer` names a winning side. If any remote directory listing fails, the command aborts (exit 1) before transferring anything, since an incomplete remote tree would misclassify files. Per-file transfer failures are non-fatal and counted in the summary (`Sync complete: N downloaded, M uploaded, K skipped, E failed`).

`sync` always recurses through the full remote and local trees — there is no `--recursive` flag, unlike `sync-to`. If two remote documents sanitize to the same local filename, the CLI keeps the first and prints a warning that the other is ignored.

```bash
# Reconcile both sides; files on both sides are left untouched
pt chat sync 123 ./workspace

# Preview the plan first
pt chat sync 123 ./workspace --dry-run

# The chat's copy wins for files present on both sides
pt chat sync 123 ./workspace --prefer remote

# Only the /reports subtree
pt chat sync 123 ./reports --path /reports
```

---

## Collections: `pt collection`

Collections are shared document stores. The file subcommands mirror the `pt chat` file commands.

> As with `pt chat`, there is no `-p` shorthand for `--profile` in this group; `-p` means `--path` on the file commands.

### `pt collection list`

List collections, paginated.

```bash
pt collection list [--page N] [--page-size N] [--search TEXT] [--profile NAME] [--api-url URL]
```

| Option | Default | Description |
|---|---|---|
| `--page` | 1 | Page number |
| `--page-size` | 20 | Results per page |
| `--search`, `-s` | — | Filter collections by name |

```bash
pt collection list
pt collection list --search contracts --page-size 50
```

### `pt collection list-files`

List files and directories in a collection.

```bash
pt collection list-files COLLECTION_ID [--path /subfolder] [--profile NAME] [--api-url URL]
```

### `pt collection upload-files`

Upload one or more local files to a collection.

```bash
pt collection upload-files COLLECTION_ID FILE [FILE ...] [--path /subfolder] [--profile NAME] [--api-url URL]
```

### `pt collection download-file`

Download a single file from a collection.

```bash
pt collection download-file COLLECTION_ID DOCUMENT_ID [--output PATH] [--profile NAME] [--api-url URL]
```

### `pt collection sync-to`

Upload a local directory to a collection. Same options and behavior as [`pt chat sync-to`](#pt-chat-sync-to): `--path`/`-p`, `--pattern` (default `*`), `--recursive`/`-r`.

```bash
pt collection sync-to 42 ./knowledge-base --recursive
```

### `pt collection sync-from`

Download a collection's files (recursively) into a local directory. Same behavior as [`pt chat sync-from`](#pt-chat-sync-from).

```bash
pt collection sync-from 42 ./kb-backup
```

---

## Agents: `pt agent`

Manage agents (virtual assistants): list, inspect, create, update, and delete them, and discover the available agent types.

> **Sending a message to an agent** is done with [`pt chat send --agent AGENT_ID`](#pt-chat-send) — there is deliberately no `pt agent send`; one command covers messaging chats and agents.

### `pt agent list`

List agents, with optional filters.

```bash
pt agent list [OPTIONS]
```

| Option | Description |
|---|---|
| `--search`, `-s` | Search agents by name |
| `--type-id` | Filter by agent type ID; repeat the flag for multiple types |
| `--status` | Filter by status: `all` or `archived` (server default: `all`) |
| `--task-id` | Filter by task ID |

```bash
pt agent list
pt agent list --search support --type-id 1 --type-id 3
pt agent list --status archived
```

### `pt agent get`

Fetch an agent's full details as JSON.

```bash
pt agent get AGENT_ID [--profile NAME] [--api-url URL]
```

```bash
pt agent get 7 | jq '.model'
```

### `pt agent create`

Create a new agent.

```bash
pt agent create --name NAME --public-description TEXT --type-id N [OPTIONS]
```

Required options:

| Option | Description |
|---|---|
| `--name` | Agent name |
| `--public-description` | Public description shown for the agent |
| `--type-id` | Agent type ID (discover with [`pt agent types`](#pt-agent-types)) |

Optional field options (shared with `pt agent update`; only options you pass are sent):

| Option | Description |
|---|---|
| `--description` | Agent description / instructions |
| `--description-file` | Read the description from a file (mutually exclusive with `--description`) |
| `--model` | Model name |
| `--access-type` | Access type: `private`, `group`, `task`, `system`, or `catalog` (server default: `private`) |
| `--help-text` | Help text for the agent |
| `--help-url` | Help URL for the agent |
| `--tag-ids` | Tag IDs, comma-separated |
| `--extra` | Extra data as a JSON string (validated before sending) |

```bash
pt agent types   # find the type ID first

pt agent create --name "Support bot" --public-description "Answers support questions" --type-id 1

pt agent create \
  --name "Researcher" \
  --public-description "Deep research assistant" \
  --type-id 1 \
  --description-file ./researcher-instructions.md \
  --model gpt-test \
  --access-type group
```

### `pt agent update`

Update an existing agent. Accepts the same options as `pt agent create`, but **all** of them are optional. At least one field must be provided; only the fields you pass are changed (the request is a PATCH).

```bash
pt agent update AGENT_ID [FIELD OPTIONS] [--profile NAME] [--api-url URL]
```

```bash
pt agent update 7 --model gpt-test-2
pt agent update 7 --description-file ./new-instructions.md
```

### `pt agent delete`

Delete an agent. Prompts for confirmation; pass `--yes` to skip the prompt.

```bash
pt agent delete AGENT_ID [--yes] [--profile NAME] [--api-url URL]
```

### `pt agent types`

List the available agent (virtual assistant) types. Use the returned IDs for `pt agent create --type-id` and `pt agent list --type-id`.

```bash
pt agent types [--profile NAME] [--api-url URL]
```

---

## Tasks: `pt task`

Discover and execute task actions; create, inspect, update, and version tasks; upload task images.

### `pt task actions`

List the task actions available to your account.

```bash
pt task actions [--profile NAME] [--api-url URL]
```

Calls `GET /api/v1/tasks/available_task_actions` and prints the JSON response.

```bash
pt task actions
pt task actions --profile production
pt task actions | jq '.[].name'
```

### `pt task execute`

Execute a task action with a message and optional file attachments.

```bash
pt task execute --action ACTION --message "MESSAGE" [OPTIONS]
```

| Option | Required | Description |
|---|---|---|
| `--action`, `-a` | yes | Task action name (see `pt task actions`) |
| `--message`, `-m` | yes | Message input for the action |
| `--files`, `-f` | no | File to attach; repeat the flag for multiple files |
| `--return-original` | no | Include the original message in the response |
| `--profile` | no | Profile for this request |
| `--api-url`, `-u` | no | API URL override |

```bash
pt task execute --action summarize --message "Summarize this report" --files report.pdf

pt task execute -a compare_documents -m "Compare these" -f q1.pdf -f q2.pdf
```

### `pt task create`

Create a new task.

```bash
pt task create --name NAME --description TEXT --type TYPE [FIELD OPTIONS] [--profile NAME] [--api-url URL]
```

Required options:

| Option | Description |
|---|---|
| `--name` | Task name |
| `--description` | Task description |
| `--type` | Task type: `private`, `public`, `group`, `system`, or `catalog` |

Optional field options (shared with `pt task update`; only options you pass are sent — everything else is left to server defaults):

| Option | Description |
|---|---|
| `--goal` | Task goal text (defaults to empty on create) |
| `--goal-file` | Read the goal from a file (mutually exclusive with `--goal`) |
| `--virtual-assistant-id` | Virtual assistant (agent) ID that runs the task |
| `--initial-prompt` | Initial prompt |
| `--status` | Task status (server default: `published`) |
| `--schedule-nl` | Schedule in natural language (e.g. `"every Monday at 9am"`) or a cron expression |
| `--schedule-prompt` | Prompt to run on the schedule |
| `--chat-type` | Chat type (server default: `standard`) |
| `--global-memory/--no-global-memory` | Enable global memory (server default: enabled) |
| `--chat-history/--no-chat-history` | Enable chat history (server default: enabled) |
| `--search-in-chat/--no-search-in-chat` | Enable search in chat |
| `--search-in-documents/--no-search-in-documents` | Enable search in documents |
| `--extra-vas` | Extra virtual assistant IDs, comma-separated (e.g. `2,5,9`) |
| `--tag-ids` | Tag IDs, comma-separated |
| `--action-name` | Task action name |
| `--help-text` | Help text shown for the task |
| `--help-url` | Help URL for the task |
| `--run-immediately/--no-run-immediately` | Run the task immediately |
| `--canvas` | Canvas HTML content as a string |
| `--canvas-file` | Read canvas HTML from a file (mutually exclusive with `--canvas`) |
| `--page-type` | Page type (e.g. `html`) |
| `--summary-enabled/--no-summary-enabled` | Enable summary |
| `--docs-enabled/--no-docs-enabled` | Enable documents and collections |
| `--scheduled-jobs/--no-scheduled-jobs` | Enable scheduled jobs |
| `--email-integration/--no-email-integration` | Enable email integration |
| `--default-evaluator-agent-id` | Default evaluator agent ID |
| `--evaluation-pass-threshold` | Evaluation pass threshold (1–100) |
| `--evaluation-message-delay-ms` | Evaluation message delay in milliseconds |
| `--share-action/--no-share-action` | Enable share action |
| `--mimetypes` | Accepted mimetypes, comma-separated (e.g. `application/pdf,image/png`) |
| `--extra` | Extra data as a JSON string (validated before sending) |
| `--public-chat/--no-public-chat` | Enable public chat |

```bash
# Minimal task
pt task create --name "Weekly digest" --description "Summarize the week" --type private

# Scheduled task with a goal read from a file
pt task create \
  --name "Morning briefing" \
  --description "Daily news summary" \
  --type private \
  --goal-file ./briefing-goal.md \
  --virtual-assistant-id 7 \
  --schedule-nl "every weekday at 8am" \
  --schedule-prompt "Prepare the morning briefing"

# Task with extra structured data
pt task create --name "Intake" --description "Client intake" --type group \
  --extra '{"department": "legal", "priority": 2}'
```

### `pt task update`

Update an existing task. Accepts the same options as `pt task create`, but **all** of them are optional (including `--name`, `--description`, and `--type`). At least one field must be provided; only the fields you pass are changed (the request is a PATCH).

```bash
pt task update TASK_ID [FIELD OPTIONS] [--profile NAME] [--api-url URL]
```

```bash
pt task update 99 --description "Updated description"
pt task update 99 --schedule-nl "every Friday at 17:00" --schedule-prompt "Send weekly report"
pt task update 99 --canvas-file ./page.html --page-type html
```

### `pt task get`

Fetch a task's full details as JSON.

```bash
pt task get TASK_ID [--profile NAME] [--api-url URL]
```

```bash
pt task get 99
pt task get 99 | jq '.schedule_nl'
```

### `pt task delete`

Delete a task. Prompts for confirmation; pass `--yes` to skip the prompt (e.g. in scripts). Aborts without calling the API if you answer no.

```bash
pt task delete TASK_ID [--yes] [--profile NAME] [--api-url URL]
```

```bash
pt task delete 99
# Delete this task? This cannot be undone. [y/N]: y
# Task 99 deleted

pt task delete 99 --yes   # no prompt
```

### `pt task duplicate`

Duplicate a task. Prints the new task as JSON.

```bash
pt task duplicate TASK_ID [--profile NAME] [--api-url URL]
```

```bash
pt task duplicate 99 | jq '.id'
```

### `pt task publish`

Make a task public — sets its type to `public` via the task public-status endpoint.

```bash
pt task publish TASK_ID [--profile NAME] [--api-url URL]
```

### `pt task unpublish`

Make a task private — sets its type to `private` via the task public-status endpoint. For other type changes (`group`, `system`, `catalog`), use `pt task update TASK_ID --type TYPE`.

```bash
pt task unpublish TASK_ID [--profile NAME] [--api-url URL]
```

### `pt task export`

Export a task's portable configuration as JSON, for recreating the task elsewhere with [`pt task import`](#pt-task-import). The CLI fetches the task and keeps only the fields that `pt task create` accepts (name, description, type, goal, agent reference, feature toggles, schedule, canvas, extra data, …) — server-assigned fields (id, UUID, group, owner, timestamps, image, attached documents/collections, tags) are stripped, as are unset (`null`) fields.

```bash
pt task export TASK_ID [--output FILE] [--profile NAME] [--api-url URL]
```

| Option | Description |
|---|---|
| `--output`, `-o` | Write the JSON to a file (parent directories are created) instead of stdout |

```bash
# Print to stdout / redirect into a file
pt task export 42
pt task export 42 > tasks/support_bot.json

# Or write directly to a file
pt task export 42 --output tasks/support_bot.json
```

> **Note:** `--virtual-assistant-id` and similar ID references are environment-specific. When importing into a different environment, edit them in the exported file if the target environment uses different IDs.

### `pt task import`

Create a **new** task from an exported JSON file. This is the deployment half of the export/import workflow: keep exported task files in git, then import them into another group or environment with `--profile`.

```bash
pt task import FILE [--profile NAME] [--api-url URL]
```

The file must contain a JSON object with at least `name`, `description`, and `type`; a missing `goal` defaults to `""`. Unknown and server-assigned fields are ignored, so a raw `pt task get` dump also imports cleanly. If the file contains `schedule_nl`/`schedule_prompt`, the longer 120-second timeout applies (schedule parsing runs an LLM server-side). Prints the created task as JSON.

```bash
# Recreate the task in the current environment
pt task import tasks/support_bot.json

# THE use case: deploy the same task config to another environment
pt task import tasks/support_bot.json --profile production
```

### `pt task create-version`

Snapshot the task's current state as a new named version. The CLI fetches the task, extracts its versionable fields, and posts them as version data.

```bash
pt task create-version TASK_ID [--version-name NAME] [--profile NAME] [--api-url URL]
```

| Option | Default | Description |
|---|---|---|
| `--version-name` | `Production` | Name for the new version |

```bash
pt task create-version 99
pt task create-version 99 --version-name "v2-beta"
```

### `pt task upload-image`

Upload an image file for a task (e.g. its icon/cover image). The content type is inferred from the file extension.

```bash
pt task upload-image TASK_ID FILE [--profile NAME] [--api-url URL]
```

```bash
pt task upload-image 99 ./cover.png
```

---

## Search: `pt search`

Semantic (vector) search across documents, a chat, a collection, or chat messages. All four commands share the same tuning options:

| Option | Description |
|---|---|
| `--search-type` | `mmr` (server default), `similarity`, or `similarity_score_threshold` |
| `--top-k` | Number of top results to return |
| `--score-threshold` | Minimum similarity score threshold |

### `pt search documents`

Semantic search across documents in a vector store collection.

```bash
pt search documents QUERY --collection-name NAME [TUNING OPTIONS] [--profile NAME] [--api-url URL]
```

| Option | Required | Description |
|---|---|---|
| `--collection-name` | yes | Vector store collection name to search within |

```bash
pt search documents "refund policy" --collection-name kb
pt search documents "refund policy" --collection-name kb --search-type similarity --top-k 3
```

### `pt search chat`

Semantic search within one chat — its messages and, optionally, its documents and collections.

```bash
pt search chat CHAT_ID QUERY [TUNING OPTIONS] [SCOPE TOGGLES] [--profile NAME] [--api-url URL]
```

Scope toggles (unset toggles are left to server defaults):

| Option | Description |
|---|---|
| `--in-chat/--no-in-chat` | Search messages in the chat and its workspaces |
| `--in-documents/--no-in-documents` | Search in documents |
| `--in-collections/--no-in-collections` | Search in collections |

```bash
pt search chat 123 "what did we decide about the deadline"
pt search chat 123 "quarterly numbers" --no-in-chat --in-documents --top-k 10
```

### `pt search collection`

Semantic search within a collection's documents.

```bash
pt search collection COLLECTION_ID QUERY [TUNING OPTIONS] [--metadata JSON] [--profile NAME] [--api-url URL]
```

| Option | Description |
|---|---|
| `--metadata` | Metadata filter as a JSON object; supported keys: `document_id`, `document_name`, `extra` |

```bash
pt search collection 42 "termination clause"
pt search collection 42 "termination clause" --metadata '{"document_name": "contract.pdf"}'
```

### `pt search messages`

Semantic search across chat messages, optionally filtered to one chat, user, or agent.

```bash
pt search messages QUERY --collection-name NAME [FILTERS] [TUNING OPTIONS] [--profile NAME] [--api-url URL]
```

| Option | Required | Description |
|---|---|---|
| `--collection-name` | yes | Vector store collection name to search within |
| `--chat-id` | no | Filter by chat ID |
| `--user-id` | no | Filter by user ID |
| `--agent-id` | no | Filter by agent (virtual assistant) ID |

```bash
pt search messages "standup notes" --collection-name msgs --user-id 2
```

---

## Images: `pt image`

### `pt image generate`

Generate an image with AI text-to-image and save it to a local file. The response is validated to actually be an image (PNG/JPEG/GIF/WebP) before writing.

```bash
pt image generate --prompt "PROMPT" --output PATH [--style STYLE] [--size WxH] [--profile NAME] [--api-url URL]
```

| Option | Required | Default | Description |
|---|---|---|---|
| `--prompt` | yes | — | Image generation prompt |
| `--output`, `-o` | yes | — | Output file path (parent directories are created) |
| `--style` | no | `realistic` | Image style |
| `--size` | no | `1024x1024` | Image size |

```bash
pt image generate --prompt "A lighthouse at dawn, watercolor" -o lighthouse.png
pt image generate --prompt "Team logo, minimal, flat" --style illustration --size 512x512 -o logo.png
```

---

## MCP Server (`pt mcp`)

`pt mcp` runs PrimeThink as a [Model Context Protocol](https://modelcontextprotocol.io) server over stdio. It exposes the same API surface as the CLI — reusing the CLI's connection, auth, and HTTP code — so MCP clients (Claude Code, Claude Desktop, and other MCP-compatible tools) can call PrimeThink directly instead of shelling out to `pt`.

### Installation

The MCP SDK is an **optional** dependency, so CLI-only installs stay lean:

```bash
pip install 'primethink-cli[mcp]'   # requires Python 3.10+ (the core CLI supports 3.8+)
pt mcp                              # serve over stdio
```

If the `mcp` package isn't installed, `pt mcp` prints an install hint and exits 1.

### Authentication

The server authenticates exactly like the CLI: the same profiles and environment variables (`PRIMETHINK_TOKEN`, `PRIMETHINK_API_URL`, `PRIMETHINK_PROFILE`, `PRIMETHINK_CONFIG_PATH`). Set `PRIMETHINK_TOKEN` in the client's server config, or rely on the configured active profile in `~/.primethink/config.json`. Every tool also accepts optional `profile` and `api_url` arguments to override the connection per call.

### Client configuration

Point an MCP client's server config at `pt mcp`:

```json
{
  "mcpServers": {
    "primethink": {
      "command": "pt",
      "args": ["mcp"],
      "env": { "PRIMETHINK_TOKEN": "your-api-token" }
    }
  }
}
```

### Tools

Every API command has a tool equivalent. Names are snake_case (e.g. the CLI's `pt chat send` → the `send_message` tool, `pt chat list` → `list_chats`):

| Group | Tools |
|---|---|
| General | `whoami` |
| Messaging & actions | `send_message`, `list_task_actions`, `execute_task_action` |
| Chats | `list_chats`, `create_chat`, `rename_chat`, `set_chat_goal`, `list_chat_messages`, `archive_chat`, `unarchive_chat`, `delete_chat`, `list_chat_files`, `upload_chat_files`, `download_chat_file`, `sync_chat_to`, `sync_chat_from`, `sync_chat` |
| Collections | `list_collections`, `list_collection_files`, `upload_collection_files`, `download_collection_file`, `sync_collection_to`, `sync_collection_from` |
| Tasks | `create_task`, `update_task`, `get_task`, `export_task`, `delete_task`, `duplicate_task`, `publish_task`, `unpublish_task`, `import_task`, `create_task_version`, `upload_task_image` |
| Agents | `list_agents`, `get_agent`, `create_agent`, `update_agent`, `delete_agent`, `list_agent_types` |
| Search | `search_documents`, `search_chat`, `search_collection`, `search_messages` |
| Images | `generate_image` |

Notes:

- **`create_task`/`update_task` and `create_agent`/`update_agent`** expose the most common fields as typed arguments plus an `extra_fields` object for any remaining API field (e.g. `canvas`, `page_type`, `tag_ids`, the `*_enabled` toggles, `extra`). Nothing from the CLI is lost.
- **File and sync tools** (`upload_*`, `download_*`, `sync_*`, `export_task`, `import_task`, `upload_task_image`, `generate_image`) operate on the filesystem where the server runs — the user's machine, for a locally launched stdio server. Sync tools return their per-file progress as text.
- **Destructive tools** (`delete_chat`, `delete_task`, `delete_agent`) execute immediately — unlike the CLI they do not prompt — so the MCP client is responsible for any confirmation.
- **Errors** are returned as MCP tool errors (a bad status becomes `Error: <status> - <body>`); the server never writes to stdout or exits the process on a per-call failure.

---

## Exit Codes and Errors

- **`0`** — success.
- **`1`** — runtime failure: missing/unknown profile, connection error, non-success HTTP status, unavailable template, unsafe archive, or filesystem failure.
- **`2`** — command-line usage error, such as an invalid option value or `--flowbite` combined with `--no-tailwind`.

Exceptions: the **sync commands** (`sync-to` / `sync-from` / `sync`) treat per-file failures as non-fatal — they report each failure, keep going, and print a `Sync complete: … M failed` summary. The two-way `pt chat sync` is stricter about listings: if it cannot fully list the remote tree, it aborts with exit 1 before transferring anything.

Common error messages:

| Message | Meaning / fix |
|---|---|
| `Error: No active profile. Use 'pt profile add' to set one up.` | Run `pt profile add --token …` |
| `Error: Profile 'X' not found.` (plus a list of available profiles) | Check `pt profile list`, then `pt profile use` or `--profile` an existing one |
| `Error connecting to API: …` | Network problem or wrong `--api-url` |
| `Error: <status> - <body>` | The API rejected the request; the body usually explains why |

## Timeouts

- Standard requests time out after **30 seconds**.
- Requests that trigger slow server-side work use a **120-second** timeout: `pt image generate`, `pt task create`/`update` when `--schedule-nl` or `--schedule-prompt` is set, and `pt task import` when the imported file contains `schedule_nl` or `schedule_prompt` (natural-language schedules are parsed by an LLM server-side).
