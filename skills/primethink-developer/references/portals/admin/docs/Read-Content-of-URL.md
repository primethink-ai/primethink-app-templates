# Read Content of URL

The **Read Content of URL** tool lets your assistant fetch a web address and work with whatever is there — a web page, a plain-text or data file, or a downloadable document. It's one of the core `base` tools, so it's available to almost every agent.

## What it does

When you give your assistant a link, it fetches the address and figures out what kind of content it found:

- A **web page** → it pulls out the main content as clean, readable text (skipping menus, ads, and boilerplate).
- A **text or data file** (plain text, Markdown, JSON, XML, and similar) → it hands you the content exactly as written, untouched.
- A **file you'd normally download** (PDF, image, Word or Excel document, ZIP, and so on) → it saves the file straight into your chat as a document and starts extracting its text, so you can ask questions about it right away.

## How to use it

Just share a link and tell your assistant what you want:

```
"Read https://example.com/blog/post and give me a 5-bullet summary."
```

```
"Fetch this release notes page and tell me what changed since version 2.0."
```

```
"Download the PDF at https://example.com/report.pdf and pull out the key figures."
```

You don't need to specify the tool or the content type — the assistant recognizes the link and handles the rest.

## What happens with different kinds of content

The tool adapts to whatever it finds at the address:

| You point it at… | What you get |
|------------------|--------------|
| A web page (HTML) | The main article/content as readable text, returned in the chat. |
| A plain-text, Markdown, JSON, or XML file | The content returned exactly as-is — nothing reformatted or stripped. |
| A downloadable file (PDF, image, DOCX, XLSX, ZIP, …) | The file saved into your chat as a document, with text extraction started automatically. |

!!! tip "Why text files come back untouched"
    Returning text and data files verbatim means pages like `llms.txt`, raw Markdown, or API responses arrive intact — exactly as the source published them, with no web-page cleanup applied.

## Saving a page into a folder

By default, web-page content is read straight into the conversation and files are saved to the top level of your chat. You can also ask for the result to be filed into a specific folder:

```
"Read https://example.com/guide and save it into the 'Research' folder."
```

When you save a **web page** into a folder, you get two documents: the original page and a cleaned-up, readable copy. For a **text or downloadable file**, the original is saved as-is.

## Keeping or dropping images

When reading a web page, the assistant can keep image references in the extracted text or leave them out. Images are kept by default; if you only want the words, just say so:

```
"Read this page but skip the images — text only."
```

## Good to know

- **Saving a file needs an active chat.** Downloadable files are saved as documents in your current conversation. If the assistant is working outside of a chat, it can still read web pages and text, but it can't save a file.
- **Very large or slow downloads may time out.** The tool fetches quickly; an extremely large file or a slow server may not finish in time.
- **Saved files are processed automatically.** Once a document lands in your chat, text extraction runs in the background. See [Supported Document Formats](/Supported-Document-Formats/) for what can be extracted.

## Related Topics

- [Internal Tools](Internal-Tools.md) — overview of the assistant's built-in tools
- [Internal Capabilities](Internal-Capabilities.md) — the `base` capability that provides this tool
- [Documents & Collections](/Documents-and-Collections-in-Chats/) — working with files saved in a chat
- [Supported Document Formats](/Supported-Document-Formats/) — which file types can be read and extracted
