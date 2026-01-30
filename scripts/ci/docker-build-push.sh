#!/bin/bash
set -euo pipefail

SVC=${1:?service name required}
SERVICES_DIR=${SERVICES_DIR:-src}
DOCKERHUB_NAMESPACE=${DOCKERHUB_NAMESPACE:?missing DOCKERHUB_NAMESPACE}
GIT_SHA=${GIT_SHA:?missing GIT_SHA}

IMAGE="${DOCKERHUB_NAMESPACE}/${SVC}:${GIT_SHA}"

docker build -t "$IMAGE" "$SERVICES_DIR/$SVC"
docker push "$IMAGE"

echo "$IMAGE"
