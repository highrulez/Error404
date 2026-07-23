# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time public URL only — never pass AWS secrets as build args
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Runtime secrets injected by Synology Container Manager / compose:
# EMAIL_MODE, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
# SES_FROM_EMAIL, SES_FROM_NAME, NEXT_PUBLIC_APP_URL, EMAIL_RECIPIENT_MAP
RUN addgroup -S oneflow && adduser -S oneflow -G oneflow
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER oneflow
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Outbound HTTPS to AWS SES is required; no inbound AWS ports needed.
CMD ["node", "server.js"]
