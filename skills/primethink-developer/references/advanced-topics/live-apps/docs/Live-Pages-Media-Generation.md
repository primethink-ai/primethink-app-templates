# Media Generation in Live Pages

Learn how to generate images and audio from your Live Pages applications using the PrimeThink media generation API.

## Overview

Live Pages can generate media content directly from JavaScript using the `pt` API. This enables powerful use cases like:
- Creating custom graphics and visualizations
- Generating product images from descriptions
- Creating voice narration for content
- Building text-to-speech interfaces
- Generating audio from dialogue scripts

## Image Generation

### pt.generateImage(options)

Generate AI-powered images from text descriptions.

**Parameters:**
- `prompt` (string, required): Text description of the image to generate
- `provider` (string, optional): Provider - `'auto'`, `'openai'`, or `'google'` (default: user setting or `'auto'`)
- `style` (string, optional): Image style (default: `"realistic"`)
- `size` (string, optional): Image dimensions (default: `"1024x1024"`)
- `reference_images` (array, optional): Array of reference image URLs
- `reference_weight` (number, optional): Influence of reference images 0.0-1.0 (default: `0.5`)
- `folder` (string, optional): Destination folder for saving the image (default: `"images"`)
- `count` (number, optional): Number of images to generate 1-4 (default: `1`)
- `negative_prompt` (string, optional): What to avoid in the image
- `name` (string, optional): Custom filename for the generated image (without extension)

**Supported Image Sizes:**
- `auto` - Automatically determine optimal size
- `1024x1024` - Square format
- `1536x1024` - Landscape format
- `1024x1536` - Portrait format
- `256x256` - Small square
- `512x512` - Medium square
- `1792x1024` - Wide landscape
- `1024x1792` - Tall portrait

**Returns:** Promise that resolves to:
```javascript
{
    success: true,
    message: "Image/s generated and saved to the 'images' folder",
    images: [
        { name: "generated-image.png", path: "/images" }
    ]
}
```

**Usage:**

```javascript
// Basic image generation
await pt.generateImage({
    prompt: "A serene mountain landscape at sunset with a lake reflection",
    size: "1536x1024"
});

// With style and negative prompt
await pt.generateImage({
    prompt: "A modern minimalist office interior",
    style: "realistic",
    size: "1024x1024",
    negative_prompt: "people, clutter, mess, dark"
});

// Using reference images for style consistency
await pt.generateImage({
    prompt: "A product photo of a coffee mug",
    reference_images: ["https://example.com/style-reference.jpg"],
    reference_weight: 0.7,
    size: "1024x1024"
});

// Generate multiple variations
await pt.generateImage({
    prompt: "Abstract geometric patterns with vibrant colors",
    size: "1024x1024",
    count: 4
});

// Organize images in folders
await pt.generateImage({
    prompt: "Company logo design with mountain theme",
    size: "1024x1024",
    folder: "logos/concepts"
});

// With custom filename
const result = await pt.generateImage({
    prompt: "Product hero image for homepage",
    name: "hero-banner",
    folder: "marketing"
});
// result.images = [{ name: "hero-banner.png", path: "/marketing" }]

// Specify provider
await pt.generateImage({
    prompt: "Photorealistic landscape",
    provider: "openai",
    size: "1536x1024"
});

// Interactive image generator
async function generateUserImage() {
    const prompt = document.getElementById('promptInput').value;
    const size = document.getElementById('sizeSelect').value;
    const style = document.getElementById('styleSelect').value;

    if (!prompt) {
        alert('Please enter a description');
        return;
    }

    const button = document.getElementById('generateBtn');
    button.disabled = true;
    button.textContent = 'Generating...';

    try {
        await pt.generateImage({
            prompt: prompt,
            style: style,
            size: size
        });

        alert('Image generated successfully! Check the chat for the result.');
    } catch (error) {
        console.error('Image generation failed:', error);
        alert('Failed to generate image. Please try again.');
    } finally {
        button.disabled = false;
        button.textContent = 'Generate Image';
    }
}

// Generate product mockups
async function generateProductMockup(productData) {
    const prompt = `Professional product photo of ${productData.name}, ${productData.description},
                   studio lighting, white background, high quality, commercial photography`;

    return await pt.generateImage({
        prompt: prompt,
        size: "1024x1024",
        negative_prompt: "blurry, low quality, watermark, text, logo",
        folder: `products/${productData.category}`
    });
}

// Batch generate images
async function generateImageSet(prompts) {
    const results = [];

    for (const prompt of prompts) {
        try {
            const result = await pt.generateImage({
                prompt: prompt,
                size: "1024x1024"
            });
            results.push({ success: true, prompt, result });
        } catch (error) {
            results.push({ success: false, prompt, error: error.message });
        }
    }

    const successful = results.filter(r => r.success).length;
    alert(`Generated ${successful} of ${prompts.length} images`);

    return results;
}
```

**Best Practices:**

1. **Write Descriptive Prompts:**
   - Be specific about composition, lighting, colors, and mood
   - Include style keywords like "photorealistic", "cinematic", "watercolor"
   - Add quality descriptors: "highly detailed", "professional photography"

2. **Use Negative Prompts:**
   - Always specify what to avoid: "blurry", "low quality", "distorted"
   - Exclude unwanted elements: "text", "watermark", "people" (if not needed)

3. **Choose Appropriate Sizes:**
   - Square (`1024x1024`) for social media, avatars, icons
   - Landscape (`1536x1024`) for headers, banners
   - Portrait (`1024x1536`) for mobile wallpapers

4. **Reference Images:**
   - Use 0.5-0.7 reference weight for balanced results
   - Multiple references blend their characteristics
   - Good for maintaining brand visual consistency

**Common Use Cases:**
- Product visualization
- Marketing materials
- Concept art and designs
- Social media graphics
- Illustrated content
- Custom backgrounds and textures

---

## Audio/Voice Generation

### pt.generateVoice(options)

Generate natural-sounding speech from text or dialogue scripts.

**Parameters:**
- `text` (string, optional*): Text to convert to speech (for single-voice content)
- `dialogue` (array, optional*): Array of speaker objects (for multi-voice content)
- `voice` (string, optional): Voice ID or name
- `instructions` (string, optional): Voice style and delivery instructions
- `model` (string, optional): TTS model to use
- `provider` (string, optional): Provider - `"openai"`, `"google"`, or `"elevenlabs"`
- `folder` (string, optional): Destination folder for saving audio (default: `"audio"`)
- `streaming` (boolean, optional): Enable streaming response (default: `false`)
- `name` (string, optional): Custom filename for the generated audio (without extension)

*Either `text` or `dialogue` must be provided.

**Dialogue Item Structure:**
```javascript
{
    speaker: "Speaker Name",
    text: "What the speaker says",
    voice_id: "voice-id",
    description: "Optional speaker description for tone/emotion"
}
```

**OpenAI Voices:**
- `alloy` - Neutral and balanced
- `echo` - Male, clear and articulate
- `fable` - Warm and expressive
- `onyx` - Deep and authoritative
- `nova` - Energetic and bright
- `shimmer` - Soft and gentle

**Returns:** Promise that resolves to:
```javascript
{
    success: true,
    message: "Audio file is generated and saved to the 'audio' folder",
    voice: { name: "generated-audio.mp3", path: "/audio" }
}
```

**Usage:**

```javascript
// Basic text-to-speech
await pt.generateVoice({
    text: "Welcome to PrimeThink. This is a demonstration of our text to speech system.",
    voice: "alloy",
    provider: "openai"
});

// With voice instructions
await pt.generateVoice({
    text: "This is an important security announcement. Please update your password immediately.",
    voice: "onyx",
    instructions: "Speak with authority and urgency, emphasizing 'important' and 'immediately'",
    provider: "openai"
});

// Multi-speaker dialogue
await pt.generateVoice({
    provider: "openai",
    dialogue: [
        {
            speaker: "Host",
            text: "Welcome to today's podcast. We're discussing AI in business.",
            voice_id: "fable",
            description: "enthusiastic and welcoming"
        },
        {
            speaker: "Guest",
            text: "Thanks for having me. It's a fascinating topic.",
            voice_id: "echo",
            description: "professional and knowledgeable"
        },
        {
            speaker: "Host",
            text: "Let's start with the basics. What exactly is machine learning?",
            voice_id: "fable",
            description: "curious and engaged"
        }
    ]
});

// Save to specific folder
await pt.generateVoice({
    text: "Chapter 1: The Beginning. In a distant galaxy...",
    voice: "onyx",
    instructions: "Use a storytelling voice with dramatic pauses",
    folder: "audiobooks/chapter1"
});

// With custom filename
const result = await pt.generateVoice({
    text: "Welcome to our application",
    voice: "alloy",
    name: "welcome-audio"
});
// result.voice = { name: "welcome-audio.mp3", path: "/audio" }

// Interactive voice generator
async function generateNarration() {
    const text = document.getElementById('narrationText').value;
    const voice = document.getElementById('voiceSelect').value;
    const instructions = document.getElementById('instructionsInput').value;

    if (!text) {
        alert('Please enter text to narrate');
        return;
    }

    const button = document.getElementById('generateVoiceBtn');
    button.disabled = true;
    button.textContent = 'Generating...';

    try {
        await pt.generateVoice({
            text: text,
            voice: voice,
            instructions: instructions,
            provider: "openai"
        });

        alert('Audio generated successfully! Check the chat for the audio file.');
    } catch (error) {
        console.error('Voice generation failed:', error);
        alert('Failed to generate audio. Please try again.');
    } finally {
        button.disabled = false;
        button.textContent = 'Generate Voice';
    }
}

// Generate voice for notifications
async function speakNotification(message, priority = 'normal') {
    const voices = {
        low: { voice: 'alloy', instructions: 'calm and neutral' },
        normal: { voice: 'nova', instructions: 'clear and friendly' },
        high: { voice: 'onyx', instructions: 'urgent and serious' }
    };

    const config = voices[priority];

    return await pt.generateVoice({
        text: message,
        voice: config.voice,
        instructions: config.instructions,
        provider: "openai",
        folder: "notifications"
    });
}

// Generate podcast from script
async function generatePodcast(script) {
    const dialogue = script.segments.map(segment => ({
        speaker: segment.speaker,
        text: segment.text,
        voice_id: segment.voice || 'alloy',
        description: segment.emotion || 'neutral'
    }));

    return await pt.generateVoice({
        provider: "openai",
        dialogue: dialogue,
        folder: `podcasts/${script.episode}`
    });
}

// Usage
await generatePodcast({
    episode: "ep01",
    segments: [
        {
            speaker: "Alex",
            text: "Hello and welcome to TechTalk!",
            voice: "nova",
            emotion: "excited and energetic"
        },
        {
            speaker: "Jordan",
            text: "Great to be here. Let's dive into today's topic.",
            voice: "echo",
            emotion: "professional and confident"
        }
    ]
});

// Generate audio guide
async function generateAudioGuide(steps) {
    const text = steps.map((step, index) =>
        `Step ${index + 1}: ${step}`
    ).join('. ');

    return await pt.generateVoice({
        text: text,
        voice: "alloy",
        instructions: "Speak clearly and slowly, pause between steps",
        provider: "openai",
        folder: "guides"
    });
}
```

**Best Practices:**

1. **Write for Speaking:**
   - Use conversational language, not formal writing
   - Include punctuation for natural pauses
   - Break long sentences into shorter ones
   - Avoid complex abbreviations

2. **Choose Appropriate Voices:**
   - Professional/Business: `echo`, `onyx`
   - Friendly/Marketing: `nova`, `alloy`
   - Storytelling: `fable`, `onyx`
   - Calm/Meditation: `shimmer`

3. **Use Voice Instructions:**
   - Specify emotion: "excited", "serious", "calm"
   - Control pacing: "speak slowly", "energetic"
   - Add emphasis: "emphasize key words"

4. **Multi-Speaker Dialogue:**
   - Use distinct voices for different speakers
   - Include descriptions for consistent characterization
   - Keep exchanges relatively short (1-3 sentences)

**Common Use Cases:**
- Content narration
- Podcast generation
- Interactive voice responses
- Accessibility features
- Educational content
- Automated announcements
- Audiobook creation

---

## Audio Diarization

### pt.diarizeAudio(options)

Transcribe an audio document in the chat with speaker diarization. Produces a timestamped, speaker-labelled transcript saved as a markdown document.

**Parameters:**
- `document_id` (number, required): ID of the audio document in the chat to transcribe
- `speaker_count` (number, optional): Number of distinct speakers (1-20). Leave empty to auto-detect.
- `extra_instructions` (string, optional): Extra instructions for the model (language hints, speaker names, etc.)
- `folder` (string, optional): Destination folder for the transcript (default: `"transcripts"`)
- `filename` (string, optional): Custom filename for the transcript. Defaults to `<audio_name>_transcript.md`. (Note: this method uses `filename`, unlike `generateImage`/`generateVoice` which use `name`.)

**Supported Audio Formats:** MP3, WAV, M4A, OGG, FLAC, AAC, WEBM, OPUS

**Returns:** Promise that resolves to:
```javascript
{
    success: true,
    message: "Diarized transcript saved to the 'transcripts' folder",
    transcript: "[00:00] Speaker 1: Hello everyone...\n[00:05] Speaker 2: Thanks...",
    documents: [
        { id: 789, uuid: "...", name: "meeting_transcript.md", path: "/transcripts" }
    ]
}
```

**Usage:**

```javascript
// Basic diarization with auto-detected speakers
const result = await pt.diarizeAudio({
    document_id: 456
});
console.log(result.transcript);

// Specify speaker count for a known 3-person meeting
await pt.diarizeAudio({
    document_id: 456,
    speaker_count: 3
});

// With language and speaker name hints
await pt.diarizeAudio({
    document_id: 456,
    speaker_count: 2,
    extra_instructions: "The audio is in Italian. Speakers are Marco and Giulia."
});

// Save to custom folder with custom filename
await pt.diarizeAudio({
    document_id: 456,
    folder: "meetings/2024-03",
    filename: "team-standup-march-15"
});

// Full workflow: find audio document and diarize
async function transcribeMeeting() {
    const dir = await pt.listDirectory('/');
    const audioDoc = dir.entries.find(e => e.type === 'file' && e.name.endsWith('.m4a'));

    if (!audioDoc) {
        alert('No audio document found');
        return;
    }

    const btn = document.getElementById('transcribeBtn');
    btn.disabled = true;
    btn.textContent = 'Transcribing...';

    try {
        const result = await pt.diarizeAudio({
            document_id: audioDoc.id,
            speaker_count: 2,
            folder: "transcripts/meetings"
        });
        alert(`Transcript saved: ${result.documents[0].name}`);
    } catch (error) {
        alert('Diarization failed: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Transcribe Meeting';
    }
}
```

**Best Practices:**

1. **Audio Quality:** Higher quality audio with minimal background noise yields better results.
2. **Speaker Count:** Provide `speaker_count` when known for more accurate speaker separation.
3. **Extra Instructions:** Use for language hints, known speaker names, or recording context.
4. **File Organization:** Use meaningful folder paths and filenames for easy retrieval of transcripts.

**Common Use Cases:**
- Meeting transcription with speaker attribution
- Interview and podcast transcription
- Call center recording analysis
- Lecture and presentation notes
- Legal deposition records

---

## Realtime Speech-to-Text (ElevenLabs Scribe v2)

PrimeThink provides built-in support for realtime speech-to-text via ElevenLabs Scribe v2. The `pt.sttStreamToken()` method handles authentication server-side, so no API keys are exposed in client code.

### How It Works

1. `pt.sttStreamToken()` requests a single-use token from the PrimeThink server (which calls ElevenLabs internally)
2. The token is passed to the ElevenLabs Scribe SDK which opens a WebSocket connection
3. The SDK captures microphone audio and streams it to ElevenLabs
4. Two event types come back: `partial_transcript` (in-progress, may change) and `committed_transcript` (final, locked in)
5. Token expires after 15 minutes

### pt.sttStreamToken()

Generate a single-use ElevenLabs Scribe token for realtime speech-to-text.

**Parameters:** None

**Requirements:** `ELEVENLABS_API_KEY` must be configured in the group or user settings.

**Returns:** Promise that resolves to:

| Field | Description |
|-------|-------------|
| `token` | Single-use authentication token for the WebSocket connection |
| `websocket_url` | The ElevenLabs Scribe WebSocket URL (used internally by SDK) |

```javascript
const tokenData = await pt.sttStreamToken();
// Returns: { token: "...", websocket_url: "..." }
```

### Step 1: Load the ElevenLabs SDK

Add a module script tag to load the Scribe client from CDN. Store it on `window` so your inline script can access it:

```html
<script type="module">
    import { Scribe } from 'https://esm.sh/@elevenlabs/client';
    window.ElevenLabsScribe = Scribe;
    window.dispatchEvent(new Event('elevenlabs-sdk-loaded'));
</script>
```

### Step 2: State Tracking

```javascript
let transcribeState = {
    isRecording: false,
    scribe: null        // holds the active Scribe connection
};

// The text input the transcript is written into — adapt the ID to your app
const inputEl = document.getElementById('messageInput');
```

### Step 3: Start Transcription

```javascript
async function startTranscribe() {
    try {
        // Wait for SDK to load (module scripts are async)
        if (!window.ElevenLabsScribe) {
            await new Promise(resolve => {
                if (window.ElevenLabsScribe) resolve();
                else window.addEventListener('elevenlabs-sdk-loaded', resolve, { once: true });
            });
        }

        // Get a single-use token from the PrimeThink server
        const tokenData = await pt.sttStreamToken();
        if (!tokenData?.token) throw new Error('Failed to get STT stream token');

        // Connect to ElevenLabs Scribe — SDK handles microphone access
        transcribeState.scribe = await window.ElevenLabsScribe.connect({
            token: tokenData.token,
            languageCode: 'en',           // or 'es', 'fr', etc.
            modelId: 'scribe_v2_realtime',
            microphone: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        // Track committed (finalized) text separately from partials
        let committedText = '';

        // Partial transcripts — live preview, may change as more audio comes in
        transcribeState.scribe.on('partial_transcript', (data) => {
            if (data.text) {
                let partial = data.text;
                // Scribe sometimes wraps text in quotes — strip them
                if (partial.startsWith('"') && partial.endsWith('"')) partial = partial.slice(1, -1);
                inputEl.value = committedText + (committedText ? ' ' : '') + partial;
            }
        });

        // Committed transcripts — finalized text, won't change
        transcribeState.scribe.on('committed_transcript', (data) => {
            let text = (data.text || '').trim();
            if (!text) return;
            // Strip surrounding quotes (Scribe quirk)
            if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1).trim();
            if (!text) return;
            committedText = (committedText ? committedText + ' ' : '') + text;
            inputEl.value = committedText;
        });

        // Handle errors
        transcribeState.scribe.on('error', (error) => {
            console.error('Scribe error:', error);
            stopTranscribe();
        });

        transcribeState.isRecording = true;

    } catch (err) {
        console.error('Failed to start transcription:', err);
        cleanupTranscribe();
    }
}
```

### Step 4: Stop Transcription and Cleanup

```javascript
async function stopTranscribe() {
    transcribeState.isRecording = false;
    cleanupTranscribe();

    // Optionally auto-send the transcribed text
    // (sendMessage() is your app's own send function, e.g. one that calls pt.addMessage)
    if (inputEl.value.trim()) {
        sendMessage();
    }
}

function cleanupTranscribe() {
    if (transcribeState.scribe) {
        transcribeState.scribe.close();
        transcribeState.scribe = null;
    }
}
```

### Step 5: Toggle Button

```javascript
async function toggleTranscribe() {
    if (transcribeState.isRecording) {
        await stopTranscribe();
    } else {
        await startTranscribe();
    }
}
```

### Key Concepts

| Concept | Details |
|---------|---------|
| **Partial vs Committed** | Partials update in real-time as the user speaks. Committed text is finalized and won't change. Always track them separately — display `committedText + partial` in the input. |
| **Quote stripping** | Scribe v2 sometimes wraps transcribed text in double quotes. Strip them from both partials and committed text. |
| **Language** | Set `languageCode` in `Scribe.connect()`. Scribe supports multilingual transcription (`'en'`, `'es'`, `'fr'`, etc.). |
| **Microphone** | The SDK handles `getUserMedia` internally when you pass `microphone: { ... }`. No need to manage MediaStream yourself. |
| **Token lifetime** | Each token from `pt.sttStreamToken()` expires after 15 minutes. For longer sessions, request a new token and reconnect. |
| **No API key needed** | `pt.sttStreamToken()` handles authentication server-side. Never expose ElevenLabs API keys in client code. |

### Scribe Events Reference

| Event | Callback data | Description |
|-------|---------------|-------------|
| `partial_transcript` | `{ text }` | In-progress transcription, updates as user speaks |
| `committed_transcript` | `{ text }` | Finalized text segment |
| `error` | `error` | Connection or transcription error |

### With AI Processing — Dictate and Summarize

Combine realtime STT with the [fire-and-forget pattern](Live-Pages-Best-Practices.md#async-fire-and-forget-pattern-for-ai-generation) to dictate and process in one flow:

```javascript
async function dictateAndProcess() {
    let committedText = '';

    // Start transcription (same setup as above)
    const tokenData = await pt.sttStreamToken();
    transcribeState.scribe = await window.ElevenLabsScribe.connect({
        token: tokenData.token,
        languageCode: 'en',
        modelId: 'scribe_v2_realtime',
        microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });

    transcribeState.scribe.on('committed_transcript', (data) => {
        let text = (data.text || '').trim();
        if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1).trim();
        if (!text) return;
        committedText = (committedText ? committedText + ' ' : '') + text;
        document.getElementById('transcript').textContent = committedText;
    });

    // When user clicks "Done", send transcript to AI for processing
    document.getElementById('done-btn').onclick = async () => {
        transcribeState.scribe.close();
        transcribeState.scribe = null;

        if (!committedText.trim()) return;

        // Use fire-and-forget to process the transcript
        const entity = await pt.add('dictation', {
            status: 'queued',
            transcript: committedText,
            summary: null
        });

        pt.addMessage(`TASK: Summarize this dictated transcript.
ENTITY ID: ${entity.id}

--- TRANSCRIPT ---
${committedText}
--- END ---

ACTUALLY CALL chatdb_edit with these exact parameters:
- entity_id: ${entity.id}
- data: {"status": "complete", "summary": "<your summary>"}
- merge: true
You MUST pass merge: true as a parameter.`);

        startPolling(entity.id);
    };
}

// Poll the placeholder entity until the AI marks it complete
function startPolling(entityId) {
    const timer = setInterval(async () => {
        const entity = await pt.get(entityId);
        if (entity.data.status === 'complete') {
            clearInterval(timer);
            document.getElementById('summary').textContent = entity.data.summary;
        }
    }, 8000);
}
```

**Common Use Cases:**
- Voice dictation for note-taking
- Real-time meeting transcription in Live Apps
- Voice-controlled data entry
- Accessibility features (speech input for forms)
- Live captioning

---

## Combining Media Generation

You can combine image and voice generation to create rich media experiences:

```javascript
// Generate illustrated story with narration
async function createIllustratedStory(storyData) {
    // Generate illustration
    await pt.generateImage({
        prompt: storyData.sceneDescription,
        style: "digital art, storybook illustration",
        size: "1536x1024",
        folder: `stories/${storyData.title}/images`
    });

    // Generate narration
    await pt.generateVoice({
        text: storyData.narrationText,
        voice: "fable",
        instructions: "warm storytelling voice with expressive emotion",
        folder: `stories/${storyData.title}/audio`
    });

    return {
        success: true,
        message: `Story "${storyData.title}" created with image and audio`
    };
}

// Generate product presentation
async function generateProductPresentation(product) {
    // Generate product image
    await pt.generateImage({
        prompt: `Professional product photo of ${product.name}, ${product.description},
                studio lighting, white background`,
        size: "1024x1024",
        folder: `products/${product.id}/images`
    });

    // Generate product description audio
    const script = `Introducing the ${product.name}. ${product.pitch}.
                   Available now for ${product.price}.`;

    await pt.generateVoice({
        text: script,
        voice: "nova",
        instructions: "enthusiastic marketing voice",
        folder: `products/${product.id}/audio`
    });

    alert('Product presentation generated!');
}

// Create video storyboard with voiceover
async function createStoryboard(scenes) {
    const results = [];

    for (const [index, scene] of scenes.entries()) {
        // Generate scene image
        const imageResult = await pt.generateImage({
            prompt: scene.visualDescription,
            size: "1536x1024",
            folder: `storyboard/scene-${index + 1}`
        });

        // Generate scene narration
        const audioResult = await pt.generateVoice({
            text: scene.narration,
            voice: scene.narratorVoice || "alloy",
            instructions: scene.tone || "neutral",
            folder: `storyboard/scene-${index + 1}`
        });

        results.push({
            scene: index + 1,
            image: imageResult,
            audio: audioResult
        });
    }

    return results;
}
```

## Error Handling

Always include error handling for media generation:

```javascript
async function safeGenerateMedia(type, options) {
    try {
        if (type === 'image') {
            return await pt.generateImage(options);
        } else if (type === 'voice') {
            return await pt.generateVoice(options);
        }
    } catch (error) {
        console.error(`${type} generation failed:`, error);

        // Show user-friendly error
        const errorMessages = {
            'Rate limit exceeded': 'Too many requests. Please wait a moment and try again.',
            'Invalid prompt': 'Please provide a valid description.',
            'Network error': 'Connection issue. Please check your internet and try again.'
        };

        const message = errorMessages[error.message] ||
                       `Failed to generate ${type}. Please try again.`;

        alert(message);
        return { success: false, error: error.message };
    }
}

// Usage
await safeGenerateMedia('image', {
    prompt: userInput,
    size: "1024x1024"
});
```

## Rate Limiting

Be mindful of rate limits:
- Implement delays between batch generations
- Show loading states to users
- Cache generated content when possible
- Use appropriate retry logic with exponential backoff

```javascript
// Batch generation with rate limiting
async function generateImagesWithRateLimit(prompts, delayMs = 2000) {
    const results = [];

    for (const [index, prompt] of prompts.entries()) {
        console.log(`Generating image ${index + 1}/${prompts.length}`);

        const result = await pt.generateImage({ prompt, size: "1024x1024" });
        results.push(result);

        // Wait before next generation (except for last item)
        if (index < prompts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return results;
}
```

## Next Steps

- **[Data Management API](Data-Management-API.md)** - Learn about entity CRUD operations
- **[Best Practices](Live-Pages-Best-Practices.md)** - Optimize your Live Pages
- **[Complete Examples](Live-Pages-Examples.md)** - See media generation in action
