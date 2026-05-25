FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl ca-certificates
WORKDIR /app

# ---------------------------------
# مرحلة التطوير (Development)
FROM base AS development
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

# ---------------------------------
# مرحلة البناء (Builder)
FROM base AS builder
COPY package.json package-lock.json* ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# ---------------------------------
# مرحلة الإنتاج (Production)
FROM base AS production
ENV NODE_ENV=production

# نسخ الملفات الأساسية فقط من مرحلة البناء لتقليل الحجم
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

# تشغيل السيرفر مباشرة عبر Node بدلاً من npm
CMD ["node", "server.js"]