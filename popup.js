// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    buttonList: document.getElementById('buttonList'),
    addBtn: document.getElementById('addBtn'),
    addImageSearchBtn: document.getElementById('addImageSearchBtn'),
    saveBtn: document.getElementById('save'),
    status: document.getElementById('status'),
    styleInputs: document.querySelectorAll('.style-input')
  }
  const defaultConfig = {
    style: {
      bgColor: '#1b1c1d',
      bgOpacity: 0.75,
      hoverColor: '#404040',
      hoverOpacity: 0.2,
      borderRadius: 13,
      iconSize: 18,
      iconPadding: 5,
      buttonSpacing: 4,
      padding: 6,
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
        id: 'markdown',
        type: 'action',
        action: 'markdown',
        markdownSource: 'selection',
        contexts: ['text'],
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#d5d5d5" d="M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1m4 12.5v-4l2 2l2-2v4h2v-7h-2l-2 2l-2-2H5v7zm11-3v-4h-2v4h-2l3 3l3-3z"/></svg>'
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
  // Image search engine presets for the "Add Image Search" quick-add menu
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
  let currentConfig = null
  chrome.storage.sync.get(['canvasToastConfig'], result => {
    const saved = result.canvasToastConfig || {}
    currentConfig = {
      style: { ...defaultConfig.style, ...(saved.style || {}) },
      buttons:
        saved.buttons && saved.buttons.length > 0
          ? saved.buttons
          : defaultConfig.buttons
    }
    // Backfill contexts on any legacy buttons that are missing it
    currentConfig.buttons = currentConfig.buttons.map(btn => ({
      ...btn,
      contexts:
        btn.contexts && btn.contexts.length > 0 ? btn.contexts : ['text']
    }))
    renderUI()
  })
  // --- Render ---
  function renderUI () {
    elements.styleInputs.forEach(input => {
      const key = input.dataset.key
      if (currentConfig.style[key] !== undefined) {
        input.value = currentConfig.style[key]
        const display = document.getElementById(`val-${key}`)
        if (display) display.textContent = currentConfig.style[key]
      }
    })
    if (!elements.buttonList) return
    elements.buttonList.innerHTML = ''
    currentConfig.buttons.forEach((btn, index) => {
      elements.buttonList.appendChild(buildButtonItem(btn, index))
    })
    attachListeners()
  }
  function buildButtonItem (btn, index) {
    const item = document.createElement('div')
    item.className = 'btn-item'
    // Header
    const header = document.createElement('div')
    header.className = 'btn-header'
    const headerLabel = document.createElement('span')
    headerLabel.textContent = `Action ${index + 1}`
    const removeBtn = document.createElement('span')
    removeBtn.className = 'btn-remove'
    removeBtn.dataset.index = index
    removeBtn.textContent = '✖'
    header.appendChild(headerLabel)
    header.appendChild(removeBtn)
    item.appendChild(header)
    // Context checkboxes
    item.appendChild(buildContextCheckboxes(btn, index))
    // Type select
    const typeSelect = document.createElement('select')
    typeSelect.className = 'config-input type-select'
    typeSelect.dataset.field = 'type'
    typeSelect.dataset.index = index
    ;[
      { value: 'action', label: 'System Action' },
      { value: 'link', label: 'Search / Link' },
      { value: 'image-search', label: 'Image Search' }
    ].forEach(({ value, label }) => {
      const opt = document.createElement('option')
      opt.value = value
      opt.textContent = label
      opt.selected = btn.type === value
      typeSelect.appendChild(opt)
    })
    item.appendChild(typeSelect)
    // Type-specific fields
    if (btn.type === 'action') {
      item.appendChild(buildActionSelect(btn, index))
    } else if (btn.type === 'link') {
      item.appendChild(
        buildUrlInput(btn, index, 'https://google.com/search?q=%s')
      )
    } else if (btn.type === 'image-search') {
      item.appendChild(
        buildUrlInput(btn, index, 'https://lens.google.com/uploadbyurl?url=%s')
      )
      const hint = document.createElement('span')
      hint.className = 'helper-text'
      hint.textContent = 'Use %s for the image URL'
      item.appendChild(hint)
    }
    if (btn.type === 'action') {
      item.appendChild(buildActionSelect(btn, index))
      if (btn.action === 'markdown') {
        item.appendChild(buildMarkdownSourceSelect(btn, index))
      }
    }
    // Icon
    const iconHelper = document.createElement('span')
    iconHelper.className = 'helper-text'
    iconHelper.textContent = 'SVG Icon Code:'
    item.appendChild(iconHelper)
    const iconArea = document.createElement('textarea')
    iconArea.className = 'config-input'
    iconArea.dataset.field = 'icon'
    iconArea.dataset.index = index
    iconArea.textContent = btn.icon || ''
    item.appendChild(iconArea)
    return item
  }
  function buildContextCheckboxes (btn, index) {
    const wrapper = document.createElement('div')
    wrapper.className = 'context-row'
    const label = document.createElement('span')
    label.className = 'helper-text'
    label.textContent = 'Show in:'
    wrapper.appendChild(label)
    const checkboxWrapper = document.createElement('div')
    checkboxWrapper.className = 'checkbox-group'
    ;[
      { value: 'text', label: 'Text' },
      { value: 'image', label: 'Image' }
    ].forEach(({ value, label: cbLabel }) => {
      const cbLabel_el = document.createElement('label')
      cbLabel_el.className = 'checkbox-label'
      const cb = document.createElement('input')
      cb.type = 'checkbox'
      cb.className = 'context-checkbox'
      cb.dataset.index = index
      cb.dataset.context = value
      cb.checked = (btn.contexts || ['text']).includes(value)
      cbLabel_el.appendChild(cb)
      cbLabel_el.appendChild(document.createTextNode(' ' + cbLabel))
      checkboxWrapper.appendChild(cbLabel_el)
    })
    wrapper.appendChild(checkboxWrapper)
    return wrapper
  }
  function buildActionSelect (btn, index) {
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
  // Helper function for Markdown conversion
  function buildMarkdownSourceSelect (btn, index) {
    const label = document.createElement('span')
    label.className = 'helper-text'
    label.textContent = 'Markdown source:'

    const sel = document.createElement('select')
    sel.className = 'config-input'
    sel.dataset.field = 'markdownSource'
    sel.dataset.index = index
    ;[
      { value: 'selection', label: 'Highlighted Text' },
      { value: 'page', label: 'Entire Page' }
    ].forEach(({ value, label: optLabel }) => {
      const opt = document.createElement('option')
      opt.value = value
      opt.textContent = optLabel
      opt.selected = (btn.markdownSource || 'selection') === value
      sel.appendChild(opt)
    })

    const wrapper = document.createElement('div')
    wrapper.appendChild(label)
    wrapper.appendChild(sel)
    return wrapper
  }
  function buildUrlInput (btn, index, placeholder) {
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'config-input'
    input.dataset.field = 'url'
    input.dataset.index = index
    input.value = btn.url || ''
    input.placeholder = placeholder
    return input
  }
  // --- Listeners ---
  function attachListeners () {
    document.querySelectorAll('.btn-remove').forEach(el => {
      el.addEventListener('click', e => {
        currentConfig.buttons.splice(Number(e.target.dataset.index), 1)
        renderUI()
      })
    })
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
      })
    })
    document.querySelectorAll('.config-input').forEach(el => {
      el.addEventListener('change', e => {
        const idx = Number(e.target.dataset.index)
        const field = e.target.dataset.field
        if (field === undefined || idx === undefined || isNaN(idx)) return
        const btn = currentConfig.buttons[idx]
        if (!btn) return
        if (field === 'type') {
          btn.type = e.target.value
          if (btn.type === 'link') {
            btn.url = 'https://google.com/search?q=%s'
            delete btn.action
          } else if (btn.type === 'image-search') {
            btn.url = 'https://lens.google.com/uploadbyurl?url=%s'
            // Default new image-search buttons to image context
            if (!btn.contexts || btn.contexts.length === 0) {
              btn.contexts = ['image']
            }
            delete btn.action
          } else if (btn.type === 'action') {
            btn.action = 'copy'
            delete btn.url
          }
          renderUI()
        } else if (field === 'action') {
          btn.action = e.target.value
          if (btn.action !== 'markdown') delete btn.markdownSource
          renderUI()
        } else {
          btn[field] = e.target.value
        }
      })
    })
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
      })
    })
  }
  // --- Add Buttons ---
  elements.addBtn.addEventListener('click', () => {
    currentConfig.buttons.push({
      id: 'btn-' + Date.now(),
      type: 'link',
      url: 'https://',
      contexts: ['text'],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>'
    })
    renderUI()
  })
  // Dropdown for image search presets
  elements.addImageSearchBtn.addEventListener('click', e => {
    // Toggle a small preset picker beneath the button
    const existing = document.getElementById('preset-picker')
    if (existing) {
      existing.remove()
      return
    }
    const picker = document.createElement('div')
    picker.id = 'preset-picker'
    picker.className = 'preset-picker'
    IMAGE_SEARCH_PRESETS.forEach(preset => {
      // Disable if already in the list
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
    // Insert after the button
    elements.addImageSearchBtn.insertAdjacentElement('afterend', picker)
  })
  // Close preset picker on outside click
  document.addEventListener('click', e => {
    const picker = document.getElementById('preset-picker')
    if (
      picker &&
      !picker.contains(e.target) &&
      e.target !== elements.addImageSearchBtn
    ) {
      picker.remove()
    }
  })
  // --- Save ---
  elements.saveBtn.addEventListener('click', () => {
    elements.saveBtn.textContent = 'Saving...'
    chrome.storage.sync.set({ canvasToastConfig: currentConfig }, () => {
      elements.saveBtn.textContent = 'Save Changes'
      elements.status.style.opacity = '1'
      setTimeout(() => {
        elements.status.style.opacity = '0'
      }, 2000)
    })
  })
})
