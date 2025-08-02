#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

sudo apt-get install gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg \
   --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# creating mongosh 
sudo apt-get install gnupg
wget -qO- https://www.mongodb.org/static/pgp/server-8.0.asc | sudo tee /etc/apt/trusted.gpg.d/server-8.0.asc
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt-get update
sudo apt-get install -y mongodb-mongosh

# setting up replica set directories
sudo mkdir -p /srv/mongodb/rs0-0  /srv/mongodb/rs0-1 /srv/mongodb/rs0-2

# giving ownership
sudo chown -R mongodb:mongodb /srv/mongodb/rs0-0
sudo chown -R mongodb:mongodb /srv/mongodb/rs0-1
sudo chown -R mongodb:mongodb /srv/mongodb/rs0-2

# setting up service file
yes | sudo cp -rf "${SCRIPT_DIR}/mongod-rs0-0.service" "/etc/systemd/system/"
yes | sudo cp -rf "${SCRIPT_DIR}/mongod-rs0-1.service" "/etc/systemd/system/"
yes | sudo cp -rf "${SCRIPT_DIR}/mongod-rs0-2.service" "/etc/systemd/system/"
sudo chmod 644 "/etc/systemd/system/mongod-rs0-0.service"
sudo chmod 644 "/etc/systemd/system/mongod-rs0-1.service"
sudo chmod 644 "/etc/systemd/system/mongod-rs0-2.service"
systemctl daemon-reload

sudo systemctl start mongod-rs0-0 && systemctl --no-pager status mongod-rs0-0
sudo systemctl start mongod-rs0-1 && systemctl --no-pager status mongod-rs0-1
sudo systemctl start mongod-rs0-2 && systemctl --no-pager status mongod-rs0-2

# goto: 1. mongosh --port 27017 
#       or 2. mongosh "mongodb://localhost:27017,localhost:27018,localhost:27019/?replicaSet=rs0"  
# add replica set configuration like this:
'''
 rsconf = {
  _id: "rs0",
  members: [
    {
     _id: 0,
     host: "127.0.0.1:27017"
    },
    {
     _id: 1,
     host: "127.0.0.1:27018"
    },
    {
     _id: 2,
     host: "127.0.0.1:27019"
    }
   ]
}
'''
# rs.initiate( rsconf )

# to verify: rs.status()
