# File Storage Hierarchy and Access Control

## Overview

The PrimeThink API uses a hierarchical file storage system with special folders that provide different levels of access control. This system allows you to store files in three distinct locations with different permission requirements.

## Storage Locations

### 1. **@public Folder** (Public Access)
- **Access Level**: No authentication required
- **Use Case**: Files that should be publicly accessible to anyone with the URL
- **Storage Path**: `root.public` (in ltree format)
- **Example**: Public marketing materials, shared documents, static assets

**Key Features:**
- ✅ No login required
- ✅ No group membership required
- ✅ No chat membership required
- ✅ Accessible via direct URL

### 2. **@liveapp Folder** (Group-Level Access)
- **Access Level**: Requires authentication + group membership
- **Use Case**: Files shared across a group but not specific to a chat
- **Storage Path**: `root.liveapps` (in ltree format)
- **Example**: Group templates, shared resources, live app assets

**Key Features:**
- ✅ Authentication required
- ✅ Group membership required
- ❌ Chat membership NOT required
- ✅ Accessible from any chat in the group

### 3. **Chat Root Folder** (Chat-Specific Access)
- **Access Level**: Requires authentication + chat membership
- **Use Case**: Files specific to a particular chat
- **Storage Path**: `root` or `root.<subfolder>` (in ltree format)
- **Example**: Chat-specific documents, private files, conversation attachments

**Key Features:**
- ✅ Authentication required
- ✅ Group membership required
- ✅ Chat membership required
- ❌ Not accessible from other chats

## How the System Works

### Storage Hierarchy

```
root
├── public/          (@public - public access)
│   └── filename.pdf
├── liveapps/        (@liveapp - group access)
│   └── data.json
└── <chat root>      (chat-specific access)
    ├── file.txt
    └── folder/
        └── nested.js
```

### Access Control Matrix

| Storage Location | Auth Required | Group Required | Chat Required | Public Access |
|-----------------|---------------|----------------|---------------|---------------|
| @public         | ❌ No         | ❌ No          | ❌ No         | ✅ Yes        |
| @liveapp        | ✅ Yes        | ✅ Yes         | ❌ No         | ❌ No         |
| Chat root       | ✅ Yes        | ✅ Yes         | ✅ Yes        | ❌ No         |

## File Lookup Priority

When you request a file using **just the filename** (without a path or special prefix), the system searches in this order:

### Order of Search:
1. **@public folder** → Returns immediately if found (no auth check)
2. **@liveapp folder** → Checks if found and verifies user is authenticated
3. **Chat root folder** → Checks if found and verifies user is in chat

### Examples:

#### Example 1: Simple Filename
Request: `"demo.pdf"`

Search Process:
1. Checks @public/demo.pdf → ❌ Not found
2. Checks @liveapp/demo.pdf → ✅ Found!
   → Verifies user is authenticated
   → Returns file

#### Example 2: Nested Path
Request: `"folder/report.xlsx"`

Search Process:
- Skips @public and @liveapp (has "/" in path)
- Goes directly to chat root
- Looks for root.folder/report.xlsx
- Verifies user is authenticated AND in chat
- Returns file

#### Example 3: Explicit @public Prefix
Request: `"@public/brochure.pdf"`

Search Process:
- Recognizes @public prefix
- Goes directly to root.public/brochure.pdf
- Returns file (no auth check)

## Special Prefixes

### User-Facing vs Internal Storage

The system uses special **user-facing prefixes** (`@public`, `@liveapp`) that map to **internal storage paths**:

| User-Facing Path | Internal Storage (ltree) | Display Path |
|-----------------|--------------------------|--------------|
| `@public/file.pdf` | `root.public` + name: `file.pdf` | `/file.pdf` |
| `@liveapp/data.json` | `root.liveapps` + name: `data.json` | `/data.json` |
| `folder/file.txt` | `root.folder` + name: `file.txt` | `folder/file.txt` |

### Important Notes:

1. **@public and @liveapp are NOT actual folder paths** - they're special prefixes that map to root-level storage
2. When displayed to users, `@public` and `@liveapp` files appear with a leading `/` (e.g., `/file.pdf`)
3. These prefixes can be written with or without a leading slash: `@public/file.pdf` or `/@public/file.pdf`

## Permission Enforcement

### How Permissions Are Checked:

1. **Public Files (@public)**
   - ✅ Always accessible
   - No authentication checks performed
   - Anyone with the URL can access

2. **LiveApp Files (@liveapp)**
   - ✅ User must be authenticated
   - ✅ User's authentication token contains group ID
   - ❌ Chat membership is NOT checked
   - Used for group-wide resources

3. **Chat Files (root)**
   - ✅ User must be authenticated
   - ✅ User must be in the group
   - ✅ User must be a member of the specific chat
   - Most restrictive access level

### Error Responses:

| Scenario | HTTP Status | Error Message |
|----------|-------------|---------------|
| Public file not found | 404 | "Document not found" |
| Non-public file, no auth | 401 | "Authentication required" |
| User not in chat | 403 | "Forbidden: user is not in the chat" |
| File not found after auth | 404 | "Document not found" |

## Best Practices

### When to Use Each Location:

**Use @public for:**
- Marketing materials
- Public documentation
- Static assets for public pages
- Shareable content without login

**Use @liveapp for:**
- Templates shared across the group
- Live app resources
- Group-wide configuration files
- Assets needed by multiple chats

**Use Chat Root for:**
- Private chat documents
- User-uploaded files
- Chat-specific attachments
- Confidential information

### Security Considerations:

1. **Never store sensitive data in @public** - it's publicly accessible
2. **Use @liveapp for group-wide but non-public files** - requires authentication
3. **Use chat root for confidential data** - most secure, requires chat membership
4. **File paths are case-sensitive** - `File.pdf` ≠ `file.pdf`
5. **Validate file access** - system automatically enforces permissions
