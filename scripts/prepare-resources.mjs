import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { readMetadata } from './metadata.mjs';

readMetadata(process.env.RELEASE_TAG);
const root = new URL('../', import.meta.url);
const destination = new URL('src/resources/legal/', root);
mkdirSync(destination, { recursive: true });
for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  copyFileSync(new URL(file, root), new URL(file, destination));
}
for (const file of readdirSync(new URL('LICENSES/', root))) {
  copyFileSync(new URL(`LICENSES/${file}`, root), new URL(file, destination));
}
