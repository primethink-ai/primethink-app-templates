# Internal Capabilities

**Internal capabilities** (`type: "internal"`) are the built-in tools that ship with the platform — memory, web search, the canvas, document search, sub-chats, tasks, and more. Unlike [API](API-Capabilities.md), [MCP](MCP-Capabilities.md), [Computer Use](Computer-Use-Capabilities.md), and [Sandbox](Sandbox-Capabilities.md) capabilities (which are built from an options blob), an internal capability is selected by its **code** and resolved through a central tool registry. There's no options JSON to fill in — you just attach the capability to an agent.

This page is the catalog: which internal capabilities exist, what tools each one provides, and when each is active. For the broader picture of how capabilities fit together, see [Capabilities](Capabilities.md).

## How they work

- Each internal capability has a **code** (e.g. `base`, `web_search`, `tasks`). A single capability row's code may even be a comma-separated list, activating several tool groups at once.
- When a chat starts, the platform collects the active codes from the agent's linked internal capabilities and resolves them into the de-duplicated set of tools registered under those codes.
- **Tool names are de-duplicated across all sources** — if two capabilities provide a tool with the same name, the first one wins.

!!! note "For developers"
    Internal tools are registered in code (and can be contributed by external plugins via Python entry-points). See [Tool Plugins](Tool-Plugins.md) for how to register your own tools under a capability code.

## Example agent recipes

Internal capabilities are most useful in combination. A few realistic mixes — attach these codes together on an agent to get the described behavior:

| Agent | Capabilities to enable | What it can do |
|-------|------------------------|----------------|
| **Research / briefing** | `base`, `web_search`, `rag`, `documents`, `memory` | Search the web, search uploaded documents and past chats, save findings as documents, and remember preferences across sessions. |
| **Customer support** | `base`, `rag`, `documents`, `chat_db_edit`, `memo`, `tasks` | Answer from a knowledge base, track structured tickets in the chat DB, keep session notes, and hand off work via tasks. |
| **Data ops** | `base`, `sandbox`, `documents`, `generic_api_requests` | Fetch data over HTTP, crunch and convert files in an ephemeral shell, and save the results as documents. |
| **Live App builder** | `base`, `canvas_toolkit`, `documents` | Build and iteratively edit an interactive HTML/React page on the canvas. (Canvas tools only activate on a Live Page.) |
| **Media analyst** | `base`, `video_analysis`, `video_transcription`, `audio_diarization` | Summarize and transcribe video, pull keyframes, and produce speaker-labelled transcripts. |

`base` is the sensible default on almost every agent — it carries notifications, URL reading, image/voice generation, and agent-to-agent calls.

## Context-gated behavior

Some internal capabilities are conditionally enabled — or remapped — based on the chat context. This is why a capability attached to an agent may not always produce a tool:

| Capability | Condition |
|------------|-----------|
| `base_dev` | Auto-added alongside `base` only in **development** environments. |
| `canvas_toolkit` | Dropped unless the chat's page type is `html` or `react` (i.e. a Live Page). |
| `subchats` | Remapped to `subchats_parent` (top-level chat) or `subchats_child` (chat with a parent) based on the chat hierarchy. |
| `rag` | Adds `rag_documents` only when the chat has documents & collections enabled. |
| `scheduled_prompts` | Dropped unless the chat has scheduled tasks enabled (`scheduled_jobs_enabled`). |
| `memory` | Built per-request; skipped on temporary chats or when global memory is off. |
| `web_search_google_serper` | Built per-request; requires `SERPER_API_KEY` in settings (otherwise a warning is logged and no tool is added). |
| `generic_api_requests` | Built per-request (a fresh instance each call). |

## Capability reference

### `base` — Base Tools

Core tools available to all agents (notifications, generation, agent-to-agent communication).

| Tool | Description |
|------|-------------|
| `set_chat_title_name` | Rename/retitle the chat; auto-derives a title from history if none given. |
| `notify_user` | Updates the "thinking" status message to tell the user what's happening. |
| `send_push_notification_to_user` | Creates a notification for a user and pushes it (optionally with an email body). |
| [`read_content_of_url`](Read-Content-of-URL.md) | Fetches a URL — reads web-page content as text, returns text/data files as-is, or saves downloadable files into the chat. |
| `hide_message_tool` | Hides an agent message that needs no response or is directed to someone else. |
| `query_agent` | Calls another agent in the chat; returns its reply marked as "Response from the [name] Agent". |
| `call_chat` | Calls a specific chat on another agent via the chat's mention name. |
| `execute_task` | Executes a named task on another agent in the chat. |
| `available_mentions` | Lists mentionable entities (users, agents, chats, tasks) available to the user, permission-filtered. |
| `generate_image` | Generates images from text with style/size/reference-image options. |
| `generate_voice` | Text-to-speech; supports single-speaker narration and multi-speaker dialogue. |

### `base_dev` — Base Dev Tools (development only)

| Tool | Description |
|------|-------------|
| `wait_seconds` | Waits for a specified timeout before the next action (testing/debugging). |

### `canvas_toolkit` — Canvas (Live Pages only)

Interactive canvas for collaboratively creating/editing documents. Only active on `html`/`react` pages.

| Tool | Description |
|------|-------------|
| `set_html_canvas_safe` | Replaces canvas HTML with safety checks, payload validation, and auto-escaping. |
| `set_canvas_chunked` | Updates canvas HTML in chunks to avoid truncation with large content. |
| `edit_html_canvas_enhanced` | Edits parts of canvas HTML (replace, insert, delete, append, replace_script, upsert_script). |
| `get_canvas_diagnostics` | Returns diagnostics about current canvas content (size metrics, validation). |
| `get_canvas_content` | Retrieves canvas HTML with optional filtering (line/char range, CSS selector). |

### `chat_db_edit` — Chat DB (Edit)

Read/write access to the chat database for structured entities.

| Tool | Description |
|------|-------------|
| `chatdb_init` | Initializes the chat DB (schema/tables) for storing structured entities. |
| `chatdb_list` | Lists/searches entities with filtering operators and pagination. |
| `chatdb_get` | Retrieves a single entity by ID. |
| `chatdb_add` | Creates one or more entities (single or batch). |
| `chatdb_edit` | Updates one or more entities (merge + optimistic locking). |
| `chatdb_delete` | Deletes one or more entities. |

### `chat_db_read_only` — Chat DB (Read Only)

Query-only access to the chat database.

| Tool | Description |
|------|-------------|
| `chatdb_list` | Lists/searches entities (read-only). |
| `chatdb_get` | Retrieves a single entity by ID (read-only). |

### `web_search` — Web Search (unified)

| Tool | Description |
|------|-------------|
| `web_search` | Searches the web via the configured provider (Auto, Tavily, Perplexity, Serper, or Internal). |

### `web_search_perplexity` — Web Search (Perplexity)

| Tool | Description |
|------|-------------|
| `perplexity_web_search` | Perplexity search with workflows for news, entity research, and general inquiries; supports location-based search and authority filtering. |

### `web_search_gemini_deep_research` — Web Search (Gemini Deep Research)

| Tool | Description |
|------|-------------|
| `gemini_deep_research` | Runs a background Gemini research job, polls to completion, returns the final report + metadata. |

### `subchats_parent` — Subchats (Parent)

Active when the chat is top-level.

| Tool | Description |
|------|-------------|
| `create_subchats` | Creates subchats in the current chat with optional initial prompts and goals. |

### `subchats_child` — Subchats (Child)

Active when the chat has a parent.

| Tool | Description |
|------|-------------|
| `report_information_to_parent_chat` | Sends text to the parent chat, optionally analyzing it with the LLM. |

### `memo` — Memo

| Tool | Description |
|------|-------------|
| `chat_memo` | Sets or appends to the chat memo (info scoped to the chat/session only). |

### `goal` — Goal

| Tool | Description |
|------|-------------|
| `set_chat_goal` | Replaces the chat goal text when the user explicitly asks to set/change it. |

### `rag_messages` — RAG Messages

| Tool | Description |
|------|-------------|
| `rag_search_messages` | Semantic search over chat message history. |

### `rag_documents` — RAG Documents

Added by the `rag` capability when documents are enabled.

| Tool | Description |
|------|-------------|
| `rag_search_documents_and_collections` | Semantic search across documents and collections. |

### `documents` — Documents

| Tool | Description |
|------|-------------|
| `list_collection_documents` | Lists documents in a collection (with custom-name metadata). |
| `list_directories_and_documents` | Lists directories and documents at a path in the chat's document tree. |
| `wait_until_document_text_extraction_is_finished` | Waits until a document is "Ready" or until timeout. |
| `get_document_text` | Retrieves the full text (or a portion) of a document by ID. |
| `save_document` | Saves content as a document (TXT, DOCX, MD, HTML, PDF, CSV, XLSX, CUSTOM). |
| `document_status` | Returns a document's processing/availability status. |

### `settings` — Settings

| Tool | Description |
|------|-------------|
| `edit_user_setting` | Creates/updates a user setting (name + value) scoped to the user's current group. |

### `tasks` — Tasks

| Tool | Description |
|------|-------------|
| `get_capabilities` | Gets the list of capabilities for the default virtual assistant. |
| `create_task` | Creates a task with scheduling, memory, search, and customization options. |

### `scheduled_prompts` — Scheduled Prompts

Requires scheduled tasks to be enabled on the chat (the chat's `scheduled_jobs_enabled` flag).

| Tool | Description |
|------|-------------|
| `add_scheduled_job` | Adds a scheduled job that runs a given prompt on a schedule. |

!!! note
    The underlying toolkit also defines tools to list, update, and delete scheduled jobs, but only `add_scheduled_job` is registered under this capability.

### `video_analysis` — Video Analysis

| Tool | Description |
|------|-------------|
| `analyze_video_tool` | Analyzes video to summarize, extract info, and identify key points/timelines. |
| `extract_video_keyframes` | Extracts scene-change keyframes and saves each as an image document. |

### `video_transcription` — Video Transcription

| Tool | Description |
|------|-------------|
| `transcribe_video_tool` | Verbatim transcript from a video's audio track (or an audio file), no summarization. |

### `audio_diarization` — Audio Diarization

| Tool | Description |
|------|-------------|
| `diarize_audio_tool` | Transcribes audio with speaker diarization; returns `[MM:SS]` timestamps + Speaker labels. |

### `sandbox` — Sandbox (internal toolkit)

An ephemeral per-turn Daytona shell for code/skill execution.

| Tool | Description |
|------|-------------|
| `sandbox_exec` | Runs a shell command in an ephemeral per-turn sandbox; state is reused across calls within the same turn. |

!!! info "Not the same as a `type: "sandbox"` capability"
    This internal `sandbox` capability provides the general-purpose `sandbox_exec` tool — see [Sandbox Execution](Sandbox-Execution.md). It's distinct from a [Sandbox capability](Sandbox-Capabilities.md) (`type: "sandbox"`), which packages a whole automation behind a nested loop.

### `computer_use` — Computer Use (internal toolkit)

Direct desktop control where the agent's own model does the looking and clicking.

| Tool | Description |
|------|-------------|
| `computer_use` | Performs one mouse/keyboard action (click, type, scroll, etc.) on a per-turn desktop sandbox. |
| `computer_screenshot` | Captures the desktop screen, with optional region zoom for small text. |

!!! info "Not the same as a `type: "computer_use"` capability"
    This internal `computer_use` capability exposes low-level actions the agent's own model drives directly. It's distinct from a [Computer Use capability](Computer-Use-Capabilities.md) (`type: "computer_use"`), which runs a nested Claude loop behind a single named tool.

## Special-cased capabilities (built per-request)

These can't be pre-registered because they need per-user or per-request state, so the platform builds them at runtime:

### `memory` — Memory

Skipped on temporary chats and when global memory is off. Scoped to the user and group (and per-agent for constitution memories).

| Tool | Description |
|------|-------------|
| `search_memory` | Semantic vector lookup of saved memories; returns id, type, priority, timestamp, text. |
| `update_memory` | Adds, updates, or deletes a memory (action + text + memory_type + priority and/or memory_id). |

### `web_search_google_serper` — Web Search (Google Serper)

| Tool | Description |
|------|-------------|
| `google_serper_results_json` | Google search results. Requires `SERPER_API_KEY` in user/group settings; if missing, the tool is omitted and a warning is logged. |

### `generic_api_requests` — Generic API Requests

| Tool | Description |
|------|-------------|
| `requests_get` | Performs HTTP GET requests and returns the response. Instantiated fresh per request (not registry-cached). |

## Codes handled elsewhere

A few capability codes exist but don't map to discrete tools on this page — they're handled by other subsystems (the agent prompt, plugins, or platform features) rather than the tool registry:

- `multimodality`
- `process_documents`
- `obviously_manage`
- `web_search_internal`

## Quick reference: code → tools

| Code | Display name | Tools |
|------|--------------|-------|
| `base` | Base Tools | 11 tools (title, notify, push, read URL, hide, query/call/execute, mentions, image, voice) |
| `base_dev` | Base Dev Tools | `wait_seconds` |
| `canvas_toolkit` | Canvas | 5 canvas tools |
| `chat_db_edit` | Chat DB (Edit) | 6 chatdb tools |
| `chat_db_read_only` | Chat DB (Read Only) | `chatdb_list`, `chatdb_get` |
| `web_search` | Web Search | `web_search` |
| `web_search_perplexity` | Web Search (Perplexity) | `perplexity_web_search` |
| `web_search_gemini_deep_research` | Web Search (Gemini Deep Research) | `gemini_deep_research` |
| `web_search_google_serper` | Web Search (Serper) | `google_serper_results_json` (special) |
| `subchats_parent` / `subchats_child` | Subchats | `create_subchats` / `report_information_to_parent_chat` |
| `memo` | Memo | `chat_memo` |
| `goal` | Goal | `set_chat_goal` |
| `rag_messages` | RAG Messages | `rag_search_messages` |
| `rag_documents` | RAG Documents | `rag_search_documents_and_collections` |
| `documents` | Documents | 6 document tools |
| `settings` | Settings | `edit_user_setting` |
| `tasks` | Tasks | `get_capabilities`, `create_task` |
| `scheduled_prompts` | Scheduled Prompts | `add_scheduled_job` |
| `video_analysis` | Video Analysis | `analyze_video_tool`, `extract_video_keyframes` |
| `video_transcription` | Video Transcription | `transcribe_video_tool` |
| `audio_diarization` | Audio Diarization | `diarize_audio_tool` |
| `sandbox` | Sandbox | `sandbox_exec` |
| `computer_use` | Computer Use | `computer_use`, `computer_screenshot` |
| `memory` | Memory | `search_memory`, `update_memory` (special) |
| `generic_api_requests` | Generic API Requests | `requests_get` (special) |

## Related Topics

- [Capabilities](Capabilities.md) — what capabilities are and how they're used
- [Tool Plugins](Tool-Plugins.md) — for developers registering custom internal tools
- [Sandbox Execution](Sandbox-Execution.md) — the `sandbox_exec` general-purpose tool
- [Working with AI Agents](/Working-with-AI-Agents/) — assigning capabilities to an agent
