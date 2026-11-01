FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./
COPY worker/package.json ./worker/

RUN npm install --workspace=worker

COPY worker ./worker

WORKDIR /app/worker
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app/worker

COPY worker/package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/worker/dist ./dist

CMD ["node", "dist/index.js"]
