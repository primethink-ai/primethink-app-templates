# Dynamic browser React Live App

A no-build PrimeThink Live App starter using pinned React, ReactDOM, and HTM browser modules, with hand-written responsive CSS and no Tailwind or Flowbite.

## Page type

Deploy this as a PrimeThink **HTML** page type. The complete `index.html` loads React itself; this differs from the platform's native React page type.

## Use

1. Rename `ENTITY_NAME` (`react_template_action`) to a unique value.
2. Replace the sample working-set component with your app.
3. Upload `index.html` as a top-level Live App file.

Opening the file outside PrimeThink provides a visual preview. Data controls remain disabled because the platform injects and initializes `window.pt` only at runtime.

## Constraints retained

- Exact browser dependency versions are pinned.
- App data uses the chat database, never `localStorage`.
- Partial edits use merge mode.
- Real-time subscriptions are debounced and cleaned up.
- React escapes entity text by default; no `dangerouslySetInnerHTML` is used.
