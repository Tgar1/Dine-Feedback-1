FROM node:26-alpine

WORKDIR /app

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

COPY artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY lib/db/package.json ./lib/db/package.json

RUN npm install -g pnpm
RUN pnpm install --no-frozen-lockfile --prefer-offline

COPY artifacts/api-server ./artifacts/api-server/
COPY lib/db ./lib/db/

WORKDIR /app/artifacts/api-server

RUN pnpm run build

EXPOSE 5000

CMD ["pnpm", "run", "start"]