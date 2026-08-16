# Real-Time Data Synchronization

## Overview

PrimeThink Live Apps support real-time data synchronization across multiple users and browser windows through the `chat_db_updated` Socket.IO event. When any user creates, updates, or deletes entities in the chat database, all connected clients receive instant notifications, enabling collaborative applications where changes appear immediately for everyone.

This is essential for:
- **Multi-user collaboration** - Multiple team members working in the same app
- **Multi-window sync** - User has the same app open in multiple browser tabs
- **Real-time dashboards** - Displaying live data that updates automatically
- **Conflict prevention** - Knowing when another user modified data you're viewing

---

## API Reference

### `pt.onEntityChanged(callback, options)`

Subscribe to entity change events with optional filtering.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `function` | Called with the event payload when changes occur |
| `options.action` | `string` | Filter to single action: `'inserted'`, `'updated'`, or `'deleted'` |
| `options.actions` | `string[]` | Filter to multiple actions |
| `options.entityId` | `number` | Filter to specific entity ID |
| `options.entityIds` | `number[]` | Filter to multiple entity IDs |
| `options.entityName` | `string` | Filter to specific entity type (mainly useful for inserts) |

**Returns:** `function` - Unsubscribe function for cleanup

---

## Quick Start Examples

### Listen to All Changes

```javascript
// Refresh UI on any database change
const unsubscribe = pt.onEntityChanged((event) => {
  console.log('Database changed:', event.action);
  refreshUI();
});

// Clean up when done
// unsubscribe();
```

### Listen to Updates Only

```javascript
pt.onEntityChanged((event) => {
  // Get entity IDs (handles both single and batch)
  const ids = event.updated_entity_ids || [event.entity_id];
  ids.forEach(id => refreshEntity(id));
}, { action: 'updated' });
```

### Track Specific Entities

```javascript
// Watch for changes to specific products
pt.onEntityChanged((event) => {
  reloadProducts();
}, {
  entityIds: [101, 102, 103],
  actions: ['updated', 'deleted']
});
```

### Listen for New Items

```javascript
// Show notification when new orders arrive
pt.onEntityChanged((event) => {
  showNotification('New order received!');
}, {
  action: 'inserted',
  entityName: 'order'
});
```

---

## Event Payload Structure

### `inserted` - New Entity Created

**Single Insert** (via `pt.add()`):

```javascript
{
  "chat_id": 123,
  "entity_id": 789,
  "entity_name": "task",
  "creator_user_id": 456,
  "created_at": "2026-02-28T12:00:00+00:00",
  "updated_at": "2026-02-28T12:00:00+00:00",
  "chat_uuid": "<uuid>",
  "action": "inserted"
}
```

**Batch Insert** (via `pt.batchAdd()`):

```javascript
{
  "chat_id": 123,
  "entity_name": "task",
  "inserted_entity_ids": [1, 2, 3],
  "chat_uuid": "<uuid>",
  "action": "inserted"
}
```

### `updated` - Entity Modified

**Single Edit** (via `pt.edit()`):

```javascript
{
  "entity_id": 123,
  "chat_id": 456,
  "updated_at": "2026-02-28T12:00:00+00:00",
  "chat_uuid": "<uuid>",
  "action": "updated"
}
```

**Batch Edit** (via `pt.batchEdit()`):

```javascript
{
  "chat_id": 456,
  "updated_entity_ids": [1, 2, 3],
  "chat_uuid": "<uuid>",
  "action": "updated"
}
```

### `deleted` - Entity Removed

**Single Delete** (via `pt.delete()`):

```javascript
{
  "chat_id": 456,
  "entity_id": 123,
  "chat_uuid": "<uuid>",
  "action": "deleted"
}
```

**Batch Delete** (via `pt.batchDelete()`):

```javascript
{
  "chat_id": 456,
  "deleted_entity_ids": [1, 2, 3],
  "chat_uuid": "<uuid>",
  "action": "deleted"
}
```

---

## Best Practices

### 1. Fetch Full Data After Notification

The event payload is intentionally lightweight and does not include the entity `data` field. Always fetch the full entity data after receiving a notification:

```javascript
// Handle inserts - fetch new entities
pt.onEntityChanged(async (event) => {
  const ids = event.inserted_entity_ids || [event.entity_id];

  for (const id of ids) {
    const entity = await pt.get(id);
    addToLocalState(entity);
  }
  renderUI();
}, { action: 'inserted' });

// Handle updates - refresh entity data
pt.onEntityChanged(async (event) => {
  const ids = event.updated_entity_ids || [event.entity_id];

  for (const id of ids) {
    const entity = await pt.get(id);
    updateLocalState(entity);
  }
  renderUI();
}, { action: 'updated' });

// Handle deletes - remove from local state
pt.onEntityChanged((event) => {
  const ids = event.deleted_entity_ids || [event.entity_id];
  ids.forEach(id => removeFromLocalState(id));
  renderUI();
}, { action: 'deleted' });
```

### 2. Use Filtering Options

Instead of filtering manually in your callback, use the built-in filtering options for cleaner code and better performance:

```javascript
// Instead of this:
pt.onEntityChanged((event) => {
  if (event.action === 'updated' || event.action === 'deleted') {
    refreshTaskList();
  }
});

// Do this:
pt.onEntityChanged(() => refreshTaskList(), {
  actions: ['updated', 'deleted']
});
```

Avoid combining `entityName` with the `updated`/`deleted` actions — those payloads don't always include the entity name (see [Notes](#notes)), so the filter could suppress events. Entity-name filtering is only reliable for `inserted` events.

### 3. Debounce UI Updates

When multiple rapid changes occur, debounce your UI updates to avoid performance issues:

```javascript
let refreshTimeout = null;
const pendingIds = new Set();

pt.onEntityChanged((event) => {
  // Collect entity IDs that need refreshing
  const ids = event.updated_entity_ids || [event.entity_id];
  ids.forEach(id => pendingIds.add(id));

  // Debounce the refresh
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(async () => {
    await refreshEntities([...pendingIds]);
    pendingIds.clear();
  }, 100);
}, { action: 'updated' });
```

### 4. Track Own Changes to Avoid Duplicates

Skip events for changes you made yourself (useful with optimistic updates):

```javascript
const recentLocalChanges = new Set();

// When saving locally
async function saveTask(task) {
  recentLocalChanges.add(task.id);
  await pt.edit(task.id, task.data, true);

  // Clear after a short delay
  setTimeout(() => recentLocalChanges.delete(task.id), 1000);
}

// Skip our own changes in the listener
pt.onEntityChanged(async (event) => {
  const ids = event.updated_entity_ids || [event.entity_id];
  const externalIds = ids.filter(id => !recentLocalChanges.has(id));

  if (externalIds.length > 0) {
    await refreshEntities(externalIds);
  }
}, { action: 'updated' });
```

### 5. Show Real-Time Indicators

Display visual feedback when other users make changes:

```javascript
pt.onEntityChanged((event) => {
  // Show toast notification
  showToast(`Data ${event.action} by another user`);

  // Highlight changed items in the UI
  const ids = event.entity_id
    ? [event.entity_id]
    : (event.inserted_entity_ids || event.updated_entity_ids || event.deleted_entity_ids || []);

  ids.forEach(id => highlightItem(id, event.action));
});

function highlightItem(entityId, action) {
  const element = document.querySelector(`[data-entity-id="${entityId}"]`);
  if (element) {
    element.classList.add(`highlight-${action}`);
    setTimeout(() => element.classList.remove(`highlight-${action}`), 2000);
  }
}
```

### 6. Clean Up Subscriptions

Always unsubscribe when your component unmounts or when you no longer need updates:

```javascript
// Store the unsubscribe function
const unsubscribe = pt.onEntityChanged((event) => {
  handleChange(event);
});

// Clean up when done
function cleanup() {
  unsubscribe();
}

// React example
useEffect(() => {
  const unsubscribe = pt.onEntityChanged((event) => {
    setData(prev => updateData(prev, event));
  });

  return () => unsubscribe(); // Cleanup on unmount
}, []);
```

---

## Complete Example: Collaborative Task List

This example demonstrates a real-time collaborative task list where multiple users can add, edit, and delete tasks with instant synchronization.

```javascript
// Application state
let tasks = [];
const recentLocalChanges = new Set();

// Initialize app
async function initApp() {
  // Load initial tasks
  await loadTasks();

  // Subscribe to real-time updates
  subscribeToUpdates();

  // Render UI
  renderTasks();
}

// Load all tasks from database
async function loadTasks() {
  tasks = await pt.list({
    entityNames: ['task'],
    limit: 100
  });
}

// Subscribe to database changes
function subscribeToUpdates() {
  // Handle new tasks
  pt.onEntityChanged(async (event) => {
    const ids = event.inserted_entity_ids || [event.entity_id];

    // Skip our own changes
    const externalIds = ids.filter(id => !recentLocalChanges.has(id));
    if (externalIds.length === 0) return;

    for (const id of externalIds) {
      const task = await pt.get(id);
      if (task) tasks.push(task);
    }

    renderTasks();
    showSyncIndicator('New task added');
  }, { action: 'inserted', entityName: 'task' });

  // Handle updated tasks
  pt.onEntityChanged(async (event) => {
    const ids = event.updated_entity_ids || [event.entity_id];

    // Skip our own changes
    const externalIds = ids.filter(id => !recentLocalChanges.has(id));
    if (externalIds.length === 0) return;

    for (const id of externalIds) {
      const task = await pt.get(id);
      if (task) {
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) tasks[index] = task;
      }
    }

    renderTasks();
    showSyncIndicator('Task updated');
  }, { action: 'updated' });

  // Handle deleted tasks
  pt.onEntityChanged((event) => {
    const ids = event.deleted_entity_ids || [event.entity_id];

    // Skip our own changes
    const externalIds = ids.filter(id => !recentLocalChanges.has(id));
    if (externalIds.length === 0) return;

    tasks = tasks.filter(t => !externalIds.includes(t.id));

    renderTasks();
    showSyncIndicator('Task deleted');
  }, { action: 'deleted' });
}

// Add a new task (local action)
async function addTask(text) {
  const result = await pt.add('task', {
    text: text,
    completed: false,
    created_at: new Date().toISOString()
  });

  // Track as our own change
  recentLocalChanges.add(result.id);
  setTimeout(() => recentLocalChanges.delete(result.id), 1000);

  // Add to local state immediately (optimistic update)
  tasks.push(result);
  renderTasks();
}

// Toggle task completion (local action)
async function toggleTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  // Track as our own change
  recentLocalChanges.add(taskId);
  setTimeout(() => recentLocalChanges.delete(taskId), 1000);

  // Optimistic update
  task.data.completed = !task.data.completed;
  renderTasks();

  // Save to database
  await pt.edit(taskId, { completed: task.data.completed }, true);
}

// Delete a task (local action)
async function deleteTask(taskId) {
  // Track as our own change
  recentLocalChanges.add(taskId);
  setTimeout(() => recentLocalChanges.delete(taskId), 1000);

  // Optimistic update
  tasks = tasks.filter(t => t.id !== taskId);
  renderTasks();

  // Delete from database
  await pt.delete(taskId);
}

// Escape user-provided text before inserting into innerHTML (prevents XSS)
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Render the task list
function renderTasks() {
  const container = document.getElementById('task-list');
  container.innerHTML = tasks.map(task => `
    <div class="task" data-entity-id="${task.id}">
      <input
        type="checkbox"
        ${task.data.completed ? 'checked' : ''}
        onchange="toggleTask(${task.id})"
      />
      <span class="${task.data.completed ? 'completed' : ''}">${escapeHtml(task.data.text)}</span>
      <button onclick="deleteTask(${task.id})">Delete</button>
    </div>
  `).join('');
}

// Show sync indicator
function showSyncIndicator(message) {
  const indicator = document.getElementById('sync-indicator');
  indicator.textContent = message;
  indicator.classList.add('visible');
  setTimeout(() => indicator.classList.remove('visible'), 2000);
}

// Initialize
document.addEventListener('DOMContentLoaded', initApp);
```

### CSS for Visual Feedback

```css
/* Highlight animations for real-time changes */
.task {
  transition: background-color 0.3s ease;
}

.task.highlight-inserted {
  background-color: #d4edda;
  animation: pulse 0.5s ease;
}

.task.highlight-updated {
  background-color: #fff3cd;
  animation: pulse 0.5s ease;
}

.task.highlight-deleted {
  background-color: #f8d7da;
  opacity: 0.5;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

/* Sync indicator */
#sync-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

#sync-indicator.visible {
  opacity: 1;
}
```

---

## Multi-Window Synchronization

The `pt.onEntityChanged()` method automatically handles multi-window scenarios. When a user has the same Live App open in multiple browser tabs:

1. **Change in Tab A** - User updates a task
2. **Event emitted** - Server broadcasts `chat_db_updated` to all connected clients
3. **Tab B receives event** - The other tab's socket connection receives the notification
4. **Tab B updates** - The UI refreshes to show the change

No additional code is needed - the same event subscription works across all windows.

```javascript
// This single subscription handles all windows automatically
pt.onEntityChanged((event) => {
  refreshUI();
});
```

---

## Conflict Handling

When multiple users edit the same entity simultaneously, use timestamps to detect conflicts:

```javascript
// Track local versions
const localVersions = new Map();

// When you edit, store the expected timestamp
async function editWithConflictDetection(entityId, changes) {
  const current = await pt.get(entityId);
  localVersions.set(entityId, new Date(current.updated_at));

  await pt.edit(entityId, changes, true);
}

// Detect conflicts in update events
pt.onEntityChanged(async (event) => {
  const entityId = event.entity_id;

  if (entityId && localVersions.has(entityId)) {
    const localVersion = localVersions.get(entityId);
    const serverVersion = new Date(event.updated_at);

    if (serverVersion > localVersion) {
      // Server has newer data - someone else edited it
      const fresh = await pt.get(entityId);
      updateLocalState(fresh);
      showConflictNotification('This item was modified by another user');
    }

    localVersions.delete(entityId);
  }
}, { action: 'updated' });
```

---

## Performance Considerations

### Batch Fetch Entities

When multiple IDs are updated, fetch them efficiently:

```javascript
pt.onEntityChanged(async (event) => {
  const ids = event.updated_entity_ids || [event.entity_id];

  // Fetch all at once with Promise.all
  const entities = await Promise.all(
    ids.map(id => pt.get(id))
  );

  // Update local state
  entities.forEach(entity => {
    const index = localData.findIndex(d => d.id === entity.id);
    if (index !== -1) localData[index] = entity;
  });

  renderUI();
}, { action: 'updated' });
```

### Use Optimistic Updates

Update the UI immediately, then sync with server:

```javascript
async function updateTask(taskId, changes) {
  // Optimistic update - instant UI feedback
  const task = tasks.find(t => t.id === taskId);
  Object.assign(task.data, changes);
  renderTasks();

  // Background save
  try {
    await pt.edit(taskId, changes, true);
  } catch (error) {
    // Revert on failure
    await loadTasks();
    renderTasks();
    showError('Failed to save changes');
  }
}
```

---

## Low-Level Access

For advanced use cases, you can still use `pt.onSocketEvent()` to access the raw `chat_db_updated` events:

```javascript
pt.onSocketEvent((event, data) => {
  if (event === 'chat_db_updated') {
    const payload = data.payload;
    console.log('Raw event:', payload);
  }
});
```

---

## Notes

- All batch operations only emit events if at least one operation succeeds
- Single operations only emit on success
- The `data` field is intentionally excluded from payloads to keep them lightweight
- Clients should fetch full entity data via API after receiving notifications
- Events are emitted to the `chat_{chat_uuid}` room, so only users in the same chat receive them
- The `entityName` filter is most useful for `inserted` events, since `updated` and `deleted` events don't always include the entity name

---

## Related Documentation

- [Data Management API](Data-Management-API.md) - Core database operations
- [Document Events](primethink_js_document_events.md) - Document processing events
- [Message Response Handling](primethink_js_message_received.md) - AI message events
- [State Management Best Practices](Live-Apps-State-Management.md) - Persisting app state

---

**Last Updated:** February 28, 2026
**Version:** 20260228
