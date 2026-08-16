# Security and Privacy

PrimeThink is designed around strict separation between groups, role-based control inside them, and explicit authentication at every access point. This page summarises the security model; linked pages carry the details.

## Account Security

- **Login** requires the account email and password; the login page is protected by reCAPTCHA.
- **Email verification** — accounts must verify their email address. Unverified users can log in during a grace period (default 3 days); after that, login is blocked until verification. See [Email Verification](Email-Verification.md).
- **Sessions** use short-lived signed tokens (JWT) carrying the user, group, and expiration.

## Encryption

All data is encrypted **in transit** (TLS) and **at rest**.

## Group Isolation

Each group is a self-contained tenant: members and roles, chats, documents, collections, settings, and configured AI assistants all live inside the group, and one group's data is never visible from another. Chat databases are additionally scoped per group at the storage level. See [Group Management](/admin/Group-Management/).

## Access Control

- **Role-based permissions** — Group Admins assign roles; each role carries permissions that gate features such as LLM invocation and direct tool calls. See [Roles and Permissions](/admin/Roles-and-Permissions/).
- **Chat membership** — chat content and chat-root files require both authentication and membership in the chat.
- **Document tiers** — file access follows the storage hierarchy: `@public` (no auth, deliberately public), `@liveapp` (authentication + group membership), and chat root (authentication + chat membership). Never store sensitive data in `@public`. See [File Storage Hierarchy](File-Storage-Hierarchy.md).

## API and Integration Security

- **API keys** authenticate REST API access via `Authorization: Token YOUR_API_KEY`; keys are generated per-user under `Settings > API Keys` and can be regenerated. See [API Auth](/developer/API-Auth/).
- **Live Apps** authenticate to the platform with per-chat scoped tokens and CSRF tokens — never with user credentials.
- **Secrets in integrations** are never hard-coded: API keys for external services are stored as settings and referenced with `${SETTING_NAME}` placeholders, resolved server-side at runtime. See [Capabilities](/admin/Capabilities/).
- **Query safety** — chat-DB filtering uses parameterized queries to prevent SQL injection, with server-side validation of filter fields and values, and rate limiting on complex queries. See [Filtering and Querying](/admin/Filtering-and-Querying/).

## AI Providers and Your Data

Messages and documents that an AI assistant processes are sent to the configured model provider (for example OpenAI or Anthropic) to generate responses. Hosted MCP capabilities execute at the model provider as well. Choose models and capabilities with this data flow in mind — group admins control which agents (and therefore which models) are configured, and role permissions govern whether users can invoke LLMs and call tools directly.
