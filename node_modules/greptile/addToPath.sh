#!/bin/bash

# Get the current directory
CURRENT_DIR=$(dirname "$(readlink -f "$0")")

# Check if the current directory is already in the PATH
if [[ ":$PATH:" == *":$CURRENT_DIR:"* ]]; then
  echo "Current directory '$CURRENT_DIR' is already in the PATH."
else
  # Add the current directory to the PATH in ~/.bashrc
  echo "export PATH=$CURRENT_DIR:\$PATH" >> ~/.bashrc
  echo "Current directory '$CURRENT_DIR' added to the PATH in ~/.bashrc. Changes will take effect after restarting the terminal."
fi
