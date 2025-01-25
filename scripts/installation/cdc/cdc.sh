#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# download
wget -O /tmp/confluentinc-kafka-connect-elasticsearch-14.1.2.zip https://d2p6pa21dvn84.cloudfront.net/api/plugins/confluentinc/kafka-connect-elasticsearch/versions/14.1.2/confluentinc-kafka-connect-elasticsearch-14.1.2.zip
wget -O /tmp/mongodb-kafka-connect-mongodb-1.15.0.zip https://d2p6pa21dvn84.cloudfront.net/api/plugins/mongodb/kafka-connect-mongodb/versions/1.15.0/mongodb-kafka-connect-mongodb-1.15.0.zip
wget -O confluentinc-kafka-connect-avro-converter-7.8.0.zip https://d2p6pa21dvn84.cloudfront.net/api/plugins/confluentinc/kafka-connect-avro-converter/versions/7.8.0/confluentinc-kafka-connect-avro-converter-7.8.0.zip

# extract
unzip /tmp/confluentinc-kafka-connect-elasticsearch-14.1.2.zip
sudo mv /tmp/confluentinc-kafka-connect-elasticsearch-14.1.2 /tmp/confluentinc-kafka-connect-elasticsearch

unzip xvf /tmp/mongodb-kafka-connect-mongodb-1.15.0.zip
sudo mv /tmp/mongodb-kafka-connect-mongodb-1.15.0 /tmp/mongodb-kafka-connect-mongodb

unzip xvf /tmp/confluentinc-kafka-connect-avro-converter-7.8.0.zip
sudo mv /tmp/confluentinc-kafka-connect-avro-converter-7.8.0 /tmp/confluentinc-kafka-connect-avro-converter

# make directories for jars
sudo mkdir -p /usr/local/share/java/confluentinc-kafka-connect-elasticsearch/
sudo mkdir -p /usr/local/share/java/mongodb-kafka-connect-mongodb/
sudo mkdir -p /usr/local/share/java/confluentinc-kafka-connect-avro-converter/

# moving jars
sudo mv /tmp/confluentinc-kafka-connect-elasticsearch/lib/* /usr/local/share/java/confluentinc-kafka-connect-elasticsearch/
sudo mv /tmp/mongodb-kafka-connect-mongodb/lib/* /usr/local/share/java/mongodb-kafka-connect-mongodb/
sudo mv /tmp/confluentinc-kafka-connect-avro-converter/lib/* /usr/local/share/java/confluentinc-kafka-connect-avro-converter/

# setting up cdc connector/source/sink properties
sudo mkdir -p /etc/cdc-config/mynodeapp/
yes | sudo cp -rf ${SCRIPT_DIR}/conf/* /etc/cdc-config/mynodeapp/

# make directories for kafka cdc
sudo mkdir -p /usr/local/kafka/offsets/

# giving ownership
sudo chmod 777 /usr/local/share/java/
sudo chmod -R 777 /home/tareqjoy/workspace/MyNodeApp/src/search-service/src/conf/
sudo chmod -R 777 /usr/local/kafka/offsets/
sudo chmod -R 777 /etc/cdc-config/mynodeapp/

# setting up service file
yes | sudo cp -rf "${SCRIPT_DIR}/mongo-kafka-source.service" "/etc/systemd/system/"
yes | sudo cp -rf "${SCRIPT_DIR}/elasticsearch-kafka-sink.service" "/etc/systemd/system/"
sudo chmod 644 "/etc/systemd/system/mongo-kafka-source.service"
sudo chmod 644 "/etc/systemd/system/elasticsearch-kafka-sink.service"
systemctl daemon-reload
