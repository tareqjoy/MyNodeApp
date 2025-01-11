#!/bin/bash
# create user
sudo useradd --no-create-home --shell /bin/false prometheus
# download
wget -O /tmp/prometheus-3.1.0.linux-amd64.tar.gz https://github.com/prometheus/prometheus/releases/download/v3.1.0/prometheus-3.1.0.linux-amd64.tar.gz 
# extract
tar xvf prometheus-3.1.0.linux-amd64.tar.gz
sudo mv prometheus-3.1.0.linux-amd64 prometheus
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
sudo touch /etc/systemd/system/prometheus.service
SERVICE_FILE="/etc/systemd/system/prometheus.service"
sudo bash -c "cat <<EOL > $SERVICE_FILE
[Unit]
Description=Prometheus Monitoring System
Documentation=https://prometheus.io/docs/introduction/overview/
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/var/lib/prometheus --web.enable-lifecycle

[Install]
WantedBy=multi-user.target
EOL"
sudo chmod 644 "$SERVICE_FILE"

# Reload systemd to recognize the new service
systemctl daemon-reload


