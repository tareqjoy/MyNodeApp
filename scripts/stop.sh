
#!/bin/bash

sudo systemctl stop prometheus && sudo systemctl --no-page status prometheus
sudo systemctl stop mongod-rs0-0 && systemctl --no-pager status mongod-rs0-0
sudo systemctl stop mongod-rs0-1 && systemctl --no-pager status mongod-rs0-1
sudo systemctl stop mongod-rs0-2 && systemctl --no-pager status mongod-rs0-2
sudo systemctl stop kafka && systemctl --no-pager status kafka
sudo systemctl stop zookeeper && systemctl --no-pager status zookeeper
sudo systemctl stop redis && systemctl --no-pager status redis
sudo systemctl stop neo4j && systemctl --no-pager status neo4j
sudo systemctl stop kibana.service && systemctl --no-pager status kibana.service
#sudo systemctl stop logstash.service && systemctl --no-pager status logstash.service 
sudo systemctl stop loki && systemctl --no-pager status loki
sudo systemctl stop elasticsearch.service && systemctl --no-pager status elasticsearch.service
sudo systemctl stop mongo-kafka-source.service && systemctl --no-pager status mongo-kafka-source.service
sudo systemctl stop elasticsearch-kafka-sink.service && systemctl --no-pager status elasticsearch-kafka-sink.service
sudo systemctl stop grafana-server && sudo systemctl --no-page status grafana-server 

minikube stop

echo "Done ..."