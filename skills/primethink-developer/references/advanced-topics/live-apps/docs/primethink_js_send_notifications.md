# PrimeThink.js - Sending Notifications to Users

## Overview

PrimeThink provides two methods for sending notifications from Live Apps:

- **`pt.sendNotification`** — Send to a single user
- **`pt.sendNotificationToUsers`** — Send to multiple users or broadcast to all

Both methods support an optional `emailBody` parameter for extended email content.

## How Notification Delivery Works

When you create a notification, PrimeThink uses a **dual-delivery approach**:

1. **Immediate Delivery**
   - **Push notifications** — delivered instantly to mobile and web
   - **Real-time updates** via WebSockets — updates in-app badge counters immediately

2. **Delayed Email Delivery**
   - Unread notifications are batched and sent as an **email digest** after a short delay (default: 5 minutes)
   - This allows users to read notifications in-app before receiving email
   - Users can configure email preferences (on, off, mentions only) in their settings

## API Reference

### `pt.sendNotification(userId, title, text, options?)`

Send a notification to a single user.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `userId` | `number` | Yes | — | The ID of the user to notify |
| `title` | `string` | Yes | — | Notification title |
| `text` | `string` | Yes | — | Notification message text |
| `options` | `object` | No | `{}` | Optional settings |
| `options.emailBody` | `string` | No | `undefined` | Extended content included in the email digest |

**Returns:** `Promise<object>` with `message` field indicating success

**Examples:**

```javascript
// Basic notification
await pt.sendNotification(123, 'Task Assigned', 'You have a new task');

// With extended email content
await pt.sendNotification(123, 'Meeting Reminder', 'Team meeting in 15 minutes', {
  emailBody: 'Please join the meeting at https://meet.example.com/abc. Agenda: Q1 Review.'
});
```

---

### `pt.sendNotificationToUsers(title, text, options?)`

Send notifications to multiple users in the chat. Can target specific users by ID or broadcast to all chat members (excluding the caller).

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Notification title |
| `text` | `string` | Yes | — | Notification message text |
| `options` | `object` | No | `{}` | Optional settings |
| `options.userIds` | `number[]` | No | `undefined` | Specific user IDs to notify. If omitted, all chat members except the caller are notified |
| `options.sendPush` | `boolean` | No | `true` | Whether to trigger push delivery |
| `options.emailBody` | `string` | No | `undefined` | Extended content included in the email digest |

**Returns:**

`Promise<object>` with:

```json
{
  "success": true,
  "message": "Notifications sent successfully",
  "sent_count": 5,
  "target_user_ids": [1, 2, 3, 4, 5],
  "skipped_user_ids": [6],
  "failed_user_ids": []
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the operation completed |
| `message` | `string` | Human-readable status message |
| `sent_count` | `number` | Number of users successfully notified |
| `target_user_ids` | `number[]` | IDs of users who received the notification |
| `skipped_user_ids` | `number[]` | IDs that were requested but aren't members of the chat (only populated when `userIds` is provided) |
| `failed_user_ids` | `number[]` | IDs where notification creation failed |

---

## Examples

### Broadcast to All Chat Members

Send a notification to everyone in the chat except yourself:

```javascript
const result = await pt.sendNotificationToUsers('System Update', 'Maintenance at 10 PM');
console.log(`Notified ${result.sent_count} users`);
```

### Notify Specific Users

Filter chat members and notify only a subset — for example, every user except yourself:

```javascript
const members = await pt.getChatMembers();
const recipientIds = members
  .filter(m => m.type === 'user' && !m.is_logged_user)
  .map(m => m.id);

await pt.sendNotificationToUsers('Alert', 'New report available', { userIds: recipientIds });
```

### In-App Only (No Push)

Send a notification that appears in the app but doesn't trigger a push notification on the user's device:

```javascript
await pt.sendNotificationToUsers('FYI', 'Document updated', { sendPush: false });
```

### With Extended Email Content

Include detailed information in the email digest while keeping the push notification concise:

```javascript
await pt.sendNotificationToUsers('Report Ready', 'Your weekly report is available', {
  emailBody: 'Click here to view the full report: https://example.com/reports/123\n\nKey highlights:\n- Revenue up 15%\n- 23 new customers\n- Support tickets down 8%'
});
```

### Notify a Single User

You can use `sendNotificationToUsers` as an alternative to `pt.sendNotification` for single-user notifications:

```javascript
await pt.sendNotificationToUsers('Reminder', 'Your task is due', { userIds: [123] });
```

### Handle Skipped and Failed Users

When targeting specific user IDs, some may not be members of the chat:

```javascript
const result = await pt.sendNotificationToUsers(
  'Update',
  'New version deployed',
  { userIds: [1, 2, 3, 999] }
);

if (result.skipped_user_ids.length > 0) {
  console.warn('These users are not in the chat:', result.skipped_user_ids);
}

if (result.failed_user_ids.length > 0) {
  console.error('Failed to notify:', result.failed_user_ids);
}

console.log(`Successfully notified ${result.sent_count} users`);
```

## Common Patterns

### Notify on Task Completion

```javascript
async function completeTask(taskId) {
  const task = await pt.get(taskId);
  await pt.edit(taskId, { completed: true }, true);

  // Broadcast completion to all chat members
  await pt.sendNotificationToUsers(
    'Task Completed',
    `"${task.data.title}" has been marked as complete`
  );
}
```

### Notify Assigned Users on Status Change

```javascript
async function updateTaskStatus(taskId, newStatus) {
  const task = await pt.get(taskId);
  await pt.edit(taskId, { status: newStatus }, true);

  // Notify only the assigned users
  const assigneeIds = [task.data.assignee_id].filter(Boolean);
  if (assigneeIds.length > 0) {
    await pt.sendNotificationToUsers(
      'Task Updated',
      `"${task.data.title}" status changed to ${newStatus}`,
      { userIds: assigneeIds }
    );
  }
}
```

### Silent Broadcast with Error Handling

```javascript
async function notifyAll(title, text) {
  try {
    const result = await pt.sendNotificationToUsers(title, text, { sendPush: false });
    return { success: true, count: result.sent_count };
  } catch (error) {
    console.error('Notification failed:', error.message);
    return { success: false, error: error.message };
  }
}
```

## Comparison: sendNotification vs sendNotificationToUsers

| Aspect | `pt.sendNotification` | `pt.sendNotificationToUsers` |
|--------|----------------------|------------------------------|
| Target | Single user by ID | Multiple users or broadcast |
| Push control | Always sends push | Optional via `sendPush` |
| Email body | ✅ Via `options.emailBody` | ✅ Via `options.emailBody` |
| Broadcast | ❌ | ✅ Omit `userIds` to notify all |
| Skipped user tracking | ❌ | ✅ `skipped_user_ids` in response |
| Best for | Notifying one known user | Group alerts, broadcasts, batch notifications |

## Related Methods

- **[`pt.sendNotification(userId, title, text)`](Data-Management-API.md)** — Send a notification to a single user
- **[`pt.getChatMembers()`](Working-with-Chat-Members.md)** — Get chat members to build user ID lists
- **[Notifications](Notifications.md)** — How PrimeThink notifications work (push, email, settings)

## Best Practices

### Use `emailBody` for Rich Content

Keep push notification text short and scannable. Use `emailBody` for links, detailed instructions, or formatted content that users can read in their email:

```javascript
// Push: concise alert
// Email: full details
await pt.sendNotification(userId, 'Invoice Ready', 'Your invoice for February is ready', {
  emailBody: `Your invoice #12345 for February 2026 is ready.\n\nAmount: $1,250.00\nDue date: March 15, 2026\n\nView invoice: https://example.com/invoices/12345\nDownload PDF: https://example.com/invoices/12345.pdf`
});
```

### Respect User Preferences

Users can configure notification preferences (push, email, mentions only). The system automatically respects these settings — you don't need to check preferences in your code.

### Batch Related Notifications

If you need to notify users about multiple related items, consider combining them into a single notification rather than sending many separate ones:

```javascript
// Better: Single notification with summary
const tasks = await pt.list({ entityNames: ['task'] });
const pendingTasks = tasks.filter(t => t.data.status === 'pending');
await pt.sendNotificationToUsers(
  `${pendingTasks.length} Tasks Pending`,
  'Review your pending tasks before end of day',
  {
    emailBody: pendingTasks.map(t => `- ${t.data.title}`).join('\n')
  }
);
```

---

**Last Updated:** March 2, 2026
**Version:** 20260302
