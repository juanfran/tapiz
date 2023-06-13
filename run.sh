#!/bin/sh

API="${API}"
WS="${WS}"
FIREBASE_CONFIG="${FIREBASE_CONFIG}"

echo "{\"API\":\"$API\",\"WS\":\"$WS\"}" > /usr/share/nginx/html/assets/config.json

nginx -g 'daemon off;'
