const path = require('path')

const DOM_ELEMENTS = new Set([
  'a','abbr','address','area','article','aside','audio',
  'b','bdi','bdo','blockquote','br','button',
  'canvas','caption','cite','code','col','colgroup',
  'data','datalist','dd','del','details','dfn','dialog','div','dl','dt',
  'em','embed',
  'fieldset','figcaption','figure','footer','form',
  'h1','h2','h3','h4','h5','h6','head','header','hr',
  'i','iframe','img','input','ins',
  'kbd',
  'label','legend','li','link',
  'main','map','mark','menu','meta','meter',
  'nav','noscript',
  'object','ol','optgroup','option','output',
  'p','picture','pre','progress',
  'q',
  's','samp','script','section','select','small','source','span','strong','style','sub','summary','sup',
  'table','tbody','td','template','textarea','tfoot','th','thead','time','title','tr','track',
  'u','ul',
  'var','video',
  'wbr',
])

function getComponentName(nodePath, filename) {
  let current = nodePath.parentPath
  while (current) {
    const node = current.node

    // function MyComponent() { return <div> }
    if (
      (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') &&
      node.id?.name
    ) {
      return node.id.name
    }

    // const MyComponent = () => <div>  OR  const MyComponent = function() { }
    if (node.type === 'VariableDeclarator' && node.id?.name) {
      return node.id.name
    }

    // export default function MyComponent() { }
    if (node.type === 'ExportDefaultDeclaration') {
      const decl = node.declaration
      if (decl?.id?.name) return decl.id.name
      // anonymous default export → fallback to filename
      break
    }

    current = current.parentPath
  }

  // fallback: PascalCase filename stem
  const stem = path.basename(filename, path.extname(filename))
  return stem
}

function makeAttr(t, name, value) {
  return t.jsxAttribute(
    t.jsxIdentifier(name),
    t.stringLiteral(value)
  )
}

module.exports = function editUIBabelPlugin({ types: t }) {
  return {
    name: 'editui',
    visitor: {
      JSXOpeningElement(nodePath, state) {
        const opts = state.opts || {}
        const enabled = opts.enabled !== undefined ? opts.enabled : process.env.NODE_ENV !== 'production'
        if (!enabled) return

        const nameNode = nodePath.node.name
        // only DOM native elements
        const tagName = nameNode.type === 'JSXIdentifier' ? nameNode.name : null
        if (!tagName || !DOM_ELEMENTS.has(tagName)) return

        // skip if already annotated (e.g. multiple passes)
        const already = nodePath.node.attributes.some(
          a => a.type === 'JSXAttribute' && a.name?.name === 'data-editui-file'
        )
        if (already) return

        const filename = state.filename || state.file?.opts?.filename || ''
        const root = opts.root || state.cwd || process.cwd()
        const relFile = filename ? path.relative(root, filename) : ''

        const line = nodePath.node.loc?.start.line ?? 0
        const component = getComponentName(nodePath, filename)

        nodePath.node.attributes.unshift(
          makeAttr(t, 'data-editui-file', relFile),
          makeAttr(t, 'data-editui-line', String(line)),
          makeAttr(t, 'data-editui-component', component),
        )
      }
    }
  }
}
