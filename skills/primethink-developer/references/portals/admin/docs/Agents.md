# Agents

AI agents are intelligent virtual assistants within the PrimeThink platform that enhance productivity and streamline workflows. These specialized digital entities can perform a wide range of tasks, from answering questions and retrieving information to executing complex workflows and integrating with external systems.

PrimeThink's agent architecture allows for seamless collaboration between human users and AI assistants, creating a powerful ecosystem where routine tasks can be delegated while maintaining human oversight on critical decisions. Whether you're looking to automate customer support, enhance team collaboration, or create specialized assistants for specific domains, PrimeThink's agent capabilities provide the foundation for intelligent automation.

This section explores how to effectively work with AI agents in PrimeThink, including their configuration, capabilities, and best practices for integration into your workflows.

Topics:
- Available AI agents and their capabilities
- Adding AI agents to channels
- Agent permissions and access levels
- Agent commands and syntax
- Best practices for agent interaction

## Member-Agent Delegation

When several AI assistants are members of the same chat, the active assistant can use the other assistants as specialist subagents. It delegates a matching unit of work privately, waits for the result, and incorporates that result into its own response.

Each member subagent uses its own:

- Name, description, and reply style as its working persona
- Configured model and the model credentials available to the current user or group
- Capabilities and tools, including supported MCP and web-search tools
- Attached documents and active, non-skill collections
- Shared chat goal, documents, and collections

A member whose model or required configuration is unavailable is skipped without failing the active assistant's entire turn.

### Private Delegation vs Visible Conversation

Member delegation is private and synchronous. The member's intermediate work and response are returned to the active assistant rather than posted as a separate chat message. Use this for specialist research, analysis, or tool use that should contribute to one combined answer.

Use a visible `@` mention instead when the member assistant should participate publicly in the conversation and answer as itself.

### Member Knowledge Filesystem

The agent runtime exposes other member assistants under the read-only path:

```text
/chat/members/<agent-id>__<agent-name>/
├── INDEX.md
├── documents/
└── collections/
```

`INDEX.md` identifies the member and lists its available knowledge. The `documents/` and `collections/` folders mirror documents and active non-skill collections attached to that member. Skill collections are not copied into this area.

The `/chat/members/` tree is agent-visible runtime context, not an editable chat-document folder. Writes and edits are rejected. To change a member's knowledge, update the documents or collections attached to that assistant in PrimeThink.

!!! warning "Treat member knowledge as shared with the chat's assistants"
    Adding an AI assistant to a chat makes its mounted documents and active collections available to the other assistants for delegated work. Attach only knowledge that is appropriate for that chat and its participants.

### Configuration Recommendations

- Give each member a distinct, specific description so the active assistant can choose the right specialist.
- Assign only the capabilities and knowledge the member needs for its role.
- Use complementary specialists rather than several assistants with overlapping descriptions.
- Keep sensitive or unrelated material out of an assistant's attached knowledge before adding it to a shared chat.
- Use `@` mentions when users need to see which assistant produced an answer; use automatic delegation for a single coordinated response.
