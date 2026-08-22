# PrimeThink CLI - User Guide

Welcome to the PrimeThink CLI User Guide! This comprehensive guide will help you get started with the PrimeThink command-line interface and make the most of its features.

For a terse, complete listing of every command and option, see the [CLI Reference](https://github.com/primethink-ai/primethink-cli/blob/main/docs/cli-reference.md).

## Introduction

The PrimeThink CLI is a powerful command-line tool that allows you to interact with PrimeThink's AI platform directly from your terminal. Whether you're looking to automate tasks, integrate AI into your workflows, or simply prefer working from the command line, the PrimeThink CLI makes it easy.

### What Can You Do With the CLI?

- Execute AI-powered task actions
- Send messages to chats and agents
- Manage multiple API tokens and environments
- Upload, download, and sync files with chats and collections
- Manage chats end to end: create, read messages, archive, delete
- Create, update, and manage agents (virtual assistants)
- Create, update, version, duplicate, and manage task visibility — including scheduled tasks
- Publish and test conventional task projects from version-controlled directories
- Build, publish, synchronize, and run browser tests against Live Apps
- Export a task's config to a git-friendly JSON file and re-import it in another environment
- Search documents, chats, collections, and messages semantically
- Generate AI images from text prompts
- Integrate PrimeThink into scripts and automation workflows

## Installation

### Requirements

- Python 3.8 or higher
- pip (Python package installer)
- Internet connection

### Quick Install (macOS & Linux)

```bash
curl -fsSL https://primethink.ai/cli/install.sh | bash
```

### Quick Install (Windows PowerShell)

```powershell
irm https://primethink.ai/cli/install.ps1 | iex
```

### Install via pip

```bash
pip install primethink-cli
```

### Install via Homebrew (macOS & Linux)

```bash
brew tap primethink-ai/tap
brew install primethink-cli
```

### Install from Source

```bash
git clone https://github.com/primethink-ai/primethink-cli.git
cd primethink-cli
pip install -e .
```

### Verify Installation

```bash
pt version
```

You should see output like:
```
PrimeThink CLI v1.1.0
```

## Getting Started

### Step 1: Obtain an API Key

1. Log in to your PrimeThink account at [https://app.primethink.ai](https://app.primethink.ai)
2. Navigate to **Settings** → **API Keys**
3. Click **Generate New Key**
4. Copy the generated API key (you won't be able to see it again!)

### Step 2: Configure the CLI

Run the configuration command with your API key:

```bash
pt profile add --token YOUR_API_KEY
```

You should see:
```
✓ Token configured for profile 'default' (API: https://api.primethink.ai)
✓ Profile 'default' set as active
```

### Step 3: Test Your Setup

Check who you're authenticated as:

```bash
pt whoami
```

This prints your user details and groups as JSON — if it succeeds, your token works. It also takes `--profile`, which makes it the quickest way to verify which account each profile points at:

```bash
pt whoami --profile production | jq '.user.email'
```

You can also list available task actions:

```bash
pt task actions
```

If you see a list of available actions, you're all set!

## Live App Project Workflows

### Scaffold a Live App

Use `pt live-app new` to create a local project from PrimeThink's public template catalog. Scaffolding downloads public template files and does not call the PrimeThink API, so it does not require a token or configured profile.

```bash
# Default: React + Vite + Tailwind + Flowbite
pt live-app new ./my-app

# No-build HTML + Tailwind
pt live-app new ./my-html-app --framework html --no-flowbite

# No-build React without Tailwind or Flowbite
pt live-app new ./my-react-app --no-tailwind --no-flowbite
```

| Option | Default | Description |
|--------|---------|-------------|
| `--framework react\|html` | `react` | Select React or HTML |
| `--tailwind` / `--no-tailwind` | `--tailwind` | Include or exclude Tailwind CSS |
| `--flowbite` / `--no-flowbite` | `--flowbite` | Include or exclude Flowbite; Flowbite requires Tailwind |

The six supported starters are intentionally blank canvases. They retain only the selected framework and dependencies plus required PrimeThink wiring, such as the host-theme bridge and deployment configuration. They do not include a sample interface, entities, colors, layout, or application behavior. Build the UI and ChatDB data layer for your application rather than expecting sample CRUD code from the template.

!!! important
    Read the generated `README.md` before building or deploying. The default Vite project has a build step and deploys the files inside `dist/`; no-build templates deploy their generated HTML entry file directly. Preserve the generated PrimeThink deployment and host-theme wiring.

### Install the Live App developer skill

Generated template READMEs direct developers and compatible coding agents to the complete `primethink-developer` skill for the injected `pt` API, ChatDB patterns, reusable libraries, deployment, and other Live App conventions. Install it in the scope used by your coding agent:

```bash
pt install-developer-skill                       # ~/.claude/skills (default)
pt install-developer-skill --project             # ./.claude/skills
pt install-developer-skill --dir ~/.kiro/skills  # custom skills directory
```

The installer downloads the complete skill from the public PrimeThink templates repository, including its references and reusable libraries. It does not require a PrimeThink token. An existing installation is not overwritten unless you explicitly pass `--force`.

`pt install-developer-skill` is distinct from `pt install-skill`: the developer skill covers building PrimeThink Live Apps and integrations, while the CLI skill teaches compatible agents the general CLI command map and workflows.

### Publish a Live App task

`pt live-app publish` creates a private, published task from a project directory or updates an existing task when you supply `--task-id`. The assigned agent is required.

```bash
# Create a reusable Live App task
pt live-app publish ./my-app --virtual-assistant-id 7

# Update an existing task
pt live-app publish ./my-app --task-id 42 --virtual-assistant-id 7
```

| Option | Default | Description |
|--------|---------|-------------|
| `--task-id ID` | Create a task | Update this task instead |
| `--virtual-assistant-id ID` | Required | Agent assigned to the task |
| `--app-dir DIRECTORY` | Auto-detect | Flat deployment artifact; otherwise checks `dist/`, then `app/`, then the project root |
| `--version-name NAME` | `Production` | Name for the task version and app-document versions |
| `--profile`, `--api-url` | Active profile | Target PrimeThink connection |

The command reads these conventional project files:

- `.name.config` — optional task name; otherwise the project directory name.
- `.description.config` — optional description; otherwise the task name.
- `GOAL.md` — optional Live App task goal.
- `INITIAL_PROMPT.md` — optional initial prompt.
- `.image.png` — optional task image uploaded after the app files.

The selected artifact must contain `index.html` or `canvas.html`; `canvas.html` is uploaded as `index.html`. The artifact must be flat. If `dist/` or `app/` is selected, every top-level file is included except hidden files and the unused entry alias. For a project-root artifact, only supported web-asset extensions are included. Nested artifact files are rejected before any remote task is created or updated.

Publishing creates a named task version and writes files into the task's `@app` folder. A same-named remote file receives a new document version, which preserves its document ID and relative links. Byte-identical content is reported as unchanged. This is an additive/versioning synchronization: remote `@app` files that are absent locally are not deleted automatically.

### Synchronize a Live App into a test chat

`pt live-app test` deploys the same flat artifact directly into a chat. With no `--chat-id`, it creates a temporary HTML chat by default. With `--chat-id`, it reuses that chat and switches its renderer to Live App mode.

```bash
# Create a temporary test chat
pt live-app test ./my-app

# Update one existing chat and open it
pt live-app test ./my-app --chat-id CHAT_UUID --open

# Create a permanent chat in a workspace
pt live-app test ./my-app --workspace-id WORKSPACE_ID --permanent
```

The command supports the same `--app-dir`, `--version-name`, `--profile`, and `--api-url` choices as publishing. `--temporary` / `--permanent` and `--workspace-id` apply only when creating a chat. By default, the URL is derived from the selected API URL: a host beginning with `api.` is mapped to `app.`, while custom and development hosts are used unchanged. Pass `--web-url` to override the printed/opened application URL. A non-empty `GOAL.md` is applied when present; it is optional for Live App tests.

Existing app documents are versioned, missing documents are uploaded, identical documents are skipped, and any failed file stops the command with a summary. As with publishing, files absent from the local artifact are not removed from the chat.

### Switch a chat renderer

Use `pt chat type` when you need to change a chat's view without synchronizing a project:

```bash
pt chat type CHAT_UUID live-app  # API page type: html
pt chat type CHAT_UUID chat      # normal conversation view
```

### Run deterministic Live App UI tests

Automated Live App UI testing is no longer a `pt` subcommand. The former `pt live-app test-ui` command was removed in CLI 1.3.4; testing now belongs to the `primethink-developer` skill and uses a reviewable YAML plan with a bundled deterministic Playwright runner. An LLM may author or repair the plan, but no LLM runs in the execution loop.

Install or update the complete developer skill, then install the runner's development dependencies once:

```bash
pt install-developer-skill                       # Claude Code default
pt install-developer-skill --dir ~/.kiro/skills  # Kiro

pip install playwright pyyaml
playwright install chromium
```

Deploy the app to a chat with `pt live-app test`, open that live chat, and follow this workflow:

1. Capture the running app's accessibility snapshot. Author against the rendered interface instead of guessing selectors from source code or memory.
2. Create `tests/test_plan.yaml`. Prefer semantic targets such as `role` + `name`, `text`, and `label`; use CSS or XPath only as a fallback.
3. Run the plan with the copy of `run_plan.py` bundled in the installed skill.
4. Read `tests/results/results.json` and `tests/results/test_results.md`. A failed step also writes a fresh accessibility snapshot.
5. Correct only the failing target, rerun the same plan, and commit `tests/test_plan.yaml` as the durable test artifact.

```bash
# Choose the directory where your coding agent installed the skill.
SKILL_DIR="$HOME/.kiro/skills/primethink-developer"
python "$SKILL_DIR/ui-testing/run_plan.py" tests/test_plan.yaml
```

A minimal plan identifies the deployed chat and gives every scenario and step a stable ID:

```yaml
plan_version: 1
app_name: my-live-app
base_url: https://app.primethink.ai
chat_id: CHAT_UUID

scenarios:
  - id: create-item
    title: User can create an item
    steps:
      - id: create-item.open
        action: navigate
        url: /chats/CHAT_UUID
      - id: create-item.add
        action: click
        target: { role: button, name: "Add" }
      - id: create-item.verify
        action: expect_visible
        target: { text: "Item created" }
```

The runner exits `0` when every step passes, `1` when a test step fails, and `2` for invalid plans or environment errors. See the [complete UI-testing guide](https://github.com/primethink-ai/primethink-app-templates/blob/main/skills/primethink-developer/ui-testing/README.md) for supported actions, assertions, target types, runner options, and result formats.

!!! warning "Verify browser authentication and review test plans"
    By default, the runner resolves the PrimeThink API token from `PRIMETHINK_TOKEN` or the active CLI profile and seeds the documented local-storage keys before the app loads. Verify those keys against the current web application. If it uses a different key or cookie-based session, configure the plan's `auth` block or pass `--storage-state` with a previously saved authenticated browser session. Never commit tokens or storage-state files.

    Treat a YAML test plan as trusted developer input and review it before execution. Keep navigation on the intended `base_url` origin and use path-safe step IDs containing only letters, numbers, periods, underscores, or hyphens. The current runner does not enforce same-origin navigation or constrain failure-snapshot filenames derived from step IDs, so do not run plans obtained from untrusted sources.

## Configuration

### Managing Profiles

The CLI supports multiple profiles, allowing you to manage different accounts or environments.

#### Create a New Profile

```bash
pt profile add --token YOUR_TOKEN --profile work
```

You can also specify a custom API URL:

```bash
pt profile add --token YOUR_TOKEN --profile custom --api-url https://custom-api.example.com
```

#### Switch Between Profiles

```bash
pt profile use work
```

#### Use a Profile for a Single Command

You can use a specific profile for a single command without switching the active profile:

```bash
pt task actions --profile production
pt chat send 123 --message "Hello" --profile work
pt task execute --action summarize --message "Test" --profile custom
```

This works on every API command, including the `chat`, `collection`, `agent`, `task`, `search`, `image`, and `whoami` commands.

> **Heads-up:** in the `pt task`, `pt agent`, and `pt search` groups, `pt image generate`,
> and `pt whoami`, `-p` is the short flag for `--profile`. In the `pt chat` and
> `pt collection` groups there is no `-p` for profile — there `-p` is the short flag for
> `--path` (a directory inside the chat or collection) on the file commands. Use the long
> form `--profile` when in doubt.

#### List All Profiles

```bash
pt profile list
```

Output example:
```
Configured profiles:
* default (https://api.primethink.ai)
  work (https://api.primethink.ai)
  custom (https://custom-api.example.com)
```

The `*` indicates the currently active profile.

#### Remove a Profile

```bash
pt profile remove old-profile
```

### Custom API URLs

You can configure profiles with custom API endpoints. This is useful for:

- Using different environments (development, staging, production)
- Testing with local API servers
- Accessing region-specific endpoints

```bash
# Configure for development environment
pt profile add --token DEV_TOKEN --profile development --api-url https://dev-api.example.com

# Configure for production
pt profile add --token PROD_TOKEN --profile production --api-url https://api.primethink.ai

# Configure for local testing
pt profile add --token TEST_TOKEN --profile local --api-url http://localhost:8000
```

You can also override the API URL for a single request with `--api-url`/`-u` on any command.

### Configuration File

Your configuration is stored at `~/.primethink/config.json` (on Windows: `%USERPROFILE%\.primethink\config.json`). You can view it:

```bash
cat ~/.primethink/config.json
```

**Note**: Keep this file secure as it contains your API tokens!

### Environment Variables

Every setting can also be supplied through an environment variable. All of
them are optional overrides — when a variable is not set, the CLI falls back
to the config file and its built-in defaults:

| Variable | Description | Default when unset |
|----------|-------------|--------------------|
| `PRIMETHINK_TOKEN` | API token, bypassing the config file. Handy for CI/CD pipelines and containers where you don't want to run `pt profile add`. | Token from the active profile |
| `PRIMETHINK_API_URL` | API base URL override. | Profile's `api_url`, otherwise `https://api.primethink.ai` |
| `PRIMETHINK_PROFILE` | Profile to use when `--profile` is not passed. | The active profile |
| `PRIMETHINK_CONFIG_PATH` | Custom config file path. | `~/.primethink/config.json` |
| `PRIMETHINK_DEBUG` | Set to `1` (or `true`/`yes`/`on`) to print request/response debug information to stderr. | Disabled |

Precedence, highest first: command-line flag (`--profile`, `--api-url`) →
environment variable → config file → built-in default.

```bash
# Run a one-off command against production without touching your config file
PRIMETHINK_TOKEN="$PROD_TOKEN" pt task actions

# Point every command in a CI job at a staging API
export PRIMETHINK_TOKEN="$STAGING_TOKEN"
export PRIMETHINK_API_URL="https://staging-api.example.com"
pt chat list

# Debug a failing request
PRIMETHINK_DEBUG=1 pt chat send 123 --message "Hello"
```

## Core Features

### 1. Available Actions

View all task actions available in your PrimeThink account:

```bash
pt task actions
```

Example output:
```json
[
  {
    "name": "summarize",
    "description": "Summarize text or documents"
  },
  {
    "name": "translate",
    "description": "Translate text to another language"
  }
]
```

### 2. Execute Task Actions

Execute a task action with a message:

```bash
pt task execute --action summarize --message "Summarize this quarterly report"
```

**With files**:

```bash
pt task execute \
  --action analyze_document \
  --message "Analyze this contract" \
  --files contract.pdf
```

**Multiple files**:

```bash
pt task execute \
  --action compare_documents \
  --message "Compare these reports" \
  --files report1.pdf \
  --files report2.pdf
```

**Return original message**:

```bash
pt task execute \
  --action translate \
  --message "Translate to Spanish" \
  --return-original
```

### 3. Send Messages to Chats

Send a message to a chat using its ID or mention name:

**By chat ID**:

```bash
pt chat send 123 --message "Hello from the CLI!"
```

**By mention name**:

```bash
pt chat send @my-assistant --message "What's the weather today?"
```

**With files**:

```bash
pt chat send 123 \
  --message "Please review these documents" \
  --files document1.pdf \
  --files document2.pdf
```

**Asynchronous message** (don't wait for the response):

```bash
pt chat send 123 \
  --message "Process this in the background" \
  --async
```

### 4. Send Messages to Agents

Send a message directly to an agent using the `--agent` option:

```bash
pt chat send --agent 1 --message "Help me plan my week"
```

**With files**:

```bash
pt chat send --agent 1 \
  --message "Analyze this data" \
  --files sales_data.csv
```

**Note:** You must provide either a chat ID/mention or `--agent`, but not both.

## Managing Chats

Beyond sending messages, the `pt chat` group lets you find and manage the chats themselves.

### Find your chats

```bash
# List chats (paginated, 25 per page)
pt chat list

# Filter and sort
pt chat list --search onboarding
pt chat list --starred --sort manually
pt chat list --workspace-id 7 --no-archived
```

### Create a chat

All options are optional — a bare `pt chat create` works:

```bash
pt chat create --name "Q3 planning"

# With a goal, an assigned agent, and members
pt chat create \
  --name "Research" \
  --goal-file ./research-goal.md \
  --virtual-assistant-id 7 \
  --member 12 --member 15
```

Other options: `--workspace-id`, `--parent-chat-id`, `--type standard|direct_users`, and `--public/--no-public`.

### Read a chat's messages

```bash
# The latest 25 messages
pt chat messages 123

# Page back through history: pass the oldest message ID you've seen
pt chat messages 123 --size 50 --before-message-id 900

# Jump to the context around one message (~25 newer + ~25 older)
pt chat messages 123 --anchor-message-id 456
```

Pagination is cursor-based on message IDs (`--before-message-id` / `--after-message-id`), not page numbers.

### Archive or delete a chat

```bash
# Reversible: hide a chat without losing it
pt chat archive 123
pt chat unarchive 123

# Irreversible: prompts for confirmation unless you pass --yes
pt chat delete 123
```

### Rename a chat, update its goal, or switch its renderer

```bash
pt chat rename 123 "Q3 planning (final)"

pt chat goal 123 --goal "Track the Q3 launch checklist"
pt chat goal 123 --goal-file ./goal.md

pt chat type 123 live-app
pt chat type 123 chat
```

`pt chat type ... live-app` maps to the HTML page type; `chat` restores the normal conversation view.

## Working with Chat Files

Chats have their own file workspace, organized into directories. The `pt chat` command group lets you browse, upload, download, and sync those files.

### Browse a chat's files

```bash
# List files and directories at the chat root
pt chat list-files 123

# List a specific subdirectory
pt chat list-files 123 --path /reports
```

The output is JSON with `documents` (files, including their `id`s — you'll need these to download) and `dirs` (subdirectories).

### Upload files

```bash
# Upload to the chat root
pt chat upload-files 123 report.pdf data.csv

# Upload into a subdirectory
pt chat upload-files 123 notes.md --path /meeting-notes
```

### Download a file

Use the document ID from `pt chat list-files`:

```bash
# Save with the original filename
pt chat download-file 123 456

# Save to a specific path
pt chat download-file 123 456 --output ./downloads/report.pdf
```

### Sync a local directory into a chat

`sync-to` uploads a directory's files, preserving the folder structure:

```bash
# Everything in ./reports (top level only)
pt chat sync-to 123 ./reports

# Only PDFs, including subfolders, into the chat's /archive directory
pt chat sync-to 123 ./reports --pattern '*.pdf' --recursive --path /archive
```

Individual upload failures don't stop the sync; you get a summary at the end:

```
Sync complete: 14 uploaded, 1 failed
```

### Sync a chat's files to a local directory

`sync-from` downloads everything (recursively), recreating the directory structure:

```bash
# Back up the whole chat workspace
pt chat sync-from 123 ./chat-backup

# Only the /reports subtree
pt chat sync-from 123 ./reports --path /reports
```

### Two-way sync

`sync` reconciles both sides in one command: files that exist only in the chat are downloaded, files that exist only locally are uploaded, and files present on both sides (same relative path) are left untouched:

```bash
# Preview what would happen
pt chat sync 123 ./workspace --dry-run

# Reconcile the chat folder and ./workspace
pt chat sync 123 ./workspace

# Only the /reports subtree
pt chat sync 123 ./reports --path /reports
```

There's no timestamp comparison — if a file exists on both sides, the CLI can't tell which copy is newer, so it skips it unless you pick a winner:

```bash
pt chat sync 123 ./workspace --prefer remote   # the chat's copy overwrites the local file
pt chat sync 123 ./workspace --prefer local    # the local copy is re-uploaded to the chat
```

If the chat's file tree can't be fully listed (e.g. a network hiccup), the command aborts before transferring anything rather than acting on an incomplete picture. If two remote documents sanitize to the same local filename, `sync` keeps the first and prints a warning about the ignored one — so an "expected" file missing locally after a sync usually has a warning line explaining it. Individual file transfer failures don't stop the run; the summary reports them:

```text
Sync complete: 3 downloaded, 2 uploaded, 4 skipped, 0 failed
```

## Working with Collections

Collections are shared document stores. The `pt collection` file commands work like their `pt chat` counterparts (browse, upload, download, one-way sync), plus there's a discovery command. Note: the two-way `sync` command exists only for chats — collections have `sync-to` and `sync-from`.

### Find your collections

```bash
# List collections (paginated, 20 per page)
pt collection list

# Search by name, with a bigger page
pt collection list --search contracts --page-size 50
```

### File operations

```bash
# Browse
pt collection list-files 42
pt collection list-files 42 --path /policies

# Upload
pt collection upload-files 42 handbook.pdf --path /policies

# Download
pt collection download-file 42 789 --output handbook.pdf

# One-way sync, in either direction
pt collection sync-to 42 ./knowledge-base --recursive
pt collection sync-from 42 ./kb-backup
```

## Semantic Search

The `pt search` group finds content by meaning rather than exact keywords. There are four scopes:

```bash
# Within one chat (messages; optionally its documents and collections)
pt search chat 123 "what did we decide about the deadline"

# Within one collection's documents
pt search collection 42 "termination clause"

# Across documents in a vector store collection (--collection-name is required)
pt search documents "refund policy" --collection-name kb

# Across chat messages (--collection-name is required), with optional filters
pt search messages "standup notes" --collection-name msgs --chat-id 5 --user-id 2
```

All four accept the same tuning options:

- `--search-type` — `mmr` (server default), `similarity`, or `similarity_score_threshold`
- `--top-k` — how many results to return
- `--score-threshold` — minimum similarity score

Extras per command:

- `pt search chat` has scope toggles: `--in-chat/--no-in-chat`, `--in-documents/--no-in-documents`, `--in-collections/--no-in-collections`
- `pt search collection` accepts `--metadata '{"document_name": "contract.pdf"}'` to filter by document metadata

> Note: `--collection-name` (for `documents`/`messages`) is a **vector store collection name**, not the numeric collection ID used by `pt collection` commands.

## Managing Agents

The `pt agent` group manages agents (virtual assistants) — the AI assistants you message with `pt chat send --agent`.

### Discover and inspect agents

```bash
# List agents, with optional filters
pt agent list
pt agent list --search support --status archived

# Full details for one agent
pt agent get 7
```

### Create an agent

Three fields are required — a name, a public description, and a type ID (find type IDs with `pt agent types`):

```bash
pt agent types

pt agent create --name "Support bot" --public-description "Answers support questions" --type-id 1
```

Useful optional fields:

```bash
pt agent create \
  --name "Researcher" \
  --public-description "Deep research assistant" \
  --type-id 1 \
  --description-file ./researcher-instructions.md \
  --model openai:gpt-5.5 \
  --access-type group
```

- `--description` / `--description-file` — the agent's description/instructions, inline or from a file
- `--model` — which model the agent uses
- `--access-type` — `private` (default), `group`, `task`, `system`, or `catalog`
- `--tag-ids 3,4`, `--extra '{"key": "value"}'`, `--help-text`, `--help-url`

### Update or delete an agent

```bash
# PATCH semantics: only the fields you pass change
pt agent update 7 --model openai:gpt-5.4 --public-description "New blurb"

# Delete — prompts for confirmation unless you pass --yes
pt agent delete 7
```

### Message an agent

Messaging stays under `pt chat send` — there is deliberately no separate `pt agent send`:

```bash
pt chat send --agent 7 --message "Analyze this data" --files data.csv
```

## Managing Tasks

The `pt task` group lets you create, inspect, update, and version tasks from the terminal.

### Create a task

Three fields are required — name, description, and type (`private`, `public`, `group`, `system`, or `catalog`):

```bash
pt task create --name "Weekly digest" --description "Summarize the week" --type private
```

Everything else is optional and left to server defaults unless you set it. Some highlights (see the [CLI Reference](https://github.com/primethink-ai/primethink-cli/blob/main/docs/cli-reference.md#pt-task-create) for the full list):

```bash
pt task create \
  --name "Morning briefing" \
  --description "Daily news summary" \
  --type private \
  --goal-file ./briefing-goal.md \
  --virtual-assistant-id 7 \
  --schedule-nl "every weekday at 8am" \
  --schedule-prompt "Prepare the morning briefing"
```

- `--goal` / `--goal-file` — the task's goal, inline or from a file
- `--virtual-assistant-id` — which agent runs the task
- `--schedule-nl` — a schedule in plain English (or a cron expression); `--schedule-prompt` is what runs on that schedule
- `--canvas` / `--canvas-file` — HTML canvas content, with `--page-type html`
- `--extra '{"key": "value"}'` — arbitrary extra data as JSON
- Feature toggles like `--global-memory/--no-global-memory`, `--chat-history/--no-chat-history`, `--docs-enabled/--no-docs-enabled`, `--scheduled-jobs/--no-scheduled-jobs`

> Natural-language schedules are interpreted by an LLM on the server, so `create`/`update` calls that include `--schedule-nl` or `--schedule-prompt` use a longer (120s) timeout.

### Inspect and update a task

```bash
# Full task details as JSON
pt task get 99

# Update only the fields you pass (PATCH semantics)
pt task update 99 --description "Updated description"
pt task update 99 --schedule-nl "every Friday at 17:00"
```

### Publish and test a task project

A conventional task project stores its instructions and metadata in files that can be reviewed and versioned with the rest of your code:

```text
briefing/
├── GOAL.md                 # required and non-empty
├── INITIAL_PROMPT.md       # optional
├── .name.config            # optional; defaults to "briefing"
└── .description.config     # optional; defaults to the task name
```

Create a private, published task or synchronize those represented fields into an existing task:

```bash
pt task publish ./briefing --virtual-assistant-id 7
pt task publish ./briefing --task-id 99 --virtual-assistant-id 7
```

When updating, the command changes only the project-backed fields — name, description, goal, initial prompt, and assigned agent — and preserves unrelated server fields. This differs from `pt task import`, which creates a new task from portable JSON.

Use `pt task test` to apply the required `GOAL.md` to a temporary test chat, or reuse an existing chat. Existing chats are switched to normal chat mode.

```bash
pt task test ./briefing
pt task test ./briefing --chat-id CHAT_UUID
pt task test ./briefing --workspace-id WORKSPACE_ID --permanent --open
```

`--temporary` / `--permanent` and `--workspace-id` apply only to newly created chats. By default, the URL is derived from the selected API URL: a host beginning with `api.` is mapped to `app.`, while custom and development hosts are used unchanged. Pass `--web-url` to override the printed/opened chat URL. The command validates `GOAL.md` before creating or changing a remote chat.

### Duplicate, change visibility, or delete a task

```bash
# Clone a task (prints the new task's JSON, including its id)
pt task duplicate 99

# Toggle a task's visibility (its type) between public and private
pt task set-public 99
pt task set-private 99

# Delete a task — prompts for confirmation unless you pass --yes
pt task delete 99
pt task delete 99 --yes
```

`pt task publish` now publishes a project directory; it no longer changes visibility. The old `pt task unpublish` command has been removed. For task types other than public/private (for example, `group` or `catalog`), use `pt task update 99 --type group`.

### Version a task

Snapshot the task's current state as a named version:

```bash
pt task create-version 99                       # version named "Production"
pt task create-version 99 --version-name "v2"
```

### Export and import tasks (reproducible deployments)

`pt task export` writes a task's **portable config** as JSON — only the fields `pt task create` accepts; server-assigned fields (id, group, owner, timestamps, attached documents, tags) are stripped. `pt task import` creates a **new** task from such a file.

The intended workflow: export a working task, check the file into git, and recreate it in another group or environment with one command — `--profile` on `import` is how you pick the target environment:

```bash
# 1. Export the task you refined in staging and version it
pt task export 42 > tasks/support_bot.json      # or: --output tasks/support_bot.json
git add tasks/support_bot.json && git commit -m "Support bot task config"

# 2. Deploy the exact same task to production
pt task import tasks/support_bot.json --profile production
```

Notes:

- `import` always creates a new task; to change an existing task use `pt task update`.
- ID references in the file (`virtual_assistant_id`, `extra_vas`, `default_evaluator_agent_id`) point at objects in the *source* environment — edit them if the target environment uses different IDs.
- A raw `pt task get` dump also imports cleanly; non-portable fields are ignored.
- `name`, `description`, and `type` are required in the file; a missing `goal` defaults to empty.

### Task images

```bash
# Upload a cover/icon image for a task
pt task upload-image 99 ./cover.png

# Generate an image with AI and save it locally
pt image generate --prompt "A lighthouse at dawn, watercolor" --output lighthouse.png
pt image generate --prompt "Minimal flat team logo" --style illustration --size 512x512 -o logo.png
```

## Common Use Cases

### Use Case 1: Document Summarization

Summarize a document or multiple documents:

```bash
# Single document
pt task execute \
  --action summarize \
  --message "Create a concise summary" \
  --files report.pdf

# Multiple documents
pt task execute \
  --action summarize \
  --message "Summarize all quarterly reports" \
  --files Q1.pdf \
  --files Q2.pdf \
  --files Q3.pdf \
  --files Q4.pdf
```

### Use Case 2: Translation

Translate text or documents:

```bash
# Translate text
pt task execute \
  --action translate \
  --message "Translate this to French: Hello, how are you?"

# Translate document
pt task execute \
  --action translate \
  --message "Translate this document to Spanish" \
  --files document.pdf
```

### Use Case 3: Data Analysis

Analyze data files:

```bash
pt chat send --agent 1 \
  --message "Analyze sales trends and provide insights" \
  --files sales_2024.csv
```

### Use Case 4: Feed a Chat, Then Ask About the Files

Upload working documents to a chat, then ask the assistant about them:

```bash
# Push the whole project folder into the chat
pt chat sync-to 123 ./project-docs --recursive

# Ask about the uploaded material
pt chat send 123 --message "Summarize the key risks across these documents"

# Later, pull down anything the assistant produced
pt chat sync-from 123 ./project-docs-output
```

### Use Case 5: Keep a Collection in Sync with a Local Knowledge Base

```bash
#!/bin/bash
# refresh-kb.sh - push the latest docs to the shared collection

pt collection sync-to 42 ./kb --pattern '*.md' --recursive
```

Run it from cron or CI whenever your docs change.

### Use Case 6: Batch Processing

Process multiple files in a loop:

```bash
#!/bin/bash

for file in documents/*.pdf; do
    echo "Processing: $file"
    pt task execute \
        --action extract_key_points \
        --message "Extract key points from this document" \
        --files "$file"
done
```

### Use Case 7: Scheduled Reporting Task

Create a task that runs on a schedule without any UI clicks:

```bash
pt task create \
  --name "Weekly sales report" \
  --description "Compile and send the weekly sales report" \
  --type private \
  --virtual-assistant-id 7 \
  --schedule-nl "every Friday at 4pm" \
  --schedule-prompt "Compile this week's sales report and summarize the highlights"
```

### Use Case 8: Chat Automation

Automate chat interactions:

```bash
# Send daily standup message
pt chat send @team-standup \
  --message "Daily standup: Completed API integration, working on documentation today"
```

## Tips and Tricks

### 1. Use Shell Aliases

Create shortcuts for frequently used commands:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias pta='pt task execute'
alias ptm='pt chat send'

# Usage
pta --action summarize --message "Summarize this"
ptm 123 --message "Hello"
```

### 2. Save Command Output

Save responses to files:

```bash
pt task actions > actions.json
pt task execute --action analyze --message "Test" > result.json
```

### 3. Parse JSON Output

Use `jq` to parse JSON responses:

```bash
# Extract specific fields
pt task actions | jq '.[0].name'

# List a chat's document IDs and names
pt chat list-files 123 | jq '.documents[] | {id, filename}'

# Search collections by name (read the id from the JSON output)
pt collection list --search contracts
```

### 4. Environment Variables

Use environment variables for common values:

```bash
export CHAT_ID="123"
export AGENT_ID="1"

pt chat send $CHAT_ID --message "Hello"
pt chat send --agent $AGENT_ID --message "Help"
```

### 5. Script Integration

Create reusable scripts:

```bash
#!/bin/bash
# analyze.sh - Analyze documents

if [ $# -eq 0 ]; then
    echo "Usage: ./analyze.sh <file1> [file2] ..."
    exit 1
fi

# Build the --files arguments safely (handles filenames with spaces)
args=()
for f in "$@"; do
    args+=(--files "$f")
done

pt task execute \
    --action analyze_document \
    --message "Analyze these documents" \
    "${args[@]}"
```

Usage:
```bash
chmod +x analyze.sh
./analyze.sh report1.pdf report2.pdf
```

### 6. Quick Profile Switching

Use a function for quick profile switching:

```bash
# Add to ~/.bashrc or ~/.zshrc
switch-pt() {
    pt profile use "$1"
}

# Usage
switch-pt development
switch-pt production
```

### 7. Error Logging

Log errors to a file:

```bash
pt task execute \
    --action process \
    --message "Test" 2>> error.log
```

### 8. Combining with Other Tools

Combine with other command-line tools:

```bash
# Find PDFs and process them
find . -name "*.pdf" -exec pt task execute \
    --action summarize \
    --message "Summarize" \
    --files {} \;

# Process files matching a pattern
ls *.txt | xargs -I {} pt task execute \
    --action analyze \
    --message "Analyze" \
    --files {}
```

## Troubleshooting

### Problem: "No active profile" Error

**Solution**:
```bash
pt profile add --token YOUR_API_KEY
```

### Problem: "Profile not found" Error

**Solution**:
```bash
# List available profiles
pt profile list

# Use an existing profile
pt profile use profile-name
```

### Problem: Authentication Failures

**Solution**:
1. Verify your token is correct
2. Check if the token has expired
3. Regenerate a new token in PrimeThink settings

```bash
pt profile add --token NEW_TOKEN
```

### Problem: File Upload Errors

**Solution**:
1. Check file exists and is readable
2. Verify file path is correct
3. Ensure you have read permissions
4. Check the platform upload limits: max **50MB per file**, **200MB total per request**, **10 files per request**

```bash
ls -la file.pdf
chmod 644 file.pdf
```

### Problem: `-p` Doesn't Select a Profile in `chat`/`collection` Commands

In the `pt chat` and `pt collection` groups there is no `-p` shorthand for `--profile`; on the file commands `-p` is the short flag for `--path`.

**Solution**: use the long form:

```bash
pt chat list-files 123 --profile production
```

### Problem: Network/Connection Errors

**Solution**:
1. Check internet connection
2. Verify API endpoint is accessible
3. Check firewall settings

```bash
# Test API reachability (liveness probe)
curl -sS https://api.primethink.ai/api/v1/health/live
```

### Problem: JSON Parse Errors

**Solution**:
Make sure the output is valid JSON before parsing:

```bash
# Validate JSON
pt task actions | python -m json.tool
```

### Problem: Slow Response Times

**Solution**:
- Large files may take longer to process
- Use async mode for chat messages (`--async`)
- Task creation with `--schedule-nl` and `pt image generate` involve server-side AI work and can take up to two minutes
- Check network speed

### Problem: Sync Reports Failures

`sync-to` and `sync-from` keep going when individual files fail and print a summary like `Sync complete: 14 uploaded, 1 failed`. Scroll up in the output to find the per-file error lines, fix the cause (permissions, network, bad file), and re-run the sync.

The two-way `pt chat sync` treats *listing* failures differently: if the chat's file tree can't be fully listed, it aborts immediately with exit code 1 and transfers nothing, rather than printing a partial summary. Individual file transfer failures are still non-fatal and show up in the final `Sync complete: … failed` line.

## FAQ

### Q: How do I get an API key?

**A**: Log in to PrimeThink, go to Settings → API Keys, and generate a new key.

### Q: Can I use multiple API keys?

**A**: Yes! Use profiles to manage multiple API keys:

```bash
pt profile add --token TOKEN1 --profile account1
pt profile add --token TOKEN2 --profile account2
pt profile use account1
```

### Q: Where is my configuration stored?

**A**: Configuration is stored at `~/.primethink/config.json`

### Q: How do I switch between production and development?

**A**: Configure separate profiles with different API URLs:

```bash
pt profile add --token DEV_TOKEN --profile dev --api-url https://dev-api.example.com
pt profile add --token PROD_TOKEN --profile prod --api-url https://api.primethink.ai

# Switch between profiles
pt profile use dev  # or: pt profile use prod

# Or use a specific profile for one command
pt task actions --profile prod
```

### Q: How do I deploy the same task to another environment?

**A**: Export it, version the file in git, and import it with the target environment's profile:

```bash
pt task export 42 --output tasks/support_bot.json
pt task import tasks/support_bot.json --profile prod
```

`import` creates a new task from the file's portable config (server-assigned fields are stripped on export). Remember to adjust environment-specific IDs like `virtual_assistant_id` in the file if they differ between environments.

### Q: Can I upload multiple files?

**A**: Yes, use multiple `--files` options:

```bash
pt task execute \
    --action process \
    --message "Process these" \
    --files file1.pdf \
    --files file2.pdf \
    --files file3.pdf
```

For whole directories, use `pt chat sync-to` or `pt collection sync-to` instead.

### Q: What file types are supported?

**A**: The CLI supports uploading any file type. Support depends on the PrimeThink platform and the specific task action you're using. Platform limits apply: max 50MB per file, 200MB total per request, and 10 files per request.

### Q: How do I find a document ID to download?

**A**: List the files first — every document in the output includes its `id`:

```bash
pt chat list-files 123
pt collection list-files 42
```

### Q: How do I see the CLI version?

**A**:
```bash
pt version
```

### Q: Can I use the CLI in scripts?

**A**: Absolutely! The CLI is designed for automation and scripting. Commands print JSON to stdout and exit non-zero on failure. See the [CLI Reference](https://github.com/primethink-ai/primethink-cli/blob/main/docs/cli-reference.md) for every command and option.

### Q: Can AI coding agents (Claude Code etc.) use the CLI?

**A**: Yes — the package bundles an agent skill that teaches compatible agents the command map and common workflows. Install it with:

```bash
pt install-skill            # all your projects (~/.claude/skills)
pt install-skill --project  # just the current repo (./.claude/skills)
```

### Q: How do I uninstall the CLI?

**A**:
```bash
pip uninstall primethink-cli
```

### Q: Are my API tokens secure?

**A**: Tokens are stored locally in `~/.primethink/config.json`. Keep this file secure with proper file permissions:

```bash
chmod 600 ~/.primethink/config.json
```

### Q: Can I use this on Windows?

**A**: Yes! The CLI works on Windows, macOS, and Linux. On Windows, use PowerShell or Command Prompt.

### Q: What's the difference between chat and agent messages?

**A**:
- **Chat messages** (`pt chat send CHAT_ID`): Send to existing chats by ID or mention name
- **Agent messages** (`pt chat send --agent AGENT_ID`): Send directly to an agent by ID

### Q: How do I find my chat ID?

**A**: Run `pt chat list` — every chat in the output includes its `id`. You can also find chat IDs in the PrimeThink web interface URL. The CLI additionally supports mention names (e.g., `@assistant-name`).

## Getting Help

### Command Help

Get help for any command:

```bash
# General help
pt --help

# Group help
pt chat --help
pt collection --help
pt task --help

# Command-specific help
pt profile add --help
pt task create --help
pt chat sync-to --help
```

The `--help` flag can appear before, within, or after a recognized command path. These commands show the same help page:

```bash
pt --help chat send
pt chat --help send
pt chat send --help
```

A leading `--help` descends through recognized commands and stops at the first unknown path segment, showing help for the enclosing group. A trailing `--help` retains Click's normal path validation, so an unknown command before the flag still reports a `No such command` error.

### Documentation

- [README](https://github.com/primethink-ai/primethink-cli/blob/main/README.md) - Quick start guide
- [CLI Reference](https://github.com/primethink-ai/primethink-cli/blob/main/docs/cli-reference.md) - Every command and option
- [Developer Guide](https://github.com/primethink-ai/primethink-cli/blob/main/DEVELOPER.md) - Contributing and internals

### Support

- **Email**: [support@primethink.ai](mailto:support@primethink.ai)
- **GitHub Issues**: [Report a bug](https://github.com/primethink-ai/primethink-cli/issues)
- **Documentation**: [https://docs.primethink.ai](https://docs.primethink.ai)
- **Community**: [https://community.primethink.ai](https://community.primethink.ai)

## Next Steps

Now that you're familiar with the basics:

1. **Explore available actions** - Run `pt task actions` to see what's possible
2. **Try different use cases** - Experiment with document analysis, translation, etc.
3. **Automate workflows** - Integrate the CLI into your scripts and processes
4. **Read the integration guide** - Learn advanced integration patterns
5. **Share feedback** - Help us improve by sharing your experience

Happy automating with PrimeThink CLI! 🚀
