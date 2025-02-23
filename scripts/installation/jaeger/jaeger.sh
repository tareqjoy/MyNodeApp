#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# create user
sudo useradd --no-create-home --shell /bin/false jaeger

# download
wget -O /tmp/jaeger-2.3.0-linux-amd64.tar.gz https://github.com/jaegertracing/jaeger/releases/download/v1.66.0/jaeger-2.3.0-linux-amd64.tar.gz

# extract
tar xvf /tmp/jaeger-2.3.0-linux-amd64.tar.gz -C /tmp/
sudo mv /tmp/jaeger-2.3.0-linux-amd64 /tmp/jaeger

# move to right destination
sudo mv /tmp/jaeger/jaeger /usr/local/bin/
sudo mkdir -p /etc/jaeger
yes | sudo cp -rf "${SCRIPT_DIR}/jaeger.yml" "/etc/jaeger/"
yes | sudo cp -rf "${SCRIPT_DIR}/config-ui.json" "/etc/jaeger/"

# giving ownership
sudo chown jaeger:jaeger /usr/local/bin/jaeger
sudo chown -R jaeger:jaeger /etc/jaeger

# setting up service file
yes | sudo cp -rf "${SCRIPT_DIR}/jaeger.service" "/etc/systemd/system/"
sudo chmod 644 "/etc/systemd/system/jaeger.service"
systemctl daemon-reload


