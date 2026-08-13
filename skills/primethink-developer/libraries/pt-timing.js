/**
 * pt-timing.js — precise timing, scheduling and hands-free scrolling for
 * PrimeThink Live Apps. Pure browser APIs; no `pt` calls, no dependencies.
 *
 * PURPOSE
 * -------
 * The metronome, drum and quiz apps each re-implement timing with a bare
 * `setInterval`, which DRIFTS: setInterval fires late under load and the error
 * accumulates, so a metronome slowly slides out of tempo and a countdown loses
 * seconds. The fixes here:
 *   - createMetronome: an AudioContext look-ahead scheduler. Beats are scheduled
 *     against `audioContext.currentTime` (a high-precision audio clock) a little
 *     ahead of time, so click timing is sample-accurate regardless of jitter in
 *     the JS timer that drives the scheduler.
 *   - createTicker / createCountdown / createStopwatch: measure elapsed time
 *     from a fixed `performance.now()` origin and correct the next delay, so
 *     they stay accurate over long runs instead of accumulating setInterval slop.
 *   - createAutoScroller: rAF-driven, time-based hands-free scroll.
 *   - beep: fire-and-forget tone that fully tears down its own AudioContext.
 * Every factory returns start/stop/dispose and never leaks an AudioContext,
 * interval or animation frame.
 *
 * DISTILLED FROM (real patterns in these apps):
 *   metronome-timer (AudioContext look-ahead scheduler + Web Worker tick),
 *   drum_scribe / drum-sheet-library (rAF time-based auto-scroll with pause/resume),
 *   math_quest, spelling_bee (per-question countdowns),
 *   plus general session stopwatches used across trainer apps.
 *
 * USAGE
 * -----
 *   import { createMetronome, createCountdown, createAutoScroller } from './pt-timing.js';
 *
 *   const m = createMetronome({ bpm: 120, beatsPerBar: 4,
 *       onBeat: (b) => flash(b.beatInBar, b.isDownbeat) });
 *   m.start();  // m.setBpm(140);  m.stop();  m.dispose();
 *
 *   const cd = createCountdown({ ms: 30000,
 *       onTick: (rem) => (el.textContent = Math.ceil(rem / 1000)),
 *       onDone: () => submit() });
 *   cd.start();
 *
 *   const scroller = createAutoScroller(document.scrollingElement, { pxPerSecond: 40 });
 *   scroller.start();  // scroller.pause(); scroller.resume(); scroller.stop();
 */

/** Lazily create (and reuse) an AudioContext, resuming it if suspended. */
function makeAudioContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch((err) =>
            console.error('pt-timing AudioContext resume error:', err));
    }
    return ctx;
}

/**
 * Play a short scheduled click tone on an existing AudioContext.
 * @param {AudioContext} ctx The audio context.
 * @param {number} time When to play, in ctx.currentTime seconds.
 * @param {object} [opts]
 * @param {number} [opts.frequency=880] Tone frequency in Hz.
 * @param {number} [opts.durationMs=50] Tone length in ms.
 * @param {number} [opts.gain=0.5] Peak gain 0..1.
 * @param {OscillatorType} [opts.type='sine'] Oscillator waveform.
 */
function scheduleClick(ctx, time, opts = {}) {
    const { frequency = 880, durationMs = 50, gain = 0.5, type = 'sine' } = opts;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gainNode.gain.value = gain;
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    const dur = durationMs / 1000;
    osc.start(time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.stop(time + dur);
}

/**
 * Create an AudioContext look-ahead metronome. Beats are scheduled on the audio
 * clock, so tempo does not drift the way a setInterval-based metronome does.
 *
 * @param {object} [options]
 * @param {number} [options.bpm=120] Beats per minute.
 * @param {number} [options.beatsPerBar=4] Beats per bar (downbeat accented).
 * @param {(beat: {beatInBar: number, isDownbeat: boolean, time: number, index: number}) => void} [options.onBeat]
 *   Called (via requestAnimationFrame, just before each beat sounds) for visuals.
 * @param {string} [options.clickType='synth'] Reserved for future click styles.
 * @param {number} [options.accentFrequency=1320] Downbeat tone Hz.
 * @param {number} [options.beatFrequency=880] Regular beat tone Hz.
 * @returns {{
 *   start: () => void, stop: () => void, dispose: () => void,
 *   setBpm: (bpm: number) => void, setBeatsPerBar: (n: number) => void,
 *   isRunning: () => boolean
 * }}
 */
export function createMetronome(options = {}) {
    let {
        bpm = 120,
        beatsPerBar = 4
    } = options;
    const {
        onBeat,
        accentFrequency = 1320,
        beatFrequency = 880
    } = options;

    const scheduleAheadTime = 0.1;  // seconds of audio scheduled in advance
    const lookaheadMs = 25;         // how often the scheduler wakes up

    let ctx = null;
    let timerId = null;
    let nextNoteTime = 0;
    let beatInBar = 0;
    let index = 0;
    let running = false;
    /** Upcoming (visual) beats to fire via rAF at their scheduled time. */
    const beatQueue = [];
    let rafId = null;

    function secondsPerBeat() {
        return 60.0 / bpm;
    }

    function scheduleNote() {
        const isDownbeat = beatInBar === 0;
        scheduleClick(ctx, nextNoteTime, {
            frequency: isDownbeat ? accentFrequency : beatFrequency,
            durationMs: 50,
            gain: isDownbeat ? 0.8 : 0.5,
            type: 'sine'
        });
        beatQueue.push({ beatInBar, isDownbeat, time: nextNoteTime, index });
        nextNoteTime += secondsPerBeat();
        beatInBar = (beatInBar + 1) % beatsPerBar;
        index++;
    }

    function scheduler() {
        if (!running) return;
        while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
            scheduleNote();
        }
        timerId = setTimeout(scheduler, lookaheadMs);
    }

    function visualLoop() {
        if (!running) return;
        if (onBeat && beatQueue.length && ctx) {
            while (beatQueue.length && beatQueue[0].time <= ctx.currentTime) {
                const beat = beatQueue.shift();
                try { onBeat(beat); } catch (err) {
                    console.error('pt-timing.createMetronome onBeat error:', err);
                }
            }
        }
        rafId = requestAnimationFrame(visualLoop);
    }

    function start() {
        if (running) return;
        try {
            if (!ctx) ctx = makeAudioContext();
            running = true;
            beatInBar = 0;
            index = 0;
            beatQueue.length = 0;
            nextNoteTime = ctx.currentTime + 0.05;
            scheduler();
            if (onBeat) rafId = requestAnimationFrame(visualLoop);
        } catch (err) {
            running = false;
            console.error('pt-timing.createMetronome start error:', err);
        }
    }

    function stop() {
        running = false;
        if (timerId) { clearTimeout(timerId); timerId = null; }
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        beatQueue.length = 0;
    }

    function dispose() {
        stop();
        if (ctx && ctx.state !== 'closed') {
            ctx.close().catch((err) =>
                console.error('pt-timing.createMetronome close error:', err));
        }
        ctx = null;
    }

    return {
        start,
        stop,
        dispose,
        setBpm(next) {
            if (typeof next === 'number' && next > 0) bpm = next;
        },
        setBeatsPerBar(next) {
            if (typeof next === 'number' && next > 0) beatsPerBar = next;
        },
        isRunning: () => running
    };
}

/**
 * Create a drift-corrected repeating ticker. Unlike setInterval, the next delay
 * is recomputed from a fixed start time so the average interval stays accurate
 * over long runs.
 * @param {object} options
 * @param {number} options.intervalMs Target interval between ticks.
 * @param {(tickIndex: number, drift: number) => void} options.onTick Called each tick.
 * @returns {{ start: () => void, stop: () => void, dispose: () => void, isRunning: () => boolean }}
 */
export function createTicker(options = {}) {
    const { intervalMs, onTick } = options;
    if (!intervalMs || intervalMs <= 0) {
        throw new Error('pt-timing.createTicker requires a positive intervalMs.');
    }

    let startTime = 0;
    let count = 0;
    let timerId = null;
    let running = false;

    function schedule() {
        const target = startTime + (count + 1) * intervalMs;
        const delay = Math.max(0, target - performance.now());
        timerId = setTimeout(() => {
            if (!running) return;
            count++;
            const drift = performance.now() - target;
            try { if (typeof onTick === 'function') onTick(count, drift); }
            catch (err) { console.error('pt-timing.createTicker onTick error:', err); }
            if (running) schedule();
        }, delay);
    }

    function start() {
        if (running) return;
        running = true;
        startTime = performance.now();
        count = 0;
        schedule();
    }

    function stop() {
        running = false;
        if (timerId) { clearTimeout(timerId); timerId = null; }
    }

    return { start, stop, dispose: stop, isRunning: () => running };
}

/**
 * Create a drift-corrected countdown timer.
 * @param {object} options
 * @param {number} options.ms Total duration in milliseconds.
 * @param {(remainingMs: number) => void} [options.onTick] Called ~every tickMs.
 * @param {() => void} [options.onDone] Called once when the countdown reaches 0.
 * @param {number} [options.tickMs=100] Update cadence for onTick.
 * @returns {{
 *   start: () => void, pause: () => void, resume: () => void,
 *   stop: () => void, dispose: () => void, reset: (ms?: number) => void,
 *   getRemaining: () => number, isRunning: () => boolean
 * }}
 */
export function createCountdown(options = {}) {
    let { ms } = options;
    const { onTick, onDone, tickMs = 100 } = options;
    if (!ms || ms <= 0) throw new Error('pt-timing.createCountdown requires a positive ms.');

    const totalMs = ms;
    let endTime = 0;
    let remaining = totalMs;
    let timerId = null;
    let running = false;
    let done = false;

    function loop() {
        if (!running) return;
        remaining = Math.max(0, endTime - performance.now());
        try { if (typeof onTick === 'function') onTick(remaining); }
        catch (err) { console.error('pt-timing.createCountdown onTick error:', err); }

        if (remaining <= 0) {
            running = false;
            done = true;
            try { if (typeof onDone === 'function') onDone(); }
            catch (err) { console.error('pt-timing.createCountdown onDone error:', err); }
            return;
        }
        timerId = setTimeout(loop, Math.min(tickMs, remaining));
    }

    function start() {
        if (running || done) return;
        running = true;
        endTime = performance.now() + remaining;
        loop();
    }

    function pause() {
        if (!running) return;
        running = false;
        if (timerId) { clearTimeout(timerId); timerId = null; }
        remaining = Math.max(0, endTime - performance.now());
    }

    function resume() {
        if (running || done) return;
        start();
    }

    function stop() {
        running = false;
        if (timerId) { clearTimeout(timerId); timerId = null; }
    }

    function reset(nextMs) {
        stop();
        done = false;
        remaining = (typeof nextMs === 'number' && nextMs > 0) ? nextMs : totalMs;
    }

    return {
        start, pause, resume, stop,
        dispose: stop,
        reset,
        getRemaining: () => remaining,
        isRunning: () => running
    };
}

/**
 * Create a high-resolution stopwatch based on performance.now().
 * @returns {{
 *   start: () => void, pause: () => void, resume: () => void,
 *   reset: () => void, stop: () => void, dispose: () => void,
 *   getElapsed: () => number, isRunning: () => boolean
 * }}
 */
export function createStopwatch() {
    let startTime = 0;
    let accumulated = 0;
    let running = false;

    function start() {
        if (running) return;
        running = true;
        startTime = performance.now();
    }

    function elapsed() {
        return accumulated + (running ? performance.now() - startTime : 0);
    }

    function pause() {
        if (!running) return;
        accumulated += performance.now() - startTime;
        running = false;
    }

    function reset() {
        accumulated = 0;
        startTime = running ? performance.now() : 0;
    }

    function stop() {
        running = false;
    }

    return {
        start,
        pause,
        resume: start,
        reset,
        stop,
        dispose: stop,
        getElapsed: elapsed,
        isRunning: () => running
    };
}

/**
 * Create a hands-free auto-scroller that scrolls an element at a constant speed
 * using requestAnimationFrame (time-based, so speed is frame-rate independent).
 * Stops automatically at the bottom.
 * @param {Element|null} [el] Scroll container; defaults to document.scrollingElement.
 * @param {object} [options]
 * @param {number} [options.pxPerSecond=40] Scroll speed in pixels per second.
 * @param {() => void} [options.onEnd] Called when the bottom is reached.
 * @returns {{
 *   start: () => void, pause: () => void, resume: () => void,
 *   stop: () => void, dispose: () => void,
 *   setSpeed: (pxPerSecond: number) => void, isRunning: () => boolean
 * }}
 */
export function createAutoScroller(el, options = {}) {
    let { pxPerSecond = 40 } = options;
    const { onEnd } = options;
    const target = el || (typeof document !== 'undefined'
        ? (document.scrollingElement || document.documentElement)
        : null);

    let rafId = null;
    let lastTs = 0;
    let running = false;
    let carry = 0; // sub-pixel remainder so slow speeds still advance

    function maxScroll() {
        if (!target) return 0;
        return Math.max(0, target.scrollHeight - target.clientHeight);
    }

    function frame(ts) {
        if (!running || !target) return;
        if (!lastTs) lastTs = ts;
        const dt = (ts - lastTs) / 1000;
        lastTs = ts;

        carry += pxPerSecond * dt;
        const step = Math.floor(carry);
        if (step > 0) {
            carry -= step;
            target.scrollTop = Math.min(maxScroll(), target.scrollTop + step);
        }

        if (target.scrollTop >= maxScroll()) {
            running = false;
            rafId = null;
            try { if (typeof onEnd === 'function') onEnd(); }
            catch (err) { console.error('pt-timing.createAutoScroller onEnd error:', err); }
            return;
        }
        rafId = requestAnimationFrame(frame);
    }

    function start() {
        if (running || !target) return;
        running = true;
        lastTs = 0;
        carry = 0;
        rafId = requestAnimationFrame(frame);
    }

    function pause() {
        running = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    function resume() {
        if (running || !target) return;
        running = true;
        lastTs = 0;
        rafId = requestAnimationFrame(frame);
    }

    function stop() {
        running = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        carry = 0;
    }

    return {
        start,
        pause,
        resume,
        stop,
        dispose: stop,
        setSpeed(next) {
            if (typeof next === 'number' && next >= 0) pxPerSecond = next;
        },
        isRunning: () => running
    };
}

/**
 * Play a one-shot beep and fully tear down its own AudioContext when done.
 * @param {object} [options]
 * @param {number} [options.frequency=880] Frequency in Hz.
 * @param {number} [options.durationMs=150] Duration in ms.
 * @param {OscillatorType} [options.type='sine'] Waveform.
 * @param {number} [options.gain=0.4] Peak gain 0..1.
 * @returns {Promise<void>} Resolves after the beep finishes and the context closes.
 */
export function beep(options = {}) {
    const { frequency = 880, durationMs = 150, type = 'sine', gain = 0.4 } = options;
    return new Promise((resolve) => {
        let ctx = null;
        try {
            ctx = makeAudioContext();
            const now = ctx.currentTime;
            scheduleClick(ctx, now, { frequency, durationMs, gain, type });
            setTimeout(() => {
                if (ctx && ctx.state !== 'closed') {
                    ctx.close().catch((err) =>
                        console.error('pt-timing.beep close error:', err));
                }
                resolve();
            }, durationMs + 60);
        } catch (err) {
            console.error('pt-timing.beep error:', err);
            if (ctx && ctx.state !== 'closed') {
                ctx.close().catch(() => {});
            }
            resolve();
        }
    });
}
