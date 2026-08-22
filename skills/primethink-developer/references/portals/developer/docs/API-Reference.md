# API Reference

## Overview
The PrimeThink API provides programmatic access to PrimeThink's capabilities, allowing developers to integrate AI-powered features into their applications. This reference provides the resources you need to understand and work with our API.

## API Documentation Resources

- **OpenAPI Specification**: [https://api.primethink.ai/pt-openapi.json](https://api.primethink.ai/pt-openapi.json)
- **Interactive API Documentation**: [https://api.primethink.ai/pt-docs](https://api.primethink.ai/pt-docs)

## Authentication

API requests require authentication using an API key. You can obtain your API key from the PrimeThink app under `Settings > API Keys`.

Include your API key in the request header using the `Token` scheme:
```
Authorization: Token YOUR_API_KEY
```

See [API: Auth](API-Auth.md) for details. (A query-parameter fallback exists for rare legacy cases where headers cannot be set, but it is strongly discouraged because URLs leak keys into logs, browser history, and `Referer` headers.)

## Rate Limits

API-key-authenticated requests use a fixed-window budget for each key and group. The role assigned to the key selects the tier; separate API keys do not consume one another's budgets.

The default 60-second limits are:

| API key role | `GET` requests | `POST`/`PUT`/`PATCH`/`DELETE` requests |
|---|---:|---:|
| User or a custom role without its own tier | 600 | 120 |
| Group Admin | 1,200 | 240 |

Read and write budgets are independent. `HEAD` and `OPTIONS` requests are not metered. Deployments can configure different limits and window lengths.

When a budget is exhausted, the API returns HTTP `429 Too Many Requests`:

```json
{
  "detail": "Rate limit exceeded"
}
```

The response includes `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining` headers. Wait for the indicated `Retry-After` interval before retrying; immediate retry loops continue consuming requests without succeeding. If the rate-limit store is temporarily unavailable, authenticated API traffic is allowed rather than failing authentication.

## Need Help?

If you encounter any issues or have questions about the API, please contact our support team at [support@primethink.ai](mailto:support@primethink.ai) or visit our [community forum](https://community.primethink.ai).
