#!/bin/bash
# Demo setup script — run once before recording

echo "=== Libero Demo Setup ==="
echo ""

# Check if model is cached
if [ -d "$HOME/.cache/qvac" ] || [ -d "$HOME/.qvac" ]; then
    echo "QVAC model cache found."
else
    echo "Downloading QVAC model (~773MB)..."
    echo "This only happens once. Subsequent runs use the cached model."
    echo ""
    timeout 300 pnpm start 2>&1 | grep -E "(QVAC|Model|download)" || true
    echo ""
    echo "Model download complete."
fi

echo ""
echo "=== Ready for Demo ==="
echo ""
echo "To record your demo:"
echo "  1. Start recording (OBS, Kazam, or built-in recorder)"
echo "  2. Run: pnpm start"
echo "  3. Follow DEMO_SCRIPT.md"
echo "  4. Stop recording at 3:00"
echo ""
echo "For multi-peer demo:"
echo "  Terminal 1: pnpm start"
echo "  Terminal 2: pnpm start"
echo ""
