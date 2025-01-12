#!/bin/bash
# create user
sudo useradd --no-create-home --shell /bin/false kafka

# download
wget -O /tmp/kafka_2.13-3.9.0.tgz https://dlcdn.apache.org/kafka/3.9.0/kafka_2.13-3.9.0.tgz

# extract
tar xvf /tmp/kafka_2.13-3.9.0.tgz -C /tmp/
sudo mv /tmp/kafka_2.13-3.9.0 /tmp/kafka

# move to right destination
sudo mkdir -p /usr/local/kafka/
sudo mv /tmp/kafka /usr/local/kafka/
sudo mkdir -p /data/kafka/
sudo mkdir -p /var/log/kafka/


# giving ownership
sudo chown -R kafka:kafka /usr/local/kafka/
sudo chown kafka:kafka /data/kafka/
sudo chown kafka:kafka /var/log/kafka/

# setting up service file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="kafka.service"
DEST_DIR="/etc/systemd/system"
yes | sudo cp -rf "${SCRIPT_DIR}/${SERVICE_FILE}" "${DEST_DIR}/"
sudo chmod 644 "${DEST_DIR}/${SERVICE_FILE}"
systemctl daemon-reload

# copying config file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="server.properties"
DEST_DIR="/usr/local/kafka/config/"
yes | sudo cp -rf "${SCRIPT_DIR}/${CONFIG_FILE}" "${DEST_DIR}/"

