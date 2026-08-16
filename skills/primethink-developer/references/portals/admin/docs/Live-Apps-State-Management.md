# State Management Best Practices for PrimeThink Live Apps

## Why Avoid localStorage?

**localStorage is browser-specific and creates problems:**

1. **Not shared across windows** - Opening the same chat in multiple tabs shows different states
2. **Not shared across devices** - User can't continue on mobile what they started on desktop
3. **Not shared across users** - Collaborative apps can't share state
4. **Lost on browser clear** - Users lose progress if they clear browser data
5. **No server-side access** - AI can't read or modify the state
6. **Limited to 5-10MB** - Can't store large amounts of data

## Use Chat Database Instead

PrimeThink Live Apps have access to a chat-scoped database via the `pt` API. This is the **recommended way** to persist state.

### Benefits of Chat Database

- **Shared across all windows and devices** - True multi-window support
- **Persistent and reliable** - Survives browser restarts and data clearing
- **AI-accessible** - AI can read and modify stored data
- **Collaborative** - Multiple users can share the same state
- **Generous storage** - Entity data comfortably holds typical app state; avoid storing large blobs (e.g. base64 images) in entities
- **Queryable** - Use filters to find specific data

---

## Pattern 1: Simple State Persistence (Recommended)

Replace localStorage with a single database entity for UI state.

### Bad: Using localStorage

```javascript
// DON'T DO THIS
function saveState() {
  localStorage.setItem('app_state', JSON.stringify(AppState));
}

function loadState() {
  const saved = localStorage.getItem('app_state');
  if (saved) {
    AppState = JSON.parse(saved);
  }
}
```

### Good: Using Chat Database

```javascript
// DO THIS INSTEAD
const APP_STATE_ENTITY = 'app_ui_state';
let appStateId = null;

// Save state to chat database
async function saveState() {
  try {
    const stateData = { ...AppState };

    if (appStateId) {
      // Update existing state
      await pt.edit(appStateId, stateData, true);
    } else {
      // Create new state entity
      const saved = await pt.add(APP_STATE_ENTITY, stateData);
      appStateId = saved.id;
    }
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

// Load state from chat database
async function loadState() {
  try {
    const result = await pt.list({
      entityNames: [APP_STATE_ENTITY],
      limit: 1
    });

    // pt.list() returns a plain array by default (no returnMetadata)
    if (result.length > 0) {
      const saved = result[0];
      appStateId = saved.id;
      Object.assign(AppState, saved.data);
      console.log('State loaded from database');
    }
  } catch (error) {
    console.error('Failed to load state:', error);
  }
}

// Initialize app
async function initializeApp() {
  await loadState(); // Load state before rendering
  renderScreen();
}
```

### Key Points

1. **Use a dedicated entity type** - `app_ui_state` or similar
2. **Track the entity ID** - Store `appStateId` to update the same entity
3. **Use merge mode** - `pt.edit(id, data, true)` preserves fields you don't update
4. **Await on init** - Always `await loadState()` before rendering
5. **Handle errors gracefully** - Don't crash if database is unavailable

---

## Pattern 2: Structured Data Storage

For complex apps, store different types of data in separate entities.

### Example: Task Management App

```javascript
// Store different data types separately
async function saveTask(taskData) {
  await pt.add('task', taskData);
}

async function saveUserPreferences(prefs) {
  if (userPrefsId) {
    await pt.edit(userPrefsId, prefs, true);
  } else {
    const saved = await pt.add('user_preferences', prefs);
    userPrefsId = saved.id;
  }
}

async function saveCurrentView(viewState) {
  if (viewStateId) {
    await pt.edit(viewStateId, viewState, true);
  } else {
    const saved = await pt.add('view_state', viewState);
    viewStateId = saved.id;
  }
}

// Load on init — each resource is independent, so a single failed
// query should not abort initialization; render with what loaded
async function initializeApp() {
  // Load preferences (pt.list returns a plain array by default)
  try {
    const prefs = await pt.list({
      entityNames: ['user_preferences'],
      limit: 1
    });
    if (prefs.length > 0) {
      userPrefsId = prefs[0].id;
      userPreferences = prefs[0].data;
    }
  } catch (error) {
    console.error('Failed to load preferences:', error);
  }

  // Load view state
  try {
    const views = await pt.list({
      entityNames: ['view_state'],
      limit: 1
    });
    if (views.length > 0) {
      viewStateId = views[0].id;
      viewState = views[0].data;
    }
  } catch (error) {
    console.error('Failed to load view state:', error);
  }

  // Load tasks
  try {
    tasks = await pt.list({
      entityNames: ['task'],
      limit: 100
    });
  } catch (error) {
    console.error('Failed to load tasks:', error);
    tasks = [];
  }

  renderApp();
}
```

---

## Pattern 3: Session-Based State

For apps with multiple sessions (like the 11+ writing app), use status fields to track progress.

```javascript
// Create a new session
async function startNewSession() {
  const session = await pt.add('writing_session', {
    started_at: new Date().toISOString(),
    status: 'in_progress',
    prompt: selectedPrompt,
    timer_duration: 30
  });

  currentSessionId = session.id;
  return session;
}

// Update session as user progresses
async function updateSession(updates) {
  if (currentSessionId) {
    await pt.edit(currentSessionId, updates, true);
  }
}

// Mark session complete
async function completeSession(results) {
  if (!currentSessionId) {
    throw new Error('No session in progress to complete');
  }
  await pt.edit(currentSessionId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    results: results
  }, true);
}

// Load in-progress session on init
async function loadInProgressSession() {
  const sessions = await pt.list({
    entityNames: ['writing_session'],
    filters: { status: 'in_progress' },
    limit: 1
  });

  if (sessions.length > 0) {
    currentSessionId = sessions[0].id;
    return sessions[0];
  }
  return null;
}
```

---

## What NOT to Store in Database

Some data should remain in memory only:

### Don't Store These

```javascript
// Runtime-only data
let timerInterval = null;        // Interval handles
let currentOperation = null;     // Cancellation tokens
let selectedFiles = [];          // File objects (can't serialize)
let domReferences = {};          // DOM element references
let callbacks = [];              // Function references
let webSockets = null;           // Connection objects
```

### Why?

- **Can't be serialized** - File objects, functions, DOM elements
- **Temporary/transient** - Interval handles, connection objects
- **Recreated on load** - Should be rebuilt from persisted data

---

## Performance Considerations

### Debounce Frequent Updates

Don't save on every keystroke - debounce updates:

```javascript
let saveTimeout = null;

function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveState();
  }, 1000); // Save 1 second after last change
}

// Use in input handlers
function handleInputChange(value) {
  AppState.inputValue = value;
  debouncedSave(); // Debounced save
}
```

### Batch Updates

Group related changes into a single save:

```javascript
// Bad: Multiple saves
async function updateMultipleFields() {
  AppState.field1 = 'value1';
  await saveState();
  AppState.field2 = 'value2';
  await saveState();
  AppState.field3 = 'value3';
  await saveState();
}

// Good: Single save
async function updateMultipleFields() {
  AppState.field1 = 'value1';
  AppState.field2 = 'value2';
  AppState.field3 = 'value3';
  await saveState(); // Save once
}
```

### Use Optimistic Updates

Update UI immediately, save in background:

```javascript
async function toggleTask(taskId) {
  // Update UI immediately
  const task = tasks.find(t => t.id === taskId);
  task.completed = !task.completed;
  renderTasks();

  // Save in background (don't await)
  pt.edit(taskId, { completed: task.completed }, true)
    .catch(error => {
      console.error('Failed to save:', error);
      // Optionally revert UI on error
      task.completed = !task.completed;
      renderTasks();
    });
}
```

---

## Migration from localStorage

If you have an existing app using localStorage, migrate gradually:

### Step 1: Add Database Functions

```javascript
// Add new database functions alongside localStorage
async function saveStateToDb() {
  // ... database save logic
}

async function loadStateFromDb() {
  // ... database load logic
}
```

### Step 2: Migrate Existing Data

```javascript
async function migrateFromLocalStorage() {
  const oldState = localStorage.getItem('app_state');
  if (oldState) {
    try {
      // Idempotency check: another tab (or an earlier run) may have
      // migrated already — only create the entity if none exists yet
      const existing = await pt.list({
        entityNames: ['app_ui_state'],
        limit: 1
      });
      if (existing.length === 0) {
        const parsed = JSON.parse(oldState);
        await pt.add('app_ui_state', parsed);
        console.log('Migrated from localStorage to database');
      }
      localStorage.removeItem('app_state'); // Clean up only after success
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }
}

// Run on init
async function initializeApp() {
  await migrateFromLocalStorage();
  await loadStateFromDb();
  renderApp();
}
```

### Step 3: Remove localStorage

Once migration is complete, remove all localStorage code.

---

## Common Patterns Summary

| Use Case | Pattern | Entity Type |
|----------|---------|-------------|
| Simple UI state | Single entity | `app_ui_state` |
| User preferences | Single entity per user | `user_preferences` |
| Multiple sessions | Entity per session | `session`, `writing_session` |
| List of items | Entity per item | `task`, `note`, `item` |
| Current view/screen | Single entity | `view_state` |
| Form drafts | Single entity | `form_draft` |

---

## Complete Example: Todo App

```javascript
// State management for a todo app
const APP_STATE_ENTITY = 'todo_app_state';
let appStateId = null;

const AppState = {
  currentFilter: 'all', // 'all', 'active', 'completed'
  sortBy: 'created',
  viewMode: 'list'
};

// Save UI state
async function saveState() {
  try {
    if (appStateId) {
      await pt.edit(appStateId, AppState, true);
    } else {
      const saved = await pt.add(APP_STATE_ENTITY, AppState);
      appStateId = saved.id;
    }
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

// Load UI state
async function loadState() {
  try {
    const states = await pt.list({
      entityNames: [APP_STATE_ENTITY],
      limit: 1
    });

    if (states.length > 0) {
      appStateId = states[0].id;
      Object.assign(AppState, states[0].data);
    }
  } catch (error) {
    console.error('Failed to load state:', error);
  }
}

// Todo operations
async function addTodo(text) {
  const todo = await pt.add('todo', {
    text: text,
    completed: false,
    created_at: new Date().toISOString()
  });
  return todo;
}

async function toggleTodo(todoId) {
  const todo = await pt.get(todoId);
  // Merge mode: only send the toggled field, preserve everything else
  await pt.edit(todoId, {
    completed: !todo.data.completed
  }, true);
}

async function loadTodos() {
  // pt.list() returns a plain array by default
  return await pt.list({
    entityNames: ['todo'],
    limit: 100
  });
}

// Initialize
async function initializeApp() {
  await loadState();
  const todos = await loadTodos();
  renderApp(todos);
}

// Start app
document.addEventListener('DOMContentLoaded', initializeApp);
```

---

## Checklist for New Apps

When building a new PrimeThink Live App:

- [ ] **Never use localStorage** - Use chat database instead
- [ ] **Define entity types** - Choose meaningful names like `app_ui_state`, `task`, `session`
- [ ] **Track entity IDs** - Store IDs to update existing entities
- [ ] **Use merge mode** - `pt.edit(id, data, true)` to preserve fields
- [ ] **Await on init** - Always `await loadState()` before rendering
- [ ] **Handle errors** - Gracefully handle database failures
- [ ] **Debounce saves** - Don't save on every keystroke
- [ ] **Don't serialize functions** - Keep runtime-only data in memory
- [ ] **Test multi-window** - Open app in multiple tabs to verify state sync

---

## Summary

**Key Takeaway:** Always use the chat database (`pt.add`, `pt.edit`, `pt.list`) instead of localStorage for state persistence in PrimeThink Live Apps. This ensures your app works seamlessly across multiple windows, devices, and users.
