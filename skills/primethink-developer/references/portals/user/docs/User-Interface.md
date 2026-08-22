# User Interface Guide: Deep Dive

The PrimeThink platform features a thoughtfully designed interface that prioritizes productivity while maintaining intuitive navigation. When you first open the application, you'll notice how the interface is organized into distinct sections that work together seamlessly, creating a powerful yet approachable workspace for both individual and team collaboration.

## Top Navigation Bar

The top navigation bar serves as your primary navigation hub, spanning the entire width of the interface.

### The PrimeThink Logo

At its leftmost position, you'll find the PrimeThink logo, which serves as a brand identifier or as the image of the default virtual assistant when a chat is selected.

### Workspace Navigation

Moving right, you'll encounter the workspaces tab section, which enables quick navigation between different work contexts. These tabs help you organize your work into logical sections, and you can create new workspaces using the "+" button whenever you need to expand your organization.

The workspace system is particularly powerful because it lets you separate different types of work or projects while keeping them all readily accessible. For example, you might have one workspace for client communications, another for internal team discussions, and a third for personal tasks.

## Organizing Workspaces
Create separate workspaces for different types of work or projects. This helps you:
- Maintain focus on specific tasks
- Keep related conversations and resources together
- Switch contexts cleanly when needed
- Manage multiple projects efficiently

### Navigation Controls

The far right of the top bar contains a collection of important navigation buttons, each with a descriptive tooltip to help you understand its function:

* View Memory: allows you to access historical data and saved contexts, helping you maintain continuity in your work and preferences.
* View Collections: opens the document management system where you can organize and access your resources.
* Members: provides access to team management tools
* Notification: button helps you track updates and notifications.

The Show Menu button reveals additional options:
* Virtual Assistants Admin: to manage the global and your personal virtual assistants.
* Scheduled Tasks: to manage all the scheduled tasks created on each chat.

In mobile view, you will have the option to open and close the chat sidebar when a chat is selected.

## Organization Switcher (Left Icon Bar)

The Group Switcher is your gateway to different collaborative spaces within PrimeThink. Located in the leftmost vertical bar of your interface, this essential tool helps you move seamlessly between different groups while maintaining clear boundaries between separate work contexts. Think of it as your professional control center – just as you might move between different teams or departments throughout your workday, the Group Switcher helps you transition smoothly between different collaborative spaces while keeping each one distinct and properly organized.

### What Is a Group?

A group in PrimeThink represents a distinct collaborative space with its own set of resources and participants. When you join a group, you become part of a self-contained workspace that includes:

- Your team members and their specific roles within the group
- All conversations and chat histories related to that group's activities
- Documents and resources shared within the group
- Specific settings and preferences for that particular collaborative space
- AI assistants configured for the group's needs

This separation ensures that work, conversations, and resources from one group remain separate from others, maintaining privacy and organizational clarity.

For example, if you're working with multiple teams or clients, each one can have its own group, ensuring that discussions and resources stay properly organized and confidential.

### Switching Between Groups

Each organization appears as a distinct icon, and a single click lets you switch between these different contexts while maintaining complete separation of content and conversations.

The currently active group remains highlighted, providing a clear visual indicator of your working context.

### Managing Group Access

At the bottom of the Group Switcher, you'll find essential tools for managing your group connections:

- Joining new groups when you receive invitations
- Creating a new group with one of your accounts — see [Adding and Creating Groups](/admin/Group-Management/#adding-and-creating-groups)

### Top actions

A column of helpful actions, including:
- An invite button for adding new members to your group
- A location sharing toggle for when you need to share your location with the virtual assistants you use
- Text-to-speech controls to have messages read aloud automatically

### Bottom actions

A column of helpful actions, including:
- A feedback mechanism for reporting issues or suggesting improvements
- The Help button for the online help.
- User Settings specific to the selected group.

## Left Sidebar

The left sidebar functions as your command center for chat and task management. Understanding its three distinct sections will help you navigate more efficiently:

### Top Control Section
In the upper portion, you'll find essential controls that help you manage your daily workflow.

### New Chat Button

The New Chat button serves as your primary entry point for starting conversations. When you click this button, you're not just creating a simple chat - you're initiating a new workspace that can evolve based on your needs. This button adapts to your current context, meaning the options available to you will change depending on your permissions and the type of work you're doing.

When you click the New Chat button, you might notice that PrimeThink offers different types of conversations based on your needs. For example, you could start:

A standard chat for quick discussions or note-taking
A collaborative space for team discussions
A specialized chat with an AI assistant for specific tasks like document analysis or proofreading
A multi-participant workspace for larger team collaborations

Understanding when to use each type of chat can significantly improve your workflow. For instance, if you need to analyze a legal document, starting a chat with the Legal Document Analyzer assistant will provide you with specialized tools and capabilities specific to that task.

### Tasks Management

Next to it, the Tasks Management button helps you start new predefined chat workflows ("Tasks") with a click of a button.

## Filtering and Organization Tools

The filter system includes a dropdown menu for selecting chat types (such as Standard or Multi Users), along with toggles for marking favorites, archived chats, and filtering by Virtual Assistant.

### Chat List Section
The middle section displays your conversations in an organized list. Each chat entry shows relevant information like the chat name and timestamp, with visual indicators helping you quickly identify different types of conversations. The list updates in real-time to show new messages, status changes and unread messages.

The chat are ordered by last activity (last first) and with re-order based on usage.

### Chat types
The two main chat types you interact with in the chat list are:
* Standard: a 1-to-1 chat with one or more virtual assistant
* Multi user: a chat where beside the VA there are also more humans. In these chats memory is disabled by default (governed by the chat's Global Memory setting), so the agent does not retain information from user messages unless it is explicitly enabled.

Other chat forms exist alongside these: [direct messages](Collaboration.md) between users, temporary chats (where memory is never active), and page chats backing Live Pages.

### Assign workspace
You can drag and drop a chat into a workspace name to assign it to that specific workspace.

### Delete a chat
When you hover your mouse over a chat entry, a delete icon appears, giving you the option to remove conversations that are no longer needed.

### Sub-chats
For chats that contain sub-conversations or nested discussions, an arrow indicator appears at the end of the chat entry. This arrow serves as both a visual indicator that the chat contains subchats. The subchats will be visible in the Subchats tab, in the right chat sidebar.

Sub-chats inherit certain properties from their parent conversation while maintaining their own distinct space. This means you can have focused discussions about specific aspects of a project while keeping everything organized under the main topic.

### Chat Tips
1. Create meaningful naming conventions for chats
2. Use of workspaces for to group chats by workspace
3. Regular archive or deletion of outdated or completed conversations
4. Maintaining organized favorites

## Main Chat Window

The central area serves as your primary workspace, where most of your interaction happens. It's designed to provide a clear view of your conversations while offering powerful tools right where you need them:

### Switching between conversation and Live App views

A Task or AI agent can turn the current conversation into a rendered Live App and can switch it back to the normal conversation later. PrimeThink changes the view automatically; you do not need to refresh the browser.

Text already entered in the message composer is retained during the switch. If the view changes before the Live App files are ready, PrimeThink shows a temporary loading state and displays the app when generation finishes.

### Chat Display
Messages appear in a chronological thread, with clear visual distinction between different types of content. The interface supports rich content including text, files, and code snippets, displaying each appropriately to maintain readability.

#### Message Interaction Features

PrimeThink provides several ways to interact with messages, making it easy to manage and use information within your conversations. Let's explore these interaction options in detail.

##### Quick Action Menu

Every message in your chat includes a Quick Action Menu in the top-right corner. This menu contains three primary actions that you'll use frequently:

The Play button activates text-to-speech for the message, allowing you to listen to the content instead of reading it. This feature proves particularly useful when you're multitasking or need to review longer messages while doing other work.

The Copy button creates a clipboard copy of the message content, preserving all formatting and structure. This makes it easy to reference or share information from your conversations in other contexts.

The More Options button (three dots) reveals additional message-specific actions, giving you access to advanced features when you need them.

##### Message Management Options

Each message can be managed through a contextual menu that appears when you click the More Options button. This menu provides several important functions:

You can add message content to your next prompt, building on previous conversations in a structured way. This feature helps maintain context and continuity in your discussions.

The Save options let you preserve message content in different ways:
- Play: play the message content using text-to-speech
- Copy: copy the content of the message to your clipboard
- Add to prompt: paste the content of the message into the new message input text area
- Save as File creates a downloadable copy of the message
- Save as Memory stores the content in your workspace's memory system
- Save as Document adds the message to your document collections
- Delete: removes messages you no longer need, helping keep your conversations organized and relevant. When you delete a message, the system will ask for confirmation to prevent accidental removals.
- Report: allows you to flag messages that need attention or review, helping maintain quality and address any issues or concerns.
- See extra: extra information attached to the message

You can also select and copy part of the message content. If the message contains code snippets, you can copy only the code blocks, by clicking the "copy" button at the top of the block.

### Composing Messages
At the bottom of the chat window, you'll find a versatile message composition field. Alongside text input, you can easily attach files, mention users, chats and virtual assistant using the `@` key, and activate the voice message functionality to dictate messages instead of typing.

##### Attachments

Near the text input field, you'll find tools for enriching your messages with additional content. These tools help you:

Share files and documents relevant to your discussion. The system handles various file types appropriately, showing previews when possible and ensuring secure transmission of your content.

> IMPORTANT: when you attach a file you also have the options to add them as documents

## Current Chat Context Panel (Right Sidebar)

The Right Context Sidebar serves as your companion in PrimeThink, adapting its contents based on the selected capabilities of the chat and the default virtual assistant. Every configuration, option, or feature you see in the sidebar is contextualized to the current chat context and the default virtual assistant.

## Working with the Sidebar Tools

Understanding how to leverage the sidebar's context-specific tools can significantly improve your workflow. The sidebar is composed of multiple tabs, each with their own set of tools and information.

### Info tab
The Info tab provides essential information and configuration about the current chat.

### Help Panel (?)
When the current chat — including chats backed by a Task or Live App — has a file named `@app/HELP.md` attached, a **?** button appears in the right sidebar. Clicking it opens an inline markdown reader that renders the contents of that file, giving end users contextual documentation without leaving the conversation.

Authors of Tasks and Live Apps should treat `@app/HELP.md` as a first-class deliverable for any user-facing experience that has non-trivial usage instructions.

## Top Controls

### Search Scope Buttons
A row of segmented buttons at the top of the panel that control the search scope:
- **Search In Chat**: Also search to the current chat history and summary (chat icon)
- **Search In Workspace**: Available when in a workspace, searches across workspace chats (workspace icon)
- **Search In Documents**: Available with RAG capability, searches through associated documents (document icon)
- **Search In Collections**: Available with RAG capability, searches within collections (list icon)
- **Global Memory**: Available with Memory capability, accesses the global memory of the user (memory chip icon)

These buttons can be:
- Selected multiple at once for broader searches
- All deselected if needed
- Dynamically shown/hidden based on available capabilities

### Favorite Toggle
- Star icon located in the top-right corner
- Allows marking the current chat as a favorite
- Helps quickly access important conversations

## Key Sections and Their Functions

### Name
- Primary identifier for your current chat session (shown in the chats list)
- Editable via the pencil icon
- Helps organize and quickly identify different conversations

### Workspace
- Organizational structure for grouping related chats
- Can be empty (shows as "no workspace")
- Customizable using the edit icon
- Helps maintain clear separation between different projects or topics

### Select Default Virtual Assistant
- Displays your currently selected default virtual assistant
- Available AI capabilities depends on the default virtual assistant
- Editable via the pencil icon
- **If selected, every message without a specific mention will be replied by the default virtual assistant**

### Summary
- Provides a concise overview of the chat's context and purpose
- Automatically updates based on conversation content
- Expandable via "More" link (if too long)
- Helps maintain context across long conversations

### Goal
- Dedicated space for defining chat objectives
- Helps maintain focus and direction for the default virtual assistant
- Can be updated as the conversation evolves
- Useful for tracking progress and outcomes

### Memo
- Free-form space for additional notes, mainly used by the default virtual assistant
- Can be updated by the default virtual assistant throughout the conversation
- Helps maintain important context

### Mention Name
- Specify names or term that can be used to reference the current chat in other chats (mention, accessed by typing the character `@`)

### Capabilities
- Controls the feature set available to your virtual assistant
- Default capabilities apply when none are specifically selected
- Includes multiple toggleable features:

#### Available Capability Toggles:
1. Base: Core assistant functionalities (always on)
2. Memory: Enhanced context retention
3. Multimodality: Support for various types of input/output
4. Goal: Objective-tracking features
5. Memo: Note-taking capabilities
6. RAG: Retrieval-Augmented Generation features
7. Web Search: Internet search for up-to-date information
8. Scheduled Tasks: Time-based action management
9. Subchats: Nested conversation support

## Documents Tab

### Documents Tab Actions Bar
- **Upload**: Attach files directly from your device (paper clip icon)
- **Paste**: Insert a text or a url to scrape (clipboard icon)
- **Refresh**: Update the document list (circular arrow icon): useful to check the progress of indexing the newly uploaded files

### Document List

The list of documents associated with the current chat is displayed here. Each document is listed with its filename and the file type is indicated by both icon and extension. Multiple file types are supported including .md, .pdf, .docx, and text files.

In table view, the **Date** column shows each document's creation date and local time in 24-hour format. The same format is used in Collection Detail views.

Each document in the list has four action buttons:
- **Preview**: View the document content
- **Download**: Save the document to your device (down arrow icon)
- **Status**: Status of the indexing of the document
- **Delete**: Remove the document (trash bin icon)

## Collections Tab

### Collections Tab Actions Bar
- **Associate Collection**: Allows users to link existing collections to the current chat

### Collection List
Lists all collections added to the current chat.
Each collection entry has a **Delete** button to remove collection association (trash bin icon).

### Collection Types
Collections can be:
- Public collections: they are setup by the group admin and can be seen by everybody in the group.
- Private collections: they are create by each user and are only visible to them.

## Members Tab
The Members tab provides a list of all participants in the current chat. They can be other users or virtual assistants.

### Members Tab Actions Bar
- **Add Members**: Invite new members or virtual assistants to the chat.

Each member entry shows:
- Profile picture or avatar initials in a circle
- Name
- **Remove** button: removes a member from conversation (trash bin icon)

### Member Types
Members can be:
- Human users (shown with initials or profile pictures)
- AI Assistants (shown with specific assistant avatars)
- System users
- Guest users

## Scheduled Tasks Tab
The scheduled tasks tab provides a list of all scheduled tasks associated with the current chat.

Each scheduled task shows:
- Schedule information (e.g., "Run every day at 10:00 AM")
- Task description (e.g., "search the web and update on AI news related to Langchain")
- Status and actions

### Top Actions Bar
- **Add a Scheduled Task**: Allows creation of new scheduled tasks (plus icon)

### Scheduled Task Actions
Each scheduled task has three action buttons:
- **Edit**: Modify its settings (pencil icon)
- **Pause/Resume**: Toggle its status (pause icon)
- **Delete**: Remove the scheduled task (trash bin icon)

### Scheduled Task Properties
Scheduled tasks include:
- Timing (daily, weekly, monthly, etc.)
- Execution time
- Task description
- Status (active/paused)

### Scheduling Tips
- Set clear, specific task descriptions
- Consider timezone differences
- Avoid scheduling too many concurrent tasks
- Set appropriate intervals for tasks
- Review execution history regularly

### Scheduled Task Management
- Schedule new tasks with "Add a Scheduled Task"
- Pause scheduled tasks temporarily when needed
- Edit scheduled tasks to update timing or instructions
- Remove unnecessary jobs to maintain clarity

## Working with the Interface

Understanding how these sections work together will help you make the most of the platform:

### Navigation Flow
The interface follows a natural hierarchy that makes navigation intuitive:
1. First, select your organization using the left icon bar
2. Then, choose your workspace context from the top navigation
3. Use the left sidebar to manage your chats and tasks
4. Conduct your primary work in the central chat window
5. Access context-specific tools through the right sidebar

### Keyboard Shortcuts
As you become more familiar with the interface, you can use keyboard shortcuts to speed up common actions. These shortcuts complement the visual interface while providing quick access to frequently used features. You can view available shortcuts through the help center.

### Adaptive Features
The interface intelligently adapts to your current task, showing relevant tools and information when you need them. This contextual awareness helps maintain a clean, focused interface while ensuring all necessary tools are readily available.

## Getting Started

If you're new to the platform, we recommend starting with the basics:
1. Familiarize yourself with the top navigation bar and its various tools
2. Practice switching between different organizations using the left icon bar
3. Explore the chat creation and management features in the left sidebar
4. Try out the various utility controls in the main chat window
5. Discover how the right sidebar adapts to different types of work

The help center, accessible through the help icon in the top navigation bar, provides additional guidance, tutorials, and best practices to help you make the most of these powerful tools.
