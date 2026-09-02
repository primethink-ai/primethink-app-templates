#!/usr/bin/env node
/**
 * check-template-drift.mjs — keep the shared theme bridge identical everywhere.
 *
 * WHY: all six live-app templates carry the same inline theme-bridge <script>.
 * When that bridge was wrong (it ignored the server-injected class on <html>,
 * so every app in the PrimeThink iframe followed the OS theme instead of the
 * host's), the fix had to land in six files. This guard makes a partial fix a
 * hard failure: if one template's bridge differs from the others, the check
 * fails and names the odd one out.
 *
 * It also asserts each bridge still consults all four signals, so a change that
 * degrades every template uniformly can't slip past the equality check.
 *
 * Run: node scripts/check-template-drift.mjs
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TEMPLATES = path.join(ROOT, 'live-app-templates');

// Every signal the bridge must keep consulting. See §1 of the template AGENTS.md.
const REQUIRED = [
  { id: 'query param', re: /location\.search/ },
  // Must READ the class, not merely write it: apply() always touches classList,
  // so only a `contains('dark'|'light')` proves the injected class is consulted.
  { id: "server-injected class on <html> (contains('dark'|'light'))", re: /\.contains\(\s*['"](?:dark|light)['"]\s*\)/ },
  { id: 'OS preference', re: /prefers-color-scheme/ },
  { id: 'pt:theme postMessage', re: /pt:theme/ }
];

/** Pull the inline <script> that contains the theme bridge out of an HTML file. */
function extractBridge(html) {
  const scripts = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
  const bridge = scripts.find((s) => /pt:theme/.test(s) || /prefers-color-scheme/.test(s));
  return bridge ? bridge.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '') : null;
}

/**
 * Normalise for comparison: drop comments (they are allowed to differ per
 * template) and collapse all whitespace, so only the logic is compared.
 */
function normalise(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

const dirs = (await readdir(TEMPLATES, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const errors = [];
const warnings = [];
const bridges = new Map(); // template name -> normalised source bridge

for (const name of dirs) {
  const file = path.join(TEMPLATES, name, 'index.html');
  let html;
  try {
    html = await readFile(file, 'utf8');
  } catch {
    errors.push(`${name}: no index.html`);
    continue;
  }
  const bridge = extractBridge(html);
  if (!bridge) {
    errors.push(`${name}/index.html: no theme-bridge <script> found`);
    continue;
  }
  for (const req of REQUIRED) {
    if (!req.re.test(bridge)) {
      errors.push(`${name}/index.html: theme bridge no longer checks ${req.id}`);
    }
  }
  bridges.set(name, normalise(bridge));

  // dist/ is build output. A dist bridge that differs from its own source means
  // the template was edited but never rebuilt — a warning, not a failure, since
  // rebuilding is the fix and dist may legitimately be absent.
  const distFile = path.join(TEMPLATES, name, 'dist', 'index.html');
  try {
    const distBridge = extractBridge(await readFile(distFile, 'utf8'));
    if (distBridge && normalise(distBridge) !== normalise(bridge)) {
      warnings.push(`${name}/dist/index.html bridge is stale — run \`npm run build\` in ${name}/`);
    }
  } catch {
    /* no dist/ — nothing to compare */
  }
}

// Compare every source bridge against the majority variant.
if (bridges.size > 1) {
  const counts = new Map();
  for (const code of bridges.values()) counts.set(code, (counts.get(code) || 0) + 1);
  const [majority] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const odd = [...bridges.entries()].filter(([, code]) => code !== majority).map(([name]) => name);
  if (odd.length) {
    errors.push(
      `theme bridge differs between templates — odd one(s) out: ${odd.join(', ')}\n` +
        `  ${counts.size} distinct variants across ${bridges.size} templates.\n` +
        '  The bridge is a shared invariant: fix it in every live-app-templates/*/index.html.'
    );
  }
}

if (warnings.length) {
  console.error('Template drift warnings:');
  warnings.forEach((w) => console.error(`- ${w}`));
  console.error('');
}

if (errors.length) {
  console.error('Template drift check FAILED:');
  errors.forEach((e) => console.error(`- ${e}`));
  process.exit(1);
}

console.log(
  `Template drift check passed: ${bridges.size} templates share one theme bridge (all four signals present)` +
    (warnings.length ? `, ${warnings.length} warning(s) above` : '') +
    '.'
);
