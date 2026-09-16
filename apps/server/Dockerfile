# apps/server/Dockerfile

FROM oven/bun:latest
WORKDIR /app

# Copy the root configuration and workspace lockfile
COPY package.json bun.lock tsconfig.base.json ./

# Copy the shared package and the server package
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Install dependencies across the workspace using bun
RUN bun install --frozen-lockfile

# Move into the server workspace
WORKDIR /app/apps/server

RUN bun run build

# Expose the WebSocket port
EXPOSE 3001

# Start the server (adjust this if you have a specific 'start' script for production)
CMD ["bun", "run", "start"]