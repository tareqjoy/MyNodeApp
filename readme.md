# MyNodeApp

## Prerequisites
1. Docker Engine: https://docs.docker.com/engine/install/ubuntu/
2. Kubernetes: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
3. Minikube: https://minikube.sigs.k8s.io/docs/start/?arch=%2Flinux%2Fx86-64%2Fstable%2Fbinary+download
4. MongoDB: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/
5. Apache Zookeeper & Kafka: https://anishmahapatra.medium.com/how-to-set-up-kafka-on-ubuntu-6f68f6f37b3e
   1. use this directory to install: **/usr/local/kafka/**
   2. get hostname: `hostname -I`
   3. edit Kafka server file: `sudo vim /usr/local/kafka/config/server.properties`
   4. set this: 
   ```
   listeners=PLAINTEXT://0.0.0.0:9092
   advertised.listeners=PLAINTEXT://<hostname from step 2>:9092 #Ex: 192.168.0.10:9092
   ```
6. Elasticsearch: https://www.elastic.co/guide/en/elasticsearch/reference/current/targz.html
   1. use this directory to install: **/usr/local/elasticsearch/**
7. Logstash: https://www.elastic.co/guide/en/logstash/current/installing-logstash.html
8. Redis: https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/install-redis-on-linux/
   1. get hostname: `hostname -I`
   2. edit redis config file: `sudo vim /etc/redis/redis.conf`
   3. set this: 
   ```
   bind <hostname from step 1> -::1 #Ex: bind 192.168.0.10 -::1
   protected-mode no
   ```

   
## How To Run
   1. Run the following commands. If any error occurs, see the Prerequisites section to setup.
       ```
       sudo chmod +x bin/start-deps.sh
       bin/start-deps.sh
       ```
   2. Run using kubectl

      ```
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
    ```
    sudo chmod +x bin/deployall.sh
    bin/deployall.sh
    ```
    Or, update manually:
    ```
   # Upload new code to docker (example for timeline-service) 
    cd ~/workspace/MyNodeApp/src/timeline-service
    docker build -t tareqjoy/timeline-service:latest .
    docker push tareqjoy/timeline-service:latest 
   
   # Pull from docker
   cd ~/workspace/MyNodeApp/
   kubectl apply -f my-node-app-pod.yml --force  
   kubectl rollout restart -f my-node-app-pod.yml 
    ``` 
## How To Test
API Testing:
Postman: https://learning.postman.com/docs/getting-started/installation/installation-and-updates/

   Import from this URL: https://api.postman.com/collections/9269695-0ca04905-9722-4019-839c-9d21be838f54?access_key=PMAT-01J3ARR3MWS8MYZ9T2BCGCSBR5

## Debugging
- SSH to a Pod:
   ```
  kubectl exec -it timeline-service-745ffbc996-r2mfp -n default -- /bin/sh 
  ```
- Minikube to localhost connection test
   ```
   minikube ssh
  # kafka was running on 9092 port
   nc -vz host.minikube.internal 9092
   ```