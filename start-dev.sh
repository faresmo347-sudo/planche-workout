#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=1536"
exec node node_modules/.bin/next dev -p 3000
