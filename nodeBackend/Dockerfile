# nodeBackend/Dockerfile

# Use the official Node.js image
FROM node:18-buster

# Set the environment variables for MongoDB
ENV ACCESS_TOKEN_SECRET="secret"
ENV DB_URL="mongodb://admin:adminpassword@mongodb:27017/?authSource=admin"


# Set the working directory inside the container
WORKDIR /app/nodeBackend

# Copy only package.json and package-lock.json to the container first for caching dependencies
COPY nodeBackend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY ./nodeBackend .

# Expose the necessary port
EXPOSE 8080

# Run the application
CMD ["npm", "run", "dev"]
