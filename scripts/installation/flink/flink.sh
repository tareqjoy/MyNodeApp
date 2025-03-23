#!/bin/bash
# https://nightlies.apache.org/flink/flink-docs-release-1.20/docs/try-flink/local_installation/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# create user
sudo useradd --no-create-home --shell /bin/false flink

# download
wget -O /tmp/flink-1.20.1-bin-scala_2.12.tgz https://dlcdn.apache.org/flink/flink-1.20.1/flink-1.20.1-bin-scala_2.12.tgz

# extract
sudo tar xvf /tmp/flink-1.20.1-bin-scala_2.12.tgz -C /tmp/
sudo mv /tmp/flink-1.20.1 /tmp/flink

# move to right destination
sudo mv /tmp/flink/ /usr/local/
yes | sudo cp -rf "${SCRIPT_DIR}/config.yaml" "/usr/local/flink/conf/"

# giving ownership
sudo chown -R flink:flink /usr/local/flink/

# setting up service file
yes | sudo cp -rf "${SCRIPT_DIR}/flink.service" "/etc/systemd/system/"
sudo chmod 644 "/etc/systemd/system/flink.service"
systemctl daemon-reload

# runs at http://localhost:8081/#/overview

