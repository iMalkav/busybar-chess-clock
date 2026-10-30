import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readMetadata } from './metadata.mjs';

const metadata = readMetadata(process.env.RELEASE_TAG);
const dist = new URL('../dist/', import.meta.url);
const source = new URL(`${metadata.id}.tgz`, dist);
const packaged = JSON.parse(execFileSync('tar', [
  '-xOf', fileURLToPath(source), `${metadata.id}/appmeta/manifest.json`,
], { encoding: 'utf8' }));
if (JSON.stringify(packaged) !== JSON.stringify(JSON.parse(
  readFileSync(new URL('../src/appmeta/manifest.json', import.meta.url), 'utf8'),
))) throw new Error('Archive manifest differs from source; rebuild the application');

const archive = new URL(metadata.archive, dist);
copyFileSync(source, archive);
const hash = createHash('sha256').update(readFileSync(archive)).digest('hex');
writeFileSync(new URL('SHA256SUMS', dist), `${hash}  ${metadata.archive}\n`);
writeFileSync(new URL('RELEASE_NOTES.md', dist), [
  `# ${metadata.name} ${metadata.version}`,
  '',
  `- Application ID: \`${metadata.id}\``,
  `- Minimum HTTP API: \`${metadata.api_version}\``,
  `- Package: \`${metadata.archive}\``,
  '',
  '[Installation instructions](https://github.com/iMalkav/busybar-chess-clock/blob/main/INSTALL.md).',
  '',
].join('\n'));
console.log(`Release prepared: dist/${metadata.archive} (SHA-256 ${hash})`);
