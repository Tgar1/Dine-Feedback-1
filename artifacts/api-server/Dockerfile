FROM node:26-alpine

WORKDIR /app

# Copy root-level files
COPY ../../pnpm-lock.yaml ./
COPY ../../package.json ./
COPY ../../pnpm-workspace.yaml ./

# Copy api-server
COPY . ./artifacts/api-server/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --no-frozen-lockfile --prefer-offline

# Build
RUN cd artifacts/api-server && pnpm run build

# Run
WORKDIR /app/artifacts/api-server
EXPOSE 5000
CMD ["pnpm", "run", "start"]