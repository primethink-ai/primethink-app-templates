# Developer Guide

Integration, CLI, REST API, and authentication reference.

## Integration Directions

**External → PrimeThink**: REST API (`https://api.primethink.ai`) with API key auth, PrimeThink CLI, Live Chat Widget embed.
**PrimeThink → External**: API Capabilities (call REST APIs as agent tools), MCP Capabilities (hosted MCP servers), Tool Plugins (custom logic), Email Integration, Computer Use (browser automation when no API exists).

| Mechanism | When to use |
|---|---|
| API Capabilities | Service has an HTTP API; agent calls it directly. Secrets via `${SETTING_NAME}` placeholders |
| MCP Capabilities | Service offers an MCP server (e.g. GitHub) — full tool suite at once |
| Tool Plugins | Custom behaviour: validation, chaining, transformation |
| Email Integration | Email-based workflows: intake, notifications |
| Computer Use | No API — agent operates the web UI |

**Secrets**: never hard-code credentials. Store as settings, reference with `${API_KEY}` placeholders — resolved at runtime from user/group settings.

## Authentication

Generate a key in the app: `Settings > API Keys`.

```
Authorization: Token YOUR_API_KEY
```

Query-param fallback when headers aren't available:

```
?api_key=YOUR_API_KEY
```

**Rate limits**: Free 100 req/day · Pro 1,000 req/hour · Enterprise custom.

**API docs**: OpenAPI spec at `https://api.primethink.ai/pt-openapi.json`, interactive docs at `https://api.primethink.ai/pt-docs`.

## REST API

Base URL: `https://api.primethink.ai` — all endpoints under the `/api/v1` prefix.

### List available task actions

```bash
curl -X GET "https://api.primethink.ai/api/v1/tasks/available_task_actions" \
  -H "accept: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN"
# → [{"id": 101, "name": "Content Generator", "description": "...", "action_name": "generate_content"}, ...]
```

### Execute task action

`POST /api/v1/tasks/execute_task_action` (multipart form)
- `task_action_name` (required), `message_input` (required)
- `return_original_message` (optional, default false)
- `files` (optional, repeatable)

```bash
curl -X POST "https://api.primethink.ai/api/v1/tasks/execute_task_action" \
  -H "Authorization: Token YOUR_API_TOKEN" \
  -F "task_action_name=analyze_data" \
  -F "message_input=Please analyze the uploaded dataset for trends" \
  -F "return_original_message=true" \
  -F "files=@/path/to/data.csv" \
  -F "files=@/path/to/metadata.json"
```

Returns the same `{user_message_id, streaming_task_id, responses}` envelope as chat messages (below).

### Send message to chat

`POST /api/v1/chats/{chat_id_or_mention}/messages` (multipart form)
- `message_input` (required)
- `is_sync` (optional, default true) — async returns a `streaming_task_id` instead of `responses`
- `files` (optional, repeatable)
- Chat identified by numeric ID or mention name (e.g. `my-project-chat`)

```bash
curl -X POST "https://api.primethink.ai/api/v1/chats/my-project-chat/messages" \
  -H "Authorization: Token YOUR_API_TOKEN" \
  -F "message_input=Please review these documents" \
  -F "is_sync=true" \
  -F "files=@/path/to/report.pdf"
```

Response shapes:
```json
// sync + default agent set: full assistant response
{"user_message_id": 45678, "streaming_task_id": null, "responses": [{"id": 45679, "message": "...", "user_type": "assistant", "reasoning_steps": [], "replying_to_message": {}, "aggregated_reactions": []}]}
// sync, no default agent: responses is null
{"user_message_id": 25655, "streaming_task_id": null, "responses": null}
// async
{"user_message_id": 25661, "streaming_task_id": "32893ee1-...", "responses": null}
```

### Send message to virtual assistant (agent)

`POST /api/v1/virtual-assistants/{agent_id}/messages` — same form fields as chat messages but **no `is_sync`** parameter.

```bash
curl -X POST "https://api.primethink.ai/api/v1/virtual-assistants/42/messages" \
  -H "Authorization: Token YOUR_API_TOKEN" \
  -F "message_input=Please analyze this financial report" \
  -F "files=@/path/to/financial-report.pdf"
```

### Collections: metadata upload and filtered search

Upload custom fields via the `metadata` **JSON-encoded string**; search them via the `extra` object (top-level `document_id`/`document_name` are reserved for built-in filters).

```bash
# Upload text with metadata
curl -X POST "https://api.primethink.ai/api/v1/collections/<collection_id>/texts" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[{"name": "My report", "text": "report text", "metadata": "{\"year\":\"2025\"}"}]'

# Search filtered by metadata via "extra"
curl -X POST "https://api.primethink.ai/api/v1/collections/<collection_id>/search?query=<my_query>" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"extra": {"year": "2025"}}'
```

### Errors

Standard JSON errors: `401` invalid/missing token, `404` chat/agent not found, `400` missing required param, `429` rate limit (includes `retry_after` seconds).

### File uploads

- Types: PDF, DOC(X), TXT, MD, XLS(X), CSV, TSV, JPG, PNG, GIF, WEBP, JSON, XML, YAML, ZIP (extracted)
- Limits: 50MB/file, 200MB/request, 10 files/request

## Image Generation API

### GET `/api/v1/images/{image_id}`
Retrieve a generated image; optional `width` param to resize.

### POST `/api/v1/images/tti` — text-to-image

| Param | Notes |
|---|---|
| `prompt` | required |
| `provider` | `auto`, `openai`, `google` (default: user setting or `auto`) |
| `size` | `auto`, `1024x1024`, `1536x1024`, `1024x1536`, `256x256`, `512x512`, `1792x1024`, `1024x1792` (default `1024x1024`) |
| `style` | default `realistic` |
| `reference_images` | array of URLs; limit to 2-3 for best results |
| `reference_weight` | 0.0–1.0, default 0.5 (0.3-0.4 light inspiration, 0.7-0.8 strong style match) |
| `count` | 1–4 variations, default 1 (multiple → zip output) |
| `negative_prompt` | what to exclude (e.g. "text, watermark, blurry") |
| `name` | custom filename, no extension |
| `folder` | save destination, default `images` |

```bash
curl -X POST "https://api.primethink.ai/api/v1/images/tti" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene mountain landscape at sunset, golden hour lighting, highly detailed",
    "size": "1536x1024",
    "negative_prompt": "people, buildings, text, blurry"
  }' \
  --output image.png
```

```bash
# With reference images + custom name/folder
curl -X POST "https://api.primethink.ai/api/v1/images/tti" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Modern office interior in the same style",
    "reference_images": ["https://example.com/style-ref.jpg"],
    "reference_weight": 0.6,
    "name": "hero-banner",
    "folder": "marketing"
  }' \
  --output image.png
```

```bash
# Multiple variations in one request (count > 1 → zip)
curl -X POST "https://api.primethink.ai/api/v1/images/tti" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Abstract geometric patterns, vibrant colors", "size": "1024x1024", "count": 4}' \
  --output images.zip
```

Prompt structure that works: subject → details → environment → lighting → style → quality markers. Always include a negative prompt (blurry, text, watermark; for people: extra fingers, bad anatomy).

Size guide: `1024x1024` social/square, `1536x1024` landscape cards, `1024x1536` portrait/pins, `1792x1024` banners/headers, `1024x1792` tall portrait/mobile wallpaper, `512x512` thumbnails/avatars. `auto` lets the system choose from the prompt.

## Audio Generation API

Providers: OpenAI, Google Cloud TTS, ElevenLabs.

### POST `/api/v1/voice/stt` — transcription

Multipart upload; MP3, WAV, M4A, MP4, MPEG, MPGA, WEBM up to 25MB. Language auto-detected.

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/stt" \
  -H "Authorization: Token YOUR_API_KEY" \
  -F "file=@recording.mp3"
```

### POST `/api/v1/voice/translate` — transcribe + translate to English

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/translate" \
  -H "Authorization: Token YOUR_API_KEY" \
  -F "file=@spanish_audio.mp3"
```

### POST `/api/v1/voice/tts` — text-to-speech (MP3 out)

| Param | Notes |
|---|---|
| `text` | single-voice content |
| `dialogue` | array of speaker objects for multi-voice (instead of `text`) |
| `voice` | voice ID/name |
| `instructions` | style/delivery guidance |
| `provider` | `openai`, `google`, `elevenlabs` |
| `name` / `folder` | custom filename (no extension) / save folder (default `audio`) |

### POST `/api/v1/voice/tts/stream`

Same params as `/api/v1/voice/tts` but streams audio in real time — use for interactive/low-latency apps; use `/api/v1/voice/tts` for downloads/storage.

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/tts" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a critical security update. Please take immediate action.",
    "voice": "onyx",
    "instructions": "Speak with authority and urgency, emphasizing critical and immediate",
    "provider": "openai"
  }' \
  --output announcement.mp3
```

Streaming variant:

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/tts/stream" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "This audio streams as it generates.", "voice": "nova", "provider": "openai"}' \
  --output streamed.mp3
```

Multi-speaker dialogue:

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/tts" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "dialogue": [
      {"speaker": "Host", "text": "Welcome to the show!", "voice_id": "fable", "description": "enthusiastic and welcoming"},
      {"speaker": "Expert", "text": "Thanks for having me.", "voice_id": "echo", "description": "professional and knowledgeable"}
    ]
  }' \
  --output interview.mp3
```

OpenAI voices: `alloy` (neutral/general), `echo` (male, professional), `fable` (warm, storytelling), `onyx` (deep, authoritative), `nova` (energetic, marketing), `shimmer` (soft, calm).

TTS tips: write for speaking not reading; punctuation controls pacing (em dashes = dramatic pause, ellipses = trailing off); avoid ALL CAPS, URLs, long sentences; chunk long content to 100–300 words per request. STT tips: 16kHz+ sample rate, ≥128kbps MP3; split files >25MB at natural pauses.

Related: Audio Diarization API (transcription with speaker labels + timestamps), Video Analysis API.

## PrimeThink CLI (`pt`)

### Install

```bash
# macOS & Linux
curl -fsSL https://primethink.ai/cli/install.sh | bash
# Windows PowerShell
irm https://primethink.ai/cli/install.ps1 | iex
# Alternatives
pip install primethink-cli                                 # Python 3.8+
brew tap primethink-ai/tap && brew install primethink-cli
```

Verify: `pt version` · `pt --help` (also per-group/command: `pt chat --help`, `pt task create --help`)

Teach AI coding agents the CLI: `pt install-skill` (global, `~/.claude/skills`) or `pt install-skill --project` (repo's `./.claude/skills`).

### Authenticate & profiles

Token from **Settings → API Keys** in the app. Multiple named profiles supported.

```bash
pt profile add --token YOUR_API_TOKEN                          # profile 'default'
pt profile add --token DEV_TOKEN --profile dev --api-url https://dev-api.primethink.ai
pt profile list          # '*' marks the active profile
pt profile use dev       # switch active profile
pt profile remove old-profile
pt whoami                # authenticated user + groups (JSON)
pt whoami --profile production | jq '.user.email'
```

`--profile` works per-command on every API command (`chat`, `collection`, `agent`, `task`, `search`, `image`, `whoami`); `--api-url`/`-u` overrides the endpoint for a single request.

> `-p` gotcha: in `pt task`/`pt agent`/`pt search`/`pt image generate`/`pt whoami`, `-p` = `--profile`. In `pt chat`/`pt collection` file commands, `-p` = `--path`. Use the long form when in doubt.

### Config

File: `~/.primethink/config.json` (`chmod 600` it — contains tokens).

Env vars (all optional overrides):
- `PRIMETHINK_TOKEN` — API token (bypasses config; good for CI/containers)
- `PRIMETHINK_API_URL` — API base URL
- `PRIMETHINK_PROFILE` — profile when `--profile` not passed
- `PRIMETHINK_CONFIG_PATH` — custom config file path
- `PRIMETHINK_DEBUG` — `1`/`true` for request/response debug on stderr

Precedence (highest first): CLI flag → env var → config file → built-in default.

```bash
PRIMETHINK_TOKEN="$PROD_TOKEN" pt task actions            # one-off against prod
PRIMETHINK_DEBUG=1 pt chat send 123 --message "Hello"     # debug a failing request
```

If `command not found` after pip install: add `export PATH="$HOME/.local/bin:$PATH"` to shell rc, or use `pip install --user primethink-cli`.

### Task actions & messaging

```bash
pt task actions                                            # list available actions
pt task execute --action summarize --message "Summarize this" \
  --files report.pdf --files notes.md --return-original

# Chats: by numeric ID or @mention; --async to not wait for the response
pt chat send 123 --message "Hello from the CLI!"
pt chat send @my-assistant --message "What's up?" --files doc.pdf
pt chat send 123 --message "Process in background" --async

# Agents: --agent instead of a chat ID (mutually exclusive; no separate `pt agent send`)
pt chat send --agent 7 --message "Analyze this data" --files sales.csv
```

### Chat management

```bash
pt chat list --search onboarding --starred --workspace-id 7 --no-archived
pt chat create --name "Research" --goal-file ./goal.md --virtual-assistant-id 7 --member 12
# other create opts: --workspace-id, --parent-chat-id, --type standard|direct_users, --public/--no-public

# Messages: cursor-based pagination on message IDs, not page numbers
pt chat messages 123                                       # latest 25
pt chat messages 123 --size 50 --before-message-id 900     # page back through history
pt chat messages 123 --anchor-message-id 456               # ~25 newer + ~25 older around one message

pt chat rename 123 "Q3 planning (final)"
pt chat goal 123 --goal-file ./goal.md
pt chat archive 123    # reversible (pt chat unarchive 123)
pt chat delete 123 --yes                                   # irreversible; prompts without --yes
```

### Chat & collection files

Chats and collections have file workspaces organized into directories; `pt collection` file commands mirror `pt chat`.

```bash
pt chat list-files 123 --path /reports        # JSON: documents (with ids) + dirs
pt chat upload-files 123 report.pdf data.csv --path /meeting-notes
pt chat download-file 123 456 --output ./report.pdf       # 456 = document id from list-files

# One-way sync
pt chat sync-to 123 ./reports --pattern '*.pdf' --recursive --path /archive
pt chat sync-from 123 ./chat-backup --path /reports

# Two-way sync: downloads chat-only files, uploads local-only files, skips both-sides files
pt chat sync 123 ./workspace --dry-run
pt chat sync 123 ./workspace --prefer remote               # or --prefer local: pick a winner for both-sides files

# Collections
pt collection list --search contracts --page-size 50
pt collection upload-files 42 handbook.pdf --path /policies
pt collection download-file 42 789 --output handbook.pdf
pt collection sync-to 42 ./kb --pattern '*.md' --recursive
pt collection sync-from 42 ./kb-backup
```

Sync behaviour: individual file failures don't stop the run (`Sync complete: 14 uploaded, 1 failed`); two-way `sync` aborts with exit 1 before transferring anything if the remote file tree can't be fully listed; filename-sanitization collisions keep the first file and print a warning about the rest.

### Semantic search

```bash
pt search chat 123 "what did we decide about the deadline"       # toggles: --in-chat/--in-documents/--in-collections
pt search collection 42 "termination clause" --metadata '{"document_name": "contract.pdf"}'
pt search documents "refund policy" --collection-name kb         # vector store name, NOT numeric collection ID
pt search messages "standup notes" --collection-name msgs --chat-id 5 --user-id 2
```

Shared tuning: `--search-type mmr|similarity|similarity_score_threshold` (default `mmr`), `--top-k`, `--score-threshold`.

### Agent management

```bash
pt agent list --search support --status archived
pt agent get 7
pt agent types                        # find type IDs for create
pt agent create --name "Support bot" --public-description "Answers support questions" --type-id 1 \
  --description-file ./instructions.md --model gpt-test --access-type group
pt agent update 7 --model gpt-test-2  # PATCH semantics: only passed fields change
pt agent delete 7 --yes
```

Create/update extras: `--access-type private|group|task|system|catalog` (default private), `--tag-ids 3,4`, `--extra '{"key":"value"}'`, `--help-text`, `--help-url`.

### Task management

```bash
pt task create --name "Weekly digest" --description "Summarize the week" --type private   # name/description/type required
pt task create --name "Morning briefing" --description "Daily news" --type private \
  --goal-file ./goal.md --virtual-assistant-id 7 \
  --schedule-nl "every weekday at 8am" --schedule-prompt "Prepare the morning briefing"
pt task get 99
pt task update 99 --schedule-nl "every Friday at 17:00"   # PATCH semantics
pt task duplicate 99                                      # prints new task JSON incl. id
pt task publish 99    # public↔private toggle (pt task unpublish 99); other types via `pt task update 99 --type group`
pt task delete 99 --yes
pt task create-version 99 --version-name "v2"             # snapshot; default name "Production"
pt task upload-image 99 ./cover.png
```

Options: `--goal`/`--goal-file`, `--canvas`/`--canvas-file` with `--page-type html`, `--extra '{...}'`, feature toggles like `--global-memory/--no-global-memory`, `--chat-history`, `--docs-enabled`, `--scheduled-jobs`. `--schedule-nl` accepts plain English or a cron expression; NL schedules are LLM-interpreted server-side (those calls use a 120s timeout).

### Task export/import (reproducible deployments)

`export` writes portable config JSON (only fields `pt task create` accepts; server-assigned fields — id, group, owner, timestamps, documents, tags — stripped). `import` always creates a **new** task; use `pt task update` to change an existing one.

```bash
pt task export 42 --output tasks/support_bot.json         # or: pt task export 42 > file.json
git add tasks/support_bot.json && git commit -m "Support bot task config"
pt task import tasks/support_bot.json --profile production
```

Edit environment-specific IDs in the file (`virtual_assistant_id`, `extra_vas`, `default_evaluator_agent_id`) if they differ in the target. A raw `pt task get` dump also imports cleanly (non-portable fields ignored). Required in file: `name`, `description`, `type`; missing `goal` defaults to empty.

### Image generation

```bash
pt image generate --prompt "A lighthouse at dawn, watercolor" --output lighthouse.png
pt image generate --prompt "Minimal flat team logo" --style illustration --size 512x512 -o logo.png
```

### Scripting

Commands print JSON to stdout and exit non-zero on failure.

```bash
pt chat list-files 123 | jq '.documents[] | {id, filename}'
for file in documents/*.pdf; do
  pt task execute --action extract_key_points --message "Extract key points" --files "$file"
done
```

Troubleshooting: "No active profile" → `pt profile add --token ...`; auth failures → regenerate token in Settings; slow responses → `--async` for chats; `--schedule-nl` and `pt image generate` involve server-side AI and can take up to 2 minutes.

## Email Integration

Interact with Tasks and Chats via email. Enable in the task/chat settings — the address is shown there.

Address formats:
```
{group-name}-{task-uuid}@tasks.primethink.ai   # email-to-task
{group-name}-{chat-uuid}@chats.primethink.ai   # email-to-chat
```

**Email-to-Task**: your email (with attachments) is processed by the task's configured action; the response arrives in your inbox.
**Email-to-Chat**: your email becomes a chat message; the AI reply is threaded in the same email conversation.

Requirements (both): email integration enabled on the task/chat, sender address linked to your PrimeThink account, and your account in the group that owns the task/chat.

Troubleshooting: not processed → verify sender address, integration enabled, group membership. No response → check spam, confirm task/chat not archived and agent configured. Attachments failing → check file type/size limits and that document processing capabilities are enabled.

## In-Platform JavaScript API

For the `pt.*` API inside Live Apps and Live Pages, see the Data Management API and the Live Pages section.
