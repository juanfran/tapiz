#!/bin/bash

WEB_IMAGE="tapiz-web"
API_IMAGE="tapiz-api"

function rebuild_web() {
    echo "Rebuilding and starting only the web service..."
    docker-compose down
    docker rmi $WEB_IMAGE
    docker-compose build web
    docker-compose up -d
}

function rebuild_api() {
    echo "Rebuilding and starting only the API service..."
    docker-compose down
    docker rmi $API_IMAGE
    docker-compose build api
    docker-compose up -d
}

function rebuild_all() {
    echo "Rebuilding and starting both web and API services..."
    docker-compose down
    docker rmi $WEB_IMAGE $API_IMAGE
    docker-compose build
    docker-compose up -d
}

# Parse command line arguments
if [[ $1 == "--web" ]]; then
    rebuild_web
elif [[ $1 == "--api" ]]; then
    rebuild_api
else
    rebuild_all
fi
