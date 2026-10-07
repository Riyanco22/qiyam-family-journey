FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application source
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose application port
EXPOSE 3000

# Run the web server
CMD ["npm", "start"]
