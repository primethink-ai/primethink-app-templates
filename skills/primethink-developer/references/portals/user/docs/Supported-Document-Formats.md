# Supported Document Formats

PrimeThink supports a wide variety of document formats for upload and processing. When you upload a document, the system automatically extracts the text content and makes it available to AI assistants in your chats.

## Document Text Extraction Process

When you upload a document, PrimeThink automatically extracts text content in Markdown format for supported file types. This extraction process is **asynchronous** and happens in the background.

### How Extraction Works

1. **Upload**: When a file is uploaded, it receives an initial status of `"Added"`
2. **Processing**: The system begins extracting text content asynchronously
3. **Completion**: Once extraction is complete, the status advances through `"Loaded"`, `"Processed"`, and finally `"Ready"`
4. **Error Handling**: If extraction fails, the status becomes `"Error"`

### Extraction Timing

- **Processing Time**: Varies from a few seconds to longer depending on:
  - File size (larger files take longer)
  - File complexity (scanned PDFs with OCR take longer than text-based documents)
  - System load

- **Status Indicators**:
  - `"Added"` = Extraction not yet started or in progress
  - `"Error"` = Extraction failed
  - Any other status (`"Loaded"`, `"Processed"`, `"Ready"`) = Extraction complete, text available

See [Document Management](Documents-and-Collections-in-Chats.md) for the full description of each status.

### Extracted Content Format

The extracted text is converted to **Markdown format**, which includes:
- Document structure (headings, paragraphs)
- Tables (for spreadsheets and documents with tables)
- Basic formatting (bold, italic, lists)
- Text from images (via OCR or AI vision)
- Transcriptions (for audio/video files)

### Checking Extraction Status

To check if a document's text has been extracted:
- Check the document's `status` field in API responses
- Use `pt.getDocumentStatus(docId)` in live apps
- Any status other than `"Added"` or `"Error"` indicates extraction is complete

For programmatic workflows in live apps, see [Data Management API](/admin/Data-Management-API/) for details on checking status and retrieving extracted text.

## Document Files

| Format | Extensions | Description |
|--------|------------|-------------|
| PDF | `.pdf` | Portable Document Format with OCR support for scanned documents |
| Word | `.doc`, `.docx` | Microsoft Word documents (both legacy and modern formats) |
| Plain Text | `.txt` | Simple text files |
| Markdown | `.md` | Markdown formatted text |
| HTML | `.html`, `.htm` | Web pages and HTML content |

**PDF Processing:** PrimeThink can extract text from both digital PDFs and scanned documents using optical character recognition (OCR).

## Spreadsheets

| Format | Extensions | Description |
|--------|------------|-------------|
| Excel | `.xls`, `.xlsx` | Microsoft Excel spreadsheets (both legacy and modern formats) |
| CSV | `.csv` | Comma-separated values |

## Presentations

| Format | Extensions | Description |
|--------|------------|-------------|
| PowerPoint | `.ppt`, `.pptx` | Microsoft PowerPoint presentations (both legacy and modern formats) |

## Data Files

| Format | Extensions | Description |
|--------|------------|-------------|
| JSON | `.json` | JavaScript Object Notation |
| XML | `.xml` | Extensible Markup Language |

## Images

| Format | Extensions | Description |
|--------|------------|-------------|
| JPEG | `.jpg`, `.jpeg` | Standard image format |
| PNG | `.png` | Portable Network Graphics |
| GIF | `.gif` | Graphics Interchange Format |
| BMP | `.bmp` | Bitmap images |
| WebP | `.webp` | Modern web image format |

**Image Processing:** PrimeThink uses AI vision to extract text from images and generate descriptions of image content.

## Audio and Video

| Format | Extensions | Description |
|--------|------------|-------------|
| MP3 | `.mp3` | Audio files |
| M4A | `.m4a` | Apple audio format |
| WAV | `.wav` | Waveform audio |
| MP4 | `.mp4` | Video files |

**Audio/Video Processing:** Audio and video files are automatically transcribed to text, making spoken content searchable and accessible to AI assistants.

## Email Files

| Format | Extensions | Description |
|--------|------------|-------------|
| Email | `.eml` | Standard email message files |

**Email Processing:** The system extracts email headers (From, To, Subject, Date), body content, and lists any attachments.

## Archives

| Format | Extensions | Description |
|--------|------------|-------------|
| ZIP | `.zip` | Compressed archive files |

**Archive Processing:** ZIP files are automatically extracted, and each file within the archive is processed individually.

## Web Content

| Type | Description |
|------|-------------|
| URLs | Paste any web URL to automatically fetch and extract its content |
| YouTube Videos | YouTube links are processed to extract video metadata, descriptions, and transcripts when available |

## File Size Limits

- **Maximum file size:** 50 MB per file
- **ZIP archives:** Subject to limits on total uncompressed size and file count

## Tips for Best Results

1. **Use text-based formats when possible** - Digital documents (like `.docx`) typically yield better results than scanned PDFs.

2. **Ensure good image quality** - For images containing text, higher resolution images produce more accurate text extraction.

3. **Check audio quality** - Clear audio recordings with minimal background noise transcribe more accurately.

4. **Name files descriptively** - Use meaningful filenames to help organize and identify your documents.

## Related Topics

- [Document Management](Documents-and-Collections-in-Chats.md) - Learn how to manage documents in chats
- [Managing Document Visibility](Managing-Document-Visibility.md) - Control how AI assistants access your documents
- [Collections](Collections.md) - Organize documents into collections
