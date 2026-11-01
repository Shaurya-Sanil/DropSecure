FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/

RUN npm install --workspace=backend

COPY backend ./backend

WORKDIR /app/backend
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app/backend

COPY backend/package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/src/db/migrations ./dist/db/migrations

EXPOSE 5000

CMD ["node", "dist/index.js"]
