# Video Analysis API

Analyze and convert video content to text using PrimeThink's video analysis APIs. These tools enable you to extract structured descriptions, keyframes, and transcripts from video files.

## Overview

PrimeThink provides several video processing capabilities:

- **Video Analysis** - Analyze video content using Gemini with optional extra instructions
- **Video-to-Text** - Convert video to structured text descriptions using two strategies
- **Keyframe Extraction** - Extract scene-change keyframes from video as individual images (AI assistant tool)

## Authentication

All API requests require authentication. See [API Authentication](API-Auth.md) for details on obtaining and using your API key.

## API Endpoints

For complete API specifications, see the [Interactive API Documentation](https://api.primethink.ai/pt-docs).

### POST `/api/v1/video/analyze`

Analyze a video using Gemini. Returns a text description/analysis of the video content.

**Parameters (multipart/form-data):**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | Yes | Video file to analyze |
| `extra_instructions` | string | No | Additional instructions for the analysis model |

### POST `/api/v1/video/video-to-text`

Convert a video to a structured text description. Supports two conversion methods and accepts either a file upload or an existing document ID.

**Parameters (multipart/form-data):**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | No* | Video file to analyze |
| `document_id` | integer | No* | ID of an existing video document |
| `method` | string | No | Conversion method: `"full_video"` (default) or `"frames_plus_audio"` |
| `model` | string | No | Override the default LLM model |
| `extra_instructions` | string | No | Additional instructions for the analysis |

*Provide exactly one of `file` or `document_id`.

**Conversion Methods:**

| Method | Description | Best For |
|--------|-------------|----------|
| `full_video` | Uploads the entire video to Gemini for analysis | Short to medium videos, when Gemini/Google API key is configured |
| `frames_plus_audio` | Extracts scene-change keyframes and combines them with audio transcript for multimodal analysis | Longer videos, when you want keyframe-level detail, or when Gemini is not available (falls back to OpenAI) |

**Response:**
```json
{
    "text": "## Summary\n\nThis video shows a product demo...\n\n## Key Points\n- ...\n\n## Timeline\n- [00:00] Opening scene...",
    "method": "full_video"
}
```

The structured response includes sections for Summary, Key Points, Timeline, Notable Details, and Conclusions.

## Quick Start Examples

### Basic Video Analysis

```bash
curl -X POST "https://api.primethink.ai/api/v1/video/analyze" \
  -H "Authorization: Token YOUR_API_KEY" \
  -F "file=@presentation.mp4"
```

### Video-to-Text (Full Video)

```bash
curl -X POST "https://api.primethink.ai/api/v1/video/video-to-text" \
  -H "Authorization: Token YOUR_API_KEY" \
  -F "file=@meeting-recording.mp4" \
  -F "method=full_video"
```

### Video-to-Text (Frames + Audio)

```bash
curl -X POST "https://api.primethink.ai/api/v1/video/video-to-text" \
  -H "Authorization: Token YOUR_API_KEY" \
  -F "file=@lecture.mp4" \
  -F "method=frames_plus_audio"
```

### Using an Existing Document

```bash
curl -X POST "https://api.primethink.ai/api/v1/video/video-to-text" \
  -H "Authorization: Token YOUR_API_KEY" \
  -F "document_id=123" \
  -F "method=frames_plus_audio" \
  -F "extra_instructions=Focus on the code examples shown on screen"
```

When using `document_id` with `frames_plus_audio`, if the document already has an extracted transcript, it is reused instead of re-transcribing the audio.

### With Extra Instructions

```bash
curl -X POST "https://api.primethink.ai/api/v1/video/video-to-text" \
  -H "Authorization: Token YOUR_API_KEY" \
  -F "file=@demo.mp4" \
  -F "method=full_video" \
  -F "extra_instructions=Pay special attention to the UI interactions and describe each screen transition"
```

## AI Assistant Tools

### Video Keyframe Extraction

The AI assistant has access to the `extract_video_keyframes` tool, which extracts scene-change keyframes from a video document and saves them as individual images in the chat.

**How to use it:**
Ask the AI assistant to extract keyframes from a video document in the chat. For example:

- "Extract keyframes from the video I just uploaded"
- "Get the key scenes from document #123"
- "Extract keyframes with high sensitivity from the presentation video"

**Parameters the assistant uses:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `document_id` | integer | required | ID of the video document in the chat |
| `sensitivity` | string | `"medium"` | Detection sensitivity: `"low"` (few keyframes, major scenes only), `"medium"` (balanced), `"high"` (many keyframes, catches subtle changes) |
| `folder` | string | `"keyframes"` | Destination folder for the extracted images |

**Sensitivity Levels:**

| Level | Description | Use Case |
|-------|-------------|----------|
| `low` | Detects only major scene changes, produces few keyframes | Long videos where you want a high-level overview |
| `medium` | Balanced detection, moderate number of keyframes | General purpose, most videos |
| `high` | Catches subtle changes, produces many keyframes | Short videos, detailed analysis, presentations with incremental slides |

The extracted keyframes are saved as JPEG images in the specified folder within the chat, and duplicate frames are automatically filtered out using perceptual hashing.

### Video Transcription

The AI assistant can also transcribe audio from video documents using the `transcribe_video` tool. This extracts the audio track and produces a text transcript.

## Best Practices

1. **Choosing a Method:**
   - Use `full_video` for short/medium videos when you need a holistic analysis
   - Use `frames_plus_audio` for longer videos or when visual keyframe detail matters

2. **Extra Instructions:** Be specific about what you want from the analysis. For example:
   - "Focus on the text shown on screen"
   - "Describe the speaker's body language"
   - "List all products shown in the video"

3. **Document Reuse:** When analyzing a video that's already uploaded to a chat, use `document_id` instead of re-uploading — this saves bandwidth and reuses existing transcripts.

4. **Keyframe Sensitivity:** Start with `medium` and adjust based on results. Use `low` for overview thumbnails and `high` for frame-by-frame analysis of presentations.

## Related Topics

- [Audio Generation API](Audio-Generation-API.md) - Speech-to-text transcription
- [Audio Diarization API](Audio-Diarization-API.md) - Speaker-labelled transcription
- [Media Generation in Live Pages](Live-Pages-Media-Generation.md) - Media generation from Live Pages
