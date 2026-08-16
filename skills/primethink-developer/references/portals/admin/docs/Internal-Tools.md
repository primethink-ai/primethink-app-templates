# Internal Tools

**Internal tools** are the built-in tools your AI assistant uses on your behalf — reading a web page, generating an image, searching your documents, and many more. You don't call these tools directly; you ask your assistant in plain language ("read this page and summarize it") and it picks the right tool for the job.

This section gives each tool its own page with a closer look at what it does, when it's useful, and how to get the most out of it.

## How this relates to capabilities

Which tools an assistant can use is determined by the **capabilities** attached to its agent. The [Internal Capabilities](Internal-Capabilities.md) page is the catalog — it lists every internal capability (like `base`, `web_search`, or `documents`) and the tools each one provides.

The pages in this section zoom in on individual tools from that catalog. If a tool you want to use isn't available, check that the agent has the capability that provides it.

## Tool reference

| Tool | What it does | Provided by |
|------|--------------|-------------|
| [Read Content of URL](Read-Content-of-URL.md) | Fetches a web address and works with what's there — reading pages, returning text/data as-is, or saving files into your chat. | `base` |

More tool pages will be added here over time.

## Related Topics

- [Internal Capabilities](Internal-Capabilities.md) — the full catalog of built-in capabilities and their tools
- [Capabilities](Capabilities.md) — what capabilities are and how they're assigned
- [Working with AI Agents](/Working-with-AI-Agents/) — assigning capabilities to an agent
