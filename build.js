#!/usr/bin/env node
const esbuild = require('esbuild')
const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
// Config
const distDir = 'dist'
const iconsDir = path.join(distDir, 'assets')
const zipName = 'extension.zip'
console.log('🚧 Starting Build Process...')
// 1. Clean Dist
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true })
}
if (fs.existsSync(zipName)) {
  fs.rmSync(zipName)
}
fs.mkdirSync(distDir)
fs.mkdirSync(iconsDir)
// 2. Bundle Content Script
esbuild.buildSync({
  entryPoints: ['content.js'],
  bundle: true,
  minify: true,
  outfile: path.join(distDir, 'content.js'),
  target: 'chrome100', // Modern chrome target
  format: 'iife'
})
// 3. Bundle Popup
esbuild.buildSync({
  entryPoints: ['popup.js'],
  minify: true,
  outfile: path.join(distDir, 'popup.js'),
  target: 'chrome100'
})
// 4. Minify HTML
const popupHtml = fs.readFileSync('popup.html', 'utf8')
const minifiedHtml = popupHtml
  .replace(/\n\s+/g, '')
  .replace(/>\s+</g, '><')
  .replace(/<!--.*?-->/g, '')
fs.writeFileSync(path.join(distDir, 'popup.html'), minifiedHtml)
// 5. Assets & Manifest
fs.copyFileSync('manifest.json', path.join(distDir, 'manifest.json'))
;['icon16.png', 'icon48.png', 'icon128.png'].forEach(icon => {
  const src = path.join('assets', icon)
  const dest = path.join(iconsDir, icon)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest)
  } else {
    // Create dummy icons if they don't exist to prevent build failure
    if (!fs.existsSync(dest)) {
      fs.writeFileSync(dest, '')
      console.warn(`⚠️ Created empty placeholder for ${icon}`)
    }
  }
})
console.log('✅ Compilation Complete.')
// 6. Zip for Web Store
console.log('📦 Packaging for Web Store...')
const output = fs.createWriteStream(zipName)
const archive = archiver('zip', {
  zlib: { level: 9 } // Max compression
})
output.on('close', function () {
  const mb = (archive.pointer() / 1024 / 1024).toFixed(2)
  console.log(`🎉 Success! ${zipName} created (${mb} MB)`)
  console.log(' Ready to upload to Chrome Web Store Dashboard.')
})
archive.on('error', function (err) {
  throw err
})
archive.pipe(output)
archive.directory(distDir, false)
archive.finalize()
