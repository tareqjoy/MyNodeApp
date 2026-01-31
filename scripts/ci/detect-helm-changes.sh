#!/bin/bash
set -euo pipefail

ROOT_DIR=${ROOT_DIR:-.}
CHANGE_ID=${CHANGE_ID:-}
CHANGE_TARGET=${CHANGE_TARGET:-}
GIT_PREVIOUS_SUCCESSFUL_COMMIT=${GIT_PREVIOUS_SUCCESSFUL_COMMIT:-}
GIT_PREVIOUS_COMMIT=${GIT_PREVIOUS_COMMIT:-}

cd "$ROOT_DIR"

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "Missing required command: $cmd" >&2
    exit 1
  }
}

require_cmd git

if git rev-parse --is-shallow-repository >/dev/null 2>&1; then
  if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then
    echo "Shallow clone detected; fetching more history" >&2
    git fetch --no-tags --prune --unshallow origin || git fetch --no-tags --prune --depth=200 origin
  fi
fi

base=""
if [ -n "$GIT_PREVIOUS_SUCCESSFUL_COMMIT" ] && [ "$GIT_PREVIOUS_SUCCESSFUL_COMMIT" != "null" ]; then
  base="$GIT_PREVIOUS_SUCCESSFUL_COMMIT"
  echo "Using GIT_PREVIOUS_SUCCESSFUL_COMMIT as base: $base" >&2
elif [ -n "$GIT_PREVIOUS_COMMIT" ] && [ "$GIT_PREVIOUS_COMMIT" != "null" ]; then
  base="$GIT_PREVIOUS_COMMIT"
  echo "Using GIT_PREVIOUS_COMMIT as base: $base" >&2
elif [ -n "$CHANGE_ID" ] && [ -n "$CHANGE_TARGET" ]; then
  git fetch --no-tags --prune origin "+refs/heads/${CHANGE_TARGET}:refs/remotes/origin/${CHANGE_TARGET}"
  base=$(git merge-base HEAD "origin/${CHANGE_TARGET}")
  echo "PR build detected (CHANGE_ID=${CHANGE_ID}), base=${base}" >&2
else
  if git rev-parse HEAD~1 >/dev/null 2>&1; then
    base="HEAD~1"
    echo "Non-PR build, base=${base}" >&2
  else
    base=""
    echo "Non-PR build, base=ALL" >&2
  fi
fi

changed=""
if [ -n "$base" ]; then
  changed=$(git diff --name-only "$base"...HEAD | tr -d '\r' || true)
  echo "Diff range (merge-base): $base...HEAD" >&2
else
  changed=$(git show --name-only --pretty="" HEAD | tr -d '\r' || true)
fi

if [ -z "$changed" ]; then
  echo "No changed files detected" >&2
fi

charts=()
if echo "$changed" | grep -q '^platform/helm/fluent-bit/'; then
  charts+=("fluent-bit")
fi
if echo "$changed" | grep -q '^platform/helm/otel-collector/'; then
  charts+=("otel-collector")
fi

if [ ${#charts[@]} -eq 0 ]; then
  echo ""
  exit 0
fi

(IFS=','; echo "${charts[*]}")
