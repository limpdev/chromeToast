// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    buttonList: document.getElementById('buttonList'),
    addBtn: document.getElementById('addBtn'),
    saveBtn: document.getElementById('save'),
    status: document.getElementById('status'),
    styleInputs: document.querySelectorAll('.style-input')
  }
  // --- DEFAULT CONFIG (aligned with content.js) ---
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
  let currentConfig = null
  // Load Settings
  chrome.storage.sync.get(['canvasToastConfig'], result => {
    const saved = result.canvasToastConfig || {}
    currentConfig = {
      style: {
        ...defaultConfig.style,
        ...(saved.style || {})
      },
      buttons:
        saved.buttons && saved.buttons.length > 0
          ? saved.buttons
          : defaultConfig.buttons
    }
    renderUI()
  })
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
      const item = document.createElement('div')
      item.className = 'btn-item'
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
    document.querySelectorAll('.btn-remove').forEach(el => {
      el.addEventListener('click', e => {
        currentConfig.buttons.splice(e.target.dataset.index, 1)
        renderUI()
      })
    })
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
  elements.addBtn.addEventListener('click', () => {
    currentConfig.buttons.push({
      id: 'btn-' + Date.now(),
      type: 'link',
      url: 'https://',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>'
    })
    renderUI()
  })
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
