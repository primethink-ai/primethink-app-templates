# PrimeThink.js - Message Response Handling

## Overview

When sending messages to the AI, you can either wait synchronously for the response or handle it asynchronously via Socket.IO events. This guide covers both approaches and best practices.

> **⚠️ For AI generation tasks (content creation, document processing, image generation, or anything taking > 5 seconds), use the [Async Fire-and-Forget Pattern](Live-Pages-Best-Practices.md#async-fire-and-forget-pattern-for-ai-generation) instead.** Fire-and-forget saves results to the database, survives tab closes, and enables parallel execution — making it the recommended approach for production Live Apps that trigger AI work.

## Approaches for Waiting on AI Responses

### 1. Synchronous with Server-Side Wait (`awaitResponse: true`)

The server waits for the AI response before returning. Simplest approach - single API call.

```javascript
// Basic usage (default 120000ms = 2 minute timeout)
const result = await pt.addMessage('What is 2 + 2?', { awaitResponse: true });
console.log('AI says:', result.ai_responses[0].message);

// With custom timeout for complex queries (server-side wait)
const slowResult = await pt.addMessage('Complex analysis query...', {
    awaitResponse: true,
    awaitResponseTimeout: 300000  // 5 minutes
});
console.log('AI says:', slowResult.ai_responses[0].message);
```

### 2. Async + Polling with Client-Side Wait (`waitForMessageReceived`)

Send message immediately, then wait for response via Socket.IO. More flexible - allows cancellation and progress tracking.

```javascript
// Basic usage (default 120 second timeout)
const { task_id } = await pt.addMessage('What is 2 + 2?');
const response = await pt.waitForMessageReceived(task_id);
console.log('AI says:', response.message);

// With custom timeout (client-side wait, in milliseconds)
const { task_id: slowTaskId } = await pt.addMessage('Complex analysis query...');
const slowResponse = await pt.waitForMessageReceived(slowTaskId, {
    timeout: 300000  // 5 minutes (in milliseconds)
});
console.log('AI says:', slowResponse.message);
```

### 3. `onMessageReceived(taskId, callback)` - Callback-based

For advanced use cases where you need more control (cancellation, multiple listeners, streaming UI).

```javascript
const result = await pt.addMessage('What is 2 + 2?');
const unsubscribe = pt.onMessageReceived(result.task_id, (message) => {
    console.log('AI says:', message.message);
    unsubscribe();
});
```

### Comparison: Server-Side vs Client-Side Wait vs Fire-and-Forget

| Aspect | `awaitResponse: true` | `waitForMessageReceived()` | **[Fire-and-Forget](Live-Pages-Best-Practices.md#async-fire-and-forget-pattern-for-ai-generation)** |
|--------|----------------------|---------------------------|----------------------------------------------|
| Wait location | Server-side | Client-side (Socket.IO) | **Database polling** |
| Timeout unit | Milliseconds | Milliseconds | Custom (poll interval) |
| Default timeout | 120000 ms (2 minutes) | 120000 ms (2 minutes) | No timeout (poll until done) |
| Cancellation | Not possible | Possible with `onMessageReceived` | ✅ Stop polling anytime |
| Progress tracking | ❌ | ✅ with streaming events | ✅ Per-entity status |
| Survives tab close | ❌ Results lost | ❌ Results lost | **✅ Results saved to DB** |
| Parallel execution | ❌ Sequential | ✅ With Promise.all | **✅ Fully parallel** |
| Network efficiency | Single request | Two requests + Socket.IO | Multiple poll requests |
| Best for | Quick lookups (< 5s) | UI with progress/cancel | **AI generation, batch tasks, production apps** |

> **Recommendation:** For any AI work that takes more than a few seconds (content generation, document processing, image creation), use the **[Async Fire-and-Forget Pattern](Live-Pages-Best-Practices.md#async-fire-and-forget-pattern-for-ai-generation)**. It is the most resilient and scalable approach for production Live Apps.

## Why Use Async Message Handling?

When sending messages without awaiting (`awaitResponse: false`, the default), the API returns immediately with a `task_id`:

```javascript
const result = await pt.addMessage('Hello there', { awaitResponse: false });
// Returns immediately:
// {
//   success: true,
//   user_message: { id: 18695, message: "hello there" },
//   details: "Message has been queued",
//   task_id: "e1f2a3b4-c5d6-4789-8678-901234567890"
// }
```

The AI then processes the message in the background and streams the response via Socket.IO.

## Socket Events Flow

When a message is processed, the following Socket.IO events are emitted:

1. `message` - User message created (id: 18695)
2. `message` - AI message placeholder created (id: 18696)
3. `stream_reasoning_token` - Reasoning/thinking tokens (if model supports it)
4. `stream_partial_token` - Response tokens as they're generated
5. `stream_completed` - Streaming finished for task
6. `message` - Final AI message with complete content

Both `waitForMessageReceived` and `onMessageReceived` wait for `stream_completed` and then deliver the final message.

## API Reference

### `pt.waitForMessageReceived(taskId, options)`

Wait for the AI response message for a specific task. Returns a Promise.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `taskId` | `string` | required | The task_id returned from `addMessage()` |
| `options.timeout` | `number` | `120000` | Timeout in milliseconds (default: 2 minutes) |

**Returns:**

`Promise<object>` - Resolves with the complete AI message object

**Throws:**

- `Error` - If timeout is reached before response arrives

---

### `pt.onMessageReceived(taskId, callback)`

Subscribe to receive the AI response message for a specific task.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `taskId` | `string` | The task_id returned from `addMessage()` when `awaitResponse` is `false` |
| `callback` | `function` | Callback function called with the complete AI message object |

**Returns:**

`function` - Unsubscribe function to remove the listener

---

### `pt.waitForAllMessagesReceived(taskIds, options)`

Wait for multiple AI responses to complete. Useful when sending multiple messages in parallel and waiting for all responses.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `taskIds` | `string[]` | required | Array of task_ids returned from `addMessage()` |
| `options.timeout` | `number` | `120000` | Timeout in milliseconds for ALL responses (default: 2 minutes) |
| `options.failFast` | `boolean` | `true` | If true, reject immediately on first timeout |
| `options.onProgress` | `function` | - | Callback `(completed, total, message)` called as each response arrives |

**Returns:**

`Promise<object[]>` - Resolves with array of message objects in same order as `taskIds`

**Notes:**
- Results are returned in the same order as the input `taskIds` array
- With `failFast: false`, timed-out tasks return `null` in the results array
- The `onProgress` callback is useful for updating progress bars or status indicators

---

### Message Object Structure

Both methods provide a message object with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `number` | Message ID |
| `message` | `string` | Full message text (automatically fetched if truncated) |
| `message_is_truncated` | `boolean` | Always `false` after processing (full text is fetched) |
| `user_type` | `string` | `'assistant'` for AI responses |
| `type` | `string` | Message type (e.g., `'message'`) |
| `created_at` | `string` | ISO timestamp |
| `chat_uuid` | `string` | UUID of the chat |
| `reasoning_steps` | `array\|null` | Array of reasoning steps (if available) |
| `attachments` | `array` | Array of attached documents |
| `from_virtual_assistant_id` | `number` | ID of the responding AI agent |

## Truncated Message Handling

Long AI responses may be truncated during Socket.IO transmission (messages over ~10KB). Both methods automatically:

1. Detect if `message_is_truncated` is `true`
2. Call `pt.getMessageText(messageId)` to fetch the full text
3. Replace the truncated message with the complete text
4. Set `message_is_truncated` to `false`

This ensures you always receive the complete message content.

## Examples

### Basic Usage with waitForMessageReceived (Recommended)

```javascript
// Simple one-liner pattern
const { task_id } = await pt.addMessage('Explain quantum computing');
const { message } = await pt.waitForMessageReceived(task_id);
document.getElementById('answer').textContent = message;
```

### Helper Function Pattern

```javascript
// Create a reusable helper
async function ask(question, options = {}) {
    const result = await pt.addMessage(question, options);
    return pt.waitForMessageReceived(result.task_id);
}

// Usage becomes very clean
const response = await ask('What is machine learning?');
console.log(response.message);

// With options
const hidden = await ask('Process this silently', { hidden: true });
```

### With Loading State

```javascript
async function askQuestion(question) {
    const loadingEl = document.getElementById('loading');
    const responseEl = document.getElementById('response');

    loadingEl.style.display = 'block';
    responseEl.textContent = '';

    try {
        const result = await pt.addMessage(question);
        const response = await pt.waitForMessageReceived(result.task_id);
        responseEl.textContent = response.message;

        // Show reasoning if available
        if (response.reasoning_steps?.length > 0) {
            const reasoningEl = document.getElementById('reasoning');
            reasoningEl.innerHTML = response.reasoning_steps
                .map(step => `<div class="step">${step.label}: ${step.content}</div>`)
                .join('');
        }
    } catch (error) {
        responseEl.textContent = 'Error: ' + error.message;
    } finally {
        loadingEl.style.display = 'none';
    }
}
```

### Custom Timeout for Long Responses

```javascript
// Pattern 1: Server-side wait with custom timeout (simpler)
const result = await pt.addMessage('Write a detailed 5000 word essay about AI history', {
    awaitResponse: true,
    awaitResponseTimeout: 300000  // 5 minutes
});
console.log(result.ai_responses[0].message);

// Pattern 2: Client-side wait with custom timeout (more flexible)
const { task_id } = await pt.addMessage('Write a detailed 5000 word essay about AI history');
const response = await pt.waitForMessageReceived(task_id, {
    timeout: 300000  // 5 minutes
});
console.log(response.message);
```

### Parallel Questions

```javascript
// Ask multiple questions simultaneously
const questions = [
    'What is artificial intelligence?',
    'What is machine learning?',
    'What is deep learning?'
];

// Send all questions
const results = await Promise.all(
    questions.map(q => pt.addMessage(q))
);

// Wait for all responses
const responses = await Promise.all(
    results.map(r => pt.waitForMessageReceived(r.task_id))
);

// Display results
responses.forEach((response, i) => {
    console.log(`Q: ${questions[i]}`);
    console.log(`A: ${response.message}\n`);
});
```

### Batch Questions with waitForAllMessagesReceived

```javascript
// Simpler approach using waitForAllMessagesReceived
const questions = ['What is AI?', 'What is ML?', 'What is DL?'];
const results = await Promise.all(questions.map(q => pt.addMessage(q)));
const taskIds = results.map(r => r.task_id);

const responses = await pt.waitForAllMessagesReceived(taskIds);
responses.forEach((r, i) => {
    console.log(`Q: ${questions[i]}`);
    console.log(`A: ${r.message}`);
});
```

### Batch Questions with Progress Tracking

```javascript
const questions = ['Question 1?', 'Question 2?', 'Question 3?'];
const results = await Promise.all(questions.map(q => pt.addMessage(q)));
const taskIds = results.map(r => r.task_id);

const responses = await pt.waitForAllMessagesReceived(taskIds, {
    timeout: 180000,  // 3 minutes for all
    onProgress: (completed, total, message) => {
        updateProgressBar(completed / total * 100);
        console.log(`${completed}/${total} responses received`);
    }
});
```

### Batch Helper Function

```javascript
// Create a batch helper
async function askAll(questions, options = {}) {
    const results = await Promise.all(questions.map(q => pt.addMessage(q)));
    return pt.waitForAllMessagesReceived(
        results.map(r => r.task_id),
        options
    );
}

// Usage
const answers = await askAll(['Q1?', 'Q2?', 'Q3?'], {
    onProgress: (done, total) => console.log(`${done}/${total}`)
});
```

### Graceful Degradation (failFast: false)

```javascript
// Continue even if some responses timeout
const responses = await pt.waitForAllMessagesReceived(taskIds, {
    failFast: false,
    timeout: 60000
});

// responses may contain null for timed-out tasks
const successful = responses.filter(r => r !== null);
const failed = responses.filter(r => r === null).length;
console.log(`${successful.length} succeeded, ${failed} timed out`);
```

### Error Handling

```javascript
async function safeAsk(question) {
    try {
        const result = await pt.addMessage(question);
        const response = await pt.waitForMessageReceived(result.task_id, {
            timeout: 60000
        });
        return { success: true, message: response.message };
    } catch (error) {
        if (error.message.includes('Timeout')) {
            return {
                success: false,
                error: 'timeout',
                message: 'Response is taking too long. Please try again.'
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

### Using onMessageReceived for Cancellation

```javascript
let currentUnsubscribe = null;

async function sendMessage(text) {
    // Cancel previous if still pending
    if (currentUnsubscribe) {
        currentUnsubscribe();
        currentUnsubscribe = null;
    }

    const result = await pt.addMessage(text);

    currentUnsubscribe = pt.onMessageReceived(result.task_id, (message) => {
        currentUnsubscribe = null;
        displayResponse(message);
    });
}

// Cancel button handler
document.getElementById('cancelBtn').onclick = () => {
    if (currentUnsubscribe) {
        currentUnsubscribe();
        currentUnsubscribe = null;
        showMessage('Response cancelled');
    }
};
```

### Combining with Streaming UI

```javascript
// Show streaming tokens while waiting for final message
async function askWithStreaming(question) {
    const result = await pt.addMessage(question);
    const taskId = result.task_id;

    // Show streaming tokens in real-time
    const streamUnsubscribe = pt.onSocketEvent((event, data) => {
        if (event === 'stream_partial_token' && data.task_id?.startsWith(taskId)) {
            appendToDisplay(data.chunk);
        }
    });

    // Wait for complete response
    try {
        const response = await pt.waitForMessageReceived(taskId);
        // Replace streaming content with final formatted message
        setDisplay(response.message);
        return response;
    } finally {
        streamUnsubscribe();
    }
}
```

## Comparison: Approaches

| Aspect | `waitForMessageReceived` | `waitForAllMessagesReceived` | `onMessageReceived` |
|--------|-------------------------|------------------------------|---------------------|
| Style | Promise/async-await | Promise/async-await | Callback |
| Use case | Single response | Multiple responses | Advanced control |
| Cancellation | Not directly | Not directly | Easy with unsubscribe |
| Progress tracking | ❌ | ✅ `onProgress` callback | Manual |
| Code simplicity | ✅ Very simple | ✅ Simple | More boilerplate |
| Error handling | try/catch | try/catch + `failFast` | Manual |
| Best for | Most use cases | Batch operations | Cancellation, streaming UI |

## Best Practices

1. **Use `waitForMessageReceived` for most cases** - cleaner code, easier error handling
2. **Use `onMessageReceived` when you need cancellation** - user can stop waiting
3. **Set appropriate timeouts** - longer for complex requests
4. **Handle errors gracefully** - timeouts happen, show user-friendly messages
5. **Combine with streaming** - show progress while waiting for final response

## Best Practices: Streaming AI Responses

Streaming allows users to see AI responses as they're generated, providing a more responsive experience for long analyses.

### 1. Set up streaming before sending the message

```javascript
let streamedContent = '';
let renderTimeout = null;

// Initialize streaming UI
document.getElementById('streamingArea').classList.remove('hidden');

// Send message and get task_id
const result = await pt.addMessage(prompt);
const baseTaskId = result.task_id.split(':')[0];

// Subscribe to streaming events
const unsubscribe = pt.onSocketEvent((event, data) => {
    if (event === 'stream_partial_token' && data.task_id?.startsWith(baseTaskId)) {
        streamedContent += data.chunk || '';

        // Debounce rendering (50-100ms) to avoid excessive DOM updates
        clearTimeout(renderTimeout);
        renderTimeout = setTimeout(() => {
            // Sanitise the rendered markdown (marked passes raw HTML through)
            // before writing it to innerHTML
            const safeHtml = DOMPurify.sanitize(marked.parse(streamedContent));
            document.getElementById('output').innerHTML = safeHtml;
        }, 50);
    }
});

// Wait for complete response
const response = await pt.waitForMessageReceived(result.task_id);

// Cleanup
unsubscribe();
clearTimeout(renderTimeout);
```

### 2. Always clean up listeners

- Call the unsubscribe function in `finally` blocks and error handlers
- Clear any pending timeouts to prevent memory leaks

### 3. Debounce rendering

- Don't render on every chunk (can be 50+ per second)
- Use 50-100ms debounce for smooth updates without performance issues

### 4. Handle markdown incrementally

- Use `marked.parse()` for live markdown rendering
- Wrap in try/catch as partial markdown may fail to parse

### 5. Auto-scroll for long content

```javascript
const container = document.getElementById('streamingOutput');
container.scrollTop = container.scrollHeight;
```

### 6. Event structure reference

```javascript
// stream_partial_token event data:
{
    task_id: "uuid:messageId",      // Match with baseTaskId (before colon)
    chat_id: 89,
    chat_uuid: "817f9ece-...",
    ai_message_id: 590,
    agent_id: 4,
    chunk: "The actual text",       // Use this field for the streamed text
    chunk_idx: 27                   // Chunk sequence number
}
```

## Related Methods

- `pt.addMessage()` - Send messages to the chat (for AI generation, use [fire-and-forget pattern](Live-Pages-Best-Practices.md#async-fire-and-forget-pattern-for-ai-generation))
- `pt.waitForAllMessagesReceived()` - Wait for multiple AI responses
- `pt.onSocketEvent()` - Subscribe to all socket events (for streaming tokens)
- `pt.getMessageText()` - Fetch full message text by ID
- `pt.stopStreamingMessage()` - Stop a streaming response in progress

---

**Last Updated:** March 3, 2026
**Version:** 20260303
