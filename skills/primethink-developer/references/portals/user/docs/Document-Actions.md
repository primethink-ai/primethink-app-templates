# Document Actions

Document Actions allow you to quickly process documents with AI-powered tasks. You can summarize, analyze, translate, or perform any custom task on your documents with just a few clicks.

## Using Document Actions

To run an action on a document:

1. **Open the document menu** - Click the three-dot menu icon next to any document in your chat or document list
2. **Select "Actions"** - This opens the Actions popup
3. **Configure your action:**
   - **Group** - Select which group to use for the action
   - **Where** - Choose whether to run the action in a new chat or an existing chat
   - **Chat** - If you selected "Existing Chat", choose which chat to use
   - **Actions** - Select which action to perform (see available actions below)
   - **Prompt (optional)** - Add any additional instructions for the AI
4. **Click "Run"** - The action will process your document and display the results in the selected chat

## Available Actions

### Share

The **Share** action is always available. It simply copies the document to a new or existing chat, making it available to the AI assistant in that conversation. This is useful when you want to discuss or work with a document in a different context.

### Custom Actions

In addition to Share, you may see other actions in the list. These are [Tasks](/admin/Tasks/) that have been configured as document actions by you or your group administrator. Common examples include:

- **Summarize** - Get a quick summary of the document
- **Translate** - Translate the document to another language
- **Extract Key Points** - Pull out the main ideas and findings
- **Analyze** - Perform detailed analysis of the document content

The available actions depend on what tasks have been set up in your group.

## Share Actions (Mobile)

On iOS and Android devices, PrimeThink integrates with your device's share functionality. This means you can share documents directly from other apps into PrimeThink.

**How it works:**

1. Open any document in another app (email, file browser, web browser, etc.)
2. Tap the **Share** button
3. Select **PrimeThink** from the share options
4. The Actions popup appears with the same options as Document Actions
5. Choose your group, destination chat, and action
6. Tap **Run** to process the document

This feature lets you quickly send documents from anywhere on your device to PrimeThink for AI processing without needing to first upload them manually.

## Creating Custom Actions

You can turn any [Task](/admin/Tasks/) into a document action that appears in the Actions menu. This is done through the Task settings.

### Step 1: Create or Edit a Task

1. Go to the Tasks section
2. Create a new task or edit an existing one
3. Configure the task with the AI instructions you want (e.g., "Summarize this document in 3 bullet points")

### Step 2: Configure the Action Settings

In the task settings, find the **Action** section and configure the following:

| Setting | Description |
|---------|-------------|
| **Action Name** | The name that will appear in the Actions menu (e.g., "summarize", "translate"). **Note:** Action names cannot contain spaces - use hyphens or underscores instead (e.g., `extract-key-points`). |
| **Mime Type** | Filter which document types this action applies to. Use comma-separated values for multiple types (e.g., `application/pdf,text/plain`). Leave empty to apply to all documents. |
| **Share Action** | Enable this toggle to make the action available in the mobile Share menu |

### Step 3: Save the Task

Once saved, the action will appear in the Actions menu for documents matching the specified mime types.

### Example: Creating a "Summarize PDFs" Action

1. Create a new task with instructions like: "Provide a concise summary of this document, highlighting the key points and main conclusions."
2. In the Action section:
   - **Action Name**: `summarize`
   - **Mime Type**: `application/pdf`
   - **Share Action**: Enabled
3. Save the task

Now when you open the Actions menu for any PDF document, you'll see "summarize" as an option. On mobile, you can also share PDFs directly from other apps and select this action.

### Tips for Creating Actions

- **No spaces in action names** - Action names cannot contain spaces. Use hyphens (`extract-summary`) or underscores (`extract_summary`) instead
- **Use descriptive names** - Choose action names that clearly indicate what the action does
- **Filter by mime type** - If your action only makes sense for certain file types, specify the mime types to keep the Actions menu clean
- **Enable Share Action for mobile workflows** - If you frequently share documents from other apps, enable this option for quick access
- **Group-level actions** - Group administrators can create actions that are available to all group members

## Common Mime Types for Actions

When configuring the Mime Type filter, here are some common values:

| Document Type | Mime Type |
|--------------|-----------|
| PDF | `application/pdf` |
| Word (DOCX) | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Word (DOC) | `application/msword` |
| Plain Text | `text/plain` |
| Markdown | `text/markdown` |
| Excel (XLSX) | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| CSV | `text/csv` |
| Images | `image/jpeg,image/png,image/gif` |

You can combine multiple mime types with commas (e.g., `application/pdf,text/plain`) to make an action available for multiple document types.

## Related Topics

- [Tasks](/admin/Tasks/) - Learn more about creating and managing tasks
- [Supported Document Formats](Supported-Document-Formats.md) - See all supported document types
- [Documents and Collections in Chats](Documents-and-Collections-in-Chats.md) - Managing documents in your chats
