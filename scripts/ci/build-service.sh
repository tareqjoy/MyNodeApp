#!/bin/bash
set -euo pipefail

SVC=${1:?service name required}
SERVICES_DIR=${SERVICES_DIR:-src}

cd "$SERVICES_DIR/$SVC"

if [ "$SVC" = "analytics" ]; then
  ./gradlew --no-daemon :app:shadowJar
  exit 0
fi

node -v
npm -v
npm ci
npm test --if-present

if [ "$SVC" = "frontend-service" ]; then
  NODE_ENV=production npm run build --if-present
else
  npm run build --if-present
fi
