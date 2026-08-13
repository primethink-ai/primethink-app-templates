# Pagination

## Overview

Live Pages supports server-side pagination to efficiently handle large datasets. Instead of loading all records at once, pagination loads data in smaller chunks, reducing data transfer and improving performance.

## Pagination Methods

There are two main approaches to pagination:

1. **Page-based pagination**: Uses `page` and `pageSize` parameters (recommended for UIs)
2. **Offset-based pagination**: Uses `limit` and `offset` parameters (more flexible)

## Page-Based Pagination

Page-based pagination is the most intuitive approach for user interfaces with "Previous" and "Next" buttons.

### Basic Implementation {#page-based-basic}

```javascript
let currentPage = 1;
let pageSize = 20;
let hasMorePages = false;

async function loadPage(page) {
    const result = await pt.list({
        entityNames: ['task'],
        filters: { status: 'active' },
        page: page,
        pageSize: pageSize,
        returnMetadata: true
    });

    currentPage = page;
    hasMorePages = result.pagination.has_more;

    return result.entities.filter(e => e.entity_name === 'task');
}

// Navigation functions
async function goToNextPage() {
    if (hasMorePages) {
        const tasks = await loadPage(currentPage + 1);
        displayTasks(tasks);
    }
}

async function goToPreviousPage() {
    if (currentPage > 1) {
        const tasks = await loadPage(currentPage - 1);
        displayTasks(tasks);
    }
}

async function goToFirstPage() {
    const tasks = await loadPage(1);
    displayTasks(tasks);
}
```

### Response Structure with Metadata

When `returnMetadata: true` is set, the response includes pagination information:

```javascript
{
    entities: [...],    // Array of entity objects
    count: 20,          // Number of items in this response
    pagination: {
        page: 3,        // Current page number
        page_size: 20,  // Items per page
        has_more: true, // true if more pages exist
        limit: 20,      // Same as page_size
        offset: 40      // Starting position (calculated)
    }
}
```

### Complete Pagination UI Example

```html
<div class="container mx-auto p-6">
    <!-- Content Area -->
    <div id="tasksList" class="space-y-4 mb-6">
        <!-- Tasks will be displayed here -->
    </div>

    <!-- Pagination Controls -->
    <div class="flex justify-center items-center gap-4 bg-white rounded-lg shadow-md p-4">
        <button
            id="firstPageBtn"
            onclick="goToFirstPage()"
            class="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
        >
            First
        </button>
        <button
            id="prevPageBtn"
            onclick="goToPreviousPage()"
            class="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
        >
            Previous
        </button>
        <span id="pageInfo" class="text-gray-700 font-medium">
            Page 1
        </span>
        <button
            id="nextPageBtn"
            onclick="goToNextPage()"
            class="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
        >
            Next
        </button>
    </div>
</div>

<script>
let currentPage = 1;
let pageSize = 20;
let hasMorePages = false;
let currentFilters = {};

async function loadPage(page, resetFilters = false) {
    if (resetFilters) {
        currentPage = 1;
        page = 1;
    }

    try {
        const result = await pt.list({
            entityNames: ['task'],
            filters: currentFilters,
            page: page,
            pageSize: pageSize,
            returnMetadata: true
        });

        currentPage = page;
        hasMorePages = result.pagination.has_more;

        const tasks = result.entities.filter(e => e.entity_name === 'task');
        displayTasks(tasks);
        updatePaginationControls();

        return tasks;
    } catch (error) {
        console.error('Error loading page:', error);
        return [];
    }
}

function updatePaginationControls() {
    document.getElementById('pageInfo').textContent = `Page ${currentPage}`;
    document.getElementById('firstPageBtn').disabled = currentPage === 1;
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = !hasMorePages;
}

async function goToFirstPage() {
    await loadPage(1);
}

async function goToPreviousPage() {
    if (currentPage > 1) {
        await loadPage(currentPage - 1);
    }
}

async function goToNextPage() {
    if (hasMorePages) {
        await loadPage(currentPage + 1);
    }
}

function displayTasks(tasks) {
    const html = tasks.map(task => `
        <div class="bg-white p-4 rounded shadow">
            <p>${task.data.text}</p>
        </div>
    `).join('');
    document.getElementById('tasksList').innerHTML = html;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPage(1);
});
</script>
```

## Offset-Based Pagination

Offset-based pagination uses `limit` and `offset` for more flexible control.

### Basic Implementation {#offset-based-basic}

```javascript
let currentOffset = 0;
const pageSize = 20;

async function loadPageByOffset(offset) {
    const result = await pt.list({
        entityNames: ['task'],
        filters: { status: 'active' },
        limit: pageSize,
        offset: offset,
        returnMetadata: true
    });

    currentOffset = offset;
    return result.entities.filter(e => e.entity_name === 'task');
}

// Navigate by offset
async function nextPage() {
    const tasks = await loadPageByOffset(currentOffset + pageSize);
    displayTasks(tasks);
}

async function previousPage() {
    if (currentOffset >= pageSize) {
        const tasks = await loadPageByOffset(currentOffset - pageSize);
        displayTasks(tasks);
    }
}

async function jumpToPage(pageNumber) {
    const offset = (pageNumber - 1) * pageSize;
    const tasks = await loadPageByOffset(offset);
    displayTasks(tasks);
}
```

## Pagination with Filtering

Maintain pagination state when filters change:

```javascript
class PaginatedList {
    constructor(pageSize = 20) {
        this.pageSize = pageSize;
        this.currentPage = 1;
        this.currentFilters = {};
        this.hasMore = false;
    }

    async search(filters, resetPage = true) {
        if (resetPage) {
            this.currentPage = 1;
        }

        this.currentFilters = filters;
        return await this.loadCurrentPage();
    }

    async loadCurrentPage() {
        const result = await pt.list({
            entityNames: ['task'],
            filters: this.currentFilters,
            page: this.currentPage,
            pageSize: this.pageSize,
            returnMetadata: true
        });

        this.hasMore = result.pagination.has_more;
        return result.entities.filter(e => e.entity_name === 'task');
    }

    async nextPage() {
        if (this.hasMore) {
            this.currentPage++;
            return await this.loadCurrentPage();
        }
        return [];
    }

    async previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            return await this.loadCurrentPage();
        }
        return [];
    }

    async goToPage(page) {
        this.currentPage = page;
        return await this.loadCurrentPage();
    }
}

// Usage
const taskList = new PaginatedList(20);

// Load first page
await taskList.search({ status: 'active' });

// Change filters (resets to page 1)
await taskList.search({ status: 'active', priority: 'high' });

// Navigate pages (maintains filters)
await taskList.nextPage();
await taskList.previousPage();
```

## Infinite Scroll

Implement infinite scrolling for a seamless user experience:

```javascript
class InfiniteScrollManager {
    constructor(pageSize = 20) {
        this.pageSize = pageSize;
        this.currentPage = 0;
        this.loading = false;
        this.hasMore = true;
        this.allData = [];
    }

    async loadMore(filters = {}) {
        if (this.loading || !this.hasMore) return;

        this.loading = true;
        this.currentPage++;

        try {
            const result = await pt.list({
                entityNames: ['task'],
                filters: filters,
                page: this.currentPage,
                pageSize: this.pageSize,
                returnMetadata: true
            });

            const newData = result.entities.filter(e => e.entity_name === 'task');

            this.hasMore = result.pagination.has_more;
            this.allData = [...this.allData, ...newData];
            this.appendToUI(newData);

            return newData;

        } catch (error) {
            console.error('Error loading more data:', error);
            return [];
        } finally {
            this.loading = false;
        }
    }

    appendToUI(newData) {
        const container = document.getElementById('tasksList');
        newData.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'bg-white p-4 rounded shadow mb-2';
            taskElement.textContent = task.data.text;
            container.appendChild(taskElement);
        });
    }

    reset() {
        this.currentPage = 0;
        this.hasMore = true;
        this.allData = [];
        document.getElementById('tasksList').innerHTML = '';
    }
}

// Setup infinite scroll
const infiniteScroll = new InfiniteScrollManager(20);

// Load initial data
await infiniteScroll.loadMore({ status: 'active' });

// Setup scroll listener
window.addEventListener('scroll', () => {
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.body.offsetHeight - 1000;

    if (scrollPosition >= threshold) {
        infiniteScroll.loadMore({ status: 'active' });
    }
});
```

## Pagination with Caching

Improve performance by caching previously loaded pages:

```javascript
class CachedPaginationManager {
    constructor(pageSize = 20) {
        this.pageSize = pageSize;
        this.currentPage = 1;
        this.currentFilters = {};
        this.cache = new Map();
    }

    async loadPage(page, filters = {}) {
        const cacheKey = this.getCacheKey(page, filters);

        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Load from server
        const result = await pt.list({
            entityNames: ['task'],
            filters: filters,
            page: page,
            pageSize: this.pageSize,
            returnMetadata: true
        });

        const data = {
            entities: result.entities.filter(e => e.entity_name === 'task'),
            hasMore: result.pagination.has_more
        };

        // Cache the result
        this.cache.set(cacheKey, data);

        return data;
    }

    getCacheKey(page, filters) {
        return `${page}-${JSON.stringify(filters)}`;
    }

    clearCache() {
        this.cache.clear();
    }

    async search(filters, resetPage = true) {
        if (resetPage) {
            this.currentPage = 1;
        }
        this.currentFilters = filters;
        return await this.loadPage(this.currentPage, filters);
    }

    async nextPage() {
        this.currentPage++;
        return await this.loadPage(this.currentPage, this.currentFilters);
    }

    async previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            return await this.loadPage(this.currentPage, this.currentFilters);
        }
        return await this.loadPage(this.currentPage, this.currentFilters);
    }
}
```

## Cursor-Based Pagination

For very large datasets, cursor-based pagination can be more efficient:

```javascript
class CursorPaginationManager {
    constructor(pageSize = 20) {
        this.pageSize = pageSize;
        this.cursors = []; // Store cursors for each page
        this.currentPage = 0;
    }

    async loadFirstPage(filters = {}) {
        this.currentPage = 1;
        this.cursors = [];

        const result = await pt.list({
            entityNames: ['task'],
            filters: filters,
            limit: this.pageSize,
            offset: 0,
            returnMetadata: true
        });

        const data = result.entities.filter(e => e.entity_name === 'task');

        if (data.length > 0) {
            // Store the last item's ID as cursor for next page
            this.cursors[1] = data[data.length - 1].id;
        }

        return {
            data,
            hasMore: result.pagination.has_more
        };
    }

    async loadNextPage(filters = {}) {
        if (this.cursors[this.currentPage]) {
            this.currentPage++;

            // Use the cursor to get items after the last loaded item
            const enhancedFilters = {
                ...filters,
                id: { $gt: this.cursors[this.currentPage - 1] }
            };

            const result = await pt.list({
                entityNames: ['task'],
                filters: enhancedFilters,
                limit: this.pageSize,
                offset: 0,
                returnMetadata: true
            });

            const data = result.entities.filter(e => e.entity_name === 'task');

            if (data.length > 0) {
                this.cursors[this.currentPage] = data[data.length - 1].id;
            }

            return {
                data,
                hasMore: result.pagination.has_more
            };
        }

        return { data: [], hasMore: false };
    }
}

// Usage
const cursor = new CursorPaginationManager(20);
const firstPage = await cursor.loadFirstPage({ status: 'active' });
const secondPage = await cursor.loadNextPage({ status: 'active' });
```

## Pagination Best Practices

### 1. Use Reasonable Page Sizes

```javascript
// ✅ GOOD: Reasonable page size
const OPTIMAL_PAGE_SIZE = 20;

// ❌ AVOID: Too large
const TOO_LARGE = 1000;

// ❌ AVOID: Too small (too many requests)
const TOO_SMALL = 5;
```

### 2. Reset to Page 1 When Filters Change

```javascript
// ✅ GOOD: Reset page when filters change
async function applyFilters(newFilters) {
    currentPage = 1;
    currentFilters = newFilters;
    await loadPage(currentPage);
}
```

### 3. Show Loading States

```javascript
async function loadPage(page) {
    // Show loading indicator
    document.getElementById('loading').style.display = 'block';

    try {
        const result = await pt.list({
            entityNames: ['task'],
            page: page,
            pageSize: 20,
            returnMetadata: true
        });

        displayTasks(result.entities);
    } finally {
        // Hide loading indicator
        document.getElementById('loading').style.display = 'none';
    }
}
```

### 4. Disable Navigation During Loading

```javascript
let isLoading = false;

async function loadPage(page) {
    if (isLoading) return;

    isLoading = true;
    updateButtonStates();

    try {
        const result = await pt.list({
            entityNames: ['task'],
            page: page,
            pageSize: 20,
            returnMetadata: true
        });

        displayTasks(result.entities);
    } finally {
        isLoading = false;
        updateButtonStates();
    }
}

function updateButtonStates() {
    const buttons = document.querySelectorAll('.pagination-btn');
    buttons.forEach(btn => {
        btn.disabled = isLoading;
    });
}
```

### 5. Handle Empty Results

```javascript
function displayTasks(tasks) {
    const container = document.getElementById('tasksList');

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                No tasks found
            </div>
        `;
        return;
    }

    container.innerHTML = tasks.map(task => `
        <div class="bg-white p-4 rounded shadow mb-2">
            ${task.data.text}
        </div>
    `).join('');
}
```

## Performance Optimization

### 1. Avoid Offset for Very Large Datasets

For datasets with millions of records, offset-based pagination can become slow:

```javascript
// ❌ SLOW: Large offset
const result = await pt.list({
    entityNames: ['task'],
    limit: 20,
    offset: 1000000  // Very slow for large offsets
});

// ✅ BETTER: Use cursor-based pagination
const result = await pt.list({
    entityNames: ['task'],
    filters: { id: { $gt: lastSeenId } },
    limit: 20
});
```

### 2. Cache Page Results

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

### 3. Prefetch Next Page

```javascript
async function loadPageWithPrefetch(page, filters) {
    // Load current page
    const currentPromise = pt.list({
        entityNames: ['task'],
        filters: filters,
        page: page,
        pageSize: 20,
        returnMetadata: true
    });

    // Prefetch next page in parallel
    const nextPromise = pt.list({
        entityNames: ['task'],
        filters: filters,
        page: page + 1,
        pageSize: 20,
        returnMetadata: true
    });

    // Wait for current page
    const current = await currentPromise;

    // Cache next page result
    nextPromise.then(result => {
        cachePageResult(page + 1, filters, result);
    });

    return current;
}
```

## Next Steps

- **[Filtering and Querying](Filtering-and-Querying.md)** - Combine pagination with filters
- **[Data Management API Reference](Data-Management-API.md)** - Learn about all pt API methods
- **[Complete Examples](Live-Pages-Examples.md)** - See pagination in full applications
- **[Performance and Best Practices](Live-Pages-Best-Practices.md)** - Optimize your Live Pages
