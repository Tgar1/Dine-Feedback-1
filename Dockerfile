FROM node:26-alpine

WORKDIR /app/artifacts/api-server

COPY artifacts/api-server/package.json ./
COPY pnpm-lock.yaml ../../

RUN npm install -g pnpm
RUN pnpm install --no-frozen-lockfile --prefer-offline

COPY artifacts/api-server/. .

RUN pnpm run build

EXPOSE 5000
CMD ["pnpm", "run", "start"]s