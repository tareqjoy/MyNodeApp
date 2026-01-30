#!/bin/bash
set -euo pipefail

ROOT_DIR=${ROOT_DIR:-.}
SERVICES_DIR=${SERVICES_DIR:-src}
ALLOWED_SERVICES=${ALLOWED_SERVICES:-}
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
    echo "Shallow clone detected; fetching more history"
    git fetch --no-tags --prune --unshallow origin || git fetch --no-tags --prune --depth=200 origin
  fi
fi

base=""
if [ -n "$GIT_PREVIOUS_SUCCESSFUL_COMMIT" ] && [ "$GIT_PREVIOUS_SUCCESSFUL_COMMIT" != "null" ]; then
  base="$GIT_PREVIOUS_SUCCESSFUL_COMMIT"
  echo "Using GIT_PREVIOUS_SUCCESSFUL_COMMIT as base: $base"
elif [ -n "$GIT_PREVIOUS_COMMIT" ] && [ "$GIT_PREVIOUS_COMMIT" != "null" ]; then
  base="$GIT_PREVIOUS_COMMIT"
  echo "Using GIT_PREVIOUS_COMMIT as base: $base"
elif [ -n "$CHANGE_ID" ] && [ -n "$CHANGE_TARGET" ]; then
  git fetch --no-tags --prune origin "+refs/heads/${CHANGE_TARGET}:refs/remotes/origin/${CHANGE_TARGET}"
  base=$(git merge-base HEAD "origin/${CHANGE_TARGET}")
  echo "PR build detected (CHANGE_ID=${CHANGE_ID}), base=${base}"
else
  if git rev-parse HEAD~1 >/dev/null 2>&1; then
    base="HEAD~1"
    echo "Non-PR build, base=${base}"
  else
    base=""
    echo "Non-PR build, base=ALL"
  fi
fi

changed=""
if [ -n "$base" ]; then
  changed=$(git diff --name-only "$base"...HEAD | tr -d '\r' || true)
  echo "Diff range (merge-base): $base...HEAD"
else
  changed=$(find "$SERVICES_DIR" -maxdepth 2 -name package.json -print | sed 's|/package.json|/|')
fi

if [ -z "$changed" ]; then
  changed=$(git show --name-only --pretty="" HEAD | tr -d '\r' || true)
  if [ -n "$changed" ]; then
    echo "Fallback to HEAD file list"
  fi
fi

if [ -z "$changed" ]; then
  echo "No changed files detected; defaulting to all allowed services"
  changed=$(echo "$ALLOWED_SERVICES" | tr ',' '\n' | sed "s|^|$SERVICES_DIR/|")
fi

if [ -n "$changed" ]; then
  echo "Changed files:"
  echo "$changed" | sed 's/^/  - /'
else
  echo "No changed files detected"
fi

allowed_list=$(echo "$ALLOWED_SERVICES" | tr ',' ' ')
changed_services=()

if [ -n "$changed" ]; then
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    if [[ "$p" =~ ^${SERVICES_DIR}/([^/]+)/ ]]; then
      svc="${BASH_REMATCH[1]}"
      for allow in $allowed_list; do
        if [ "$svc" = "$allow" ]; then
          changed_services+=("$svc")
          break
        fi
      done
    fi
  done <<< "$changed"
fi

# de-dup
unique_services=()
for svc in "${changed_services[@]}"; do
  skip=0
  for u in "${unique_services[@]}"; do
    if [ "$svc" = "$u" ]; then
      skip=1
      break
    fi
  done
  if [ $skip -eq 0 ]; then
    unique_services+=("$svc")
  fi
 done

(IFS=','; echo "${unique_services[*]}")
