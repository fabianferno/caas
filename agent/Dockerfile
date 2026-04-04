FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY mcp-servers.json ./
COPY skills/ ./skills/
RUN mkdir -p data/memory data/whatsapp-session
ENTRYPOINT ["node", "dist/index.js"]
