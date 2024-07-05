#!/bin/bash

WEB_IMAGE="tapiz-web"
API_IMAGE="tapiz-api"

docker-compose down

docker rmi $WEB_IMAGE $API_IMAGE

docker-compose build

docker-compose up -d
