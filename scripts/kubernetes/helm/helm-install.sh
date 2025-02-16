# fluentbit
# run from ..<workspace>/scripts/kubernetes/helm/ directory

helm repo add fluent https://fluent.github.io/helm-charts
helm upgrade --install -f fluent-bit/values.yml fluent-bit fluent/fluent-bit