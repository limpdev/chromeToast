#!/usr/bin/env node

// Build script for Chrome Extension
// Minifies and bundles all extension files

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const distDir = 'dist';
const iconsDir = path.join(distDir, 'assets');

// Clean and create dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir);
fs.mkdirSync(iconsDir);

// Build content script
esbuild.buildSync({
  entryPoints: ['content.js'],
  bundle: true,
  minify: true,
  outfile: path.join(distDir, 'content.js'),
  target: 'chrome90',
  format: 'iife',
});

// Build popup script
esbuild.buildSync({
  entryPoints: ['popup.js'],
  minify: true,
  outfile: path.join(distDir, 'popup.js'),
  target: 'chrome90',
});

// Minify popup HTML
const popupHtml = fs.readFileSync('popup.html', 'utf8');
const minifiedHtml = popupHtml
  .replace(/\n\s+/g, '') // Remove newlines and indentation
  .replace(/>\s+</g, '><') // Remove whitespace between tags
  .replace(/\s{2,}/g, ' '); // Collapse multiple spaces

fs.writeFileSync(path.join(distDir, 'popup.html'), minifiedHtml);

// Copy manifest and icons
fs.copyFileSync('manifest.json', path.join(distDir, 'manifest.json'));

// Copy icon files
const icons = ['icon16.png', 'icon48.png', 'icon128.png'];
icons.forEach(icon => {
  const src = path.join('assets', icon);
  const dest = path.join(iconsDir, icon);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
});

console.log('✓ Build complete!');
console.log(`✓ Content script: ${getFileSize('content.js')} → ${getFileSize(path.join(distDir, 'content.js'))}`);
console.log(`✓ Popup script: ${getFileSize('popup.js')} → ${getFileSize(path.join(distDir, 'popup.js'))}`);
console.log(`✓ Popup HTML: ${getFileSize('popup.html')} → ${getFileSize(path.join(distDir, 'popup.html'))}`);

function getFileSize(filepath) {
  const stats = fs.statSync(filepath);
  const kb = (stats.size / 1024).toFixed(2);
  return `${kb} KB`;
}