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

echo_msg "Starting MongoDB Admin Authentication Setup..."

# Step 1: Write Temporary mongod.conf Without Authentication
CONFIG_FILE="/etc/mongod.conf"

echo_msg "Writing temporary mongod.conf without authentication..."
if [ ! -f "$CONFIG_FILE" ]; then
  error_msg "Error: $CONFIG_FILE not found. Ensure MongoDB is installed."
fi

sudo bash -c "cat > $CONFIG_FILE" <<EOL
# mongod.conf

# for documentation of all options, see:
#   http://docs.mongodb.org/manual/reference/configuration-options/

# Where and how to store data.
storage:
  dbPath: /var/lib/mongodb
#  engine:
#  wiredTiger:

# where to write logging data.
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1

# how the process runs
processManagement:
  timeZoneInfo: /usr/share/zoneinfo

# Temporarily disabling authentication
#security:
  #authorization: enabled

#operationProfiling:

#replication:

#sharding:

## Enterprise-Only Options:

#auditLog:
EOL

echo_msg "Restarting MongoDB to apply changes..."
sudo systemctl restart mongod || error_msg "Error: Failed to restart MongoDB."

# Step 2: Create Admin User
echo_msg "Restarting MongoDB to apply changes..."
sudo systemctl restart mongod || error_msg "Error: Failed to restart MongoDB."

# Step 2: Wait for MongoDB to Start
echo_msg "Waiting for MongoDB to fully start..."
for i in {1..30}; do
  if mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo_msg "MongoDB is now running."
    break
  fi
  echo_msg "MongoDB is not ready yet. Retrying in 2 seconds..."
  sleep 2
done

if ! mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
  error_msg "MongoDB failed to start after waiting. Exiting."
fi


echo_msg "Creating admin user..."
mongosh <<EOF || error_msg "Error: Failed to create admin user."
use admin;
db.createUser({
  user: "admin",
  pwd: "adminpassword",
  roles: [{ role: "root", db: "admin" }]
});
EOF

echo_msg "Admin user created successfully."

# Step 3: Write Final mongod.conf With Authentication Enabled
echo_msg "Rewriting mongod.conf with authentication enabled..."
sudo bash -c "cat > $CONFIG_FILE" <<EOL
# mongod.conf

# for documentation of all options, see:
#   http://docs.mongodb.org/manual/reference/configuration-options/

# Where and how to store data.
storage:
  dbPath: /var/lib/mongodb
#  engine:
#  wiredTiger:

# where to write logging data.
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1

# how the process runs
processManagement:
  timeZoneInfo: /usr/share/zoneinfo

# Enabling authentication
security:
  authorization: enabled

#operationProfiling:

#replication:

#sharding:

## Enterprise-Only Options:

#auditLog:
EOL

echo_msg "Restarting MongoDB with authentication enabled..."
sudo systemctl restart mongod || error_msg "Error: Failed to restart MongoDB with authentication enabled."

echo_msg "MongoDB authentication setup completed."
