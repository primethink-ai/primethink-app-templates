# Collaboration

PrimeThink offers several ways for users within the same [Group (Organization)](/admin/Group-Management/) to collaborate effectively. Understanding these methods and the associated permissions is key to managing teamwork and information sharing securely. Collaboration primarily occurs through:

* [Direct Messages (DMs)](#direct-messages-dms)
* [Group Conversations (Multi-User Chats)](#group-conversations-multi-user-chats)
* [Shared Workspaces](#shared-workspaces)

These features allow for seamless communication, resource sharing, and task management between individuals and AI assistants.

---

## Direct Messages (DMs)

Direct Messages are private, one-on-one or small group conversations between specific users within your organization. They are ideal for:

* Quick questions and discussions.
* Sharing information directly with specific individuals.

DMs exist outside the structured context of shared workspaces and offer a simple way to communicate directly.

---

## Group Conversations (Multi-User Chats)

Group Conversations, often referred to as Multi-User Chats in the [User Interface](User-Interface.md#chat-types), are chats involving multiple human users and potentially one or more AI assistants. These are distinct from standard 1-to-1 chats with only AI assistants.

**Key Features:**

* **Participants:** Can include multiple users and AI Virtual Assistants ([VAs](/admin/Agents/)).
* **Mentions:** Use `@` to mention specific members or VAs. Use `@here` or `@all` to notify all chat members.
* **Collaboration Tools:** Members (depending on permissions) can upload files, manage [Collections](Collections.md), schedule [Tasks](/admin/Tasks/), and more. See [AI Assistant Tools](/admin/AI-Assistant-Tools/) for chat organization capabilities like Memos and Subchats.
* **Memory:** Note that in Multi-User chats, the AI's Memory capability is typically disabled by default to protect privacy; the system will not automatically learn from or store user messages in its persistent memory. ([User Interface Reference](User-Interface.md#chat-types)).

**Permissions in Group Conversations:**

Permissions within a Group Conversation are **dictated by the type of Workspace** it resides in.

### Group Conversation inside a Non-Shared Workspace

* **Owner:**
    * Has full control over the chat, including managing its information (name, goal, etc.).
    * Cannot leave the chat but can **delete** it entirely for all members.
* **Members:**
    * Can move the chat to one of *their own* workspaces.
    * Can upload/edit files.
    * Can add/remove [Collections](Collections.md).
    * Can invite/remove other members or AI assistants.
    * Can schedule [Tasks](/admin/Tasks/).
    * Can send messages and mention others.
    * Can **leave** the chat. (Note: When a member leaves, any private AI assistants they added will also be removed).

### Group Conversation inside a Shared Workspace (Type: `Owner Only`)

* **Owner:**
    * Can change the workspace the chat belongs to.
    * Manages all chat information.
    * Cannot leave the chat but can **delete** it for everyone.
* **Non-Owner Members:**
    * Can send messages and mention others.
    * Can **leave the workspace**, which removes them from all chats within it. (Private VAs are removed upon leaving).

### Group Conversation inside a Shared Workspace (Type: `Shared`)

* **All Members:**
    * Have equal permissions *within the chat* (e.g., sending messages, managing files/collections, scheduling tasks, inviting/removing members *unless* the member is part of the shared workspace itself).
    * Cannot change the workspace the chat belongs to (this is fixed).
* **Leaving:** Members can leave the workspace, losing access to all its chats. (Private VAs are removed upon leaving).
* **Removal Restriction:** A member **cannot** remove another user from the chat if that user is also a member of the underlying shared workspace. Removal must happen at the workspace level.

### Chat Share Types

Individual chats have their own share type, similar to workspaces:

* `Not Shared`: Only the owner can access and manage the chat.
* `View Only`: Members can see chat content but cannot interact or modify anything.
* `Owner Only`: The owner retains primary control, but members can actively participate.
* `Shared`: All members have equal permissions within the chat.

**Important Restriction:** When a chat is inside a workspace, users **cannot** change the chat's share type. The chat inherits its sharing behavior from the workspace it belongs to. To change sharing permissions, you must modify the workspace's share type instead (see [Workspace Sharing Logic](#workspace-sharing-logic)).

This restriction ensures consistent access control across all chats within a workspace and prevents conflicting permission states.

---

## Shared Workspaces

Workspaces act as containers for chats, documents, collections, and settings. By default, a workspace is private (`Not Shared`). However, you can share workspaces with other members of your Group (Organization) to facilitate collaboration on projects or topics.

The level of collaboration is controlled by the workspace's `share_type`.

**Workspace Share Types:**

* `Not Shared`: The default state. Only the owner can access and manage.
* `View Only`: Members can see content but cannot interact or modify anything.
* `Owner Only`: The owner retains primary control, but members can actively participate in chats.
* `Shared`: All members have equal permissions, effectively dissolving the concept of a single owner.

*UI Indication:* Workspaces shared as `View Only`, `Owner Only`, or `Shared` will display a specific icon in the workspace list within the [User Interface](User-Interface.md).

!!! tip "Shared workspace memory"
    Shared workspaces also have a **shared memory** — project rules and knowledge that every member's AI assistant learns and reuses across all chats in the workspace. Write access follows the workspace's share type (everyone in `Shared`, the creator only otherwise). See [Workspace Memory](Memory.md#workspace-memory-types-shared-across-a-team) and the [Workspace Memory Architecture](/developer/Workspace-Memory-Architecture/).

### Workspace Sharing Logic

1.  **Creation:** New workspaces start as `Not Shared`.
2.  **Adding Members:** Adding the first member to a `Not Shared` workspace automatically changes its type to `Owner Only`.
3.  **Reverting to Not Shared:** An `Owner Only` workspace reverts to `Not Shared` automatically only if *all* members (except the owner) are removed.
4.  **Changing to Shared:**
    * The owner of an `Owner Only` workspace can manually change it to `Shared`.
    * **This change is IRREVERSIBLE.** Once `Shared`, it cannot be changed back.
    * *Caution:* There is no confirmation prompt before making this irreversible change.
5.  **Reverting from Shared:** A `Shared` workspace **cannot** be changed back because:
    * Ownership is dissolved.
    * Any member can remove any other member, including the original creator.
6.  **Permissions in `Shared`:**
    * All members possess equal permissions.
    * Any member can remove any other member.
7.  **Self-Removal Restrictions:** The owner cannot leave (`remove themselves`) from `Not Shared` or `Owner Only` workspaces. They must first share it or transfer ownership (if supported).

### Permissions by Workspace Share Type

The `share_type` dictates what owners and members can do within the workspace and its contained chats:

* **`Not Shared` Workspace:**
    * **Owner:** Has full control – manage workspace settings (name, prompt), manage documents/collections, add/remove members (which changes the type), create/delete chats, send messages, delete the workspace.

* **`View Only` Workspace:**
    * **Owner:**
        * Can edit workspace name and system prompt.
        * Can manage documents (add/remove/change status).
        * Can manage collections (add/remove).
        * Can manage members (add/remove).
        * Can delete the workspace.
        * Can create new chats within the workspace.
        * Can send messages and mention users/agents in chats.
    * **Members:**
        * Can **only view** chat messages and pages.
        * **Cannot perform any actions** (including sending messages, editing, adding content, etc.).
        * Can **leave** the workspace.

* **`Owner Only` Workspace:**
    * **Owner:**
        * Can edit workspace name and system prompt.
        * Can manage documents (add/remove/change status).
        * Can manage collections (add/remove).
        * Can manage members (add/remove).
        * Can delete the workspace.
        * Can create new chats within the workspace.
    * **Members:**
        * Can send messages and mention users/agents in chats within the workspace.
        * Can **leave** the workspace.
        * *Note:* While members can interact within chats, they cannot manage the workspace structure itself (e.g., add collections, documents, or members to the *workspace*). Compare this with permissions inside a chat within a *Non-Shared* Workspace where members have more autonomy *within that specific chat*.

* **`Shared` Workspace:**
    * **All Members (including the original creator):**
        * Have **equal permissions**.
        * Can edit workspace name and system prompt.
        * Can manage documents (add/remove/change status).
        * Can manage collections (add/remove).
        * Can manage members (add/remove **any other member**).
        * Can delete the workspace.
        * Can create new chats within the workspace.
        * Can send messages and mention users/agents in chats.
        * Can leave the workspace.

---

## Related Documentation

* [Group Management](/admin/Group-Management/): Understanding organizational groups.
* [User Interface Guide](User-Interface.md): Navigating workspaces, chats, and member lists.
* [Best Practices for Group Management](/admin/Best-Practices-for-Group-Management/): Tips for working across multiple organizational groups.
* [AI Assistant Tools](/admin/AI-Assistant-Tools/): Details on tools used within chats like Memos, Goals, and Subchats.
* [Quick Start](Quick-Start.md): Information on inviting team members.
