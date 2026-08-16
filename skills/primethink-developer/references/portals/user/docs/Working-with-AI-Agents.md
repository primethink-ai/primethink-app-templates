# Working with AI Agents

## Understanding AI Agent Types

PrimeThink organizes agents into distinct types, each with different visibility and access rules:

- **System Agents** — Built-in agents provided by PrimeThink. These are maintained by the platform and cannot be modified by users.
- **Catalog Agents** — Curated agents available in the shared catalog. Like system agents, these are read-only for all users.
- **Private Agents** — Agents you create for personal use. Only you (the creator) can view, edit, or delete them.
- **Group Agents** — Agents shared with your group. Group members with the appropriate permissions can manage them.
- **Task Agents** — Agents linked to a specific task. Access follows the task's ownership and type.

## Who Can Edit or Delete an Agent?

The table below summarizes who is allowed to edit or delete each type of agent:

| Agent Type         | Creator (Owner) | Task Owner | Group Admin | Other Users |
|--------------------|-----------------|------------|-------------|-------------|
| **System**         | No              | —          | No          | No          |
| **Catalog**        | No              | —          | No          | No          |
| **Private**        | Yes             | —          | No          | No          |
| **Task**           | Yes             | Yes        | Only for group tasks | No |
| **Group**          | Yes             | —          | With permission | No     |

> **Note:** Platform super administrators can edit or delete any agent regardless of type or ownership.

### Key Rules

- **You can always edit or delete agents you created**, except for system and catalog agents, which are platform-managed.
- **For task-linked agents**, if you own the task the agent is attached to, you can also modify the agent — regardless of the task type.
- **Group admins** can manage group agents and agents linked to group tasks, provided they have the required group permission (e.g., *Edit Group AI Agents* or *Edit Group Tasks*).
- **System and catalog agents** are managed exclusively by platform administrators and cannot be modified by regular users.
- If a task-linked agent has no associated task (or the task has been deleted), only the agent's creator or a super administrator can manage it.

> For a full list of agent-related permissions, see [Roles and Permissions](/admin/Roles-and-Permissions/).

## Agent Configuration and Customization

Each agent in PrimeThink can be configured to suit your specific needs:

- **System Prompt** — Define the agent's personality, instructions, and behavior guidelines.
- **LLM Selection** — Choose which Large Language Model powers the agent (e.g., Gemini, Claude, GPT, Mistral, DeepSeek). See [Supported LLMs](Supported-LLMs.md) for available options.
- **Capabilities** — Assign tools and capabilities that determine what actions the agent can perform. See [Capabilities](/admin/Capabilities/) for details.
- **Memory** — Configure how the agent retains context across conversations. See [Memory](Memory.md) for more details.

## Agent Specializations

Agents can be tailored for specific domains by combining the right system prompt, LLM, and capabilities:

- **Data Analysis** — Configure agents with data processing capabilities to analyze spreadsheets, generate charts, and extract insights.
- **Content Creation** — Set up agents with writing-focused instructions for drafting documents, emails, and reports.
- **Research** — Equip agents with web search and information retrieval tools to gather and synthesize information.
- **Technical Support** — Build agents with coding capabilities and domain-specific knowledge for troubleshooting and development tasks.
- **Project Management** — Create agents that can interact with tasks, schedules, and team coordination tools.

## Context Awareness

Agents in PrimeThink are context-aware, meaning they can:

- Understand the current task or conversation they are operating within
- Access relevant information from linked documents and data sources
- Adapt their responses based on the user's role and permissions
- Maintain continuity across multiple interactions within a session

For persistent context across sessions, see [Memory](Memory.md).
