#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/Backend"

if [ ! -f "$ROOT_DIR/package.json" ]; then
  echo "[ERROR] package.json frontend tidak ditemukan di: $ROOT_DIR"
  exit 1
fi

if [ ! -f "$BACKEND_DIR/package.json" ]; then
  echo "[ERROR] package.json backend tidak ditemukan di: $BACKEND_DIR"
  exit 1
fi

cleanup() {
  echo "\n[INFO] Menghentikan frontend & backend..."
  jobs -p | xargs -r kill 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[INFO] Menjalankan Backend (npm run dev)..."
(
  cd "$BACKEND_DIR"
  npm run dev
) &
BACKEND_PID=$!

echo "[INFO] Menjalankan Frontend (npm run dev)..."
(
  cd "$ROOT_DIR"
  npm run dev
) &
FRONTEND_PID=$!

echo "[INFO] Backend PID: $BACKEND_PID"
echo "[INFO] Frontend PID: $FRONTEND_PID"
echo "[INFO] Tekan Ctrl+C untuk menghentikan keduanya."

wait -n $BACKEND_PID $FRONTEND_PID
