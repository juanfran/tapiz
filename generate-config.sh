#!/bin/sh

API_URL="${API_URL}"
WS_URL="${WS_URL}"

echo "{\"API_URL\":\"$API_URL\",\"WS_URL\":\"$WS_URL\"}" > /usr/share/nginx/html/assets/config.json

nginx -g 'daemon off;'
