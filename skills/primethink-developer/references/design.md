# Visual Design for Live Apps

*Adapted from Anthropic's public `frontend-design` skill (anthropics/skills), rewritten for
PrimeThink Live Apps: operational tools inside a chat, not marketing pages.*

The source skill optimises for a memorable landing page — a display typeface, a hero thesis,
a signature moment. Almost none of that survives contact with a Live App, which is a dense
operational surface running in an iframe with a fixed component kit, a system font stack, and
a host-controlled theme. What does survive is the discipline: a real type scale, a spacing
rhythm, one accent, and a refusal to ship the generic default. Read this before writing or
restyling any screen.

## Design context first

Before choosing anything, find out what has already been decided. When a design context
exists, **it is binding** — you are executing it, not re-opening it:

1. **App Studio projects** carry `style_preset`, `nav_shape`, `density` and `style_palette`
   on `spec_project`, plus — in the production profile — a `design` living doc. Read whichever
   are present and follow them exactly;
   if one contradicts a rule below, the platform constraints (dark variants, no CDN fonts,
   flat exports) still win — everything else defers to the spec.
2. **The project's `AGENTS.md`** — earlier decisions about theme, layout and conventions.
3. **The user's own words.** A stated direction beats every default in this file.

Only when all three are silent do you choose, and then you state the choice in one line
before building so it can be corrected cheaply.

## The constraint set (non-negotiable)

These come from the platform, not from taste. Breaking one is a bug, not a style.

- **Every color utility carries a `dark:` counterpart** — `bg-`, `text-`, `border-`,
  `divide-`, `ring-`, `placeholder-`. A screen that looks right in one theme and broken in
  the other is unfinished. The theme follows the host, never the OS: see the theme bridge in
  `platform-known-issues.md` (KI-03) and `SKILL.md`.
- **Class-based dark only** — `@custom-variant dark (&:where(.dark, .dark *))` (Tailwind 4).
  Never `prefers-color-scheme` for `dark:` variants.
- **No font CDN, no new CDN anything.** Tailwind 4's default `--font-sans` is already a system
  stack (`ui-sans-serif, system-ui, sans-serif, …`) and it is the right answer: it loads
  instantly, renders natively on every device, and cannot hang on a filtered network. For
  numeric columns use the system mono stack (`ui-monospace, SFMono-Regular, Menlo, Consolas,
  monospace`) with `tabular-nums`. Personality does not come from a typeface here.
- **flowbite-react 0.12 flat exports only** — `TableCell`, `ToastToggle`, `TabItem`, never
  the dot-notation legacy API (`Table.Cell`), which renders `undefined`. And **never import
  anything `Modal*` from flowbite-react**: it crashes under React 19 — use the portal modal
  at `src/components/Modal.jsx`. Both are KI-01/KI-02 in `platform-known-issues.md`.
- **Mobile-first.** Write the phone layout, then add `sm:`/`md:`/`lg:`. Verify at phone,
  tablet and laptop profiles — `developer-guide/responsive-live-apps.md` owns that contract.

## Component vocabulary: Flowbite vs plain Tailwind

The kit is Flowbite 4.0.2 (dynamic apps, pinned CSS + JS in the template) and flowbite-react
0.12.17 (compiled apps). Use it for **behavior**, not for layout.

**Reach for Flowbite** when the component carries interaction state or accessibility wiring
you would otherwise re-implement: `Button`, `TextInput` / `Textarea` / `Select` / `Label`,
`Checkbox` / `Radio` / `ToggleSwitch`, `Dropdown`, `Tooltip`, `Tabs` / `TabItem`, `Badge`,
`Spinner`, `Alert`, `Pagination`, `Toast`, and `Table` when you want its styled shell. Those
names are the flowbite-react components; in a dynamic app the same components are Flowbite 4
`data-*` attribute markup, and anything inserted after page load needs `initFlowbite()` to
wire up its behavior.

**Write plain Tailwind markup** for everything structural: the page scaffold, grids and
stacks, panels and section headers, list rows, toolbars, empty states, summary lines. Forcing
a `Card` around a section you only wanted to separate is how apps end up as a wall of boxes.
A `div` with `rounded-lg border border-gray-200 dark:border-gray-700` is not a defeat.

**Do not fight a component.** If you are overriding more than a couple of Flowbite classes to
get the look you want, drop to plain markup — a half-overridden component is harder to read
and breaks on the next library bump than the twelve utility classes it replaced.

## Type scale

Pick a small scale and hold it. Four sizes on a screen is plenty:

| Role | Class | Notes |
|---|---|---|
| Page title | `text-xl` / `text-2xl` `font-semibold` | One per screen |
| Section heading | `text-base` / `text-lg` `font-semibold` | Sentence case |
| Body and table cells | `text-sm` | The workhorse in dense apps |
| Labels, meta, captions | `text-xs` `font-medium` `uppercase tracking-wide` (sparingly) | Secondary color, not another size |

Build hierarchy with **weight and color first, size second** — `font-semibold` plus
`text-gray-900 dark:text-white` against `text-gray-500 dark:text-gray-400` separates two
levels without changing size at all. Never use more than two weights in one region. Body text
that is `text-sm` everywhere with disciplined color is more legible than five competing sizes.

## Spacing rhythm

Choose three spacings from Tailwind's 4px scale and reuse them: **tight** (`gap-2`/`p-2`) inside
a control or row, **base** (`gap-4`/`p-4`) between related elements, **section** (`gap-6`/`p-6`,
`space-y-6`) between blocks. Drifting between `p-3`, `p-5` and `p-7` across a screen with no
reason is the single clearest tell of unconsidered layout. A deliberate fourth value is fine
where density demands it — dense table rows at `px-3 py-2` are the common case — as long as it
is used consistently for that one purpose rather than sprinkled.

Density is a design decision, not an accident: an operational app earns its keep by showing
more rows without shrinking touch targets. Table rows at `px-3 py-2 text-sm` on desktop,
interactive targets never below 44px on touch, and `max-w-*` on prose so lines stop around
75 characters. Whitespace is separation, not padding for its own sake.

## Color restraint

A neutral gray scale, **one** accent hue, and semantic colors that mean something:

- Neutrals carry the interface: surfaces, borders, text, table zebra.
- The accent marks the **primary action and current state** — one per view. If two things are
  accented, neither reads as primary.
- Red / amber / green are reserved for destructive, warning and success **state**. A green
  badge must mean "good", never "this is the third category".
- No gradients on operational surfaces, no colored panel backgrounds as decoration, no
  full-width dark bands inside an app that already has a host theme.

Check contrast in **both** themes — 4.5:1 for body text. Gray-400 on white passes nothing.

## Anti-slop for operational apps

These are the patterns that make an app read as generated. `responsive-live-apps.md` has the
full audit; the visual half:

- **Equal card grids where a table belongs.** Rows of comparable records with the same fields
  are a table (or a compact list), not twelve boxes.
- **Decorative metrics.** A row of stat tiles nobody asked for, counting things nobody acts on.
- **Card-wrapping everything** — a card around each heading, filter bar, form and list, then
  cards nested in cards. Spacing and a divider do the same job silently.
- **A permanent "How it works" panel** above the actual work.
- **Emoji as iconography**, gratuitous gradients, and full-bleed hero banners on a tool.
- **`01 / 02 / 03` markers** where the content is not a sequence.
- **Motion for its own sake.** A 150ms transition on hover and focus is finished; page-load
  chorales and scroll reveals are not. Respect `prefers-reduced-motion`.
- **The three AI default looks** — cream background with a high-contrast serif and terracotta
  accent; near-black with one acid accent; broadsheet hairline rules. Legitimate when the
  brief asks; a default, not a choice, when it does not.

Cut anything whose absence would not reduce task completion, orientation, feedback or trust.

## Where personality legitimately lives

Inside these constraints there is still real room, and it is not in novelty layouts:

- **The spacing and type scale you chose** and held consistently — this reads as quality more
  than any decoration.
- **One accent color** used with conviction, including its dark-mode pair.
- **Empty states.** The highest-leverage screen in most apps and usually an afterthought: say
  what this space is for and give the one action that fills it.
- **Microcopy.** Name things the way the user does, not the way the schema does. Buttons say
  what happens — "Save changes", not "Submit" — and keep the same verb through the flow, so
  "Publish" produces "Published". Errors state what went wrong and how to fix it, in the
  interface's voice; they do not apologize and are never vague. Sentence case everywhere.
- **One signature detail** per app, executed well: a status-chip system that actually maps to
  the domain, a genuinely good table row, a compact command bar. One — then stop.

## Before you call it done

Beyond the Final Verification Checklist in `SKILL.md`:

- Both themes, on every view — forced light against a dark OS and vice versa.
- Phone, tablet, laptop; no horizontal overflow, no double scrollbar.
- Visible keyboard focus (`focus-visible:ring-2`) on every interactive element; inputs have
  associated labels.
- Remove one thing. There is almost always one panel, badge, or metric that is only there
  because it was easy to add.

---

*Related: `developer-guide/responsive-live-apps.md` (structure, interaction surfaces,
responsive contract) · `platform-known-issues.md` (KI-01 portal modal, KI-02 flat exports,
KI-03 theme bridge).*
