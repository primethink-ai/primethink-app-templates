# PrimeThink.js - Calling Agent Tools Directly

## Overview

The `callToolDirect` method allows Live Apps to call agent tools directly, bypassing the LLM interpretation layer. This is useful for:

- Calling specific tools with known parameters
- Building integrations that don't need LLM interpretation
- Performance-critical operations where you want direct tool access
- Accessing MCP servers, external APIs, web searches, and document generation

## Important Considerations

**Tools are powerful but require precision.** Unlike sending a message to the AI (which interprets your intent), calling a tool directly requires you to:

1. **Know the exact tool name** — Tool names are case-sensitive and must match exactly
2. **Provide correct parameters** — There is no LLM to infer missing or malformed arguments
3. **Handle the raw response** — The output is returned as-is without AI interpretation

Before integrating a tool into your Live App, you should:
- Test the tool in the chat interface first to understand its behavior
- Document the exact input parameters required
- Understand the output format so you can parse it correctly

## Tool Call Syntax

Internally, tool calls use the `@tool:name(args)` syntax:

```
@tool:perplexity_web_search({'query': ['AI news today'], 'max_results': 10})
@tool:notify_user({'text': 'Processing complete'})
@tool:save_document({'format': 'PDF', 'content': '# Report', 'filename': 'report.pdf'})
@tool:read_content_of_url({'url': 'https://example.com'})
```

The `callToolDirect` method handles this syntax for you — you just provide the tool name and arguments as a JavaScript object.

---

## API Reference

### `pt.callToolDirect(toolName, toolArgs?, options?)`

Call an agent tool directly and receive its output.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `toolName` | `string` | Yes | — | The name of the tool to call (e.g., `'manage_list_organizations'`) |
| `toolArgs` | `object` | No | `{}` | Arguments to pass to the tool |
| `options.awaitResponse` | `boolean` | No | `true` | Wait for result. If `false`, returns immediately with `task_id` |

**Returns:** `Promise<object>`

When `awaitResponse=true` (default):

```javascript
{
  tool_name: "manage_list_organizations",
  tool_args: {},
  result: { /* tool output, parsed as JSON if possible */ }
}
```

When `awaitResponse=false`:

```javascript
{
  tool_name: "manage_list_organizations",
  tool_args: {},
  task_id: "abc-123-def",
  message: "Tool call queued"
}
```

**Notes:**
- The tool call message is hidden from the chat UI
- Available tools depend on the capabilities of the default agent selected for the chat

---

## Examples

### Simple Tool Call

```javascript
// Call a tool with no arguments
const result = await pt.callToolDirect('manage_list_organizations');
console.log(result.result.organizations);
```

### Tool Call with Arguments

```javascript
// Search for matters
const result = await pt.callToolDirect('manage_search_matters_by_text', {
    query: 'trademark application',
    page: 1,
    page_size: 10
});

result.result.matters.forEach(matter => {
    console.log(`${matter.ref_no}: ${matter.title}`);
});
```

### Notify User

```javascript
// Send a notification to the user
const result = await pt.callToolDirect('notify_user', {
    text: 'Processing your request...'
});
console.log(result.result); // "User notified"
```

### Web Search (Perplexity)

```javascript
const result = await pt.callToolDirect('perplexity_web_search', {
    query: ['Reuters AI news today', 'BBC AI news UK'],
    country: 'GB',
    max_results: 15
});

// Access search results
console.log(result.result);
```

### Save Document

```javascript
const result = await pt.callToolDirect('save_document', {
    format: 'PDF',
    mimetype: 'application/pdf',
    content: '# Monthly Report\n\n## Summary\n\nKey findings...',
    filename: 'Monthly_Report.pdf',
    folder: 'reports',
    attachment_mode: 'search'  // Make searchable via RAG
});

console.log('Document saved:', result.result.filename);
```

### Read URL Content

```javascript
const result = await pt.callToolDirect('read_content_of_url', {
    url: 'https://www.example.com/article'
});

console.log(result.result.content);
```

---

## Async Calls (Don't Wait for Response)

For long-running operations, you can dispatch the tool call without waiting:

```javascript
// Start a long-running operation without waiting
const result = await pt.callToolDirect('some_long_running_tool', {
    data: 'test'
}, { awaitResponse: false });

console.log('Task started:', result.task_id);

// Listen for the response later
pt.onMessageReceived(result.task_id, (message) => {
    console.log('Tool completed:', message.message);
});
```

This is useful when:
- The tool may take a long time to complete
- You want to show progress or allow cancellation
- You need to run multiple tool calls in parallel

---

## Tool Name Discovery

In development mode, if you call a non-existent tool, the error response will include a list of available tools:

```javascript
try {
    await pt.callToolDirect('nonexistent_tool');
} catch (error) {
    // In dev mode, error includes available_tools array
    console.log(error);
}
```

This helps you discover what tools are available for the current agent configuration.

---

## Error Handling

Tool calls can fail for various reasons. Always wrap calls in try/catch:

```javascript
try {
    const result = await pt.callToolDirect('unknown_tool');
} catch (error) {
    console.error('Tool call failed:', error.message);
    // Error message will include available tools in dev mode
}
```

### Safe Wrapper Pattern

```javascript
async function safeToolCall(toolName, args = {}) {
    try {
        const result = await pt.callToolDirect(toolName, args);
        return { success: true, data: result.result };
    } catch (error) {
        console.error(`Tool call failed: ${toolName}`, error);
        return {
            success: false,
            error: error.message,
            toolName: toolName
        };
    }
}

// Usage
const result = await safeToolCall('perplexity_web_search', {
    query: ['latest tech news']
});

if (result.success) {
    displayResults(result.data);
} else {
    showError(`Search failed: ${result.error}`);
}
```

### Common Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| Tool not found | Incorrect tool name or tool not available | Verify tool name; check error for available tools |
| Invalid arguments | Missing or malformed parameters | Check tool documentation for required params |
| Timeout | Tool took too long to respond | Use `awaitResponse: false` and listen for completion |
| Permission denied | Tool requires specific permissions | Check agent configuration |

---

## Backend Action

The `call_tool_direct` action is available via the live apps action endpoint. This is what `callToolDirect` does internally:

```javascript
// Low-level equivalent
await pt.action('call_tool_direct', {
    tool_name: 'manage_list_organizations',
    tool_args: {},
    await_response: true
});
```

---

## Best Practices

### 1. Test Tools in Chat First

Before using a tool in your Live App, test it in the chat interface:
- Send a message asking the AI to use the tool
- Observe the input format the AI uses
- Examine the output structure

### 2. Document Tool Signatures

Create a reference for the tools you use:

```javascript
// Tool Reference for this Live App
const TOOLS = {
    webSearch: {
        name: 'perplexity_web_search',
        params: {
            query: 'string[] - search queries',
            country: 'string - ISO country code (optional)',
            max_results: 'number - max results (optional)'
        },
        returns: 'object with results array'
    },
    saveDocument: {
        name: 'save_document',
        params: {
            format: 'string - PDF, DOCX, etc.',
            mimetype: 'string - MIME type',
            content: 'string - markdown content',
            filename: 'string - output filename',
            folder: 'string - destination folder path (optional)',
            attachment_mode: "string - 'archived', 'search', 'attached', or 'context' (optional)"
        },
        returns: 'object with document info'
    }
};
```

### 3. Create Wrapper Functions

Abstract tool calls into domain-specific functions:

```javascript
// Domain-specific wrapper
async function searchMatters(query, page = 1) {
    const result = await pt.callToolDirect('manage_search_matters_by_text', {
        query: query,
        page: page,
        page_size: 10
    });
    return result.result.matters || [];
}

// Usage is clear and self-documenting
const matters = await searchMatters('trademark application');
```

### 4. Handle Missing Tools Gracefully

Not all agents have the same tools available:

```javascript
async function tryWebSearch(query) {
    try {
        const result = await pt.callToolDirect('perplexity_web_search', {
            query: [query]
        });
        return result.result;
    } catch (error) {
        if (error.message.includes('not found')) {
            // Fallback: ask the AI to search instead
            const msgResult = await pt.addMessage(`Search the web for: ${query}`);
            return await pt.waitForMessageReceived(msgResult.task_id);
        }
        throw error;
    }
}
```

---

## Comparison: callToolDirect vs addMessage

| Aspect | `pt.callToolDirect` | `pt.addMessage` |
|--------|---------------------|-----------------|
| Execution | Direct tool call | AI interprets and may call tools |
| Speed | Faster (no AI processing) | Slower (AI reasoning required) |
| Flexibility | Exact parameters required | AI can infer intent |
| Output | Raw tool response | AI-formatted response |
| Error handling | Must handle raw errors | AI may retry or explain errors |
| Hidden from UI | Yes | No (unless `hidden: true`) |
| Best for | Automated workflows, known tool calls | Conversational interactions |

### When to Use Each

**Use `callToolDirect` when:**
- You know exactly which tool to call and with what parameters
- You want faster execution without AI overhead
- You need to hide the operation from the chat UI
- Building automated workflows

**Use `addMessage` when:**
- You want the AI to decide which tool to use
- The user should see the interaction
- You need the AI to interpret or format results
- Parameters are ambiguous or need inference

---

## Integration with primethink_manage.js

For Obviously Manage tools, use the `primethink_manage.js` library which provides typed wrappers:

```html
<!-- primethink.js (the `pt` object) is injected automatically by the platform;
     only the Manage wrapper needs an explicit include -->
<script src="/static/primethink_manage.js"></script>
<script>
    // Using the typed wrapper (recommended)
    const orgs = await ptManage.listOrganizations();

    // Using direct call (lower level)
    const result = await pt.callToolDirect('manage_list_organizations');
</script>
```

See the [PrimeThink Manage Library documentation](primethink_manage.md) for the full API reference.

---

## See Also

- **[PrimeThink Manage Library](primethink_manage.md)** — Typed wrappers for Obviously Manage tools
- **[`pt.addMessage()`](Live-Apps.md)** — Send messages to the AI (which may call tools)
- **[`pt.waitForMessageReceived()`](primethink_js_message_received.md)** — Wait for AI response
- **[`pt.onMessageReceived()`](primethink_js_message_received.md)** — Subscribe to AI response (for async tool calls)

---

**Last Updated:** February 11, 2026
**Version:** 20260211
