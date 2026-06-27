// == EditUI — Popup ====================================================

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  let active = false

  // État initial
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'EDITUI_STATUS' })
    active = resp?.active || false
  } catch {}
  updateUI(active)

  // Toggle
  document.getElementById('toggleBtn').addEventListener('click', async () => {
    try {
      const resp = await chrome.tabs.sendMessage(tab.id, { type: 'EDITUI_TOGGLE' })
      active = resp?.active || false
    } catch {
      // Content script pas encore chargé → injecter
      active = !active
    }
    updateUI(active)
  })
})

function updateUI(active) {
  const btn = document.getElementById('toggleBtn')
  const dot = document.getElementById('statusDot')
  const text = document.getElementById('statusText')

  if (active) {
    btn.classList.add('active')
    dot.className = 'dot on'
    text.textContent = 'Actif — survolez les éléments'
  } else {
    btn.classList.remove('active')
    dot.className = 'dot off'
    text.textContent = 'Désactivé'
  }
}
