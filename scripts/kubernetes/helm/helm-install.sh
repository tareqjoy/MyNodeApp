# fluentbit
# run from ..<workspace>/scripts/kubernetes/helm/ directory

helm repo add fluent https://fluent.github.io/helm-charts
helm upgrade --install -f fluent-bit/values.yml fluent-bit fluent/fluent-bit

# https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm upgrade --install -f otel-collector/values.yml my-opentelemetry-collector open-telemetry/opentelemetry-collector --set image.repository="otel/opentelemetry-collector-k8s" --set mode=daemonset 