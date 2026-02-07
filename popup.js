// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    bgColor: document.getElementById('bgColor'),
    bgOpacity: document.getElementById('bgOpacity'),
    hoverColor: document.getElementById('hoverColor'),
    buttonList: document.getElementById('buttonList'),
    addBtn: document.getElementById('addBtn'),
    saveBtn: document.getElementById('save'),
    status: document.getElementById('status')
  }

  const defaultConfig = {
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
    buttons: [
      {
        id: 'copy',
        type: 'action',
        action: 'copy',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
      }
    ]
  }

  let currentConfig = null

  // Load Settings
  chrome.storage.sync.get(['canvasToastConfig'], result => {
    // Deep merge would be better, but simple fallback works for now
    currentConfig = result.canvasToastConfig || defaultConfig
    if (!currentConfig.style) currentConfig.style = defaultConfig.style
    if (!currentConfig.buttons) currentConfig.buttons = defaultConfig.buttons
    renderUI()
  })

  function renderUI () {
    // Styles
    elements.bgColor.value = currentConfig.style.bgColor
    elements.bgOpacity.value = currentConfig.style.bgOpacity
    elements.hoverColor.value = currentConfig.style.hoverColor

    // Buttons
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
    // Remove buttons
    document.querySelectorAll('.btn-remove').forEach(el => {
      el.addEventListener('click', e => {
        currentConfig.buttons.splice(e.target.dataset.index, 1)
        renderUI()
      })
    })

    // Inputs
    document.querySelectorAll('.config-input').forEach(el => {
      el.addEventListener('change', e => {
        const idx = e.target.dataset.index
        const field = e.target.dataset.field
        const btn = currentConfig.buttons[idx]

        if (field === 'type') {
          // Reset defaults when switching type
          btn.type = e.target.value
          if (btn.type === 'link') btn.url = 'https://google.com/search?q=%s'
          if (btn.type === 'action') btn.action = 'copy'
          renderUI() // Re-render to show appropriate fields
        } else {
          btn[field] = e.target.value
        }
      })
    })
  }

  // Global Style Listeners
  elements.bgColor.addEventListener(
    'change',
    e => (currentConfig.style.bgColor = e.target.value)
  )
  elements.bgOpacity.addEventListener(
    'input',
    e => (currentConfig.style.bgOpacity = parseFloat(e.target.value))
  )
  elements.hoverColor.addEventListener(
    'change',
    e => (currentConfig.style.hoverColor = e.target.value)
  )

  // Add Button
  elements.addBtn.addEventListener('click', () => {
    currentConfig.buttons.push({
      id: 'btn-' + Date.now(),
      type: 'link',
      url: 'https://',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'
    })
    renderUI()
  })

  // Save
  elements.saveBtn.addEventListener('click', () => {
    // visual feedback
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
