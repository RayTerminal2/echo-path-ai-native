// DEV-008: build a self-contained static publish directory (dist/) from the runtime allowlist only.
import {cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

const files = [
  'index.html',
  'src/app.mjs',
  'src/render.mjs',
  'src/game-engine.mjs',
  'data/levels.v0.2.json',
  'data/levels.experimental.json',
  'data/levels.campaign.json',
];

const secretPatterns = [
  /\bsk-[A-Za-z0-9_-]{8,}/,
  /api[_-]?key\s*[:=]/i,
  /(secret|token|passw(?:ord|orf)|private[_-]?key)\s*[:=]\s*['"][^'"]{6,}/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /Bearer\s+[A-Za-z0-9._-]{16,}/,
];

rmSync('dist', {recursive: true, force: true});
const manifest = [];
const findings = [];
for (const file of files) {
  const body = readFileSync(file);
  const text = body.toString('utf8');
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) findings.push(`${file}: matched ${pattern}`);
  }
  if (file.endsWith('.json')) {
    const parsed = JSON.parse(text);
    if (file === 'data/levels.campaign.json' && parsed.length !== 50) throw new Error('campaign data is not 50 levels');
    if (file === 'data/levels.v0.2.json' && parsed.length !== 9) throw new Error('classic data is not 9 levels');
    if (file === 'data/levels.experimental.json' && parsed.length !== 8) throw new Error('experimental data is not 8 levels');
  }
  const target = 'dist/' + file;
  mkdirSync(target.slice(0, target.lastIndexOf('/')), {recursive: true});
  cpSync(file, target);
  manifest.push({file, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex')});
}

if (findings.length > 0) {
  console.error('SENSITIVE CONTENT FOUND:\n' + findings.join('\n'));
  rmSync('dist', {recursive: true, force: true});
  process.exit(1);
}

const listed = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const path = dir + '/' + entry.name;
    if (entry.isDirectory()) walk(path);
    else listed.push(path.replace('dist/', ''));
  }
};
walk('dist');
const extra = listed.filter((path) => !files.includes(path));
if (extra.length > 0) throw new Error('unexpected files in dist: ' + extra.join(','));

writeFileSync('dist/manifest.json', JSON.stringify({builtAt: new Date().toISOString(), files: manifest}, null, 2) + '\n');
console.log('dist ready: ' + files.length + ' files, secret scan clean.');
for (const entry of manifest) console.log(`${entry.sha256.slice(0, 12)}  ${entry.bytes}B  ${entry.file}`);
