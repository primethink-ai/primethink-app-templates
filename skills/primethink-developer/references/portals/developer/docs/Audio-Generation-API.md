# Audio Generation API

Learn how to work with audio using PrimeThink's Audio Generation API. This guide focuses on best practices for text-to-speech generation, audio transcription, and creating natural-sounding voice content.

## Overview

The Audio Generation API provides powerful capabilities for:
- **Text-to-Speech (TTS)** - Convert text to natural-sounding speech in multiple voices
- **Speech-to-Text (STT)** - Transcribe audio files to text with high accuracy
- **Translation** - Transcribe and translate audio from any language to English
- **Streaming TTS** - Generate speech with real-time streaming for low-latency applications
- **Multi-speaker Dialogue** - Create conversations with different voices
- **Speaker Diarization** - Transcribe with speaker labels and timestamps (see [Audio Diarization API](Audio-Diarization-API.md))

Multiple providers are supported including OpenAI, Google Cloud TTS, and ElevenLabs.

## Authentication

All API requests require authentication. See [API Authentication](API-Auth.md) for details on obtaining and using your API key.

## API Endpoints Quick Reference

For complete API specifications including all parameters, request/response formats, and error codes, see the [Interactive API Documentation](https://api.primethink.ai/pt-docs).

### POST `/api/v1/voice/stt`

Transcribes audio files to text. Supports MP3, WAV, M4A, MP4, MPEG, MPGA, and WEBM formats up to 25MB.

### POST `/api/v1/voice/translate`

Transcribes audio in any language and translates it to English in a single operation.

### POST `/api/v1/voice/tts`

Converts text to speech audio (MP3). Key parameters include:
- `text` - Text to convert (for single-voice content)
- `dialogue` - Array of speaker objects (for multi-voice content)
- `voice` - Voice ID or name
- `instructions` - Style and delivery instructions
- `provider` - `openai`, `google`, or `elevenlabs`
- `name` - Custom filename for the generated audio (without extension)
- `folder` - Destination folder for saving (default: `audio`)

### POST `/api/v1/voice/tts/stream`

Same as `/api/v1/voice/tts` but streams audio in real-time for lower latency.

## Best Practices

### Creating Natural-Sounding Speech

The key to great text-to-speech is writing text as if someone will speak it, not as if someone will read it.

#### Write for Speaking, Not Reading

**Good Examples:**
- "Hey there! Welcome to PrimeThink. Let's get started with your first project."
- "You'll notice three things right away. First, the interface is clean and simple."
- "Here's the thing—AI can help, but you're still in control."

**Poor Examples:**
- "WELCOME TO PRIMETHINK. PLEASE BEGIN."
- "The following items are included: (1) Feature A (2) Feature B (3) Feature C"
- "For more information, see documentation at https://example.com/docs"

#### Use Punctuation Strategically

Punctuation controls pacing and emphasis:

- **Periods** create natural pauses between sentences
- **Commas** add brief pauses for breath and clarity
- **Question marks** automatically adjust intonation upward
- **Exclamation points** add energy and emphasis
- **Em dashes** (—) create dramatic pauses
- **Ellipses** (...) suggest trailing off or hesitation

Example with good pacing:
```
Welcome to the tutorial. In the next few minutes, you'll learn three key concepts:
data management, AI integration, and collaboration. Let's dive in!
```

#### Avoid Common Speech Pitfalls

Don't use:
- ALL CAPS (sounds robotic)
- Long URLs or technical identifiers
- Complex abbreviations without expansion
- Overly long sentences (break at 20-25 words)
- Dense paragraphs without natural breaks

#### Structure Content in Manageable Chunks

For longer content, break text into smaller segments:
- Maximum 2-3 paragraphs per TTS request
- Each segment should be 100-300 words
- Process segments sequentially or in parallel
- Maintain consistent voice settings across segments

### Choosing the Right Voice

Different voices suit different contexts. Understanding voice characteristics helps you match the right voice to your content.

#### OpenAI Voices

| Voice | Characteristics | Best For |
|-------|----------------|----------|
| `alloy` | Neutral, balanced, versatile | General content, documentation, tutorials |
| `echo` | Male, clear, professional | Business content, technical explanations |
| `fable` | Warm, expressive, engaging | Storytelling, educational content, marketing |
| `onyx` | Deep, authoritative, confident | Announcements, formal presentations, narration |
| `nova` | Energetic, bright, friendly | Marketing, upbeat content, customer service |
| `shimmer` | Soft, gentle, calm | Meditation, relaxation, gentle guidance |

#### Voice Selection Guidelines

**Professional/Business Content:**
- Use `echo` or `onyx` for authority and credibility
- Avoid overly energetic voices that may seem unprofessional

**Educational/Tutorial Content:**
- Use `alloy` or `fable` for approachable, clear delivery
- Match voice energy to content complexity (calmer for complex topics)

**Marketing/Sales Content:**
- Use `nova` for enthusiasm and energy
- `fable` works well for storytelling approaches

**Storytelling/Narrative:**
- `fable` for warm, engaging narration
- `onyx` for dramatic, deep narration
- Mix voices for dialogue (see Multi-speaker section)

**Meditation/Wellness:**
- `shimmer` for calming, gentle guidance
- Speak slowly with thoughtful pacing

### Using Voice Instructions Effectively

The `instructions` parameter lets you fine-tune voice delivery without changing the base voice.

#### Instruction Categories

**Emotion and Tone:**
```json
{
  "text": "Welcome back! We have some exciting updates.",
  "instructions": "Speak with genuine enthusiasm and warmth"
}
```

**Pacing:**
```json
{
  "text": "This is a critical security notice.",
  "instructions": "Speak slowly and deliberately with clear enunciation"
}
```

**Emphasis:**
```json
{
  "text": "You must complete this step before proceeding.",
  "instructions": "Emphasize the word 'must' and maintain a serious tone"
}
```

**Character/Style:**
```json
{
  "text": "Once upon a time in a distant land...",
  "instructions": "Use a storytelling voice with dramatic pauses and varied intonation"
}
```

#### Effective Instructions

**Good Instructions:**
- "Speak conversationally as if talking to a friend"
- "Use a professional but warm tone"
- "Emphasize key numbers and statistics"
- "Speak with the urgency of breaking news"
- "Maintain a calm, reassuring tone throughout"

**Less Effective Instructions:**
- "Make it sound good" (too vague)
- "Use emotion" (which emotion?)
- "Be professional" (already implied by voice choice)

### Creating Multi-Speaker Content

Multi-speaker dialogue brings content to life with distinct voices for different speakers.

#### Dialogue Best Practices

**Choose Distinct Voices:**
- Use voices with different characteristics (pitch, energy, tone)
- `alloy` + `echo` = balanced conversation
- `fable` + `onyx` = warm host + authoritative guest
- `nova` + `shimmer` = energetic + calm contrast

**Structure Conversations Naturally:**
```json
{
  "provider": "openai",
  "dialogue": [
    {
      "speaker": "Host",
      "text": "Welcome to the show! Today we're discussing AI in business.",
      "voice_id": "fable",
      "description": "enthusiastic and welcoming"
    },
    {
      "speaker": "Expert",
      "text": "Thanks for having me. It's a fascinating topic.",
      "voice_id": "echo",
      "description": "professional and knowledgeable"
    },
    {
      "speaker": "Host",
      "text": "Let's start with the basics. What exactly is machine learning?",
      "voice_id": "fable",
      "description": "curious and engaged"
    }
  ]
}
```

**Speaker Descriptions:**
- Use descriptions to maintain character consistency
- Descriptions guide tone even when text is similar
- Update descriptions as conversation dynamics shift

**Common Use Cases:**
- Podcasts and interviews
- Educational dialogues
- Customer service scenarios
- Audiobook character voices
- Training simulations

#### Pacing in Dialogue

Natural conversations need rhythm:
- Keep exchanges relatively short (1-3 sentences)
- Vary sentence length for natural flow
- Use interruptions sparingly for realism
- Add reactions ("Mm-hmm," "Right," "Exactly")

### Speech-to-Text Best Practices

Transcription quality depends heavily on audio input quality.

#### Optimize Audio Quality

**Recording Environment:**
- Choose quiet locations with minimal echo
- Use proper microphone positioning (6-12 inches from speaker)
- Avoid wind noise (use windscreen outdoors)
- Minimize background music or ambient noise

**Technical Settings:**
- Sample rate: 16kHz or higher (44.1kHz recommended)
- Bit rate: 128kbps or higher for MP3
- Format: Use lossless (WAV) for best quality, or high-quality MP3/M4A
- Mono vs Stereo: Mono is sufficient and reduces file size

#### File Size Management

Maximum file size is 25MB. For longer recordings:

**Option 1: Reduce Quality**
- Lower bit rate (but not below 64kbps)
- Use compressed formats (MP3, M4A)
- Convert stereo to mono

**Option 2: Split Files**
- Divide recording into segments
- Split at natural pauses (sentences, paragraphs)
- Process segments in parallel for speed
- Concatenate transcriptions

#### Handling Different Accents and Languages

The STT endpoint handles multiple accents and languages automatically:
- No need to specify language (auto-detected)
- Works with regional accents and dialects
- For non-English audio, use `/api/v1/voice/translate` to get English output

#### Post-Processing Transcriptions

Transcriptions may need cleanup:
- Add punctuation in appropriate places
- Correct capitalization of proper nouns
- Remove filler words if desired ("um", "uh", "like")
- Format timestamps or speaker labels

### Streaming vs Standard TTS

Choose the right endpoint for your use case.

#### Use Standard `/api/v1/voice/tts` When:
- Generating audio for download or storage
- Quality is more important than latency
- Processing large amounts of text
- No real-time playback requirement

#### Use Streaming `/api/v1/voice/tts/stream` When:
- Building interactive voice applications
- Real-time responses are critical
- Playing audio as it generates
- Creating live conversational experiences

**Streaming Benefits:**
- Lower latency (audio starts playing sooner)
- Better user experience for interactive apps
- Efficient for long-form content

**Streaming Considerations:**
- Requires handling streaming data in your application
- May not be suitable for simple file download scenarios

### Cost and Rate Limit Optimization

Manage API usage efficiently:

**Text-to-Speech:**
- Cache generated audio for repeated content
- Combine related sentences in single requests
- Use appropriate voice/quality for use case
- Generate and store common phrases

**Speech-to-Text:**
- Process audio files at appropriate quality (don't over-sample)
- Batch multiple files when possible
- Cache transcriptions for repeated audio

**General Tips:**
- Monitor usage patterns
- Use streaming only when necessary
- Implement error handling and retry logic
- Consider upgrading tier for high-volume needs

## Quick Start Examples

For complete code examples in multiple languages, see the [Interactive API Documentation](https://api.primethink.ai/pt-docs).

### Basic Text-to-Speech

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/tts" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Welcome to PrimeThink. Let us help you get started with AI.",
    "voice": "alloy",
    "provider": "openai"
  }' \
  --output speech.mp3
```

### Text-to-Speech with Instructions

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/tts" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a critical security update. Please take immediate action.",
    "voice": "onyx",
    "instructions": "Speak with authority and urgency, emphasizing 'critical' and 'immediate'",
    "provider": "openai"
  }' \
  --output announcement.mp3
```

### Multi-Speaker Dialogue

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/tts" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "dialogue": [
      {
        "speaker": "Interviewer",
        "text": "Thanks for joining us today. Can you tell us about your latest project?",
        "voice_id": "fable",
        "description": "professional and engaging"
      },
      {
        "speaker": "Guest",
        "text": "Absolutely! We have been working on an exciting new AI platform.",
        "voice_id": "echo",
        "description": "enthusiastic and knowledgeable"
      }
    ]
  }' \
  --output interview.mp3
```

### Speech-to-Text Transcription

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/stt" \
  -H "Authorization: Token YOUR_API_KEY" \
  -F "file=@recording.mp3"
```

### Translation (Any Language to English)

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/translate" \
  -H "Authorization: Token YOUR_API_KEY" \
  -F "file=@spanish_audio.mp3"
```

### Streaming TTS

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/tts/stream" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This audio will stream in real-time as it generates.",
    "voice": "nova",
    "provider": "openai"
  }' \
  --output streamed.mp3
```

### With Custom Filename

```bash
curl -X POST "https://api.primethink.ai/api/v1/voice/tts" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Welcome to our application",
    "voice": "alloy",
    "provider": "openai",
    "name": "welcome-audio",
    "folder": "greetings"
  }' \
  --output welcome.mp3
```

## Need Help?

If you encounter any issues or have questions about the Audio Generation API, please contact our support team at [support@primethink.ai](mailto:support@primethink.ai) or visit our [community forum](https://community.primethink.ai).
