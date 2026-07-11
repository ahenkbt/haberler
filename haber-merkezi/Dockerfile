# Haber Merkezi API — Railway (Yekpare monorepo dışı bağımsız servis)
FROM node:22-bookworm-slim

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.5 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY src ./src

RUN pnpm run build

ENV NODE_ENV=production

EXPOSE 3100

CMD ["pnpm", "run", "start:with-migrate"]
