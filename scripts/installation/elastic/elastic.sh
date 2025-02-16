#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# setup apt for elastic services
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
sudo apt-get install apt-transport-https
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list

# ---------------------------------------------- install elsaticsearch ----------------------------------------------
sudo apt-get update && sudo apt-get install elasticsearch

# setup elasticsearch configuration
yes | sudo cp -rf "${SCRIPT_DIR}/elasticsearch.yml" "/etc/elasticsearch/"
yes | sudo cp -rf "${SCRIPT_DIR}/local.jvm.options" "/etc/elasticsearch/jvm.options.d/"
sudo chown elasticsearch:elasticsearch /etc/elasticsearch/elasticsearch.yml
sudo chown elasticsearch:elasticsearch /etc/elasticsearch/jvm.options.d/local.jvm.options

# setup elasticsearch password
sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic -i
echo 'export ELASTIC_PASSWORD="elastic"' >> ~/.zshrc #or for bash ~/.bashrc
source ~/.zshrc #or for bash ~/.bashrc

# ---------------------------------------------- install kibana ----------------------------------------------
sudo apt-get update && sudo apt-get install kibana

# setup kibana configuration
yes | sudo cp -rf "${SCRIPT_DIR}/kibana.yml" "/etc/kibana/"
sudo chown kibana:kibana /etc/kibana/kibana.yml

# open in browser: http://localhost:5601/

# connect elasticsearch with kibana
sudo /usr/share/elasticsearch/bin/elasticsearch-create-enrollment-token --scope kibana
sudo /usr/share/kibana/bin/kibana-verification-code

# ---------------------------------------------- install logstash ----------------------------------------------
sudo apt-get update && sudo apt-get install logstash

# setup logstash configuration
yes | sudo cp -rf "${SCRIPT_DIR}/logstash.yml" "/etc/logstash/"
yes | sudo cp -rf "${SCRIPT_DIR}/logstash.conf" "/etc/logstash/conf.d/"
sudo chown logstash:logstash /etc/logstash/logstash.yml