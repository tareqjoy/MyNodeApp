# MyNodeApp

## Prerequisites

### Docker Engine

   1. <https://docs.docker.com/engine/install/ubuntu/>

### Kubernetes

   1. Kubernetes: <https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/>
   2. Minikube: <https://minikube.sigs.k8s.io/docs/start/?arch=%2Flinux%2Fx86-64%2Fstable%2Fbinary+download>
   3. Helm: <https://helm.sh/docs/intro/install/#from-apt-debianubuntu>
   4. Helm charts (OTEL & Fluent-bit), run from the root project dir:  `sudo chmod +x kubernetes/helm/helm-dep-install.sh && kubernetes/helm/helm-dep-install.sh`

### MongoDB

 1. run from the root project dir: `sudo chmod +x setup/mongodb/mongosh.sh && setup/mongodb/mongosh.sh`

### Apache Zookeeper & Kafka

 1. run from the root project dir: `sudo chmod +x setup/kafka/kafka.sh && setup/kafka/kafka.sh`

### Elasticsearch, Kibana, Logstash

 1. run from the root project dir: `sudo chmod +x setup/elastic-kibana-logstash/elastic.sh && setup/elastic-kibana-logstash/elastic.sh`
 2. Kibana web: http://localhost:5601/

### CDC (Mongo -> Kafka -> Elastic)

See more details here dir: `documentations/cdc.md`

 1. run from the root project dir: `sudo chmod +x setup/cdc/cdc.sh && setup/cdc/cdc.sh`

### Redis

 1. run from the root project dir: `sudo chmod +x setup/redis/redis.sh && setup/redis/redis.sh`

### neo4j

 1. run from the root project dir: `sudo chmod +x setup/neo4j/neo4j.sh && setup/neo4j/neo4j.sh`

### Flink with file download

   1. run from the root project dir: `sudo chmod +x setup/flink/flink.sh && setup/flink/flink.sh`
   2. UI: http://localhost:8081/

### Grafana with apt-get

https://grafana.com/docs/grafana/latest/setup-grafana/installation/debian/

   1. Grafana will start at: http://localhost:3000. username: **admin** & password: **admin**
   2. See additional details to continue
   3. Install kafka monitoring in Grafana:
      ```sh
      grafana-cli plugins install hamedkarbasi93-kafka-datasource
      ```

### Prometheus

   1. run from the root project dir: `sudo chmod +x setup/prometheus/prometheus.sh && setup/prometheus/prometheus.sh`
   2. UI: http://localhost:9090/

### Jaeger

   1. run from the root project dir: `sudo chmod +x setup/jaeger/jaeger.sh && setup/jaeger/jaeger.sh`
   2. UI: http://localhost:16686/

### nginx

   1. run from the root project dir: `sudo chmod +x setup/nginx/nginx.sh && setup/nginx/nginx.sh`

### Node.js

   1. <https://nodejs.org/en/download/current>

### Postman

   1. <https://learning.postman.com/docs/getting-started/installation/installation-and-updates/>
   >

### Jenkins

   1. run from the root project dir: `sudo chmod +x setup/jenkins/jenkins.sh && setup/jenkins/jenkins.sh`
   2. UI: http://localhost:8080/
   3. Get the admin password here: `sudo less /var/lib/jenkins/secrets/initialAdminPassword`

## Setup and Run in Kubernetes!

   1. Start the dependencies/prerequisites, run from the root project dir: `sudo chmod +x ./start.sh && ./start.sh`
      1. Follow the logs to see if any dependency failed to start. Try with systemctl status to see if anything failed, for example: `systemctl status jaeger`. 
      2. If failed then use journalctl to see the logs: for example: `journalctl -xeu jaeger`.
   2. Start kubernetes local cluster: `minikube start`
   3. Deploy the services, if not already: `kubectl apply -f kubernetes/my-node-app-pod.yml`
   4. Open the minikube UI in the browser: `minikube dashboard`
   5. Get the minikube IP: `minikube ip`. Probably it is: `192.168.49.2`
   6. Goto the IP in the browser. For example: <http://192.168.49.1/>

## Setup and Run Locally!

   1. If you haven't already, start the dependencies/prerequisites, run from the root project dir: `sudo chmod +x ./start.sh && ./start.sh`
      1. Follow the logs to see if any dependency failed to start. Try with systemctl status to see if anything failed, for example: `systemctl status jaeger`. 
      2. If failed then use journalctl to see the logs: for example: `journalctl -xeu jaeger`.
   2. Open the **MyNodeApp** repo in VS Code. It will start all of the services running directly with their dedicated port. Or manually run each service: `npm run dev`
   3. Visit in the browser: <http://localhost/>

## Updating code

1. Change code in the repo. Then run to see if the code is compiling: `npm run dev`
2. Upload to Dockerhub:
    ```sh
    sudo chmod +x deploy.sh
    ./deploy.sh --service-name all --deploy-kubernetes # Deploying everything to Docker, then deploy to Kubernetes
    ./deploy.sh --service-name fanout-service # Deploying only fanout-service to Docker
    ```

3. Upload library code to NPM:
   ```sh
   npm login #if not logged in
   npm run build && npm version patch && npm publish --access public
   ```


## Debugging

- SSH to a Pod:
   ```sh
  kubectl exec -it timeline-service-745ffbc996-r2mfp -n default -- /bin/sh 
  ```
- Minikube to localhost connection test
   ```sh
   minikube ssh
  # kafka was running on 9092 port
   nc -vz host.minikube.internal 9092
   ```
- See logstash log
   ```sh
   sudo less /var/log/logstash/logstash-plain.log 
   ```
- See all kafka topics
   ```sh
   bin/kafka-topics.sh --bootstrap-server localhost:9092 --list 
   ```

## Additional setup

### MongoDB Index

1. Index creation on Post. It will create index on both { userId } & { userId, time }.
   ```sh
   cd src/post-service
   npm run setup:db:createIndex
   ```
   
2. Shard creation on Post { userId, time } (doesn't work) 
   ```sh
   cd src/post-service
   npm run setup:db:createShard
   ```
