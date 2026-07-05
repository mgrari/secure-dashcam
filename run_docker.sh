#!/bin/bash

# Function to display messages
echo_msg() {
  echo -e "\033[1;32m$1\033[0m"
}

# Function to display error messages
error_msg() {
  echo -e "\033[1;31m$1\033[0m"
  exit 1
}

# Determine the directory of the script
SCRIPT_DIR=$(dirname "$(realpath "$0")")
PROJECT_DIR="$SCRIPT_DIR"
ENV_FILE="$SCRIPT_DIR/database/.env"

echo_msg "Using project directory: $PROJECT_DIR"
echo_msg "Using environment file: $ENV_FILE"

# Check if Docker Compose is installed
if ! [ -x "$(command -v docker-compose)" ]; then
  echo_msg "Docker Compose is not installed. Installing Docker Compose..."
  curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose || error_msg "Error: Failed to install Docker Compose."
  echo_msg "Docker Compose installed successfully."
fi

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
  error_msg "Error: .env file not found at $ENV_FILE"
fi

# Navigate to the project directory
echo_msg "Navigating to the project directory: $PROJECT_DIR"
cd "$PROJECT_DIR" || error_msg "Error: Directory not found."

# Stop and remove existing containers (if any)
echo_msg "Stopping and removing existing containers..."
docker-compose --env-file "$ENV_FILE" down --remove-orphans

# Remove unused images and volumes (optional cleanup)
#echo "Cleaning up unused Docker images and volumes..."
#docker system prune -f
#docker volume prune -f

# Build and start the containers
echo_msg "Building and starting Docker containers..."
docker-compose --env-file "$ENV_FILE" up --build -d || error_msg "Error: Failed to start Docker containers."

# Wait a few seconds to ensure services are up
echo_msg "Waiting for services to start..."
sleep 5

# Show running containers
echo_msg "Current running containers:"
docker ps

# Display website access information
echo_msg "Website should now be accessible:"
echo "  Frontend: https://localhost:3000"
echo "  Backend: https://localhost:8080"

exit 0
