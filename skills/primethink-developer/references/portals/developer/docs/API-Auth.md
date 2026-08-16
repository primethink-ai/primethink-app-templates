# API: Auth

## Generating an API Key
In order to use the API, you will need to obtain an API key from the PrimeThink app. Go to `Settings > API Keys` and generate a new key.

## Using an API Key
To use the API, you will need to include the API key in the request header:

```text
Authorization: Token YOUR_API_KEY
```

The `Authorization` header is the only recommended way to authenticate.

In rare cases where setting the `Authorization: Token` header is technically impossible (for example, a legacy integration that cannot set request headers), the API key can be passed as a query parameter:

```text
?api_key=YOUR_API_KEY
```

!!! danger "Avoid query-parameter authentication"
    Passing API keys in the query string is unsafe and strongly discouraged: URLs are commonly retained in browser history, proxy and server logs, analytics, and `Referer` headers, where the key can leak. Use it only as a last resort when headers are unavailable, and rotate any key that has been exposed in a URL.
