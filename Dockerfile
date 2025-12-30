# Use the official Node.js 20 image.
# https://hub.docker.com/_/node
FROM node:20-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./

# Install production dependencies.
# If you add a package-lock.json speed your build by switching to 'npm ci'.
# RUN npm ci --only=production
RUN npm install --omit=dev

# Copy local code to the container image.
COPY . .

# Cloud Run sets the PORT env variable to 8080 by default.
# The app code must listen on this port.
ENV PORT=8080

# Run the web service on container startup.
CMD [ "npm", "start" ]
