#!/usr/bin/env bash

# Raiden Full Testing Script
# Orchestrates unit tests, production build, and E2E testing.

set -e

# Defaults
SKIP_BUILD=false
MOCK_AI=true

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-build) SKIP_BUILD=true ;;
        --no-mock) MOCK_AI=false ;;
        --help) 
            echo "Usage: ./scripts/full-test.sh [options]"
            echo "Options:"
            echo "  --skip-build    Skip the production build step"
            echo "  --no-mock       Run without MOCK_AI_SERVICES=true"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Find a free port dynamically
FREE_PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("", 0)); print(s.getsockname()[1]); s.close()')
LOG_FILE="/tmp/raiden-server-$FREE_PORT.log"
SERVER_PID=""

cleanup() {
    if [ -n "$SERVER_PID" ]; then
        echo "Stopping server (PID: $SERVER_PID)..."
        kill "$SERVER_PID" 2>/dev/null || true
        # Backup cleanup by port in case PID is lost or mismatched
        lsof -ti:"$FREE_PORT" | xargs kill -9 2>/dev/null || true
    fi
}

# Ensure cleanup runs on exit or error
trap cleanup EXIT

echo "🚀 Starting Full Testing on port $FREE_PORT..."

# 1. Unit + Integration Tests
echo "🧪 Running unit and integration tests..."
npm run test

# 2. Build (Optional)
if [ "$SKIP_BUILD" = false ]; then
    echo "🏗️ Building production bundle..."
    npx dotenv-cli -e .env.development.local -- npm run build
else
    echo "⏩ Skipping build step."
fi

# 3. Start Production Server
echo "🌐 Starting server in background..."
echo "📝 Logs: $LOG_FILE"

MOCK_AI_SERVICES=$MOCK_AI PORT=$FREE_PORT npx dotenv-cli -e .env.development.local -- npm run start > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to respond..."
MAX_WAIT=60
COUNT=0
until curl -s "http://localhost:$FREE_PORT" > /dev/null; do
    sleep 1
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_WAIT ]; then
        echo "❌ Server failed to start within $MAX_WAIT seconds."
        echo "Last 20 lines of log:"
        tail -n 20 "$LOG_FILE"
        exit 1
    fi
done
echo "✅ Server is UP!"

# 4. Run E2E Tests
echo "🎭 Running E2E tests..."
BASE_URL="http://localhost:$FREE_PORT" npm run test:e2e

echo "✨ Full testing passed! You are clear to commit."
