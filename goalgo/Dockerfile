# Goalgo API — Railway / Docker (monorepo kökü: bu dosyanın olduğu klasör = `goalgo`)
# deploy-rev: 2026-07-17-sitemap-tepe (Render auto-deploy tetik)
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends \
  openssl ca-certificates \
  chromium \
  fonts-liberation \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libgbm1 libasound2 \
  && rm -rf /var/lib/apt/lists/*

ENV CHROMIUM_PATH=/usr/bin/chromium

RUN corepack enable && corepack prepare pnpm@9.15.5 --activate

# Monorepo kök tsconfig zinciri (artifacts/api-server ve lib/* ../../tsconfig.base.json kullanır).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
RUN test -f tsconfig.base.json
RUN printf '%s\n' 'auto-install-peers=false' 'strict-peer-dependencies=false' > .npmrc
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts
COPY data ./data
COPY işletmeler ./işletmeler

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/ahenkpress run build
RUN pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start:with-migrate"]
