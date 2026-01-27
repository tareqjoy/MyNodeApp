#!/bin/bash
# https://neo4j.com/docs/operations-manual/current/installation/linux/debian/#debian-installation
# Default username: **neo4j**, default password: **neo4j**

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Step 1: Download the key and store it in /etc/apt/keyrings
curl -fsSL https://debian.neo4j.com/neotechnology.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/neo4j.gpg

# Step 2: Add the Neo4j APT repository
echo "deb [signed-by=/etc/apt/keyrings/neo4j.gpg] https://debian.neo4j.com stable 5" | sudo tee /etc/apt/sources.list.d/neo4j.list

# Step 3: Update and install
sudo apt update
sudo apt install neo4j

yes | sudo cp -rf "${SCRIPT_DIR}/neo4j.conf" "/etc/neo4j/"

# Default username: **neo4j**, default password: **neo4j**
sudo neo4j-admin dbms set-initial-password 12345678
