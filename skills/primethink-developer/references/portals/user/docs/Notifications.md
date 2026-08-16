# Notifications in PrimeThink

PrimeThink uses a comprehensive notification system to keep you informed about important events, messages, and mentions. This document outlines how notifications work and how you can customize them to fit your preferences.

## How Notifications Are Sent

Notifications in PrimeThink are delivered through multiple channels to ensure you receive timely updates:

### Immediate Delivery

*   **Push Notifications:** Sent immediately to your registered devices (mobile and web) when a notification is created.
*   **Real-time updates using WebSockets:** Real-time updates are sent via WebSockets. This instantly updates badge counters and notification lists in the application.

### Delayed Email Delivery

*   **Email Digest:** Unread notifications are batched and sent as an email digest after a short delay (typically 5 minutes). This gives you time to read notifications in the app before receiving an email.
*   **For Unread Messages:** Similarly, unread chat messages can trigger email summaries based on your preferences.

The delay allows users who are actively using PrimeThink to see and dismiss notifications before email is sent, reducing unnecessary emails.

## Notification Settings

You have granular control over how you receive notifications. Settings can be configured globally and on a per-chat basis.

### Global Notification Settings

These settings apply to all your activities within PrimeThink unless overridden by chat-specific settings.

*   **Notifications - Global Push Settings:**
    *   `On`: Receive push notifications for all new notifications. (Default)
    *   `Mentions Only`: Receive push notifications only when you are specifically mentioned.
    *   `Off`: Disable all push notifications.
*   **Notifications - Global Email Settings:**
    *   `On`: Receive email notifications for all unread notifications. (Default)
    *   `Mentions Only`: Receive email notifications only for unread notifications where you are specifically mentioned.
    *   `Off`: Disable all email notifications for general notifications.
*   **Unread messages notifications - Global Email Settings:**
    *   `On`: Receive email notifications for all unread messages. (Default)
    *   `Direct Messages Only`: Receive email notifications only for unread direct messages.
    *   `Off`: Disable all email notifications for unread messages.

You can access and modify these settings in your user profile under the "Notifications" section.

### Chat-Specific Notification Settings

For individual chats, you can override the global notification settings. This allows you to fine-tune how you are notified for specific conversations.

These settings are found within each chat's settings menu (`UserInChat` table).

*   **Notifications - Chat Push Settings:**
    *   `Default`: Use the Global Push Settings. (Default)
    *   `On`: Receive push notifications for all new notifications in this chat.
    *   `Mentions Only`: Receive push notifications only when you are specifically mentioned in this chat.
    *   `Off`: Disable all push notifications for this chat.
*   **Notifications - Chat Email Settings:**
    *   `Default`: Use the Global Email Settings. (Default)
    *   `On`: Receive email notifications for all unread notifications in this chat.
    *   `Mentions Only`: Receive email notifications only for unread notifications where you are specifically mentioned in this chat.
    *   `Off`: Disable all email notifications for general notifications in this chat.
*   **Unread messages notifications - Chat Email Settings:**
    *   `Default`: Use the Global Email Settings for unread messages. (Default)
    *   `On`: Receive email notifications for all unread messages in this chat.
    *   `Off`: Disable all email notifications for unread messages in this chat.

By customizing these settings, you can ensure that you stay informed without being overwhelmed by notifications.

## Sending Notifications from Live Apps

Live Apps can send notifications programmatically using the `pt.sendNotification` and `pt.sendNotificationToUsers` methods. These notifications support an optional `emailBody` parameter for extended content that appears in the email digest.

```javascript
// Send to a single user
await pt.sendNotification(userId, 'Task Assigned', 'You have a new task', {
  emailBody: 'Click here to view the task: https://example.com/tasks/123'
});

// Broadcast to all chat members
await pt.sendNotificationToUsers('System Update', 'Maintenance scheduled', {
  emailBody: 'The system will be down for maintenance on Sunday from 2-4 AM.'
});
```

For complete API documentation and examples, see [Sending Notifications to Users](/admin/primethink_js_send_notifications/).
