#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ADVERTISE_IP="${ADVERTISE_IP:-$(
  hostname -I | tr ' ' '\n' | grep -E '^192\.168\.' | head -n1
)}"

if [[ -z "${ADVERTISE_IP}" ]]; then
  echo "ERROR: Could not detect ADVERTISE_IP (no 192.168.x.x found in hostname -I)"
  exit 1
fi

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

# Wait for mongod on 27017
for i in {1..60}; do
  if mongosh --quiet --port 27017 --eval 'db.runCommand({ping:1}).ok' >/dev/null 2>&1; then
    break
  fi
  sleep 1
done


# initiate if needed (ignore error if already initiated)
mongosh --quiet --port 27017 --eval "
rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: '${ADVERTISE_IP}:27017' },
    { _id: 1, host: '${ADVERTISE_IP}:27018' },
    { _id: 2, host: '${ADVERTISE_IP}:27019' }
  ]
})
" || true

# always force reconfig to desired hosts
mongosh --quiet --port 27017 --eval "
cfg = rs.conf();
cfg.members[0].host = '${ADVERTISE_IP}:27017';
cfg.members[1].host = '${ADVERTISE_IP}:27018';
cfg.members[2].host = '${ADVERTISE_IP}:27019';
rs.reconfig(cfg, {force:true});
"

echo
echo "Replica set member hosts:"
mongosh --quiet --port 27017 --eval "rs.conf().members.map(m => m.host)"
echo
echo "Pod connection string:"
echo "mongodb://${ADVERTISE_IP}:27017,${ADVERTISE_IP}:27018,${ADVERTISE_IP}:27019/?replicaSet=rs0"

