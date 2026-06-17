#!/usr/bin/env node
/**
 * Print AS-IS tech stack snapshot from package.json for TECH_STACK_WORKSPACE refinement.
 * Usage: npm run audit:tech-stack
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));

const sections = [
  ['Runtime', { node: pkg.engines?.node ?? 'unknown' }],
  ['Dependencies', pkg.dependencies ?? {}],
  ['DevDependencies', pkg.devDependencies ?? {}],
];

console.log('# Tech Stack AS-IS Snapshot');
console.log(`# Generated: ${new Date().toISOString().slice(0, 10)}`);
console.log(`# Package: ${pkg.name}@${pkg.version}\n`);

for (const [title, data] of sections) {
  console.log(`## ${title}\n`);
  if (typeof data === 'string') {
    console.log(data);
  } else {
    for (const [name, ver] of Object.entries(data).sort(([a], [b]) => a.localeCompare(b))) {
      console.log(`- ${name}: ${ver}`);
    }
  }
  console.log('');
}

console.log('→ Update docs/TECH_STACK_WORKSPACE.md after decisions.\n');
