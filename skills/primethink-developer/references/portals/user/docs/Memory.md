# Memory

It's important to understand that the memory system detailed here primarily enhances **standard chats** between you and AI assistants. To maintain privacy and appropriate context, these memory features are typically not active within **multi-user group chats** that include several human participants.

PrimeThink features a sophisticated memory system, similar to human memory, allowing the platform and its AI assistants to recall important information from past interactions and apply it effectively in future conversations during your standard chats. This ensures continuity, personalisation, and adherence to specific guidelines within those one-on-one or AI-only interactions.

The memory system organises information into different types, each serving a distinct purpose and having a specific priority level when accessed by the AI. When you interact with an assistant in a standard chat, the system loads the most important memories into the AI's context automatically and provides the agent with tools to search, add, update, and delete memories as needed.

## Understanding Memory Types

We can think about agent memory in terms of its duration and purpose:

### Working Memory (Temporary - During a response)

*   **Purpose:** This is akin to having a piece of scratch paper when working through a problem or completing multiple tasks simultaneously during a single response. It stores temporary, incremental states or outputs generated during a single task or a sequence of chained tasks within an agent's workflow.
*   **How it Works:** It holds intermediate results needed to compute the next step or the final outcome of an instruction. Once the response is sent, this memory is typically discarded.

### Short-Term Memory (Session-Specific - During a Conversation)

*   **Purpose:** This refers to the context of an existing session or conversation the agent(s) are currently part of. It holds information that is relevant *to that specific conversation*.
*   **How it Works:** The system needs to recall this context very rapidly to maintain conversational flow and provide relevant, accurate responses within the ongoing interaction. It allows the agent to remember previous prompts and its own answers within the current chat.
*   **Implementation:** It uses a mix of chat summary, chat history, and Retrieval Augmented Generation (RAG) to find relevant messages (older than the history) in the same chat.

### Long-Term Memory (Persistent - Across Sessions)

*   **Purpose:** This holds information that should be remembered for future interactions, even after the current session has concluded. It stores distilled knowledge, key attributes, and summaries from past experiences that inform the agent's behaviour over time.
*   **How it Works:** When the user shares lasting information or gives a lasting instruction, the AI agent decides to save it as a memory using its built-in memory tools. The agent calls `add_memory` directly — there is no separate background extraction process. Relevant memories are then loaded into the agent's context at the start of each new conversation to provide essential context or guidance.
*   **Implementation:** This is a dedicated system. It can be used to store various types of persistent information:

#### Shared Memory Types

These memory types are shared across all agents the user interacts with:

*   **Constitutional Memories (Highest Priority - MUST be enforced):** Behaviour rules the user has set for every conversation. These are fundamental rules, guidelines, and core preferences that shape the AI's fundamental behaviour and responses (unbreakable laws or directives). Examples: Preferred language, specific response formats, core ethical guidelines, naming conventions the AI must use. Use when the user gives a lasting instruction like "from now on", "always", "never", "in future replies".
*   **User Personal Memories (High Priority - Should be enforced):** User-specific information like preferences, characteristics, history, relationships, likes/dislikes, habits, and other personal circumstances provided by the user. Used to personalise interactions and maintain conversational continuity regarding the user's life. Use when the user shares lasting personal information about themselves using phrases like "I like", "I prefer", "I am", "I have", "My family".
*   **AI Personal Memories (Medium Priority - Should be referenced for consistency):** Define the AI's persona or background characteristics *as instructed by the user* (distinct from constitutional rules governing behaviour). Examples: A user-defined name, age, origin story, or personality traits for the AI assistant. Helps the AI maintain a consistent identity. Use when the user defines a trait with phrases like "you should be", "I want you to be", "your personality is".
*   **Other Important Memories (General Information - Can be referenced):** Stores explicitly saved pieces of information that don't fall into the above categories. This includes facts the user specifically asked the AI to remember, generic information to retain, or details about people other than the primary user. Used for factual recall without interpretation. Use for general information the user asks to remember via phrases like "remember this", "save this", "don't forget".

#### Agent-Scoped Memory Types

These memory types belong to a specific agent and are not shared with other agents:

*   **Agent Constitution Memories:** Behaviour rules that apply only to a specific agent (not to other agents the user talks to). Example: "when you are this agent, always answer in bullet points". These are stored against the agent's ID and never shared with other agents. This allows users to customise individual agent behaviour without affecting other assistants.

#### Workspace Memory Types (Shared Across a Team)

The memory types above are personal to you — even agent-scoped memories belong to a single user. **Workspace memory** is different: it is **shared across every member** of a [shared workspace](Collaboration.md#shared-workspaces), so that a whole team builds up one common project brain instead of each person teaching their assistant the same facts in isolation.

Workspace memory is **agent-agnostic** — it is shared regardless of which agent a member happens to be using inside the workspace. It is keyed to the workspace itself rather than to any one user.

There are two workspace memory types:

*   **Workspace Constitution Memories:** Behaviour rules that every member's assistant must follow while working inside the workspace. Example: "In this workspace, always reply in formal English and cite the source document." These are always loaded into the assistant's context for any chat that belongs to the workspace.
*   **Workspace Memories (Shared Knowledge):** Shared project facts and context — for example "Our staging environment is at staging.example.com" or "The client prefers monthly invoices." These are recalled by semantic search when relevant to the current conversation, just like personal *Other Important Memories*.

!!! warning "Keep personal facts personal"
    Because workspace memory is visible to **all** members of the workspace, the assistant is instructed never to place personal user information (your preferences, your habits, anything about your private life) into a workspace type. Personal facts always stay in your private, global *User Personal Memories*. Only shared, project-level knowledge belongs in workspace memory.

For how access is controlled and how this scope works behind the scenes, see [Workspace Memory Architecture](/developer/Workspace-Memory-Architecture/).

## How Memory Works

### Memory Loading

When a conversation starts, the system automatically loads the most important memories into the agent's context without any LLM call or vector search — it reads directly from the database:

*   **Constitutional Memories** are loaded in full because they govern behaviour.
*   **Agent Constitution Memories** (when applicable) are loaded in full for the specific agent.
*   **AI Personal Memories** are loaded in full to maintain consistent identity.
*   **User Personal Memories** — the most important entries are included so the agent has baseline context.
*   **Workspace Constitution Memories** (when the chat belongs to a [shared workspace](Collaboration.md#shared-workspaces)) are loaded in full so the assistant follows the team's rules for that workspace.

The agent can then use the `search_memory` tool during conversation to look up older or less-common details that weren't included in the initial load. When the chat is inside a workspace, `search_memory` also recalls relevant **Workspace Memories**, merging shared knowledge with your personal results.

### Agent Memory Tools

The AI agent manages memories directly through four built-in tools:

*   **`add_memory`** — Saves a new memory. The agent decides the appropriate memory type and priority based on what the user said. Memories are written as short, self-contained statements. Priority ranges from 1 (most important) to 10 (least important), defaulting to 5.
*   **`search_memory`** — Performs a semantic vector search across saved memories. Use this when the agent suspects the user already shared relevant information that isn't in the always-loaded memories. Returns memory ID, type, priority, timestamp, and text for each result.
*   **`update_memory`** — Replaces the text or priority of an existing memory. Use this when a previously saved fact is now outdated — for example, the user moved city or changed a preference. The memory is automatically re-embedded after updating.
*   **`delete_memory`** — Removes a memory. Use this when the user explicitly asks the agent to forget something, or when a memory is contradicted and cannot be merged.

### Memory Scoping

Memories follow specific scoping rules to ensure proper access control:

*   **Shared memories** (`constitution`, `ai_personal`, `user_personal`, `memory`): These have no agent association (`agent_id` is null) and are accessible to all agents the user interacts with.
*   **Agent-scoped memories** (`agent_constitution`): These are linked to a specific agent and are only visible to that agent. When retrieving memories, the system always includes shared memories plus the specific agent's own memories.
*   **Workspace-scoped memories** (`workspace_constitution`, `workspace_memory`): These belong to a workspace rather than to a single user, and are visible to **every member** of that workspace. They are kept separate from personal memory and are only used when a chat belongs to the workspace. See [Workspace Memory Architecture](/developer/Workspace-Memory-Architecture/) for the access rules.

## Memory Priority and Enforcement

The system follows specific steps to ensure memories are used correctly, particularly for stored long-term memories:

1.  **Check:** Before forming a response, relevant constitutional memories are checked.
2.  **Validate:** The potential response is validated against these constitutional rules.
3.  **Allow:** The response is only sent if it satisfies all applicable constitutional rules.

**Conflicts:** When memories conflict with the current message, the current message takes precedence. The agent should call `update_memory` or `delete_memory` to keep the memory store correct. Among stored memories, those with higher priority (lower number) and more recent timestamps are given precedence.

Beyond these types, systems with multiple agents also require memory management. Agents need to communicate with one another using mechanisms such as a shared session (potentially utilising short-term memory concepts). However, individual agents might also maintain their own session-specific information depending on the nature of the tasks they are undertaking. One might also opt to employ certain data privacy protocols to confine specific data within a particular assistant (e.g., keeping a credit card number within one agent) and then transmit only the de-identified information to subsequent tasks and assistants instead.

## Viewing and Managing Memories

You can view and manage stored long-term memories through the "Memory" section accessible from the top navigation bar (via the "View Memory" button or potentially within the main menu), typically for standard chats.

*   **Memory List:** The main screen displays a list of memories. Each entry typically shows:
    *   The core memory text.
    *   The date the memory was created or last updated.
    *   A tag indicating the memory type (e.g., "memory", "constitution", "agent_constitution", etc.).
    *   Action buttons (like edit or delete).
*   **Filtering by Agent:** You can filter memories by agent to see agent-scoped memories alongside shared ones.
*   **Search/Filtering:** You can search for specific memories (the system uses semantic search to find relevant entries even if your query uses different wording) and filter by type.
*   **Adding/Editing:** Memories can be added explicitly by asking the assistant to remember something specific ("Save as Memory" option on messages), or the agent will proactively save important information using its memory tools during conversation. You can also add, edit, or delete memories directly via the Memory management UI.
*   **Reindexing:** If memory search results seem inconsistent, you can trigger a reindex operation to rebuild the vector embeddings for all your memories.

By effectively utilising these different memory types and management tools, AI agents can provide a highly personalised, context-aware, and reliable experience.
