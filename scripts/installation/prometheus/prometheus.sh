#!/bin/bash
# create user
sudo useradd --no-create-home --shell /bin/false prometheus

# download
wget -O /tmp/prometheus-3.1.0.linux-amd64.tar.gz https://github.com/prometheus/prometheus/releases/download/v3.1.0/prometheus-3.1.0.linux-amd64.tar.gz 

# extract
tar xvf /tmp/prometheus-3.1.0.linux-amd64.tar.gz -C /tmp/
sudo mv /tmp/prometheus-3.1.0.linux-amd64 /tmp/prometheus

# move to right destination
sudo mv /tmp/prometheus/prometheus /usr/local/bin/
sudo mv /tmp/prometheus/promtool /usr/local/bin/
sudo mkdir /etc/prometheus
sudo mv /tmp/prometheus/prometheus.yml /etc/prometheus/prometheus.yml

# giving ownership
sudo chown prometheus:prometheus /usr/local/bin/prometheus
sudo chown prometheus:prometheus /usr/local/bin/promtool

# directory where Prometheus will store its data 
sudo mkdir /var/lib/prometheus
sudo chown prometheus:prometheus /etc/prometheus
sudo chown prometheus:prometheus /var/lib/prometheus

# creating service file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="prometheus.service"
DEST_DIR="/etc/systemd/system"
if [[ -f "${SCRIPT_DIR}/${SERVICE_FILE}" ]]; then
    sudo cp "${SCRIPT_DIR}/${SERVICE_FILE}" "${DEST_DIR}/"
fi
sudo chmod 644 "${DEST_DIR}/${SERVICE_FILE}"

# Reload systemd to recognize the new service
systemctl daemon-reload

# install JMX Exporter
wget -O jmx_prometheus_javaagent-1.0.1.jar https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/1.0.1/jmx_prometheus_javaagent-1.0.1.jar

# move to right destination
sudo mkdir /opt/jmx_exporter/
sudo mv /tmp/jmx_prometheus_javaagent-1.0.1.jar /opt/jmx_exporter/jmx_prometheus_javaagent.jar



sudo useradd --no-create-home --shell /bin/false kafka