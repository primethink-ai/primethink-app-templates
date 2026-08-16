# Email Integration

PrimeThink allows you to interact with Tasks and Chats directly via email. When email integration is enabled, you can send emails to specific addresses and receive AI-powered responses back in your inbox.

---

## Email-to-Task

When you send an email to a task's dedicated email address:

1. The system verifies that you are a member of the group that owns the task
2. Your email content (including any attachments) is processed by the task's configured action
3. You receive the task's response directly in your email inbox

### Requirements

- Email integration must be enabled on the task
- You must be sending from an email address associated with your user account
- Your account must belong to the group that owns the task

### Task Email Address Format

```
{group-name}-{task-uuid}@tasks.primethink.ai
```

**Example:**
```
marketing-a1b2c3d4-e5f6-7890-abcd-ef1234567890@tasks.primethink.ai
```

---

## Email-to-Chat

When you send an email to a chat's dedicated email address:

1. The system verifies that you are a member of the group that owns the chat
2. Your email message (including any attachments) is added to the chat as your message
3. The AI processes your message and generates a response
4. You receive the AI's reply in your email inbox, threaded as part of the same email conversation

### Requirements

- Email integration must be enabled on the chat
- You must be sending from an email address associated with your user account
- Your account must belong to the group that owns the chat

### Chat Email Address Format

```
{group-name}-{chat-uuid}@chats.primethink.ai
```

**Example:**
```
sales-b2c3d4e5-f6a7-8901-bcde-f23456789012@chats.primethink.ai
```

### Email Threading

Replies from the chat are threaded in your email client, so the entire conversation stays organized in a single email thread. This makes it easy to follow the conversation history directly from your inbox.

---

## How to Enable Email Integration

### For Tasks

1. Open the task settings
2. Enable the email integration option
3. The task's email address will be displayed in the settings

### For Chats

1. Open the chat settings
2. Enable the email integration option
3. The chat's email address will be displayed in the settings

---

## Use Cases

### Task Examples

- **Document Processing**: Email a PDF to a task configured to extract and summarize data
- **Quick Queries**: Send a question to a research task and get answers in your inbox
- **Report Generation**: Email data to a task that generates formatted reports

### Chat Examples

- **Ongoing Projects**: Continue chat conversations while away from the app
- **Mobile Access**: Interact with your AI assistant using just your email client
- **Team Collaboration**: Multiple team members can email the same chat to contribute to a shared conversation

---

## Troubleshooting

### Email Not Being Processed

- Verify you're sending from an email address linked to your PrimeThink account
- Check that email integration is enabled on the task or chat
- Confirm you're a member of the group that owns the task or chat

### No Response Received

- Check your spam/junk folder
- Verify the task or chat is active and not archived
- Ensure the AI agent is properly configured on the task or chat

### Attachments Not Processing

- Check that the file type is supported
- Verify file size limits haven't been exceeded
- Ensure the task or chat has document processing capabilities enabled
