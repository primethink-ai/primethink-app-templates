# Audio Diarization API

Transcribe audio files with speaker diarization using PrimeThink's diarization API. This produces timestamped, speaker-labelled transcripts from audio recordings.

## Overview

The Audio Diarization API uses Google Gemini to transcribe audio files while identifying and labelling individual speakers. It produces a markdown-formatted transcript with:
- `[MM:SS]` timestamps at each speaker turn
- Speaker labels (auto-detected or named)
- Verbatim transcription including filler words

This is ideal for meetings, interviews, podcasts, calls, and any multi-speaker audio content.

## Authentication

All API requests require authentication. See [API Authentication](API-Auth.md) for details on obtaining and using your API key.

## API Endpoint

### POST `/api/v1/voice/diarize`

Transcribe an uploaded audio file with speaker diarization.

**Parameters (multipart/form-data):**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | Yes | Audio file to transcribe |
| `speaker_count` | integer | No | Number of distinct speakers (1-20). Leave empty to auto-detect. |
| `extra_instructions` | string | No | Extra instructions for the model (language hints, speaker names, etc.) |

**Response:**
```json
{
    "text": "[00:00] Speaker 1: Hello everyone, welcome to the meeting.\n[00:05] Speaker 2: Thanks for joining us today.\n..."
}
```

**Supported Audio Formats:** MP3, WAV, M4A, OGG, FLAC, AAC, WEBM, OPUS

## Quick Start Examples

### Basic Diarization

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/diarize" \
  -H "Authorization: Token YOUR_API_KEY" \
  -F "file=@meeting.m4a"
```

### With Speaker Count

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/diarize" \
  -H "Authorization: Token YOUR_API_KEY" \
  -F "file=@interview.mp3" \
  -F "speaker_count=2"
```

### With Extra Instructions

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/diarize" \
  -H "Authorization: Token YOUR_API_KEY" \
  -F "file=@call.wav" \
  -F "speaker_count=2" \
  -F "extra_instructions=The audio is in Italian. Speakers are Marco and Giulia."
```

## Live App Action

The `diarize_audio` action allows Live Apps to transcribe audio documents already saved in a chat.

### Action Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `document_id` | integer | Yes | ID of the audio document in the chat |
| `speaker_count` | integer | No | Number of speakers (1-20). Leave empty to auto-detect. |
| `extra_instructions` | string | No | Extra instructions (language, speaker names, etc.) |
| `folder` | string | No | Destination folder for the transcript (default: `"transcripts"`) |
| `filename` | string | No | Custom filename for the transcript. Defaults to `<audio_name>_transcript.md` |

### Action Response

```json
{
    "success": true,
    "message": "Diarized transcript saved to the 'transcripts' folder",
    "transcript": "[00:00] Speaker 1: Hello everyone...\n[00:05] Speaker 2: Thanks for joining...",
    "documents": [
        { "id": 789, "uuid": "...", "name": "meeting_transcript.md", "path": "/transcripts" }
    ]
}
```

### Using pt.diarizeAudio()

The `pt.diarizeAudio()` convenience method wraps the `diarize_audio` action:

```javascript
// Basic diarization with auto-detected speakers
const result = await pt.diarizeAudio({
    document_id: 456
});
console.log(result.transcript);

// Specify speaker count
await pt.diarizeAudio({
    document_id: 456,
    speaker_count: 3
});

// With language hints and speaker names
await pt.diarizeAudio({
    document_id: 456,
    speaker_count: 2,
    extra_instructions: "The audio is in Italian. Speakers are Marco and Giulia."
});

// Save to a custom folder with a custom filename
await pt.diarizeAudio({
    document_id: 456,
    folder: "meetings/2024-03",
    filename: "team-standup-march-15"
});
```

### Full Workflow Example

```javascript
// List documents in the chat root, find the audio file, and diarize it
const dir = await pt.listDirectory('/');
const audioDoc = dir.entries.find(e => e.type === 'file' && e.name.endsWith('.m4a'));

if (audioDoc) {
    const result = await pt.diarizeAudio({
        document_id: audioDoc.id,
        speaker_count: 2,
        folder: "transcripts/meetings"
    });
    console.log('Transcript saved:', result.documents[0].name);
}
```

### Interactive Live Page Example

```html
<div class="p-4">
    <h2 class="text-lg font-bold mb-4">Audio Diarization</h2>
    <div class="space-y-3">
        <div>
            <label class="block text-sm font-medium">Document ID</label>
            <input type="number" id="docId" class="border rounded px-3 py-2 w-full"
                   placeholder="Enter the audio document ID" />
        </div>
        <div>
            <label class="block text-sm font-medium">Speaker Count (optional)</label>
            <input type="number" id="speakerCount" min="1" max="20"
                   class="border rounded px-3 py-2 w-full"
                   placeholder="Leave empty to auto-detect" />
        </div>
        <div>
            <label class="block text-sm font-medium">Extra Instructions (optional)</label>
            <textarea id="extraInstructions" class="border rounded px-3 py-2 w-full"
                      placeholder="e.g., Language is Spanish. Speaker names: Ana, Carlos"></textarea>
        </div>
        <button id="diarizeBtn" onclick="runDiarization()"
                class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Transcribe Audio
        </button>
        <pre id="result" class="mt-4 p-3 bg-gray-100 rounded text-sm whitespace-pre-wrap hidden"></pre>
    </div>
</div>

<script>
async function runDiarization() {
    const docId = parseInt(document.getElementById('docId').value);
    const speakerCount = document.getElementById('speakerCount').value;
    const extraInstructions = document.getElementById('extraInstructions').value;
    const btn = document.getElementById('diarizeBtn');
    const resultEl = document.getElementById('result');

    if (!docId) {
        alert('Please enter a document ID');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Transcribing...';
    resultEl.classList.add('hidden');

    try {
        const options = { document_id: docId };
        if (speakerCount) options.speaker_count = parseInt(speakerCount);
        if (extraInstructions) options.extra_instructions = extraInstructions;

        const result = await pt.diarizeAudio(options);

        resultEl.textContent = result.transcript;
        resultEl.classList.remove('hidden');
    } catch (error) {
        alert('Diarization failed: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Transcribe Audio';
    }
}
</script>
```

## Best Practices

1. **Audio Quality:** Higher quality audio produces better transcriptions. Minimize background noise and ensure clear speaker separation.

2. **Speaker Count:** If you know the exact number of speakers, provide `speaker_count` for more accurate diarization. Leave it empty when uncertain — the model auto-detects reasonably well.

3. **Extra Instructions:** Use this for:
   - Specifying the language if not English
   - Providing known speaker names
   - Adding context about the recording (e.g., "This is a phone call between a customer and support agent")

4. **File Size:** The audio is uploaded to Gemini for processing. Very large files may take longer — consider splitting extremely long recordings if needed.

5. **Transcript Output:** The transcript is saved as a Markdown file. You can further process it, search through it, or use it as context for other AI tasks.

## Related Topics

- [Audio Generation API](Audio-Generation-API.md) - Text-to-speech and transcription
- [Media Generation in Live Pages](Live-Pages-Media-Generation.md) - Image and audio generation from Live Pages
- [Data Management API](Data-Management-API.md) - Working with documents and entities
