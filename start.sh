#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if concurrently is installed
if ! command_exists concurrently; then
    echo "Installing concurrently..."
    npm install -g concurrently
fi

# Start both servers
echo "Starting ColorSense AI servers..."
concurrently "cd backend && python backenddriver.py" "cd frontend && npm start" 