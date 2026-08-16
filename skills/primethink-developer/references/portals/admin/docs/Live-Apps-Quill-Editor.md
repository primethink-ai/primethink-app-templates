# Quill Editor

## Overview

The Quill rich text editor is a common component used across many Live Apps for content editing. This guide covers the recommended setup, known issues, and proven solutions for integrating Quill into PrimeThink Live Apps.

## Version

Use **Quill 2.0.2** — do NOT use 2.0.3 or later. Version 2.0.3 introduced a regression where `getSemanticHTML()` converts all spaces to `&nbsp;`, breaking word-wrap in view mode. There is no config option to disable this behavior.

```html
<link href="https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js"></script>
```

## Saving Content

Always strip `&nbsp;` from `getSemanticHTML()` output as a safety net, even on 2.0.2:

```javascript
tab.content = quill.getSemanticHTML().replace(/&nbsp;/g, ' ');
```

Without this, non-breaking spaces prevent the browser from wrapping text at word boundaries, causing horizontal overflow.

## Editor and View Mode Spacing

Quill's `.ql-editor` has no default paragraph or heading margins. Add CSS to match your view mode styling:

```css
.ql-editor p { margin: 0.5em 0; }
.ql-editor h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
.ql-editor h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; }
.ql-editor h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
.ql-editor ul, .ql-editor ol { margin: 0.5em 0; }
.ql-editor li { margin: 0.25em 0; }
.ql-editor blockquote {
    border-left: 4px solid #d1d5db;
    padding-left: 1em;
    margin: 0.5em 0;
    color: #6b7280;
}
```

## Importing Documents

When importing files via `pt.uploadFiles()` + `pt.getDocumentText()`, the extracted text has hard line breaks at the original page column width (typically 80-120 characters). This causes words to be split mid-word (e.g., `structura\nl` becomes `structura l`).

**Fix:** Normalize single newlines into spaces before passing to `marked.parse()`, while preserving paragraph breaks and markdown syntax:

```javascript
const normalized = text.replace(/([^\n])\n(?!\n|#|\*|-|\d+\.|>|```)/g, '$1 ');
const html = marked.parse(normalized);
```

This regex joins lines that are part of the same paragraph but preserves:

- Double newlines (paragraph breaks)
- Lines starting with `#` (headings)
- Lines starting with `*`, `-` (lists)
- Lines starting with `1.` etc. (ordered lists)
- Lines starting with `>` (blockquotes)
- Lines starting with `` ``` `` (code fences)

## Dark Mode

Override Quill's toolbar and container styles for dark mode:

```css
.dark .ql-toolbar.ql-snow {
    border-color: #4b5563;
    background: #1f2937;
}
.dark .ql-toolbar .ql-stroke { stroke: #d1d5db; }
.dark .ql-toolbar .ql-fill { fill: #d1d5db; }
.dark .ql-toolbar .ql-picker-label { color: #d1d5db; }
.dark .ql-toolbar .ql-picker-options { background: #374151; }
.dark .ql-container.ql-snow {
    border-color: #4b5563;
    background: #111827;
    color: #e5e7eb;
}
```

## View Mode Content Styling

Add `overflow-wrap: break-word` to the view container and `white-space: pre-wrap` on `<pre>` blocks to prevent horizontal scroll:

```css
.view-content {
    overflow-wrap: break-word;
    word-wrap: break-word;
}
.view-content pre {
    white-space: pre-wrap;
    overflow-x: auto;
}
```

## Image Handling

Quill stores pasted or inserted images as base64 `data:` URIs inline. These bloat the entity data. Intercept via the `text-change` event, upload to PrimeThink, and replace with a hosted URL:

```javascript
let imgTimer = null;

quill.on('text-change', () => {
    clearTimeout(imgTimer);
    imgTimer = setTimeout(() => {
        uploadBase64Images().catch(err => console.error('Image upload failed:', err));
    }, 500);
});

async function uploadBase64Images() {
    const imgs = quill.root.querySelectorAll('img[src^="data:"]');
    for (const img of imgs) {
        try {
            const originalSrc = img.src;

            // Convert base64 to Blob
            const res = await fetch(originalSrc);
            const blob = await res.blob();

            // Upload via PrimeThink
            const formData = new FormData();
            formData.append('files', blob, 'image.png');
            const result = await pt.uploadFiles(formData);

            // The image may have been removed or replaced while awaiting —
            // skip stale nodes instead of updating a detached element
            if (!quill.root.contains(img) || img.src !== originalSrc) continue;

            // Replace inline base64 with hosted URL through the Quill API,
            // so the change lands in the document (not just the DOM)
            const blot = Quill.find(img);
            if (!blot) continue;
            const index = quill.getIndex(blot);
            quill.deleteText(index, 1);
            quill.insertEmbed(index, 'image', result.documents[0].download_url);
        } catch (error) {
            console.error('Image upload failed:', error);
        }
    }
}
```

## Checklist Shortcut

Quill doesn't have a built-in `[]` to checklist shortcut. Implement via a `keydown` listener on `quill.root`:

```javascript
quill.root.addEventListener('keydown', (e) => {
    if (e.key !== ' ') return;

    const selection = quill.getSelection();
    if (!selection) return;

    // getLine returns the line and the caret's offset within it —
    // only convert when the caret sits immediately after the shortcut
    const [line, offset] = quill.getLine(selection.index);
    const lineText = line.domNode.textContent;

    if (lineText.startsWith('[]') && offset === 2) {
        e.preventDefault();
        const lineIndex = quill.getIndex(line);
        quill.deleteText(lineIndex, 2);
        quill.formatLine(lineIndex, 1, 'list', 'unchecked');
    } else if (lineText.startsWith('[x]') && offset === 3) {
        e.preventDefault();
        const lineIndex = quill.getIndex(line);
        quill.deleteText(lineIndex, 3);
        quill.formatLine(lineIndex, 1, 'list', 'checked');
    }
});
```

## Key Gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| Text won't wrap in view mode | `&nbsp;` in saved HTML | Strip on save + use Quill 2.0.2 |
| Words split mid-word after import | Hard line breaks from PDF/DOCX extraction | Normalize `\n` to space before `marked.parse()` |
| No spacing between paragraphs in editor | Quill has no default margins | Add CSS for `.ql-editor` p/h1/h2/h3 |
| Images bloat entity data | Base64 inline images | Upload to PrimeThink, replace with URL |
| Horizontal scroll on code blocks | `<pre>` default `white-space: pre` | Use `white-space: pre-wrap` |
