# PrimeThink Reference Documentation

## What is PrimeThink?

PrimeThink is an AI-powered platform that combines team chat collaboration with intelligent AI assistants — think of it as an operating system whose primary interface is natural language, powered by Large Language Models. Users, teammates, and AI assistants work together in shared chats to accomplish tasks, manage projects, and process information.

The platform runs on web (app.primethink.ai) and mobile (iOS 12+/iPadOS 12+, Android 8+). Its defining capability is creating specialized AI assistants ("mini-brains") that can be trained for specific purposes, restricted to specific tools and data, and composed together — while maintaining privacy and isolation between users and groups. Deployment options range from the fully integrated platform to API-only implementations.

## Core Concepts

- **Chats** — the primary workspace; every chat has a default AI assistant that responds to messages. Multiple humans and AI agents can share one chat (@mentions supported).
- **Workspaces** — group related chats, share documents and members across them, and set workspace-level preferences and instructions.
- **Documents & Collections** — upload files (PDF, Word, etc.), paste URLs to capture web content, or record audio that gets transcribed; group documents into reusable, shareable Collections the AI can search semantically.
- **Tasks** — goal-oriented, adaptable AI workflows (not rigid scripts). Import from the Task Library or build custom ones; schedule them to run automatically.
- **Agents** — customizable virtual assistants with configurable capabilities, personality, tone, and scoped access to tools and information.
- **Memory** — a two-tier semantic memory system: general knowledge that applies broadly, plus personal information specific to each user, retrieved via semantic search.
- **Groups** — isolated organizations/tenants; users log in with group name, username, and password. Each group's data is kept separate and secure.
- **Live Apps & Live Pages** — dynamically generated interactive user interfaces, described in natural language and rendered as real web apps with data sync and state management.

## Documentation Structure

### Getting Started
Installation and access (web + mobile requirements), logging in, and UI orientation: top navigation bar, group switcher (left icon bar), sidebar (chats/tasks), main chat window, and right context panel.
→ `getting-started/summary.md`

### Core Features
Documents and document handling, collections, workspaces, groups, multi-user collaboration, and settings.
→ `core-features/summary.md`

### AI & Automation
Tasks and the Task Library, agents and their configuration, LLM selection, capabilities, tools, the memory system, and scheduled/automated jobs.
→ `ai-automation/summary.md`

### Advanced Topics — Live Apps & Live Pages
Interactive web applications with real-time data sync, state management, and PrimeThink integration (primethink.js, the `pt` API).
→ `advanced-topics/live-apps/index.md` (index with links to full docs)
→ `advanced-topics/live-apps/docs/` (complete documentation files)

### Developer Guide
APIs, integrations, CLI tooling, and authentication.
→ `developer-guide/summary.md`

### Visual Design for Live Apps
Typography scale, spacing rhythm, color restraint, the Flowbite-vs-plain-Tailwind component vocabulary, and the anti-slop patterns to avoid when styling operational apps; hand-maintained, adapted from Anthropic's public frontend-design skill.
→ `design.md`

### Platform Known Issues & Constraints
Known library and runtime incompatibilities (flowbite-react `Modal` under React 19, flat exports, the iframe theme bridge, `response.message`) plus the platform constraints a spec must design around; hand-maintained and shared with App Studio's gap analysis.
→ `platform-known-issues.md`

### Resources
Use cases, troubleshooting, and support channels.
→ `resources/summary.md`

## Typical Use Cases

- **Document analysis** — upload documents, extract information, summarize, and answer questions against them.
- **Professional task support** — record and transcribe meetings, track action items, and generate summaries and progress reports.
- **Automated workflows** — recurring tasks for data collection, reporting, or customer support routing with context and follow-up.
- **Knowledge management** — searchable team collections of reference material.
- **Content creation & research** — drafting, editing, citation tracking, and literature review support.
- **Customer service** — AI-first inquiry handling with escalation to human agents.
- **Education & interactive experiences** — personalized learning, quizzes, multiplayer games with scoring and leaderboards.
- **System integration** — natural-language control of connected systems and automation platforms.

## How to Use This Reference

Start with the section summary that matches the question (each `summary.md` is a condensed overview of that area), then drill into the linked full documentation for details. For Live Apps development specifically, always consult `advanced-topics/live-apps/docs/` — it contains the complete, authoritative API documentation.

---
*Run `python build_skill_references.py --review` to regenerate summaries from source docs.*
