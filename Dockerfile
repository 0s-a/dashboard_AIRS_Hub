# ─── Base ──────────────────────────────────────────────────────────────────────
    FROM node:24.11-alpine AS base
    RUN apk add --no-cache libc6-compat openssl ca-certificates
    LABEL version="1.0.0" description="Nawaat-CRM" author="Nawaat Team" license="MIT"
    WORKDIR /app

# ─── Development ───────────────────────────────────────────────────────────────
    FROM base AS development
    COPY package.json package-lock.json* ./
    RUN npm install
    COPY . .
    # Note: prisma generate runs at container startup via docker-compose command
    CMD ["npm", "run", "dev"]

# ─── Dependencies ──────────────────────────────────────────────────────────────
    FROM base AS deps
    COPY package.json package-lock.json* ./
    RUN npm ci
    LABEL  description="Nawaat-CRM" author="Nawaat Team" license="MIT"

# ─── Builder ───────────────────────────────────────────────────────────────────
    FROM base AS builder
    COPY --from=deps /app/node_modules ./node_modules
    COPY package.json package-lock.json* ./
    COPY prisma ./prisma

    RUN DATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public" npx prisma generate

    COPY . .
    RUN npm run build

# ─── Production ────────────────────────────────────────────────────────────────
    FROM base AS production
    ENV NODE_ENV=production

    ENV PORT=3000
    ENV HOSTNAME="0.0.0.0"

    # Install prisma CLI globally — pinned to match package.json (^5.x)
    RUN npm install -g prisma@5

    RUN mkdir -p /app/public/uploads && chown -R node:node /app/public/uploads

    COPY --from=builder /app/public ./public
    COPY --from=builder /app/.next/standalone ./
    COPY --from=builder /app/.next/static ./.next/static

    COPY --from=builder /app/prisma ./prisma
    COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
    COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma


    USER node

    EXPOSE 3000


CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]