FROM node:26-alpine

WORKDIR /app

COPY pnpm-lock.yaml ./
COPY package.json ./
COPY artifacts/api-server/package.json ./artifacts/api-server/

RUN npm install -g pnpm
RUN pnpm install --no-frozen-lockfile

COPY . .

RUN cd artifacts/api-server && pnpm run build

WORKDIR /app/artifacts/api-server
EXPOSE 5000
CMD ["pnpm", "run", "start"]