# Collections

Collections are containers for organizing and managing groups of documents in PrimeThink. They support semantic search, metadata tagging, and can be shared across chats for knowledge retrieval.

## Overview

A collection groups related documents together and can be attached to one or more chats. When a collection is **indexed**, its documents are vectorized and available for semantic search (RAG). Collections also support custom metadata via the `extra` field, allowing you to store arbitrary JSON data alongside the collection.

## Collection Properties

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique collection ID |
| `name` | string | Collection name |
| `description` | string | Optional description |
| `uuid` | string | Collection UUID |
| `type` | string | Collection type (e.g., `"collection"`) |
| `public` | boolean | Whether the collection is publicly accessible to the group |
| `indexed` | boolean | Whether the collection is indexed for semantic search |
| `extra` | object\|null | Optional JSON object for custom metadata |
| `external_source_type` | string\|null | External source integration type |
| `external_source_value` | string\|null | External source reference value |
| `tags` | array | Array of tag objects |
| `status` | string | Collection status |
| `created_at` | string | ISO creation timestamp |
| `last_updated_at` | string | ISO last update timestamp |

## Indexing

The `indexed` field controls whether a collection's documents are vectorized and available for semantic search.

### Behavior

- **`indexed: false` (default):** Documents in the collection are stored but NOT searchable. Search endpoints return empty results. Document indexing tasks skip this collection.
- **`indexed: true`:** Documents are vectorized and available for semantic search via RAG. Setting `indexed` to `true` on an existing collection triggers a reindex of all its documents.

### When to Use

- Set `indexed: true` when you want the collection's documents to be searchable by the AI assistant or via the search API.
- Keep `indexed: false` for collections used purely as storage or when you want to control when documents become searchable (e.g., staging collections).

### Search Impact

When a collection has `indexed: false`:
- `POST /collections/{id}/search` returns `{ "indexed": false, "results": [] }`
- `POST /collections/{id}/search/images` returns `{ "indexed": false, "results": [] }`
- The collection is excluded from chat-level RAG search
- Reindex requests are rejected with a 409 error

## Custom Metadata (extra)

The `extra` field allows you to attach arbitrary JSON metadata to a collection. This is useful for:
- Tracking the source or origin of the collection
- Storing configuration or categorization data
- Adding application-specific metadata that your Live Apps can read

### Examples

```json
{
    "extra": {
        "source": "arxiv",
        "category": "machine-learning",
        "imported_at": "2024-03-15"
    }
}
```

```json
{
    "extra": {
        "department": "engineering",
        "project": "q2-roadmap",
        "priority": "high"
    }
}
```

The `extra` field is `null` when not set. It can be updated via the collection update endpoint.

## API Endpoints

For complete API specifications, see the [Interactive API Documentation](https://api.primethink.ai/pt-docs).

### Create Collection

```bash
curl -X POST "https://api.primethink.ai/collections?name=My%20Collection&indexed=true" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"extra": {"source": "manual", "category": "reports"}}'
```

**Query Parameters:**
- `name` (string, required): Collection name
- `description` (string, optional): Collection description
- `type` (string, optional): Collection type (default: `"collection"`)
- `public` (boolean, optional): Whether collection is public (default: `false`)
- `indexed` (boolean, optional): Whether to index for search (default: `false`)

**Body (optional):**
- `extra` (object): Custom JSON metadata

### Update Collection

```bash
curl -X PATCH "https://api.primethink.ai/collections/10" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "indexed": true,
    "extra": {"category": "updated-category"}
  }'
```

Setting `indexed` from `false` to `true` automatically triggers reindexing of all documents in the collection.

### Search Collection

```bash
curl -X POST "https://api.primethink.ai/collections/10/search?query=machine%20learning" \
  -H "Authorization: Token YOUR_API_KEY"
```

**Response when indexed:**
```json
{
    "indexed": true,
    "results": [
        { "text": "...", "metadata": { "source": "paper.pdf", "page": 3 } }
    ]
}
```

**Response when NOT indexed:**
```json
{
    "indexed": false,
    "results": []
}
```

## Using Collections in Live Pages

### List Collections

```javascript
const collections = await pt.listCollections();

// Filter to searchable collections
const searchable = collections.filter(c => c.indexed);

// Access custom metadata
collections.forEach(col => {
    if (col.extra) {
        console.log(`${col.name} source:`, col.extra.source);
    }
});
```

### Search Documents in Collections

```javascript
// Search documents (only works on indexed collections)
const results = await pt.searchDocuments('machine learning', 'collections');

// Search images in a specific collection
const images = await pt.searchImagesInCollection({
    collectionId: 10,
    query: 'product photos',
    topK: 5
});
```

### Get Documents in Collections

```javascript
const docs = await pt.getDocumentsInCollections([10, 15]);

// Access by collection ID
const col10Docs = docs['10'];
console.log(`Collection 10 has ${col10Docs.length} documents`);
```

## Related Topics

- [Data Management API](/admin/Data-Management-API/) - Complete pt.js API reference
- [Documents and Collections in Chats](Documents-and-Collections-in-Chats.md) - Managing documents in chats
- [Filtering and Querying](/admin/Filtering-and-Querying/) - Advanced query syntax
