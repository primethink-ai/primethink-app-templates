# Responsive Live App Shell

PrimeThink Live Apps run inside a host-controlled frame whose available width can be much smaller than the developer's monitor. An app is responsive when its navigation, content, actions, and scroll behavior remain usable at the frame's current size—not merely when its cards wrap.

Read this reference whenever the user asks for an **app**, dashboard, admin panel, or tool. Visual styling can vary; the behavioral contract below does not.

## Required behavior

- Keep primary navigation reachable at every supported width.
- Keep the top bar visible while the main application content scrolls.
- Use persistent sidebar navigation only while enough width remains for useful content.
- At constrained widths, remove the sidebar from layout and expose the same navigation through an overlay drawer.
- Close the drawer on destination selection, Escape, and backdrop click. Trap focus while it is open and return focus to the menu trigger when it closes.
- Keep one deliberate main scroll region. Avoid a scrolling document inside another scrolling frame.
- Prevent document-level horizontal overflow. Put intrinsically wide tables, boards, charts, and timelines in bounded local scrollers or adapt their presentation.
- Keep primary actions, forms, dialogs, and status messages visible and operable at narrow widths.
- Use touch targets of at least 44 by 44 CSS pixels for primary controls.
- Respect keyboard focus, `prefers-reduced-motion`, and the host-controlled light/dark theme.

Choose breakpoints from the content, not from device names. If the design gives no stronger reason, a persistent sidebar normally becomes a drawer below `1024px` (`lg`). Test the actual Live App frame at desktop, tablet, and mobile widths.

## Shell anatomy

A robust shell separates persistent chrome from scrolling content:

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

The shell itself should fill the frame (`100dvh`, with an appropriate fallback), hide accidental document overflow, and give the main region `min-width: 0`, `min-height: 0`, and `overflow-y: auto`. A sticky element fails when the wrong ancestor owns scrolling; test the rendered behavior rather than trusting the CSS declaration.

## Dynamic React apps

Copy `ptr-ui.js` (and its `pt-format.js` dependency) and use `AppShell`. `ResponsiveAppShell` is an alias.

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
      appName="My app"
      header={<h1 className="truncate font-semibold">My app</h1>}
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

`AppShell` supplies stable test IDs:

- `app-shell`
- `app-topbar`
- `mobile-nav-trigger`
- `desktop-sidebar`
- `main-content`

Anchor links and controls marked `data-navigation-item="true"` close the mobile drawer automatically. A navigation render function also receives `closeNavigation` for router components that do not emit an anchor.

## Compiled React/Vite apps

Use the same structure in normal JSX. The dynamic `ptr-ui.js` library is designed for platform-transpiled React apps, so compiled apps may either adapt its `AppShell` source into a local component or implement the contract directly with normal React and the project's component library.

Keep these structural classes or equivalents:

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

Do not use a permanently fixed sidebar that overlays content without reserving width. Do not make the entire document scroll underneath an independently fixed top bar unless the content offset is maintained at every breakpoint.

## Dynamic HTML apps

Use the same shell with CSS and a small menu controller. The mobile drawer must be a real dialog-like overlay, not a visually shifted sidebar left in the accessibility tree.

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

When the drawer opens, set `aria-expanded="true"` on its trigger, move focus into the drawer, lock background scrolling, and make the rest of the app inert when supported. Restore all state on close.

## Responsive content patterns

The shell is necessary but not sufficient:

- **Grids:** use content-aware columns (`repeat(auto-fit, minmax(...))`) rather than fixed counts.
- **Tables:** keep column headers when practical; otherwise provide a deliberate card/list presentation. If horizontal scrolling is necessary, constrain it to the table region and label it.
- **Forms:** collapse multi-column forms to one column before labels or controls become cramped.
- **Dialogs:** cap width and height; on narrow screens use near-full-width dialogs or a sheet while preserving a visible close action.
- **Action bars:** allow wrapping or move secondary actions into an overflow menu. Never let the primary action leave the viewport.
- **Long text:** apply `min-width: 0`, wrapping, truncation, and accessible full-value affordances intentionally.
- **Drag layouts:** provide keyboard and non-drag alternatives; do not make precision dragging the only mobile interaction.

## Runtime verification

Use `ui-testing/run_plan.py` with a viewport matrix. Existing semantic assertions remain the primary way to test navigation; responsive assertions verify layout invariants.

```yaml
viewports:
  - { name: desktop, width: 1280, height: 800 }
  - { name: tablet, width: 768, height: 1024 }
  - { name: mobile, width: 390, height: 844 }

scenarios:
  - id: responsive-shell
    title: Application shell adapts to available width
    steps:
      - id: shell.open
        action: navigate
        url: /chats/chat-123

      - id: shell.no-page-overflow
        action: expect_no_horizontal_overflow

      - id: shell.topbar-visible
        action: expect_visible
        target: { testid: app-topbar }

      - id: shell.scroll-main
        action: scroll
        target: { testid: main-content }
        y: 800

      - id: shell.topbar-stays
        action: expect_stuck_to_top
        target: { testid: app-topbar }
        tolerance_px: 2
```

Use scenario-level `viewports: [mobile]` when a flow should run only at selected entries from the plan matrix. Add separate desktop and mobile scenarios when expected visibility differs:

```yaml
  - id: mobile-navigation
    viewports: [mobile]
    steps:
      - { id: mobile.menu-visible, action: expect_visible, target: { testid: mobile-nav-trigger } }
      - { id: mobile.sidebar-hidden, action: expect_hidden, target: { testid: desktop-sidebar } }
      - { id: mobile.open, action: click, target: { testid: mobile-nav-trigger } }
      - { id: mobile.dialog, action: expect_visible, target: { role: dialog, name: "Navigation" } }
      - { id: mobile.escape, action: press, key: Escape }
      - { id: mobile.closed, action: expect_hidden, target: { role: dialog, name: "Navigation" } }
```

At minimum verify:

- wide navigation and narrow menu trigger visibility,
- drawer open/close and keyboard behavior,
- route selection closes the drawer,
- top bar position after main-region scrolling,
- no page-level horizontal overflow,
- primary content and actions remain in the viewport,
- both host themes still render correctly.
