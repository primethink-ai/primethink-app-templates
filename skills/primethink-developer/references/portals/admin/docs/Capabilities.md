# Capabilities

**Capabilities** are how you extend what an agent can do. Each capability you attach to an agent gives it a new ability — searching the web, calling an external API, talking to a remote service, remembering things across chats, drawing on a Live Page, and more.

Most capabilities become **tools** the agent's underlying model can call mid-conversation. When you give an agent the "web search" capability, the model gains a search tool it can reach for when a question needs fresh information. When you give it an API capability pointing at your CRM, it can look up a customer record on demand.

## Why capabilities matter

Out of the box, an AI model can only talk. Capabilities are what turn an agent from a chatbot into something that can *act* — fetch live data, trigger actions in other systems, and work with your own tools.

Two things make them powerful in PrimeThink:

- **They're configuration, not code.** New integrations — an HTTP API, a remote MCP server, a browser automation — can be added and assigned to agents entirely through settings. No software release is needed to give your agents new abilities.
- **Everything lives in one place.** Built-in features (memory, web search, canvas, document search) are modeled as capabilities too, so the full set of things an agent can do is described consistently in a single list.

## How capabilities are used

1. **Definition.** A capability has a name, a description, a *type*, and a type-specific options blob holding its configuration. It also carries ownership and visibility — whether it's available to the whole system, a group, all users, or a single private owner.
2. **Assignment.** Capabilities are linked to one or more agents. The set of capabilities attached to an agent defines what that agent can do. You assign them from the agent's configuration screen — see the **Capabilities** section in [Working with AI Agents](/Working-with-AI-Agents/).
3. **Resolution at runtime.** When a chat runs, PrimeThink reads the agent's linked capabilities and turns each one into the appropriate tool(s). Some are conditional on the chat context — for example, canvas tools appear only on Live Pages, and memory is active only when global memory is enabled on a non-temporary chat.
4. **Binding.** The resulting tools are made available to the model, which can then call them as needed during the conversation.

## Capability types

| Type | What it adds | Configured from |
|------|--------------|-----------------|
| **internal** | Built-in platform features (memory, web search, canvas, document search, sub-chats, scheduled prompts, …) | Selected by code — no options needed; see [Internal Capabilities](Internal-Capabilities.md) |
| **api** | Calls an external HTTP(S) endpoint | An HTTP definition in *options* — see [API Capabilities](API-Capabilities.md) |
| **mcp** | Connects to a remote MCP server | A server config in *options* — see [MCP Capabilities](MCP-Capabilities.md) |
| **computer_use** | Drives a desktop or browser via automation | A prompt or scripted action list in *options* — see [Computer Use Capabilities](Computer-Use-Capabilities.md) |
| **sandbox** | Runs shell commands in an isolated sandbox | A prompt or script in *options* — see [Sandbox Capabilities](Sandbox-Capabilities.md) |

### internal — built-in platform features

Pre-built tools that ship with the platform, selected by code. These cover an agent's core abilities: memory, web search, canvas/Live App tools, sub-chats, document search (RAG), scheduled prompts, and similar. Several are enabled only when the chat supports them (for example, canvas tools require a Live Page; memory requires global memory on a non-temporary chat). No options are required — the platform knows which built-in tool to wire up from the capability's code. See [Internal Capabilities](Internal-Capabilities.md) for the full catalog.

### api — external HTTP APIs

Turns any HTTPS endpoint into a tool. You define the URL, the HTTP method, the typed parameters the model can fill in, and any static headers (which can carry secrets). At call time PrimeThink makes the request and returns the response to the model. Best for read/write integrations with third-party REST APIs. See [API Capabilities](API-Capabilities.md).

### mcp — remote MCP servers

Connects the agent to an already-deployed [Model Context Protocol](https://modelcontextprotocol.io/) server, exposing that server's tools to the model. You provide the server URL, an approval policy, and optional auth headers. Best for plugging in rich, multi-tool integrations maintained outside the platform. See [MCP Capabilities](MCP-Capabilities.md).

!!! warning "MCP runs on OpenAI and direct Anthropic models"
    Hosted MCP is executed by the model provider itself, so MCP capabilities take effect only when the agent's active model is OpenAI or direct Anthropic (`anthropic:...`). On direct Anthropic the capability must set an explicit `require_approval: "never"` and use Bearer-token auth — see [Running on Anthropic models](MCP-Capabilities.md#running-on-anthropic-claude-models). AWS Bedrock Claude (`bedrock:...`) does not provide Anthropic's hosted MCP connector; do not attach MCP capabilities to Bedrock agents because the provider can reject the request. Other unsupported providers skip the MCP capability with a warning.

### computer_use — desktop/browser automation

Defines a named automation the agent can invoke as a tool. It has two modes: an *agent* mode, where a natural-language prompt drives an automated desktop loop (the model emits actions, a sandbox executes them and returns screenshots, repeating until done); and a *script* mode, where a fixed list of actions (clicks, typing, keypresses) runs deterministically without an LLM. Best for automating web portals and GUI apps that have no API. See [Computer Use Capabilities](Computer-Use-Capabilities.md).

### sandbox — scripted/agentic shell execution

The command-line counterpart to `computer_use`: instead of a desktop, it runs commands in an isolated shell sandbox. *Agent* mode lets an automated loop script a task and iterate on the output; *script* mode runs a fixed shell script once with no LLM. Best for data conversion, file processing, and CLI-driven tasks. See [Sandbox Capabilities](Sandbox-Capabilities.md).

## Putting it together: an accounts-payable agent

Different capability types shine at different jobs, and a single agent can combine several. Consider an agent that processes supplier invoices end to end each month:

1. **Get the invoice — [Computer Use](Computer-Use-Capabilities.md).** The supplier's billing portal has no API, so a `computer_use` capability logs into the portal in a virtual browser and downloads the latest invoice PDF.
2. **Save it — `documents` ([internal](Internal-Capabilities.md)).** The built-in `save_document` tool stores the PDF in the chat's document tree.
3. **Parse it — [Sandbox](Sandbox-Capabilities.md).** A `sandbox` capability runs `pdftotext` and a small script to pull the line items and total into clean JSON.
4. **Record it — [API](API-Capabilities.md).** An `api` capability POSTs the parsed invoice to your accounting system's REST endpoint, with the API key supplied via a `${SETTING}` placeholder.
5. **Report back — `base` ([internal](Internal-Capabilities.md)).** `notify_user` keeps the user posted, and `send_push_notification_to_user` pings them when an invoice needs manual review.

The lesson: reach for the **simplest type that does the job** — an API when one exists, a sandbox for data work, and Computer Use only when a GUI is unavoidable. The [internal](Internal-Capabilities.md) tools glue the steps together.

## Cross-cutting behaviors

A few things apply to the externally-configured types (**api**, **mcp**, **computer_use**, **sandbox**):

### Secrets via placeholders

Never hard-code secrets. Any string in a capability's options can contain `${SETTING_NAME}` placeholders, which are resolved at runtime from your user or group settings. For example, an API key is stored as a setting and referenced as `"Authorization": "Bearer ${WEATHER_API_KEY}"`. See [Settings placeholders](API-Capabilities.md#settings-placeholders-setting_name) for details.

### Resilient building

If a single capability fails to build — bad config, a missing secret — it is logged and skipped. It won't break the rest of the agent; that agent simply won't have that one tool.

### Flat-editor friendly

Because the capability editor stores options as flat name/value pairs, nested structures can be expressed with dot-notation keys (for example `params.location.type`), which are automatically expanded into nested JSON. See [Dot-notation keys](API-Capabilities.md#dot-notation-keys).

## Ownership and visibility

Every capability carries an **access type** that controls who can see and use it:

| Access type | Visibility |
|-------------|------------|
| `system` | Available across all groups |
| `group` | Available within a specific group |
| `user` | Available to all users |
| `private` | Available only to the single owner |

Archived capabilities are excluded everywhere.

## Related Topics

- [Internal Capabilities](Internal-Capabilities.md) — the built-in tool catalog
- [API Capabilities](API-Capabilities.md) — turn any HTTP endpoint into a tool
- [MCP Capabilities](MCP-Capabilities.md) — connect a remote MCP server
- [Computer Use Capabilities](Computer-Use-Capabilities.md) — drive a desktop/browser via automation
- [Sandbox Capabilities](Sandbox-Capabilities.md) — run a configured shell automation
- [Sandbox Execution](Sandbox-Execution.md) — the built-in, general-purpose `sandbox_exec` tool
- [Working with AI Agents](/Working-with-AI-Agents/) — assigning capabilities to an agent
- [Tool Plugins](Tool-Plugins.md) — for developers building custom internal tools
