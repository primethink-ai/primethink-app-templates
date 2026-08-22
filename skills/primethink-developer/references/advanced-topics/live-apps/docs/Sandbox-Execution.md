# Sandbox Execution

PrimeThink agents can execute shell commands in isolated, ephemeral sandboxes powered by [Daytona](https://www.daytona.io/). Each agent turn gets its own sandbox that is provisioned on demand and destroyed when the turn ends.

## Overview

The sandbox provides agents with a secure, isolated environment to:

- Run shell commands (bash, Python scripts, etc.)
- Install and use command-line tools
- Process files and data in a disposable environment
- Execute code without affecting the host system

### Key Properties

- **Ephemeral:** Each agent turn gets a fresh sandbox. Nothing persists between turns.
- **Isolated:** Concurrent agent turns (same chat, different chats) always get independent sandboxes and cannot share filesystem state.
- **Lazy provisioning:** The sandbox is only created on the first `sandbox_exec` call, not at agent invocation time. If the agent doesn't use the sandbox tool, no resources are consumed.
- **Auto-cleanup:** Sandboxes are destroyed when the agent turn ends. If that teardown ever fails to run, Daytona's auto-stop (default 15 min idle) and then auto-archive (default 7 days) reclaim the leftover sandbox — these intervals are backstops, not the normal lifecycle.

## How It Works

When the AI assistant uses the `sandbox_exec` tool:

1. **First call:** A Daytona sandbox is provisioned with a clean Ubuntu environment and a hidden ephemeral API key. The user is notified that the sandbox is starting.
2. **Subsequent calls:** The same sandbox is reused within the agent turn. Files and state from previous commands are still present.
3. **Turn ends:** The sandbox is destroyed and the ephemeral API key is disposed.

### In-Sandbox Environment

The sandbox comes pre-configured with these environment variables:

| Variable | Description |
|----------|-------------|
| `PT_BASE_URL` | PrimeThink API base URL |
| `PT_TOKEN` | Ephemeral API key for calling back into PrimeThink |
| `PT_GROUP_ID` | Current group ID |
| `PT_USER_ID` | Current user ID |
| `PT_CHAT_ID` | Current chat ID (when available) |
| `PT_TURN_ID` | Unique identifier for the current agent turn |

The ephemeral API key (`PT_TOKEN`) inherits the user's role at creation time, allowing in-sandbox tools to call the PrimeThink API with the user's own permissions (it cannot exceed them). It also uses that role's API rate-limit tier, but draws from its own per-key budget so sandbox calls do not consume the user's interactive-session budget.

!!! warning "Sandbox code acts with the user's authority"
    Because code the agent runs in the sandbox acts with this authority, only enable the Sandbox capability for agents and content you trust, and treat sandbox execution as part of your prompt-injection threat model.

## Usage

The sandbox is used by the AI assistant through natural conversation. Ask the assistant to run commands:

- "Run this Python script in a sandbox"
- "Install pandas and analyze this CSV data"
- "Execute `ls -la` in a sandbox"
- "Compile and run this C code"

### Tool Parameters

The `sandbox_exec` tool accepts:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `command` | string | required | Shell command to execute |
| `cwd` | string | sandbox home | Working directory for the command |
| `timeout_seconds` | integer | server default | Max seconds to wait (capped at server maximum) |

### Tool Response

The tool returns JSON:
```json
{
    "exit_code": 0,
    "stdout": "command output...",
    "truncated": false,
    "sandbox_id": "sb-abc123"
}
```

| Field | Description |
|-------|-------------|
| `exit_code` | Command exit code (0 = success) |
| `stdout` | Command output (stdout + stderr combined) |
| `truncated` | Whether output was truncated due to size limits |
| `sandbox_id` | Daytona sandbox identifier |

A non-zero `exit_code` indicates a command execution error, not a tool error — the assistant reads `stdout` to diagnose and fix the issue.

## Configuration

Sandbox settings can be configured at the environment, group, or user level. User settings override group settings, which override environment defaults.

| Setting | Default | Description |
|---------|---------|-------------|
| `DAYTONA_API_KEY` | — | Daytona API key (required, must be configured per group or user) |
| `DAYTONA_API_URL` | — | Daytona API endpoint URL |
| `DAYTONA_TARGET_REGION` | — | Target region for sandbox provisioning |
| `DAYTONA_DEFAULT_IMAGE` | `ubuntu:24.04` | Docker image for the sandbox |
| `DAYTONA_DEFAULT_USER` | `root` | Default user inside the sandbox |
| `DAYTONA_AUTO_STOP_MINUTES` | `15` | Idle minutes before Daytona auto-stops a sandbox that wasn't torn down (safety net; `0` disables) |
| `DAYTONA_AUTO_ARCHIVE_MINUTES` | `10080` (7 days) | Idle minutes before Daytona archives an already-**stopped** sandbox — a final backstop for the rare case where normal teardown didn't run |
| `SANDBOX_EXEC_DEFAULT_TIMEOUT_SECONDS` | `60` | Default command timeout |
| `SANDBOX_EXEC_MAX_TIMEOUT_SECONDS` | `600` | Maximum allowed command timeout |
| `SANDBOX_EXEC_MAX_OUTPUT_BYTES` | `100000` | Maximum output size before truncation |

### Enabling Sandboxes

To enable sandbox execution for a group:

1. Obtain a Daytona API key
2. Configure `DAYTONA_API_KEY` as a group-level setting (or user-level for individual access)
3. Assign the `sandbox` capability to the agent

## Security

- **Ephemeral API keys** are hidden from user-facing API key listings and are automatically disposed on sandbox teardown
- **Role inheritance** — the ephemeral key captures the user's current role, so sandbox commands cannot escalate privileges
- **Short-lived** — API keys exist only for the duration of a single agent turn (seconds to minutes)
- **Isolated execution** — each sandbox is a separate container with no access to the host system or other sandboxes

## Related Topics

- [Capabilities](Capabilities.md) - Managing agent capabilities
- [Working with AI Agents](/Working-with-AI-Agents/) - Agent configuration
- [Tool Plugins](Tool-Plugins.md) - Developing custom agent tools
