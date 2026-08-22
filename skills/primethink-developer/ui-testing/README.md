# Automated Live App UI Testing (plan-driven)

Deterministic, repeatable UI testing for a deployed Live App. **You** (the agent)
author a reviewable test plan against the running app, then a bundled runner
executes it with Playwright — **with no LLM in the execution loop**. The same plan
produces the same steps every run, so it is safe to re-run and to gate a publish on.

This replaces the old agentic `pt live-app test-ui` command (which spawned
`kiro-cli` to improvise a whole test session). The CLI no longer does UI testing;
it lives here.

## The split of responsibilities

| Step | Who | How |
|---|---|---|
| Capture the app's accessibility snapshot | You | Browser tools (Playwright MCP) or `run_plan.py`'s snapshot output |
| Author / update `tests/test_plan.yaml` | You (LLM work) | Write the YAML from the snapshot — semantic targets |
| Run the plan | `run_plan.py` (deterministic) | `python run_plan.py tests/test_plan.yaml` |
| Read structured results | You | `results/results.json` + `results/test_results.md` |
| Fix a failing selector, re-run | You (LLM work) | Edit the one step, using the attached snapshot; run again |

Only authoring and healing are LLM work. Execution is fixed code.

## Setup (once, in the dev environment)

```bash
pip install playwright pyyaml
playwright install chromium
```

The runner never ships with `pt` — it only runs here, while building an app.

## The workflow

1. **Deploy / open the app** in a chat so there is a live URL to test
   (`https://app.primethink.ai/chats/CHAT_ID`).
2. **Snapshot the DOM.** Author against what the app actually renders, not from
   memory. Either use your browser tools to dump the accessibility tree, or run a
   throwaway `navigate` + `snapshot` step and read the written snapshot file.
3. **Write `tests/test_plan.yaml`** (schema below). Prefer semantic targets
   (`role`+`name`, `text`, `label`); use `css`/`xpath` only when nothing semantic
   identifies the element.
4. **Run it:**
   ```bash
   python /path/to/skill/ui-testing/run_plan.py tests/test_plan.yaml
   ```
   Exit `0` = all passed, `1` = a step failed, `2` = the plan/env was wrong.
5. **Read results** in `tests/results/`: `results.json` (machine-readable, keyed by
   step id) and `test_results.md` (human-readable). A failed step writes a fresh
   accessibility snapshot next to the report.
6. **Heal:** for each failed step, open its snapshot, correct that one `target`
   in the YAML (this is usually a one-line change — e.g. `name: "Save"` →
   `name: "Submit"`), and re-run. Do **not** rewrite the whole plan.
7. **Commit `tests/test_plan.yaml`.** It is the durable, reviewable artifact and a
   plain-language record of the flows the app must support. Healed selectors show
   up as clean one-line diffs.

## Plan schema — `tests/test_plan.yaml`

```yaml
plan_version: 1
app_name: my-live-app
base_url: https://app.primethink.ai          # optional; --base-url overrides
chat_id: chat-123
# Optional viewport matrix. Without it, the runner keeps its original single-context behavior.
# Every scenario runs at every entry unless it declares `viewports: [mobile]`, etc.
viewports:
  - { name: desktop, width: 1280, height: 800 }
  - { name: tablet, width: 768, height: 1024 }
  - { name: mobile, width: 390, height: 844 }
# Optional auth override — see "Authentication" below. Omit to use the default.
# auth:
#   localStorage: { key: "token", value_from: "pt_token" }

scenarios:
  - id: add-item                              # stable id → used in results + healing
    title: User can add an item
    steps:
      - id: add-item.open
        action: navigate
        url: /chats/chat-123                  # relative → resolved against base_url

      - id: add-item.click-add
        action: click
        target: { role: button, name: "Add" }

      - id: add-item.fill-title
        action: fill
        target: { label: "Title" }
        value: "Test item"

      - id: add-item.submit
        action: click
        target: { role: button, name: "Save" }

      - id: add-item.assert-saved
        action: expect_text
        target: { role: status }              # aria-live region / toast
        contains: "Saved"
        timeout_ms: 5000
```

Every step needs a unique `id` — it is the unit of reporting **and** healing. A
scenario stops at its first failed step.

### Actions

| `action` | Fields | Playwright call |
|---|---|---|
| `navigate` | `url` | `page.goto` |
| `set_viewport` | `width`, `height` | resize the current page viewport |
| `click` | `target` | `locator.click` |
| `fill` | `target`, `value` | `locator.fill` |
| `select` | `target`, `value` | `locator.select_option` |
| `press` | optional `target`, `key` | locator press, or page keyboard when target is omitted |
| `hover` | `target` | `locator.hover` |
| `upload` | `target`, `files` | `locator.set_input_files` |
| `wait_for` | `target` | `locator.wait_for` |
| `scroll` | optional `target`, optional `x`/`y` | scroll the page or a specific scroll region |

### Assertions

| `action` | Fields | Meaning |
|---|---|---|
| `expect_visible` | `target` | element is visible |
| `expect_hidden` | `target` | element is hidden/absent |
| `expect_text` | `target`, `contains` \| `equals` | text content |
| `expect_value` | `target`, `value` | input value |
| `expect_count` | `target`, `count` | number of matches |
| `expect_attribute` | `target`, `attribute`, `value` | exact DOM attribute value |
| `expect_url` | `contains` \| `equals` | page URL |
| `expect_no_horizontal_overflow` | optional `target`, optional `tolerance_px` | document or region does not overflow horizontally |
| `expect_stuck_to_top` | `target`, optional `offset_px`/`tolerance_px` | element's bounding box remains at the expected top offset |
| `expect_in_viewport` | `target`, optional `fully`/`tolerance_px` | element is fully (default) or partly inside the viewport |

Every action/assertion accepts an optional `timeout_ms` (Playwright auto-waits up
to it; default 10000, override globally with `--timeout-ms`).

### Target model (resolved first-match, in this order)

| Key | Locator | Stability |
|---|---|---|
| `role` + `name` | `get_by_role(role, name=…)` | ★★★ best — survives markup changes |
| `text` | `get_by_text` | ★★★ |
| `label` | `get_by_label` (form fields) | ★★★ |
| `placeholder` | `get_by_placeholder` | ★★ |
| `testid` | `get_by_test_id` | ★★★ if the app sets `data-testid` |
| `css` / `xpath` | raw locator | ★ fallback only |

Optional per-target: `exact: true` (exact text match) and `nth: N` (pick the Nth
match). Prefer role/name/text/label — those are what you can read straight from an
accessibility snapshot and what rots slowest.

## Responsive and viewport-matrix plans

When `viewports` is omitted, the runner creates one default context and preserves legacy
step IDs. When it is present, the runner creates an isolated browser context at each size,
runs scenarios in matrix order, and qualifies result IDs with the viewport name (for
example `mobile::navigation.open`). Scenario-level `viewports` limits a scenario to named
entries from the matrix:

```yaml
viewports:
  - { name: desktop, width: 1280, height: 800 }
  - { name: mobile, width: 390, height: 844 }

scenarios:
  - id: mobile-navigation
    viewports: [mobile]
    steps:
      - { id: navigation.open-page, action: navigate, url: /chats/chat-123 }
      - { id: navigation.no-overflow, action: expect_no_horizontal_overflow }
      - { id: navigation.menu-visible, action: expect_visible, target: { testid: mobile-nav-trigger } }
      - { id: navigation.open, action: click, target: { testid: mobile-nav-trigger } }
      - { id: navigation.expanded, action: expect_attribute, target: { testid: mobile-nav-trigger }, attribute: aria-expanded, value: "true" }
      - { id: navigation.dialog, action: expect_visible, target: { role: dialog, name: "Navigation" } }
      - { id: navigation.escape, action: press, key: Escape }
      - { id: navigation.closed, action: expect_hidden, target: { role: dialog, name: "Navigation" } }

  - id: sticky-shell
    steps:
      - { id: sticky.open-page, action: navigate, url: /chats/chat-123 }
      - { id: sticky.scroll, action: scroll, target: { testid: main-content }, y: 800 }
      - { id: sticky.topbar, action: expect_stuck_to_top, target: { testid: app-topbar }, tolerance_px: 2 }
```

Matrix contexts isolate browser state, not ChatDB state. Mutation scenarios should use
unique fixture values, clean up their rows, or opt into only one viewport. Use
`set_viewport` when a single scenario specifically needs to verify a live resize rather
than repeat across the matrix; the configured matrix size is restored before the next
scenario.

The responsive shell contract and minimum assertions are in
`../references/developer-guide/responsive-live-apps.md`.

## Authentication

The runner starts a fresh browser, so it must establish a session. By default it
seeds the **pt API token** into the app's `localStorage` before the app's scripts
run (token resolved from `PRIMETHINK_TOKEN`, else the active profile in
`~/.primethink/config.json` — same as the CLI).

> ⚠️ **Verify the injection key against the web app.** The default seeds the token
> under `localStorage["token"]` / `["authToken"]`. If the real web app uses a
> different key (or a cookie), set it in the plan `auth:` header, or bypass token
> seeding with a saved session:
>
> ```bash
> # Capture a session once (headed), then reuse it headless:
> #   from playwright.sync_api import sync_playwright
> #   ... log in manually ... context.storage_state(path="ui-auth.json")
> python run_plan.py tests/test_plan.yaml --storage-state ui-auth.json
> ```

## Runner options

```
python run_plan.py PLAN.yaml
    --base-url URL         override the plan's base_url
    --output-dir DIR       results location (default: <plan dir>/results)
    --headed               visible browser (default: headless)
    --storage-state FILE   use a saved session instead of token seeding
    --timeout-ms N         default per-step timeout (default: 10000)
```
