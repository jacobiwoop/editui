#!/bin/bash
set -e

PLUGIN_DIR="$(cd "$(dirname "$0")/plugin/js" && pwd)"

echo ""
echo "Installing EditUI plugin dependencies..."
cd "$PLUGIN_DIR" && npm install --silent
echo "✓ Done"
echo ""
echo "Add to your project:"
echo ""
echo "  npm install \"$PLUGIN_DIR\""
echo ""
echo "── Vite ──────────────────────────────────────"
echo ""
echo "  // vite.config.js"
echo "  import editui from '@editui/plugin/vite'"
echo "  export default defineConfig({ plugins: [editui()] })"
echo ""
echo "── Next.js ───────────────────────────────────"
echo ""
echo "  // .babelrc"
echo "  {"
echo "    \"presets\": [\"next/babel\"],"
echo "    \"plugins\": [[\"./node_modules/@editui/plugin/src/babel-plugin.js\"]]"
echo "  }"
echo ""
