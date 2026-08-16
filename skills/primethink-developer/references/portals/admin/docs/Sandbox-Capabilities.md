# Sandbox Capabilities

A **Sandbox capability** (`type: "sandbox"`) lets an agent run shell commands in an isolated Linux shell sandbox. It's the command-line twin of [Computer Use](Computer-Use-Capabilities.md): no screen — just command execution, with `stdout`/`stderr` and exit codes. Use it for tasks that need arbitrary command execution or file processing: data conversion, file wrangling, CLI tools, or calling an API with `curl`.

Each Sandbox capability defines **one named automation** that becomes a single tool the model can call. The sandbox is an isolated Ubuntu environment backed by [Daytona](https://www.daytona.io/); its filesystem and installed packages persist across calls within a single run.

!!! note "Not the same as the `sandbox_exec` tool"
    This page is about the **`type: "sandbox"` capability** — a *pre-configured, named automation* you attach to an agent. That's different from [Sandbox Execution](Sandbox-Execution.md), which documents the built-in `sandbox_exec` tool: a *general-purpose* shell tool the assistant reaches for ad hoc during conversation. Both run on Daytona, but one is a fixed automation you define and the other is open-ended.

For the bigger picture of how capabilities fit together, see [Capabilities](Capabilities.md).

## Two execution modes

Both Sandbox and [Computer Use](Computer-Use-Capabilities.md) capabilities support the same two modes:

| Mode | How it runs | Trade-off |
|------|-------------|-----------|
| **agent** (default) | A natural-language `prompt` drives a nested Claude loop that scripts the task step by step until it's done or a cap is hit. | Flexible — handles variation and judgment. Costs LLM tokens. |
| **script** | A fixed shell `script` runs once, with no LLM. | Cheap, deterministic, fast — but rigid. |

If `mode` is omitted it's inferred: **script** when a `script` is present, otherwise **agent**.

## Shared concepts

These behave the same as the other dynamically-built capability types ([API](API-Capabilities.md), [MCP](MCP-Capabilities.md), [Computer Use](Computer-Use-Capabilities.md)):

### Name & description

- `name` (in `options`) is the LLM-facing tool name. If omitted it falls back to the capability's name, slugified (e.g. *"Convert Dataset"* → `convert_dataset`). A name must exist somewhere or the build fails.
- `description` falls back to the capability description, then to a type-specific default.

### `{param}` slots vs `${SETTING}` placeholders

These are two **distinct** mechanisms:

- **`{param}`** — runtime tool-call arguments. The agent fills these in when it calls the tool; they're substituted into the prompt or script. A missing or malformed slot is logged and left as-is rather than aborting the run.
- **`${SETTING_NAME}`** — secrets and config resolved server-side from your user/group settings at run time. Never hard-code secrets; reference settings instead. An unresolved setting **aborts** the run with a clear message. (For sensitive values, prefer the `env` map — see [Security](#security).)

Resolution order: `{param}` slots are filled first, then `${SETTING}` placeholders are resolved.

### Typed parameters (`params`)

`params` is a map of `{name: {type, description, required, default}}` — the same schema format as [API capabilities](API-Capabilities.md#field-schema-for-params-and-body). Types: `string`, `integer`, `number`, `boolean`. These become the tool's typed arguments — the `{param}` slots above.

### Dot-notation keys

Because the editor stores `options` flat, nested structures can use dot-notation (e.g. `params.url.type`), expanded automatically. Already-nested JSON works unchanged. See [Dot-notation keys](API-Capabilities.md#dot-notation-keys).

### Resilience

A build failure (missing required field, bad config) is logged and the capability is skipped — it won't break the rest of the agent. Runtime failures are returned to the model as a text message (never raised), so the agent can react.

### Tuning knobs (agent mode)

All optional; per-capability `options` override the platform defaults. `model`, `max_iterations`, and `max_tokens` apply only to **agent** mode — script mode runs without an LLM (but still respects `timeout_seconds`).

| Option | Default | Meaning |
|--------|---------|---------|
| `model` | `anthropic:claude-opus-5` | Anthropic model driving the nested loop. |
| `max_iterations` | `20` | Max steps before the loop stops. Clamped to ≥ 1. |
| `timeout_seconds` | `600` | Overall time budget (in script mode, the single command's budget). Clamped to ≥ 1. |
| `max_tokens` | `4096` | Max tokens per nested-loop model call. Clamped to ≥ 1. |

## Options schema

| Key | Required | Applies to | Description |
|-----|----------|------------|-------------|
| `name` | No\* | both | LLM-facing tool name (falls back to the capability name, slugified). |
| `description` | No | both | Tool description (falls back to the capability description, then a default). |
| `mode` | No | both | `"agent"` or `"script"`. Inferred when omitted: `script` if `script` is present, else `agent`. |
| `prompt` | Yes (agent) | agent | Natural-language instruction driving the Claude shell loop. Supports `{param}` and `${SETTING}`. |
| `script` | Yes (script) | script | A shell script run once. Supports `{param}` and `${SETTING}`. |
| `params` | No | both | Typed tool arguments → `{param}` slots. |
| `env` | No | both | Map of environment variables for the sandbox. **Where secrets belong** — values support `${SETTING}` and resolve to real env vars (see [Security](#security)). |
| `cwd` | No | both | Working directory for commands. |
| `model` | No | agent | Anthropic model for the nested loop. |
| `max_iterations`, `timeout_seconds`, `max_tokens` | No | agent / both | See [Tuning knobs](#tuning-knobs-agent-mode). |

\* required in `options` **or** via the capability name.

## Agent mode

A natural-language `prompt` drives a nested Claude loop whose single tool is `run_command`. Claude scripts the task step by step, reads the combined `stdout`/`stderr` and exit code, and iterates until done or a cap is hit. `run_command` accepts `command` (required) and optional `cwd`. The resolved `env` is injected into every command. Output is returned as `exit_code=N\n{stdout}` (with `[output truncated]` when applicable). Progress reports show a command preview. The tool returns Claude's final text (or `"Sandbox task completed."`).

**When you'd use this:** open-ended data wrangling where the exact commands aren't known up front — the loop can install packages, inspect the file, and adapt. This one downloads a CSV and converts it to Parquet.

```json
{
  "name": "convert_dataset",
  "prompt": "Download {url}, convert the CSV to parquet, and report the row count.",
  "params": { "url": { "type": "string", "required": true } },
  "model": "anthropic:claude-opus-5"
}
```

## Script mode

A fixed shell `script` runs once, no LLM. `{param}` and `${SETTING}` are rendered, `env` is injected, and the command runs within the `timeout_seconds` budget. The tool returns `exit_code=N\n{stdout}`.

**When you'd use this:** a known, repeatable command you don't want to pay an LLM to re-derive every run. This one calls the real [GitHub REST API](https://docs.github.com/en/rest/issues) to pull a repository's open issues and report how many there are — the token comes from `env`, so it never appears in the command string or logs.

```json
{
  "name": "export_repo_issues",
  "mode": "script",
  "script": "curl -sS -H \"Authorization: Bearer $GH_TOKEN\" \"https://api.github.com/repos/{owner}/{repo}/issues?state=open&per_page=100\" > issues.json && jq length issues.json",
  "params": {
    "owner": { "type": "string", "required": true },
    "repo": { "type": "string", "required": true }
  },
  "env": { "GH_TOKEN": "${GITHUB_TOKEN}" },
  "cwd": "/workspace"
}
```

## Security

**Put secrets in `env`, not inline in the script or prompt:**

```json
"env": { "API_KEY": "${X_API_KEY}" }
```

These resolve to real sandbox environment variables, referenced as `$API_KEY` in the script or by the agent's commands. The secret value therefore never appears in the command string, in logs, or in the process list — and in agent mode it never reaches the model.

Inline `${SETTING}` in the script also works, but it exposes the value in the rendered command, so **prefer `env` for anything sensitive**.

## Runtime errors

Failures are returned to the model as text (so it can react), never raised:

| Condition | Returned to the model |
|-----------|-----------------------|
| Unresolved `${SETTING}` | `Sandbox task could not start: {detail}` |
| Daytona unavailable | `Sandbox task failed: {detail}` (logged) |
| Other failure | `Sandbox task failed: {detail}` |

The sandbox session is always closed at the end of the run. (A non-zero exit code is *not* an error — it's returned in `stdout` so the agent can diagnose and retry.)

## Computer Use vs Sandbox — when to use which

|  | [Computer Use](Computer-Use-Capabilities.md) | Sandbox |
|--|--------------|---------|
| **Interface** | Virtual desktop + browser (GUI) | Shell (CLI) |
| **Sees** | Screenshots | stdout/stderr + exit codes |
| **Best for** | GUI-only portals, web apps with no API, form filling, downloads | Data conversion, file processing, CLI tools, API calls via `curl` |
| **Agent mode** | Claude computer-use loop (click/type/screenshot) | Claude `run_command` loop |
| **Script mode** | Fixed actions (clicks/keys) — brittle on coordinates | Fixed shell script — robust |
| **Secrets** | `${SETTING}` (resolved server-side; script mode keeps them off the model) | `env` map → real env vars (kept off command string, logs, and model) |
| **Default agent iterations** | 40 | 20 |

**Rule of thumb:** if the task can be done with commands, prefer Sandbox (cheaper, more reliable). Use [Computer Use](Computer-Use-Capabilities.md) only when a real GUI is unavoidable. Within each, prefer **script mode** for stable, repeatable steps and **agent mode** when the task needs judgment or varies run to run.

## Related Topics

- [Capabilities](Capabilities.md) — what capabilities are and how they're used
- [Computer Use Capabilities](Computer-Use-Capabilities.md) — the GUI counterpart
- [Sandbox Execution](Sandbox-Execution.md) — the built-in, general-purpose `sandbox_exec` tool
- [Working with AI Agents](/Working-with-AI-Agents/) — assigning capabilities to an agent
