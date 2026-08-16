# PrimeThink Manage UI Library

## Overview

`primethink_manage_ui.js` is a reusable UI library that provides an "Export to Manage" modal dialog for PrimeThink Live Apps. It lets users search for a matter, select a document format, and export content directly to that matter's files in Obviously Manage.

The library is fully self-contained — it injects its own modal HTML, loads `primethink_manage.js` automatically, and manages its own internal state.

## Loading

The library is available at `/static/primethink_manage_ui.js`.

### Lazy Loading (Recommended)

Load it dynamically when the user triggers the export action:

```javascript
function openManageExport() {
  const doOpen = () => {
    ptManageUI.open({
      getContent: () => myContent,
      getTitle: () => myTitle,
      onSuccess: (matterRef) => showToast(`Exported to ${matterRef}`, 'success'),
      onError: (msg) => showToast(msg, 'error')
    });
  };

  if (typeof window.ptManageUI !== 'undefined') {
    doOpen();
  } else {
    const script = document.createElement('script');
    script.src = '/static/primethink_manage_ui.js';
    script.onload = () => doOpen();
    script.onerror = () => showToast('Failed to load Manage UI library', 'error');
    document.head.appendChild(script);
  }
}
```

### Eager Loading

Or load it via a script tag:

```html
<script src="/static/primethink_manage_ui.js"></script>
```

## Dependencies

| Dependency | Notes |
|---|---|
| `primethink.js` | Must be loaded first (provides the `pt` object) |
| `primethink_manage.js` | Loaded automatically by the library when needed — no manual loading required |
| Tailwind CSS | Used for styling (the app must include its own pinned Tailwind — see [Tailwind CSS v4 Setup](Live-Apps-Tailwind-v4.md)) |

## API

### `ptManageUI.open(options)`

Opens the export modal. Injects the modal HTML into the DOM on first call.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `options.getContent` | `function` | Yes | Returns the document content (markdown/text string) to export |
| `options.getTitle` | `function` | Yes | Returns the document title, used for the default filename |
| `options.onSuccess` | `function` | No | Called with `(matterRef, matter, result, matterUrl)` after successful export |
| `options.onError` | `function` | No | Called with `(errorMessage)` on validation errors or export failure |

**`onSuccess` callback parameters:**

| Parameter | Type | Description |
|---|---|---|
| `matterRef` | `string` | The matter reference number (e.g. `"2260/20003"`) |
| `matter` | `object` | The full matter object from the search results (contains `id`, `title`, `ref_no`, `status`, etc.) |
| `result` | `object` | The raw response from `ptManage.createDocument()` |
| `matterUrl` | `string\|null` | Full URL to the matter in Manage (e.g. `"https://manage.obviously.com/a/matters/123"`), or `null` if the base URL couldn't be fetched |

### `ptManageUI.close()`

Closes the modal programmatically.

### `ptManageUI.getSelectedMatter()`

Returns the currently selected matter object, or `null` if none is selected.

## Modal Features

- **Matter search** — type-ahead with 400ms debounce, searches via `ptManage.searchMatters()`. Displays ref number, title, status, and primary contact for each result.
- **Format selection** — DOCX, PDF, MD, TXT, HTML
- **Auto-generated filename** — based on the document title and selected format; updates when the format changes.
- **Plain text conversion** — automatically strips markdown formatting when TXT format is selected.

## Example: Adding to an Export Menu

```html
<!-- Button to trigger export -->
<button onclick="openManageExport()">Export to Manage</button>

<!-- Optional: show matter link after export -->
<div id="manage-export-link" class="hidden">
    Exported to Manage: <a id="manage-export-url" href="#" target="_blank"></a>
</div>
```

```javascript
function openManageExport() {
  if (!currentContent) {
    showToast('No content to export', 'error');
    return;
  }

  const doOpen = () => {
    ptManageUI.open({
      getContent: () => currentContent,
      getTitle: () => currentTitle || 'document',
      onSuccess: (matterRef, matter, result, matterUrl) => {
        showToast(`Exported to Manage: ${matterRef}`, 'success');
        // Optionally show clickable link
        if (matterUrl) {
          const linkEl = document.getElementById('manage-export-link');
          const urlEl = document.getElementById('manage-export-url');
          urlEl.href = matterUrl;
          urlEl.textContent = matterUrl;
          linkEl.classList.remove('hidden');
        }
      },
      onError: (msg) => showToast(msg, 'error')
    });
  };

  if (typeof window.ptManageUI !== 'undefined') {
    doOpen();
  } else {
    const script = document.createElement('script');
    script.src = '/static/primethink_manage_ui.js';
    script.onload = () => doOpen();
    script.onerror = () => showToast('Failed to load Manage UI library', 'error');
    document.head.appendChild(script);
  }
}
```

## Technical Notes

- **DOM injection** — the modal is appended inside `#app` if it exists, otherwise `document.body`. All element IDs are prefixed with `ptmui-` to avoid collisions.
- **Z-index** — uses inline `z-index: 9999` to ensure it renders above all app content.
- **Click handling** — clicking the backdrop closes the modal; clicks on the modal card itself are stopped via `event.stopPropagation()`.
- **Lazy loading** — `primethink_manage.js` is only loaded on the first search, not on script load.
- **Matter URL** — built by calling `ptManage.getBaseUrl()` and appending `/a/matters/<matter_id>`.

---

**Last Updated:** July 25, 2026
**Version:** 20260725
