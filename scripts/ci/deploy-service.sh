#!/bin/bash
set -euo pipefail

SVC=${1:?service name required}
NS=${K8S_NAMESPACE:-default}
KUBECONFIG_FILE=${KUBECONFIG_FILE:?missing KUBECONFIG_FILE}
DOCKERHUB_NAMESPACE=${DOCKERHUB_NAMESPACE:?missing DOCKERHUB_NAMESPACE}
GIT_SHA=${GIT_SHA:?missing GIT_SHA}

if ! command -v kubectl >/dev/null 2>&1; then
  echo "Missing kubectl" >&2
  exit 1
fi

if ! command -v kustomize >/dev/null 2>&1; then
  echo "Missing kustomize" >&2
  exit 1
fi



export KUBECONFIG="$KUBECONFIG_FILE"

IMAGE="${DOCKERHUB_NAMESPACE}/${SVC}:${GIT_SHA}"
OVERLAY_DIR="src/$SVC/k8s/overlays/prod"

cd "$OVERLAY_DIR"

kustomize edit set image "$DOCKERHUB_NAMESPACE/$SVC=$IMAGE"
kustomize build . | kubectl -n "$NS" apply -f -

kubectl -n "$NS" rollout status "deploy/$SVC" --timeout=180s
