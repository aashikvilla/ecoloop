#!/usr/bin/env bash
set -e

echo "=== [1/3] Verifying Next.js Frontend Build ==="
cd frontend
npm run build
cd ..

echo "=== [2/3] Verifying Python Domain Assertions & Gold Cases ==="
if [ -d "backend/.venv" ]; then
    ./backend/.venv/Scripts/python .agents/skills/ecoloop-domain-engine/examples/eval_runner.py
else
    python .agents/skills/ecoloop-domain-engine/examples/eval_runner.py
fi

echo "=== [3/3] Checking Git Status and Working Tree ==="
git status --short

echo "All verification gates PASSED! Ready for deployment."
