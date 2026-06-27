import { defineConfig } from 'vite'
import editui from '../plugin/js/src/vite.mjs'

export default defineConfig({
  plugins: [editui()],
})
