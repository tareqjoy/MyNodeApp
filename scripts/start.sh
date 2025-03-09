
#!/bin/bash

set -e

# sudo systemctl start nginx && sudo systemctl --no-page status nginx
sudo systemctl start prometheus && sudo systemctl --no-page status prometheus
sudo systemctl start mongod-rs0-0 && systemctl --no-pager status mongod-rs0-0
sudo systemctl start mongod-rs0-1 && systemctl --no-pager status mongod-rs0-1
sudo systemctl start mongod-rs0-2 && systemctl --no-pager status mongod-rs0-2
sudo systemctl start zookeeper && systemctl --no-pager status zookeeper
sudo systemctl start kafka && systemctl --no-pager status kafka
sudo systemctl start redis && systemctl --no-pager status redis
sudo systemctl start neo4j && systemctl --no-pager status neo4j
sudo systemctl start elasticsearch.service && systemctl --no-pager status elasticsearch.service
#sudo systemctl start logstash.service && systemctl --no-pager status logstash.service 
sudo systemctl start loki && systemctl --no-pager status loki
sudo systemctl start jaeger && systemctl --no-pager status jaeger
sudo systemctl start kibana.service && systemctl --no-pager status kibana.service
sudo systemctl start mongo-kafka-source.service && systemctl --no-pager status mongo-kafka-source.service
sudo systemctl start elasticsearch-kafka-sink.service && systemctl --no-pager status elasticsearch-kafka-sink.service
sudo systemctl start grafana-server && sudo systemctl --no-page status grafana-server 
minikube start

echo "Done ..."