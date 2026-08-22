# Roles and Permissions

PrimeThink uses a role-based access control (RBAC) system to manage what users can do within a group. Each user in a group can be assigned a **role**, and each role grants a set of **permissions** that control access to features and actions.

---

## How It Works

1. A **Group Admin** assigns a role to each user in the group.
2. Each role carries a set of permissions that determine what the user can access.
3. Permissions are checked at runtime — if a user lacks the required permission, the action is denied with an HTTP 403 error.

---

## Roles

A role is a named collection of permissions. Roles can be **system roles** (built-in to the platform) or **custom roles** created by a Group Admin.

Each role has the following properties:

| Property         | Type     | Description                                      |
|------------------|----------|--------------------------------------------------|
| `id`             | `string` | Unique role identifier (UUID)                    |
| `name`           | `string` | Display name (e.g. "Admin", "Editor", "Viewer")  |
| `description`    | `string` | Human-readable description of the role           |
| `is_system_role` | `bool`   | `true` if this is a built-in platform role       |

## Per-Task Role Access

A task can grant access to one or more roles in addition to its normal owner and task-type rules. A user whose current group role is assigned to the task:

- Sees the task in task lists for that group
- Can open the task even when they are not its owner
- Passes task checks that normally require owner-level access

This assignment does not change the user's role or add permissions to that role globally. It applies only to the selected task, and task responses expose the assignment as an `assigned_roles` list containing each role's `id` and `name`.

Removing a role from the task revokes this additional path for every user with that role. Clearing the assignment list restores the task's normal owner and task-type access rules.

!!! warning "Task-role access is not view-only"
    A matching role passes checks used for owner-level task operations, not just task discovery. Assign only roles whose members should be allowed to manage and use that task. Continue to give each role the minimum general task permissions it needs.

For API-based assignment, see [Assign Roles to a Task](/developer/API-Examples/#assign-roles-to-a-task).

---

## Permission Scopes

Each permission has a scope that determines where it applies and who can assign it.

| Scope    | Description                                            |
|----------|--------------------------------------------------------|
| `global` | User-level, applies regardless of group context        |
| `group`  | Group-level, requires group admin privileges to assign |
| `admin`  | Platform admin only                                    |

---

## Permissions Reference

Permissions are organized into categories. Each permission has an ID (used in code and returned by [`pt.getUserRole()`](Data-Management-API.md#ptgetuserrole)), a human-readable name, a scope, and optional dependencies (permissions that must also be granted).

### administration

| Permission ID         | Name                | Scope | Description                        | Dependencies |
|-----------------------|---------------------|-------|------------------------------------|--------------|
| `view_group_settings` | View Group Settings | group | View group settings                | —            |
| `edit_group_settings` | Edit Group Settings | group | Edit group settings and properties | —            |

### agents

| Permission ID                 | Name                        | Scope  | Description                                          | Dependencies                             |
|-------------------------------|-----------------------------|--------|------------------------------------------------------|------------------------------------------|
| `view_ai_agents`              | View AI Agents              | global | View AI agents available to the group                | —                                        |
| `create_private_ai_agents`    | Create Private AI Agents    | global | Create private AI agents accessible only to the user | —                                        |
| `edit_private_ai_agents`      | Edit Private AI Agents      | global | Edit private AI agents accessible only to the user   | `create_private_ai_agents`               |
| `delete_private_ai_agents`    | Delete Private AI Agents    | global | Delete private AI agents accessible only to the user | `create_private_ai_agents`               |
| `create_group_ai_agents`      | Create Group AI Agents      | group  | Create AI agents shared with the group               | `view_ai_agents`                         |
| `edit_group_ai_agents`        | Edit Group AI Agents        | group  | Edit AI agents shared with the group                 | `view_ai_agents`, `create_group_ai_agents` |
| `delete_group_ai_agents`      | Delete Group AI Agents      | group  | Delete AI agents shared with the group               | `view_ai_agents`, `create_group_ai_agents` |
| `import_shared_ai_agents`     | Import Shared AI Agents     | global | Import shared AI agents                              | —                                        |
| `view_capabilities`           | View Capabilities           | global | View capabilities of AI agents                       | —                                        |
| `create_private_capabilities` | Create Private Capabilities | global | Create private capabilities for AI agents            | `view_capabilities`                      |
| `create_group_capabilities`   | Create Group Capabilities   | group  | Create capabilities shared with the group            | `view_capabilities`                      |
| `create_system_capabilities`  | Create System Capabilities  | admin  | Create system-wide capabilities for AI agents        | `view_capabilities`                      |
| `edit_capabilities`           | Edit Private Capabilities   | global | Edit private capabilities for AI agents              | `create_private_capabilities`            |
| `remove_capabilities`         | Remove Private Capabilities | global | Delete private capabilities for AI agents            | `create_private_capabilities`            |

### api_access

| Permission ID   | Name            | Scope | Description              | Dependencies    |
|-----------------|-----------------|-------|--------------------------|-----------------|
| `view_api_keys`   | View API Keys   | group | View API keys            | —               |
| `create_api_keys` | Create API Keys | group | Create new API keys      | `view_api_keys` |
| `edit_api_keys`   | Edit API Keys   | group | Edit existing API keys   | `view_api_keys` |
| `revoke_api_keys` | Revoke API Keys | group | Revoke existing API keys | `view_api_keys` |

### chat_sidebar

| Permission ID                          | Name                                 | Scope  | Description                                  | Dependencies                           |
|----------------------------------------|--------------------------------------|--------|----------------------------------------------|-----------------------------------------|
| `view_chat_sidebar`                    | View Chat Sidebar                    | global | View the chat sidebar                        | —                                       |
| `edit_chat_sidebar`                    | Edit Chat Sidebar                    | group  | Edit the chat sidebar                        | `view_chat_sidebar`                     |
| `view_chat_sidebar_chat_tab`           | View Chat Sidebar Chat Tab           | global | View the chat tab in the sidebar             | `view_chat_sidebar`                     |
| `view_chat_sidebar_documents_tab`      | View Chat Sidebar Documents Tab      | global | View the documents tab in the sidebar        | `view_chat_sidebar`                     |
| `view_chat_sidebar_collections_tab`    | View Chat Sidebar Collections Tab    | global | View the collections tab in the sidebar      | `view_chat_sidebar`                     |
| `view_chat_sidebar_members_tab`        | View Chat Sidebar Members Tab        | global | View the members tab in the sidebar          | `view_chat_sidebar`                     |
| `view_chat_sidebar_scheduled_jobs_tab` | View Chat Sidebar Scheduled Jobs Tab | global | View the scheduled jobs tab in the sidebar   | `view_chat_sidebar`                     |
| `create_scheduled_job_in_chat`         | Create Scheduled Job in Chat         | global | Create a scheduled job within a chat         | `view_chat_sidebar_scheduled_jobs_tab`  |
| `edit_scheduled_job_in_chat`           | Edit Scheduled Job in Chat           | global | Edit a scheduled job within a chat           | `create_scheduled_job_in_chat`          |
| `remove_scheduled_job_in_chat`         | Remove Scheduled Job in Chat         | global | Remove a scheduled job within a chat         | `create_scheduled_job_in_chat`          |
| `associate_collection_in_chat`         | Associate Collection in Chat         | global | Associate an existing collection with a chat | `view_chat_sidebar_collections_tab`     |
| `remove_collection_in_chat`            | Remove Collection in Chat            | global | Remove a collection from a chat              | `associate_collection_in_chat`          |
| `create_documents_in_chat`             | Create Documents in Chat             | global | Create documents within a chat               | `view_chat_sidebar_documents_tab`       |
| `edit_documents_in_chat`               | Edit Documents in Chat               | global | Edit documents within a chat                 | `create_documents_in_chat`              |
| `remove_documents_in_chat`             | Remove Documents in Chat             | global | Remove documents from a chat                 | `create_documents_in_chat`              |

### chats

| Permission ID                         | Name                                | Scope  | Description                         | Dependencies          |
|---------------------------------------|-------------------------------------|--------|-------------------------------------|-----------------------|
| `create_single_chats`                 | Create Single Chats                 | global | Create 1-on-1 chats                 | —                     |
| `edit_single_chats`                   | Edit Single Chats                   | global | Edit existing 1-on-1 chats          | `create_single_chats` |
| `remove_single_chats`                 | Remove Single Chats                 | global | Remove 1-on-1 chats                 | `create_single_chats` |
| `create_group_chats`                  | Create Group Chats                  | global | Create group chats                  | —                     |
| `edit_group_chats`                    | Edit Group Chats                    | global | Edit group chats                    | `create_group_chats`  |
| `remove_group_chats`                  | Remove Group Chats                  | global | Remove group chats                  | `create_group_chats`  |
| `create_direct_chats`                 | Create Direct Chats                 | global | Create direct chats                 | —                     |
| `edit_direct_chats`                   | Edit Direct Chats                   | global | Edit direct chats                   | `create_direct_chats` |
| `remove_direct_chats`                 | Remove Direct Chats                 | global | Remove direct chats                 | `create_direct_chats` |
| `create_temp_chat`                    | Create Temp Chat                    | global | Create temporary chats              | —                     |
| `create_page_chats`                   | Create Page Chats                   | global | Create page chats                   | —                     |
| `edit_page_chats`                     | Edit Page Chats                     | global | Edit page chats                     | —                     |
| `remove_page_chats`                   | Remove Page Chats                   | global | Remove page chats                   | —                     |
| `make_chat_public`                    | Make Chat Public                    | global | Make a chat public                  | —                     |
| `favorite_chats`                      | Favorite Chats                      | global | Mark chats as favorite              | —                     |
| `archive_chats`                       | Archive Chats                       | global | Archive chats                       | —                     |
| `pin_chats`                           | Pin Chats                           | global | Pin chats to the top                | —                     |
| `rename_chats`                        | Rename Chats                        | global | Rename chats                        | —                     |
| `view_chat_mention_name`              | View Chat Mention Name              | global | View chat mention name              | —                     |
| `edit_chat_mention_name`              | Edit Chat Mention Name              | global | Edit chat mention name              | —                     |
| `show_all_chats_tab`                  | Show All Chats Tab                  | global | Show the All Chats tab              | —                     |
| `show_chats_with_unread_messages_tab` | Show Chats with Unread Messages Tab | global | Show the Unread Messages tab        | `show_all_chats_tab`  |
| `mention_other_chats_in_chats`        | Mention Other Chats in Chats        | global | Mention other chats in a message    | —                     |
| `show_ai_reasoning_details`           | Show AI Reasoning Details           | global | Show AI reasoning details in chat   | —                     |

### collaboration

| Permission ID               | Name                      | Scope  | Description                              | Dependencies |
|-----------------------------|---------------------------|--------|------------------------------------------|--------------|
| `join_chats`                | Join Chats                | global | Join existing chats                      | —            |
| `invite_members_to_chats`   | Invite Members to Chats   | global | Invite members to join chats             | `join_chats` |
| `remove_members_from_chats` | Remove Members from Chats | global | Remove members from chats                | `join_chats` |
| `mention_users_in_chats`    | Mention Users in Chats    | global | Mention specific users in chat messages  | `join_chats` |

### collections

| Permission ID              | Name                       | Scope  | Description                              | Dependencies                               |
|----------------------------|----------------------------|--------|------------------------------------------|--------------------------------------------|
| `view_collections`         | View Collections           | global | View collections                         | —                                          |
| `view_public_collections`  | View Public Collections    | global | View public collections                  | —                                          |
| `create_private_collections` | Create Private Collections | global | Create private collections             | —                                          |
| `edit_private_collections` | Edit Private Collections   | global | Edit private collections                 | `create_private_collections`               |
| `remove_private_collections` | Remove Private Collections | global | Remove private collections             | `create_private_collections`               |
| `create_group_collections` | Create Group Collections   | group  | Create collections shared with the group | `view_collections`                         |
| `edit_group_collections`   | Edit Group Collections     | group  | Edit collections shared with the group   | `view_collections`, `create_group_collections` |
| `remove_group_collections` | Remove Group Collections   | group  | Remove collections shared with the group | `view_collections`, `create_group_collections` |
| `make_collections_public`  | Make Collections Public    | global | Make collections public                  | —                                          |
| `reindex_collections`      | Reindex Collections        | group  | Reindex all collections                  | —                                          |

### documents

| Permission ID      | Name               | Scope  | Description           | Dependencies |
|--------------------|---------------------|--------|-----------------------|--------------|
| `download_documents` | Download Documents | global | Download documents    | —            |
| `reindex_documents`  | Reindex Documents  | group  | Reindex all documents | —            |

### group

| Permission ID               | Name                      | Scope  | Description               | Dependencies |
|-----------------------------|---------------------------|--------|---------------------------|--------------|
| `get_all_groups`            | Get All Groups            | admin  | Get all groups            | —            |
| `get_any_group`             | Get Any Group             | admin  | Get any group             | —            |
| `get_my_group`              | Get My Group              | global | Get own group             | —            |
| `edit_group`                | Edit Group                | group  | Edit group properties     | —            |
| `delete_group`              | Delete Group              | group  | Delete group              | —            |
| `manage_group_agents`       | Manage Group Agents       | group  | Manage group agents       | —            |
| `manage_group_capabilities` | Manage Group Capabilities | group  | Manage group capabilities | —            |
| `view_super_admins`         | View Super Admins         | admin  | View super admins         | —            |
| `view_group_admins`         | View Group Admins         | group  | View group admins         | —            |

### group_variables

| Permission ID          | Name                   | Scope | Description            | Dependencies           |
|------------------------|------------------------|-------|------------------------|------------------------|
| `view_group_variables`   | View Group Variables   | group | View group variables   | —                      |
| `create_group_variables` | Create Group Variables | group | Create group variables | `view_group_variables` |
| `edit_group_variables`   | Edit Group Variables   | group | Edit group variables   | `view_group_variables` |
| `remove_group_variables` | Remove Group Variables | group | Remove group variables | `view_group_variables` |

### live_apps

| Permission ID                  | Name                           | Scope  | Description                            | Dependencies |
|--------------------------------|--------------------------------|--------|----------------------------------------|--------------|
| `view_live_apps`               | View Live Apps                 | global | View live apps                         | —            |
| `view_group_live_apps`         | View Group Live Apps           | global | View group live apps                   | —            |
| `view_public_live_apps`        | View Public Live Apps          | global | View public live apps                  | —            |
| `view_group_live_apps_mentions`  | View Group Live Apps Mentions  | global | View group live apps mentions        | —            |
| `view_public_live_apps_mentions` | View Public Live Apps Mentions | global | View public live apps mentions       | —            |
| `view_live_apps_catalog`       | View Live Apps Catalog         | global | View live apps catalog                 | —            |
| `create_private_live_apps`     | Create Private Live Apps       | global | Create private live apps               | —            |
| `edit_private_live_apps`       | Edit Private Live Apps         | global | Edit private live apps                 | —            |
| `remove_private_live_apps`     | Remove Private Live Apps       | global | Remove private live apps               | —            |
| `create_group_live_apps`       | Create Group Live Apps         | group  | Create live apps shared with the group | —            |
| `edit_group_live_apps`         | Edit Group Live Apps           | group  | Edit live apps shared with the group   | —            |
| `remove_group_live_apps`       | Remove Group Live Apps         | group  | Remove live apps shared with the group | —            |
| `import_shared_live_apps`      | Import Shared Live Apps        | global | Import live apps shared with the user  | —            |
| `manage_public_live_apps`      | Manage Public Live Apps        | admin  | Manage public live apps                | —            |
| `manage_system_live_apps`      | Manage System Live Apps        | admin  | Manage system live apps                | —            |
| `manage_catalog_live_apps`     | Manage Catalog Live Apps       | admin  | Manage catalog live apps               | —            |
| `execute_live_app`             | Execute Live App               | global | Execute a live app                     | —            |

### llm

Permissions related to LLM and agent execution behavior.

| Permission ID    | Name             | Scope  | Description                                               | Dependencies |
|------------------|------------------|--------|-----------------------------------------------------------|--------------|
| `call_llm`         | Call LLM         | global | Call the LLM during agent execution                       | —            |
| `direct_tool_call` | Direct Tool Call | global | Invoke agent tools directly without going through the LLM | —            |

### memory

| Permission ID | Name          | Scope  | Description          | Dependencies                 |
|---------------|---------------|--------|----------------------|------------------------------|
| `view_memory`   | View Memory   | global | View personal memory | —                            |
| `create_memory` | Create Memory | global | Create memory items  | `view_memory`                |
| `edit_memory`   | Edit Memory   | global | Edit memory items    | `view_memory`, `create_memory` |
| `remove_memory` | Remove Memory | global | Remove memory items  | `view_memory`, `create_memory` |

### notifications

| Permission ID                     | Name                            | Scope  | Description                        | Dependencies         |
|-----------------------------------|---------------------------------|--------|------------------------------------|----------------------|
| `view_notifications`              | View Notifications              | global | View notifications                 | —                    |
| `delete_notifications`            | Delete Notifications            | global | Delete notifications               | `view_notifications` |
| `manage_notification_status`      | Manage Notification Status      | global | Mark notifications as read/unread  | `view_notifications` |
| `configure_notification_settings` | Configure Notification Settings | global | Configure notification preferences | `view_notifications` |

### roles

| Permission ID   | Name            | Scope | Description              | Dependencies               |
|-----------------|-----------------|-------|--------------------------|-----------------------------|
| `view_roles`      | View Roles      | group | View roles               | —                           |
| `create_roles`    | Create Roles    | group | Create roles             | `view_roles`                |
| `edit_roles`      | Edit Roles      | group | Edit roles               | `view_roles`, `create_roles` |
| `remove_roles`    | Remove Roles    | group | Legacy near-duplicate of `delete_roles`; not currently enforced by any endpoint | `view_roles`, `create_roles` |
| `associate_roles` | Associate Roles | group | Associate roles to users | `view_roles`                |
| `delete_roles`    | Delete Roles    | group | Delete a role definition (gates the role-delete endpoint) | `view_roles`, `create_roles` |

### scheduled_jobs

| Permission ID              | Name                       | Scope  | Description                             | Dependencies          |
|----------------------------|----------------------------|--------|-----------------------------------------|-----------------------|
| `view_scheduled_jobs`        | View Scheduled Jobs        | global | View scheduled jobs                     | —                     |
| `create_chat_scheduled_jobs` | Create Chat Scheduled Jobs | global | Create new scheduled jobs for chat      | `view_scheduled_jobs` |
| `edit_chat_scheduled_jobs`   | Edit Chat Scheduled Jobs   | global | Edit existing scheduled jobs for chat   | `view_scheduled_jobs` |
| `remove_chat_scheduled_jobs` | Remove Chat Scheduled Jobs | global | Remove existing scheduled jobs for chat | `view_scheduled_jobs` |

### tasks

| Permission ID            | Name                       | Scope  | Description                        | Dependencies                       |
|--------------------------|----------------------------|--------|------------------------------------|-------------------------------------|
| `view_tasks`               | View Tasks                 | global | View tasks                         | —                                   |
| `view_group_tasks`         | View Group Tasks           | global | View group tasks                   | —                                   |
| `view_public_tasks`        | View Public Tasks          | global | View public tasks                  | —                                   |
| `view_group_tasks_mentions`  | View Group Tasks Mentions  | global | View group tasks mentions        | —                                   |
| `view_public_tasks_mentions` | View Public Tasks Mentions | global | View public tasks mentions       | —                                   |
| `view_tasks_catalog`       | View Catalog Tasks         | global | View catalog tasks                 | —                                   |
| `create_private_tasks`     | Create Private Tasks       | global | Create private tasks               | —                                   |
| `edit_private_tasks`       | Edit Private Tasks         | global | Edit private tasks                 | `create_private_tasks`              |
| `remove_private_tasks`     | Remove Private Tasks       | global | Remove private tasks               | `create_private_tasks`              |
| `create_group_tasks`       | Create Group Tasks         | group  | Create tasks shared with the group | `view_tasks`                        |
| `edit_group_tasks`         | Edit Group Tasks           | group  | Edit tasks shared with the group   | `view_tasks`, `create_group_tasks`  |
| `remove_group_tasks`       | Remove Group Tasks         | group  | Remove tasks shared with the group | `view_tasks`, `create_group_tasks`  |
| `import_shared_tasks`      | Import Shared Tasks        | global | Import tasks shared with the user  | —                                   |
| `manage_public_tasks`      | Manage Public Tasks        | admin  | Manage public tasks                | `view_tasks`                        |
| `manage_system_tasks`      | Manage System Tasks        | admin  | Manage system tasks                | `view_tasks`                        |
| `manage_catalog_tasks`     | Manage Catalog Tasks       | admin  | Manage catalog tasks               | `view_tasks`                        |
| `execute_task_evaluation`  | Execute Task Evaluation    | group  | Execute task evaluation            | `view_tasks`                        |
| `view_task_evaluation`     | View Task Evaluation       | group  | View task evaluation               | `view_tasks`                        |
| `edit_task_evaluation`     | Edit Task Evaluation       | group  | Edit task evaluation               | `view_task_evaluation`              |
| `remove_task_evaluation`   | Remove Task Evaluation     | group  | Remove task evaluation             | `view_task_evaluation`              |
| `execute_task_actions`     | Execute Task Action        | global | Execute task action                | `view_task_evaluation`              |

### users

| Permission ID      | Name               | Scope  | Description                     | Dependencies   |
|--------------------|---------------------|--------|---------------------------------|----------------|
| `view_members`       | View Members       | global | View group members              | —              |
| `view_invited_users` | View Invited Users | group  | View list of invited users      | `view_members` |
| `invite_users`       | Invite Users       | group  | Invite new users to the group   | `view_members` |
| `remove_members`     | Remove Members     | group  | Remove members from the group   | `view_members` |
| `assign_roles`       | Assign Roles       | group  | Assign roles to group members   | `view_members` |
| `delete_user`        | Delete User        | group  | Delete a user from the system   | `view_members` |
| `restore_user`       | Restore User       | group  | Restore a deleted user          | `view_members` |
| `view_deleted_users` | View Deleted Users | group  | View deleted users              | `view_members` |

### workspaces

| Permission ID                    | Name                           | Scope  | Description                                         | Dependencies      |
|----------------------------------|--------------------------------|--------|-----------------------------------------------------|--------------------|
| `view_workspaces`                | View Workspaces                | global | View available workspaces                           | —                  |
| `create_workspaces`              | Create Workspaces              | global | Create new workspaces                               | `view_workspaces`  |
| `edit_workspaces`                | Edit Workspaces                | global | Edit existing workspaces                            | `view_workspaces`  |
| `remove_workspaces`              | Remove Workspaces              | global | Remove existing workspaces                          | `view_workspaces`  |
| `archive_workspace`              | Archive Workspaces             | global | Archive existing workspaces                         | `view_workspaces`  |
| `view_archived_workspaces`       | View Archived Workspaces       | global | View archived workspaces                            | `view_workspaces`  |
| `access_workspace_advanced_info` | Access Workspace Advanced Info | global | Access advanced information about a workspace       | `view_workspaces`  |
| `edit_workspace_system_prompt`   | Edit Workspace System Prompt   | global | Edit the system prompt for a workspace              | `view_workspaces`  |
| `manage_workspace_documents`     | Manage Workspace Documents     | global | Create, edit, and remove documents in a workspace   | `view_workspaces`  |
| `manage_workspace_collections`   | Manage Workspace Collections   | global | Create, edit, and remove collections in a workspace | `view_workspaces`  |
| `manage_workspace_members`       | Manage Workspace Members       | global | Add or remove members from a workspace              | `view_workspaces`  |

---

## Enforcement

Permission checks are enforced at runtime before the requested action is executed. When a user lacks the required permission, the platform returns an **HTTP 403** response with a descriptive error message.

**Examples of enforcement behavior:**

| Permission          | When Checked                                             | Error Message                                                        |
|---------------------|----------------------------------------------------------|----------------------------------------------------------------------|
| `call_llm`          | Before the LLM is invoked (streaming and non-streaming)  | "You do not have permission to call the LLM in this chat."           |
| `direct_tool_call`  | When a direct tool call pattern is detected in a message  | "You do not have permission to use direct tool calls in this chat."  |

---

## Checking Permissions in Live Apps

Use [`pt.getUserRole()`](Data-Management-API.md#ptgetuserrole) to retrieve the current user's role and permissions at runtime.

**Response structure:**

```javascript
{
  role: {
    id: string,           // Role UUID
    name: string,         // Role display name (e.g. "Admin", "Editor")
    description: string,  // Role description
    is_system_role: bool  // true if this is a built-in platform role
  },
  permissions: string[]   // Array of permission IDs (e.g. ["download_documents", "invite_users"])
}
```

Returns `null` when the user is not logged in or has no role assigned.

**Example — gate a feature based on permission:**

```javascript
const userRole = await pt.getUserRole();

if (userRole?.permissions.includes('call_llm')) {
    // User can trigger LLM actions
    enableAIFeatures();
} else {
    showMessage('You do not have permission to use AI features.');
}
```

**Example — show admin-only UI:**

```javascript
const userRole = await pt.getUserRole();
const isAdmin = userRole?.role.name === 'Admin';

document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
});
```

For full API details, see the [`pt.getUserRole()` reference](Data-Management-API.md#ptgetuserrole).
