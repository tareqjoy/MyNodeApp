#!/bin/bash

# how to run?
# build all: ./build.sh
# build specific services: ./build.sh --service-name timeline-service,auth-service

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
set -e

# Define available services
SERVICES=("timeline-service" "user-service" "follower-service" "fanout-service" "post-service" "search-service" "auth-service" "frontend-service" "file-service")

# Parse arguments (optional)
SERVICE_NAMES=""
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --service-name)
            SERVICE_NAMES="$2"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1"
            exit 1
            ;;
    esac
done

# Determine services to run (default to all)
if [[ -n "$SERVICE_NAMES" ]]; then
    IFS=',' read -ra SELECTED_SERVICES <<< "$SERVICE_NAMES"
else
    SELECTED_SERVICES=("${SERVICES[@]}")
fi

build_service() {
    local SERVICE="$1"
    echo "Building $SERVICE ..."
    cd "${SCRIPT_DIR}/src/$SERVICE" || { echo "Error: Directory src/$SERVICE not found"; exit 1; }
    npm install
    npm run build
    cd - >/dev/null
}

for SERVICE in "${SELECTED_SERVICES[@]}"; do
    if [[ " ${SERVICES[*]} " =~ " $SERVICE " ]]; then
        build_service "$SERVICE"
    else
        echo "Warning: Unknown service '$SERVICE', skipping."
    fi
done

echo "Done."
