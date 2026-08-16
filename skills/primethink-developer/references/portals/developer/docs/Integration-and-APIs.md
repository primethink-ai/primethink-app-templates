# Integration and APIs

PrimeThink can be integrated with external systems in both directions: external applications can call PrimeThink's REST API, and PrimeThink agents can reach out to external services through capabilities, tool plugins, and MCP servers.

## Calling PrimeThink from Outside

- **[API Reference](API-Reference.md)** — Overview of the REST API, with the [OpenAPI specification](https://api.primethink.ai/pt-openapi.json) and [interactive docs](https://api.primethink.ai/pt-docs).
- **[API Auth](API-Auth.md)** — Generating an API key and authenticating requests (`Authorization: Token YOUR_API_KEY`).
- **[API Examples](API-Examples.md)** — Working request examples for common operations.
- **Media APIs** — [Image Generation](Image-Generation-API.md), [Audio Generation](Audio-Generation-API.md), [Audio Diarization](Audio-Diarization-API.md), and [Video Analysis](Video-Analysis-API.md).
- **[PrimeThink CLI](PrimeThink-CLI.md)** — Command-line access to the platform.
- **[Agent Extra Metadata](Agent-Extra-Metadata.md)** and **[API Metadata in Collections](API-Use-metadata-in-collections.md)** — Attaching and using metadata programmatically.

## Connecting PrimeThink to External Services

- **[Third-party Integrations](Third-party-Integrations.md)** — Overview of the ways agents connect to outside services.
- **[Email Integration](Email-Integration.md)** — Sending and receiving email from chats.

## Building Inside the Platform

For the JavaScript API available inside Live Apps and Live Pages (`pt.*`), see the [Data Management API](/admin/Data-Management-API/) and the rest of the Live Pages section.
