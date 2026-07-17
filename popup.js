// popup.js
document.addEventListener('DOMContentLoaded', () => {

  // ─── Elements ────────────────────────────────────────────────────────────────

  const elements = {
    buttonList: document.getElementById('buttonList'),
    addBtn: document.getElementById('addBtn'),
    addImageSearchBtn: document.getElementById('addImageSearchBtn'),
    saveBtn: document.getElementById('save'),
    status: document.getElementById('status'),
    styleInputs: document.querySelectorAll('.style-input'),
    previewCanvas: document.getElementById('previewCanvas'),
    previewDims: document.getElementById('previewDims'),
    statBtnCount: document.getElementById('statBtnCount'),
    statIconPx: document.getElementById('statIconPx'),
    statBgAlpha: document.getElementById('statBgAlpha'),
    statRadius: document.getElementById('statRadius'),
  }

  const previewCtx = elements.previewCanvas.getContext('2d', { alpha: true })

  // ─── Defaults ─────────────────────────────────────────────────────────────────

  const defaultConfig = {
    style: {
      bgColor: '#1b1c1d',
      bgOpacity: 0.75,
      hoverColor: '#696969',
      hoverOpacity: 0.33,
      borderRadius: 7,
      iconSize: 16,
      iconPadding: 5,
      buttonSpacing: 6,
      padding: 6,
      hoverScale: 1.15,
      activeScale: 0.9,
      iconLift: 2
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
        id: 'markdown',
        type: 'action',
        action: 'markdown',
        markdownSource: 'selection',
        contexts: ['text'],
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32"><path d="M0 0h32v32H0z" fill="none"/><path fill="#d5d5d5" d="M2.875 6C1.32 6 0 7.254 0 8.813v14.374C0 24.747 1.32 26 2.875 26h26.25C30.68 26 32 24.746 32 23.187V8.813C32 7.255 30.68 6 29.125 6zm0 2h26.25c.516 0 .875.383.875.813v14.374c0 .43-.36.813-.875.813H2.875C2.359 24 2 23.617 2 23.187V8.813c0-.43.36-.812.875-.812zM5 11v10h3v-6.656l3 3.969l3-3.97V21h3V11h-3l-3 4l-3-4zm17 0v5h-3l4.5 5l4.5-5h-3v-5z"/></svg>'
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

  const IMAGE_SEARCH_PRESETS = [
    {
      label: 'Google Lens',
      id: 'google-lens',
      url: 'https://lens.google.com/uploadbyurl?url=%s',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><g fill="none" stroke="#d5d5d5" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path stroke-linecap="round" d="M3 9V6.5A2.5 2.5 0 015.5 4H8M3 15v2.5A2.5 2.5 0 005.5 20H8m8-16h2.5A2.5 2.5 0 0121 6.5V9m0 6v2.5a2.5 2.5 0 01-2.5 2.5H16"/></g></svg>'
    },
    {
      label: 'Yandex Images',
      id: 'yandex-image',
      url: 'https://yandex.com/images/search?rpt=imageview&url=%s',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><g fill="none" stroke="#d5d5d5" stroke-width="1.5"><circle cx="12" cy="12" r="8"/><path stroke-linecap="round" d="M12 8v4l3 3"/></g></svg>'
    },
    {
      label: 'Bing Visual Search',
      id: 'bing-image',
      url: 'https://www.bing.com/images/search?view=detailv2&q=imgurl:%s',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><g fill="none" stroke="#d5d5d5" stroke-width="1.5"><path stroke-linecap="round" d="M5 3v18l5-3 4 3 5-4V8l-5-4-4 3z"/></g></svg>'
    },
    {
      label: 'TinEye',
      id: 'tineye',
      url: 'https://www.tineye.com/search?url=%s',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><g fill="none" stroke="#d5d5d5" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="M11 8v3h3m5 5l-3-3"/></g></svg>'
    }
  ]

  // ─── State ────────────────────────────────────────────────────────────────────

  let currentConfig = null

  // Preview: loaded icon images keyed by button id
  let previewIcons = {}
  let previewRafId = null

  // ─── Preview: Icon Loading ────────────────────────────────────────────────────

  function svgToDataUri(svgStr) {
    return 'data:image/svg+xml;charset=utf-8;base64,' +
      btoa(unescape(encodeURIComponent(svgStr)))
  }

  function loadPreviewIcons() {
    previewIcons = {}
    const btns = currentConfig.buttons
    if (btns.length === 0) {
      schedulePreviewDraw()
      return
    }
    let loaded = 0
    btns.forEach(btn => {
      const img = new Image()
      let src = btn.icon || ''
      if (src.trim().startsWith('<svg')) {
        try { src = svgToDataUri(src) } catch { return }
      }
      img.onload = () => {
        previewIcons[btn.id] = img
        loaded++
        if (loaded === btns.length) schedulePreviewDraw()
      }
      img.onerror = () => {
        loaded++
        if (loaded === btns.length) schedulePreviewDraw()
      }
      img.src = src
    })
  }

  // ─── Preview: Draw ────────────────────────────────────────────────────────────

  function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return r ? {
      r: parseInt(r[1], 16),
      g: parseInt(r[2], 16),
      b: parseInt(r[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }

  function roundRectPath(ctx, x, y, w, h, r) {
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

  function schedulePreviewDraw() {
    if (previewRafId) cancelAnimationFrame(previewRafId)
    previewRafId = requestAnimationFrame(drawPreview)
  }

  function drawPreview() {
    previewRafId = null
    const { style, buttons } = currentConfig
    const dpr = window.devicePixelRatio || 1

    const btnSize = style.iconSize + style.iconPadding * 2
    // Preview shows all buttons (context-agnostic — you see the full set)
    const count = buttons.length
    if (count === 0) {
      elements.previewCanvas.style.width = '0px'
      elements.previewCanvas.style.height = '0px'
      updatePreviewStats(0, btnSize)
      return
    }

    const totalW = style.padding * 2 + btnSize * count + style.buttonSpacing * (count - 1)
    const totalH = style.padding * 2 + btnSize

    // Size canvas
    elements.previewCanvas.style.width = totalW + 'px'
    elements.previewCanvas.style.height = totalH + 'px'
    elements.previewCanvas.width = totalW * dpr
    elements.previewCanvas.height = totalH * dpr
    elements.previewCanvas.style.borderRadius = style.borderRadius + 'px'

    const c = previewCtx
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.scale(dpr, dpr)
    c.clearRect(0, 0, totalW, totalH)

    // Background fill (simulating the backdrop — we can't do real backdrop-filter in canvas)
    const bg = hexToRgb(style.bgColor)
    c.fillStyle = `rgba(${bg.r},${bg.g},${bg.b},${style.bgOpacity})`
    c.fillRect(0, 0, totalW, totalH)

    // Thin border to simulate the toast shell
    c.strokeStyle = 'rgba(255,255,255,0.12)'
    c.lineWidth = 0.5
    c.strokeRect(0.25, 0.25, totalW - 0.5, totalH - 0.5)

    // Highlight: simulate hovered state on button index 1 (if it exists)
    const highlightIndex = Math.min(1, count - 1)

    let x = style.padding
    const y = style.padding

    buttons.forEach((btn, i) => {
      const isHovered = i === highlightIndex
      const hoverVal = isHovered ? 1 : 0

      if (isHovered) {
        const targetScale = 1 + (style.hoverScale - 1)
        const scaledSize = btnSize * targetScale
        const offset = (btnSize - scaledSize) / 2

        const hc = hexToRgb(style.hoverColor)
        c.fillStyle = `rgba(${hc.r},${hc.g},${hc.b},${style.hoverOpacity})`
        roundRectPath(c, x + offset, y + offset, scaledSize, scaledSize, style.borderRadius * 0.7)
        c.fill()

        const iconImg = previewIcons[btn.id]
        if (iconImg) {
          const scaledIconSize = style.iconSize * targetScale
          const ix = x + (btnSize - scaledIconSize) / 2
          const iy = y + (btnSize - scaledIconSize) / 2 - style.iconLift
          c.filter = `brightness(1.3)`
          c.drawImage(iconImg, ix, iy, scaledIconSize, scaledIconSize)
          c.filter = 'none'
        }
      } else {
        const iconImg = previewIcons[btn.id]
        if (iconImg) {
          const ix = x + (btnSize - style.iconSize) / 2
          const iy = y + (btnSize - style.iconSize) / 2
          c.filter = 'brightness(0.75)'
          c.drawImage(iconImg, ix, iy, style.iconSize, style.iconSize)
          c.filter = 'none'
        }
      }

      x += btnSize + style.buttonSpacing
    })

    updatePreviewStats(count, btnSize, totalW, totalH, style)
  }

  function updatePreviewStats(count, btnSize, w, h, style) {
    elements.statBtnCount.textContent = count
    if (style) {
      elements.statIconPx.textContent = style.iconSize + 'px'
      elements.statBgAlpha.textContent = style.bgOpacity
      elements.statRadius.textContent = style.borderRadius + 'px'
      elements.previewDims.textContent = `${Math.round(w || 0)} × ${Math.round(h || 0)}`
    }
  }

  // ─── Section Collapse ─────────────────────────────────────────────────────────

  document.querySelectorAll('.section-head').forEach(head => {
    head.addEventListener('click', () => {
      const sec = document.getElementById(head.dataset.section)
      if (sec) sec.classList.toggle('open')
    })
  })

  // ─── Render UI ────────────────────────────────────────────────────────────────

  function renderUI() {
    // Populate style inputs
    elements.styleInputs.forEach(input => {
      const key = input.dataset.key
      if (currentConfig.style[key] !== undefined) {
        input.value = currentConfig.style[key]
        const display = document.getElementById(`val-${key}`)
        if (display) display.textContent = currentConfig.style[key]
      }
    })

    // Render button list
    if (!elements.buttonList) return
    elements.buttonList.innerHTML = ''
    currentConfig.buttons.forEach((btn, index) => {
      elements.buttonList.appendChild(buildButtonItem(btn, index))
    })

    attachListeners()
    loadPreviewIcons()
  }

  // ─── Button Item Builder ──────────────────────────────────────────────────────

  function buildButtonItem(btn, index) {
    const item = document.createElement('div')
    item.className = 'btn-item'

    // Collapsible head
    const head = document.createElement('div')
    head.className = 'btn-item-head'

    const label = document.createElement('span')
    label.className = 'btn-item-label'
    label.textContent = getButtonLabel(btn, index)

    const controls = document.createElement('div')
    controls.className = 'btn-item-controls'

    const removeBtn = document.createElement('span')
    removeBtn.className = 'btn-item-remove'
    removeBtn.dataset.index = index
    removeBtn.title = 'Remove'
    removeBtn.textContent = '✕'

    controls.appendChild(removeBtn)
    head.appendChild(label)
    head.appendChild(controls)
    item.appendChild(head)

    // Body
    const body = document.createElement('div')
    body.className = 'btn-item-body'

    // Context row
    const ctxLabel = document.createElement('span')
    ctxLabel.className = 'field-label'
    ctxLabel.textContent = 'Context'
    body.appendChild(ctxLabel)
    body.appendChild(buildContextCheckboxes(btn, index))

    // Type select
    const typeLabel = document.createElement('span')
    typeLabel.className = 'field-label'
    typeLabel.textContent = 'Type'
    body.appendChild(typeLabel)

    const typeSelect = document.createElement('select')
    typeSelect.className = 'config-input type-select'
    typeSelect.dataset.field = 'type'
    typeSelect.dataset.index = index
      ;[
        { value: 'action', label: 'System Action' },
        { value: 'link', label: 'Search / Link' },
        { value: 'image-search', label: 'Image Search' }
      ].forEach(({ value, label: lbl }) => {
        const opt = document.createElement('option')
        opt.value = value
        opt.textContent = lbl
        opt.selected = btn.type === value
        typeSelect.appendChild(opt)
      })
    body.appendChild(typeSelect)

    // Type-specific fields
    if (btn.type === 'action') {
      const actLabel = document.createElement('span')
      actLabel.className = 'field-label'
      actLabel.textContent = 'Action'
      body.appendChild(actLabel)
      body.appendChild(buildActionSelect(btn, index))
      if (btn.action === 'markdown') {
        body.appendChild(buildMarkdownSourceSelect(btn, index))
      }
    } else if (btn.type === 'link') {
      const urlLabel = document.createElement('span')
      urlLabel.className = 'field-label'
      urlLabel.textContent = 'URL (%s = selection)'
      body.appendChild(urlLabel)
      body.appendChild(buildUrlInput(btn, index, 'https://google.com/search?q=%s'))
    } else if (btn.type === 'image-search') {
      const urlLabel = document.createElement('span')
      urlLabel.className = 'field-label'
      urlLabel.textContent = 'URL (%s = image URL)'
      body.appendChild(urlLabel)
      body.appendChild(buildUrlInput(btn, index, 'https://lens.google.com/uploadbyurl?url=%s'))
    }

    // Icon
    const iconLabel = document.createElement('span')
    iconLabel.className = 'field-label'
    iconLabel.textContent = 'SVG Icon'
    body.appendChild(iconLabel)

    const iconArea = document.createElement('textarea')
    iconArea.className = 'config-input'
    iconArea.dataset.field = 'icon'
    iconArea.dataset.index = index
    iconArea.textContent = btn.icon || ''
    body.appendChild(iconArea)

    item.appendChild(body)
    return item
  }

  function getButtonLabel(btn, index) {
    if (btn.type === 'action') return `#${index + 1} · ${btn.action || 'action'}`
    if (btn.type === 'link') return `#${index + 1} · link`
    if (btn.type === 'image-search') return `#${index + 1} · image-search`
    return `#${index + 1}`
  }

  function buildContextCheckboxes(btn, index) {
    const wrapper = document.createElement('div')
    wrapper.className = 'checkbox-group'
    wrapper.style.marginBottom = '4px'
      ;[
        { value: 'text', label: 'text' },
        { value: 'image', label: 'image' }
      ].forEach(({ value, label }) => {
        const lbl = document.createElement('label')
        lbl.className = 'cb-label'
        const cb = document.createElement('input')
        cb.type = 'checkbox'
        cb.className = 'context-checkbox'
        cb.dataset.index = index
        cb.dataset.context = value
        cb.checked = (btn.contexts || ['text']).includes(value)
        lbl.appendChild(cb)
        lbl.appendChild(document.createTextNode(' ' + label))
        wrapper.appendChild(lbl)
      })
    return wrapper
  }

  function buildActionSelect(btn, index) {
    const sel = document.createElement('select')
    sel.className = 'config-input'
    sel.dataset.field = 'action'
    sel.dataset.index = index
      ;[
        { value: 'copy', label: 'Copy' },
        { value: 'paste', label: 'Paste' },
        { value: 'markdown', label: 'As Markdown' }
      ].forEach(({ value, label }) => {
        const opt = document.createElement('option')
        opt.value = value
        opt.textContent = label
        opt.selected = btn.action === value
        sel.appendChild(opt)
      })
    return sel
  }

  function buildMarkdownSourceSelect(btn, index) {
    const label = document.createElement('span')
    label.className = 'field-label'
    label.textContent = 'Markdown Source'
    label.style.marginTop = '4px'

    const sel = document.createElement('select')
    sel.className = 'config-input'
    sel.dataset.field = 'markdownSource'
    sel.dataset.index = index
      ;[
        { value: 'selection', label: 'Highlighted Text' },
        { value: 'page', label: 'Entire Page' }
      ].forEach(({ value, label: lbl }) => {
        const opt = document.createElement('option')
        opt.value = value
        opt.textContent = lbl
        opt.selected = (btn.markdownSource || 'selection') === value
        sel.appendChild(opt)
      })

    const wrap = document.createElement('div')
    wrap.appendChild(label)
    wrap.appendChild(sel)
    return wrap
  }

  function buildUrlInput(btn, index, placeholder) {
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'config-input'
    input.dataset.field = 'url'
    input.dataset.index = index
    input.value = btn.url || ''
    input.placeholder = placeholder
    return input
  }

  // ─── Event Listeners ──────────────────────────────────────────────────────────

  function attachListeners() {
    // Remove buttons
    document.querySelectorAll('.btn-item-remove').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation()
        currentConfig.buttons.splice(Number(e.target.dataset.index), 1)
        renderUI()
      })
    })

    // Context checkboxes
    document.querySelectorAll('.context-checkbox').forEach(cb => {
      cb.addEventListener('change', e => {
        const idx = Number(e.target.dataset.index)
        const ctx = e.target.dataset.context
        const btn = currentConfig.buttons[idx]
        if (!btn.contexts) btn.contexts = []
        if (e.target.checked) {
          if (!btn.contexts.includes(ctx)) btn.contexts.push(ctx)
        } else {
          btn.contexts = btn.contexts.filter(c => c !== ctx)
        }
        schedulePreviewDraw()
      })
    })

    // Config inputs (type, action, url, icon, markdownSource)
    document.querySelectorAll('.config-input').forEach(el => {
      el.addEventListener('change', e => {
        const idx = Number(e.target.dataset.index)
        const field = e.target.dataset.field
        if (field === undefined || isNaN(idx)) return
        const btn = currentConfig.buttons[idx]
        if (!btn) return

        if (field === 'type') {
          btn.type = e.target.value
          if (btn.type === 'link') {
            btn.url = 'https://google.com/search?q=%s'
            delete btn.action
          } else if (btn.type === 'image-search') {
            btn.url = 'https://lens.google.com/uploadbyurl?url=%s'
            if (!btn.contexts || btn.contexts.length === 0) btn.contexts = ['image']
            delete btn.action
          } else if (btn.type === 'action') {
            btn.action = 'copy'
            delete btn.url
          }
          renderUI()
          return
        }

        if (field === 'action') {
          btn.action = e.target.value
          if (btn.action !== 'markdown') delete btn.markdownSource
          renderUI()
          return
        }

        btn[field] = e.target.value

        // Re-render preview on icon change (requires reload)
        if (field === 'icon') loadPreviewIcons()
      })
    })

    // Style inputs — live preview on every input event
    elements.styleInputs.forEach(input => {
      input.addEventListener('input', e => {
        const key = e.target.dataset.key
        let val = e.target.value
        if (input.type === 'range') {
          val = parseFloat(val)
          const display = document.getElementById(`val-${key}`)
          if (display) display.textContent = val
        }
        currentConfig.style[key] = val
        schedulePreviewDraw()
      })
    })
  }

  // ─── Add Buttons ─────────────────────────────────────────────────────────────

  elements.addBtn.addEventListener('click', () => {
    currentConfig.buttons.push({
      id: 'btn-' + Date.now(),
      type: 'link',
      url: 'https://',
      contexts: ['text'],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#d5d5d5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>'
    })
    renderUI()
  })

  elements.addImageSearchBtn.addEventListener('click', e => {
    const existing = document.getElementById('preset-picker')
    if (existing) { existing.remove(); return }

    const picker = document.createElement('div')
    picker.id = 'preset-picker'
    picker.className = 'preset-picker'

    IMAGE_SEARCH_PRESETS.forEach(preset => {
      const alreadyAdded = currentConfig.buttons.some(b => b.id === preset.id)
      const row = document.createElement('button')
      row.className = 'preset-row' + (alreadyAdded ? ' preset-row--added' : '')
      row.disabled = alreadyAdded
      row.textContent = alreadyAdded ? `${preset.label} ✓` : preset.label
      row.addEventListener('click', () => {
        currentConfig.buttons.push({
          id: preset.id,
          type: 'image-search',
          url: preset.url,
          contexts: ['image'],
          icon: preset.icon
        })
        picker.remove()
        renderUI()
      })
      picker.appendChild(row)
    })

    elements.addImageSearchBtn.insertAdjacentElement('afterend', picker)
  })

  document.addEventListener('click', e => {
    const picker = document.getElementById('preset-picker')
    if (picker && !picker.contains(e.target) && e.target !== elements.addImageSearchBtn) {
      picker.remove()
    }
  })

  // ─── Save ────────────────────────────────────────────────────────────────────

  elements.saveBtn.addEventListener('click', () => {
    const origText = elements.saveBtn.textContent
    elements.saveBtn.textContent = 'Saving...'
    elements.saveBtn.disabled = true
    chrome.storage.sync.set({ canvasToastConfig: currentConfig }, () => {
      elements.saveBtn.textContent = origText
      elements.saveBtn.disabled = false
      elements.status.style.opacity = '1'
      setTimeout(() => { elements.status.style.opacity = '0' }, 2000)
    })
  })

  // ─── Bootstrap ───────────────────────────────────────────────────────────────

  chrome.storage.sync.get(['canvasToastConfig'], result => {
    const saved = result.canvasToastConfig || {}
    currentConfig = {
      style: { ...defaultConfig.style, ...(saved.style || {}) },
      buttons: saved.buttons && saved.buttons.length > 0
        ? saved.buttons
        : defaultConfig.buttons
    }
    // Backfill missing contexts
    currentConfig.buttons = currentConfig.buttons.map(btn => ({
      ...btn,
      contexts: btn.contexts && btn.contexts.length > 0 ? btn.contexts : ['text']
    }))
    renderUI()
  })
})
