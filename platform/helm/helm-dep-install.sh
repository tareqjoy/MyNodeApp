# fluentbit
# run from ..<workspace>/scripts/kubernetes/helm/ directory

helm repo add fluent https://fluent.github.io/helm-charts
helm upgrade --install -f fluent-bit/values.yml fluent-bit fluent/fluent-bit

# https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm upgrade --install -f otel-collector/values.yml my-opentelemetry-collector open-telemetry/opentelemetry-collector --set mode=daemonset --set image.repository=otel/opentelemetry-collector-contrib --set image.tag=0.122.0

# https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.14/docs/try-flink-kubernetes-operator/quick-start/
helm repo add flink-kubernetes-operator-1.13.0 https://archive.apache.org/dist/flink/flink-kubernetes-operator-1.14.0/
helm upgrade --install -n flink --create-namespace -f flink-kubernetes-operator/values.yml flink-kubernetes-operator flink-kubernetes-operator-1.13.0/flink-kubernetes-operator
