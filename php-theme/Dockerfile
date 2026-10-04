FROM dunglas/frankenphp:1-php8.3

RUN install-php-extensions pdo_pgsql apcu mbstring

WORKDIR /app
COPY Caddyfile /etc/caddy/Caddyfile
COPY src /app/src
COPY templates /app/templates
COPY public /app/public

ENV SERVER_NAME=:80
ENV CACHE_TTL=60
EXPOSE 80
