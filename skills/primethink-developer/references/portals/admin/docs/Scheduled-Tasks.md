# Scheduled Tasks

Scheduled tasks let PrimeThink run AI work automatically on a recurring schedule — no user interaction required. Use them for regular reports, monitoring, periodic data collection, or any workflow that should happen at specific times.

There are three ways to schedule work in PrimeThink:

## 1. Scheduling a Task

Every [Task](Creating-Tasks.md) has an optional **Schedule** component — a timing configuration that makes the task run automatically. When the schedule fires, the AI executes the task's Goal without anyone typing a message.

Schedules are expressed naturally, for example:

- `Every Monday at 9:00 AM`
- `Daily at 6am`
- `Every Wednesday and Friday`

You can create a scheduled task from the task editor, or simply ask the AI:

```text
"Create a task named 'Weekly Status Report'
Description: Generate comprehensive project status report
Goal: Maintain clear project visibility
Schedule: Every Monday at 9am
Initial Prompt: Analyze previous week's progress, blockers, and next steps"
```

Enable the **Scheduled Tasks** capability on the task so it can run on its timer. See [Creating Tasks — Pattern 5: Scheduled Automation Task](Creating-Tasks.md#pattern-5-scheduled-automation-task) for a complete worked example (a weekly industry-news digest combining Web Search and Memory).

## 2. Scheduled Prompts (AI-Created)

Agents with the `scheduled_prompts` [internal capability](Internal-Capabilities.md#scheduled_prompts-scheduled-prompts) can create scheduled tasks themselves using the `add_scheduled_job` tool — a scheduled prompt that runs on a schedule inside the chat. This requires scheduled tasks to be enabled on the chat (the chat's `scheduled_jobs_enabled` flag).

This is useful when you want to set up recurring automation conversationally: ask the assistant to "check this feed every morning and summarise anything new", and it registers the scheduled task for you.

## 3. Manually, from the Chat Sidebar

You can also create and manage scheduled tasks directly in the chat's right sidebar: open the **Scheduled Tasks tab** and use **Add a Scheduled Task**. From the same tab you can edit, pause/resume, and delete existing scheduled tasks. See the [User Interface guide](/User-Interface/#scheduled-tasks-tab) for the tab's full description. (Creating scheduled tasks in a chat is governed by role permissions — see [Roles and Permissions](Roles-and-Permissions.md).)

## Best Practices

From [Creating Tasks](Creating-Tasks.md):

- **Define the report format upfront.** Scheduled runs happen without user interaction, so the output needs to be self-explanatory.
- **Use Memory for continuity.** Let the AI remember previous runs to track trends and changes over time.
- **Set realistic schedules.** Match the frequency to how often the underlying information actually changes.

## Related Topics

- [Creating Tasks](Creating-Tasks.md) — Task components, including the Schedule field, and automation patterns
- [Tasks](Tasks.md) — Basic task concepts
- [Internal Capabilities](Internal-Capabilities.md) — The `scheduled_prompts` capability and its tools
- [Memory](/Memory/) — Persisting context between scheduled runs
