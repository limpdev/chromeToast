// content.js - Optimized & Fixed
;(function () {
  'use strict'

  // --- Global State ---
  let canvas, ctx
  let currentSelection = ''
  let selectionRange = null
  let isVisible = false
  let animationId = null
  let buttons = []
  let loadedIcons = {}
  let iconsReady = false

  // Animation State
  const animState = {
    toastHover: 0,
    buttonHovers: [],
    opacity: 0,
    hoveredButtonIndex: -1,
    scale: 0.8
  }

  // --- Default Configuration ---
  let config = {
    style: {
      bgColor: '#1e293b',
      bgOpacity: 0.95,
      hoverColor: '#3b82f6',
      hoverOpacity: 0.2,
      borderRadius: 12,
      buttonSize: 36,
      buttonSpacing: 6,
      padding: 6,
      iconSize: 20
    },
    buttons: []
  }

  // --- Initialization ---
  function init () {
    chrome.storage.sync.get(['canvasToastConfig'], result => {
      if (result.canvasToastConfig) {
        config = { ...config, ...result.canvasToastConfig }
        // Merge styles in case new props were added
        config.style = { ...config.style, ...result.canvasToastConfig.style }
      }
      // Load default buttons if none exist
      if (!config.buttons || config.buttons.length === 0) {
        config.buttons = [
          {
            id: 'copy',
            type: 'action',
            action: 'copy',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
          },
          {
            id: 'google',
            type: 'link',
            url: 'https://www.google.com/search?q=%s',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
          }
        ]
      }
      setupCanvas()
      loadIcons()
      attachEvents()
    })

    chrome.storage.onChanged.addListener(changes => {
      if (changes.canvasToastConfig) {
        config = changes.canvasToastConfig.newValue
        loadIcons()
        if (isVisible) requestAnimationFrame(draw)
      }
    })
  }

  function setupCanvas () {
    if (canvas) document.body.removeChild(canvas)
    canvas = document.createElement('canvas')
    Object.assign(canvas.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483647',
      display: 'none',
      filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))'
    })
    document.body.appendChild(canvas)
    ctx = canvas.getContext('2d', { alpha: true })
  }

  function attachEvents () {
    document.addEventListener('mouseup', handleSelectionChange)
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('scroll', handleScroll, { passive: true })
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('mouseleave', () => {
      animState.hoveredButtonIndex = -1
    })
  }

  // --- Logic ---
  function loadIcons () {
    loadedIcons = {}
    iconsReady = false
    let loadedCount = 0
    const totalIcons = config.buttons.length

    if (totalIcons === 0) {
      iconsReady = true
      return
    }

    config.buttons.forEach(btn => {
      const img = new Image()
      let src = btn.icon
      // Robust SVG encoding for UTF-8 support
      if (src.trim().startsWith('<svg')) {
        src =
          'data:image/svg+xml;base64,' +
          window.btoa(unescape(encodeURIComponent(src)))
      }
      img.onload = () => {
        loadedIcons[btn.id] = img
        loadedCount++
        checkReady()
      }
      img.onerror = () => {
        console.warn(`[Toast] Failed to load icon for ${btn.id}`)
        loadedCount++
        checkReady()
      }
      img.src = src
    })

    function checkReady () {
      if (loadedCount === totalIcons) {
        iconsReady = true
        if (isVisible) requestAnimationFrame(draw)
      }
    }

    // Reset hover states
    animState.buttonHovers = new Array(config.buttons.length).fill(0)
  }

  function handleSelectionChange (e) {
    // Small delay to ensure selection is final
    setTimeout(() => {
      const sel = window.getSelection()
      // Safety check for range
      if (sel.rangeCount === 0) return

      const text = sel.toString().trim()
      if (text.length > 0) {
        currentSelection = text
        try {
          selectionRange = sel.getRangeAt(0)
          const rect = selectionRange.getBoundingClientRect()
          // Don't show if off-screen
          if (rect.width === 0 && rect.height === 0) return
          showToast(rect)
        } catch (err) {
          console.error('[Toast] Selection range error', err)
        }
      }
    }, 10)
  }

  function handleOutsideClick (e) {
    if (isVisible && e.target !== canvas) {
      hideToast()
    }
  }

  function handleScroll () {
    if (isVisible) hideToast()
  }

  function showToast (rect) {
    // Calculate Dimensions
    const count = config.buttons.length
    const { padding, buttonSize, buttonSpacing } = config.style
    const totalWidth =
      padding * 2 + buttonSize * count + buttonSpacing * (count - 1)
    const totalHeight = padding * 2 + buttonSize
    const buffer = 40 // Extra space for shadows/hover scale

    // Handle DPI
    const dpr = window.devicePixelRatio || 1
    canvas.style.width = totalWidth + buffer * 2 + 'px'
    canvas.style.height = totalHeight + buffer * 2 + 'px'
    canvas.width = (totalWidth + buffer * 2) * dpr
    canvas.height = (totalHeight + buffer * 2) * dpr

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    // Positioning logic (Center above selection)
    let left = rect.left + rect.width / 2 - totalWidth / 2
    let top = rect.top - totalHeight - 12

    // Boundary checks
    if (top < 0) top = rect.bottom + 12 // Flip to bottom if too high
    if (left < 0) left = 10
    if (left + totalWidth > window.innerWidth)
      left = window.innerWidth - totalWidth - 10

    canvas.style.left = left - buffer + 'px'
    canvas.style.top = top - buffer + 'px'
    canvas.style.display = 'block'
    canvas.style.pointerEvents = 'auto' // Re-enable clicks

    // Reset Animation State
    isVisible = true
    animState.opacity = 0
    animState.scale = 0.8
    animState.hoveredButtonIndex = -1

    startLoop()
  }

  function hideToast () {
    isVisible = false
    canvas.style.pointerEvents = 'none' // Passthrough when hiding
    animState.hoveredButtonIndex = -1
  }

  // --- Rendering Loop ---
  function startLoop () {
    if (!animationId) loop()
  }

  function loop () {
    // If hidden and fully transparent, stop loop
    if (!isVisible && Math.abs(animState.opacity) < 0.01) {
      animationId = null
      canvas.style.display = 'none'
      return
    }

    updateState()
    draw()
    animationId = requestAnimationFrame(loop)
  }

  function lerp (start, end, t) {
    return start * (1 - t) + end * t
  }

  function hexToRgb (hex) {
    const cleaned = hex.replace('#', '')
    return {
      r: parseInt(cleaned.substring(0, 2), 16),
      g: parseInt(cleaned.substring(2, 4), 16),
      b: parseInt(cleaned.substring(4, 6), 16)
    }
  }

  function updateState () {
    // Animate Opacity and Scale
    const targetOpacity = isVisible ? 1 : 0
    const targetScale = isVisible ? 1 : 0.9

    animState.opacity = lerp(animState.opacity, targetOpacity, 0.2)
    animState.scale = lerp(animState.scale, targetScale, 0.2)

    // Update Button Hovers
    config.buttons.forEach((_, i) => {
      const target = animState.hoveredButtonIndex === i ? 1 : 0
      animState.buttonHovers[i] = lerp(
        animState.buttonHovers[i] || 0,
        target,
        0.25
      )
    })
  }

  function draw () {
    const { style, buttons: btnConfig } = config
    const buffer = 40
    const count = btnConfig.length
    const totalW =
      style.padding * 2 +
      style.buttonSize * count +
      style.buttonSpacing * (count - 1)
    const totalH = style.padding * 2 + style.buttonSize

    // Clear canvas (adjusted for DPI)
    ctx.clearRect(
      0,
      0,
      canvas.width / (window.devicePixelRatio || 1),
      canvas.height / (window.devicePixelRatio || 1)
    )

    if (animState.opacity < 0.01) return

    ctx.save()

    // Global transforms
    const cx = buffer + totalW / 2
    const cy = buffer + totalH / 2
    ctx.translate(cx, cy)
    ctx.scale(animState.scale, animState.scale)
    ctx.translate(-cx, -cy)
    ctx.globalAlpha = animState.opacity

    // 1. Draw Background Capsule
    const bgRgb = hexToRgb(style.bgColor)
    ctx.fillStyle = `rgba(${bgRgb.r},${bgRgb.g},${bgRgb.b},${style.bgOpacity})`
    roundRect(ctx, buffer, buffer, totalW, totalH, style.borderRadius)
    ctx.fill()

    // 2. Draw Buttons
    buttons = [] // Reset hit regions
    let x = buffer + style.padding
    const y = buffer + style.padding

    btnConfig.forEach((btn, i) => {
      // Store hit region
      buttons.push({
        x: x,
        y: y,
        w: style.buttonSize,
        h: style.buttonSize,
        data: btn
      })

      const hoverVal = animState.buttonHovers[i]

      // Draw Hover Effect
      if (hoverVal > 0.01) {
        ctx.fillStyle = style.hoverColor
        ctx.globalAlpha = animState.opacity * style.hoverOpacity * hoverVal
        roundRect(
          ctx,
          x,
          y,
          style.buttonSize,
          style.buttonSize,
          style.borderRadius / 2
        )
        ctx.fill()
        ctx.globalAlpha = animState.opacity
      }

      // Draw Icon
      const iconImg = loadedIcons[btn.id]
      if (iconImg && iconsReady) {
        // Subtle lift on hover
        const lift = hoverVal * -2
        const ix = x + (style.buttonSize - style.iconSize) / 2
        const iy = y + (style.buttonSize - style.iconSize) / 2 + lift

        ctx.filter =
          hoverVal > 0.01 ? `brightness(${1 + hoverVal * 0.3})` : 'none'
        ctx.drawImage(iconImg, ix, iy, style.iconSize, style.iconSize)
        ctx.filter = 'none'
      }

      x += style.buttonSize + style.buttonSpacing
    })

    ctx.restore()
  }

  function handleMouseMove (e) {
    if (!isVisible) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    let cursor = 'default'
    let hoveredIndex = -1

    buttons.forEach((btn, i) => {
      if (
        mx >= btn.x &&
        mx <= btn.x + btn.w &&
        my >= btn.y &&
        my <= btn.y + btn.h
      ) {
        cursor = 'pointer'
        hoveredIndex = i
      }
    })

    animState.hoveredButtonIndex = hoveredIndex
    canvas.style.cursor = cursor
  }

  async function handleClick (e) {
    if (animState.hoveredButtonIndex === -1) return

    const btn = buttons[animState.hoveredButtonIndex]
    if (!btn) return

    const { type, url, action } = btn.data

    // --- Action Handling ---
    if (type === 'link') {
      // Handle search replacement
      const targetUrl = url.includes('%s')
        ? url.replace('%s', encodeURIComponent(currentSelection))
        : url
      window.open(targetUrl, '_blank')
    } else if (type === 'action') {
      if (action === 'copy') {
        try {
          await navigator.clipboard.writeText(currentSelection)
          flashToast(btn) // Visual feedback (not implemented, but good placeholder)
        } catch (err) {
          console.error('Copy failed:', err)
        }
      } else if (action === 'paste') {
        try {
          const text = await navigator.clipboard.readText()
          if (selectionRange) {
            selectionRange.deleteContents()
            selectionRange.insertNode(document.createTextNode(text))
          }
        } catch (err) {
          console.error('Paste failed:', err)
          alert('Allow clipboard permissions for Toast to paste.')
        }
      }
    }

    hideToast()
  }

  // --- Polyfill ---
  function roundRect (ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, r)
      ctx.closePath()
    } else {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
