# PrimeThink.js - Document Events & File Upload Best Practices

## Overview

When uploading files through the PrimeThink.js library, documents go through a processing pipeline that extracts text and indexes content for RAG (Retrieval-Augmented Generation) search. This guide explains how to track document processing status and retrieve extracted text.

## Document Processing Lifecycle

When a file is uploaded, it goes through these stages:

```
Upload → Added → Loaded → Processed → Ready (or Error at any stage)
```

| Status | Description | `extracted_text_size` | `indexed` | Can use RAG? | Can get text? |
|--------|-------------|----------------------|-----------|--------------|---------------|
| `Added` | File uploaded, queued for processing | `null` | `"False"` | ❌ | ❌ |
| `Loaded` | Text extracted from the document | `> 0` | `"False"` | ❌ | ✅ |
| `Processed` | Text chunked for indexing | `> 0` | `"False"` | ❌ | ✅ |
| `Ready` | Fully processed and indexed | `> 0` | `"True"` | ✅ | ✅ |
| `Error` | Processing failed | `null` | `"False"` | ❌ | ❌ |

## Socket Events

The server emits `document_change` events via Socket.IO whenever a document's state changes:

```javascript
// Event: document_change
{
    payload: {
        id: 1399,                    // Document ID
        uuid: "a1b2c3d4-...",        // Document UUID
        name: "report.pdf",          // Filename
        mimetype: "application/pdf", // MIME type
        status: "Ready",             // DocumentStatus: 'Added', 'Loaded', 'Processed', 'Ready', or 'Error'
        extracted_text_size: 1261,   // Characters extracted (null if not yet extracted)
        indexed: "True",             // "True" or "False"
        path: "/reports",            // Folder path
        chat_uuid: "c3d4e5f6-...",   // Chat UUID
        document_in_chat_status: "search", // DocumentInChatStatus: 'archived', 'search', 'attached', or 'context'
        download_url: "https://..."  // Download URL
    }
}
```

!!! note "`indexed` is a string in socket payloads"
    In `document_change` socket events the `indexed` field is serialized as the strings `"True"`/`"False"`, unlike REST payloads where the same field is a real boolean. Compare with `doc.indexed === "True"` when handling socket events.

## API Reference

### `pt.onDocumentChanged(callback, options)`

Subscribe to document change events.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `function` | Called with document object on each change |
| `options.documentId` | `number` | Filter to specific document ID |
| `options.documentIds` | `number[]` | Filter to multiple document IDs |
| `options.status` | `string` | Filter to specific status |
| `options.statuses` | `string[]` | Filter to multiple statuses |

**Returns:**

`function` - Unsubscribe function

---

### `pt.waitForDocumentReady(documentId, options)`

Wait for a document to be fully processed.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `documentId` | `number` | required | Document ID to wait for |
| `options.timeout` | `number` | `60000` | Timeout in milliseconds |
| `options.rejectOnError` | `boolean` | `true` | Reject promise on processing error |

**Returns:**

`Promise<object>` - Resolves with document object when ready

---

### `pt.waitForAllDocumentsReady(documentIds, options)`

Wait for multiple documents to be ready. Useful after uploading multiple files when you need all of them processed before continuing.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `documentIds` | `number[]` | required | Array of document IDs to wait for |
| `options.timeout` | `number` | `120000` | Timeout in milliseconds for ALL documents (default: 2 minutes) |
| `options.failFast` | `boolean` | `true` | If true, reject immediately on first Error |
| `options.rejectOnError` | `boolean` | `true` | If true, reject on document processing errors |
| `options.onProgress` | `function` | - | Callback `(completed, total, document)` called as each document becomes ready |

**Returns:**

`Promise<object[]>` - Resolves with array of document objects in same order as `documentIds`

**Notes:**
- Results are returned in the same order as the input `documentIds` array
- With `failFast: false` and `rejectOnError: false`, failed documents return their error status in the results
- The `onProgress` callback is useful for updating progress bars during batch uploads

---

## When to Use waitForDocumentReady

Understanding when you need `waitForDocumentReady()` depends on how you upload files:

### addMessage with Attachments - No Wait Needed

When you use `pt.addMessage()` with file attachments, PrimeThink starts the normal extraction pipeline and coordinates the wait internally before the AI handles the message. Your app therefore **doesn't need to call `waitForDocumentReady()`**; wait only for the AI response.

The response can take longer while PrimeThink checks the attachments. If extraction does not finish within the server's wait period, or the file contains no readable text, the attachment remains in the message but the AI receives its basic file information instead of extracted text.

```javascript
// ✅ PrimeThink coordinates extraction internally - no waitForDocumentReady needed
const formData = new FormData();
formData.append('files', file);

const result = await pt.addMessage(formData, 'Analyze this document');
// (files-first overload of addMessage — see Data Management API for both call forms)
const response = await pt.waitForMessageReceived(result.task_id);

// PrimeThink waited for extraction before the AI response when text was available
console.log('AI analysis:', response.message);
```

### uploadFiles (Silent Upload) - Wait Required

When you use `pt.uploadFiles()` for silent uploads (no message, no AI processing), the documents go through the standard processing pipeline. If you need to access the extracted text or use RAG search, **you must wait for processing to complete**.

```javascript
// ⚠️ Silent upload - must wait before accessing extracted text
const result = await pt.uploadFiles(form, 'documents');
const doc = result.documents[0];

// Document is in "Added" status, not ready yet
console.log('Status:', doc.status);  // "Added"

// Wait for processing to complete
const readyDoc = await pt.waitForDocumentReady(doc.id);
console.log('Ready! Text size:', readyDoc.extracted_text_size);

// Now safe to get extracted text
const textResult = await pt.getDocumentText(doc.id);
```

### Quick Reference

| Upload Method | Extraction coordination | Need `waitForDocumentReady()` in your app |
|---------------|-------------------------|---------------------------------------------|
| `pt.addMessage(formData, message)` | PrimeThink waits internally before the AI responds | ❌ No |
| `pt.uploadFiles(form)` | Your app waits if it needs extracted text | ✅ Yes (for text extraction) |

## Best Practices

### 1. Upload and Wait for Text Extraction

**Use Case:** You uploaded files silently with `uploadFiles()` and need the extracted text.

```javascript
// Upload the file (silent - no AI processing)
const result = await pt.uploadFiles(form);
const doc = result.documents[0];
console.log('Uploaded:', doc.name);
console.log('Status:', doc.status);  // "Added"

// Wait for processing to complete
try {
    const readyDoc = await pt.waitForDocumentReady(doc.id);
    console.log('Ready! Text size:', readyDoc.extracted_text_size);

    // Now get the extracted text
    const textResult = await pt.getDocumentText(doc.id);
    console.log('Extracted text:', textResult.text);
} catch (error) {
    console.error('Processing failed:', error.message);
}
```

### 2. Upload and Use RAG Search Later

**Use Case:** You upload files but don't need immediate access to text.

```javascript
// Upload files
const result = await pt.uploadFiles(form, 'documents');
console.log(`Uploaded ${result.documents.length} files`);

// Subscribe to know when they're ready
const docIds = result.documents.map(d => d.id);
const readyCount = { value: 0 };

const unsubscribe = pt.onDocumentChanged(async (doc) => {
    if (doc.status === 'Ready') {
        readyCount.value++;
        updateProgressBar(readyCount.value, docIds.length);

        if (readyCount.value === docIds.length) {
            showNotification('All documents ready for search!');
            unsubscribe();

            // Now use RAG search (only works on Ready documents)
            const searchResults = await pt.searchDocuments('quarterly revenue');
        }
    }
}, { documentIds: docIds, status: 'Ready' });
```

### 3. Batch Upload with Progress Tracking

**Use Case:** Upload multiple files and show processing progress.

```javascript
async function uploadWithProgress(files) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    // Upload all files
    const result = await pt.uploadFiles(formData);
    const docIds = result.documents.map(d => d.id);
    const total = docIds.length;

    // Track progress
    const processed = new Set();
    const errors = [];

    return new Promise((resolve) => {
        const unsubscribe = pt.onDocumentChanged((doc) => {
            if (doc.status === 'Ready') {
                processed.add(doc.id);
                updateUI(`Processing: ${processed.size}/${total}`);
            } else if (doc.status === 'Error') {
                processed.add(doc.id);
                errors.push(doc.name);
            }

            if (processed.size === total) {
                unsubscribe();
                resolve({
                    success: total - errors.length,
                    failed: errors
                });
            }
        }, { documentIds: docIds });
    });
}

// Usage
const result = await uploadWithProgress(fileList);
console.log(`${result.success} files processed`);
if (result.failed.length > 0) {
    console.warn('Failed:', result.failed);
}
```

### 3b. Batch Upload with waitForAllDocumentsReady (Simpler)

**Use Case:** Same as above, but using the batch helper method.

```javascript
async function uploadWithProgress(files) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    // Upload all files
    const result = await pt.uploadFiles(formData);
    const docIds = result.documents.map(d => d.id);

    // Wait for all with progress tracking
    const readyDocs = await pt.waitForAllDocumentsReady(docIds, {
        timeout: 180000,  // 3 minutes for batch
        onProgress: (completed, total, doc) => {
            updateUI(`Processing: ${completed}/${total}`);
            console.log(`${doc.name} ready`);
        }
    });

    return readyDocs;
}

// Usage
const docs = await uploadWithProgress(fileList);
console.log(`All ${docs.length} files processed`);
```

### 3c. Batch Upload with Error Handling

```javascript
// Continue even if some documents fail
const result = await pt.uploadFiles(formData);
const docIds = result.documents.map(d => d.id);

const docs = await pt.waitForAllDocumentsReady(docIds, {
    failFast: false,
    rejectOnError: false,
    onProgress: (done, total, doc) => {
        const status = doc.status === 'Ready' ? '✓' : '✗';
        console.log(`${status} ${doc.name} (${done}/${total})`);
    }
});

const successful = docs.filter(d => d && d.status === 'Ready');
const failed = docs.filter(d => d && d.status === 'Error');
console.log(`${successful.length} ready, ${failed.length} failed`);
```

### 4. Real-time Document Status Display

**Use Case:** Show live status updates in the UI.

```javascript
function DocumentUploader() {
    const [documents, setDocuments] = useState([]);

    useEffect(() => {
        // Subscribe to all document changes for this chat
        const unsubscribe = pt.onDocumentChanged((doc) => {
            setDocuments(prev => {
                const existing = prev.find(d => d.id === doc.id);
                if (existing) {
                    return prev.map(d => d.id === doc.id ? doc : d);
                }
                return [...prev, doc];
            });
        });

        return () => unsubscribe();
    }, []);

    const handleUpload = async (files) => {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const result = await pt.uploadFiles(formData);
        // Documents will appear via onDocumentChanged events
    };

    return (
        <div>
            {documents.map(doc => (
                <div key={doc.id} className={`doc-${doc.status.toLowerCase()}`}>
                    <span>{doc.name}</span>
                    <span>{doc.status}</span>
                    {doc.status === 'Ready' && (
                        <span>{doc.extracted_text_size} chars</span>
                    )}
                </div>
            ))}
        </div>
    );
}
```

### 5. Upload with Immediate Text Access (Polling Fallback)

**Use Case:** Need text immediately, with fallback if socket events fail.

```javascript
async function uploadAndGetText(file, maxWaitMs = 30000) {
    const formData = new FormData();
    formData.append('files', file);

    const result = await pt.uploadFiles(formData);
    const docId = result.documents[0].id;

    // Try socket-based waiting first
    try {
        await pt.waitForDocumentReady(docId, { timeout: maxWaitMs });
    } catch (error) {
        // Fallback to polling if socket fails
        console.warn('Socket timeout, falling back to polling');
        await pollUntilReady(docId, maxWaitMs);
    }

    // Get the extracted text
    const textResult = await pt.getDocumentText(docId);
    return textResult.text;
}

async function pollUntilReady(docId, maxWaitMs) {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitMs) {
        const status = await pt.getDocumentStatus(docId);
        if (status.document_status === 'Ready') {
            return;
        }
        if (status.document_status === 'Error') {
            throw new Error('Document processing failed');
        }
        await new Promise(r => setTimeout(r, pollInterval));
    }

    throw new Error('Polling timeout');
}
```

### 6. Error Handling Best Practices

```javascript
async function safeUploadAndProcess(file) {
    try {
        // Upload
        const formData = new FormData();
        formData.append('files', file);
        const result = await pt.uploadFiles(formData);
        const docId = result.documents[0].id;

        // Wait for processing
        const doc = await pt.waitForDocumentReady(docId, {
            timeout: 60000,
            rejectOnError: true
        });

        // Get text
        const text = await pt.getDocumentText(docId);

        return { success: true, text: text.text, document: doc };
    } catch (error) {
        // Categorize errors
        if (error.message.includes('timeout')) {
            return {
                success: false,
                error: 'processing_timeout',
                message: 'Document is taking too long to process. Try again later.'
            };
        }

        if (error.message.includes('failed')) {
            return {
                success: false,
                error: 'processing_failed',
                message: 'Could not extract text from this file format.'
            };
        }

        return {
            success: false,
            error: 'unknown',
            message: error.message
        };
    }
}
```

## Comparison: Waiting Strategies

| Strategy | Pros | Cons | Best For |
|----------|------|------|----------|
| `waitForDocumentReady()` | Simple, Promise-based | Single document only | Quick uploads, immediate text access |
| `waitForAllDocumentsReady()` | Simple, handles multiple docs, progress tracking | Less control than callback | Batch uploads with progress |
| `onDocumentChanged()` | Real-time, fine-grained control | More code to manage | Complex progress tracking, custom logic |
| Polling with `getDocumentStatus()` | Works without sockets | More API calls, slower | Fallback, debugging |

## Common Patterns

### Check if Document is Ready Before RAG Search

```javascript
async function searchInDocument(docId, query) {
    // Check status first
    const status = await pt.getDocumentStatus(docId);

    if (status.document_status !== 'Ready') {
        throw new Error(`Document not ready (status: ${status.document_status})`);
    }

    // Safe to search
    return await pt.searchDocuments(query, 'DOCUMENTS_ONLY', [docId]);
}
```

### Upload with Message (Files + AI Processing) - No Wait Needed

When using `addMessage()` with file attachments, PrimeThink waits internally for queued text extraction before asking the AI to handle the message. You only need to wait for the AI response, not poll document status yourself.

```javascript
// PrimeThink coordinates extraction as part of handling the message
const formData = new FormData();
formData.append('files', file);

const result = await pt.addMessage(formData, 'Analyze these documents');
const response = await pt.waitForMessageReceived(result.task_id);

// No separate waitForDocumentReady call is needed
console.log('AI analysis:', response.message);
```

This is different from `uploadFiles()` because:
- `addMessage()` associates the files with an AI-bound message
- PrimeThink waits for queued extraction internally when the model needs extracted text
- Your app does not need a separate document-status polling step for the AI response

### Silent Upload (No Message, No AI) - Wait Required

When using `uploadFiles()`, files are stored without AI processing. If you need to access extracted text or use RAG search later, you must wait for document processing.

```javascript
// Silent upload - files stored but not processed by AI
const result = await pt.uploadFiles(form, 'data/imports');

// If you need extracted text later, wait for processing
const doc = result.documents[0];
const readyDoc = await pt.waitForDocumentReady(doc.id);
const text = await pt.getDocumentText(doc.id);
```

## Troubleshooting

### Document Stuck in "Added" Status

1. Check if the file format is supported
2. Large files take longer to process
3. Server might be under heavy load

```javascript
// Add longer timeout for large files
const doc = await pt.waitForDocumentReady(docId, {
    timeout: 300000  // 5 minutes for large files
});
```

### Socket Events Not Received

1. Ensure Socket.IO connection is active
2. Check if Flutter wrapper is forwarding events
3. Use polling fallback

```javascript
// Debug: Log all socket events
pt.onSocketEvent((event, data) => {
    console.log('Socket event:', event, data);
});
```

### `extracted_text_size` is 0 or Very Small

Some file types may not have extractable text:
- Images without OCR text
- Encrypted PDFs
- Binary files

```javascript
const doc = await pt.waitForDocumentReady(docId);
if (doc.extracted_text_size === 0) {
    console.warn('No text could be extracted from this file');
}
```

## Related Methods

- `pt.uploadFiles()` - Upload files to chat
- `pt.waitForDocumentReady()` - Wait for single document to be ready
- `pt.waitForAllDocumentsReady()` - Wait for multiple documents to be ready
- `pt.getDocumentText()` - Get extracted text content
- `pt.getDocumentStatus()` - Check processing status
- `pt.searchDocuments()` - RAG search across documents
- `pt.onSocketEvent()` - Low-level socket event access
- `pt.addMessage()` - Send message with files
- `pt.waitForMessageReceived()` - Wait for AI response after sending message
- `pt.waitForAllMessagesReceived()` - Wait for multiple AI responses

---

**Last Updated:** February 1, 2026
**Version:** 20260201
