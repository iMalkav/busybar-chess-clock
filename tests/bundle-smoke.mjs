import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Script } from 'node:vm'

const scenarios = ['defaults', 'configured', 'unavailable', 'invalid', 'deferred']
const scenario = process.argv[2]
if (scenario === undefined) {
  for (const name of scenarios) {
    execFileSync(process.execPath, [fileURLToPath(import.meta.url), name], {
      stdio: 'inherit', timeout: 10_000,
    })
  }
  process.exit(0)
}
assert.ok(scenarios.includes(scenario), `unknown scenario: ${scenario}`)

const sourceManifest = JSON.parse(
  readFileSync(new URL('../src/appmeta/manifest.json', import.meta.url), 'utf8'),
)
const settingsSchema = JSON.parse(
  readFileSync(new URL('../src/appmeta/settings.json', import.meta.url), 'utf8'),
)
const configured = scenario === 'configured' || scenario === 'deferred'
const fallback = scenario === 'unavailable' || scenario === 'invalid'
const startingPlayer = configured ? 1 : 0
const initialMinutes = configured ? 12 : fallback ? 8 : settingsSchema.fields.initial_minutes.default
const soundEnabled = !configured
const localWrites = []
const errors = []
const originalConsoleError = console.error
console.error = (...parts) => errors.push(parts.join(' '))
let releaseSettings
const requests = []
let inputHandler
let inputUnbound = false

globalThis.localStorage = (() => {
  const values = new Map([['initial-time-ms', String(8 * 60_000)]])
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      localWrites.push({ key, value: String(value) })
      values.set(key, String(value))
    },
  }
})()

globalThis.listen = (type, handler) => {
  assert.equal(type, 'input')
  inputHandler = handler
  return () => {
    inputUnbound = true
  }
}

globalThis.fetch = async (input, init) => {
  const request = input instanceof Request ? input : new Request(input, init)
  const body = request.body ? await request.text() : ''
  requests.push({ url: request.url, method: request.method, body })

  if (new URL(request.url).pathname === '/api/apps/settings') {
    assert.equal(request.method, 'GET')
    assert.equal(new URL(request.url).searchParams.get('app_id'), sourceManifest.id)
    if (scenario === 'unavailable') return new Response('Settings unavailable', { status: 503 })
    const response = new Response(JSON.stringify({
      version: scenario === 'invalid' ? settingsSchema.version + 1 : settingsSchema.version,
      values: configured ? { initial_minutes: 12, starting_player: 'right', sound: false } : {},
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    if (scenario === 'deferred') return new Promise((resolve) => { releaseSettings = () => resolve(response) })
    return response
  }

  if (request.url.endsWith('/api/version')) {
    return new Response(JSON.stringify({ api_semver: sourceManifest.api_version }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (request.method === 'GET' && request.url.endsWith('/api/busy/snapshot')) {
    return new Response(
      JSON.stringify({
        snapshot: {
          type: 'NOT_STARTED',
          busy_bar_settings: {
            theme: 'dnd',
            show_work_phase_only: false,
            trigger_smart_home: false,
          },
        },
        snapshot_timestamp_ms: Date.now(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const bundle = new URL('../dist/app.busy.chess_clock/scripts/main.js', import.meta.url)
new Script(readFileSync(bundle, 'utf8'), { filename: 'main.js' })
const archive = new URL('../dist/app.busy.chess_clock.tgz', import.meta.url)
const entries = execFileSync('tar', ['-tzf', fileURLToPath(archive)], { encoding: 'utf8' })
  .trim().split(/\r?\n/)
for (const entry of entries) {
  assert.ok(entry.startsWith('app.busy.chess_clock/'), `unexpected archive root: ${entry}`)
  assert.ok(!entry.includes('..') && !entry.includes('\\'), `unsafe archive path: ${entry}`)
}
const extract = (entry) => execFileSync('tar', ['-xOf', fileURLToPath(archive), entry])
const manifest = JSON.parse(extract('app.busy.chess_clock/appmeta/manifest.json'))
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
assert.equal(manifest.version, pkg.version)
assert.deepEqual(manifest, sourceManifest)
assert.deepEqual(JSON.parse(extract('app.busy.chess_clock/appmeta/settings.json')), settingsSchema)
for (const name of ['countdown_tick', 'countdown_finish', 'session_completed']) {
  const sound = extract(`app.busy.chess_clock/sounds/${name}.snd`)
  assert.ok(sound.length > 0 && sound.length % 2 === 0, `invalid PCM: ${name}`)
  assert.notEqual(sound.subarray(0, 4).toString(), 'RIFF')
  assert.deepEqual(sound, readFileSync(new URL(`../src/sounds/${name}.snd`, import.meta.url)))
}
for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'BUSY-App-MIT.txt', 'OFL-1.1.txt', 'CC-BY-SA-4.0.txt']) {
  const entry = entries.find((path) => path.startsWith('app.busy.chess_clock/resources/') && path.endsWith(`/${name}`))
  assert.ok(entry, `missing license notice: ${name}`)
  assert.ok(extract(entry).length > 0)
}
assert.equal(entries.some((entry) => /\.(wav|ts|tsbuildinfo)$/.test(entry)), false)
await import(bundle.href)
if (scenario === 'deferred') {
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(typeof inputHandler, 'undefined', 'input was enabled before settings loaded')
  assert.equal(requests.some((request) => request.url.endsWith('/api/display/draw')), false)
  assert.equal(typeof releaseSettings, 'function')
  releaseSettings()
}
await new Promise((resolve) => setTimeout(resolve, 50))

assert.equal(typeof inputHandler, 'function')
assert.equal(requests.filter((request) => new URL(request.url).pathname === '/api/apps/settings').length, 1)

const draws = requests.filter(
  (request) => request.method === 'POST' && request.url.endsWith('/api/display/draw'),
)
assert.ok(draws.length > 0, 'bundle did not draw')
assert.equal(
  requests.some((request) => request.url.endsWith('/api/version')),
  false,
  'minimal device client must not perform a version handshake',
)

const payloads = draws.map((draw) => JSON.parse(draw.body))
for (const payload of payloads) assert.equal(payload.application_name, 'app.busy.chess_clock')
for (const request of requests) {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(request.url).hostname))
}
const elements = payloads.flatMap((payload) => payload.elements)
assert.deepEqual([...new Set(elements.map((element) => element.display))].sort(), [
  'back',
  'front',
])
const timeElements = elements.filter(
  (element) => element.type === 'text' && /^\d/.test(element.text),
)
assert.deepEqual(
  timeElements.filter((element) => element.display === 'front').map((element) => element.text),
  [`${initialMinutes}:00`, `${initialMinutes}:00`],
)
assert.deepEqual(
  timeElements.filter((element) => element.display === 'back').map((element) => element.text),
  Array(4).fill(`${initialMinutes}:00`),
)
assert.ok(elements.some((element) => element.id === `back-arena-p${startingPlayer}-status` && element.text === 'FIRST MOVE'))
for (const element of elements) {
  const width = element.display === 'back' ? 160 : 72
  const height = element.display === 'back' ? 80 : 16
  assert.ok(element.x >= 0 && element.x < width, `x outside ${element.display}: ${element.x}`)
  assert.ok(element.y >= 0 && element.y < height, `y outside ${element.display}: ${element.y}`)
}

inputHandler({ key: 'ok', action: 'release' })
inputHandler({ key: 'encoder', delta: 1 })
inputHandler({ key: 'ok', action: 'release' })
await new Promise((resolve) => setTimeout(resolve, 20))
assert.deepEqual(localWrites, fallback ? [{ key: 'initial-time-ms', value: String((initialMinutes + 1) * 60_000) }] : [])
inputHandler({ key: 'start', action: 'press' })
inputHandler({ key: 'start', action: 'release' })
await new Promise((resolve) => setTimeout(resolve, 20))
const updatedElements = requests
  .filter((request) => request.method === 'POST' && request.url.endsWith('/api/display/draw'))
  .flatMap((request) => JSON.parse(request.body).elements)
assert.ok(updatedElements.some((element) => element.id === `back-arena-p${startingPlayer}-status` && element.text === 'THINKING'))
assert.equal(requests.some((request) => request.url.endsWith('/api/audio/play')), soundEnabled)
inputHandler({ key: 'back', action: 'press' })
await new Promise((resolve) => setTimeout(resolve, 20))
inputHandler({ key: 'back', action: 'press' })
await new Promise((resolve) => setTimeout(resolve, 50))

assert.equal(inputUnbound, true)
assert.ok(
  requests.some(
    (request) => request.method === 'DELETE' && request.url.endsWith('/api/display/draw'),
  ),
  'bundle did not clear the display on exit',
)
assert.equal(errors.length, fallback ? 1 : 0, errors.join('\n'))
if (scenario === 'unavailable') assert.match(errors[0], /HTTP 503/)
if (scenario === 'invalid') assert.match(errors[0], /Unsupported settings schema version/)
console.error = originalConsoleError

console.log(`Bundle smoke test passed: ${scenario}`)
