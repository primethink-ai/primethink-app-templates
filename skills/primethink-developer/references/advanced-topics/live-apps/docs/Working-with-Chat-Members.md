# Working with Chat Members

## Overview

Live Pages can access information about all members in the current chat, including both human users and AI agents. This enables features like task assignment, creator tracking, and user-specific filtering.

## Getting Chat Members

Use `pt.getChatMembers()` to retrieve all chat members:

```javascript
const members = await pt.getChatMembers();
```

### Response Structure

Each member object has a clear, consistent structure:

```javascript
[
  {
    "id": 123,              // Member ID (user_id or agent_id)
    "type": "user",         // "user" or "agent"
    "name": "John Doe",     // Display name

    // User-specific fields (null for agents)
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

    // These are null for agents
    "first_name": null,
    "last_name": null,
    "email": null,

    "is_chat_owner": false,
    "is_logged_user": false  // Always false for agents
  }
]
```

### Field Reference

| Field      | Type    | User | Agent | Description                            |
|------------|---------|------|-------|----------------------------------------|
| id         | number  | ✓    | ✓     | Member ID                              |
| type       | string  | ✓    | ✓     | "user" or "agent"                      |
| name       | string  | ✓    | ✓     | Display name (full name or agent name) |
| first_name     | string? | ✓    | null  | First name                             |
| last_name      | string? | ✓    | null  | Last name                              |
| email          | string? | ✓    | null  | Email address                          |
| is_chat_owner  | boolean | ✓    | ✓     | Created the chat                       |
| is_logged_user | boolean | ✓    | ✓     | True when member is the current user making the request (always false for agents) |

## Common Use Cases

### 1. Display All Members

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
```

### 2. Create Member List UI

```javascript
async function renderMemberList() {
    const members = await pt.getChatMembers();

    const html = members.map(member => {
        const icon = member.type === 'user' ? '👤' : '🤖';
        const badge = member.is_chat_owner ? '<span class="owner-badge">Owner</span>' : '';
        const details = member.email ? `<small>${member.email}</small>` : '';

        return `
            <div class="member-card ${member.type}">
                ${icon} <strong>${member.name}</strong> ${badge}
                ${details}
            </div>
        `;
    }).join('');

    document.getElementById('memberList').innerHTML = html;
}
```

### 3. Get Current User

```javascript
// Identify the current user
const members = await pt.getChatMembers();
const currentUser = members.find(m => m.is_logged_user);

console.log(`Current user: ${currentUser.name}`);
console.log(`User ID: ${currentUser.id}`);
```

### 4. Create Assignment Dropdown

```javascript
async function createAssigneeDropdown() {
    const members = await pt.getChatMembers();
    const users = members.filter(m => m.type === 'user');

    const options = users
        .map(m => `<option value="${m.id}">${m.name}</option>`)
        .join('');

    return `
        <select id="assignee" class="px-3 py-2 border rounded">
            <option value="">Unassigned</option>
            ${options}
        </select>
    `;
}

// Usage
document.getElementById('assigneeContainer').innerHTML = await createAssigneeDropdown();
```

## Task Assignment Example

A complete example of task assignment with chat members:

```html
<div class="container mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">Team Tasks</h1>

    <!-- Filter by Assignee -->
    <div class="mb-4">
        <label class="block text-sm font-medium mb-1">Filter by Assignee:</label>
        <select id="assigneeFilter" onchange="filterTasks()" class="px-3 py-2 border rounded">
            <option value="">All Tasks</option>
            <option value="unassigned">Unassigned</option>
        </select>
    </div>

    <!-- Add New Task -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
        <input
            type="text"
            id="taskInput"
            placeholder="New task..."
            class="w-full px-3 py-2 border rounded mb-2"
        >
        <div class="flex gap-2">
            <select id="taskAssignee" class="flex-1 px-3 py-2 border rounded">
                <option value="">Unassigned</option>
            </select>
            <button onclick="addTask()" class="bg-blue-500 text-white px-4 py-2 rounded">
                Add Task
            </button>
        </div>
    </div>

    <!-- Task List -->
    <div id="tasksList"></div>
</div>

<script>
let allMembers = [];
let allTasks = [];

// Initialize
async function init() {
    // Load members first
    allMembers = await pt.getChatMembers();

    // Populate dropdowns
    populateAssigneeDropdowns();

    // Load tasks
    await loadTasks();
}

function populateAssigneeDropdowns() {
    const users = allMembers.filter(m => m.type === 'user');

    const options = users
        .map(m => `<option value="${m.id}">${m.name}</option>`)
        .join('');

    // Populate filter dropdown
    const filterSelect = document.getElementById('assigneeFilter');
    const existingOptions = filterSelect.innerHTML;
    filterSelect.innerHTML = existingOptions + options;

    // Populate assignment dropdown
    document.getElementById('taskAssignee').innerHTML =
        '<option value="">Unassigned</option>' + options;
}

async function loadTasks() {
    const entities = await pt.list({
        entityNames: ['task'],
        filters: { completed: false }
    });

    allTasks = entities.filter(e => e.entity_name === 'task');
    displayTasks(allTasks);
}

async function filterTasks() {
    const assigneeId = document.getElementById('assigneeFilter').value;

    if (assigneeId === '') {
        // Show all tasks
        displayTasks(allTasks);
    } else if (assigneeId === 'unassigned') {
        // Show unassigned tasks
        const filtered = allTasks.filter(task => !task.data.assignee_id);
        displayTasks(filtered);
    } else {
        // Show tasks for specific user
        const filtered = allTasks.filter(task =>
            task.data.assignee_id === parseInt(assigneeId)
        );
        displayTasks(filtered);
    }
}

function displayTasks(tasks) {
    const html = tasks.map(task => {
        const assignee = allMembers.find(m => m.id === task.data.assignee_id);
        const assigneeName = assignee ? assignee.name : 'Unassigned';

        const creator = allMembers.find(m => m.id === task.creator_user_id);
        const creatorName = creator ? creator.name : 'Unknown';

        return `
            <div class="bg-white rounded-lg shadow p-4 mb-2">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-medium">${task.data.text}</p>
                        <p class="text-sm text-gray-600">
                            Assigned to: ${assigneeName}
                        </p>
                        <p class="text-xs text-gray-400">
                            Created by: ${creatorName}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <button
                            onclick="reassignTask(${task.id})"
                            class="text-blue-500 text-sm"
                        >
                            Reassign
                        </button>
                        <button
                            onclick="deleteTask(${task.id})"
                            class="text-red-500 text-sm"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('tasksList').innerHTML = html ||
        '<p class="text-gray-500 text-center">No tasks found</p>';
}

async function addTask() {
    const text = document.getElementById('taskInput').value.trim();
    const assigneeId = document.getElementById('taskAssignee').value;

    if (!text) return;

    await pt.add('task', {
        text: text,
        completed: false,
        assignee_id: assigneeId ? parseInt(assigneeId) : null
    });

    document.getElementById('taskInput').value = '';
    await loadTasks();
}

async function reassignTask(taskId) {
    const task = await pt.get(taskId);
    const newAssigneeId = prompt('Enter new assignee ID (or leave empty for unassigned):');

    await pt.edit(taskId, {
        ...task.data,
        assignee_id: newAssigneeId ? parseInt(newAssigneeId) : null
    });

    await loadTasks();
}

async function deleteTask(taskId) {
    if (confirm('Delete this task?')) {
        await pt.delete(taskId);
        await loadTasks();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
</script>
```

## Filtering by Creator

Every entity has a `creator_user_id` field that tracks who created it. Combined with `getChatMembers()`, this lets you filter entities to the current user:

```javascript
// Get tasks created by current user
const members = await pt.getChatMembers();
const currentUser = members.find(m => m.is_logged_user);

const myTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        creator_user_id: currentUser.id
    }
});
```

For the full set of creator-filter patterns (`$in` across multiple users, `$ne` to exclude yourself, combining with data filters), see [Filtering by Creator in Filtering and Querying](Filtering-and-Querying.md#10-filtering-by-creator).

### "My Tasks" Toggle

```javascript
let allMembers = [];
let currentUser = null;
let showOnlyMyTasks = false;

async function init() {
    allMembers = await pt.getChatMembers();
    currentUser = allMembers.find(m => m.is_logged_user);
    await loadTasks();
}

async function loadTasks() {
    const filters = { completed: false };

    if (showOnlyMyTasks && currentUser) {
        filters.creator_user_id = currentUser.id;
    }

    const entities = await pt.list({
        entityNames: ['task'],
        filters: filters
    });

    displayTasks(entities.filter(e => e.entity_name === 'task'));
}

function toggleMyTasks() {
    showOnlyMyTasks = !showOnlyMyTasks;
    loadTasks();
}
```

## Per-User Settings Example

Store personal preferences using `creator_user_id`:

```javascript
// Save user-specific settings
async function saveUserSettings(settings) {
    const members = await pt.getChatMembers();
    const currentUser = members.find(m => m.is_logged_user);

    // Check if user already has settings
    const existing = await pt.list({
        entityNames: ['user_settings'],
        filters: { creator_user_id: currentUser.id }
    });

    if (existing.length > 0) {
        // Update existing settings
        await pt.edit(existing[0].id, settings);
    } else {
        // Create new settings (creator_user_id is set automatically)
        await pt.add('user_settings', settings);
    }
}

// Load user-specific settings
async function loadUserSettings() {
    const members = await pt.getChatMembers();
    const currentUser = members.find(m => m.is_logged_user);

    const settings = await pt.list({
        entityNames: ['user_settings'],
        filters: { creator_user_id: currentUser.id }
    });

    return settings.length > 0 ? settings[0].data : getDefaultSettings();
}

function getDefaultSettings() {
    return {
        theme: 'light',
        pageSize: 20,
        defaultView: 'list'
    };
}
```

## Best Practices

### 1. Cache Members at Initialization

```javascript
// ✅ GOOD: Load once at app start
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

### 2. Handle Missing Members Gracefully

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

### 3. Separate Users and Agents

```javascript
// Get only human users for assignment
const users = allMembers.filter(m => m.type === 'user');

// Get only agents
const agents = allMembers.filter(m => m.type === 'agent');

// Display differently
function renderMemberBadge(member) {
    if (member.type === 'user') {
        return `
            <div class="user-badge">
                👤 ${member.name}
                ${member.email ? `<small>${member.email}</small>` : ''}
            </div>
        `;
    } else {
        return `
            <div class="agent-badge">
                🤖 ${member.name}
            </div>
        `;
    }
}
```

### 4. Use Meaningful Variable Names

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

## Advanced Patterns

### Team Dashboard

```javascript
async function createTeamDashboard() {
    const members = await pt.getChatMembers();
    const users = members.filter(m => m.type === 'user');

    // Get all tasks
    const allTasks = await pt.list({
        entityNames: ['task'],
        filters: { completed: false }
    });

    // Calculate stats per user
    const stats = users.map(user => {
        const userTasks = allTasks.filter(t => t.data.assignee_id === user.id);
        const createdTasks = allTasks.filter(t => t.creator_user_id === user.id);

        return {
            user: user,
            assigned: userTasks.length,
            created: createdTasks.length,
            highPriority: userTasks.filter(t => t.data.priority === 'high').length
        };
    });

    // Display dashboard
    displayTeamStats(stats);
}

function displayTeamStats(stats) {
    const html = stats.map(stat => `
        <div class="bg-white rounded-lg shadow p-4">
            <h3 class="font-bold">${stat.user.name}</h3>
            <p>Assigned: ${stat.assigned}</p>
            <p>Created: ${stat.created}</p>
            <p>High Priority: ${stat.highPriority}</p>
        </div>
    `).join('');

    document.getElementById('teamStats').innerHTML = html;
}
```

### User Activity Log

```javascript
async function getUserActivity(userId) {
    // Get all entities created by user
    const created = await pt.list({
        entityNames: ['task', 'note', 'event'],
        filters: { creator_user_id: userId },
        limit: 100
    });

    // Get member info
    const members = await pt.getChatMembers();
    const user = members.find(m => m.id === userId);

    return {
        user: user,
        activities: created.map(entity => ({
            type: entity.entity_name,
            created: entity.created_at,
            data: entity.data
        }))
    };
}
```

## Next Steps

- **[Data Management API Reference](Data-Management-API.md)** - Learn about all pt API methods
- **[Filtering and Querying](Filtering-and-Querying.md)** - Filter entities by creator and other fields
- **[Complete Examples](Live-Pages-Examples.md)** - See member integration in full apps
- **[Performance and Best Practices](Live-Pages-Best-Practices.md)** - Optimize your Live Pages
