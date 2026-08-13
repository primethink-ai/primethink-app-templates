# Getting Started

## What is PrimeThink?

LLM-powered platform that works like an operating system with natural language as its primary interface. Combines team chat with AI assistants ("mini-brains" — specialized, privacy-scoped virtual assistants that can collaborate and share information when appropriate). Runs on web and mobile.

Core concepts:
- **Chats** — every chat has a default AI assistant that replies to messages; supports multi-user chats (humans + assistants, @mentions), sub-chats (nested, inherit parent properties, accessible via the Subchats tab), and temp chats
- **Workspaces** — group related chats; share documents and members at workspace level; workspace-specific preferences/instructions; drag and drop chats between workspaces
- **Collections** — reusable sets of documents, shareable across chats/workspaces, private or public within a group
- **Tasks** — pre-defined AI workflows (goals, prompts, capabilities); import from Task Library or create custom; can be scheduled
- **Memory** — two-tier (general knowledge + per-user personal info) with semantic search
- **Groups/Organizations** — isolated collaborative spaces, each with separate resources, participants, and conversations
- **Virtual Assistants** — customizable per capability, personality, and information access; restrictable to specific tools/data; @mention a specific assistant in a chat
- **Dynamic UI generation** — describe a page/form in natural language and the system generates it

Common use cases: document analysis, project management, content creation, knowledge management, automated workflows (data collection, reporting, customer support), meeting transcription/action tracking, personalized learning, research support, multi-user quiz/game sessions.

## Access

| Channel | Details |
|---------|---------|
| Web app | https://app.primethink.ai — Chrome, Firefox, Safari, Edge (latest) |
| iOS / iPadOS app | App Store: https://apps.apple.com/us/app/primethink/id6744278915 (iOS/iPadOS 12.0+) |
| Android app | Google Play: https://play.google.com/store/apps/details?id=ai.primethink.app (Android 8.0+, phones and tablets) |
| Chrome extension | Chrome Web Store (`hadlipakfofndmkdohhomlpejpnofeid`) — URL-aware: PrimeThink knows the current browser URL; useful for research/content collection |

Login requires: group name, username, password. Optional device permissions: microphone (voice messages), location, camera.

## Quick Start Flow

1. Create account (username, password, profile, notification prefs, default assistant settings)
2. Create workspace: workspaces tab in top nav → "+" button → name it
3. Invite team: invite button in Group Switcher top actions → enter emails → set access levels/roles (see Roles and Permissions)
4. Start a chat: New Chat button in left sidebar

Workspace setup: configure preferences, set up document collections, configure virtual assistants, create chat categories.

## UI Layout

| Area | Contents |
|------|----------|
| Top Navigation Bar | Logo/default-assistant image, workspace tabs, Memory, Collections, Members, Notifications |
| Left Icon Bar (Organization Switcher) | Switch groups/orgs, location sharing toggle, text-to-speech settings, group access management |
| Left Sidebar | New Chat button, Tasks management, filters (chat type, favorites, assistant), chat list with real-time indicators |
| Main Chat Window | Message thread, rich content, file attachments, @mentions, message actions (play, copy, save as file/memory/document, delete, report) |
| Right Context Panel | Tabs: Info, Search Scope, Documents, Collections, Members, Scheduled Tasks, Subchats — adapts to current chat |

Chat types: **Standard** (one-to-one with assistants) and **Multi User** (group chat with humans + assistants).

Document input methods: file upload (PDF, Word, etc.), paste URL (auto-captures web content), audio recording (auto-transcribed). AI can search across chat documents and linked collections; control scope via the Search Scope tab.

Help channels: feedback button (report issues/suggest improvements), support chat within the group, or the organization's PrimeThink administrator.

## Keyboard Shortcuts

`⌘ /` (Mac) / `⌃ /` (Win/Linux) opens the shortcuts window. `⌥` = Alt/Option, `⌃` = Control, `⌘` = Command, `⇧` = Shift.

Core actions:

| Shortcut | Action |
|----------|--------|
| `⌥ ⌃ C` | New Chat |
| `⌥ ⌃ /` | New Temp Chat |
| `⌥ ⌃ W` | New Workspace |
| `⌥ ⌃ T` | New Task |

Navigation:

| Shortcut | Action |
|----------|--------|
| `⌥ [` / `⌥ ]` | Previous / Next Workspace |
| `⌥ ↑` / `⌥ ↓` | Previous / Next Chat |

Admin & settings (`⌥ ⇧` + key):

| Key | Opens | Key | Opens |
|-----|-------|-----|-------|
| `T` | Tasks | `C` | Collections |
| `L` | Live Apps | `S` | Settings |
| `M` | Memories | `N` | Notifications |
| `J` | Scheduled Tasks | `H` | Help |
| `F` | Feedback | | |

Toggles:

| Shortcut | Toggle |
|----------|--------|
| `⌥ L` | Location |
| `⌥ T` | Audio Replies |
| `⌥ B` | Sidebar |
| `⌥ A` | Archived Chats |
| `⌥ F` | Starred Chats |

Group switching: hold `⌘` (Mac) / `⌃` (Win/Linux) to show a numbered group overlay in the sidebar, then press `1`–`9` to switch to that group.
