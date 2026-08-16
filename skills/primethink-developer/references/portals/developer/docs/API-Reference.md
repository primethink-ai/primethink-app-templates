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

Please be aware of the following rate limits when using the API:
- Free tier: 100 requests per day
- Pro tier: 1,000 requests per hour
- Enterprise tier: Custom limits available

## Need Help?

If you encounter any issues or have questions about the API, please contact our support team at [support@primethink.ai](mailto:support@primethink.ai) or visit our [community forum](https://community.primethink.ai).
