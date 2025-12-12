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
  };

  // Default structure if nothing exists
  const defaultConfig = {
    style: {
      bgColor: '#121212',
      bgOpacity: 0.9,
      hoverColor: '#ffffff',
      hoverOpacity: 0.15,
      borderRadius: 16,
      buttonSize: 32,
      buttonSpacing: 8,
      padding: 8,
      iconSize: 20
    },
    buttons: [
      { id: 'copy', type: 'action', action: 'copy', icon: '<svg viewBox="0 0 24 24" stroke="#fff" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' }
    ]
  };

  let currentConfig = null;

  // Load Settings
  chrome.storage.sync.get(['canvasToastConfig'], (result) => {
    currentConfig = result.canvasToastConfig || defaultConfig;
    renderUI();
  });

  function renderUI() {
    // Styles
    elements.bgColor.value = currentConfig.style.bgColor;
    elements.bgOpacity.value = currentConfig.style.bgOpacity;
    elements.hoverColor.value = currentConfig.style.hoverColor;

    // Buttons
    elements.buttonList.innerHTML = '';
    currentConfig.buttons.forEach((btn, index) => {
      const div = document.createElement('div');
      div.className = 'btn-item';
      div.innerHTML = `
        <div class="btn-header">
          <span>Button ${index + 1}</span>
          <span class="remove-btn" data-index="${index}">✖</span>
        </div>
        <div class="row">
            <select class="type-select" data-index="${index}" style="width:100%">
                <option value="action" ${btn.type === 'action' ? 'selected' : ''}>Built-in Action</option>
                <option value="link" ${btn.type === 'link' ? 'selected' : ''}>Search / Link URL</option>
            </select>
        </div>
        
        ${btn.type === 'action' ? `
        <div class="row">
            <select class="action-select" data-index="${index}" style="width:100%">
                <option value="copy" ${btn.action === 'copy' ? 'selected' : ''}>Copy</option>
                <option value="paste" ${btn.action === 'paste' ? 'selected' : ''}>Paste</option>
            </select>
        </div>` : `
        <div class="row">
            <input type="text" class="url-input" data-index="${index}" value="${btn.url || ''}" placeholder="https://google.com/search?q=%s">
        </div>
        `}

        <div class="row">
            <span style="font-size:10px">SVG Icon string:</span>
        </div>
        <textarea class="icon-input" data-index="${index}">${btn.icon}</textarea>
      `;
      elements.buttonList.appendChild(div);
    });

    // Attach listeners for dynamic inputs
    document.querySelectorAll('.remove-btn').forEach(el => {
      el.addEventListener('click', (e) => {
        currentConfig.buttons.splice(e.target.dataset.index, 1);
        renderUI();
      });
    });

    document.querySelectorAll('input, select, textarea').forEach(el => {
      el.addEventListener('change', updateConfigFromUI);
    });
  }

  function updateConfigFromUI(e) {
    // Update Style
    currentConfig.style.bgColor = elements.bgColor.value;
    currentConfig.style.bgOpacity = parseFloat(elements.bgOpacity.value);
    currentConfig.style.hoverColor = elements.hoverColor.value;

    // Update specific button if changed
    if(e && e.target.dataset.index !== undefined) {
        const idx = e.target.dataset.index;
        const btn = currentConfig.buttons[idx];
        
        if (e.target.classList.contains('type-select')) {
            btn.type = e.target.value;
            // Set defaults when switching
            if(btn.type === 'link' && !btn.url) btn.url = 'https://google.com/search?q=%s';
            if(btn.type === 'action' && !btn.action) btn.action = 'copy';
            renderUI(); // Re-render to show correct fields
            return;
        }
        if (e.target.classList.contains('action-select')) btn.action = e.target.value;
        if (e.target.classList.contains('url-input')) btn.url = e.target.value;
        if (e.target.classList.contains('icon-input')) btn.icon = e.target.value;
    }
  }

  elements.addBtn.addEventListener('click', () => {
    currentConfig.buttons.push({
      id: 'custom-' + Date.now(),
      type: 'link',
      url: 'https://',
      icon: '<svg viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="12" r="10"/></svg>'
    });
    renderUI();
  });

  elements.saveBtn.addEventListener('click', () => {
    // Final scrape of UI values to be safe
    updateConfigFromUI();
    
    chrome.storage.sync.set({ canvasToastConfig: currentConfig }, () => {
      const status = elements.status;
      status.textContent = 'Options saved.';
      setTimeout(() => { status.textContent = ''; }, 1500);
    });
  });
});