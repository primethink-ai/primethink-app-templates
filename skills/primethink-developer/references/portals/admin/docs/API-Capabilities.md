# API Capabilities

An **API capability** (`type: "api"`) turns any HTTP(S) endpoint into a tool your agent can call. You describe the endpoint — its URL, method, and parameters — and PrimeThink builds a typed tool from it. When the model decides to use the tool, the platform makes the request and returns the response back to the model.

No code is required: an API capability is just a configuration blob. This is the simplest way to connect an agent to a third-party REST API or one of your own internal services.

For the bigger picture of how capabilities fit together, see [Capabilities](Capabilities.md).

## Options schema

The capability's behavior is defined entirely by its `options`:

```json
{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "method": "GET",
  "url": "https://api.weather.com/v1/current",
  "params": {
    "location": { "type": "string", "description": "City name", "required": true }
  },
  "headers": {
    "Authorization": "Bearer ${WEATHER_API_KEY}"
  },
  "body": {
    "query": { "type": "string", "description": "Search query", "required": true }
  }
}
```

### Field reference

| Key | Required | Default | Description |
|-----|----------|---------|-------------|
| `url` | Yes | — | Endpoint URL. **Must be HTTPS.** May contain `${SETTING}` placeholders and `{slot}` [call-time path params](#path-templating). Surrounding whitespace is stripped automatically. |
| `path_params` | No | — | Schema for the `{slot}` fields in `url`. Undeclared slots default to required strings. See [Path templating](#path-templating). |
| `name` | No\* | falls back to the capability name, slugified | The function name the model sees. Must be valid (letters, digits, underscores). |
| `description` | No | falls back to the capability description, then `"Call the {tool_name} API"` | Tells the model when to use the tool. |
| `method` | No | `GET` | HTTP method. Allowed: `GET`, `POST`, `PUT`, `PATCH`. (`DELETE` and others are rejected.) Case-insensitive. |
| `params` | No | — | Query-string parameters → field schema. Become tool arguments sent in the URL query string. |
| `body` | No | — | Flat JSON-body fields → field schema. Become tool arguments sent in the request body. Mutually exclusive with `body_template`. |
| `body_template` | No | — | Templated request body — nested JSON or a raw string, with `${SETTING}` / `{slot}` interpolation. Mutually exclusive with `body` and `files`. See [Request bodies](#request-bodies). |
| `body_params` | No | — | Schema for the `{slot}` fields in `body_template`. Undeclared slots default to required strings. |
| `files` | No | — | Multipart file fields; each argument is a chat `document_id`. Switches the request to `multipart/form-data`. See [File uploads](#file-uploads). |
| `headers` | No | — | Static HTTP headers. Values support `${SETTING}` placeholders. Not exposed as tool arguments. |

\* `name` must come from *somewhere*: either in `options` or from the capability's own name. If neither is set, the tool won't build.

### Field schema (for `params`, `body`, `path_params`, and `body_params`) { #field-schema-for-params-and-body }

Each entry under `params`, `body`, `path_params`, or `body_params` describes one argument the model can fill in:

```json
{
  "param_name": {
    "type": "string",
    "description": "What this parameter does",
    "required": true,
    "default": "optional default value"
  }
}
```

| Attribute | Values | Notes |
|-----------|--------|-------|
| `type` | `string`, `integer`, `number`, `boolean` | Unknown types default to `string`. |
| `description` | string | Shown to the model — describe the argument well. |
| `required` | bool (default `false`) | Required arguments have no default; optional ones are nullable. |
| `default` | any | Used for optional arguments when the model omits them. |

`files` fields use a different schema (`description`, `required`, `multiple`) — see [File uploads](#file-uploads).

!!! note "Every argument name belongs to exactly one section"
    A given name may be declared in only one of `path_params`, `params`, `body`, `body_params`, or `files`. Duplicates across sections are rejected at build time — rename so each maps unambiguously. (The one deliberate exception: a `{slot}` may be reused in both the `url` and the `body_template` — that's one argument filling two places. See [Naming rules](#naming-rules).)

### Name and description fallback

So you don't repeat yourself, when `name`/`description` are omitted from `options`:

- **name** → the capability's name, slugified into a valid function name. For example, a capability named *"Open-Meteo Weather"* becomes the tool `open_meteo_weather`.
- **description** → the capability's description; if that's also empty → `"Call the {tool_name} API"`.

Values in `options` always override these fallbacks.

## Two kinds of interpolation: `${SETTING}` vs `{slot}`

Strings in your `options` can carry two different kinds of placeholder. They look different, resolve at different times, and can coexist in a single string — for example `https://${TENANT_HOST}/v1/chats/{chat_id}`.

| Placeholder | Resolved | Source | Where |
|-------------|----------|--------|-------|
| `${SETTING_NAME}` | **Once, at build time** | Your user/group [settings](#settings-placeholders-setting_name) | `url`, `headers`, `body_template` |
| `{arg_name}` | **On every call** | A tool argument the model supplies | `url` ([path params](#path-templating)), `body_template` |

Use `${SETTING}` for values that are fixed for a given install — API keys, tenant hostnames, base URLs. Use `{slot}` for values the model chooses per call — a chat id, a message body, a search term you want inside the path or a JSON body.

### Build-time settings (`${SETTING_NAME}`) { #settings-placeholders-setting_name }

Never hard-code secrets like API keys or tokens. Any of the supported strings in `options` can contain `${SETTING_NAME}` placeholders, resolved at build time from your user/group settings.

- The name must be word characters (letters, digits, underscore): `\${WEATHER_API_KEY}`.
- Example: `"Authorization": "Bearer ${WEATHER_API_KEY}"`.
- Resolved in `url`, `headers`, and `body_template`.
- If a referenced setting is missing or empty, the tool fails to build and is skipped (logged). **Define the setting before enabling the capability.**

You configure settings on the Settings page (or via the admin API):

```
Setting name:  WEATHER_API_KEY
Setting value: sk-abc123...
```

The value is then available as `${WEATHER_API_KEY}` in any capability's options.

### Call-time slots (`{arg_name}`)

A `{slot}` is a placeholder for a value the model fills in each time it calls the tool. Every slot becomes a typed tool argument:

- Declare it (for a custom type or description) in `path_params` (for slots in the `url`) or `body_params` (for slots in the `body_template`).
- Or **omit the declaration** — an undeclared slot auto-registers as a **required string**.

The following two sections show slots in action.

## Path templating

Put `{name}` segments in the `url`; each becomes a call-time tool argument that is URL-encoded and substituted into the path before the request is made.

- Declare slots in `path_params` to give them a custom type or description, **or omit** them — undeclared slots auto-register as **required strings**.
- Values are URL-encoded with no safe characters (`/` → `%2F`), so a slot can't break out of its path segment — no host swap, no `../` traversal. The fully-filled URL is then **re-validated for SSRF** (see [Security](#security)) before the request.

**Example — a path-scoped GET:**

```json
{
  "name": "Get Chat Messages",
  "code": "get_chat_messages",
  "type": "api",
  "options": {
    "name": "get_chat_messages",
    "description": "List the messages in a chat",
    "method": "GET",
    "url": "https://api.example.com/v1/chats/{chat_id}/messages",
    "path_params": {
      "chat_id": { "type": "string", "description": "The chat id", "required": true }
    },
    "params": {
      "limit": { "type": "integer", "description": "Max messages", "required": false, "default": 20 }
    },
    "headers": { "Authorization": "Bearer ${API_TOKEN}" }
  }
}
```

The model calls it with `chat_id` and an optional `limit`; the tool requests `.../chats/<chat_id>/messages?limit=...`.

!!! warning "Every declared path param needs a matching slot"
    A `path_params` entry with no corresponding `{slot}` in the `url` is rejected at build time.

## Request bodies

There are two mutually exclusive ways to describe a request body. Pick one.

### `body` — flat scalar fields

The `body` option maps a flat schema of scalar fields to a flat JSON object. Each field becomes a typed tool argument and is sent in the JSON body. This is the simplest option and hasn't changed — see the [Send Email example](#post-with-a-json-body-send-an-email-resend).

### `body_template` — nested JSON or raw text

For anything richer than a flat object, use `body_template`. It supports the same `${SETTING}` + `{slot}` interpolation as the `url`, and takes one of two forms.

**(a) JSON structure** (a dict or list) → sent as JSON. Static values, `${SETTING}`, and `{slot}` arguments mix freely; nesting and arrays are supported.

- A leaf that is **exactly** `"{slot}"` keeps the argument's **native type** — an integer stays an integer, a boolean stays a boolean.
- A slot **inside surrounding text** (`"Hello {name}"`) is string-interpolated.

**(b) Raw string** → sent as the raw request body, honoring the `Content-Type` header — `text/plain`, `application/x-www-form-urlencoded`, XML, and so on.

Slots used in a `body_template` are declared in `body_params` (for a custom type or description) or auto-register as **required strings**.

**Example — nested JSON mixing static, dynamic, and typed fields:**

```json
{
  "name": "Post Message",
  "code": "post_message",
  "type": "api",
  "options": {
    "name": "post_message",
    "description": "Post a message to a chat",
    "method": "POST",
    "url": "https://api.example.com/v1/chats/{chat_id}/messages",
    "headers": { "Authorization": "Bearer ${API_TOKEN}" },
    "body_template": {
      "source": "primethink",
      "message": { "text": "{text}", "pinned": "{pinned}" },
      "tags": ["inbound", "{tag}"]
    },
    "body_params": {
      "text":   { "type": "string",  "description": "Message text", "required": true },
      "pinned": { "type": "boolean", "description": "Pin it",       "required": true },
      "tag":    { "type": "string",  "description": "Extra tag",    "required": true }
    }
  }
}
```

Called with `chat_id=42, text="hi", pinned=true, tag="urgent"`, it POSTs:

```json
{ "source": "primethink", "message": { "text": "hi", "pinned": true }, "tags": ["inbound", "urgent"] }
```

Note that `pinned` is emitted as a real boolean (whole-leaf type preservation), and `chat_id` fills the URL path — **the same name can be used in both the URL and the body** (one argument, two fills).

**Example — a raw form-urlencoded body (with a `${SETTING}` inside the body too):**

```json
{
  "name": "Send SMS (form)",
  "code": "send_sms_form",
  "type": "api",
  "options": {
    "name": "send_sms_form",
    "description": "Send an SMS via a form-encoded endpoint",
    "method": "POST",
    "url": "https://api.sms-provider.com/v1/messages",
    "headers": {
      "Authorization": "Bearer ${SMS_API_KEY}",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    "body_template": "To={to}&Body={body}",
    "body_params": {
      "to":   { "type": "string", "required": true },
      "body": { "type": "string", "required": true }
    }
  }
}
```

!!! warning "Body validation"
    Setting both `body` and `body_template` is rejected. So is a `body_params` without a `body_template`, or a `body_params` entry with no matching `{slot}`.

## File uploads

Endpoints that accept file uploads use a `files` section — the request then becomes `multipart/form-data`.

Because the model can't emit raw bytes, **each file field's argument is a PrimeThink `document_id`** — a document that already exists **in the current chat** (what the model can see). PrimeThink resolves the id to its bytes server-side and attaches it as a multipart part.

- **`multiple: false`** (the default) → the argument is a single `document_id` (an integer).
- **`multiple: true`** → the argument is a **list of ids**, each sent as its own part under the same field name.
- A flat `body` alongside `files` becomes the multipart **text fields**. `body_template` **cannot** be combined with `files`.
- `Content-Type` is set automatically for multipart — **do not** set it in `headers`.

A `files` field is described with `description`, `required`, and `multiple` (rather than the `type`/`default` field schema used elsewhere).

**Example — attach a document with an optional caption:**

```json
{
  "name": "Attach File to Chat",
  "code": "attach_file",
  "type": "api",
  "options": {
    "name": "attach_file",
    "description": "Upload a document from this chat as an attachment",
    "method": "POST",
    "url": "https://api.example.com/v1/chats/{chat_id}/attachments",
    "files": {
      "file": {
        "description": "The document to upload (a document_id from this chat)",
        "required": true,
        "multiple": false
      }
    },
    "body": {
      "caption": { "type": "string", "description": "Optional caption", "required": false }
    },
    "headers": { "Authorization": "Bearer ${API_TOKEN}" }
  }
}
```

Called with `chat_id=5, file=7, caption="quarterly report"`, it sends a multipart POST to `.../chats/5/attachments` with document `7`'s bytes as the `file` part and `caption` as a text field. If document `7` isn't in chat `5`, the tool returns an error and sends nothing.

!!! warning "File uploads need a chat, and stay inside it"
    File-bearing capabilities require a chat context — they're **unavailable outside a chat**. Combining `files` with `body_template` is rejected. See [Security](#security) for the chat-scoping and size guarantees.

## Naming rules

These rules apply across every section and are all enforced at build time:

- **One home per name.** Every argument name is declared in exactly one of `path_params`, `params`, `body`, `body_params`, or `files`. Duplicates across sections are rejected.
- **A slot may fill two places.** A `{slot}` name may appear in **both** the `url` and the `body_template` — that's a single argument filling two places, and it's allowed.
- **Slots and sent-fields don't mix.** A template `{slot}` may **not** collide with a field that's sent verbatim (`params`, `body`, or `files`). A name is either a template slot or a sent field — never both.

## How a call works

When the model calls the tool:

1. `{slot}` values are substituted into the `url` path (URL-encoded) and, when present, into the `body_template` (not URL-encoded — whole-leaf slots keep their native type).
2. Remaining arguments are split — those declared in `params` go to the query string; those in `body` go to the JSON body (or multipart text fields when `files` is set). Empty values are dropped.
3. When `files` is present, each `document_id` is [authorized against the current chat](#security) and resolved to bytes; the request is sent as `multipart/form-data`.
4. The fully-filled URL is re-resolved and re-validated for safety (see [Security](#security)).
5. An HTTPS request is made with a 30-second timeout.
6. On success, the response body is returned to the model as text.

### Errors the model sees

These failures are returned to the model as text (so it can react), not raised as errors:

| Condition | Returned to the model |
|-----------|-----------------------|
| URL fails safety validation | `API request blocked: {detail}` |
| A required path parameter or file field is missing | `API request failed: missing required path parameter '{name}'` (or `…missing required file field '{name}'`) |
| A file `document_id` isn't in the current chat (or exceeds the size cap) | `API request failed: {detail}` — and **no request is made** |
| Non-2xx HTTP status | `API error: HTTP {status_code}` |
| Network failure, timeout, etc. | `API request failed: {detail}` |

Build-time problems prevent the tool from being created — the capability is skipped and the issue is logged, so the agent simply won't have that tool. These include: a missing `url`/`name`; a bad method; an unresolved `${SETTING}` placeholder; a name declared in more than one section; setting both `body` and `body_template`; combining `body_template` with `files`; a `path_params`/`body_params` entry with no matching `{slot}`; or a `body_params` with no `body_template`.

## Dot-notation keys

The capability editor stores `options` as flat name/value pairs and can't natively express nested structures. To get around this, any key containing a dot is expanded into nested objects:

```
params.location.type   →   { "params": { "location": { "type": "string" } } }
```

Rules:

- Keys without a dot are kept as-is.
- Multiple dotted keys sharing a prefix are merged under the same parent.
- Dotted keys merge into any already-nested value at the same path, so existing nested JSON keeps working — you can mix styles freely.

!!! tip
    If your editor lets you enter JSON objects directly, you can nest without dot-notation. Dot-notation is just the escape hatch for flat key/value editors. A rich `body_template` is far easier to express as real nested JSON than as dotted keys.

## Security

API capabilities are guarded to prevent them from reaching internal services or exfiltrating data:

- **HTTPS only.** `http://` URLs are rejected.
- **SSRF protection.** Before each request the hostname is resolved and every resolved IP is checked. Requests are blocked if the target resolves to a non-public address (private, loopback, link-local, reserved, multicast, or carrier-grade-NAT ranges). This blocks attempts to reach internal services or cloud metadata endpoints. Because a filled-in `{slot}` can change the URL, this check runs against the **fully-filled** URL on every call, and slot values are URL-encoded so they can't alter the host or escape their path segment. Only public HTTPS endpoints are reachable.
- The original hostname is preserved for the request (so TLS/SNI stays correct); the validated IP is used only for connection targeting.
- **Chat-scoped uploads.** For `files`, a document is uploaded only if it belongs to the current chat; any other id is refused (the tool returns an error and makes **no request**). This prevents an agent from exfiltrating documents it can't see. A per-document size cap of **50 MiB** guards against oversized uploads, and file-bearing capabilities are unavailable outside a chat context.

## Examples

The three examples below use real, live endpoints so you can adapt them directly. For the newer features, see the worked examples in [Path templating](#path-templating), [Request bodies](#request-bodies), and [File uploads](#file-uploads).

### GET with an API key — recent news ([NewsAPI](https://newsapi.org/docs/endpoints/everything))

**When you'd use this:** give a research or briefing agent the ability to pull recent articles on demand. NewsAPI takes its key in an `X-Api-Key` header, so the key stays in `headers` (a secret) and never becomes a model-visible argument.

```json
{
  "name": "Search News",
  "type": "api",
  "options": {
    "name": "search_news",
    "description": "Search recent news articles by keyword.",
    "method": "GET",
    "url": "https://newsapi.org/v2/everything",
    "params": {
      "q": { "type": "string", "description": "Search keywords or phrase", "required": true },
      "sortBy": { "type": "string", "description": "relevancy, popularity, or publishedAt", "required": false, "default": "publishedAt" },
      "language": { "type": "string", "description": "2-letter language code, e.g. 'en'", "required": false, "default": "en" }
    },
    "headers": {
      "X-Api-Key": "${NEWSAPI_KEY}"
    }
  }
}
```

### POST with a JSON body — send an email ([Resend](https://resend.com/docs/api-reference/emails/send-email))

**When you'd use this:** let an agent send a transactional email — a summary, an alert, a follow-up — at the end of a workflow. The API key lives in a header; the email fields become typed tool arguments the model fills in.

```json
{
  "name": "Send Email",
  "type": "api",
  "options": {
    "name": "send_email",
    "description": "Send an email via Resend.",
    "method": "POST",
    "url": "https://api.resend.com/emails",
    "body": {
      "from": { "type": "string", "description": "Verified sender, e.g. 'agent@yourdomain.com'", "required": true },
      "to": { "type": "string", "description": "Recipient email address", "required": true },
      "subject": { "type": "string", "description": "Email subject line", "required": true },
      "html": { "type": "string", "description": "HTML body of the email", "required": true }
    },
    "headers": {
      "Authorization": "Bearer ${RESEND_API_KEY}",
      "Content-Type": "application/json"
    }
  }
}
```

### No auth, using the flat editor — weather forecast ([Open-Meteo](https://open-meteo.com/en/docs))

**When you'd use this:** a genuinely free, key-less API — great for a first capability. Open-Meteo needs no sign-up. This example also shows the flat editor: `name`/`description` are left out and fall back to the capability — named *"Open-Meteo Weather"*, it becomes the tool `open_meteo_weather`.

```
method                      = GET
url                         = https://api.open-meteo.com/v1/forecast
params.latitude.type        = number
params.latitude.required    = true
params.longitude.type       = number
params.longitude.required   = true
params.current.type         = string
params.current.default      = temperature_2m
```

## Quick reference

Minimal API capability:

```json
{ "name": "tool_name", "url": "https://api.example.com/endpoint" }
```

(`method` defaults to `GET`; `name` can be omitted if the capability name is set.)

Rules to remember:

- HTTPS only; methods `GET`/`POST`/`PUT`/`PATCH`; no private/internal IPs.
- Two interpolations: `${SETTING}` (build-time, from settings) and `{slot}` (call-time, a tool argument). They can share one string.
- `{slot}` in the `url` → a [path param](#path-templating) (`path_params`); `{slot}` in a `body_template` → `body_params`. Undeclared slots become required strings.
- Bodies: `body` (flat JSON) **or** `body_template` (nested JSON / raw text) — never both.
- Uploads: `files` makes the request multipart; each argument is a chat `document_id`, scoped to the current chat.
- Every argument name lives in exactly one section; a `{slot}` may fill the URL and the body, but never doubles as a sent field.
- Secrets → `${SETTING_NAME}` placeholders, defined in settings first.
- Nested config in a flat editor → dot-notation keys (`params.x.type`).

## Related Topics

- [Capabilities](Capabilities.md) — what capabilities are and how they're used
- [MCP Capabilities](MCP-Capabilities.md) — connect a remote MCP server instead
- [Documents and Collections in Chats](/Documents-and-Collections-in-Chats/) — where the `document_id` values used by `files` come from
- [Working with AI Agents](/Working-with-AI-Agents/) — assigning capabilities to an agent
