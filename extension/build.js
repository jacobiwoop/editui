/**
 * Build — Copie l'extension vers dist/ pour chargement dans Chrome
 */
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(DIR, 'dist')

const FILES = [
  'manifest.json',
  'content.js',
  'toolbar.css',
  'popup.html',
  'popup.js',
  'icons/icon-16.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
]

async function build() {
  if (existsSync(DIST)) await rm(DIST, { recursive: true })
  await mkdir(DIST, { recursive: true })
  await mkdir(resolve(DIST, 'icons'), { recursive: true })

  for (const file of FILES) {
    const src = resolve(DIR, file)
    const dst = resolve(DIST, file)
    await copyFile(src, dst)
    console.log(`  ✓ ${file}`)
  }

  console.log(`\n✅ Extension prête dans dist/`)
}

build().catch(console.error)
