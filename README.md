# EditUI

Visual UI picker with glassmorphism toolbar. Click any element, modify it visually, get a structured prompt ready to paste into any AI.

---

## How it works

**Two parts:**

1. **`plugin/`** — annotates every DOM element at build time with source context (`file`, `line`, `component`). Zero runtime cost.
2. **`extension/`** — Chrome extension. Click elements, modify CSS visually via floating toolbar, copy a structured prompt.

The prompt contains enough context for any AI to locate and modify the right component in your codebase.

---

## The toolbar

A glassmorphism pill-shaped toolbar anchored at the bottom of the screen. Click any element on the page to select it, then use the toolbar buttons to modify it visually in real time.

| Button | What it does |
|--------|--------------|
| Background | Color picker + opacity slider |
| Border | Width, style, radius (per-corner), color |
| Text | Font, bold/italic/underline/strikethrough, size, line-height, color |
| Spacing | Interactive box model — click any margin or padding value to edit it inline |
| Size | Width and height |
| Note | Free-text note attached to the selection |
| Undo | Restore original styles |
| Clear | Remove all inline overrides |
| Prompt | Generate a JSON or Markdown prompt with all changes — copy with one click |

The logo icon on the left collapses the toolbar to a small pill you can drag anywhere on screen.

---

## The generated prompt

```json
{
  "page": "http://localhost:5173/checkout",
  "framework": "React",
  "component": "CheckoutButton",
  "file": "src/components/CheckoutButton.tsx",
  "line": "23",
  "element": {
    "tag": "button",
    "classes": "btn btn-primary",
    "selector": "main > section > button.btn-primary",
    "text": "Passer la commande"
  },
  "changes": [
    { "prop": "borderRadius", "from": "8px", "to": "24px" },
    { "prop": "backgroundColor", "from": "rgb(59,130,246)", "to": "#22c55e" }
  ]
}
```

Works without the plugin too — falls back to CSS selector + tag + classes.

---

## Installation

### 1. Build plugin (Vite + React)

```bash
cd plugin/js
npm install
```

In your project:

```bash
npm install ../editui/plugin/js   # or publish to npm and install normally
```

**`vite.config.js`**

```js
import { defineConfig } from 'vite'
import editui from 'editui/vite'   // replaces @vitejs/plugin-react

export default defineConfig({
  plugins: [editui()],
})
```

That's it — no separate `react()` call needed. EditUI wraps it internally.

Every JSX element in your app gets annotated automatically:

```html
<button data-editui-file="src/components/Hero.tsx"
        data-editui-line="42"
        data-editui-component="Hero">
  Get started
</button>
```

Annotations are stripped automatically when `NODE_ENV=production`.

---

### 2. Chrome extension

1. Clone or download this repo
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `extension/` folder

The EditUI icon appears in your toolbar. Click it to toggle the picker on any page.

---

## Quick start (example app)

```bash
cd example
npm install
npm run dev
```

Open `http://localhost:5173`, then activate the extension — every element has source annotations visible in DevTools under `data-editui-*`.

---

## Repository structure

```
editui/
├── plugin/
│   └── js/          — Babel plugin + unplugin wrapper (Vite, Webpack, Rollup, esbuild)
│       ├── src/
│       │   ├── babel-plugin.js   — AST transform (JSXOpeningElement visitor)
│       │   ├── vite.mjs          — Vite integration (wraps @vitejs/plugin-react)
│       │   ├── webpack.js        — Webpack integration
│       │   └── rollup.js         — Rollup integration
│       └── package.json
├── extension/       — Chrome extension (Manifest V3)
│   ├── content.js   — Picker + toolbar logic (shadow DOM)
│   ├── toolbar.css  — Glassmorphism styles (shadow DOM scoped)
│   ├── popup.html   — Extension popup
│   └── manifest.json
└── example/         — Vite + React demo app
```

---

## Roadmap

| Status | Item |
|--------|------|
| ✅ | Babel plugin — JSX AST transform |
| ✅ | unplugin wrapper (Vite / Webpack / Rollup / esbuild) |
| ✅ | Example app |
| ✅ | Chrome extension — glassmorphism toolbar with 7 edit panels |
| 🔲 | Publish plugin to npm |
| 🔲 | Firefox extension |
| 🔲 | SWC plugin (v2) |
| 🔲 | Vue / Svelte support (v2) |

---

## What EditUI is not

- No direct AI API calls — no API key required
- Not tied to a specific AI — works with Claude, GPT, Gemini, Cursor, anything
- Not a visual editor — it gives context, the AI does the actual code changes
- Not intrusive in production — annotations stripped automatically via `NODE_ENV`
