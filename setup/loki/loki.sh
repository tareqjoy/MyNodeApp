#!/bin/bash

#https://grafana.com/docs/loki/latest/setup/install/local/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

sudo useradd --no-create-home --shell /bin/false loki

wget -O /tmp/loki-linux-amd64.zip https://github.com/grafana/loki/releases/download/v3.4.2/loki-linux-amd64.zip

sudo unzip /tmp/loki-linux-amd64.zip -d /tmp/loki-linux-amd64
sudo mv /tmp/loki-linux-amd64/loki-linux-amd64 /usr/local/bin/

sudo mkdir -p /etc/loki
yes | sudo cp -rf "${SCRIPT_DIR}/loki.yml" "/etc/loki/"

sudo chown loki:loki /usr/local/bin/loki-linux-amd64
sudo chown -R loki:loki /etc/loki

sudo cp "${SCRIPT_DIR}/loki.service" "/etc/systemd/system/"
sudo chmod 644 "/etc/systemd/system/loki.service"
systemctl daemon-reload