# apps/web/Dockerfile

# --- Stage 1: Build ---
FROM oven/bun:latest AS builder
WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Install dependencies
RUN bun install --frozen-lockfile

WORKDIR /app/apps/web

# Accept the WebSocket URL and public site URL as arguments during build time
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Operator details for the imprint (kept out of the public repo, supplied at build time)
ARG NEXT_PUBLIC_LEGAL_NAME
ENV NEXT_PUBLIC_LEGAL_NAME=$NEXT_PUBLIC_LEGAL_NAME
ARG NEXT_PUBLIC_LEGAL_ADDRESS
ENV NEXT_PUBLIC_LEGAL_ADDRESS=$NEXT_PUBLIC_LEGAL_ADDRESS
ARG NEXT_PUBLIC_LEGAL_EMAIL
ENV NEXT_PUBLIC_LEGAL_EMAIL=$NEXT_PUBLIC_LEGAL_EMAIL
ARG NEXT_PUBLIC_LEGAL_PHONE
ENV NEXT_PUBLIC_LEGAL_PHONE=$NEXT_PUBLIC_LEGAL_PHONE

# Build the Next.js app
RUN bun run build

# --- Stage 2: Runner ---
FROM oven/bun:latest AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from the builder stage
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/node_module[s] ./apps/web/node_modules

WORKDIR /app/apps/web

# Expose the frontend port
EXPOSE 3000

# Start the Next.js production server
CMD ["bunx", "next", "start"]