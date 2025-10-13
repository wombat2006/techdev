#!/bin/bash
# Demo script for Wall-Bounce SSE Visualization
# This script demonstrates the new SSE event system for visualizing LLM conversations

set -e

echo "🏓 Wall-Bounce SSE Visualization Demo"
echo "======================================"
echo ""

# Check if server is running
echo "1️⃣ Checking if server is running..."
if ! curl -s http://localhost:8443/health > /dev/null 2>&1; then
  echo "❌ Server is not running. Please start it with:"
  echo "   npm run dev"
  exit 1
fi
echo "✅ Server is running"
echo ""

# Build the project to include new files
echo "2️⃣ Building project..."
npm run build
echo "✅ Build complete"
echo ""

# Run tests
echo "3️⃣ Running SSE emitter tests..."
npm test -- tests/unit/wall-bounce-sse-emitter.test.ts
echo "✅ Tests passed"
echo ""

# Open visualization page
echo "4️⃣ Opening visualization page..."
echo ""
echo "📊 Visualization URL: http://localhost:8443/wall-bounce-visualizer.html"
echo ""
echo "🎯 Try these example queries:"
echo "   - Dockerコンテナの起動問題を解決する方法"
echo "   - Kubernetes deployment のベストプラクティス"
echo "   - TypeScriptで型安全なEventEmitterを実装する方法"
echo ""

# Open browser (macOS/Linux)
if command -v xdg-open > /dev/null; then
  xdg-open "http://localhost:8443/wall-bounce-visualizer.html"
elif command -v open > /dev/null; then
  open "http://localhost:8443/wall-bounce-visualizer.html"
else
  echo "Please open http://localhost:8443/wall-bounce-visualizer.html in your browser"
fi

echo ""
echo "✅ Demo setup complete!"
echo ""
echo "📚 Documentation:"
echo "   - Event Types: src/types/sse-events.ts"
echo "   - Event Emitter: src/services/wall-bounce-sse-emitter.ts"
echo "   - Visualizer: public/wall-bounce-visualizer.html"
echo ""
echo "💡 Integration Guide:"
echo "   1. Import WallBounceSseEmitter in your orchestrator"
echo "   2. Create emitter instance with session ID"
echo "   3. Emit events at key points in wall-bounce flow"
echo "   4. Subscribe to events via EventBus or direct listeners"
echo ""
echo "🎉 Happy visualizing!"
