# Data Management API Reference

## Overview

Live Pages use a powerful JavaScript library (`pt`) that provides database-like operations for managing data. The library is automatically initialized and provides simple CRUD operations with server-side filtering.

## Live App Rate Limits

Requests authenticated with the same Live App scoped token share one fixed-window budget. By default, one token can make **600 requests per 60 seconds**. Reads, writes, action calls, uploads, and asset requests draw from the same budget rather than separate method-specific limits. A deployment can change the limit, window, or whether scoped-token metering is enabled.

When the budget is exhausted, PrimeThink returns HTTP `429 Too Many Requests`:

```json
{
  "detail": "Rate limit exceeded"
}
```

Use the response headers rather than parsing `detail`:

- `Retry-After` — seconds until requests can be attempted again.
- `X-RateLimit-Limit` — the configured request ceiling for the window.
- `X-RateLimit-Remaining` — `0` when the request is rejected.

Wait for `Retry-After` before retrying. Do not use an immediate retry loop, and avoid repeatedly reloading a Live App because each refresh can request multiple assets.

## Complete API Reference

The PrimeThink API provides a complete set of operations for managing entities and chat context:

| Operation       | Method                            | Description                          | Performance |
|-----------------|-----------------------------------|--------------------------------------|-------------|
| **Create**      | `pt.add(entityName, data)`        | Add new entity                       | Fast        |
| **Batch Create** | `pt.batchAdd(entityName, dataArray)` | Create multiple entities in one request | Fast |
| **Read (one)**  | `pt.get(entityId)`                | Get single entity by ID              | Very Fast (Primary Key) |
| **Read (many)** | `pt.list(options)`                | Query multiple entities with filters | Fast (Indexed) |
| **Update**      | `pt.edit(entityId, data, merge)`  | Update existing entity               | Fast        |
| **Batch Update** | `pt.batchEdit(items)`            | Update multiple entities in one request | Fast |
| **Delete**      | `pt.delete(entityId)`             | Remove entity                        | Fast        |
| **Batch Delete** | `pt.batchDelete(ids)`            | Delete multiple entities             | Fast |
| **Members**     | `pt.getChatMembers()`             | Get chat members (users & agents)    | Fast        |
| **Chat Info**   | `pt.getChatInfo()`                | Get current chat information         | Fast        |
| **Rename Chat** | `pt.renameChat(newName)`          | Rename the current chat              | Fast        |
| **User Role**   | `pt.getUserRole()`                | Get current user's role and permissions | Fast        |
| **Mentions**    | `pt.getAvailableMentions()`       | Get mentionable entities (users, assistants, chats, tasks) | Fast |
| **Chat Messages** | `pt.addMessage(message)`        | Add text message to chat (for AI generation, use [fire-and-forget pattern](Live-Pages-Best-Practices.md#async-fire-and-forget-pattern-for-ai-generation)) | Fast        |
| **Message Text** | `pt.getMessageText(messageId)`   | Get message text by ID               | Fast        |
| **Chat Messages** | `pt.getChatMessages(options?)`  | Fetch paginated chat message history  | Fast        |
| **Message Received** | `pt.onMessageReceived(taskId, callback)` | Subscribe to AI response for a task | Fast |
| **Wait for Message** | `pt.waitForMessageReceived(taskId, options)` | Promise-based wait for AI response | Fast |
| **Wait for All Messages** | `pt.waitForAllMessagesReceived(taskIds, options)` | Wait for multiple AI responses | Fast |
| **Document Changed** | `pt.onDocumentChanged(callback, options)` | Subscribe to document processing events | Fast |
| **Entity Changed** | `pt.onEntityChanged(callback, options)` | Subscribe to chat-DB change events — see [Real-Time Data Sync](Real-Time-Data-Sync.md) | Fast |
| **Wait for Document** | `pt.waitForDocumentReady(documentId, options)` | Promise-based wait for document processing | Fast |
| **Wait for All Documents** | `pt.waitForAllDocumentsReady(documentIds, options)` | Wait for multiple documents to be ready | Fast |
| **Stop Streaming** | `pt.stopStreamingMessage(streamingTaskId)` | Stop a streaming AI response | Fast |
| **File Upload** | `pt.uploadFiles(form, folder?, documentName?, attachmentMode?)` | Upload files with optional folder, custom name, and attachment mode | Fast        |
| **Notifications** | `pt.sendNotification(userId, title, text, options?)` | Send notification to user | Fast |
| **Document Search** | `pt.searchDocuments(query, scope, documentIds)` | Search documents and collections using RAG | Fast |
| **Document Read** | `pt.getDocumentText(docId, options)` | Get document text content | Fast |
| **Document Status** | `pt.getDocumentStatus(docId)` | Check document processing status | Fast |
| **Document Info** | `pt.getDocumentInfo(documentPath)` | Get document metadata by path | Fast |
| **Document Info by ID** | `pt.getDocumentInfoById(documentId)` | Get document metadata by document ID | Fast |
| **Document Create** | `pt.saveDocument(filename, format, mimetype, content, folder, attachmentMode?)` | Create and save document | Fast |
| **Document Delete** | `pt.deleteDocuments(documentIds)` | Bulk delete documents from chat | Fast |
| **Document Download** | `pt.downloadDocuments(documentIds, asZip)` | Download one or more documents | Fast |
| **Directory Navigation** | `pt.listDirectory(path)` | List contents of a directory path | Fast |
| **Collections List** | `pt.listCollections()` | Get all collections in chat | Fast |
| **Collections Docs** | `pt.getDocumentsInCollections(collectionIds)` | Get documents in specified collections | Fast |
| **Image Search** | `pt.searchImagesInCollection(options)` | Search images in a collection by image or text | Fast |
| **Audio Diarization** | `pt.diarizeAudio(options)` | Transcribe audio with speaker diarization | Fast |
| **Speech-to-Text Token** | `pt.sttStreamToken()` | Get ElevenLabs Scribe token for realtime STT | Fast |

## Available Methods

### pt.list(options)

List entities with optional server-side filtering, pagination, and multiple entity types.

**Parameters:**
- `entityNames`: Array of entity types to include (e.g., `['user', 'product']`)
- `filters`: Object with field-value pairs for server-side filtering
- `limit`: Maximum number of results to return (default: 100, max: 1000)
- `offset`: Number of results to skip for pagination (default: 0)
- `page`: Page number for page-based pagination (1-indexed, mutually exclusive with offset)
- `pageSize`: Items per page for page-based pagination (mutually exclusive with limit)
- `returnMetadata`: Set to `true` to return pagination metadata along with entities

**Basic Usage:**
```javascript
// List entities with filters
const users = await pt.list({
    entityNames: ['user', 'product'],
    filters: {
        status: 'active',
        age: { $gte: 18 }
    },
    limit: 10,
    offset: 0
});

// List multiple entity types
const entities = await pt.list({
    entityNames: ['task', 'event', 'user'],
    filters: { status: 'active' }
});

// Process results
const tasks = entities.filter(e => e.entity_name === 'task');
const events = entities.filter(e => e.entity_name === 'event');
const users = entities.filter(e => e.entity_name === 'user');
```

**Response Structure:**
```javascript
// Without metadata (default)
[
    {
        id: 123,
        entity_name: 'task',
        data: { text: 'Buy groceries', completed: false },
        creator_user_id: 456,
        created_at: '2024-03-15T10:30:00+00:00',
        updated_at: '2024-03-15T10:35:00+00:00'
    },
    // ... more entities
]

// With metadata (returnMetadata: true)
{
    entities: [...],    // Array of entity objects
    count: 20,          // Number of items in this response
    pagination: {
        limit: 20,      // Items requested
        offset: 40,     // Starting position
        has_more: true, // true if full page returned (more likely exists)
        page: 3,        // Current page (if page-based)
        page_size: 20   // Items per page (if page-based)
    }
}
```

### pt.get(entityId)

Retrieve a single entity by its ID. This method performs a direct primary key lookup, which is much faster and more semantic than using `pt.list()` with filters.

**Parameters:**
- `entityId`: Numeric ID of the entity to retrieve

**Usage:**
```javascript
// Get entity by ID
const task = await pt.get(123);
console.log(task.data.text);
console.log(task.created_at);

// Get and edit pattern (using merge mode)
const task = await pt.get(123);
await pt.edit(123, {
    completed: !task.data.completed
}, true);
```

**Error Handling:**
```javascript
try {
    const task = await pt.get(123);
    console.log('Found:', task.data);
} catch (error) {
    console.error('Entity not found or unauthorized:', error);
}
```

**When to use pt.get():**
- When you know the entity ID
- For direct lookups (much faster than filtering)
- Before editing an entity to get current state

### pt.add(entityName, data)

Create a new entity.

**Parameters:**
- `entityName`: String identifying the entity type
- `data`: Object containing the entity data

**Usage:**
```javascript
// Add a task
const result = await pt.add('task', {
    text: 'Buy groceries',
    completed: false
});

// Add an event
const event = await pt.add('event', {
    title: 'Team Meeting',
    date: '2024-03-20',
    time: '14:00',
    description: 'Weekly sync'
});

// The creator_user_id is automatically set to the current user
console.log(result.creator_user_id); // Automatically populated
```

**Important Notes:**
- `created_at` and `updated_at` are automatically managed
- `creator_user_id` is automatically set to the current user
- Don't include these fields in your data object

### pt.batchAdd(entityName, dataArray)

Create multiple entities in a single request. Each item is inserted individually with its own per-item result — some items can succeed while others fail, so always check the `success` field of each result.

**Parameters:**
- `entityName`: String identifying the entity type for all entities
- `dataArray`: Array of data objects to create

**Returns:** Array of result objects, one for each item in `dataArray`:

```javascript
[
    {
        success: true,
        entity: {
            id: 1,
            entity_name: 'task',
            creator_user_id: 42,
            data: { title: 'Task 1' },
            created_at: '2025-01-20T10:00:00Z',
            updated_at: '2025-01-20T10:00:00Z'
        },
        error: null,
        index: 0
    },
    {
        success: false,
        entity: null,
        error: {
            message: 'Validation failed',
            type: 'ValidationError'
        },
        index: 1
    }
]
```

**Usage:**

```javascript
// Create multiple tasks at once
const results = await pt.batchAdd('task', [
    { text: 'Buy groceries', completed: false },
    { text: 'Call dentist', completed: false },
    { text: 'Review PR', completed: false }
]);

// Check results
const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

console.log(`Created ${successful.length} tasks`);
if (failed.length > 0) {
    console.log(`Failed to create ${failed.length} tasks`);
    failed.forEach(f => console.error(`Item ${f.index}: ${f.error.message}`));
}

// Import data from CSV or API
async function importUsers(userData) {
    const results = await pt.batchAdd('user', userData);

    return {
        imported: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        errors: results.filter(r => !r.success).map(r => ({
            index: r.index,
            error: r.error.message
        }))
    };
}

// Bulk data entry
async function bulkAddProducts(products) {
    try {
        const results = await pt.batchAdd('product', products);

        // Get IDs of successfully created products
        const createdIds = results
            .filter(r => r.success)
            .map(r => r.entity.id);

        return createdIds;
    } catch (error) {
        console.error('Batch add failed:', error);
        return [];
    }
}
```

**When to Use:**
- Importing data from CSV, JSON, or external APIs
- Bulk data entry operations
- Seeding initial data
- Processing form submissions with multiple items
- More efficient than multiple `pt.add()` calls

**Important Notes:**
- Semantics are per-item, not all-or-nothing: if an item fails, its `success` will be `false` but other items may still succeed
- Check the `success` field for each result
- The `index` field corresponds to the position in the input array
- Much more efficient than calling `pt.add()` multiple times

### pt.edit(entityId, data, merge, ifUnchangedSince)

Update an existing entity. By default, this method **replaces all data** in the entity. Use the `merge` parameter to preserve existing fields and `ifUnchangedSince` for optimistic locking.

**Parameters:**
- `entityId`: Numeric ID of the entity to update
- `data`: Object containing the new entity data
- `merge`: (Optional) If `true`, merges with existing data; if `false`, replaces entirely (default: `false`)
- `ifUnchangedSince`: (Optional) ISO timestamp string for optimistic locking. Update only succeeds if entity hasn't been modified since this timestamp

**Returns:**
- **Success**: Updated entity object
- **Conflict** (when using `ifUnchangedSince`): Object with `conflict: true` and `currentEntity` showing the current state

**Usage:**

**Replace Mode (default):**
```javascript
// Get current data first to preserve fields
const task = await pt.get(taskId);

// Update with merged data manually
const updated = await pt.edit(taskId, {
    ...task.data,
    completed: true
});
```

**Merge Mode (recommended for partial updates):**
```javascript
// Only update specific fields - other fields are preserved automatically
const updated = await pt.edit(taskId, {
    completed: true
}, true);

// Update multiple fields without fetching first
await pt.edit(taskId, {
    status: 'in_progress',
    priority: 'high'
}, true);

// Toggle a field using merge mode
async function toggleTaskCompletion(taskId) {
    const task = await pt.get(taskId);
    await pt.edit(taskId, {
        completed: !task.data.completed
    }, true);
}
```

**Optimistic Locking (Conflict Prevention):**

Use `ifUnchangedSince` to prevent overwriting changes made by other users:

```javascript
// Fetch entity with its timestamp
const task = await pt.get(taskId);

// User edits the task...
// Meanwhile, another user might also be editing it

// Try to save with optimistic locking
const result = await pt.edit(
    taskId,
    {
        ...task.data,
        status: 'completed'
    },
    false,  // replace mode — the full data object is provided above
    task.updated_at  // Only update if not modified since this timestamp
);

// Handle conflicts
if (result.conflict) {
    // Another user modified this task
    console.log('Conflict detected!');
    console.log('Your version:', task.data);
    console.log('Current version:', result.currentEntity.data);

    // Show conflict resolution UI to user
    showConflictDialog(task.data, result.currentEntity.data);
} else {
    // Update successful
    console.log('Task updated successfully');
}

// Real-world conflict handling example
async function safeEdit(taskId, updates) {
    const task = await pt.get(taskId);

    try {
        const result = await pt.edit(
            taskId,
            { ...task.data, ...updates },
            false,
            task.updated_at
        );

        if (result.conflict) {
            // Let user decide how to resolve
            const userChoice = await askUser(
                'This task was modified by someone else. What would you like to do?',
                ['Use my changes', 'Use their changes', 'Merge manually']
            );

            if (userChoice === 'Use my changes') {
                // Force update without timestamp check
                return await pt.edit(taskId, { ...task.data, ...updates });
            } else if (userChoice === 'Merge manually') {
                // Show merge interface
                return await showMergeInterface(task.data, result.currentEntity.data, updates);
            } else {
                // Keep their changes
                return result.currentEntity;
            }
        }

        return result;
    } catch (error) {
        console.error('Edit failed:', error);
        throw error;
    }
}
```

**When to use each mode:**

| Mode | Use Case |
|------|----------|
| Replace (`merge: false`) | When you want to completely overwrite all entity data |
| Merge (`merge: true`) | When updating specific fields while preserving others |

**When to use optimistic locking:**
- Multi-user editing scenarios
- Long-running edit sessions
- Critical data updates
- Preventing accidental overwrites

**Warning:** Without merge mode, always spread existing data to avoid losing fields:
```javascript
// ❌ BAD: This removes all other fields (replace mode)
await pt.edit(123, { completed: true });

// ✅ GOOD: Use merge mode for partial updates
await pt.edit(123, { completed: true }, true);

// ✅ ALSO GOOD: Manually merge with existing data
const task = await pt.get(123);
await pt.edit(123, {
    ...task.data,
    completed: true
});
```

### pt.batchEdit(items)

Update multiple entities in a single request. Each item can have different update settings.

**Parameters:**
- `items`: Array of edit item objects

**Item Structure:**
```javascript
{
    id: number,                    // Entity ID (required)
    data: object,                  // New data (required)
    merge: boolean,                // Merge mode (optional, default: false)
    if_unchanged_since: string     // ISO timestamp for optimistic locking (optional)
}
```

**Returns:** Array of result objects, one for each item:

```javascript
[
    {
        success: true,
        entity: {
            id: 1,
            entity_name: 'task',
            data: { title: 'Updated Task', completed: true },
            created_at: '2025-01-20T10:00:00Z',
            updated_at: '2025-01-20T11:00:00Z'
        },
        conflict: false
    },
    {
        success: false,
        conflict: true,
        currentEntity: {
            id: 2,
            entity_name: 'task',
            data: { title: 'Already modified by someone else' },
            created_at: '2025-01-20T10:00:00Z',
            updated_at: '2025-01-20T10:45:00Z'  // Changed since our if_unchanged_since
        }
    }
]
```

**Usage:**

```javascript
// Bulk status update
const taskIds = [1, 2, 3, 4, 5];
const results = await pt.batchEdit(
    taskIds.map(id => ({
        id: id,
        data: { completed: true },
        merge: true  // Preserve other fields
    }))
);

console.log(`Updated ${results.filter(r => r.success).length} tasks`);

// Update multiple items with different values
const updates = [
    { id: 1, data: { status: 'completed', priority: 'low' }, merge: true },
    { id: 2, data: { status: 'in_progress', priority: 'high' }, merge: true },
    { id: 3, data: { status: 'pending', priority: 'medium' }, merge: true }
];

const results = await pt.batchEdit(updates);

// Handle conflicts
results.forEach((result, index) => {
    if (result.conflict) {
        console.warn(`Item ${index} has conflict:`, result.currentEntity);
        // Show conflict resolution UI to user
    } else if (!result.success) {
        console.error(`Item ${index} failed to update`);
    }
});

// Optimistic locking for batch updates
async function safeBatchUpdate(entities) {
    const items = entities.map(entity => ({
        id: entity.id,
        data: { status: 'archived' },
        merge: true,
        if_unchanged_since: entity.updated_at
    }));

    const results = await pt.batchEdit(items);

    // Separate successful updates and conflicts
    const successful = results.filter(r => r.success && !r.conflict);
    const conflicts = results.filter(r => r.conflict);

    return { successful, conflicts };
}

// Bulk field update with validation
async function bulkUpdatePriority(taskIds, newPriority) {
    // Fetch all tasks first to preserve other fields
    const tasks = await Promise.all(
        taskIds.map(id => pt.get(id))
    );

    // Prepare updates
    const items = tasks.map(task => ({
        id: task.id,
        data: {
            ...task.data,
            priority: newPriority,
            last_modified_by: 'admin'
        }
    }));

    const results = await pt.batchEdit(items);

    return {
        updated: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
    };
}
```

**When to Use:**
- Bulk status changes (mark multiple items as complete, archive, etc.)
- Mass updates based on filters or selection
- Synchronizing data from external sources
- Batch operations in admin panels
- More efficient than multiple `pt.edit()` calls

**Important Notes:**
- Each item can have its own `merge` setting
- Use `if_unchanged_since` for optimistic locking to prevent overwriting changes
- Check both `success` and `conflict` fields in results
- The `index` field in results corresponds to the input array position
- When conflicts occur, `currentEntity` shows the current database state
- More efficient than individual `pt.edit()` calls

### pt.delete(entityId)

Remove an entity from the database.

**Parameters:**
- `entityId`: Numeric ID of the entity to delete

**Usage:**
```javascript
// Simple delete
async function deleteTask(taskId) {
    try {
        await pt.delete(taskId);
        console.log('Task deleted successfully');
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

// Delete with confirmation
async function deleteTaskSafely(taskId) {
    try {
        const task = await pt.get(taskId);

        if (confirm(`Delete task: "${task.data.text}"?`)) {
            await pt.delete(taskId);
            console.log('Task deleted successfully');
        }
    } catch (error) {
        alert('Task not found or already deleted');
    }
}

// Bulk delete
async function bulkDeleteTasks(taskIds) {
    const results = [];

    for (const id of taskIds) {
        try {
            await pt.delete(id);
            results.push({ id, success: true });
        } catch (error) {
            results.push({ id, success: false, error: error.message });
        }
    }

    return results;
}
```

### pt.batchDelete(ids)

Delete multiple entities in a single request.

**Parameters:**
- `ids`: Array of entity IDs to delete (numeric IDs)

**Returns:** Array of result objects, one for each ID:

```javascript
[
    {
        id: 1,
        success: true,
        error: null
    },
    {
        id: 2,
        success: false,
        error: "Entity not found"
    }
]
```

**Usage:**

```javascript
// Delete multiple tasks
const taskIds = [1, 2, 3, 4, 5];
const results = await pt.batchDelete(taskIds);

// Check results
const deleted = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

console.log(`Deleted ${deleted.length} tasks`);
if (failed.length > 0) {
    console.warn(`Failed to delete ${failed.length} tasks`);
    failed.forEach(f => console.error(`ID ${f.id}: ${f.error}`));
}

// Clean up old completed tasks
async function archiveCompletedTasks() {
    // Get completed tasks older than 30 days
    const oldTasks = await pt.list({
        entityNames: ['task'],
        filters: {
            completed: true,
            completed_date: { $lt: '2024-12-20' }
        }
    });

    if (oldTasks.length === 0) {
        return { deleted: 0 };
    }

    const ids = oldTasks.map(t => t.id);
    const results = await pt.batchDelete(ids);

    return {
        deleted: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
    };
}

// Delete with user confirmation
async function deleteSelectedItems(selectedIds) {
    if (selectedIds.length === 0) {
        alert('No items selected');
        return;
    }

    if (!confirm(`Delete ${selectedIds.length} items? This cannot be undone.`)) {
        return;
    }

    const results = await pt.batchDelete(selectedIds);

    const successCount = results.filter(r => r.success).length;
    alert(`Deleted ${successCount} of ${selectedIds.length} items`);

    await loadData(); // Refresh the list
}

// Bulk cleanup with error handling
async function bulkDelete(entityName, filters) {
    try {
        // Get entities to delete
        const entities = await pt.list({
            entityNames: [entityName],
            filters: filters
        });

        if (entities.length === 0) {
            return { message: 'No entities found matching criteria' };
        }

        // Delete them
        const ids = entities.map(e => e.id);
        const results = await pt.batchDelete(ids);

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        return {
            total: entities.length,
            deleted: successful.length,
            failed: failed.length,
            errors: failed.map(f => ({ id: f.id, error: f.error }))
        };
    } catch (error) {
        console.error('Bulk delete failed:', error);
        return { error: error.message };
    }
}

// Usage example
const result = await bulkDelete('task', {
    status: 'archived',
    archived_date: { $lt: '2024-01-01' }
});

console.log(result);
// { total: 150, deleted: 148, failed: 2, errors: [...] }
```

**When to Use:**
- Bulk cleanup operations
- Deleting multiple selected items
- Archiving old data
- Cascading deletes based on filters
- More efficient than multiple `pt.delete()` calls

**Important Notes:**
- Each delete operation is independent
- If one delete fails, others will still be attempted
- Check the `success` field for each result
- Failed deletes include an `error` message explaining why
- Always confirm with users before bulk deletes
- Consider archiving instead of deleting when possible
- More efficient than individual `pt.delete()` calls

### pt.getChatMembers()

Get all members of the current chat (users and AI agents).

**Returns:** Array of member objects with a simplified, clear structure. Each member is either a user or an AI agent.

**Response Structure:**
```javascript
[
  {
    "id": 123,              // Member ID (either user_id or agent_id)
    "type": "user",         // "user" or "agent"
    "name": "John Doe",     // Display name (full name for users, agent name for agents)

    // User-only fields (null for agents):
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",

    "is_chat_owner": true,  // Created the chat
    "is_logged_user": true  // This is the current user making the request
  },
  {
    "id": 456,
    "type": "agent",
    "name": "AI Assistant",

    // User fields are null for agents
    "first_name": null,
    "last_name": null,
    "email": null,

    "is_chat_owner": false,
    "is_logged_user": false  // Always false for agents
  }
]
```

**Field Reference:**

| Field          | Type    | User | Agent | Description                            |
|----------------|---------|------|-------|----------------------------------------|
| id             | number  | ✓    | ✓     | Member ID                              |
| type           | string  | ✓    | ✓     | "user" or "agent"                      |
| name           | string  | ✓    | ✓     | Display name (full name or agent name) |
| first_name     | string? | ✓    | null  | First name                             |
| last_name      | string? | ✓    | null  | Last name                              |
| email          | string? | ✓    | null  | Email address                          |
| is_chat_owner  | boolean | ✓    | ✓     | Created the chat                       |
| is_logged_user | boolean | ✓    | ✓     | True when member is the current user making the request (always false for agents) |

**Usage Examples:**
```javascript
// Get and display all members
const members = await pt.getChatMembers();
members.forEach(member => {
    const icon = member.type === 'user' ? '👤' : '🤖';
    console.log(`${icon} ${member.name}`);
});

// Filter by type
const users = members.filter(m => m.type === 'user');
const agents = members.filter(m => m.type === 'agent');
console.log(`Users: ${users.length}, Agents: ${agents.length}`);

// Create task assignment dropdown (users only)
async function createAssigneeDropdown() {
    const members = await pt.getChatMembers();
    const users = members.filter(m => m.type === 'user');

    const options = users
        .map(m => `<option value="${m.id}">${m.name}</option>`)
        .join('');

    return `
        <select id="assignee">
            <option value="">Unassigned</option>
            ${options}
        </select>
    `;
}

// Get current user
const members = await pt.getChatMembers();
const currentUser = members.find(m => m.is_logged_user);
```

### pt.getChatInfo()

Get information about the current chat. Returns basic metadata including chat ID, name, and creation timestamp.

**Parameters:**
- None (uses chat context automatically)

**Returns:** Promise that resolves to a chat information object:

```javascript
{
  "chat_id": 42,
  "name": "Project Planning",
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Response Structure:**
- `chat_id` (number): The chat ID
- `name` (string): Chat name/title
- `created_at` (string): ISO 8601 timestamp of when the chat was created

**Usage Examples:**

```javascript
// Get current chat details
const chatInfo = await pt.getChatInfo();
console.log(`Chat: ${chatInfo.name}`);
console.log(`ID: ${chatInfo.chat_id}`);
console.log(`Created: ${chatInfo.created_at}`);

// Display chat header
const info = await pt.getChatInfo();
document.getElementById('chatName').textContent = info.name;
document.getElementById('chatId').textContent = `ID: ${info.chat_id}`;

// Show chat age
const info = await pt.getChatInfo();
const created = new Date(info.created_at);
const age = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
console.log(`Chat is ${age} days old`);

// Build page title with chat name
async function initializePage() {
    const chatInfo = await pt.getChatInfo();
    document.title = `${chatInfo.name} - Dashboard`;

    const header = document.getElementById('pageHeader');
    header.innerHTML = `
        <h1>${chatInfo.name}</h1>
        <p class="text-gray-600">Chat ID: ${chatInfo.chat_id}</p>
    `;
}

// Use chat ID in API calls
const chatInfo = await pt.getChatInfo();
const apiUrl = `/api/v1/chats/${chatInfo.chat_id}/custom-endpoint`;
```

**Common Use Cases:**
- Display chat name in page header
- Show chat metadata in dashboards
- Use chat ID for constructing API URLs
- Calculate chat age or activity duration
- Build breadcrumb navigation
- Personalize page titles

### pt.renameChat(newName)

Rename the current chat. Updates the chat's display name visible to all members.

**Parameters:**
- `newName` (string): The new name for the chat. Must be a non-empty string.

**Returns:** Promise that resolves to an object containing:

```javascript
{
    "success": true,
    "chat_id": 42,
    "name": "New Chat Name"
}
```

**Response Structure:**
- `success` (boolean): Whether the rename operation succeeded
- `chat_id` (number): The chat ID
- `name` (string): The updated chat name

**Usage Examples:**

```javascript
// Simple rename
await pt.renameChat('New Chat Name');

// With user input
const newName = prompt('Enter new chat name:');
if (newName) {
    await pt.renameChat(newName);
}

// Rename with confirmation and error handling
async function renameChatWithConfirmation() {
    const chatInfo = await pt.getChatInfo();
    const newName = prompt(`Rename "${chatInfo.name}" to:`, chatInfo.name);

    if (newName && newName !== chatInfo.name) {
        try {
            const result = await pt.renameChat(newName);
            if (result.success) {
                console.log(`Chat renamed to: ${result.name}`);
            }
        } catch (error) {
            console.error('Failed to rename chat:', error);
        }
    }
}
```

**Common Use Cases:**
- Allow users to customize chat names
- Update chat names based on project phases
- Rename chats programmatically based on content or context

### pt.getUserRole()

Get the role and permissions of the currently logged-in user.

**Parameters:** None (uses current user context automatically)

**Returns:** `Promise<object|null>` — Role and permissions object, or `null` if the user is not authenticated or has no role assigned.

**Response Structure:**

```javascript
{
  role: {
    id: string,           // Role UUID
    name: string,         // Role display name (e.g. "Admin", "Editor")
    description: string,  // Role description
    is_system_role: bool  // true if this is a built-in platform role
  },
  permissions: string[]   // Array of permission IDs (e.g. ["download_documents", "invite_users"])
}
```

Returns `null` when:
- The user is not logged in
- The user has no role assigned in the current workspace

**Examples:**

```javascript
// Check a specific permission
const userRole = await pt.getUserRole();
if (userRole && userRole.permissions.includes('invite_users')) {
    document.getElementById('adminPanel').style.display = 'block';
}
```

```javascript
// Display the user's role name
const userRole = await pt.getUserRole();
if (userRole) {
    document.getElementById('roleLabel').textContent = userRole.role.name;
} else {
    document.getElementById('roleLabel').textContent = 'Guest';
}
```

```javascript
// Gate UI sections based on role and permissions
const userRole = await pt.getUserRole();
const isAdmin = userRole?.role.name === 'Admin';
const canEdit = userRole?.permissions.includes('edit_content') ?? false;

document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
});
```

**Common Use Cases:**
- Role-based access control for UI sections
- Showing/hiding admin panels based on permissions
- Displaying the current user's role label
- Conditionally enabling features based on permission checks

---

### pt.getAvailableMentions()

Get all mentionable entities available in the chat (users, virtual assistants, other chats, and tasks). Results are filtered based on the current user's permissions.

**Parameters:** None (uses chat context automatically)

**Returns:** Promise that resolves to an object containing:

```javascript
{
    users_mentions: [
        {
            id: 1,
            mention_name: "@john",
            display_name: "John Doe",
            // ... additional user fields
        }
    ],
    virtual_assistants_mentions: [
        {
            id: 5,
            mention_name: "@assistant",
            name: "My Assistant",
            // ... additional assistant fields
        }
    ],
    chats_mentions: [
        {
            id: 10,
            mention_name: "#project-chat",
            chat_name: "Project Chat",
            // ... additional chat fields
        }
    ],
    tasks_mentions: [
        {
            id: 20,
            mention_name: "@task:generate-report",
            // ... additional task fields
        }
    ]
}
```

**Usage:**

```javascript
// Get all available mentions
const mentions = await pt.getAvailableMentions();

// Build a mention picker UI
async function createMentionPicker() {
    const mentions = await pt.getAvailableMentions();

    const html = `
        <div class="mention-picker">
            ${mentions.users_mentions.length > 0 ? `
                <h3>Users</h3>
                ${mentions.users_mentions.map(user => `
                    <div class="mention-item" data-mention="${user.mention_name}">
                        👤 ${user.display_name} (${user.mention_name})
                    </div>
                `).join('')}
            ` : ''}

            ${mentions.virtual_assistants_mentions.length > 0 ? `
                <h3>Virtual Assistants</h3>
                ${mentions.virtual_assistants_mentions.map(va => `
                    <div class="mention-item" data-mention="${va.mention_name}">
                        🤖 ${va.name} (${va.mention_name})
                    </div>
                `).join('')}
            ` : ''}

            ${mentions.chats_mentions.length > 0 ? `
                <h3>Other Chats</h3>
                ${mentions.chats_mentions.map(chat => `
                    <div class="mention-item" data-mention="${chat.mention_name}">
                        💬 ${chat.chat_name} (${chat.mention_name})
                    </div>
                `).join('')}
            ` : ''}

            ${mentions.tasks_mentions.length > 0 ? `
                <h3>Tasks</h3>
                ${mentions.tasks_mentions.map(task => `
                    <div class="mention-item" data-mention="${task.mention_name}">
                        ⚡ ${task.mention_name}
                    </div>
                `).join('')}
            ` : ''}
        </div>
    `;

    return html;
}

// Auto-complete mentions in textarea
async function setupMentionAutocomplete(textareaId) {
    const mentions = await pt.getAvailableMentions();
    const textarea = document.getElementById(textareaId);

    // Flatten all mentions
    const allMentions = [
        ...mentions.users_mentions.map(m => ({...m, type: 'user'})),
        ...mentions.virtual_assistants_mentions.map(m => ({...m, type: 'assistant'})),
        ...mentions.chats_mentions.map(m => ({...m, type: 'chat'})),
        ...mentions.tasks_mentions.map(m => ({...m, type: 'task'}))
    ];

    textarea.addEventListener('input', (e) => {
        const value = e.target.value;
        const atIndex = value.lastIndexOf('@');
        const hashIndex = value.lastIndexOf('#');
        const mentionStart = Math.max(atIndex, hashIndex);

        if (mentionStart >= 0) {
            const searchText = value.substring(mentionStart).toLowerCase();
            const matches = allMentions.filter(m =>
                m.mention_name.toLowerCase().includes(searchText)
            );

            if (matches.length > 0) {
                showMentionSuggestions(matches, mentionStart);
            }
        }
    });
}

// Send message with mentions
async function sendMessageWithMention(userId) {
    const mentions = await pt.getAvailableMentions();
    const user = mentions.users_mentions.find(u => u.id === userId);

    if (user) {
        await pt.addMessage(`Hey ${user.mention_name}, can you review this?`);
    }
}

// Check what entities user can mention
async function checkMentionPermissions() {
    const mentions = await pt.getAvailableMentions();

    return {
        canMentionUsers: mentions.users_mentions.length > 0,
        canMentionAssistants: mentions.virtual_assistants_mentions.length > 0,
        canMentionChats: mentions.chats_mentions.length > 0,
        canMentionTasks: mentions.tasks_mentions.length > 0
    };
}
```

**Permission Filtering:**
- Results are automatically filtered by user permissions:
  - `MENTION_USERS_IN_CHATS` - For users_mentions
  - `MENTION_OTHER_CHATS_IN_CHATS` - For chats_mentions
  - `EXECUTE_TASK_ACTION` - For tasks_mentions
- Empty arrays are returned for categories the user lacks permission for

**Common Use Cases:**
- Building mention pickers/autocomplete
- Creating collaboration interfaces
- Implementing @mentions in message composers
- Task delegation with user mentions
- Cross-chat references

### pt.initDb()

Initialize the database for the current group. This is usually called automatically, but can be called manually if needed.

**Usage:**
```javascript
await pt.initDb();
```

### pt.reload()

Reload the current Live Page.

**Usage:**
```javascript
// Reload the page
pt.reload();

// Example: Reload after a major update
async function refreshApplication() {
    await pt.initDb();
    pt.reload();
}
```

### pt.navigate(chatId)

Navigate to a different Live Page.

**Parameters:**
- `chatId`: ID of the chat/Live Page to navigate to

**Usage:**
```javascript
// Navigate to another Live Page
pt.navigate(456);

// Example: Navigation menu
function createNavigation(livePages) {
    return livePages.map(page => `
        <button onclick="pt.navigate(${page.id})">
            ${page.title}
        </button>
    `).join('');
}
```

### pt.addMessage() - Unified Message Method

Add a message to the current chat from your Live Page. This method automatically handles both text-only messages and messages with file attachments.

> **⚠️ IMPORTANT — For AI Generation Tasks, Use the Fire-and-Forget Pattern**
>
> If your Live App asks the AI to generate content, process documents, create images, or perform any work that takes more than a few seconds, **do NOT use `awaitResponse: true`**. Instead, use the **Async Fire-and-Forget Pattern** — create a placeholder entity, send the message without awaiting, and poll for results. This prevents UI blocking, survives tab closes, and enables parallel execution. See the [Async Fire-and-Forget Pattern for AI Generation](Live-Pages-Best-Practices.md#async-fire-and-forget-pattern-for-ai-generation) section for the complete guide.

**Syntax:**

**Mode 1: Text-only message**
```javascript
pt.addMessage(message, options?)
```

**Mode 2: Message with files**
```javascript
pt.addMessage(formOrFormData, message, options?)
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `string` | (Mode 1) Message text |
| `formOrFormData` | `HTMLFormElement` \| `FormData` | (Mode 2) Form or FormData with files |
| `message` | `string` | (Mode 2) Message text (can be empty) |
| `options` | `object` | Optional configuration |
| `options.hidden` | `boolean` | Hide message from UI (default: `false`) |
| `options.awaitResponse` | `boolean` | Wait for AI response (default: `false`) |
| `options.awaitResponseTimeout` | `number` | Timeout in milliseconds when `awaitResponse: true` (default: `120000` = 2 minutes). For long-running queries, increase this value (e.g., `300000` for 5 minutes). |
| `options.folder` | `string` | Target folder path where file attachments will be stored (e.g., `'reports/2024'`, `'invoices/january'`). Only applies when uploading files. |

**Returns:** Promise that resolves to a flat result object containing:
- `success`: Boolean indicating message success
- `user_message`: Object with your sent message
  - `id`: Message ID
  - `message`: The message text you sent
- `task_id`: String UUID for tracking socket stream events (e.g., "d4e5f6a7-b8c9-4012-9ef1-234567890123")
- `ai_responses`: Array of AI response objects (if AI replied)
  - `id`: Response message ID
  - `message`: AI's response text
- `files_count`: Number of files uploaded (when using Mode 2)
- `attachments`: Array of attachment objects (when files are uploaded)
  - `created_at`: ISO timestamp of attachment creation
  - `from_user_id`: ID of user who attached the file
  - `indexed`: Boolean indicating if file has been indexed
  - `name`: File name
  - `status`: Attachment status (e.g., "attached")
  - `type`: Attachment type (e.g., "document")
  - `path`: File path in the system
  - `document`: Object containing document details
    - `id`: Document ID
    - `uuid`: Document UUID
    - `name`: Document name
    - `mimetype`: MIME type of the document
    - `status`: Processing status (e.g., "Processed")
    - `extracted_text_size`: Size of extracted text in bytes
    - `download_url`: URL to download the document
    - `short_description`: Preview of document content
- `details`: Additional status message

The library unwraps the server's `{success, action, result}` envelope for you — `pt.addMessage()` resolves directly to the inner result object, so fields are accessed flat (e.g., `result.task_id`, `result.ai_responses`), never as `result.result.…`.

**Downloading Attached Files:**

When files are attached via `addMessage`, the response includes the `download_url` for each document. You can also access files using the simpler path-based File Download API:

For live apps: `/api/v1/live/{chat_id}/{file_path}`

The file path can be extracted from the `document.name` or the attachment `path` fields. See [File Download API](File-Download-API.md) for complete details on downloading files by path.

**Usage:**

**Text-only messages:**
```javascript
// Simple text message
async function sendNotification() {
    try {
        const response = await pt.addMessage('Task completed successfully!');
        console.log('Message sent with ID:', response.user_message.id);
        console.log('Task ID for tracking:', response.task_id);

        // Check if AI responded
        if (response.ai_responses && response.ai_responses.length > 0) {
            console.log('AI replied:', response.ai_responses[0].message);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// With options
await pt.addMessage('Processing...', {
    hidden: true,
    awaitResponse: false
});

// Wait for AI response
const result = await pt.addMessage('What is 2+2?', {
    awaitResponse: true
});
console.log('AI says:', result.ai_responses[0].message);

// Wait for AI response with custom timeout (server-side wait)
const result = await pt.addMessage('Complex analysis query...', {
    awaitResponse: true,
    awaitResponseTimeout: 300000  // 5 minutes
});
console.log('AI says:', result.ai_responses[0].message);

// Send notification after an action
async function completeTask(taskId) {
    const task = await pt.get(taskId);
    await pt.edit(taskId, { completed: true }, true);  // merge mode

    // Notify the chat
    await pt.addMessage(`Task "${task.data.text}" has been completed!`);
}
```

**Messages with files:**
```javascript
// From HTML form
const form = document.getElementById('uploadForm');
await pt.addMessage(form, 'Check out these files!');

// From FormData
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);
await pt.addMessage(formData, 'Here are the documents');

// Files only, no message text
await pt.addMessage(form, '');

// Files with options
const result = await pt.addMessage(formData, 'Analyze these files', {
    awaitResponse: true,
    hidden: false
});
console.log(`Uploaded ${result.files_count} files`);

// Access attachment information
if (result.attachments) {
    result.attachments.forEach(attachment => {
        console.log('File:', attachment.name);
        console.log('Status:', attachment.document.status);
        console.log('Download URL:', attachment.document.download_url);
        console.log('Preview:', attachment.document.short_description);
    });
}

// Access AI responses
if (result.ai_responses) {
    result.ai_responses.forEach(response => {
        console.log('AI:', response.message);
    });
}

// Hidden message with files
await pt.addMessage(form, 'Internal processing...', {
    hidden: true
});

// Upload files to a specific folder
const form = document.getElementById('uploadForm');
await pt.addMessage(form, 'Monthly report', { folder: 'reports/january' });

// Combine folder with other options
await pt.addMessage(formData, 'Analyze these invoices', {
    folder: 'invoices/2024',
    awaitResponse: true
});
```

**Example Response with Attachments:**
```json
{
  "success": true,
  "action": "add_message",
  "result": {
    "success": true,
    "user_message": {
      "id": 18378,
      "message": "translate to italian"
    },
    "task_id": "d4e5f6a7-b8c9-4012-9ef1-234567890123",
    "files_count": 1,
    "attachments": [
      {
        "created_at": "2026-01-24T11:01:50.793389+00:00",
        "from_user_id": 1,
        "indexed": true,
        "name": "rfp_test.xlsx",
        "status": "attached",
        "type": "document",
        "path": "/",
        "document": {
          "id": 1335,
          "uuid": "d0e1f2a3-b4c5-4678-9567-890123456789",
          "name": "rfp_test.xlsx",
          "mimetype": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "status": "Processed",
          "extracted_text_size": 48,
          "download_url": "https://api.primethink.ai/api/v1/documents/uuid/d0e1f2a3-b4c5-4678-9567-890123456789/download/stream",
          "short_description": "## Sheet1\n| Question |\n| --- |\n| Test question |"
        }
      }
    ],
    "details": "Message has been queued"
  }
}
```

**Dynamic usage:**
```javascript
// Determine at runtime whether to send text or files
async function sendMessage(textOrForm, message = '') {
    if (typeof textOrForm === 'string') {
        // Text only
        await pt.addMessage(textOrForm);
    } else {
        // Files with message
        await pt.addMessage(textOrForm, message);
    }
}

// Usage
await sendMessage('Hello'); // Text
await sendMessage(form, 'Check this'); // Files
```

**Common Use Cases:**
- Notify users when an action is completed
- Send alerts or warnings
- Provide feedback from form submissions
- Log important events to the chat
- Create interactive chat-based workflows
- Upload files with context or instructions for AI processing
- Combine file upload with immediate AI analysis

**Traditional vs Fire-and-Forget — Choosing the Right Pattern:**

For any AI generation work in Live Apps, you should choose between the traditional synchronous approach and the fire-and-forget pattern. The fire-and-forget pattern is **strongly recommended** for most production Live Apps because it survives tab closes, enables parallel execution, and provides a better user experience.

**Example 1: Generate a summary**

```javascript
// ❌ TRADITIONAL (blocks UI, dies on tab close, no parallel execution)
async function generateSummary(text) {
    showLoading();
    try {
        const result = await pt.addMessage(`Summarize this: ${text}`, {
            awaitResponse: true,
            awaitResponseTimeout: 120000
        });
        // If user closes tab during this await, the result is LOST
        showResult(result.ai_responses[0].message);
    } catch (e) {
        showError('Generation failed or timed out');
    }
}

// ✅ FIRE-AND-FORGET (non-blocking, survives tab close, results saved to DB)
async function generateSummary(text) {
    // 1. Create placeholder entity
    const entity = await pt.add('summary_task', {
        status: 'queued', input: text, result: null, error_message: null
    });

    // 2. Fire message — do NOT await response
    pt.addMessage(`TASK: Summarize the text and save to database.
ENTITY ID: ${entity.id}

--- TEXT ---
${text}
--- END ---

ACTUALLY CALL chatdb_edit with these exact parameters:
- entity_id: ${entity.id}
- data: {"status": "complete", "result": "<your summary>"}
- merge: true
You MUST pass merge: true as a parameter. Without it, other fields will be deleted.

On error, ACTUALLY CALL chatdb_edit with these exact parameters:
- entity_id: ${entity.id}
- data: {"status": "error", "error_message": "<what went wrong>"}
- merge: true`);

    // 3. Show loading and poll for result
    showLoading();
    const poll = setInterval(async () => {
        const updated = await pt.get(entity.id);
        if (updated.data.status === 'complete') {
            clearInterval(poll);
            showResult(updated.data.result);
        } else if (updated.data.status === 'error') {
            clearInterval(poll);
            showError(updated.data.error_message);
        }
    }, 8000);
}
```

**Example 2: Process an uploaded document**

```javascript
// ❌ TRADITIONAL (UI frozen while AI processes, lost on navigation)
async function processDocument(file) {
    const formData = new FormData();
    formData.append('files', file);
    showLoading();
    const result = await pt.addMessage(formData, 'Extract key points from this document', {
        awaitResponse: true,
        awaitResponseTimeout: 300000
    });
    // 5 minutes of blocked UI — user can't do anything else
    showResult(result.ai_responses[0].message);
}

// ✅ FIRE-AND-FORGET (instant feedback, survives navigation)
async function processDocument(file) {
    // 1. Create placeholder with status tracking
    const entity = await pt.add('doc_analysis', {
        status: 'queued',
        filename: file.name,
        key_points: null,
        error_message: null
    });

    // 2. Upload file and fire AI task
    const formData = new FormData();
    formData.append('files', file);
    pt.addMessage(formData, `TASK: Extract key points from the uploaded document.
ENTITY ID: ${entity.id}

ACTUALLY CALL chatdb_edit with these exact parameters:
- entity_id: ${entity.id}
- data: {"status": "complete", "key_points": "<extracted key points>"}
- merge: true
You MUST pass merge: true as a parameter. Without it, other fields will be deleted.

On error, ACTUALLY CALL chatdb_edit with these exact parameters:
- entity_id: ${entity.id}
- data: {"status": "error", "error_message": "<what went wrong>"}
- merge: true`);

    // 3. Poll for completion (user can navigate away and come back)
    showLoading();
    startPolling(entity.id);
}
```

**Example 3: Generate multiple items in parallel**

```javascript
// ❌ TRADITIONAL (sequential, slow, one failure blocks all)
async function generatePosts(topics) {
    const results = [];
    for (const topic of topics) {
        // Each post waits for the previous one to finish
        const result = await pt.addMessage(`Write a blog post about: ${topic}`, {
            awaitResponse: true,
            awaitResponseTimeout: 300000
        });
        results.push(result.ai_responses[0].message);
    }
    return results; // Takes N * timeout — could be 25+ minutes for 5 topics
}

// ✅ FIRE-AND-FORGET (parallel, fast, independent failures)
async function generatePosts(topics) {
    // 1. Create all placeholder entities at once
    const entities = await pt.batchAdd('blog_post', topics.map(topic => ({
        status: 'queued', topic, result: null, error_message: null
    })));
    const created = entities.filter(r => r.success).map(r => r.entity);

    // 2. Fire ALL messages simultaneously — they run in parallel on the server
    for (const entity of created) {
        pt.addMessage(`TASK: Write a blog post about "${entity.data.topic}".
ENTITY ID: ${entity.id}

ACTUALLY CALL chatdb_edit with these exact parameters:
- entity_id: ${entity.id}
- data: {"status": "complete", "result": "<the blog post>"}
- merge: true
You MUST pass merge: true as a parameter. Without it, other fields will be deleted.

On error, ACTUALLY CALL chatdb_edit with these exact parameters:
- entity_id: ${entity.id}
- data: {"status": "error", "error_message": "<what went wrong>"}
- merge: true`);
    }

    // 3. Poll all — completed posts show immediately, others keep generating
    showProgressUI(created);
    startBatchPolling(created.map(e => e.id));
}
```

> **Critical: `merge: true` is required in every `chatdb_edit` call.** Without it, each concurrent AI task replaces the entire entity data, deleting fields set by other tasks. With `merge: true`, only the specified fields are updated — everything else is preserved. This is the most common pitfall in fire-and-forget. See the [detailed explanation with examples](Live-Pages-Best-Practices.md#critical-always-use-merge-true-in-chatdb_edit).

> **See the [Async Fire-and-Forget Pattern for AI Generation](Live-Pages-Best-Practices.md#async-fire-and-forget-pattern-for-ai-generation) section for the complete guide** including polling, socket events, resume logic, stuck task handling, batch patterns, and a full minimal example.

**AI-Powered Database Operations:**

When you send a message to the chat, the AI assistant can process your instructions and automatically manage database entities. This enables powerful automation workflows where you describe what you want, and the AI handles the database operations.

**Best Practice: Be Explicit About Tool Usage**

To ensure the AI executes your desired operation, explicitly mention which database tool to use:
- Use **`chatdb_add`** to create new entities
- Use **`chatdb_list`** to search/query entities
- Use **`chatdb_get`** to retrieve a specific entity by ID
- Use **`chatdb_edit`** to update existing entities
- Use **`chatdb_delete`** to remove entities

```javascript
// Example 1: Extract data and store it (explicit tool usage)
await pt.addMessage(`
Please analyze the sales data from last quarter and use the tool 'chatdb_add' to create database entries:
- entity_name: "sales_record"
- data format: { month: string, revenue: number, region: string, growth_percentage: number }

Extract all quarterly sales information and add each month as a separate record.
`);

// Example 2: Process and categorize information (explicit tool usage)
await pt.addMessage(`
Search for the top 5 competitors in the AI assistant market and use the tool 'chatdb_add' to store each one:
- entity_name: "competitor"
- data: { name: string, website: string, key_features: array, pricing_model: string }
`);

// Example 3: Query and transform existing data
await pt.addMessage(`
Use 'chatdb_list' to find all tasks with status "pending" and high priority.
For each one, use 'chatdb_add' to create a new entity:
- entity_name: "urgent_action"
- data: { task_id: number, title: string, due_date: string, estimated_hours: number }
`);

// Example 4: Update existing entities
await pt.addMessage(`
Use 'chatdb_list' to find all expenses from last month with category "uncategorized".
For each expense, use 'chatdb_edit' to update it with the appropriate category based on the merchant name.
`);

// Example 5: Clean up old data
await pt.addMessage(`
Use 'chatdb_list' to find all tasks with status "completed" that were finished more than 90 days ago.
Use 'chatdb_delete' to remove them from the database.
`);
```

**Available Database Tools:**

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `chatdb_add` | Create new entities | Storing new data, adding records |
| `chatdb_list` | Query/search entities | Finding records with filters, getting multiple items |
| `chatdb_get` | Get single entity by ID | Retrieving a specific record when you know its ID |
| `chatdb_edit` | Update existing entities | Modifying data, changing status, updating fields |
| `chatdb_delete` | Remove entities | Cleaning up, removing old data |
| `chatdb_init` | Initialize database schema | First-time setup (rarely needed) |

**Critical: Demand Actual Tool Execution**

The AI may summarize or simulate tool calls instead of actually executing them if instructions are too high-level. Use explicit phrases to ensure actual execution:

```javascript
// ❌ BAD: AI might only simulate this
await pt.addMessage(`
Extract IP tasks from the document. Use chatdb_list to check for duplicates.
If not found, use chatdb_add to insert each task.
`);
// Result: AI returns summary but doesn't actually call the tools

// ✅ GOOD: Explicit execution instructions
await pt.addMessage(`
Extract all IP tasks from the document. FOR EACH task:
1. ACTUALLY CALL chatdb_list with filters: {unique_key: "<hash>"}
2. If not found, ACTUALLY CALL chatdb_add to insert the task
3. Show all tool call results

IMPORTANT: You must ACTUALLY EXECUTE the tools for each task.
`);
// Result: AI actually executes chatdb_list and chatdb_add
```

**Key phrases for actual execution:**
- "ACTUALLY CALL the tool 'chatdb_list'"
- "ACTUALLY USE the tool 'chatdb_add'"
- "FOR EACH item, use the tool..."
- "Show all tool call results"
- "You must ACTUALLY EXECUTE..."

**Why this matters:**
- Without explicit execution instructions, AI may treat prompts as conceptual workflows
- AI might return a summary of what "would happen" without updating the database
- This is critical for multi-step operations with loops (e.g., processing multiple items)
- Always verify in the chat that tool calls were actually executed

This feature is particularly powerful because:
- The AI understands natural language instructions
- It can process complex requirements and extract structured data
- Explicit tool mentions ensure the correct operations are executed
- It handles the database operations automatically
- You can combine data processing with storage in one request

### Tracking AI Responses with Socket Events

When you send a message using `pt.addMessage()`, the response includes a `task_id` that you can use to track real-time AI processing events through WebSocket connections. This allows you to build responsive UIs that show AI thinking, streaming responses, and completion status.

**Task ID Format:**

The `task_id` returned from `pt.addMessage()` is a UUID string:
```javascript
const response = await pt.addMessage('Hello');
console.log(response.task_id); // "d4e5f6a7-b8c9-4012-9ef1-234567890123"
```

**Socket Stream Events:**

When connected to the PrimeThink WebSocket, you'll receive events with the following structure:

**Event Types:**

1. **`stream_reasoning_token`** - AI thinking/reasoning step
```javascript
{
    task_id: "e5f6a7b8-c9d0-4123-8f12-345678901234:45678",
    chat_id: 1234,
    chat_uuid: "c3d4e5f6-a7b8-4901-8def-123456789012",
    ai_message_id: 45678,
    chunk: '{"id":null,"label":"Thinking...","right_text":null,"description_md":null,"emoji":null,"step_type":"reasoning","order":null,"metadata":null,"children":null,"created_at":"2026-01-26T20:16:04.785761Z"}',
    initial: true
}
```

2. **`stream_partial_token`** - Streaming AI response text
```javascript
{
    task_id: "e5f6a7b8-c9d0-4123-8f12-345678901234:45678",
    chat_id: 1234,
    chat_uuid: "c3d4e5f6-a7b8-4901-8def-123456789012",
    ai_message_id: 45678,
    agent_id: 42,
    chunk: "Hello, Jane",
    chunk_idx: 0
}
```

3. **`stream_completed`** - AI response finished
```javascript
{
    task_id: "e5f6a7b8-c9d0-4123-8f12-345678901234:45678",
    chat_id: 1234,
    chat_uuid: "c3d4e5f6-a7b8-4901-8def-123456789012",
    ai_message_id: 45678
}
```

**Implementation Example:**

```javascript
// Store task IDs for tracking
const activeTaskIds = new Set();

// Send message and track task
async function sendTrackedMessage(message) {
    const response = await pt.addMessage(message);
    const taskId = response.task_id;

    // Store for tracking
    activeTaskIds.add(taskId);

    // Show loading state
    showLoadingIndicator(taskId);

    return { taskId, messageId: response.user_message.id };
}

// WebSocket event listener
socket.on('message', (event) => {
    const data = JSON.parse(event.data);

    // Check if this event is for one of our tracked tasks
    const baseTaskId = data.task_id?.split(':')[0];
    if (!activeTaskIds.has(baseTaskId)) return;

    switch(data.type) {
        case 'stream_reasoning_token':
            handleReasoningStep(data);
            break;

        case 'stream_partial_token':
            handleStreamingText(data);
            break;

        case 'stream_completed':
            handleCompletion(data);
            activeTaskIds.delete(baseTaskId);
            break;
    }
});

// Handle reasoning steps
function handleReasoningStep(data) {
    const step = JSON.parse(data.chunk);
    console.log(`AI is ${step.label}...`);

    // Update UI
    const indicator = document.getElementById(`task-${data.task_id}`);
    if (indicator) {
        indicator.textContent = step.label;
        indicator.className = 'reasoning-step';
    }
}

// Handle streaming response
function handleStreamingText(data) {
    let container = document.getElementById(`response-${data.ai_message_id}`);
    if (!container) {
        // Create container for streaming text on the first chunk
        container = document.createElement('div');
        container.id = `response-${data.ai_message_id}`;
        container.className = 'ai-response streaming';
        document.getElementById('messages').appendChild(container);
    }

    // Append chunk
    container.textContent += data.chunk;
}

// Handle completion
function handleCompletion(data) {
    console.log(`Task ${data.task_id} completed`);

    // Remove loading indicator
    const indicator = document.getElementById(`task-${data.task_id}`);
    if (indicator) {
        indicator.remove();
    }

    // Mark response as complete
    const response = document.getElementById(`response-${data.ai_message_id}`);
    if (response) {
        response.classList.remove('streaming');
        response.classList.add('complete');
    }
}

// Example: Send message with full tracking
async function sendMessageWithTracking(message) {
    try {
        const { taskId, messageId } = await sendTrackedMessage(message);

        console.log('Message sent:', messageId);
        console.log('Tracking task:', taskId);

        // UI will update automatically via socket events

    } catch (error) {
        console.error('Failed to send message:', error);
    }
}
```

**Use Cases:**
- Show "AI is thinking..." indicators
- Display streaming AI responses in real-time
- Build chat interfaces with live updates
- Track multiple concurrent AI tasks
- Provide progress feedback to users
- Implement typing indicators
- Create responsive conversational UIs

**Important Notes:**
- The `task_id` format is `{uuid}:{message_id}` for socket events
- Store the base UUID (before the colon) for matching events
- Socket events arrive in real-time as the AI processes
- Multiple tasks can be tracked simultaneously
- Always clean up task IDs after completion to prevent memory leaks

### pt.stopStreamingMessage(streamingTaskId)

Stop a streaming AI response that is currently being generated. Use this when the user wants to halt a long-running generation or no longer needs the response.

**Parameters:**
- `streamingTaskId` (string, required): The unique identifier of the streaming task to stop

**Returns:** Promise that resolves to:
```javascript
{
    success: boolean,
    message: string  // "Streaming task has been stopped."
}
```

**Backend Action:**
- Action name: `delete_streaming_task`
- Required parameter: `streaming_task_id`
- Sets a server-side cancellation flag for the task and aborts the background job

**Usage:**

```javascript
// Basic usage - stop a streaming message
const taskId = 'abc123-task-id';
const result = await pt.stopStreamingMessage(taskId);
console.log(result.message); // "Streaming task has been stopped."

// With error handling
try {
    await pt.stopStreamingMessage(currentTaskId);
    console.log('Message generation stopped');
} catch (error) {
    console.error('Failed to stop:', error.message);
}

// Stop button implementation
document.getElementById('stopBtn').addEventListener('click', async () => {
    if (activeStreamingTaskId) {
        await pt.stopStreamingMessage(activeStreamingTaskId);
        activeStreamingTaskId = null;
        updateUI('stopped');
    }
});
```

**Complete Example with Streaming Control:**

```javascript
// Track active streaming tasks
let activeStreamingTaskId = null;

// Send message and track the task
async function sendMessageWithTracking(message) {
    const response = await pt.addMessage(message);
    activeStreamingTaskId = response.task_id;

    // Show stop button
    document.getElementById('stopBtn').style.display = 'block';

    return response;
}

// Stop the current streaming response
async function stopCurrentStream() {
    if (!activeStreamingTaskId) {
        console.log('No active streaming task');
        return;
    }

    try {
        const result = await pt.stopStreamingMessage(activeStreamingTaskId);
        console.log(result.message);

        // Clean up
        activeStreamingTaskId = null;
        document.getElementById('stopBtn').style.display = 'none';

        // Update UI to show stopped state
        const responseContainer = document.getElementById('aiResponse');
        responseContainer.innerHTML += '<span class="stopped">[Generation stopped]</span>';

    } catch (error) {
        console.error('Failed to stop streaming:', error);
    }
}

// Handle stream completion (clean up task ID)
socket.on('stream_completed', (data) => {
    if (data.task_id.startsWith(activeStreamingTaskId)) {
        activeStreamingTaskId = null;
        document.getElementById('stopBtn').style.display = 'none';
    }
});
```

**Common Use Cases:**
- User wants to cancel a long-running AI response
- Response is going in an unwanted direction
- User found the answer before generation completed
- Implementing "Stop generating" buttons in chat interfaces
- Resource management for expensive AI operations

### pt.getMessageText(messageId)

Get the text content of a chat message by its ID. Returns the message text as a plain string.

**Parameters:**
- `messageId` (number, required): The ID of the chat message

**Returns:** Promise that resolves to a string containing the message text (empty string if message not found)

**Usage Examples:**

```javascript
// Get message text
const text = await pt.getMessageText(12345);
console.log('Message:', text);

// Display message in UI
const messageId = 67890;
const content = await pt.getMessageText(messageId);
document.getElementById('messageDisplay').textContent = content;

// Copy message to clipboard
const msgText = await pt.getMessageText(111);
await navigator.clipboard.writeText(msgText);
alert('Message copied to clipboard!');

// Build message history viewer
async function displayRecentMessages(messageIds) {
    const messages = await Promise.all(
        messageIds.map(id => pt.getMessageText(id))
    );

    const html = messages
        .map((text, i) => `
            <div class="message">
                <div class="message-id">Message #${messageIds[i]}</div>
                <div class="message-text">${text}</div>
            </div>
        `)
        .join('');

    document.getElementById('messageHistory').innerHTML = html;
}

// Search for keyword in message
async function checkMessageContains(messageId, keyword) {
    const text = await pt.getMessageText(messageId);
    return text.toLowerCase().includes(keyword.toLowerCase());
}

// Extract and process message content
async function analyzeMessage(messageId) {
    const text = await pt.getMessageText(messageId);

    if (!text) {
        console.log('Message not found or empty');
        return null;
    }

    return {
        length: text.length,
        wordCount: text.split(/\s+/).length,
        hasLinks: text.includes('http'),
        hasEmail: text.includes('@')
    };
}

// Compare two messages
async function compareMessages(id1, id2) {
    const [text1, text2] = await Promise.all([
        pt.getMessageText(id1),
        pt.getMessageText(id2)
    ]);

    return {
        message1: text1,
        message2: text2,
        areSame: text1 === text2,
        lengthDiff: Math.abs(text1.length - text2.length)
    };
}

// Get message for AI processing
async function sendMessageToAI(messageId) {
    const text = await pt.getMessageText(messageId);

    if (text) {
        await pt.addMessage(`Please analyze this message: "${text}"`);
    } else {
        console.error('Could not retrieve message');
    }
}
```

**Common Use Cases:**
- Display message content in custom UI
- Copy message text to clipboard
- Search and filter messages by content
- Build message history or conversation viewers
- Extract message data for processing
- Compare or analyze message content
- Forward message text to other systems
- Create message archives or exports

**Related Methods:**
- Use `pt.addMessage()` to send new messages to the chat (for AI generation, use [fire-and-forget pattern](Live-Pages-Best-Practices.md#async-fire-and-forget-pattern-for-ai-generation))
- Use `pt.getChatMessages()` to fetch paginated chat message history
- Use `pt.getChatMembers()` to get information about message senders
- Message IDs are typically obtained from database queries or other API responses

### pt.getChatMessages(options?)

Fetch paginated chat message history for the current Live App chat. Returns an array of message objects with full metadata including sender info, attachments, reactions, and reply threading.

This method wraps the `get_chat_messages` action internally:
```javascript
pt.action("get_chat_messages", options)
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `options.size` | `number` | No | `25` | Number of messages per page |
| `options.beforeMessageId` | `number` | No | `null` | Returns messages older than this ID (backward pagination) |
| `options.afterMessageId` | `number` | No | `null` | Returns messages newer than this ID (forward pagination) |
| `options.anchorMessageId` | `number` | No | `null` | Jump-to mode: returns ~25 older and ~25 newer messages around this ID |

**Constraints:**
- `beforeMessageId` and `afterMessageId` are mutually exclusive — providing both returns a 400 error
- `anchorMessageId` overrides the other pagination params when set

**Returns:** Promise that resolves to an array of message objects, each containing:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Message ID |
| `message` | `string` | Message text content |
| `created_at` | `string` | ISO timestamp of message creation |
| `updated_at` | `string` | ISO timestamp of last update |
| `user_type` | `string` | Type of user who sent the message |
| `type` | `string` | Message type |
| `from_user` | `object\|null` | User details (if sent by a user) |
| `from_virtual_assistant` | `object\|null` | Virtual assistant details (if sent by an AI) |
| `message_attachments` | `array` | Attached documents |
| `aggregated_reactions` | `object` | Emoji reactions on the message |
| `replying_to_message` | `object\|null` | Nested parent message (if this is a reply) |
| `reasoning_steps` | `array` | AI reasoning steps (if applicable) |
| `chat_uuid` | `string` | UUID of the chat |

**Usage Examples:**

```javascript
// Load latest messages (default page of 25)
const messages = await pt.getChatMessages();
console.log(`Loaded ${messages.length} messages`);

// Load more messages with a larger page size
const messages = await pt.getChatMessages({ size: 50 });

// Backward pagination — load older messages
const olderMessages = await pt.getChatMessages({
    beforeMessageId: 1234,
    size: 50
});

// Forward pagination — load newer messages after a known point
const newerMessages = await pt.getChatMessages({
    afterMessageId: 1000
});

// Jump to a specific message with surrounding context
const window = await pt.getChatMessages({
    anchorMessageId: 5678
});
```

**Building a Chat History Viewer:**

```javascript
let oldestMessageId = null;

async function loadInitialMessages() {
    const messages = await pt.getChatMessages({ size: 30 });
    if (messages.length > 0) {
        oldestMessageId = messages[messages.length - 1].id;
    }
    renderMessages(messages);
}

async function loadOlderMessages() {
    if (!oldestMessageId) return;
    const older = await pt.getChatMessages({
        beforeMessageId: oldestMessageId,
        size: 30
    });
    if (older.length > 0) {
        oldestMessageId = older[older.length - 1].id;
    }
    prependMessages(older);
}

function renderMessages(messages) {
    messages.forEach(msg => {
        const sender = msg.from_user
            ? msg.from_user.name
            : msg.from_virtual_assistant?.name || 'System';
        const el = document.createElement('div');
        el.className = 'message';
        el.innerHTML = `
            <strong>${sender}</strong>
            <span class="time">${new Date(msg.created_at).toLocaleString()}</span>
            <p>${msg.message}</p>
        `;
        document.getElementById('chat-history').appendChild(el);
    });
}
```

**Using the Low-Level Action Directly:**

You can also call the action directly via `pt.action()`:

```javascript
const messages = await pt.action("get_chat_messages", {
    size: 25,
    before_message_id: 1234
});
```

**Common Use Cases:**
- Build chat history viewers and message archives
- Implement infinite scroll for message history
- Jump to and highlight a specific message in context
- Export conversation history
- Search and filter past messages
- Display message threads with replies

**Related Methods:**
- Use `pt.getMessageText(messageId)` to get plain text of a single message
- Use `pt.addMessage()` to send new messages to the chat
- Use `pt.getChatMembers()` to get information about message senders

### pt.onMessageReceived(taskId, callback)

Subscribe to receive the AI response message for a specific task. When you send a message with `awaitResponse: false`, the message is queued for processing and you receive a `task_id`. This method allows you to listen for the completed AI response via Socket.IO events.

**Why Use This?**

When sending messages without awaiting (`awaitResponse: false`), the API returns immediately with a `task_id`:

```javascript
const result = await pt.addMessage('Hello there', { awaitResponse: false });
// Returns immediately:
// {
//   success: true,
//   user_message: { id: 18695, message: "hello there" },
//   details: "Message has been queued",
//   task_id: "e1f2a3b4-c5d6-4789-8678-901234567890"
// }
```

The AI then processes the message in the background and streams the response via Socket.IO. The `onMessageReceived` method lets you capture that response when it's complete.

**Socket Events Flow:**

When a message is processed, the following Socket.IO events are emitted:

1. `message` - User message created (id: 18695)
2. `message` - AI message placeholder created (id: 18696)
3. `stream_reasoning_token` - Reasoning/thinking tokens (if model supports it)
4. `stream_partial_token` - Response tokens as they're generated
5. `stream_completed` - Streaming finished for task
6. `message` - Final AI message with complete content

The `onMessageReceived` handler waits for `stream_completed` and then delivers the final message.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `taskId` | `string` | The task_id returned from `addMessage()` when `awaitResponse` is `false` |
| `callback` | `function` | Callback function called with the complete AI message object |

**Returns:** `function` - Unsubscribe function to remove the listener

**Message Object Structure:**

The callback receives a message object with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `number` | Message ID |
| `message` | `string` | Full message text (automatically fetched if truncated) |
| `message_is_truncated` | `boolean` | Always `false` after processing (full text is fetched) |
| `user_type` | `string` | `'assistant'` for AI responses |
| `type` | `string` | Message type (e.g., `'message'`) |
| `created_at` | `string` | ISO timestamp |
| `chat_uuid` | `string` | UUID of the chat |
| `reasoning_steps` | `array\|null` | Array of reasoning steps (if available) |
| `attachments` | `array` | Array of attached documents |
| `from_virtual_assistant_id` | `number` | ID of the responding AI agent |

**Truncated Message Handling:**

Long AI responses may be truncated during Socket.IO transmission (messages over ~10KB). The `onMessageReceived` handler automatically:

1. Detects if `message_is_truncated` is `true`
2. Calls `pt.getMessageText(messageId)` to fetch the full text
3. Replaces the truncated message with the complete text
4. Sets `message_is_truncated` to `false`

This ensures your callback always receives the complete message content.

**Basic Usage:**

```javascript
// Send message without waiting
const result = await pt.addMessage('Explain quantum computing', { awaitResponse: false });
const taskId = result.task_id;

// Subscribe to receive the AI response
const unsubscribe = pt.onMessageReceived(taskId, (message) => {
    console.log('AI Response:', message.message);
    console.log('Message ID:', message.id);

    // Display in UI
    document.getElementById('response').textContent = message.message;

    // Clean up listener
    unsubscribe();
});
```

**Promise-Based Wrapper:**

```javascript
// Wrap in a Promise for async/await usage
function sendAndWaitForResponse(text) {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await pt.addMessage(text, { awaitResponse: false });
            const taskId = result.task_id;

            const unsubscribe = pt.onMessageReceived(taskId, (message) => {
                unsubscribe();
                resolve(message);
            });

            // Optional: Add timeout
            setTimeout(() => {
                unsubscribe();
                reject(new Error('Response timeout'));
            }, 60000); // 60 second timeout
        } catch (error) {
            reject(error);
        }
    });
}

// Usage
const response = await sendAndWaitForResponse('What is 2+2?');
console.log('Answer:', response.message);
```

**Multiple Concurrent Messages:**

```javascript
// Track multiple pending responses
const pendingResponses = new Map();

async function sendMessage(text, onResponse) {
    const result = await pt.addMessage(text, { awaitResponse: false });
    const taskId = result.task_id;

    const unsubscribe = pt.onMessageReceived(taskId, (message) => {
        pendingResponses.delete(taskId);
        unsubscribe();
        onResponse(message);
    });

    pendingResponses.set(taskId, { unsubscribe, text });
    return taskId;
}

// Cancel all pending
function cancelAllPending() {
    pendingResponses.forEach(({ unsubscribe }) => unsubscribe());
    pendingResponses.clear();
}

// Usage
sendMessage('Question 1', (msg) => console.log('Answer 1:', msg.message));
sendMessage('Question 2', (msg) => console.log('Answer 2:', msg.message));
sendMessage('Question 3', (msg) => console.log('Answer 3:', msg.message));
```

**With Loading State:**

```javascript
async function askQuestion(question) {
    // Show loading
    const loadingEl = document.getElementById('loading');
    const responseEl = document.getElementById('response');

    loadingEl.style.display = 'block';
    responseEl.textContent = '';

    const result = await pt.addMessage(question, { awaitResponse: false });

    pt.onMessageReceived(result.task_id, (message) => {
        // Hide loading, show response
        loadingEl.style.display = 'none';
        responseEl.textContent = message.message;

        // Show reasoning if available
        if (message.reasoning_steps && message.reasoning_steps.length > 0) {
            const reasoningEl = document.getElementById('reasoning');
            reasoningEl.innerHTML = message.reasoning_steps
                .map(step => `<div class="step">${step.label}: ${step.content}</div>`)
                .join('');
        }
    });
}
```

**Cancel Button:**

```javascript
let currentUnsubscribe = null;

async function sendMessage(text) {
    // Cancel previous if still pending
    if (currentUnsubscribe) {
        currentUnsubscribe();
        currentUnsubscribe = null;
    }

    const result = await pt.addMessage(text, { awaitResponse: false });

    currentUnsubscribe = pt.onMessageReceived(result.task_id, (message) => {
        currentUnsubscribe = null;
        displayResponse(message);
    });
}

// Cancel button handler
document.getElementById('cancelBtn').onclick = () => {
    if (currentUnsubscribe) {
        currentUnsubscribe();
        currentUnsubscribe = null;
        showMessage('Response cancelled');
    }
};
```

**Handling Long Responses:**

```javascript
// Long responses are automatically handled
const result = await pt.addMessage('Write a 5000 word essay about AI', { awaitResponse: false });

pt.onMessageReceived(result.task_id, (message) => {
    // message.message contains the FULL text, even if it was
    // truncated during streaming. The handler automatically
    // fetches the complete text via pt.getMessageText()

    console.log('Full response length:', message.message.length);
    console.log('Was truncated:', message.message_is_truncated); // Always false

    // Safe to use the complete message
    document.getElementById('essay').innerHTML = marked.parse(message.message);
});
```

**Comparison: awaitResponse vs onMessageReceived**

| Aspect | `awaitResponse: true` | `awaitResponse: false` + `onMessageReceived` |
|--------|------------------------|----------------------------------------------|
| API Response | Waits for AI completion | Returns immediately with task_id |
| UI Blocking | Blocks until complete | Non-blocking, can show loading state |
| Streaming UI | No streaming feedback | Can show streaming tokens via `onSocketEvent` |
| Cancellation | Cannot cancel | Can unsubscribe anytime |
| Multiple Messages | Sequential only | Can send multiple in parallel |
| Error Handling | In try/catch | In callback or timeout |

**Best Practices:**

1. **Always unsubscribe** when done to prevent memory leaks
2. **Add timeouts** for production code to handle edge cases
3. **Track pending responses** if sending multiple messages
4. **Use with streaming UI** - combine with `onSocketEvent` to show tokens as they arrive
5. **Handle errors gracefully** - the callback may never fire if processing fails
6. **For AI generation tasks**, use the [fire-and-forget pattern](Live-Pages-Best-Practices.md#async-fire-and-forget-pattern-for-ai-generation) instead — it saves results to the database, survives tab closes, and enables parallel execution

**Related Methods:**
- `pt.addMessage()` - Send messages to the chat (for AI generation, use [fire-and-forget pattern](Live-Pages-Best-Practices.md#async-fire-and-forget-pattern-for-ai-generation))
- `pt.onSocketEvent()` - Subscribe to all socket events (for streaming tokens)
- `pt.getMessageText()` - Fetch full message text by ID
- `pt.stopStreamingMessage()` - Stop a streaming response in progress

### pt.waitForMessageReceived(taskId, options)

Wait for the AI response message for a specific task. Returns a Promise that resolves when the AI has finished generating its response. This is a convenience wrapper around `onMessageReceived` for async/await usage.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `taskId` | `string` | required | The task_id returned from `addMessage()` |
| `options.timeout` | `number` | `120000` | Timeout in milliseconds (default: 2 minutes) |

**Returns:** `Promise<object>` - Resolves with the complete AI message object

**Throws:** `Error` - If timeout is reached before response arrives

**Basic Usage:**

```javascript
// Simple one-liner pattern
const { task_id } = await pt.addMessage('Explain quantum computing');
const { message } = await pt.waitForMessageReceived(task_id);
document.getElementById('answer').textContent = message;
```

**Helper Function Pattern:**

```javascript
// Create a reusable helper
async function ask(question, options = {}) {
    const result = await pt.addMessage(question, options);
    return pt.waitForMessageReceived(result.task_id);
}

// Usage becomes very clean
const response = await ask('What is machine learning?');
console.log(response.message);
```

**With Custom Timeout:**

```javascript
// For complex requests that may take longer
const result = await pt.addMessage('Write a detailed 5000 word essay about AI history');
const response = await pt.waitForMessageReceived(result.task_id, {
    timeout: 300000  // 5 minutes
});
```

**Parallel Questions:**

```javascript
// Ask multiple questions simultaneously
const questions = ['What is AI?', 'What is ML?', 'What is DL?'];

const results = await Promise.all(
    questions.map(q => pt.addMessage(q))
);

const responses = await Promise.all(
    results.map(r => pt.waitForMessageReceived(r.task_id))
);

responses.forEach((r, i) => {
    console.log(`Q: ${questions[i]}`);
    console.log(`A: ${r.message}\n`);
});
```

**Error Handling:**

```javascript
try {
    const result = await pt.addMessage('Complex analysis request');
    const response = await pt.waitForMessageReceived(result.task_id, {
        timeout: 60000
    });
    displayResponse(response.message);
} catch (error) {
    if (error.message.includes('Timeout')) {
        showError('Response is taking too long. Please try again.');
    } else {
        showError(error.message);
    }
}
```

**Comparison: waitForMessageReceived vs onMessageReceived**

| Aspect | `waitForMessageReceived` | `onMessageReceived` |
|--------|-------------------------|---------------------|
| Style | Promise/async-await | Callback |
| Cancellation | Not directly | Easy with unsubscribe |
| Code simplicity | ✅ Very simple | More boilerplate |
| Error handling | try/catch | Manual |
| Best for | Most use cases | Cancellation, streaming UI |

**Related Methods:**
- `pt.addMessage()` - Send messages to the chat
- `pt.onMessageReceived()` - Callback-based alternative for cancellation support
- `pt.waitForAllMessagesReceived()` - Wait for multiple AI responses
- `pt.onSocketEvent()` - Subscribe to all socket events (for streaming tokens)

### pt.waitForAllMessagesReceived(taskIds, options)

Wait for multiple AI responses to complete. Useful when sending multiple messages in parallel and waiting for all responses. Each task is tracked independently, so responses can arrive in any order.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `taskIds` | `string[]` | required | Array of task_ids returned from `addMessage()` |
| `options.timeout` | `number` | `120000` | Timeout in milliseconds for ALL responses (default: 2 minutes) |
| `options.failFast` | `boolean` | `true` | If true, reject immediately on first timeout |
| `options.onProgress` | `function` | - | Callback `(completed, total, message)` called as each response arrives |

**Returns:** `Promise<object[]>` - Resolves with array of message objects in same order as `taskIds`

**Basic Usage:**

```javascript
// Send multiple questions and wait for all answers
const questions = ['What is AI?', 'What is ML?', 'What is DL?'];
const results = await Promise.all(questions.map(q => pt.addMessage(q)));
const taskIds = results.map(r => r.task_id);

const responses = await pt.waitForAllMessagesReceived(taskIds);
responses.forEach((r, i) => {
    console.log(`Q: ${questions[i]}`);
    console.log(`A: ${r.message}`);
});
```

**With Progress Tracking:**

```javascript
const responses = await pt.waitForAllMessagesReceived(taskIds, {
    timeout: 180000,
    onProgress: (completed, total, message) => {
        updateProgressBar(completed / total * 100);
        console.log(`${completed}/${total} responses received`);
    }
});
```

**Graceful Degradation (failFast: false):**

```javascript
// Continue even if some timeout
const responses = await pt.waitForAllMessagesReceived(taskIds, {
    failFast: false,
    timeout: 60000
});
// responses may contain null for timed-out tasks
const successful = responses.filter(r => r !== null);
```

**Batch Helper Function:**

```javascript
async function askAll(questions, options = {}) {
    const results = await Promise.all(questions.map(q => pt.addMessage(q)));
    return pt.waitForAllMessagesReceived(
        results.map(r => r.task_id),
        options
    );
}

const answers = await askAll(['Q1?', 'Q2?', 'Q3?']);
```

**Related Methods:**
- `pt.addMessage()` - Send messages to the chat
- `pt.waitForMessageReceived()` - Wait for single AI response
- `pt.onMessageReceived()` - Callback-based alternative

### pt.onDocumentChanged(callback, options)

Subscribe to document change events. This method listens for `document_change` socket events and calls the callback whenever a document's status, extracted text, or indexing state changes. Useful for tracking document processing progress after uploads.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `function` | Called with document object on each change |
| `options.documentId` | `number` | Filter to specific document ID |
| `options.documentIds` | `number[]` | Filter to multiple document IDs |
| `options.status` | `string` | Filter to specific DocumentStatus ('Added', 'Loaded', 'Processed', 'Ready', 'Error') |
| `options.statuses` | `string[]` | Filter to multiple statuses |

**Returns:** `function` - Unsubscribe function to remove the listener

**Document Change Object Structure:**

| Property | Type | Description |
|----------|------|-------------|
| `id` | `number` | Document ID |
| `uuid` | `string` | Document UUID |
| `name` | `string` | Document filename |
| `mimetype` | `string` | MIME type (e.g., 'application/pdf') |
| `status` | `string` | DocumentStatus: 'Added', 'Loaded', 'Processed', 'Ready', or 'Error' |
| `extracted_text_size` | `number\|null` | Characters extracted (null if not yet extracted) |
| `indexed` | `string` | 'True' or 'False' — note: socket payloads serialize this field as a string, unlike REST payloads where `indexed` is a real boolean. Compare with `doc.indexed === 'True'` |
| `path` | `string` | Document path in folder structure |
| `chat_uuid` | `string` | UUID of the chat |
| `download_url` | `string` | URL to download the document |

**Basic Usage:**

```javascript
// Subscribe to all document changes
const unsubscribe = pt.onDocumentChanged((doc) => {
    console.log(`Document ${doc.name} changed:`);
    console.log(`  Status: ${doc.status}`);
    console.log(`  Indexed: ${doc.indexed}`);
});
```

**Track Specific Document:**

```javascript
const result = await pt.uploadFiles(form);
const docId = result.documents[0].id;

const unsubscribe = pt.onDocumentChanged((doc) => {
    console.log(`Document ${doc.name}: ${doc.status}`);
    if (doc.status === 'Ready') {
        console.log('Document ready! Text size:', doc.extracted_text_size);
        unsubscribe();
    }
}, { documentId: docId });
```

**Track Multiple Documents:**

```javascript
const result = await pt.uploadFiles(form);
const docIds = result.documents.map(d => d.id);
const readyDocs = new Set();

const unsubscribe = pt.onDocumentChanged((doc) => {
    if (doc.status === 'Ready') {
        readyDocs.add(doc.id);
        updateProgress(readyDocs.size, docIds.length);

        if (readyDocs.size === docIds.length) {
            console.log('All documents ready!');
            unsubscribe();
        }
    }
}, { documentIds: docIds });
```

**Filter by Status:**

```javascript
// Only listen for 'Ready' status
pt.onDocumentChanged((doc) => {
    console.log(`${doc.name} is now ready for RAG search`);
}, { status: 'Ready' });

// Listen for errors
pt.onDocumentChanged((doc) => {
    showError(`Failed to process ${doc.name}`);
}, { status: 'Error' });
```

### pt.waitForDocumentReady(documentId, options)

Wait for a document to reach 'Ready' status. Returns a Promise that resolves when the document is fully processed, text extracted, and indexed for RAG search. Useful after uploading files when you need to wait before accessing the extracted text.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `documentId` | `number` | required | Document ID to wait for |
| `options.timeout` | `number` | `60000` | Timeout in milliseconds (default: 60 seconds) |
| `options.rejectOnError` | `boolean` | `true` | If true, reject promise on 'Error' status |

**Returns:** `Promise<object>` - Resolves with the document object when ready

**Basic Usage:**

```javascript
// Upload and wait for document to be ready
const result = await pt.uploadFiles(form);
const docId = result.documents[0].id;

try {
    const doc = await pt.waitForDocumentReady(docId);
    console.log('Document ready! Text size:', doc.extracted_text_size);

    // Now safe to get the extracted text
    const text = await pt.getDocumentText(docId);
    console.log('Extracted text:', text);
} catch (error) {
    console.error('Document processing failed:', error.message);
}
```

**With Custom Timeout:**

```javascript
// For large files that take longer to process
const doc = await pt.waitForDocumentReady(docId, {
    timeout: 300000  // 5 minutes
});
```

**Wait for Multiple Documents:**

```javascript
const result = await pt.uploadFiles(form);
const docIds = result.documents.map(d => d.id);

const readyDocs = await Promise.all(
    docIds.map(id => pt.waitForDocumentReady(id))
);
console.log('All documents ready:', readyDocs.map(d => d.name));
```

**Handle Errors Gracefully:**

```javascript
// Don't reject on error, handle manually
const doc = await pt.waitForDocumentReady(docId, { rejectOnError: false });
if (doc.status === 'Error') {
    console.log('Document failed, but we can handle it');
} else {
    console.log('Document ready');
}
```

**Related Methods:**
- `pt.uploadFiles()` - Upload files to chat
- `pt.onDocumentChanged()` - Callback-based alternative for multiple documents
- `pt.waitForAllDocumentsReady()` - Wait for multiple documents to be ready
- `pt.getDocumentText()` - Get extracted text content
- `pt.getDocumentStatus()` - Check processing status

### pt.waitForAllDocumentsReady(documentIds, options)

Wait for multiple documents to reach 'Ready' status. Useful after uploading multiple files when you need all of them processed before continuing. Each document is tracked independently via socket events.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `documentIds` | `number[]` | required | Array of document IDs to wait for |
| `options.timeout` | `number` | `120000` | Timeout in milliseconds for ALL documents (default: 2 minutes) |
| `options.failFast` | `boolean` | `true` | If true, reject immediately on first Error |
| `options.rejectOnError` | `boolean` | `true` | If true, reject on document processing errors |
| `options.onProgress` | `function` | - | Callback `(completed, total, document)` called as each document becomes ready |

**Returns:** `Promise<object[]>` - Resolves with array of document objects in same order as `documentIds`

**Basic Usage:**

```javascript
// Upload multiple files and wait for all to be ready
const result = await pt.uploadFiles(form);
const docIds = result.documents.map(d => d.id);

const readyDocs = await pt.waitForAllDocumentsReady(docIds);
console.log('All documents ready:', readyDocs.map(d => d.name));
```

**With Progress Tracking:**

```javascript
const readyDocs = await pt.waitForAllDocumentsReady(docIds, {
    timeout: 180000,
    onProgress: (completed, total, doc) => {
        updateProgressBar(completed / total * 100);
        console.log(`${doc.name} ready (${completed}/${total})`);
    }
});
```

**Graceful Error Handling (failFast: false):**

```javascript
// Continue even if some fail
const docs = await pt.waitForAllDocumentsReady(docIds, {
    failFast: false,
    rejectOnError: false
});
const successful = docs.filter(d => d && d.status === 'Ready');
const failed = docs.filter(d => d && d.status === 'Error');
console.log(`${successful.length} ready, ${failed.length} failed`);
```

**Upload and Wait Helper:**

```javascript
async function uploadAndWait(formData, folder) {
    const result = await pt.uploadFiles(formData, folder);
    const docIds = result.documents.map(d => d.id);
    return pt.waitForAllDocumentsReady(docIds);
}

const docs = await uploadAndWait(form, 'reports');
```

**Related Methods:**
- `pt.uploadFiles()` - Upload files to chat
- `pt.waitForDocumentReady()` - Wait for single document
- `pt.onDocumentChanged()` - Callback-based alternative
- `pt.getDocumentText()` - Get extracted text content

### pt.uploadFiles() - Silent Document Upload

Upload files directly to the chat's document library without creating messages or triggering AI processing. This is ideal for building document libraries, organizing files, or programmatic uploads.

**Syntax:**
```javascript
pt.uploadFiles(formOrFormData, folder?, documentName?, attachmentMode?)
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `formOrFormData` | `HTMLFormElement` \| `FormData` | Form or FormData with files |
| `folder` | `string?` | Optional folder path (e.g., "reports/2024"). The folder is created automatically if it does not exist. |
| `documentName` | `string?` | Optional custom name for the uploaded file. If not provided, the original filename is used. Useful for single file uploads where you want to rename the document. |
| `attachmentMode` | `string?` | Optional attachment mode (`'archived'`, `'search'`, `'attached'`, or `'context'`). Controls how the document is treated by the AI. See [Attachment Modes](#attachment-modes) below. Defaults to `'archived'` if not specified. |

**Returns:** Promise that resolves to an object containing:

```typescript
{
    success: boolean;
    message: string;
    folder: string;
    documents: Array<{
        id: number;
        uuid: string;
        name: string;
        mimetype: string;
        status: 'Added' | 'Loaded' | 'Processed' | 'Ready' | 'Error';
        extracted_text_size: number | null;
        download_url: string;
    }>;
}
```

**Downloading Uploaded Files:**

After uploading files with `uploadFiles`, you can access them using the File Download API:

For live apps: `/api/v1/live/{chat_id}/{file_path}`

The `file_path` is the combination of the folder parameter you provided and the document name. For example, if you uploaded to `reports/2024`, the file path would be `reports/2024/filename.pdf`. See [File Download API](File-Download-API.md) for complete details.

**Usage:**

**Basic upload:**
```javascript
const form = document.getElementById('uploadForm');
const result = await pt.uploadFiles(form);

console.log(`Uploaded ${result.documents.length} files`);
console.log(`Saved to: ${result.folder}`);

result.documents.forEach(doc => {
    console.log(`- ${doc.name} (ID: ${doc.id}, Status: ${doc.status})`);
});
```

**Upload to specific folder:**
```javascript
const fileInput = document.getElementById('fileInput');
const formData = new FormData();
for (const file of fileInput.files) {
    formData.append('files', file);
}

const result = await pt.uploadFiles(formData, 'reports/monthly/2024');
console.log(`Files uploaded to: ${result.folder}`);
```

**Upload with custom document name:**
```javascript
const formData = new FormData();
formData.append('files', myFile);

// Rename the uploaded file to a custom name
const result = await pt.uploadFiles(formData, 'documents', 'quarterly-report-2026.pdf');
console.log(`Uploaded as: ${result.documents[0].name}`);
```

**Upload with attachment mode:**
```javascript
const formData = new FormData();
formData.append('files', myFile);

// Upload and make available for RAG search
const result = await pt.uploadFiles(formData, 'knowledge-base', null, 'search');

// Upload as actively attached context document
const result2 = await pt.uploadFiles(formData, 'context', null, 'attached');
```

**Get document IDs for later use:**
```javascript
// Upload files
const result = await pt.uploadFiles(form, 'images/2024');

// Extract document IDs
const docIds = result.documents.map(doc => doc.id);

// Use IDs to search within these documents
const searchResults = await pt.searchDocuments(
    'keyword',
    'DOCUMENTS_ONLY',
    docIds
);
```

**Check upload status:**
```javascript
const result = await pt.uploadFiles(form);

// Check if all uploads succeeded
const allOk = result.documents.every(doc =>
    doc.status !== 'Error'
);

if (!allOk) {
    console.error('Some uploads failed');
    const failed = result.documents.filter(doc => doc.status === 'Error');
    failed.forEach(doc => console.error(`Failed: ${doc.name}`));
}
```

**Organize uploads by type:**
```javascript
async function uploadByType(files) {
    const formData = new FormData();

    for (const file of files) {
        formData.append('files', file);
    }

    // Determine folder based on file type
    const firstFile = files[0];
    let folder = 'documents';

    if (firstFile.type.startsWith('image/')) {
        folder = 'images';
    } else if (firstFile.type === 'application/pdf') {
        folder = 'pdfs';
    }

    return await pt.uploadFiles(formData, folder);
}
```

**Complete example with HTML:**
```html
<form id="uploadForm">
    <input type="file" name="files" multiple required>
    <button type="submit">Upload Files</button>
</form>

<script>
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;

    try {
        const result = await pt.uploadFiles(form, 'documents/uploads');

        alert(`Uploaded ${result.documents.length} file(s) successfully!`);
        console.log('Document details:', result.documents);

        form.reset();
    } catch (error) {
        alert('Upload failed: ' + error.message);
    }
});
</script>
```

**Important Notes:**
- No message is created in the chat
- No AI processing is triggered
- Files are added directly to the document library
- Returns detailed document information including IDs and UUIDs
- Supports multiple file uploads in a single request
- File size limits and restrictions apply based on system configuration

**Text Extraction Workflow:**

When files are uploaded, PrimeThink automatically extracts text content in the background. This is an **asynchronous process** that takes a few seconds depending on file size and complexity.

**Workflow for retrieving extracted text:**

1. **Upload** - Use `pt.uploadFiles()` to upload documents (optionally specify a folder)
2. **Wait** - Poll document status using `pt.getDocumentStatus(docId)` until extraction completes
3. **Retrieve** - Use `pt.getDocumentText(docId)` to get the extracted Markdown text

**Status Indicators:**
- `status: "Added"` = Extraction not yet complete (keep waiting)
- `status: "Error"` = Extraction failed
- Any other status (`"Loaded"`, `"Processed"`, `"Ready"`) = Extraction complete, text available

**Complete Example with Text Extraction:**

```javascript
// Upload documents and wait for text extraction
async function uploadAndExtractText(files) {
    // Step 1: Upload files
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const uploadResult = await pt.uploadFiles(formData, 'documents/analysis');
    console.log(`Uploaded ${uploadResult.documents.length} files`);

    // Step 2: Wait for extraction to complete
    const extractedDocs = [];

    for (const doc of uploadResult.documents) {
        console.log(`Waiting for extraction: ${doc.name}...`);

        // Poll status until extraction completes
        let status = await pt.getDocumentStatus(doc.id);

        while (status.document_status === 'Added') {
            // Wait 2 seconds before checking again
            await new Promise(resolve => setTimeout(resolve, 2000));
            status = await pt.getDocumentStatus(doc.id);
        }

        if (status.document_status === 'Error') {
            console.error(`Extraction failed for ${doc.name}`);
            continue;
        }

        // Step 3: Retrieve extracted text
        console.log(`Extraction complete for ${doc.name}, status: ${status.document_status}`);
        const textResponse = await pt.getDocumentText(doc.id);

        extractedDocs.push({
            id: doc.id,
            name: doc.name,
            text: textResponse.text,
            size: textResponse.text.length
        });
    }

    return extractedDocs;
}

// Usage
const files = document.getElementById('fileInput').files;
const extractedDocs = await uploadAndExtractText(files);

extractedDocs.forEach(doc => {
    console.log(`${doc.name}: ${doc.size} characters extracted`);
    console.log('First 200 chars:', doc.text.substring(0, 200));
});
```

**Optimized Polling with Timeout:**

```javascript
async function waitForExtraction(docId, maxWaitMs = 60000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
        const status = await pt.getDocumentStatus(docId);

        // Extraction complete
        if (status.document_status !== 'Added' && status.document_status !== 'Error') {
            return { success: true, status: status.document_status };
        }

        // Extraction failed
        if (status.document_status === 'Error') {
            return { success: false, error: 'Extraction failed' };
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { success: false, error: 'Timeout waiting for extraction' };
}

// Usage
const result = await pt.uploadFiles(formData);
const docId = result.documents[0].id;

const extractionResult = await waitForExtraction(docId);

if (extractionResult.success) {
    const response = await pt.getDocumentText(docId);
    console.log('Text extracted:', response.text);
} else {
    console.error('Extraction failed:', extractionResult.error);
}
```

**Common Use Cases:**
- Building document libraries
- Programmatic file organization
- Background file uploads
- Document management systems
- Batch file processing
- API integrations

**When to Use Which Method:**

| Method | Purpose | Creates Message | Triggers AI | Returns |
|--------|---------|----------------|-------------|---------|
| `pt.addMessage(form, message)` | Upload with message/AI processing | Yes | Yes | Message info + file count |
| `pt.uploadFiles(form, folder?, documentName?, attachmentMode?)` | Silent document library upload | No | No | Detailed document info |

**Migrating from Old API:**

If you were using the old `pt.uploadFiles(form, message, hidden, awaitResponse)` signature:

```javascript
// OLD API (deprecated)
await pt.uploadFiles(form, 'Check these files', false, true);

// NEW API - Use pt.addMessage() instead
await pt.addMessage(form, 'Check these files', {
    awaitResponse: true
});
```

### pt.sendNotification(userId, title, text, options?)

Send notifications to a specific user in the chat.

**Parameters:**
- `userId` (number, required): The ID of the user to notify
- `title` (string, required): Notification title
- `text` (string, required): Notification message text
- `options` (object, optional): Additional options
  - `emailBody` (string, optional): Extended content included in the email digest

**Returns:** Promise that resolves to an object with `message` field indicating success

**Delivery:** Notifications are delivered immediately via push and WebSocket. If the user has email notifications enabled, unread notifications are batched and sent as an email digest after a short delay.

**Usage:**
```javascript
// Send notification to a specific user
const members = await pt.getChatMembers();
const targetUser = members.find(m => m.email === 'john@example.com');

await pt.sendNotification(
    targetUser.id,
    'Task Assigned',
    'You have been assigned a new task'
);

// With extended email content
await pt.sendNotification(
    targetUser.id,
    'Meeting Reminder',
    'Team meeting in 15 minutes',
    {
        emailBody: 'Please join the meeting at https://meet.example.com/abc.\n\nAgenda:\n- Q1 Review\n- Budget planning\n- Team updates'
    }
);

// Send notification after task assignment
async function assignTask(taskId, userId) {
    const task = await pt.get(taskId);
    await pt.edit(taskId, { assigned_to: userId }, true);  // merge mode

    // Notify the user with email details
    await pt.sendNotification(
        userId,
        'New Task',
        `You've been assigned: ${task.data.title}`,
        {
            emailBody: `Task Details:\n\n${task.data.description || 'No description'}\n\nDue: ${task.data.due_date || 'Not set'}`
        }
    );
}

// Notify user when task is completed
async function completeTask(taskId) {
    const task = await pt.get(taskId);
    await pt.edit(taskId, { completed: true }, true);  // merge mode

    if (task.data.assigned_to) {
        await pt.sendNotification(
            task.data.assigned_to,
            'Task Completed',
            `Task "${task.data.title}" has been marked as complete`
        );
    }
}
```

**Common Use Cases:**
- Task assignment notifications
- Alert users about important updates
- Remind users of pending actions
- Notify collaborators of changes

**See Also:** [Sending Notifications to Users](primethink_js_send_notifications.md) for `sendNotificationToUsers` and detailed examples

### pt.searchDocuments(query, scope, documentIds)

Perform semantic search across documents and collections using RAG (Retrieval-Augmented Generation).

**Parameters:**
- `query` (string, required): Natural language search query
- `scope` (string, optional): Search scope - "ALL", "DOCUMENTS_ONLY", or "COLLECTIONS_ONLY" (default: "ALL")
- `documentIds` (array of numbers, optional): Limit search to specific document IDs only

**Returns:** Promise that resolves to an object with `results` field containing XML-formatted search results

**Usage:**
```javascript
// Search all documents and collections
const result = await pt.searchDocuments('quarterly financial results Q3 2024');
console.log(result.results);

// Search only documents
const docsOnly = await pt.searchDocuments('project requirements', 'DOCUMENTS_ONLY');

// Search only collections
const collectionsOnly = await pt.searchDocuments('company policies', 'COLLECTIONS_ONLY');

// Search specific documents only (NEW)
const specificDocs = await pt.searchDocuments(
    'budget analysis',
    'DOCUMENTS_ONLY',
    [156, 157, 158]  // Only search these document IDs
);

// Search documents in a folder
async function searchInFolder(query, folderPath) {
    // Get documents in folder
    const folderContents = await pt.listDirectory(folderPath);
    const documentIds = folderContents.entries
        .filter(e => e.type === 'file')
        .map(e => e.id);

    // Search only those documents
    return await pt.searchDocuments(query, 'DOCUMENTS_ONLY', documentIds);
}

// Build a search interface
async function searchKnowledgeBase(query) {
    try {
        const result = await pt.searchDocuments(query);
        displaySearchResults(result.results);
    } catch (error) {
        console.error('Search failed:', error);
    }
}

// Search with user input
async function handleSearch() {
    const query = document.getElementById('searchInput').value;
    const scope = document.getElementById('scopeSelect').value;

    if (!query) {
        alert('Please enter a search query');
        return;
    }

    const results = await pt.searchDocuments(query, scope);
    document.getElementById('resultsArea').textContent = results.results;
}
```

**Common Use Cases:**
- Knowledge base search
- Find relevant documents
- Research and discovery
- Content recommendation

### pt.getDocumentText(docId, options)

Retrieve the text content from a document.

**Parameters:**
- `docId` (number, required): Document ID
- `options` (object, optional): Options object with:
  - `from` (number): Start character position (default: 0)
  - `to` (number): End character position (default: null for full text)

**Returns:** Promise that resolves to a flat result object containing:
- `document_id` (number): The document ID
- `text` (string | null): Document text content in Markdown format (or `null` if not ready)
- `full_text` (boolean, optional): `true` if returning complete document text (present when text is available)
- `status` (string, optional): Processing status if document not ready (e.g., `"DocumentStatus.added"`)
- `message` (string, optional): Status message if document not ready

**Response Examples:**

When document is not ready:
```json
{
    "document_id": 1339,
    "status": "DocumentStatus.added",
    "message": "Document not ready. Current status: DocumentStatus.added",
    "text": null
}
```

!!! warning "Status serialization in this response"
    The `status` field of this not-ready response uses the internal enum representation (`"DocumentStatus.added"`), not the plain `"Added"` value returned by `pt.getDocumentStatus()`. Do not string-match against this field — check readiness with `pt.getDocumentStatus()` (or simply test whether `text` is `null`).

When document is ready:
```json
{
    "document_id": 1339,
    "text": "# Document Title\n\nDocument content in Markdown format...",
    "full_text": true
}
```

**About Text Extraction:**

When documents are uploaded, PrimeThink automatically extracts text content asynchronously in the background. The extraction process:

- **Is Asynchronous**: Takes a few seconds depending on file size and complexity
- **Returns Markdown**: Extracted text is formatted as Markdown, preserving structure, tables, and formatting
- **Requires Status Check**: Before calling this method, ensure the document status is no longer `"Added"` by using `pt.getDocumentStatus()`

**Best Practice**: After uploading a document with `pt.uploadFiles()` or `pt.addMessage()`, wait for the extraction to complete:

```javascript
// 1. Upload document
const upload = await pt.uploadFiles(formData, 'folder');
const docId = upload.documents[0].id;

// 2. Wait for extraction
let status = await pt.getDocumentStatus(docId);
while (status.document_status === 'Added') {
    await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds
    status = await pt.getDocumentStatus(docId);
}

// 3. Retrieve text (only after status is no longer "Added")
const response = await pt.getDocumentText(docId);
console.log('Extracted text:', response.text);
```

**Usage:**
```javascript
// Get full document text
const response = await pt.getDocumentText(123);
console.log(response.text);

// Get first 1000 characters (preview)
const preview = await pt.getDocumentText(123, { from: 0, to: 1000 });
console.log(preview.text);

// Get text starting from character 500
const partial = await pt.getDocumentText(123, { from: 500 });
console.log(partial.text);

// Build a document viewer with status handling
async function viewDocument(docId) {
    try {
        const result = await pt.getDocumentText(docId);

        if (result.text) {
            // Document is ready
            document.getElementById('documentContent').textContent = result.text;

            if (result.full_text) {
                console.log('Showing complete document');
            } else {
                console.log('Showing partial document text');
            }
        } else if (result.status) {
            // Document is still processing
            alert(`Document not ready. Status: ${result.status}\n${result.message}`);

            // Optionally retry after a delay
            setTimeout(() => viewDocument(docId), 5000);
        } else {
            alert('No text available');
        }
    } catch (error) {
        console.error('Error loading document:', error);
    }
}

// Load document preview
async function loadPreview(docId) {
    const result = await pt.getDocumentText(docId, { to: 500 });

    if (result.text) {
        document.getElementById('preview').textContent = result.text + '...';
    } else if (result.status) {
        document.getElementById('preview').textContent = '⏳ Document is being processed...';
    }
}

// Handle document status with polling
async function loadDocumentWithRetry(docId, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        const result = await pt.getDocumentText(docId);

        if (result.text) {
            // Document ready
            return result;
        }

        if (result.status) {
            console.log(`Document still processing, attempt ${i + 1}/${maxRetries}`);
            console.log(`Status: ${result.status}`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        } else {
            // Document has an error or is unavailable
            throw new Error(result.message || 'Document unavailable');
        }
    }

    throw new Error('Document processing timeout');
}
```

**Common Use Cases:**
- Document preview
- Content analysis
- Text extraction
- Partial content loading for large documents

### pt.saveDocument(filename, format, mimetype, content, folder, attachmentMode)

Create and save content as a document in the chat.

**Parameters:**
- `filename` (string, required): Filename with extension
- `format` (string, required): Format type - "TXT", "MD", "HTML", "DOCX", "PDF", "CSV", "XLSX", or "CUSTOM"
- `mimetype` (string, required): MIME type (e.g., "text/plain", "application/pdf")
- `content` (string, required): Document content
- `folder` (string, optional): Destination folder path (e.g., "reports", "exports/monthly"). The folder is created automatically if it does not exist.
- `attachmentMode` (string, optional): Controls how the document is treated by the AI (`'archived'`, `'search'`, `'attached'`, or `'context'`). See [Attachment Modes](#attachment-modes) below. Defaults to `'archived'` if not specified.

**Storage Locations:**

The `folder` parameter supports special prefixes for different access levels:
- **`@public`** - Public access (no authentication required). Use for files that should be publicly accessible.
- **`@liveapp`** - Group-level access (authentication + group membership required). Use for files shared across the group.
- **No prefix** - Chat-specific access (authentication + chat membership required). Default and most secure option.

Examples:
- `@public` - Save to public folder
- `@liveapp` - Save to group-wide live app folder
- `reports` - Save to chat-specific "reports" folder
- `exports/monthly` - Save to chat-specific nested folder

For detailed information about file storage hierarchy and access control, see [File Storage Hierarchy](/File-Storage-Hierarchy/).

**Format Guidelines:**
- **TXT**: Plain text (no Markdown)
- **MD/MARKDOWN**: Markdown text
- **HTML**: HTML content (not Markdown)
- **DOCX**: Use Markdown text (will be converted to Word format)
- **PDF**: Use Markdown text (will be converted to PDF)
- **CSV**: Plain CSV format text
- **XLSX**: Plain CSV format text (will be converted to Excel)
- **CUSTOM**: Any non-binary plain text format

**Returns:** Promise that resolves to a flat result object containing:
- `success`: Boolean indicating document save success
- `message`: Success message (e.g., "Document(s) saved")
- `filename`: Name of the saved file
- `format`: Format type used (e.g., "PDF")
- `documents`: Array of document objects, each containing:
  - `id`: Document ID (number)
  - `uuid`: Document UUID (string)
  - `name`: Document filename (string)
  - `mimetype`: MIME type (string)
  - `status`: Status (e.g., "Added")
  - `extracted_text_size`: Size of extracted text in bytes (number)
  - `download_url`: URL to download the document (string)

**Response Structure:**
```json
{
  "success": true,
  "message": "Document(s) saved",
  "filename": "Team_Expense_Report_2026-01-20.pdf",
  "format": "PDF",
  "documents": [
    {
      "id": 2301,
      "uuid": "b8c9d0e1-f2a3-4456-9345-678901234567",
      "name": "Team_Expense_Report_2026-01-20.pdf",
      "mimetype": "application/pdf",
      "status": "Added",
      "extracted_text_size": 3715,
      "download_url": "https://api.primethink.ai/api/v1/documents/uuid/b8c9d0e1-f2a3-4456-9345-678901234567/download/stream"
    }
  ]
}
```

**Downloading Saved Files:**

After saving a document, you can download it using the file path and the File Download API. The `download_url` in the response provides a UUID-based download link, but you can also use the simpler path-based download endpoint.

For live apps, use: `/api/v1/live/{chat_id}/{file_path}`

Where `file_path` is the folder and filename you used when saving. See [File Download API](File-Download-API.md) for details.

**Usage:**
```javascript
// Save a plain text document
const result = await pt.saveDocument(
    'notes.txt',
    'TXT',
    'text/plain',
    'These are my meeting notes from today.'
);

// Access document details
const savedDoc = result.documents[0];
console.log('Document ID:', savedDoc.id);
console.log('Document UUID:', savedDoc.uuid);
console.log('Download URL:', savedDoc.download_url);

// Save a Markdown document
await pt.saveDocument(
    'report.md',
    'MD',
    'text/markdown',
    '# Project Report\n\n## Summary\n\nThe project is progressing well.'
);

// Save as Word document (using Markdown)
await pt.saveDocument(
    'proposal.docx',
    'DOCX',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '# Business Proposal\n\n## Executive Summary\n\nThis proposal outlines...'
);

// Save as PDF (using Markdown)
const pdfResult = await pt.saveDocument(
    'invoice.pdf',
    'PDF',
    'application/pdf',
    '# Invoice #12345\n\n**Date:** 2025-01-15\n**Amount:** $1,250.00'
);

// Access document details from the response
const pdfDoc = pdfResult.result.documents[0];
console.log('PDF saved:', pdfResult.result.filename);
console.log('Document ID:', pdfDoc.id);
console.log('UUID:', pdfDoc.uuid);
console.log('Download URL:', pdfDoc.download_url);
console.log('Extracted text size:', pdfDoc.extracted_text_size, 'bytes');

// Save CSV data
await pt.saveDocument(
    'data.csv',
    'CSV',
    'text/csv',
    'Name,Email,Age\nJohn Doe,john@example.com,30\nJane Smith,jane@example.com,28'
);

// Save to a specific folder
await pt.saveDocument(
    'monthly-report.pdf',
    'PDF',
    'application/pdf',
    '# Monthly Report\n\n## Q1 2025\n\nRevenue increased by 15%.',
    'reports/2025/Q1'  // Folder path
);

// Organize documents by type
await pt.saveDocument(
    'customer-invoice.pdf',
    'PDF',
    'application/pdf',
    invoiceContent,
    'invoices'
);

await pt.saveDocument(
    'meeting-notes.md',
    'MD',
    'text/markdown',
    notesContent,
    'meetings/2025-01'
);

// Save to public folder (accessible without authentication)
await pt.saveDocument(
    'brochure.pdf',
    'PDF',
    'application/pdf',
    '# Company Brochure\n\nWelcome to our company!',
    '@public'
);

// Save to live app folder (group-wide access)
await pt.saveDocument(
    'template.html',
    'HTML',
    'text/html',
    '<div>Reusable template</div>',
    '@liveapp'
);

// Save with attachment mode — make searchable via RAG
await pt.saveDocument(
    'knowledge-base-entry.md',
    'MD',
    'text/markdown',
    '# Product FAQ\n\nCommon questions and answers...',
    'knowledge',
    'search'
);

// Save as actively attached context document
await pt.saveDocument(
    'project-context.md',
    'MD',
    'text/markdown',
    '# Project Context\n\nKey decisions and constraints...',
    'context',
    'attached'
);

// Generate and save a report with document details
async function generateReport(data) {
    const content = `# Monthly Report

## Summary
Total items: ${data.length}

## Details
${data.map(item => `- ${item.name}: ${item.value}`).join('\n')}
`;

    const result = await pt.saveDocument(
        'monthly-report.pdf',
        'PDF',
        'application/pdf',
        content
    );

    // Access document details directly from JSON response
    const doc = result.documents[0];

    const documentDetails = {
        id: doc.id,
        uuid: doc.uuid,
        name: doc.name,
        downloadUrl: doc.download_url,
        size: doc.extracted_text_size
    };

    alert(`Report generated successfully!\nDocument ID: ${documentDetails.id}\nUUID: ${documentDetails.uuid}`);
    return documentDetails;
}

// Helper function for common MIME types
function getMimeType(format) {
    const types = {
        'TXT': 'text/plain',
        'MD': 'text/markdown',
        'HTML': 'text/html',
        'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'PDF': 'application/pdf',
        'CSV': 'text/csv',
        'XLSX': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    return types[format] || 'text/plain';
}

// Save with helper
await pt.saveDocument('report.pdf', 'PDF', getMimeType('PDF'), content);

// Working with document response
async function saveAndProcessDocument(content, filename) {
    const result = await pt.saveDocument(
        filename,
        'PDF',
        'application/pdf',
        content
    );

    if (result.success) {
        // Access the saved document details
        const doc = result.documents[0];

        // You can now use the document details
        console.log(`Document saved successfully!`);
        console.log(`- ID: ${doc.id}`);
        console.log(`- UUID: ${doc.uuid}`);
        console.log(`- Name: ${doc.name}`);
        console.log(`- MIME Type: ${doc.mimetype}`);
        console.log(`- Status: ${doc.status}`);
        console.log(`- Text Size: ${doc.extracted_text_size} bytes`);
        console.log(`- Download: ${doc.download_url}`);

        // Store document ID for later use
        await pt.add('document_metadata', {
            document_id: doc.id,
            document_uuid: doc.uuid,
            filename: doc.name,
            created_date: new Date().toISOString()
        });

        return doc;
    } else {
        console.error('Failed to save document');
        return null;
    }
}

// Document organization pattern
async function saveOrganizedDocument(type, data, date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const folders = {
        'invoice': `invoices/${year}/${month}`,
        'report': `reports/${year}/Q${Math.ceil((date.getMonth() + 1) / 3)}`,
        'meeting': `meetings/${year}/${month}`,
        'contract': `contracts/${year}`
    };

    const folder = folders[type] || 'documents';

    return await pt.saveDocument(
        data.filename,
        data.format,
        getMimeType(data.format),
        data.content,
        folder
    );
}

// Usage: Automatically organized by date and type
await saveOrganizedDocument('invoice', {
    filename: 'invoice-12345.pdf',
    format: 'PDF',
    content: invoiceMarkdown
});
// Saves to: invoices/2025/01/invoice-12345.pdf

await saveOrganizedDocument('report', {
    filename: 'quarterly-summary.pdf',
    format: 'PDF',
    content: reportMarkdown
});
// Saves to: reports/2025/Q1/quarterly-summary.pdf
```

**MIME Type Reference:**
- Plain text: `text/plain`
- Markdown: `text/markdown`
- HTML: `text/html`
- Word: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- PDF: `application/pdf`
- CSV: `text/csv`
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Common Use Cases:**
- Report generation
- Export data to various formats
- Create documentation
- Save user-generated content
- Generate invoices and forms

### Attachment Modes

The `attachmentMode` parameter (available on `pt.uploadFiles()` and `pt.saveDocument()`) controls how a document is treated by the AI after upload. This sets the document's `DocumentInChatStatus`. If not specified or if an invalid value is provided, it defaults to `'archived'`. Invalid values are rejected client-side before reaching the backend.

| Value        | Description                                                                    |
|--------------|--------------------------------------------------------------------------------|
| `'archived'`  | **(default)** Stored in the chat but not actively used by the AI. The agent can still read the document using its tools. |
| `'search'`    | Indexed in the vector database and included in semantic search / RAG retrieval. |
| `'attached'`  | Attached as media to the LLM call — treated as an actively attached context document. |
| `'context'`   | The entire text of the document is added into the context for each LLM call.   |

**When to use each mode:**

- **`'archived'`** — Use for files that should be stored for reference. The AI agent can still read them using tools, but they are not automatically included in AI context (e.g., backups, exports, logs).
- **`'search'`** — Use for knowledge base content that should be indexed in the vector database for semantic search / RAG retrieval (e.g., FAQs, documentation, policies).
- **`'attached'`** — Use for documents that should be attached as media to each LLM call (e.g., images, PDFs the AI needs to see directly).
- **`'context'`** — Use for documents whose full text should be injected into the LLM context on every call (e.g., project briefs, reference specs, system instructions).

---

### pt.listDirectory(path)

List directory contents at a path in the chat's document structure (Unix ls-like navigation).

**Parameters:**
- `path` (string, required): Path to list (e.g., `/`, `/reports`, `/reports/2024`)

**Special Folders:**
The system includes special folders with different access levels:
- `/` (root) - Lists chat-specific files and folders
- Public files are stored in a special `@public` location (accessible without authentication)
- Group-wide files are stored in a special `@liveapp` location (accessible to all group members)

See [File Storage Hierarchy](/File-Storage-Hierarchy/) for details on access control and storage locations.

**Returns:** Promise resolving to:
```javascript
{
    path: "/reports",
    entries: [
        {
            type: "dir",
            id: 42,
            name: "2024",
            custom_name: null,
            status: null,
            has_children: true,
            path: "reports.2024"
        },
        {
            type: "file",
            id: 156,
            name: "summary.pdf",
            custom_name: "Q4 Summary",
            status: "search",
            has_children: null,
            path: "reports"
        }
    ]
}
```

**Usage:**
```javascript
// List root directory
const root = await pt.listDirectory('/');
console.log('Root folders:', root.entries.filter(e => e.type === 'dir'));

// List specific folder
const reports = await pt.listDirectory('/reports');
console.log('Documents in reports:', reports.entries.filter(e => e.type === 'file'));

// Build file browser
async function buildFileBrowser(path = '/') {
    const contents = await pt.listDirectory(path);

    return contents.entries.map(entry => {
        if (entry.type === 'dir') {
            return `📁 ${entry.name} (${entry.has_children ? 'has items' : 'empty'})`;
        } else {
            return `📄 ${entry.custom_name || entry.name} [${entry.status}]`;
        }
    }).join('\n');
}
```

### pt.getDocumentStatus(docId)

Check the current processing/availability status of a document.

**Parameters:**
- `docId` (number, required): The document ID to check

**Returns:**
```javascript
{
    document_id: 156,
    document_status: "Ready"  // See DocumentStatus values below
}
```

**DocumentStatus Values:**

When documents are uploaded, PrimeThink processes them through a pipeline. The `document_status` field reflects the current stage:

| Status        | Description                                                                                     |
|---------------|-------------------------------------------------------------------------------------------------|
| `"Added"`     | File has been uploaded. The original file is stored but no text has been extracted yet.          |
| `"Loaded"`    | Text has been extracted from the document.                                                      |
| `"Processed"` | If the file needs indexing, chunks have been created.                                           |
| `"Ready"`     | Chunks have been indexed and the document is ready for semantic search / RAG.                   |
| `"Error"`     | An error occurred during extraction or indexing.                                                |

**Use this method to poll for processing completion** after uploading documents with `pt.uploadFiles()` or `pt.addMessage()`. Once the status is no longer `"Added"`, you can safely retrieve the extracted text using `pt.getDocumentText()`. Wait for `"Ready"` if you need the document to be available for RAG / semantic search.

**Usage:**
```javascript
// Check if document text is available
const status = await pt.getDocumentStatus(156);
if (status.document_status !== 'Added') {
    const text = await pt.getDocumentText(156);
} else {
    console.log('Document is still being processed...');
}

// Poll until ready for RAG search
async function waitForDocument(docId, maxWait = 60000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        const status = await pt.getDocumentStatus(docId);
        if (status.document_status === 'Ready') return true;
        if (status.document_status === 'Error') throw new Error('Document processing failed');
        await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error('Document processing timeout');
}
```

### pt.getDocumentInfo(documentPath)

Get detailed information about a document by its path. Returns a DocumentInChat object with the full Document object nested inside, providing complete metadata about both the document-in-chat relationship and the underlying document.

**Parameters:**
- `documentPath` (string, required): Path to the document
  - Supports `@public` prefix for public files
  - Supports `@liveapp` prefix for live app files
  - Supports chat-relative paths like `"folder/file.txt"` or `"/folder/file.txt"`
  - Simple filenames like `"file.txt"` search in order: @public → @liveapp → chat root

**Returns:** Promise that resolves to a DocumentInChat object with nested document:

```javascript
{
  "created_at": "2026-02-01T19:15:17.618597+00:00",  // When added to chat
  "from_user_id": 1,                                 // User who uploaded
  "indexed": true,                                   // Whether indexed for RAG search
  "name": "translation_1900.pdf",                    // Display name in chat
  "status": "search",                                // Document-in-chat status
  "type": "document",                                // Type identifier
  "path": "/translations",                           // Folder path in chat
  "document": {                                      // Full Document object
    "id": 2368,                                      // Document ID
    "uuid": "c9d0e1f2-a3b4-4567-8456-789012345678", // Document UUID
    "name": "translation_1900.pdf",                  // Original filename
    "mimetype": "application/pdf",                   // MIME type
    "status": "Ready",                               // Processing status
    "extracted_text_size": 1175,                     // Size of extracted text in chars
    "download_url": "https://api.primethink.ai/...", // URL to download
    "short_description": "Brief description...",     // AI-generated short description
    "summary": "Detailed summary...",                // AI-generated summary
    "keywords": "keyword1, keyword2, ...",           // AI-generated keywords
    "keypoints": "Point 1, Point 2, ..."             // AI-generated key points
  }
}
```

**Response Structure:**

**DocumentInChat fields:**
- `created_at` (string): When the document was added to the chat (ISO 8601)
- `from_user_id` (number): ID of the user who uploaded the document
- `indexed` (boolean): Whether the document is indexed for RAG search
- `name` (string): Display name in chat
- `status` (string): Document-in-chat status (`"search"`, `"hidden"`, etc.)
- `type` (string): Type identifier (typically `"document"`)
- `path` (string): Folder path in chat's document hierarchy

**Nested document object:**
- `id` (number): Document ID
- `uuid` (string): Document UUID
- `name` (string): Original filename
- `mimetype` (string): MIME type
- `status` (string): DocumentStatus (`"Added"`, `"Loaded"`, `"Processed"`, `"Ready"`, `"Error"`)
- `extracted_text_size` (number): Size of extracted text in characters (0 if text not yet extracted)
- `download_url` (string): URL to download the document
- `short_description` (string?): AI-generated short description (null or absent if analysis not finished)
- `summary` (string?): AI-generated summary (null or absent if analysis not finished)
- `keywords` (string?): AI-generated keywords (null or absent if analysis not finished)
- `keypoints` (string?): AI-generated key points (null or absent if analysis not finished)

**Processing States:**

Documents go through multiple processing stages:

1. **Text Extraction** (`extracted_text_size`):
   - `0` = Text not yet extracted
   - `> 0` = Text extraction complete

2. **AI Analysis** (`short_description`, `summary`, `keywords`, `keypoints`):
   - `null` or absent = Analysis not yet complete
   - Present with values = Analysis complete

These stages happen sequentially: text is extracted first, then AI analysis runs on the extracted text.

**Usage Examples:**

```javascript
// Get info about a live app file
const docInfo = await pt.getDocumentInfo('@liveapp/config.json');
console.log('Document ID:', docInfo.document.id);
console.log('Status:', docInfo.document.status);
console.log('MIME type:', docInfo.document.mimetype);

// Check if document extraction is ready
const docInfo = await pt.getDocumentInfo('reports/annual.pdf');
if (docInfo.document.status === 'Ready') {
    console.log('Document text is ready');
    const text = await pt.getDocumentText(docInfo.document.id);
    console.log('Extracted text:', text.text);
} else {
    console.log('Document is still processing, status:', docInfo.document.status);
}

// Get document metadata for display
const docInfo = await pt.getDocumentInfo('@public/demo.pdf');
document.getElementById('fileName').textContent = docInfo.name;
document.getElementById('fileType').textContent = docInfo.document.mimetype;
document.getElementById('status').textContent = docInfo.document.status;

// Build file information card
async function showFileInfo(path) {
    const info = await pt.getDocumentInfo(path);
    const doc = info.document;

    return `
        <div class="file-card">
            <h3>${info.name}</h3>
            <ul>
                <li>Type: ${doc.mimetype}</li>
                <li>Status: ${doc.status}</li>
                <li>Indexed: ${info.indexed ? 'Yes' : 'No'}</li>
                <li>Created: ${new Date(info.created_at).toLocaleDateString()}</li>
            </ul>
            <a href="${doc.download_url}">Download</a>
        </div>
    `;
}

// Validate document exists before processing
async function processDocument(path) {
    try {
        const docInfo = await pt.getDocumentInfo(path);

        if (docInfo.document.status === 'Error') {
            throw new Error('Document processing failed');
        }

        if (docInfo.document.status === 'Added') {
            console.log('Waiting for document extraction...');
            // Wait for extraction to complete
            await pt.waitForDocumentReady(docInfo.document.id);
        }

        // Process document
        const text = await pt.getDocumentText(docInfo.document.id);
        return analyzeText(text.text);

    } catch (error) {
        console.error('Document not found or inaccessible:', error);
        return null;
    }
}

// Get document by various path formats
const publicDoc = await pt.getDocumentInfo('@public/brochure.pdf');
const liveAppDoc = await pt.getDocumentInfo('@liveapp/template.json');
const chatDoc = await pt.getDocumentInfo('/reports/2025/Q1.xlsx');
const simpleDoc = await pt.getDocumentInfo('readme.txt'); // Searches @public → @liveapp → chat root
```

**Common Use Cases:**
- Validate document exists before processing
- Check document extraction status
- Display document metadata in UI
- Get document ID for use with other API methods
- Build file browsers and document managers
- Verify file size before downloading
- Show document processing status to users

**Related Methods:**
- Use `pt.getDocumentText(docId)` to retrieve the extracted text content
- Use `pt.getDocumentStatus(docId)` to check only the processing status
- Use `pt.getDocumentInfoById(docId)` to get document info by ID instead of path
- See [File Download API](File-Download-API.md) for downloading documents by path
- See [File Storage Hierarchy](/File-Storage-Hierarchy/) for details about `@public` and `@liveapp` paths

### pt.getDocumentInfoById(documentId)

Get detailed information about a document by its ID. Returns the same DocumentInChat object as `pt.getDocumentInfo()`, but looks up the document using its numeric ID instead of a file path. This is useful when you already have a document ID from another API call (e.g., from `pt.getDocumentsInCollections()` or `pt.list()`).

**Parameters:**
- `documentId` (number, required): The document ID

**Returns:** Promise that resolves to a DocumentInChat object with nested document (same structure as `pt.getDocumentInfo()`):

```javascript
{
  "created_at": "2026-02-01T19:15:17.618597+00:00",
  "from_user_id": 1,
  "indexed": true,
  "name": "photo_gallery.png",
  "status": "search",
  "type": "document",
  "path": "/images",
  "document": {
    "id": 2368,
    "uuid": "c9d0e1f2-a3b4-4567-8456-789012345678",
    "name": "photo_gallery.png",
    "mimetype": "image/png",
    "status": "Ready",
    "extracted_text_size": 0,
    "download_url": "https://api.primethink.ai/...",
    "short_description": "A gallery of product photos...",
    "summary": "Collection of product photographs...",
    "keywords": "product, gallery, photos",
    "keypoints": "Product showcase images"
  }
}
```

**Usage:**
```javascript
// Get document info by ID
const docInfo = await pt.getDocumentInfoById(42);
console.log('Name:', docInfo.name);
console.log('MIME type:', docInfo.document.mimetype);
console.log('Status:', docInfo.document.status);

// Use with documents from a collection
const docs = await pt.getDocumentsInCollections([10]);
const firstDoc = docs['10'][0];
const fullInfo = await pt.getDocumentInfoById(firstDoc.id);
console.log('UUID:', fullInfo.document.uuid);
console.log('Download URL:', fullInfo.document.download_url);

// Check if document is ready for processing
const docInfo = await pt.getDocumentInfoById(documentId);
if (docInfo.document.status === 'Ready') {
    const text = await pt.getDocumentText(docInfo.document.id);
    console.log('Document text:', text);
}

// Build a document detail view
async function showDocumentDetails(docId) {
    const info = await pt.getDocumentInfoById(docId);
    const doc = info.document;

    return `
        <div class="doc-details">
            <h3>${info.name}</h3>
            <p>Type: ${doc.mimetype}</p>
            <p>Status: ${doc.status}</p>
            <p>Uploaded: ${new Date(info.created_at).toLocaleDateString()}</p>
            ${doc.summary ? `<p>Summary: ${doc.summary}</p>` : ''}
            <a href="${doc.download_url}">Download</a>
        </div>
    `;
}
```

**Common Use Cases:**
- Get full document metadata when you have a document ID from another API call
- Look up document details from collection listings
- Retrieve download URLs for documents
- Check document processing status by ID

**Related Methods:**
- Use `pt.getDocumentInfo(path)` to look up a document by its file path instead
- Use `pt.getDocumentText(docId)` to retrieve the extracted text content
- Use `pt.getDocumentStatus(docId)` to check only the processing status

### pt.deleteDocuments(documentIds)

Bulk delete documents from the chat.

**Parameters:**
- `documentIds` (array of numbers, required): List of document IDs to delete

**Returns:**
```javascript
{
    document_ids: [156, 157, 158],
    deleted: true
}
```

**Usage:**
```javascript
// Delete multiple documents
await pt.deleteDocuments([156, 157, 158]);

// Delete with confirmation
async function deleteSelectedDocs(docIds) {
    if (!confirm(`Delete ${docIds.length} documents?`)) return;
    await pt.deleteDocuments(docIds);
    await loadDocumentList();
}
```

**Note:** Only deletes documents owned by the current user.

### pt.downloadDocuments(documentIds, asZip)

Download one or more documents.

**Parameters:**
- `documentIds` (array of numbers, required): Document IDs to download
- `asZip` (boolean, optional): Force ZIP output (default: false, auto-ZIP for multiple files)

**Returns:** StreamingResponse with file download

**Usage:**
```javascript
// Download single document
await pt.downloadDocuments([156]);

// Download multiple as ZIP
await pt.downloadDocuments([156, 157, 158], true);

// Download button handler
async function handleDownload(docIds) {
    try {
        await pt.downloadDocuments(docIds, docIds.length > 1);
    } catch (error) {
        alert('Download failed: ' + error.message);
    }
}
```

### pt.listCollections()

Returns all collections associated with the chat.

**Returns:** Array of collection objects:
```javascript
[
    {
        id: 10,
        created_at: "2024-01-15T10:30:00Z",
        last_updated_at: "2024-01-20T14:00:00Z",
        name: "Research Papers",
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        user_id: 1,
        description: "Collection of research papers",
        group_id: 5,
        public: false,
        indexed: true,
        extra: { "source": "arxiv", "category": "ml" },
        tags: [{ id: 1, name: "research" }],
        status: "active"
    }
]
```

**Collection Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Collection ID |
| `name` | string | Collection name |
| `description` | string | Collection description |
| `uuid` | string | Collection UUID |
| `created_at` | string | ISO creation timestamp |
| `last_updated_at` | string | ISO last update timestamp |
| `user_id` | number | Owner user ID |
| `group_id` | number | Group ID |
| `public` | boolean | Whether collection is publicly accessible |
| `indexed` | boolean | Whether the collection is indexed for semantic search. When `false`, search operations return empty results. |
| `extra` | object\|null | Optional JSON object for custom metadata. Can store arbitrary key-value data. |
| `tags` | array | Array of tag objects |
| `status` | string | Collection status |

**Usage:**
```javascript
// Get all collections
const collections = await pt.listCollections();

// Display collections
collections.forEach(col => {
    console.log(`${col.name}: ${col.description}`);
});

// Build collection selector
function createCollectionSelector(collections) {
    return collections.map(col => `
        <option value="${col.id}">${col.name}</option>
    `).join('');
}

// Filter to only indexed (searchable) collections
const searchable = collections.filter(c => c.indexed);
console.log(`${searchable.length} collections available for search`);

// Access custom metadata from the extra field
collections.forEach(col => {
    if (col.extra) {
        console.log(`${col.name} metadata:`, col.extra);
    }
});
```

### pt.getDocumentsInCollections(collectionIds)

Returns documents within specified collections, grouped by collection ID.

**Parameters:**
- `collectionIds` (array of numbers, required): List of collection IDs

**Returns:** Object keyed by collection ID (as strings):
```javascript
{
    "10": [
        { id: 200, name: "paper1.pdf", custom_name: "ML Paper", ... },
        { id: 201, name: "paper2.pdf", ... }
    ],
    "15": [
        { id: 300, name: "report.docx", ... }
    ]
}
```

**Usage:**
```javascript
// Get documents in specific collections
const docs = await pt.getDocumentsInCollections([10, 15]);

// Display by collection
Object.entries(docs).forEach(([collId, documents]) => {
    console.log(`Collection ${collId}: ${documents.length} documents`);
});

// Combine all documents
const allDocs = Object.values(docs).flat();
```

### pt.searchImagesInCollection(options)

Search for images within a collection using either an uploaded image file (visual similarity search) or a text query (metadata-based search). The collection must be associated with the current chat.

**Parameters:**
- `options` (object, required): Search configuration object with:
  - `collectionId` (number, required): ID of the collection to search in
  - `query` (string): Text query for text-based search (provide either `query` or `imageFile`, not both)
  - `imageFile` (File): Image file for image-based similarity search (provide either `query` or `imageFile`, not both)
  - `searchType` (string, optional): Search algorithm — `"mmr"` (Maximum Marginal Relevance, default), `"similarity"`, or `"similarity_score_threshold"`
  - `topK` (number, optional): Number of results to return, 1–100
  - `scoreThreshold` (number, optional): Minimum similarity score between 0 and 1

**Returns:** Promise that resolves to an array of search result objects:
```javascript
[
    {
        "text": "Extracted text or description of the image",
        "metadata": {
            "source_type": "image",
            "document_id": 456,
            "source_url": "https://...",
            // ... additional metadata fields
        }
    }
]
```

**Usage:**
```javascript
// Text-based image search
const results = await pt.searchImagesInCollection({
    collectionId: 10,
    query: 'sunset over ocean',
    topK: 5
});
results.forEach(r => {
    console.log(r.text, r.metadata);
});

// Image-based similarity search (find visually similar images)
const fileInput = document.getElementById('imageInput');
const results = await pt.searchImagesInCollection({
    collectionId: 10,
    imageFile: fileInput.files[0],
    topK: 10,
    scoreThreshold: 0.7
});

// Display image search results in a gallery
const results = await pt.searchImagesInCollection({
    collectionId: 10,
    query: 'product photos',
    searchType: 'similarity'
});
const gallery = document.getElementById('gallery');
results.forEach(r => {
    const img = document.createElement('img');
    img.src = r.metadata.source_url || r.metadata.download_url;
    img.alt = r.text;
    gallery.appendChild(img);
});

// Build an image search interface
async function searchImages() {
    const query = document.getElementById('searchInput').value;
    const collectionId = parseInt(document.getElementById('collectionSelect').value);

    const results = await pt.searchImagesInCollection({
        collectionId,
        query,
        topK: 20,
        searchType: 'mmr'  // Diverse results
    });

    displayResults(results);
}

// Upload an image to find similar ones
async function findSimilarImages(imageFile, collectionId) {
    try {
        const results = await pt.searchImagesInCollection({
            collectionId,
            imageFile,
            topK: 10,
            scoreThreshold: 0.5
        });
        return results;
    } catch (error) {
        console.error('Image search failed:', error);
        return [];
    }
}
```

**Search Types:**
- `"mmr"` (default): Maximum Marginal Relevance — balances relevance with diversity to avoid redundant results
- `"similarity"`: Pure similarity ranking — returns the most similar results regardless of diversity
- `"similarity_score_threshold"`: Like similarity, but filters out results below the `scoreThreshold`

**Common Use Cases:**
- Visual similarity search (find images that look like an uploaded reference image)
- Text-based image discovery (find images matching a text description)
- Image gallery filtering and search
- Product image matching
- Content moderation and duplicate detection

**Related Methods:**
- Use `pt.listCollections()` to get available collection IDs
- Use `pt.getDocumentsInCollections(collectionIds)` to list documents in collections
- Use `pt.searchDocuments(query, scope)` for general document/collection search

## Entity Structure

All entities follow this consistent structure:

```javascript
{
    // System fields (managed automatically)
    id: 123,                    // Unique entity ID
    entity_name: 'task',        // Type of entity
    creator_user_id: 456,       // User ID who created this entity
    created_at: '2024-03-15T10:30:00+00:00',  // Auto-managed
    updated_at: '2024-03-15T10:35:00+00:00',  // Auto-managed

    // Your data (in the 'data' property)
    data: {
        text: 'Buy groceries',
        completed: false,
        priority: 'high',
        // ... any custom fields
    }
}
```

**System-Managed Fields:**
- `id`: Unique identifier for the entity
- `entity_name`: Type/category of the entity
- `creator_user_id`: ID of the user who created the entity (automatic)
- `created_at`: Timestamp when entity was created (automatic)
- `updated_at`: Timestamp when entity was last updated (automatic)

**Important:**
- Never add `created_at`, `updated_at`, or `creator_user_id` to your `data` object
- These fields are managed at the entity level, not in your data
- Your custom fields go inside the `data` object

## Best Practices

### 1. Use pt.get() for Single Entities

When you know the entity ID, always use `pt.get()` instead of `pt.list()` with filters:

```javascript
// ✅ GOOD: Fast primary key lookup
const task = await pt.get(123);

// ❌ AVOID: Slower filtering when ID is known
const tasks = await pt.list({
    entityNames: ['task'],
    filters: { id: 123 }
});
const task = tasks[0];
```

### 2. Use Merge Mode for Partial Updates

```javascript
// ✅ BEST: Use merge mode for partial updates (simplest)
await pt.edit(taskId, { completed: true }, true);

// ✅ GOOD: Manually preserve existing fields
const task = await pt.get(taskId);
await pt.edit(taskId, {
    ...task.data,
    completed: true
});

// ❌ BAD: Lose all other fields (without merge mode)
await pt.edit(taskId, { completed: true });
```

### 3. Handle Errors Gracefully

```javascript
async function robustOperation() {
    try {
        const entity = await pt.get(123);
        return entity;
    } catch (error) {
        console.error('Operation failed:', error);
        return null;
    }
}
```

### 4. Cache getChatMembers() Results

```javascript
// ✅ GOOD: Cache members at app initialization
let allMembers = [];

async function initApp() {
    allMembers = await pt.getChatMembers();
    await loadTasks();
}

function getMemberName(userId) {
    const member = allMembers.find(m => m.id === userId);
    return member ? member.name : 'Unknown';
}

// ❌ AVOID: Calling getChatMembers() repeatedly
async function displayTask(task) {
    const members = await pt.getChatMembers(); // Called for every task!
    const creator = members.find(m => m.id === task.creator_user_id);
    return creator.name;
}
```

### 5. Use Appropriate Limits

```javascript
// ✅ GOOD: Reasonable limits
const recentTasks = await pt.list({
    entityNames: ['task'],
    limit: 50
});

// ❌ AVOID: Requesting too much data
const allTasks = await pt.list({
    entityNames: ['task'],
    limit: 10000 // Too large
});
```

## Performance Tips

1. **Primary key lookups**: Use `pt.get()` when you know the ID (fastest)
2. **Server-side filtering**: Use filters in `pt.list()` instead of client-side filtering
3. **Pagination**: Use `limit` and `offset` for large datasets
4. **Caching**: Cache `getChatMembers()` and other static data
5. **Batch operations**: Use `Promise.all()` for multiple independent operations

```javascript
// Batch operations example (using merge mode - no need to fetch first!)
async function batchUpdate(taskIds, updates) {
    const promises = taskIds.map(id => pt.edit(id, updates, true));
    await Promise.all(promises);
}
```

## Next Steps

- **[Filtering and Querying](Filtering-and-Querying.md)** - Learn about advanced filtering operators
- **[Pagination](Pagination.md)** - Implement efficient pagination
- **[Working with Chat Members](Working-with-Chat-Members.md)** - Integrate chat members in your app
- **[Complete Examples](Live-Pages-Examples.md)** - See full implementations
