#!/bin/bash

#https://ubuntu.com/tutorials/install-and-configure-nginx#1-overview


SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# install
sudo apt update
sudo apt install nginx


# copy config files
yes | sudo cp "${SCRIPT_DIR}/my-node-app.conf" "/etc/nginx/sites-available/"
yes | sudo cp "${SCRIPT_DIR}/nginx_cors.conf" "/etc/nginx/snippets/"

# enabling by creating a symbolic link
sudo ln -s /etc/nginx/sites-available/my-node-app.conf /etc/nginx/sites-enabled/