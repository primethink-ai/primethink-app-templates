# Basic Live Pages Examples

## Overview

This page contains simple, easy-to-understand examples to help you get started with Live Pages. Each example focuses on one core concept and can be implemented quickly.

!!! warning "User content is escaped in these examples"
    Live Apps are collaborative, so entity `data` may contain text written by other users. Every example below runs user-provided values through `escapeHtml()` before inserting them into `innerHTML` — do the same in your own apps to prevent stored XSS. See [Escape User Input](Live-Pages-Best-Practices.md#1-escape-user-input).

## Simple Task List

The most basic Live Page - a task list with add and delete functionality:

```html
<div class="container mx-auto p-6 max-w-2xl">
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
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
            Add
        </button>
    </div>

    <div id="tasksList"></div>
</div>

<script>
// Escape user-provided text before inserting into innerHTML (prevents XSS)
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
        <div class="bg-white p-4 rounded shadow mb-2 flex justify-between items-center">
            <span>${escapeHtml(task.data.text)}</span>
            <button onclick="deleteTask(${task.id})" class="text-red-500 hover:text-red-700">
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

// Load tasks when page loads
document.addEventListener('DOMContentLoaded', loadTasks);
</script>
```

## Task List with Completion Toggle

Add checkbox functionality to mark tasks as complete:

```html
<div class="container mx-auto p-6 max-w-2xl">
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
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
            Add
        </button>
    </div>

    <div id="tasksList"></div>
</div>

<script>
// Escape user-provided text before inserting into innerHTML (prevents XSS)
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
async function loadTasks() {
    const entities = await pt.list({
        entityNames: ['task']
    });

    const tasks = entities.filter(e => e.entity_name === 'task');

    document.getElementById('tasksList').innerHTML = tasks.map(task => {
        const isCompleted = task.data.completed === true;
        return `
            <div class="bg-white p-4 rounded shadow mb-2 flex justify-between items-center ${isCompleted ? 'opacity-50' : ''}">
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
                <button onclick="deleteTask(${task.id})" class="text-red-500 hover:text-red-700">
                    Delete
                </button>
            </div>
        `;
    }).join('');
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

async function toggleTask(taskId) {
    const task = await pt.get(taskId);
    await pt.edit(taskId, {
        ...task.data,
        completed: !task.data.completed
    });
    await loadTasks();
}

async function deleteTask(taskId) {
    await pt.delete(taskId);
    await loadTasks();
}

document.addEventListener('DOMContentLoaded', loadTasks);
</script>
```

## Simple Search

Add search functionality to filter tasks:

```html
<div class="container mx-auto p-6 max-w-2xl">
    <h1 class="text-2xl font-bold mb-4">My Tasks</h1>

    <!-- Search Input -->
    <input
        type="text"
        id="searchInput"
        class="w-full px-3 py-2 border rounded mb-4"
        placeholder="Search tasks..."
    >

    <!-- Add Task -->
    <div class="flex gap-2 mb-4">
        <input
            type="text"
            id="taskInput"
            class="flex-1 px-3 py-2 border rounded"
            placeholder="New task..."
        >
        <button
            onclick="addTask()"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
            Add
        </button>
    </div>

    <div id="tasksList"></div>
</div>

<script>
// Escape user-provided text before inserting into innerHTML (prevents XSS)
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
let searchTimeout;

async function loadTasks() {
    const searchTerm = document.getElementById('searchInput').value.trim();

    const filters = {};
    if (searchTerm) {
        filters.text = { $contains: searchTerm };
    }

    const entities = await pt.list({
        entityNames: ['task'],
        filters: filters
    });

    const tasks = entities.filter(e => e.entity_name === 'task');

    if (tasks.length === 0) {
        document.getElementById('tasksList').innerHTML = `
            <div class="text-center py-8 text-gray-500">
                No tasks found
            </div>
        `;
        return;
    }

    document.getElementById('tasksList').innerHTML = tasks.map(task => `
        <div class="bg-white p-4 rounded shadow mb-2 flex justify-between items-center">
            <span>${escapeHtml(task.data.text)}</span>
            <button onclick="deleteTask(${task.id})" class="text-red-500 hover:text-red-700">
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

// Setup search with debouncing
document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadTasks, 300);
});

document.addEventListener('DOMContentLoaded', loadTasks);
</script>
```

## Task List with Priority

Add priority levels to tasks:

```html
<div class="container mx-auto p-6 max-w-2xl">
    <h1 class="text-2xl font-bold mb-4">My Tasks</h1>

    <!-- Add Task with Priority -->
    <div class="flex gap-2 mb-4">
        <input
            type="text"
            id="taskInput"
            class="flex-1 px-3 py-2 border rounded"
            placeholder="New task..."
        >
        <select id="priorityInput" class="px-3 py-2 border rounded">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
        </select>
        <button
            onclick="addTask()"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
            Add
        </button>
    </div>

    <div id="tasksList"></div>
</div>

<script>
// Escape user-provided text before inserting into innerHTML (prevents XSS)
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
async function loadTasks() {
    const entities = await pt.list({
        entityNames: ['task']
    });

    const tasks = entities.filter(e => e.entity_name === 'task');

    document.getElementById('tasksList').innerHTML = tasks.map(task => {
        const priorityColors = {
            high: 'bg-red-100 text-red-800',
            medium: 'bg-yellow-100 text-yellow-800',
            low: 'bg-green-100 text-green-800'
        };

        const priorityClass = priorityColors[task.data.priority] || priorityColors.low;

        return `
            <div class="bg-white p-4 rounded shadow mb-2 flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <span>${escapeHtml(task.data.text)}</span>
                    <span class="px-2 py-1 text-xs rounded-full ${priorityClass}">
                        ${task.data.priority}
                    </span>
                </div>
                <button onclick="deleteTask(${task.id})" class="text-red-500 hover:text-red-700">
                    Delete
                </button>
            </div>
        `;
    }).join('');
}

async function addTask() {
    const text = document.getElementById('taskInput').value.trim();
    const priority = document.getElementById('priorityInput').value;

    if (!text) return;

    await pt.add('task', {
        text: text,
        priority: priority,
        completed: false
    });

    document.getElementById('taskInput').value = '';
    await loadTasks();
}

async function deleteTask(taskId) {
    await pt.delete(taskId);
    await loadTasks();
}

document.addEventListener('DOMContentLoaded', loadTasks);
</script>
```

## Simple Counter

A basic counter to demonstrate state management:

```html
<div class="container mx-auto p-6 max-w-md">
    <h1 class="text-2xl font-bold mb-4 text-center">Counter</h1>

    <div class="bg-white rounded-lg shadow-lg p-8 text-center">
        <div class="text-6xl font-bold mb-6" id="counterDisplay">0</div>

        <div class="flex gap-2 justify-center">
            <button
                onclick="decrementCounter()"
                class="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600"
            >
                -
            </button>
            <button
                onclick="resetCounter()"
                class="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
            >
                Reset
            </button>
            <button
                onclick="incrementCounter()"
                class="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
            >
                +
            </button>
        </div>
    </div>
</div>

<script>
let counterId = null;

async function loadCounter() {
    const entities = await pt.list({
        entityNames: ['counter']
    });

    if (entities.length === 0) {
        // Create initial counter
        const result = await pt.add('counter', { value: 0 });
        counterId = result.id;
        updateDisplay(0);
    } else {
        const counter = entities[0];
        counterId = counter.id;
        updateDisplay(counter.data.value);
    }
}

function updateDisplay(value) {
    document.getElementById('counterDisplay').textContent = value;
}

async function incrementCounter() {
    const counter = await pt.get(counterId);
    const newValue = counter.data.value + 1;

    await pt.edit(counterId, { value: newValue });
    updateDisplay(newValue);
}

async function decrementCounter() {
    const counter = await pt.get(counterId);
    const newValue = counter.data.value - 1;

    await pt.edit(counterId, { value: newValue });
    updateDisplay(newValue);
}

async function resetCounter() {
    await pt.edit(counterId, { value: 0 });
    updateDisplay(0);
}

document.addEventListener('DOMContentLoaded', loadCounter);
</script>
```

## Simple Notes List

A minimalist notes application:

```html
<div class="container mx-auto p-6 max-w-2xl">
    <h1 class="text-2xl font-bold mb-4">My Notes</h1>

    <!-- Add Note -->
    <div class="mb-4">
        <input
            type="text"
            id="noteTitleInput"
            class="w-full px-3 py-2 border rounded mb-2"
            placeholder="Note title..."
        >
        <textarea
            id="noteContentInput"
            rows="3"
            class="w-full px-3 py-2 border rounded mb-2"
            placeholder="Note content..."
        ></textarea>
        <button
            onclick="addNote()"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
            Add Note
        </button>
    </div>

    <!-- Notes List -->
    <div id="notesList"></div>
</div>

<script>
// Escape user-provided text before inserting into innerHTML (prevents XSS)
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
async function loadNotes() {
    const entities = await pt.list({
        entityNames: ['note']
    });

    const notes = entities.filter(e => e.entity_name === 'note');

    if (notes.length === 0) {
        document.getElementById('notesList').innerHTML = `
            <div class="text-center py-8 text-gray-500">
                No notes yet
            </div>
        `;
        return;
    }

    document.getElementById('notesList').innerHTML = notes.map(note => `
        <div class="bg-white rounded-lg shadow p-4 mb-3">
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-semibold text-lg">${escapeHtml(note.data.title)}</h3>
                <button
                    onclick="deleteNote(${note.id})"
                    class="text-red-500 hover:text-red-700"
                >
                    Delete
                </button>
            </div>
            <p class="text-gray-600">${escapeHtml(note.data.content)}</p>
            <div class="text-xs text-gray-400 mt-2">
                ${new Date(note.created_at).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}

async function addNote() {
    const title = document.getElementById('noteTitleInput').value.trim();
    const content = document.getElementById('noteContentInput').value.trim();

    if (!title || !content) return;

    await pt.add('note', {
        title: title,
        content: content
    });

    document.getElementById('noteTitleInput').value = '';
    document.getElementById('noteContentInput').value = '';
    await loadNotes();
}

async function deleteNote(noteId) {
    if (confirm('Delete this note?')) {
        await pt.delete(noteId);
        await loadNotes();
    }
}

document.addEventListener('DOMContentLoaded', loadNotes);
</script>
```

## Shopping List

A simple shopping list with quantities:

```html
<div class="container mx-auto p-6 max-w-2xl">
    <h1 class="text-2xl font-bold mb-4">Shopping List</h1>

    <!-- Add Item -->
    <div class="flex gap-2 mb-4">
        <input
            type="text"
            id="itemInput"
            class="flex-1 px-3 py-2 border rounded"
            placeholder="Item name..."
        >
        <input
            type="number"
            id="quantityInput"
            value="1"
            min="1"
            class="w-20 px-3 py-2 border rounded"
        >
        <button
            onclick="addItem()"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
            Add
        </button>
    </div>

    <!-- Items List -->
    <div id="itemsList"></div>
</div>

<script>
// Escape user-provided text before inserting into innerHTML (prevents XSS)
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
async function loadItems() {
    const entities = await pt.list({
        entityNames: ['shopping_item']
    });

    const items = entities.filter(e => e.entity_name === 'shopping_item');

    if (items.length === 0) {
        document.getElementById('itemsList').innerHTML = `
            <div class="text-center py-8 text-gray-500">
                No items in your shopping list
            </div>
        `;
        return;
    }

    document.getElementById('itemsList').innerHTML = items.map(item => {
        const isPurchased = item.data.purchased === true;
        return `
            <div class="bg-white p-4 rounded shadow mb-2 flex justify-between items-center ${isPurchased ? 'opacity-50' : ''}">
                <div class="flex items-center gap-3">
                    <input
                        type="checkbox"
                        ${isPurchased ? 'checked' : ''}
                        onchange="togglePurchased(${item.id})"
                        class="h-4 w-4"
                    >
                    <span class="${isPurchased ? 'line-through text-gray-500' : ''}">
                        ${escapeHtml(item.data.name)}
                    </span>
                    <span class="text-sm text-gray-600">
                        (${item.data.quantity})
                    </span>
                </div>
                <button
                    onclick="deleteItem(${item.id})"
                    class="text-red-500 hover:text-red-700"
                >
                    Delete
                </button>
            </div>
        `;
    }).join('');
}

async function addItem() {
    const name = document.getElementById('itemInput').value.trim();
    const quantity = parseInt(document.getElementById('quantityInput').value);

    if (!name) return;

    await pt.add('shopping_item', {
        name: name,
        quantity: quantity,
        purchased: false
    });

    document.getElementById('itemInput').value = '';
    document.getElementById('quantityInput').value = '1';
    await loadItems();
}

async function togglePurchased(itemId) {
    const item = await pt.get(itemId);
    await pt.edit(itemId, {
        ...item.data,
        purchased: !item.data.purchased
    });
    await loadItems();
}

async function deleteItem(itemId) {
    await pt.delete(itemId);
    await loadItems();
}

document.addEventListener('DOMContentLoaded', loadItems);
</script>
```

## Poll/Voting App

A simple polling application:

```html
<div class="container mx-auto p-6 max-w-2xl">
    <h1 class="text-2xl font-bold mb-4">Quick Poll</h1>

    <!-- Add Poll Option -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
        <input
            type="text"
            id="optionInput"
            class="w-full px-3 py-2 border rounded mb-2"
            placeholder="New poll option..."
        >
        <button
            onclick="addOption()"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
            Add Option
        </button>
    </div>

    <!-- Poll Options -->
    <div id="pollOptions"></div>
</div>

<script>
// Escape user-provided text before inserting into innerHTML (prevents XSS)
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
async function loadPoll() {
    const entities = await pt.list({
        entityNames: ['poll_option']
    });

    const options = entities.filter(e => e.entity_name === 'poll_option');

    if (options.length === 0) {
        document.getElementById('pollOptions').innerHTML = `
            <div class="text-center py-8 text-gray-500">
                No poll options yet. Add one to get started!
            </div>
        `;
        return;
    }

    // Calculate total votes
    const totalVotes = options.reduce((sum, opt) => sum + (opt.data.votes || 0), 0);

    document.getElementById('pollOptions').innerHTML = options.map(option => {
        const votes = option.data.votes || 0;
        const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

        return `
            <div class="bg-white rounded-lg shadow p-4 mb-3">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium">${escapeHtml(option.data.text)}</span>
                    <button
                        onclick="deleteOption(${option.id})"
                        class="text-red-500 hover:text-red-700 text-sm"
                    >
                        Delete
                    </button>
                </div>
                <div class="flex items-center gap-3">
                    <button
                        onclick="vote(${option.id})"
                        class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                    >
                        Vote
                    </button>
                    <div class="flex-1">
                        <div class="bg-gray-200 rounded-full h-6">
                            <div
                                class="bg-blue-500 h-6 rounded-full flex items-center justify-center text-white text-sm"
                                style="width: ${percentage}%"
                            >
                                ${percentage > 10 ? percentage + '%' : ''}
                            </div>
                        </div>
                    </div>
                    <span class="text-sm text-gray-600">${votes} votes</span>
                </div>
            </div>
        `;
    }).join('');
}

async function addOption() {
    const text = document.getElementById('optionInput').value.trim();
    if (!text) return;

    await pt.add('poll_option', {
        text: text,
        votes: 0
    });

    document.getElementById('optionInput').value = '';
    await loadPoll();
}

async function vote(optionId) {
    const option = await pt.get(optionId);
    await pt.edit(optionId, {
        ...option.data,
        votes: (option.data.votes || 0) + 1
    });
    await loadPoll();
}

async function deleteOption(optionId) {
    if (confirm('Delete this option?')) {
        await pt.delete(optionId);
        await loadPoll();
    }
}

document.addEventListener('DOMContentLoaded', loadPoll);
</script>
```

## Send Message to Chat

Send messages from your Live Page to the chat interface:

```html
<div class="container mx-auto p-6 max-w-2xl">
    <h1 class="text-2xl font-bold mb-4">Send Messages</h1>

    <div class="flex gap-2 mb-4">
        <input
            type="text"
            id="messageInput"
            class="flex-1 px-3 py-2 border rounded"
            placeholder="Type a message..."
            onkeypress="if(event.key==='Enter') sendMessage()"
        >
        <button
            onclick="sendMessage()"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
            Send
        </button>
    </div>

    <!-- Quick action buttons -->
    <div class="flex gap-2">
        <button
            onclick="pt.addMessage('Task completed!')"
            class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
        >
            Quick: Task Done
        </button>
        <button
            onclick="pt.addMessage('Need help!')"
            class="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
        >
            Quick: Need Help
        </button>
    </div>
</div>

<script>
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message) {
        alert('Please enter a message');
        return;
    }

    try {
        await pt.addMessage(message);
        input.value = '';
        alert('Message sent!');
    } catch (error) {
        alert('Failed to send message: ' + error.message);
    }
}
</script>
```

## Upload Files to Chat

Upload files from your Live Page with an optional message. Files uploaded with messages trigger AI processing.

```html
<div class="container mx-auto p-6 max-w-2xl">
    <h1 class="text-2xl font-bold mb-4">Upload Files</h1>

    <!-- Upload with message (triggers AI) -->
    <form id="uploadForm" onsubmit="handleUpload(event)" class="bg-white rounded-lg shadow p-6">
        <div class="mb-4">
            <label class="block text-sm font-medium mb-2">Select Files</label>
            <input
                type="file"
                id="fileInput"
                multiple
                class="block w-full text-sm"
                required
            >
        </div>

        <div class="mb-4">
            <label class="block text-sm font-medium mb-2">Message (optional)</label>
            <input
                type="text"
                id="messageInput"
                placeholder="Add instructions for AI..."
                class="border rounded px-3 py-2 w-full"
            >
        </div>

        <button
            type="submit"
            class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
            Upload with Message
        </button>
    </form>

    <!-- Silent document upload (no message, no AI) -->
    <div class="mt-6 bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-bold mb-4">Or Upload to Document Library (Silent)</h2>
        <input
            type="text"
            id="folderInput"
            placeholder="Folder path (e.g., reports/2024)"
            class="border rounded px-3 py-2 w-full mb-3"
        >
        <button
            onclick="handleSilentUpload()"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
            Upload Silently
        </button>
    </div>

    <!-- Drag and drop zone -->
    <div
        id="dropZone"
        ondrop="handleDrop(event)"
        ondragover="event.preventDefault()"
        class="mt-6 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
    >
        <p class="text-gray-600">Drop files here to upload with message</p>
    </div>
</div>

<script>
// Upload with message (creates chat message, triggers AI)
async function handleUpload(event) {
    event.preventDefault();

    const fileInput = document.getElementById('fileInput');
    const message = document.getElementById('messageInput').value.trim() || 'Uploaded files';

    const formData = new FormData();
    for (const file of fileInput.files) {
        formData.append('files', file);
    }

    try {
        const result = await pt.addMessage(formData, message);
        alert(`Uploaded ${result.files_count} file(s) with message!`);
        fileInput.value = '';
        document.getElementById('messageInput').value = '';
    } catch (error) {
        alert('Upload failed: ' + error.message);
    }
}

// Silent upload to document library (no message, no AI)
async function handleSilentUpload() {
    const fileInput = document.getElementById('fileInput');
    const folder = document.getElementById('folderInput').value.trim() || 'uploads';

    if (fileInput.files.length === 0) {
        alert('Please select files first');
        return;
    }

    const formData = new FormData();
    for (const file of fileInput.files) {
        formData.append('files', file);
    }

    try {
        const result = await pt.uploadFiles(formData, folder);
        alert(`Uploaded ${result.documents.length} file(s) to ${result.folder}`);
        console.log('Document details:', result.documents);
        fileInput.value = '';
    } catch (error) {
        alert('Upload failed: ' + error.message);
    }
}

// Drag and drop - uploads with message
async function handleDrop(event) {
    event.preventDefault();

    const files = event.dataTransfer.files;
    if (files.length === 0) return;

    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }

    try {
        const result = await pt.addMessage(formData, 'Drag & drop upload');
        alert(`Uploaded ${result.files_count} file(s)`);
    } catch (error) {
        alert('Upload failed: ' + error.message);
    }
}
</script>
```

## File Upload with Preview

Show file previews before uploading. Choose between uploading with a message (triggers AI) or silently to document library:

```html
<div class="container mx-auto p-6 max-w-2xl">
    <h1 class="text-2xl font-bold mb-4">Upload with Preview</h1>

    <div class="bg-white rounded-lg shadow p-6">
        <input
            type="file"
            id="fileInput"
            multiple
            onchange="previewFiles()"
            class="mb-4 block w-full"
        >

        <div id="preview" class="mb-4"></div>

        <div class="mb-4">
            <input
                type="text"
                id="uploadMessage"
                placeholder="Optional message or instructions..."
                class="border rounded px-3 py-2 w-full"
            >
        </div>

        <div class="flex gap-2">
            <button
                onclick="uploadWithMessage()"
                class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
                Upload with Message
            </button>
            <button
                onclick="uploadSilently()"
                class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
                Upload Silently
            </button>
        </div>
    </div>
</div>

<script>
function previewFiles() {
    const input = document.getElementById('fileInput');
    const preview = document.getElementById('preview');
    const files = input.files;

    if (files.length === 0) {
        preview.innerHTML = '';
        return;
    }

    preview.innerHTML = `
        <div class="bg-gray-50 p-3 rounded">
            <p class="font-medium mb-2">${files.length} file(s) selected:</p>
            ${Array.from(files).map(file => `
                <div class="text-sm text-gray-600">
                    ${file.name} (${(file.size / 1024).toFixed(2)} KB)
                </div>
            `).join('')}
        </div>
    `;
}

async function uploadWithMessage() {
    const input = document.getElementById('fileInput');
    const message = document.getElementById('uploadMessage').value.trim() || 'Files uploaded from preview';

    if (input.files.length === 0) {
        alert('Please select files');
        return;
    }

    const formData = new FormData();
    for (const file of input.files) {
        formData.append('files', file);
    }

    try {
        const result = await pt.addMessage(formData, message);
        alert(`Success! Uploaded ${result.files_count} files with message`);
        input.value = '';
        document.getElementById('preview').innerHTML = '';
        document.getElementById('uploadMessage').value = '';
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function uploadSilently() {
    const input = document.getElementById('fileInput');

    if (input.files.length === 0) {
        alert('Please select files');
        return;
    }

    const formData = new FormData();
    for (const file of input.files) {
        formData.append('files', file);
    }

    try {
        const result = await pt.uploadFiles(formData, 'uploads');
        alert(`Success! Uploaded ${result.documents.length} files to document library`);
        console.log('Documents:', result.documents);
        input.value = '';
        document.getElementById('preview').innerHTML = '';
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
</script>
```

## Send Push Notification

Send push notifications to specific users in your chat:

```html
<div class="container mx-auto p-6 max-w-2xl">
    <h1 class="text-2xl font-bold mb-4">Send Notification</h1>

    <div class="bg-white rounded-lg shadow p-6">
        <select id="userSelect" class="border rounded px-3 py-2 w-full mb-3">
            <option value="">Select a user...</option>
        </select>

        <input
            type="text"
            id="notifTitle"
            placeholder="Notification title"
            class="border rounded px-3 py-2 w-full mb-3"
        >

        <textarea
            id="notifText"
            rows="3"
            placeholder="Notification message"
            class="border rounded px-3 py-2 w-full mb-3"
        ></textarea>

        <button
            onclick="sendNotification()"
            class="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600"
        >
            Send Notification
        </button>
    </div>
</div>

<script>
// Load users on page load
async function loadUsers() {
    const members = await pt.getChatMembers();
    const select = document.getElementById('userSelect');

    members
        .filter(m => m.type === 'user')
        .forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            select.appendChild(option);
        });
}

async function sendNotification() {
    const userId = parseInt(document.getElementById('userSelect').value);
    const title = document.getElementById('notifTitle').value.trim();
    const text = document.getElementById('notifText').value.trim();

    if (!userId || !title || !text) {
        alert('Please fill all fields');
        return;
    }

    try {
        await pt.sendNotification(userId, title, text);

        alert('Notification sent!');
        document.getElementById('notifTitle').value = '';
        document.getElementById('notifText').value = '';
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', loadUsers);
</script>
```

## Search Documents

Search across documents and collections using semantic search:

```html
<div class="container mx-auto p-6 max-w-2xl">
    <h1 class="text-2xl font-bold mb-4">Document Search</h1>

    <div class="bg-white rounded-lg shadow p-6">
        <input
            type="text"
            id="searchQuery"
            placeholder="What are you looking for?"
            class="border rounded px-3 py-2 w-full mb-3"
        >

        <select id="searchScope" class="border rounded px-3 py-2 w-full mb-3">
            <option value="ALL">All (Documents & Collections)</option>
            <option value="DOCUMENTS_ONLY">Documents Only</option>
            <option value="COLLECTIONS_ONLY">Collections Only</option>
        </select>

        <button
            onclick="searchDocs()"
            class="bg-green-500 text-white px-4 py-2 rounded w-full hover:bg-green-600"
        >
            Search
        </button>

        <div id="results" class="mt-4 hidden">
            <h3 class="font-bold mb-2">Results:</h3>
            <div class="bg-gray-50 rounded p-3 max-h-96 overflow-auto">
                <pre id="resultsText" class="text-sm whitespace-pre-wrap"></pre>
            </div>
        </div>
    </div>
</div>

<script>
async function searchDocs() {
    const query = document.getElementById('searchQuery').value.trim();
    const scope = document.getElementById('searchScope').value;

    if (!query) {
        alert('Please enter a search query');
        return;
    }

    try {
        const result = await pt.searchDocuments(query, scope);

        document.getElementById('resultsText').textContent = result.results;
        document.getElementById('results').classList.remove('hidden');
    } catch (error) {
        alert('Search failed: ' + error.message);
    }
}
</script>
```

## View Document Text

Retrieve and display text from a document:

```html
<div class="container mx-auto p-6 max-w-2xl">
    <h1 class="text-2xl font-bold mb-4">View Document</h1>

    <div class="bg-white rounded-lg shadow p-6">
        <input
            type="number"
            id="docId"
            placeholder="Document ID"
            class="border rounded px-3 py-2 w-full mb-3"
        >

        <button
            onclick="viewDoc()"
            class="bg-purple-500 text-white px-4 py-2 rounded w-full hover:bg-purple-600"
        >
            View Text
        </button>

        <div id="docContent" class="mt-4 hidden">
            <h3 class="font-bold mb-2">Document Content:</h3>
            <div class="bg-gray-50 rounded p-3 max-h-96 overflow-auto">
                <pre id="docText" class="text-sm whitespace-pre-wrap"></pre>
            </div>
        </div>
    </div>
</div>

<script>
async function viewDoc() {
    const docId = parseInt(document.getElementById('docId').value);

    if (!docId) {
        alert('Please enter a document ID');
        return;
    }

    try {
        const result = await pt.getDocumentText(docId);

        if (result.text) {
            document.getElementById('docText').textContent = result.text;
            document.getElementById('docContent').classList.remove('hidden');
        } else {
            alert(result.message || 'No text available');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
</script>
```

## Create and Save Documents

Create documents in various formats:

```html
<div class="container mx-auto p-6 max-w-2xl">
    <h1 class="text-2xl font-bold mb-4">Create Document</h1>

    <div class="bg-white rounded-lg shadow p-6">
        <input
            type="text"
            id="filename"
            placeholder="Filename (e.g., report.txt)"
            class="border rounded px-3 py-2 w-full mb-3"
        >

        <select id="format" class="border rounded px-3 py-2 w-full mb-3">
            <option value="TXT">Plain Text (.txt)</option>
            <option value="MD">Markdown (.md)</option>
            <option value="HTML">HTML (.html)</option>
            <option value="PDF">PDF (use Markdown)</option>
            <option value="DOCX">Word (use Markdown)</option>
            <option value="CSV">CSV (.csv)</option>
        </select>

        <textarea
            id="content"
            rows="8"
            placeholder="Enter content..."
            class="border rounded px-3 py-2 w-full mb-3 font-mono text-sm"
        ></textarea>

        <button
            onclick="saveDoc()"
            class="bg-indigo-500 text-white px-4 py-2 rounded w-full hover:bg-indigo-600"
        >
            Save Document
        </button>
    </div>
</div>

<script>
const mimeTypes = {
    'TXT': 'text/plain',
    'MD': 'text/markdown',
    'HTML': 'text/html',
    'PDF': 'application/pdf',
    'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'CSV': 'text/csv'
};

async function saveDoc() {
    const filename = document.getElementById('filename').value.trim();
    const format = document.getElementById('format').value;
    const content = document.getElementById('content').value;

    if (!filename || !content) {
        alert('Please provide filename and content');
        return;
    }

    try {
        await pt.saveDocument(filename, format, mimeTypes[format], content);

        alert('Document saved successfully!');
        document.getElementById('filename').value = '';
        document.getElementById('content').value = '';
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
</script>
```

## AI-Powered Data Extraction

Combine file uploads with AI instructions to automatically extract and store data. This example uses `waitForMessageReceived` to get the AI response:

```html
<div class="container mx-auto p-6 max-w-2xl">
    <h1 class="text-2xl font-bold mb-4">AI Data Extractor</h1>

    <div class="bg-white rounded-lg shadow p-6">
        <select id="taskType" class="border rounded px-3 py-2 w-full mb-3">
            <option value="invoice">Extract Invoice Data</option>
            <option value="resume">Parse Resume</option>
            <option value="receipt">Process Expense Receipt</option>
        </select>

        <input
            type="file"
            id="fileUpload"
            multiple
            class="block w-full mb-3"
        >

        <button
            onclick="processWithAI()"
            id="processBtn"
            class="bg-purple-500 text-white px-4 py-2 rounded w-full hover:bg-purple-600"
        >
            Process with AI
        </button>
        
        <div id="status" class="mt-4 hidden">
            <div class="flex items-center gap-2 text-blue-600">
                <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span id="statusText">Processing...</span>
            </div>
        </div>
        
        <div id="result" class="mt-4 hidden bg-green-50 p-4 rounded">
            <h3 class="font-bold text-green-800 mb-2">AI Response:</h3>
            <pre id="resultText" class="text-sm whitespace-pre-wrap text-green-700"></pre>
        </div>
    </div>
</div>

<script>
const instructions = {
    invoice: `Extract invoice information and use the tool 'chatdb_add' to create database records:
- entity_name: "invoice"
- data: { invoice_number, date, vendor, amount, due_date }
Respond with JSON summary of what was extracted.`,

    resume: `Extract candidate information and use the tool 'chatdb_add' to create entries:
- entity_name: "candidate"
- data: { name, email, phone, skills: array, experience: number }
Respond with JSON summary of what was extracted.`,

    receipt: `Extract expense data and use the tool 'chatdb_add' to store each:
- entity_name: "expense"
- data: { date, merchant, amount, category }
Respond with JSON summary of what was extracted.`
};

async function processWithAI() {
    const task = document.getElementById('taskType').value;
    const input = document.getElementById('fileUpload');
    const btn = document.getElementById('processBtn');
    const status = document.getElementById('status');
    const result = document.getElementById('result');

    if (input.files.length === 0) {
        alert('Please select files');
        return;
    }

    // Show loading state
    btn.disabled = true;
    btn.textContent = 'Processing...';
    status.classList.remove('hidden');
    result.classList.add('hidden');

    const formData = new FormData();
    for (const file of input.files) {
        formData.append('files', file);
    }

    try {
        // Upload files with AI instructions
        const uploadResult = await pt.addMessage(formData, instructions[task]);
        
        document.getElementById('statusText').textContent = 'AI is analyzing files...';
        
        // Wait for AI response using waitForMessageReceived
        const response = await pt.waitForMessageReceived(uploadResult.task_id, {
            timeout: 120000  // 2 minutes for complex extraction
        });
        
        // Show result
        document.getElementById('resultText').textContent = response.message;
        result.classList.remove('hidden');
        status.classList.add('hidden');
        
        input.value = '';
    } catch (error) {
        if (error.message.includes('Timeout')) {
            alert('Processing is taking longer than expected. Check the chat for results.');
        } else {
            alert('Error: ' + error.message);
        }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Process with AI';
        status.classList.add('hidden');
    }
}
</script>
```

## Direct AI Commands

Send natural language commands to have AI manage the database:

```html
<div class="container mx-auto p-6 max-w-2xl">
    <h1 class="text-2xl font-bold mb-4">AI Assistant</h1>

    <div class="bg-white rounded-lg shadow p-6">
        <!-- Quick Actions -->
        <div class="grid grid-cols-2 gap-2 mb-4">
            <button
                onclick="aiCommand('competitors')"
                class="bg-blue-100 text-blue-800 px-3 py-2 rounded hover:bg-blue-200"
            >
                Research Competitors
            </button>
            <button
                onclick="aiCommand('analyze')"
                class="bg-green-100 text-green-800 px-3 py-2 rounded hover:bg-green-200"
            >
                Analyze Tasks
            </button>
        </div>

        <!-- Custom Command -->
        <textarea
            id="aiCommand"
            rows="4"
            placeholder="Enter AI command..."
            class="border rounded px-3 py-2 w-full mb-3"
        ></textarea>

        <button
            onclick="sendCommand()"
            class="bg-indigo-500 text-white px-4 py-2 rounded w-full hover:bg-indigo-600"
        >
            Execute
        </button>
    </div>
</div>

<script>
const commands = {
    competitors: `Search for top 3 AI assistant competitors and use the tool 'chatdb_add' to store:
- entity_name: "competitor"
- data: { name, website, key_features: array }`,

    analyze: `Use the tool 'chatdb_list' to find all pending tasks.
Use the tool 'chatdb_add' to create urgency report for each:
- entity_name: "urgent_task"
- data: { task_id, title, days_old, priority }`
};

async function aiCommand(type) {
    try {
        await pt.addMessage(commands[type]);
        alert('AI is processing your request...');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function sendCommand() {
    const command = document.getElementById('aiCommand').value.trim();

    if (!command) {
        alert('Please enter a command');
        return;
    }

    try {
        await pt.addMessage(command);
        alert('Command sent to AI assistant!');
        document.getElementById('aiCommand').value = '';
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
</script>
```

## Key Concepts Demonstrated

These examples cover:

1. **Basic CRUD Operations**: Create, read, update, and delete entities
2. **Filtering**: Using server-side filters to search data
3. **State Management**: Managing application state with entities
4. **User Interface**: Building interactive UIs with Tailwind CSS
5. **Event Handling**: Responding to user interactions
6. **Data Display**: Rendering lists and cards
7. **Form Handling**: Collecting and validating user input
8. **Chat Integration**: Sending messages to chat from Live Pages
9. **File Upload**: Uploading files with drag & drop support
10. **Push Notifications**: Send notifications to specific users
11. **Document Search**: Semantic search across documents and collections
12. **Document Management**: View and create documents in various formats
13. **AI-Powered Automation**: Let AI extract and store data automatically
14. **Natural Language Commands**: Control database with AI using plain language
15. **AI Response Handling**: Use `waitForMessageReceived` to get AI responses
16. **Document Processing**: Track document status with `waitForDocumentReady` (see [Document Events](primethink_js_document_events.md) for examples)

## Next Steps

Now that you've seen these basic examples, you can:

- **[Complete Examples](Live-Pages-Examples.md)** - See more complex, production-ready applications
- **[Data Management API Reference](Data-Management-API.md)** - Learn about all available methods
- **[Message Response Handling](primethink_js_message_received.md)** - Deep dive into AI response handling
- **[Document Events](primethink_js_document_events.md)** - Learn about document processing events
- **[Filtering and Querying](Filtering-and-Querying.md)** - Advanced filtering techniques
- **[Styling with Tailwind CSS](Styling-with-Tailwind.md)** - Improve your UI design
