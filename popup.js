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
    elements.buttonList.innerHTML = ''
    currentConfig.buttons.forEach((btn, index) => {
      const item = document.createElement('div')
      item.className = 'btn-item'
      let content = `
    <div class="btn-header">
      <span>Action ${index + 1}</span>
      <span class="btn-remove" data-index="${index}">✖</span>
    </div>
    <select class="config-input type-select" data-field="type" data-index="${index}">
      <option value="action" ${
        btn.type === 'action' ? 'selected' : ''
      }>System Action</option>
      <option value="link" ${
        btn.type === 'link' ? 'selected' : ''
      }>Search / Link</option>
    </select>
  `

      if (btn.type === 'action') {
        content += `
      <select class="config-input" data-field="action" data-index="${index}">
        <option value="copy" ${
          btn.action === 'copy' ? 'selected' : ''
        }>Copy Text</option>
        <option value="paste" ${
          btn.action === 'paste' ? 'selected' : ''
        }>Paste Text</option>
      </select>
    `
      } else {
        content += `
      <input type="text" class="config-input" data-field="url" data-index="${index}" 
             value="${
               btn.url || ''
             }" placeholder="https://google.com/search?q=%s">
      <span class="helper-text">Use %s for selected text</span>
    `
      }

      content += `
    <span class="helper-text">SVG Icon Code:</span>
    <textarea class="config-input" data-field="icon" data-index="${index}">${btn.icon}</textarea>
  `
      item.innerHTML = content
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
