# Dynamic HTML Live App

A dependency-free, no-build PrimeThink Live App starter using vanilla HTML, CSS, and JavaScript. It includes responsive light/dark styling, accessible CRUD controls, Chat DB persistence through `window.pt`, and debounced real-time refresh.

## Use

1. Rename `ENTITY_NAME` (`html_template_action`) to a unique value.
2. Replace the sample action register with your app.
3. Create a PrimeThink Live App with page type **HTML**.
4. Upload `index.html` as a top-level app file.

Opening the file outside PrimeThink provides a visual preview. Data controls remain disabled because the platform injects and initializes `window.pt` only at runtime.

## Constraints retained

- No `localStorage`; app data lives in the chat database.
- Partial edits use merge mode.
- Real-time listeners are debounced and cleaned up.
- User text is rendered with `textContent`, not `innerHTML`.
- The host-controlled light/dark theme is applied before first paint.
