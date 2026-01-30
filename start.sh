
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
sudo systemctl start flink && systemctl --no-pager status flink
sudo systemctl start kibana.service && systemctl --no-pager status kibana.service
sudo systemctl start mongo-kafka-source.service && systemctl --no-pager status mongo-kafka-source.service
sudo systemctl start elasticsearch-kafka-sink.service && systemctl --no-pager status elasticsearch-kafka-sink.service
sudo systemctl start grafana-server && sudo systemctl --no-page status grafana-server 
sudo systemctl start jenkins && sudo systemctl --no-page status jenkins
minikube start

MOUNT_SRC="/data/mynodeapp/uploads"
MOUNT_DST="/data/mynodeapp/uploads"
MOUNT_LOG="/tmp/minikube-mount.log"
MOUNT_PID="/tmp/minikube-mount.pid"

if ! pgrep -f "minikube mount ${MOUNT_SRC}:${MOUNT_DST}" >/dev/null; then
  nohup minikube mount "${MOUNT_SRC}:${MOUNT_DST}" >"${MOUNT_LOG}" 2>&1 &
  echo $! > "${MOUNT_PID}"
fi

echo "Done ..."
