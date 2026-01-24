# fluentbit
# run from ..<workspace>/scripts/kubernetes/helm/ directory

helm repo add fluent https://fluent.github.io/helm-charts
helm upgrade --install -f fluent-bit/values.yml fluent-bit fluent/fluent-bit

# https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm upgrade --install my-opentelemetry-collector open-telemetry/opentelemetry-collector \                                                                                                                       ─╯
  -n default \
  --set mode=daemonset \
  --set image.repository=otel/opentelemetry-collector-contrib \
  --set image.tag=0.122.0
