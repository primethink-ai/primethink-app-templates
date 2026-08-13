/**
 * pt-speech.js — speaking (TTS) and listening (STT) helpers for PrimeThink
 * Live Apps. Framework-agnostic (works in HTML and React apps).
 *
 * PURPOSE
 * -------
 * Trainer / quiz apps repeatedly need to:
 *   - pronounce a word or read a sentence aloud (server TTS via pt.generateVoice,
 *     or instant/offline browser speechSynthesis)
 *   - avoid regenerating audio for words that repeat (vocab drills replay the
 *     same word many times) — an in-memory cache fixes this
 *   - play a sequence of utterances one after another (a trainer reading a list)
 *   - transcribe the user's speech (realtime streaming via ElevenLabs Scribe,
 *     or the zero-server webkitSpeechRecognition fallback)
 * This module centralises those flows with explicit stop()/dispose() so no
 * <audio> element, AudioContext, WebSocket or recognition session leaks.
 *
 * DISTILLED FROM (real patterns in these apps):
 *   spelling_bee (SpeechSynthesisUtterance word pronunciation, en-GB voice pick),
 *   vocab-trainer-11plus, lexicon-vocab-trainer, math_quest (word/answer audio),
 *   panel-stakeholder-trainer (webkitSpeechRecognition continuous+interim),
 *   transcribe-live (ElevenLabs Scribe realtime STT),
 *   tts_tester (generateVoice / TTS playback),
 *   plus the documented pt.generateVoice and pt.sttStreamToken signatures.
 *
 * PLATFORM CONTRACT
 * -----------------
 *   - `pt.generateVoice({ text, voice, instructions, model, provider, folder,
 *     name, dialogue, streaming })` → { success, message, voice } where `voice`
 *     is { name, path } or [{ id, uuid, name, path }] (confirmed: primethink.js
 *     line 3520). generateVoice SAVES an audio document; to play it we resolve a
 *     stream URL from the returned uuid via pt._getUrl (no hardcoded domains).
 *   - `pt.sttStreamToken()` → { token, websocket_url } (confirmed: primethink.js
 *     line 3705). The token feeds the ElevenLabs Scribe SDK; it expires in 15 min.
 *
 * SCRIBE / STREAMING STT NOTE
 * ---------------------------
 * pt only mints the token; the realtime transport is the ElevenLabs Scribe SDK.
 * Per the platform docs (Live-Pages-Media-Generation.md → "Realtime
 * Speech-to-Text"), the client loads `@elevenlabs/client` and calls
 * `Scribe.connect({ token, languageCode, modelId: 'scribe_v2_realtime',
 * microphone: {...} })`, then listens for `partial_transcript` /
 * `committed_transcript`. createLiveTranscriber() implements exactly this: it
 * dynamically imports the SDK from esm.sh (a full URL import, NOT a bare
 * specifier), or reuses a `window.ElevenLabsScribe` you preloaded. The event
 * NAMES differ between the docs (lowercase `partial_transcript`) and the
 * transcribe-live app (uppercase `PARTIAL_TRANSCRIPT` /
 * `COMMITTED_TRANSCRIPT_WITH_TIMESTAMPS`), so we subscribe to BOTH spellings.
 *
 * USAGE
 * -----
 *   import { speak, createSpeechQueue, createDictation } from './pt-speech.js';
 *
 *   const handle = await speak('serendipity', { voice: 'nova', cache: true });
 *   // handle.stop();
 *
 *   const q = createSpeechQueue();
 *   q.add('apple'); q.add('banana');   // spoken sequentially
 *
 *   const dictation = createDictation({ onText: (t) => (input.value = t) });
 *   dictation.start();  // ... dictation.stop();
 */

const ELEVENLABS_SDK_URL = 'https://esm.sh/@elevenlabs/client';

/* In-memory TTS cache: key `${voice}::${text}` -> playable URL. Never persisted. */
const _ttsUrlCache = new Map();
/* Track live <audio> elements so stopAllSpeech() can halt everything. */
const _activeAudios = new Set();

/**
 * Resolve a playable stream URL from a pt.generateVoice() result.
 * Prefers an explicit download_url; otherwise builds a uuid stream URL via
 * pt._getUrl (environment-agnostic — never hardcodes a domain).
 * @param {object} result The generateVoice response.
 * @returns {string|null}
 */
function resolveVoiceUrl(result) {
    if (!result) return null;
    const voice = result.voice;
    const entry = Array.isArray(voice) ? voice[0] : voice;
    if (!entry) return null;
    if (entry.download_url) return entry.download_url;
    if (entry.uuid && typeof pt !== 'undefined' && typeof pt._getUrl === 'function') {
        return pt._getUrl(`/api/v1/documents/uuid/${entry.uuid}/download/stream`);
    }
    return null;
}

/**
 * Speak text using the platform server TTS (pt.generateVoice) and play the
 * resulting audio. Repeated (text, voice) pairs reuse a cached URL so the same
 * word is not regenerated during a drill.
 *
 * @param {string} text Text to speak.
 * @param {object} [options]
 * @param {string} [options.voice='alloy'] Voice id (alloy/echo/fable/onyx/nova/shimmer...).
 * @param {number} [options.rate] Playback rate applied to the <audio> element (0.25–4).
 * @param {string} [options.provider] TTS provider ('openai'|'google'|'elevenlabs').
 * @param {string} [options.instructions] Delivery/style instructions.
 * @param {string} [options.folder='audio'] Folder to save the generated audio in.
 * @param {boolean} [options.cache=true] Cache the audio URL by text+voice.
 * @returns {Promise<{ url: string, audio: HTMLAudioElement, promise: Promise<void>, stop: () => void }>}
 */
export async function speak(text, options = {}) {
    if (typeof pt === 'undefined' || typeof pt.generateVoice !== 'function') {
        throw new Error('pt.generateVoice is not available.');
    }
    const {
        voice = 'alloy',
        rate,
        provider,
        instructions,
        folder = 'audio',
        cache = true
    } = options;

    const cacheKey = `${voice}::${text}`;
    let url = cache ? _ttsUrlCache.get(cacheKey) : null;

    try {
        if (!url) {
            const params = { text, voice, folder };
            if (provider) params.provider = provider;
            if (instructions) params.instructions = instructions;
            const result = await pt.generateVoice(params);
            url = resolveVoiceUrl(result);
            if (!url) throw new Error('generateVoice returned no playable audio URL.');
            if (cache) _ttsUrlCache.set(cacheKey, url);
        }
    } catch (err) {
        console.error('pt-speech.speak generateVoice error:', err);
        throw err;
    }

    const audio = new Audio(url);
    if (rate) audio.playbackRate = rate;
    _activeAudios.add(audio);

    let settled = false;
    const cleanup = () => {
        if (settled) return;
        settled = true;
        _activeAudios.delete(audio);
    };

    const promise = new Promise((resolve, reject) => {
        audio.onended = () => { cleanup(); resolve(); };
        audio.onerror = (e) => {
            cleanup();
            console.error('pt-speech.speak playback error:', e);
            reject(new Error('Audio playback failed.'));
        };
        audio.play().catch((err) => {
            cleanup();
            console.error('pt-speech.speak play() error:', err);
            reject(err);
        });
    });

    return {
        url,
        audio,
        promise,
        stop() {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (err) {
                console.error('pt-speech.speak stop error:', err);
            }
            cleanup();
        }
    };
}

/** Clear the in-memory TTS URL cache (e.g. between drill sessions). */
export function clearSpeechCache() {
    _ttsUrlCache.clear();
}

/**
 * Speak text instantly using the browser's built-in speechSynthesis — no
 * server round-trip, works offline. Ideal for word pronunciation in trainers.
 * @param {string} text Text to speak.
 * @param {object} [opts]
 * @param {string} [opts.lang='en-GB'] BCP-47 language tag.
 * @param {number} [opts.rate=1] Speaking rate (0.1–10).
 * @param {number} [opts.pitch=1] Voice pitch (0–2).
 * @param {SpeechSynthesisVoice|string} [opts.voice] A voice object or voiceURI/name to match.
 * @returns {{ promise: Promise<void>, stop: () => void }}
 */
export function speakBrowser(text, opts = {}) {
    const { lang = 'en-GB', rate = 1, pitch = 1, voice } = opts;

    if (typeof window === 'undefined' || !window.speechSynthesis) {
        const err = new Error('speechSynthesis is not available in this browser.');
        console.error('pt-speech.speakBrowser error:', err);
        return { promise: Promise.reject(err), stop() {} };
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;

    if (voice) {
        if (typeof voice === 'string') {
            const match = synth.getVoices().find(
                (v) => v.voiceURI === voice || v.name === voice);
            if (match) utterance.voice = match;
        } else {
            utterance.voice = voice;
        }
    } else {
        const match = synth.getVoices().find((v) => v.lang === lang) ||
            synth.getVoices().find((v) => v.lang && v.lang.startsWith(lang.slice(0, 2)));
        if (match) utterance.voice = match;
    }

    const promise = new Promise((resolve, reject) => {
        utterance.onend = resolve;
        utterance.onerror = (e) => {
            console.error('pt-speech.speakBrowser utterance error:', e);
            reject(e.error || new Error('speechSynthesis failed.'));
        };
    });

    try {
        synth.cancel(); // stop anything currently speaking
        synth.speak(utterance);
    } catch (err) {
        console.error('pt-speech.speakBrowser speak error:', err);
    }

    return {
        promise,
        stop() {
            try { synth.cancel(); } catch (err) {
                console.error('pt-speech.speakBrowser stop error:', err);
            }
        }
    };
}

/**
 * List the browser speechSynthesis voices. Voices load asynchronously, so this
 * resolves after the `voiceschanged` event if the list is initially empty.
 * @returns {Promise<SpeechSynthesisVoice[]>}
 */
export function listVoices() {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            resolve([]);
            return;
        }
        const synth = window.speechSynthesis;
        const current = synth.getVoices();
        if (current && current.length) {
            resolve(current);
            return;
        }
        const handler = () => {
            synth.onvoiceschanged = null;
            resolve(synth.getVoices());
        };
        synth.onvoiceschanged = handler;
        // Fallback in case the event never fires.
        setTimeout(() => {
            if (synth.onvoiceschanged === handler) {
                synth.onvoiceschanged = null;
                resolve(synth.getVoices());
            }
        }, 1000);
    });
}

/**
 * Create a queue that speaks items sequentially (one finishes before the next
 * starts). Uses browser speechSynthesis by default; pass `useServer: true` to
 * use pt.generateVoice via speak().
 * @param {object} [options]
 * @param {boolean} [options.useServer=false] Use pt.generateVoice instead of speechSynthesis.
 * @param {object} [options.speakOptions] Options forwarded to speak()/speakBrowser().
 * @returns {{ add: (text: string) => void, clear: () => void, stop: () => void, size: () => number }}
 */
export function createSpeechQueue(options = {}) {
    const { useServer = false, speakOptions = {} } = options;
    const queue = [];
    let running = false;
    let current = null; // active handle with stop()

    async function drain() {
        if (running) return;
        running = true;
        while (queue.length) {
            const text = queue.shift();
            try {
                current = useServer
                    ? await speak(text, speakOptions)
                    : speakBrowser(text, speakOptions);
                await current.promise;
            } catch (err) {
                console.error('pt-speech.createSpeechQueue item error:', err);
            } finally {
                current = null;
            }
        }
        running = false;
    }

    return {
        add(text) {
            queue.push(text);
            drain();
        },
        clear() {
            queue.length = 0;
        },
        stop() {
            queue.length = 0;
            if (current && typeof current.stop === 'function') current.stop();
            current = null;
            running = false;
        },
        size() {
            return queue.length + (current ? 1 : 0);
        }
    };
}

/**
 * Create a realtime transcriber backed by pt.sttStreamToken() + the ElevenLabs
 * Scribe SDK (loaded from esm.sh or a preloaded window.ElevenLabsScribe).
 *
 * TOKEN LIFETIME: the token from pt.sttStreamToken() expires after 15 minutes;
 * for longer sessions stop() and start() again to mint a fresh token.
 *
 * @param {object} handlers
 * @param {(text: string) => void} [handlers.onPartial] In-progress transcript (may change).
 * @param {(text: string) => void} [handlers.onFinal] Committed/finalised transcript segment.
 * @param {(err: Error) => void} [handlers.onError] Connection/transcription error.
 * @param {object} [handlers.options]
 * @param {string} [handlers.options.languageCode='en'] Scribe language code.
 * @param {string} [handlers.options.modelId='scribe_v2_realtime'] Scribe model id.
 * @param {string} [handlers.options.sdkUrl] Override the SDK module URL.
 * @returns {{ start: () => Promise<void>, stop: () => void, isActive: () => boolean }}
 */
export function createLiveTranscriber(handlers = {}) {
    const {
        onPartial,
        onFinal,
        onError,
        options = {}
    } = handlers;
    const {
        languageCode = 'en',
        modelId = 'scribe_v2_realtime',
        sdkUrl = ELEVENLABS_SDK_URL
    } = options;

    let scribe = null;
    let active = false;

    function emitError(err) {
        console.error('pt-speech.createLiveTranscriber error:', err);
        if (typeof onError === 'function') onError(err);
    }

    function stripQuotes(text) {
        let t = (text || '').trim();
        if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1).trim();
        return t;
    }

    async function loadScribe() {
        if (typeof window !== 'undefined' && window.ElevenLabsScribe) {
            return window.ElevenLabsScribe;
        }
        // Full-URL dynamic import — browser-native, not a bare specifier.
        const mod = await import(sdkUrl);
        return mod.Scribe || (mod.default && mod.default.Scribe) || mod.default;
    }

    async function start() {
        if (active) return;
        if (typeof pt === 'undefined' || typeof pt.sttStreamToken !== 'function') {
            emitError(new Error('pt.sttStreamToken is not available.'));
            return;
        }
        try {
            const Scribe = await loadScribe();
            if (!Scribe || typeof Scribe.connect !== 'function') {
                throw new Error('ElevenLabs Scribe SDK failed to load.');
            }

            const tokenData = await pt.sttStreamToken();
            if (!tokenData || !tokenData.token) {
                throw new Error('sttStreamToken returned no token.');
            }

            scribe = await Scribe.connect({
                token: tokenData.token,
                languageCode,
                modelId,
                microphone: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Subscribe to BOTH documented (lowercase) and app (uppercase) events.
            const partialHandler = (data) => {
                if (data && data.text && typeof onPartial === 'function') {
                    onPartial(stripQuotes(data.text));
                }
            };
            const finalHandler = (data) => {
                const text = stripQuotes(data && data.text);
                if (text && typeof onFinal === 'function') onFinal(text);
            };
            scribe.on('partial_transcript', partialHandler);
            scribe.on('committed_transcript', finalHandler);
            scribe.on('PARTIAL_TRANSCRIPT', partialHandler);
            scribe.on('COMMITTED_TRANSCRIPT_WITH_TIMESTAMPS', finalHandler);
            scribe.on('error', emitError);
            scribe.on('ERROR', emitError);

            active = true;
        } catch (err) {
            emitError(err);
            stop();
        }
    }

    function stop() {
        active = false;
        if (scribe) {
            try {
                if (typeof scribe.close === 'function') scribe.close();
            } catch (err) {
                console.error('pt-speech.createLiveTranscriber close error:', err);
            }
            scribe = null;
        }
    }

    return { start, stop, isActive: () => active };
}

/**
 * Create a zero-server dictation session using webkitSpeechRecognition
 * (the documented no-server STT fallback). Continuous with interim results.
 * @param {object} handlers
 * @param {(text: string, isFinal: boolean) => void} handlers.onText Full transcript so far.
 * @param {(err: Error) => void} [handlers.onError] Recognition error.
 * @param {object} [handlers.options]
 * @param {string} [handlers.options.lang='en-US'] Recognition language.
 * @param {boolean} [handlers.options.continuous=true] Keep listening across pauses.
 * @param {boolean} [handlers.options.interimResults=true] Emit interim results.
 * @returns {{ start: () => void, stop: () => void, isSupported: () => boolean, isActive: () => boolean }}
 */
export function createDictation(handlers = {}) {
    const { onText, onError, options = {} } = handlers;
    const {
        lang = 'en-US',
        continuous = true,
        interimResults = true
    } = options;

    const Recognition = typeof window !== 'undefined'
        ? (window.SpeechRecognition || window.webkitSpeechRecognition)
        : null;

    let recognition = null;
    let active = false;
    let finalText = '';

    function isSupported() {
        return !!Recognition;
    }

    function start() {
        if (!Recognition) {
            const err = new Error('SpeechRecognition is not available in this browser.');
            console.error('pt-speech.createDictation error:', err);
            if (typeof onError === 'function') onError(err);
            return;
        }
        if (active) return;

        try {
            recognition = new Recognition();
            recognition.continuous = continuous;
            recognition.interimResults = interimResults;
            recognition.lang = lang;
            finalText = '';

            recognition.addEventListener('result', (e) => {
                let interim = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    const chunk = e.results[i][0].transcript;
                    if (e.results[i].isFinal) finalText += chunk;
                    else interim += chunk;
                }
                if (typeof onText === 'function') {
                    onText((finalText + interim).trim(), interim === '');
                }
            });
            recognition.addEventListener('error', (e) => {
                console.error('pt-speech.createDictation recognition error:', e.error || e);
                if (typeof onError === 'function') {
                    onError(e.error ? new Error(String(e.error)) : new Error('Recognition error.'));
                }
            });
            recognition.addEventListener('end', () => {
                // Auto-restart while active (continuous sessions time out).
                if (active) {
                    try { recognition.start(); } catch (err) {
                        console.error('pt-speech.createDictation restart error:', err);
                    }
                }
            });

            recognition.start();
            active = true;
        } catch (err) {
            console.error('pt-speech.createDictation start error:', err);
            if (typeof onError === 'function') onError(err);
        }
    }

    function stop() {
        active = false;
        if (recognition) {
            try { recognition.stop(); } catch (err) {
                console.error('pt-speech.createDictation stop error:', err);
            }
            recognition = null;
        }
    }

    return { start, stop, isSupported, isActive: () => active };
}

/**
 * Stop ALL speech this module started: cancels browser speechSynthesis and
 * pauses every active <audio> element created by speak().
 */
export function stopAllSpeech() {
    try {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    } catch (err) {
        console.error('pt-speech.stopAllSpeech synthesis error:', err);
    }
    for (const audio of _activeAudios) {
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (err) {
            console.error('pt-speech.stopAllSpeech audio error:', err);
        }
    }
    _activeAudios.clear();
}
