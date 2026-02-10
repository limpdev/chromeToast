// content.js - Refined & Robust
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
  let isMouseDown = false // Track click state for active animation

  // Animation State
  const animState = {
    toastHover: 0,
    buttonHovers: [], // Array of floats (0 to 1)
    buttonActive: [], // Array of floats (0 to 1) for click effect
    opacity: 0,
    hoveredButtonIndex: -1,
    scale: 0.8
  }

  // --- Default Configuration ---
  const defaultConfig = {
    style: {
      bgColor: '#13161D',
      bgOpacity: 0.95,
      hoverColor: '#1B4F80',
      hoverOpacity: 0.2,
      borderRadius: 15,
      buttonSize: 36,
      buttonSpacing: 6,
      padding: 6,
      iconSize: 20,
      animSpeed: 0.3,
      hoverScale: 1.1,
      activeScale: 0.90,
      iconLift: 3
    },
    buttons: [
      {
        id: 'copy',
        type: 'action',
        action: 'copy',
        // High contrast, filled icon for better visibility
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="#d3d3d3" stroke="currentColor" stroke-width="1"><path d="M14 7c0-.932 0-1.398-.152-1.765a2 2 0 0 0-1.083-1.083C12.398 4 11.932 4 11 4H8c-1.886 0-2.828 0-3.414.586S4 6.114 4 8v3c0 .932 0 1.398.152 1.765a2 2 0 0 0 1.083 1.083C5.602 14 6.068 14 7 14"/><rect width="10" height="10" x="10" y="10" rx="2"/></g></svg>'
      },
      {
        id: 'google',
        type: 'link',
        url: 'https://www.google.com/search?q=%s',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><g fill="#d3d3d3"><path fill="currentColor" fill-opacity="0.25" d="M63.453 67.749L50.725 55.017a2.998 2.998 0 1 1 4.24-4.24l12.73 12.732a2.998 2.998 0 1 1-4.242 4.24m-47.856-38.68a19.052 19.052 0 1 1 36.806 9.862a19.052 19.052 0 0 1-36.806-9.862"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="m47.445 47.498l3.28 3.28m0 4.239l12.728 12.732a2.998 2.998 0 0 0 4.241-4.24L54.966 50.777a2.998 2.998 0 1 0-4.241 4.24m-30.197-7.545a19.053 19.053 0 1 1 26.944-26.944a19.053 19.053 0 0 1-26.944 26.944" stroke-width="1"/></g></svg>'
      }
    ]
  }

  let config = JSON.parse(JSON.stringify(defaultConfig))

  // --- Initialization ---
  function init () {
    chrome.storage.sync.get(['canvasToastConfig'], result => {
      applyConfig(result.canvasToastConfig)
      setupCanvas()
      loadIcons()
      attachEvents()
    })
    chrome.storage.onChanged.addListener(changes => {
      if (changes.canvasToastConfig) {
        applyConfig(changes.canvasToastConfig.newValue)
        loadIcons()
        if (isVisible) requestAnimationFrame(draw)
      }
    })
  }

  function applyConfig (newConfig) {
    if (!newConfig) return
    // If the saved config has NO buttons (broken state), revert to default buttons
    if (!newConfig.buttons || newConfig.buttons.length === 0) {
      config.buttons = defaultConfig.buttons
    } else {
      config.buttons = newConfig.buttons
    }

    if (newConfig.style) {
      config.style = { ...defaultConfig.style, ...newConfig.style }
    }
  }

  function setupCanvas () {
    if (canvas && document.body.contains(canvas)) {
      document.body.removeChild(canvas)
    }
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
    canvas.addEventListener('mousedown', handleCanvasDown)
    canvas.addEventListener('mouseup', handleCanvasUp)
    canvas.addEventListener('mouseleave', () => {
      animState.hoveredButtonIndex = -1
      isMouseDown = false
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

    animState.buttonHovers = new Array(totalIcons).fill(0)
    animState.buttonActive = new Array(totalIcons).fill(0)

    config.buttons.forEach(btn => {
      const img = new Image()
      let src = btn.icon || ''
      if (src.trim().startsWith('<svg')) {
        try {
          // Explicitly setting charset to utf-8 helps with some SVG parsing issues
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

  function handleSelectionChange (e) {
    if (e.target === canvas) return
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
    if (isVisible && e.target !== canvas) {
      hideToast()
    }
  }

  function handleScroll () {
    if (isVisible) hideToast()
  }

  function showToast (rect) {
    const { padding, buttonSize, buttonSpacing } = config.style
    const count = config.buttons.length
    const totalWidth =
      padding * 2 + buttonSize * count + buttonSpacing * (count - 1)
    const totalHeight = padding * 2 + buttonSize
    const buffer = 50
    const dpr = window.devicePixelRatio || 1

    canvas.style.width = totalWidth + buffer * 2 + 'px'
    canvas.style.height = totalHeight + buffer * 2 + 'px'
    canvas.width = (totalWidth + buffer * 2) * dpr
    canvas.height = (totalHeight + buffer * 2) * dpr

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    let left = rect.left + rect.width / 2 - totalWidth / 2
    let top = rect.top - totalHeight - 16

    if (top < 0) top = rect.bottom + 16
    if (left < 10) left = 10
    if (left + totalWidth > window.innerWidth - 10) {
      left = window.innerWidth - totalWidth - 10
    }

    canvas.style.left = left - buffer + 'px'
    canvas.style.top = top - buffer + 'px'
    canvas.style.display = 'block'
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
    canvas.style.pointerEvents = 'none'
    animState.hoveredButtonIndex = -1
    isMouseDown = false
  }

  function startLoop () {
    if (!animationId) loop()
  }

  function loop () {
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
    const { animSpeed } = config.style
    const speed = animSpeed || 0.2
    const targetOpacity = isVisible ? 1 : 0
    const targetScale = isVisible ? 1 : 0.9

    animState.opacity = lerp(animState.opacity, targetOpacity, speed)
    animState.scale = lerp(animState.scale, targetScale, speed)

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
    const buffer = 50
    const count = btnConfig.length
    const totalW =
      style.padding * 2 +
      style.buttonSize * count +
      style.buttonSpacing * (count - 1)
    const totalH = style.padding * 2 + style.buttonSize
    const dpr = window.devicePixelRatio || 1

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    if (animState.opacity < 0.01) return

    ctx.save()
    const cx = buffer + totalW / 2
    const cy = buffer + totalH / 2
    ctx.translate(cx, cy)
    ctx.scale(animState.scale, animState.scale)
    ctx.translate(-cx, -cy)
    ctx.globalAlpha = animState.opacity

    const bgRgb = hexToRgb(style.bgColor)
    ctx.fillStyle = `rgba(${bgRgb.r},${bgRgb.g},${bgRgb.b},${style.bgOpacity})`
    roundRect(ctx, buffer, buffer, totalW, totalH, style.borderRadius)
    ctx.fill()

    buttons = []
    let x = buffer + style.padding
    const y = buffer + style.padding

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

      if (hoverVal > 0.01) {
        ctx.fillStyle = style.hoverColor
        ctx.globalAlpha = animState.opacity * style.hoverOpacity * hoverVal
        roundRect(
          ctx,
          bx,
          by,
          currentBtnSize,
          currentBtnSize,
          style.borderRadius / 2
        )
        ctx.fill()
        ctx.globalAlpha = animState.opacity
      }

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
