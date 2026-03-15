// content.js - Toast Selection Popup (Hybrid DOM + Canvas)
;(function () {
  'use strict'

  // --- Global State ---
  let toastEl, canvas, ctx
  let currentSelection = ''
  let selectionRange = null
  let isVisible = false
  let animationId = null
  let buttons = []
  let loadedIcons = {}
  let iconsReady = false
  let isMouseDown = false

  // Animation State
  const animState = {
    buttonHovers: [],
    buttonActive: [],
    opacity: 0,
    hoveredButtonIndex: -1,
    scale: 0.8
  }

  // --- Default Configuration ---
  const defaultConfig = {
    style: {
      bgColor: '#090b10',
      bgOpacity: 0.75,
      hoverColor: '#57595c',
      hoverOpacity: 0.2,
      borderRadius: 16,
      buttonSize: 34,
      buttonSpacing: 6,
      padding: 6,
      iconSize: 20,
      animSpeed: 0.2,
      hoverScale: 1.15,
      activeScale: 0.9,
      iconLift: 3
    },
    buttons: [
      {
        id: 'copy',
        type: 'action',
        action: 'copy',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><g fill="none" stroke="#d5d5d5" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M14.556 13.218a2.67 2.67 0 01-3.774-3.774l2.359-2.36a2.67 2.67 0 013.628-.135m-.325-3.167a2.669 2.669 0 113.774 3.774l-2.359 2.36a2.67 2.67 0 01-3.628.135"/><path d="M10.5 3c-3.287 0-4.931 0-6.037.908a4 4 0 00-.555.554C3 5.57 3 7.212 3 10.5V13c0 3.771 0 5.657 1.172 6.828S7.229 21 11 21h2.5c3.287 0 4.931 0 6.038-.908q.304-.25.554-.554C21 18.43 21 16.788 21 13.5"/></g></svg>'
      },
      {
        id: 'google',
        type: 'link',
        url: 'https://www.google.com/search?q=%s',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><g fill="none" stroke="#d5d5d5"><circle cx="11" cy="11" r="6"/><path stroke-linecap="round" d="M11 8a3 3 0 00-3 3m12 9l-3-3"/></g></svg>'
      }
    ]
  }

  let config = JSON.parse(JSON.stringify(defaultConfig))

  // --- Initialization ---
  function init () {
    chrome.storage.sync.get(['canvasToastConfig'], result => {
      applyConfig(result.canvasToastConfig)
      setupDOM()
      loadIcons()
      attachEvents()
    })
    chrome.storage.onChanged.addListener(changes => {
      if (changes.canvasToastConfig) {
        applyConfig(changes.canvasToastConfig.newValue)
        loadIcons()
        applyWrapperStyles()
        if (isVisible) requestAnimationFrame(draw)
      }
    })
  }

  function applyConfig (newConfig) {
    if (!newConfig) return
    if (!newConfig.buttons || newConfig.buttons.length === 0) {
      config.buttons = defaultConfig.buttons
    } else {
      config.buttons = newConfig.buttons
    }
    if (newConfig.style) {
      config.style = { ...defaultConfig.style, ...newConfig.style }
    }
  }

  // --- DOM Setup (replaces old setupCanvas) ---
  function setupDOM () {
    if (toastEl && document.body.contains(toastEl)) {
      document.body.removeChild(toastEl)
    }

    // Wrapper div: provides blur, border, shadow, and tight bounding box
    toastEl = document.createElement('div')
    Object.assign(toastEl.style, {
      position: 'fixed',
      zIndex: '2147483647',
      display: 'none',
      pointerEvents: 'none',
      // Frosted glass effect
      backdropFilter: 'blur(16px)',
      webkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
      // Layout & animation
      transformOrigin: 'center center',
      overflow: 'hidden',
      willChange: 'transform, opacity',
      opacity: '0',
      transform: 'scale(0.8)'
    })

    // Canvas: only for rendering icons and hover highlights
    canvas = document.createElement('canvas')
    Object.assign(canvas.style, {
      display: 'block',
      pointerEvents: 'none'
    })

    toastEl.appendChild(canvas)
    document.body.appendChild(toastEl)
    ctx = canvas.getContext('2d', { alpha: true })
  }

  function applyWrapperStyles () {
    if (!toastEl) return
    const { style } = config
    const bgRgb = hexToRgb(style.bgColor)
    toastEl.style.background = `rgba(${bgRgb.r},${bgRgb.g},${bgRgb.b},${style.bgOpacity})`
    toastEl.style.borderRadius = style.borderRadius + 'px'
  }

  function attachEvents () {
    document.addEventListener('mouseup', handleSelectionChange)
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('scroll', handleScroll, { passive: true })
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mousedown', handleCanvasDown)
    canvas.addEventListener('mouseup', handleCanvasUp)
    toastEl.addEventListener('mouseleave', () => {
      animState.hoveredButtonIndex = -1
      isMouseDown = false
    })
  }

  // --- Icon Loading ---
  function loadIcons () {
    loadedIcons = {}
    iconsReady = false
    let loadedCount = 0
    const totalIcons = config.buttons.length
    if (totalIcons === 0) {
      iconsReady = true
      return
    }
    animState.buttonHovers = new Array(totalIcons).fill(0)
    animState.buttonActive = new Array(totalIcons).fill(0)
    config.buttons.forEach(btn => {
      const img = new Image()
      let src = btn.icon || ''
      if (src.trim().startsWith('<svg')) {
        try {
          src =
            'data:image/svg+xml;charset=utf-8;base64,' +
            window.btoa(unescape(encodeURIComponent(src)))
        } catch (e) {
          console.error('Icon encoding failed', e)
        }
      }
      img.onload = () => {
        loadedIcons[btn.id] = img
        loadedCount++
        checkReady()
      }
      img.onerror = () => {
        console.warn(`Failed to load icon for ${btn.id}`)
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
  }

  // --- Event Handlers ---
  function handleSelectionChange (e) {
    if (toastEl && toastEl.contains(e.target)) return
    setTimeout(() => {
      const sel = window.getSelection()
      if (sel.rangeCount === 0) return
      const text = sel.toString().trim()
      if (text.length > 0) {
        currentSelection = text
        try {
          selectionRange = sel.getRangeAt(0)
          const rect = selectionRange.getBoundingClientRect()
          if (rect.width === 0 && rect.height === 0) return
          showToast(rect)
        } catch (err) {
          console.error('[Toast] Range error', err)
        }
      } else {
        if (!isMouseDown) hideToast()
      }
    }, 10)
  }

  function handleOutsideClick (e) {
    if (isVisible && toastEl && !toastEl.contains(e.target)) {
      // Don't immediately hide — the mouseup handler will re-evaluate
    }
  }

  function handleScroll () {
    if (isVisible) hideToast()
  }

  // --- Toast Lifecycle ---
  function showToast (rect) {
    const { padding, buttonSize, buttonSpacing } = config.style
    const count = config.buttons.length
    const totalWidth =
      padding * 2 + buttonSize * count + buttonSpacing * (count - 1)
    const totalHeight = padding * 2 + buttonSize

    const dpr = window.devicePixelRatio || 1

    // Size canvas to exact toast content (no buffer)
    canvas.style.width = totalWidth + 'px'
    canvas.style.height = totalHeight + 'px'
    canvas.width = totalWidth * dpr
    canvas.height = totalHeight * dpr
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    // Size wrapper to match canvas exactly
    toastEl.style.width = totalWidth + 'px'
    toastEl.style.height = totalHeight + 'px'
    applyWrapperStyles()

    // Position above selection, centered
    let left = rect.left + rect.width / 2 - totalWidth / 2
    let top = rect.top - totalHeight - 16
    if (top < 0) top = rect.bottom + 16
    if (left < 10) left = 10
    if (left + totalWidth > window.innerWidth - 10) {
      left = window.innerWidth - totalWidth - 10
    }

    // Reset to invisible before showing (prevents flash on re-show)
    toastEl.style.opacity = '0'
    toastEl.style.transform = 'scale(0.8)'

    toastEl.style.left = left + 'px'
    toastEl.style.top = top + 'px'
    toastEl.style.display = 'block'
    toastEl.style.pointerEvents = 'auto'
    canvas.style.pointerEvents = 'auto'

    if (!isVisible) {
      isVisible = true
      animState.opacity = 0
      animState.scale = 0.8
      startLoop()
    }
  }

  function hideToast () {
    isVisible = false
    toastEl.style.pointerEvents = 'none'
    canvas.style.pointerEvents = 'none'
    animState.hoveredButtonIndex = -1
    isMouseDown = false
  }

  // --- Animation Loop ---
  function startLoop () {
    if (animationId) cancelAnimationFrame(animationId)
    animationId = null
    loop()
  }

  function loop () {
    if (!isVisible && animState.opacity < 0.01) {
      animationId = null
      toastEl.style.display = 'none'
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
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 }
  }

  function updateState () {
    const speed = config.style.animSpeed || 0.2
    const targetOpacity = isVisible ? 1 : 0
    const targetScale = isVisible ? 1 : 0.9

    animState.opacity = lerp(animState.opacity, targetOpacity, speed)
    animState.scale = lerp(animState.scale, targetScale, speed)

    // Entrance/exit animation applied via CSS on the wrapper element
    toastEl.style.opacity = animState.opacity
    toastEl.style.transform = `scale(${animState.scale})`

    config.buttons.forEach((_, i) => {
      const isHover = animState.hoveredButtonIndex === i
      const hoverTarget = isHover ? 1 : 0
      animState.buttonHovers[i] = lerp(
        animState.buttonHovers[i] || 0,
        hoverTarget,
        speed * 1.5
      )
      const isActive = isHover && isMouseDown
      const activeTarget = isActive ? 1 : 0
      animState.buttonActive[i] = lerp(
        animState.buttonActive[i] || 0,
        activeTarget,
        speed * 2
      )
    })
  }

  function draw () {
    const { style, buttons: btnConfig } = config
    const dpr = window.devicePixelRatio || 1

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

    // Background, border, blur, and shadow are all handled by
    // the wrapper div via CSS. Canvas only draws interactive content.

    buttons = []
    let x = style.padding
    const y = style.padding

    btnConfig.forEach((btn, i) => {
      const hoverVal = animState.buttonHovers[i]
      const activeVal = animState.buttonActive[i]
      const targetScale =
        1 +
        hoverVal * (style.hoverScale - 1) -
        activeVal * (style.hoverScale - style.activeScale)
      const currentBtnSize = style.buttonSize * targetScale
      const offset = (style.buttonSize - currentBtnSize) / 2

      buttons.push({
        x: x,
        y: y,
        w: style.buttonSize,
        h: style.buttonSize,
        data: btn
      })

      const bx = x + offset
      const by = y + offset

      // Hover highlight
      if (hoverVal > 0.01) {
        ctx.fillStyle = style.hoverColor
        ctx.globalAlpha = style.hoverOpacity * hoverVal
        roundRect(
          ctx,
          bx,
          by,
          currentBtnSize,
          currentBtnSize,
          style.borderRadius
        )
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // Icon
      const iconImg = loadedIcons[btn.id]
      if (iconImg && iconsReady) {
        const lift = hoverVal * -1 * (style.iconLift || 0)
        const scaledIconSize = style.iconSize * targetScale
        const ix = x + (style.buttonSize - scaledIconSize) / 2
        const iy = y + (style.buttonSize - scaledIconSize) / 2 + lift
        ctx.filter =
          hoverVal > 0.01 ? `brightness(${1 + hoverVal * 0.3})` : 'none'
        ctx.drawImage(iconImg, ix, iy, scaledIconSize, scaledIconSize)
        ctx.filter = 'none'
      }

      x += style.buttonSize + style.buttonSpacing
    })
  }

  // --- Mouse Interaction ---
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

  function handleCanvasDown (e) {
    if (animState.hoveredButtonIndex !== -1) {
      isMouseDown = true
    }
  }

  async function handleCanvasUp (e) {
    isMouseDown = false
    if (animState.hoveredButtonIndex === -1) return
    const btn = buttons[animState.hoveredButtonIndex]
    if (!btn) return
    const { type, url, action } = btn.data
    if (type === 'link') {
      const targetUrl = url.includes('%s')
        ? url.replace('%s', encodeURIComponent(currentSelection))
        : url
      window.open(targetUrl, '_blank')
    } else if (type === 'action') {
      if (action === 'copy') {
        try {
          await navigator.clipboard.writeText(currentSelection)
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
          console.error(err)
        }
      }
    }
    hideToast()
  }

  // --- Drawing Utilities ---
  function roundRect (ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2
    if (h < 2 * r) r = h / 2
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  // --- Bootstrap ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
