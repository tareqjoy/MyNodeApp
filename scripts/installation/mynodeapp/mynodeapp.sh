SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# giving ownership to npm to create logs
sudo mkdir -p /var/log/mynodeapp/
sudo chown -R $(whoami):$(whoami) /var/log/mynodeapp/