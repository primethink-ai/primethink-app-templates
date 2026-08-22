# MCP Capabilities

An **MCP capability** (`type: "mcp"`) connects your agent to a remote, already-deployed [Model Context Protocol](https://modelcontextprotocol.io/) server. The server's tools become available to the model — so a single capability can add a whole suite of related tools at once.

Like API capabilities, MCP capabilities are pure configuration: no code, just a small options blob pointing at the server. They're the best choice for plugging in rich, multi-tool integrations that are built and maintained outside PrimeThink.

For the bigger picture of how capabilities fit together, see [Capabilities](Capabilities.md).

!!! warning "Supported models: OpenAI and direct Anthropic"
    Hosted MCP is executed by the model provider itself, so it only works on providers with an MCP connector:

    - **OpenAI models** — MCP tools are attached through OpenAI's Responses API.
    - **Direct Anthropic (Claude) models** (`anthropic:...`) — MCP servers are attached through Anthropic's MCP connector. The capability must set an explicit `require_approval: "never"` and can only authenticate with a Bearer token — see [Running on Anthropic (Claude) models](#running-on-anthropic-claude-models).
    - **AWS Bedrock Claude models** (`bedrock:...`) — Bedrock does not provide Anthropic's hosted MCP connector. Do not attach an MCP capability to a Bedrock agent; the provider can reject requests containing hosted-MCP configuration.
    - **Any other provider** (Gemini, Groq, DeepSeek, Mistral, …) — MCP capabilities are **skipped** and a warning is logged; the rest of the agent is unaffected.

    The same capability works on OpenAI and direct Anthropic — nothing in the options changes when you swap between those providers; the translation happens automatically. Bedrock-hosted Claude is a separate provider and does not support hosted MCP.

## Options schema

A minimal MCP capability against a public server with no auth:

```json
{
  "server_label": "deepwiki",
  "server_url": "https://mcp.deepwiki.com/mcp",
  "require_approval": "never"
}
```

With auth headers (the token comes from settings, not hard-coded):

```json
{
  "server_label": "ha-remote",
  "server_url": "https://your-instance.ui.nabu.casa/api/mcp",
  "require_approval": "never",
  "headers": {
    "Authorization": "Bearer ${HA_REMOTE_TOKEN}"
  }
}
```

### Field reference

| Key | Required | Description |
|-----|----------|-------------|
| `server_label` | Yes | Short identifier for the server, shown in errors and traces. Whitespace stripped. |
| `server_url` | Yes | The MCP server endpoint. Supports `${SETTING}` placeholders. Whitespace stripped — see the warning below. |
| `require_approval` | No* | `"never"` to auto-approve tool calls, `"always"`, or an OpenAI approval-policy object; omit for the OpenAI default (approval required). Whitespace stripped. ***Required as `"never"` for the server to run on Anthropic models** — see below. |
| `headers` | No | Auth or other headers. Values support `${SETTING}` placeholders (e.g. `Authorization`). On Anthropic, only a Bearer `Authorization` header survives — see below. |
| `allowed_tools` | No | Restricts which of the server's tools are exposed to the model — a list of tool names. An explicit empty list means "allow no tools". Works on both providers (nested under `tool_configuration` for Anthropic automatically). |
| *extra keys* | No | Any additional keys (such as `tool_filter`) are passed through to the MCP tool config on OpenAI. String/dict values still get placeholder resolution. On Anthropic, only the fields above are sent. |

The built config always includes `"type": "mcp"`.

!!! warning "Avoid stray whitespace in `server_url`"
    A leading or trailing space in `server_url` causes OpenAI's MCP connector to fail with HTTP 424 ("failed to retrieve tool list"), which previously surfaced to users as an empty or blank response. PrimeThink now trims `server_url` (and `server_label`/`require_approval`) automatically, but it's still good practice to keep the value clean.

## Settings placeholders (`${SETTING_NAME}`)

Never hard-code tokens. Any string value in `options` can contain `${SETTING_NAME}` placeholders, resolved at runtime from your user/group settings.

- The name must be word characters (letters, digits, underscore).
- Example: `"Authorization": "Bearer ${HA_REMOTE_TOKEN}"`.
- Placeholders are resolved in `server_label`, `server_url`, `require_approval`, `headers`, and any extra string/dict values.
- If a referenced setting is missing or empty, the MCP config is skipped and the issue is logged. **Define the setting before enabling the capability.**

You configure settings on the Settings page (or via the admin API):

```
Setting name:  HA_REMOTE_TOKEN
Setting value: eyJhbGci...
```

The value is then available as `${HA_REMOTE_TOKEN}` in the capability's options. See [API Capabilities → Dot-notation keys](API-Capabilities.md#dot-notation-keys) for expressing nested options in a flat editor — the same expansion applies here.

## Running on Anthropic (Claude) models

!!! important "Direct Anthropic only"
    This section applies to `anthropic:...` models. AWS Bedrock Claude models use the `bedrock:...` prefix and do not provide Anthropic's hosted MCP connector. Do not attach MCP capabilities to Bedrock agents because the provider can reject requests containing hosted-MCP configuration.

The same MCP capability that runs on OpenAI also runs on direct Anthropic — PrimeThink translates the options into Anthropic's MCP-connector format at bind time (`server_label` → `name`, `server_url` → `url`, `allowed_tools` → `tool_configuration.allowed_tools`, and the `Authorization` Bearer token → `authorization_token`). Anthropic's connector is more restrictive than OpenAI's, so a capability must meet four conditions to attach on a Claude model:

1. **`require_approval` must be an explicit `"never"`.** Anthropic has no tool-approval flow, so a server whose calls would be gated on OpenAI can't be attached safely. The integration is *fail-closed*: anything other than `"never"` — including omitting the field — skips the server on Anthropic, with a logged warning. (Setting `"never"` is also the only mode in which OpenAI runs the tools without pausing for approval.)
2. **`server_url` and `server_label` must both be set.** Anthropic rejects an entry missing either one with an error that would fail every message, so incomplete configs are skipped instead of attached.
3. **Auth must be a Bearer token in the `Authorization` header.** Anthropic accepts a single OAuth bearer token — nothing else. The `Bearer` prefix is stripped automatically (a schemeless raw token also works). **All other headers are dropped**, with a logged warning naming them; a server that requires a custom header (e.g. `X-Api-Key`) will authenticate on OpenAI but not on Anthropic. Non-Bearer schemes such as `Basic` are not supported.
4. **`allowed_tools`, if set, must be interpretable as a list of tool names.** A bare string and the flat-editor `{"0": ..., "1": ...}` shape are normalized automatically; a value that can't be interpreted skips the server rather than silently widening the restriction.

A skipped server never breaks the agent — the rest of its tools keep working; the agent just runs without that MCP server. If MCP tools seem to disappear after switching an agent to a Claude model, check the server logs for `skipped on Anthropic` warnings, which state the exact reason and fix.

Only URL-based (Streamable HTTP) MCP servers are supported on Anthropic — which is the only kind PrimeThink connects to anyway.

## When a tool fails

When a hosted-MCP interaction fails, the provider (OpenAI or Anthropic alike) returns the failure as a content block with an error rather than throwing. PrimeThink detects these and surfaces them to you in the chat as:

> ⚠️ A connected tool failed: MCP server '{label}', tool '{name}': {error}

and logs the error server-side. Successful MCP interactions produce no such message. (This replaces the older behavior where a failing MCP server could surface as a silent, empty response.)

## Examples

Both examples use real, live MCP servers.

### Public, no auth — [DeepWiki](https://docs.devin.ai/work-with-devin/deepwiki-mcp)

**When you'd use this:** let an agent answer questions about any public GitHub repository's documentation. DeepWiki is open, so no token is needed.

```json
{
  "name": "DeepWiki",
  "type": "mcp",
  "options": {
    "server_label": "deepwiki",
    "server_url": "https://mcp.deepwiki.com/mcp",
    "require_approval": "never"
  }
}
```

This gives the agent DeepWiki's tools (for example, an `ask_question` tool) to query repository documentation.

### Authenticated — [GitHub's remote MCP server](https://github.com/github/github-mcp-server)

**When you'd use this:** give an engineering or project-tracking agent live access to your GitHub — issues, pull requests, code search, and more — through GitHub's officially hosted MCP server. Authentication is a [personal access token](https://github.com/settings/tokens) passed as a Bearer header, stored as a setting so it never appears in the config.

```json
{
  "name": "GitHub",
  "type": "mcp",
  "options": {
    "server_label": "github",
    "server_url": "https://api.githubcopilot.com/mcp/",
    "require_approval": "never",
    "headers": {
      "Authorization": "Bearer ${GITHUB_MCP_PAT}"
    }
  }
}
```

Define a setting named `GITHUB_MCP_PAT` holding your token before enabling the capability. Scope the token to the minimum your agent needs — a compromised token grants whatever access it carries.

## Quick reference

Minimal MCP capability:

```json
{ "server_label": "label", "server_url": "https://host/mcp", "require_approval": "never" }
```

Rules to remember:

- **OpenAI and direct Anthropic models only** — do not configure hosted MCP on AWS Bedrock Claude; MCP capabilities are skipped on other unsupported providers.
- On Anthropic, `require_approval: "never"` is mandatory (fail-closed) and only a Bearer `Authorization` header is sent — custom headers are dropped.
- No stray whitespace in `server_url`.
- Secrets → `${SETTING_NAME}` placeholders in `headers`, defined in settings first.

## Related Topics

- [Capabilities](Capabilities.md) — what capabilities are and how they're used
- [API Capabilities](API-Capabilities.md) — wrap a single HTTP endpoint instead
- [Supported LLMs](/Supported-LLMs/) — which providers and models your agent can use
- [Working with AI Agents](/Working-with-AI-Agents/) — assigning capabilities to an agent
