#!/bin/bash

# https://reintech.io/blog/installing-configuring-prometheus-ubuntu-22
# Prometheus will run on http://localhost:9090/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
sudo mkdir -p /etc/prometheus
yes | sudo cp -rf "${SCRIPT_DIR}/prometheus.yml" "/etc/prometheus/"

# giving ownership
sudo chown prometheus:prometheus /usr/local/bin/prometheus
sudo chown prometheus:prometheus /usr/local/bin/promtool

# directory where Prometheus will store its data 
sudo mkdir /var/lib/prometheus
sudo chown -R prometheus:prometheus /etc/prometheus
sudo chown -R prometheus:prometheus /var/lib/prometheus

# creating service file
sudo cp "${SCRIPT_DIR}/prometheus.service" "/etc/systemd/system/"
sudo chmod 644 "/etc/systemd/system/prometheus.service"
systemctl daemon-reload

# install JMX Exporter
wget -O /tmp/jmx_prometheus_javaagent-1.0.1.jar https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/1.0.1/jmx_prometheus_javaagent-1.0.1.jar

# move to right destination
sudo mkdir -p /usr/local/share/prometheus/
sudo mv /tmp/jmx_prometheus_javaagent-1.0.1.jar /usr/local/share/prometheus/jmx_prometheus_javaagent.jar

# copy kafka jmx config
sudo mkdir -p /etc/kafka/
sudo cp "${SCRIPT_DIR}/kafka-jmx-metric.yaml" "/etc/kafka/"