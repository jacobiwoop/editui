const { createUnplugin } = require('unplugin')
const { transformSync } = require('@babel/core')
const editUIBabelPlugin = require('./babel-plugin')

const SUPPORTED_EXTENSIONS = /\.(jsx|tsx|js|ts|mjs|mts)$/

const editUIUnplugin = createUnplugin((opts = {}) => {
  const enabled = opts.enabled !== undefined
    ? opts.enabled
    : process.env.NODE_ENV !== 'production'

  return {
    name: 'editui',
    enforce: 'pre',

    transformInclude(id) {
      return SUPPORTED_EXTENSIONS.test(id)
    },

    transform(code, id) {
      if (!enabled) return null
      // skip node_modules
      if (id.includes('node_modules')) return null
      // only transform files containing JSX
      if (!/<[A-Za-z]/.test(code)) return null

      let result
      try {
        result = transformSync(code, {
          filename: id,
          babelrc: false,
          configFile: false,
          plugins: [
            ['@babel/plugin-syntax-jsx'],
            [editUIBabelPlugin, { enabled, root: opts.root }],
          ],
          parserOpts: {
            plugins: ['jsx', 'typescript'],
          },
          // preserve original source map chain
          sourceMaps: true,
          sourceFileName: id,
        })
      } catch (e) {
        // don't break the build for transform errors
        console.warn(`[editui] transform failed for ${id}:`, e.message)
        return null
      }

      if (!result?.code) return null
      return { code: result.code, map: result.map }
    }
  }
})

// named exports for each bundler
module.exports = editUIUnplugin
module.exports.vite = editUIUnplugin.vite
module.exports.webpack = editUIUnplugin.webpack
module.exports.rollup = editUIUnplugin.rollup
module.exports.esbuild = editUIUnplugin.esbuild

