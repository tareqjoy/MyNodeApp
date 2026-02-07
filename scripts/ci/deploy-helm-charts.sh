#!/bin/bash
set -euo pipefail

KUBECONFIG_FILE=${KUBECONFIG_FILE:?missing KUBECONFIG_FILE}
NS=${K8S_NAMESPACE:-default}
CHARTS=${1:-}

if [ -z "$CHARTS" ]; then
  echo "No helm charts to deploy"
  exit 0
fi

export KUBECONFIG="$KUBECONFIG_FILE"

cd platform/helm

helm repo add fluent https://fluent.github.io/helm-charts >/dev/null 2>&1 || true
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts >/dev/null 2>&1 || true
helm repo add flink-kubernetes-operator-1.13.0 https://archive.apache.org/dist/flink/flink-kubernetes-operator-1.13.0/ >/dev/null 2>&1 || true
helm repo update >/dev/null

IFS=',' read -r -a list <<< "$CHARTS"
for chart in "${list[@]}"; do
  case "$chart" in
    fluent-bit)
      helm upgrade --install -n "$NS" --create-namespace -f fluent-bit/values.yml fluent-bit fluent/fluent-bit
      ;;
    otel-collector)
      helm upgrade --install -n "$NS" --create-namespace -f otel-collector/values.yml my-opentelemetry-collector open-telemetry/opentelemetry-collector \
        --set mode=daemonset \
        --set image.repository=otel/opentelemetry-collector-contrib \
        --set image.tag=0.122.0
      ;;
    flink-kubernetes-operator)
      helm upgrade --install -n flink --create-namespace -f flink-kubernetes-operator/values.yml flink-kubernetes-operator flink-kubernetes-operator-1.13.0/flink-kubernetes-operator
      ;;
    *)
      echo "Unknown chart: $chart" >&2
      exit 1
      ;;
  esac
done
