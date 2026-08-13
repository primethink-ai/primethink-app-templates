# PrimeThink Manage JavaScript Library

## Overview

`primethink_manage.js` provides typed JavaScript wrappers for Obviously Manage API tools. It simplifies calling Manage-related tools from Live Apps by providing a clean, documented API with proper parameter handling.

The library uses [`pt.callToolDirect()`](primethink_js_call_tool_direct.md) under the hood to invoke the tools directly, bypassing LLM interpretation for faster, more predictable results.

## Installation

Include the script in your HTML:

```html
<script src="/static/primethink_manage.js?v=20260309"></script>
```

The library exposes a global `ptManage` object and a `ptManageReady` promise.

!!! tip "Cache Busting"
    Add a version query parameter (e.g., `?v=20260309`) to the script URL. Update this value when the library changes to ensure browsers load the latest version instead of a cached copy.

### Initialization Options

`primethink.js` is automatically injected by the platform. The `primethink_manage.js` script polls for `pt` every 50ms for up to 10 seconds, then initializes `window.ptManage` as soon as it's available.

**Option 1 — Await the ready promise:**

```javascript
// Wait for ptManage to be ready before using it
await window.ptManageReady;
const baseUrlResult = await ptManage.getBaseUrl();
```

**Option 2 — Include the script tag directly in HTML:**

```html
<script src="/static/primethink_manage.js?v=20260309"></script>
```

The script will self-initialize once `pt` is available. `primethink.js` is automatically injected by the platform, so you don't need to include it manually.

The `window.ptManageReady` promise resolves when the library is fully initialized and safe to use.

## Quick Start

```javascript
// Wait for the library to be ready
await window.ptManageReady;

// List organizations
const orgs = await ptManage.listOrganizations();
console.log(orgs.organizations);

// Search for matters
const matters = await ptManage.searchMatters('trademark');
console.log(matters.matters);

// Get matter details
const details = await ptManage.getMatterDetails(73597);
console.log(details.matter);
```

---

## Response Format

All methods return JSON objects. The API response format has some important characteristics to understand:

### Automatic Field Removal

The system automatically removes certain fields from responses:

- **Empty fields** — Depending on the endpoint, fields with no value may either be returned as `null`/`""` or omitted from the response entirely. Always guard for both cases (e.g. `client.country_repr?.value`); do not rely on a field being present just because it appears in the documented examples.

- **Base64 image fields** — Fields containing base64-encoded images (such as `image70`) are removed from responses by default to reduce response size, and are not documented in the response structures below. Methods that support it can include them by passing `returnImage: true`.

### Working with Responses

Because empty fields are removed, you should always check for field existence before accessing nested properties:

```javascript
// Safe access pattern
const result = await ptManage.getMatterDetails(73597);
const statusValue = result.matter?.status?.value ?? 'Unknown';
const contacts = result.matter?.major_contacts ?? [];

// Or use optional chaining with defaults
const clientName = result.matter?.major_contact_relations?.[0]?.contact || 'No client';
```

### Response Structure Examples

The response structures documented for each method below show the **possible** fields that may be returned. In practice, any field that would be empty will simply be absent from the actual response.

---

## API Reference

### Configuration

#### `getBaseUrl()`

Returns the configured Obviously Manage base URL for the current user.

**Returns:** `Promise<object>`

```javascript
const result = await ptManage.getBaseUrl();
console.log(`Manage URL: ${result.base_url}`);
```

**Response Structure:**

```json
{
  "base_url": "https://manage.obviously.com"
}
```

---

### Organization Management

#### `listOrganizations(options)`

List all organizations the user has access to.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.page` | `number` | `1` | Page number |
| `options.pageSize` | `number` | `10` | Results per page |

**Returns:** `Promise<object>`

```javascript
const result = await ptManage.listOrganizations();
result.organizations.forEach(org => {
    console.log(`${org.title} (${org.code}) - ID: ${org.id}`);
});

// With pagination
const result2 = await ptManage.listOrganizations({ page: 2, pageSize: 20 });
```

**Response Structure:**

```json
{
  "organizations": [
    {
      "id": 10001,
      "title": "Acme Corporation",
      "code": "ACME",
      "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "is_superorg": true,
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    },
    {
      "id": 10002,
      "title": "Global Industries Ltd",
      "code": "GIND",
      "token": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "is_superorg": false,
      "uuid": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
    }
  ]
}
```

---

#### `setPrimaryOrganization(organizationId)`

Set the active organization context for subsequent API calls.

| Parameter | Type | Description |
|-----------|------|-------------|
| `organizationId` | `number` | Organization ID to set as primary |

```javascript
const result = await ptManage.setPrimaryOrganization(10001);
console.log(`Now working in: ${result.title}`);
```

**Response Structure:**

```json
{
  "id": 10001,
  "title": "Acme Corporation",
  "code": "ACME",
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

#### `getPrimaryOrganisationInfo()`

Retrieves information about the user's currently active (primary) organisation in Obviously Manage.

**Returns:** `Promise<object>`

```javascript
// Get current organisation info
const org = await ptManage.getPrimaryOrganisationInfo();
console.log(`Current org: ${org.title} (ID: ${org.id})`);

// Check which organisation is active before switching
const current = await ptManage.getPrimaryOrganisationInfo();
console.log(`Working in: ${current.title} (${current.code})`);

// Use it to confirm org context before performing operations
const activeOrg = await ptManage.getPrimaryOrganisationInfo();
if (activeOrg.id !== expectedOrgId) {
    await ptManage.setPrimaryOrganization(expectedOrgId);
}
```

**Response Structure:**

```json
{
  "id": 10001,
  "title": "Acme Corporation",
  "code": "ACME",
  "type": 1,
  "type_repr": "IP-only firm (private practice)",
  "two_letter_code": "AC",
  "email_local_part": "acmecorp",
  "owner": 12345,
  "country": null,
  "street_address": "",
  "city": "",
  "postal_code": "",
  "region": "",
  "storage_type": "od",
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "is_superorg": true,
  "created": "2020-02-21T10:37:23.550538Z",
  "repr": "Acme Corporation (ACME)"
}
```

---

### Matter Search & Details

#### `searchMatters(query, options)`

Search for matters by text query.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | `string` | — | Search query |
| `options.page` | `number` | `1` | Page number |
| `options.pageSize` | `number` | `10` | Results per page |
| `options.returnImage` | `boolean` | `false` | Include image70 field |

```javascript
const result = await ptManage.searchMatters('test', {
    page: 1,
    pageSize: 10
});
result.matters.forEach(matter => {
    console.log(`${matter.ref_no}: ${matter.title}`);
});
```

**Response Structure:**

```json
{
  "matters": [
    {
      "id": 73597,
      "title": "UK Trade Mark Application: United Kingdom: 'TESCO Bank'...",
      "ref_no": "TRA.GB.073597",
      "matter_ref": "2260/20003",
      "subject_name": "BOOST",
      "state": "active",
      "organization": 10001,
      "defining": {
        "id": 7115,
        "value": "United Kingdom",
        "code": "GB",
        "is_active": true
      },
      "type": {
        "id": 3204,
        "value": "Trade Mark Registration",
        "is_active": true
      },
      "status": {
        "id": 897,
        "value": "Registered (Test)",
        "is_active": true
      },
      "sub_type": {
        "id": 202,
        "value": "UK Trade Mark Application",
        "is_active": true
      },
      "matter_type": {
        "id": 40,
        "title": "Trade Mark",
        "slug": "trade-mark",
        "code": "TRA"
      },
      "major_contacts": ["Tesco Stores Limited (Provided) ()"],
      "major_contact_relations": [
        {
          "relation": "Client",
          "contact": "Tesco Stores Limited (Provided) ()"
        }
      ],
      "found_objects": [
        {
          "title": "Contact",
          "type": "contact",
          "objects": [
            {
              "id": 3351826,
              "highlights": [
                "<span class='highlighted'>Test</span> Bank PLC"
              ]
            }
          ]
        },
        {
          "title": "Classification",
          "type": "classification",
          "objects": [
            {
              "id": 817362,
              "highlights": [
                "personnel management; <span class='highlighted'>testing</span>"
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

The `found_objects` array shows which fields matched the search query with HTML highlighting. Each entry includes:

- **title** — Human-readable name for the matched field type
- **type** — Field type identifier (e.g., `contact`, `classification`, `financial`)
- **objects** — Array of matches with `id` and `highlights` showing the matched text with `<span class='highlighted'>` tags

---

#### `searchMatterByReference(matterRef, returnImage)`

Find a matter by its reference number.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `matterRef` | `string` | — | Matter reference (e.g., "2260/20003") |
| `returnImage` | `boolean` | `false` | Include image70 field |

```javascript
const result = await ptManage.searchMatterByReference('2260/20003');
if (result.matters.length > 0) {
    const matter = result.matters[0];
    console.log(`Found: ${matter.title} (ID: ${matter.id})`);
}
```

**Response Structure:** Same as [`searchMatters()`](#searchmattersquery-options) — returns `{ matters: [...] }` with the same matter object structure.

---

#### `searchMattersByNumbers(number, options)`

Search for matters by a reference number (e.g., trademark number, patent number, application number).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `number` | `string` | — | The number to search for (required) |
| `options.referenceType` | `string` | `'_unselected'` | Type of reference number. Common values: `'Application Number'`, `'Registration Number'`, `'Publication Number'`, `'Client Ref'` |
| `options.page` | `number` | `1` | Page number |
| `options.pageSize` | `number` | `10` | Results per page |
| `options.ordering` | `string` | `'-matter__id'` | Sort order |

```javascript
const result = await ptManage.searchMattersByNumbers('3301880', {
    referenceType: 'Registration Number'
});
console.log(`Found ${result.matters?.length} matters`);

// Search any reference type
const result2 = await ptManage.searchMattersByNumbers('ABC123');
result2.matters.forEach(matter => {
    console.log(`${matter.ref_no}: ${matter.title}`);
});
```

**Response Structure:** Same as [`searchMatters()`](#searchmattersquery-options) — returns `{ matters: [...] }` with the same matter object structure.

```json
{
  "matters": [
    {
      "id": 73597,
      "title": "UK Trade Mark Application: United Kingdom: 'ACME Corp'...",
      "ref_no": "TRA.GB.073597",
      "matter_ref": "2260/20003",
      "subject_name": "ACME (Device Only)",
      "state": "active",
      "organization": 10001,
      "defining": { "id": 7115, "value": "United Kingdom", "code": "GB", "is_active": true },
      "type": { "id": 3204, "value": "Trade Mark Registration", "is_active": true },
      "status": { "id": 695, "value": "Filed", "is_active": true },
      "sub_type": { "id": 202, "value": "UK Trade Mark Application", "is_active": true },
      "matter_type": { "id": 40, "title": "Trade Mark", "slug": "trade-mark", "code": "TRA" },
      "major_contacts": ["Example Company Ltd"],
      "major_contact_relations": [{ "relation": "Client", "contact": "Example Company Ltd" }],
      "found_objects": null
    }
  ]
}
```

---

#### `getMatterDetails(matterId)`

Get full details for a specific matter.

| Parameter | Type | Description |
|-----------|------|-------------|
| `matterId` | `number` | The matter ID |

```javascript
const result = await ptManage.getMatterDetails(73597);
console.log(`Matter: ${result.matter.title}`);
console.log(`Status: ${result.matter.status.value}`);
console.log(`Type: ${result.matter.type.value}`);

// Access extra data
console.log(`Application #: ${result.extra_data.application_number}`);
console.log(`Registration #: ${result.extra_data.registration_number}`);

// Access contacts
result.contacts.forEach(c => {
    console.log(`${c.relation_repr}: ${c.contact.full_name}`);
});

// Access events
result.events.forEach(e => {
    console.log(`${e.date}: ${e.event_type_repr.value}`);
});
```

**Response Structure:**

The response includes comprehensive matter data across multiple sections:

```json
{
  "matter": {
    "id": 73597,
    "title": "UK Trade Mark Application: United Kingdom: 'ACME Corp'...",
    "ref_no": "TRA.GB.073597",
    "matter_ref": "2260/20003",
    "subject_name": "ACME (Device Only)",
    "state": "active",
    "organization": 10001,
    "defining": { "id": 7115, "value": "United Kingdom", "code": "GB", "is_active": true },
    "type": { "id": 3204, "value": "Trade Mark Registration", "is_active": true },
    "status": { "id": 695, "value": "Filed", "is_active": true },
    "sub_type": { "id": 202, "value": "UK Trade Mark Application", "is_active": true },
    "matter_type": { "id": 40, "title": "Trade Mark", "slug": "trade-mark", "code": "TRA" },
    "major_contacts": ["Example Company Ltd"],
    "major_contact_relations": [{ "relation": "Client", "contact": "Example Company Ltd" }]
  },
  "extra_data": {
    "official_number": "3301880",
    "application_number": "3301880",
    "application_date": "2018-04-05",
    "publication_date": "2018-05-18",
    "registration_number": "UK00000000001",
    "registration_date": null,
    "next_renewal_due": null,
    "additional_events": [
      { "event_type__id": 32680, "event_type__value": "Mark Created", "date": "2018-04-05" }
    ],
    "custom_data": {
      "agent_ref": "ABC123",
      "translation": "example"
    },
    "trademark_type_repr": { "id": 49, "value": "Device Only", "repr": "Device Only" }
  },
  "contacts": [
    {
      "id": 150438,
      "relation": 8,
      "relation_repr": "Client",
      "contact": {
        "id": 24830,
        "full_name": "Example Company Ltd",
        "type": "Company",
        "email": "",
        "country_repr": { "id": 221, "value": "United Kingdom", "code": "GB" },
        "city": "London"
      },
      "ownership_percentage": null,
      "major": true,
      "departments_repr": [{ "id": 14, "name": "Legal", "contact": 24830 }]
    }
  ],
  "events": [
    {
      "id": 522420,
      "date": "2018-04-05",
      "event_type": 32682,
      "event_type_repr": { "id": 32682, "value": "Application Date", "is_active": true },
      "number": "3301880",
      "source": "import",
      "is_editable": true,
      "repr": "2018-04-05 - Application Date"
    }
  ],
  "team_conversations": [
    {
      "id": 1964563,
      "subject": "Internal discussion",
      "has_unread": false,
      "is_external": false,
      "last_message": { "author": { "repr": "user@example.com" }, "headline": ["Latest message"] },
      "followers": [{ "membership_repr": { "user": { "full_name": "John Doe" } } }]
    }
  ],
  "client_conversations": [
    {
      "id": 1964607,
      "subject": "Client correspondence",
      "has_unread": false,
      "is_external": true,
      "followers": [{ "membership_repr": { "user": { "full_name": "Jane Smith" } } }]
    }
  ],
  "reference_numbers": [
    {
      "id": 495225,
      "reference_type": 101,
      "reference_type_repr": { "id": 101, "value": "Application Number" },
      "reference_number": "3301880",
      "source": "import"
    },
    {
      "id": 1718930,
      "reference_type": 508,
      "reference_type_repr": { "id": 508, "value": "Registration Number" },
      "reference_number": "UK00000000001",
      "source": "user"
    }
  ],
  "classifications": [
    {
      "id": 498451,
      "class_no": 1,
      "class_no_repr": "1",
      "description": "Chemicals used in industry, science...",
      "classification_type_repr": { "id": 34, "value": "Unknown" }
    }
  ],
  "status_memos": [
    {
      "id": 559543,
      "created": "2026-02-25T14:18:30.676691Z",
      "body": "Project was merged in",
      "creator": null,
      "is_flagged": false
    }
  ],
  "status": {
    "status": "Filed",
    "id": 73597,
    "static_resp_fields": {
      "flags": ["User Name"],
      "is_flagged": false,
      "matter_type_id": 40,
      "sub_type_id": 202
    }
  }
}
```

Key sections:

- **matter** — Core matter information (title, ref_no, type, status, defining jurisdiction)
- **extra_data** — Additional fields (application/registration numbers, dates, custom data)
- **contacts** — All related contacts with relation types and ownership percentages
- **events** — Timeline events (application dates, renewals, milestones)
- **team_conversations** — Internal messaging threads
- **client_conversations** — External client correspondence
- **reference_numbers** — All reference numbers by type
- **classifications** — Class numbers and descriptions
- **status_memos** — Notes and status updates
- **status** — Current status with flags

---

#### `getContactRelations(matterId)`

Get all contact relations for a matter.

| Parameter | Type | Description |
|-----------|------|-------------|
| `matterId` | `number` | The matter ID |

```javascript
const result = await ptManage.getContactRelations(73597);
result.contacts.forEach(rel => {
    console.log(`${rel.relation_repr}: ${rel.contact.full_name}`);
});
```

**Response Structure:**

```json
{
  "contacts": [
    {
      "id": 150437,
      "sub_matter": 73597,
      "relation": 43,
      "relation_repr": "Supervisor",
      "contact": {
        "id": 25054,
        "full_name": "Jane Smith",
        "first_name": "Jane",
        "last_name": "Smith",
        "legal_entity_name": "Acme Legal Ltd",
        "email": "jane.smith@example.com",
        "cellphone_number": "",
        "phone_number": "",
        "position": "",
        "type": "Person",
        "organization": 10001,
        "country": null,
        "city": "",
        "street_address": "",
        "hidden": false,
        "repr": "Jane Smith"
      },
      "ownership_percentage": "15.00",
      "contact_available": true,
      "major": false,
      "tags": [],
      "tags_repr": [],
      "business_groups": [],
      "business_groups_repr": [],
      "departments": [],
      "departments_repr": [],
      "retainer_codes": [],
      "retainer_codes_repr": [],
      "consolidated_codes": [],
      "consolidated_codes_repr": [],
      "repr": "Jane Smith"
    }
  ]
}
```

---

#### `searchInMatter(matterId, query)`

Search within a specific matter.

| Parameter | Type | Description |
|-----------|------|-------------|
| `matterId` | `number` | The matter ID |
| `query` | `string` | The search query |

```javascript
const results = await ptManage.searchInMatter(73597, 'test');
results.forEach(item => {
    console.log(`${item.type_title}: ${item.repr}`);
    console.log(`Highlights: ${item.highlights.join(', ')}`);
});
```

**Response Structure:**

Note: This method returns an array directly, not wrapped in an object. Each result represents a matched item within the matter (charges, documents, etc.).

```json
[
  {
    "id": 945305,
    "sub_matter": {
      "id": 73597,
      "defining_value": "United Kingdom",
      "title": "UK Trade Mark Application: United Kingdom: 'ACME Corp'...",
      "status_value": "Filed",
      "organization_verbose": "Demo Organization",
      "events_count": 16,
      "ref_no": "TRA.GB.073597",
      "url": "/a/projects/73597",
      "content_type": {
        "app_label": "legal",
        "model": "submatter"
      },
      "highlights": [
        "<span class='highlighted'>Test</span>",
        "Narrative , <span class='highlighted'>Test</span> Narrative 2"
      ],
      "type_title": "Project",
      "type": "project",
      "repr": "TRA.GB.073597 UK Trade Mark Application..."
    },
    "billing_organization": "Demo Organization (DEMO)",
    "amount": "0.0005",
    "currency": "GBP",
    "url": "/a/projects/73597/charges/945305",
    "content_type": {
      "app_label": "financials",
      "model": "financial"
    },
    "highlights": [
      "<span class='highlighted'>Test</span>",
      "Narrative , <span class='highlighted'>Test</span> Narrative 2"
    ],
    "type_title": "Charge",
    "type": "financial",
    "repr": "[TRA.GB.073597...] Demo Organization (DEMO) -> None (2025-08-21, Time Recorded)"
  }
]
```

Each result includes:

- **type** / **type_title** — The type of matched item (e.g., `financial`, `project`, `document`)
- **highlights** — Array of text snippets with `<span class='highlighted'>` tags showing matches
- **sub_matter** — Reference to the parent matter with its own highlights
- **url** — Relative URL to view the item in Manage

!!! note "`/a/projects/` vs `/a/matters/`"
    Relative URLs in API responses (like `url` and `frontend_url`) use Manage's internal "projects" naming (`/a/projects/<id>`). When building matter links yourself, use `getBaseUrl() + '/a/matters/<id>'` — as `ptManageUI` does.

---

### User Management

#### `getAllUsers(organizationUuid)`

Get all users in a specific organization.

| Parameter | Type | Description |
|-----------|------|-------------|
| `organizationUuid` | `string` | Organization UUID or ID string (required) |

**Returns:** `Promise<object>`

```javascript
const result = await ptManage.getAllUsers('org-uuid-123');
result.users.forEach(u => {
    console.log(`${u.user.full_name} (ID: ${u.user.id})`);
});
```

**Response Structure:**

```json
{
  "users": [
    {
      "id": 20001,
      "user": {
        "id": 10101,
        "first_name": "Jane",
        "last_name": "Example",
        "full_name": "Jane Example",
        "short_name": "Jane E.",
        "is_active": true,
        "repr": "Jane Example"
      },
      "is_read_only": false
    },
    {
      "id": 20002,
      "user": {
        "id": 10102,
        "first_name": "Josh",
        "last_name": "Sample",
        "full_name": "John Sample",
        "short_name": "John S.",
        "is_active": true,
        "repr": "John Sample"
      },
      "is_read_only": false
    }
  ]
}
```

---

#### `searchUsers(organizationUuid, query, isInternal)`

Search for users by name within an organization.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `organizationUuid` | `string` | — | Organization UUID or ID string (required) |
| `query` | `string` | — | The search query for user names (required) |
| `isInternal` | `boolean` | `true` | Filter to internal users only |

```javascript
const users = await ptManage.searchUsers('org-uuid-123', 'Peter');
users.forEach(u => {
    console.log(`${u.user.full_name}`);
});

// Include external users
const allUsers = await ptManage.searchUsers('org-uuid-123', 'Peter', false);
```

**Response Structure:**

Note: This method returns an array directly.

```json
[
  {
    "id": 23028,
    "user": {
      "id": 13715,
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "short_name": "John D.",
      "is_active": true,
      "repr": "John Doe"
    },
    "organization": {
      "id": 10001,
      "title": "Demo Organization",
      "two_letter_code": "DO",
      "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "repr": "Demo Organization (DEMO)"
    },
    "is_read_only": false
  }
]
```

---

### Tasks & Deadlines

#### `getMyTasks(startDate, endDate)`

Get the current user's tasks within a date range.

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | `string` | Start date in YYYY-MM-DD format (required) |
| `endDate` | `string` | End date in YYYY-MM-DD format (required) |

```javascript
const tasks = await ptManage.getMyTasks('2026-03-01', '2026-03-31');
tasks.forEach(task => {
    console.log(`${task.title} - Due: ${task.start}`);
});
```

**Response Structure:**

Note: This method returns an array directly. The same structure is used by `getAllTasks()`, `getMyDeadlines()`, and `getAllDeadlines()`.

```json
[
  {
    "id": 1187317,
    "title": "(T) Reminder sent? renewal deadline in three months",
    "hover_text": "(T) Reminder sent? renewal deadline...\nProject: TRA.US.381008...\nNumbers:\nT21000000593 (Application Number)\n",
    "start": "2026-03-01",
    "frontend_url": "/a/projects/381008/tasks/1187317"
  },
  {
    "id": 1188097,
    "title": "S8 due in 15 months, reminder sent?",
    "hover_text": "S8 due in 15 months...\nProject: TRA.US.381274...",
    "start": "2026-03-01",
    "frontend_url": "/a/projects/381274/tasks/1188097"
  }
]
```

Key fields:

- **start** — The task/deadline date (YYYY-MM-DD)
- **hover_text** — Detailed context including project info and reference numbers
- **frontend_url** — Relative URL to view the task in Manage

---

#### `getAllTasks(startDate, endDate)`

Get all tasks in the organization within a date range.

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | `string` | Start date in YYYY-MM-DD format (required) |
| `endDate` | `string` | End date in YYYY-MM-DD format (required) |

```javascript
const tasks = await ptManage.getAllTasks('2026-03-01', '2026-03-31');
console.log(`Total tasks: ${tasks.length}`);
```

**Response Structure:** Same as [`getMyTasks()`](#getmytasksstartdate-enddate) — returns an array directly.

---

#### `createTask(taskData)`

Create a new task.

| Parameter | Type | Description |
|-----------|------|-------------|
| `taskData.title` | `string` | Task title (required) |
| `taskData.subMatter` | `number` | Sub-matter ID where the task belongs (required) |
| `taskData.dueDate` | `string` | Due date in YYYY-MM-DD format (required) |
| `taskData.assignorName` | `string` | Name of the person assigning the task (required unless assignorMembershipId provided) |
| `taskData.assigneeName` | `string` | Name of the person being assigned (required unless assigneeMembershipId provided) |
| `taskData.assignorMembershipId` | `number` | Override assignor with specific membership ID |
| `taskData.assigneeMembershipId` | `number` | Override assignee with specific membership ID |
| `taskData.type` | `string` | Task type: `'Task'`, `'Info'`, `'Priority'`, `'Urgent'` (default: `'Task'`) |
| `taskData.status` | `string` | Task status: `'Not Started'`, `'In Progress'`, `'Completed'`, `'Deferred'` (default: `'Not Started'`) |
| `taskData.text` | `string` | Optional task description |

```javascript
const result = await ptManage.createTask({
    title: 'Review trademark application',
    subMatter: 73597,
    dueDate: '2026-03-01',
    assignorName: 'John Smith',
    assigneeName: 'Jane Doe',
    type: 'Task',
    text: 'Review and provide feedback'
});

// Using membership IDs directly
const result2 = await ptManage.createTask({
    title: 'Urgent review',
    subMatter: 73597,
    dueDate: '2026-03-01',
    assignorMembershipId: 20001,
    assigneeMembershipId: 20002,
    type: 'Urgent'
});
```

---

#### `getMyDeadlines(startDate, endDate)`

Get the current user's deadlines within a date range.

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | `string` | Start date in YYYY-MM-DD format (required) |
| `endDate` | `string` | End date in YYYY-MM-DD format (required) |

```javascript
const deadlines = await ptManage.getMyDeadlines('2026-03-01', '2026-03-31');
deadlines.forEach(d => {
    console.log(`${d.title} - ${d.start}`);
});
```

**Response Structure:** Same as [`getMyTasks()`](#getmytasksstartdate-enddate) — returns an array directly with the same fields.

---

#### `getAllDeadlines(startDate, endDate)`

Get all deadlines in the organization within a date range.

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | `string` | Start date in YYYY-MM-DD format (required) |
| `endDate` | `string` | End date in YYYY-MM-DD format (required) |

```javascript
const deadlines = await ptManage.getAllDeadlines('2026-03-01', '2026-03-31');
console.log(`Total deadlines: ${deadlines.length}`);
```

**Response Structure:** Same as [`getMyTasks()`](#getmytasksstartdate-enddate) — returns an array directly with the same fields.

---

### Matter Files & Documents

#### `listMatterFiles(matterId, options)`

List files in a matter.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `matterId` | `number` | — | Matter ID |
| `options.folderId` | `number` | — | Optional folder ID |
| `options.page` | `number` | `1` | Page number |
| `options.pageSize` | `number` | `20` | Results per page |

```javascript
const files = await ptManage.listMatterFiles(73597);
files.forEach(file => {
    if (file.is_dir) {
        console.log(`[Folder] ${file.name} (${file.children_cnt} items)`);
    } else {
        console.log(`[File] ${file.name} (${file.size} bytes)`);
    }
});

// List files in a specific folder
const subFiles = await ptManage.listMatterFiles(73597, { folderId: 8883131 });
```

**Response Structure:**

Note: This method returns an array directly. Items can be files or directories (check `is_dir` field).

```json
[
  {
    "id": 8882742,
    "name": "file_example_XLS_10.xls",
    "mime_type": "application/vnd.ms-excel",
    "size": 8704,
    "is_dir": false,
    "parent": null,
    "creator": 13701,
    "created": "2024-12-18T08:24:40.109957Z",
    "originally_created": "2024-12-18T08:24:40.109957Z",
    "sub_matter": 73597,
    "event": null,
    "zone": 146832,
    "signed_url": "https://example.com/files/download/...",
    "organizations": [10001],
    "children_cnt": null,
    "locked_by": null,
    "version": 1,
    "is_inherited": true
  },
  {
    "id": 8883131,
    "name": "Internal & Settling",
    "mime_type": "pekama/directory",
    "size": 0,
    "is_dir": true,
    "parent": null,
    "creator": null,
    "created": "2025-01-29T15:06:15.496464Z",
    "originally_created": "2025-01-29T15:06:15.496464Z",
    "sub_matter": 73597,
    "event": null,
    "zone": 146832,
    "signed_url": null,
    "organizations": [10001],
    "children_cnt": 1,
    "locked_by": null,
    "version": null,
    "is_inherited": false
  }
]
```

Key fields:

- **is_dir** — `true` for folders, `false` for files
- **mime_type** — File MIME type, or `pekama/directory` for folders
- **signed_url** — Temporary download URL for files (null for folders)
- **children_cnt** — Number of items in folder (null for files)
- **parent** — Parent folder ID (null if at root level)

---

#### `uploadDocument(documentId, matterId, options)`

Upload an existing PrimeThink document to a Manage matter.

| Parameter | Type | Description |
|-----------|------|-------------|
| `documentId` | `number` | The PrimeThink document ID to upload |
| `matterId` | `number` | The matter ID |
| `options.name` | `string` | Custom name for the document in Manage |
| `options.parentId` | `number` | Target folder ID in Manage |

```javascript
const result = await ptManage.uploadDocument(2530, 73597, {
    name: 'custom.docx',
    parentId: 9040999
});
console.log(`Uploaded: ${result.name} (ID: ${result.id})`);
```

**Response Structure:**

Returns the created file (same structure as file entries in [`listMatterFiles()`](#listmatterfilesmatterid-options)):

```json
{
  "id": 9041001,
  "name": "custom.docx",
  "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "is_dir": false,
  "parent": 9040999,
  "creator": 10101,
  "created": "2026-03-10T14:21:34.201796Z",
  "originally_created": "2026-03-10T14:21:34.201841Z",
  "size": 16659,
  "sub_matter": 73597,
  "signed_url": "https://example.com/files/download/...",
  "version": 1,
  "is_inherited": true
}
```

!!! warning "Breaking Change"
    The parameter order has changed from `(matterId, documentId, options)` to `(documentId, matterId, options)`. Additionally, `options.folderId` has been renamed to `options.parentId`.

---

#### `createDocument(matterId, name, content, options)`

Creates a new document in a matter by converting text content to a file format.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `matterId` | `number` | — | The matter ID |
| `name` | `string` | — | Document name including extension (e.g., `'report.docx'`) |
| `content` | `string` | — | The text content to convert into the document |
| `options.format` | `string` | `'DOCX'` | Output format: `'TXT'`, `'DOCX'`, `'PDF'`, `'MD'`, `'HTML'` |
| `options.parentId` | `number` | — | Target folder ID in Manage |

```javascript
const result = await ptManage.createDocument(73597, 'meeting_notes.docx',
    'Meeting notes from today...', { format: 'DOCX' });
console.log(`Created: ${result.name} (ID: ${result.id})`);

// Create in a specific folder
const result2 = await ptManage.createDocument(73597, 'report.pdf',
    '# Quarterly Report\n\nThis is the content...', {
        format: 'PDF',
        parentId: 456
    });
```

**Response Structure:**

Returns the created file (same structure as file entries in [`listMatterFiles()`](#listmatterfilesmatterid-options)):

```json
{
  "id": 9041000,
  "name": "meeting_notes.docx",
  "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "is_dir": false,
  "parent": 9040999,
  "creator": 10101,
  "created": "2026-03-10T14:18:39.241028Z",
  "originally_created": "2026-03-10T14:18:39.241078Z",
  "size": 9759,
  "sub_matter": 73597,
  "signed_url": "https://example.com/files/download/...",
  "version": 1,
  "is_inherited": true
}
```

---

#### `downloadDocument(fileId)`

Download a document from Manage.

| Parameter | Type | Description |
|-----------|------|-------------|
| `fileId` | `number` | The Manage file ID |

```javascript
const result = await ptManage.downloadDocument(9040838);
console.log(`Download URL: ${result.redirect_url}`);

// Open download in new tab
window.open(result.redirect_url, '_blank');
```

**Response Structure:**

```json
{
  "redirect_url": "https://example.cloudfront.net/file/.../document.pdf?..."
}
```

The `redirect_url` is a temporary signed URL that can be used to download the file. The URL includes authentication tokens and will expire after a period of time.

---

#### `createFolder(matterId, folderName, parentFolderId)`

Create a folder in a matter.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `matterId` | `number` | — | The matter ID |
| `folderName` | `string` | — | Name of the folder to create |
| `parentFolderId` | `number` | `null` | Optional parent folder ID |

```javascript
const result = await ptManage.createFolder(73597, 'Correspondence');
console.log(`Created folder ID: ${result.id}`);

// Create a subfolder
const subfolder = await ptManage.createFolder(73597, 'Invoices', result.id);
```

**Response Structure:**

Returns the created folder (same structure as folder entries in [`listMatterFiles()`](#listmatterfilesmatterid-options)):

```json
{
  "id": 9040999,
  "name": "Correspondence",
  "mime_type": "pekama/directory",
  "is_dir": true,
  "parent": null,
  "creator": 10101,
  "created": "2026-03-10T11:59:49.212122Z",
  "originally_created": "2026-03-10T11:59:49.212181Z",
  "size": 0,
  "sub_matter": 73597,
  "children_cnt": 0,
  "is_inherited": true
}
```

---

### Timesheet & Billing

#### `getTimesheetEntries(options)`

Get timesheet entries.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.startDateFrom` | `string` | today | Start date from (YYYY-MM-DD) |
| `options.startDateTo` | `string` | today | Start date to (YYYY-MM-DD) |
| `options.ordering` | `string` | — | Sort order: `'-start_time'` (desc) or `'start_time'` (asc) |
| `options.status` | `string` | — | Filter by status: `'active'` for active timers only |

```javascript
const entries = await ptManage.getTimesheetEntries({
    startDateFrom: '2026-01-01',
    startDateTo: '2026-01-31'
});
entries.forEach(entry => {
    console.log(`${entry.description} - ${entry.duration}s (${entry.status})`);
});

// Get only active timers, sorted by most recent
const activeTimers = await ptManage.getTimesheetEntries({
    status: 'active',
    ordering: '-start_time'
});
```

**Response Structure:**

Note: This method returns an array directly.

```json
[
  {
    "id": 783682,
    "sub_matter": 73597,
    "sub_matter_repr": {
      "id": 73597,
      "matter_type": 40,
      "sub_type": 202
    },
    "matter_ref": "2260/20003",
    "project_title": "UK Trade Mark Application: United Kingdom: 'ACME Corp'...",
    "client_name": "Example Company Ltd",
    "description": "Document review",
    "start_time": "2026-03-10T09:30:00Z",
    "last_start_time": "2026-03-10T11:28:57.327763Z",
    "duration": 7208,
    "calculated_duration": 7208,
    "status": "posted",
    "financial": {
      "id": 945351,
      "status": 2,
      "status_repr": { "id": 2, "value": "Not Billed" }
    },
    "creator": 10101,
    "membership": 21006,
    "charge_category": 42,
    "category": null,
    "created": "2026-03-10T11:28:31.482240Z",
    "modified": "2026-03-10T11:29:00.289893Z"
  }
]
```

Key fields:

- **status** — Timer status: `posted`, `active`, `paused`
- **duration** / **calculated_duration** — Time in seconds
- **financial** — Linked billing record with billing status
- **charge_category** — ID of the charge category applied

---

#### `getChargeCategories(options)`

Get available charge categories.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.onlyActive` | `boolean` | `true` | Return only active categories |
| `options.matterTypeId` | `string` | — | Filter by matter type ID |

```javascript
const result = await ptManage.getChargeCategories();
result.categories.forEach(cat => {
    console.log(`${cat.value} (ID: ${cat.id})`);
});

// Get categories for a specific matter type
const result2 = await ptManage.getChargeCategories({ matterTypeId: '40' });
```

**Response Structure:**

```json
{
  "categories": [
    {
      "id": 2,
      "value": "Chargeable",
      "is_active": true,
      "order": 2,
      "matter_type": null,
      "relevant_to": [97, 98, 99],
      "relevant_to_all": false,
      "repr": "Chargeable"
    },
    {
      "id": 3,
      "value": "Chargeable (fixed tariff/retainer)",
      "is_active": true,
      "order": 3,
      "matter_type": null,
      "relevant_to": [97, 98, 99, 100, 101],
      "relevant_to_all": false,
      "repr": "Chargeable (fixed tariff/retainer)"
    }
  ],
  "filter_info": {
    "only_active": true,
    "matter_type_id": null,
    "total_filtered": 4
  }
}
```

Key fields:

- **value** — Display name of the category
- **relevant_to** — Array of applicable entity IDs (empty if `relevant_to_all` is true)
- **relevant_to_all** — If true, category applies to all entities
- **filter_info** — Metadata about the applied filters

---

#### `getDashboardData(options)`

Get dashboard data including billing, tasks, and calendar.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.startDate` | `string` | — | Start date in YYYY-MM-DD format (required) |
| `options.endDate` | `string` | — | End date in YYYY-MM-DD format (required) |
| `options.widgets` | `string` | — | Widget type filter |
| `options.includeTasks` | `boolean` | `true` | Include tasks data |
| `options.includeCalendar` | `boolean` | `true` | Include calendar data |
| `options.includeDynamicData` | `boolean` | `true` | Include dynamic data |
| `options.includeBillingData` | `boolean` | `true` | Include billing data |
| `options.userId` | `number` | — | User ID to filter data |

```javascript
const result = await ptManage.getDashboardData({
    startDate: '2026-03-01',
    endDate: '2026-03-04'
});
console.log(`Tasks: ${result.tasks.length}`);

// Get only billing data
const billing = await ptManage.getDashboardData({
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    includeTasks: false,
    includeCalendar: false,
    includeDynamicData: false,
    includeBillingData: true
});
```

---

### Timer Management

#### `createTimer(timerData)`

Create an active timer.

| Parameter | Type | Description |
|-----------|------|-------------|
| `timerData.matterId` | `number` | Matter ID (required) |
| `timerData.description` | `string` | Timer description (required) |
| `timerData.chargeCategory` | `number` | Charge category ID (required) |
| `timerData.pastTime` | `string` | Start time in the past (ISO datetime), if provided timer starts from this time |

```javascript
const result = await ptManage.createTimer({
    matterId: 73597,
    description: 'Reviewing documents',
    chargeCategory: 42
});
console.log(`Started timer ${result.id} - status: ${result.status}`);

// Start timer from a past time
const result2 = await ptManage.createTimer({
    matterId: 73597,
    description: 'Reviewing documents',
    chargeCategory: 42,
    pastTime: '2026-03-04T09:00:00'
});
```

**Response Structure:**

Returns the created timer (same structure as entries in [`getTimesheetEntries()`](#gettimesheetentriesoptions)) with `status: "active"`:

```json
{
  "id": 783684,
  "sub_matter": 73597,
  "sub_matter_repr": { "id": 73597, "matter_type": 40, "sub_type": 202 },
  "matter_ref": "2260/20003",
  "project_title": "UK Trade Mark Application: 'ACME Corp'...",
  "client_name": "Example Company Ltd",
  "description": "Reviewing documents",
  "start_time": "2026-03-10T14:22:54.759261Z",
  "last_start_time": "2026-03-10T14:22:54.759267Z",
  "duration": 0,
  "calculated_duration": 0,
  "status": "active",
  "financial": {
    "id": 945353,
    "status": 7,
    "status_repr": { "id": 7, "value": "In Progress" }
  },
  "creator": 10101,
  "membership": 21006,
  "charge_category": 42
}
```

---

#### `getTimer(timeEntryId)`

Get details of a specific time entry.

| Parameter | Type | Description |
|-----------|------|-------------|
| `timeEntryId` | `number` | ID of the time entry to retrieve (required) |

```javascript
const timer = await ptManage.getTimer(783682);
console.log(`Timer: ${timer.description}`);
console.log(`Duration: ${timer.duration}s (${timer.status})`);
```

**Response Structure:** Same structure as entries in [`getTimesheetEntries()`](#gettimesheetentriesoptions):

```json
{
  "id": 783682,
  "sub_matter": 73597,
  "sub_matter_repr": { "id": 73597, "matter_type": 40, "sub_type": 202 },
  "matter_ref": "2260/20003",
  "project_title": "UK Trade Mark Application: 'ACME Corp'...",
  "client_name": "Example Company Ltd",
  "description": "Document review",
  "start_time": "2026-03-10T09:30:00Z",
  "last_start_time": "2026-03-10T11:28:57.327763Z",
  "duration": 7208,
  "calculated_duration": 7208,
  "status": "posted",
  "financial": {
    "id": 945351,
    "status": 2,
    "status_repr": { "id": 2, "value": "Not Billed" }
  },
  "creator": 10101,
  "membership": 21006,
  "charge_category": 42
}
```

---

#### `controlTimer(operation, timeEntryId)`

Control an existing timer (start/stop/pause).

| Parameter | Type | Description |
|-----------|------|-------------|
| `operation` | `string` | Timer operation: `'start_timer'`, `'pause_timer'`, or `'post_timer'` (stop) |
| `timeEntryId` | `number` | ID of the time entry to control (required) |

```javascript
// Pause the timer
const paused = await ptManage.controlTimer('pause_timer', 783684);
console.log(`Timer ${paused.status}: ${paused.duration}s`); // "paused: 38"

// Resume the timer
const resumed = await ptManage.controlTimer('start_timer', 783684);
console.log(`Timer ${resumed.status}`); // "active"

// Stop/post the timer
const stopped = await ptManage.controlTimer('post_timer', 783684);
console.log(`Timer ${stopped.status}`); // "posted"
```

**Response Structure:**

Returns the updated timer (same structure as entries in [`getTimesheetEntries()`](#gettimesheetentriesoptions)) with updated `status`:

```json
{
  "id": 783684,
  "sub_matter": 73597,
  "matter_ref": "2260/20003",
  "description": "Reviewing documents",
  "start_time": "2026-03-10T14:22:54.759261Z",
  "duration": 38,
  "calculated_duration": 38,
  "status": "paused",
  "financial": {
    "id": 945353,
    "status": 7,
    "status_repr": { "id": 7, "value": "In Progress" }
  },
  "charge_category": 42
}
```

The `status` field reflects the operation: `"active"` (start), `"paused"` (pause), or `"posted"` (stop).

---

#### `editTimer(timerData)`

Edit an existing time entry.

| Parameter | Type | Description |
|-----------|------|-------------|
| `timerData.timeEntryId` | `number` | ID of the time entry to edit (required) |
| `timerData.description` | `string` | New description (required) |
| `timerData.duration` | `number` | Duration in seconds (required) |
| `timerData.matterId` | `number` | Matter ID (required) |
| `timerData.membership` | `number` | Membership ID (required) |
| `timerData.chargeCategory` | `number` | Charge category ID (required) |

```javascript
const result = await ptManage.editTimer({
    timeEntryId: 783684,
    description: 'Updated description',
    duration: 120,
    matterId: 73597,
    membership: 21006,
    chargeCategory: 42
});
console.log(`Updated: ${result.description} - ${result.duration}s`);
```

**Response Structure:**

Returns the updated timer (same structure as entries in [`getTimesheetEntries()`](#gettimesheetentriesoptions)):

```json
{
  "id": 783684,
  "sub_matter": 73597,
  "matter_ref": "2260/20003",
  "description": "Updated description",
  "start_time": "2026-03-10T14:22:54.759261Z",
  "duration": 120,
  "calculated_duration": 120,
  "status": "paused",
  "financial": {
    "id": 945353,
    "status": 7,
    "status_repr": { "id": 7, "value": "In Progress" }
  },
  "membership": 21006,
  "charge_category": 42,
  "modified": "2026-03-10T14:24:56.790891Z"
}
```

---

#### `logPastWork(workData)`

Log past work (create a time entry).

| Parameter | Type | Description |
|-----------|------|-------------|
| `workData.matterId` | `number` | Matter ID (required) |
| `workData.description` | `string` | Work description (required) |
| `workData.chargeCategory` | `number` | Charge category ID (required) |
| `workData.pastTime` | `string` | Start time for the entry (ISO datetime, required) |
| `workData.durationInMinutes` | `number` | Duration in minutes (required) |

```javascript
const result = await ptManage.logPastWork({
    matterId: 73597,
    description: 'Document review',
    chargeCategory: 42,
    pastTime: '2026-03-09T11:30:00',
    durationInMinutes: 90
});
console.log(`Created time entry ${result.id} - ${result.duration}s`);
```

**Response Structure:**

Returns the created time entry (same structure as entries in [`getTimesheetEntries()`](#gettimesheetentriesoptions)):

```json
{
  "id": 783683,
  "sub_matter": 73597,
  "sub_matter_repr": { "id": 73597, "matter_type": 40, "sub_type": 202 },
  "matter_ref": "2260/20003",
  "project_title": "UK Trade Mark Application: 'ACME Corp'...",
  "client_name": "Example Company Ltd",
  "description": "Document review",
  "start_time": "2026-03-09T11:30:00Z",
  "duration": 5400,
  "calculated_duration": 5400,
  "status": "posted",
  "financial": {
    "id": 945352,
    "status": 2,
    "status_repr": { "id": 2, "value": "Not Billed" }
  },
  "creator": 10101,
  "membership": 21006,
  "charge_category": 42
}
```

---

### Matter Creation

#### `getAllMatterTypes()`

Get all matter types, sub-types, sub-sub-types, and statuses.

```javascript
const result = await ptManage.getAllMatterTypes();
result.matter_types.forEach(type => {
    console.log(`${type.title} (ID: ${type.id})`);
});

// Get sub-types for a specific matter type
const tradeMarkSubTypes = result.sub_matter_types.filter(st => st.matter_type === 40);
```

**Response Structure:**

```json
{
  "matter_types": [
    {
      "id": 27,
      "title": "Anti-Counterfeiting"
    },
    {
      "id": 40,
      "title": "Trade Mark"
    }
  ],
  "sub_matter_types": [
    {
      "id": 3204,
      "value": "Trade Mark Registration",
      "matter_type": 40
    },
    {
      "id": 3157,
      "value": "Civil Enforcement",
      "matter_type": 27
    }
  ],
  "sub_matter_sub_types": [
    {
      "id": 243,
      "value": "UK / EUTM Comparable Trade Mark Registration",
      "matter_type": 40,
      "type": 3204
    },
    {
      "id": 202,
      "value": "UK Trade Mark Application",
      "matter_type": 40,
      "type": 3204
    }
  ],
  "sub_matter_statuses": [
    {
      "id": 617,
      "value": "Pre-Filing",
      "matter_type": 35
    },
    {
      "id": 618,
      "value": "Filed",
      "matter_type": 35
    }
  ]
}
```

Key arrays:

- **matter_types** — Top-level matter types (id, title)
- **sub_matter_types** — Types within each matter type (links via `matter_type`)
- **sub_matter_sub_types** — Sub-types within types (links via `matter_type` and `type`)
- **sub_matter_statuses** — Available statuses per matter type

---

#### `getCreateMatterContext(matterType)`

Get context for creating a matter of a specific type. This returns team relations, default contact, and other context needed for matter creation.

| Parameter | Type | Description |
|-----------|------|-------------|
| `matterType` | `number` | The matter type ID (required) |

```javascript
const context = await ptManage.getCreateMatterContext(40);
console.log('Team relations:', context.in_house_department_team_relations);
console.log('Available jurisdictions:', context.definings.length);

// Find a specific jurisdiction
const uk = context.definings.find(d => d.value === 'United Kingdom');
console.log(`UK ID: ${uk.id}`);
```

**Response Structure:**

```json
{
  "in_house_department_team_relations": {
    "default": ["IP Counsel", "IP Paralegal", "IP Team Member"],
    "patents": ["Patent Attorney", "IP Paralegal"]
  },
  "in_house_department_team_required_relations": {
    "default": ["IP Counsel"],
    "patents": []
  },
  "project_reports_page_size": 10,
  "default_contact_id": 25057,
  "default_contact": null,
  "business_groups": [],
  "definings": [
    { "id": 6779, "value": "Afghanistan" },
    { "id": 6797, "value": "Australia" },
    { "id": 6871, "value": "European Union" },
    { "id": 7115, "value": "United Kingdom" },
    { "id": 7116, "value": "United States of America" }
  ]
}
```

Key fields:

- **in_house_department_team_relations** — Team roles by department type
- **in_house_department_team_required_relations** — Required roles by department
- **default_contact_id** — Default contact for new matters
- **business_groups** — Available business groups
- **definings** — Available jurisdictions/territories (~370 entries including countries, states, supranational bodies like WIPO, EU, ARIPO)

---

#### `getAllClients(options)`

Get all clients with optional filtering and pagination.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.searchByFullName` | `string` | — | Optional search term to filter by full name |
| `options.page` | `number` | `1` | Page number |
| `options.pageSize` | `number` | `50` | Results per page |

```javascript
const result = await ptManage.getAllClients();
result.clients.forEach(client => {
    console.log(`${client.full_name} (ID: ${client.id})`);
    if (client.country_repr) {
        console.log(`  Location: ${client.city}, ${client.country_repr.value}`);
    }
});

// Search for clients
const result2 = await ptManage.getAllClients({ searchByFullName: 'Acme' });
```

**Response Structure:**

```json
{
  "clients": [
    {
      "id": 25182,
      "full_name": "Acme Corporation Ltd",
      "country_repr": {
        "id": 237,
        "value": "United States"
      },
      "city": "New York"
    },
    {
      "id": 51854,
      "full_name": "Example Drinks Ltd.",
      "country_repr": {
        "id": 221,
        "value": "United Kingdom"
      },
      "city": "London"
    }
  ]
}
```

---

#### `createMatter(matterData)`

Create a new matter. The required fields depend on the matter type — use `getCreateMatterContext()` first to understand what fields are needed.

| Parameter | Type | Description |
|-----------|------|-------------|
| `matterData` | `object` | Matter details (varies by matter type) |

```javascript
const result = await ptManage.createMatter({
    matter_type_id: 40,
    sub_type_id: 202,
    title: 'New Trademark Application',
    client_id: 12345
    // ... additional fields based on matter type context
});
```

---

### Messages & Notifications

#### `getUnreadMessagesCount()`

Get the count of unread messages.

```javascript
const result = await ptManage.getUnreadMessagesCount();
console.log(`Unread: ${result.count_unread}`);
```

**Response Structure:**

```json
{
  "count_unread": 0
}
```

---

### Reports

#### `listReports(options)`

List available reports/saved searches.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.filterType` | `string` | `'all'` | Filter by type: `'public'`, `'private'`, or `'all'` |

```javascript
const result = await ptManage.listReports();
result.reports.forEach(report => {
    console.log(`${report.name}`);
});

// Get only public reports
const publicReports = await ptManage.listReports({ filterType: 'public' });
```

**Response Structure:**

```json
{
  "reports": [
    {
      "id": 9,
      "name": "Default (updated)",
      "user": null,
      "category": null,
      "is_default": false,
      "search": "",
      "sort": "id,ASC",
      "columns": {
        "iambic_code": 120,
        "matter_ref": 120,
        "name": 120,
        "type": 120,
        "country": 120,
        "status": 120
      },
      "mailing_list_enabled": false
    },
    {
      "id": 35138,
      "name": "Territory Filter Report",
      "user": null,
      "search": "(territory=\"Belize\")",
      "sort": "created,DESC",
      "columns": {
        "country_code": 120,
        "type": 120,
        "status": 120
      },
      "mailing_list_enabled": false
    },
    {
      "id": 35352,
      "name": "My Private Report",
      "user": 10101,
      "search": "(title=\"EXAMPLE\")",
      "sort": "matter__id,DESC",
      "columns": {},
      "mailing_list_enabled": false
    }
  ],
  "filter_info": {
    "filter_type": "all",
    "total_count": 8,
    "public_count": 6,
    "private_count": 2
  }
}
```

Key fields:

- **user** — `null` for public reports, user ID for private reports
- **search** — Query syntax filter (e.g., `(territory="UK")`)
- **sort** — Sort field and direction (e.g., `id,ASC` or `created,DESC`)
- **columns** — Object mapping column names to widths (empty object uses defaults)
- **mailing_list_enabled** — Whether report can be used for mailing lists
- **filter_info** — Metadata showing counts by filter type

---

### Search & Tables

#### `getSearchContext(app, entity, module)`

Get search context for advanced searches.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `app` | `string` | — | Application name (e.g., `'legal'`) (required) |
| `entity` | `string` | — | Entity name (e.g., `'sub_matters'`) (required) |
| `module` | `string` | `null` | Translation module name (defaults to `'{app}_{entity}'`) |

```javascript
const context = await ptManage.getSearchContext('legal', 'sub_matters');
console.log('Available filters:', context.filters);
console.log('Available columns:', context.columns.available);
console.log('Selected columns:', context.columns.selected);
console.log('Available presets:', context.presets);

// Find filterable columns
const filterableColumns = context.columns.available.filter(c => c.filterable);

// Find date filters
const dateFilters = context.filters.filter(f => f.type === 'Date');
```

**Response Structure:**

```json
{
  "sorts": [
    { "name": "id", "label": "id", "default": true, "direction": "asc" },
    { "name": "created", "label": "created", "default": false, "direction": "desc" },
    { "name": "status__value", "label": "status__value", "default": false, "direction": "asc" }
  ],
  "columns": {
    "available": [
      { "name": "iambic_code", "label": "iambic_code", "type": "TEXT", "sortable": true, "filterable": true },
      { "name": "matter_ref", "label": "matter_ref", "type": "TEXT", "sortable": false, "filterable": true },
      { "name": "status", "label": "status", "type": "TEXT", "sortable": true, "filterable": true },
      { "name": "logo", "label": "logo", "type": "IMAGE_URL", "sortable": false, "filterable": false },
      { "name": "classification_number", "label": "classification_number", "type": "LIST", "sortable": false, "filterable": true },
      { "name": "contacts_by_relation.legal_owner", "label": "contacts_by_relation.legal_owner", "type": "LIST", "sortable": false, "filterable": true },
      { "name": "events_by_type.renewal_deadline", "label": "events_by_type.renewal_deadline", "type": "LIST", "sortable": false, "filterable": true },
      { "name": "numbers_by_type.application_number", "label": "numbers_by_type.application_number", "type": "LIST", "sortable": false, "filterable": true }
    ],
    "selected": [
      "iambic_code", "matter_ref", "name", "type", "status", "country"
    ]
  },
  "presets": [
    { "id": 9, "name": "Default (updated)" },
    { "id": 37264, "name": "IP Rights Schedule" }
  ],
  "filters": [
    {
      "name": "matter_ref",
      "label": "matter_ref",
      "type": "Keyword",
      "inputType": "Search",
      "multiple": true,
      "operators": ["=", "!="]
    },
    {
      "name": "status",
      "label": "status",
      "type": "Identity",
      "inputType": "Selection",
      "multiple": true,
      "operators": ["=", "!="]
    },
    {
      "name": "event_renewal_deadline",
      "label": "event_renewal_deadline",
      "type": "Date",
      "inputType": "Date",
      "multiple": true,
      "operators": ["=", "><", ">", ">=", "<", "<=", "!="],
      "dateType": "Day",
      "datePresets": ["Today", "Tomorrow", "Yesterday", "ThisMonth", "NextMonth", "LastMonth"]
    }
  ]
}
```

Key sections:

- **sorts** — Available sort fields with default direction
- **columns.available** — All available columns with type (`TEXT`, `LIST`, `IMAGE_URL`, `NUMBER`) and capabilities
- **columns.selected** — Default column selection
- **presets** — Saved report presets that can be loaded
- **filters** — Available filters with:
  - `type`: `Keyword` (text search), `Identity` (selection dropdown), `Date` (date picker)
  - `inputType`: UI control type (`Search`, `Selection`, `Date`)
  - `operators`: Valid query operators
  - `datePresets`: For Date filters, available relative date options

Column naming patterns:
- `contacts_by_relation.*` — Contact fields by relationship type
- `events_by_type.*` — Event dates by event type
- `numbers_by_type.*` — Reference numbers by type
- `custom_fields.*` — Organization-specific custom fields

---

#### `getFilterOptions(app, entity, filterName)`

Get filter options for a specific filter field. Only works for Selection type filters.

| Parameter | Type | Description |
|-----------|------|-------------|
| `app` | `string` | Application name (e.g., `'legal'`) (required) |
| `entity` | `string` | Entity name (e.g., `'sub_matters'`) (required) |
| `filterName` | `string` | The filter's name field from `getSearchContext` (required) |

```javascript
const result = await ptManage.getFilterOptions('legal', 'sub_matters', 'status');
console.log(`Found ${result.count} status options`);
result.options.forEach(opt => {
    console.log(`${opt.label} (ID: ${opt.id})`);
});

// Use in a query
const query = `(status="${result.options[0].id}")`;
```

**Response Structure:**

```json
{
  "filter_name": "status",
  "options": [
    { "id": "Filed", "label": "Filed" },
    { "id": "Registered", "label": "Registered" },
    { "id": "Published", "label": "Published" },
    { "id": "Expired", "label": "Expired" },
    { "id": "Closed", "label": "Closed" },
    { "id": "Withdrawn", "label": "Withdrawn" }
  ],
  "count": 114
}
```

Key fields:

- **filter_name** — The filter this applies to
- **options** — Array of selectable values with `id` (use in queries) and `label` (display text)
- **count** — Total number of available options (response may be truncated)

---

#### `searchTable(app, entity, options)`

Search a table/module with filters.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `app` | `string` | — | Application name (e.g., `'legal'`) (required) |
| `entity` | `string` | — | Entity name (e.g., `'sub_matters'`) (required) |
| `options.query` | `string` | — | Search query using query syntax (e.g., `'(status="1") AND (territory="UK")'`) |
| `options.columns` | `string[]` | — | List of column names to return |
| `options.sort` | `string` | — | Sort field name from available sorts |
| `options.sortDirection` | `string` | `'asc'` | Sort direction: `'asc'` or `'desc'` |
| `options.page` | `number` | `0` | Page number (0-indexed) |
| `options.size` | `number` | `20` | Results per page (1-100) |
| `options.presetId` | `number` | — | Load a saved preset by ID (overrides query/columns/sort) |

```javascript
const result = await ptManage.searchTable('legal', 'sub_matters', {
    query: '(status="Filed")',
    sort: 'created',
    sortDirection: 'desc',
    page: 0,
    size: 20
});
console.log(`Found ${result.pagination.totalResults} matters`);
result.results.forEach(matter => {
    console.log(`${matter.iambic_code}: ${matter.name}`);
});

// Using a preset
const result2 = await ptManage.searchTable('legal', 'sub_matters', {
    presetId: 35138
});

// With specific columns
const result3 = await ptManage.searchTable('legal', 'sub_matters', {
    query: '(territory="UK")',
    columns: ['iambic_code', 'name', 'status', 'contacts_by_relation.client']
});
```

**Response Structure:**

```json
{
  "results": [
    {
      "id": 73597,
      "iambic_code": "TRA.GB.073597",
      "matter_ref": "2260/20003",
      "name": "UK Trade Mark Application: United Kingdom: 'ACME Corp'...",
      "type": "Trade Mark",
      "sm_sub_type": "UK Trade Mark Application",
      "status": "Filed",
      "country_code": "GB",
      "classification_number": ["1", "2", "3"],
      "contacts_by_relation.client": ["Example Company Ltd"],
      "events_by_type.registration_date": null
    },
    {
      "id": 86217,
      "iambic_code": "TRA.EU.086217",
      "matter_ref": "2548/20064",
      "name": "EU Trade Mark Application: EUTM: 'EXAMPLE'...",
      "type": "Trade Mark",
      "sm_sub_type": "EU Trade Mark Application",
      "status": "Filed",
      "country_code": "EU",
      "classification_number": ["9", "16", "36"],
      "contacts_by_relation.client": ["Demo Bank PLC"]
    }
  ],
  "pagination": {
    "page": 0,
    "size": 20,
    "totalResults": 20620,
    "totalPages": 1031,
    "isFirstPage": true,
    "isLastPage": false
  },
  "query_info": {
    "query": "(status=\"Filed\")",
    "sort": "created desc",
    "columns": "(default)",
    "preset_id": null
  }
}
```

Key sections:

- **results** — Array of matter objects with requested columns (fields vary based on `columns` option)
- **pagination** — Pagination metadata:
  - `page` — Current page (0-indexed)
  - `size` — Results per page
  - `totalResults` / `totalPages` — Total counts
  - `isFirstPage` / `isLastPage` — Navigation helpers
- **query_info** — Echo of applied query, sort, columns, and preset

---

## Complete Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Matter Dashboard</title>
    <!-- primethink.js is automatically injected by the platform -->
    <script src="/static/primethink_manage.js?v=20260309"></script>
</head>
<body>
    <div id="matters-list"></div>

    <script>
        async function loadMatters() {
            try {
                // Wait for ptManage to be ready
                await window.ptManageReady;

                // Get organizations
                const orgs = await ptManage.listOrganizations();
                console.log('Organizations:', orgs.organizations);

                // Search matters
                const matters = await ptManage.searchMatters('trademark', {
                    page: 1,
                    pageSize: 5
                });

                // Display matters
                const container = document.getElementById('matters-list');
                matters.matters.forEach(matter => {
                    const div = document.createElement('div');
                    div.innerHTML = `
                        <h3>${matter.title}</h3>
                        <p>Ref: ${matter.ref_no}</p>
                        <p>Status: ${matter.status.value}</p>
                    `;
                    container.appendChild(div);
                });

                // Get details for first matter
                if (matters.matters.length > 0) {
                    const details = await ptManage.getMatterDetails(matters.matters[0].id);
                    console.log('Matter details:', details);
                }

            } catch (error) {
                console.error('Error:', error);
            }
        }

        // Load when page is ready
        document.addEventListener('DOMContentLoaded', loadMatters);
    </script>
</body>
</html>
```

---

## Error Handling

All methods throw errors on failure. Wrap calls in try/catch:

```javascript
try {
    const result = await ptManage.getMatterDetails(99999);
} catch (error) {
    console.error('Failed to get matter:', error.message);
    // Handle error appropriately
}
```

### Safe Wrapper Pattern

```javascript
async function safeMatterSearch(query) {
    try {
        const result = await ptManage.searchMatters(query);
        return { success: true, data: result.matters };
    } catch (error) {
        console.error('Search failed:', error.message);
        return { success: false, error: error.message, data: [] };
    }
}

// Usage
const result = await safeMatterSearch('trademark');
if (result.success) {
    displayMatters(result.data);
} else {
    showError(result.error);
}
```

---

## Relationship to pt.callToolDirect

`ptManage` is a convenience wrapper around `pt.callToolDirect()`. Each method internally calls the corresponding Manage tool:

```javascript
// Using ptManage (recommended)
const orgs = await ptManage.listOrganizations();

// Equivalent using pt.callToolDirect
const result = await pt.callToolDirect('manage_list_organizations');
const orgsDirect = result.result;
```

Benefits of using `ptManage`:

- **Typed parameters** — JavaScript-friendly parameter names (camelCase)
- **Simpler return values** — Returns the result directly
- **Better documentation** — JSDoc comments with examples
- **Consistent API** — All methods follow the same patterns

For tools not covered by `ptManage`, use `pt.callToolDirect()` directly. See the [Direct Tool Call documentation](primethink_js_call_tool_direct.md) for details.

---

## See Also

- **[Calling Agent Tools Directly](primethink_js_call_tool_direct.md)** — Low-level tool calling API
- **[Live Apps SDK](Live-Apps.md)** — Creating Live Apps in PrimeThink
- **[Data Management API](Data-Management-API.md)** — PrimeThink data management methods

---

**Last Updated:** March 9, 2026
**Version:** 20260309
