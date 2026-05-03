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

  // Animation State
  const animState = {
    buttonHovers: [],
    buttonActive: [],
    opacity: 0,
    hoveredButtonIndex: -1,
    scale: 0.8
  }

  // Spring state: each animated value gets { val, vel }
  const springs = {
    opacity: { val: 0, vel: 0 },
    scale: { val: 0.8, vel: 0 },
    buttons: [] // populated in loadIcons: [{ hover: {val,vel}, active: {val,vel} }]
  }

  // --- Spring Physics ---
  // stiffness: how fast it snaps toward target
  // damping:   how much it resists oscillation (>1 = overdamped/no bounce, ~0.6-0.8 = subtle bounce)
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
    // Snap to rest when close enough
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
      // buttonSize: 28,
      // animSpeed: 0.15,
      padding: 6,
      iconSize: 18,
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

  // --- hexToRgb (memoized) ---
  const hexToRgbCache = new Map()
  function hexToRgb(hex) {
    if (hexToRgbCache.has(hex)) return hexToRgbCache.get(hex)
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    const rgb = result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 0, b: 0 }
    hexToRgbCache.set(hex, rgb)
    return rgb
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
    config.buttons = (newConfig.buttons && newConfig.buttons.length > 0)
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

  function attachEvents() {
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

  // --- Icon Loading (Promise.all) ---
  function svgToDataUri(svgStr) {
    return 'data:image/svg+xml;charset=utf-8;base64,' +
      window.btoa(unescape(encodeURIComponent(svgStr)))
  }

  function loadSingleIcon(btn) {
    return new Promise(resolve => {
      const img = new Image()
      let src = btn.icon || ''
      if (src.trim().startsWith('<svg')) {
        try { src = svgToDataUri(src) } catch (e) {
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

    // Reset spring states to match button count
    springs.buttons = config.buttons.map(() => ({
      hover: { val: 0, vel: 0 },
      active: { val: 0, vel: 0 }
    }))
    // Keep animState arrays in sync (still used for hit-testing)
    animState.buttonHovers = new Array(total).fill(0)
    animState.buttonActive = new Array(total).fill(0)

    if (total === 0) { iconsReady = true; return }

    Promise.all(config.buttons.map(loadSingleIcon)).then(results => {
      results.forEach(r => { if (r) loadedIcons[r.id] = r.img })
      iconsReady = true
      if (isVisible) requestAnimationFrame(draw)
    })
  }

  // --- Selection Debounce (rAF-based) ---
  let selectionRafId = null

  function handleSelectionChange(e) {
    if (toastEl && toastEl.contains(e.target)) return
    if (selectionRafId) cancelAnimationFrame(selectionRafId)
    selectionRafId = requestAnimationFrame(() => {
      selectionRafId = null
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
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
    })
  }

  function handleOutsideClick(e) {
    // Don't immediately hide — the mouseup handler will re-evaluate
    if (isVisible && toastEl && !toastEl.contains(e.target)) { }
  }

  function handleScroll() {
    if (isVisible) hideToast()
  }

  // --- Toast Lifecycle ---
  function showToast(rect) {
    const { style } = config
    const baseBtnSize = style.iconSize + style.iconPadding * 2
    const count = config.buttons.length
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

    let left = rect.left + rect.width / 2 - totalWidth / 2
    let top = rect.top - totalHeight - 16
    if (top < 0) top = rect.bottom + 16
    if (left < 10) left = 10
    if (left + totalWidth > window.innerWidth - 10) left = window.innerWidth - totalWidth - 10

    toastEl.style.left = left + 'px'
    toastEl.style.top = top + 'px'
    toastEl.style.display = 'block'
    toastEl.style.pointerEvents = 'auto'
    canvas.style.pointerEvents = 'auto'

    if (!isVisible) {
      isVisible = true
      // Kick springs from their collapsed state
      springs.opacity.val = 0
      springs.opacity.vel = 0
      springs.scale.val = 0.8
      springs.scale.vel = 0
      toastEl.style.opacity = '0'
      toastEl.style.transform = 'scale(0.8)'
      lastTime = null
      startLoop()
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
    animationId = null
    animationId = requestAnimationFrame(loop)
  }

  function loop(timestamp) {
    // Compute dt in seconds, clamped to avoid spiral of death on tab re-focus
    if (!lastTime) lastTime = timestamp
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05)
    lastTime = timestamp

    const opacityAtRest = Math.abs(springs.opacity.val) < 0.001 && Math.abs(springs.opacity.vel) < 0.001
    const scaleAtRest = Math.abs(springs.scale.val - (isVisible ? 1 : 0.9)) < 0.001

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

    // Sync legacy animState for draw() compatibility
    animState.opacity = springs.opacity.val
    animState.scale = springs.scale.val

    config.buttons.forEach((_, i) => {
      const sb = springs.buttons[i]
      if (!sb) return
      const isHover = animState.hoveredButtonIndex === i
      const isActive = isHover && isMouseDown

      stepSpring(sb.hover, isHover ? 1 : 0, HOVER_STIFFNESS, HOVER_DAMPING, dt)
      stepSpring(sb.active, isActive ? 1 : 0, HOVER_STIFFNESS * 1.5, HOVER_DAMPING * 1.2, dt)

      // Sync into animState arrays for the draw() loop
      animState.buttonHovers[i] = sb.hover.val
      animState.buttonActive[i] = sb.active.val
    })
  }

  function draw() {
    const { style, buttons: btnConfig } = config
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

    const baseBtnSize = style.iconSize + style.iconPadding * 2

    buttons = []
    let x = style.padding
    const y = style.padding

    btnConfig.forEach((btn, i) => {
      const hoverVal = animState.buttonHovers[i]
      const activeVal = animState.buttonActive[i]

      // Declare targetScale FIRST
      const targetScale =
        1 +
        hoverVal * (style.hoverScale - 1) -
        activeVal * (style.hoverScale - style.activeScale)

      const currentBtnSize = baseBtnSize * targetScale
      const offset = (baseBtnSize - currentBtnSize) / 2

      // Hit-testing uses the base (un-scaled) box so hover doesn't jitter
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
        ctx.filter = hoverVal > 0.001 ? `brightness(${1 + hoverVal * 0.3})` : 'none'
        ctx.drawImage(iconImg, ix, iy, scaledIconSize, scaledIconSize)
        ctx.filter = 'none'
      }

      x += baseBtnSize + style.buttonSpacing
    })
  }

  // --- Mouse Interaction ---
  function handleMouseMove(e) {
    if (!isVisible) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    let cursor = 'default'
    let hoveredIndex = -1
    buttons.forEach((btn, i) => {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        cursor = 'pointer'
        hoveredIndex = i
      }
    })
    animState.hoveredButtonIndex = hoveredIndex
    canvas.style.cursor = cursor
  }

  function handleCanvasDown(e) {
    if (animState.hoveredButtonIndex !== -1) isMouseDown = true
  }

  async function handleCanvasUp(e) {
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
        try { await navigator.clipboard.writeText(currentSelection) }
        catch (err) { console.error('Copy failed:', err) }
      } else if (action === 'paste') {
        try {
          const text = await navigator.clipboard.readText()
          if (selectionRange) {
            selectionRange.deleteContents()
            selectionRange.insertNode(document.createTextNode(text))
          }
        } catch (err) { console.error(err) }
      }
    }
    hideToast()
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