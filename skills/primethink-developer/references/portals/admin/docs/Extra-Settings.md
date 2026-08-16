# Extra Settings Reference

This page is a single, consolidated reference for the **extra settings** (user/group variables) that PrimeThink features read at runtime — primarily the secrets and configuration values that capabilities and tool plugins resolve through `${SETTING_NAME}` placeholders.

Each setting is also documented in its own topic page, in context. This page collects them all in one place so you can see, at a glance, every setting the platform's documented features expect and where each one is used.

!!! note "These are *your* settings, not fixed platform keys"
    Extra settings are **user-defined**. You choose the name — it only has to match the `${...}` placeholder you write in a capability's options (or the key your plugin reads via `get_user_setting_value`). The names in the catalog below are the ones used throughout this documentation's examples; rename them freely as long as the placeholder and the setting agree.

---

## What Counts as an "Extra Setting"

PrimeThink has three distinct kinds of configuration. This page covers the **first**:

| Kind | Where it lives | What it does | Reference |
|------|----------------|--------------|-----------|
| **Extra settings (variables)** | Settings page → **User Variables** / **Group Variables** | Key-value pairs (API tokens, base URLs, credentials) consumed by capabilities and plugins | *This page* |
| **App settings** | Settings page | Profile, message preferences, group settings | [App Settings](/App-Settings/) |
| **UI settings** | Backend feature toggles | Show/hide interface features per user or group | [UI Settings](/UI-Settings/) |

Extra settings are the values you store under [App Settings → Variables Management](/App-Settings/#variables-management). Two consumers read them:

- **Capabilities** (MCP, API, Sandbox, Computer Use) — via `${SETTING_NAME}` placeholders in their `options`.
- **Tool plugins** — programmatically, via the injected `context.get_user_setting_value(name, user_id, group_id)`. See [Tool Plugins → Plugin Context](Tool-Plugins.md#plugin-context-pt-services-injection).

---

## How Placeholder Resolution Works

Any string value in a capability's `options` can contain `${SETTING_NAME}` placeholders. They are resolved when the agent's tools are built:

1. The system scans the `options` for `${...}` tokens.
2. For each token it calls `get_user_setting_value(name, user_id, group_id)` against the current user's (and group's) settings.
3. The returned value replaces the placeholder.
4. If a setting can't be resolved (missing or empty), an `UnresolvedPlaceholderError` is raised and that capability/tool is **skipped** with a logged error — the rest of the agent still loads.

**Rules:**

- Setting names must be word characters only — letters, digits, and underscore. `${HA_REMOTE_TOKEN}` is valid; `${ha-token}` is not.
- Names are **case-sensitive**: `${MY_KEY}` looks for a setting named exactly `MY_KEY`.
- Resolution scope by capability type:
    - **MCP** — `server_label`, `server_url`, `require_approval`, `headers`, and any extra string/dict values.
    - **API** — `url` and `headers`.
    - **Sandbox** — `env` values passed into the sandbox.
    - **Computer Use** — `prompt` and `actions` text.

---

## Configuring a Setting

On the **Settings** page, open **User Variables** (personal) or **Group Variables** (shared across the group) and add a key-value pair:

```text
Setting name:  WEATHER_API_KEY
Setting value: sk-abc123...
```

The value is then available as `${WEATHER_API_KEY}` in any capability's options for that user/group. Settings can also be managed via the admin API. See [App Settings → Variables Management](/App-Settings/#variables-management) for the UI walkthrough.

> **User vs. Group:** a User Variable applies only to you; a Group Variable applies to everyone in the group. When both exist with the same name, the user-level value takes precedence.

---

## Settings Catalog

The settings below are referenced throughout the documentation. Each links to the page where it is used in full context.

### API Capabilities

| Setting | Holds | Used in |
|---------|-------|---------|
| `WEATHER_API_KEY` | Bearer token for the example weather API | [API Capabilities](API-Capabilities.md) · [Capabilities](Capabilities.md) · [Tool Plugins](Tool-Plugins.md) |
| `NEWSAPI_KEY` | `X-Api-Key` for the NewsAPI example | [API Capabilities](API-Capabilities.md) |
| `RESEND_API_KEY` | Bearer token for the Resend email API example | [API Capabilities](API-Capabilities.md) |
| `SMS_API_KEY` | Bearer token for the SMS-provider example | [Tool Plugins](Tool-Plugins.md) |

### MCP Capabilities

| Setting | Holds | Used in |
|---------|-------|---------|
| `HA_REMOTE_TOKEN` | Bearer token for a remote Home Assistant MCP server | [MCP Capabilities](MCP-Capabilities.md) · [Tool Plugins](Tool-Plugins.md) |
| `GITHUB_MCP_PAT` | Personal access token for the GitHub MCP server | [MCP Capabilities](MCP-Capabilities.md) |

### Sandbox Capabilities

| Setting | Holds | Used in |
|---------|-------|---------|
| `GITHUB_TOKEN` | GitHub token injected into the sandbox `env` (e.g. as `GH_TOKEN`) | [Sandbox Capabilities](Sandbox-Capabilities.md) |
| `X_API_KEY` | Generic API key injected into the sandbox `env` as a secret | [Sandbox Capabilities](Sandbox-Capabilities.md) |

### Computer Use Capabilities

| Setting | Holds | Used in |
|---------|-------|---------|
| `ACME_USER` | Login username for the supplier-portal example | [Computer Use Capabilities](Computer-Use-Capabilities.md) |
| `ACME_PASSWORD` | Login password for the supplier-portal example | [Computer Use Capabilities](Computer-Use-Capabilities.md) |

### Tool Plugins

Plugins read settings programmatically rather than through `${...}` placeholders, using `context.get_user_setting_value(...)` (often wrapped in a settings-provider class). The example management plugin reads:

| Setting | Holds | Used in |
|---------|-------|---------|
| `manage_base_url` | Base URL of the management system the plugin calls | [Tool Plugins](Tool-Plugins.md#settings-abstraction-pattern) |
| `manage_token` | API token for the management system | [Tool Plugins](Tool-Plugins.md#settings-abstraction-pattern) |

---

## Security Notes

- **Never hard-code secrets** in capability options, prompts, scripts, or plugin code. Always store them as settings and reference them with `${...}` (or read them via `get_user_setting_value`).
- **Scope tokens to the minimum** access your agent needs — a compromised token grants whatever access it carries.
- **Prefer Group Variables** for shared service credentials so they're managed in one place; use **User Variables** for per-person tokens.
- Settings values are write-focused in the UI — treat them like passwords.

---

## Related Topics

- [App Settings](/App-Settings/) — where User and Group Variables are configured
- [UI Settings](/UI-Settings/) — the separate interface feature-toggle system
- [Capabilities](Capabilities.md) — overview of agent capabilities
- [API Capabilities](API-Capabilities.md) · [MCP Capabilities](MCP-Capabilities.md) · [Sandbox Capabilities](Sandbox-Capabilities.md) · [Computer Use Capabilities](Computer-Use-Capabilities.md)
- [Tool Plugins](Tool-Plugins.md) — reading settings from plugin code
