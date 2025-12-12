// content.js - FIXED VERSION
(function () {
  'use strict';
  
  // --- Global State ---
  let canvas, ctx;
  let currentSelection = '';
  let selectionRange = null;
  let isVisible = false;
  let animationId = null;
  let buttons = []; // Computed button objects for hit testing
  let loadedIcons = {}; // Cache for Image objects
  let iconsReady = false; // Track if all icons are loaded
  
  // Animation State - FIXED: Persistent hover state
  const animState = {
    toastHover: 0,
    buttonHovers: [],
    opacity: 0,
    hoveredButtonIndex: -1 // NEW: Track which button is hovered
  };
  
  // --- Default Configuration ---
  let config = {
    style: {
      bgColor: '#0d1117',
      bgOpacity: 0.85,
      hoverColor: '#4a9eff', // Changed to a visible blue
      hoverOpacity: 0.25, // Increased from 0.15
      borderRadius: 16,
      buttonSize: 32,
      buttonSpacing: 8,
      padding: 8,
      iconSize: 20
    },
    buttons: [
      { id: 'copy', type: 'action', action: 'copy', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>' },
      { id: 'google', type: 'link', url: 'https://www.google.com/search?q=%s', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>' },
      { id: 'paste', type: 'action', action: 'paste', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>' }
    ]
  };
  
  // --- Initialization ---
  function init() {
    chrome.storage.sync.get(['canvasToastConfig'], (result) => {
      if (result.canvasToastConfig) {
        config = result.canvasToastConfig;
      }
      setupCanvas();
      loadIcons();
      attachEvents();
    });
    
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.canvasToastConfig) {
        config = changes.canvasToastConfig.newValue;
        loadIcons();
        if (isVisible) draw();
      }
    });
  }
  
  function setupCanvas() {
    if (canvas) document.body.removeChild(canvas);
    
    canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483647',
      display: 'none'
    });
    
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
  }
  
  function attachEvents() {
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('scroll', handleScroll, true); // FIX: Hide on scroll
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mouseleave', () => {
      animState.hoveredButtonIndex = -1; // FIX: Clear hover on leave
    });
  }
  
  // --- Logic ---
  function loadIcons() {
    loadedIcons = {};
    iconsReady = false;
    let loadedCount = 0;
    const totalIcons = config.buttons.length;
    
    config.buttons.forEach(btn => {
      const img = new Image();
      let src = btn.icon;
      
      if (src.trim().startsWith('<svg')) {
        src = 'data:image/svg+xml;base64,' + btoa(src);
      }
      
      img.onload = () => { 
        loadedIcons[btn.id] = img;
        loadedCount++;
        if (loadedCount === totalIcons) {
          iconsReady = true; // FIX: Track when all icons are ready
          if (isVisible) draw(); // Redraw if already visible
        }
      };
      
      img.onerror = () => {
        console.warn(`Failed to load icon for ${btn.id}`);
        loadedCount++;
        if (loadedCount === totalIcons) {
          iconsReady = true;
        }
      };
      
      img.src = src;
    });
    
    animState.buttonHovers = new Array(config.buttons.length).fill(0);
  }
  
  function handleSelectionChange() {
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel.toString().trim();
      
      if (text.length > 0) {
        currentSelection = text;
        selectionRange = sel.getRangeAt(0);
        const rect = selectionRange.getBoundingClientRect();
        showToast(rect);
      }
    }, 10);
  }
  
  function handleOutsideClick(e) {
    if (isVisible && e.target !== canvas) {
      hideToast();
    }
  }
  
  // FIX: Hide toast on scroll
  function handleScroll() {
    if (isVisible) {
      hideToast();
    }
  }
  
  function showToast(rect) {
    isVisible = true;
    animState.opacity = 0;
    
    const count = config.buttons.length;
    const { padding, buttonSize, buttonSpacing } = config.style;
    const totalWidth = padding * 2 + (buttonSize * count) + (buttonSpacing * (count - 1));
    const totalHeight = padding * 2 + buttonSize;
    const buffer = 20;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = (totalWidth + buffer * 2) + 'px';
    canvas.style.height = (totalHeight + buffer * 2) + 'px';
    canvas.width = (totalWidth + buffer * 2) * dpr;
    canvas.height = (totalHeight + buffer * 2) * dpr;
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    
    const left = rect.left + rect.width / 2 - totalWidth / 2;
    const top = rect.top - totalHeight - 15;
    
    canvas.style.left = (left - buffer) + 'px';
    canvas.style.top = (top - buffer) + 'px';
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'auto';
    
    startLoop();
  }
  
  function hideToast() {
    isVisible = false;
    canvas.style.pointerEvents = 'none';
    animState.hoveredButtonIndex = -1; // FIX: Clear hover state
  }
  
  // --- Rendering & Animation ---
  function startLoop() {
    if (!animationId) loop();
  }
  
  function loop() {
    if (!isVisible && Math.abs(animState.opacity) < 0.01) {
      animationId = null;
      canvas.style.display = 'none';
      return;
    }
    
    draw();
    animationId = requestAnimationFrame(loop);
  }
  
  function lerp(start, end, t) { 
    return start * (1 - t) + end * t; 
  }
  
  // FIX: Helper to parse hex to RGB for color interpolation
  function hexToRgb(hex) {
    const cleaned = hex.replace('#', '');
    return {
      r: parseInt(cleaned.substring(0, 2), 16),
      g: parseInt(cleaned.substring(2, 4), 16),
      b: parseInt(cleaned.substring(4, 6), 16)
    };
  }
  
  function draw() {
    const { style, buttons: btnConfig } = config;
    const buffer = 20;
    
    const count = btnConfig.length;
    const totalW = style.padding * 2 + (style.buttonSize * count) + (style.buttonSpacing * (count - 1));
    const totalH = style.padding * 2 + style.buttonSize;
    
    animState.opacity = lerp(animState.opacity, isVisible ? 1 : 0, 0.2);
    const isCanvasHover = canvas.style.cursor === 'pointer';
    animState.toastHover = lerp(animState.toastHover, isCanvasHover ? 1 : 0, 0.2);
    
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    ctx.save();
    ctx.globalAlpha = animState.opacity;
    
    const cx = buffer + totalW / 2;
    const cy = buffer + totalH / 2;
    const scale = 1 + (animState.toastHover * 0.05);
    
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    
    // Background
    ctx.shadowBlur = 10 + (animState.toastHover * 10);
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowOffsetY = 2 + (animState.toastHover * 2);
    
    const bgRgb = hexToRgb(style.bgColor);
    ctx.fillStyle = `rgba(${bgRgb.r},${bgRgb.g},${bgRgb.b},${style.bgOpacity})`;
    roundRect(ctx, buffer, buffer, totalW, totalH, style.borderRadius);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // FIX: Rebuild buttons array with correct coordinates
    buttons = [];
    let x = buffer + style.padding;
    const y = buffer + style.padding;
    
    btnConfig.forEach((btn, i) => {
      // FIX: Store absolute canvas coordinates (including buffer)
      buttons.push({
        x: x,
        y: y,
        w: style.buttonSize,
        h: style.buttonSize,
        data: btn
      });
      
      // FIX: Use persistent hover state from animState
      const isHovered = (animState.hoveredButtonIndex === i);
      const targetHover = isHovered ? 1 : 0;
      animState.buttonHovers[i] = lerp(animState.buttonHovers[i] || 0, targetHover, 0.25);
      const hoverVal = animState.buttonHovers[i];
      
      // ENHANCEMENT: Color shift on hover
      if (hoverVal > 0.01) {
        // Background glow
        ctx.fillStyle = style.hoverColor;
        ctx.globalAlpha = animState.opacity * style.hoverOpacity * hoverVal; 
        roundRect(ctx, x, y, style.buttonSize, style.buttonSize, style.borderRadius / 2);
        ctx.fill();
        ctx.globalAlpha = animState.opacity;
        
        // ENHANCEMENT: Add subtle border on hover
        ctx.strokeStyle = style.hoverColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = animState.opacity * 0.6 * hoverVal;
        ctx.stroke();
        ctx.globalAlpha = animState.opacity;
      }
      
      // Draw Icon with hover lift and brightness
      const iconImg = loadedIcons[btn.id];
      if (iconImg && iconsReady) {
        const lift = hoverVal * -3; // More pronounced lift
        const ix = x + (style.buttonSize - style.iconSize) / 2;
        const iy = y + (style.buttonSize - style.iconSize) / 2 + lift;
        
        // ENHANCEMENT: Brighten icon on hover
        if (hoverVal > 0.01) {
          ctx.filter = `brightness(${1 + hoverVal * 0.4})`;
        }
        
        ctx.drawImage(iconImg, ix, iy, style.iconSize, style.iconSize);
        ctx.filter = 'none';
      }
      
      x += style.buttonSize + style.buttonSpacing;
    });
    
    ctx.restore();
  }
  
  function handleMouseMove(e) {
    if (!isVisible) return;
    
    const rect = canvas.getBoundingClientRect();
    // FIX: Use actual mouse coordinates relative to canvas
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    let cursor = 'default';
    let hoveredIndex = -1;
    
    buttons.forEach((btn, i) => {
      const isHover = mx >= btn.x && mx <= btn.x + btn.w && 
                      my >= btn.y && my <= btn.y + btn.h;
      
      if (isHover) {
        cursor = 'pointer';
        hoveredIndex = i;
      }
    });
    
    // FIX: Update persistent hover state
    animState.hoveredButtonIndex = hoveredIndex;
    canvas.style.cursor = cursor;
  }
  
  async function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    // FIX: Use actual coordinates
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const clickedBtn = buttons.find(b => 
      mx >= b.x && mx <= b.x + b.w && 
      my >= b.y && my <= b.y + b.h
    );
    
    if (clickedBtn) {
      const { type, url, action } = clickedBtn.data;
      
      if (type === 'link') {
        const finalUrl = url.replace('%s', encodeURIComponent(currentSelection));
        window.open(finalUrl, '_blank');
      } 
      else if (type === 'action') {
        if (action === 'copy') {
          try {
            await navigator.clipboard.writeText(currentSelection);
          } catch (err) {
            console.error('Copy failed:', err);
          }
        }
        else if (action === 'paste') {
          try {
            const text = await navigator.clipboard.readText();
            if (selectionRange) {
              selectionRange.deleteContents();
              selectionRange.insertNode(document.createTextNode(text));
            }
          } catch (err) {
            console.error('Paste failed:', err);
            alert('Please allow Clipboard permissions in extension settings.');
          }
        }
      }
      
      hideToast();
    }
  }
  
  function roundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.closePath();
    } else {
      // Fallback for older browsers
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }
  
  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();