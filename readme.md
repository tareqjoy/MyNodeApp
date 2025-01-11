# MyNodeApp

## Prerequisites
1. Docker Engine: https://docs.docker.com/engine/install/ubuntu/
2. Kubernetes: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
3. Minikube: https://minikube.sigs.k8s.io/docs/start/?arch=%2Flinux%2Fx86-64%2Fstable%2Fbinary+download
4. MongoDB: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/
   1. Create replica set: https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-for-testing/#std-label-server-replica-set-deploy-test
   2. get hostname: `hostname -I` and add the hostname in the replica set as well
5. Apache Zookeeper & Kafka: https://anishmahapatra.medium.com/how-to-set-up-kafka-on-ubuntu-6f68f6f37b3e
   1. use this directory to install: **/usr/local/kafka/**
   2. get hostname: `hostname -I`
   3. edit Kafka server file: `sudo vim /usr/local/kafka/config/server.properties`
   4. set this: 
      ```nginx
      listeners=PLAINTEXT://0.0.0.0:9092
      advertised.listeners=PLAINTEXT://<hostname>:9092 #Ex: 192.168.0.10:9092
      ```
6. Elasticsearch with apt-get: https://www.elastic.co/guide/en/elasticsearch/reference/current/deb.html
   1. wll be installed here: **/usr/share/elasticsearch/**
   2. Reset password: `sudo bin/elasticsearch-reset-password -u elastic -i`
      1. Set password: **elastic**
      2. Add to env var: 
         ```sh
         echo 'export ELASTIC_PASSWORD="elastic"' >> ~/.zshrc #or for bash ~/.bashrc
         source ~/.zshrc #or for bash ~/.bashrc
         ```
      3. Edit the config file: `sudo vim /etc/elasticsearch/elasticsearch.yml`
         ```nginx
         xpack.security.http.ssl:
            enabled: false #make it false
         
         xpack.security.transport.ssl:
            enabled: false #make it false
         ```
   3. Test if it is running
      1. Add permission: `sudo chmod 777 -R /etc/elasticsearch`
      2. Run this command: `curl -u elastic:$ELASTIC_PASSWORD http://localhost:9200 `
7. Kibana with apt-get: https://www.elastic.co/guide/en/kibana/current/deb.html
   1. wll be installed here: **/usr/share/kibana/**
   2. Edit the config file: `sudo vim /etc/kibana/kibana.yml`
      ```nginx
      elasticsearch.hosts: ['http://192.168.0.10:9200'] #change from https to http
      xpack.fleet.outputs: [{id: fleet-default-output, name: default, is_default: true, is_default_monitoring: true, type: elasticsearch, hosts: ['http://192.168.0.10:9200'], ca_trusted_fingerprint: 381127340b477d41dc1e67ef11b64e380b2d183d9ce63c2cb5c266fff86c2c59}] #change from https to http
      ```
   3. open in browser: http://localhost:5601/
   4. run this to get token & provide in the browser:
      ```sh
      sudo /usr/share/elasticsearch/bin/elasticsearch-create-enrollment-token --scope kibana
      ```
   5. run this to get verification code & provide in the browser:
      ```sh
      sudo /usr/share/kibana/bin/kibana-verification-code
      ```
8.  Redis with apt-get: https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/install-redis-on-linux/
    1.  get hostname: `hostname -I`
    2.  edit redis config file: `sudo vim /etc/redis/redis.conf`
    3.  set this: 
         ```nginx
         bind <hostname> -::1 #Ex: bind 192.168.0.10 -::1
         protected-mode no
         ```
9.   neo4j: https://neo4j.com/docs/operations-manual/current/installation/linux/debian/#debian-installation
     1.  get hostname: `hostname -I`
     2.  edit neo4j config file: `sudo vim /etc/neo4j/neo4j.conf`
     3.  Set this:
         ```nginx
         server.bolt.listen_address=<hostname>:7687 #Ex: 192.168.0.10:7687
         server.bolt.advertised_address=<hostname>:7687 #Ex: 192.168.0.10:7687
         ```
     4.  Default username: **neo4j**, default password: **neo4j**
     5.  Set password: `sudo neo4j-admin dbms set-initial-password 12345678` or `cypher-shell`
10. Flink with file download: https://nightlies.apache.org/flink/flink-docs-release-1.14/docs/try-flink/local_installation/
    1. use this directory to install: **/usr/local/flink/**
    2. See in UI: http://localhost:8081/
## How To Run
   1. Run the following commands. If any error occurs, see the Prerequisites section to setup.
       ```sh
       sudo chmod +x bin/start.sh
       bin/start.sh
       ```
   2. Run using kubectl
      ```sh
      # Kubernetes
      minikube start
      minikube dashboard
      
      # Running our applications
      cd ~/workspace/MyNodeApp
      kubectl apply -f my-node-app-pod.yml
      ```
      Or, run each services directly through `npm start` from the workspace 

## Updating code
1. Update new code from script:
    ```sh
    sudo chmod +x bin/deploy.sh
    bin/deploy.sh
    ```
    Or, update manually:
    ```sh
   # Upload new code to docker (example for timeline-service) 
    cd ~/workspace/MyNodeApp/src/timeline-service
    docker build -t tareqjoy/timeline-service:latest .
    docker push tareqjoy/timeline-service:latest 
   
   # Pull from docker
   cd ~/workspace/MyNodeApp/
   kubectl apply -f my-node-app-pod.yml --force  
   kubectl rollout restart -f my-node-app-pod.yml 
    ``` 
2. Update library:
   ```sh
   npm run build && npm version patch && npm publish --access public

   npm install --global lerna
   lerna bootstrap
   ```
## How To Test
API Testing:
Postman: https://learning.postman.com/docs/getting-started/installation/installation-and-updates/

   Import from this URL: https://api.postman.com/collections/9269695-0ca04905-9722-4019-839c-9d21be838f54?access_key=PMAT-01J3ARR3MWS8MYZ9T2BCGCSBR5

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
### MongoDB Index & Replica Set
1. Index creation on Post. It will create index on both { userId } & { userId, time }. The shard creation doesn't work.
   ```sh
   cd src/post-service
   npm run setup:db:createIndex
   ```
   
2. Shard creation on Post { userId, time } (doesn't work) 
   ```sh
   cd src/post-service
   npm run setup:db:createShard
   ```

3. Create replica set: https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-for-testing/#std-label-server-replica-set-deploy-test
   1. Use this command to create service file. Do it for all 3 replica sets.
      ```sh
      sudo nano /etc/systemd/system/mongod-rs0-1.service
      ```
   2. Use this template to create as service. Do it for all 3 replica sets.
      ```ini
      [Unit]
      Description=MongoDB Replica Set - Instance 0
      After=network.target

      [Service]
      User=mongodb
      ExecStart=/usr/bin/mongod --replSet rs0 --port 27017 --bind_ip localhost,192.168.0.10 --dbpath /srv/mongodb/rs0-0 --oplogSize 128 --logpath /var/log/mongodb/rs0-0.log --logappend
      ExecStop=/bin/kill -TERM $MAINPID
      Restart=always

      [Install]
      WantedBy=multi-user.target
      ```
   3. Run this command:
      ```sh
      sudo systemctl daemon-reload
      sudo chown -R mongodb:mongodb /srv/mongodb
      ```
   4. Run these to start the services:
      ```sh
      sudo systemctl start mongod-rs0-0
      sudo systemctl start mongod-rs0-1
      sudo systemctl start mongod-rs0-2
      ```
### CDC (Mongo to Elasticsearch):
1. Setup CDC
   1. Download these jars (Self-hosted option):
      1. ElasticSearch Sink Connector: https://www.confluent.io/hub/confluentinc/kafka-connect-elasticsearch
      2. MongoDB Connector: https://www.confluent.io/hub/mongodb/kafka-connect-mongodb
      3. Kafka Connect Avro Converter: https://www.confluent.io/hub/confluentinc/kafka-connect-avro-converter
   2. Extract the zips and move the jars from the **lib** directory to the plugin's root directory of the unzipped folder.
   3. Move them in the kafka plugin directory
      ```sh
      sudo mv mongodb-kafka-connect-mongodb /usr/local/share/java 
      sudo mv confluentinc-kafka-connect-elasticsearch /usr/local/share/java
      sudo mv confluentinc-kafka-connect-avro-converter /usr/local/share/java
      ```
      It will be like this structure: **/usr/local/share/java/mongodb-kafka-connect-mongodb/\<all jars\>**
   4. Give permission to public:
      ```
      sudo chmod 777 /usr/local/share/java/
      ```
2. Create CDC system service
   1. Use this command to create a service file.
      ```sh
      sudo nano /etc/systemd/system/mongo-kafka-source.service
      ```
   2. Use this template to create as service. Update the conf files location as necessary.
      ```ini
      [Unit]
      Description=Mongodb to Kafka connect
      After=network.target

      [Service]
      ExecStart=/usr/local/kafka/bin/connect-standalone.sh /home/tareqjoy/workspace/MyNodeApp/src/search-service/src/conf/connect-standalone-source.properties /home/tareqjoy/workspace/MyNodeApp/src/search-service/src/conf/mongodb-source-posts-connector.properties /home/tareqjoy/workspace/MyNodeApp/src/search-service/src/conf/mongodb-source-users-connector.properties
      ExecStop=/bin/kill -TERM $MAINPID
      Restart=always

      [Install]
      WantedBy=multi-user.target
      ```
   3. Use this command to create a service file.
      ```sh
      sudo nano /etc/systemd/system/elasticsearch-kafka-sink.service
      ```
   4. Use this template to create as service. Update the conf files location as necessary.
      ```ini
      [Unit]
      Description=Kafka to Elasticsearch connect
      After=network.target

      [Service]
      ExecStart=/usr/local/kafka/bin/connect-standalone.sh /home/tareqjoy/workspace/MyNodeApp/src/search-service/src/conf/connect-standalone-sink.properties /home/tareqjoy/workspace/MyNodeApp/src/search-service/src/conf/elasticsearch-sink-posts-connector.properties /home/tareqjoy/workspace/MyNodeApp/src/search-service/src/conf/elasticsearch-sink-users-connector.properties
      ExecStop=/bin/kill -TERM $MAINPID
      Restart=always

      [Install]
      WantedBy=multi-user.target
      ```
   5. Run these commands:
      ```sh
      sudo systemctl daemon-reload
      sudo chmod -R 777 /home/tareqjoy/workspace/MyNodeApp/src/search-service/src/conf/
      sudo mkdir /usr/local/kafka/offsets/
      sudo chmod -R 777 /usr/local/kafka/offsets
      ```
### Local Nginx:
   1. Install Nginx: https://ubuntu.com/tutorials/install-and-configure-nginx#1-overview
   2. Copy the config file:
      ```sh
      sudo cp /home/tareqjoy/workspace/MyNodeApp/assets/nginx_cors.conf /etc/nginx/snippets/nginx_cors.conf
      sudo cp /home/tareqjoy/workspace/MyNodeApp/assets/nginx.conf /etc/nginx/sites-enabled/default
      ```
   3. restart nginx process:
      ```sh
      sudo systemctl restart nginx
      ```