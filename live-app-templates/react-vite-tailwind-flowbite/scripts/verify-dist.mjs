import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const dist = path.resolve('dist');
const entries = await readdir(dist, { withFileTypes: true });
const names = entries.map((entry) => entry.name);
const errors = [];

if (!names.includes('index.html')) errors.push('dist/index.html is missing');
if (entries.some((entry) => entry.isDirectory())) {
  errors.push('dist contains nested directories; PrimeThink deploys top-level files only');
}
if (!names.some((name) => name.endsWith('.js'))) errors.push('dist has no JavaScript bundle');
if (!names.some((name) => name.endsWith('.css'))) errors.push('dist has no CSS bundle');

if (names.includes('index.html')) {
  const html = await readFile(path.join(dist, 'index.html'), 'utf8');
  if (/(?:src|href)=["']\/(?!\/)/.test(html)) {
    errors.push('dist/index.html contains a root-absolute asset URL');
  }
}

if (errors.length) {
  console.error('PrimeThink build verification failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`PrimeThink build verified: ${names.length} flat, relative deployable files in dist/`);
