# Creating Live Apps

## Introduction

PrimeThink is a powerful platform for building dynamic applications that adapt to user journeys and preferences. These applications combine dynamic rendering with AI-powered natural language interactions, allowing both form-based and conversational inputs. The platform enables developers to create highly customizable user experiences that evolve based on user interactions and data.

The terms **Live App** and **Live Page** refer to the same feature and are used interchangeably across this documentation — an interactive HTML application rendered inside a chat, with "Live App" being the more recent name.

## Core Concepts

### Live Apps Overview

A dynamic app in PrimeThink consists of multiple interconnected components that work together to create a responsive, user-centered experience. The application adapts its interface and functionality based on user interactions, stored data, and predefined rules.

### Task Types

The platform supports several specialized types of tasks:

1. **Page Tasks**
   These tasks generate dynamic pages based on specific rules governing:
    - Content rendering
    - Update timing
    - Data sources
    - Display conditions

2. **Chat Tasks**
    - **Extraction Tasks**: Designed to gather information from users through natural language conversations. These can follow flexible or strict guidelines depending on the data collection requirements.
    - **RAG Tasks** (Retrieval Augmented Generation): Function as intelligent support systems or FAQs by leveraging provided documents and collections to answer user queries.
    - **Public Support Tasks**: Shareable tasks that can be embedded in external websites for:
        - Lead generation
        - Guest user support
        - Anonymous session management with future authentication capabilities

### Navigation Structure

The application presents tasks through a sectioned navigation menu, where:
- Each section represents a distinct task or dynamic page
- Sections can be organized hierarchically
- Tasks are presented with clear goals and optional scheduling
- Initial prompts guide users when accessing each section

## Building Live Apps

### Orchestration Patterns

#### Level-Based Progression
1. **Initial Onboarding (Level 0)**
    - User registration triggers the onboarding task
    - Creates specific tasks based on initial user data
    - Sets up the foundation for user progression

2. **Level Progression**
    - Tasks monitor user achievements and progress
    - Completion triggers level advancement
    - New levels initialize with fresh onboarding tasks
    - Creates new appropriate tasks and pages for the level

#### Independent Task Chains
Tasks can operate independently, managing their own progression:
- Tasks determine their follow-up actions
- Can create subsequent tasks upon completion
- Self-archive when finished
- Trigger new related tasks as needed

### Page Implementation

Pages can be created through two primary methods:

1. **Descriptive Approach**
    - Define page requirements through natural language
    - Can be generic or highly specific
    - System generates appropriate rendering

2. **Template-Based Approach**
    - Upload custom HTML/CSS templates
    - Define data mapping rules
    - System populates templates with dynamic data

### Data Sources

The platform can integrate data from multiple sources:
- External APIs
- User profile information
- User metadata
- Event data
- Tool-accessible knowledge bases

## Development Approach

### Planning Phase
1. Map out the application flow on paper:
    - Define initial onboarding process
    - Identify required tasks
    - Plan data collection points
    - Determine success criteria
    - Design progression triggers

### Implementation Phase
1. Configure task orchestration
2. Set up data extraction patterns
3. Define evaluation criteria
4. Establish data storage rules
5. Create progression triggers

### Orchestration Strategy

Choose between:
- Centralized orchestration with a main task
- Distributed orchestration across multiple tasks
- Task-level self-orchestration

The choice depends on:
- Application complexity
- User journey requirements
- Data management needs
- Scalability requirements

## Best Practices

1. Clearly define user progression paths
2. Design flexible data extraction patterns
3. Plan for scalable orchestration
4. Implement appropriate page rendering strategies
5. Consider user experience in both form and conversation interactions
6. Design clear success criteria for task completion
7. Plan data storage and retrieval patterns
8. Create meaningful user feedback loops
