# EditUI

Visual UI picker with floating toolbar. Click any element, get a structured prompt ready to paste into any AI.

---

## How it works

**Two parts:**

1. **`plugin/`** — annotates every DOM element at build time with source context (`file`, `line`, `component`). Zero runtime cost.
2. **`extension/`** — Chrome/Firefox extension. Picks elements, shows a floating toolbar, generates a structured prompt.

The prompt contains enough context for any AI to locate and modify the right component in your codebase.

---

## The generated prompt

```
[EditUI Context]

Page: http://localhost:5173/checkout
Framework: React

Component: CheckoutButton
File: src/components/CheckoutButton.tsx
Line: 23

Element: <button>
Classes: btn btn-primary checkout-btn
Selector: main > section.checkout > button.btn-primary

Requested changes:
- Border radius: 8px → 24px
- Background color: #3B82F6 → #22C55E
- Free instruction: "Add a drop shadow"
```

Works without the plugin too — falls back to CSS selector + classes + inner text.

---

## Repository structure

```
editui/
├── plugin/
│   └── js/          — Babel plugin + unplugin wrapper (Vite, Webpack, Rollup, esbuild)
├── extension/       — Browser extension (coming)
└── example/         — Vite + React demo app
```

---

## Quick start (example app)

```bash
cd example
npm install
npm run dev
```

Open DevTools → inspect any element → you'll see `data-editui-file`, `data-editui-line`, `data-editui-component`.

---

## Roadmap

| Status | Item |
|--------|------|
| ✅ | Babel plugin — JSX AST transform |
| ✅ | unplugin wrapper (Vite / Webpack / Rollup / esbuild) |
| ✅ | Example app |
| 🔲 | Browser extension — picker + toolbar |
| 🔲 | SWC plugin (v2) |
| 🔲 | Laravel Blade support (v2) |
| 🔲 | Django / Flask support (v2) |

---

## What EditUI is not

- No direct AI API calls — no API key required
- Not tied to a specific AI — works with Claude, GPT, Gemini, Cursor, anything
- Not a visual editor — it provides context, the AI does the work
- Not intrusive in production — stripped automatically via `NODE_ENV`
