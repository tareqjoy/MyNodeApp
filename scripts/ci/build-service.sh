#!/bin/bash
set -euo pipefail

SVC=${1:?service name required}
SERVICES_DIR=${SERVICES_DIR:-src}
SVC_DIR="${SERVICES_DIR}/${SVC}"

if [ "$SVC" = "analytics" ]; then
  if [ -f "$SVC_DIR/gradlew" ] && [ ! -x "$SVC_DIR/gradlew" ]; then
    chmod +x "$SVC_DIR/gradlew"
  fi

  if [ -x "$SVC_DIR/gradlew" ]; then
    "$SVC_DIR/gradlew" --no-daemon -p "$SVC_DIR" :app:shadowJar
    exit 0
  fi

  if command -v gradle >/dev/null 2>&1; then
    gradle --no-daemon -p "$SVC_DIR" :app:shadowJar
    exit 0
  fi

  echo "Missing gradle wrapper at $SVC_DIR/gradlew and no gradle in PATH" >&2
  exit 1
fi

cd "$SVC_DIR"

node -v
npm -v
npm ci
npm test --if-present

if [ "$SVC" = "frontend-service" ]; then
  NODE_ENV=production npm run build --if-present
else
  npm run build --if-present
fi
