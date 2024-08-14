
#!/bin/bash

set -e

sudo service mongod start
sudo systemctl start zookeeper && systemctl --no-pager status zookeeper
sudo systemctl start kafka && systemctl --no-pager status kafka
sudo systemctl start redis && systemctl --no-pager status redis
sudo systemctl enable neo4j && systemctl --no-pager status neo4j

echo "Done ..."