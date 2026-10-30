import assert from 'node:assert/strict';
import test from 'node:test';
import { validateMetadata } from '../scripts/metadata.mjs';

const pkg = { version: '1.2.3' };
const manifest = {
  format_version: 1,
  id: 'app.example.clock',
  name: 'Example Clock',
  version: '1.2.3',
  api_version: '9.8.7',
  heap_size_kib: 192,
};

test('release archive name comes from validated metadata', () => {
  assert.equal(validateMetadata(pkg, manifest, '1.2.3').archive, 'app.example.clock-1.2.3.tgz');
});

test('release refuses version drift and a tag pointing at another version', () => {
  assert.throws(() => validateMetadata({ version: '1.2.2' }, manifest), /versions differ/);
  for (const tag of ['1.2.2', 'v1.2.3', 'main', '1.2.3\n']) {
    assert.throws(() => validateMetadata(pkg, manifest, tag), /does not match/);
  }
});

test('metadata rejects unsafe IDs and malformed manifest fields', () => {
  for (const [field, value] of [
    ['id', '../other'], ['id', '.hidden'], ['id', 'a'.repeat(33)], ['id', ''],
    ['version', '1.2.3-beta'], ['version', '01.2.3'], ['version', 2],
    ['api_version', undefined], ['api_version', '9.8.7\n'],
    ['name', ''], ['name', 'Example\nClock'],
    ['heap_size_kib', 0], ['heap_size_kib', 513], ['format_version', 2],
  ]) {
    assert.throws(() => validateMetadata(pkg, { ...manifest, [field]: value }), `${field}: ${value}`);
  }
});
