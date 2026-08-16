# File Download API

## Overview

The PrimeThink API provides a simple endpoint for downloading files directly by their path in live apps. This endpoint supports the three-tier storage hierarchy (`@public`, `@liveapp`, chat root) and automatically enforces access control based on the file location.

For detailed information about file storage locations and access control, see [File Storage Hierarchy](/File-Storage-Hierarchy/).

## Endpoint

```
GET /api/v1/live_apps/{chat_id}/{document_path}
```

This endpoint streams file content with proper MIME types for browser display and downloading.

### URL Structure

```
https://api.example.com/api/v1/live_apps/{chat_id}/{document_path}
                                         ↑                ↑
                                         |                |
                                    Chat UUID        File path/name
```

**Parameters:**
- `chat_id` (UUID, required): The chat **UUID** (the `chat_uuid` value seen in other payloads — not the numeric chat id)
- `document_path` (string, required): The file path, which can be:
  - Simple filename: `demo.pdf`
  - Nested path: `folder/subfolder/file.js`
  - `@public` prefix: `@public/brochure.pdf`
  - `@liveapp` prefix: `@liveapp/template.json`

### Response Format

**Success Response:**
- **Status**: 200 OK
- **Content-Type**: Proper MIME type (e.g., `application/pdf`, `image/png`, `text/plain`)
- **Content-Disposition**: `inline; filename="filename.ext"`
- **Body**: File content streamed directly

**Error Responses:**
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: User not in chat
- **404 Not Found**: File doesn't exist

## Usage Examples

### Example 1: Download Public File (No Authentication)

Files in the `@public` folder are accessible without authentication.

**Request:**
```bash
curl "https://api.example.com/api/v1/live_apps/c3d4e5f6-a7b8-4901-8def-123456789012/@public/brochure.pdf"
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="brochure.pdf"

[PDF binary content]
```

**What Happens:**
1. System recognizes `@public` prefix
2. Looks for file in `root.public` storage
3. Streams file content (no auth required)
4. Browser displays PDF inline

### Example 2: Download Simple Filename (Searches Multiple Locations)

When you provide just a filename, the system searches in priority order: `@public` → `@liveapp` → chat root.

**Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.example.com/api/v1/live_apps/c3d4e5f6-a7b8-4901-8def-123456789012/report.xlsx"
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: inline; filename="report.xlsx"

[Excel binary content]
```

**What Happens:**
1. System searches in order: `@public` → `@liveapp` → chat root
2. Finds file in `@liveapp`
3. Verifies user is authenticated
4. Streams file content
5. Browser triggers download or displays file

### Example 3: Download Nested Path (Chat-Specific)

Nested paths skip the `@public` and `@liveapp` search and go directly to the chat root.

**Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.example.com/api/v1/live_apps/c3d4e5f6-a7b8-4901-8def-123456789012/projects/2024/analysis.csv"
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: text/csv
Content-Disposition: inline; filename="analysis.csv"

[CSV content]
```

**What Happens:**
1. System recognizes nested path (contains `/`)
2. Skips `@public` and `@liveapp` search
3. Goes directly to chat root: `root.projects.2024`
4. Verifies user is authenticated AND in chat
5. Streams file content

### Example 4: Download @liveapp File

Files in the `@liveapp` folder require authentication but not chat membership.

**Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.example.com/api/v1/live_apps/c3d4e5f6-a7b8-4901-8def-123456789012/@liveapp/template.json"
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Disposition: inline; filename="template.json"

{
  "name": "Template",
  "version": "1.0"
}
```

**What Happens:**
1. System recognizes `@liveapp` prefix
2. Looks for file in `root.liveapps` storage
3. Verifies user is authenticated (group membership)
4. Does NOT check chat membership
5. Streams file content

### Example 5: Error - File Not Found

**Request:**
```bash
curl "https://api.example.com/api/v1/live_apps/c3d4e5f6-a7b8-4901-8def-123456789012/nonexistent.pdf"
```

**Response:**
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "detail": "Document not found"
}
```

### Example 6: Error - Authentication Required

**Request:**
```bash
curl "https://api.example.com/api/v1/live_apps/c3d4e5f6-a7b8-4901-8def-123456789012/private.docx"
```

**Response:**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "detail": "Authentication required to access this document"
}
```

## File Path Rules

### Valid Path Formats

✅ **Simple filename:**
```
report.pdf
image.png
data.json
```

✅ **Nested path:**
```
folder/file.txt
reports/2024/Q1/summary.xlsx
assets/images/logo.png
```

✅ **@public prefix:**
```
@public/brochure.pdf
/@public/marketing.pdf  (leading slash is optional)
```

✅ **@liveapp prefix:**
```
@liveapp/template.json
/@liveapp/config.yaml  (leading slash is optional)
```

### Invalid Path Formats

❌ **Empty path:**
```
(empty string)
```

❌ **Only special prefix without filename:**
```
@public/
@liveapp/
```

❌ **Multiple slashes:**
```
folder//file.txt  (automatically normalized to folder/file.txt)
```

## Authentication

### No Authentication Required:

- Files in `@public` folder
- Example: `@public/brochure.pdf`

### Bearer Token Required:

- Files in `@liveapp` folder
- Files in chat root
- Nested paths

**Header Format:**
```
Authorization: Bearer <session token>
```

The session token is the short-lived JWT issued at login. Treat it as a secret with a limited lifetime.

## Browser Integration

### Direct File Access in HTML

**Public File:**
```html
<img src="https://api.example.com/api/v1/live_apps/{chat_id}/@public/logo.png" alt="Logo">
```

**Protected File (with JavaScript):**

!!! warning "Storing auth tokens"
    The example below reads the session token from `localStorage` for brevity. `localStorage` is readable by any script on the page, so a single XSS bug exposes the token. For production, prefer a short-lived token, an in-memory reference, or an `HttpOnly` cookie, and always escape any user-provided content you render (see [Best Practices](Live-Pages-Best-Practices.md)).

```javascript
async function downloadFile(chatId, filePath) {
  const token = getSessionToken();  // however your app holds the short-lived token

  const response = await fetch(
    `https://api.example.com/api/v1/live_apps/${chatId}/${filePath}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
```

**Display PDF in iframe:**
```html
<iframe
  src="https://api.example.com/api/v1/live_apps/{chat_id}/@public/document.pdf"
  width="100%"
  height="600px">
</iframe>
```

## MIME Type Support

The endpoint automatically detects and sets the correct MIME type:

| File Extension | MIME Type | Browser Behavior |
|----------------|-----------|------------------|
| .pdf | application/pdf | Display inline |
| .png, .jpg | image/png, image/jpeg | Display inline |
| .json | application/json | Display inline |
| .txt | text/plain | Display inline |
| .csv | text/csv | Download |
| .xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | Download |
| .docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document | Download |
| .zip | application/zip | Download |

## Performance Considerations

### Streaming
- Files are streamed (not loaded entirely into memory)
- Supports large files efficiently
- Progressive download for browsers

### Caching
- Responses include appropriate cache headers
- Browser can cache public files
- Protected files have short cache lifetime

### CDN Integration
- Public files can be served via CDN
- Protected files served directly from API

## Security Features

### Automatic Access Control

1. **@public files**: No checks (public access)
2. **@liveapp files**: Verifies authentication token
3. **Chat files**: Verifies authentication + chat membership

### Rate Limiting
- Applied per user/token
- Prevents abuse
- Configurable limits

### Token Validation
- JWT tokens verified on each request
- Expired tokens rejected
- Invalid tokens return 401

## Common Use Cases

### 1. Public Marketing Materials

**Store:** `@public/brochure.pdf`

**Access:** `https://api.example.com/api/v1/live_apps/{chat_id}/@public/brochure.pdf`

**Auth:** None required

### 2. Group Templates

**Store:** `@liveapp/email-template.html`

**Access:** `https://api.example.com/api/v1/live_apps/{chat_id}/@liveapp/email-template.html`

**Auth:** Bearer token required

### 3. Chat Attachments

**Store:** `attachments/2024/invoice.pdf`

**Access:** `https://api.example.com/api/v1/live_apps/{chat_id}/attachments/2024/invoice.pdf`

**Auth:** Bearer token + chat membership required

### 4. Live App Assets

**Store:** `@liveapp/config.json`

**Access from live app JavaScript:**
```javascript
const response = await fetch(
  `/api/v1/live_apps/${chatId}/@liveapp/config.json`,
  { headers: { 'Authorization': `Bearer ${token}` }}
);
```

**Auth:** Bearer token required

## Error Handling

### Best Practices for Clients:

```javascript
async function downloadFile(chatId, filePath, authToken) {
  try {
    const response = await fetch(
      `https://api.example.com/api/v1/live_apps/${chatId}/${filePath}`,
      {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      }
    );

    if (response.status === 401) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    if (response.status === 403) {
      // Show error: user not in chat
      alert('You do not have access to this file');
      return;
    }

    if (response.status === 404) {
      // File not found
      alert('File not found');
      return;
    }

    if (response.ok) {
      // Success - process file
      const blob = await response.blob();
      return blob;
    }

  } catch (error) {
    console.error('Download failed:', error);
    alert('Download failed. Please try again.');
  }
}
```

## Summary

The file download endpoint provides:
- ✅ Direct file access via simple URLs
- ✅ Automatic access control based on storage location
- ✅ Browser-compatible streaming with proper MIME types
- ✅ Flexible authentication (public, group, chat-specific)
- ✅ Smart file lookup (searches @public → @liveapp → chat root)
- ✅ Secure by default with automatic permission enforcement

Perfect for building file sharing features, live apps, and document management systems.
