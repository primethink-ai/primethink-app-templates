# Core Features

Documents, collections, groups, workspaces, collaboration, notifications, and settings.

## Documents in Chats

Uploadable content: document files (PDF, Word, Excel, PowerPoint, etc.), plain text (pasted), URLs (auto-scraped), audio/video (auto-transcribed). All content is extracted to **Markdown** asynchronously (structure, tables, formatting, OCR/vision text, transcriptions preserved) and indexed for AI assistants.

### Processing Status

Pipeline: `Added` → `Loaded` → `Processed` → `Ready` (or `Error`).

| Status | Meaning |
|--------|---------|
| `Added` | Uploaded; text extraction not yet complete |
| `Loaded` | Text extracted |
| `Processed` | Text chunked |
| `Ready` | Fully indexed, available for use |
| `Error` | Processing failed |

**Key rule:** any status other than `"Added"` or `"Error"` means extraction is complete and text is retrievable. In live apps, poll with `pt.getDocumentStatus(docId)` and wait for status to leave `"Added"` before reading text.

### Access Status (how assistants use a document)

| Status | Behavior | Approach | Best for | Precision / context cost |
|--------|----------|----------|----------|--------------------------|
| `Archived` | Listed in context only; assistant must explicitly use a tool to read it | Agentic retrieval | Specific document lookup | High precision, efficient |
| `Search` | System auto-searches document per user query, injects relevant chunks | RAG | Large reference docs; no size limit | Medium-high, efficient |
| `Context` | Entire document text placed in context (if it fits) | CAG | Small, highly relevant docs; whole-document analysis | Limited by context window; can be inefficient |

Mix statuses freely across documents in one chat. In task configurations, documents can also be flagged `hidden` (visible to the assistant, not to users) while still having an access status.

RAG (Search): documents are chunked, embedded, stored in a vector DB; queries are embedded and matched by semantic similarity; top chunks are added to context. CAG (Context): whole document in context — limited by context window size.

## Supported Formats

- **Documents:** `.pdf` (OCR for scans), `.doc/.docx`, `.txt`, `.md`, `.html/.htm`
- **Spreadsheets:** `.xls/.xlsx`, `.csv`
- **Presentations:** `.ppt/.pptx`
- **Data:** `.json`, `.xml`
- **Images:** `.jpg/.jpeg`, `.png`, `.gif`, `.bmp`, `.webp` (AI vision extracts text + descriptions)
- **Audio/Video:** `.mp3`, `.m4a`, `.wav`, `.mp4` (auto-transcribed)
- **Email:** `.eml` (headers, body, attachment list extracted)
- **Archives:** `.zip` (auto-extracted, each file processed individually)
- **Web:** URLs (scraped), YouTube links (metadata + transcript)

**Max file size: 50 MB.** ZIPs also limited on uncompressed size/file count.

## Document Actions

Run AI tasks on documents from the document three-dot menu → Actions. Configure: Group, destination (new/existing chat), action, optional extra prompt → Run.

- **Share** — always available; copies the document into a new/existing chat.
- **Custom actions** — any Task configured as a document action (e.g. summarize, translate, extract-key-points).
- **Mobile Share Actions** — on iOS/Android, share a file from any app → PrimeThink → same Actions popup (no manual upload needed).

### Turning a Task into a Document Action

In the task's **Action** section:

| Setting | Description |
|---------|-------------|
| Action Name | Name shown in Actions menu. **No spaces** — use hyphens/underscores (`extract-key-points`) |
| Mime Type | Comma-separated filter (e.g. `application/pdf,text/plain`); empty = all documents |
| Share Action | Enable to expose the action in the mobile (iOS/Android) OS Share menu |

Common mime types: PDF `application/pdf`, DOCX `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, DOC `application/msword`, TXT `text/plain`, MD `text/markdown`, XLSX `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, CSV `text/csv`, images `image/jpeg,image/png,image/gif`.

Group admins can create group-wide actions.

## Collections

Containers of documents; attachable to chats. `public: true` = group-wide (admin-created); private = creator only. When attached to a chat, all contained documents become available per their access statuses.

### Properties

| Field | Type | Notes |
|-------|------|-------|
| `id`, `uuid` | number, string | Identifiers |
| `name`, `description` | string | |
| `type` | string | e.g. `"collection"` |
| `public` | boolean | Group-visible |
| `indexed` | boolean | Vectorized for semantic search (default `false`) |
| `extra` | object\|null | Arbitrary custom JSON metadata |
| `external_source_type/value` | string\|null | External source integration |
| `tags`, `status`, `created_at`, `last_updated_at` | | |

### Indexing

- `indexed: false` (default): stored but not searchable. `POST /collections/{id}/search` and `/search/images` return `{ "indexed": false, "results": [] }`; excluded from chat-level RAG; reindex requests → 409.
- `indexed: true`: documents vectorized, searchable via RAG. Flipping `false` → `true` triggers full reindex.

### REST API

```bash
# Create
curl -X POST "https://api.primethink.ai/collections?name=My%20Collection&indexed=true" \
  -H "Authorization: Token YOUR_API_KEY" -H "Content-Type: application/json" \
  -d '{"extra": {"source": "manual", "category": "reports"}}'
# Query params: name (required), description, type (default "collection"),
#               public (default false), indexed (default false). Body: {extra}

# Update
curl -X PATCH "https://api.primethink.ai/collections/10" \
  -H "Authorization: Token YOUR_API_KEY" -H "Content-Type: application/json" \
  -d '{"indexed": true, "extra": {"category": "updated-category"}}'

# Search (indexed collections only)
curl -X POST "https://api.primethink.ai/collections/10/search?query=machine%20learning" \
  -H "Authorization: Token YOUR_API_KEY"
# → { "indexed": true, "results": [{ "text": "...", "metadata": {"source": "paper.pdf", "page": 3} }] }
```

### Live App API (pt.js)

```javascript
const collections = await pt.listCollections();
const searchable = collections.filter(c => c.indexed);
collections.forEach(c => c.extra && console.log(c.name, c.extra.source));

// Semantic search across chat collections (indexed only)
const results = await pt.searchDocuments('machine learning', 'collections');

// Image search in one collection
const images = await pt.searchImagesInCollection({ collectionId: 10, query: 'product photos', topK: 5 });

// Documents by collection IDs — returns map keyed by ID string
const docs = await pt.getDocumentsInCollections([10, 15]);
const col10Docs = docs['10'];
```

## File Storage Hierarchy

Three storage locations with distinct access control:

| Location | ltree path | Auth | Group | Chat | Public |
|----------|-----------|------|-------|------|--------|
| `@public/file` | `root.public` | ❌ | ❌ | ❌ | ✅ |
| `@liveapp/file` | `root.liveapps` | ✅ | ✅ | ❌ | ❌ |
| Chat root (`file` or `folder/file`) | `root` / `root.<folder>` | ✅ | ✅ | ✅ | ❌ |

**Lookup order for a bare filename** (no `/`, no prefix): `@public` → `@liveapp` (auth checked) → chat root (chat membership checked). A path containing `/` skips the special folders and goes straight to chat root. Explicit prefixes (`@public/x`, `@liveapp/x`, leading slash optional) go directly to that location.

- `@public`/`@liveapp` are prefixes, not real folders; files there display with leading `/` (e.g. `/file.pdf`).
- File paths are **case-sensitive**.
- Errors: 404 not found; 401 no auth for non-public; 403 not in chat.
- Never store sensitive data in `@public`. Use `@liveapp` for group-wide assets (templates, live app resources); chat root for confidential/chat-specific files.

## Groups

A group = self-contained workspace: members + roles, chats, documents/collections, settings, configured AI assistants. Resources are isolated between groups. Role-based access control (assigned by Group Admins) governs LLM invocation, direct tool calls, etc. — see Roles and Permissions.

- One account can belong to multiple groups; the group selector lists added groups with unread badges and supports pinning.
- **Add an existing group** (e.g. one you were invited to): group selector → Add groups → enter the email/password of the account that has access → select the groups to add.
- **Create a group:** group selector → Add groups → Create group → pick the account + group name. The creating account becomes the first member; then invite members and assign roles.
- Users can also join a group via its **Group Code** (see App Settings).

## Collaboration

Three mechanisms: **Direct Messages** (private 1:1/small-group user chats), **Group Conversations** (multi-user chats with users + VAs), **Shared Workspaces** (containers for chats/documents/collections/settings).

### Group Conversations

- `@mention` members or VAs; `@here` / `@all` notify all chat members.
- AI Memory is disabled by default in multi-user chats (privacy).
- When a member leaves, their private VAs are removed too.
- Permissions are dictated by the containing workspace type.

### Workspace `share_type`

| Type | Owner | Members |
|------|-------|---------|
| `Not Shared` (default) | Full control | — (no members) |
| `View Only` | Full control (edit name/prompt, docs, collections, members, chats, messages, delete) | View only; no actions; can leave |
| `Owner Only` | Full control | Send messages/mention in chats; can leave; cannot manage workspace structure |
| `Shared` | — dissolved | Everyone equal: manage everything, remove any member, delete workspace, leave |

**Sharing state machine:**
1. New workspaces start `Not Shared`.
2. Adding the first member → auto-changes to `Owner Only`.
3. Removing all members (except owner) → auto-reverts to `Not Shared`.
4. Owner can change `Owner Only` → `Shared`: **IRREVERSIBLE**, no confirmation prompt.
5. Owner cannot leave a `Not Shared` or `Owner Only` workspace (delete or share first).

### Chat Share Types

Same values as workspaces: `Not Shared`, `View Only`, `Owner Only`, `Shared`. **A chat inside a workspace cannot change its own share type** — it inherits from the workspace; change the workspace's share_type instead.

Chat permission notes:
- Chat owner cannot leave but can delete the chat for everyone.
- In a non-shared workspace chat: members can move it to their own workspace, upload/edit files, manage collections, invite/remove members, schedule tasks, leave.
- In an `Owner Only`-workspace chat: only the owner can change the chat's workspace; members can only send messages/mention, and leaving the workspace removes them from all its chats.
- In a `Shared`-workspace chat: members cannot remove a user who belongs to the underlying workspace (removal must happen at workspace level); the chat's workspace is fixed.

Shared workspaces also carry a **shared memory** (project rules/knowledge reused by every member's assistant across the workspace's chats); write access follows the share type (everyone in `Shared`, creator only otherwise).

## Notifications

Delivery: push (FCM, immediate), WebSocket real-time updates (badges/lists), and delayed email digest (~5 min after, only for still-unread notifications).

### Settings (global, in user profile)

- **Push:** `On` (default) | `Mentions Only` | `Off`
- **Email (notifications):** `On` (default) | `Mentions Only` | `Off`
- **Email (unread messages):** `On` (default) | `Direct Messages Only` | `Off`

### Per-chat overrides (chat settings menu)

Each of the above plus a `Default` value (= use global). Unread-messages chat email: `Default` | `On` | `Off`.

### From Live Apps

```javascript
// Single user
await pt.sendNotification(userId, 'Task Assigned', 'You have a new task', {
  emailBody: 'Click here to view the task: https://example.com/tasks/123'
});

// All chat members
await pt.sendNotificationToUsers('System Update', 'Maintenance scheduled', {
  emailBody: 'The system will be down for maintenance on Sunday from 2-4 AM.'
});
```

`emailBody` is optional extended content used in the email digest.

## App Settings

Three tabs: **User**, **User Variables**, **Group Variables**.

### User tab
- Profile: first/last name, email, username, profile image, change password.
- Message preferences: "Always translate speech to English", "Send the speech immediately".
- **Speech-to-Text Mode:** `Press to start / Press again to send` (tap toggle), `Push, Speak, Release to send` (push-to-talk), `Freehands` (VAD auto-send, hands-free), `Realtime (ElevenLabs)` (live streaming transcription, ElevenLabs Scribe v2).
- UI: "Use bubbles in chat", Default Virtual Assistant, Theme (`Light` | `Dark` | `System`).

### Group settings
Group Code (join code, auto-generated, customizable), Public Group Name, Group Image.

### Variables
- **User Variables** — per-user key/value pairs.
- **Group Variables** — group-wide, admin-managed.
- Capabilities and tool plugins read these at runtime via `${SETTING_NAME}` placeholders (see Extra Settings Reference).

### Advanced
App version display, Logout, "Logout from all groups".

## UI Settings

Variables prefixed `UI_` (user- or group-level; merged, group typically takes precedence) that control what UI elements are **visible** — not what users can do. Visible to all group members. Loaded at app start (dedicated endpoint for public chats).

| Setting | Type | Values | Default |
|---------|------|--------|---------|
| `UI_MARKDOWN_SUPPORT` | Boolean | `0` / `1` | `1` |
| `UI_SEND_MESSAGE_TERMS_TEXT` | String | Text (HTML/links OK) shown under send box | Empty (hidden) |

```json
{
  "UI_SEND_MESSAGE_TERMS_TEXT": "By sending messages to this bot you agree to our Terms and Conditions (link)",
  "UI_MARKDOWN_SUPPORT": "0"
}
```

**Not a security mechanism** — UI Settings only hide client-side elements; APIs remain accessible. Enforce real restrictions with the permissions system and backend validation.
