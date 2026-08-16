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
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retry_after": 60,
  "status_code": 429
}
```

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
