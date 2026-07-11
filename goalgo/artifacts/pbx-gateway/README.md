# PBX Gateway — DEPRECATED

> **Bu servis kullanımdan kaldırıldı.** PBX artık **call.yekpare.net** (AgentLabs) üzerinden çalışır.
> Yeni kurulum: `goalgo/docs/PBX_KURULUM.md`

Eski Asterisk AMI / SIP köprüsü yaklaşımı yerine:

- Admin: `/admin/yekpare-ai-call/*`
- API: `/api/pbx/*` → AgentLabs vekili
- Temsilci: `/pbx` → AgentLabs team auth

`PBX_GATEWAY_URL` ve `pnpm run dev:pbx` artık gerekli değildir.
