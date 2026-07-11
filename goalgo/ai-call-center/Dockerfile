# Yekpare AI Call (AgentLabs v5.3.8) — Railway / Docker
# Railway → Root Directory: goalgo/ai-call-center
#
# Eklentiler imaja AgentLabs-Package/AgentLabs-v5.3.8/plugins/ ile girer (git'e eklenmeli).
# Yerelde güncellemek: cd goalgo → .\scripts\sync-plugins.ps1
# Repoya ekleme: cd goalgo → .\scripts\git-add-ai-call-center.ps1

FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends postgresql-client openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY AgentLabs-Package/AgentLabs-v5.3.8/package.json AgentLabs-Package/AgentLabs-v5.3.8/package-lock.json ./
RUN npm ci

COPY AgentLabs-Package/AgentLabs-v5.3.8/ ./

# Railway yalnizca git'teki dosyalari gonderir; eklentiler plugins/ altinda commit edilmeli
RUN set -e; \
  for p in messaging sip-engine team-management rest-api; do \
    if [ ! -f "plugins/$p/plugin.json" ]; then \
      echo "HATA: plugins/$p eksik. Yerelde: goalgo\\scripts\\sync-plugins.ps1"; \
      echo "       Sonra: goalgo\\scripts\\git-add-ai-call-center.ps1 ve git push"; \
      exit 1; \
    fi; \
  done

# Vite embeds VITE_* at build time (Railway Variables → build args)
ARG VITE_DEFAULT_LOCALE=tr
ENV VITE_DEFAULT_LOCALE=${VITE_DEFAULT_LOCALE}

RUN node scripts/build-server-deps.js \
  && node scripts/build-plugin-backend.js \
  && node scripts/build-plugins.js \
  && npm run build

RUN chmod +x scripts/railway-start.sh

ENV NODE_ENV=production
EXPOSE 5000

CMD ["sh", "scripts/railway-start.sh"]
