// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    buttonList: document.getElementById('buttonList'),
    addBtn: document.getElementById('addBtn'),
    saveBtn: document.getElementById('save'),
    status: document.getElementById('status'),
    styleInputs: document.querySelectorAll('.style-input')
  }

  // --- ENSURED DEFAULT MATCHES CONTENT.JS ---
  const defaultConfig = {
    style: {
      bgColor: '#0f172a',
      bgOpacity: 0.95,
      hoverColor: '#3b82f6',
      hoverOpacity: 0.2,
      borderRadius: 12,
      buttonSize: 36,
      buttonSpacing: 6,
      padding: 6,
      iconSize: 20,
      animSpeed: 0.2,
      hoverScale: 1.15,
      activeScale: 0.95,
      iconLift: 3
    },
    buttons: [
      {
        id: 'copy',
        type: 'action',
        action: 'copy',
        // Filled, reliable SVG icon
        icon: '<svg viewBox="0 0 24 24" fill="#e2e8f0" xmlns="http://www.w3.org/2000/svg"><path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/></svg>'
      },
      {
        id: 'google',
        type: 'link',
        url: 'https://www.google.com/search?q=%s',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
      }
    ]
  }

  let currentConfig = null

  // Load Settings
  chrome.storage.sync.get(['canvasToastConfig'], result => {
    // Deep Merge Logic
    const saved = result.canvasToastConfig || {}
    currentConfig = {
      style: {
        ...defaultConfig.style,
        ...(saved.style || {})
      },
      // If saved buttons exist and are not empty, use them. Otherwise use default.
      buttons:
        saved.buttons && saved.buttons.length > 0
          ? saved.buttons
          : defaultConfig.buttons
    }
    renderUI()
  })

  function renderUI () {
    // 1. Populate Style Inputs
    elements.styleInputs.forEach(input => {
      const key = input.dataset.key
      if (currentConfig.style[key] !== undefined) {
        input.value = currentConfig.style[key]
        const display = document.getElementById(`val-${key}`)
        if (display) display.textContent = currentConfig.style[key]
      }
    })

    // 2. Populate Buttons
    if (!elements.buttonList) return
    elements.buttonList.innerHTML = ''
    currentConfig.buttons.forEach((btn, index) => {
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

      // Type Select
      const typeSelect = document.createElement('select')
      typeSelect.className = 'config-input type-select'
      typeSelect.dataset.field = 'type'
      typeSelect.dataset.index = index
      const actionOption = document.createElement('option')
      actionOption.value = 'action'
      actionOption.textContent = 'System Action'
      actionOption.selected = btn.type === 'action'
      const linkOption = document.createElement('option')
      linkOption.value = 'link'
      linkOption.textContent = 'Search / Link'
      linkOption.selected = btn.type === 'link'
      typeSelect.appendChild(actionOption)
      typeSelect.appendChild(linkOption)
      item.appendChild(typeSelect)

      if (btn.type === 'action') {
      const actionSelect = document.createElement('select')
      actionSelect.className = 'config-input'
      actionSelect.dataset.field = 'action'
      actionSelect.dataset.index = index
      const copyOpt = document.createElement('option')
      copyOpt.value = 'copy'
      copyOpt.textContent = 'Copy Text'
      copyOpt.selected = btn.action === 'copy'
      const pasteOpt = document.createElement('option')
      pasteOpt.value = 'paste'
      pasteOpt.textContent = 'Paste Text'
      pasteOpt.selected = btn.action === 'paste'
      actionSelect.appendChild(copyOpt)
      actionSelect.appendChild(pasteOpt)
      item.appendChild(actionSelect)
      } else {
      const urlInput = document.createElement('input')
      urlInput.type = 'text'
      urlInput.className = 'config-input'
      urlInput.dataset.field = 'url'
      urlInput.dataset.index = index
      urlInput.value = btn.url || ''
      urlInput.placeholder = 'https://google.com/search?q=%s'
      item.appendChild(urlInput)
      const urlHelper = document.createElement('span')
      urlHelper.className = 'helper-text'
      urlHelper.textContent = 'Use %s for selected text'
      item.appendChild(urlHelper)
      }

      // Icon textarea
      const iconHelper = document.createElement('span')
      iconHelper.className = 'helper-text'
      iconHelper.textContent = 'SVG Icon Code:'
      item.appendChild(iconHelper)
      const iconArea = document.createElement('textarea')
      iconArea.className = 'config-input'
      iconArea.dataset.field = 'icon'
      iconArea.dataset.index = index
      iconArea.textContent = btn.icon
      item.appendChild(iconArea)

      elements.buttonList.appendChild(item)
    })

    attachListeners()
  }

  function attachListeners () {
    // Remove Button
    document.querySelectorAll('.btn-remove').forEach(el => {
      el.addEventListener('click', e => {
        currentConfig.buttons.splice(e.target.dataset.index, 1)
        renderUI()
      })
    })

    // Button Config Inputs
    document.querySelectorAll('.config-input').forEach(el => {
      el.addEventListener('change', e => {
        const idx = e.target.dataset.index
        const field = e.target.dataset.field
        const btn = currentConfig.buttons[idx]

        if (field === 'type') {
          btn.type = e.target.value
          if (btn.type === 'link') {
            btn.url = 'https://google.com/search?q=%s'
            delete btn.action
          }
          if (btn.type === 'action') {
            btn.action = 'copy'
            delete btn.url
          }
          renderUI()
        } else {
          btn[field] = e.target.value
        }
      })
    })

    // Style Inputs
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

  // Add New Button
  elements.addBtn.addEventListener('click', () => {
    currentConfig.buttons.push({
      id: 'btn-' + Date.now(),
      type: 'link',
      url: 'https://',
      // Consistent default new button icon
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>'
    })
    renderUI()
  })

  // Save Settings
  elements.saveBtn.addEventListener('click', () => {
    elements.saveBtn.textContent = 'Saving...'
    chrome.storage.sync.set(
      {
        canvasToastConfig: currentConfig
      },
      () => {
        elements.saveBtn.textContent = 'Save Changes'
        elements.status.style.opacity = '1'
        setTimeout(() => {
          elements.status.style.opacity = '0'
        }, 2000)
      }
    )
  })
})
