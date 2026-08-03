import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['api', 'js', 'tools'];
const files = ['env.js'];

function collect(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) collect(path);
    else if (path.endsWith('.js') || path.endsWith('.mjs')) files.push(path);
  }
}

for (const root of roots) collect(root);

for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    const details = result.error?.stack || result.stderr || result.stdout || 'Unknown syntax-check failure';
    process.stderr.write(`${file}: ${details}\n`);
    process.exit(result.status || 1);
  }
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
