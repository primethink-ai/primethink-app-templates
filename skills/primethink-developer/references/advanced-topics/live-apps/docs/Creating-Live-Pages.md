# Creating Live Pages

## Overview

A Live Page is a dynamic HTML page that combines traditional web technologies with AI-powered backend management and a powerful JavaScript data layer. Unlike static pages, Live Pages can dynamically manage data through CRUD operations and adapt their content and functionality based on user interactions.

The terms **Live Page** and **Live App** refer to the same feature and are used interchangeably across this documentation — an interactive HTML application rendered inside a chat, with "Live App" being the more recent name.

## Core Architecture

### Canvas and Documents

The Live Page architecture consists of:

* **Canvas**: Serves as the main HTML content of your page. A Live Page is a complete HTML file — it includes its own DOCTYPE, `<html>`, `<head>`, and `<body>` elements.
* **Documents**: Function as a virtual file system containing configurations and supporting files
* **Data Layer**: A JavaScript library (`pt`) that provides CRUD operations for managing entities and data

**Important**: The app owns its dependencies; PrimeThink does not inject Tailwind. Dynamic/no-build HTML or browser-transpiled React apps can load the pinned Tailwind v4 browser build in their source HTML. Compiled React/Vite apps install Tailwind and generate CSS during `npm run build` instead; they must not load the browser build. See [Tailwind CSS v4 Setup](Live-Apps-Tailwind-v4.md) for both workflows. (The `pt` JavaScript library, by contrast, *is* injected automatically.)

!!! warning "The `pt` runtime is available only inside PrimeThink"
    PrimeThink injects the `pt` API and its ChatDB authentication context only when it serves the app inside a PrimeThink chat. A copy deployed to an external host does not receive `pt` or PrimeThink credentials. For external deployments, use a separate backend and authentication, keep data features available only in the PrimeThink live view, or provide a preview/demo fallback.

## Quick Start

### Basic Data Operations

The `pt` JavaScript library is automatically available in your Live Page. Here's a quick example:

```javascript
// List entities with filters
const tasks = await pt.list({
    entityNames: ['task'],
    filters: { status: 'active' },
    limit: 20
});

// Add new entity
const newTask = await pt.add('task', {
    text: 'Buy groceries',
    completed: false
});

// Get single entity by ID
const task = await pt.get(123);

// Update entity
await pt.edit(123, {
    ...task.data,
    completed: true
});

// Delete entity
await pt.delete(123);

// Send message to chat
await pt.addMessage('Task completed!');

// Upload files WITH message (triggers AI processing)
const formData = new FormData();
formData.append('files', fileInput.files[0]);
await pt.addMessage(formData, 'Please analyze these files');

// Upload files to a specific folder with message
await pt.addMessage(formData, 'Monthly report', { folder: 'reports/january' });

// For AI generation tasks (content, images, docs), use fire-and-forget:
// 1. Create placeholder: const entity = await pt.add('task', { status: 'queued', ... });
// 2. Fire without awaiting: pt.addMessage(`TASK: ... ENTITY ID: ${entity.id} ...`);
// 3. Poll for results: setInterval(() => pt.get(entity.id), 8000);
// See: Async Fire-and-Forget Pattern for AI Generation

// Upload files silently to document library (no message, no AI)
await pt.uploadFiles(formData, 'reports/2024');

// Send push notification
await pt.sendNotification(123, 'New Task', 'You have been assigned a task');

// Search documents
const results = await pt.searchDocuments('project requirements', 'DOCUMENTS_ONLY');

// Get document text
const doc = await pt.getDocumentText(456);

// Save document (returns detailed document information)
const result = await pt.saveDocument('report.pdf', 'PDF', 'application/pdf', '# Report\n\nContent here...');
// result.documents contains the document ID, download URL, and metadata
```

### Simple Todo Example

The example below is a dynamic/no-build HTML example and shows the `<body>` content only. Place it inside a full HTML file whose `<head>` contains the [Tailwind v4 browser-build setup](Live-Apps-Tailwind-v4.md#dynamic-no-build-installation). In a compiled React/Vite app, use the equivalent JSX and let the build generate the CSS.

```html
<div class="container mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">My Tasks</h1>

    <div class="flex gap-2 mb-4">
        <input
            type="text"
            id="taskInput"
            class="flex-1 px-3 py-2 border rounded"
            placeholder="New task..."
        >
        <button
            onclick="addTask()"
            class="bg-blue-500 text-white px-4 py-2 rounded"
        >
            Add
        </button>
    </div>

    <div id="tasksList"></div>
</div>

<script>
// Escape user-provided text before inserting it into innerHTML.
// Live Apps are collaborative — another user's task text could contain
// HTML/script, so always escape data-field values to prevent XSS.
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

async function loadTasks() {
    const entities = await pt.list({
        entityNames: ['task'],
        filters: { completed: false }
    });

    const tasks = entities.filter(e => e.entity_name === 'task');

    document.getElementById('tasksList').innerHTML = tasks.map(task => `
        <div class="bg-white p-4 rounded shadow mb-2 flex justify-between">
            <span>${escapeHtml(task.data.text)}</span>
            <button onclick="deleteTask(${task.id})" class="text-red-500">
                Delete
            </button>
        </div>
    `).join('');
}

async function addTask() {
    const text = document.getElementById('taskInput').value.trim();
    if (!text) return;

    await pt.add('task', {
        text: text,
        completed: false
    });

    document.getElementById('taskInput').value = '';
    await loadTasks();
}

async function deleteTask(taskId) {
    await pt.delete(taskId);
    await loadTasks();
}

// Load tasks on page load
document.addEventListener('DOMContentLoaded', loadTasks);
</script>
```

!!! warning "Always escape user content"
    Live Apps are collaborative — any value in an entity's `data` may have been written by another user and could contain HTML or script. Whenever you build markup with `innerHTML` (or template strings assigned to it), pass user-provided values through `escapeHtml()` as shown above. Skipping this is a stored-XSS bug. See [Escape User Input](Live-Pages-Best-Practices.md#1-escape-user-input) for details.

## Providing In-App Help

If your Live App benefits from end-user documentation, attach a file named `@app/HELP.md`. PrimeThink detects it and shows a **?** button in the right sidebar of any chat running the app. Clicking the button opens an inline markdown reader that renders `@app/HELP.md`, so users can consult the docs without leaving the conversation.

## Setup Requirements

### No Special Configuration Needed

The data layer system requires no special chat configuration:

- **No need to disable History and Memory**: The system doesn't rely on LLM parsing
- **No GOAL setup required**: Data operations are handled by JavaScript
- **No prompt engineering**: Direct JavaScript API calls handle all data manipulation
- **Automatic timestamps**: The system automatically manages `created_at` and `updated_at` timestamps at the entity level

### Important Notes

- **Timestamps are automatic**: Don't add `created_at` or `updated_at` to your data objects - they're managed at the entity level
- **Creator tracking**: The `creator_user_id` field is automatically set when you create an entity, tracking who created it
- **Entity structure**: Your data goes in the `data` property, with system metadata at the entity level
- **No initialization needed**: The `pt` library is automatically available and initialized

## Entity Structure

Entities returned by `pt.list()` and `pt.get()` have this structure:

```javascript
{
    id: 123,                    // Unique entity ID
    entity_name: 'task',        // Type of entity
    data: {                     // Your actual data
        text: 'Buy groceries',
        completed: false
    },
    creator_user_id: 456,       // User ID who created this entity
    created_at: '2024-03-15T10:30:00+00:00',  // Managed automatically
    updated_at: '2024-03-15T10:35:00+00:00'   // Managed automatically
}
```

## Styling with Tailwind CSS

Live Pages have full support for **Tailwind CSS**, a utility-first CSS framework. Use the pinned browser build for dynamic/no-build apps, or the installed Vite integration for compiled apps. See [Tailwind CSS v4 Setup](Live-Apps-Tailwind-v4.md) before applying these utility patterns.

```html
<div class="bg-blue-500 text-white p-4 rounded-lg shadow-md">
    <h2 class="text-xl font-bold mb-2">Welcome</h2>
    <p class="text-blue-100">This is styled with Tailwind CSS</p>
</div>
```

### Responsive Design

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div class="bg-white p-6 rounded-lg shadow">Card 1</div>
    <div class="bg-white p-6 rounded-lg shadow">Card 2</div>
    <div class="bg-white p-6 rounded-lg shadow">Card 3</div>
</div>
```

## Next Steps

Explore these detailed guides to build more sophisticated Live Pages:

### Core Topics
- **[Data Management API Reference](Data-Management-API.md)** - Complete guide to all `pt` API methods and operations
- **[Filtering and Querying](Filtering-and-Querying.md)** - Advanced server-side filtering with operators like `$contains`, `$in`, `$or`, and more
- **[Pagination](Pagination.md)** - Implement efficient pagination for large datasets
- **[Working with Chat Members](Working-with-Chat-Members.md)** - Integrate chat members into your Live Pages

### Message & Document Handling
- **[Message Response Handling](primethink_js_message_received.md)** - Handle AI responses with `waitForMessageReceived` and `onMessageReceived`
- **[Document Events & File Upload](primethink_js_document_events.md)** - Track document processing with `waitForDocumentReady` and `onDocumentChanged`

### Design and Examples
- **[Styling with Tailwind CSS](Styling-with-Tailwind.md)** - Component examples and responsive design patterns
- **[Complete Examples](Live-Pages-Examples.md)** - Full implementations including todo apps, dashboards, and more

### Advanced Topics
- **[Performance and Best Practices](Live-Pages-Best-Practices.md)** - Error handling, optimization, caching, using Goals for automation, and troubleshooting

## Common Use Cases

Live Pages are ideal for:

- **Task Management**: Todo lists, project trackers, sprint boards with notifications
- **Data Dashboards**: Analytics, reporting, monitoring with export to PDF/Excel
- **Content Management**: Article management, blog systems with document search
- **Forms and Surveys**: Data collection and processing with automated notifications
- **Inventory Systems**: Product catalogs, stock management with reports
- **Customer Support**: Ticket tracking, issue management with user notifications
- **Document Library**: Search, view, and create documents in various formats
- **Knowledge Base**: Semantic search across documentation with RAG
- **Report Generation**: Automated creation of PDFs, Word documents, and spreadsheets
- **Team Collaboration**: Real-time updates with push notifications to team members
- **Invoice Processing**: Upload invoices, AI extracts data and stores in database automatically
- **Resume Screening**: Batch upload resumes, AI parses and creates candidate records
- **Expense Management**: Upload receipts, AI categorizes and tracks expenses
- **Meeting Analysis**: Upload meeting notes/recordings, AI extracts action items
- **Data Migration**: Upload spreadsheets, AI validates and imports data with error handling
- **Competitive Research**: AI searches web and compiles competitor intelligence automatically
- **Lead Generation**: AI finds potential customers and stores contact information

## Key Features

- **Real-time Updates**: Data syncs automatically across the chat
- **Server-side Filtering**: Efficient querying with MongoDB-style operators
- **Pagination Support**: Handle large datasets efficiently
- **Chat Integration**: Access chat members and their information
- **Send Messages**: Communicate back to the chat from your Live Page
- **File Upload**: Upload files directly to the chat with drag & drop support
- **AI-Powered Database Operations**: Send natural language instructions to have AI extract data and manage database entities automatically
- **Intelligent File Processing**: Upload files with instructions and let AI extract structured data and store it in the database
- **Push Notifications**: Send notifications to specific users
- **Document Search**: Semantic search across documents and collections using RAG
- **Document Management**: View document content and create documents in various formats (TXT, MD, HTML, DOCX, PDF, CSV, XLSX, CUSTOM)
- **No Backend Setup**: Everything works out of the box
- **Tailwind CSS**: Modern, responsive styling without custom CSS
