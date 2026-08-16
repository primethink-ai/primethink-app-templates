# Agent `extra` Metadata

Each `VirtualAssistant` row has an optional `extra` JSON column that stores per-agent configuration flags. Keys not listed below are ignored.

---

## Schema

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `AGENT_STREAMING` | `bool` | `true` | Controls whether the agent streams partial tokens over the websocket during `background_stream`. |

---

## Behavior

- Streaming is **enabled by default**. It is disabled **only** when the key is present and explicitly set to `false`.
- Any non-boolean value (string, number, null, missing key) is treated as enabled.
- When `extra` itself is not a JSON object (e.g., `null` or a non-dict), streaming defaults to enabled.
- The flag is AND-ed with the request's `websocket_notifications`: tokens are emitted only if both are true.

---

## Example

Disable streaming for a specific agent:

```json
{
  "AGENT_STREAMING": false
}
```

---

!!! info "Adding new keys"
    When new `extra` keys are added, append a row to the schema table above and keep the constant name, default, and behavior columns consistent.
