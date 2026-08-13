# Complete Live Pages Examples

## Overview

This page contains complete, production-ready examples demonstrating various Live Pages features and patterns.

## Advanced Todo Application

This comprehensive example demonstrates:
- Multiple entity types (`task` and `filter_config`)
- Per-user filter preferences using `creator_user_id`
- Server-side filtering and pagination
- Chat member integration
- Task assignment with default assignee
- Inline task editing
- Enhanced UX features

### Key Features

- **Multiple Entity Types**: Uses both `task` entities (shared tasks) and `filter_config` entities (personal settings)
- **Per-User Configuration**: Each user has their own filter preferences automatically saved
- **Task Assignment**: New tasks are assigned to current user by default, with dropdown to change assignee
- **Inline Editing**: Click on any task to edit its details (text, priority, due date, assignee)
- **Creator Tracking**: Shows who created each task using the `creator_user_id` field
- **Member Integration**: Displays creator names and assignees from chat members
- **Server-Side Pagination**: Efficient loading with page-based pagination

### Complete Implementation {#advanced-todo-implementation}

```html
<div class="container mx-auto p-6 max-w-4xl">
    <h1 class="text-3xl font-bold text-gray-800 mb-8">Advanced Todo List</h1>

    <!-- Search and Filter Controls -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <!-- Text Search with partial matching -->
            <input
                type="text"
                id="searchInput"
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search tasks (partial match)..."
            >

            <!-- Priority Filter (Multi-select) -->
            <div class="relative">
                <button
                    id="priorityDropdown"
                    onclick="togglePriorityDropdown()"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-left bg-white"
                >
                    <span id="priorityLabel">All Priorities</span>
                    <svg class="float-right mt-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <div id="priorityOptions" class="hidden absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    <label class="flex items-center px-3 py-2 hover:bg-gray-50">
                        <input type="checkbox" value="high" onchange="updatePriorityFilter()" class="mr-2"> High
                    </label>
                    <label class="flex items-center px-3 py-2 hover:bg-gray-50">
                        <input type="checkbox" value="medium" onchange="updatePriorityFilter()" class="mr-2"> Medium
                    </label>
                    <label class="flex items-center px-3 py-2 hover:bg-gray-50">
                        <input type="checkbox" value="low" onchange="updatePriorityFilter()" class="mr-2"> Low
                    </label>
                </div>
            </div>

            <!-- Status Filter with default to hide completed -->
            <select id="statusFilter" class="px-3 py-2 border border-gray-300 rounded-md">
                <option value="pending" selected>Pending Only</option>
                <option value="all">All Tasks</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
            </select>
        </div>

        <!-- Quick Filter Buttons & Bulk Actions -->
        <div class="flex flex-wrap justify-between items-center gap-2">
            <div class="flex flex-wrap gap-2">
                <button onclick="quickFilter('urgent')" class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                    Urgent Tasks
                </button>
                <button onclick="quickFilter('today')" class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    Due Today
                </button>
                <button onclick="clearFilters()" class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                    Clear Filters
                </button>
            </div>

            <button
                onclick="clearCompletedTasks()"
                class="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600"
            >
                Clear Completed Tasks
            </button>
        </div>
    </div>

    <!-- Add New Task (with assignment dropdown) -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="grid grid-cols-1 gap-3">
            <input
                type="text"
                id="taskInput"
                class="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter new task..."
            >
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select id="assigneeInput" class="px-3 py-2 border border-gray-300 rounded-md">
                    <!-- Populated dynamically -->
                </select>
                <select id="priorityInput" class="px-3 py-2 border border-gray-300 rounded-md">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
                <input type="date" id="dueDateInput" class="px-3 py-2 border border-gray-300 rounded-md">
                <button onclick="addTask()" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Add Task
                </button>
            </div>
        </div>
    </div>

    <!-- Edit Task Modal -->
    <div id="editModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
            <h2 class="text-xl font-bold mb-4">Edit Task</h2>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Task Description</label>
                    <input
                        type="text"
                        id="editTaskText"
                        class="w-full px-3 py-2 border rounded-md"
                    >
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Assigned To</label>
                        <select id="editAssigneeInput" class="w-full px-3 py-2 border rounded-md">
                            <!-- Populated dynamically -->
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Priority</label>
                        <select id="editPriorityInput" class="w-full px-3 py-2 border rounded-md">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Due Date</label>
                        <input type="date" id="editDueDateInput" class="w-full px-3 py-2 border rounded-md">
                    </div>
                </div>
            </div>
            <div class="flex justify-end gap-2 mt-6">
                <button
                    onclick="closeEditModal()"
                    class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                    Cancel
                </button>
                <button
                    onclick="saveTaskEdit()"
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Save Changes
                </button>
            </div>
        </div>
    </div>

    <!-- Tasks List -->
    <div id="tasksList" class="space-y-4">
        <!-- Tasks will be displayed here -->
    </div>

    <!-- Pagination Controls -->
    <div id="paginationControls" class="mt-6 flex justify-center items-center gap-4 bg-white rounded-lg shadow-md p-4">
        <button
            id="firstPageBtn"
            onclick="goToFirstPage()"
            class="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            First
        </button>
        <button
            id="prevPageBtn"
            onclick="goToPreviousPage()"
            class="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            Previous
        </button>
        <span id="pageInfo" class="text-gray-700 font-medium">
            Page 1
        </span>
        <button
            id="nextPageBtn"
            onclick="goToNextPage()"
            class="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            Next
        </button>
    </div>
</div>

<script>
let allMembers = [];
let currentUserId = null;
let selectedPriorities = [];
let searchTimeout;
let currentPage = 1;
let pageSize = 20;
let hasMorePages = false;
let editingTaskId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Load chat members first
    allMembers = await pt.getChatMembers();

    // Identify current user using is_logged_user
    const currentUser = allMembers.find(m => m.is_logged_user);
    currentUserId = currentUser?.id;

    // Populate assignee dropdowns
    populateAssigneeDropdowns();

    // Load user's saved filter configuration
    await loadFilterConfig();

    // Apply filters and load tasks
    await applyFilters();
    setupEventListeners();
});

// Populate assignee dropdowns with chat members
function populateAssigneeDropdowns() {
    const users = allMembers.filter(m => m.type === 'user');

    const options = users.map(user => {
        const selected = user.id === currentUserId ? 'selected' : '';
        return `<option value="${user.id}" ${selected}>${user.name}</option>`;
    }).join('');

    // Populate new task dropdown (current user selected by default)
    document.getElementById('assigneeInput').innerHTML = options;

    // Populate edit modal dropdown
    document.getElementById('editAssigneeInput').innerHTML = options;
}

// Load user's saved filter preferences from filter_config entity
async function loadFilterConfig() {
    if (!currentUserId) return;

    try {
        const configs = await pt.list({
            entityNames: ['filter_config'],
            filters: { creator_user_id: currentUserId }
        });

        if (configs.length > 0) {
            const config = configs[0].data;

            if (config.searchTerm) {
                document.getElementById('searchInput').value = config.searchTerm;
            }

            if (config.statusFilter) {
                document.getElementById('statusFilter').value = config.statusFilter;
            }

            if (config.selectedPriorities && Array.isArray(config.selectedPriorities)) {
                selectedPriorities = config.selectedPriorities;
                const checkboxes = document.querySelectorAll('#priorityOptions input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.checked = selectedPriorities.includes(cb.value);
                });
                updatePriorityLabel();
            }

            if (config.pageSize) {
                pageSize = config.pageSize;
            }
        }
    } catch (error) {
        console.error('Error loading filter config:', error);
    }
}

// Save current filter preferences to filter_config entity
async function saveFilterConfig() {
    if (!currentUserId) return;

    try {
        const searchTerm = document.getElementById('searchInput').value.trim();
        const statusFilter = document.getElementById('statusFilter').value;

        const configs = await pt.list({
            entityNames: ['filter_config'],
            filters: { creator_user_id: currentUserId }
        });

        const configData = {
            searchTerm: searchTerm,
            statusFilter: statusFilter,
            selectedPriorities: selectedPriorities,
            pageSize: pageSize
        };

        if (configs.length > 0) {
            await pt.edit(configs[0].id, configData);
        } else {
            await pt.add('filter_config', configData);
        }
    } catch (error) {
        console.error('Error saving filter config:', error);
    }
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => applyFilters(), 300);
    });

    const statusFilter = document.getElementById('statusFilter');
    statusFilter.addEventListener('change', () => applyFilters());

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('priorityOptions');
        const button = document.getElementById('priorityDropdown');
        if (!dropdown.contains(e.target) && !button.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

function togglePriorityDropdown() {
    document.getElementById('priorityOptions').classList.toggle('hidden');
}

function updatePriorityLabel() {
    const label = document.getElementById('priorityLabel');
    if (selectedPriorities.length === 0 || selectedPriorities.length === 3) {
        label.textContent = 'All Priorities';
    } else {
        label.textContent = selectedPriorities.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
    }
}

function updatePriorityFilter() {
    const checkboxes = document.querySelectorAll('#priorityOptions input[type="checkbox"]');
    selectedPriorities = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    updatePriorityLabel();
    applyFilters();
}

async function applyFilters(resetPage = true) {
    if (resetPage) {
        currentPage = 1;
    }

    const searchTerm = document.getElementById('searchInput').value.trim();
    const statusFilter = document.getElementById('statusFilter').value;

    await saveFilterConfig();

    let serverFilters = {};

    if (searchTerm) {
        serverFilters.text = { $contains: searchTerm };
    }

    if (selectedPriorities.length > 0 && selectedPriorities.length < 3) {
        serverFilters.priority = { $in: selectedPriorities };
    }

    if (statusFilter === 'pending') {
        serverFilters.completed = { $ne: true };
    } else if (statusFilter === 'completed') {
        serverFilters.completed = true;
    }

    if (quickDueDate) {
        serverFilters.due_date = quickDueDate;
    }

    try {
        const result = await pt.list({
            entityNames: ['task'],
            filters: serverFilters,
            page: currentPage,
            pageSize: pageSize,
            returnMetadata: true
        });

        let filteredTasks = result.entities.filter(entity => entity.entity_name === 'task');

        if (statusFilter === 'overdue') {
            const today = new Date().toISOString().split('T')[0];
            filteredTasks = filteredTasks.filter(task =>
                task.data.due_date &&
                task.data.due_date < today &&
                task.data.completed !== true
            );
        }

        hasMorePages = result.pagination.has_more;
        updatePaginationControls();

        displayTasks(filteredTasks);
    } catch (error) {
        console.error('Error filtering tasks:', error);
    }
}

function updatePaginationControls() {
    document.getElementById('pageInfo').textContent = `Page ${currentPage}`;
    document.getElementById('firstPageBtn').disabled = currentPage === 1;
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = !hasMorePages;
}

async function goToFirstPage() {
    currentPage = 1;
    await applyFilters(false);
}

async function goToPreviousPage() {
    if (currentPage > 1) {
        currentPage--;
        await applyFilters(false);
    }
}

async function goToNextPage() {
    if (hasMorePages) {
        currentPage++;
        await applyFilters(false);
    }
}

function displayTasks(tasks) {
    const tasksList = document.getElementById('tasksList');

    if (tasks.length === 0) {
        tasksList.innerHTML = '<div class="text-center py-8 text-gray-500">No tasks found</div>';
        return;
    }

    tasksList.innerHTML = tasks.map(task => {
        const taskData = task.data;
        const isCompleted = taskData.completed === true;
        const today = new Date().toISOString().split('T')[0];
        const isOverdue = taskData.due_date && taskData.due_date < today && !isCompleted;

        const creator = allMembers.find(m => m.id === task.creator_user_id);
        const creatorName = creator ? creator.name : 'Unknown';

        const assignee = allMembers.find(m => m.id === taskData.assignee_id);
        const assigneeName = assignee ? assignee.name : 'Unassigned';

        let dueDateDisplay = '';
        if (taskData.due_date) {
            const formattedDate = formatDate(taskData.due_date);
            dueDateDisplay = isOverdue ? `Due: ${formattedDate} (Overdue)` : `Due: ${formattedDate}`;
        }

        return `
            <div class="bg-white rounded-lg shadow-md p-4 ${isCompleted ? 'opacity-75' : ''} cursor-pointer hover:shadow-lg transition-shadow">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3 flex-1" onclick="openEditModal(${task.id})">
                        <input
                            type="checkbox"
                            ${isCompleted ? 'checked' : ''}
                            onchange="toggleTask(${task.id})"
                            onclick="event.stopPropagation()"
                            class="h-4 w-4 text-blue-600"
                        >
                        <span class="${isCompleted ? 'line-through text-gray-500' : 'text-gray-800'} flex-1">
                            ${escapeHtml(taskData.text)}
                        </span>
                        <span class="px-2 py-1 text-xs rounded-full ${getPriorityColor(taskData.priority)}">
                            ${taskData.priority}
                        </span>
                        ${dueDateDisplay ? `<span class="text-sm ${isOverdue ? 'text-red-500' : 'text-gray-500'}">${dueDateDisplay}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-3 ml-3">
                        <div class="text-xs text-gray-500">
                            <div>Assigned: <span class="font-medium">${escapeHtml(assigneeName)}</span></div>
                            <div class="text-gray-400 italic">By: ${escapeHtml(creatorName)}</div>
                        </div>
                        <button
                            onclick="deleteTask(${task.id}); event.stopPropagation()"
                            class="text-red-500 hover:text-red-700"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Open edit modal with task data
async function openEditModal(taskId) {
    editingTaskId = taskId;
    const task = await pt.get(taskId);

    document.getElementById('editTaskText').value = task.data.text || '';
    document.getElementById('editAssigneeInput').value = task.data.assignee_id || '';
    document.getElementById('editPriorityInput').value = task.data.priority || 'low';
    document.getElementById('editDueDateInput').value = task.data.due_date || '';

    document.getElementById('editModal').classList.remove('hidden');
}

// Close edit modal
function closeEditModal() {
    editingTaskId = null;
    document.getElementById('editModal').classList.add('hidden');
}

// Save edited task
async function saveTaskEdit() {
    if (!editingTaskId) return;

    try {
        const task = await pt.get(editingTaskId);

        const updatedData = {
            ...task.data,
            text: document.getElementById('editTaskText').value.trim(),
            assignee_id: parseInt(document.getElementById('editAssigneeInput').value),
            priority: document.getElementById('editPriorityInput').value,
            due_date: document.getElementById('editDueDateInput').value || null
        };

        await pt.edit(editingTaskId, updatedData);
        closeEditModal();
        await applyFilters(false);
    } catch (error) {
        console.error('Error saving task:', error);
        alert('Failed to save changes');
    }
}

let quickDueDate = null;

function quickFilter(type) {
    if (type === 'urgent') {
        document.getElementById('searchInput').value = 'urgent';
    } else if (type === 'today') {
        quickDueDate = new Date().toISOString().split('T')[0];
    }
    applyFilters();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = 'pending';
    selectedPriorities = [];
    quickDueDate = null;

    const checkboxes = document.querySelectorAll('#priorityOptions input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);

    document.getElementById('priorityLabel').textContent = 'All Priorities';

    applyFilters();
}

async function clearCompletedTasks() {
    const completedEntities = await pt.list({
        entityNames: ['task'],
        filters: { completed: true },
        limit: 1000
    });

    const completedTasks = completedEntities.filter(entity => entity.entity_name === 'task');

    if (completedTasks.length === 0) {
        alert('No completed tasks to clear.');
        return;
    }

    const confirmMessage = `Delete ${completedTasks.length} completed task${completedTasks.length > 1 ? 's' : ''}? This cannot be undone.`;

    if (confirm(confirmMessage)) {
        const deletePromises = completedTasks.map(task => pt.delete(task.id));
        await Promise.all(deletePromises);
        await applyFilters();
        alert(`Deleted ${completedTasks.length} completed task${completedTasks.length > 1 ? 's' : ''}.`);
    }
}

async function addTask() {
    const text = document.getElementById('taskInput').value.trim();
    const assigneeId = document.getElementById('assigneeInput').value;
    const priority = document.getElementById('priorityInput').value;
    const dueDate = document.getElementById('dueDateInput').value;

    if (!text) return;

    try {
        await pt.add('task', {
            text: text,
            completed: false,
            assignee_id: parseInt(assigneeId),
            priority: priority,
            due_date: dueDate || null
        });

        // Only clear task text - preserve other fields for easier batch entry
        document.getElementById('taskInput').value = '';
        await applyFilters();
    } catch (error) {
        console.error('Error adding task:', error);
    }
}

async function toggleTask(taskId) {
    try {
        const task = await pt.get(taskId);
        await pt.edit(taskId, {
            ...task.data,
            completed: !task.data.completed
        });
        await applyFilters();
    } catch (error) {
        console.error('Error toggling task:', error);
    }
}

async function deleteTask(taskId) {
    if (confirm('Delete this task? This cannot be undone.')) {
        try {
            await pt.delete(taskId);
            await applyFilters();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === new Date(today.getTime() + 86400000).toDateString()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString();
    }
}

function getPriorityColor(priority) {
    const colors = {
        high: 'bg-red-100 text-red-800',
        medium: 'bg-yellow-100 text-yellow-800',
        low: 'bg-green-100 text-green-800'
    };
    return colors[priority] || colors.low;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
</script>
```

### Key UX Improvements

1. **Efficient Batch Entry**: Only the description field is cleared after adding a task
2. **Smart Date Display**: Tasks due today show "Due: Today" without confusing suffixes
3. **Multi-Select Priority Filter**: Select multiple priorities with efficient server-side filtering
4. **Default Pending Filter**: Interface defaults to showing only pending tasks
5. **Bulk Operations**: Clear all completed tasks at once with confirmation
6. **Performance Optimization**: Server-side filtering for text search, status, and priorities
7. **Server-Side Pagination**: Loads only 20 tasks per page for faster performance

## Simple Todo Application

A minimal todo app for quick implementation:

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
            class="bg-blue-500 text-white px-4 py-2 rounded"
        >
            Add
        </button>
    </div>

    <div id="tasksList"></div>
</div>

<script>
async function loadTasks() {
    const entities = await pt.list({
        entityNames: ['task'],
        filters: { completed: false }
    });

    const tasks = entities.filter(e => e.entity_name === 'task');

    document.getElementById('tasksList').innerHTML = tasks.map(task => `
        <div class="bg-white p-4 rounded shadow mb-2 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <input
                    type="checkbox"
                    onchange="toggleTask(${task.id})"
                    class="h-4 w-4"
                >
                <span>${task.data.text}</span>
            </div>
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

## Note-Taking Application

A simple note-taking app:

```html
<div class="container mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">My Notes</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Notes List -->
        <div class="md:col-span-1">
            <button onclick="createNewNote()" class="w-full bg-blue-500 text-white px-4 py-2 rounded mb-4">
                New Note
            </button>
            <div id="notesList" class="space-y-2"></div>
        </div>

        <!-- Note Editor -->
        <div class="md:col-span-2">
            <div id="noteEditor" class="bg-white rounded-lg shadow p-6">
                <input
                    type="text"
                    id="noteTitle"
                    placeholder="Note title..."
                    class="w-full text-xl font-bold mb-4 px-3 py-2 border rounded"
                >
                <textarea
                    id="noteContent"
                    rows="20"
                    placeholder="Start typing..."
                    class="w-full px-3 py-2 border rounded"
                ></textarea>
                <div class="flex gap-2 mt-4">
                    <button onclick="saveNote()" class="bg-green-500 text-white px-4 py-2 rounded">
                        Save
                    </button>
                    <button onclick="deleteCurrentNote()" class="bg-red-500 text-white px-4 py-2 rounded">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
let currentNoteId = null;

async function loadNotes() {
    const entities = await pt.list({
        entityNames: ['note'],
        limit: 100
    });

    const notes = entities.filter(e => e.entity_name === 'note');

    document.getElementById('notesList').innerHTML = notes.map(note => `
        <div
            onclick="selectNote(${note.id})"
            class="bg-white p-3 rounded shadow cursor-pointer hover:bg-gray-50 ${currentNoteId === note.id ? 'border-2 border-blue-500' : ''}"
        >
            <div class="font-semibold">${note.data.title || 'Untitled'}</div>
            <div class="text-xs text-gray-500">${new Date(note.updated_at).toLocaleDateString()}</div>
        </div>
    `).join('');
}

async function selectNote(noteId) {
    const note = await pt.get(noteId);
    currentNoteId = noteId;

    document.getElementById('noteTitle').value = note.data.title || '';
    document.getElementById('noteContent').value = note.data.content || '';

    await loadNotes();
}

async function createNewNote() {
    const result = await pt.add('note', {
        title: 'New Note',
        content: ''
    });

    currentNoteId = result.id;
    await loadNotes();
    await selectNote(result.id);
}

async function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value;

    if (!currentNoteId) {
        // No note selected: create one from the typed title/content
        const result = await pt.add('note', {
            title: title || 'New Note',
            content: content
        });
        currentNoteId = result.id;
        await loadNotes();
        await selectNote(result.id);
        return;
    }

    const note = await pt.get(currentNoteId);
    await pt.edit(currentNoteId, {
        ...note.data,
        title: title,
        content: content
    });

    await loadNotes();
}

async function deleteCurrentNote() {
    if (!currentNoteId) return;

    if (confirm('Delete this note?')) {
        await pt.delete(currentNoteId);
        currentNoteId = null;
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        await loadNotes();
    }
}

document.addEventListener('DOMContentLoaded', loadNotes);

// Auto-save every 30 seconds
setInterval(() => {
    if (currentNoteId) {
        saveNote();
    }
}, 30000);
</script>
```

## Contact Management

A simple CRM for managing contacts:

```html
<div class="container mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">Contacts</h1>

    <!-- Add Contact Form -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">Add Contact</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" id="contactName" placeholder="Name" class="px-3 py-2 border rounded">
            <input type="email" id="contactEmail" placeholder="Email" class="px-3 py-2 border rounded">
            <input type="tel" id="contactPhone" placeholder="Phone" class="px-3 py-2 border rounded">
            <input type="text" id="contactCompany" placeholder="Company" class="px-3 py-2 border rounded">
        </div>
        <button onclick="addContact()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
            Add Contact
        </button>
    </div>

    <!-- Search -->
    <input
        type="text"
        id="searchInput"
        placeholder="Search contacts..."
        class="w-full px-3 py-2 border rounded mb-4"
    >

    <!-- Contacts Grid -->
    <div id="contactsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
</div>

<script>
let searchTimeout;

async function loadContacts() {
    const searchTerm = document.getElementById('searchInput').value.trim();

    const filters = searchTerm ? {
        $or: [
            { name: { $contains: searchTerm } },
            { email: { $contains: searchTerm } },
            { company: { $contains: searchTerm } }
        ]
    } : {};

    const entities = await pt.list({
        entityNames: ['contact'],
        filters: filters,
        limit: 100
    });

    const contacts = entities.filter(e => e.entity_name === 'contact');

    document.getElementById('contactsGrid').innerHTML = contacts.map(contact => `
        <div class="bg-white rounded-lg shadow p-4">
            <h3 class="font-semibold text-lg">${contact.data.name}</h3>
            <p class="text-sm text-gray-600">${contact.data.email || ''}</p>
            <p class="text-sm text-gray-600">${contact.data.phone || ''}</p>
            <p class="text-sm text-gray-500">${contact.data.company || ''}</p>
            <button onclick="deleteContact(${contact.id})" class="mt-2 text-red-500 text-sm">
                Delete
            </button>
        </div>
    `).join('');
}

async function addContact() {
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const company = document.getElementById('contactCompany').value.trim();

    if (!name) return;

    await pt.add('contact', {
        name: name,
        email: email,
        phone: phone,
        company: company
    });

    document.getElementById('contactName').value = '';
    document.getElementById('contactEmail').value = '';
    document.getElementById('contactPhone').value = '';
    document.getElementById('contactCompany').value = '';

    await loadContacts();
}

async function deleteContact(contactId) {
    if (confirm('Delete this contact?')) {
        await pt.delete(contactId);
        await loadContacts();
    }
}

document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadContacts, 300);
});

document.addEventListener('DOMContentLoaded', loadContacts);
</script>
```

## Chat Integration - Messages and File Upload

This example demonstrates how to send messages to the chat and upload files from your Live Page.

### Features {#chat-integration-features}

- Send text messages to the chat from your Live Page
- Upload files with optional messages
- Drag and drop file upload support
- File preview and validation
- Status notifications

### Complete Implementation {#chat-integration-implementation}

```html
<div class="container mx-auto p-6 max-w-4xl">
    <h1 class="text-3xl font-bold text-gray-800 mb-8">Chat Integration Demo</h1>

    <!-- Send Message Section -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Send Message to Chat</h2>

        <div class="flex gap-2 mb-4">
            <input
                type="text"
                id="chatInput"
                placeholder="Type a message..."
                class="flex-1 border rounded px-3 py-2"
                onkeypress="if(event.key==='Enter') sendChatMessage()"
            >
            <button
                onclick="sendChatMessage()"
                class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
                Send
            </button>
        </div>

        <!-- Quick Message Buttons -->
        <div class="flex flex-wrap gap-2">
            <button
                onclick="pt.addMessage('Task completed!')"
                class="bg-green-100 text-green-800 px-3 py-1 rounded text-sm hover:bg-green-200"
            >
                Quick: Task Completed
            </button>
            <button
                onclick="pt.addMessage('Need assistance with this task')"
                class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm hover:bg-yellow-200"
            >
                Quick: Need Help
            </button>
            <button
                onclick="pt.addMessage('Review requested')"
                class="bg-purple-100 text-purple-800 px-3 py-1 rounded text-sm hover:bg-purple-200"
            >
                Quick: Review Requested
            </button>
        </div>
    </div>

    <!-- File Upload Section -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Upload Files to Chat</h2>

        <!-- Standard Form Upload -->
        <form id="uploadForm" onsubmit="handleUpload(event)" class="mb-6">
            <div class="mb-4">
                <label class="block text-sm font-medium mb-2">Select Files</label>
                <input
                    type="file"
                    name="files"
                    multiple
                    class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    onchange="previewFiles(this)"
                >
            </div>

            <div class="mb-4">
                <label class="block text-sm font-medium mb-2">Message (optional)</label>
                <input
                    type="text"
                    name="message"
                    placeholder="Add a message with your files..."
                    class="border rounded px-3 py-2 w-full"
                >
            </div>

            <div id="filePreview" class="mb-4"></div>

            <button
                type="submit"
                class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
                Upload Files
            </button>
        </form>

        <!-- Drag and Drop Zone -->
        <div
            id="dropZone"
            ondrop="handleDrop(event)"
            ondragover="handleDragOver(event)"
            ondragleave="handleDragLeave(event)"
            class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors"
        >
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <p class="text-gray-600 font-medium mb-1">Drop files here to upload</p>
            <p class="text-gray-400 text-sm">or use the file selector above</p>
        </div>
    </div>

    <!-- Status Messages -->
    <div id="statusMessage" class="hidden rounded-lg p-4 mb-4"></div>

    <!-- Recent Actions Log -->
    <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4">Recent Actions</h2>
        <div id="actionsLog" class="space-y-2 max-h-64 overflow-y-auto"></div>
    </div>
</div>

<script>
const actionsLog = [];

// Send message from input
async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) {
        showStatus('Please enter a message', 'error');
        return;
    }

    try {
        const result = await pt.addMessage(message);
        input.value = '';
        showStatus('Message sent successfully!', 'success');
        logAction('Message sent', message);
    } catch (error) {
        showStatus('Failed to send message: ' + error.message, 'error');
        console.error('Error:', error);
    }
}

// Handle form upload
async function handleUpload(event) {
    event.preventDefault();
    const form = event.target;
    const fileInput = form.querySelector('input[type="file"]');
    const messageInput = form.querySelector('input[name="message"]');
    const message = messageInput?.value.trim() || 'Uploaded files from Live Page';

    if (fileInput.files.length === 0) {
        showStatus('Please select at least one file', 'error');
        return;
    }

    const formData = new FormData();
    for (const file of fileInput.files) {
        formData.append('files', file);
    }

    try {
        const result = await pt.addMessage(formData, message);
        showStatus(`Successfully uploaded ${result.files_count} file(s) with message!`, 'success');
        logAction('File upload', `${result.files_count} file(s) uploaded`);
        form.reset();
        document.getElementById('filePreview').innerHTML = '';
    } catch (error) {
        showStatus('Upload failed: ' + error.message, 'error');
        console.error('Upload error:', error);
    }
}

// Handle drag and drop
async function handleDrop(event) {
    event.preventDefault();
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.remove('border-blue-500', 'bg-blue-50');

    const files = event.dataTransfer.files;
    if (files.length === 0) return;

    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }

    try {
        const result = await pt.addMessage(formData, 'Files uploaded via drag & drop');
        showStatus(`Uploaded ${result.files_count} file(s) via drag & drop`, 'success');
        logAction('Drag & drop upload', `${result.files_count} file(s)`);
    } catch (error) {
        showStatus('Upload failed: ' + error.message, 'error');
        console.error('Upload error:', error);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.add('border-blue-500', 'bg-blue-50');
}

function handleDragLeave(event) {
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.remove('border-blue-500', 'bg-blue-50');
}

// Preview selected files
function previewFiles(input) {
    const preview = document.getElementById('filePreview');
    const files = input.files;

    if (files.length === 0) {
        preview.innerHTML = '';
        return;
    }

    const fileList = Array.from(files).map(file => {
        const sizeKB = (file.size / 1024).toFixed(2);
        return `
            <div class="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
                </svg>
                <span class="flex-1">${file.name}</span>
                <span class="text-gray-400">${sizeKB} KB</span>
            </div>
        `;
    }).join('');

    preview.innerHTML = `
        <div class="space-y-1">
            <p class="text-sm font-medium text-gray-700 mb-2">${files.length} file(s) selected:</p>
            ${fileList}
        </div>
    `;
}

// Show status message
function showStatus(message, type = 'success') {
    const statusDiv = document.getElementById('statusMessage');
    const bgColor = type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

    statusDiv.className = `rounded-lg p-4 mb-4 ${bgColor}`;
    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden');

    setTimeout(() => {
        statusDiv.classList.add('hidden');
    }, 5000);
}

// Log action
function logAction(action, details) {
    const timestamp = new Date().toLocaleTimeString();
    actionsLog.unshift({ action, details, timestamp });

    // Keep only last 10 actions
    if (actionsLog.length > 10) {
        actionsLog.pop();
    }

    updateActionsLog();
}

function updateActionsLog() {
    const logDiv = document.getElementById('actionsLog');

    if (actionsLog.length === 0) {
        logDiv.innerHTML = '<p class="text-gray-400 text-sm">No actions yet</p>';
        return;
    }

    logDiv.innerHTML = actionsLog.map(log => `
        <div class="flex items-start gap-3 p-3 bg-gray-50 rounded">
            <div class="flex-1">
                <div class="font-medium text-sm">${log.action}</div>
                <div class="text-sm text-gray-600">${log.details}</div>
            </div>
            <div class="text-xs text-gray-400">${log.timestamp}</div>
        </div>
    `).join('');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateActionsLog();
});
</script>
```

### Key Features Explained {#chat-integration-key-features}

**Send Messages:**
- Text input with Enter key support
- Quick message buttons for common actions
- Instant feedback on message delivery

**File Upload:**
- Traditional file selector with multiple file support
- Optional message to accompany uploads
- File preview with size information
- Drag and drop upload zone
- Visual feedback during drag operations

**Status Notifications:**
- Success and error messages
- Auto-hide after 5 seconds
- Clear visual distinction

**Actions Log:**
- Tracks recent actions (messages and uploads)
- Displays timestamps
- Limited to last 10 actions

### Use Cases

1. **Project Management:** Send status updates and upload deliverables
2. **Support Systems:** Submit issues with file attachments
3. **Collaboration:** Share files and communicate progress
4. **Reporting:** Upload reports and notify team members
5. **Feedback Collection:** Submit feedback with supporting documents

## AI Chat with Real-Time Response Handling

This example demonstrates how to send messages to the AI and receive responses using `pt.waitForMessageReceived()`. This pattern is ideal for building interactive AI-powered interfaces with clean async/await code.

### Features {#ai-chat-features}

- Send questions to AI without blocking the UI
- Display AI responses as they complete
- Show loading states during processing
- Handle multiple concurrent questions
- Cancel pending responses
- Display reasoning steps when available

### Complete Implementation {#ai-chat-implementation}

```html
<div class="container mx-auto p-6 max-w-4xl">
    <h1 class="text-3xl font-bold text-gray-800 mb-8">AI Assistant</h1>

    <!-- Question Input -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="flex gap-2 mb-4">
            <input
                type="text"
                id="questionInput"
                placeholder="Ask the AI a question..."
                class="flex-1 border rounded px-3 py-2"
                onkeypress="if(event.key==='Enter') askQuestion()"
            >
            <button
                onclick="askQuestion()"
                id="askBtn"
                class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
                Ask
            </button>
            <button
                onclick="cancelPending()"
                id="cancelBtn"
                class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 hidden"
            >
                Cancel
            </button>
        </div>

        <!-- Quick Questions -->
        <div class="flex flex-wrap gap-2">
            <button onclick="askQuickQuestion('What can you help me with?')"
                class="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200">
                What can you help me with?
            </button>
            <button onclick="askQuickQuestion('Summarize my recent tasks')"
                class="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200">
                Summarize tasks
            </button>
            <button onclick="askQuickQuestion('What are my priorities today?')"
                class="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200">
                Today's priorities
            </button>
        </div>
    </div>

    <!-- Loading Indicator -->
    <div id="loadingIndicator" class="hidden bg-blue-50 rounded-lg p-4 mb-6">
        <div class="flex items-center gap-3">
            <div class="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span class="text-blue-700" id="loadingText">AI is thinking...</span>
        </div>
    </div>

    <!-- AI Response -->
    <div id="responseContainer" class="hidden bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 class="text-lg font-semibold mb-3 text-gray-700">AI Response</h2>

        <!-- Reasoning Steps (if available) -->
        <div id="reasoningSteps" class="hidden mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 class="text-sm font-medium text-gray-600 mb-2">Reasoning:</h3>
            <div id="reasoningContent" class="text-sm text-gray-600 space-y-1"></div>
        </div>

        <!-- Main Response -->
        <div id="responseText" class="prose max-w-none"></div>

        <!-- Response Metadata -->
        <div id="responseMeta" class="mt-4 pt-4 border-t text-sm text-gray-500"></div>
    </div>

    <!-- Conversation History -->
    <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-lg font-semibold mb-4 text-gray-700">Conversation History</h2>
        <div id="conversationHistory" class="space-y-4 max-h-96 overflow-y-auto">
            <p class="text-gray-400 text-sm">No conversations yet</p>
        </div>
    </div>
</div>

<script>
// Track pending responses for cancellation
let currentAbortController = null;
let conversationHistory = [];

// Ask a question using waitForMessageReceived (recommended approach)
async function askQuestion() {
    const input = document.getElementById('questionInput');
    const question = input.value.trim();

    if (!question) return;

    // Cancel any pending response
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }

    // Update UI
    input.value = '';
    showLoading('AI is thinking...');
    hideResponse();
    document.getElementById('cancelBtn').classList.remove('hidden');

    // Create abort controller for cancellation.
    // Keep a local reference: cancelPending() clears the shared variable,
    // so the guards below must check this request's own controller.
    const controller = new AbortController();
    currentAbortController = controller;

    try {
        // Send message
        const result = await pt.addMessage(question);
        const taskId = result.task_id;

        // Wait for AI response with timeout
        const message = await pt.waitForMessageReceived(taskId, {
            timeout: 120000  // 2 minute timeout
        });

        // Check if cancelled
        if (controller.signal.aborted) {
            return;
        }

        currentAbortController = null;
        hideLoading();
        document.getElementById('cancelBtn').classList.add('hidden');

        // Display the response
        displayResponse(question, message);

        // Add to history
        addToHistory(question, message);

    } catch (error) {
        if (controller.signal.aborted) {
            return; // Cancelled, don't show error
        }

        currentAbortController = null;
        hideLoading();
        document.getElementById('cancelBtn').classList.add('hidden');

        if (error.message.includes('Timeout')) {
            showError('Response timed out. Please try again.');
        } else {
            showError('Failed to get response: ' + error.message);
        }
    }
}

// Quick question helper
function askQuickQuestion(question) {
    document.getElementById('questionInput').value = question;
    askQuestion();
}

// Cancel pending response
function cancelPending() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
        hideLoading();
        document.getElementById('cancelBtn').classList.add('hidden');
        showError('Response cancelled');
    }
}

// Display AI response
function displayResponse(question, message) {
    const container = document.getElementById('responseContainer');
    const responseText = document.getElementById('responseText');
    const responseMeta = document.getElementById('responseMeta');
    const reasoningSteps = document.getElementById('reasoningSteps');
    const reasoningContent = document.getElementById('reasoningContent');

    // Show main response
    responseText.innerHTML = formatMessage(message.message);

    // Show reasoning steps if available
    if (message.reasoning_steps && message.reasoning_steps.length > 0) {
        reasoningContent.innerHTML = message.reasoning_steps
            .map(step => `<div><strong>${step.label}:</strong> ${step.content || ''}</div>`)
            .join('');
        reasoningSteps.classList.remove('hidden');
    } else {
        reasoningSteps.classList.add('hidden');
    }

    // Show metadata
    const timestamp = new Date(message.created_at).toLocaleString();
    responseMeta.innerHTML = `
        <span>Message ID: ${message.id}</span>
        <span class="mx-2">•</span>
        <span>${timestamp}</span>
        <span class="mx-2">•</span>
        <span>${message.message.length} characters</span>
    `;

    container.classList.remove('hidden');
}

// Add to conversation history
function addToHistory(question, message) {
    conversationHistory.unshift({
        question,
        answer: message.message,
        timestamp: new Date().toLocaleString(),
        messageId: message.id
    });

    // Keep last 10 conversations
    if (conversationHistory.length > 10) {
        conversationHistory.pop();
    }

    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyDiv = document.getElementById('conversationHistory');

    if (conversationHistory.length === 0) {
        historyDiv.innerHTML = '<p class="text-gray-400 text-sm">No conversations yet</p>';
        return;
    }

    historyDiv.innerHTML = conversationHistory.map(conv => `
        <div class="border-l-4 border-blue-500 pl-4 py-2">
            <div class="font-medium text-gray-800 mb-1">Q: ${escapeHtml(conv.question)}</div>
            <div class="text-gray-600 text-sm mb-2">${truncateText(conv.answer, 200)}</div>
            <div class="text-xs text-gray-400">${conv.timestamp}</div>
        </div>
    `).join('');
}

// UI Helpers
function showLoading(text) {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingIndicator').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingIndicator').classList.add('hidden');
}

function hideResponse() {
    document.getElementById('responseContainer').classList.add('hidden');
}

function showError(message) {
    const container = document.getElementById('responseContainer');
    const responseText = document.getElementById('responseText');

    responseText.innerHTML = `<div class="text-red-600">${escapeHtml(message)}</div>`;
    document.getElementById('reasoningSteps').classList.add('hidden');
    document.getElementById('responseMeta').innerHTML = '';
    container.classList.remove('hidden');
}

function formatMessage(text) {
    // Basic markdown-like formatting
    return text
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>');
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return escapeHtml(text);
    return escapeHtml(text.substring(0, maxLength)) + '...';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
</script>
```

### Key Features Explained {#ai-chat-key-features}

**Promise-Based AI Requests:**
- Uses `pt.waitForMessageReceived()` for clean async/await code
- Built-in timeout handling
- Automatic truncated message handling

**Real-Time Response Handling:**
- `pt.waitForMessageReceived()` returns the complete AI response
- Automatically handles truncated messages (fetches full text)
- Displays reasoning steps when available

**Cancellation Support:**
- Uses AbortController pattern for cancellation
- Users can cancel pending responses
- Timeout protection for long-running requests

**Conversation History:**
- Tracks recent Q&A pairs
- Displays truncated answers with timestamps
- Limited to last 10 conversations

### When to Use Each Approach

| Use Case | Recommended Approach |
|----------|---------------------|
| Quick questions with short answers | `awaitResponse: true` |
| Long-form content generation | `waitForMessageReceived` |
| Multiple concurrent questions | `waitForMessageReceived` with Promise.all |
| Need to show loading/cancel UI | `waitForMessageReceived` |
| Need callback-based cancellation | `onMessageReceived` |
| Streaming UI with tokens | `onMessageReceived` + `onSocketEvent` |
| **AI generation > 5 seconds (content, images, docs)** | **[Fire-and-Forget Pattern](Live-Pages-Best-Practices.md#async-fire-and-forget-pattern-for-ai-generation)** |
| **User might close tab or navigate away** | **[Fire-and-Forget Pattern](Live-Pages-Best-Practices.md#async-fire-and-forget-pattern-for-ai-generation)** |
| **Batch/parallel AI tasks** | **[Fire-and-Forget Pattern](Live-Pages-Best-Practices.md#async-fire-and-forget-pattern-for-ai-generation)** |

## Document Management and Notifications

This comprehensive example demonstrates document search, viewing, creation, and push notifications.

### Features {#document-management-features}

- Search documents and collections using semantic search
- View document content with optional range selection
- Create and save documents in multiple formats (TXT, MD, PDF, DOCX, CSV, XLSX)
- Send push notifications to team members
- Format-specific MIME type handling
- Real-time status updates

### Complete Implementation {#document-management-implementation}

```html
<div class="container mx-auto p-6 max-w-6xl">
    <h1 class="text-3xl font-bold text-gray-800 mb-8">Document Management System</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Search Documents -->
        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                Search Documents
            </h2>

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
                onclick="searchDocuments()"
                class="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600"
            >
                Search
            </button>

            <div id="searchResults" class="mt-4 hidden">
                <h3 class="font-semibold mb-2">Results:</h3>
                <div class="bg-gray-50 rounded p-3 max-h-80 overflow-auto">
                    <pre id="resultsContent" class="text-sm whitespace-pre-wrap"></pre>
                </div>
            </div>
        </div>

        <!-- View Document -->
        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                View Document
            </h2>

            <input
                type="number"
                id="viewDocId"
                placeholder="Document ID"
                class="border rounded px-3 py-2 w-full mb-3"
            >

            <div class="grid grid-cols-2 gap-2 mb-3">
                <input
                    type="number"
                    id="fromChar"
                    placeholder="From (optional)"
                    class="border rounded px-3 py-2"
                >
                <input
                    type="number"
                    id="toChar"
                    placeholder="To (optional)"
                    class="border rounded px-3 py-2"
                >
            </div>

            <button
                onclick="viewDocument()"
                class="bg-green-500 text-white px-4 py-2 rounded w-full hover:bg-green-600"
            >
                View Text
            </button>

            <div id="docView" class="mt-4 hidden">
                <h3 class="font-semibold mb-2">Document Content:</h3>
                <div class="bg-gray-50 rounded p-3 max-h-80 overflow-auto">
                    <pre id="docText" class="text-sm whitespace-pre-wrap"></pre>
                </div>
            </div>
        </div>

        <!-- Create Document -->
        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Create Document
            </h2>

            <p class="text-sm text-gray-600 mb-4">
                💡 <strong>Tip:</strong> You can save documents to different locations using the folder parameter:
                use <code>@public</code> for public access, <code>@liveapp</code> for group-wide access,
                or a custom path for chat-specific storage.
                See <a href="File-Storage-Hierarchy.md" class="text-blue-600 hover:underline">File Storage Hierarchy</a> for details.
            </p>

            <input
                type="text"
                id="docFilename"
                placeholder="Filename (e.g., report.txt)"
                class="border rounded px-3 py-2 w-full mb-3"
            >

            <select id="docFormat" class="border rounded px-3 py-2 w-full mb-3" onchange="updateMimetype()">
                <option value="TXT">TXT - Plain Text</option>
                <option value="MD">MD - Markdown</option>
                <option value="HTML">HTML</option>
                <option value="DOCX">DOCX - Word Document (use Markdown)</option>
                <option value="PDF">PDF (use Markdown)</option>
                <option value="CSV">CSV</option>
                <option value="XLSX">XLSX - Excel (use CSV format)</option>
                <option value="CUSTOM">CUSTOM</option>
            </select>

            <input
                type="text"
                id="docMimetype"
                value="text/plain"
                class="border rounded px-3 py-2 w-full mb-3 text-sm text-gray-600"
                readonly
            >

            <textarea
                id="docContent"
                rows="8"
                placeholder="Enter document content..."
                class="border rounded px-3 py-2 w-full mb-3 font-mono text-sm"
            ></textarea>

            <button
                onclick="saveDocument()"
                class="bg-purple-500 text-white px-4 py-2 rounded w-full hover:bg-purple-600"
            >
                Save Document
            </button>
        </div>

        <!-- Send Notification -->
        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                Send Notification
            </h2>

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
                rows="4"
                placeholder="Notification message"
                class="border rounded px-3 py-2 w-full mb-3"
            ></textarea>

            <button
                onclick="sendNotification()"
                class="bg-orange-500 text-white px-4 py-2 rounded w-full hover:bg-orange-600"
            >
                Send Notification
            </button>
        </div>
    </div>

    <!-- Status Messages -->
    <div id="statusMessage" class="hidden mt-6 rounded-lg p-4"></div>
</div>

<script>
// MIME type mapping
const mimeTypes = {
    'TXT': 'text/plain',
    'MD': 'text/markdown',
    'HTML': 'text/html',
    'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'PDF': 'application/pdf',
    'CSV': 'text/csv',
    'XLSX': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'CUSTOM': 'text/plain'
};

// Load users on page load
async function loadUsers() {
    try {
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
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function updateMimetype() {
    const format = document.getElementById('docFormat').value;
    document.getElementById('docMimetype').value = mimeTypes[format] || 'text/plain';
}

// Search documents
async function searchDocuments() {
    const query = document.getElementById('searchQuery').value.trim();
    const scope = document.getElementById('searchScope').value;

    if (!query) {
        showStatus('Please enter a search query', 'error');
        return;
    }

    try {
        const result = await pt.searchDocuments(query, scope);

        document.getElementById('resultsContent').textContent = result.results;
        document.getElementById('searchResults').classList.remove('hidden');
        showStatus('Search completed successfully', 'success');
    } catch (error) {
        showStatus('Search failed: ' + error.message, 'error');
        console.error('Search error:', error);
    }
}

// View document
async function viewDocument() {
    const docId = parseInt(document.getElementById('viewDocId').value);
    const fromChar = document.getElementById('fromChar').value;
    const toChar = document.getElementById('toChar').value;

    if (!docId) {
        showStatus('Please enter a document ID', 'error');
        return;
    }

    try {
        const options = {};
        if (fromChar) options.from = parseInt(fromChar);
        if (toChar) options.to = parseInt(toChar);

        const result = await pt.getDocumentText(docId, options);

        if (result.text) {
            document.getElementById('docText').textContent = result.text;
            document.getElementById('docView').classList.remove('hidden');
            showStatus('Document loaded successfully', 'success');
        } else {
            showStatus(result.message || 'No text available', 'error');
        }
    } catch (error) {
        showStatus('Error loading document: ' + error.message, 'error');
        console.error('View error:', error);
    }
}

// Save document
async function saveDocument() {
    const filename = document.getElementById('docFilename').value.trim();
    const format = document.getElementById('docFormat').value;
    const mimetype = document.getElementById('docMimetype').value;
    const content = document.getElementById('docContent').value;

    if (!filename || !content) {
        showStatus('Please provide filename and content', 'error');
        return;
    }

    try {
        const result = await pt.saveDocument(filename, format, mimetype, content);

        showStatus('Document saved successfully: ' + result.filename, 'success');

        // Clear form
        document.getElementById('docFilename').value = '';
        document.getElementById('docContent').value = '';
    } catch (error) {
        showStatus('Error saving document: ' + error.message, 'error');
        console.error('Save error:', error);
    }
}

// Send notification
async function sendNotification() {
    const userId = parseInt(document.getElementById('userSelect').value);
    const title = document.getElementById('notifTitle').value.trim();
    const text = document.getElementById('notifText').value.trim();

    if (!userId || !title || !text) {
        showStatus('Please fill all notification fields', 'error');
        return;
    }

    try {
        await pt.sendNotification(userId, title, text);

        showStatus('Notification sent successfully!', 'success');

        // Clear form
        document.getElementById('notifTitle').value = '';
        document.getElementById('notifText').value = '';
    } catch (error) {
        showStatus('Error sending notification: ' + error.message, 'error');
        console.error('Notification error:', error);
    }
}

// Show status message
function showStatus(message, type = 'success') {
    const statusDiv = document.getElementById('statusMessage');
    const bgColor = type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

    statusDiv.className = `mt-6 rounded-lg p-4 ${bgColor}`;
    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden');

    setTimeout(() => {
        statusDiv.classList.add('hidden');
    }, 5000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
});
</script>
```

### Key Features Explained {#document-management-key-features}

**Document Search:**
- Semantic search across documents and collections
- Scope selection (all, documents only, collections only)
- XML-formatted search results display

**Document Viewer:**
- Load full document text or specific character ranges
- Useful for previewing large documents
- Text-based content display

**Document Creator:**
- Multiple format support (TXT, MD, HTML, DOCX, PDF, CSV, XLSX)
- Automatic MIME type selection
- Markdown to Word/PDF conversion
- CSV to Excel conversion

**Push Notifications:**
- Send notifications to specific users
- Custom title and message
- User selection from chat members

### Practical Use Cases

1. **Knowledge Base:** Search documentation and create new articles
2. **Report Generation:** Create PDF/Word reports from data
3. **Team Collaboration:** Notify team members of important updates
4. **Document Library:** Browse and view document contents
5. **Data Export:** Export data to CSV/Excel formats

## AI-Powered Database Automation

This example demonstrates how to combine Live Page actions with AI-powered database operations. The AI can process your instructions and automatically manage database entities.

### Features {#ai-automation-features}

- Upload files and have AI extract structured data automatically
- Send instructions to process information and store in database
- Combine multiple operations in a single AI request
- Get intelligent data validation and error handling

### Complete Implementation: Intelligent Document Processor

```html
<div class="container mx-auto p-6 max-w-6xl">
    <h1 class="text-3xl font-bold text-gray-800 mb-8">AI-Powered Data Processor</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Upload Files for AI Processing -->
        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Upload & Extract Data</h2>

            <div class="mb-4">
                <label class="block text-sm font-medium mb-2">Select Processing Type</label>
                <select id="processingType" class="border rounded px-3 py-2 w-full" onchange="updateInstructions()">
                    <option value="invoice">Invoice Processing</option>
                    <option value="resume">Resume Parsing</option>
                    <option value="receipt">Expense Receipts</option>
                    <option value="meeting">Meeting Notes</option>
                    <option value="contacts">Contact Import</option>
                    <option value="custom">Custom Instructions</option>
                </select>
            </div>

            <div class="mb-4">
                <label class="block text-sm font-medium mb-2">Upload Files</label>
                <input
                    type="file"
                    id="fileInput"
                    multiple
                    class="block w-full text-sm"
                    onchange="previewFiles()"
                >
                <div id="filePreview" class="mt-2 text-sm text-gray-600"></div>
            </div>

            <div class="mb-4">
                <label class="block text-sm font-medium mb-2">AI Instructions</label>
                <textarea
                    id="aiInstructions"
                    rows="8"
                    class="border rounded px-3 py-2 w-full font-mono text-sm"
                    placeholder="Enter custom instructions for the AI..."
                ></textarea>
            </div>

            <button
                onclick="processFiles()"
                class="bg-blue-500 text-white px-6 py-2 rounded w-full hover:bg-blue-600"
            >
                Process with AI
            </button>
        </div>

        <!-- Direct AI Commands -->
        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Direct AI Commands</h2>

            <div class="space-y-4">
                <!-- Quick Actions -->
                <div>
                    <h3 class="font-medium mb-2">Quick Actions</h3>
                    <div class="grid grid-cols-2 gap-2">
                        <button
                            onclick="quickAction('competitors')"
                            class="bg-green-100 text-green-800 px-3 py-2 rounded text-sm hover:bg-green-200"
                        >
                            Research Competitors
                        </button>
                        <button
                            onclick="quickAction('tasks')"
                            class="bg-blue-100 text-blue-800 px-3 py-2 rounded text-sm hover:bg-blue-200"
                        >
                            Analyze Tasks
                        </button>
                        <button
                            onclick="quickAction('summary')"
                            class="bg-purple-100 text-purple-800 px-3 py-2 rounded text-sm hover:bg-purple-200"
                        >
                            Generate Summary
                        </button>
                        <button
                            onclick="quickAction('export')"
                            class="bg-orange-100 text-orange-800 px-3 py-2 rounded text-sm hover:bg-orange-200"
                        >
                            Export Data
                        </button>
                    </div>
                </div>

                <!-- Custom Command -->
                <div>
                    <h3 class="font-medium mb-2">Custom AI Command</h3>
                    <textarea
                        id="customCommand"
                        rows="6"
                        placeholder="Enter your command for the AI assistant..."
                        class="border rounded px-3 py-2 w-full text-sm"
                    ></textarea>
                    <button
                        onclick="sendCustomCommand()"
                        class="bg-indigo-500 text-white px-4 py-2 rounded w-full mt-2 hover:bg-indigo-600"
                    >
                        Execute Command
                    </button>
                </div>
            </div>

            <div class="mt-6 p-4 bg-gray-50 rounded">
                <h3 class="font-medium mb-2">Example Commands:</h3>
                <ul class="text-sm text-gray-700 space-y-1">
                    <li>• "Find all overdue tasks and create urgent reminders"</li>
                    <li>• "Search for industry trends and save as research notes"</li>
                    <li>• "Analyze recent expenses and categorize them"</li>
                    <li>• "Extract key contacts from meeting notes"</li>
                </ul>
            </div>
        </div>
    </div>

    <!-- Status Messages -->
    <div id="statusMessage" class="hidden mt-6 rounded-lg p-4"></div>
</div>

<script>
// Predefined instruction templates
const instructionTemplates = {
    invoice: `Extract invoice information and use the tool 'chatdb_add' to create database records:
- entity_name: "invoice"
- data: {
    invoice_number: string,
    date: string,
    vendor: string,
    amount: number,
    due_date: string,
    line_items: array
  }`,

    resume: `Extract candidate information from resumes and use the tool 'chatdb_add' to create entries:
- entity_name: "candidate"
- data: {
    name: string,
    email: string,
    phone: string,
    years_experience: number,
    skills: array,
    education: string,
    previous_companies: array
  }`,

    receipt: `Extract expense data from receipts and use the tool 'chatdb_add' to store each:
- entity_name: "expense"
- data: {
    date: string,
    merchant: string,
    category: string,
    amount: number,
    currency: string
  }`,

    meeting: `Extract action items from meeting notes and use the tool 'chatdb_add' to create entries:
- entity_name: "action_item"
- data: {
    description: string,
    assigned_to: string,
    due_date: string,
    priority: string
  }`,

    contacts: `Parse contact information and use the tool 'chatdb_add' to create entries:
- entity_name: "contact"
- data: {
    name: string,
    email: string,
    phone: string,
    company: string,
    role: string
  }`
};

function updateInstructions() {
    const type = document.getElementById('processingType').value;
    const textarea = document.getElementById('aiInstructions');

    if (type !== 'custom' && instructionTemplates[type]) {
        textarea.value = instructionTemplates[type];
    } else if (type === 'custom') {
        textarea.value = '';
        textarea.placeholder = 'Enter your custom instructions...';
    }
}

function previewFiles() {
    const input = document.getElementById('fileInput');
    const preview = document.getElementById('filePreview');

    if (input.files.length === 0) {
        preview.textContent = '';
        return;
    }

    const fileList = Array.from(input.files)
        .map(f => f.name)
        .join(', ');

    preview.textContent = `${input.files.length} file(s) selected: ${fileList}`;
}

async function processFiles() {
    const input = document.getElementById('fileInput');
    const instructions = document.getElementById('aiInstructions').value.trim();

    if (input.files.length === 0) {
        showStatus('Please select files to process', 'error');
        return;
    }

    if (!instructions) {
        showStatus('Please provide AI instructions', 'error');
        return;
    }

    try {
        const formData = new FormData();
        for (const file of input.files) {
            formData.append('files', file);
        }

        await pt.addMessage(formData, instructions);

        showStatus(
            `Files uploaded successfully! The AI is processing ${input.files.length} file(s) and will store the data according to your instructions.`,
            'success'
        );

        // Clear form
        input.value = '';
        document.getElementById('filePreview').textContent = '';
    } catch (error) {
        showStatus('Error processing files: ' + error.message, 'error');
    }
}

async function quickAction(type) {
    const commands = {
        competitors: `Search the web for the top 5 competitors in the AI assistant market and use the tool 'chatdb_add' to create database entries:
- entity_name: "competitor"
- data: { name: string, website: string, key_features: array, pricing_model: string, market_position: string }

Research each competitor and provide comprehensive information.`,

        tasks: `Use the tool 'chatdb_list' to find all tasks with status "pending" or "in_progress".
For any task that is overdue or high priority, use the tool 'chatdb_add' to create:
- entity_name: "urgent_action"
- data: { task_id: number, title: string, days_overdue: number, priority: string, recommended_action: string }`,

        summary: `Use the tool 'chatdb_list' to review all activities from the past week.
Then use the tool 'chatdb_add' to create a weekly summary:
- entity_name: "weekly_summary"
- data: {
    week_ending: string,
    tasks_completed: number,
    documents_created: number,
    key_highlights: array,
    upcoming_priorities: array
  }`,

        export: `Use the tool 'chatdb_list' to get all contacts, then export them to a CSV file with columns: name, email, phone, company, tags.
Save it as "contacts_export_[date].csv" using the appropriate document creation tool and notify me when complete.`
    };

    try {
        await pt.addMessage(commands[type]);
        showStatus('AI command sent successfully! Processing...', 'success');
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    }
}

async function sendCustomCommand() {
    const command = document.getElementById('customCommand').value.trim();

    if (!command) {
        showStatus('Please enter a command', 'error');
        return;
    }

    try {
        await pt.addMessage(command);
        showStatus('Custom command sent to AI assistant!', 'success');
        document.getElementById('customCommand').value = '';
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    }
}

function showStatus(message, type = 'success') {
    const statusDiv = document.getElementById('statusMessage');
    const bgColor = type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

    statusDiv.className = `mt-6 rounded-lg p-4 ${bgColor}`;
    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden');

    setTimeout(() => {
        statusDiv.classList.add('hidden');
    }, 8000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateInstructions();
});
</script>
```

### Key Features Explained {#ai-automation-key-features}

**AI-Powered File Processing:**
- Upload files with specific extraction instructions
- AI automatically parses content and creates database records
- Supports multiple file types and batch processing
- Intelligent error handling and data validation

**Direct AI Commands:**
- Send natural language instructions to the AI
- AI can search, analyze, and store data autonomously
- Quick action buttons for common workflows
- Custom command interface for flexibility

**Real-World Applications:**

1. **Invoice Processing:** Upload invoices, AI extracts data, stores in database
2. **Resume Screening:** Batch process resumes, extract candidate info
3. **Expense Management:** Upload receipts, AI categorizes and stores expenses
4. **Meeting Notes:** Upload recordings/notes, AI extracts action items
5. **Data Migration:** Upload spreadsheets, AI imports and validates data
6. **Competitive Research:** AI searches and compiles competitor information
7. **Task Analysis:** AI reviews tasks and creates urgency reports
8. **Report Generation:** AI compiles data and generates formatted reports

### Benefits

- **Automation:** Eliminate manual data entry and processing
- **Intelligence:** AI understands context and validates data
- **Flexibility:** Use natural language to describe what you need
- **Batch Processing:** Handle multiple files/records at once
- **Error Handling:** AI catches and reports data issues
- **Structured Storage:** Data automatically organized in database

## Document Processing with Parallel Upload

This advanced example demonstrates how to handle multiple file uploads concurrently with AI-powered topic extraction. Files are processed in parallel for maximum performance, with the AI extracting topics and returning structured JSON responses.

### Features {#parallel-upload-features}

- Upload multiple PDF/DOCX files concurrently (parallel processing)
- AI extracts topics and returns structured JSON
- Store file metadata with processing status
- "Check" button for files still waiting for processing
- Auto-refresh table every 10 seconds
- Document text preview modal
- Handles large document processing delays gracefully
- Includes both parallel and serial upload examples

### Use Case

Perfect for applications where:
- You need to upload and process multiple documents at once
- AI should extract information (topics, metadata, etc.) from documents
- You want fast, concurrent processing instead of sequential
- Documents may or may not have text immediately available
- Users can manually re-check documents that weren't ready on first upload

### Complete Implementation {#parallel-upload-implementation}

```html
<div class="container mx-auto p-6 max-w-4xl">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3 text-gray-700">
      <h1 class="text-xl md:text-2xl font-bold">Topic extractor</h1>
    </div>
    <button class="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm" id="refreshBtn">Refresh</button>
  </div>

  <!-- Uploader -->
  <div class="bg-white rounded-xl shadow p-4">
    <p class="text-gray-600 text-sm mb-3">Upload .pdf or .docx (≤ 1MB). If the document text has been extracted, the AI will write a Topic and add a DB row (entity: <code>file_topic</code>). If the text isn't ready yet, it will add a row with upload_status="waiting".</p>
    <div class="flex flex-col md:flex-row md:items-center gap-3">
      <input accept=".pdf,.docx" class="block w-full text-sm text-gray-700" id="fileInput" multiple type="file" />
      <button class="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2" id="uploadBtn">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 0l-3 3m3-3l3 3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
        </svg>
        Upload
      </button>
    </div>
    <div class="hidden mt-3 rounded p-3 text-sm" id="uploadNotice"></div>
  </div>

  <!-- Table -->
  <div class="mt-6 bg-white rounded-xl shadow p-4">
    <div class="flex items-center justify-between mb-3">
      <div class="text-sm text-gray-500">Auto-refreshes every 10s</div>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">File Name</th>
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Topic</th>
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Uploaded At</th>
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Upload Status</th>
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white" id="rows"></tbody>
      </table>
    </div>
    <div class="hidden text-center text-gray-500 text-sm py-8" id="emptyState">No uploads yet</div>
  </div>

  <!-- Viewer Modal -->
  <div class="hidden fixed inset-0 bg-black/50 z-50 items-center justify-center" id="viewerModal">
    <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4">
      <div class="flex items-center justify-between p-4 border-b">
        <h3 class="font-semibold text-gray-800">Document Preview</h3>
        <button class="text-gray-500 hover:text-gray-700" id="closeViewer">✕</button>
      </div>
      <div class="p-4 max-h-[60vh] overflow-auto">
        <pre class="whitespace-pre-wrap text-sm text-gray-800" id="viewerText"></pre>
      </div>
    </div>
  </div>

  <script>
  (function(){
    const rowsEl = document.getElementById('rows');
    const emptyEl = document.getElementById('emptyState');
    const refreshBtn = document.getElementById('refreshBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    const noticeEl = document.getElementById('uploadNotice');
    const viewerModal = document.getElementById('viewerModal');
    const closeViewer = document.getElementById('closeViewer');
    const viewerText = document.getElementById('viewerText');

    const MAX_SIZE = 1024 * 1024; // 1MB
    let autoTimer = null;

    function setNotice(text, type){
      if(!text){ noticeEl.classList.add('hidden'); noticeEl.textContent = ''; return; }
      const base = 'mt-3 rounded p-3 text-sm ';
      if(type==='success') noticeEl.className = base + 'bg-green-50 border border-green-200 text-green-800';
      else if(type==='warn') noticeEl.className = base + 'bg-yellow-50 border border-yellow-200 text-yellow-800';
      else noticeEl.className = base + 'bg-red-50 border border-red-200 text-red-800';
      noticeEl.textContent = text; noticeEl.classList.remove('hidden');
    }

    function badge(status){
      const map = {
        success: 'bg-green-100 text-green-800',
        waiting: 'bg-yellow-100 text-yellow-800',
        error:   'bg-red-100 text-red-800',
        pending: 'bg-gray-100 text-gray-800'
      };
      const cls = map[status] || map.pending;
      const label = (status||'pending').toUpperCase();
      return `<span class="px-2 py-1 text-xs rounded ${cls}">${label}</span>`;
    }

    function fmtDate(s){ try { return new Date(s).toLocaleString(); } catch(e){ return s || ''; } }

    function esc(str){
      const d = document.createElement('div'); d.textContent = String(str ?? '');
      return d.innerHTML;
    }

    function rowHTML(item){
      const d = item.data || {};
      const file = d.file_name || '';
      const topic = (d.topic === null || d.topic === undefined || d.topic === '') ? 'Pending' : d.topic;
      const status = d.upload_status || 'pending';
      const canView = !!d.document_id;
      const viewBtnCls = 'px-3 py-1.5 rounded ' + (canView ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed');
      const viewDisabled = canView ? '' : 'disabled';
      const docId = d.document_id ? String(d.document_id) : '';

      const checkBtn = status === 'waiting'
        ? `<button class="px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs" data-entity-id="${item.id}" data-document-id="${docId}" data-file-name="${esc(file)}" onclick="window.__checkWaiting(event)">Check</button>`
        : '';

      return `
        <tr>
          <td class="px-4 py-2 text-sm text-gray-800">${esc(file)}</td>
          <td class="px-4 py-2 text-sm text-gray-700">${esc(topic)}</td>
          <td class="px-4 py-2 text-sm text-gray-500">${fmtDate(item.created_at)}</td>
          <td class="px-4 py-2 text-sm">${badge(status)}</td>
          <td class="px-4 py-2 text-sm flex items-center gap-2">
            <button class="${viewBtnCls}" ${viewDisabled} onclick="window.__openViewer(${docId || 'null'})">View</button>
            ${checkBtn}
          </td>
        </tr>
`;
}

    async function loadRows(){
      try{
        const entities = await pt.list({ entityNames: ['file_topic'], limit: 200 });
        const items = (entities || []).filter(e => e.entity_name === 'file_topic');
        if(items.length === 0){
          rowsEl.innerHTML = '';
          emptyEl.classList.remove('hidden');
          return;
        }
        emptyEl.classList.add('hidden');
        rowsEl.innerHTML = items.map(rowHTML).join('');
      }catch(err){
        setNotice('Failed to load rows. Please try Refresh.', 'error');
      }
    }

    function setUploading(on){
      uploadBtn.disabled = !!on;
      if(on){ uploadBtn.classList.add('opacity-60','cursor-not-allowed'); }
      else { uploadBtn.classList.remove('opacity-60','cursor-not-allowed'); }
    }

    // NEW: upload multiple files concurrently
    async function uploadFiles(){
      const files = Array.from(fileInput.files || []);
      if(files.length === 0){ setNotice('Please select one or more files.', 'warn'); return; }

      const allowed = ['pdf','docx'];
      let skipped = 0;

      // Build parallel jobs for valid files
      const jobs = files.map(file => {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if(!allowed.includes(ext) || file.size > MAX_SIZE){
          skipped++;
          return null; // mark as skipped
        }

        const formData = new FormData();
        formData.append('files', file);

        // Instruction message (kept as in current flow)
        const msg = `AI Processing Request

You are given a file uploaded from a PrimeThink Live Page as an attachment to THIS message. Follow EXACTLY:

1) If the documents attached have text: derive a concise topic (<= 6 words, noun phrase) for each one. Then create EXACTLY ONE database record for each using 'chatdb_add' with:
   - entity_name: "file_topic"
   - data: {
       "file_name": "${file.name}",
       "topic": "<PUT_TOPIC>",
       "document_id": <ID of the just-uploaded document in THIS message's attachments>,
       "upload_status": "success"
     }
2) If all or some of the documents have no text: create EXACTLY ONE database record for the ones with no text using 'chatdb_add' with:
   - entity_name: "file_topic"
   - data: {
       "file_name": "${file.name}",
       "topic": "Pending",
       "document_id": <ID of the just-uploaded document in THIS message's attachments>,
       "upload_status": "waiting"
     }
3) You MUST call 'chatdb_add' exactly once per uploaded file.
4) Respond with JUST JSON, in the format:

[
  {
    "document_id": <document_id>,
    "document_filename": "<filename>",
    "document_topic": "<topic>",
    "extraction_status": "<success|error>"
  }
]`;

        return pt.addMessage(formData, msg);
      }).filter(Boolean);

      if(jobs.length === 0){
        setNotice(`No valid files to upload. Skipped: ${skipped}.`, 'warn');
        return;
      }

      setUploading(true);
      setNotice(`Uploading ${jobs.length} file(s) in parallel...`, 'warn');

      const results = await Promise.allSettled(jobs);
      const ok = results.filter(r => r.status === 'fulfilled').length;
      const fail = results.filter(r => r.status === 'rejected').length;

      setUploading(false);
      setNotice(`Upload finished. Success: ${ok}, Error: ${fail}. Skipped: ${skipped}.`, fail ? 'error' : 'success');

      // clear input and refresh table once
      fileInput.value = '';
      await loadRows();
    }

    // Expose a global check handler for waiting rows
    window.__checkWaiting = async function(e){
      const btn = e.currentTarget;
      const entityId = parseInt(btn.getAttribute('data-entity-id'));
      const docId = parseInt(btn.getAttribute('data-document-id'));
      const fileName = btn.getAttribute('data-file-name') || '';

      try{
        btn.disabled = true; btn.classList.add('opacity-60','cursor-not-allowed');
        const msg = `Re-check uploaded document readiness and update the existing DB row.

Document info:
- document_id: ${docId}
- file_name: "${fileName}"
- entity_id: ${entityId}

Instructions:
1) try to read the document text, if the document has extracted text:
   - Derive a concise topic (<= 6 words).
   - Use 'chatdb_edit' with entity_id and set data to:
     {
       "file_name": "${fileName}",
       "topic": "<PUT_TOPIC>",
       "document_id": ${docId},
       "upload_status": "success"
     }
2) If still not Ready or no text: make no DB changes.
3) Respond with the JUST JSON, with the format:

[
  {
    "document_id": <document_id>,
    "document_filename": "<filename>",
    "document_topic": "<topic>",
    "extraction_status": "<success|error>"
  }
]`;
        await pt.addMessage(msg);
        setNotice('Check requested. Give it a moment, then Refresh.', 'success');
        await loadRows();
      }catch(err){
        setNotice('Check failed. Please try again.', 'error');
      }finally{
        btn.disabled = false; btn.classList.remove('opacity-60','cursor-not-allowed');
      }
    }

    // Viewer helpers
    window.__openViewer = async function(docId){
      if(!docId){ return; }
      try{
        const res = await pt.getDocumentText(docId, { to: 2000 });
        const txt = (res && res.text) ? res.text : (res && res.message) ? res.message : 'No text available.';
        viewerText.textContent = txt;
        viewerModal.classList.remove('hidden');
        viewerModal.classList.add('flex');
      }catch(err){
        viewerText.textContent = 'Failed to load document text.';
        viewerModal.classList.remove('hidden');
        viewerModal.classList.add('flex');
      }
    }

    function closeModal(){
      viewerModal.classList.add('hidden');
      viewerModal.classList.remove('flex');
      viewerText.textContent = '';
    }

    closeViewer.addEventListener('click', closeModal);
    viewerModal.addEventListener('click', (e)=>{ if(e.target === viewerModal) closeModal(); });

    // Bindings
    refreshBtn.addEventListener('click', loadRows);
    uploadBtn.addEventListener('click', uploadFiles);

    // Initial load + auto refresh
    (async function init(){
      await loadRows();
      if(autoTimer) clearInterval(autoTimer);
      autoTimer = setInterval(loadRows, 10000);
    })();
  })();
  </script>
</div>
```

### Key Features Explained {#parallel-upload-key-features}

**Parallel File Upload:**
- Uploads multiple files concurrently using `Promise.allSettled()`
- Significantly faster when uploading multiple files
- Each file is processed independently by the AI
- Provides aggregate success/failure counts
- Recommended for better user experience

**JSON Response Format:**
- AI returns structured JSON with extraction results
- Easy to parse and validate
- Includes document_id, filename, topic, and status
- Better for programmatic handling of responses

**Status Management:**
- `success` - Document processed and topic extracted
- `waiting` - Document still being processed
- `pending` - Initial state
- `error` - Processing failed

**Check Later Functionality:**
- "Check" button appears for waiting documents
- Sends AI command to re-check document readiness
- Updates database record when document becomes ready
- User can manually trigger checks anytime

**Auto-Refresh:**
- Table refreshes every 10 seconds
- Shows latest processing status automatically
- No manual refresh needed for most operations

### Parallel vs Serial Upload Processing

The example above uses **parallel upload** (concurrent processing) for better performance. However, you may want **serial upload** (one at a time) in certain scenarios.

**When to Use Parallel Upload (Recommended):**
- Default choice for most use cases
- Faster overall completion time
- Better user experience
- Files are independent of each other
- You want to maximize throughput

**When to Use Serial Upload:**
- You need to process files in specific order
- You want to limit concurrent AI requests
- Each file depends on previous file's results
- You need more predictable resource usage

**Serial Upload Implementation:**

Replace the `uploadFiles` function with this serial version:

```javascript
// Serial upload: process one file at a time
async function uploadFiles(){
  const files = Array.from(fileInput.files || []);
  if(files.length === 0){ setNotice('Please select one or more files.', 'warn'); return; }

  const allowed = ['pdf','docx'];
  let ok = 0, fail = 0, skipped = 0;

  setUploading(true);
  setNotice(`Uploading ${files.length} file(s) one at a time...`, 'warn');

  // Process files sequentially
  for(const file of files){
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if(!allowed.includes(ext) || file.size > MAX_SIZE){
      skipped++;
      continue;
    }

    try{
      const formData = new FormData();
      formData.append('files', file);

      const msg = `AI Processing Request

You are given a file uploaded from a PrimeThink Live Page as an attachment to THIS message. Follow EXACTLY:

1) If the documents attached have text: derive a concise topic (<= 6 words, noun phrase) for each one. Then create EXACTLY ONE database record for each using 'chatdb_add' with:
   - entity_name: "file_topic"
   - data: {
       "file_name": "${file.name}",
       "topic": "<PUT_TOPIC>",
       "document_id": <ID of the just-uploaded document in THIS message's attachments>,
       "upload_status": "success"
     }
2) If all or some of the documents have no text: create EXACTLY ONE database record for the ones with no text using 'chatdb_add' with:
   - entity_name: "file_topic"
   - data: {
       "file_name": "${file.name}",
       "topic": "Pending",
       "document_id": <ID of the just-uploaded document in THIS message's attachments>,
       "upload_status": "waiting"
     }
3) You MUST call 'chatdb_add' exactly once per uploaded file.
4) Respond with JUST JSON, in the format:

[
  {
    "document_id": <document_id>,
    "document_filename": "<filename>",
    "document_topic": "<topic>",
    "extraction_status": "<success|error>"
  }
]`;

      await pt.addMessage(formData, msg);
      ok++;

      // Update status after each file
      setNotice(`Uploaded ${ok} of ${files.length - skipped} file(s)...`, 'warn');
    }catch(e){
      fail++;
    }
  }

  setUploading(false);
  setNotice(`Upload finished. Success: ${ok}, Error: ${fail}. Skipped: ${skipped}.`, fail ? 'error' : 'success');

  fileInput.value = '';
  await loadRows();
}
```

**Key Differences:**

| Aspect | Parallel (Recommended) | Serial |
|--------|----------------------|--------|
| Speed | Fast - all files at once | Slower - one at a time |
| Syntax | `Promise.allSettled()` | `for...of` loop |
| Order | No guarantee | Strict order |
| Progress | Bulk complete | Per-file updates |
| Resource Usage | Higher concurrent load | Lower concurrent load |

## Alternative Pattern: Immediate Feedback with Processing Status

This alternative pattern provides **immediate visual feedback** by creating database rows with `PROCESSING` status before AI processes the files. The AI then updates these rows via `chatdb_edit` once processing completes.

### Pattern Overview

**How it works:**
1. User selects files
2. App immediately creates database row per file with `upload_status: 'PROCESSING'`
3. File is uploaded to chat with AI instructions
4. AI reads the uploaded file and uses `chatdb_edit` to update the existing row
5. If text is ready: AI updates to `SUCCESS` with topic and document_id
6. If text isn't ready: Row remains `PROCESSING` (user can refresh later)

**Key Advantage:** Users see files appearing in the table immediately with `PROCESSING` status instead of waiting with no feedback.

### Complete Implementation {#alternative-pattern-implementation}

```html
<div class="container mx-auto p-6 max-w-4xl">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3 text-gray-700">
      <h1 class="text-xl md:text-2xl font-bold">Topic extractor</h1>
    </div>
    <button class="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm" id="refreshBtn" type="button">Refresh</button>
  </div>

  <!-- Uploader -->
  <div class="bg-white rounded-xl shadow p-4">
    <p class="text-gray-600 text-sm mb-3">
      When you upload files, the app immediately creates a database row per file with status <code>PROCESSING</code>. The AI will then read the uploaded file and update the same row via <code>chatdb_edit</code> to set the topic, attach the <code>document_id</code>, and switch status to <code>SUCCESS</code> once text is ready. If the text isn't ready yet, the row remains <code>PROCESSING</code>. The table auto-refreshes every 10s.
    </p>

    <div class="flex flex-col md:flex-row md:items-center gap-3">
      <input accept=".pdf,.docx" class="block w-full text-sm text-gray-700" id="fileInput" multiple type="file" />
      <button class="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2" id="uploadBtn" type="button">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 0l-3 3m3-3l3 3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
        Upload
      </button>
    </div>
    <div class="hidden mt-3 rounded p-3 text-sm" id="uploadNotice"></div>
  </div>

  <!-- Table -->
  <div class="mt-6 bg-white rounded-xl shadow p-4">
    <div class="flex items-center justify-between mb-3">
      <div class="text-sm text-gray-500">Auto-refreshes every 10s</div>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">File Name</th>
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Topic</th>
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Uploaded At</th>
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Upload Status</th>
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white" id="rows"></tbody>
      </table>
    </div>

    <div class="hidden text-center text-gray-500 text-sm py-8" id="emptyState">No uploads yet</div>
  </div>

  <!-- Viewer Modal -->
  <div class="hidden fixed inset-0 bg-black/50 z-50 items-center justify-center" id="viewerModal">
    <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4">
      <div class="flex items-center justify-between p-4 border-b">
        <h3 class="font-semibold text-gray-800">Document Preview</h3>
        <button class="text-gray-500 hover:text-gray-700" id="closeViewer" type="button">✕</button>
      </div>
      <div class="p-4 max-h-[60vh] overflow-auto">
        <pre class="whitespace-pre-wrap text-sm text-gray-800" id="viewerText"></pre>
      </div>
    </div>
  </div>

  <script>
    (function(){
      // Elements
      const rowsEl = document.getElementById('rows');
      const emptyEl = document.getElementById('emptyState');
      const refreshBtn = document.getElementById('refreshBtn');
      const uploadBtn = document.getElementById('uploadBtn');
      const fileInput = document.getElementById('fileInput');
      const noticeEl = document.getElementById('uploadNotice');
      const viewerModal = document.getElementById('viewerModal');
      const closeViewer = document.getElementById('closeViewer');
      const viewerText = document.getElementById('viewerText');

      const MAX_SIZE = 1024 * 1024; // 1MB
      let autoTimer = null;

      function setNotice(text, type){
        if(!text){
          noticeEl.classList.add('hidden');
          noticeEl.textContent = '';
          return;
        }
        const base = 'mt-3 rounded p-3 text-sm ';
        if(type==='success') noticeEl.className = base + 'bg-green-50 border border-green-200 text-green-800';
        else if(type==='warn') noticeEl.className = base + 'bg-yellow-50 border border-yellow-200 text-yellow-800';
        else noticeEl.className = base + 'bg-red-50 border border-red-200 text-red-800';
        noticeEl.textContent = text; noticeEl.classList.remove('hidden');
      }

      function badge(status){
        const norm = String(status || 'PROCESSING').toUpperCase();
        const map = {
          'SUCCESS': 'bg-green-100 text-green-800',
          'PROCESSING': 'bg-yellow-100 text-yellow-800',
          'ERROR': 'bg-red-100 text-red-800'
        };
        const cls = map[norm] || 'bg-gray-100 text-gray-800';
        return `<span class="px-2 py-1 text-xs rounded ${cls}">${norm}</span>`;
      }

      function fmtDate(s){ try { return new Date(s).toLocaleString(); } catch(e){ return s || ''; } }

      function esc(str){
        const d = document.createElement('div'); d.textContent = String(str ?? '');
        return d.innerHTML;
      }

      function rowHTML(item){
        const d = item.data || {};
        const file = d.file_name || '';
        const topic = (d.topic === null || d.topic === undefined || d.topic === '') ? 'Pending' : d.topic;
        const status = d.upload_status || 'PROCESSING';
        const canView = !!d.document_id;
        const viewBtnCls = 'px-3 py-1.5 rounded ' + (canView ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed');
        const viewDisabled = canView ? '' : 'disabled';
        const docId = d.document_id ? String(d.document_id) : '';

        return `
          <tr>
            <td class="px-4 py-2 text-sm text-gray-800">${esc(file)}</td>
            <td class="px-4 py-2 text-sm text-gray-700">${esc(topic)}</td>
            <td class="px-4 py-2 text-sm text-gray-500">${fmtDate(item.created_at)}</td>
            <td class="px-4 py-2 text-sm">${badge(status)}</td>
            <td class="px-4 py-2 text-sm flex items-center gap-2">
              <button class="${viewBtnCls}" ${viewDisabled} onclick="window.__openViewer(${docId ? docId : 'null'})" type="button">View</button>
            </td>
          </tr>
        `;
      }

      async function loadRows(){
        try{
          const entities = await pt.list({ entityNames: ['file_topic'], limit: 200 });
          const items = (entities || []).filter(e => e.entity_name === 'file_topic');
          if(items.length === 0){
            rowsEl.innerHTML = '';
            emptyEl.classList.remove('hidden');
            return;
          }
          emptyEl.classList.add('hidden');
          rowsEl.innerHTML = items.map(rowHTML).join('');
        }catch(err){
          setNotice('Failed to load rows. Please try Refresh.', 'error');
        }
      }

      function setUploading(on){
        uploadBtn.disabled = !!on;
        if(on){ uploadBtn.classList.add('opacity-60','cursor-not-allowed'); }
        else { uploadBtn.classList.remove('opacity-60','cursor-not-allowed'); }
      }

      // NEW: create PROCESSING row first, then upload & let LLM chatdb_edit it to SUCCESS
      async function uploadFiles(){
        const files = Array.from(fileInput.files || []);
        if(files.length === 0){ setNotice('Please select one or more files.', 'warn'); return; }

        const allowed = ['pdf','docx'];
        let skipped = 0;

        // Build parallel jobs for valid files
        const jobs = files.map(file => {
          const ext = (file.name.split('.').pop() || '').toLowerCase();
          if(!allowed.includes(ext) || file.size > MAX_SIZE){
            skipped++;
            return null; // skipped
          }

          return (async () => {
            // 1) Create PROCESSING row immediately
            const created = await pt.add('file_topic', {
              file_name: file.name,
              topic: null,
              document_id: null,
              upload_status: 'PROCESSING'
            });
            const entityId = created.id;

            // 2) Upload file with instructions to EDIT that row via chatdb_edit
            const formData = new FormData();
            formData.append('files', file);

            const msg = `AI Processing Request (Edit Existing Row)

A file has been uploaded from a PrimeThink Live Page as an attachment to THIS message. A database row has ALREADY been created for this file.

You MUST follow EXACTLY:

1) If the uploaded document has extracted text:
   - Derive a concise topic (<= 6 words, noun phrase).
   - Call the tool 'chatdb_edit' EXACTLY ONCE with:
     - entity_id: ${entityId}
     - data: {
         "file_name": "${file.name.replace(/"/g, '\\"')}",
         "topic": "<PUT_TOPIC>",
         "document_id": <ID of the just-uploaded document in THIS message's attachments>,
         "upload_status": "SUCCESS"
       }

2) If the document has NO text yet or cannot be extracted in time:
   - Do NOT create new rows.
   - Do NOT change the existing row. Leave it as "PROCESSING".

3) You MUST NOT call 'chatdb_add'. Only use 'chatdb_edit' with entity_id ${entityId}.

4) Respond with JUST JSON, in the format:
[
  {
    "document_id": <document_id>,
    "document_filename": "${file.name.replace(/"/g, '\\"')}",
    "document_topic": "<topic>",
    "extraction_status": "<success|error>"
  }
]`;

            await pt.addMessage(formData, msg);
          })();
        }).filter(Boolean);

        if(jobs.length === 0){
          setNotice(`No valid files to upload. Allowed: .pdf, .docx; Max size 1MB. Skipped: ${skipped}.`, 'warn');
          return;
        }

        setUploading(true);
        setNotice(`Uploading file(s) and initializing PROCESSING rows...`, 'warn');

        const results = await Promise.allSettled(jobs);
        const ok = results.filter(r => r.status === 'fulfilled').length;
        const fail = results.filter(r => r.status === 'rejected').length;

        setUploading(false);
        setNotice(`Upload initialized. Success: ${ok}, Error: ${fail}, Skipped: ${skipped}.`, fail ? 'error' : 'success');

        // clear input and refresh once
        fileInput.value = '';
        await loadRows();
      }

      // Viewer helpers
      window.__openViewer = async function(docId){
        if(!docId){ return; }
        try{
          const res = await pt.getDocumentText(docId, { to: 2000 });
          const txt = (res && res.text) ? res.text : (res && res.message) ? res.message : 'No text available.';
          viewerText.textContent = txt;
          viewerModal.classList.remove('hidden');
          viewerModal.classList.add('flex');
        }catch(err){
          viewerText.textContent = 'Failed to load document text.';
          viewerModal.classList.remove('hidden');
          viewerModal.classList.add('flex');
        }
      }

      function closeModal(){
        viewerModal.classList.add('hidden');
        viewerModal.classList.remove('flex');
        viewerText.textContent = '';
      }

      closeViewer.addEventListener('click', closeModal);
      viewerModal.addEventListener('click', (e)=>{ if(e.target === viewerModal) closeModal(); });

      // Clear notice when selecting files
      fileInput.addEventListener('change', () => setNotice('', ''));

      // Bindings
      refreshBtn.addEventListener('click', loadRows);
      uploadBtn.addEventListener('click', uploadFiles);

      // Initial load + auto refresh
      (async function init(){
        await loadRows();
        if(autoTimer) clearInterval(autoTimer);
        autoTimer = setInterval(loadRows, 10000);
      })();
    })();
  </script>
</div>
```

### Pattern Comparison: Add-Then-Update vs Upload-Then-Add

| Aspect | Upload-Then-Add (Previous) | Add-Then-Update (This Pattern) |
|--------|----------------------------|--------------------------------|
| **User Feedback** | Delayed - waits for AI | Immediate - shows PROCESSING |
| **Database Operations** | 1 operation (chatdb_add) | 2 operations (pt.add + chatdb_edit) |
| **Orphaned Rows** | None | Possible if upload fails after pt.add |
| **Complexity** | Simpler | More complex |
| **UX Quality** | Good | Excellent |
| **Error Handling** | Easier | Needs cleanup logic |
| **Best For** | Background automation | Interactive user interfaces |

### When to Use Each Pattern

**Use Upload-Then-Add (chatdb_add only):**
- Goals and automation (chat uploads, email)
- Background processing where immediate feedback isn't needed
- Simpler implementation with fewer failure modes
- When you want to avoid orphaned database rows

**Use Add-Then-Update (pt.add + chatdb_edit):**
- Interactive Live Page interfaces
- When immediate visual feedback is critical
- Dashboard-style applications
- When users need to see upload progress in real-time
- Applications where perceived performance matters

### Key Implementation Details

**1. Creating the PROCESSING Row:**
```javascript
const created = await pt.add('file_topic', {
  file_name: file.name,
  topic: null,
  document_id: null,
  upload_status: 'PROCESSING'
});
const entityId = created.id; // Save this to pass to AI
```

**2. AI Instructions for Editing:**
```javascript
const msg = `AI Processing Request (Edit Existing Row)

A database row has ALREADY been created for this file.

1) If the uploaded document has extracted text:
   - Use 'chatdb_edit' with entity_id: ${entityId}
   - Set upload_status: "SUCCESS"

2) If the document has NO text:
   - Leave the row as "PROCESSING"

3) You MUST NOT call 'chatdb_add'. Only use 'chatdb_edit'.`;
```

**3. Status Badge Styling:**
```javascript
function badge(status){
  const map = {
    'SUCCESS': 'bg-green-100 text-green-800',
    'PROCESSING': 'bg-yellow-100 text-yellow-800',
    'ERROR': 'bg-red-100 text-red-800'
  };
  // ...
}
```

### Best Practices for This Pattern

**1. Prevent Orphaned Rows:**
```javascript
let created;
try {
  created = await pt.add('file_topic', { /* ... */ });
  await pt.addMessage(formData, msg);
} catch (error) {
  // If the upload failed after the row was created, delete the orphaned row
  if (created) await pt.delete(created.id);
  throw error;
}
```

**2. Add Retry Mechanism:**
- Add "Re-process" button for PROCESSING rows that stay stuck
- Allow users to manually trigger chatdb_edit attempts

**3. Set Reasonable Timeouts:**
- Auto-refresh every 10 seconds is reasonable
- Consider showing "stuck" indicator for rows PROCESSING > 2 minutes

**4. Clear Status Indicators:**
- Use distinct colors: yellow for PROCESSING, green for SUCCESS
- Add icons or spinners for better visual feedback

### Important Note About Goals

**Goals should always use `chatdb_add`**, not this add-then-update pattern, because:
- Goals are for automation (chat uploads, email forwarding)
- No user is waiting for immediate visual feedback
- Simpler implementation with fewer failure modes
- Avoids orphaned PROCESSING rows when automation fails

The add-then-update pattern is specifically for **interactive Live Page uploads** where immediate user feedback is valuable.

### Using Goals for Direct File Upload

For an even better user experience, you can set a **Goal** in the chat settings so that when users upload files through any channel, they are automatically processed without needing the Live Page interface.

**File Upload Channels:**
- **Direct chat messages**: Users upload files in the conversation
- **Email forwarding**: Files sent to the chat's email address
- **API uploads**: Files uploaded programmatically via the PrimeThink API
- **Chat mentions**: Files uploaded when the chat is mentioned in another conversation

**When to Use Goals:**
- Users upload files through multiple channels (chat, email, API, chat mentions)
- You want automatic processing without user interaction
- You want consistent processing across all upload methods
- You need unified experience regardless of upload source

**Setting Up the Goal:**

Navigate to your chat settings and add this goal:

```
If a user just uploads a pdf file, execute the following prompt:

AI Processing Request

You are given a file uploaded from a PrimeThink Live Page as an attachment to THIS message. Follow EXACTLY:

1) If the documents attached have text: derive a concise topic (<= 6 words, noun phrase) for each one. Then create EXACTLY ONE database record for each using 'chatdb_add' with:
   - entity_name: "file_topic"
   - data: {
       "file_name": "<actual filename>",
       "topic": "<PUT_TOPIC>",
       "document_id": <ID of the just-uploaded document in THIS message's attachments>,
       "upload_status": "success"
     }

2) If all or some of the documents have no text: create EXACTLY ONE database record for the ones with no text using 'chatdb_add' with:
   - entity_name: "file_topic"
   - data: {
       "file_name": "<actual filename>",
       "topic": "Pending",
       "document_id": <ID of the just-uploaded document in THIS message's attachments>,
       "upload_status": "waiting"
     }

3) You MUST call 'chatdb_add' exactly once per uploaded file.
4) Respond with JUST JSON, in the format:

[
  {
    "document_id": <document_id>,
    "document_filename": "<filename>",
    "document_topic": "<topic>",
    "extraction_status": "<success|error>"
  }
]
```

**How Goals Work:**
- Goals are instructions that the AI automatically follows when certain conditions are met
- When a file is uploaded through any channel (chat, email, API, chat mentions), the goal triggers
- The AI processes the file and stores results in the database using `chatdb_add`
- The Live Page will show the results on next refresh
- Users get a unified experience regardless of upload source

**Goal Benefits:**
- **Unified Processing**: Same logic for chat, email, API, and chat mention uploads
- **No UI Required**: Files can be processed without visiting the Live Page
- **Automatic Execution**: Background processing with zero user intervention
- **Consistent Data**: All uploads create identical database structures
- **Multi-Channel Support**: Works seamlessly across all upload methods

### Real-World Applications

1. **Multi-Channel Document Inbox:** Automatically categorize documents from chat, email, API, and chat mentions
2. **Receipt Processing:** Extract data from receipts sent via email or uploaded through API
3. **Contract Management:** Process contracts uploaded via any channel and extract key terms
4. **Research Library:** Organize academic papers by topic, accepting uploads from multiple sources
5. **Customer Support:** Categorize support documents from email, chat mentions, or API integrations
6. **Invoice Processing:** Extract invoice details from PDFs uploaded via email, API, or chat
7. **Legal Documents:** Categorize and index legal filings from any upload source
8. **API-Driven Workflows:** Automated document processing from third-party systems via API
9. **Mention-Based Analysis:** Process documents shared when the chat is mentioned in other conversations

### Best Practices

**Upload Strategy:**
- Use parallel upload as default for best performance
- Switch to serial if you need ordered processing
- Validate file types and sizes before uploading
- Provide immediate feedback during upload
- Handle cases where documents don't have text yet

**Error Handling:**
- Always create a database record, even if processing fails
- Use status field to track processing state
- Provide clear feedback to users
- Allow retry mechanisms

**Performance:**
- Use parallel upload (`Promise.allSettled()`) for faster processing
- Use serial upload when order matters or to limit concurrent requests
- Use appropriate file size limits (1MB recommended)
- Implement auto-refresh for updated statuses
- Cache document text when possible
- Consider AI response format (JSON is easier to parse)

**User Experience:**
- Show immediate feedback when uploading
- Display clear status indicators
- Provide document preview functionality
- Allow manual re-check for waiting documents

## Next Steps

- **[Data Management API Reference](Data-Management-API.md)** - Learn about all pt API methods
- **[Filtering and Querying](Filtering-and-Querying.md)** - Advanced filtering techniques
- **[Pagination](Pagination.md)** - Handle large datasets
- **[Styling with Tailwind CSS](Styling-with-Tailwind.md)** - Improve your UI
- **[Performance and Best Practices](Live-Pages-Best-Practices.md)** - Optimize your applications and learn about using Goals for automation
