#!/bin/bash
set -euo pipefail

NS=${K8S_NAMESPACE:-default}
KUBECONFIG_FILE=${KUBECONFIG_FILE:?missing KUBECONFIG_FILE}

export KUBECONFIG="$KUBECONFIG_FILE"

kubectl get ns "$NS" >/dev/null 2>&1 || kubectl create ns "$NS"

kustomize build envs/prod-platform | kubectl -n "$NS" apply -f -
