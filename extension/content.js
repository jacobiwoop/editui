// == EditUI — Content Script ===========================================

const state = {
  active: false,
  hoverEl: null,
  selectedEl: null,
  originalStyles: {},
  changes: [],
  barRoot: null,
  panelRoot: null,
  collapsed: false,
  barTop: null, // px from top, null = use bottom:0
}

// ---- Init ----
function init() {
  injectPickerStyles()
  document.addEventListener('mouseover', onHover, true)
  document.addEventListener('mouseout', onOut, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKey, true)
}

// ---- Picker styles (page-level, not shadow) ----
function injectPickerStyles() {
  if (document.getElementById('editui-picker-style')) return
  const style = document.createElement('style')
  style.id = 'editui-picker-style'
  style.textContent = `
    .editui-hover { outline: 2px solid #667eea !important; outline-offset: 2px !important; }
    .editui-selected { outline: 3px solid #4ade80 !important; outline-offset: 2px !important; }
  `
  document.head.appendChild(style)
}

// ---- Event handlers ----
function onHover(e) {
  if (!state.active) return
  const host = document.getElementById('editui-bar-host')
  if (host && (host === e.target || host.contains(e.target))) return
  if (state.selectedEl === e.target) return
  clearHover()
  state.hoverEl = e.target
  e.target.classList.add('editui-hover')
}

function onOut(e) {
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
  // Ignore clicks inside bar or panel
  const barHost = document.getElementById('editui-bar-host')
  if (barHost && (barHost === e.target || barHost.contains(e.target))) return
  const panelHost = document.getElementById('editui-panel-host')
  if (panelHost && (panelHost === e.target || panelHost.contains(e.target))) return

  e.preventDefault()
  e.stopPropagation()
  selectElement(e.target)
}

function onKey(e) {
  if (e.key === 'Escape') {
    if (state.panelRoot) { closePanel(); return }
    if (state.selectedEl) { deselectElement() }
  }
}

// ---- Select / deselect ----
function selectElement(el) {
  deselectElement()
  state.selectedEl = el
  state.originalStyles = captureStyles(el)
  state.changes = []
  el.classList.add('editui-selected')
  clearHover()
  if (state.barRoot) updateBarInfo()
}

function deselectElement() {
  if (state.selectedEl) {
    state.selectedEl.classList.remove('editui-selected')
    state.selectedEl = null
  }
  state.originalStyles = {}
  state.changes = []
  if (state.barRoot) updateBarInfo()
}

function captureStyles(el) {
  const cs = getComputedStyle(el)
  return {
    fontSize:        cs.fontSize,
    fontWeight:      cs.fontWeight,
    color:           cs.color,
    backgroundColor: cs.backgroundColor,
    padding:         cs.padding,
    borderRadius:    cs.borderRadius,
    textAlign:       cs.textAlign,
  }
}

// ---- Bar ----
function showBar() {
  if (document.getElementById('editui-bar-host')) return

  const host = document.createElement('div')
  host.id = 'editui-bar-host'
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = chrome.runtime.getURL('toolbar.css')
  shadow.appendChild(link)

  const wrapper = document.createElement('div')
  wrapper.innerHTML = getBarTemplate()
  shadow.appendChild(wrapper)

  state.barRoot = shadow
  positionBar(shadow)
  updateBarInfo()
  fillControls(shadow)
  setupBarListeners(shadow)
  setupCircleDrag(shadow)
}

function hideBar() {
  const host = document.getElementById('editui-bar-host')
  if (host) host.remove()
  state.barRoot = null
}

function getBarTemplate() {
  return `
  <div class="editui-bar" id="editui-bar">
    <div class="editui-circle" id="editui-circle" title="EditUI — drag pour déplacer">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 5h18M3 12h18M3 19h18" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </div>

    <div class="editui-bar-content" id="editui-bar-content">
      <div class="editui-bar-info" id="bar-info">
        <span class="hint">Cliquez un élément pour le sélectionner</span>
      </div>

      <div class="editui-sep"></div>

      <div class="editui-controls" id="bar-controls">
        <label>Fs<input type="text" id="ctl-font-size" placeholder="16px" /></label>
        <label>Fw
          <select id="ctl-font-weight">
            <option value="">—</option>
            <option value="400">400</option>
            <option value="500">500</option>
            <option value="600">600</option>
            <option value="700">700</option>
          </select>
        </label>
        <label>Clr<input type="text" id="ctl-color" placeholder="#333" /></label>
        <label>Bg<input type="text" id="ctl-bg" placeholder="—" /></label>
        <label>Pad<input type="text" id="ctl-padding" placeholder="12px" /></label>
        <label>R<input type="text" id="ctl-radius" placeholder="0px" /></label>
        <label>Align
          <select id="ctl-align">
            <option value="">—</option>
            <option value="left">L</option>
            <option value="center">C</option>
            <option value="right">R</option>
          </select>
        </label>
      </div>

      <div class="editui-sep"></div>

      <textarea id="tb-free-input" placeholder="Instructions libres…" rows="1"></textarea>

      <button class="editui-copy-btn" id="tb-copy-prompt">📋 Copier</button>
    </div>
  </div>`
}

function positionBar(shadow) {
  const bar = shadow.getElementById('editui-bar')
  if (!bar) return
  if (state.barTop !== null) {
    bar.style.top = state.barTop + 'px'
    bar.style.bottom = 'auto'
  } else {
    bar.style.bottom = '0'
    bar.style.top = 'auto'
  }
}

function updateBarInfo() {
  if (!state.barRoot) return
  const info = state.barRoot.getElementById('bar-info')
  if (!info) return

  const el = state.selectedEl
  if (!el) {
    info.innerHTML = `<span class="hint">Cliquez un élément pour le sélectionner</span>`
    return
  }

  const file = el.getAttribute('data-editui-file')
  const line = el.getAttribute('data-editui-line')
  const comp = el.getAttribute('data-editui-component')
  const tag  = el.tagName.toLowerCase()
  const cls  = Array.from(el.classList).filter(c => !c.startsWith('editui-')).slice(0, 3).join('.')

  if (file) {
    info.innerHTML = `
      <span class="file">${esc(file)}</span><span class="line">:${line || '?'}</span>
      <span class="comp">[${esc(comp || '?')}]</span>
    `
  } else {
    info.innerHTML = `<span class="tag">&lt;${tag}${cls ? '.' + cls : ''}&gt;</span>`
  }

  fillControls(state.barRoot)
}

function fillControls(shadow) {
  if (!state.selectedEl) return
  const s = state.originalStyles
  setVal(shadow, 'ctl-font-size',   s.fontSize)
  setVal(shadow, 'ctl-font-weight', s.fontWeight)
  setVal(shadow, 'ctl-color',       s.color)
  setVal(shadow, 'ctl-bg',          s.backgroundColor)
  setVal(shadow, 'ctl-padding',     s.padding)
  setVal(shadow, 'ctl-radius',      s.borderRadius)
  const align = shadow.getElementById('ctl-align')
  if (align && s.textAlign) align.value = s.textAlign
}

function setVal(shadow, id, value) {
  const el = shadow.getElementById(id)
  if (el) el.value = value || ''
}

function setupBarListeners(shadow) {
  // Toggle collapse
  shadow.getElementById('editui-circle')?.addEventListener('click', () => {
    state.collapsed = !state.collapsed
    const content = shadow.getElementById('editui-bar-content')
    if (content) content.style.display = state.collapsed ? 'none' : ''
  })

  // Controls → live apply
  const apply = () => applyChanges(shadow)
  shadow.querySelectorAll('#bar-controls input, #bar-controls select').forEach(el => {
    el.addEventListener('input', apply)
    el.addEventListener('change', apply)
  })
  shadow.getElementById('tb-free-input')?.addEventListener('input', apply)

  // Copy
  shadow.getElementById('tb-copy-prompt')?.addEventListener('click', () => {
    if (!state.selectedEl) return
    const prompt = buildPrompt()
    navigator.clipboard.writeText(prompt).then(() => {
      const btn = shadow.getElementById('tb-copy-prompt')
      btn.textContent = '✓ Copié !'
      btn.classList.add('copied')
      setTimeout(() => {
        btn.textContent = '📋 Copier'
        btn.classList.remove('copied')
      }, 2000)
    }).catch(() => showPromptPanel(buildPrompt()))
  })
}

// ---- Circle drag → moves bar vertically ----
function setupCircleDrag(shadow) {
  const circle = shadow.getElementById('editui-circle')
  const bar    = shadow.getElementById('editui-bar')
  if (!circle || !bar) return

  let dragging = false
  let startY, startBarTop

  circle.addEventListener('mousedown', (e) => {
    // Only drag, don't toggle, on actual move
    dragging = false
    startY = e.clientY
    startBarTop = bar.getBoundingClientRect().top
    e.preventDefault()

    const onMove = (e) => {
      const dy = e.clientY - startY
      if (!dragging && Math.abs(dy) > 4) dragging = true
      if (!dragging) return
      let newTop = startBarTop + dy
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - bar.offsetHeight))
      bar.style.top = newTop + 'px'
      bar.style.bottom = 'auto'
      state.barTop = newTop
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      // If barely moved → treat as click (toggle)
      if (!dragging) {
        state.collapsed = !state.collapsed
        const content = shadow.getElementById('editui-bar-content')
        if (content) content.style.display = state.collapsed ? 'none' : ''
      }
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })

  // Prevent the click listener above from double-firing
  circle.addEventListener('click', (e) => e.stopPropagation())
}

// ---- Apply CSS changes ----
function applyChanges(shadow) {
  if (!state.selectedEl) return
  state.changes = []

  const fields = [
    { id: 'ctl-font-size',   prop: 'font-size',        css: 'fontSize' },
    { id: 'ctl-font-weight', prop: 'font-weight',       css: 'fontWeight' },
    { id: 'ctl-color',       prop: 'color',             css: 'color' },
    { id: 'ctl-bg',          prop: 'background-color',  css: 'backgroundColor' },
    { id: 'ctl-padding',     prop: 'padding',           css: 'padding' },
    { id: 'ctl-radius',      prop: 'border-radius',     css: 'borderRadius' },
  ]

  for (const f of fields) {
    const input = shadow.getElementById(f.id)
    if (!input) continue
    const value = input.value.trim()
    const original = state.originalStyles[f.css] || ''
    if (value && value !== original) {
      state.selectedEl.style[f.css] = value
      state.changes.push({ prop: f.prop, from: original, to: value })
    }
  }

  const align = shadow.getElementById('ctl-align')?.value
  if (align) {
    const original = state.originalStyles.textAlign || ''
    if (align !== original) {
      state.selectedEl.style.textAlign = align
      state.changes.push({ prop: 'text-align', from: original, to: align })
    }
  }
}

// ---- Build prompt ----
function buildPrompt() {
  const el = state.selectedEl
  if (!el) return ''

  const url       = location.href
  const framework = detectFramework()
  const tag       = el.tagName.toLowerCase()
  const classes   = Array.from(el.classList).filter(c => !c.startsWith('editui-')).join(' ')
  const text      = (el.textContent || '').trim().slice(0, 100)
  const selector  = buildSelector(el)
  const file      = el.getAttribute('data-editui-file')
  const line      = el.getAttribute('data-editui-line')
  const component = el.getAttribute('data-editui-component')
  const freeInput = state.barRoot?.getElementById('tb-free-input')?.value?.trim()

  let p = `[EditUI Context]\n\n`
  p += `Page: ${url}\n`
  p += `Framework: ${framework}\n\n`

  if (file) {
    p += `Component: ${component || '?'}\n`
    p += `File: ${file}\n`
    p += `Line: ${line || '?'}\n\n`
  }

  p += `Element: <${tag}>\n`
  p += `Classes: ${classes || '(none)'}\n`
  p += `Selector: ${selector}\n`
  if (text) p += `Text: "${text}"\n`

  p += `\nRequested changes:\n`
  if (!state.changes.length && !freeInput) {
    p += `  (aucun changement — inspection visuelle)\n`
  }
  for (const c of state.changes) p += `- ${c.prop}: ${c.from} → ${c.to}\n`
  if (freeInput) p += `- Free instruction: "${freeInput}"\n`

  return p
}

// ---- Prompt panel ----
function showPromptPanel(prompt) {
  closePanel()
  const host = document.createElement('div')
  host.id = 'editui-panel-host'
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = chrome.runtime.getURL('toolbar.css')
  shadow.appendChild(link)

  const wrapper = document.createElement('div')
  wrapper.innerHTML = `
    <div class="editui-panel-overlay">
      <div class="editui-panel">
        <div class="editui-panel-header">
          <span>Prompt EditUI</span>
          <button id="panel-close">✕</button>
        </div>
        <div class="editui-panel-body"><pre>${esc(prompt)}</pre></div>
        <div class="editui-panel-footer">
          <button class="editui-copy-btn" id="panel-copy">📋 Copier</button>
          <button class="editui-sec-btn" id="panel-close-btn">Fermer</button>
        </div>
      </div>
    </div>`
  shadow.appendChild(wrapper)
  state.panelRoot = shadow

  const close = () => closePanel()
  shadow.getElementById('panel-close')?.addEventListener('click', close)
  shadow.getElementById('panel-close-btn')?.addEventListener('click', close)
  shadow.querySelector('.editui-panel-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) close()
  })
  shadow.getElementById('panel-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(prompt)
    const btn = shadow.getElementById('panel-copy')
    btn.textContent = '✓ Copié !'
    setTimeout(() => btn.textContent = '📋 Copier', 1500)
  })
}

function closePanel() {
  document.getElementById('editui-panel-host')?.remove()
  state.panelRoot = null
}

// ---- Framework detection ----
function detectFramework() {
  const root = document.getElementById('root') || document.body
  if (Object.keys(root).some(k => k.startsWith('__reactFiber') || k.startsWith('_reactRootContainer')))
    return 'React'
  if (document.body.__vue_app__ || document.querySelector('[data-v-app]'))
    return 'Vue'
  return 'Unknown'
}

// ---- CSS selector builder ----
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

// ---- Utils ----
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---- Messages from popup ----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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

// ---- Start ----
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
