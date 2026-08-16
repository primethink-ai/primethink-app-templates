# Documents and Collections in Chats

- [Document Management](#document-management)
- [Supported Document Formats](Supported-Document-Formats.md)
- [Document Actions](Document-Actions.md)
- [Document Status Types](#document-status-types)
- [Collections](#collections)
- [Managing Document Visibility in Chats](#managing-document-visibility-in-chats)
- [Managing Document Visibility](Managing-Document-Visibility.md)

## Document Management

PrimeThink offers robust document handling capabilities within chats, allowing you to share and work with various types of content. You can upload and manage:

- **Document files** (PDF, Word, Excel, PowerPoint, and more) - See [Supported Document Formats](Supported-Document-Formats.md) for a complete list
- **Plain text** (pasted directly into the chat)
- **URLs** (which will be automatically scraped for their content)
- **Audio and video files** (which will be transcribed into text)

All uploaded documents are processed and indexed to make their content available to virtual assistants within the chat. This enables AI assistants to reference, analyze, and utilize document content in their responses.

### Document Text Extraction

When you upload a document, PrimeThink automatically extracts the text content in the background. This extraction process is **asynchronous**, meaning:

- **Timing**: Extraction takes a few seconds to complete, depending on file size and complexity
- **Background Processing**: The extraction happens automatically without blocking other operations
- **Status Updates**: The document's processing status updates as extraction progresses

The extracted text is converted to **Markdown format**, preserving document structure, formatting, tables, and other elements. For more details about the extraction process and supported formats, see [Supported Document Formats](Supported-Document-Formats.md).

You can also run [Document Actions](Document-Actions.md) on any document to quickly summarize, analyze, or process it with AI-powered tasks. On mobile devices, you can share documents directly from other apps into PrimeThink using Share Actions.

## Document Status Types

Each document in PrimeThink has two important status indicators that control how it's processed and used:

### 1. Processing Status

This status indicates where the document is in the processing pipeline:
- **Added** - The file has been uploaded to the system; text extraction has not yet completed
- **Loaded** - The text has been successfully extracted from the document
- **Processed** - The document text has been chunked into manageable sections
- **Ready** - The text has been fully indexed and is available for use
- **Error** - An issue occurred during one of the processing stages

**Important for Text Extraction**: Any status other than `"Added"` or `"Error"` indicates that text extraction is complete and the document's text content is available for retrieval. When programmatically working with documents (e.g., in live apps), you should wait for the status to change from `"Added"` before attempting to retrieve the document's text content.

### 2. Access Status

This status determines how virtual assistants can access and use the document:

- **Archived** - The document is only listed in the context, and the virtual assistant will need to explicitly use a tool to read it. This is useful for agentic retrieval where you want the assistant to intentionally access the document.

- **Search** - The system will automatically search the document based on the user's query and include relevant parts in the context. This enables Retrieval Augmented Generation (RAG), where the system intelligently fetches relevant document sections.

- **Context** - The system will place the entire document text (if it fits) directly in the context. This enables Context Augmented Generation (CAG), providing the assistant with the complete document content.

You can mix these status types across different documents in the same chat, creating a flexible environment where some documents are fully available while others require explicit retrieval.

## Collections

In addition to individual documents, PrimeThink allows you to associate entire document collections with a chat. Collections are organized sets of documents that can be:

- **Public collections** - Set up by the group administrator and visible to everyone in the group
- **Private collections** - Created by individual users and only visible to them

When you associate a collection with a chat, all documents within that collection become available to the virtual assistants in that chat, according to their respective accessibility status settings.

## Managing Document Visibility in Chats

PrimeThink's document system offers flexible options for controlling how information is accessed within chats. When uploading documents, text, URLs, or audio recordings (which get transcribed), you can choose how virtual assistants interact with this content by selecting the appropriate access status. This allows you to create an optimal knowledge environment for your specific use case.
The system offers three primary access options:

* Archived - Documents are listed in the context but require explicit tool use by the virtual assistant to access. Ideal for specific document lookup scenarios where you want intentional retrieval.
* Search - The system automatically searches documents based on user queries and includes relevant portions in the context (RAG approach). Perfect for large reference documents where only certain sections may be relevant.
* Context - The entire document text is placed directly in the context window if size permits (CAG approach). Best for smaller, highly relevant documents that should be considered in their entirety.

Read more about [Managing Document Visibility](Managing-Document-Visibility.md) to learn more about these options and how they impact optimal RAG and CAG performance.
