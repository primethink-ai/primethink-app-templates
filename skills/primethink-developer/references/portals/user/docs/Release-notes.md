# Release notes

Here's a summary of recent updates and improvements to the PrimeThink platform, grouped by week and version.

### **Week of April 21, 2025**

This week, we've focused on enhancing collaboration within workspaces, streamlining task management, and refining the user interface for a smoother experience.

**Workspaces & Collaboration**

* Enhanced collaboration with new Workspace sharing options: 'View Only', 'Owner Only', and 'Shared'. You can now easily manage access levels directly from workspace settings, with clear visual indicators for shared workspaces. We've also added a confirmation step when enabling the fully 'Shared' mode.
* Ensured users can seamlessly send messages within 'Owner Only' shared workspaces.
* Improved the display of shared workspace information and icons for better clarity.

**Tasks & Automation**

* Provided more detailed control over documents attached to tasks, allowing you to manage their status and visibility more effectively.
* Improved the reliability of updating documents within tasks.

**Chat Interface & Experience**

* Links within Markdown messages are now fully clickable for easier navigation.
* Optimized the layout and spacing in the chat view for improved readability, particularly on mobile devices.
* Refined the document preview pop-up window, addressing scrollbar behavior and ensuring elements are positioned correctly.
* Streamlined how the application directs you when starting or returning to chats for a more intuitive flow.

**Documents & Collections**

* Improved the display and functionality within the document preview window.

**User Accounts & Settings**

* Improved login stability, preventing potential errors when entering incorrect passwords.

**Platform Updates**

* Resolved a redirection issue affecting users accessing the platform via the older app.ambrogio.ai address.

### **Week of April 14, 2025**

This week saw the launch of the new Task Evaluation feature, alongside improvements to notifications and agent management.

**Tasks & Automation**

* Introduced the **Task Evaluation system**. You can now set up automated tests for your tasks using predefined Excel plans to measure performance, verify effectiveness, and assist in task improvement.
* Added helpful guidance links ('help' and 'help\_url') to task definitions.

**Virtual Assistants (VAs) & AI**

* Added helpful guidance links ('help' and 'help\_url') to Virtual Assistant capability definitions.
* Ensured that private Virtual Assistants set as default assistants in chats or workspaces are correctly displayed to all members.

**Chat Interface & Experience**

* Improved email notifications for unread messages: Chat names now display correctly.
* Ensured you receive notifications properly, even when you @mention yourself in a chat.
* Corrected an issue where creating a new chat via the dedicated view didn't always place it in the selected workspace.
* Addressed inconsistencies in the sorting order of the chat list.

**User Accounts & Settings**

* Introduced an optional email domain whitelist feature for administrators to control outbound email notifications.
* Updated the default setting for the "New Chat" behavior in Group Settings to "Auto" for a more intuitive experience.
* Ensured temporary chats have a distinct visual appearance.
* Updated permissions so that only designated administrators can manage public tasks, which are now accessible only via their specific mention command.

**Documents & Collections**

* Improved the reliability of document indexing and saving processes.

**Platform Updates**

* Resolved an issue where users might encounter an error when assigning a chat to a workspace they didn't originally create.
* Corrected permissions related to modifying file properties (like search status) within a chat, ensuring only the uploader or authorized users can make changes.
* Addressed minor issues in the backend related to chat ordering and agent creation.
* Corrected missing fields in the forms for creating/editing agents and tasks.

### **Week of April 7, 2025**

This week brought major updates to user management, task/agent sharing, and the chat interface.

**User Accounts & Settings**

* You can now register for PrimeThink using invite codes.
* Users with novaware.io email addresses will now be automatically activated for easier internal testing.
* Added an "Invite User" button directly within the Members section for quicker team onboarding.
* Group Admins now have enhanced capabilities, including creating custom roles and managing 'Group Admin' assignments.
* User roles are now displayed more clearly in member lists and pending invites.
* Improved controls for role assignments during the invitation process.
* Streamlined the process for changing user roles within the platform.
* Users can no longer accidentally change their own role via the Members screen.
* Resolved an issue where a user's role might not update visually immediately after being changed.
* Addressed an issue that could prevent new group admins from creating private agents.

**Tasks & Automation**

* Easily import tasks created by others using a shared URL or ID via the new "Import Task" button.
* Quickly share your own tasks using the new "Copy Share ID" button next to each task.
* Removed outdated backend components related to the previous role system.

**Virtual Assistants (VAs) & AI**

* You can now import Virtual Assistants created by others using a shared URL or ID.
* Added a button to easily copy an Agent's share URL for sharing with colleagues.
* Improved the agent creation/edit interface: available capabilities are now dynamically shown based on the selected agent type.

**Chat Interface & Experience**

* Improved the content and formatting of email notifications for unread messages.
* You can now clear your AI memory without encountering errors.
* Addressed an issue that could cause the platform to crash during memory deletion.
* Refined the behavior of the "New Chat" screen when sending messages.
* Made it possible again to copy agent URLs.
* Ensured the correct screen state when navigating to the "New Chat" area.
* Implemented backend functionality for pinning chats (UI coming soon).
* The chat filtering icons now clearly indicate when a filter is active.
* Redesigned the "New Chat" screen: it now provides a more helpful starting point, showing recent tasks and chats.
* Enabled user mentions (@u\_) and VA mentions (@va\_) to trigger notifications or specific VAs.
* Notifications in the list now show a maximum of two lines for better readability.
* Clicking the chat icon next to a user in the Members screen now directly starts a one-on-one chat.
* The main "New Chat" button is now a split button: click directly for a standard chat, or use the arrow for options like "Temp Chat" or "Chat with options".
* Improved how pending invite details are displayed.

**Documents & Collections**

* Ensured real-time updates in the interface when a document is added to a chat.
* Streamlined the file upload process regarding how documents are initially added for search.

**Platform Updates**

* Introduced settings flags to control whether the app opens to your last chat or always starts a new one.
* Enhanced backend APIs for better group management and user timezone updates.
* Improved socket connections to properly support users belonging to multiple groups.

### **Week of March 31, 2025**

This week focused heavily on backend enhancements, new integrations, and preparing features for user interaction.

**New Features**

* Added support for setting a specific "Onboarding Task" for new users joining a group.
* Introduced backend capabilities for running commands within temporary chats or task contexts.
* Enabled cloning and importing of entire Collections using a unique ID.
* Integrated the Markitdown library for enhanced document processing, supporting ZIP files, EML emails, DOCX files with images, and advanced PDF analysis using Gemini or Mistral OCR.

**Tasks & Automation**

* Refined the backend processes for migrating virtual assistants and importing tasks/VAs, ensuring configurations like capabilities are correctly handled.

**Virtual Assistants (VAs) & AI**

* Enhanced backend systems for managing Virtual Assistants uniquely within each group.
* Improved permission handling related to Virtual Assistants.

**Chat Interface & Experience**

* Added backend support for deleting user accounts and groups.

**User Accounts & Settings**

* Implemented backend support for setting a default role for invited users within a group.
* Improved the backend handling of Virtual Assistant types, making the 'type' field mandatory.

**Platform Updates**

* Implemented backend API functionality for reordering groups in the group switcher.
* Addressed a critical issue preventing scheduled tasks from executing correctly.
* Improved how the platform selects PDF processing tools based on available API keys.
* Continued work on integrating social logins using Firebase.

### **Week of March 24, 2025**

This week included improvements to chat organization, document handling, and preparations for upcoming features.

**Chat Interface & Experience**

* Improved the display of user names in direct message chats.
* Added filtering options for direct message chats.
* Ensured drag-and-drop assignment of chats to workspaces updates smoothly without requiring a list refresh.
* Fixed an issue where editing a message could lose its attachments.

**Tasks & Automation**

* Ensured Virtual Assistant capabilities are correctly copied when importing tasks.
* Improved the handling of Virtual Assistants during task import processes.
* Updated the task creation/editing interface with new flags and document handling options.

**Documents & Collections**

* Improved pagination functionality in the Memory section.

**Platform Updates**

* Addressed an issue with MP4 file uploads originating from the mobile app.
* Implemented backend support for temporary chats, including automatic cleanup.
* Refined the process for checking and importing Tasks by their unique ID.
* Improved the display of group public names in the top navigation bar.
* Fixed an issue with changing the public name for a group in settings.
* Adjusted the display of group images in settings for consistency.
* Continued work on the new roles and permissions system (backend).
* Added backend support for direct message chats between users.
* Ensured the auto-archive feature correctly skips favorited chats.
* Continued preparations for the Android app release.

### **Week of March 17, 2025**

Focus this week was on backend infrastructure, Virtual Assistant management, and document processing enhancements.

**Virtual Assistants (VAs) & AI**

* Resolved an issue preventing the creation of new agents.
* Ensured Virtual Assistants are correctly managed uniquely for each group.

**Documents & Collections**

* Improved document processing for DOCX files containing images.

**Platform Updates**

* Addressed potential stability issues related to database connections under load (socket.io and k8s).
* Continued development work on the new roles and permissions system.

### **Week of March 10, 2025**

This week featured UI refinements for chat and collections, along with backend preparations for new features.

**Chat Interface & Experience**

* Improved the visual display of message titles within bubbles.
* Enhanced text input navigation, allowing the use of up/down arrows within multi-line messages.
* Improved the reliability of selecting and copying text from messages, preserving formatting.
* Added the ability to copy selected text using the right-click context menu in message bubbles.

**Documents & Collections**

* Streamlined actions within Collections to prevent unnecessary list refreshes.

**Platform Updates**

* Continued investigation into using Firebase for push notifications.
* Continued investigation into potentially migrating real-time updates from Pusher to Socket.io.
* Implemented a backend endpoint to allow refreshing user tokens before they expire.
* Improved the display of group images in the group switcher sidebar, showing initials if no image is set.

### **Week of March 3, 2025**

Updates this week focused on user management, task copying, and document status improvements.

**Tasks & Automation**

* When copying a task, it's now automatically prefixed with "Copy of" and set to private if the original was Global or Group-level.

**Documents & Collections**

* Renamed the document status 'disabled' to 'archived' for better clarity in Tasks and Chat attachments.
* Added status tracking ('search', 'context', 'archived') to documents associated with Tasks, similar to how they are handled in Chats.
* Added a 'hidden' flag for documents and collections, useful for items embedded from Tasks that shouldn't be directly visible.
* Improved the display of document names in memory search results.

**User Accounts & Settings**

* Implemented backend support for deleting invited users who haven't yet registered.
* Improved the process for reissuing invitation tokens when re-sending an invite.
* Added a flag to differentiate between settings managed automatically by the system and those set by users/admins.
* Ensured only authorized admins can view pending invites and manage invitations.

**Platform Updates**

* Continued work on setting up separate databases for different environments.
* Added backend support for listing users and VAs with descriptions in the context of multi-user chats.
* Removed legacy fields from user settings in the backend.
* Addressed potential backend processing bottlenecks.

### **Week of February 25, 2025**

This week brought improvements to chat management, task editing, group creation, and user feedback mechanisms.

**Chat Interface & Experience**

* Implemented manual reordering of chats in the sidebar.
* Added a context menu (three dots) to chat items in the sidebar, reintroducing the rename function.
* Improved the feedback tool based on user input regarding text visibility and input behavior.

**Tasks & Automation**

* Enhanced the Task editor with a larger, more user-friendly editor for the 'Goal' field.
* Added document status controls ('search', 'context', 'archived') to the Task editing interface.

**User Accounts & Settings**

* Enabled users to create new groups directly.

**Platform Updates**

* Improved the copying process for tasks to ensure all settings are carried over correctly.
* Addressed an issue with the feedback tool reported by users.
* Enhanced the backend logic for handling multi-user chats and Virtual Assistant interactions.
* Improved the document download functionality for pasted text documents.

### **Week of February 19, 2025**

This week focused on document management, backend stability, and preparing for multi-user features.

**Documents & Collections**

* Introduced status options ('search', 'context', 'disabled') for documents within chats, controllable via the Documents tab.
* Added status options ('active', 'disabled') for collections within chats, controllable via the Collections tab.
* Improved document processing for DOCX files to retain formatting.
* Added the ability to rename documents directly within the interface.
* Added a 'Name' field when pasting text to create a new document.

**Chat Interface & Experience**

* Introduced the 'Page' chat type, allowing for dynamic HTML content display within the main chat area.
* Added 'Page' as an option in the 'New Chat' and 'New Task' creation dialogs.
* Updated the top bar to show the group image and name instead of the default logo.

**Platform Updates**

* Addressed a potential backend error related to database connections.
* Improved handling of audio and recorded documents during processing.
* Enhanced backend support for multiple worker processes for improved scalability.
* Added support for uploading .eml and .py files.
* Addressed potential scalability issues identified during load testing.
* Fixed an issue where attachments could sometimes disappear from messages.
* Resolved backend warnings related to library deprecations.
* Ensured the document list correctly reflects the 'ready' status for processing.

### **Week of February 12, 2025**

Key updates this week included workspace improvements, user settings enhancements, and bug fixes.

**Workspaces & Collaboration**

* Added visual indicators (initials) for groups in the sidebar if no image is set.
* Fixed an issue preventing the 'Add Member' button from being visible in workspace settings.

**User Accounts & Settings**

* Added functionality to hide sensitive values (like API keys or passwords) in User and Group variable settings.

**Chat Interface & Experience**

* Fixed an issue where editing a message could remove existing attachments.
* Improved actions within Collections to prevent unnecessary list refreshes.

**Platform Updates**

* Addressed an issue where audio and recorded documents were not being processed correctly.
* Improved backend support for managing multiple background workers.
* Fixed an issue where downloading pasted text documents could fail.

### **Week of February 5, 2025**

This week focused on improving task ordering, search functionality, and memory management.

**Tasks & Automation**

* Corrected the sorting order for Tasks, ensuring frequently used tasks appear higher.

**Chat Interface & Experience**

* Fixed an issue where the search text in the chat list would disappear after selecting a chat.

**Memory & AI**

* Added an optional 'key' field to memories for better organization and retrieval.
* Ensured added collections are correctly included in the context for AI responses.

**Platform Updates**

* Addressed a potential conflict warning in backend data models.
* Continued work on improving document indexing status representation.

### **Week of January 29, 2025**

Focus this week was on document management, workspace features, and API improvements.

**Documents & Collections**

* Added an API endpoint to add existing documents to a collection by their ID.
* Added backend support for renaming documents specifically within a chat or collection context.
* Improved the document download functionality for pasted text documents.

**Workspaces & Collaboration**

* Added backend support for managing documents and collections directly within workspaces.
* Ensured the workspace system prompt is correctly used by the standard AI agent.
* Continued testing and refinement of workspace member management.

**Platform Updates**

* Added backend support for allowing programmatic API access using API keys associated with user roles and groups.
* Continued planning and discussion for the new roles and permissions system.
* Added backend support for processing actions involving specific document IDs.
* Removed potentially unused components related to older document processing libraries.

### **Week of January 22, 2025**

This week brought enhancements to user settings, notifications, document handling, and Virtual Assistant configuration.

**User Accounts & Settings**

* Added settings for default voice provider (OpenAI, Eleven Labs) and preferred voice, used when no specific VA is active.
* Added an API endpoint for users to update their timezone.

**Notifications & Communication**

* Implemented backend logic for sending email notifications after a delay for unread messages.
* Ensured public API endpoints for chat interactions maintain consistent data formats.

**Virtual Assistants (VAs) & AI**

* Added a 'Voice' selection field to the Virtual Assistant creation/editing form.

**Documents & Collections**

* Updated backend document models for better clarity ('extracted\_text' field).
* Added API support for retrieving a single memory by its ID.

**Chat Interface & Experience**

* Implemented backend support for dynamic commands within HTML for 'Page' type chats.

**Platform Updates**

* Addressed an issue where removing capabilities when updating a Virtual Assistant wasn't working correctly.
* Ensured the standard AI agent only attempts to search within documents marked with 'search' status.
* Ensured the standard AI agent only searches within collections marked as 'active'.
* Improved backend task queue management.
* Improved document processing for DOCX files.
* Fixed an issue where saving documents or recordings could cause an error.
* Ensured the list of documents correctly reflects the 'ready' status after processing.
* Corrected backend data model naming conventions.
* Updated the API client to reflect recent backend changes (new chat fields, task flags, document/collection statuses).
* Fixed an error preventing tasks from loading correctly.
* Addressed a backend error related to concurrent operations.
* Fixed an issue where the 'Forgot Password' feature was case-sensitive.

### **Week of January 15, 2025**

This week focused on significant improvements to chat functionality, multi-user interactions, document management, and backend architecture.

**Chat Interface & Experience**

* Introduced the ability to rename documents specifically within a chat or collection context.
* Added a 'Name' field when pasting text to create a document.
* Updated the top bar to display the group image and name.
* Improved handling of group information retrieval.
* Fixed an issue with invalid links in invitation emails.
* Ensured the task list correctly filters private tasks belonging to other users.
* Resolved an error that could occur when deleting an empty chat.
* Fixed a bug preventing members from being added correctly when creating a new chat.
* Added a checkbox in the subchats tab to control context sharing ("Share context with subchats").
* Introduced the 'Page' chat type and updated creation dialogs accordingly.
* Added backend support for the 'Page' chat type.
* Implemented manual chat reordering in the sidebar.
* Improved the message editing process for multi-user chats.
* Enhanced the 'Paste Text' dialog in the Documents tab with a title field and clearer instructions.
* Added backend support for searching chats by title and summary.
* Updated the display of replied-to messages to show more context.
* Ensured Super Admins can edit globally available Virtual Assistants.
* Added Text-to-Speech (TTS) playback controls to user messages (previously only on VA messages).
* Added search functionality to the chat list filter.
* Added an option to edit user messages (with restrictions based on mentions).

**Documents & Collections**

* Ensured documents are correctly separated and managed per group.
* Added an API endpoint to rename documents specifically within a chat or collection.

**Virtual Assistants (VAs) & AI**

* Added support for multiple Text-to-Speech (TTS) providers (OpenAI, Eleven Labs) selectable per Virtual Assistant.
* Ensured Super Admins can edit globally available Virtual Assistants.

**Workspaces & Collaboration**

* Added functionality to delete chats directly from the workspace view.
* Fixed a bug preventing invited users from being added to new chats correctly.
* Ensured deleting a multi-user chat removes the current user but doesn't delete the chat if others remain.

**Notifications & Communication**

* Fixed an issue where clicking an invite link didn't correctly handle user registration/login flow.
* Ensured users invited to a chat receive a notification and their chat list refreshes automatically.

**Platform Updates**

* Completely separated document storage and access by group ID.
* Added backend support for multiple user groups.
* Addressed performance concerns regarding message posting times.
* Improved backend handling of chat message relationships (lazy loading).
* Added backend support for putting document names into the metadata for vector indexing.
* Added user timezone and default language settings.
* Implemented notification filtering per group.
* Added backend support for custom theme colors per group with user overrides.

### **Week of January 8, 2025**

This week focused on notifications, scheduled jobs, multi-user chat enhancements, and UI improvements across the platform.

**Notifications & Communication**

* Fixed an issue causing errors when viewing paginated notifications.
* Ensured push notifications include necessary IDs (group, chat, message) for correct navigation.
* Corrected notification counts for multi-user chats without a default VA.
* Ensured scheduled job notifications correctly link to the job message in the chat.
* Implemented backend support for sending push notifications specifically to authenticated users.
* Added the sub-chat ID to notification data for correct navigation.
* Added a visual indicator (badge count) to the group icon showing the total number of unread notifications for that group.

**Tasks & Automation**

* Ensured scheduled jobs correctly associate notifications with the job message ID.
* Added natural language processing for scheduling tasks (e.g., "every Monday at 9am").
* Added a visual indicator (loading spinner) and disabled state to the 'Save' button when adding/editing scheduled jobs.

**Chat Interface & Experience**

* Added visual avatar images to the members list.
* Fixed an issue preventing the selection of a default Virtual Assistant in user settings.
* Added the ability to use arrow keys and Enter to select mentions from the suggestion list.
* Improved the display of Virtual Assistant icons in the chat list for single vs. multi-user chats.
* Added a visual indicator (e.g., an icon) for temporary chats in the chat list.
* Added a copy button to the chat summary section in the sidebar.
* Added checkboxes for context sharing settings in the chat sidebar (for parent and sub-chats).
* Added a user setting for enabling auto-archiving of chats based on inactivity.
* Implemented UI for replying to and editing messages, including visual indicators for replies.
* Added the ability to add the content of any message to the current input prompt.
* Added an option to download messages as Markdown files.
* Restricted 'Save as Document' and 'Save as Memory' options based on chat capabilities.
* Redesigned the group switcher sidebar for improved usability and added quick access buttons (Invite, Location, TTS, Feedback, Help, Settings).
* Added filtering options for archived chats.
* Improved the display of dates in notifications.
* Added options to mark notifications as read/unread.
* Added support for rendering LaTeX mathematical notation within Markdown messages.
* Added a visual indicator (e.g., a filled icon) when chat filters (like Favorites or Archived) are active.
* Added a split 'New Chat' button offering quick creation of standard or temporary chats, or opening the advanced options dialog.

**Virtual Assistants (VAs) & AI**

* Ensured messages sent with VA mentions (@va\_) do not include the mention text itself when processed by the AI.
* Added default avatar images for Virtual Assistants when no custom image is uploaded.

**Documents & Collections**

* Added preview thumbnails for image attachments within chat messages.
* Added file type icons for attachments.
* Improved the display of document processing status in Collections.
* Added a refresh button to the document list in the sidebar to manually check indexing progress.
* Added a resync button for documents in the chat sidebar in case of processing errors.

**Mobile Experience**

* Made dialog windows full-screen on mobile devices for better usability.
* Ensured the app navigates correctly on launch (to last chat or new chat screen).
* Addressed an issue preventing scrolling in mobile browsers.

**Platform Updates**

* Implemented an API endpoint to download message content as a Markdown file.
* Ensured the backend correctly handles different LLM providers based on user/group settings.
* Added backend support for camera capture and image selection for mobile attachments.
* Fixed an issue where scheduled jobs weren't generating responses correctly.
* Added backend support for retrieving single memory entries by ID.
* Investigated making core AI querying asynchronous for better performance.
* Fixed an API error related to streaming responses.
* Added a specific message type for scheduled job notifications.
* Ensured Virtual Assistant capabilities are correctly copied to subchats created via tools.
* Added backend support for assigning specific Virtual Assistant types to groups.
* Fixed an issue where AI requests could contain multiple system messages.
* Addressed potential issues with running multiple backend workers concurrently.
* Fixed an issue where the list of available members/VAs in the mention selector wasn't updating correctly.
* Improved the API for retrieving user details within a group to include avatar images.
* Added backend support for using cronjob expressions for scheduled tasks.
* Added backend support for creating subchats via tools.
* Added backend support for saving message content as a document.
* Added backend support for enabling/disabling location updates.
* Added backend support for chat notes and a tool to manage them.
* Implemented a system for tracking read/unread messages per user in a chat.
* Improved the message context menu positioning.
* Added backend support for selecting TTS voices per Virtual Assistant.
* Fixed an AI loop issue triggered by certain types of instructions.
* Resolved issues with TTS playback and component initialization on hot restarts.
* Improved memory re-indexing processes.
* Added backend support for clearing and re-indexing all memories.
* Implemented a notification system for tools to inform users about background processes.
* Improved error message display to users.
* Enhanced the web browsing tool with LLM-powered interaction and source quoting.
* Added support for OpenAI TTS.
* Added tools for summarizing documents and links.
* Updated core AI libraries (LangChain).
* Completed the database architecture for Collections and Documents.
* Implemented semantic search for memories in the Memory section.
* Prepared the platform for initial user onboarding.
* Added support for receiving text, URLs, documents, and images via the mobile share system.
* Added backend support for inviting external users and multiple VAs to a chat.
* Allowed switching the Virtual Assistant for existing chats.
* Added application icons and logos.
* Removed dependencies on older memory systems (Zep).
* Implemented a system for background tasks (summarization, entity extraction).
* Added support for push notifications on web platforms.
* Added backend support for extracting entities from conversations for memory.
* Ensured extra context is stored correctly in the vector database for memories.
* Implemented semantic indexing for memories to retrieve relevant context.
* Grouped chat messages visually by day.
* Refactored chat architecture for multi-user support.
* Added workspace selection during new chat creation.
* Implemented the core concept of unread messages.
* Added a long-press option on messages to save them as documents.
* Ensured all relevant context is added to the memory system.
* Removed dependencies on older chat UI components.
* Added backend support for Virtual Assistant tools stored in the database.
* Added filtering chats by the assigned Virtual Assistant.
* Included contextual information with messages and replies.
* Implemented various AI-powered tools.
* Added image analysis capabilities.
* Added visual indicators for when the AI is processing or encounters an error.
* Allowed memory types to be dynamically set per agent.
* Added a message reporting feature.
* Added necessary database indexes for performance.
* Implemented a 'Clear Chat' button functionality.
* Implemented proper URL-based routing for the web application.
* Fixed backend API errors.
* Added the concept of Workspaces for grouping chats.
* Added document capture via camera for mobile apps.
* Added backend support for setting chat goals and initial prompts.
* Implemented chat list sorting by last update time.
* Improved URL navigation for sub-chats.
* Added the ability to star/favorite chats.
* Completed core feature set for v0.5 release.
* Improved the saving mechanism for notes and todos created via tools.
* Implemented a data collection tool.
* Ensured memory clearing correctly removes associated vector data.
* Added secure storage for user login credentials.
* Added storage for user preferences regarding microphone usage.
* Ensured AI responses correctly reference the message they are replying to.
* Added structured data extraction capabilities to the memory system (e.g., extracting calories from meal descriptions).
* Added backend support for interactive, multi-step goals.
* Added backend support for automated, multi-step goals.
* Implemented document/URL vector indexing and storage.
* Implemented document/URL summarization and storage.
* Added support for cron-based reminders/scheduled tasks.
* Added the ability to select from multiple available assistants when creating chats.
* Added display of user and assistant avatars/images.
* Added collection and use of user location data (with permission).

This covers all the updates extracted from the provided tickets.

## 1.0.2
11-12-2024

### New features

- **Notifications for all the chat users** - In a multi user chat, it's now possible to write a message and notify all users by writing `@here` or `@all`.
- **Duplicate task** - A task can now easily duplicated with a new button near the task.
- **Possibility to edit private VAs**

### Improvements

- **Summary VA** - The Summary VA now works with more types of documents.
- **Improved error handling**
- **Favourite chats**
- **Info chat reordered**

## 1.0.1
09-12-2024

Small improvements.

## 1.0.0
08-12-2024

First release.

---
