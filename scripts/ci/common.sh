#!/bin/bash
set -euo pipefail

log() {
  echo "[ci] $*"
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "Missing required command: $cmd" >&2
    exit 1
  }
}

check_version() {
  local cmd="$1"
  local want="$2"
  local got

  if [ -z "$want" ]; then
    return 0
  fi

  if ! got=$("$cmd" 2>/dev/null | head -n1); then
    echo "Failed to run $cmd for version check" >&2
    exit 1
  fi

  if ! echo "$got" | grep -q "$want"; then
    echo "Version mismatch for $cmd. Wanted: $want, Got: $got" >&2
    exit 1
  fi
}
