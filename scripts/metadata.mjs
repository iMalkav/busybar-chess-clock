import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function validateMetadata(pkg, manifest, tag) {
  if (manifest.format_version !== 1) throw new Error('Unsupported manifest format');
  if (typeof manifest.id !== 'string' || manifest.id.trim() !== manifest.id || !/^[a-zA-Z0-9_][a-zA-Z0-9._-]{0,31}$/.test(manifest.id)) {
    throw new Error('Invalid application ID');
  }
  if (typeof manifest.name !== 'string' || !manifest.name.trim() || /[\r\n]/.test(manifest.name)) {
    throw new Error('Application name must be nonempty and fit on one line');
  }
  if (typeof manifest.version !== 'string' || manifest.version.trim() !== manifest.version || !VERSION.test(manifest.version)) {
    throw new Error('Manifest version must be a stable x.y.z version');
  }
  if (pkg.version !== manifest.version) throw new Error('Package and manifest versions differ');
  if (typeof manifest.api_version !== 'string' || manifest.api_version.trim() !== manifest.api_version || !VERSION.test(manifest.api_version)) {
    throw new Error('Manifest api_version must be x.y.z');
  }
  if (!Number.isInteger(manifest.heap_size_kib) || manifest.heap_size_kib < 1 || manifest.heap_size_kib > 512) {
    throw new Error('Manifest heap_size_kib must be between 1 and 512');
  }
  if (tag !== undefined && tag !== manifest.version) {
    throw new Error(`Tag ${tag} does not match manifest version ${manifest.version}`);
  }
  return { ...manifest, archive: `${manifest.id}-${manifest.version}.tgz` };
}

export function readMetadata(tag) {
  const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
  return validateMetadata(read('../package.json'), read('../src/appmeta/manifest.json'), tag);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const metadata = readMetadata(process.argv[2] ?? process.env.RELEASE_TAG);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `archive=${metadata.archive}\n`);
  }
  console.log(`${metadata.name}: ${metadata.id} ${metadata.version}, API ${metadata.api_version}`);
}
