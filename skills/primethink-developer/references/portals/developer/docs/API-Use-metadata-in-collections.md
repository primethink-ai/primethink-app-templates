# API: Use metadata in collections

When using collections via the api, it's possible to add metadata to the documents uploaded to the collection.

This will allow you to use the metadata to filter the documents within the collection when searching into the collection.

Example:

1. Upload a text document to the collection. The `metadata` field is a **JSON-encoded string** containing your custom fields:

```curl
curl -X "POST" "https://api.primethink.ai/api/v1/collections/<collection_id>/texts" \
     -H 'Authorization: Token YOUR_API_KEY' \
     -H 'Content-Type: application/json' \
     -d '[
  {
    "name": "My report",
    "text": "report text",
    "metadata": "{\"year\":\"2025\"}"
  }
]'
```

Here we have added a metadata field called "year" with the value "2025".

2. Now let's say we want to search only the 2025 reports in the collection. In the search request, custom metadata fields are passed inside the **`extra`** object (the top-level fields `document_id` and `document_name` are reserved for the corresponding built-in filters):

```curl
curl -X "POST" "https://api.primethink.ai/api/v1/collections/<collection_id>/search?query=<my_query>" \
     -H 'Authorization: Token YOUR_API_KEY' \
     -H 'Content-Type: application/json; charset=utf-8' \
     -d '{
  "extra": {
    "year": "2025"
  }
}'
```

Note the asymmetry: you **upload** custom fields via the `metadata` string, and you **search** them via the `extra` object. This is because the search body also accepts the built-in `document_id` / `document_name` filters at the top level, so custom fields are namespaced under `extra`.
