const { transformSync } = require('@babel/core')
const editUIPlugin = require('../src/babel-plugin')
const path = require('path')

const root = '/home/user/project'

function transform(code, filename) {
  const result = transformSync(code, {
    filename,
    babelrc: false,
    configFile: false,
    plugins: [
      ['@babel/plugin-syntax-jsx'],
      [editUIPlugin, { enabled: true, root }],
    ],
    parserOpts: { plugins: ['jsx', 'typescript'] },
    sourceMaps: false,
  })
  return result.code
}

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ✗ ${name}`)
    console.log(`    ${e.message}`)
    failed++
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'assertion failed')
}

console.log('\n[EditUI Plugin Tests]\n')

// --- DOM element gets annotated ---
test('annotates native DOM element', () => {
  const code = `
    function Button() {
      return <button className="btn">Click</button>
    }
  `
  const out = transform(code, `${root}/src/components/Button.jsx`)
  assert(out.includes('data-editui-file="src/components/Button.jsx"'), 'file attr missing')
  assert(out.includes('data-editui-component="Button"'), 'component attr missing')
  assert(out.includes('data-editui-line='), 'line attr missing')
})

// --- Custom component NOT annotated ---
test('skips custom JSX component', () => {
  const code = `
    function App() {
      return <MyCustomComponent foo="bar" />
    }
  `
  const out = transform(code, `${root}/src/App.jsx`)
  assert(!out.includes('data-editui-file'), 'custom component should not be annotated')
})

// --- Arrow function component name detection ---
test('detects arrow function component name', () => {
  const code = `
    const Navbar = () => {
      return <nav>Hello</nav>
    }
  `
  const out = transform(code, `${root}/src/Navbar.jsx`)
  assert(out.includes('data-editui-component="Navbar"'), `got: ${out}`)
})

// --- Filename fallback ---
test('fallback to filename when anonymous default export', () => {
  const code = `
    export default function() {
      return <div>anon</div>
    }
  `
  const out = transform(code, `${root}/src/components/HeroSection.jsx`)
  assert(out.includes('data-editui-component="HeroSection"'), `got: ${out}`)
})

// --- disabled in production ---
test('no annotation when enabled=false', () => {
  const code = `function F() { return <div>x</div> }`
  const result = transformSync(code, {
    filename: `${root}/src/F.jsx`,
    babelrc: false,
    configFile: false,
    plugins: [
      ['@babel/plugin-syntax-jsx'],
      [editUIPlugin, { enabled: false }],
    ],
    parserOpts: { plugins: ['jsx'] },
    sourceMaps: false,
  })
  assert(!result.code.includes('data-editui'), 'should be stripped when disabled')
})

// --- Nested: only DOM elements annotated, not component wrappers ---
test('only DOM in mixed JSX tree', () => {
  const code = `
    function Card() {
      return (
        <div className="card">
          <Icon name="star" />
          <span>text</span>
        </div>
      )
    }
  `
  const out = transform(code, `${root}/src/Card.jsx`)
  // div and span annotated
  assert((out.match(/data-editui-file/g) || []).length === 2, `expected 2 annotations, got: ${out}`)
  // Icon not annotated
  const iconLine = out.split('\n').find(l => l.includes('Icon'))
  assert(iconLine && !iconLine.includes('data-editui'), 'Icon should not be annotated')
})

// --- relative path ---
test('path is relative to root', () => {
  const code = `function F() { return <p>x</p> }`
  const out = transform(code, `${root}/src/deep/nested/File.jsx`)
  assert(out.includes('data-editui-file="src/deep/nested/File.jsx"'), `got: ${out}`)
})

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
