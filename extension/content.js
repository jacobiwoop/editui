// == EditUI — Content Script ===========================================

// ─── State ────────────────────────────────────────────────────────────
const state = {
  active:         false,
  hoverEl:        null,
  selectedEl:     null,
  originalStyles: {},
  applied:        {},
  barRoot:        null,
  collapsed:      false,
  promptFormat:   'json',
}

// ─── Page-level picker styles ─────────────────────────────────────────
function injectPickerStyles() {
  if (document.getElementById('editui-picker-style')) return
  const s = document.createElement('style')
  s.id = 'editui-picker-style'
  s.textContent = `
    .editui-hover    { outline: 2px solid #6c5ce7 !important; outline-offset: 2px !important; cursor: crosshair !important; }
    .editui-selected { outline: 3px solid #a29bfe !important; outline-offset: 2px !important; }
  `
  document.head.appendChild(s)
}

// ─── Init ─────────────────────────────────────────────────────────────
function init() {
  injectPickerStyles()
  document.addEventListener('mouseover', onHover, true)
  document.addEventListener('mouseout',  onOut,   true)
  document.addEventListener('click',     onClick,  true)
  document.addEventListener('keydown',   onKey,    true)
}

// ─── Event handlers ───────────────────────────────────────────────────
function onHover(e) {
  if (!state.active) return
  const host = document.getElementById('editui-host')
  if (host && (host === e.target || host.contains(e.target))) return
  if (state.selectedEl === e.target) return
  clearHover()
  state.hoverEl = e.target
  e.target.classList.add('editui-hover')
}

function onOut() {
  if (!state.active) return
  clearHover()
}

function clearHover() {
  if (state.hoverEl) {
    state.hoverEl.classList.remove('editui-hover')
    state.hoverEl = null
  }
}

function onClick(e) {
  if (!state.active) return
  const host = document.getElementById('editui-host')
  if (host && (host === e.target || host.contains(e.target))) return
  e.preventDefault()
  e.stopPropagation()
  selectElement(e.target)
}

function onKey(e) {
  if (e.key === 'Escape' && state.selectedEl) deselectElement()
}

// ─── Select / Deselect ────────────────────────────────────────────────
function selectElement(el) {
  deselectElement()
  state.selectedEl = el
  state.originalStyles = captureStyles(el)
  state.applied = {}
  el.classList.add('editui-selected')
  clearHover()
  if (state.barRoot) {
    renderElementInfo()
    populatePopovers()
  }
}

function deselectElement() {
  if (!state.selectedEl) return
  state.selectedEl.classList.remove('editui-selected')
  state.selectedEl = null
  state.originalStyles = {}
  state.applied = {}
  if (state.barRoot) renderElementInfo()
}

function captureStyles(el) {
  const cs = getComputedStyle(el)
  return {
    backgroundColor:         cs.backgroundColor,
    borderWidth:             cs.borderWidth,
    borderStyle:             cs.borderStyle,
    borderColor:             cs.borderColor,
    borderTopLeftRadius:     cs.borderTopLeftRadius,
    borderTopRightRadius:    cs.borderTopRightRadius,
    borderBottomRightRadius: cs.borderBottomRightRadius,
    borderBottomLeftRadius:  cs.borderBottomLeftRadius,
    fontFamily:              cs.fontFamily,
    fontSize:                cs.fontSize,
    fontWeight:              cs.fontWeight,
    fontStyle:               cs.fontStyle,
    textDecoration:          cs.textDecoration,
    lineHeight:              cs.lineHeight,
    color:                   cs.color,
    marginTop:               cs.marginTop,
    marginRight:             cs.marginRight,
    marginBottom:            cs.marginBottom,
    marginLeft:              cs.marginLeft,
    paddingTop:              cs.paddingTop,
    paddingRight:            cs.paddingRight,
    paddingBottom:           cs.paddingBottom,
    paddingLeft:             cs.paddingLeft,
    width:                   cs.width,
    height:                  cs.height,
  }
}

// ─── Bar ──────────────────────────────────────────────────────────────
function showBar() {
  if (document.getElementById('editui-host')) return
  const host = document.createElement('div')
  host.id = 'editui-host'
  document.body.appendChild(host)
  const shadow = host.attachShadow({ mode: 'open' })

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = chrome.runtime.getURL('toolbar.css')
  shadow.appendChild(link)

  const wrap = document.createElement('div')
  wrap.innerHTML = getToolbarHTML()
  shadow.appendChild(wrap)

  state.barRoot = shadow
  setupToolbarJS(shadow)
  renderElementInfo()
}

function hideBar() {
  document.getElementById('editui-host')?.remove()
  state.barRoot = null
}

// ─── Toolbar HTML ─────────────────────────────────────────────────────
function getToolbarHTML() {
  return `
<div class="toolbar" id="editui-toolbar">

  <!-- LOGO — collapse / drag -->
  <button class="tbtn tbtn-logo" id="btn-logo" title="Ouvrir / Fermer">
    <svg viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
  </button>

  <div class="toolbar-collapsible">
    <!-- Element info -->
    <div class="editui-info" id="bar-info"></div>

    <div class="separator"></div>

    <!-- BACKGROUND -->
    <button class="tbtn" id="btn-bg" title="Background">
      <svg viewBox="0 0 24 24"><path d="M19 11h-1.7l-1.4 1.4h2.1v6h-6v-2.1l-1.4 1.4V19H5v-6h2.1L5.7 11.6H4v6.4c0 .6.4 1 1 1h6v3h2v-3h6c.6 0 1-.4 1-1V19h-1zM12 6.5L5.5 13l1.4 1.4L12 9.4l5.1 5L18.5 13 12 6.5z"/></svg>
    </button>
    <div id="popover-bg" class="popover">
      <div class="pop-title">Background</div>
      <div class="input-group">
        <div class="input-row">
          <span class="lbl">Couleur</span>
          <input type="text" id="bg-color" value="#6c5ce7">
          <div class="color-swatch-wrap">
            <div class="color-swatch" id="bg-swatch" style="background:#6c5ce7"></div>
            <input type="color" id="bg-picker" value="#6c5ce7">
          </div>
        </div>
        <div class="input-row">
          <span class="lbl">Opacity</span>
          <input type="range" id="bg-opacity" min="0" max="100" value="100">
        </div>
      </div>
    </div>

    <!-- BORDER -->
    <button class="tbtn" id="btn-border" title="Border">
      <svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v10H7V7zm2 2v6h6V9H9z"/></svg>
    </button>
    <div id="popover-border" class="popover">
      <div class="pop-title">Border</div>
      <div class="input-group">
        <div class="input-row"><span class="lbl">Épaisseur</span><input type="number" id="bd-width" value="2"></div>
        <div class="input-row"><span class="lbl">Style</span>
          <select id="bd-style"><option>solid</option><option>dashed</option><option>dotted</option><option>none</option></select>
        </div>
        <div class="input-row"><span class="lbl">Radius</span><input type="number" id="bd-radius" value="8"></div>
        <div class="input-row">
          <label class="advanced-toggle">
            <input type="checkbox" id="bd-adv-toggle"> Coins avancés
          </label>
        </div>
        <div id="radius-advanced" class="radius-advanced">
          <div class="input-row"><span class="lbl">Top L</span><input type="number" id="bd-r-tl" value="8"></div>
          <div class="input-row"><span class="lbl">Top R</span><input type="number" id="bd-r-tr" value="8"></div>
          <div class="input-row"><span class="lbl">Bot R</span><input type="number" id="bd-r-br" value="8"></div>
          <div class="input-row"><span class="lbl">Bot L</span><input type="number" id="bd-r-bl" value="8"></div>
        </div>
        <div class="input-row">
          <span class="lbl">Couleur</span>
          <input type="text" id="bd-color" value="#ffffff">
          <div class="color-swatch-wrap">
            <div class="color-swatch" id="bd-swatch" style="background:#ffffff"></div>
            <input type="color" id="bd-picker" value="#ffffff">
          </div>
        </div>
      </div>
    </div>

    <!-- TEXT -->
    <button class="tbtn" id="btn-text" title="Texte">
      <svg viewBox="0 0 24 24"><path d="M5 4v3h5.5v12h3V7H19V4z"/></svg>
    </button>
    <div id="popover-text" class="popover">
      <div class="pop-title">Texte</div>
      <div class="input-group">
        <select id="tx-font"><option>Inter</option><option>Roboto</option><option>Arial</option><option>Georgia</option><option>system-ui</option></select>
      </div>
      <div class="style-toggles">
        <button class="toggle-btn" id="tx-bold"   style="font-weight:bold">B</button>
        <button class="toggle-btn" id="tx-italic" style="font-style:italic">I</button>
        <button class="toggle-btn" id="tx-under"  style="text-decoration:underline">U</button>
        <button class="toggle-btn" id="tx-strike" style="text-decoration:line-through">S</button>
      </div>
      <div class="input-group">
        <div class="input-row">
          <span class="lbl">Taille</span><input type="number" id="tx-size" value="16">
          <span class="lbl" style="text-align:right">Line</span><input type="number" id="tx-line" value="24">
        </div>
        <div class="input-row">
          <span class="lbl">Couleur</span>
          <input type="text" id="tx-color" value="#ffffff">
          <div class="color-swatch-wrap">
            <div class="color-swatch" id="tx-swatch" style="background:#ffffff"></div>
            <input type="color" id="tx-picker" value="#ffffff">
          </div>
        </div>
      </div>
    </div>

    <!-- SPACING -->
    <button class="tbtn" id="btn-spacing" title="Espacement">
      <svg viewBox="0 0 24 24"><path d="M21 3H3v3h18V3zm0 15H3v3h18v-3zM3 13h18v-2H3v2z"/></svg>
    </button>
    <div id="popover-spacing" class="popover">
      <div class="pop-title">Box Model</div>
      <div class="box-model" id="box-model">
        <span class="box-label val-top"   data-prop="marginTop">0px</span>
        <span class="box-label val-bot"   data-prop="marginBottom">0px</span>
        <span class="box-label val-left"  data-prop="marginLeft">0px</span>
        <span class="box-label val-right" data-prop="marginRight">0px</span>
        <div class="box-padding">
          <span class="box-label val-top"   data-prop="paddingTop">0px</span>
          <span class="box-label val-bot"   data-prop="paddingBottom">0px</span>
          <span class="box-label val-left"  data-prop="paddingLeft">0px</span>
          <span class="box-label val-right" data-prop="paddingRight">0px</span>
          <div class="box-element">Élément</div>
        </div>
      </div>
    </div>

    <!-- SIZE -->
    <button class="tbtn" id="btn-size" title="Taille">
      <svg viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z"/></svg>
    </button>
    <div id="popover-size" class="popover">
      <div class="pop-title">Size</div>
      <div class="input-group">
        <div class="input-row"><span class="lbl">Width</span><input type="number" id="sz-width" value="120"></div>
        <div class="input-row"><span class="lbl">Height</span><input type="number" id="sz-height" value="40"></div>
      </div>
    </div>

    <!-- NOTE -->
    <button class="tbtn" id="btn-note" title="Note">
      <svg viewBox="0 0 24 24"><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9l-6-6V5zm2 0v12.17L9.83 21H19V5H5zm3 4h8v2H8V9zm0 4h5v2H8v-2z"/></svg>
    </button>
    <div id="popover-note" class="popover" style="width:300px">
      <div class="pop-title">Note</div>
      <textarea class="note-textarea" id="note-input" placeholder="Écrivez votre note ici…"></textarea>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-accent" id="btn-note-copy" style="flex:1">Copier</button>
        <button class="btn" id="btn-note-clear">Effacer</button>
      </div>
    </div>

    <div class="separator"></div>

    <!-- UNDO -->
    <button class="tbtn" id="btn-undo" title="Annuler les changements">
      <svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
    </button>

    <!-- CLEAR -->
    <button class="tbtn" id="btn-clear" title="Réinitialiser">
      <svg viewBox="0 0 24 24"><path d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0M4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53l-4.95-4.95l-4.95 4.95Z"/></svg>
    </button>

    <div class="separator"></div>

    <!-- PROMPT -->
    <button class="tbtn tbtn-prompt" id="btn-prompt">
      <svg viewBox="0 0 24 24"><path d="M9 2h6c1.1 0 2 .9 2 2v1h3c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H2c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2h3V4c0-1.1.9-2 2-2m6 4V4H9v2h6Z"/></svg>
      Prompt
    </button>
    <div id="popover-prompt" class="popover">
      <div class="toggle-switch">
        <button id="fmt-json" class="active">JSON</button>
        <button id="fmt-md">Markdown</button>
      </div>
      <div class="code-block" id="prompt-content"></div>
      <button class="btn btn-accent btn-full" id="btn-copy-prompt">Copier le Prompt</button>
    </div>

  </div><!-- /toolbar-collapsible -->
</div>`
}

// ─── Setup all toolbar JS ─────────────────────────────────────────────
function setupToolbarJS(shadow) {
  const toolbar = shadow.getElementById('editui-toolbar')

  // ── Collapse + drag ──
  setupLogoCollapseDrag(shadow, toolbar)

  // ── Close popovers on outside click ──
  document.addEventListener('click', (e) => {
    if (!e.composedPath().includes(document.getElementById('editui-host'))) {
      closeAllPopovers(shadow)
    }
  })

  // ── Popover toggles ──
  const pairs = [
    ['btn-bg',      'popover-bg'],
    ['btn-border',  'popover-border'],
    ['btn-text',    'popover-text'],
    ['btn-spacing', 'popover-spacing'],
    ['btn-size',    'popover-size'],
    ['btn-note',    'popover-note'],
    ['btn-prompt',  'popover-prompt'],
  ]
  pairs.forEach(([btnId, popId]) => {
    shadow.getElementById(btnId)?.addEventListener('click', (e) => {
      e.stopPropagation()
      togglePopover(shadow, popId, shadow.getElementById(btnId))
    })
  })

  // ── Undo / Clear ──
  shadow.getElementById('btn-undo')?.addEventListener('click', () => {
    undoChanges()
    closeAllPopovers(shadow)
  })
  shadow.getElementById('btn-clear')?.addEventListener('click', () => {
    clearAllChanges()
    closeAllPopovers(shadow)
  })

  // ── Background popover ──
  const bgColor   = shadow.getElementById('bg-color')
  const bgSwatch  = shadow.getElementById('bg-swatch')
  const bgPicker  = shadow.getElementById('bg-picker')
  const bgOpacity = shadow.getElementById('bg-opacity')

  bgColor.addEventListener('input', () => {
    syncSwatch(bgSwatch, bgColor.value)
    bgPicker.value = bgColor.value
    applyBg(shadow)
  })
  bgPicker.addEventListener('input', () => {
    bgColor.value = bgPicker.value
    syncSwatch(bgSwatch, bgPicker.value)
    applyBg(shadow)
  })
  bgOpacity.addEventListener('input', () => applyBg(shadow))

  // ── Border popover ──
  const bdWidth  = shadow.getElementById('bd-width')
  const bdStyle  = shadow.getElementById('bd-style')
  const bdRadius = shadow.getElementById('bd-radius')
  const bdColor  = shadow.getElementById('bd-color')
  const bdSwatch = shadow.getElementById('bd-swatch')
  const bdPicker = shadow.getElementById('bd-picker')
  const bdAdvCb  = shadow.getElementById('bd-adv-toggle')
  const bdAdv    = shadow.getElementById('radius-advanced')

  ;[bdWidth, bdStyle, bdRadius].forEach(el => el.addEventListener('input', () => applyBorder(shadow)))
  bdColor.addEventListener('input', () => {
    syncSwatch(bdSwatch, bdColor.value)
    bdPicker.value = bdColor.value
    applyBorder(shadow)
  })
  bdPicker.addEventListener('input', () => {
    bdColor.value = bdPicker.value
    syncSwatch(bdSwatch, bdPicker.value)
    applyBorder(shadow)
  })
  bdAdvCb.addEventListener('change', () => {
    bdAdv.classList.toggle('visible', bdAdvCb.checked)
    bdRadius.disabled = bdAdvCb.checked
    applyBorder(shadow)
  })
  shadow.querySelectorAll('#radius-advanced input[type="number"]').forEach(el => el.addEventListener('input', () => applyBorder(shadow)))

  // ── Text popover ──
  const txFont   = shadow.getElementById('tx-font')
  const txSize   = shadow.getElementById('tx-size')
  const txLine   = shadow.getElementById('tx-line')
  const txColor  = shadow.getElementById('tx-color')
  const txSwatch = shadow.getElementById('tx-swatch')
  const txPicker = shadow.getElementById('tx-picker')

  txFont.addEventListener('change', () => applyText(shadow))
  ;[txSize, txLine].forEach(el => el.addEventListener('input', () => applyText(shadow)))
  txColor.addEventListener('input', () => {
    syncSwatch(txSwatch, txColor.value)
    txPicker.value = txColor.value
    applyText(shadow)
  })
  txPicker.addEventListener('input', () => {
    txColor.value = txPicker.value
    syncSwatch(txSwatch, txPicker.value)
    applyText(shadow)
  })
  ;['tx-bold', 'tx-italic', 'tx-under', 'tx-strike'].forEach(id => {
    shadow.getElementById(id)?.addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('selected')
      applyText(shadow)
    })
  })

  // ── Spacing popover (box model delegation) ──
  shadow.getElementById('box-model')?.addEventListener('click', (e) => {
    const label = e.target.closest('.box-label')
    if (label) editSpacing(label, shadow)
  })

  // ── Size popover ──
  ;['sz-width', 'sz-height'].forEach(id => {
    shadow.getElementById(id)?.addEventListener('input', () => applySize(shadow))
  })

  // ── Note popover ──
  shadow.getElementById('btn-note-copy')?.addEventListener('click', () => {
    const text = shadow.getElementById('note-input')?.value?.trim()
    if (!text) return
    navigator.clipboard?.writeText(text).catch(() => {})
    flashBtn(shadow.getElementById('btn-note-copy'), 'Copié ✓', 'Copier')
  })
  shadow.getElementById('btn-note-clear')?.addEventListener('click', () => {
    const ta = shadow.getElementById('note-input')
    if (ta) ta.value = ''
  })

  // ── Prompt format toggle ──
  shadow.getElementById('fmt-json')?.addEventListener('click', (e) => {
    state.promptFormat = 'json'
    shadow.getElementById('fmt-json').classList.add('active')
    shadow.getElementById('fmt-md').classList.remove('active')
    renderPrompt(shadow)
  })
  shadow.getElementById('fmt-md')?.addEventListener('click', () => {
    state.promptFormat = 'md'
    shadow.getElementById('fmt-md').classList.add('active')
    shadow.getElementById('fmt-json').classList.remove('active')
    renderPrompt(shadow)
  })

  // ── Copy prompt ──
  shadow.getElementById('btn-copy-prompt')?.addEventListener('click', () => {
    const text = shadow.getElementById('prompt-content')?.textContent
    if (!text) return
    navigator.clipboard.writeText(text).catch(() => {})
    flashBtn(shadow.getElementById('btn-copy-prompt'), 'Copié ✓', 'Copier le Prompt')
  })
}

// ─── Logo collapse + drag ─────────────────────────────────────────────
function setupLogoCollapseDrag(shadow, toolbar) {
  const logo = shadow.getElementById('btn-logo')

  function lockPosition() {
    const r = toolbar.getBoundingClientRect()
    toolbar.style.left      = r.left + 'px'
    toolbar.style.top       = r.top  + 'px'
    toolbar.style.bottom    = 'auto'
    toolbar.style.transform = 'none'
  }
  function restoreCenter() {
    toolbar.style.left      = '50%'
    toolbar.style.top       = 'auto'
    toolbar.style.bottom    = '24px'
    toolbar.style.transform = 'translateX(-50%)'
  }

  logo.addEventListener('click', () => {
    const willCollapse = !toolbar.classList.contains('collapsed')
    closeAllPopovers(shadow)
    if (willCollapse) {
      lockPosition()
      toolbar.classList.add('collapsed')
    } else {
      toolbar.classList.remove('collapsed')
      restoreCenter()
    }
  })

  let dragging = false, sx, sy, ox, oy
  toolbar.addEventListener('mousedown', (e) => {
    if (!toolbar.classList.contains('collapsed')) return
    if (logo.contains(e.target)) return
    dragging = true
    sx = e.clientX; sy = e.clientY
    const r = toolbar.getBoundingClientRect()
    ox = r.left;   oy = r.top
    e.preventDefault()
  })
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return
    toolbar.style.left = (ox + e.clientX - sx) + 'px'
    toolbar.style.top  = (oy + e.clientY - sy) + 'px'
  })
  document.addEventListener('mouseup', () => { dragging = false })
}

// ─── Popovers ─────────────────────────────────────────────────────────
function togglePopover(shadow, popId, btn) {
  const pop = shadow.getElementById(popId)
  const wasVisible = pop.classList.contains('visible')
  closeAllPopovers(shadow)
  if (!wasVisible) {
    pop.classList.add('visible')
    btn?.classList.add('active')
    if (popId === 'popover-prompt') renderPrompt(shadow)
    positionPopover(shadow, pop, btn)
  }
}

function closeAllPopovers(shadow) {
  shadow.querySelectorAll('.popover.visible').forEach(p => p.classList.remove('visible'))
  shadow.querySelectorAll('.tbtn.active').forEach(b => b.classList.remove('active'))
}

function positionPopover(shadow, popover, btn) {
  if (!btn) return
  const toolbar = shadow.getElementById('editui-toolbar')
  const toolbarRect = toolbar.getBoundingClientRect()
  const btnRect     = btn.getBoundingClientRect()

  const btnCenter  = btnRect.left - toolbarRect.left + btnRect.width / 2
  const popWidth   = popover.offsetWidth
  const toolWidth  = toolbarRect.width

  let popLeft = btnCenter - popWidth / 2
  popLeft = Math.max(0, Math.min(popLeft, toolWidth - popWidth))
  popover.style.left = popLeft + 'px'

  const arrowLeft = btnCenter - popLeft - 7
  popover.style.setProperty('--arrow-left', arrowLeft + 'px')
}

// ─── Apply functions ──────────────────────────────────────────────────
function applyBg(shadow) {
  const el = state.selectedEl
  if (!el) return
  const color   = shadow.getElementById('bg-color')?.value || '#000'
  const opacity = Number(shadow.getElementById('bg-opacity')?.value ?? 100)
  const rgba    = hexToRgba(color, opacity / 100)
  el.style.backgroundColor = rgba
  state.applied.backgroundColor = rgba
}

function applyBorder(shadow) {
  const el = state.selectedEl
  if (!el) return
  const width  = shadow.getElementById('bd-width')?.value  || '1'
  const style  = shadow.getElementById('bd-style')?.value  || 'solid'
  const color  = shadow.getElementById('bd-color')?.value  || '#000'
  const advCb  = shadow.getElementById('bd-adv-toggle')
  const adv    = shadow.getElementById('radius-advanced')?.classList.contains('visible')

  el.style.borderWidth = width + 'px'
  el.style.borderStyle = style
  el.style.borderColor = color
  state.applied.borderWidth = width + 'px'
  state.applied.borderStyle = style
  state.applied.borderColor = color

  if (adv) {
    const tl = shadow.getElementById('bd-r-tl')?.value || '0'
    const tr = shadow.getElementById('bd-r-tr')?.value || '0'
    const br = shadow.getElementById('bd-r-br')?.value || '0'
    const bl = shadow.getElementById('bd-r-bl')?.value || '0'
    const r  = `${tl}px ${tr}px ${br}px ${bl}px`
    el.style.borderRadius = r
    state.applied.borderRadius = r
  } else {
    const r = (shadow.getElementById('bd-radius')?.value || '0') + 'px'
    el.style.borderRadius = r
    state.applied.borderRadius = r
  }
}

function applyText(shadow) {
  const el = state.selectedEl
  if (!el) return
  const font   = shadow.getElementById('tx-font')?.value
  const size   = shadow.getElementById('tx-size')?.value
  const line   = shadow.getElementById('tx-line')?.value
  const color  = shadow.getElementById('tx-color')?.value
  const bold   = shadow.getElementById('tx-bold')?.classList.contains('selected')
  const italic = shadow.getElementById('tx-italic')?.classList.contains('selected')
  const under  = shadow.getElementById('tx-under')?.classList.contains('selected')
  const strike = shadow.getElementById('tx-strike')?.classList.contains('selected')

  if (font)  { el.style.fontFamily = font + ', sans-serif'; state.applied.fontFamily = font }
  if (size)  { el.style.fontSize   = size + 'px';           state.applied.fontSize   = size + 'px' }
  if (line)  { el.style.lineHeight = line + 'px';           state.applied.lineHeight = line + 'px' }
  if (color) { el.style.color      = color;                 state.applied.color      = color }

  const fw = bold   ? 'bold' : 'normal';  el.style.fontWeight     = fw; state.applied.fontWeight = fw
  const fs = italic ? 'italic' : 'normal'; el.style.fontStyle     = fs; state.applied.fontStyle = fs
  const decs = []
  if (under)  decs.push('underline')
  if (strike) decs.push('line-through')
  const td = decs.join(' ') || 'none'
  el.style.textDecoration = td; state.applied.textDecoration = td
}

function applySize(shadow) {
  const el = state.selectedEl
  if (!el) return
  const w = shadow.getElementById('sz-width')?.value
  const h = shadow.getElementById('sz-height')?.value
  if (w) { el.style.width  = w + 'px'; state.applied.width  = w + 'px' }
  if (h) { el.style.height = h + 'px'; state.applied.height = h + 'px' }
}

// ─── Spacing (box model) inline edit ─────────────────────────────────
function editSpacing(span, shadow) {
  if (span.querySelector('input')) return
  const current = span.textContent.trim()
  const prop    = span.dataset.prop

  const input = document.createElement('input')
  input.type  = 'text'
  input.value = current
  span.textContent = ''
  span.appendChild(input)
  input.focus()
  input.select()

  function commit() {
    const val = input.value.trim() || current
    span.textContent = val
    if (state.selectedEl) {
      state.selectedEl.style[prop] = val
      state.applied[prop] = val
    }
  }
  input.addEventListener('blur', commit)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  input.blur()
    if (e.key === 'Escape') span.textContent = current
    e.stopPropagation()
  })
  input.addEventListener('click', e => e.stopPropagation())
}

// ─── Undo / Clear ─────────────────────────────────────────────────────
function undoChanges() {
  if (!state.selectedEl) return
  Object.keys(state.applied).forEach(prop => {
    state.selectedEl.style[prop] = ''
  })
  state.applied = {}
  if (state.barRoot) populatePopovers()
}

function clearAllChanges() {
  if (!state.selectedEl) return
  state.selectedEl.style.cssText = ''
  state.applied = {}
  if (state.barRoot) populatePopovers()
}

// ─── Populate popover inputs with current values ──────────────────────
function populatePopovers() {
  const shadow = state.barRoot
  if (!shadow || !state.selectedEl) return
  const s = state.originalStyles

  // Background
  const bgHex = rgbToHex(s.backgroundColor)
  setValue(shadow, 'bg-color', bgHex)
  setValue(shadow, 'bg-picker', bgHex)
  syncSwatch(shadow.getElementById('bg-swatch'), bgHex)
  setValue(shadow, 'bg-opacity', String(Math.round(rgbAlpha(s.backgroundColor) * 100)))

  // Border
  setValue(shadow, 'bd-width', parseFloat(s.borderWidth) || 0)
  setValue(shadow, 'bd-style', s.borderStyle || 'solid')
  const bdHex = rgbToHex(s.borderColor)
  setValue(shadow, 'bd-color', bdHex)
  setValue(shadow, 'bd-picker', bdHex)
  syncSwatch(shadow.getElementById('bd-swatch'), bdHex)
  const radPx = parseFloat(s.borderTopLeftRadius) || 0
  setValue(shadow, 'bd-radius', radPx)
  setValue(shadow, 'bd-r-tl', parseFloat(s.borderTopLeftRadius) || 0)
  setValue(shadow, 'bd-r-tr', parseFloat(s.borderTopRightRadius) || 0)
  setValue(shadow, 'bd-r-br', parseFloat(s.borderBottomRightRadius) || 0)
  setValue(shadow, 'bd-r-bl', parseFloat(s.borderBottomLeftRadius) || 0)

  // Text
  const txHex = rgbToHex(s.color)
  setValue(shadow, 'tx-color', txHex)
  setValue(shadow, 'tx-picker', txHex)
  syncSwatch(shadow.getElementById('tx-swatch'), txHex)
  setValue(shadow, 'tx-size', parseFloat(s.fontSize) || 16)
  setValue(shadow, 'tx-line', parseFloat(s.lineHeight) || 24)
  // Font family: first family only
  const firstFont = (s.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim()
  const fontSel = shadow.getElementById('tx-font')
  if (fontSel) fontSel.value = firstFont
  // B/I/U/S state
  setToggle(shadow, 'tx-bold',   s.fontWeight === 'bold' || parseInt(s.fontWeight) >= 700)
  setToggle(shadow, 'tx-italic', s.fontStyle === 'italic')
  setToggle(shadow, 'tx-under',  s.textDecoration?.includes('underline'))
  setToggle(shadow, 'tx-strike', s.textDecoration?.includes('line-through'))

  // Spacing (box model labels)
  updateBoxLabel(shadow, 'marginTop',    s.marginTop)
  updateBoxLabel(shadow, 'marginBottom', s.marginBottom)
  updateBoxLabel(shadow, 'marginLeft',   s.marginLeft)
  updateBoxLabel(shadow, 'marginRight',  s.marginRight)
  updateBoxLabel(shadow, 'paddingTop',    s.paddingTop)
  updateBoxLabel(shadow, 'paddingBottom', s.paddingBottom)
  updateBoxLabel(shadow, 'paddingLeft',   s.paddingLeft)
  updateBoxLabel(shadow, 'paddingRight',  s.paddingRight)

  // Size
  setValue(shadow, 'sz-width',  parseFloat(s.width)  || '')
  setValue(shadow, 'sz-height', parseFloat(s.height) || '')
}

function updateBoxLabel(shadow, prop, value) {
  const span = shadow.querySelector(`.box-label[data-prop="${prop}"]`)
  if (span && !span.querySelector('input')) span.textContent = value || '0px'
}

function setValue(shadow, id, value) {
  const el = shadow.getElementById(id)
  if (el) el.value = String(value)
}

function setToggle(shadow, id, on) {
  const btn = shadow.getElementById(id)
  if (btn) btn.classList.toggle('selected', !!on)
}

// ─── Element info ─────────────────────────────────────────────────────
function renderElementInfo() {
  const shadow = state.barRoot
  if (!shadow) return
  const info = shadow.getElementById('bar-info')
  if (!info) return

  const el = state.selectedEl
  if (!el) {
    info.innerHTML = `<span class="hint">Sélectionnez un élément</span>`
    return
  }

  const file = el.getAttribute('data-editui-file')
  const line = el.getAttribute('data-editui-line')
  const comp = el.getAttribute('data-editui-component')
  const tag  = el.tagName.toLowerCase()
  const cls  = Array.from(el.classList).filter(c => !c.startsWith('editui-')).slice(0, 2).join('.')

  if (file) {
    info.innerHTML = `<span class="file">${esc(file)}</span><span class="line">:${line || '?'}</span><span class="comp"> [${esc(comp || '?')}]</span>`
  } else {
    info.innerHTML = `<span class="tag">&lt;${tag}${cls ? '.' + cls : ''}&gt;</span>`
  }
}

// ─── Prompt ───────────────────────────────────────────────────────────
function renderPrompt(shadow) {
  const block = shadow.getElementById('prompt-content')
  if (block) block.textContent = buildPrompt()
}

function buildPrompt() {
  const el = state.selectedEl
  if (!el) return '(aucun élément sélectionné)'

  const tag       = el.tagName.toLowerCase()
  const classes   = Array.from(el.classList).filter(c => !c.startsWith('editui-')).join(' ')
  const selector  = buildSelector(el)
  const file      = el.getAttribute('data-editui-file')
  const line      = el.getAttribute('data-editui-line')
  const component = el.getAttribute('data-editui-component')
  const text      = (el.textContent || '').trim().slice(0, 80)
  const framework = detectFramework()
  const url       = location.href
  const note      = state.barRoot?.getElementById('note-input')?.value?.trim()

  const changes = Object.entries(state.applied).map(([prop, to]) => {
    const from = state.originalStyles[prop] || ''
    return { prop, from, to }
  })

  if (state.promptFormat === 'json') {
    return JSON.stringify({
      page:      url,
      framework,
      ...(file ? { component: component || '?', file, line: line || '?' } : {}),
      element: { tag, classes: classes || '(none)', selector, text: text || undefined },
      changes:   changes.length ? changes : '(aucun changement)',
      note:      note || undefined,
    }, null, 2)
  }

  let p = `# EditUI — Modifications UI\n\n`
  p += `**Page :** ${url}  \n**Framework :** ${framework}\n\n`
  if (file) p += `**Composant :** ${component || '?'}  \n**Fichier :** ${file} (ligne ${line || '?'})\n\n`
  p += `**Élément :** \`<${tag}>\`  \n**Classes :** ${classes || '(none)'}  \n**Selector :** \`${selector}\`\n`
  if (text) p += `**Texte :** "${text}"\n`
  p += `\n## Changements demandés\n`
  if (!changes.length) {
    p += `_(aucun changement)_\n`
  } else {
    changes.forEach(c => { p += `- **${c.prop}** : \`${c.from}\` → \`${c.to}\`\n` })
  }
  if (note) p += `\n## Note\n${note}\n`
  return p
}

// ─── Utils ────────────────────────────────────────────────────────────
function syncSwatch(el, color) {
  if (el) el.style.background = color
}

function hexToRgba(hex, alpha = 1) {
  if (!hex || hex[0] !== '#') return hex
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.substring(0, 2), 16) || 0
  const g = parseInt(full.substring(2, 4), 16) || 0
  const b = parseInt(full.substring(4, 6), 16) || 0
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function rgbToHex(rgb) {
  if (!rgb || rgb === 'transparent') return '#000000'
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return '#000000'
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('')
}

function rgbAlpha(rgb) {
  if (!rgb) return 1
  const m = rgb.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)
  return m ? parseFloat(m[1]) : 1
}

function buildSelector(el) {
  const parts = []
  let cur = el
  while (cur && cur !== document.body) {
    const tag = cur.tagName.toLowerCase()
    const id  = cur.id ? `#${cur.id}` : ''
    const cls = Array.from(cur.classList).filter(c => !c.startsWith('editui-')).slice(0, 2).map(c => `.${c}`).join('')
    parts.unshift(`${tag}${id}${cls}`)
    cur = cur.parentElement
  }
  return parts.join(' > ') || el.tagName.toLowerCase()
}

function detectFramework() {
  const root = document.getElementById('root') || document.body
  if (Object.keys(root).some(k => k.startsWith('__reactFiber') || k.startsWith('_reactRootContainer'))) return 'React'
  if (document.body.__vue_app__ || document.querySelector('[data-v-app]')) return 'Vue'
  return 'Unknown'
}

function flashBtn(btn, msg, original) {
  if (!btn) return
  btn.textContent = msg
  setTimeout(() => { btn.textContent = original }, 1500)
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── Messages from popup ──────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'EDITUI_TOGGLE') {
    state.active = !state.active
    if (state.active) {
      showBar()
    } else {
      deselectElement()
      hideBar()
      document.querySelectorAll('.editui-hover, .editui-selected')
        .forEach(el => el.classList.remove('editui-hover', 'editui-selected'))
    }
    sendResponse({ active: state.active })
  }
  if (msg.type === 'EDITUI_STATUS') {
    sendResponse({ active: state.active })
  }
})

// ─── Start ────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
