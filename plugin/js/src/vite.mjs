import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Babel loads plugins lazily by path — never require()'d at config load time
const BABEL_PLUGIN_PATH = resolve(__dirname, './babel-plugin.js')

export default function editUI(opts = {}) {
  const enabled = opts.enabled !== undefined
    ? opts.enabled
    : process.env.NODE_ENV !== 'production'

  const root = opts.root || process.cwd()

  // Resolve @vitejs/plugin-react from the user's project, not from our package
  const userRequire = createRequire(resolve(process.cwd(), 'package.json'))

  let reactPlugin
  try {
    const react = userRequire('@vitejs/plugin-react')
    const reactFactory = react.default || react

    const userReactOpts = opts.react || {}
    const userBabelPlugins = userReactOpts.babel?.plugins || []

    reactPlugin = reactFactory({
      ...userReactOpts,
      babel: {
        ...userReactOpts.babel,
        plugins: [
          ...userBabelPlugins,
          ...(enabled ? [[BABEL_PLUGIN_PATH, { enabled, root }]] : []),
        ],
      },
    })
  } catch (e) {
    // @vitejs/plugin-react not installed — user handles React separately
  }

  if (reactPlugin) {
    return Array.isArray(reactPlugin) ? reactPlugin : [reactPlugin]
  }
  return []
}
