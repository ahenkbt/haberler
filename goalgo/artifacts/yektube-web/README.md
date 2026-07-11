# Yektube v2 Web

YouTube-parite video platformu — mobil PWA + masaüstü.

## Hızlı başlangıç

```bash
cd goalgo
pnpm install
pnpm dev:api      # :3000
pnpm dev:yektube  # :5174
```

**URL:** http://localhost:5174/yektube-v2/

> **ERR_FAILED / bağlantı hatası?** `pnpm dev:yektube` çalışmıyor demektir. Ayrı terminalde `pnpm dev:api` (:3000) de gerekir.

## Sorun giderme

| Belirti | Olası neden | Çözüm |
|---------|-------------|--------|
| `ERR_FAILED` :5174 | Vite sunucusu kapalı | `cd goalgo && pnpm dev:yektube` |
| Boş feed / API hatası | API kapalı | `pnpm dev:api` |
| 404 kök `/` | Base path | `/yektube-v2/` kullanın |

## Dokümantasyon

- [Proje tanımı](../../docs/yektube-v2/PROJECT.md)
- [Yol haritası](../../docs/yektube-v2/ROADMAP.md)
- [Mimari](../../docs/yektube-v2/ARCHITECTURE.md)

## Yapı

```
src/
├── shell/          AppShell (mobil + masaüstü)
├── features/       home, shorts, subscriptions, search, watch
├── lib/
└── styles/
```

## Ortam

| Değişken | Varsayılan |
|----------|------------|
| `PORT` | 5174 |
| `BASE_PATH` | `/yektube-v2/` |
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:3000` |
