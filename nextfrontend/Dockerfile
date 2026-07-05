# nextfrontend/Dockerfile

# Use the official Node.js image
FROM node:18-buster

# Set the working directory inside the container
WORKDIR /app/nextfrontend

# Copy only package.json and package-lock.json for dependency installation
COPY nextfrontend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY ./nextfrontend .

# Expose the necessary port for the frontend
EXPOSE 3000

# Run the application
CMD ["npm", "run", "dev"]


