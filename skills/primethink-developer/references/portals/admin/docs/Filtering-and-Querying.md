# Filtering and Querying

## Overview

The filtering system in Live Pages supports MongoDB-style operators for powerful, flexible server-side queries. Server-side filtering reduces data transfer and improves performance by only returning matching records.

## Supported Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| Exact match | Simple value | `{status: 'active'}` |
| `$contains` | Case-insensitive partial match | `{text: {$contains: 'grocery'}}` |
| `$ilike` | Case-insensitive LIKE with patterns | `{text: {$ilike: '%search%'}}` |
| `$like` | Case-sensitive LIKE with patterns | `{text: {$like: '%Search%'}}` |
| `$in` | Matches any value in array | `{status: {$in: ['active', 'pending']}}` |
| `$gt` | Greater than | `{age: {$gt: 25}}` |
| `$gte` | Greater than or equal | `{age: {$gte: 18}}` |
| `$lt` | Less than | `{age: {$lt: 50}}` |
| `$lte` | Less than or equal | `{age: {$lte: 65}}` |
| `$ne` | Not equal | `{status: {$ne: 'deleted'}}` |
| `$or` | OR logic across conditions | `{$or: [{status: 'active'}, {priority: 'high'}]}` |

### Operator limitations

**One operator per field.** A filter value object is evaluated with a single operator — `{age: {$gte: 18, $lt: 30}}` applies only the first operator and silently ignores the rest. To combine bounds (for example a date range), apply one bound server-side and filter the other bound client-side on the results, or use `$in` for small discrete ranges.

## Operator Performance

Operators ranked from fastest to slowest:

1. **Exact matches**: `{status: 'active'}` (fastest)
2. **$in operator**: `{status: {$in: ['active', 'pending']}}`
3. **Comparison operators**: `$gt`, `$gte`, `$lt`, `$lte`, `$ne`
4. **Text search**: `$contains`, `$ilike`, `$like`
5. **Complex logic**: `$or` with multiple conditions (slowest)

## Filter Examples

### 1. Partial Text Search

The most common use case - searching for partial matches:

```javascript
// Search tasks containing "grocery" (case-insensitive)
const tasks = await pt.list({
    entityNames: ['task'],
    filters: {
        text: { $contains: 'grocery' }
    }
});
// Matches: "Buy groceries", "GROCERY shopping", "grocery store"
```

### 2. Pattern Matching with Wildcards

Use `$ilike` or `$like` for more complex patterns:

```javascript
// Find emails ending with @gmail.com
const users = await pt.list({
    entityNames: ['user'],
    filters: {
        email: { $ilike: '%@gmail.com' }
    }
});

// Find tasks starting with "urgent" (case-insensitive)
const urgentTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        text: { $ilike: 'urgent%' }
    }
});

// Case-sensitive pattern matching
const tasks = await pt.list({
    entityNames: ['task'],
    filters: {
        text: { $like: 'URGENT%' }
    }
});
```

### 3. Numeric Comparisons

Filter by numeric ranges:

```javascript
// Find users 18 or older
const adults = await pt.list({
    entityNames: ['user'],
    filters: {
        age: { $gte: 18 }
    }
});

// Find tasks with priority 1 to 3
const mediumPriority = await pt.list({
    entityNames: ['task'],
    filters: {
        priority: { $in: [1, 2, 3] }
    }
});

// Find expensive products
const expensiveProducts = await pt.list({
    entityNames: ['product'],
    filters: {
        price: { $gt: 1000 }
    }
});
```

### 4. Multiple Filters (AND Logic)

All filters at the same level are combined with AND:

```javascript
// Find active tasks containing "urgent"
const urgentActiveTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        status: 'active',
        text: { $contains: 'urgent' }
    }
});

// Find adult users with gmail accounts, then apply the upper age bound client-side
// (one operator per field — see "Operator limitations" above)
const adults = await pt.list({
    entityNames: ['user'],
    filters: {
        age: { $gte: 18 },
        email: { $ilike: '%@gmail.com' }
    }
});
const youngGmailUsers = adults.filter(u => u.data.age < 30);
```

### 5. Excluding Items

Use `$ne` to exclude specific values:

```javascript
// Find all tasks except deleted ones
const activeTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        status: { $ne: 'deleted' }
    }
});

// Find tasks not assigned to John
const otherTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        assignee: { $ne: 'john' }
    }
});
```

### 6. Multi-Value Matching with $in

Match any value from a list:

```javascript
// Find tasks with multiple priority levels
const importantTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        priority: { $in: ['high', 'medium'] }
    }
});

// Find tasks assigned to multiple team members
const teamTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        assignee: { $in: ['john', 'jane', 'bob'] }
    }
});

// Find products in multiple categories
const products = await pt.list({
    entityNames: ['product'],
    filters: {
        category: { $in: ['electronics', 'computers', 'accessories'] }
    }
});
```

### 7. OR Logic with $or

Match records that satisfy any condition:

```javascript
// Find tasks that are either high priority OR overdue
const urgentTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        $or: [
            { priority: 'high' },
            { status: 'overdue' }
        ]
    }
});

// Complex OR with text search
const searchResults = await pt.list({
    entityNames: ['task'],
    filters: {
        $or: [
            { text: { $contains: 'urgent' } },
            { description: { $contains: 'urgent' } },
            { tags: { $contains: 'urgent' } }
        ]
    }
});

// OR with multiple conditions
const criticalItems = await pt.list({
    entityNames: ['task'],
    filters: {
        $or: [
            { priority: 'critical' },
            { due_date: { $lt: '2024-03-20' } },
            { escalated: "true" }
        ]
    }
});
```

### 8. Combining AND and OR Logic

Mix AND and OR for complex queries:

```javascript
// Find incomplete tasks assigned to specific users
const myTeamTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        completed: false,  // AND condition
        $or: [               // OR conditions within AND
            { assignee: 'john' },
            { assignee: 'jane' }
        ]
    }
});

// Same result using $in (cleaner for multiple values)
const myTeamTasksSimplified = await pt.list({
    entityNames: ['task'],
    filters: {
        completed: false,
        assignee: { $in: ['john', 'jane'] }
    }
});

// Complex combination: Active high-priority OR overdue tasks
const actionableItems = await pt.list({
    entityNames: ['task'],
    filters: {
        status: 'active',    // Must be active (AND)
        $or: [               // AND either high priority OR overdue
            { priority: 'high' },
            { due_date: { $lt: '2024-03-20' } }
        ]
    }
});
```

### 9. Boolean and Date Filters

```javascript
// Boolean filters — use real booleans
const completedTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        completed: true,
        status: "active"
    }
});

// Date filters with comparisons — one bound server-side, the other client-side
// (one operator per field — see "Operator limitations" above)
const fromToday = await pt.list({
    entityNames: ['task'],
    filters: {
        due_date: { $gte: "2024-03-15" }   // Tasks due today or later
    }
});
const upcomingTasks = fromToday.filter(t => t.data.due_date < "2024-04-01");  // But before April

// Tasks created before a certain date
const oldTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        created_date: { $lt: "2024-03-01" }
    }
});
```

### 10. Filtering by Creator

The `creator_user_id` field is a **column-level filter** (not part of the entity's JSON `data`), making it more efficient:

```javascript
// Get entities created by current user (exact match)
const members = await pt.getChatMembers();
const currentUser = members.find(m => m.is_logged_user);

const myTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        creator_user_id: currentUser.id
    }
});

// Get entities created by multiple users ($in operator)
const teamIds = [123, 456, 789];
const teamTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        creator_user_id: { $in: teamIds }
    }
});

// Get entities NOT created by specific user ($ne operator)
const othersTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        creator_user_id: { $ne: currentUser.id }
    }
});

// Combine creator filter with data filters
const myActiveTasks = await pt.list({
    entityNames: ['task'],
    filters: {
        creator_user_id: currentUser.id,  // Column-level filter
        completed: false,                  // data-field filter
        priority: { $in: ['high', 'medium'] }  // data-field filter
    }
});
```

## Real-World Filtering Examples

### Project Management Dashboard

```javascript
// Get tasks for sprint planning
async function getSprintTasks() {
    return await pt.list({
        entityNames: ['task'],
        filters: {
            // Must be unfinished
            completed: false,
            // High or medium priority only
            priority: { $in: ['high', 'medium'] },
            // Assigned to active team members
            $or: [
                { assignee: { $in: ['john', 'jane', 'mike'] } },
                { status: 'unassigned' }
            ]
        },
        limit: 100
    });
}

// Find overdue or urgent items
async function getUrgentItems() {
    const today = new Date().toISOString().split('T')[0];

    return await pt.list({
        entityNames: ['task'],
        filters: {
            completed: false,
            $or: [
                { priority: 'high' },
                { due_date: { $lt: today } },
                { status: 'blocked' }
            ]
        }
    });
}
```

### Content Management System

```javascript
// Advanced content search
async function searchContent(query, filters = {}) {
    const searchFilters = {
        // Search across multiple content fields
        $or: [
            { title: { $contains: query } },
            { content: { $contains: query } },
            { tags: { $contains: query } }
        ]
    };

    // Add optional filters
    if (filters.status) {
        searchFilters.status = { $in: Array.isArray(filters.status) ? filters.status : [filters.status] };
    }

    if (filters.author) {
        searchFilters.author = { $in: Array.isArray(filters.author) ? filters.author : [filters.author] };
    }

    if (filters.dateRange) {
        // Lower bound server-side; the upper bound is applied client-side below
        // (one operator per field)
        searchFilters.published_date = { $gte: filters.dateRange.start };
    }

    let results = await pt.list({
        entityNames: ['article', 'blog_post', 'page'],
        filters: searchFilters,
        limit: 50
    });

    if (filters.dateRange) {
        results = results.filter(r => r.data.published_date <= filters.dateRange.end);
    }

    return results;
}

// Usage
const results = await searchContent('javascript', {
    status: ['published', 'featured'],
    author: ['john', 'jane'],
    dateRange: { start: '2024-01-01', end: '2024-12-31' }
});
```

### E-commerce Product Catalog

```javascript
// Product filtering with multiple criteria
async function filterProducts(criteria) {
    const filters = {};

    // Category filter
    if (criteria.categories?.length) {
        filters.category = { $in: criteria.categories };
    }

    // Price range — apply the lower bound server-side; the upper bound is
    // filtered client-side below (one operator per field — see "Operator limitations")
    if (criteria.minPrice !== undefined) {
        filters.price = { $gte: criteria.minPrice };
    } else if (criteria.maxPrice !== undefined) {
        filters.price = { $lte: criteria.maxPrice };
    }

    // Text search across multiple fields
    if (criteria.search) {
        filters.$or = [
            { name: { $contains: criteria.search } },
            { description: { $contains: criteria.search } },
            { brand: { $contains: criteria.search } }
        ];
    }

    // Availability and rating filters
    if (criteria.inStock) {
        filters.stock_quantity = { $gt: 0 };
    }

    if (criteria.minRating) {
        filters.rating = { $gte: criteria.minRating };
    }

    let products = await pt.list({
        entityNames: ['product'],
        filters: filters,
        limit: criteria.limit || 24
    });

    // Apply the upper price bound client-side when both bounds were provided
    if (criteria.minPrice !== undefined && criteria.maxPrice !== undefined) {
        products = products.filter(p => p.data.price <= criteria.maxPrice);
    }

    return products;
}

// Usage
const products = await filterProducts({
    categories: ['electronics', 'computers'],
    minPrice: 100,
    maxPrice: 1000,
    search: 'laptop',
    inStock: true,
    minRating: 4
});
```

### Customer Support System

```javascript
// Find tickets requiring attention
async function getTicketsNeedingAttention() {
    return await pt.list({
        entityNames: ['ticket'],
        filters: {
            $or: [
                // High priority tickets
                { priority: 'high' },
                // Old unresolved tickets
                {
                    status: { $in: ['open', 'pending'] },
                    created_date: { $lt: '2024-03-01' }
                },
                // Escalated tickets
                { escalated: "true" }
            ]
        }
    });
}

// Search tickets by customer or issue
async function searchTickets(query, assignee = null) {
    const filters = {
        $or: [
            { subject: { $contains: query } },
            { description: { $contains: query } },
            { customer_name: { $contains: query } }
        ]
    };

    if (assignee) {
        filters.assignee = assignee;
    }

    return await pt.list({
        entityNames: ['ticket'],
        filters: filters,
        limit: 50
    });
}
```

## Advanced Search Implementation

### Smart Search with Multiple Strategies

```javascript
// Smart search functionality with fallback strategies
async function smartSearch(query, entityTypes = ['task']) {
    // Try different search strategies for best results
    const strategies = [
        // Exact match first (fastest)
        { text: query },
        // Then partial match (most common)
        { text: { $contains: query } },
        // Finally pattern matching (most flexible)
        { text: { $ilike: `%${query}%` } }
    ];

    for (const filter of strategies) {
        const results = await pt.list({
            entityNames: entityTypes,
            filters: filter,
            limit: 20
        });

        if (results.length > 0) {
            return results;
        }
    }

    return [];
}
```

### Live Search with Debouncing

```javascript
// Real-time search with performance optimization
function setupLiveSearch() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
            clearResults();
            return;
        }

        searchTimeout = setTimeout(async () => {
            const results = await pt.list({
                entityNames: ['task'],
                filters: {
                    $or: [
                        { text: { $contains: query } },
                        { description: { $contains: query } }
                    ]
                },
                limit: 20
            });
            displayResults(results);
        }, 300); // Debounce for 300ms
    });
}
```

### Multi-Field Advanced Search

```javascript
// Advanced multi-field search using $or
async function advancedSearch(query, options = {}) {
    const searchFields = options.fields || ['text', 'description', 'title'];

    const filters = {
        $or: searchFields.map(field => ({
            [field]: { $contains: query }
        }))
    };

    // Add additional filters alongside the OR condition
    if (options.status) {
        filters.status = { $in: Array.isArray(options.status) ? options.status : [options.status] };
    }

    if (options.priority) {
        filters.priority = { $in: Array.isArray(options.priority) ? options.priority : [options.priority] };
    }

    return await pt.list({
        entityNames: options.entityTypes || ['task'],
        filters: filters,
        limit: options.limit || 50
    });
}

// Usage examples
const results = await advancedSearch('meeting', {
    fields: ['text', 'description', 'notes'],
    status: ['active', 'pending'],
    priority: ['high', 'medium'],
    limit: 20
});
```

## Filter Best Practices

### 1. Use $in Instead of Multiple $or Conditions

```javascript
// ✅ GOOD: Efficient multi-value filter
const goodFilter = {
    status: { $in: ['active', 'pending', 'in_progress'] },
    assignee: 'john'
};

// ❌ AVOID: Inefficient $or for same field
const inefficientFilter = {
    $or: [
        { status: 'active' },
        { status: 'pending' },
        { status: 'in_progress' }
    ],
    assignee: 'john'
};
```

### 2. Put Most Selective Filters First

```javascript
// ✅ GOOD: Most selective filter first
const efficientFilter = {
    user_id: 123,              // Very selective
    status: 'active',          // Moderately selective
    category: { $in: ['a', 'b', 'c'] }  // Less selective
};
```

### 3. Combine Filters Effectively

```javascript
// ✅ GOOD: Combining filters effectively
const efficientFilter = {
    completed: false,           // Most selective first
    priority: { $in: ['high', 'medium'] },
    $or: [                        // $or last and limited
        { assignee: 'john' },
        { status: 'unassigned' }
    ]
};
```

### 4. Use Appropriate Operators

```javascript
// ✅ GOOD: Use exact match when possible
const exactMatch = { status: 'active' };

// ❌ AVOID: Unnecessary pattern matching
const unnecessaryPattern = { status: { $contains: 'active' } };
```

## Data Type Notes

- **Text-normalized matching**: Equality filters compare the text rendering of the stored JSON value, so a type mismatch is forgiven when the text form is the same — the boolean `true` and the string `"true"` are interchangeable in both storage and filters. Prefer real JSON types
- **Boolean matching**: Use real booleans (`completed: false`) in both stored data and filters
- **Range operators**: `$gt`/`$gte`/`$lt`/`$lte` compare numerically when given a number (`age: { $gte: 18 }`) and as text when given a string — text comparison is correct for ISO date strings (`due_date: { $lt: "2024-04-01" }`)
- **Mixed filters**: You can combine exact matches with operators in the same query
- **Column-level vs data-field filters**: `creator_user_id` is a dedicated column (not part of the entity's JSON `data`), making it more efficient

```javascript
// Example showing data types
const filters = {
    completed: true,            // Boolean
    priority: "high",           // String
    age: { $gte: 18 },         // Numeric comparison
    email: { $ilike: '%@gmail.com' }  // Pattern matching
};
```

## Security Features

The filtering system includes built-in security:

- **Parameterized queries** prevent SQL injection
- **Server validates** allowed filter fields per entity type
- **Input validation** for field names, value lengths, and number of filters
- **Rate limiting** for complex queries

## Debugging Filters

Test your filters incrementally:

```javascript
// Test your filters step by step
async function debugFilters() {
    // Start simple
    console.log('All tasks:', await pt.list({ entityNames: ['task'] }));

    // Add basic filter
    console.log('Active tasks:', await pt.list({
        entityNames: ['task'],
        filters: { status: 'active' }
    }));

    // Test $contains operator
    console.log('Tasks with "urgent":', await pt.list({
        entityNames: ['task'],
        filters: { text: { $contains: 'urgent' } }
    }));

    // Test $in operator
    console.log('High/Medium priority tasks:', await pt.list({
        entityNames: ['task'],
        filters: { priority: { $in: ['high', 'medium'] } }
    }));

    // Test $or operator
    console.log('Urgent or high priority tasks:', await pt.list({
        entityNames: ['task'],
        filters: {
            $or: [
                { text: { $contains: 'urgent' } },
                { priority: 'high' }
            ]
        }
    }));
}
```

## Next Steps

- **[Data Management API Reference](Data-Management-API.md)** - Learn about all pt API methods
- **[Pagination](Pagination.md)** - Handle large result sets efficiently
- **[Complete Examples](Live-Pages-Examples.md)** - See filtering in action
- **[Performance and Best Practices](Live-Pages-Best-Practices.md)** - Optimize your queries
