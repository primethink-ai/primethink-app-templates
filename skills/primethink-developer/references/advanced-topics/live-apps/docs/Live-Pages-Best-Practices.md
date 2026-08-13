# Performance and Best Practices

## Overview

This guide covers best practices for building efficient, maintainable Live Pages applications.

## Performance Optimization

### 1. Use pt.get() for Single Entities

When you know the entity ID, always use `pt.get()` for the fastest retrieval:

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

### 2. Implement Server-Side Filtering

Always filter on the server rather than loading all data and filtering client-side:

```javascript
// ✅ GOOD: Server-side filtering
const activeTasks = await pt.list({
    entityNames: ['task'],
    filters: { status: 'active' },
    limit: 50
});

// ❌ AVOID: Client-side filtering of large datasets
const allTasks = await pt.list({
    entityNames: ['task'],
    limit: 10000
});
const activeTasks = allTasks.filter(t => t.data.status === 'active');
```

### 3. Use Appropriate Operators

Choose the most efficient operator for your use case:

```javascript
// ✅ GOOD: Use exact match when possible (fastest)
const task = await pt.list({
    entityNames: ['task'],
    filters: { status: 'active' }
});

// ✅ GOOD: Use $in for multiple values
const tasks = await pt.list({
    entityNames: ['task'],
    filters: { priority: { $in: ['high', 'medium'] } }
});

// ❌ AVOID: Unnecessary $or for same field
const tasks = await pt.list({
    entityNames: ['task'],
    filters: {
        $or: [
            { priority: 'high' },
            { priority: 'medium' }
        ]
    }
});
```

### 4. Cache Static Data

Cache data that doesn't change frequently:

```javascript
// ✅ GOOD: Cache chat members at app initialization
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

### 5. Use Pagination

For large datasets, always implement pagination:

```javascript
// ✅ GOOD: Load data in pages
const result = await pt.list({
    entityNames: ['task'],
    filters: { status: 'active' },
    page: 1,
    pageSize: 20,
    returnMetadata: true
});

// ❌ AVOID: Loading thousands of records at once
const allTasks = await pt.list({
    entityNames: ['task'],
    limit: 10000
});
```

### 6. Batch Operations

Use `Promise.all()` for parallel operations:

```javascript
// ✅ GOOD: Parallel operations
async function batchUpdate(taskIds, updates) {
    const promises = taskIds.map(async id => {
        const task = await pt.get(id);
        return pt.edit(id, { ...task.data, ...updates });
    });

    await Promise.all(promises);
}

// ❌ AVOID: Sequential operations
async function slowBatchUpdate(taskIds, updates) {
    for (const id of taskIds) {
        const task = await pt.get(id);
        await pt.edit(id, { ...task.data, ...updates });
    }
}
```

### 7. Provide Immediate Feedback with Processing Status

For file uploads or long-running operations, create database rows immediately with a `PROCESSING` status to provide instant user feedback, then update them when processing completes. This is a core part of the **[Async Fire-and-Forget Pattern](#async-fire-and-forget-pattern-for-ai-generation)** — the recommended approach for all AI generation tasks in Live Apps.

#### Pattern: Add-Then-Update

```javascript
// ✅ GOOD: Create PROCESSING row immediately, update when done
async function uploadFileWithFeedback(file) {
    // 1. Create row immediately - user sees it right away
    const created = await pt.add('document', {
        filename: file.name,
        status: 'PROCESSING',
        topic: null,
        document_id: null
    });

    try {
        // 2. Upload and process
        const formData = new FormData();
        formData.append('files', file);

        const msg = `Process this file and use 'chatdb_edit' with entity_id: ${created.id} to update the row with results.`;
        await pt.addMessage(formData, msg);

        // User will see PROCESSING status immediately, then SUCCESS after AI updates
    } catch (error) {
        // 3. Update to ERROR if something fails
        await pt.edit(created.id, {
            filename: file.name,
            status: 'ERROR',
            error_message: error.message
        });
    }
}

// ❌ AVOID: User waits with no feedback
async function uploadFileNoFeedback(file) {
    const formData = new FormData();
    formData.append('files', file);

    // User sees nothing until AI finishes processing
    const msg = `Process this file and use 'chatdb_add' to create a row.`;
    await pt.addMessage(formData, msg);
}
```

#### When to Use Each Approach

**Upload-Then-Add (chatdb_add):**
- Goals and automation (chat, email)
- Background tasks
- No user waiting for feedback
- Simpler with fewer failure modes

**Add-Then-Update (pt.add + chatdb_edit):**
- Interactive Live Page uploads
- User is actively waiting
- Immediate feedback is critical
- Dashboard/real-time applications

**Comparison:**

| Aspect | Upload-Then-Add | Add-Then-Update |
|--------|----------------|-----------------|
| User Feedback | Delayed | Immediate |
| Operations | 1 (add only) | 2 (add + edit) |
| Complexity | Simple | More complex |
| Orphaned Rows | None | Possible |
| Best For | Automation | Interactive UIs |

#### Best Practices for Add-Then-Update

**1. Handle Cleanup on Failure:**
```javascript
let created;
try {
    created = await pt.add('document', { status: 'PROCESSING' });
    await processDocument(created.id);
} catch (error) {
    if (created) {
        // Option 1: Update to ERROR status
        await pt.edit(created.id, { status: 'ERROR', error: error.message });

        // Option 2: Delete orphaned row
        // await pt.delete(created.id);
    }
}
```

**2. Use Clear Status Values:**
```javascript
const STATUS = {
    PROCESSING: 'PROCESSING',  // Yellow badge, spinner
    SUCCESS: 'SUCCESS',        // Green badge, checkmark
    ERROR: 'ERROR'             // Red badge, x mark
};
```

**3. Add Auto-Refresh:**
```javascript
// Refresh table every 10 seconds to show updated statuses
setInterval(loadData, 10000);
```

**4. Show Processing Indicators:**
```javascript
function renderStatus(status) {
    if (status === 'PROCESSING') {
        return `<span class="text-yellow-600">⏳ Processing...</span>`;
    }
    if (status === 'SUCCESS') {
        return `<span class="text-green-600">✓ Complete</span>`;
    }
    return `<span class="text-red-600">✗ Error</span>`;
}
```

**5. Use waitForMessageReceived for Real-Time Updates:**

Instead of polling with `setInterval`, use `pt.waitForMessageReceived()` to get notified when AI processing completes:

```javascript
async function uploadFileWithRealTimeUpdate(file) {
    // 1. Create PROCESSING row immediately
    const created = await pt.add('document', {
        filename: file.name,
        status: 'PROCESSING',
        topic: null,
        document_id: null
    });

    // 2. Refresh UI to show the new row
    await loadData();

    try {
        // 3. Upload and process
        const formData = new FormData();
        formData.append('files', file);

        const msg = `Process this file and use 'chatdb_edit' with entity_id: ${created.id} to update the row with results.`;
        const result = await pt.addMessage(formData, msg);

        // 4. Wait for AI to finish processing
        const response = await pt.waitForMessageReceived(result.task_id);
        console.log('AI finished processing:', response.id);
        
        // Refresh to show updated status
        await loadData();

    } catch (error) {
        await pt.edit(created.id, {
            filename: file.name,
            status: 'ERROR',
            error_message: error.message
        });
        await loadData();
    }
}
```

This approach is more efficient than polling because:
- Updates appear immediately when AI completes (no 10-second delay)
- No unnecessary API calls when nothing has changed
- Works well with multiple concurrent uploads
- Clean async/await syntax with proper error handling

### 8. Implement Debouncing

Debounce search inputs to reduce API calls:

```javascript
let searchTimeout;

document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length < 2) {
        clearResults();
        return;
    }

    searchTimeout = setTimeout(async () => {
        const results = await pt.list({
            entityNames: ['task'],
            filters: { text: { $contains: query } },
            limit: 20
        });
        displayResults(results);
    }, 300); // Wait 300ms after user stops typing
});
```

### 9. Cache Page Results

Implement caching for pagination:

```javascript
const pageCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function loadPageWithCache(page, filters) {
    const cacheKey = `${page}-${JSON.stringify(filters)}`;
    const cached = pageCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    const result = await pt.list({
        entityNames: ['task'],
        filters: filters,
        page: page,
        pageSize: 20,
        returnMetadata: true
    });

    pageCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
    });

    return result;
}
```

## Error Handling

### 1. Always Handle Errors

Wrap data operations in try-catch blocks:

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

### 2. Provide User Feedback

Show meaningful error messages to users:

```javascript
async function addTask() {
    const text = document.getElementById('taskInput').value.trim();

    if (!text) {
        showError('Please enter a task description');
        return;
    }

    try {
        await pt.add('task', {
            text: text,
            completed: false
        });

        showSuccess('Task added successfully');
        await loadTasks();
    } catch (error) {
        console.error('Error adding task:', error);
        showError('Failed to add task. Please try again.');
    }
}

function showError(message) {
    const alert = document.createElement('div');
    alert.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
    alert.textContent = message;
    document.getElementById('alerts').appendChild(alert);

    setTimeout(() => alert.remove(), 5000);
}

function showSuccess(message) {
    const alert = document.createElement('div');
    alert.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4';
    alert.textContent = message;
    document.getElementById('alerts').appendChild(alert);

    setTimeout(() => alert.remove(), 3000);
}
```

### 3. Implement Fallback Strategies

Provide fallbacks when operations fail:

```javascript
async function robustDataOperation() {
    try {
        const result = await pt.list({
            entityNames: ['task'],
            filters: { text: { $contains: 'important' } },
            limit: 50
        });

        return result;
    } catch (error) {
        console.error('Primary operation failed:', error);

        // Fallback to simpler query
        try {
            return await pt.list({
                entityNames: ['task'],
                limit: 20
            });
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            return [];
        }
    }
}
```

## Code Organization

### 1. Separate Concerns

Organize code into logical functions:

```javascript
// ✅ GOOD: Separate concerns
async function loadTasks() {
    const entities = await fetchTasks();
    const tasks = filterTaskEntities(entities);
    displayTasks(tasks);
}

async function fetchTasks() {
    return await pt.list({
        entityNames: ['task'],
        filters: { completed: false }
    });
}

function filterTaskEntities(entities) {
    return entities.filter(e => e.entity_name === 'task');
}

function displayTasks(tasks) {
    document.getElementById('tasksList').innerHTML = tasks.map(renderTask).join('');
}

function renderTask(task) {
    return `
        <div class="task-card">
            <span>${task.data.text}</span>
            <button onclick="deleteTask(${task.id})">Delete</button>
        </div>
    `;
}

// ❌ AVOID: Everything in one function
async function doEverything() {
    const entities = await pt.list({ entityNames: ['task'] });
    const tasks = entities.filter(e => e.entity_name === 'task');
    document.getElementById('tasksList').innerHTML = tasks.map(t =>
        `<div><span>${t.data.text}</span><button onclick="deleteTask(${t.id})">Delete</button></div>`
    ).join('');
}
```

### 2. Use Meaningful Names

```javascript
// ✅ GOOD: Clear variable names
const chatMembers = await pt.getChatMembers();
const humanUsers = chatMembers.filter(m => m.type === 'user');
const aiAgents = chatMembers.filter(m => m.type === 'agent');
const chatOwner = chatMembers.find(m => m.is_chat_owner);
const currentUser = chatMembers.find(m => m.is_logged_user);

// ❌ AVOID: Unclear names
const m = await pt.getChatMembers();
const u = m.filter(x => x.type === 'user');
```

### 3. Create Reusable Components

```javascript
// Reusable task card renderer
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow p-4 mb-2';

    const isCompleted = task.data.completed === true;

    card.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <input
                    type="checkbox"
                    ${isCompleted ? 'checked' : ''}
                    onchange="toggleTask(${task.id})"
                    class="h-4 w-4"
                >
                <span class="${isCompleted ? 'line-through text-gray-500' : ''}">
                    ${escapeHtml(task.data.text)}
                </span>
            </div>
            <button onclick="deleteTask(${task.id})" class="text-red-500">
                Delete
            </button>
        </div>
    `;

    return card;
}

// Usage
function displayTasks(tasks) {
    const container = document.getElementById('tasksList');
    container.innerHTML = '';
    tasks.forEach(task => {
        container.appendChild(createTaskCard(task));
    });
}
```

## Data Management Best Practices

### 1. Always Merge When Editing

```javascript
// ✅ GOOD: Preserve existing fields
const task = await pt.get(taskId);
await pt.edit(taskId, {
    ...task.data,
    completed: true
});

// ❌ BAD: Lose all other fields
await pt.edit(taskId, { completed: true });
```

### 2. Validate Before Saving

```javascript
async function addTask() {
    const text = document.getElementById('taskInput').value.trim();

    // Validate
    if (!text) {
        showError('Task description is required');
        return;
    }

    if (text.length > 500) {
        showError('Task description is too long (max 500 characters)');
        return;
    }

    // Save
    await pt.add('task', {
        text: text,
        completed: false
    });
}
```

### 3. Handle Missing Members Gracefully

```javascript
function getMemberName(userId) {
    const member = allMembers.find(m => m.id === userId);
    return member ? member.name : 'Unknown User';
}

function displayTaskCreator(task) {
    const creator = allMembers.find(m => m.id === task.creator_user_id);

    if (!creator) {
        return '<span class="text-gray-400">Unknown</span>';
    }

    const icon = creator.type === 'user' ? '👤' : '🤖';
    return `${icon} ${creator.name}`;
}
```

### 4. Use Appropriate Limits

```javascript
// ✅ GOOD: Reasonable limits
const recentTasks = await pt.list({
    entityNames: ['task'],
    limit: 50
});

// ❌ AVOID: Requesting too much data
const allTasks = await pt.list({
    entityNames: ['task'],
    limit: 10000
});
```

## Using Goals with Live Pages

### What are Goals?

**Goals** are automatic AI instructions that execute when specific conditions are met in a chat. When combined with Live Pages, Goals enable powerful automation workflows where data can be processed and stored in your database without manual intervention.

### How Goals Work with Live Pages

When you set up a Goal in your chat settings, the AI automatically:
1. Detects when the goal condition is triggered (e.g., file upload, specific keywords)
2. Executes the instructions you've defined in the Goal
3. Can use chatdb tools to create/update/query database entities
4. Stores results that your Live Page can display and interact with

This creates a seamless integration between:
- **Direct chat interactions** (uploading files, sending messages)
- **Email forwarding** (files sent to chat email address)
- **API uploads** (files uploaded programmatically via PrimeThink API)
- **Chat mentions** (files uploaded when the chat is mentioned in other conversations)
- **AI processing** (extraction, categorization, validation)
- **Database storage** (structured data in entities)
- **Live Page display** (visualization and interaction)

### Common Use Cases for Goals with Live Pages

**1. Document Processing**
```
Goal Trigger: User uploads a PDF file
Goal Action: Extract key information, categorize, store in database
Live Page: Display categorized documents with search/filter
```

**2. Email Automation**
```
Goal Trigger: Email with attachments forwarded to chat
Goal Action: Extract data, create database records
Live Page: Show processed emails in dashboard
```

**3. Data Entry Shortcuts**
```
Goal Trigger: User sends message with specific format
Goal Action: Parse message, validate, store as entity
Live Page: Display and manage all entries
```

**4. File Analysis**
```
Goal Trigger: Invoice/receipt uploaded
Goal Action: Extract line items, amounts, vendors
Live Page: Financial dashboard showing all invoices
```

**5. Content Categorization**
```
Goal Trigger: Document uploaded
Goal Action: Analyze content, assign categories/tags
Live Page: Browse and filter by categories
```

**6. API Integration**
```
Goal Trigger: File uploaded via API
Goal Action: Process file, extract metadata, store in database
Live Page: Monitor API uploads with status tracking
```

**7. Chat Mention Processing**
```
Goal Trigger: Chat mentioned in another conversation with file attachment
Goal Action: Process file in context of mention, create record
Live Page: Show all processed mentions and their results
```

**8. Multi-Channel Document Inbox**
```
Goal Trigger: File uploaded via any channel (chat, email, API, chat mentions)
Goal Action: Unified processing regardless of source
Live Page: Single dashboard showing all documents from all channels
```

### Best Practices for Writing Goal Prompts

**1. Be Explicit About Tool Usage**

Always specify which chatdb tool to use:

```
✅ GOOD: Use the tool 'chatdb_add' to create a new invoice record

❌ AVOID: Store the invoice information
```

**2. Demand Actual Tool Execution (Not Simulation)**

The AI might summarize or simulate tool calls instead of actually executing them if your instructions are too high-level. Be explicit that you want actual execution:

```
❌ BAD: High-level workflow that AI might just simulate
"Analyze the uploaded files and extract IP tasks. Use chatdb_list to check duplicates
by unique_key. If not found, use chatdb_add to insert the task."

Result: AI returns JSON summary but doesn't actually call the tools

✅ GOOD: Explicit tool execution instructions
"Analyze the uploaded files and extract IP tasks. For EACH task:
1. ACTUALLY CALL the tool 'chatdb_list' to check for duplicates by unique_key
2. If not found, ACTUALLY CALL the tool 'chatdb_add' to insert the task
3. Show all tool call results
4. At the end, return a JSON summary"

Result: AI actually executes chatdb_list and chatdb_add for each task
```

**Key Phrases for Actual Execution:**
- "ACTUALLY CALL the tool 'chatdb_list'"
- "ACTUALLY USE the tool 'chatdb_add'"
- "For EACH task, use the tool..."
- "Show all tool call results"
- "Execute the following steps with tool calls"

**Why This Matters:**
- Without explicit execution instructions, AI may treat your prompt as a conceptual workflow
- AI might return a summary of what "would happen" instead of actually doing it
- Your database won't be updated even though the response looks correct
- This is especially critical for multi-step operations with loops

**Real-World Example:**

```
❌ AVOID: Conceptual instruction
"Extract tasks from the document. For each task, check if it exists using unique_key.
If not, add it to the database with these fields: [list]. Never modify existing tasks."

✅ PREFER: Explicit execution instruction
"Extract all tasks from the document. Then FOR EACH extracted task:

1. ACTUALLY CALL chatdb_list with filters: {unique_key: "<computed_hash>"}
2. If the list returns empty (no duplicate):
   - ACTUALLY CALL chatdb_add with entity_name 'ip_task' and data: {
       matter_reference: "...",
       application_number: "...",
       due_date: "YYYY-MM-DD",
       task_description: "...",
       unique_key: "<computed_hash>",
       source: "auto",
       source_document_id: <doc_id>
     }
3. If the list returns results (duplicate exists):
   - Skip this task

IMPORTANT: You must ACTUALLY EXECUTE chatdb_list and chatdb_add for each task.
Show the tool call results. Never modify existing tasks.

After processing all tasks, respond with JSON:
{
  "added": <number>,
  "skipped": <number>,
  "items": [{"application_number": "...", "due_date": "...", "task": "..."}]
}
```

**Testing Your Instructions:**
1. Run your instruction with a test file
2. Check if chatdb tools were actually called (look for tool execution in chat)
3. Verify database entities were actually created
4. If AI only returns a summary without tool calls, add "ACTUALLY CALL" phrases

**3. Specify Entity Structure Clearly**

Define exactly what fields to create:

```
Use the tool 'chatdb_add' with:
- entity_name: "invoice"
- data: {
    "invoice_number": "<extracted_number>",
    "vendor": "<extracted_vendor>",
    "amount": <extracted_amount>,
    "date": "<extracted_date>",
    "status": "pending"
  }
```

**4. Handle Edge Cases**

Account for scenarios where data might not be available:

```
If the document has extracted text:
  - Extract information and use 'chatdb_add' with status: "success"

If the document has no text or processing fails:
  - Use 'chatdb_add' with status: "pending" or "error"
```

**5. Request Structured Responses**

Ask for JSON responses for easier validation:

```
Respond with JUST JSON in this format:
[
  {
    "document_id": <id>,
    "extracted_field": "<value>",
    "status": "<success|error>"
  }
]
```

**6. Create One Record Per Item**

Be explicit about quantity:

```
✅ GOOD: You MUST call 'chatdb_add' exactly once per uploaded file.

❌ AVOID: Create records for each file.
```

**7. Maintain Consistency**

Use the same entity names and data structures across goals:

```
Always use:
- entity_name: "invoice" (not "invoices", "invoice_data", etc.)
- data.status: "pending" | "success" | "error" (consistent values)
- data.created_date: ISO format (consistent format)
```

### Preventing LLM Hallucination in Goal Prompts

When working with Goals and Live Pages, it's critical that the AI actually executes tool calls rather than simulating or fabricating results. The following best practices ensure reliable, verifiable behavior:

**1. Add Explicit Sanctions for Hallucination**

State that any response not based on actual tool calls, or that fabricates IDs/results, is a critical error and must be flagged as a failure.

Example:
```
If you return any result that is not the direct output of the required tool calls,
or if you fabricate any IDs or data, you must immediately flag this as a critical
error and do not return any simulated or placeholder data.
```

**2. Require Tool Call Evidence in Output**

Demand that the response includes verifiable evidence (such as actual IDs, timestamps, or logs) that can only be produced by real tool calls.

Example:
```
The 'id' field in the output must be the actual entity ID returned by the
chatdb_add tool. If you cannot provide this, do not return any result.
```

**3. Forbid Placeholder or Simulated Data**

Explicitly forbid the use of placeholder, simulated, or guessed data in the output.

Example:
```
Never use placeholder, simulated, or guessed data in any field. If you cannot
complete the tool calls, return an explicit error message instead of a result.
```

**4. Add a Self-Check Step**

Require the AI to confirm, before responding, that all steps were executed with real tool calls, and to abort/flag if not.

Example:
```
Before returning your response, confirm that all tool calls were executed and
that all data in your output is sourced directly from those calls. If not,
return an error and do not fabricate any output.
```

**5. Mandate Error Reporting**

Instruct the AI to report any failure to execute a tool call or any uncertainty about the data, rather than guessing.

Example:
```
If any tool call fails or you are uncertain about any data, report the error
and do not attempt to guess or fill in missing information.
```

**Complete Example of Anti-Hallucination Instructions**

Here's how to combine all these practices into a comprehensive prompt:

```
CRITICAL EXECUTION REQUIREMENTS:

1. You MUST actually CALL the database tools. DO NOT describe, summarize, or simulate.

2. If you cannot call the tools, return an explicit error and DO NOT fabricate or guess any data.

3. The 'id' field in your output MUST be the real entity ID from chatdb_add.
   Never use placeholder values like "123", "xxx", or any guessed ID.

4. Never use placeholder or simulated data in any field. All data must come
   from actual tool call results.

5. Before responding, confirm that every field in your output is sourced from
   real tool calls. If you cannot confirm this, flag your response as a
   critical error.

6. If any tool call fails or you are uncertain about any data, report the
   error explicitly. Do not attempt to guess or fill in missing information.

7. Your response must include verifiable evidence that tool calls were executed:
   - Actual entity IDs returned by the tools
   - Real timestamps from the database
   - Actual field values from tool responses

8. If you violate any of these requirements, flag your response as a critical
   error and explain what went wrong.

EXAMPLE OF UNACCEPTABLE BEHAVIOR:
❌ Returning { "id": 123, "status": "success" } without actually calling chatdb_add
❌ Saying "I would create an entity with..." instead of actually creating it
❌ Returning a summary of what "should happen" instead of what "did happen"

EXAMPLE OF ACCEPTABLE BEHAVIOR:
✅ Calling chatdb_add, receiving entity ID 4567, returning { "id": 4567, "status": "success" }
✅ Showing the actual tool call result: "chatdb_add returned entity_id: 4567"
✅ Reporting errors: "chatdb_add failed with error: [actual error message]"
```

**Real-World Example with Anti-Hallucination Guards**

```
Goal: Extract tasks from uploaded documents

Instructions:
Extract all tasks from the document. Then FOR EACH extracted task:

STEP 1: ACTUALLY CALL chatdb_list
- Use filters: { unique_key: "<computed_hash>" }
- This MUST be a real tool call, not a simulation
- Record the actual result

STEP 2: If chatdb_list returns empty (no duplicate):
- ACTUALLY CALL chatdb_add with entity_name 'task' and these fields:
  {
    "description": "<extracted_description>",
    "due_date": "YYYY-MM-DD",
    "unique_key": "<computed_hash>",
    "source_document_id": <actual_document_id>
  }
- Record the actual entity ID returned by chatdb_add

STEP 3: If chatdb_list returns results (duplicate exists):
- Skip this task
- Log: "Skipped duplicate task with unique_key: <hash>"

CRITICAL REQUIREMENTS:
- The entity IDs in your response MUST be actual IDs from chatdb_add
- If you cannot execute these tool calls, return an error immediately
- Never fabricate IDs, never use placeholder data
- Show evidence of actual tool execution in your response

After processing all tasks, respond with JSON:
{
  "added": <actual count of chatdb_add calls>,
  "skipped": <actual count of duplicates found>,
  "items": [
    {
      "id": <actual entity ID from chatdb_add>,
      "description": "...",
      "due_date": "...",
      "was_duplicate": false
    }
  ],
  "tool_calls_executed": <number>,
  "verification": "All IDs are real entity IDs from chatdb_add calls"
}

If you return any fabricated or placeholder IDs, this is a CRITICAL ERROR.
```

**Why These Guards Matter**

Without explicit anti-hallucination instructions:
- AI may return plausible-looking results without executing any tool calls
- Database entities won't actually be created
- Your Live Page will show no data even though the response looks successful
- Debugging becomes difficult because the AI's response appears correct
- Silent failures occur where operations seem successful but nothing happens

With proper guards:
- AI is forced to execute real tool calls or report errors
- All returned data is verifiable and traceable to actual operations
- Failures are explicit and debuggable
- Your Live Page displays real data from actual database operations
- Confidence in automation increases

### Goal Example for Live Pages

Here's a complete example of a Goal that works with a Live Page:

**Goal Trigger:** `If a user uploads a PDF or DOCX file`

**Goal Instructions:**
```
AI Processing Request

You are given a file uploaded as an attachment to THIS message. Follow EXACTLY:

1) If the document has extracted text:
   - Analyze the content and extract key information
   - Use the tool 'chatdb_add' to create a database record:
     - entity_name: "document"
     - data: {
         "filename": "<actual filename>",
         "category": "<derived category>",
         "summary": "<brief summary, max 200 chars>",
         "document_id": <ID from message attachments>,
         "processing_status": "success"
       }

2) If the document has no text or processing fails:
   - Use the tool 'chatdb_add' to create a database record:
     - entity_name: "document"
     - data: {
         "filename": "<actual filename>",
         "category": "Uncategorized",
         "summary": "Processing pending",
         "document_id": <ID from message attachments>,
         "processing_status": "pending"
       }

3) Respond with JSON:
   {
     "status": "<success|pending|error>",
     "filename": "<filename>",
     "category": "<category>"
   }
```

**Corresponding Live Page:**
- Displays all documents using `pt.list({ entityNames: ['document'] })`
- Shows category, summary, processing status
- Allows filtering by category or status
- Provides "View" button to see document text with `pt.getDocumentText()`
- Shows "Re-process" button for pending items using `pt.addMessage()`

### Benefits of Goals with Live Pages

**Unified Experience:**
- Users can upload files via Live Page, chat message, email, API, or chat mentions
- All uploads are processed consistently regardless of source
- All results appear in the same Live Page interface
- Single Goal handles all five upload channels

**Automation:**
- No manual data entry required
- AI handles extraction and categorization
- Reduces human error
- Zero-touch processing for API and automated uploads

**Flexibility:**
- **Live Page**: Visual interface for interactive uploads
- **Chat**: Conversational interface for manual uploads
- **Email**: Integration with existing email workflows
- **API**: Programmatic uploads for system integrations
- **Chat Mentions**: Context-aware processing when the chat is mentioned in other conversations

**Scalability:**
- Process single files or batch uploads
- Same Goal handles all sources (chat, email, API, chat mentions)
- Live Page adapts to any data volume
- Supports high-throughput API integrations

### Testing Goals with Live Pages

**1. Test with Live Page Upload First:**
- Use `pt.addMessage(formData, instructions)` for uploads with AI processing
- Or use `pt.uploadFiles(formData, folder)` for silent document uploads
- Verify AI creates correct database entities (if using pt.addMessage)
- Check that Live Page displays data correctly

**2. Test Chat Upload:**
- Upload file directly in chat message
- Verify Goal triggers and runs
- Confirm same entity structure is created

**3. Test Email Upload:**
- Forward email with attachment to chat email address
- Verify Goal triggers automatically
- Confirm consistent entity structure

**4. Test API Upload:**
- Upload file programmatically via PrimeThink API
- Verify Goal triggers for API uploads
- Confirm API uploads create same entity structure

**5. Test Chat Mention Upload:**
- Mention the chat in another conversation with file attachment
- Verify Goal triggers when chat is mentioned
- Confirm entity structure matches other channels

**6. Test Edge Cases:**
- Upload file without text
- Upload unsupported format
- Upload very large file
- Upload multiple files at once
- Test each channel with edge cases

**7. Verify Multi-Channel Consistency:**
- Compare entities from all five channels (Live Page, chat, email, API, chat mentions)
- Ensure entity_name matches exactly across all sources
- Confirm data structure is identical regardless of upload method
- Verify all uploads appear correctly in Live Page

### Goal + Live Page Checklist

- [ ] Goal uses explicit chatdb tool names
- [ ] Entity structure is clearly defined
- [ ] Edge cases are handled (no text, errors)
- [ ] Response format is specified (JSON recommended)
- [ ] Entity names are consistent with Live Page queries
- [ ] Data field names match what Live Page expects
- [ ] Status values are well-defined and consistent
- [ ] Goal tested with Live Page uploads
- [ ] Goal tested with chat uploads
- [ ] Goal tested with email uploads
- [ ] Goal tested with API uploads
- [ ] Goal tested with chat mention uploads
- [ ] Live Page can display all possible status values
- [ ] Error cases have retry mechanisms
- [ ] All channels create identical entity structures

## Security Best Practices

### 1. Escape User Input

Always escape HTML when displaying user-generated content:

```javascript
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Usage
function renderTask(task) {
    return `
        <div class="task-card">
            <span>${escapeHtml(task.data.text)}</span>
        </div>
    `;
}
```

### 2. Validate Input Length

```javascript
function validateTaskInput(text) {
    if (!text || text.trim().length === 0) {
        return { valid: false, error: 'Task description is required' };
    }

    if (text.length > 500) {
        return { valid: false, error: 'Task description is too long (max 500 characters)' };
    }

    return { valid: true };
}

async function addTask() {
    const text = document.getElementById('taskInput').value;
    const validation = validateTaskInput(text);

    if (!validation.valid) {
        showError(validation.error);
        return;
    }

    await pt.add('task', {
        text: text.trim(),
        completed: false
    });
}
```

### 3. Confirm Destructive Actions

```javascript
async function deleteTask(taskId) {
    if (!confirm('Delete this task? This cannot be undone.')) {
        return;
    }

    try {
        await pt.delete(taskId);
        await loadTasks();
    } catch (error) {
        console.error('Error deleting task:', error);
        showError('Failed to delete task');
    }
}
```

## UI/UX Best Practices

### 1. Show Loading States

```javascript
async function loadTasks() {
    const loading = document.getElementById('loading');
    const tasksList = document.getElementById('tasksList');

    loading.style.display = 'block';
    tasksList.style.display = 'none';

    try {
        const entities = await pt.list({
            entityNames: ['task'],
            filters: { completed: false }
        });

        const tasks = entities.filter(e => e.entity_name === 'task');
        displayTasks(tasks);
    } finally {
        loading.style.display = 'none';
        tasksList.style.display = 'block';
    }
}
```

### 2. Provide Visual Feedback

```javascript
async function addTask() {
    const button = document.getElementById('addButton');
    const originalText = button.textContent;

    // Show loading state
    button.disabled = true;
    button.textContent = 'Adding...';

    try {
        const text = document.getElementById('taskInput').value.trim();
        await pt.add('task', { text: text, completed: false });

        // Show success
        button.textContent = '✓ Added';
        document.getElementById('taskInput').value = '';

        await loadTasks();

        // Reset button after delay
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 1000);
    } catch (error) {
        button.textContent = 'Error';
        button.disabled = false;

        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    }
}
```

### 3. Handle Empty States

```javascript
function displayTasks(tasks) {
    const container = document.getElementById('tasksList');

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <p class="mt-2 text-sm">No tasks found</p>
                <button onclick="clearFilters()" class="mt-4 text-blue-500 text-sm">
                    Clear filters
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = tasks.map(renderTask).join('');
}
```

## Troubleshooting

### Common Issues

**Issue**: `pt.list()` returns empty array

**Solutions**:
- Check that entity name is correct
- Verify filters are valid
- Try without filters to see if entities exist
- Check browser console for errors

```javascript
// Debug filters
async function debugFilters() {
    // Start simple
    console.log('All tasks:', await pt.list({ entityNames: ['task'] }));

    // Add filters incrementally
    console.log('Active tasks:', await pt.list({
        entityNames: ['task'],
        filters: { status: 'active' }
    }));
}
```

**Issue**: Data not updating after edit

**Solutions**:
- Ensure you're merging with existing data
- Check that you're calling loadTasks() after edit
- Verify the edit was successful

```javascript
// ✅ GOOD: Proper edit
const task = await pt.get(taskId);
await pt.edit(taskId, {
    ...task.data,
    completed: true
});
await loadTasks(); // Refresh display
```

**Issue**: Performance is slow

**Solutions**:
- Implement pagination
- Use server-side filtering
- Cache static data
- Reduce data transfer with appropriate limits

```javascript
// ✅ GOOD: Optimized loading
const result = await pt.list({
    entityNames: ['task'],
    filters: { status: 'active' }, // Server-side filter
    page: 1,
    pageSize: 20, // Pagination
    returnMetadata: true
});
```

## Testing Tips

### 1. Test with Empty Data

```javascript
function displayTasks(tasks) {
    // Handle empty state
    if (!tasks || tasks.length === 0) {
        showEmptyState();
        return;
    }

    renderTasks(tasks);
}
```

### 2. Test with Large Datasets

```javascript
// Test pagination with many items
async function testWithLargeDataset() {
    const tasks = await pt.list({
        entityNames: ['task'],
        page: 1,
        pageSize: 20,
        returnMetadata: true
    });

    console.log('Has more pages:', tasks.pagination.has_more);
    console.log('Count:', tasks.count);
}
```

### 3. Test Error Scenarios

```javascript
async function testErrorHandling() {
    try {
        await pt.get(999999); // Non-existent ID
    } catch (error) {
        console.log('Error handled correctly:', error);
    }
}
```

## Performance Checklist

- [ ] Use `pt.get()` for single entity lookups
- [ ] Implement server-side filtering
- [ ] Use pagination for large datasets
- [ ] Cache chat members and other static data
- [ ] Implement debouncing for search inputs
- [ ] Use batch operations with `Promise.all()`
- [ ] Provide immediate feedback with PROCESSING status for uploads
- [ ] Choose appropriate filter operators
- [ ] Set reasonable limits on queries
- [ ] Implement caching where appropriate
- [ ] Show loading states
- [ ] Handle errors gracefully
- [ ] Validate user input
- [ ] Escape HTML content
- [ ] Test with empty and large datasets
- [ ] Use Goals for unified upload experience (Live Page + Chat + Email + API + Chat Mentions)
- [ ] Ensure Goal entity structure matches Live Page queries
- [ ] Make Goal prompts explicit about chatdb tool usage
- [ ] Use "ACTUALLY CALL" phrases to ensure tool execution (not simulation)
- [ ] Verify in chat that tools were actually executed (not just summarized)
- [ ] For multi-step operations, explicitly state "FOR EACH item, ACTUALLY CALL..."
- [ ] Choose appropriate pattern: Upload-Then-Add for automation, Add-Then-Update for interactive UIs
- [ ] Use `waitForMessageReceived` for clean async/await AI response handling
- [ ] Use `waitForDocumentReady` only for silent uploads (`uploadFiles`) when you need extracted text
- [ ] Remember: `addMessage` with attachments processes files immediately - no `waitForDocumentReady` needed
- [ ] Use `onDocumentChanged` for batch upload progress tracking
- [ ] Cache generated documents (PDF/DOCX) by entity ID to avoid regenerating on repeated requests

## Document Processing Patterns

### When to Use waitForDocumentReady

Understanding when you need `waitForDocumentReady()` depends on your upload method:

| Upload Method | AI Processes Immediately | Need waitForDocumentReady |
|---------------|-------------------------|---------------------------|
| `pt.addMessage(formData, message)` | ✅ Yes | ❌ No |
| `pt.uploadFiles(form)` | ❌ No | ✅ Yes (for text extraction) |

**Key insight:** When using `addMessage()` with attachments, files are sent directly to the AI with your message. The AI processes them immediately, so you only need `waitForMessageReceived()` - not `waitForDocumentReady()`.

### Upload with AI Analysis (No waitForDocumentReady Needed)

When you want AI to analyze uploaded files immediately:

```javascript
async function uploadAndAnalyze(file, instructions) {
    const formData = new FormData();
    formData.append('files', file);
    
    // Files are sent with the message - AI processes them immediately
    const result = await pt.addMessage(formData, instructions);
    
    // Only wait for AI response - no waitForDocumentReady needed!
    const response = await pt.waitForMessageReceived(result.task_id, {
        timeout: 120000  // 2 minutes for complex analysis
    });
    
    return response.message;
}

// Usage
const analysis = await uploadAndAnalyze(
    invoiceFile, 
    'Extract line items, total, and vendor from this invoice'
);
```

### Silent Upload with Text Extraction (waitForDocumentReady Required)

When uploading files silently (without AI) and you need the extracted text:

```javascript
async function uploadAndExtractText(file) {
    const formData = new FormData();
    formData.append('files', file);
    
    // Silent upload - no AI processing
    const result = await pt.uploadFiles(formData);
    const docId = result.documents[0].id;
    
    // Must wait for document processing to complete
    try {
        const doc = await pt.waitForDocumentReady(docId, {
            timeout: 60000  // 1 minute
        });
        
        // Now safe to get extracted text
        const text = await pt.getDocumentText(docId);
        return { success: true, text: text.text };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
```

### Track Batch Upload Progress

For multiple file uploads with progress tracking (silent uploads):

```javascript
async function uploadWithProgress(files) {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    
    const result = await pt.uploadFiles(formData);
    const docIds = result.documents.map(d => d.id);
    const total = docIds.length;
    
    return new Promise((resolve) => {
        const processed = new Set();
        
        const unsubscribe = pt.onDocumentChanged((doc) => {
            if (doc.status === 'Ready' || doc.status === 'Error') {
                processed.add(doc.id);
                updateProgressBar(processed.size, total);
                
                if (processed.size === total) {
                    unsubscribe();
                    resolve({ processed: processed.size });
                }
            }
        }, { documentIds: docIds });
    });
}
```

### Cache Generated Documents by Entity ID

When generating PDFs, DOCX, or other files from entity data, save them with a predictable filename based on the entity ID. This allows you to check for cached versions before regenerating, saving processing time and API calls.

**Pattern:**
1. Save generated documents to a dedicated folder (e.g., `/translations/`)
2. Use a consistent naming convention: `{type}_{entityId}.{format}`
3. Before generating, check if a cached version exists using `pt.getDocumentInfo()`
4. If cached, download directly from the existing URL
5. If not cached, generate and save to the folder

```javascript
// Configuration
const CACHE_FOLDER = '/translations';

/**
 * Get or generate a document for an entity
 * Returns cached version if available, otherwise generates new one
 */
async function getOrGenerateDocument(entityId, format = 'pdf') {
    const filename = `translation_${entityId}.${format}`;
    const filepath = `${CACHE_FOLDER}/${filename}`;
    
    // Check if cached version exists
    try {
        const docInfo = await pt.getDocumentInfo(filepath);
        
        if (docInfo && docInfo.document && docInfo.document.download_url) {
            console.log('Using cached document:', filename);
            return {
                cached: true,
                url: docInfo.document.download_url,
                documentId: docInfo.document.id
            };
        }
    } catch (error) {
        // Document doesn't exist, will generate new one
        console.log('No cached version found, generating new document');
    }
    
    // Generate new document
    const entity = await pt.get(entityId);
    const generatedDoc = await generateDocument(entity, format);
    
    // Save to cache folder
    const formData = new FormData();
    formData.append('files', generatedDoc.blob, filename);
    
    const result = await pt.uploadFiles(formData, CACHE_FOLDER);
    const savedDoc = result.documents[0];
    
    return {
        cached: false,
        url: savedDoc.download_url,
        documentId: savedDoc.id
    };
}

/**
 * Download button handler with caching
 */
async function handleDownload(entityId, format) {
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Preparing...';
    
    try {
        const result = await getOrGenerateDocument(entityId, format);
        
        // Trigger download
        const link = document.createElement('a');
        link.href = result.url;
        link.download = `translation_${entityId}.${format}`;
        link.click();
        
        if (result.cached) {
            showSuccess('Downloaded from cache');
        } else {
            showSuccess('Document generated and downloaded');
        }
    } catch (error) {
        showError('Failed to generate document: ' + error.message);
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Download';
    }
}
```

**Benefits:**
- Faster downloads for repeated requests (no regeneration needed)
- Reduced server load and API usage
- Consistent file organization
- Easy to find and manage generated documents

**When to Use:**
- Translation exports
- Report generation
- Invoice/receipt PDFs
- Any document generated from entity data that doesn't change frequently

**Cache Invalidation:**
If entity data changes and you need to regenerate, delete the cached document first:

```javascript
async function regenerateDocument(entityId, format = 'pdf') {
    const filename = `translation_${entityId}.${format}`;
    const filepath = `${CACHE_FOLDER}/${filename}`;
    
    // Delete cached version if exists
    try {
        const docInfo = await pt.getDocumentInfo(filepath);
        if (docInfo && docInfo.document) {
            await pt.deleteDocuments([docInfo.document.id]);
        }
    } catch (error) {
        // No cached version to delete
    }
    
    // Generate fresh document
    return await getOrGenerateDocument(entityId, format);
}
```

### Downloading Documents Generated with pt.saveDocument()

When using `pt.saveDocument()` to generate PDF, DOCX, or other document formats, the function saves the document to PrimeThink's storage but doesn't automatically trigger a browser download. To enable automatic downloads, extract the `download_url` from the response and trigger the download manually.

**Helper Functions:**

```javascript
// Extract download URL from various response structures
function extractDownloadUrl(result) {
    if (result?.result?.documents?.[0]?.download_url) return result.result.documents[0].download_url;
    if (result?.documents?.[0]?.download_url) return result.documents[0].download_url;
    if (result?.download_url) return result.download_url;
    // Fallback: construct URL from UUID using pt._getUrl() (never hardcode the domain)
    if (result?.uuid) return pt._getUrl(`/api/v1/documents/uuid/${result.uuid}/download/stream`);
    return null;
}

// Trigger browser download from URL
function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
```

**Usage Example:**

```javascript
async function downloadAsPdf() {
    try {
        showToast('Generating PDF...', 'info');
        const filename = 'my-document.pdf';
        
        // Save document to PrimeThink storage
        const result = await pt.saveDocument(
            filename, 
            'PDF', 
            'application/pdf', 
            content, 
            'exports'
        );
        
        // Extract and trigger download
        const downloadUrl = extractDownloadUrl(result);
        if (downloadUrl) {
            triggerDownload(downloadUrl, filename);
            showToast('PDF downloaded', 'success');
        } else {
            showToast('PDF saved to documents', 'success');
        }
    } catch (error) {
        console.error('PDF generation failed:', error);
        showToast('Failed to generate PDF', 'error');
    }
}
```

**Key Points:**
- `pt.saveDocument()` returns a result object containing the document's `download_url`
- The response structure can vary, so `extractDownloadUrl()` checks multiple paths
- Relative URLs work since Live Pages run within the PrimeThink platform
- Use `triggerDownload()` to programmatically click a download link
- Always provide a fallback message if the download URL isn't available

## Async Fire-and-Forget Pattern for AI Generation

When a Live App asks the AI to do something complex — generate content, process documents, create images — the work can take 10–60+ seconds. A synchronous `pt.addMessage()` with `awaitResponse: true` blocks the UI, prevents parallel tasks, and loses results if the user navigates away.

**Critically:** PrimeThink Live Apps run as embedded HTML inside a chat. If the user closes the tab, switches to another chat, or refreshes the page, **all client-side JavaScript stops immediately** — any in-flight `await` calls are killed, and results are lost.

The **fire-and-forget pattern** solves this by moving work to the AI backend (which runs independently of the browser) and using the database as a shared task queue. Once `pt.addMessage()` is called, the AI processes the task server-side regardless of what the frontend does.

### How It Works

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│  Frontend    │       │  Chat DB     │       │  AI (Chat)  │
│  (Live App)  │       │  (Entities)  │       │  (GOAL.md)  │
└──────┬───────┘       └──────┬───────┘       └──────┬──────┘
       │                      │                      │
       │ 1. pt.add('task',    │                      │
       │    {status:'queued'})│                      │
       │─────────────────────>│                      │
       │                      │                      │
       │ 2. pt.addMessage()   │                      │
       │    (fire-and-forget) │                      │
       │──────────────────────┼─────────────────────>│
       │                      │                      │
       │ 3. Switch to queue   │                      │
       │    Start polling     │                      │
       │                      │  4. AI generates     │
       │                      │     content...       │
       │                      │                      │
       │                      │  5. chatdb_edit      │
       │                      │<─────────────────────│
       │                      │  {status:'complete', │
       │                      │   text:'...'}        │
       │                      │                      │
       │ 6. pt.get(id)        │                      │
       │    sees 'complete'   │                      │
       │<─────────────────────│                      │
       │                      │                      │
       │ 7. Render result     │                      │
```

**In short:** Create a placeholder entity → tell the AI its ID → let the AI fill it in → poll until done.

### Step 1: Create the Placeholder Entity

Before sending anything to the AI, create an entity with all the input data and a `status: 'queued'` field:

```javascript
const entity = await pt.add('my_task', {
  status: 'queued',        // The status field is the core of the pattern
  input_text: userInput,   // Whatever the AI needs to work with
  platform: 'linkedin',    // Task-specific parameters
  result: null,            // Will be filled by the AI
  error_message: null      // Will be filled on failure
});

console.log('Created entity:', entity.id);
```

**Why create first?** Because `pt.add()` returns a stable entity ID that the AI can reference in its `chatdb_edit` call. The entity acts as a "mailbox" for the AI to write its result into.

### Step 2: Build the AI Prompt with the Entity ID

The prompt must tell the AI **what** to generate, **where** to save it (the entity ID), **how** to save it (`chatdb_edit` with `merge: true`), and **what to do on error**:

```javascript
function buildPrompt(entity) {
  return `TASK: Generate a LinkedIn post and save it to the database.

ENTITY ID: ${entity.id}

--- SOURCE CONTENT ---
${entity.data.input_text}
--- END CONTENT ---

Generate a professional LinkedIn post based on the content above.

After generating, you MUST ACTUALLY CALL the tool 'chatdb_edit' with these exact parameters:
- entity_id: ${entity.id}
- data: {"status": "complete", "result": "<the generated post>"}
- merge: true

If you encounter an error, ACTUALLY CALL chatdb_edit with these exact parameters:
- entity_id: ${entity.id}
- data: {"status": "error", "error_message": "<what went wrong>"}
- merge: true

CRITICAL RULES:
1. You must ACTUALLY EXECUTE the chatdb_edit tool call. Do not just describe what you would do.
2. You MUST pass merge: true as a parameter in every chatdb_edit call. If you omit merge, the entire entity data will be replaced and other fields will be permanently deleted.`;
}
```

> **Key phrases:** Use "ACTUALLY CALL" and "MUST ACTUALLY EXECUTE" to prevent the AI from merely describing the tool call instead of executing it.

### Critical: Always Use `merge: true` in chatdb_edit

**This is the most important detail in the entire pattern.** When multiple fire-and-forget messages run concurrently, each AI task calls `chatdb_edit` independently. Without `merge: true`, each call **replaces the entire entity data** — meaning concurrent tasks will overwrite each other's results.

**`merge: true`** tells `chatdb_edit` to only update the fields you pass and leave everything else untouched. This is equivalent to `pt.edit(id, data, true)` on the client side.

```
Without merge: true — DATA LOSS with concurrent tasks
─────────────────────────────────────────────────────

Entity starts as:
  { status: "queued", input: "...", summary: null, keywords: null }

Task A finishes first, calls chatdb_edit WITHOUT merge:
  data: { status: "partial", summary: "Great article about..." }
  → Entity is now: { status: "partial", summary: "Great article about..." }
  → ❌ input, keywords fields are GONE

Task B finishes, calls chatdb_edit WITHOUT merge:
  data: { status: "complete", keywords: ["AI", "ML"] }
  → Entity is now: { status: "complete", keywords: ["AI", "ML"] }
  → ❌ summary is GONE — Task A's work is lost!
```

```
With merge: true — SAFE concurrent updates
───────────────────────────────────────────

Entity starts as:
  { status: "queued", input: "...", summary: null, keywords: null }

Task A finishes first, calls chatdb_edit WITH merge: true:
  data: { summary: "Great article about..." }
  → Entity is now: { status: "queued", input: "...", summary: "Great article about...", keywords: null }
  → ✅ Only summary was updated, everything else preserved

Task B finishes, calls chatdb_edit WITH merge: true:
  data: { status: "complete", keywords: ["AI", "ML"] }
  → Entity is now: { status: "complete", input: "...", summary: "Great article about...", keywords: ["AI", "ML"] }
  → ✅ Both summary AND keywords are preserved
```

**Always include `merge: true` in every `chatdb_edit` instruction in your prompts.** This applies to both success and error cases:

```javascript
// ✅ CORRECT — explicitly tell the AI to pass merge: true as a parameter
function buildPrompt(entity) {
  return `...
ACTUALLY CALL chatdb_edit with these exact parameters:
- entity_id: ${entity.id}
- data: {"status": "complete", "result": "..."}
- merge: true

IMPORTANT: You MUST pass merge: true as a parameter to chatdb_edit.
If you omit merge, the entire entity data will be replaced and other fields
will be permanently deleted.

On error, ACTUALLY CALL chatdb_edit with these exact parameters:
- entity_id: ${entity.id}
- data: {"status": "error", "error_message": "..."}
- merge: true
...`;
}

// ❌ WRONG — prompt doesn't mention merge, AI will omit it
// "Save the result using chatdb_edit with entity_id and data"
// → AI calls chatdb_edit without merge → replaces ALL entity data
```

**Multi-phase example — multiple concurrent AI tasks writing to the SAME entity:**

```javascript
// Entity with multiple fields to be filled by different concurrent AI tasks
const entity = await pt.add('analysis', {
    status: 'queued',
    input: userText,
    summary: null,           // Task A will fill this
    key_terms: null,          // Task B will fill this
    action_items: null,       // Task C will fill this
    phases_complete: 0
});

// Fire 3 independent tasks concurrently — all writing to the SAME entity
// Each prompt MUST tell the AI to pass merge: true as a parameter
pt.addMessage(`TASK: Generate a summary.
ENTITY ID: ${entity.id}
ACTUALLY CALL chatdb_edit with these exact parameters:
- entity_id: ${entity.id}
- data: {"summary": "<your summary>"}
- merge: true
You MUST pass merge: true as a parameter. Without it, other fields will be deleted.`);

pt.addMessage(`TASK: Extract key terms.
ENTITY ID: ${entity.id}
ACTUALLY CALL chatdb_edit with these exact parameters:
- entity_id: ${entity.id}
- data: {"key_terms": ["term1", "term2", ...]}
- merge: true
You MUST pass merge: true as a parameter. Without it, other fields will be deleted.`);

pt.addMessage(`TASK: Identify action items.
ENTITY ID: ${entity.id}
ACTUALLY CALL chatdb_edit with these exact parameters:
- entity_id: ${entity.id}
- data: {"action_items": ["item1", "item2", ...]}
- merge: true
You MUST pass merge: true as a parameter. Without it, other fields will be deleted.`);

// Poll — check for all phases complete
const poll = setInterval(async () => {
    const updated = await pt.get(entity.id);
    if (updated.data.summary && updated.data.key_terms && updated.data.action_items) {
        clearInterval(poll);
        showResults(updated.data);
    }
}, 8000);
```

> **Note on `phases_complete`:** Because tasks finish in unpredictable order, a simple counter like `phases_complete` is unreliable for tracking completion. Instead, check for the presence of the actual result fields (e.g., `summary && key_terms && action_items`) or use separate status fields per phase.

**Also update your GOAL.md** to reinforce `merge: true`. The AI reads GOAL.md before every response, so this is the most reliable place to enforce the rule:

```markdown
## CRITICAL RULE FOR ALL chatdb_edit CALLS

You MUST ALWAYS pass `merge: true` as a parameter when calling `chatdb_edit`.
The merge parameter tells the database to only update the fields you pass
and leave all other fields untouched.

WITHOUT merge: true, calling chatdb_edit REPLACES the entire entity data —
any fields you don't include in the data parameter will be permanently deleted.
This is especially dangerous when multiple tasks write to the same entity concurrently.

CORRECT:  chatdb_edit(entity_id=..., data={...}, merge=true)
WRONG:    chatdb_edit(entity_id=..., data={...})  ← deletes all other fields

NEVER call chatdb_edit without passing merge: true.
```

### Step 3: Fire the Message (Don't Await the Response)

```javascript
// Fire-and-forget: do NOT await the AI response
pt.addMessage(buildPrompt(entity));

// Immediately move to queue/loading UI
showLoadingState();
startPolling();
```

`pt.addMessage()` without `awaitResponse: true` returns immediately after the message is sent. The AI processes it in the background.

### Step 4: Poll for Completion

```javascript
let pollInterval = null;

function startPolling() {
  pollInterval = setInterval(async () => {
    const updated = await pt.get(entity.id);

    if (updated.data.status === 'complete') {
      stopPolling();
      showResult(updated.data.result);
    } else if (updated.data.status === 'error') {
      stopPolling();
      showError(updated.data.error_message);
    }
    // else still 'queued' — keep polling
  }, 10000); // every 10 seconds
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
```

### Step 5: (Optional) Use Socket Events for Instant Updates

Socket events fire when the AI calls `chatdb_edit`, giving near-instant feedback instead of waiting for the next poll cycle:

```javascript
try {
  pt.onSocketEvent((event, data) => {
    if (event === 'chat_db_updated') {
      refreshFromDb(); // Immediately check entity status
    }
  });
} catch (e) {
  // Socket events not available — polling still works
}
```

> **Always keep polling as a fallback.** Socket events are best-effort; polling is the reliable backbone.

### Step 6: Update GOAL.md

The chat's goal must instruct the AI how to handle these messages:

```markdown
## Background Task Mode

When you receive a message starting with "TASK: Generate a LinkedIn post",
follow this workflow:

1. Read the ENTITY ID and source content
2. Generate the post
3. ACTUALLY CALL the `chatdb_edit` tool to save the result
4. If an error occurs, still call `chatdb_edit` with error status

You MUST execute the tool calls — do not just describe them.
```

### Scaling: Multiple Tasks in Parallel

The pattern shines when you need to run many AI tasks simultaneously. Create a parent "batch" entity that tracks all child tasks:

```javascript
// 1. Create the batch
const batch = await pt.add('my_batch', {
  status: 'generating',
  post_ids: [],
  post_count: 0,
  completed_count: 0
});

// 2. Create child entities
const tasks = [
  { input: 'text1', platform: 'twitter' },
  { input: 'text2', platform: 'linkedin' },
  { input: 'text3', platform: 'instagram' }
];

const postsData = tasks.map(t => ({
  batch_id: batch.id,
  status: 'queued',
  input_text: t.input,
  platform: t.platform,
  result: null,
  error_message: null
}));

const result = await pt.batchAdd('my_task', postsData);
const created = result.filter(r => r.success).map(r => r.entity);

// 3. Update batch with child IDs
await pt.edit(batch.id, {
  post_ids: created.map(p => p.id),
  post_count: created.length
}, true);

// 4. Fire ALL messages at once (parallel execution)
for (const entity of created) {
  pt.addMessage(buildPrompt(entity));  // NOT awaited
}

// 5. Poll all children
startBatchPolling(created.map(p => p.id));
```

#### Batch Polling

```javascript
async function refreshBatch(postIds) {
  const fetched = await Promise.all(
    postIds.map(id => pt.get(id).catch(() => null))
  );
  const posts = fetched.filter(p => p != null);

  const completed = posts.filter(p => p.data.status === 'complete').length;
  const errored = posts.filter(p => p.data.status === 'error').length;
  const total = posts.length;

  updateProgressUI(`${completed}/${total} complete${errored ? `, ${errored} failed` : ''}`);

  if (completed + errored === total) {
    stopPolling();
    // All done — update batch status
    await pt.edit(batch.id, { status: 'complete', completed_count: completed }, true);
  }
}
```

### Preserving Metadata

Even with `merge: true`, the AI might occasionally call `chatdb_edit` without passing `merge: true` despite your instructions — or it might include extra fields that overwrite values you set. This is a real-world reliability issue with LLMs.

**Defense-in-depth:** Store critical metadata in the batch entity (which the AI never touches), not just the child entity. This way, even if the AI accidentally clobbers a child entity's fields, you can recover from the batch:

```javascript
const postMeta = {};
created.forEach(p => {
  postMeta[p.id] = {
    platform: p.data.platform,
    platform_name: p.data.platform_name,
    char_limit: p.data.char_limit
  };
});

await pt.edit(batch.id, { post_meta: postMeta }, true);
```

Then when rendering, fall back to batch metadata:

```javascript
function getPostInfo(postEntity) {
  const d = postEntity.data;
  const meta = batch.data.post_meta[postEntity.id] || {};
  return {
    platform: d.platform || meta.platform,
    name: d.platform_name || meta.platform_name
  };
}
```

### Resuming After Navigation

If the user leaves the page and comes back, the app should detect in-progress work:

```javascript
async function checkActiveWork() {
  const result = await pt.list({
    entityNames: ['my_batch'],
    filters: { status: 'generating' },
    limit: 1
  });
  const batches = result;  // pt.list() returns a plain array by default

  if (batches.length > 0) {
    const batch = batches[0];
    const posts = await Promise.all(
      batch.data.post_ids.map(id => pt.get(id).catch(() => null))
    );
    // Resume polling if any are still pending
    const hasPending = posts.some(p => p?.data?.status === 'queued');
    if (hasPending) {
      startBatchPolling(batch.data.post_ids);
      return true; // Show queue view
    }
  }
  return false;
}
```

### Handling Stuck Tasks

A task can get stuck in `queued` if the AI fails to call `chatdb_edit`. Add a timeout:

```javascript
function checkStuckTasks(posts) {
  const now = Date.now();
  const TIMEOUT = 5 * 60 * 1000; // 5 minutes

  for (const post of posts) {
    if (post.data.status === 'queued') {
      const created = new Date(post.created_at).getTime();
      if (now - created > TIMEOUT) {
        // Mark as timed out
        pt.edit(post.id, {
          status: 'error',
          error_message: 'Generation timed out after 5 minutes'
        }, true);
      }
    }
  }
}
```

Call this inside your polling loop.

### When to Use This Pattern

**Use fire-and-forget when:**

| Scenario | Why |
|----------|-----|
| AI generation takes > 5 seconds | Avoid blocking the UI |
| Multiple independent AI tasks | Run them all in parallel |
| User might close tab or switch chats | Client JS dies on navigation — server-side AI keeps running |
| Image generation is involved | `generate_image` adds 10–30s per image |
| Complex multi-tool workflows | AI needs to call multiple tools sequentially |
| Series/batch generation | 5–20+ posts at once |

**Use synchronous (`awaitResponse: true`) when:**

| Scenario | Why |
|----------|-----|
| Quick lookups or classifications | Response in < 5 seconds |
| Planning step before execution | Need the AI response to show UI (e.g., series plan review) |
| User is actively waiting for a single answer | Simpler code, no polling needed |
| Conversational back-and-forth | Natural chat flow |

### Advantages

1. **Survives tab close / chat switch** — The AI runs server-side; closing the browser doesn't kill the work
2. **Non-blocking UI** — User sees immediate feedback and a loading queue
3. **Parallel execution** — Multiple tasks generate simultaneously, not sequentially
4. **Resilient to disconnection** — Results live in the DB; refreshing the page picks up where it left off
5. **Granular progress** — Each task has its own status; completed ones show immediately
6. **Error isolation** — One failure doesn't block others; errors are per-task
7. **Scalable** — Works for 1 task or 50; same pattern

### Disadvantages

1. **More code** — Requires entity creation, prompt engineering, polling, and queue UI
2. **Polling overhead** — Each poll cycle calls `pt.get()` per entity (mitigated by socket events)
3. **Prompt engineering fragility** — AI must reliably call `chatdb_edit`; unclear prompts → silent failures
4. **No guaranteed delivery** — If the AI ignores the tool call instruction, the entity stays `queued` forever (mitigate with a timeout)
5. **Debugging complexity** — Failures are async; check entity status + chat history to diagnose
6. **`merge: true` is essential** — Without `merge: true` in `chatdb_edit`, concurrent tasks overwrite each other's data. Every prompt must explicitly include it, and GOAL.md should reinforce it as a rule
7. **Metadata duplication** — Need to store config in both the entity and the batch as defense-in-depth against AI ignoring `merge: true`

### Complete Minimal Example

A stripped-down Live App that generates a summary using fire-and-forget:

```html
<div id="app">
  <textarea id="input" rows="5" placeholder="Paste text..."></textarea>
  <button id="go-btn">Summarize</button>
  <div id="status" class="hidden">Generating...</div>
  <div id="result" class="hidden"></div>
</div>

<script>
(function() {
  const $ = id => document.getElementById(id);
  let entityId = null;
  let pollInterval = null;

  $('go-btn').addEventListener('click', async () => {
    const text = $('input').value.trim();
    if (!text) return;

    // 1. Create placeholder
    const entity = await pt.add('summary_task', {
      status: 'queued',
      input: text,
      result: null,
      error_message: null
    });
    entityId = entity.id;

    // 2. Fire AI message
    pt.addMessage(`TASK: Summarize and save to database.

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
- data: {"status": "error", "error_message": "<error>"}
- merge: true`);

    // 3. Show loading, start polling
    $('status').classList.remove('hidden');
    $('go-btn').disabled = true;
    pollInterval = setInterval(poll, 8000);
  });

  async function poll() {
    if (!entityId) return;
    const entity = await pt.get(entityId);

    if (entity.data.status === 'complete') {
      clearInterval(pollInterval);
      $('status').classList.add('hidden');
      $('result').classList.remove('hidden');
      $('result').textContent = entity.data.result;
      $('go-btn').disabled = false;
    } else if (entity.data.status === 'error') {
      clearInterval(pollInterval);
      $('status').textContent = 'Error: ' + entity.data.error_message;
      $('go-btn').disabled = false;
    }
  }
})();
</script>
```

### Fire-and-Forget Checklist

When implementing fire-and-forget in a new app:

- [ ] Entity created with `status: 'queued'` before sending AI message
- [ ] Prompt includes `ENTITY ID: ${id}` prominently
- [ ] Prompt explicitly says "ACTUALLY CALL chatdb_edit" (not "you should" or "please")
- [ ] Prompt includes error handling instructions (write error status on failure)
- [ ] **`merge: true` in ALL `chatdb_edit` instructions (success AND error cases) — without this, concurrent tasks will overwrite each other's data**
- [ ] **GOAL.md includes a rule: "ALWAYS pass merge: true when calling chatdb_edit"**
- [ ] Polling starts immediately after firing messages
- [ ] Polling stops when all tasks are `complete` or `error`
- [ ] Socket events used as an accelerator (optional but recommended)
- [ ] Resume logic on page load (`checkActiveWork`)
- [ ] Timeout handling for stuck tasks
- [ ] GOAL.md updated with task-handling instructions
- [ ] Batch entity used when generating multiple items
- [ ] Metadata preserved in batch for fallback rendering (defense against AI ignoring merge)

## Next Steps

- **[Creating Live Pages](Creating-Live-Pages.md)** - Back to main guide
- **[Data Management API Reference](Data-Management-API.md)** - Learn about all pt API methods
- **[Message Response Handling](primethink_js_message_received.md)** - Handle AI responses with waitForMessageReceived
- **[Document Events](primethink_js_document_events.md)** - Track document processing with waitForDocumentReady
- **[Filtering and Querying](Filtering-and-Querying.md)** - Advanced filtering techniques
- **[Complete Examples](Live-Pages-Examples.md)** - See best practices in action
