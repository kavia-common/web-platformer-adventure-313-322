#!/bin/bash
cd /tmp/kavia/workspace/code-generation/web-platformer-adventure-313-322/mario_clone_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

