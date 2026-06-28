#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════╗"
echo "║        EditUI — Setup        ║"
echo "╚══════════════════════════════╝"
echo ""

# 1. Plugin dependencies
echo "→ Installing plugin dependencies..."
cd "$REPO_DIR/plugin/js" && npm install --silent
echo "  ✓ Done"
echo ""

# 2. Example app dependencies
echo "→ Installing example app dependencies..."
cd "$REPO_DIR/example" && npm install --silent
echo "  ✓ Done"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Plugin — add to your React project:"
echo ""
echo "  npm install \"$REPO_DIR/plugin/js\""
echo ""
echo "Then in vite.config.js:"
echo ""
echo "  import editui from 'editui/vite'"
echo "  export default defineConfig({ plugins: [editui()] })"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Extension — load in Chrome:"
echo ""
echo "  1. Open chrome://extensions"
echo "  2. Enable Developer mode"
echo "  3. Click 'Load unpacked'"
echo "  4. Select: $REPO_DIR/extension"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run the example app:"
echo ""
echo "  cd \"$REPO_DIR/example\" && npm run dev"
echo ""
