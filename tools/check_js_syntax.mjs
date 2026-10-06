import { readdirSync, statSync, readFileSync } from 'node:fs';
import { Script } from 'node:vm';
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
const html = readFileSync('index.html', 'utf8');
let inlineScripts = 0;
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc\s*=/.test(match[1]) || !match[2].trim()) continue;
  new Script(match[2], {filename:`index.html:inline-${++inlineScripts}`});
}
console.log(`Syntax check passed for ${inlineScripts} inline scripts.`);
