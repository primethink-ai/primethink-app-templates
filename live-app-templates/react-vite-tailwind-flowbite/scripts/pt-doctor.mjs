#!/usr/bin/env node
/**
 * pt-doctor.mjs — build-time gate for known PrimeThink Live App misuse.
 *
 * WHY: every check below is a bug that actually shipped (Ordini Avon post-mortem,
 * 30 Aug 2026). Each one is invisible to Vite/esbuild and to ESLint: the code is
 * syntactically fine, it just calls the platform wrong and fails silently at
 * runtime. Docs did not prevent them; a build gate does.
 *
 * The checks are deliberately SIMPLE REGEX HEURISTICS. They can produce a false
 * positive on unusual code. When one is genuinely wrong, silence it:
 *
 *     const x = res.entities; // pt-doctor-allow: entities-without-metadata
 *     // pt-doctor-allow-file: entities-without-metadata   <- anywhere in the file
 *
 * Scanned: src/ (.js/.jsx for code checks, plus .css/.html and dist/index.html
 * for the text checks).
 *
 * Run: npm run doctor   (also runs as the last step of npm run build)
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const SRC = path.resolve('src');
const DIST_HTML = path.resolve('dist', 'index.html');

const CODE_EXT = /\.(js|jsx)$/;
const TEXT_EXT = /\.(js|jsx|css|html)$/;

/* ------------------------------------------------------------------ *
 * File collection
 * ------------------------------------------------------------------ */

async function collect(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return []; // no src/ — nothing to check
  }
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collect(full)));
    } else if (TEXT_EXT.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** 1-based line number of a character offset. */
function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

/**
 * Blank out line comments, block-comment continuation lines and string literal
 * CONTENTS, so identifier checks don't fire on prose. Only used where the match
 * must be real code — never on className strings.
 */
function codeOnly(line) {
  let out = line.replace(/\/\/.*$/, '');
  if (/^\s*(\/\*|\*)/.test(out)) return '';
  return out.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '$1$1');
}

/** Collect every `name(` call's argument span, balancing parens across lines. */
function callSpans(text, name) {
  const spans = [];
  const opener = new RegExp('\\b' + name + '\\s*\\(', 'g');
  let m;
  while ((m = opener.exec(text))) {
    let depth = 0;
    let i = m.index + m[0].length - 1; // at the '('
    for (; i < text.length; i++) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    spans.push({ start: m.index, args: text.slice(m.index, i + 1) });
  }
  return spans;
}

/* ------------------------------------------------------------------ *
 * Patterns
 * ------------------------------------------------------------------ */

// `response?.text` / `reply.content` on a likely AI-response variable. The
// negative lookahead keeps method CALLS out of it — res.text() on a fetch
// Response is legitimate and must not be flagged.
const RESPONSE_FIELD = /\b(response|reply|answer|aiResponse|aiReply)\s*\??\.\s*(?:text|content)\b(?!\s*\()/;

// pt.onEntityChanged('entity_name', cb) — a string literal in first position.
const ENTITY_CHANGED_STRING_FIRST = /\bonEntityChanged\s*\(\s*['"`]/;

const ENTITIES_ACCESS = /\.\s*entities\b/;

// import { ... } from 'flowbite-react' — captures the braces content.
const FLOWBITE_IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"]flowbite-react['"]/g;

const WEB_STORAGE = /\b(?:window\s*\.\s*)?(?:localStorage|sessionStorage)\b/;

// App Studio mock-screen theme tokens used as Tailwind color utilities.
// Anchored to a color-taking utility prefix so real Tailwind classes such as
// `outline-hidden` and `outline-2` are not caught. Longest token names first.
const PT_MOCK_TOKEN =
  /\b(?:bg|text|border|ring|divide|fill|stroke|from|via|to|accent|caret|decoration|placeholder|shadow|outline)-(?:on-surface-variant|on-surface|on-primary-container|on-primary|primary-container|outline-variant|outline|scaffold|surface)\b/;

// Any remote font: a fonts.* host, or a .woff/.woff2 fetched over http(s).
const CDN_FONT = /https?:\/\/[^"'`\s)]*(?:fonts\.|\.woff2?\b)/;

/* ------------------------------------------------------------------ *
 * Checks
 *
 * { id, level, scope: 'code'|'text', test(ctx) -> [line numbers], why, fix }
 * ctx = { text, lines, has(re) }
 * ------------------------------------------------------------------ */

const CHECKS = [
  {
    id: 'response-text-field',
    level: 'error',
    scope: 'code',
    test: (ctx) =>
      ctx.has(/\bwaitForMessageReceived\b/)
        ? ctx.lines.map((l, i) => (RESPONSE_FIELD.test(l) ? i + 1 : 0)).filter(Boolean)
        : [],
    why: 'waitForMessageReceived() resolves with the AI text on `.message`. `.text` and `.content` are always undefined, so JSON parsing fails silently and the feature does nothing.',
    fix: "const text = response?.message || ''; — or use askAI()/askAIJson() from src/lib/pt-ai.js, which already read the right field."
  },
  {
    id: 'on-entity-changed-arg-order',
    level: 'error',
    scope: 'code',
    test: (ctx) => ctx.lines.map((l, i) => (ENTITY_CHANGED_STRING_FIRST.test(l) ? i + 1 : 0)).filter(Boolean),
    why: 'pt.onEntityChanged takes the CALLBACK first. Passing the entity name first throws "callback must be a function" and real-time sync never starts.',
    fix: "pt.onEntityChanged((event) => { ... }, { entityName: 'your_entity' })"
  },
  {
    id: 'entities-without-metadata',
    level: 'error',
    scope: 'code',
    test: (ctx) =>
      ctx.has(/\breturnMetadata\b/)
        ? []
        : ctx.lines.map((l, i) => (ENTITIES_ACCESS.test(codeOnly(l)) ? i + 1 : 0)).filter(Boolean),
    why: 'pt.list() returns a BARE ARRAY by default, so `result.entities` is undefined. The { entities, count, pagination } shape only exists with returnMetadata: true.',
    fix: "const items = await pt.list({ entityNames: ['task'] });  // already an array\n    // or, if you need pagination metadata:\n    const res = await pt.list({ entityNames: ['task'], returnMetadata: true }); res.entities"
  },
  {
    id: 'flowbite-modal',
    level: 'error',
    scope: 'code',
    test: (ctx) => {
      const hits = [];
      FLOWBITE_IMPORT.lastIndex = 0;
      let m;
      while ((m = FLOWBITE_IMPORT.exec(ctx.text))) {
        if (/\bModal[A-Za-z]*\b/.test(m[1])) hits.push(lineOf(ctx.text, m.index));
      }
      return hits;
    },
    why: "flowbite-react's Modal (and ModalHeader/ModalBody/ModalFooter) uses @floating-ui/react, which crashes at runtime under React 19. There is no build-time warning — the app just dies when the modal opens.",
    fix: "import Modal from './components/Modal.jsx'; — the template ships a React-19-safe portal Modal. Every other flowbite-react component (Button, TextInput, Badge, Spinner, Table…) is fine."
  },
  {
    id: 'web-storage',
    level: 'error',
    scope: 'code',
    // codeOnly() first: the words appear in comments and docs all the time.
    test: (ctx) => ctx.lines.map((l, i) => (WEB_STORAGE.test(codeOnly(l)) ? i + 1 : 0)).filter(Boolean),
    why: 'Live Apps run in a sandboxed iframe and must persist through the chat database. localStorage/sessionStorage is per-browser, invisible to other users and to the AI, and can be unavailable entirely.',
    fix: 'Use pt.add() / pt.edit() / pt.list() on a chat entity instead.'
  },
  {
    id: 'pt-mock-screen-token',
    level: 'error',
    scope: 'text',
    test: (ctx) => ctx.lines.map((l, i) => (PT_MOCK_TOKEN.test(l) ? i + 1 : 0)).filter(Boolean),
    why: 'these are App Studio mock-screen tokens; they generate no CSS in a compiled app — Tailwind v4 silently emits nothing for a utility it does not know, so the element renders transparent/borderless with no error anywhere. The --pt-* custom properties they read exist only inside App Studio’s host shell.',
    fix: 'Use the standard Tailwind palette with an explicit dark: variant on every color:\n    bg-white dark:bg-gray-800  text-gray-900 dark:text-white  border-gray-200 dark:border-gray-700  focus:ring-blue-500'
  },
  {
    id: 'cdn-font',
    level: 'error',
    scope: 'text',
    test: (ctx) => ctx.lines.map((l, i) => (CDN_FONT.test(l) ? i + 1 : 0)).filter(Boolean),
    why: 'a Live App is deployed as a handful of flat files behind the host’s CSP and may run offline; a font fetched from a CDN silently fails to load and the app falls back to a system font mid-layout.',
    fix: 'Use a system font stack (Tailwind’s font-sans), or bundle the font file into the build and @font-face it from the local asset.'
  },
  {
    id: 'add-message-not-hidden',
    level: 'warn',
    scope: 'code',
    // Look for `hidden` inside THIS addMessage(...) call's argument span — a
    // file-wide search would be silenced by Tailwind's `hidden` class.
    test: (ctx) =>
      ctx.has(/\bwaitForMessageReceived\b/)
        ? callSpans(ctx.text, 'addMessage')
            .filter((span) => !/\bhidden\b/.test(span.args))
            .map((span) => lineOf(ctx.text, span.start))
        : [],
    why: 'An addMessage() the app awaits a reply to is an internal prompt. Without { hidden: true } the whole prompt (and any pasted user data) shows up in the chat transcript.',
    fix: 'await pt.addMessage(prompt, { hidden: true })  — with files: pt.addMessage(formData, prompt, { hidden: true })'
  }
];

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

const files = await collect(SRC);
try {
  await readFile(DIST_HTML, 'utf8');
  files.push(DIST_HTML); // built HTML: catches a CDN font left in index.html
} catch {
  /* not built yet */
}

const errors = [];
const warnings = [];
let codeCount = 0;

for (const file of files) {
  const text = await readFile(file, 'utf8');
  const lines = text.split('\n');
  const rel = path.relative(process.cwd(), file);
  const isCode = CODE_EXT.test(file);
  if (isCode) codeCount++;
  const ctx = { text, lines, has: (re) => re.test(text) };

  for (const check of CHECKS) {
    if (check.scope === 'code' && !isCode) continue;
    // File-scope opt-out.
    if (new RegExp('pt-doctor-allow-file:\\s*' + check.id).test(text)) continue;
    let hits;
    try {
      hits = check.test(ctx) || [];
    } catch {
      hits = [];
    }
    // Line-scope opt-out.
    hits = hits.filter((n) => !new RegExp('pt-doctor-allow:\\s*' + check.id).test(lines[n - 1] || ''));
    if (!hits.length) continue;
    (check.level === 'error' ? errors : warnings).push({
      id: check.id,
      where: `${rel}:${hits.join(', ')}`,
      why: check.why,
      fix: check.fix
    });
  }
}

function print(list, label) {
  for (const e of list) {
    console.error(`\n${label} [${e.id}] ${e.where}`);
    console.error(`  Why:  ${e.why}`);
    console.error(`  Fix:  ${e.fix}`);
  }
}

if (warnings.length) {
  console.error('PrimeThink doctor warnings:');
  print(warnings, 'WARN ');
  console.error('');
}

if (errors.length) {
  console.error('PrimeThink doctor FAILED — known Live App misuse detected:');
  print(errors, 'ERROR');
  console.error(`\n${errors.length} error(s). Fix them, or silence a genuine false positive with "// pt-doctor-allow: <rule-id>".\n`);
  process.exit(1);
}

console.log(
  `PrimeThink doctor: ${files.length} file(s) checked (${codeCount} source module(s)), no known misuse patterns found` +
    (warnings.length ? ` — ${warnings.length} warning(s) above` : '') +
    '.'
);
