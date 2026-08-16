# Third-party Integrations

PrimeThink agents connect to external services through several mechanisms, each suited to a different kind of integration. This page is a map of the options — each links to its full documentation.

## Ways to Integrate

| Mechanism | What it does | When to use it |
|---|---|---|
| [API Capabilities](/admin/API-Capabilities/) | Call any external REST API as an agent tool, with settings placeholders for secrets (`${API_KEY}`) | The service has an HTTP API and you want the agent to call it directly |
| [MCP Capabilities](/admin/MCP-Capabilities/) | Attach hosted Model Context Protocol servers (e.g. GitHub's official MCP server) | The service offers an MCP server, giving the agent a full tool suite at once |
| [Tool Plugins](/admin/Tool-Plugins/) | Custom tools with your own logic | You need behaviour beyond a single API call — validation, chaining, transformation |
| [Email Integration](Email-Integration.md) | Send and receive email from chats | Email-based workflows: intake, notifications, correspondence |
| [Computer Use Capabilities](/admin/Computer-Use-Capabilities/) | Let the agent operate a browser | The service has no API — the agent works through its web UI |

## Authentication and Secrets

Never hard-code credentials in a capability or tool configuration. Store secrets as [settings](/admin/Extra-Settings/) and reference them with `${SETTING_NAME}` placeholders — they're resolved at runtime from your user or group settings. See [Settings placeholders](/admin/API-Capabilities/#settings-placeholders-setting_name).

## Integrating from the Other Direction

If you want an external system to drive PrimeThink (rather than PrimeThink reaching out), use the [REST API](API-Reference.md) with [API key authentication](API-Auth.md), or embed PrimeThink in your site with the [Live Chat Widget](Implement-a-Live-Chat-Widget.md).
