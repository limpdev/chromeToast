// content.js - Toast Selection Popup (Hybrid DOM + Canvas)
(function () {
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
  // Context: 'text' | 'image'
  let currentContext = 'text'
  let imageContext = { src: null, resolvedUrl: null, isAccessible: true }
  let hoveredImage = null // <img> element the cursor is currently over
  // Animation State
  const animState = {
    buttonHovers: [],
    buttonActive: [],
    opacity: 0,
    hoveredButtonIndex: -1,
    scale: 0.8
  }
  const springs = {
    opacity: { val: 0, vel: 0 },
    scale: { val: 0.8, vel: 0 },
    buttons: []
  }
  const SPRING_STIFFNESS = 280
  const SPRING_DAMPING = 22
  const HOVER_STIFFNESS = 320
  const HOVER_DAMPING = 26
  let lastTime = null
  function stepSpring(spring, target, stiffness, damping, dt) {
    const force = -stiffness * (spring.val - target)
    const dampen = -damping * spring.vel
    spring.vel += (force + dampen) * dt
    spring.val += spring.vel * dt
    if (Math.abs(spring.val - target) < 0.001 && Math.abs(spring.vel) < 0.001) {
      spring.val = target
      spring.vel = 0
    }
  }
  // --- Default Configuration ---
  const defaultConfig = {
    style: {
      bgColor: '#1b1c1d',
      bgOpacity: 0.75,
      hoverColor: '#404040',
      hoverOpacity: 0.2,
      borderRadius: 13,
      padding: 6,
      iconSize: 18,
      iconPadding: 5,
      buttonSpacing: 4,
      hoverScale: 1.15,
      activeScale: 0.9,
      iconLift: 3
    },
    buttons: [
      {
        id: 'copy',
        type: 'action',
        action: 'copy',
        contexts: ['text', 'image'],
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><g fill="none" stroke="#d5d5d5" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M14.556 13.218a2.67 2.67 0 01-3.774-3.774l2.359-2.36a2.67 2.67 0 013.628-.135m-.325-3.167a2.669 2.669 0 113.774 3.774l-2.359 2.36a2.67 2.67 0 01-3.628.135"/><path d="M10.5 3c-3.287 0-4.931 0-6.037.908a4 4 0 00-.555.554C3 5.57 3 7.212 3 10.5V13c0 3.771 0 5.657 1.172 6.828S7.229 21 11 21h2.5c3.287 0 4.931 0 6.038-.908q.304-.25.554-.554C21 18.43 21 16.788 21 13.5"/></g></svg>'
      },
      {
        id: 'google-text',
        type: 'link',
        url: 'https://www.google.com/search?q=%s',
        contexts: ['text'],
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><g fill="none" stroke="#d5d5d5"><circle cx="11" cy="11" r="6"/><path stroke-linecap="round" d="M11 8a3 3 0 00-3 3m12 9l-3-3"/></g></svg>'
      },
      {
        id: 'google-lens',
        type: 'image-search',
        url: 'https://lens.google.com/uploadbyurl?url=%s',
        contexts: ['image'],
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><g fill="none" stroke="#d5d5d5" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path stroke-linecap="round" d="M3 9V6.5A2.5 2.5 0 015.5 4H8M3 15v2.5A2.5 2.5 0 005.5 20H8m8-16h2.5A2.5 2.5 0 0121 6.5V9m0 6v2.5a2.5 2.5 0 01-2.5 2.5H16"/></g></svg>'
      }
    ]
  }
  let config = JSON.parse(JSON.stringify(defaultConfig))
  // --- Helpers ---
  const hexToRgbCache = new Map()
  function hexToRgb(hex) {
    if (hexToRgbCache.has(hex)) return hexToRgbCache.get(hex)
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    const rgb = result
      ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
      : { r: 0, g: 0, b: 0 }
    hexToRgbCache.set(hex, rgb)
    return rgb
  }
  // Resolves an <img> src to an absolute URL.
  // Returns null if the src is a data: or blob: URI (not usable by remote engines).
  function resolveImageUrl(src) {
    if (!src) return null
    if (src.startsWith('data:') || src.startsWith('blob:')) return null
    try {
      return new URL(src, document.baseURI).href
    } catch {
      return null
    }
  }
  // --- Initialization ---
  function init() {
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
  function applyConfig(newConfig) {
    if (!newConfig) return
    config.buttons =
      newConfig.buttons && newConfig.buttons.length > 0
        ? newConfig.buttons
        : defaultConfig.buttons
    if (newConfig.style) {
      config.style = { ...defaultConfig.style, ...newConfig.style }
    }
  }
  // --- DOM Setup ---
  function setupDOM() {
    if (toastEl && document.body.contains(toastEl)) {
      document.body.removeChild(toastEl)
    }
    toastEl = document.createElement('div')
    Object.assign(toastEl.style, {
      position: 'fixed',
      zIndex: '2147483647',
      display: 'none',
      pointerEvents: 'none',
      backdropFilter: 'blur(16px)',
      webkitBackdropFilter: 'blur(16px)',
      border: '0.5px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
      transformOrigin: 'center center',
      overflow: 'hidden',
      willChange: 'transform, opacity',
      opacity: '0',
      transform: 'scale(0.7)'
    })
    canvas = document.createElement('canvas')
    Object.assign(canvas.style, {
      display: 'block',
      pointerEvents: 'none'
    })
    toastEl.appendChild(canvas)
    document.body.appendChild(toastEl)
    ctx = canvas.getContext('2d', { alpha: true })
  }
  function applyWrapperStyles() {
    if (!toastEl) return
    const { style } = config
    const bgRgb = hexToRgb(style.bgColor)
    toastEl.style.background = `rgba(${bgRgb.r},${bgRgb.g},${bgRgb.b},${style.bgOpacity})`
    toastEl.style.borderRadius = style.borderRadius + 'px'
  }
  // Replace attachEvents() with:
  function attachEvents() {
    // Text selection
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('scroll', handleScroll, { passive: true })

    // Image hover tracking
    document.addEventListener('mouseover', handleImageMouseOver)
    document.addEventListener('mouseout', handleImageMouseOut)

    // Ctrl+hover trigger
    document.addEventListener('keydown', handleKeyDown)

    // Canvas interactions
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mousedown', handleCanvasDown)
    canvas.addEventListener('mouseup', handleCanvasUp)
    toastEl.addEventListener('mouseleave', () => {
      animState.hoveredButtonIndex = -1
      isMouseDown = false
    })
  }
  // Replace handleImageClick with these three functions:

  function handleImageMouseOver(e) {
    const target = e.target
    if (!(target instanceof HTMLImageElement)) return
    if (toastEl && toastEl.contains(target)) return
    hoveredImage = target
  }

  function handleImageMouseOut(e) {
    const target = e.target
    if (!(target instanceof HTMLImageElement)) return
    // If the cursor moves into the toast itself, keep hoveredImage alive
    // so the user can Ctrl+click a button without losing context
    if (toastEl && toastEl.contains(e.relatedTarget)) return
    if (target === hoveredImage) hoveredImage = null
  }

  function handleKeyDown(e) {
    // Only Control, not Ctrl+C / Ctrl+V / etc.
    if (e.key !== 'Control' || e.ctrlKey === false) return
    if (!hoveredImage) return

    const resolved = resolveImageUrl(hoveredImage.src)
    imageContext = {
      src: hoveredImage.src,
      resolvedUrl: resolved,
      isAccessible: resolved !== null
    }
    currentContext = 'image'
    window.getSelection()?.removeAllRanges()
    currentSelection = ''

    const rect = hoveredImage.getBoundingClientRect()
    showToast(rect)
  }
  // --- Selection Handlers ---
  let selectionRafId = null
  function handleMouseUp(e) {
    if (toastEl && toastEl.contains(e.target)) return
    if (selectionRafId) cancelAnimationFrame(selectionRafId)
    selectionRafId = requestAnimationFrame(() => {
      selectionRafId = null
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      const text = sel.toString().trim()
      if (text.length > 0) {
        currentContext = 'text'
        currentSelection = text
        imageContext = { src: null, resolvedUrl: null, isAccessible: true }
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
    })
  }
  // Replace handleMouseDown with:
  function handleMouseDown(e) {
    if (isVisible && toastEl && !toastEl.contains(e.target)) {
      hideToast()
    }
  }
  function handleScroll() {
    if (isVisible) hideToast()
  }
  // --- Toast Lifecycle ---
  function getContextButtons() {
    return config.buttons.filter(btn => {
      const contexts = btn.contexts
      // Backwards compat: buttons without a contexts field show in text context only
      if (!contexts || contexts.length === 0) return currentContext === 'text'
      return contexts.includes(currentContext)
    })
  }
  function showToast(rect) {
    const { style } = config
    const contextBtns = getContextButtons()
    const baseBtnSize = style.iconSize + style.iconPadding * 2
    const count = contextBtns.length
    if (count === 0) return
    const totalWidth =
      style.padding * 2 + baseBtnSize * count + style.buttonSpacing * (count - 1)
    const totalHeight = style.padding * 2 + baseBtnSize
    const dpr = window.devicePixelRatio || 1
    canvas.style.width = totalWidth + 'px'
    canvas.style.height = totalHeight + 'px'
    canvas.width = totalWidth * dpr
    canvas.height = totalHeight * dpr
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    toastEl.style.width = totalWidth + 'px'
    toastEl.style.height = totalHeight + 'px'
    applyWrapperStyles()
    // For images, anchor to the top-center of the image.
    // For text, anchor above the selection (falling back to below).
    let left = rect.left + rect.width / 2 - totalWidth / 2
    let top =
      currentContext === 'image'
        ? rect.top - totalHeight - 16
        : rect.top - totalHeight - 16
    if (top < 8) top = rect.bottom + 16
    if (left < 10) left = 10
    if (left + totalWidth > window.innerWidth - 10)
      left = window.innerWidth - totalWidth - 10
    toastEl.style.left = left + 'px'
    toastEl.style.top = top + 'px'
    toastEl.style.display = 'block'
    toastEl.style.pointerEvents = 'auto'
    canvas.style.pointerEvents = 'auto'
    if (!isVisible) {
      isVisible = true
      springs.opacity.val = 0
      springs.opacity.vel = 0
      springs.scale.val = 0.8
      springs.scale.vel = 0
      toastEl.style.opacity = '0'
      toastEl.style.transform = 'scale(0.8)'
      lastTime = null
      startLoop()
    } else {
      // Already visible (e.g. re-clicked another image) — just redraw
      requestAnimationFrame(draw)
    }
  }
  function hideToast() {
    isVisible = false
    toastEl.style.pointerEvents = 'none'
    canvas.style.pointerEvents = 'none'
    animState.hoveredButtonIndex = -1
    isMouseDown = false
  }
  // --- Animation Loop ---
  function startLoop() {
    if (animationId) cancelAnimationFrame(animationId)
    animationId = requestAnimationFrame(loop)
  }
  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05)
    lastTime = timestamp
    const opacityAtRest = Math.abs(springs.opacity.val)
    Math.abs(springs.opacity.val) < 0.001 && Math.abs(springs.opacity.vel) < 0.001
    if (!isVisible && opacityAtRest && springs.opacity.val < 0.001) {
      animationId = null
      toastEl.style.display = 'none'
      return
    }
    updateState(dt)
    draw()
    animationId = requestAnimationFrame(loop)
  }
  function updateState(dt) {
    const targetOpacity = isVisible ? 1 : 0
    const targetScale = isVisible ? 1 : 0.9
    stepSpring(springs.opacity, targetOpacity, SPRING_STIFFNESS, SPRING_DAMPING, dt)
    stepSpring(springs.scale, targetScale, SPRING_STIFFNESS, SPRING_DAMPING, dt)
    toastEl.style.opacity = springs.opacity.val
    toastEl.style.transform = `scale(${springs.scale.val})`
    animState.opacity = springs.opacity.val
    animState.scale = springs.scale.val
    const contextBtns = getContextButtons()
    // Ensure springs.buttons is sized to current context button count
    while (springs.buttons.length < contextBtns.length) {
      springs.buttons.push({
        hover: { val: 0, vel: 0 },
        active: { val: 0, vel: 0 }
      })
    }
    contextBtns.forEach((_, i) => {
      const sb = springs.buttons[i]
      if (!sb) return
      const isHover = animState.hoveredButtonIndex === i
      const isActive = isHover && isMouseDown
      stepSpring(sb.hover, isHover ? 1 : 0, HOVER_STIFFNESS, HOVER_DAMPING, dt)
      stepSpring(
        sb.active,
        isActive ? 1 : 0,
        HOVER_STIFFNESS * 1.5,
        HOVER_DAMPING * 1.2,
        dt
      )
      animState.buttonHovers[i] = sb.hover.val
      animState.buttonActive[i] = sb.active.val
    })
  }
  function draw() {
    const { style } = config
    const contextBtns = getContextButtons()
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    const baseBtnSize = style.iconSize + style.iconPadding * 2
    buttons = []
    let x = style.padding
    const y = style.padding
    contextBtns.forEach((btn, i) => {
      const hoverVal = animState.buttonHovers[i] ?? 0
      const activeVal = animState.buttonActive[i] ?? 0
      const targetScale =
        1 +
        hoverVal * (style.hoverScale - 1) -
        activeVal * (style.hoverScale - style.activeScale)
      const currentBtnSize = baseBtnSize * targetScale
      const offset = (baseBtnSize - currentBtnSize) / 2
      // Hit-test box always uses base size so hover doesn't jitter
      buttons.push({ x, y, w: baseBtnSize, h: baseBtnSize, data: btn })
      const bx = x + offset
      const by = y + offset
      if (hoverVal > 0.001) {
        ctx.fillStyle = style.hoverColor
        ctx.globalAlpha = style.hoverOpacity * hoverVal
        roundRect(ctx, bx, by, currentBtnSize, currentBtnSize, style.borderRadius)
        ctx.fill()
        ctx.globalAlpha = 1
      }
      const iconImg = loadedIcons[btn.id]
      if (iconImg && iconsReady) {
        const lift = hoverVal * -1 * (style.iconLift || 0)
        const scaledIconSize = style.iconSize * targetScale
        const ix = x + (baseBtnSize - scaledIconSize) / 2
        const iy = y + (baseBtnSize - scaledIconSize) / 2 + lift
        ctx.filter =
          hoverVal > 0.001 ? `brightness(${1 + hoverVal * 0.3})` : 'none'
        ctx.drawImage(iconImg, ix, iy, scaledIconSize, scaledIconSize)
        ctx.filter = 'none'
      }
      x += baseBtnSize + style.buttonSpacing
    })
  }
  // --- Icon Loading ---
  function svgToDataUri(svgStr) {
    return (
      'data:image/svg+xml;charset=utf-8;base64,' +
      window.btoa(unescape(encodeURIComponent(svgStr)))
    )
  }
  function loadSingleIcon(btn) {
    return new Promise(resolve => {
      const img = new Image()
      let src = btn.icon || ''
      if (src.trim().startsWith('<svg')) {
        try {
          src = svgToDataUri(src)
        } catch (e) {
          console.error('Icon encoding failed', e)
          return resolve(null)
        }
      }
      img.onload = () => resolve({ id: btn.id, img })
      img.onerror = () => {
        console.warn(`Failed to load icon for ${btn.id}`)
        resolve(null)
      }
      img.src = src
    })
  }
  function loadIcons() {
    loadedIcons = {}
    iconsReady = false
    const total = config.buttons.length
    // Size springs to the max possible button count (all buttons)
    // so we never have index gaps regardless of context
    springs.buttons = config.buttons.map(() => ({
      hover: { val: 0, vel: 0 },
      active: { val: 0, vel: 0 }
    }))
    animState.buttonHovers = new Array(total).fill(0)
    animState.buttonActive = new Array(total).fill(0)
    if (total === 0) {
      iconsReady = true
      return
    }
    Promise.all(config.buttons.map(loadSingleIcon)).then(results => {
      results.forEach(r => {
        if (r) loadedIcons[r.id] = r.img
      })
      iconsReady = true
      if (isVisible) requestAnimationFrame(draw)
    })
  }
  // --- Mouse Interaction ---
  function handleMouseMove(e) {
    if (!isVisible) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    let hoveredIndex = -1
    buttons.forEach((btn, i) => {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        hoveredIndex = i
      }
    })
    animState.hoveredButtonIndex = hoveredIndex
    canvas.style.cursor = hoveredIndex !== -1 ? 'pointer' : 'default'
  }
  function handleCanvasDown() {
    if (animState.hoveredButtonIndex !== -1) isMouseDown = true
  }
  async function handleCanvasUp() {
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
    } else if (type === 'image-search') {
      handleImageSearch(url)
    } else if (type === 'action') {
      if (action === 'copy') {
        await handleCopy()
      } else if (action === 'paste') {
        try {
          const text = await navigator.clipboard.readText()
          if (selectionRange) {
            selectionRange.deleteContents()
            selectionRange.insertNode(document.createTextNode(text))
          }
        } catch (err) {
          console.error('[Toast] Paste failed:', err)
        }
      }
    }
    hideToast()
  }
  // --- Action Handlers ---
  function handleImageSearch(urlTemplate) {
    if (!imageContext.isAccessible || !imageContext.resolvedUrl) {
      // data: or blob: URI — can't be fetched by remote engines
      console.warn(
        '[Toast] Image search unavailable: image src is a data/blob URI and cannot be resolved by remote search engines.'
      )
      return
    }
    const targetUrl = urlTemplate.replace(
      '%s',
      encodeURIComponent(imageContext.resolvedUrl)
    )
    window.open(targetUrl, '_blank')
  }
  async function handleCopy() {
    if (currentContext === 'image') {
      await copyImage()
    } else {
      try {
        await navigator.clipboard.writeText(currentSelection)
      } catch (err) {
        console.error('[Toast] Copy text failed:', err)
      }
    }
  }
  async function copyImage() {
    const src = imageContext.resolvedUrl || imageContext.src
    if (!src) return
    // data: URI — decode and write directly, no fetch needed
    if (src.startsWith('data:image/png')) {
      try {
        const res = await fetch(src)
        const blob = await res.blob()
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      } catch (err) {
        console.error('[Toast] Copy image (data URI) failed:', err)
      }
      return
    }
    // Remote URL — fetch the image. Will fail for cross-origin images
    // that don't set CORS headers, which is most of the web. We try anyway
    // and fall back to copying the URL as plain text.
    try {
      const res = await fetch(src, { mode: 'cors' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      // Normalise to PNG since ClipboardItem only reliably accepts image/png
      const pngBlob = await normaliseToPng(blob)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
    } catch {
      // CORS or fetch failure — copy the URL instead as a graceful fallback
      console.warn('[Toast] Could not fetch image for clipboard, copying URL instead.')
      try {
        await navigator.clipboard.writeText(src)
      } catch (err) {
        console.error('[Toast] Fallback URL copy failed:', err)
      }
    }
  }
  // Draws any image blob onto an offscreen canvas and exports as PNG
  function normaliseToPng(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        const offscreen = document.createElement('canvas')
        offscreen.width = img.naturalWidth
        offscreen.height = img.naturalHeight
        const octx = offscreen.getContext('2d')
        octx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        offscreen.toBlob(pngBlob => {
          if (pngBlob) resolve(pngBlob)
          else reject(new Error('toBlob failed'))
        }, 'image/png')
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Image load failed'))
      }
      img.src = url
    })
  }
  // --- Drawing Utilities ---
  function roundRect(ctx, x, y, w, h, r) {
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