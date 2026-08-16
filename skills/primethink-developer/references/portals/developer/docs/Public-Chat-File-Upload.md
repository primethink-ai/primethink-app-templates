# How to Create a Public Chat with File Upload

To allow users in a public chat to upload files, you need to enable two settings.

## 1. Enable Documents & Collections

In the chat settings, make sure **Documents & Collections** is turned on. This is required for any file upload functionality to work.

## 2. Enable File Upload for Public Chat

In the chat settings, add the following key to the chat's **Extra** field (or to the Task's Extra field — chats created from the task inherit it):

- **Key:** `PUBLIC_CHAT_UPLOAD_FILES`
- **Value:** `true` (the strings `"true"` and `"1"` are also accepted)

## Result

Once both settings are enabled, public chat participants will see the file upload button in the message input area and can attach files to their messages.
