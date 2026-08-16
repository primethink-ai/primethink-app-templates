# Computer Use Capabilities

A **Computer Use capability** (`type: "computer_use"`) lets an agent operate an isolated virtual desktop — it launches a browser, clicks, types, and reads screenshots, the way a person uses a GUI. This is the right choice when an integration has **no API**: a legacy portal, a web app behind a login, a download that's only available through the UI.

Each Computer Use capability defines **one named automation** that becomes a single tool the model can call. The desktop runs in an isolated cloud sandbox backed by [Daytona](https://www.daytona.io/); on each run the platform provisions the sandbox, launches a browser (optionally at a `start_url`), runs the task, and records the session.

For the bigger picture of how capabilities fit together, see [Capabilities](Capabilities.md). The command-line counterpart to this type is [Sandbox Capabilities](Sandbox-Capabilities.md).

## Two execution modes

Both Computer Use and [Sandbox](Sandbox-Capabilities.md) capabilities support the same two modes:

| Mode | How it runs | Trade-off |
|------|-------------|-----------|
| **agent** (default) | A natural-language `prompt` drives a nested Claude loop that decides each step until the task is done or a cap is hit. | Flexible — handles variation and judgment. Costs LLM tokens. |
| **script** | A fixed, predefined sequence of `actions` runs directly, with no LLM. | Cheap, deterministic, fast — but rigid. |

If `mode` is omitted it's inferred: **script** when an `actions` list is present, otherwise **agent**.

## Shared concepts

These behave the same as the other dynamically-built capability types ([API](API-Capabilities.md), [MCP](MCP-Capabilities.md), [Sandbox](Sandbox-Capabilities.md)):

### Name & description

- `name` (in `options`) is the LLM-facing tool name. If omitted it falls back to the capability's name, slugified (e.g. *"Download Invoice"* → `download_invoice`). A name must exist somewhere or the build fails.
- `description` falls back to the capability description, then to a type-specific default.

### `{param}` slots vs `${SETTING}` placeholders

These are two **distinct** mechanisms — don't confuse them:

- **`{param}`** — runtime tool-call arguments. The agent fills these in when it calls the tool; they're substituted into the prompt or actions. A missing or malformed slot is logged and left as-is rather than aborting the run.
- **`${SETTING_NAME}`** — secrets and config resolved server-side from your user/group settings at run time. Never hard-code secrets; reference settings instead. An unresolved setting **aborts** the run with a clear message.

Resolution order: `{param}` slots are filled first, then `${SETTING}` placeholders are resolved.

### Typed parameters (`params`)

`params` is a map of `{name: {type, description, required, default}}` — the same schema format as [API capabilities](API-Capabilities.md#field-schema-for-params-and-body). Types: `string`, `integer`, `number`, `boolean`. These become the tool's typed arguments — the `{param}` slots above.

### Dot-notation keys

Because the editor stores `options` flat, nested structures can use dot-notation (e.g. `params.month.type`), expanded automatically. Already-nested JSON works unchanged. See [Dot-notation keys](API-Capabilities.md#dot-notation-keys).

### Resilience

A build failure (missing required field, bad config) is logged and the capability is skipped — it won't break the rest of the agent. Runtime failures are returned to the model as a text message (never raised), so the agent can react.

### Tuning knobs (agent mode)

All optional; per-capability `options` override the platform defaults. `model`, `max_iterations`, and `max_tokens` apply only to **agent** mode — script mode runs without an LLM (but still respects `timeout_seconds`).

| Option | Default | Meaning |
|--------|---------|---------|
| `model` | `anthropic:claude-opus-5` | Anthropic model driving the nested loop. |
| `max_iterations` | `40` | Max steps before the loop stops. Clamped to ≥ 1. |
| `timeout_seconds` | `600` | Overall time budget. Clamped to ≥ 1. |
| `max_tokens` | `4096` | Max tokens per nested-loop model call. Clamped to ≥ 1. |

## Options schema

| Key | Required | Applies to | Description |
|-----|----------|------------|-------------|
| `name` | No\* | both | LLM-facing tool name (falls back to the capability name, slugified). |
| `description` | No | both | Tool description (falls back to the capability description, then a default). |
| `mode` | No | both | `"agent"` or `"script"`. Inferred when omitted: `script` if `actions` is present, else `agent`. |
| `prompt` | Yes (agent) | agent | Natural-language instruction driving the Claude computer-use loop. Supports `{param}` and `${SETTING}`. |
| `actions` | Yes (script) | script | Ordered list of action objects executed directly (see [Script mode](#script-mode)). |
| `params` | No | both | Typed tool arguments → `{param}` slots. |
| `start_url` | No | both | URL opened in the browser at start. In agent mode, an instruction to open it is appended to the prompt. |
| `model` | No | agent | Anthropic model for the nested loop. |
| `max_iterations`, `timeout_seconds`, `max_tokens` | No | agent / both | See [Tuning knobs](#tuning-knobs-agent-mode). |

\* required in `options` **or** via the capability name.

## Agent mode

A natural-language `prompt` drives a nested Claude loop using the Anthropic computer-use tool. Each turn, Claude emits an action → the desktop sandbox executes it and returns a screenshot → repeat, until Claude finishes or `max_iterations`/`timeout_seconds` is hit. Progress is reported per action (e.g. `Computer: left_click`). The tool returns Claude's final text (or `"Computer use task completed."`).

**When you'd use this:** a supplier billing portal with no API, where the page layout shifts month to month — agent mode adapts to whatever it sees. (`start_url`/credentials below are stand-ins for your own portal.)

```json
{
  "name": "download_supplier_invoice",
  "prompt": "Log in with ${ACME_USER}/${ACME_PASSWORD}, go to Billing > Invoices and download the invoice for {month}.",
  "params": { "month": { "type": "string", "required": true } },
  "start_url": "https://portal.acme.com"
}
```

## Script mode

A fixed `actions` list runs directly — no LLM. Each action is an object like `{"action": "...", ...}`. Text fields support `{param}` and `${SETTING}`. This is cheap and deterministic, but fixed pixel coordinates are brittle, so it suits **stable UIs and keystroke macros**. The tool returns a summary: `"Ran N action(s) successfully."` or a per-step error list.

Common actions: `left_click` with `coordinate: [x, y]`, `type` with `text`, and `key` with `text` (e.g. `"Tab"`, `"Return"`).

**When you'd use this:** a stable login screen that never moves — a fixed click-and-type macro is faster and cheaper than an LLM, and keeps the password off the model entirely.

```json
{
  "name": "portal_login",
  "mode": "script",
  "start_url": "https://portal.acme.com",
  "actions": [
    { "action": "left_click", "coordinate": [120, 80] },
    { "action": "type", "text": "${ACME_USER}" },
    { "action": "key", "text": "Tab" },
    { "action": "type", "text": "${ACME_PASSWORD}" },
    { "action": "key", "text": "Return" }
  ]
}
```

## Security

Credentials never live in the database in plaintext — they come from your settings via `${SETTING}` placeholders.

- In **script mode**, `${SETTING}` values are resolved server-side and the actions run directly — the credentials never reach a model.
- In **agent mode**, the prompt (with resolved values) is sent to Claude as needed to perform the task.

## Runtime errors

Failures are returned to the model as text (so it can react), never raised:

| Condition | Returned to the model |
|-----------|-----------------------|
| Unresolved `${SETTING}` | `Computer use task could not start: {detail}` |
| Sandbox runtime (Daytona) unavailable | `Computer use task failed: {detail}` (logged) |
| Other failure | `Computer use task failed: {detail}` |

The sandbox session is always closed at the end of the run.

## Computer Use vs Sandbox — when to use which

|  | Computer Use | [Sandbox](Sandbox-Capabilities.md) |
|--|--------------|---------|
| **Interface** | Virtual desktop + browser (GUI) | Shell (CLI) |
| **Sees** | Screenshots | stdout/stderr + exit codes |
| **Best for** | GUI-only portals, web apps with no API, form filling, downloads | Data conversion, file processing, CLI tools, API calls via `curl` |
| **Agent mode** | Claude computer-use loop (click/type/screenshot) | Claude `run_command` loop |
| **Script mode** | Fixed actions (clicks/keys) — brittle on coordinates | Fixed shell script — robust |
| **Secrets** | `${SETTING}` (resolved server-side; script mode keeps them off the model) | `env` map → real env vars (kept off command string, logs, and model) |
| **Default agent iterations** | 40 | 20 |

**Rule of thumb:** if the task can be done with commands, prefer [Sandbox](Sandbox-Capabilities.md) (cheaper, more reliable). Use Computer Use only when a real GUI is unavoidable. Within each, prefer **script mode** for stable, repeatable steps and **agent mode** when the task needs judgment or varies run to run.

## Related Topics

- [Capabilities](Capabilities.md) — what capabilities are and how they're used
- [Sandbox Capabilities](Sandbox-Capabilities.md) — the command-line counterpart
- [Working with AI Agents](/Working-with-AI-Agents/) — assigning capabilities to an agent
