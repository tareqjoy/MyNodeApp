#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
yes | sudo cp -rf "${SCRIPT_DIR}/kafka.service" "/etc/systemd/system/"
yes | sudo cp -rf "${SCRIPT_DIR}/zookeeper.service" "/etc/systemd/system/"
sudo chmod 644 "/etc/systemd/system/kafka.service"
sudo chmod 644 "/etc/systemd/system/zookeeper.service"
systemctl daemon-reload

# copying config file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="server.properties"
yes | sudo cp -rf "${SCRIPT_DIR}/${CONFIG_FILE}" "/usr/local/kafka/config/"

