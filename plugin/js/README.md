# @editui/plugin

Babel plugin that annotates every native DOM element with source context at build time.

Each `div`, `button`, `span`, etc. gets three attributes injected:

```html
<button
  data-editui-file="src/components/CheckoutButton.tsx"
  data-editui-line="23"
  data-editui-component="CheckoutButton"
>
  Pay
</button>
```

Attributes are stripped automatically when `NODE_ENV=production`.

---

## Installation

```bash
npm install --save-dev @editui/plugin @babel/core
```

---

## Usage

### Vite + React

> **Important:** do not use the unplugin wrapper with Vite + React. Inject directly into `@vitejs/plugin-react` via `babel.plugins`. This is because `@vitejs/plugin-react` bypasses its own Babel pipeline when no custom Babel config is provided, delegating JSX transpilation to esbuild — which runs before any Rollup/Vite plugin can see the JSX nodes.

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['@editui/plugin/babel-plugin', { enabled: process.env.NODE_ENV !== 'production' }],
        ],
      },
    }),
  ],
})
```

### Webpack

```js
// webpack.config.js
const editui = require('@editui/plugin/webpack')

module.exports = {
  plugins: [editui()],
}
```

### Rollup

```js
// rollup.config.js
import editui from '@editui/plugin/rollup'

export default {
  plugins: [editui()],
}
```

### Babel (standalone / CRA / Next.js)

```json
// .babelrc or babel.config.json
{
  "plugins": [
    ["@editui/plugin/babel-plugin", { "enabled": true }]
  ]
}
```

---

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `NODE_ENV !== 'production'` | Enable or disable annotation |
| `root` | `string` | `process.cwd()` | Project root for relative paths in `data-editui-file` |

---

## What gets annotated

Only native DOM elements: `div`, `button`, `span`, `input`, `a`, `p`, etc.

Custom components (`<MyButton>`, `<Card>`) are skipped — React does not forward unknown props to the DOM unless the component explicitly does so.

---

## Component name detection

The plugin walks up the AST from the JSX element to find the enclosing component name, in this order:

1. Named function declaration: `function Navbar() { ... }`
2. Variable binding: `const Navbar = () => ...`
3. Filename stem (fallback): `Navbar.jsx` → `"Navbar"`

---

## Running tests

```bash
npm test
```

7 tests covering: DOM annotation, custom component skip, arrow function name, anonymous default export fallback, production strip, mixed JSX tree, relative paths.

---

## Architecture note — why not pure unplugin for Vite + React?

`unplugin` creates a Rollup/Vite transform plugin that intercepts files before bundling. This works for most setups.

With `@vitejs/plugin-react`, there is a catch: if no custom Babel plugins are provided, `@vitejs/plugin-react` calls `delete viteBabel.transform` — it removes its own Vite transform hook and lets esbuild handle JSX instead. esbuild processes files before the Rollup plugin pipeline, so by the time `@editui/plugin/vite` sees the code, JSX has already been compiled to `React.jsx()` calls. There are no `JSXOpeningElement` AST nodes left to annotate.

Solution: inject the Babel plugin directly into `@vitejs/plugin-react`'s `babel.plugins` option. This forces Babel to stay active and ensures annotation happens in the same pass as JSX compilation.
