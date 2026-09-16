const assert = require('node:assert/strict')
const test = require('node:test')

const { createManifest } = require('../build')

const baseManifest = {
  manifest_version: 3,
  background: {
    service_worker: 'background.js',
    type: 'module'
  },
  web_accessible_resources: [{
    resources: ['assets/*.png'],
    matches: ['<all_urls>']
  }]
}

test('creates a Chrome MV3 manifest with a service worker', () => {
  const manifest = createManifest(baseManifest, 'chrome')

  assert.deepEqual(manifest.background, {
    service_worker: 'background.js',
    type: 'module'
  })
  assert.equal(manifest.browser_specific_settings, undefined)
  assert.equal(manifest.web_accessible_resources, undefined)
})

test('creates a Firefox MV3 manifest with background scripts and Gecko metadata', () => {
  const manifest = createManifest(baseManifest, 'firefox')

  assert.deepEqual(manifest.background, {
    scripts: ['background.js'],
    type: 'module'
  })
  assert.deepEqual(manifest.browser_specific_settings, {
    gecko: { id: 'limpdev@proton.me' }
  })
  assert.equal(manifest.web_accessible_resources, undefined)
})

test('rejects an unknown browser target', () => {
  assert.throws(() => createManifest(baseManifest, 'safari'), /Unsupported browser target/)
})
