#!/bin/bash

# how to run?
# build & deploy specific service: kubernetes/deploy.sh --service-name timeline-service --deploy-kubernetes    
# build & deploy all: kubernetes/deploy.sh --service-name all --deploy-kubernetes    
# only deployment: kubernetes/deploy.sh --deploy-kubernetes  

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
set -e

# Define available services
SERVICES=("timeline-service" "user-service" "follower-service" "fanout-service" "post-service" "search-service" "auth-service" "frontend-service")

# Parse arguments
SERVICE_NAMES=""
RUN_KUBERNETES=false
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --service-name)
            SERVICE_NAMES="$2"
            shift 2
            ;;
        --deploy-kubernetes)
            RUN_KUBERNETES=true
            shift 1
            ;;
        *)
            echo "Unknown argument: $1"
            exit 1
            ;;
    esac
done

# Ensure at least one flag is provided
if [[ -z "$SERVICE_NAMES" && "$RUN_KUBERNETES" = false ]]; then
    echo "Error: At least one of --service-name or --deploy-kubernetes must be provided."
    exit 1
fi

# Determine services to run
if [[ "$SERVICE_NAMES" == "all" ]]; then
    SELECTED_SERVICES=("${SERVICES[@]}")
elif [[ -n "$SERVICE_NAMES" ]]; then
    IFS=',' read -ra SELECTED_SERVICES <<< "$SERVICE_NAMES"
else
    SELECTED_SERVICES=()
fi

# Flag to track if any service is built
DOCKER_BUILT=false

# Function to build and push a service
deploy_service() {
    local SERVICE="$1"
    echo "Building and pushing $SERVICE ..."
    cd "src/$SERVICE" || { echo "Error: Directory src/$SERVICE not found"; exit 1; }
    docker build -t "tareqjoy/$SERVICE:latest" .
    docker push "tareqjoy/$SERVICE:latest"
    cd - >/dev/null
    DOCKER_BUILT=true
}

# Deploy selected services
for SERVICE in "${SELECTED_SERVICES[@]}"; do
    if [[ " ${SERVICES[*]} " =~ " $SERVICE " ]]; then
        deploy_service "$SERVICE"
    else
        echo "Warning: Unknown service '$SERVICE', skipping."
    fi
done

# Run Kubernetes deployment only if the flag is provided
if [ "$RUN_KUBERNETES" = true ]; then
    echo "Running Kubernetes deployment..."
    kubectl apply -f "${SCRIPT_DIR}/my-node-app-pod.yml" --force
    kubectl rollout restart deployment -n default
fi

echo "Done."

