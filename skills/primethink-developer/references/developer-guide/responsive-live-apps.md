# Focused and Responsive Live Apps

PrimeThink Live Apps run inside a host-controlled frame whose available width can be much smaller than the developer's monitor. A good Live App is organized around a focused, stateful job. It adapts information priority, controls, navigation, and scroll behavior to the frame and input method instead of compressing or vertically stacking a desktop dashboard.

Read this reference whenever the user asks for an **app**, dashboard, admin panel, or tool. Visual styling can vary; the workflow, responsive, accessibility, and host-theme contracts below do not.

## Choose the smallest viable app structure

State the app's dominant job and shortest successful path before choosing routes or chrome. Then use the smallest structure that supports the confirmed workflows:

- **One dominant workflow with related actions:** one focused workspace. A compact app bar plus one scrolling workspace is a complete app.
- **A few distinct workflows that share context:** tabs or a small route set.
- **Many peer destinations or broad administrative domains:** a persistent desktop navigation shell that becomes an accessible drawer when space is constrained.

Screen count is an outcome, not a target. One screen is valid. Empty, loading, error, create, edit, detail, filter, and confirmation states usually belong to the workspace that owns them; they are not automatically separate screens or routes. Multiple granular use cases can share one workspace.

Do not invent navigation, dashboards, summary pages, or destinations to make a result look app-like or expose behavior to tests. If there is no persistent primary navigation, there is no sidebar or mobile navigation drawer to preserve.

When implementation sources conflict, use this priority:

1. explicit user interaction requirements and confirmed behavior;
2. the primary workflow and required states;
3. the client's chosen visual hierarchy and layout direction;
4. generated mock file boundaries and screen decomposition.

Mock screens are evidence of layout and state, not an automatic routing contract. If an explicit interaction such as **inline**, **quick add**, **single list**, or **stay in context** conflicts with generated screen boundaries, preserve the interaction and consolidate the presentation.

## Choose the interaction surface deliberately

A feature can be implemented and testable without every form and state occupying the default workspace. Choose the least disruptive surface that fits the task.

### Inline create or edit

Use inline interaction when the user says **inline**, **quick add**, **add from the list**, or when an action changes the collection currently being viewed.

Inline means the control appears inside or immediately adjacent to the list, table, board column, or object it affects. It is not a separately titled form card elsewhere on the same route.

- A compact **Add item** row may expand in place.
- Show only the minimum fields initially.
- Insert the result directly into the current collection.
- Preserve scroll position and keep focus near the created or edited item.
- Move optional details to progressive disclosure or post-create editing.
- Do not replace an explicitly inline interaction with a modal or route.

### Modal or sheet

Use a modal for a bounded temporary task that needs more attention or fields than the workspace can comfortably contain but does not deserve its own destination.

- Keep the form closed and absent from the visible and accessibility trees initially.
- Open it from a clearly labelled trigger.
- Establish initial focus, contain focus, support Escape and safe cancellation, make background content inert, and return focus to the trigger.
- Preserve entered values when validation or a recoverable failure occurs.
- On narrow touch devices, use a keyboard-safe sheet or near-full-width dialog when appropriate.
- Do not render the complete modal form as an always-visible page panel.

### Dedicated view

Use a separate view for a long, multi-step, deeply linked, or independently returnable workflow. Do not create a route for an ordinary quick-add action.

## Keep guidance out of the working surface

The primary workspace is for doing the work, not explaining the app. Do not add a permanent **About this app**, **How it works**, feature summary, workflow explanation, or welcome card above the primary content unless that information is required to complete the current task.

Place guidance according to when it is needed:

1. Use an empty state to explain what belongs in an empty collection and expose its primary action. Remove that explanation once content exists.
2. Use concise contextual help beside an unfamiliar control.
3. Use a welcome or onboarding screen only when first-use orientation or an initial choice is genuinely necessary.
4. Make onboarding dismissible and persist dismissal through supported app data at the intended scope; never use `localStorage` for it. If member-specific persistence is unavailable, do not claim an app-wide dismissal is per-user.
5. Put revisitable guidance behind a clearly labelled Help action. Use a popover or modal for short contextual help and a page, drawer, or `@app/HELP.md` for substantial documentation.

## Keep demo mode transient

Demo presentation is a gateway into the operational app, not a permanent layer over every workspace.

When the demo has several personas, modes, or scenarios:

1. A single demo entry screen may introduce the modes and let the user choose one.
2. Selection enters the same focused operational workspace that a real user of that mode would use.
3. After entry, retain only a compact labelled mode dropdown in existing chrome or a **Back to demo modes** action.
4. Do not repeat mode cards, welcome copy, scenario explanations, demo statistics, or introduction banners inside each operational workspace.
5. A small current-mode or Demo indicator is enough when orientation is needed.

Demo seeding progress is a transient initialization state. Show it only while seeding is actually occurring, replace it with the workspace when complete, and do not show it again unless the demo data is explicitly reset.

## Design for the operating context

A responsive Live App is not one desktop composition squeezed or stacked at different widths. Preserve capability while adapting information priority, control placement, density, and interaction to the available frame and likely input method.

Do not infer input capability from width alone. Consider viewport width together with `hover`, `pointer`, keyboard access, and the actual Live App frame.

### Narrow touch — phone

The user may be one-handed, interrupted, using a virtual keyboard, and working inside a short frame.

- Put the primary object and primary action in the first usable workspace.
- Prefer one dominant column and direct manipulation of active content.
- Keep primary touch targets at least 44 by 44 CSS pixels.
- Do not depend on hover, precision dragging, or keyboard shortcuts.
- Keep create and edit controls close to the collection or object they affect.
- Defer summaries, statistics, history, advanced filters, settings, and help to disclosures, sheets, menus, or on-demand views.
- Preserve entered values, focus, and scroll position across validation, mutation, error, and refresh.
- Account for dynamic browser chrome, safe areas, orientation, and the virtual keyboard. The focused field and its submit action must remain reachable.
- Do not preserve desktop density by stacking every panel vertically.

### Medium touch — tablet

A tablet may have desktop-like width while still using touch and an on-screen keyboard.

- Preserve touch-sized controls and do not assume hover or a precise pointer.
- Use a second pane only when simultaneous context materially helps the task.
- Collapse secondary panes when they reduce the usable primary workspace.
- Test portrait, landscape, and virtual-keyboard states.
- Do not treat tablet width alone as permission to restore dense desktop chrome.

### Wide pointer and keyboard — laptop or desktop

Use additional width to reduce navigation and inspection cost, not to invent more content.

- Keep the primary workflow dominant.
- Use denser tables, split views, persistent filters, or master-detail layouts only when simultaneous visibility improves the work.
- Support useful keyboard traversal and shortcuts where appropriate, but never make shortcuts the only path.
- Hover may add feedback or previews but must not contain the only action or information.
- Do not fill available space with dashboard metrics, summary cards, or side panels that do not help the current task.

## Common responsive behavior

Every structure must:

- keep one deliberate main scroll strategy and avoid double iframe scrollbars;
- prevent document-level horizontal overflow;
- contain intrinsically wide tables, boards, charts, and timelines in labelled local scrollers or adapt their presentation;
- keep primary actions, forms, dialogs, status messages, and recovery paths operable at narrow widths;
- use `100dvh` with an appropriate fallback when a frame-filling layout is required;
- give flexible regions `min-width: 0` and `min-height: 0`;
- respect keyboard focus, zoom, text spacing, `prefers-reduced-motion`, and the host-controlled light/dark theme.

Choose breakpoints from content, not device names. Test actual frame sizes, intermediate widths, and relevant input profiles.

## Anti-slop audit for operational apps

Use visual containers only when they communicate a real object, grouping, selection, or elevation relationship.

- Do not wrap every heading, form, statistic, filter, and list in a card.
- Do not nest cards when spacing, typography, grouping, or a divider communicates the hierarchy.
- Do not add dashboard statistics, activity feeds, progress charts, status-chip collections, or preview panels unless they support a confirmed decision.
- Do not repeat page title, section title, card title, description, and helper text when one clear label is sufficient.
- Do not place a simple inline creator or editor in a separately titled feature panel.
- Do not use equal card grids when items do not have equal importance.
- Reserve status colours and badges for real states; do not use them as decoration.
- Prefer whitespace, alignment, grouping, and dividers before another border, shadow, radius, or background.
- Give each operating context one dominant action and one dominant content region. Secondary controls should recede.
- Remove any element whose absence does not reduce task completion, orientation, necessary information, feedback, or trust.
- In light mode, keep the largest scaffold and primary-workspace surfaces visually light. Reserve dark or strongly coloured surfaces for compact accents, controls, or selected states unless the brief explicitly requests a dark direction.

These are default-avoidance rules, not universal bans. Cards, dashboards, navigation, modals, and dense data are valid when the confirmed workflow gives them a concrete job.

## Multi-destination shell pattern

Use this pattern only when the structure decision identifies persistent primary navigation.

```text
┌──────────────── sticky / fixed-in-shell top bar ────────────────┐
│ menu trigger (narrow only) · title/context · global actions     │
├──────────────┬───────────────────────────────────────────────────┤
│ persistent   │                                                   │
│ navigation   │             scrolling main content                │
│ (wide only)  │                                                   │
└──────────────┴───────────────────────────────────────────────────┘

narrow width:
┌──────────────────── top bar ────────────────────┐
│ menu trigger · title/context · actions          │
├─────────────────────────────────────────────────┤
│              scrolling main content             │
└─────────────────────────────────────────────────┘
       + navigation drawer over the content when open
```

Keep primary navigation reachable at supported widths. Use a persistent sidebar only while enough width remains for useful content; otherwise remove it from layout and expose the same destinations through an overlay drawer. Close the drawer on destination selection, Escape, and backdrop click. Trap focus while open and return focus to the trigger.

If the design gives no stronger reason, a persistent sidebar normally becomes a drawer below `1024px` (`lg`). A sticky element fails when the wrong ancestor owns scrolling; test rendered behavior rather than trusting the CSS declaration.

### Dynamic React apps with persistent navigation

Copy `ptr-ui.js` and its `pt-format.js` dependency and use `AppShell` when this shell pattern is actually needed. `ResponsiveAppShell` is an alias.

```jsx
import { AppShell } from './ptr-ui.js';
import { Link } from './ptr-router.js';

function PrimaryNavigation({ closeNavigation }) {
  return (
    <nav aria-label="Primary navigation" className="space-y-1">
      <Link to="/overview" onClick={closeNavigation}>Overview</Link>
      <Link to="/orders" onClick={closeNavigation}>Orders</Link>
      <button data-navigation-item="true" onClick={() => {
        navigate('/settings');
        closeNavigation();
      }}>Settings</button>
    </nav>
  );
}

export default function App() {
  return (
    <AppShell
      appName="Operations"
      header={<h1 className="truncate font-semibold">Operations</h1>}
      headerActions={<UserActions />}
      navigation={({ closeNavigation }) => (
        <PrimaryNavigation closeNavigation={closeNavigation} />
      )}
    >
      <Routes />
    </AppShell>
  );
}
```

`AppShell` supplies `app-shell`, `app-topbar`, `mobile-nav-trigger`, `desktop-sidebar`, and `main-content` test IDs. Anchor links and controls marked `data-navigation-item="true"` close the drawer automatically.

A focused single-workspace dynamic app does not need `AppShell` or `ptr-router.js`; implement the common frame, scroll, focus, and device-context rules directly.

### Compiled React/Vite apps with persistent navigation

Compiled apps use `flowbite-react` and local React components, not `ptr-ui.js`. Implement the selected structure directly with the project's component library.

```jsx
<div className="h-screen h-dvh min-h-0 overflow-hidden flex flex-col">
  <header className="sticky top-0 z-40 shrink-0">...</header>
  <div className="flex flex-1 min-h-0 min-w-0">
    <aside className="hidden lg:flex lg:w-64 shrink-0 overflow-y-auto">...</aside>
    <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain">...</main>
  </div>
  {/* accessible mobile drawer: lg:hidden */}
</div>
```

Do not use a permanently fixed sidebar that overlays content without reserving width. A compiled single-workspace app can omit the aside, drawer, and router while retaining the frame and main-scroll invariants.

### Dynamic HTML apps with persistent navigation

Use the same selected shell with CSS and a small menu controller. The mobile drawer is a real dialog-like overlay, not a visually shifted sidebar left in the accessibility tree.

```css
html, body { height: 100%; margin: 0; }
body { overflow: hidden; }
.app-shell { height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
.app-topbar { position: sticky; top: 0; z-index: 40; flex: none; }
.app-body { display: flex; flex: 1; min-width: 0; min-height: 0; }
.app-sidebar { width: 16rem; flex: none; overflow-y: auto; }
.app-main { flex: 1; min-width: 0; min-height: 0; overflow: auto; overscroll-behavior: contain; }
.mobile-menu { display: none; }

@media (max-width: 63.999rem) {
  .app-sidebar { display: none; }
  .mobile-menu { display: inline-flex; min-width: 44px; min-height: 44px; }
}
```

When the drawer opens, set `aria-expanded="true"`, move focus into it, lock background scrolling, and make the rest of the app inert when supported. Restore all state on close.

## Responsive content patterns

- **Grids:** use content-aware columns rather than fixed counts; deliberately order, merge, collapse, or remove secondary regions on phone.
- **Tables:** preserve headers when practical; otherwise provide a deliberate list/card summary. Constrain necessary horizontal scrolling to the table region and label it.
- **Forms:** collapse multi-column forms before controls become cramped. Keep the active field, validation, and submit action visible above the virtual keyboard.
- **Dialogs:** cap width and height; use a near-full-width dialog or sheet on narrow screens while preserving a visible close action.
- **Action bars:** keep the primary action near the active object; move secondary actions into an overflow menu rather than stacking a toolbar into several rows.
- **Long text:** apply wrapping, truncation, and accessible full-value affordances intentionally.
- **Drag layouts:** provide keyboard and non-drag alternatives; do not make precision dragging the only mobile interaction.

## Runtime verification

Use `ui-testing/run_plan.py` with a viewport matrix and run the same primary happy path at phone, tablet, and laptop profiles. Responsive verification is about workflow quality, not merely component visibility.

```yaml
viewports:
  - { name: laptop, width: 1280, height: 800 }
  - { name: tablet, width: 768, height: 1024 }
  - { name: phone, width: 390, height: 844 }

scenarios:
  - id: primary-workflow
    title: Primary workflow remains focused and operable
    steps:
      - { id: app.open, action: navigate, url: /chats/chat-123 }
      - { id: app.no-page-overflow, action: expect_no_horizontal_overflow }
      - { id: app.primary-visible, action: expect_visible, target: { testid: primary-workspace } }
      - { id: app.primary-action, action: expect_visible, target: { testid: primary-action } }
```

At all profiles verify:

- the primary object and action are identifiable without traversing unrelated summaries;
- the primary workflow completes without avoidable route changes;
- action placement stays close to the object being changed;
- mobile has no hover-only or precision-only requirement;
- the virtual keyboard does not hide the active field or submit action;
- loading, empty, validation, failure, and success states preserve context;
- mutations preserve focus or move it intentionally and announce the result;
- inline creation remains adjacent to its collection and inserts the result there;
- dialogs and sheets are closed and not focusable initially, then satisfy their complete open/close contract;
- onboarding dismissal persists at its intended scope and Help remains reachable;
- after demo-mode selection, the operational workspace retains only a compact switcher or back action;
- phone removes, collapses, or relocates secondary desktop content instead of stacking every panel;
- no page-level horizontal overflow or double scrollbar exists;
- both forced host themes render correctly and the largest light-mode surfaces appear light.

Only when persistent navigation exists, add assertions for wide navigation, narrow menu-trigger visibility, drawer open/close and focus behavior, route selection closing the drawer, and topbar position after main-region scrolling:

```yaml
  - id: mobile-navigation
    viewports: [phone]
    steps:
      - { id: mobile.menu-visible, action: expect_visible, target: { testid: mobile-nav-trigger } }
      - { id: mobile.sidebar-hidden, action: expect_hidden, target: { testid: desktop-sidebar } }
      - { id: mobile.open, action: click, target: { testid: mobile-nav-trigger } }
      - { id: mobile.dialog, action: expect_visible, target: { role: dialog, name: "Navigation" } }
      - { id: mobile.escape, action: press, key: Escape }
      - { id: mobile.closed, action: expect_hidden, target: { role: dialog, name: "Navigation" } }
```

Do not add navigation-shell assertions to a focused workspace that has no persistent primary navigation.
