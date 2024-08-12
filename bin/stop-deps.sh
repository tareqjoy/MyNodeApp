
#!/bin/bash

sudo service mongod stop
sudo systemctl stop kafka && systemctl --no-pager status kafka
sudo systemctl stop zookeeper && systemctl --no-pager status zookeeper
sudo systemctl stop redis && systemctl --no-pager status redis

echo "Done ..."