# syntax=docker/dockerfile:1

# OneFlow / PPG Workday — production image for Synology Container Manager
# Secrets are injected at runtime via compose / Container Manager. Never bake .env into the image.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure public/ exists so the runner COPY never fails when the repo has no public assets
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Harmless build-time default; production URL is supplied at runtime via compose
ARG NEXT_PUBLIC_APP_URL=https://oneflow.highrulez.com
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ARG ONEFLOW_UID=10001
ARG ONEFLOW_GID=10001
RUN addgroup -S -g ${ONEFLOW_GID} oneflow \
  && adduser -S -D -H -u ${ONEFLOW_UID} -G oneflow oneflow \
  && mkdir -p /app/data \
  && chown -R oneflow:oneflow /app/data

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER oneflow
EXPOSE 3000

# Runtime env (set by compose.yaml / Synology): AWS_*, SES_*, EMAIL_MODE,
# NEXT_PUBLIC_APP_URL — never hard-coded here. UI settings persist in /app/data.
# The Next.js process runs as oneflow (UID/GID 10001), never root.
CMD ["node", "server.js"]
