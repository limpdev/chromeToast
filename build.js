#!/usr/bin/env node
'use strict'

const esbuild = require('esbuild')
const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const http = require('http')

const isDev = process.argv.includes('--watch') || process.argv.includes('--dev')
const distDir = 'dist'
const iconsDir = path.join(distDir, 'assets')
const zipName = 'extension.zip'

// ─── Helpers ────────────────────────────────────────────────────────────────

function copyAssets() {
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })
    ;['icon16.png', 'icon48.png', 'icon128.png'].forEach(icon => {
      const src = path.join('assets', icon)
      const dest = path.join(iconsDir, icon)
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest)
      } else if (!fs.existsSync(dest)) {
        fs.writeFileSync(dest, '')
        console.warn(`[warn] Created empty placeholder for ${icon}`)
      }
    })
}

function copyManifest() {
  fs.copyFileSync('manifest.json', path.join(distDir, 'manifest.json'))
}

function minifyAndCopyHtml() {
  const src = fs.readFileSync('popup.html', 'utf8')
  const out = src
    .replace(/\n\s+/g, '')
    .replace(/>\s+</g, '><')
    .replace(/<!--.*?-->/gs, '')
  fs.writeFileSync(path.join(distDir, 'popup.html'), out)
}

function prepareDist() {
  if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true })
  fs.mkdirSync(distDir)
  fs.mkdirSync(iconsDir)
}

// ─── Dev Mode ───────────────────────────────────────────────────────────────

const SSE_PORT = 8099
let sseClients = []

function startSseServer() {
  const server = http.createServer((req, res) => {
    if (req.url !== '/events') {
      res.writeHead(404)
      res.end()
      return
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    })
    res.write('data: connected\n\n')
    sseClients.push(res)
    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res)
    })
  })
  server.listen(SSE_PORT, () => {
    console.log(`[dev] SSE server listening on http://localhost:${SSE_PORT}/events`)
  })
}

function pushReload(reason) {
  console.log(`[dev] Reload triggered: ${reason}`)
  sseClients.forEach(res => res.write('data: reload\n\n'))
}

const reloadShim = `
;(function devReloadShim() {
  const url = 'http://localhost:${SSE_PORT}/events'
  function connect() {
    const es = new EventSource(url)
    es.onmessage = e => {
      if (e.data === 'reload') chrome.runtime.reload()
    }
    es.onerror = () => {
      es.close()
      setTimeout(connect, 2000)
    }
  }
  connect()
})()
`.trim()

function writeReloadShim() {
  fs.writeFileSync(path.join(distDir, 'reload-shim.js'), reloadShim)
}

function writeDevManifest() {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'))

  if (manifest.content_scripts && manifest.content_scripts.length > 0) {
    const entry = manifest.content_scripts[0]
    if (!entry.js.includes('reload-shim.js')) {
      entry.js.push('reload-shim.js')
    }
  }

  if (!manifest.host_permissions) manifest.host_permissions = []
  const shimOrigin = `http://localhost:${SSE_PORT}/`
  if (!manifest.host_permissions.includes(shimOrigin)) {
    manifest.host_permissions.push(shimOrigin)
  }

  fs.writeFileSync(
    path.join(distDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  )
}

function watchStaticFiles() {
  fs.watch('manifest.json', () => {
    console.log('[dev] manifest.json changed')
    writeDevManifest()
    pushReload('manifest.json')
  })

  fs.watch('popup.html', () => {
    console.log('[dev] popup.html changed')
    minifyAndCopyHtml()
    pushReload('popup.html')
  })

  if (fs.existsSync('assets')) {
    fs.watch('assets', () => {
      copyAssets()
      pushReload('assets')
    })
  }
}

async function runDev() {
  console.log('[dev] Starting dev build...')
  prepareDist()
  copyAssets()
  minifyAndCopyHtml()
  writeReloadShim()
  writeDevManifest()

  startSseServer()

  const onRebuild = (label) => ({
    name: 'notify-reload',
    setup(build) {
      build.onEnd(result => {
        if (result.errors.length > 0) {
          console.error(`[dev] ${label} build errors:`, result.errors)
          return
        }
        pushReload(label)
      })
    }
  })

  const contentCtx = await esbuild.context({
    entryPoints: ['content.js'],
    bundle: true,
    minify: false,
    sourcemap: 'inline',
    outfile: path.join(distDir, 'content.js'),
    target: 'chrome100',
    format: 'iife',
    plugins: [onRebuild('content.js')]
  })

  const popupCtx = await esbuild.context({
    entryPoints: ['popup.js'],
    bundle: false,
    minify: false,
    sourcemap: 'inline',
    outfile: path.join(distDir, 'popup.js'),
    target: 'chrome100',
    plugins: [onRebuild('popup.js')]
  })

  const bgCtx = await esbuild.context({
    entryPoints: ['background.js'],
    bundle: true,
    minify: false,
    sourcemap: 'inline',
    outfile: path.join(distDir, 'background.js'),
    target: 'chrome100',
    format: 'esm',
    plugins: [onRebuild('background.js')]
  })

  await Promise.all([contentCtx.watch(), popupCtx.watch(), bgCtx.watch()])
  watchStaticFiles()

  console.log('[dev] Watching for changes. Load dist/ as an unpacked extension.')
  console.log('[dev] Press Ctrl+C to stop.\n')
}

// ─── Production Build ────────────────────────────────────────────────────────

async function runBuild() {
  console.log('Starting build...')
  if (fs.existsSync(zipName)) fs.rmSync(zipName)
  prepareDist()
  copyAssets()
  minifyAndCopyHtml()
  copyManifest()

  esbuild.buildSync({
    entryPoints: ['content.js'],
    bundle: true,
    minify: true,
    outfile: path.join(distDir, 'content.js'),
    target: 'chrome100',
    format: 'iife'
  })

  esbuild.buildSync({
    entryPoints: ['popup.js'],
    minify: true,
    outfile: path.join(distDir, 'popup.js'),
    target: 'chrome100'
  })

  esbuild.buildSync({
    entryPoints: ['background.js'],
    bundle: true,
    minify: true,
    outfile: path.join(distDir, 'background.js'),
    target: 'chrome100',
    format: 'esm'
  })

  console.log('Compilation complete.')

  console.log('Packaging for Web Store...')
  const output = fs.createWriteStream(zipName)
  const archive = archiver('zip', { zlib: { level: 9 } })
  output.on('close', () => {
    const mb = (archive.pointer() / 1024 / 1024).toFixed(2)
    console.log(`Done. ${zipName} created (${mb} MB)`)
  })
  archive.on('error', err => { throw err })
  archive.pipe(output)
  archive.directory(distDir, false)
  archive.finalize()
}

// ─── Entry ───────────────────────────────────────────────────────────────────

if (isDev) {
  runDev().catch(err => { console.error(err); process.exit(1) })
} else {
  runBuild().catch(err => { console.error(err); process.exit(1) })
}