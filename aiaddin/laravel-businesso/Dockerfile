# Aiaddin — Businesso (Laravel 9) — Railway / Docker (kök = laravel-businesso)
# Tüm kaynak önce kopyalanır; composer.json classmap database/seeds ve factories ister.
FROM php:8.2-cli-bookworm

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1

RUN apt-get update && apt-get install -y --no-install-recommends \
    default-mysql-client \
    git unzip libzip-dev libpng-dev libonig-dev libicu-dev libxml2-dev \
    libfreetype6-dev libjpeg62-turbo-dev libwebp-dev \
    && docker-php-ext-configure intl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) intl pdo_mysql zip mbstring exif bcmath gd opcache dom \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY . .

COPY docker-entrypoint.sh /usr/local/bin/aiaddin-entrypoint.sh
RUN chmod +x /usr/local/bin/aiaddin-entrypoint.sh

RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts \
    && composer dump-autoload --optimize --classmap-authoritative \
    && mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache storage/logs bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache \
    && mkdir -p resources/views/vendor/installer public/installer \
    && cp -R vendor/rachidlaasri/laravel-installer/src/Views/. resources/views/vendor/installer/ \
    && cp -R vendor/rachidlaasri/laravel-installer/src/assets/. public/installer/

ENV PORT=8080 \
    LOG_CHANNEL=stderr

EXPOSE 8080

CMD ["/usr/local/bin/aiaddin-entrypoint.sh"]
