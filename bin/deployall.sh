
#!/bin/bash

set -e

echo "Timeline service ..."
cd src/timeline-service/
docker build -t tareqjoy/timeline-service:latest .
docker push tareqjoy/timeline-service:latest
cd -

echo "User service ..."
cd src/user-service/
docker build -t tareqjoy/user-service:latest .
docker push tareqjoy/user-service:latest
cd -

echo "Follower service ..."
cd src/follower-service/
docker build -t tareqjoy/follower-service:latest .
docker push tareqjoy/follower-service:latest
cd -

echo "Fanout service ..."
cd src/fanout-service/
docker build -t tareqjoy/fanout-service:latest .
docker push tareqjoy/fanout-service:latest
cd -

echo "Post service ..."
cd src/post-service/
docker build -t tareqjoy/post-service:latest .
docker push tareqjoy/post-service:latest
cd -

echo "Kubernetes ..."
kubectl apply -f my-node-app-pod.yml --force
kubectl rollout restart deployment -n default

echo "Done ..."