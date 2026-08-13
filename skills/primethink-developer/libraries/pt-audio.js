/**
 * pt-audio.js — microphone recording, metering, upload and transcription for
 * PrimeThink Live Apps. Framework-agnostic (works in HTML and React apps).
 *
 * PURPOSE
 * -------
 * Voice-note / recording apps in this repo each hand-roll MediaRecorder setup,
 * forget to stop the microphone tracks (mic stays "on" after recording), pick
 * a mime type that Safari rejects, and rebuild the upload→diarize flow. This
 * module is the single correct place for:
 *   - capturing microphone audio with MediaRecorder (start/pause/resume/stop)
 *   - live input-level metering (AudioContext analyser + rAF)
 *   - uploading the recording to the chat (pt.uploadFiles)
 *   - transcribing it with speaker diarization (pt.diarizeAudio)
 * Every resource (MediaStream tracks, AudioContext, object URLs, rAF) is
 * explicitly released.
 *
 * DISTILLED FROM (real patterns / gaps in these apps):
 *   diet-coach, dem-daily-coach (FormData → pt.uploadFiles / addMessage with files),
 *   panel-stakeholder-trainer, life-logger (voice interaction),
 *   transcribe-live (getUserMedia + audio capture),
 *   plus the documented pt.diarizeAudio upload→transcribe workflow.
 *
 * PLATFORM CONTRACT
 * -----------------
 *   - `pt` is a platform global; guarded with `typeof pt !== 'undefined'`.
 *   - `pt.uploadFiles(FormData, folder)` → { documents: [{ id, uuid, name,
 *     path, download_url, ... }] } (confirmed: primethink.js line 2249).
 *   - `pt.diarizeAudio({ document_id, speaker_count, extra_instructions,
 *     folder, filename })` → { success, message, transcript, documents }
 *     (confirmed: primethink.js line 3648). It takes an ALREADY-UPLOADED
 *     document id, not a blob — so transcribeRecording() uploads first.
 *   - The diarization transcript is text of the form
 *     "[MM:SS] Speaker 1: ...\n[MM:SS] Speaker 2: ...".
 *
 * SAFARI CAVEAT
 * -------------
 * Safari's MediaRecorder does NOT support 'audio/webm;codecs=opus'. It records
 * 'audio/mp4' (AAC) instead. pickSupportedMimeType() probes and returns the
 * first supported type; the diarizer accepts WEBM/OPUS/M4A/MP4 all the same.
 *
 * USAGE
 * -----
 *   import {
 *       createRecorder, transcribeRecording, formatRecordingTime
 *   } from './pt-audio.js';
 *
 *   const rec = createRecorder({
 *       onLevel: (lvl) => meterEl.style.width = (lvl * 100) + '%',
 *       onStateChange: (s) => console.log('recorder', s),
 *       maxMs: 5 * 60 * 1000
 *   });
 *   await rec.start();
 *   // ... user talks ...
 *   const { blob, mimeType, durationMs, url } = await rec.stop();
 *   const { text, segments } = await transcribeRecording(blob, {
 *       filename: 'note.webm', folder: 'voice-notes', diarize: true
 *   });
 *   rec.dispose(); // releases mic + AudioContext + object URL
 */

/** Error codes surfaced to callers so UIs can show the right message. */
export const AUDIO_ERROR = {
    UNSUPPORTED: 'AUDIO_UNSUPPORTED',
    PERMISSION_DENIED: 'AUDIO_PERMISSION_DENIED',
    NO_DEVICE: 'AUDIO_NO_DEVICE',
    NOT_INITIALIZED: 'AUDIO_PT_NOT_INITIALIZED',
    START_FAILED: 'AUDIO_START_FAILED'
};

/**
 * An error with a stable `.code` from AUDIO_ERROR for UI branching.
 */
export class AudioError extends Error {
    /**
     * @param {string} code One of AUDIO_ERROR.*
     * @param {string} message Human-readable message.
     * @param {Error} [cause] Original error, if any.
     */
    constructor(code, message, cause) {
        super(message);
        this.name = 'AudioError';
        this.code = code;
        if (cause) this.cause = cause;
    }
}

/** @returns {boolean} True if the browser can record microphone audio. */
export function isRecordingSupported() {
    return !!(
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function' &&
        typeof window !== 'undefined' &&
        typeof window.MediaRecorder !== 'undefined'
    );
}

/**
 * Pick the first MediaRecorder mime type the browser supports.
 * Prefers webm/opus (Chrome/Firefox); falls back to mp4/aac (Safari).
 * @returns {string} A supported mime type, or '' to let the browser decide.
 */
export function pickSupportedMimeType() {
    if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
        return '';
    }
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',           // Safari records AAC in an mp4 container
        'audio/mpeg'
    ];
    for (const type of candidates) {
        try {
            if (window.MediaRecorder.isTypeSupported(type)) return type;
        } catch (err) {
            console.error('pt-audio.pickSupportedMimeType probe error:', err);
        }
    }
    return '';
}

/** File extension for a given recording mime type. */
function extensionForMime(mimeType) {
    if (!mimeType) return 'webm';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4')) return 'm4a';
    if (mimeType.includes('mpeg')) return 'mp3';
    return 'webm';
}

/**
 * Attach an AudioContext analyser to a live MediaStream and report a
 * normalised input level (0..1) on every animation frame.
 * @param {MediaStream} stream Live microphone stream.
 * @param {(level: number) => void} cb Called each frame with RMS level 0..1.
 * @returns {{ stop: () => void }} Call stop() to cancel rAF and close the AudioContext.
 */
export function createLevelMeter(stream, cb) {
    let audioContext = null;
    let rafId = null;
    let stopped = false;

    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioContext = new Ctx();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const buffer = new Uint8Array(analyser.fftSize);

        const tick = () => {
            if (stopped) return;
            analyser.getByteTimeDomainData(buffer);
            let sumSquares = 0;
            for (let i = 0; i < buffer.length; i++) {
                const v = (buffer[i] - 128) / 128;
                sumSquares += v * v;
            }
            const rms = Math.sqrt(sumSquares / buffer.length);
            try {
                if (typeof cb === 'function') cb(Math.min(1, rms * 2));
            } catch (err) {
                console.error('pt-audio.createLevelMeter callback error:', err);
            }
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
    } catch (err) {
        console.error('pt-audio.createLevelMeter setup error:', err);
    }

    return {
        stop() {
            stopped = true;
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            if (audioContext && audioContext.state !== 'closed') {
                audioContext.close().catch((err) =>
                    console.error('pt-audio.createLevelMeter close error:', err));
            }
            audioContext = null;
        }
    };
}

/**
 * Create a microphone recorder controller wrapping MediaRecorder with metering,
 * pause/resume, an optional max duration, and guaranteed resource cleanup.
 *
 * @param {object} [options]
 * @param {string} [options.mimeType] Force a mime type; defaults to pickSupportedMimeType().
 * @param {(level: number) => void} [options.onLevel] Live input level 0..1 (enables metering).
 * @param {(chunk: Blob) => void} [options.onData] Called with each MediaRecorder data chunk.
 * @param {(state: string) => void} [options.onStateChange] 'recording'|'paused'|'stopped'|'error'.
 * @param {number} [options.maxMs] Auto-stop after this many ms.
 * @param {number} [options.timeSliceMs=1000] MediaRecorder timeslice for onData chunks.
 * @returns {{
 *   start: () => Promise<void>,
 *   pause: () => void,
 *   resume: () => void,
 *   stop: () => Promise<{blob: Blob, mimeType: string, durationMs: number, url: string}>,
 *   cancel: () => void,
 *   getState: () => string,
 *   dispose: () => void
 * }}
 */
export function createRecorder(options = {}) {
    const {
        mimeType,
        onLevel,
        onData,
        onStateChange,
        maxMs,
        timeSliceMs = 1000
    } = options;

    let stream = null;
    let recorder = null;
    let meter = null;
    let chunks = [];
    let chosenMime = '';
    let startedAt = 0;
    let accumulatedMs = 0;      // duration accumulated before a pause
    let state = 'idle';         // idle|recording|paused|stopped|error
    let maxTimer = null;
    let lastUrl = null;
    let stopResolve = null;
    let stopReject = null;

    function setState(next) {
        state = next;
        try {
            if (typeof onStateChange === 'function') onStateChange(next);
        } catch (err) {
            console.error('pt-audio.createRecorder onStateChange error:', err);
        }
    }

    function stopTracks() {
        if (stream) {
            for (const track of stream.getTracks()) {
                try { track.stop(); } catch (err) {
                    console.error('pt-audio.createRecorder track.stop error:', err);
                }
            }
            stream = null;
        }
    }

    function stopMeter() {
        if (meter) {
            meter.stop();
            meter = null;
        }
    }

    function clearMaxTimer() {
        if (maxTimer) {
            clearTimeout(maxTimer);
            maxTimer = null;
        }
    }

    async function start() {
        if (!isRecordingSupported()) {
            setState('error');
            throw new AudioError(AUDIO_ERROR.UNSUPPORTED,
                'MediaRecorder / getUserMedia not available in this browser.');
        }
        if (state === 'recording' || state === 'paused') return;

        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            setState('error');
            if (err && err.name === 'NotAllowedError') {
                throw new AudioError(AUDIO_ERROR.PERMISSION_DENIED,
                    'Microphone permission was denied.', err);
            }
            if (err && (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError')) {
                throw new AudioError(AUDIO_ERROR.NO_DEVICE,
                    'No microphone device was found.', err);
            }
            throw new AudioError(AUDIO_ERROR.START_FAILED,
                'Failed to access the microphone: ' + (err && err.message), err);
        }

        try {
            chosenMime = mimeType || pickSupportedMimeType();
            const recOptions = chosenMime ? { mimeType: chosenMime } : undefined;
            recorder = new MediaRecorder(stream, recOptions);
            // MediaRecorder may report the real mime it used.
            chosenMime = recorder.mimeType || chosenMime;
            chunks = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunks.push(e.data);
                    try {
                        if (typeof onData === 'function') onData(e.data);
                    } catch (err) {
                        console.error('pt-audio.createRecorder onData error:', err);
                    }
                }
            };

            recorder.onstop = () => {
                const mime = chosenMime || 'audio/webm';
                const blob = new Blob(chunks, { type: mime });
                const now = performance.now();
                const durationMs = Math.round(
                    accumulatedMs + (startedAt ? now - startedAt : 0)
                );
                if (lastUrl) URL.revokeObjectURL(lastUrl);
                lastUrl = URL.createObjectURL(blob);
                stopMeter();
                stopTracks();
                clearMaxTimer();
                setState('stopped');
                if (stopResolve) {
                    stopResolve({ blob, mimeType: mime, durationMs, url: lastUrl });
                    stopResolve = stopReject = null;
                }
            };

            if (onLevel) meter = createLevelMeter(stream, onLevel);

            recorder.start(timeSliceMs);
            startedAt = performance.now();
            accumulatedMs = 0;
            setState('recording');

            if (maxMs && maxMs > 0) {
                maxTimer = setTimeout(() => {
                    if (state === 'recording' || state === 'paused') {
                        stop().catch((err) =>
                            console.error('pt-audio.createRecorder auto-stop error:', err));
                    }
                }, maxMs);
            }
        } catch (err) {
            setState('error');
            stopMeter();
            stopTracks();
            throw new AudioError(AUDIO_ERROR.START_FAILED,
                'Failed to start recording: ' + (err && err.message), err);
        }
    }

    function pause() {
        if (recorder && state === 'recording') {
            try {
                recorder.pause();
                accumulatedMs += performance.now() - startedAt;
                startedAt = 0;
                setState('paused');
            } catch (err) {
                console.error('pt-audio.createRecorder pause error:', err);
            }
        }
    }

    function resume() {
        if (recorder && state === 'paused') {
            try {
                recorder.resume();
                startedAt = performance.now();
                setState('recording');
            } catch (err) {
                console.error('pt-audio.createRecorder resume error:', err);
            }
        }
    }

    function stop() {
        return new Promise((resolve, reject) => {
            if (!recorder || (state !== 'recording' && state !== 'paused')) {
                reject(new AudioError(AUDIO_ERROR.START_FAILED,
                    'stop() called while not recording.'));
                return;
            }
            stopResolve = resolve;
            stopReject = reject;
            try {
                recorder.stop(); // triggers recorder.onstop
            } catch (err) {
                stopResolve = stopReject = null;
                reject(new AudioError(AUDIO_ERROR.START_FAILED,
                    'Failed to stop recording: ' + (err && err.message), err));
            }
        });
    }

    function cancel() {
        clearMaxTimer();
        if (recorder && (state === 'recording' || state === 'paused')) {
            try {
                recorder.ondataavailable = null;
                recorder.onstop = null;
                recorder.stop();
            } catch (err) {
                console.error('pt-audio.createRecorder cancel error:', err);
            }
        }
        chunks = [];
        stopMeter();
        stopTracks();
        if (stopReject) {
            stopReject(new AudioError(AUDIO_ERROR.START_FAILED, 'Recording cancelled.'));
            stopResolve = stopReject = null;
        }
        setState('idle');
    }

    function getState() {
        return state;
    }

    function dispose() {
        cancel();
        if (lastUrl) {
            URL.revokeObjectURL(lastUrl);
            lastUrl = null;
        }
        recorder = null;
    }

    return { start, pause, resume, stop, cancel, getState, dispose };
}

/**
 * Wrap a Blob in a File so it uploads with a proper filename.
 * @param {Blob} blob The recorded audio blob.
 * @param {string} filename Desired filename (extension inferred if missing).
 * @returns {File}
 */
export function blobToFile(blob, filename) {
    const type = blob.type || 'audio/webm';
    let name = filename || 'recording.' + extensionForMime(type);
    if (!/\.[a-z0-9]+$/i.test(name)) name += '.' + extensionForMime(type);
    return new File([blob], name, { type });
}

/**
 * Upload a recording to the chat via pt.uploadFiles.
 * @param {Blob} blob Recorded audio.
 * @param {object} [options]
 * @param {string} [options.filename] Filename to store as.
 * @param {string} [options.folder='voice-notes'] Destination folder in the chat.
 * @returns {Promise<{document: object, downloadUrl: string|null}>}
 */
export async function uploadRecording(blob, options = {}) {
    if (typeof pt === 'undefined') {
        throw new AudioError(AUDIO_ERROR.NOT_INITIALIZED, 'pt global is not available.');
    }
    const { filename, folder = 'voice-notes' } = options;
    try {
        const file = blobToFile(blob, filename);
        const form = new FormData();
        form.append('files', file, file.name);
        const result = await pt.uploadFiles(form, folder);
        const document = (result && result.documents && result.documents[0]) || null;
        const downloadUrl = document ? (document.download_url || null) : null;
        return { document, downloadUrl };
    } catch (err) {
        console.error('pt-audio.uploadRecording error:', err);
        throw err;
    }
}

/**
 * Parse a diarization transcript string ("[MM:SS] Speaker 1: text") into
 * structured segments. `end` of each segment is the `start` of the next.
 * @param {string} transcript Raw transcript text from pt.diarizeAudio.
 * @returns {Array<{speaker: string, start: number, end: number|null, text: string}>}
 */
export function parseDiarizedTranscript(transcript) {
    const segments = [];
    if (!transcript || typeof transcript !== 'string') return segments;

    const line = /^\s*\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s*([^:]+?):\s*(.*)$/;
    for (const raw of transcript.split('\n')) {
        const m = raw.match(line);
        if (!m) {
            // Continuation of the previous speaker turn.
            if (segments.length && raw.trim()) {
                segments[segments.length - 1].text += ' ' + raw.trim();
            }
            continue;
        }
        const h = m[3] !== undefined ? parseInt(m[1], 10) : 0;
        const mm = m[3] !== undefined ? parseInt(m[2], 10) : parseInt(m[1], 10);
        const ss = m[3] !== undefined ? parseInt(m[3], 10) : parseInt(m[2], 10);
        const start = h * 3600 + mm * 60 + ss;
        segments.push({
            speaker: m[4].trim(),
            start,
            end: null,
            text: (m[5] || '').trim()
        });
    }
    for (let i = 0; i < segments.length - 1; i++) {
        segments[i].end = segments[i + 1].start;
    }
    return segments;
}

/**
 * Upload a recording then transcribe it with speaker diarization.
 * Normalises the documented pt.diarizeAudio response into { text, segments }.
 * @param {Blob} blob Recorded audio.
 * @param {object} [options]
 * @param {string} [options.filename] Filename for the uploaded audio.
 * @param {string} [options.folder='voice-notes'] Folder for the uploaded audio.
 * @param {boolean} [options.diarize=true] Reserved flag; diarization is always
 *   used because pt exposes only the diarizing transcription endpoint.
 * @param {number} [options.speakerCount] Known number of speakers (1-20).
 * @param {string} [options.extraInstructions] Language / speaker-name hints.
 * @param {string} [options.transcriptFolder] Folder for the saved transcript.
 * @returns {Promise<{text: string, segments: Array, document: object, transcriptDocuments: Array}>}
 */
export async function transcribeRecording(blob, options = {}) {
    if (typeof pt === 'undefined') {
        throw new AudioError(AUDIO_ERROR.NOT_INITIALIZED, 'pt global is not available.');
    }
    const {
        filename,
        folder = 'voice-notes',
        speakerCount,
        extraInstructions,
        transcriptFolder
    } = options;

    try {
        const { document } = await uploadRecording(blob, { filename, folder });
        if (!document || !document.id) {
            throw new Error('Upload did not return a document id.');
        }
        const params = { document_id: document.id };
        if (speakerCount) params.speaker_count = speakerCount;
        if (extraInstructions) params.extra_instructions = extraInstructions;
        if (transcriptFolder) params.folder = transcriptFolder;

        const result = await pt.diarizeAudio(params);
        const text = (result && result.transcript) || '';
        return {
            text,
            segments: parseDiarizedTranscript(text),
            document,
            transcriptDocuments: (result && result.documents) || []
        };
    } catch (err) {
        console.error('pt-audio.transcribeRecording error:', err);
        throw err;
    }
}

/**
 * Play a Blob through a fresh <audio> element and resolve when playback ends.
 * The object URL is revoked automatically on end/error.
 * @param {Blob} blob Audio blob to play.
 * @returns {{ audio: HTMLAudioElement, promise: Promise<void>, stop: () => void }}
 */
export function playBlob(blob) {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    let settled = false;

    const cleanup = () => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
    };

    const promise = new Promise((resolve, reject) => {
        audio.onended = () => { cleanup(); resolve(); };
        audio.onerror = (e) => {
            cleanup();
            console.error('pt-audio.playBlob error:', e);
            reject(new Error('Audio playback failed.'));
        };
        audio.play().catch((err) => {
            cleanup();
            console.error('pt-audio.playBlob play() error:', err);
            reject(err);
        });
    });

    return {
        audio,
        promise,
        stop() {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (err) {
                console.error('pt-audio.playBlob stop error:', err);
            }
            cleanup();
        }
    };
}

/**
 * Format a duration in milliseconds as "M:SS" (or "H:MM:SS" past an hour).
 * @param {number} ms Duration in milliseconds.
 * @returns {string}
 */
export function formatRecordingTime(ms) {
    const totalSeconds = Math.max(0, Math.floor((ms || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    return `${minutes}:${pad(seconds)}`;
}
