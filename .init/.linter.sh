#!/bin/bash
cd /home/kavia/workspace/code-generation/recipe-explorer-38044-38054/recipe_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

