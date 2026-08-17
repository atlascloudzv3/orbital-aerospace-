# Dockerfile to build the Node app
FROM node:18-alpine
WORKDIR /usr/src/app

# Install build deps for better-sqlite3 on Alpine
RUN apk add --no-cache python3 make g++ libc6-compat

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
