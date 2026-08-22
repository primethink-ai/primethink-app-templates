# API Examples

## PrimeThink API Documentation

This document provides comprehensive examples for interacting with the PrimeThink API using curl commands.

## Base URL
`https://api.primethink.ai`

All endpoints below are relative to this base URL and live under the `/api/v1` prefix (e.g. `https://api.primethink.ai/api/v1/...`).

## Authentication

All API requests require token-based authentication. Include your API token in the `Authorization` header:

```
Authorization: Token YOUR_API_TOKEN_HERE
```

## API Endpoints

### 1. Get Available Task Actions

Retrieve a list of all available task actions that can be executed.

**Endpoint**: `GET /api/v1/tasks/available_task_actions`

#### Curl Example {#get-task-actions-curl}

```bash
curl -X GET \
  "https://api.primethink.ai/api/v1/tasks/available_task_actions" \
  -H "accept: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN_HERE"
```

#### Response Example {#get-task-actions-response}

```json
[
  {
    "id": 101,
    "name": "Content Generator",
    "description": "Generate various types of content based on user specifications",
    "action_name": "generate_content"
  },
  {
    "id": 102,
    "name": "Data Analyzer",
    "description": "Analyze and extract insights from uploaded datasets",
    "action_name": "analyze_data"
  },
  {
    "id": 103,
    "name": "Document Summarizer",
    "description": "Create concise summaries of uploaded documents",
    "action_name": "summarize_document"
  },
  {
    "id": 104,
    "name": "Email Composer",
    "description": "Draft professional emails based on context and requirements",
    "action_name": "compose_email"
  },
  {
    "id": 105,
    "name": "Meeting Notes Generator",
    "description": "Convert meeting transcripts into structured notes and action items",
    "action_name": "generate_meeting_notes"
  }
]
```

---

### 2. Execute Task Action

Execute a specific task action with message input and optional file attachments.

**Endpoint**: `POST /api/v1/tasks/execute_task_action`

#### Parameters {#execute-task-action-parameters}

- `task_action_name` (required): Name of the task action to execute
- `message_input` (required): Input message for the task
- `return_original_message` (optional): Boolean flag to return original message (default: false)
- `files` (optional): One or more files to attach

#### Curl Examples {#execute-task-action-curl}

**Simple text-only request:**

```bash
curl -X POST \
  "https://api.primethink.ai/api/v1/tasks/execute_task_action" \
  -H "accept: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN_HERE" \
  -F "task_action_name=generate_content" \
  -F "message_input=Create a blog post about AI trends in 2024" \
  -F "return_original_message=false"
```

**Request with file attachments:**

```bash
curl -X POST \
  "https://api.primethink.ai/api/v1/tasks/execute_task_action" \
  -H "accept: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN_HERE" \
  -F "task_action_name=analyze_data" \
  -F "message_input=Please analyze the uploaded dataset for trends" \
  -F "return_original_message=true" \
  -F "files=@/path/to/data.csv" \
  -F "files=@/path/to/metadata.json"
```

**Request with return original message:**

```bash
curl -X POST \
  "https://api.primethink.ai/api/v1/tasks/execute_task_action" \
  -H "accept: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN_HERE" \
  -F "task_action_name=summarize_document" \
  -F "message_input=Summarize this document in 3 bullet points" \
  -F "return_original_message=true" \
  -F "files=@/path/to/document.pdf"
```

#### Response Example {#execute-task-action-response}

```json
{
  "user_message_id": 12345,
  "streaming_task_id": null,
  "responses": [
    {
      "id": 12346,
      "chat_id": 1001,
      "chat_uuid": null,
      "user_type": "assistant",
      "type": "message",
      "message": "Here's the generated content based on your request: [Generated content would appear here...]",
      "user_location": null,
      "created_at": "2024-11-18T10:30:02.123456Z",
      "message_processed_at": null,
      "from_user_id": 1,
      "from_virtual_assistant_id": 42,
      "task_id": "task_789012",
      "replying_to_message": {
        "id": 12345,
        "message": "Create a blog post about AI trends in 2024",
        "full_name": "John Doe",
        "type": "message"
      },
      "indexed": false,
      "llm_trace_id": "trace_abc123",
      "extra": null,
      "message_attachments": null,
      "memory_id": null,
      "edited": false,
      "reasoning_steps": [
        {
          "id": null,
          "label": "Processing request...",
          "right_text": null,
          "description_md": null,
          "emoji": null,
          "step_type": "reasoning",
          "order": null,
          "metadata": null,
          "children": null,
          "created_at": "2024-11-18T10:30:02.500000Z"
        }
      ],
      "aggregated_reactions": []
    }
  ]
}
```

---

### Assign Roles to a Task

Grant task-specific access to users through their current group roles.

**Endpoint**: `POST /api/v1/tasks/{task_id}/assign-roles-access`

The authenticated caller must already satisfy the task's owner-level access check. The request is **replace-all**, not incremental: `user_role_ids` becomes the task's complete role assignment set. Send an empty array to remove every assigned role.

```bash
curl -X POST \
  "https://api.primethink.ai/api/v1/tasks/42/assign-roles-access" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN_HERE" \
  -d '{
    "user_role_ids": [
      "11111111-2222-3333-4444-555555555555",
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    ]
  }'
```

A successful response returns the updated task. Its `assigned_roles` field contains the resolved role IDs and names:

```json
{
  "id": 42,
  "name": "Quarterly reporting",
  "assigned_roles": [
    {
      "id": "11111111-2222-3333-4444-555555555555",
      "name": "Reporting Analyst"
    },
    {
      "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "name": "Finance Manager"
    }
  ]
}
```

Users whose current group role matches an assignment can discover the task and pass task checks that normally require owner-level access. This is stronger than view-only sharing; assign only roles whose members should manage and use the task.

Possible errors include:

- `400 Bad Request` when one or more supplied role IDs do not exist; the response identifies the missing IDs
- `403 Forbidden` when the caller does not satisfy the task's owner-level access check
- `404 Not Found` when the task does not exist

---

### Check and Apply Task Updates to a Chat

Chats created from a task remain linked to that task. Use the check endpoint to determine whether the chat differs from the task's **Production** version, then use the update endpoint to apply that version. A newer non-production draft does not make `update_available` true.

**Check endpoint**: `GET /api/v1/chats/{chat_id}/task-updates/check`

```bash
curl -X GET \
  "https://api.primethink.ai/api/v1/chats/123/task-updates/check" \
  -H "accept: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN_HERE"
```

```json
{
  "chat_uuid": "11111111-2222-3333-4444-555555555555",
  "from_task_id": 42,
  "version_id": 3,
  "latest_task_version_id": 4,
  "update_available": true
}
```

**Apply endpoint**: `POST /api/v1/chats/{chat_id}/task-updates/update`

```bash
curl -X POST \
  "https://api.primethink.ai/api/v1/chats/123/task-updates/update" \
  -H "accept: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN_HERE"
```

The update copies the Production version's task-backed fields into the chat. It also performs a full mirror of the task's Live App `app/` subtree: changed and new files are synchronized, files removed from the task are removed from the chat, and documents outside `app/` are preserved.

A successful response includes per-operation document counts:

```json
{
  "detail": "New chat version created and set as production.",
  "chat_uuid": "11111111-2222-3333-4444-555555555555",
  "from_task_id": 42,
  "source_task_version_id": 4,
  "created_chat_version_number": 8,
  "fields_to_update": {
    "version_id": 4
  },
  "documents_synced": {
    "dirs_created": 0,
    "dirs_removed": 0,
    "files_synced": 2,
    "files_added": 1,
    "files_removed": 1
  },
  "documents_warning": null
}
```

Document synchronization runs even if there are no scalar-field changes. In that case, `detail` is `No changes detected. No chat version was created.`, `fields_to_update` is empty, and `created_chat_version_number` is `null` or omitted.

Live App file synchronization is best effort. If it fails, the task's other fields and any resulting chat version can still be updated; `documents_synced` is `null` and `documents_warning` contains `Live-app files could not be synced.` Treat a non-null warning as a partial update and retry or verify the chat's `app/` files before serving the Live App.

The apply endpoint returns HTTP 400 if the chat is not linked to a task and HTTP 404 if its source task no longer exists. Standard chat access checks also apply.

---

### 3. Send Message to Chat

Send a message to a specific chat by ID or mention name.

**Endpoint**: `POST /api/v1/chats/{chat_id_or_mention}/messages`

#### Parameters {#send-message-chat-parameters}

- `message_input` (required): Message content to send
- `is_sync` (optional): Boolean flag for synchronous/asynchronous processing (default: true)
- `files` (optional): One or more files to attach

#### Curl Examples {#send-message-chat-curl}

**Simple text message (synchronous):**

```bash
curl -X POST \
  "https://api.primethink.ai/api/v1/chats/my-project-chat/messages" \
  -H "accept: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN_HERE" \
  -F "message_input=Hello, how are you today?" \
  -F "is_sync=true"
```

**Asynchronous message:**

```bash
curl -X POST \
  "https://api.primethink.ai/api/v1/chats/12345/messages" \
  -H "accept: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN_HERE" \
  -F "message_input=Process this large dataset" \
  -F "is_sync=false"
```

**Message with file attachments:**

```bash
curl -X POST \
  "https://api.primethink.ai/api/v1/chats/team-collaboration/messages" \
  -H "accept: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN_HERE" \
  -F "message_input=Please review these documents" \
  -F "is_sync=true" \
  -F "files=@/path/to/report.pdf" \
  -F "files=@/path/to/spreadsheet.xlsx"
```

**Using chat ID (numeric):**

```bash
curl -X POST \
  "https://api.primethink.ai/api/v1/chats/987654321/messages" \
  -H "accept: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN_HERE" \
  -F "message_input=Can you help me with this analysis?" \
  -F "is_sync=true"
```

#### Response Example (Sync + Default Agent set)

```json
{
  "user_message_id": 45678,
  "streaming_task_id": null,
  "responses": [
    {
      "id": 45679,
      "chat_id": 3001,
      "chat_uuid": null,
      "user_type": "assistant",
      "type": "message",
      "message": "Yes — I can definitely help you with that. To get started, I just need a few details so I can scope the work and propose the best approach.\n\nPlease tell me:\n* What's your primary objective? (specific goals, outcomes, or decisions you need to support)\n* What resources do you have available? (documents, data files, existing research, budget/timeline)\n* What deliverable format would work best? (written report, presentation slides, action plan, code/scripts)\n* Any constraints or preferences? (tools to use, confidentiality requirements, key stakeholders, deadlines)\n\nHelpful extras to attach or share now:\n* Relevant documents, data samples, or reference materials\n* Background context, success metrics, or working hypotheses\n* Examples of similar work or preferred formats (optional)\n\nWhat I'll deliver after you provide the above (typical workflow):\n* Initial assessment and approach recommendation\n* Structured analysis with key findings and insights\n* Actionable recommendations with clear next steps\n* Professional deliverables in your preferred format\n\nTiming note: let me know your timeline requirements. For standard projects I can usually provide initial recommendations within 24-48 hours; for larger or more complex work I'll give you a detailed timeline once I understand the full scope.\n\nShare the materials or reply with the details and I'll get started.",
      "user_location": null,
      "created_at": "2024-11-18T14:15:01.123456Z",
      "message_processed_at": null,
      "from_user_id": 1,
      "from_virtual_assistant_id": 58,
      "task_id": null,
      "replying_to_message": {
        "id": 45678,
        "message": "Can you help me with this project?",
        "full_name": "Sarah Chen",
        "type": "message"
      },
      "indexed": false,
      "llm_trace_id": null,
      "extra": null,
      "message_attachments": null,
      "memory_id": null,
      "edited": false,
      "reasoning_steps": [
        {
          "id": null,
          "label": "Thinking...",
          "right_text": null,
          "description_md": null,
          "emoji": null,
          "step_type": "reasoning",
          "order": null,
          "metadata": null,
          "children": null,
          "created_at": "2024-11-18T14:15:02.789012Z"
        }
      ],
      "aggregated_reactions": []
    }
  ]
}
```

#### Response Example (Sync + Default Agent NOT set)

```json
{
  "user_message_id": 25655,
  "streaming_task_id": null,
  "responses": null
}
```

#### Response Example (Async)

```json
{
  "user_message_id": 25661,
  "streaming_task_id": "32893ee1-e51d-4bcc-b75e-44e2802c5240",
  "responses": null
}
```

---

### 4. Send Message to Virtual Assistant

Send a message directly to a virtual assistant by agent ID.

**Endpoint**: `POST /api/v1/virtual-assistants/{agent_id}/messages`

#### Parameters {#send-message-agent-parameters}

- `message_input` (required): Message content to send
- `files` (optional): One or more files to attach

**Note**: The `is_sync` parameter is not available for virtual assistant messages.

#### Curl Examples {#send-message-agent-curl}

**Simple text message to agent:**

```bash
curl -X POST \
  "https://api.primethink.ai/api/v1/virtual-assistants/42/messages" \
  -H "accept: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN_HERE" \
  -F "message_input=What are the current market trends in tech?"
```

**Message with file to agent:**

```bash
curl -X POST \
  "https://api.primethink.ai/api/v1/virtual-assistants/15/messages" \
  -H "accept: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN_HERE" \
  -F "message_input=Please analyze this financial report" \
  -F "files=@/path/to/financial-report.pdf"
```

**Multiple files to specialized agent:**

```bash
curl -X POST \
  "https://api.primethink.ai/api/v1/virtual-assistants/7/messages" \
  -H "accept: application/json" \
  -H "Authorization: Token YOUR_API_TOKEN_HERE" \
  -F "message_input=Compare these two datasets and provide insights" \
  -F "files=@/path/to/dataset1.csv" \
  -F "files=@/path/to/dataset2.csv" \
  -F "files=@/path/to/analysis-requirements.txt"
```

#### Response Example {#send-message-agent-response}

```json
{
  "user_message_id": 23456,
  "streaming_task_id": null,
  "responses": [
    {
      "id": 23457,
      "chat_id": 2001,
      "chat_uuid": "chat_uuid_example_123",
      "user_type": "assistant",
      "type": "message",
      "message": "Hello! I'm doing well, thank you for asking. How can I assist you today?",
      "user_location": null,
      "created_at": "2024-11-18T10:30:02.123456Z",
      "message_processed_at": "2024-11-18T10:30:02.500000Z",
      "from_user_id": null,
      "from_virtual_assistant_id": null,
      "task_id": null,
      "replying_to_message": {
        "id": 23456,
        "message": "Hello, how are you today?",
        "full_name": "Jane Smith",
        "type": "message"
      },
      "indexed": false,
      "llm_trace_id": "trace_def456",
      "extra": null,
      "message_attachments": null,
      "memory_id": "mem_789",
      "edited": false,
      "reasoning_steps": [],
      "aggregated_reactions": []
    }
  ]
}
```

---

## Error Handling

### Common Error Responses

#### Authentication Error (401)

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API token",
  "status_code": 401
}
```

#### Not Found Error (404)

```json
{
  "error": "Not Found",
  "message": "Chat or agent not found",
  "status_code": 404
}
```

#### Bad Request Error (400)

```json
{
  "error": "Bad Request",
  "message": "Missing required parameter: message_input",
  "status_code": 400
}
```

#### Rate Limit Error (429)

```json
{
  "detail": "Rate limit exceeded"
}
```

Read `Retry-After` to determine how many seconds to wait before trying again. `X-RateLimit-Limit` identifies the exhausted budget's ceiling, and `X-RateLimit-Remaining` is `0` on the rejected request. Avoid immediate retry loops.

---

## File Upload Guidelines

### Supported File Types

- **Documents**: PDF, DOC, DOCX, TXT, MD
- **Spreadsheets**: XLS, XLSX, CSV, TSV
- **Images**: JPG, JPEG, PNG, GIF, WEBP
- **Data**: JSON, XML, YAML
- **Archives**: ZIP (contents will be extracted)

### File Size Limits

- Maximum file size per upload: 50MB
- Maximum total size per request: 200MB
- Maximum number of files per request: 10

### File Upload Best Practices

1. **Use descriptive filenames** that indicate the content
2. **Include file context** in your message to help the AI understand the file purpose
3. **Compress large files** when possible to reduce upload time
4. **Use appropriate file formats** for your data type

---

## SDK and CLI Tools

For easier integration, consider using the official PrimeThink CLI:

```bash
# Install the CLI
pip install primethink-cli

# Configure your token
pt profile add --token YOUR_API_TOKEN_HERE

# Execute a task action
pt task execute --action generate_content --message "Create a summary"

# Send message to chat
pt chat send my-chat --message "Hello team!"

# Send message to agent
pt chat send --agent 42 --message "Analyze this data"
```

---

## Support

If you encounter any issues or have questions about the API, please contact our support team at [support@primethink.ai](mailto:support@primethink.ai) or visit our [community forum](https://community.primethink.ai).
