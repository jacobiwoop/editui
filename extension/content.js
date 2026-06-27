// == EditUI — Content Script ===========================================
// Picker, toolbar flottante (Shadow DOM), génération de prompt.

// ---- État global ----
const state = {
  active: false,
  hoverEl: null,
  selectedEl: null,
  originalStyles: {},
  toolbarRoot: null,
  panelRoot: null,
  changes: [],
}

// ---- Initialisation ----
async function init() {
  injectPickerStyles()
  document.addEventListener('mouseover', onHover, true)
  document.addEventListener('mouseout', onOut, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKey, true)
}

// ---- Picker styles (injectés dans la page) ----
function injectPickerStyles() {
  const style = document.createElement('style')
  style.id = 'editui-picker-style'
  style.textContent = `
    .editui-picker-hover {
      outline: 2px solid #667eea !important;
      outline-offset: 2px !important;
      transition: outline 0.1s !important;
    }
    .editui-picker-selected {
      outline: 3px solid #4ade80 !important;
      outline-offset: 2px !important;
    }
  `
  document.head.appendChild(style)
}

function togglePickerStyles(enable) {
  const el = document.getElementById('editui-picker-style')
  if (el) el.disabled = !enable
  if (!enable) {
    document.querySelectorAll('.editui-picker-hover, .editui-picker-selected')
      .forEach(el => el.classList.remove('editui-picker-hover', 'editui-picker-selected'))
  }
}

// ---- Gestionnaires d'événements ----
function onHover(e) {
  if (!state.active) return
  clearHover()

  const el = e.target
  if (el === state.selectedEl) return
  // Ne pas survoler la toolbar
  if (state.toolbarRoot && state.toolbarRoot.contains(e.target)) return

  state.hoverEl = el
  el.classList.add('editui-picker-hover')
}

function onOut(e) {
  if (!state.active) return
  clearHover()
}

function clearHover() {
  if (state.hoverEl) {
    state.hoverEl.classList.remove('editui-picker-hover')
    state.hoverEl = null
  }
}

function onClick(e) {
  if (!state.active) return

  // Ignorer clics dans la toolbar
  if (state.toolbarRoot && state.toolbarRoot.contains(e.target)) return
  // Ignorer clics dans le panel
  if (state.panelRoot && state.panelRoot.contains(e.target)) return

  e.preventDefault()
  e.stopPropagation()

  selectElement(e.target)
}

function onKey(e) {
  if (!state.active) return
  if (e.key === 'Escape') {
    if (state.panelRoot) {
      closePanel()
      return
    }
    if (state.selectedEl) {
      deselectElement()
      return
    }
  }
}

// ---- Sélection / désélection ----
function selectElement(el) {
  deselectElement()
  state.selectedEl = el
  state.originalStyles = captureOriginalStyles(el)
  el.classList.add('editui-picker-selected')
  clearHover()
  showToolbar(el)
}

function captureOriginalStyles(el) {
  const cs = getComputedStyle(el)
  return {
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    color: cs.color,
    backgroundColor: cs.backgroundColor,
    padding: cs.padding,
    borderRadius: cs.borderRadius,
    textAlign: cs.textAlign,
  }
}

function deselectElement() {
  if (state.selectedEl) {
    state.selectedEl.classList.remove('editui-picker-selected')
    state.selectedEl = null
  }
  hideToolbar()
  state.changes = []
}

// ---- Toolbar (Shadow DOM) ----
function getToolbarTemplate() {
  return `
  <div class="editui-toolbar" id="editui-toolbar">
    <div class="editui-tb-header">
      <span class="editui-tb-title">EditUI</span>
      <div class="editui-tb-actions">
        <button class="editui-tb-btn" data-action="minimize">─</button>
        <button class="editui-tb-btn" data-action="close">✕</button>
      </div>
    </div>
    <div class="editui-tb-info" id="tb-info"></div>
    <div class="editui-tb-controls" id="tb-controls">
      <div class="editui-tb-field">
        <label>Font size</label>
        <input type="text" id="ctl-font-size" placeholder="16px" />
      </div>
      <div class="editui-tb-field">
        <label>Font weight</label>
        <select id="ctl-font-weight">
          <option value="">—</option>
          <option value="400">Normal (400)</option>
          <option value="500">Medium (500)</option>
          <option value="600">Semi Bold (600)</option>
          <option value="700">Bold (700)</option>
        </select>
      </div>
      <div class="editui-tb-field">
        <label>Text color</label>
        <input type="text" id="ctl-color" placeholder="#333" />
      </div>
      <div class="editui-tb-field">
        <label>Background</label>
        <input type="text" id="ctl-bg" placeholder="transparent" />
      </div>
      <div class="editui-tb-field">
        <label>Padding</label>
        <input type="text" id="ctl-padding" placeholder="12px" />
      </div>
      <div class="editui-tb-field">
        <label>Border radius</label>
        <input type="text" id="ctl-radius" placeholder="8px" />
      </div>
      <div class="editui-tb-field">
        <label>Text align</label>
        <select id="ctl-align">
          <option value="">—</option>
          <option value="left">Gauche</option>
          <option value="center">Centre</option>
          <option value="right">Droite</option>
        </select>
      </div>
    </div>
    <div class="editui-tb-free">
      <textarea id="tb-free-input" placeholder="Instructions libres (ex: 'Ajouter une ombre portée')" rows="2"></textarea>
    </div>
    <div class="editui-tb-footer">
      <button class="editui-tb-primary" id="tb-copy-prompt">📋 Copier le prompt</button>
      <button class="editui-tb-secondary" id="tb-show-prompt">👁</button>
    </div>
  </div>`
}

function showToolbar(el) {
  hideToolbar()

  // Charger CSS
  const cssUrl = chrome.runtime.getURL('toolbar.css')

  // Créer le host Shadow DOM
  const host = document.createElement('div')
  host.id = 'editui-toolbar-host'
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'closed' })

  // Charger le CSS dans le shadow
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = cssUrl
  shadow.appendChild(link)

  // Injecter le template
  const wrapper = document.createElement('div')
  wrapper.innerHTML = getToolbarTemplate()
  shadow.appendChild(wrapper)

  state.toolbarRoot = shadow

  // Remplir les infos
  fillToolbarInfo(shadow, el)

  // Lire les computed styles
  fillComputedStyles(shadow, el)

  // Positionner la toolbar
  positionToolbar(shadow, el)

  // Écouteurs
  setupToolbarListeners(shadow, el)

  // Drag
  setupDrag(shadow)
}

function hideToolbar() {
  const host = document.getElementById('editui-toolbar-host')
  if (host) host.remove()
  state.toolbarRoot = null
}

function fillToolbarInfo(shadow, el) {
  const info = shadow.getElementById('tb-info')
  const file = el.getAttribute('data-editui-file')
  const line = el.getAttribute('data-editui-line')
  const component = el.getAttribute('data-editui-component')

  const tag = el.tagName.toLowerCase()
  const classes = Array.from(el.classList).slice(0, 5).join('.')
  const selector = classes ? `${tag}.${classes}` : tag

  if (file) {
    info.innerHTML = `
      <span class="file">${escapeHtml(file)}</span>:<span class="line">${line || '?'}</span>
      &nbsp;<span class="comp">[${escapeHtml(component || '?')}]</span>
    `
  } else {
    info.innerHTML = `<span style="color:#999">&lt;${selector}&gt;</span>`
  }
}

function fillComputedStyles(shadow, el) {
  const cs = getComputedStyle(el)

  setField(shadow, 'ctl-font-size', cs.fontSize)
  setField(shadow, 'ctl-font-weight', cs.fontWeight)
  setField(shadow, 'ctl-color', cs.color)
  setField(shadow, 'ctl-bg', cs.backgroundColor)
  setField(shadow, 'ctl-padding', cs.padding)
  setField(shadow, 'ctl-radius', cs.borderRadius)

  // Text align
  const align = cs.textAlign
  const alignSel = shadow.getElementById('ctl-align')
  if (alignSel) {
    const opt = alignSel.querySelector(`option[value="${align}"]`)
    if (opt) alignSel.value = align
  }
}

function setField(shadow, id, value) {
  const el = shadow.getElementById(id)
  if (el) el.value = value
}

function positionToolbar(shadow, el) {
  const tb = shadow.querySelector('.editui-toolbar')
  if (!tb) return

  const rect = el.getBoundingClientRect()
  const tbHeight = 340
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top

  let top
  if (spaceBelow >= tbHeight + 10) {
    top = rect.bottom + 6
  } else if (spaceAbove >= tbHeight + 10) {
    top = rect.top - tbHeight - 6
  } else {
    top = Math.max(6, rect.top - tbHeight / 2)
  }

  // Centrer horizontalement
  let left = rect.left + rect.width / 2 - 150
  left = Math.max(6, Math.min(left, window.innerWidth - 306))

  tb.style.top = top + 'px'
  tb.style.left = left + 'px'
}

function setupToolbarListeners(shadow, el) {
  // Minimize
  shadow.querySelector('[data-action="minimize"]')?.addEventListener('click', () => {
    const controls = shadow.getElementById('tb-controls')
    const free = shadow.querySelector('.editui-tb-free')
    const footer = shadow.querySelector('.editui-tb-footer')
    const info = shadow.querySelector('.editui-tb-info')
    const hidden = controls.style.display === 'none'
    controls.style.display = hidden ? '' : 'none'
    free.style.display = hidden ? '' : 'none'
    footer.style.display = hidden ? '' : 'none'
    info.style.display = hidden ? '' : 'none'
  })

  // Close
  shadow.querySelector('[data-action="close"]')?.addEventListener('click', () => {
    deselectElement()
  })

  // Copy prompt
  shadow.getElementById('tb-copy-prompt')?.addEventListener('click', () => {
    const prompt = buildPrompt(el)
    navigator.clipboard.writeText(prompt).then(() => {
      const btn = shadow.getElementById('tb-copy-prompt')
      btn.textContent = '✓ Copié !'
      btn.classList.add('copied')
      setTimeout(() => {
        btn.textContent = '📋 Copier le prompt'
        btn.classList.remove('copied')
      }, 2000)
    }).catch(() => {
      // Fallback: show inline
      showPromptPanel(prompt)
    })
  })

  // Show prompt panel
  shadow.getElementById('tb-show-prompt')?.addEventListener('click', () => {
    const prompt = buildPrompt(el)
    showPromptPanel(prompt)
  })

  // Contrôles → apply en direct
  const apply = () => applyChanges(el, shadow)
  shadow.querySelectorAll('#tb-controls input, #tb-controls select').forEach(input => {
    input.addEventListener('input', apply)
    input.addEventListener('change', apply)
  })
  shadow.getElementById('tb-free-input')?.addEventListener('input', apply)
}

function applyChanges(el, shadow) {
  state.changes = []
  const prev = {}

  const fields = [
    { id: 'ctl-font-size', prop: 'font-size', css: 'fontSize' },
    { id: 'ctl-font-weight', prop: 'font-weight', css: 'fontWeight' },
    { id: 'ctl-color', prop: 'color', css: 'color' },
    { id: 'ctl-bg', prop: 'background-color', css: 'backgroundColor' },
    { id: 'ctl-padding', prop: 'padding', css: 'padding' },
    { id: 'ctl-radius', prop: 'border-radius', css: 'borderRadius' },
  ]

  for (const field of fields) {
    const input = shadow.getElementById(field.id)
    if (!input) continue
    const value = input.value.trim()
    if (!value) continue

    const original = state.originalStyles[field.css] || ''
    if (value !== original) {
      el.style[field.css] = value
      state.changes.push({ prop: field.prop, from: original, to: value })
    }
  }

  // Text align
  const align = shadow.getElementById('ctl-align')?.value
  if (align) {
    const original = state.originalStyles.textAlign || ''
    if (align !== original) {
      el.style.textAlign = align
      state.changes.push({ prop: 'text-align', from: original, to: align })
    }
  }
}

function setupDrag(shadow) {
  const tb = shadow.querySelector('.editui-toolbar')
  const header = shadow.querySelector('.editui-tb-header')
  if (!tb || !header) return

  let isDragging = false
  let startX, startY, startLeft, startTop

  header.addEventListener('mousedown', (e) => {
    isDragging = true
    const rect = tb.getBoundingClientRect()
    startX = e.clientX
    startY = e.clientY
    startLeft = rect.left
    startTop = rect.top
    tb.style.cursor = 'grabbing'
  })

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    tb.style.left = (startLeft + dx) + 'px'
    tb.style.top = (startTop + dy) + 'px'
  })

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false
      tb.style.cursor = ''
    }
  })
}

// ---- Prompt ----
function buildPrompt(el) {
  const url = location.href
  const framework = detectFramework()
  const tag = el.tagName.toLowerCase()
  const classes = Array.from(el.classList).join(' ')
  const text = (el.textContent || '').trim().slice(0, 100)
  const selector = buildSelector(el)

  const file = el.getAttribute('data-editui-file')
  const line = el.getAttribute('data-editui-line')
  const component = el.getAttribute('data-editui-component')
  const richMode = !!(file || component)

  const freeInput = state.toolbarRoot?.getElementById('tb-free-input')?.value?.trim()

  let prompt = `[EditUI Context]\n\n`
  prompt += `Page: ${url}\n`
  prompt += `Framework: ${framework}\n\n`

  if (richMode) {
    prompt += `Component: ${component || '?'}\n`
    prompt += `File: ${file || '?'}\n`
    prompt += `Line: ${line || '?'}\n\n`
  }

  prompt += `Element: <${tag}>\n`
  prompt += `Classes: ${classes || '(none)'}\n`
  prompt += `Selector: ${selector}\n`
  if (text) prompt += `\nText: "${text}"\n`

  prompt += `\nRequested changes:\n`

  if (state.changes.length === 0 && !freeInput) {
    prompt += `  (no changes — visual inspection)\n`
  }

  for (const c of state.changes) {
    prompt += `- ${c.prop}: ${c.from} → ${c.to}\n`
  }

  if (freeInput) {
    prompt += `- Free instruction: "${freeInput}"\n`
  }

  return prompt
}

function detectFramework() {
  // React detection
  const root = document.getElementById('root') || document.body
  const reactMarkers = Object.keys(root).filter(k =>
    k.startsWith('__reactFiber') || k.startsWith('_reactRootContainer')
  )
  if (reactMarkers.length > 0) return 'React'

  // Vue detection
  const vueMarker = document.body.__vue_app__ ||
    document.querySelector('[data-v-app]')
  if (vueMarker) return 'Vue'

  return 'Unknown'
}

function buildSelector(el) {
  const parts = []
  let current = el
  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase()
    const id = current.id ? `#${current.id}` : ''
    const cls = Array.from(current.classList).slice(0, 2).map(c => `.${c}`).join('')
    parts.unshift(`${tag}${id}${cls}`)
    current = current.parentElement
  }
  return parts.join(' > ') || el.tagName.toLowerCase()
}

// ---- Panel de prompt ----
function showPromptPanel(prompt) {
  closePanel()

  const host = document.createElement('div')
  host.id = 'editui-panel-host'
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'closed' })

  const cssUrl = chrome.runtime.getURL('toolbar.css')
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = cssUrl
  shadow.appendChild(link)

  const wrapper = document.createElement('div')
  wrapper.innerHTML = `
    <div class="editui-panel-overlay">
      <div class="editui-panel">
        <div class="editui-panel-header">
          <h3>✦ Prompt EditUI</h3>
          <button class="editui-panel-close" id="panel-close">✕</button>
        </div>
        <div class="editui-panel-body">
          <pre>${escapeHtml(prompt)}</pre>
        </div>
        <div class="editui-panel-footer">
          <button class="editui-tb-primary" id="panel-copy">📋 Copier</button>
          <button class="editui-tb-secondary" id="panel-close-btn">Fermer</button>
        </div>
      </div>
    </div>
  `
  shadow.appendChild(wrapper)
  state.panelRoot = shadow

  shadow.getElementById('panel-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(prompt)
    const btn = shadow.getElementById('panel-copy')
    btn.textContent = '✓ Copié !'
    setTimeout(() => btn.textContent = '📋 Copier', 1500)
  })

  const close = () => closePanel()
  shadow.getElementById('panel-close')?.addEventListener('click', close)
  shadow.getElementById('panel-close-btn')?.addEventListener('click', close)
  shadow.querySelector('.editui-panel-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) close()
  })
}

function closePanel() {
  const host = document.getElementById('editui-panel-host')
  if (host) host.remove()
  state.panelRoot = null
}

// ---- Messages du popup ----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'EDITUI_TOGGLE') {
    state.active = !state.active
    togglePickerStyles(state.active)
    if (!state.active) deselectElement()
    sendResponse({ active: state.active })
  }
  if (msg.type === 'EDITUI_STATUS') {
    sendResponse({ active: state.active })
  }
})

// ---- Utils ----
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---- Démarrage ----
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
