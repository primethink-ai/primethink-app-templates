# Creating Tasks

## Overview

Tasks are the building blocks of automation in PrimeThink. They are customisable workflows that combine an AI assistant's intelligence with specific instructions, tools, and knowledge to accomplish particular objectives. Think of a task as a specialised mini-application: it defines *what* the AI should do, *how* it should behave, and *what resources* it has access to.

When a user starts a task, PrimeThink creates a new chat pre-configured with everything the AI needs — its instructions (the Goal), its opening message (the Initial Prompt), its enabled features (Capabilities), and any attached knowledge (Collections). This means users get a consistent, purpose-built experience every time they launch the task.

## Task Components

Every task is made up of several components that work together:

| Component | Purpose | Required |
|-----------|---------|----------|
| **Name** | Identifies the task (shown in task lists and menus) | Yes |
| **Description** | Brief overview of what the task does | Yes |
| **Goal** | The full set of instructions that guide the AI's behaviour — this is the "brain" of the task | Yes |
| **Initial Prompt** | The first message the user sees when starting the task — sets expectations and invites interaction | Yes |
| **Default Agent** | The primary AI assistant that responds to every message (unless another agent is specifically mentioned) | Yes |
| **Extra Agents** | Additional specialised AI assistants that can be invoked with @mention for specific tasks | No |
| **Capabilities** | Which PrimeThink features the AI can use (Memory, RAG, Web Search, etc.) | Yes |
| **Collections** | Document collections the AI can search for knowledge (used with RAG capability) | No |
| **Schedule** | Timing configuration for tasks that run automatically | No |
| **Action** | Configuration to make the task appear as a Document Action in the Actions menu | No |

### How Components Work Together

The relationship between these components is important to understand:

- The **Goal** is the AI's private instruction set — users never see it directly, but it shapes every response the AI gives. It defines behaviour rules, boundaries, tone, workflows, and decision logic.
- The **Initial Prompt** is the AI's public introduction — it's the first message in the chat that tells the user what the task can do and how to get started.
- The **Default Agent** is the primary AI assistant. It responds to every user message automatically (unless the user @mentions a different agent). The Goal primarily guides this agent's behaviour.
- **Extra Agents** are specialists that can be brought into the conversation via @mention. Each extra agent can have its own instructions and reply style, making them suited for specific sub-tasks within the same chat.
- **Capabilities** determine what tools the AI has available. For example, enabling RAG lets the AI search uploaded documents; enabling Memory lets it remember information across the conversation.
- **Collections** provide the knowledge base. If you enable the RAG capability, the AI will search these collections to find relevant information when answering questions.

Think of it this way: the Goal tells the AI *how to think*, the Initial Prompt tells the user *what to expect*, the Default Agent is the *lead assistant*, Extra Agents are *specialists on call*, the Capabilities give the AI *what tools to use*, and the Collections give it *what knowledge to draw from*.

## Understanding the Goal

The Goal is the most important component of any task. It's where you define everything about how the AI assistant should behave. A well-written goal transforms a general-purpose AI into a focused, reliable specialist.

### What a Goal Can Define

Goals can range from a few sentences to detailed multi-section documents depending on complexity. Here's what you can include:

- **Task objective** — What the AI is trying to accomplish
- **Communication style** — Tone, language, formality level
- **Workflow steps** — How to handle requests systematically
- **Decision logic** — When to answer directly, when to redirect, when to escalate
- **Tool usage rules** — Which tools to use and when
- **Response formatting** — How to structure outputs
- **Security rules** — What the AI should never do or reveal
- **Scope boundaries** — What topics the AI will and won't engage with
- **Error handling** — What to do when information is missing or requests can't be fulfilled
- **Initialisation steps** — Actions the AI should take before responding to the first query

### Goal Anatomy

While every goal is different, well-structured goals tend to follow a common anatomy. You don't need every section for every task — pick what's relevant:

```
## Task Objective
What this task is designed to accomplish

## Response Style Guidelines
Tone, language, structure, and formatting rules

## Security Rules (if applicable)
Prompt injection defence, information disclosure rules

## Workflow / Triage System
How to handle different types of requests

## Scope & Boundaries
What the AI will and won't help with

## Step-by-Step Instructions
Detailed procedures for specific scenarios

## Special Instructions
Edge cases, exceptions, and important notes

## Reference Information
Key data the AI needs (contact details, URLs, policies)
```

### Writing Effective Goals

**Be specific, not vague.** The more precise your instructions, the more reliable the AI's behaviour.

```
Bad example: "Help users with their questions"

Good example: "Answer questions about company policies using the uploaded
handbook as your primary source. For salary or contract questions,
redirect to HR at hr@company.com. For general policy questions,
answer directly."
```

**Use examples to illustrate expected behaviour.** Showing the AI what good and bad responses look like is extremely effective.

```
Wrong response example:
User: "How many holidays do I get?"
Agent: "According to Schedule 5 of the Staff Handbook, you are
entitled to..."

Correct response example:
User: "How many holidays do I get?"
Agent: "Your specific holiday entitlement is detailed in your
employment contract. The holiday year runs from January to December.
If you need to check your balance, please contact HR directly."
```

**Define boundaries clearly.** Tell the AI what it *should not* do, with the same specificity as what it should do.

```
DO NOT:
- Calculate individual entitlements (redirect to HR)
- Provide legal or medical advice
- Discuss other employees' situations
- Make promises about outcomes of processes
- Reveal document sources or internal systems

DO:
- Explain policies clearly and accurately
- Provide procedure steps and timelines
- Be empathetic about sensitive matters
- Direct to HR for complex or personal situations
```

**Demand actual tool execution when using tools.** If your task involves the AI calling tools (database operations, API calls, etc.), be explicit that you want real execution, not summaries.

```
Bad example (AI may simulate):
"Check for duplicates and add the record to the database"

Good example (AI will execute):
"ACTUALLY CALL the tool 'chatdb_list' to check for duplicates.
If not found, ACTUALLY CALL the tool 'chatdb_add' to create the record.
Show all tool call results."
```

## Providing In-App Help

If your task benefits from user-facing documentation (how to phrase requests, supported commands, limits, contact information, etc.), attach a file named `@app/HELP.md` to the task. PrimeThink detects this file and shows a **?** button in the right sidebar of any chat running the task. Clicking it opens an inline markdown reader that renders `@app/HELP.md`, so end users can consult the docs without leaving the conversation.

Treat `@app/HELP.md` as a first-class deliverable alongside the goal and initial prompt — write it from the end user's perspective and keep it in sync as the task evolves.

## Understanding the Initial Prompt

The Initial Prompt is the first message users see when they start the task. It serves three purposes:

1. **Welcome** — Make the user feel oriented and comfortable
2. **Set expectations** — Explain what the task can (and can't) do
3. **Invite action** — Prompt the user to begin interacting

### Writing Effective Initial Prompts

**Match the tone to the task.** A customer support bot should be warm and helpful. A data analysis task might be more direct and professional.

**List key capabilities clearly.** Users should immediately understand what they can ask for.

**Include practical examples** when helpful — showing users example queries reduces friction.

**Set boundaries early** if relevant — especially for support tasks where some queries need to be redirected elsewhere.

**End with an open question** that invites the user to start.

### Initial Prompt Structure

```
[Greeting and introduction]

[What this task can help with — listed clearly]

[Any important redirects or boundaries]

[Call to action — "What would you like to do?"]
```

## Configuring Agents in Tasks

Every task has a **Default Agent** — the primary AI assistant that handles the conversation. But tasks can also include **Extra Agents** — additional specialists that can be called upon for specific work within the same chat.

### Default Agent vs Extra Agents

| | Default Agent | Extra Agents |
|--|--------------|--------------|
| **How it's invoked** | Responds automatically to every user message | Must be invoked with `@agent_name` in the message |
| **Quantity** | Exactly one per task | Zero or more |
| **Configuration** | Has its own instructions (the Goal shapes its behaviour) | Each has its own instructions and reply instructions |
| **Role** | Leads the conversation, orchestrates the workflow | Handles specialised sub-tasks when called upon |

### How It Works

When a user sends a message in a task chat:
- If the message has **no @mention**, the **Default Agent** responds, guided by the task's Goal.
- If the message includes **@agent_name**, that specific **Extra Agent** responds instead, using its own instructions and reply style.
- The Default Agent can also **instruct the user to @mention a specialist** or, depending on the setup, orchestrate the flow by directing work to the appropriate agent.

### Agent Instructions and Reply Instructions

Each agent (default and extra) can be configured with:

- **Instructions** — Define the agent's expertise, personality, and behaviour rules. These shape *how the agent thinks and responds*. For the Default Agent, the task's Goal serves as its primary instructions.
- **Reply Instructions** — Define *how the agent formats and styles its responses*. This controls tone, structure, length, and formatting separately from the core logic. For example, an agent might have detailed analytical instructions but reply instructions that say "always respond in bullet points with a summary at the top."

This separation is powerful because you can have agents with the same underlying knowledge but different communication styles, or agents that share the same reply format but have completely different expertise.

### When to Use Extra Agents

Not every task needs multiple agents. Use extra agents when:

- **Different parts of the workflow require different expertise** — e.g., a legal analysis agent and a plain-language summary agent in the same chat
- **Different response styles are needed** — e.g., a technical agent that gives detailed code examples and a non-technical agent that explains things simply
- **Separation of concerns improves reliability** — each agent stays focused on what it does best rather than one agent trying to be everything
- **The user needs to choose their interaction style** — e.g., a beginner-friendly agent and an expert-mode agent in the same task

Don't use extra agents when a single well-written Goal can handle everything. Adding agents adds complexity — only do it when the benefit is clear.

### Practical Examples

#### Example 1: Research and Writing Task

A task that helps users research a topic and produce a polished document.

**Default Agent: Research Coordinator**
- Instructions: "You are a research coordinator. Help users define their research question, suggest search strategies, and organise findings. When the user has gathered enough information and is ready to write, suggest they @mention the Writer agent. Maintain a memo tracking the key findings and sources."
- Reply Instructions: "Be conversational and structured. Use numbered lists for research options. Summarise findings clearly."

**Extra Agent: Writer**
- Instructions: "You are a professional writer. When mentioned, review the conversation history and memo for research findings, then help the user draft, structure, and refine their document. Focus on clarity, flow, and appropriate tone for the target audience."
- Reply Instructions: "When drafting, present the full text in clean markdown. When giving feedback, use inline suggestions with brief explanations."

**How it works in practice:**
```
User: I need to research the impact of remote work on team productivity
Research Coordinator: Great topic! Let me help you structure this.
   Here are three angles we could explore...
   [conversation continues, findings are saved to memo]

User: I think we have enough. Can you help me write this up?
Research Coordinator: You've got solid material! I'd suggest bringing
   in @Writer to draft this — they'll use everything we've gathered.

User: @Writer Can you draft a report based on our research?
Writer: Here's a first draft based on the findings in our memo...
```

#### Example 2: Customer Onboarding Task

A task that guides new customers through setup, with specialist support available.

**Default Agent: Onboarding Guide**
- Instructions: "You are a friendly onboarding guide. Walk new customers through account setup step by step. If they have technical integration questions, direct them to @TechSupport. If they have billing questions, direct them to @BillingHelp. Keep the main flow simple and encouraging."
- Reply Instructions: "Warm and supportive tone. Use short paragraphs. Number the steps clearly. Celebrate progress."

**Extra Agent: TechSupport**
- Instructions: "You are a technical integration specialist. Help users with API setup, webhook configuration, and troubleshooting. Be precise and include code examples where relevant. When the technical issue is resolved, suggest the user returns to the main onboarding flow."
- Reply Instructions: "Professional and precise. Use code blocks for technical content. Keep explanations concise."

**Extra Agent: BillingHelp**
- Instructions: "You are a billing specialist. Answer questions about pricing, plans, invoicing, and payment methods. For complex billing issues or disputes, direct users to the support team at billing@company.com."
- Reply Instructions: "Clear and reassuring. Use simple language. Always include relevant pricing details."

**How it works in practice:**
```
User: I just signed up, where do I start?
Onboarding Guide: Welcome! Let's get you set up in 4 simple steps.
   Step 1: Let's configure your profile...

User: Actually, how do I connect your API to my system?
Onboarding Guide: Great question! That's a technical setup step —
   @TechSupport can walk you through the integration details.

User: @TechSupport I need to set up the webhook for order notifications
TechSupport: Here's how to configure the webhook endpoint...
   [provides technical details with code examples]
   Once that's working, you can continue with the onboarding steps!

User: That's working now. What's next?
Onboarding Guide: Excellent progress! Step 2: Let's set up your
   team members...
```

#### Example 3: Content Production Task

A task for producing marketing content with quality control built in.

**Default Agent: Content Strategist**
- Instructions: "You are a content strategist and project coordinator. Help users plan content, define their audience and goals, and create briefs. When a brief is ready, suggest the user @mentions the Copywriter to draft. After drafts are complete, suggest @Editor for review. Track all content pieces in the memo."
- Reply Instructions: "Strategic and structured. Use headers for different content pieces. Be concise in planning, detailed in briefs."

**Extra Agent: Copywriter**
- Instructions: "You are a creative copywriter. When mentioned, review the brief in the conversation and draft engaging content that matches the specified tone, audience, and goals. Offer 2-3 variations when appropriate."
- Reply Instructions: "Creative and energetic. Present drafts with clear labels. Bold key phrases and headlines."

**Extra Agent: Editor**
- Instructions: "You are a meticulous editor. When mentioned, review the latest draft and provide feedback on clarity, grammar, tone consistency, and messaging effectiveness. Suggest specific improvements with tracked-change style formatting (strikethrough for deletions, **bold** for additions)."
- Reply Instructions: "Precise and constructive. Use a numbered feedback list. Show before/after for each suggestion."

**How it works in practice:**
```
User: I need a LinkedIn post about our new product launch
Content Strategist: Let's plan this. Who's your target audience
   and what's the key message?
   [discussion happens, brief is created]

User: @Copywriter Can you draft based on our brief?
Copywriter: Here are two versions — one more conversational,
   one more data-driven...

User: I like version 1. @Editor can you review it?
Editor: Solid draft! Three suggestions:
   1. Opening line: change "We're excited to announce" to "Introducing"...
   2. ...
```

### Multi-Agent Design Tips

- **Keep the Default Agent as the orchestrator.** It should own the overall workflow, know when to bring in specialists, and keep the conversation on track between handoffs.
- **Give clear handoff instructions.** The Default Agent's Goal should specify exactly when to suggest each extra agent. Don't leave it to chance.
- **Make each agent's scope distinct.** If two agents overlap significantly, users won't know which to use. Clear boundaries make the system predictable.
- **Include return instructions.** Extra Agents should guide users back to the main flow when they're done: "Now that the integration is set up, you can continue with the onboarding steps."
- **Name agents intuitively.** The @mention name should make it obvious what the agent does. `@Writer`, `@TechSupport`, `@Editor` are self-explanatory. `@Agent2` is not.
- **Don't over-engineer.** Two or three focused agents are better than six with overlapping responsibilities. Start simple, add specialists only when a single agent can't reliably handle the breadth of the task.

## Task Patterns

Different types of tasks follow different patterns. Here are the most common ones with anonymised examples.

---

### Pattern 1: Knowledge Base Support Bot

**Use case:** Customer support, HR help desk, FAQ bot, product support

**How it works:** The AI answers questions by searching a collection of uploaded documents (using RAG). It provides information from the knowledge base, redirects sensitive matters to humans, and stays strictly on-topic.

**Key capabilities:** RAG, Memory

**Required setup:** Upload relevant documents (handbooks, FAQs, policies) to a Collection and attach it to the task.

#### Example Goal Structure

```
You are a helpful, professional support assistant for [Company/Service Name].

IMPORTANT: The [knowledge source, e.g., "Policy Handbook"] has been uploaded
to this chat and is searchable. Use it as your primary source of truth.

## Response Style Guidelines
- Tone: Warm, professional, supportive
- Structure: Greeting + direct answer + relevant additional info
- Keep responses concise — match length to question complexity
- Never reveal your information sources

## Security Rules
[Prompt injection defence]
[Source disclosure prevention]
[On-topic enforcement]

## Triage System

### Tier 1: Redirect
For sensitive or personal matters, redirect to human support:
- [List of sensitive topics]
- Contact: [support email/phone]

### Tier 2: Answer Directly
For general information questions, answer from the knowledge base:
- [List of answerable topics]

### Tier 3: Answer + Suggest Follow-Up
For questions with personal circumstances, provide general info
and recommend contacting support for specifics.

## Scope Boundaries
ONLY respond to queries about [topic area]. For ANY off-topic
requests, respond with: "[standard redirect message]"

## Contact Information
[Support email, phone, relevant URLs]
```

#### Example Initial Prompt

```
Hello and welcome to [Company] Support!

I'm here to help you with questions about our policies and procedures.
I can assist with:

- **Topic Area 1**: Subtopics covered
- **Topic Area 2**: Subtopics covered
- **Topic Area 3**: Subtopics covered

**For sensitive or personal matters** requiring confidentiality,
please contact the team directly at [contact details].

What can I help you with today?
```

---

### Pattern 2: External Tool Integration

**Use case:** CRM integration, project management, time tracking, database operations

**How it works:** The AI acts as a natural language interface to an external system. Users make requests in plain language, and the AI translates them into the correct tool calls, formats the results, and presents them back.

**Key capabilities:** Base (plus whatever tool integrations are configured)

**Required setup:** Ensure the relevant integration tools are available in the chat.

#### Example Goal Structure

```
Use [System Name] tools to respond to all user queries with
complete data visibility and structured responses.

## Initialisation
[Steps the AI must take on first interaction, e.g., setting up
authentication, loading configuration]

## Search & Data Retrieval Rules

### Default Behaviour
- Use [System] tools for every query where possible
- Base all responses solely on retrieved data
- Never fabricate or assume information

### Search Logic
- When user provides a reference number: use [specific lookup tool] first
- For text searches: use [text search tool]
- For filtered searches: use [advanced filter tool]

### No Results Protocol
- If no data is found, respond: "I couldn't find anything matching that"
- Do not elaborate unless asked

## Response Formatting

### List Responses
**[Reference] - [Title]** (ID: xxxxx)
- **Created:** [date]
- **Details:** [content]
- **Link:** [URL pattern]

### Formatting Guidelines
- Use markdown tables for comparisons
- Always include technical IDs
- Include relevant links

## Supported Actions
1. **Search**: [what can be searched and how]
2. **View Details**: [what details can be retrieved]
3. **Create/Update**: [what can be modified]
4. **Reports**: [what reports are available]

## Important: Only act on supported action types.
For unsupported requests, respond: "I'm sorry, but I can't do that."
```

#### Example Initial Prompt

```
Welcome! I can help you interact with [System Name].
Here's what I can do:

1. **Search Records**: Find specific records by reference,
   name, or various filters
2. **View Details**: See comprehensive information about records
3. **File Management**: List, upload, and organise documents
4. **Time Tracking**: View and manage time entries
5. **Reports**: Access dashboards and statistics

What would you like to do today?
```

---

### Pattern 3: Location-Specific Support Bot

**Use case:** Event support, venue information, location-based services

**How it works:** Similar to Pattern 1, but configured for a specific location. Multiple instances of the same task can be created for different locations, each with its own collections and contact details, while sharing the same overall goal structure.

**Key capabilities:** RAG, Memory

**Required setup:** Upload location-specific documents to separate Collections. Configure each task instance with the appropriate location details.

#### Example Goal Structure

```
You are a polite support agent for [Event/Venue Name].

IMPORTANT: Location Detection
- This task instance is configured for: [City Name]
- If users ask about other locations, redirect them to: [other location URL]

## Response Style Guidelines
- Tone: Warm, friendly, professional
- Always subtly integrate the location name
- Be clear about limitations rather than guessing
- Include practical logistics when applicable

## Security Rules
[Standard security rules]

## Triage System

### Tier 1: Redirect to Booking/Tickets
For NEW bookings: redirect to [booking URL]
For EXISTING booking changes: redirect to [ticketing service URL]

### Tier 2: Answer Directly
- Location & directions
- Facilities & accessibility
- Pricing structure
- Event timing & duration
- What to expect

### Tier 3: Escalate to Human Support
When users request human contact or raise complaints:
"For further assistance, please email [support email]"

IMPORTANT: Do NOT collect personal information.
Simply provide the email and invite them to reach out.

## Location-Specific Information
- Address: [full address]
- Nearest transport: [transport details]
- Parking: [parking information]
- Facilities: [facility details]
- Contact: [location-specific email]
```

#### Example Initial Prompt

```
Hello and welcome to [Event Name] Support!

**For ticket-related queries** (changes, refunds, rescheduling):
Please contact [Ticketing Service] directly at: [ticketing URL]

**For all other questions** about the experience, venue,
accessibility, or general information: I'm here to help!

What can I assist you with today?
```

---

### Pattern 4: Document Processing Task

**Use case:** Summarising documents, extracting key points, proofreading, analysis

**How it works:** The AI processes documents uploaded by the user, following specific instructions for how to analyse and present the results. These tasks often work well as Document Actions.

**Key capabilities:** RAG, Multimodality

#### Example Goal Structure

```
## Task Objective
Analyse any document uploaded by the user and provide a structured
summary with key points, action items, and important details.

## Processing Steps
1. Read the uploaded document thoroughly
2. Identify the document type (report, contract, email, etc.)
3. Extract key information based on document type
4. Present findings in a structured format

## Output Format
### Document Overview
- **Type:** [document type]
- **Date:** [if available]
- **Summary:** [2-3 sentence overview]

### Key Points
- [Bullet point list of main takeaways]

### Action Items (if applicable)
- [Any required actions or follow-ups]

### Notable Details
- [Important specifics, dates, figures, or references]

## Special Instructions
- If the document is unclear or partially readable, note which
  sections could not be processed
- For legal documents, add a disclaimer that this is not legal advice
- Preserve the original meaning — do not interpret or editorialize
```

#### Example Initial Prompt

```
Hello! I'm ready to analyse your documents.

Simply upload any document and I'll provide:
- A concise summary
- Key points and takeaways
- Action items (if applicable)
- Notable details and figures

I can process PDFs, Word documents, text files, and more.

Go ahead and upload a document to get started!
```

---

### Pattern 5: Scheduled Automation Task

**Use case:** Regular reports, monitoring, recurring data collection, periodic updates

**How it works:** The AI runs on a schedule (daily, weekly, etc.) and performs predefined actions — searching the web, generating reports, checking systems, or collecting information.

**Key capabilities:** Web Search, Memory, Scheduled Tasks

#### Example Goal Structure

```
## Task Objective
Generate a weekly summary of industry news and developments
related to [topic area].

## Schedule
Every Monday at 9:00 AM

## Workflow
1. Search the web for recent news about [topics]
2. Filter for relevance and significance
3. Compile findings into a structured report
4. Save key insights to memory for trend tracking

## Report Format
### Weekly [Topic] Update — [Date]

**Top Stories:**
1. [Headline with brief summary and source]
2. [Headline with brief summary and source]
3. [Headline with brief summary and source]

**Trends to Watch:**
- [Emerging pattern or development]

**Key Takeaway:**
[One paragraph synthesis of the week's most important development]

## Quality Standards
- Include only verified, credible sources
- Provide balanced coverage
- Note any conflicting reports
- Flag items requiring immediate attention
```

---

### Pattern 6: Goal + Live Page Automation

**Use case:** Document processing pipelines, data entry automation, file categorisation, multi-channel inboxes

**How it works:** The Goal triggers automatically when specific conditions are met (file upload, keyword detected) and processes data into the chat database. A Live Page then displays and interacts with the stored data. This pattern enables powerful automation where files can arrive from chat, email, API, or chat mentions — and all get processed consistently.

**Key capabilities:** Goal, RAG

#### Example Goal Structure

```
## Goal Trigger
If a user uploads a PDF or DOCX file

## Goal Instructions
You are given a file uploaded as an attachment. Follow EXACTLY:

1) If the document has extracted text:
   - Analyse the content and extract key information
   - ACTUALLY CALL the tool 'chatdb_add' to create a database record:
     - entity_name: "document"
     - data: {
         "filename": "<actual filename>",
         "category": "<derived category>",
         "summary": "<brief summary, max 200 chars>",
         "document_id": <ID from message attachments>,
         "processing_status": "success"
       }

2) If the document has no text or processing fails:
   - ACTUALLY CALL the tool 'chatdb_add' to create a record with
     processing_status: "pending"

3) Respond with JSON:
   {
     "status": "<success|pending|error>",
     "filename": "<filename>",
     "category": "<category>"
   }

IMPORTANT: You must ACTUALLY EXECUTE chatdb_add.
Never fabricate IDs or simulate tool calls.
```

For detailed information about writing Goals for Live Pages, including database operations, anti-hallucination patterns, and testing procedures, see [Creating Live Pages](Creating-Live-Pages.md).

## Capabilities Reference

When creating a task, you can enable or disable specific capabilities that determine what tools and features the AI assistant can use. Here's what each capability does:

| Capability | What It Enables | When to Use |
|-----------|-----------------|-------------|
| **Base** | Core assistant functionality — conversation, reasoning, general knowledge | Always on. Required for all tasks. |
| **Memory** | Gives the AI tools to save, search, update, and delete persistent memories. The agent decides when to store lasting information (preferences, rules, facts) and can look up previously saved memories via semantic search. Supports both shared memories (across all agents) and agent-scoped memories (specific to one agent). | When the AI needs to personalise responses or maintain context over time. Useful for support tasks, ongoing projects, and any task where continuity matters. |
| **Multimodality** | Handles different types of input and output — images, files, voice transcriptions. | When users will upload images or when the AI needs to process different media types. |
| **Memo** | Gives the AI a free-form notepad to track information during the conversation. The AI can read and write to the memo, and it persists across messages. | When the AI needs to track state, record findings, or maintain a running summary. Useful for research tasks, data collection, and multi-step workflows. |
| **Goal** | Enables objective-tracking features. When combined with Live Pages, allows automatic triggering of AI instructions based on conditions (file uploads, keywords, etc.). | For automation workflows, especially with Live Pages. Also useful when you want the AI to track progress toward defined objectives. |
| **RAG** | Retrieval-Augmented Generation — lets the AI search uploaded documents and collections to find relevant information before responding. | Essential for any task that needs to answer questions from a knowledge base (support bots, FAQ assistants, document-based tasks). Requires documents or collections to be attached. |
| **Subchats** | Allows the AI to create focused sub-conversations for complex topics, keeping the main chat organised. | For project management tasks, complex workflows, or any scenario where discussions branch into subtopics. |
| **Web Search** | Lets the AI search the internet for current information. | For tasks that need up-to-date information (news monitoring, research, trend tracking). |
| **Scheduled Tasks** | Enables time-based automation — run tasks at specific intervals or times. | For recurring reports, monitoring tasks, periodic data collection, or any workflow that needs to run on a schedule. |

**Tip:** Only enable the capabilities your task actually needs. Fewer capabilities means a more focused, predictable AI assistant. For example, a simple FAQ bot only needs Base and RAG — adding Web Search might cause it to look online instead of using your carefully curated knowledge base.

## Creating a Task: Step by Step

### 1. Define Your Objective

Before creating anything, answer these questions:

- What specific problem does this task solve?
- Who will use it? (internal team, customers, public?)
- What information does the AI need access to?
- What should the AI *never* do?
- Where should complex or sensitive queries be redirected?

### 2. Choose Your Pattern

Based on your objective, identify which task pattern fits best (see Task Patterns above). Most tasks fall into one of the six patterns or a combination of them.

### 3. Write the Goal

Start with the objective, then add sections as needed. Begin simple — you can always add complexity later based on testing.

**Start with:**

```
## Task Objective
[What this task does in 2-3 sentences]

## Response Style
[Tone and formatting rules]

## What You Can Help With
[List of supported topics/actions]

## What You Cannot Help With
[Boundaries and redirects]
```

**Then add as needed:**

- Security rules (for public-facing tasks)
- Triage system (for support tasks)
- Tool usage rules (for integration tasks)
- Step-by-step procedures (for complex workflows)
- Reference information (contacts, URLs, key data)

### 4. Write the Initial Prompt

Keep it concise and action-oriented. The user should understand within seconds what the task can do and how to start. If the task uses extra agents, consider mentioning the available specialists so users know they can invoke them.

### 5. Select Agents

Choose a **Default Agent** that best matches the task's primary function. This is the agent that will respond to all messages unless another is specifically @mentioned.

Then consider whether the task benefits from **Extra Agents**:
- Does the workflow have distinct phases requiring different expertise? Add specialists for each phase.
- Do users need different response styles for different sub-tasks? Add agents with different reply instructions.
- Can a single well-written Goal handle everything? Keep it simple with just the Default Agent.

For each agent, configure its **Instructions** (what it knows and how it behaves) and **Reply Instructions** (how it formats and styles its responses). See [Configuring Agents in Tasks](#configuring-agents-in-tasks) for detailed guidance and examples.

### 6. Configure Capabilities

Enable only what you need:

- Customer support bot? — **Base + RAG + Memory**
- Tool integration? — **Base + Memo** (plus relevant tool access)
- Document processor? — **Base + RAG + Multimodality**
- Scheduled reporter? — **Base + Web Search + Memory + Scheduled Tasks**
- Automation with Live Page? — **Base + Goal + RAG**

### 7. Attach Collections (if using RAG)

Upload your documents to a Collection and attach it to the task. The AI will search these documents when answering questions.

### 8. Test Thoroughly

Test your task with realistic scenarios:

- Does it answer common questions correctly?
- Does it redirect appropriately for out-of-scope queries?
- Does it maintain the right tone?
- Does it handle edge cases (no results, ambiguous queries, sensitive topics)?
- If using tools, does it actually execute them (not just simulate)?
- If using triage, does each tier work correctly?
- If using extra agents, does the Default Agent hand off appropriately? Do extra agents return the user to the main flow?

Refine the Goal based on what you find. Task creation is iterative — expect to adjust the goal several times based on real-world testing.

## Best Practices

### For All Tasks

- **Be specific over being clever.** Clear, explicit instructions outperform elegant but ambiguous ones.
- **Use examples liberally.** Showing the AI "right" and "wrong" responses is one of the most effective techniques.
- **Define boundaries as clearly as capabilities.** What the AI *shouldn't* do is as important as what it should.
- **Test with adversarial inputs.** Try off-topic questions, prompt injections, and edge cases.
- **Iterate based on real usage.** The first version of your goal is a starting point, not the final product.

### For Support Bots

- **Never reveal your sources.** Train the AI to answer naturally without citing document names or internal systems.
- **Include a triage system.** Not everything should be answered by AI — define clear escalation paths.
- **Set a consistent redirect message.** When the AI can't help, it should guide users somewhere that can.
- **Handle "no results" gracefully.** Tell the AI what to say when it doesn't have the answer.

### For Integration Tasks

- **List supported actions explicitly.** Include a clear "I can't do that" response for unsupported requests.
- **Demand actual tool execution.** Use phrases like "ACTUALLY CALL" to prevent the AI from simulating tool usage.
- **Define response formatting.** Consistent output structure makes the task more reliable and professional.
- **Handle authentication errors.** Include instructions for what to do when tokens expire or connections fail.

### For Document Processing Tasks

- **Specify output format precisely.** Show the exact structure you want results in.
- **Handle edge cases.** What should happen with empty documents, unsupported formats, or partially readable files?
- **Consider making it a Document Action.** This lets users trigger the task directly from the document menu.

### For Scheduled Tasks

- **Define the report format upfront.** Scheduled tasks run without user interaction, so the output needs to be self-explanatory.
- **Use Memory for continuity.** Let the AI remember previous reports to track trends and changes.
- **Set realistic schedules.** Consider how often the information actually changes.

## Task Library

PrimeThink includes a library of pre-built tasks you can import and customise. See the [Task Library](Task-Library.md) for available tasks including document processors, analysis tools, and more.

You can also use the **Task Creator Assistant** to build custom tasks through a guided conversation — it will ask you questions about your requirements and generate the goal and initial prompt for you.

## Further Reading

- [Tasks](Tasks.md) — Basic task concepts and usage
- [Task Library](Task-Library.md) — Pre-built tasks to import
- [AI Assistant Tools](AI-Assistant-Tools.md) — Available tools for chat and task management
- [Memory](/Memory/) — How the memory system works
- [Collections](/Collections/) — Managing document collections for RAG
- [Creating Live Pages](Creating-Live-Pages.md) — Building interactive interfaces with Goals
- [Scheduled Tasks](Scheduled-Tasks.md) — Setting up automated task schedules
- [Document Actions](/Document-Actions/) — Turning tasks into document processing actions
