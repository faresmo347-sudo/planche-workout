#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/.bin/next dev -p 3000
  echo "Next.js process exited, restarting in 2s..." >> /home/z/my-project/dev-restart.log
  sleep 2
done
