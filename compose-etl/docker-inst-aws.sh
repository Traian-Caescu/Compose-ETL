#!/bin/bash
sudo yum update -y
echo Install docker
sudo yum install docker -y
echo start docker
sudo service docker start
sudo chkconfig docker on
echo create docker group and add user
sudo usermod -a -G docker ec2-user

DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
mkdir -p $DOCKER_CONFIG/cli-plugins

curl -SL https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-linux-x86_64 -o $DOCKER_CONFIG/cli-plugins/docker-compose
chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

# or for all users
#sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose 


newgrp docker # select the new group