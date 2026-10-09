/**
 * alladdin.app — "Alladdin Haber Sitesi Yazılımı" marketing site (alladdin-site 2026-10-09; user request 10:02/10:04 TRT).
 * SEPARATE site from goalgo.com.tr (hm-goalgo-com-tr.js): own content, canonical, sitemap, schema. No cross-redirects.
 * Server-rendered by the haberler Worker for every UA.
 * Passes through (returns null): /editor*, /api/*, /assets/*, /hm/*, /admin*, /panel*, /alladdin/* (static assets) etc.
 * so the existing HM editor panel works on this host (TP hm_news_sites row, corporate kind, no news fan-out).
 */
import { GG, FEATURES, STEPS, COMPARE, FAQS, POSTS } from "./hm-alladdin-app-content.js";
import { AHENK_HSY_REFERENCES, AHENK_HSY_IL_REFERENCES } from "./hm-ahenk-haber-yazilimi.js";

export const ALLADDIN_HOSTS = new Set(["alladdin.app", "www.alladdin.app"]);
export const ALLADDIN_INDEXNOW_KEY = "667447eeecb84ef5b6afdbae390fabe8";
const O = GG.origin;
const A = "/alladdin";
const REV = "al1";

const PASS_PREFIXES = ["/editor", "/api/", "/assets/", "/hm/", "/admin", "/panel", "/koseyazari", "/yazar-giris", "/alladdin/", "/sw.js", "/manifest", "/cdn-cgi/", "/haber-merkezi"];

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const tl = (n) => n.toLocaleString("tr-TR").replace(/,/g, ".");
const ALL_REFS = () => [...AHENK_HSY_REFERENCES, ...AHENK_HSY_IL_REFERENCES];

const ICON = {
  ai: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="4"/>',
  rss: '<path d="M5 19a1 1 0 1 0 0-.01M5 11a8 8 0 0 1 8 8M5 4a15 15 0 0 1 15 15"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M12 12v9"/>',
  map: '<path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  ad: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 15l2-6 2 6M7.7 13h2.6M14 9v6h1.5a3 3 0 0 0 0-6H14z"/>',
  widget: '<path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3zM9.5 19h5M10.5 21h3"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3V9z"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  doc: '<path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h6"/>',
  check: '<path d="M5 12l4 4L19 6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  pin: '<path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  wa: '<path d="M20.5 3.5A11 11 0 0 0 3.2 17.4L2 22l4.7-1.2A11 11 0 1 0 20.5 3.5z"/>',
};
const ic = (k, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] || ICON.check}</svg>`;

const MARK = `<svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="ab" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1468"/><stop offset="1" stop-color="#0d1b4d"/></linearGradient><linearGradient id="ag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset=".5" stop-color="#f5b83d"/><stop offset="1" stop-color="#d97706"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#ab)"/><path d="M33 22c-3-4 1-7 4-8-2 3 3 5 0 8" fill="none" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round" opacity=".9"/><path d="M10 37c4 0 6 2 9 2h18c4 0 7-3 10-6l7-5c1-1 3 0 2 2l-6 7c-3 4-7 8-13 9H25c-6 0-11-3-15-7-1-1 0-2 0-2z" fill="url(#ag)"/><path d="M24 34c0-5 4-8 8-8s8 3 8 8z" fill="url(#ag)"/><circle cx="32" cy="24.5" r="2.2" fill="#fde68a"/><path d="M8 37c-2-3 0-6 3-5" fill="none" stroke="url(#ag)" stroke-width="2.6" stroke-linecap="round"/><rect x="24" y="48" width="16" height="3.4" rx="1.7" fill="url(#ag)"/><path d="M50 12l1.2 2.6 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z" fill="#fde68a"/><circle cx="14" cy="15" r="1.3" fill="#fde68a" opacity=".8"/><circle cx="20" cy="9" r=".9" fill="#fff" opacity=".7"/></svg>`;
const LAMP_ART = `<svg class="lamp-art" viewBox="0 0 520 420" role="img" aria-label="Sihirli lamba ve dumandan yükselen haber sitesi"><defs><linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset=".5" stop-color="#f5b83d"/><stop offset="1" stop-color="#b45309"/></linearGradient><linearGradient id="sm1" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#a78bfa" stop-opacity=".9"/><stop offset="1" stop-color="#f0abfc" stop-opacity=".15"/></linearGradient><radialGradient id="gl1"><stop offset="0" stop-color="#fbbf24" stop-opacity=".55"/><stop offset="1" stop-color="#fbbf24" stop-opacity="0"/></radialGradient></defs><ellipse cx="190" cy="352" rx="170" ry="40" fill="url(#gl1)"/><path class="smoke" d="M232 292c-30-26 22-46-6-78s30-52 2-86 50-58 96-60" fill="none" stroke="url(#sm1)" stroke-width="26" stroke-linecap="round"/><path class="smoke s2" d="M244 288c-12-30 34-40 14-72s40-44 22-78" fill="none" stroke="url(#sm1)" stroke-width="12" stroke-linecap="round" opacity=".7"/><g transform="translate(300 30)"><rect width="200" height="150" rx="16" fill="#140c35" stroke="rgba(253,230,138,.45)"/><rect x="0" y="0" width="200" height="24" rx="12" fill="#1f1450"/><circle cx="14" cy="12" r="4" fill="#f472b6"/><circle cx="28" cy="12" r="4" fill="#fbbf24"/><circle cx="42" cy="12" r="4" fill="#34d399"/><rect x="12" y="34" width="80" height="10" rx="5" fill="#ef4444"/><rect x="12" y="52" width="176" height="46" rx="8" fill="url(#lg1)" opacity=".85"/><rect x="12" y="106" width="54" height="32" rx="6" fill="#2a1d63"/><rect x="73" y="106" width="54" height="32" rx="6" fill="#2a1d63"/><rect x="134" y="106" width="54" height="32" rx="6" fill="#2a1d63"/></g><g transform="translate(40 230)"><path d="M0 92c10 0 16 6 26 6h120c14 0 24-10 36-20l40-30c6-5 14 1 9 8l-30 38c-14 18-32 34-58 36H70C40 130 18 118 4 104c-4-4-6-12-4-12z" fill="url(#lg1)"/><path d="M60 86c0-30 26-50 56-50s56 20 56 50z" fill="url(#lg1)"/><circle cx="116" cy="30" r="9" fill="#fde68a"/><path d="M-6 92c-14-18-2-40 18-32" fill="none" stroke="url(#lg1)" stroke-width="10" stroke-linecap="round"/><rect x="74" y="134" width="84" height="14" rx="7" fill="url(#lg1)"/><path d="M80 70h72" stroke="#92400e" stroke-width="3" opacity=".5"/></g><g fill="#fde68a"><path class="tw" d="M120 60l5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2z"/><circle class="tw t2" cx="60" cy="140" r="3"/><circle class="tw t3" cx="470" cy="230" r="3.5"/><circle class="tw" cx="420" cy="300" r="2.5"/><circle class="tw t2" cx="200" cy="30" r="2.5"/></g></svg>`;

const CSS = "@font-face{font-family:\"Jakarta\";src:url(/alladdin/jakarta.woff2?v=al1) format(\"woff2\");font-weight:200 800;font-display:swap}:root{--bg:#0a0620;--bg2:#120a33;--card:#160d3d;--line:rgba(233,213,255,.13);--ink:#fbf7ff;--mut:#b9add6;--gold:#f5b83d;--g:linear-gradient(100deg,#fde68a,#f5b83d 38%,#f472b6 72%,#c084fc);--r:18px}*{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg) radial-gradient(1px 1px at 12% 18%,rgba(253,230,138,.6),transparent 60%) 0 0/340px 340px,var(--bg);color:var(--ink);font:16px/1.65 Jakarta,system-ui,-apple-system,\"Segoe UI\",Roboto,Arial,sans-serif;text-rendering:optimizeLegibility}a{color:inherit}img{max-width:100%;height:auto}.w{max-width:1200px;margin:0 auto;padding:0 22px}.skip{position:absolute;left:-9999px}.skip:focus{left:10px;top:10px;background:#fff;color:#000;padding:8px;z-index:99}.ic{width:22px;height:22px;flex:none}.hd{position:sticky;top:0;z-index:50;background:rgba(10,6,32,.8);backdrop-filter:saturate(160%) blur(14px);-webkit-backdrop-filter:saturate(160%) blur(14px);border-bottom:1px solid var(--line)}.hd .w{display:flex;align-items:center;gap:18px;height:70px}.logo{display:flex;align-items:center;gap:10px;text-decoration:none;margin-right:auto}.mark{width:38px;height:38px;flex:none}.logo b{font-size:21px;font-weight:800;letter-spacing:-.4px;line-height:1}.logo small{display:block;font-size:10.5px;letter-spacing:2.2px;color:var(--mut);font-weight:700;margin-top:3px}.nav{display:flex;gap:2px;align-items:center}.nav a{text-decoration:none;color:#cfd5f5;font-weight:600;font-size:14.5px;padding:9px 11px;border-radius:10px}.nav a:hover,.nav a[aria-current]{color:#fff;background:rgba(255,255,255,.06)}.btn{display:inline-flex;align-items:center;gap:8px;justify-content:center;text-decoration:none;border-radius:12px;padding:13px 20px;border:0;cursor:pointer;font:inherit;font-weight:700;transition:transform .15s,box-shadow .15s}.btn-p{background:linear-gradient(100deg,#fde68a,#f5b83d 50%,#f59e0b);color:#1a0b2e;box-shadow:0 10px 30px -10px rgba(245,184,61,.75)}.btn-p:hover{transform:translateY(-1px);box-shadow:0 16px 40px -12px rgba(245,184,61,.95)}.btn-g{background:rgba(255,255,255,.06);color:#fff;border:1px solid var(--line)}.btn-g:hover{background:rgba(255,255,255,.1)}.btn-s{padding:9px 14px;font-size:14px;border-radius:10px}.mnav{display:none}@media (max-width:1060px){.nav,.hd .btn-s{display:none}.mnav{display:block}.mnav summary{list-style:none;cursor:pointer;width:44px;height:44px;display:grid;place-items:center;border:1px solid var(--line);border-radius:12px}.mnav summary::-webkit-details-marker{display:none}.mnav .sheet{position:fixed;inset:70px 0 auto 0;background:#070b19;border-bottom:1px solid var(--line);padding:10px 16px 18px;display:grid;gap:2px;max-height:calc(100vh - 70px);overflow:auto}.mnav .sheet a{padding:13px 12px;border-radius:10px;text-decoration:none;font-weight:600}.mnav .sheet a:hover{background:rgba(255,255,255,.06)}}.hero{position:relative;overflow:hidden;padding:84px 0 60px;isolation:isolate}.hero:before{content:\"\";position:absolute;inset:-20% -10% auto;height:120%;z-index:-1;background:radial-gradient(600px 380px at 78% 30%,rgba(245,184,61,.20),transparent 70%),radial-gradient(700px 480px at 12% 30%,rgba(124,58,237,.34),transparent 70%),radial-gradient(600px 400px at 50% 110%,rgba(236,72,153,.16),transparent 70%)}.hero:after{content:\"\";position:absolute;inset:0;z-index:-1;background-image:linear-gradient(rgba(233,213,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(233,213,255,.05) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse at 50% 30%,#000 30%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse at 50% 30%,#000 30%,transparent 75%)}.pill{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.04);font-size:13.5px;font-weight:600;color:#d7dcff}.pill i{width:8px;height:8px;border-radius:50%;background:#fbbf24;box-shadow:0 0 0 4px rgba(251,191,36,.2)}h1{font-size:clamp(38px,6.2vw,74px);line-height:1.03;letter-spacing:-.035em;margin:22px 0 20px;font-weight:800}.gt{background:var(--g);-webkit-background-clip:text;background-clip:text;color:transparent}.lead{font-size:clamp(17px,1.6vw,20px);color:var(--mut);max-width:760px;margin:0}.cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}.hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:46px;align-items:center}@media (max-width:980px){.hero-grid{grid-template-columns:1fr}}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:44px}.stat{padding:16px 18px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.03)}.stat b{display:block;font-size:28px;letter-spacing:-.02em}.stat span{color:var(--mut);font-size:13.5px}@media (max-width:640px){.stats{grid-template-columns:repeat(2,1fr)}}.mock{border:1px solid var(--line);border-radius:22px;background:linear-gradient(180deg,#10173a,#0a0f24);box-shadow:0 40px 80px -30px rgba(0,0,0,.8);overflow:hidden}.mock-top{display:flex;gap:6px;padding:12px 14px;border-bottom:1px solid var(--line)}.mock-top i{width:10px;height:10px;border-radius:50%;background:#2a3157}.mock-b{padding:16px;display:grid;gap:10px}.mk-h{height:120px;border-radius:14px;background:linear-gradient(120deg,rgba(124,92,255,.55),rgba(34,211,238,.35)),repeating-linear-gradient(45deg,rgba(255,255,255,.04) 0 8px,transparent 8px 16px);display:flex;align-items:flex-end;padding:12px;font-weight:800;font-size:15px}.mk-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.mk-row div{height:56px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid var(--line)}.mk-tick{display:flex;gap:8px;align-items:center;font-size:12.5px;color:#fecaca;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);padding:7px 10px;border-radius:10px}.mk-tick b{background:#ef4444;color:#fff;border-radius:6px;padding:1px 6px;font-size:11px}.mk-ai{display:flex;gap:10px;align-items:center;font-size:13.5px;background:rgba(124,58,237,.16);border:1px solid rgba(245,184,61,.35);padding:12px 14px;border-radius:14px;max-width:420px;margin:-10px auto 0;backdrop-filter:blur(6px)}.mk-ai .ic{color:#fbbf24}section.s{padding:84px 0;border-top:1px solid var(--line)}.eyebrow{font-size:13px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#fbbf24}h2{font-size:clamp(28px,3.8vw,46px);line-height:1.08;letter-spacing:-.03em;margin:10px 0 14px;font-weight:800}h3{font-size:19px;letter-spacing:-.01em;margin:0 0 8px}.sub{color:var(--mut);max-width:760px;font-size:17px;margin:0}.grid{display:grid;gap:16px;grid-template-columns:repeat(3,1fr);margin-top:36px}@media (max-width:980px){.grid{grid-template-columns:repeat(2,1fr)}}@media (max-width:640px){.grid{grid-template-columns:1fr}}.card{position:relative;padding:24px;border-radius:var(--r);border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.01));text-decoration:none;display:block;transition:border-color .2s,transform .2s}a.card:hover{border-color:rgba(245,184,61,.55);transform:translateY(-2px)}.card p{color:var(--mut);margin:0;font-size:15px}.ibox{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(245,184,61,.22),rgba(167,139,250,.18));border:1px solid rgba(245,184,61,.35);color:#fde68a;margin-bottom:16px}.more{display:inline-flex;align-items:center;gap:6px;margin-top:14px;font-weight:700;font-size:14px;color:#fcd34d}.more .ic{width:16px;height:16px}.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:36px;counter-reset:s}@media (max-width:980px){.steps{grid-template-columns:1fr 1fr}}@media (max-width:640px){.steps{grid-template-columns:1fr}}.step{padding:24px;border-radius:var(--r);border:1px solid var(--line);background:rgba(255,255,255,.025)}.step:before{counter-increment:s;content:\"0\" counter(s);display:block;font-weight:800;font-size:34px;background:var(--g);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:8px}.step p{color:var(--mut);margin:0;font-size:15px}.prices{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:36px;max-width:980px}@media (max-width:780px){.prices{grid-template-columns:1fr}}.plan{position:relative;padding:32px;border-radius:24px;border:1px solid var(--line);background:rgba(255,255,255,.03)}.plan.best{background:linear-gradient(#160d3d,#160d3d) padding-box,linear-gradient(120deg,#fde68a,#f5b83d,#f472b6,#a78bfa) border-box;border:1.5px solid transparent;box-shadow:0 30px 70px -30px rgba(245,184,61,.55)}.badge{position:absolute;top:-13px;left:32px;background:linear-gradient(100deg,#fde68a,#f59e0b);color:#1a0b2e;font-weight:800;font-size:12.5px;padding:5px 12px;border-radius:999px;letter-spacing:.04em}.amt{font-size:52px;font-weight:800;letter-spacing:-.04em;line-height:1;margin:14px 0 6px}.amt small{font-size:17px;color:var(--mut);font-weight:600;letter-spacing:0}.plan ul{list-style:none;padding:0;margin:22px 0 26px;display:grid;gap:10px}.plan li{display:flex;gap:10px;align-items:flex-start;color:#d9ddf7}.plan li .ic{color:#34d399;width:20px;height:20px;margin-top:2px}.note{color:var(--mut);font-size:14px}.note a{color:#fde68a}.save{display:inline-block;margin-top:4px;color:#34d399;font-weight:700;font-size:14.5px}.refs{display:grid;grid-template-columns:repeat(auto-fill,minmax(178px,1fr));gap:12px;margin-top:32px}.ref{display:flex;flex-direction:column;align-items:center;gap:6px;text-decoration:none;background:#fff;border-radius:14px;padding:14px 12px 12px;color:#0b1020;transition:transform .15s,box-shadow .15s;min-height:128px}.ref:hover{transform:translateY(-2px);box-shadow:0 14px 30px -14px rgba(0,0,0,.7)}.ref .lg{height:56px;width:100%;display:flex;align-items:center;justify-content:center}.ref img{max-height:56px;width:auto;max-width:100%;object-fit:contain}.ref b{font-size:13px;text-align:center;line-height:1.25}.ref span{font-size:12px;color:#5b6478}.marquee{overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);margin-top:40px}.mq{display:flex;gap:14px;width:max-content;animation:mq 60s linear infinite}.mq a{flex:none;width:170px;height:76px;background:#fff;border-radius:14px;display:grid;place-items:center;padding:10px}.mq img{max-height:52px;width:auto;max-width:100%;object-fit:contain}.marquee:hover .mq{animation-play-state:paused}@keyframes mq{to{transform:translateX(-50%)}}@media (prefers-reduced-motion:reduce){.mq{animation:none}}.tbl{width:100%;border-collapse:separate;border-spacing:0;margin-top:32px;border:1px solid var(--line);border-radius:18px;overflow:hidden;font-size:15px}.tbl th,.tbl td{padding:15px 18px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}.tbl tr:last-child td{border-bottom:0}.tbl thead th{background:rgba(255,255,255,.04);font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#c7cdf2}.tbl td:first-child{font-weight:700;color:#fff;width:22%}.tbl td:nth-child(2){color:var(--mut)}.tbl td:nth-child(3){color:#d1fae5;background:rgba(52,211,153,.05)}@media (max-width:700px){.tbl,.tbl tbody,.tbl tr,.tbl td{display:block;width:100%!important}.tbl thead{display:none}.tbl tr{border-bottom:1px solid var(--line)}.tbl td{border:0;padding:8px 16px}.tbl td:first-child{padding-top:16px}.tbl td:nth-child(2):before{content:\"Klasik yol: \";font-weight:700}.tbl td:nth-child(3):before{content:\"Alladdin: \";font-weight:700}.tbl td:last-child{padding-bottom:16px}}.faq{border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.025);margin-top:10px}.faq summary{cursor:pointer;list-style:none;padding:18px 54px 18px 20px;position:relative;font-weight:700;font-size:16.5px}.faq summary::-webkit-details-marker{display:none}.faq summary:after{content:\"+\";position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:24px;color:#fcd34d;font-weight:400}.faq[open] summary:after{content:\"–\"}.faq p{margin:0;padding:0 20px 20px;color:var(--mut)}.crumb{font-size:13.5px;color:var(--mut);margin-bottom:6px}.crumb a{color:var(--mut);text-decoration:none}.crumb a:hover{color:#fff}.page-h{padding:64px 0 34px;position:relative;isolation:isolate}.page-h:before{content:\"\";position:absolute;inset:0;z-index:-1;background:radial-gradient(600px 300px at 80% 0,rgba(245,184,61,.14),transparent 70%),radial-gradient(600px 300px at 10% 20%,rgba(124,58,237,.25),transparent 70%)}.page-h h1{font-size:clamp(34px,5vw,58px)}.prose{max-width:780px}.prose p{color:#cfd4f1;font-size:17px;margin:0 0 18px}.prose h2{font-size:clamp(22px,2.6vw,30px);margin:38px 0 12px}.prose a{color:#fde68a}.two{display:grid;grid-template-columns:1.4fr .9fr;gap:40px;align-items:start}@media (max-width:900px){.two{grid-template-columns:1fr}}.aside{position:sticky;top:90px;padding:24px;border-radius:20px;border:1px solid var(--line);background:rgba(255,255,255,.03)}.list{list-style:none;padding:0;margin:0;display:grid;gap:10px}.list li{display:flex;gap:10px}.list .ic{color:#34d399;width:20px;height:20px;margin-top:3px}.band{margin:0 auto;padding:46px;border-radius:28px;background:radial-gradient(500px 240px at 90% 0,rgba(245,184,61,.25),transparent 70%),radial-gradient(500px 260px at 0 100%,rgba(124,58,237,.4),transparent 70%),#150b3a;border:1px solid rgba(245,184,61,.35);display:flex;gap:26px;align-items:center;justify-content:space-between;flex-wrap:wrap}@media (max-width:640px){.band{padding:28px}}.band h2{margin:0 0 6px}.ft{border-top:1px solid var(--line);margin-top:64px;padding:56px 0 90px;color:var(--mut);font-size:14.5px}.ft-g{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.2fr;gap:30px}@media (max-width:900px){.ft-g{grid-template-columns:1fr 1fr}}@media (max-width:560px){.ft-g{grid-template-columns:1fr}}.ft h4{color:#fff;margin:0 0 12px;font-size:15px}.ft a{text-decoration:none;color:var(--mut)}.ft a:hover{color:#fff}.ft ul{list-style:none;padding:0;margin:0;display:grid;gap:8px}.ft .row{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px}.ft .row .ic{width:18px;height:18px;margin-top:3px;color:#fcd34d}.copy{border-top:1px solid var(--line);margin-top:34px;padding-top:20px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:13.5px}.waf{position:fixed;right:18px;bottom:18px;z-index:60;width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:#22c55e;color:#fff;box-shadow:0 12px 30px -8px rgba(34,197,94,.7)}.waf svg{width:28px;height:28px}.form{display:grid;gap:14px}.form label{display:grid;gap:6px;font-weight:600;font-size:14px}.form input,.form textarea{font:inherit;color:#fff;background:#0b1126;border:1px solid var(--line);border-radius:12px;padding:13px 14px}.form textarea{min-height:150px;resize:vertical}.form input:focus,.form textarea:focus{outline:2px solid rgba(245,184,61,.6);border-color:transparent}.form .chk{display:flex;gap:10px;align-items:flex-start;font-weight:500;color:var(--mut)}.form .chk a{color:#fde68a}.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.alert{padding:14px 16px;border-radius:12px;margin-bottom:16px;font-weight:600}.ok{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.4);color:#a7f3d0}.err{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.4);color:#fecaca}.info{display:grid;gap:14px}.info a{color:#fde68a;text-decoration:none}.info .row{display:flex;gap:12px;align-items:flex-start;padding:16px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.03)}.info .ic{color:#fcd34d;margin-top:2px}.tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.tags a{font-size:13.5px;text-decoration:none;padding:7px 12px;border-radius:999px;border:1px solid var(--line);color:#cfd5f5}.tags a:hover{border-color:rgba(245,184,61,.6)}.aside a{color:#fde68a}.hero-art{position:relative}.lamp-art{display:block;width:100%;max-width:520px;height:auto;margin:0 auto;filter:drop-shadow(0 30px 50px rgba(0,0,0,.5))}.lamp-art .smoke{stroke-dasharray:900;stroke-dashoffset:900;animation:smk 3.2s ease-out .3s forwards}.lamp-art .s2{animation-delay:.7s}@keyframes smk{to{stroke-dashoffset:0}}.lamp-art .tw{animation:tw 2.8s ease-in-out infinite}.lamp-art .t2{animation-delay:.9s}.lamp-art .t3{animation-delay:1.7s}@keyframes tw{50%{opacity:.25}}@media (prefers-reduced-motion:reduce){.lamp-art .smoke{animation:none;stroke-dashoffset:0}.lamp-art .tw{animation:none}}.wish{background:linear-gradient(180deg,rgba(245,184,61,.08),rgba(124,58,237,.06))}.wish .wn{display:inline-block;font-size:12.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#1a0b2e;background:linear-gradient(100deg,#fde68a,#f5b83d);padding:4px 10px;border-radius:999px;margin-bottom:14px}.wish h3{font-size:21px}";

const NAV = [
  ["/ozellikler", "Sihirler"], ["/nasil-calisir", "Nasıl Çalışır"], ["/fiyatlar", "Paketler"], ["/referanslar", "Referanslar"],
  ["/karsilastirma", "Neden Alladdin"], ["/blog", "Okuma Köşesi"], ["/sss", "Merak Edilenler"], ["/iletisim", "İletişim"],
];

function orgNode() {
  return {
    "@type": ["Organization", "LocalBusiness"], "@id": O + "/#org", name: GG.brand, legalName: GG.company, url: O + "/",
    logo: { "@type": "ImageObject", url: O + A + "/icon-512.png", width: 512, height: 512 }, image: O + A + "/og.jpg",
    email: GG.email, telephone: GG.phoneTel, priceRange: "₺₺",
    address: { "@type": "PostalAddress", streetAddress: GG.address.street, addressLocality: GG.address.district, addressRegion: GG.address.city, addressCountry: GG.address.country },
    areaServed: { "@type": "Country", name: "Türkiye" },
    openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "09:00", closes: "19:00" }],
    contactPoint: [{ "@type": "ContactPoint", telephone: GG.phoneTel, email: GG.email, contactType: "sales", areaServed: "TR", availableLanguage: ["tr"] }],
    hasMap: GG.maps, knowsAbout: ["haber sitesi kurmak", "yapay zeka haber sitesi", "yerel haber sitesi", "haber sitesi fiyatları", "haber sitesi yazılımı"],
  };
}
function softwareNode() {
  const p = GG.price;
  return {
    "@type": ["SoftwareApplication", "Product"], "@id": O + "/#software", name: GG.brand, applicationCategory: "BusinessApplication", applicationSubCategory: "Haber sitesi yazılımı",
    operatingSystem: "Web", url: O + "/", image: O + A + "/og.jpg", brand: { "@id": O + "/#org" }, inLanguage: "tr-TR",
    description: "Lambayı ovun, haber siteniz hazır: Cin Editör (yapay zekâ), haber akışı, panel ve barındırma tek pakette.",
    offers: [
      { "@type": "Offer", name: "Aylık dilek paketi", price: String(p.monthly), priceCurrency: p.currency, availability: "https://schema.org/InStock", url: O + "/fiyatlar", seller: { "@id": O + "/#org" },
        priceSpecification: { "@type": "UnitPriceSpecification", price: p.monthly, priceCurrency: p.currency, billingDuration: "P1M", unitCode: "MON" } },
      { "@type": "Offer", name: "Yıllık dilek paketi (%" + p.discountPct + " indirim)", price: String(p.yearly), priceCurrency: p.currency, availability: "https://schema.org/InStock", url: O + "/fiyatlar", seller: { "@id": O + "/#org" },
        priceSpecification: { "@type": "UnitPriceSpecification", price: p.yearly, priceCurrency: p.currency, billingDuration: "P1Y", unitCode: "ANN" } },
    ],
  };
}
function faqNode(list) {
  return { "@type": "FAQPage", "@id": O + "/sss#faq", mainEntity: list.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
}
function ld(path, title, desc, crumbs, extra = []) {
  const url = O + path;
  const graph = [
    orgNode(),
    { "@type": "WebSite", "@id": O + "/#website", url: O + "/", name: GG.brand, inLanguage: "tr-TR", publisher: { "@id": O + "/#org" } },
    { "@type": "WebPage", "@id": url + "#webpage", url, name: title, description: desc, inLanguage: "tr-TR", isPartOf: { "@id": O + "/#website" }, about: { "@id": O + "/#software" }, primaryImageOfPage: O + A + "/og.jpg" },
  ];
  if (crumbs && crumbs.length) {
    graph.push({ "@type": "BreadcrumbList", "@id": url + "#breadcrumb", itemListElement: [["/", "Ana Sayfa"], ...crumbs].map(([p, n], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: O + p })) });
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": [...graph, ...extra] }).replace(/</g, "\\u003c");
}

function crumbHtml(crumbs) {
  if (!crumbs || !crumbs.length) return "";
  const parts = [`<a href="/">Ana Sayfa</a>`];
  crumbs.forEach(([p, n], i) => parts.push(i === crumbs.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${p}">${esc(n)}</a>`));
  return `<nav class="crumb" aria-label="Breadcrumb">${parts.join(" / ")}</nav>`;
}

function layout({ path, title, desc, crumbs = [], body, extraLd = [], noindex = false }) {
  const full = path === "/" ? title : `${title} | ${GG.brand}`;
  const navHtml = NAV.map(([h, n]) => `<a href="${h}"${path === h || (h !== "/" && path.startsWith(h + "/")) ? ' aria-current="page"' : ""}>${n}</a>`).join("");
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(full)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${O}${path}">
<meta name="robots" content="${noindex ? "noindex,follow" : "index,follow,max-image-preview:large,max-snippet:-1"}">
<meta name="theme-color" content="#0a0620"><meta name="color-scheme" content="dark">
<link rel="icon" href="${A}/mark.svg?v=${REV}" type="image/svg+xml"><link rel="icon" href="${A}/icon-48.png?v=${REV}" sizes="48x48"><link rel="apple-touch-icon" href="${A}/icon-180.png?v=${REV}">
<link rel="preload" href="${A}/jakarta.woff2?v=${REV}" as="font" type="font/woff2" crossorigin>
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(GG.brand)}"><meta property="og:locale" content="tr_TR">
<meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${O}${path}">
<meta property="og:image" content="${O}${A}/og.jpg?v=${REV}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(GG.brand)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(full)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${O}${A}/og.jpg?v=${REV}">
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
<style>${CSS}</style>
<script type="application/ld+json">${ld(path, full, desc, crumbs, extraLd)}</script></head>
<body><a class="skip" href="#main">İçeriğe geç</a>
<header class="hd"><div class="w"><a class="logo" href="/" aria-label="${esc(GG.brand)} ana sayfa">${MARK}<span><b>Alladdin</b><small>HABER SİTESİ YAZILIMI</small></span></a>
<nav class="nav" aria-label="Ana menü">${navHtml}</nav><a class="btn btn-p btn-s" href="/demo">Demo dile</a>
<details class="mnav"><summary aria-label="Menüyü aç"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></summary><div class="sheet">${NAV.map(([h, n]) => `<a href="${h}">${n}</a>`).join("")}<a href="/demo" class="btn btn-p" style="margin-top:8px">Demo dile</a></div></details>
</div></header>
<main id="main">${body}</main>
${footer()}
<a class="waf" href="${GG.wa}?text=${encodeURIComponent("Merhaba, Alladdin ile bir haber sitesi dilemek istiyorum.")}" target="_blank" rel="noopener" aria-label="WhatsApp ile lambayı ovun"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3.5A11 11 0 0 0 3.2 17.4L2 22l4.7-1.2A11 11 0 1 0 20.5 3.5zM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 5 5 0 0 0 1 2.6 11.3 11.3 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.4z"/></svg></a>
</body></html>`;
}

function footer() {
  const y = 2026;
  return `<footer class="ft"><div class="w"><div class="ft-g">
<div><a class="logo" href="/">${MARK}<span><b style="color:#fff">Alladdin</b><small>HABER SİTESİ YAZILIMI</small></span></a>
<p style="margin:16px 0 0;max-width:340px">Lambayı ovun, haber siteniz hazır olsun. Kurulum, barındırma, haber akışı ve Cin Editör tek pakette; Ankara’dan bütün Türkiye’ye.</p></div>
<div><h4>Lamba</h4><ul><li><a href="/ozellikler">On beş sihir</a></li><li><a href="/ozellikler/cin-editor">Cin Editör</a></li><li><a href="/ozellikler/sihirli-panel">Sihirli panel</a></li><li><a href="/ozellikler/gorunurluk-buyusu">Görünürlük büyüsü</a></li><li><a href="/fiyatlar">Paketler</a></li><li><a href="/karsilastirma">Neden Alladdin</a></li></ul></div>
<div><h4>Okuma köşesi</h4><ul>${POSTS.map((p) => `<li><a href="/blog/${p.slug}">${esc(p.kw.charAt(0).toLocaleUpperCase("tr-TR") + p.kw.slice(1))}</a></li>`).join("")}<li><a href="/sss">Merak edilenler</a></li><li><a href="/referanslar">Masalı gerçek olanlar</a></li></ul></div>
<div><h4>Lambanın adresi</h4>
<div class="row">${ic("pin")}<a href="${GG.maps}" target="_blank" rel="noopener">${esc(GG.address.full)}</a></div>
<div class="row">${ic("tel")}<a href="tel:${GG.phoneTel}">${esc(GG.phone)}</a></div>
<div class="row">${ic("mail")}<a href="mailto:${GG.email}">${esc(GG.email)}</a></div></div>
</div><div class="copy"><span>© ${y} ${esc(GG.brand)} — ${esc(GG.company)}</span><span><a href="/hakkimizda">Hakkımızda</a> · <a href="/kvkk">KVKK</a> · <a href="/iletisim">İletişim</a> · <a href="/editor">Editör girişi</a></span></div></div></footer>`;
}

const ctaBand = (t = "Dileğinizi söyleyin, gerisi lambada", d = "Bir telefon kadar uzağınızdayız. Sitenizi kuralım, dolduralım ve anahtarını teslim edelim.") =>
  `<section class="s" style="border-top:0;padding-top:20px"><div class="w"><div class="band"><div><h2>${esc(t)}</h2><p class="sub">${esc(d)}</p></div><div class="cta" style="margin:0"><a class="btn btn-p" href="/demo">Demo dile ${ic("arrow")}</a><a class="btn btn-g" href="tel:${GG.phoneTel}">${ic("tel")} ${esc(GG.phone)}</a></div></div></div></section>`;

function featureCards(list) {
  return `<div class="grid">${list.map((f) => `<a class="card" href="/ozellikler/${f.slug}"><div class="ibox">${ic(f.icon)}</div><h3>${esc(f.title)}</h3><p>${esc(f.short)}</p><span class="more">Sihri incele ${ic("arrow")}</span></a>`).join("")}</div>`;
}
function stepsHtml() {
  return `<div class="steps">${STEPS.map((s) => `<div class="step"><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></div>`).join("")}</div>`;
}
function pricingHtml() {
  const p = GG.price;
  const inc = ["Barındırma, SSL ve yedekleme", "Cin Editör ile yapay zekâ destekli taslaklar", "Bitmeyen haber akışı", "Editörler ve köşe yazarları için hesaplar", "Arama motoru ve yapay zekâ görünürlüğü", "Kurulum, bakım ve telefonla destek"];
  const li = inc.map((x) => `<li>${ic("check")}<span>${esc(x)}</span></li>`).join("");
  return `<div class="prices">
<div class="plan"><h3>Aylık dilek</h3><p class="note">Her ay yenilenen tek dilek</p><div class="amt">${tl(p.monthly)} TL<small> / ay</small></div><ul>${li}</ul><a class="btn btn-g" style="width:100%" href="/iletisim?paket=aylik#iletisim-formu">Aylık dileği seç</a></div>
<div class="plan best"><span class="badge">CİNİN TAVSİYESİ · %${p.discountPct} İNDİRİM</span><h3>Yıllık dilek</h3><p class="note">On iki ay, bütün sihirler</p><div class="amt">${tl(p.yearly)} TL<small> / yıl</small></div><span class="save">Ayda ${tl(p.yearlyPerMonth)} TL’ye gelir · ${tl(p.monthly * 12 - p.yearly)} TL cebinizde kalır</span><ul>${li}</ul><a class="btn btn-p" style="width:100%" href="/iletisim?paket=yillik#iletisim-formu">Yıllık dileği seç ${ic("arrow")}</a></div>
</div><p class="note" style="margin-top:18px">İki pakette de barındırma ve Cin Editör ile içerik üretimi vardır. Alan adı ücreti pakete dahil değildir; elinizdeki alan adını da bağlayabilirsiniz.</p>`;
}
function refCard(r) {
  return `<a class="ref" href="${esc(r.url)}" target="_blank" rel="noopener"><span class="lg"><img src="${esc(r.logo)}" alt="${esc(r.name)} logosu" loading="lazy" decoding="async" width="160" height="56"></span><b>${esc(r.name)}</b><span>${esc(r.domain)}</span></a>`;
}
function marqueeHtml() {
  const refs = AHENK_HSY_REFERENCES.slice(6, 24);
  const one = refs.map((r) => `<a href="${esc(r.url)}" target="_blank" rel="noopener" title="${esc(r.name)}"><img src="${esc(r.logo)}" alt="${esc(r.name)}" decoding="async" width="150" height="52"></a>`).join("");
  return `<div class="marquee" aria-label="Alladdin altyapısındaki siteler"><div class="mq">${one}${one.replace(/<a /g, '<a tabindex="-1" aria-hidden="true" ')}</div></div>`;
}
function compareHtml() {
  return `<table class="tbl"><thead><tr><th>Başlık</th><th>Klasik yol</th><th>Alladdin</th></tr></thead><tbody>${COMPARE.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("")}</tbody></table>`;
}
function faqHtml(list) {
  return list.map((f, i) => `<details class="faq"${i === 0 ? " open" : ""}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");
}
const pageHead = (crumbs, h1, lead) => `<div class="page-h"><div class="w">${crumbHtml(crumbs)}<h1>${h1}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ""}</div></div>`;

const FEAT = new Map(FEATURES.map((f) => [f.slug, f]));
const POST = new Map(POSTS.map((p) => [p.slug, p]));

function home() {
  const p = GG.price;
  const body = `<section class="hero"><div class="w"><div class="hero-grid"><div>
<span class="pill"><i></i> Cin Editör + barındırma dahil · ayda ${tl(p.monthly)} TL</span>
<h1>Dile benden <span class="gt">ne dilersen:</span> haber siten hazır.</h1>
<p class="lead">Lambayı bir kez ovun: alan adınız, logonuz ve renklerinizle kurulmuş, kategorileri haberle dolmuş, yapay zekâ destekli Cin Editör’ü hazır bekleyen bir haber siteniz olsun. Sunucu, script, güncelleme derdi yok; sadece yayıncılık var.</p>
<div class="cta"><a class="btn btn-p" href="/demo">Dileğimi söylemek istiyorum ${ic("arrow")}</a><a class="btn btn-g" href="/fiyatlar">Paketleri incele</a></div>
<div class="stats"><div class="stat"><b>${ALL_REFS().length}+</b><span>bu altyapıda yayında</span></div><div class="stat"><b>3</b><span>dilek, tek pakette</span></div><div class="stat"><b>%${p.discountPct}</b><span>yıllık ödemede kazanç</span></div><div class="stat"><b>0</b><span>teknik bilgi ihtiyacı</span></div></div>
</div>
<div class="hero-art">${LAMP_ART}<div class="mk-ai">${ic("ai")}<span><b>Cin Editör</b> gece boyunca 5 haber taslağı hazırladı. Sabah kahvenizle onaylayın.</span></div></div></div>
${marqueeHtml()}</div></section>
<section class="s wishes"><div class="w"><span class="eyebrow">Üç dilek hakkı</span><h2>Her yayıncının <span class="gt">üç dileği</span> vardır</h2><p class="sub">Yıllardır yayıncılarla konuşuyoruz; istekler hep aynı üç cümlede toplanıyor. Lambamız üçünü de ilk gün yerine getiriyor.</p><div class="grid">
<div class="card wish"><span class="wn">Birinci dilek</span><h3>“Uğraşmadan açılsın.”</h3><p>Sunucu seçmek, script kurmak, SSL ayarlamak yok. Dileğinizi söylediğiniz gün kurulum başlar.</p></div>
<div class="card wish"><span class="wn">İkinci dilek</span><h3>“İlk günden dolu görünsün.”</h3><p>Bitmeyen haber akışı kategorilerinizi doldurur, Cin Editör özgün taslaklarla destek verir.</p></div>
<div class="card wish"><span class="wn">Üçüncü dilek</span><h3>“Herkes beni bulsun.”</h3><p>Google, Google Haberler ve yapay zekâ asistanları için görünürlük büyüsü kurulu gelir.</p></div>
</div></div></section>
<section class="s"><div class="w"><span class="eyebrow">Sihirler</span><h2>Lambanın içinden <span class="gt">neler çıkıyor?</span></h2><p class="sub">On beş sihrin her birini ayrı sayfada, tüm ayrıntılarıyla anlattık. Göz atın, hangisinin size en çok yarayacağını görün.</p>${featureCards(FEATURES.slice(0, 6))}<div class="cta"><a class="btn btn-g" href="/ozellikler">On beş sihrin hepsi ${ic("arrow")}</a></div></div></section>
<section class="s"><div class="w"><span class="eyebrow">Masal gibi kurulum</span><h2>Lambadan siteye dört adım</h2><p class="sub">Ovun, söyleyin, bekleyin, yayınlayın. Gerisini cin halleder.</p>${stepsHtml()}<div class="cta"><a class="btn btn-g" href="/nasil-calisir">Adımların ayrıntısı ${ic("arrow")}</a></div></div></section>
<section class="s" id="fiyatlar"><div class="w"><span class="eyebrow">Paketler</span><h2>İki paket, sürprizsiz fiyat</h2><p class="sub">Ek ücret, gizli kalem, kullanım faturası yok. Cin Editör ve barındırma iki pakette de var.</p>${pricingHtml()}</div></section>
<section class="s"><div class="w"><span class="eyebrow">Fark</span><h2>Klasik yol ile <span class="gt">sihirli yol</span></h2><p class="sub">Script alıp sunucu kiralamakla, tek pakette hazır bir site almak arasındaki farkı madde madde gösterdik.</p>${compareHtml()}<div class="cta"><a class="btn btn-g" href="/karsilastirma">Tüm farklar ${ic("arrow")}</a></div></div></section>
<section class="s"><div class="w"><span class="eyebrow">Masalı gerçek olanlar</span><h2>Bu lambadan çıkan siteler</h2><p class="sub">Aynı altyapı üzerinde her gün haber yayınlayan sitelerden bir seçki. Logoya tıklayın, siteyi canlı görün.</p><div class="refs">${AHENK_HSY_REFERENCES.slice(12, 24).map(refCard).join("")}</div><div class="cta"><a class="btn btn-g" href="/referanslar">Bütün referanslar ${ic("arrow")}</a></div></div></section>
<section class="s"><div class="w two"><div><span class="eyebrow">Merak edilenler</span><h2>Lambaya sorulanlar</h2>${faqHtml(FAQS.slice(0, 6))}<div class="cta"><a class="btn btn-g" href="/sss">Bütün cevaplar ${ic("arrow")}</a></div></div>
<aside class="aside"><h3>Okuma köşesi</h3><p class="note">Haber sitesi kurmayı düşünenler için yazdığımız rehberler:</p><ul class="list" style="margin-top:14px">${POSTS.map((x) => `<li>${ic("doc")}<a href="/blog/${x.slug}">${esc(x.title)}</a></li>`).join("")}</ul></aside></div></section>
${ctaBand()}`;
  return layout({ path: "/", title: "Alladdin Haber Sitesi Yazılımı — Dile Benden Ne Dilersen: Haber Siten Hazır", desc: `Lambayı ovun, haber siteniz hazır: Cin Editör (yapay zekâ), bitmeyen haber akışı, sihirli panel ve barındırma tek pakette. Ayda ${tl(p.monthly)} TL ya da yılda ${tl(p.yearly)} TL.`, body, extraLd: [softwareNode(), faqNode(FAQS)] });
}

function featuresIndex() {
  const crumbs = [["/ozellikler", "Sihirler"]];
  const body = pageHead(crumbs, `Lambanın <span class="gt">on beş sihri</span>`, "Cin Editör’den hazine vitrinine, 81 ilin haber haritasından görünürlük büyüsüne: Alladdin’in bütün yetenekleri, her biri kendi sayfasında.") +
    `<section class="s" style="border-top:0;padding-top:10px"><div class="w">${featureCards(FEATURES)}</div></section>${ctaBand()}`;
  return layout({ path: "/ozellikler", title: "Sihirler: Tüm Özellikler", desc: "Alladdin’in on beş sihri: Cin Editör, bitmeyen haber akışı, sihirli panel, yazarlar meclisi, hazine vitrini, görünürlük büyüsü, şimşek hızı ve daha fazlası.", crumbs, body, extraLd: [softwareNode()] });
}

function featurePage(f) {
  const crumbs = [["/ozellikler", "Sihirler"], ["/ozellikler/" + f.slug, f.title]];
  const others = FEATURES.filter((x) => x.slug !== f.slug);
  const body = pageHead(crumbs, esc(f.title), f.lead) +
    `<section class="s" style="border-top:0;padding-top:10px"><div class="w two"><div class="prose">${f.body.map((x) => `<p>${esc(x)}</p>`).join("")}
<h2>Bu sihrin içinde</h2><ul class="list">${f.points.map((x) => `<li>${ic("check")}<span>${esc(x)}</span></li>`).join("")}</ul>
<h2>Lambadaki diğer sihirler</h2><div class="tags">${others.map((x) => `<a href="/ozellikler/${x.slug}">${esc(x.title)}</a>`).join("")}</div></div>
<aside class="aside"><div class="ibox">${ic(f.icon)}</div><h3>${esc(f.title)}</h3><p class="note">${esc(f.short)}</p><p class="note" style="margin-top:14px">Ayrı ücret yok: bu sihir hem ${tl(GG.price.monthly)} TL’lik aylık hem ${tl(GG.price.yearly)} TL’lik yıllık pakette var.</p><div class="cta" style="margin-top:16px"><a class="btn btn-p" href="/demo">Demoda gör</a><a class="btn btn-g" href="/fiyatlar">Paketler</a></div></aside></div></section>${ctaBand()}`;
  return layout({ path: "/ozellikler/" + f.slug, title: f.title, desc: f.short, crumbs, body, extraLd: [softwareNode()] });
}

function howPage() {
  const crumbs = [["/nasil-calisir", "Nasıl Çalışır"]];
  const howto = { "@type": "HowTo", name: "Alladdin ile haber sitesi nasıl açılır?", totalTime: "P1D", estimatedCost: { "@type": "MonetaryAmount", currency: "TRY", value: String(GG.price.monthly) }, step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.t, text: s.d })) };
  const body = pageHead(crumbs, `Lambadan siteye <span class="gt">dört adım</span>`, "Masallardaki gibi üç dilekle sınırlı değilsiniz; ama kurulum gerçekten bu kadar kısa sürüyor.") +
    `<section class="s" style="border-top:0;padding-top:10px"><div class="w">${stepsHtml()}</div></section>
<section class="s"><div class="w two"><div class="prose"><h2>Siz beklerken cin ne yapıyor?</h2><p>Alan adınız bağlanırken tasarım logonuza ve renklerinize göre ayarlanır, kategori ağacınız kurulur ve seçtiğimiz kaynaklardan ilk haberler çekilir. Cin Editör de ilk taslaklarını hazırlamaya başlar; panelinize girdiğinizde sizi boş bir ekran değil, onay bekleyen içerikler karşılar.</p><p>Sunucu, sertifika, yedek ve güvenlik ayarları arka planda tamamlanır. Bunların hiçbiri için sizden işlem beklenmez.</p>
<h2>Teslimden sonra</h2><p>Panel bilgilerinizi aldığınız andan itibaren haber girebilir, manşet seçebilir, köşe yazarlarınızı ekleyebilirsiniz. Takıldığınız her yerde telefon ya da WhatsApp ile bize ulaşırsınız.</p></div>
<aside class="aside"><h3>Lambayı ovmadan önce</h3><ul class="list" style="margin-top:12px">${["Alan adınız (yoksa birlikte seçeriz)", "Logo dosyanız ve tercih ettiğiniz renkler", "Yayın yapacağınız il, ilçe ya da konu", "Panel kullanacak kişilerin e-postaları"].map((x) => `<li>${ic("check")}<span>${x}</span></li>`).join("")}</ul><div class="cta"><a class="btn btn-p" href="/demo">Lambayı ov</a></div></aside></div></section>${ctaBand()}`;
  return layout({ path: "/nasil-calisir", title: "Nasıl Çalışır? Lambadan Siteye Dört Adım", desc: "Alladdin ile haber sitesi açmak dört adım: lambayı ovun, dileğinizi söyleyin, cin işe koyulsun, siteniz yayında. Kurulum genellikle aynı gün.", crumbs, body, extraLd: [howto] });
}

function pricePage() {
  const crumbs = [["/fiyatlar", "Paketler"]];
  const pf = FAQS.filter((f) => /ücret|ödeme|ödersen|indirim|sözleşme|barındırma|alan ad|ne kadar/i.test(f.q + f.a)).slice(0, 6);
  const body = pageHead(crumbs, `Dilek <span class="gt">paketleri</span>`, `İster her ay ${tl(GG.price.monthly)} TL ödeyin, ister yılda bir kez ${tl(GG.price.yearly)} TL ödeyip %${GG.price.discountPct} kazanın. Cin Editör ve barındırma ikisinde de var.`) +
    `<section class="s" style="border-top:0;padding-top:10px"><div class="w">${pricingHtml()}</div></section>
<section class="s"><div class="w"><h2>Ödeme ve paketler hakkında</h2>${faqHtml(pf.length ? pf : FAQS.slice(0, 4))}</div></section>${ctaBand()}`;
  return layout({ path: "/fiyatlar", title: "Paketler ve Fiyatlar — Ayda 3.000 TL, Yılda 27.000 TL", desc: `Alladdin paketleri: aylık ${tl(GG.price.monthly)} TL ya da yıllık ${tl(GG.price.yearly)} TL (%${GG.price.discountPct} indirim, ayda ${tl(GG.price.yearlyPerMonth)} TL). Cin Editör ve barındırma dahil.`, crumbs, body, extraLd: [softwareNode()] });
}

function refsPage() {
  const crumbs = [["/referanslar", "Referanslar"]];
  const list = { "@type": "ItemList", name: "Alladdin altyapısıyla yayın yapan siteler", itemListElement: ALL_REFS().map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.name, url: r.url })) };
  const body = pageHead(crumbs, `Masalı <span class="gt">gerçek olan</span> siteler`, "Aynı altyapıyla her gün haber yayınlayan yerel siteler ve il haber ağı. Her kart sizi doğrudan canlı siteye götürür.") +
    `<section class="s" style="border-top:0;padding-top:10px"><div class="w"><h2>Yerel ve bölgesel yayınlar</h2><div class="refs">${AHENK_HSY_REFERENCES.map(refCard).join("")}</div></div></section>
<section class="s"><div class="w"><h2>İllerin haber ağı</h2><p class="sub">Tek merkezden yönetilen il siteleri; her biri kendi şehrinin gündemini taşıyor.</p><div class="refs">${AHENK_HSY_IL_REFERENCES.map(refCard).join("")}</div></div></section>${ctaBand("Bir sonraki masal sizin siteniz olsun", "Dileğinizi söyleyin; sizi de bu listeye ekleyelim.")}`;
  return layout({ path: "/referanslar", title: "Referanslar", desc: `Alladdin altyapısıyla yayın yapan ${ALL_REFS().length}+ yerel haber sitesi ve il haber ağı; logolarıyla ve canlı bağlantılarıyla.`, crumbs, body, extraLd: [list] });
}

function comparePage() {
  const crumbs = [["/karsilastirma", "Klasik Yol mu, Sihirli Yol mu?"]];
  const adv = [["Hemen başlarsınız", "Kurulum için yazılımcı aramaz, sunucu kiralamazsınız."], ["Boş sayfa görmezsiniz", "Akış ve Cin Editör sayesinde site ilk saatten canlıdır."], ["Bulunursunuz", "Arama motorları ve yapay zekâ asistanları için yapı hazırdır."], ["Beklemezsiniz", "Hafif sayfalar ve kenar önbelleğiyle hızlı açılış."], ["Bütçeniz bellidir", "Tek fiyat; sunucu ya da eklenti sürprizi yoktur."], ["Yalnız kalmazsınız", "Bir telefonla ulaşabileceğiniz gerçek bir ekip."]];
  const body = pageHead(crumbs, `Klasik yol mu, <span class="gt">sihirli yol</span> mu?`, "Script satın alıp kendiniz kurmak ile Alladdin’in tek paketlik hizmetini on başlıkta yan yana koyduk.") +
    `<section class="s" style="border-top:0;padding-top:10px"><div class="w">${compareHtml()}</div></section>
<section class="s"><div class="w"><h2>Sihirli yolun altı kazancı</h2><div class="grid">${adv.map(([t, d]) => `<div class="card"><div class="ibox">${ic("check")}</div><h3>${t}</h3><p>${d}</p></div>`).join("")}</div><p class="note" style="margin-top:22px">Maliyet tarafını merak ediyorsanız: <a href="/blog/haber-sitesi-maliyeti">Haber sitesi maliyeti rehberi</a></p></div></section>${ctaBand()}`;
  return layout({ path: "/karsilastirma", title: "Klasik Yol mu, Sihirli Yol mu? Karşılaştırma", desc: "Haber scripti satın alıp kurmak ile Alladdin’in hazır hizmeti arasındaki farklar: başlangıç, içerik, barındırma, güvenlik, görünürlük, hız, destek ve maliyet.", crumbs, body });
}

function faqPage() {
  const crumbs = [["/sss", "Merak Edilenler"]];
  const body = pageHead(crumbs, `Lambaya <span class="gt">sorulanlar</span>`, "Paketler, kurulum süresi, Cin Editör, alan adı ve destek hakkında en çok sorulan sorular ve yanıtları.") +
    `<section class="s" style="border-top:0;padding-top:10px"><div class="w" style="max-width:900px">${faqHtml(FAQS)}</div></section>${ctaBand("Sorunuz burada yoksa lambayı ovun", "Telefon, WhatsApp ya da form: hangisi kolayınıza gelirse.")}`;
  return layout({ path: "/sss", title: "Merak Edilenler (SSS)", desc: "Alladdin hakkında merak edilenler: ne kadar, ne zaman açılır, Cin Editör nasıl çalışır, alan adı, sözleşme, reklam geliri ve destek.", crumbs, body, extraLd: [faqNode(FAQS)] });
}

function blogIndex() {
  const crumbs = [["/blog", "Okuma Köşesi"]];
  const body = pageHead(crumbs, `Okuma <span class="gt">köşesi</span>`, "Haber sitesi kurmak, yerel yayıncılık, yapay zekâ ve maliyet üzerine sade ve pratik yazılar.") +
    `<section class="s" style="border-top:0;padding-top:10px"><div class="w"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">${POSTS.map((p) => `<a class="card" href="/blog/${p.slug}"><div class="ibox">${ic("doc")}</div><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p><span class="more">Okumaya başla ${ic("arrow")}</span></a>`).join("")}</div></div></section>${ctaBand()}`;
  return layout({ path: "/blog", title: "Okuma Köşesi: Haber Sitesi Rehberleri", desc: "Haber sitesi nasıl kurulur, yapay zekâ ile haber sitesi, yerel haber sitesi açmak ve haber sitesi maliyeti üzerine rehberler.", crumbs, body });
}

function postPage(p) {
  const crumbs = [["/blog", "Okuma Köşesi"], ["/blog/" + p.slug, p.title]];
  const art = { "@type": "Article", "@id": O + "/blog/" + p.slug + "#article", headline: p.title, description: p.desc, inLanguage: "tr-TR", datePublished: p.date, dateModified: p.date, image: O + A + "/og.jpg", author: { "@id": O + "/#org" }, publisher: { "@id": O + "/#org" }, mainEntityOfPage: O + "/blog/" + p.slug, keywords: p.kw };
  const others = POSTS.filter((x) => x.slug !== p.slug);
  const body = pageHead(crumbs, esc(p.title), p.desc) +
    `<section class="s" style="border-top:0;padding-top:10px"><div class="w two"><article class="prose">${p.sections.map(([h, t]) => `<h2>${esc(h)}</h2><p>${esc(t)}</p>`).join("")}
<h2>Kısacası</h2><p>Bu adımların hepsini tek tek ele almak yerine lambayı ovabilirsiniz: Alladdin, Cin Editör ve barındırma dahil ayda ${tl(GG.price.monthly)} TL ya da yılda ${tl(GG.price.yearly)} TL ile sitenizi kurar ve doldurur. <a href="/demo">Demo isteyin</a> veya <a href="/ozellikler">sihirlere göz atın</a>.</p></article>
<aside class="aside"><h3>Sıradaki okuma</h3><ul class="list" style="margin-top:12px">${others.map((x) => `<li>${ic("doc")}<a href="/blog/${x.slug}">${esc(x.title)}</a></li>`).join("")}</ul><div class="cta"><a class="btn btn-p" href="/demo">Demo iste</a></div></aside></div></section>${ctaBand()}`;
  return layout({ path: "/blog/" + p.slug, title: p.title, desc: p.desc, crumbs, body, extraLd: [art] });
}

function contactForm(topic, preset) {
  return `<form class="form" id="iletisim-formu" method="post" action="/api/hm/public/contact">
<input type="hidden" name="topic" value="${esc(topic)}">
<input type="hidden" name="ts" value="${Date.now()}">
<div class="hp" aria-hidden="true"><label>Web sitesi<input name="website" tabindex="-1" autocomplete="off"></label></div>
<label>Adınız ve soyadınız<input name="name" required maxlength="120" autocomplete="name"></label>
<label>E-posta adresiniz<input type="email" name="email" required maxlength="160" autocomplete="email"></label>
<label>Telefon (isteğe bağlı)<input type="tel" name="phone" maxlength="40" autocomplete="tel"></label>
<label>Dileğinizin başlığı<input name="title" required maxlength="160" value="${esc(preset)}"></label>
<label>Dileğiniz<textarea name="message" required maxlength="4000" placeholder="Nasıl bir haber sitesi hayal ediyorsunuz? Bölgeniz, alan adınız, ekibiniz…"></textarea></label>
<label class="chk"><input type="checkbox" name="kvkk" value="1" required> <span><a href="/kvkk">Aydınlatma metnini</a> okudum; bilgilerimin bu talep için kullanılmasını kabul ediyorum.</span></label>
<button class="btn btn-p" type="submit">Dileğimi gönder ${ic("arrow")}</button></form>`;
}
function contactInfo() {
  return `<div class="info"><div class="row">${ic("tel")}<div><b>Arayın ya da yazın</b><br><a href="tel:${GG.phoneTel}">${esc(GG.phone)}</a> · <a href="${GG.wa}" target="_blank" rel="noopener">WhatsApp</a></div></div>
<div class="row">${ic("mail")}<div><b>E-posta</b><br><a href="mailto:${GG.email}">${esc(GG.email)}</a></div></div>
<div class="row">${ic("pin")}<div><b>Lambanın adresi</b><br><a href="${GG.maps}" target="_blank" rel="noopener">${esc(GG.address.full)}</a><br><span class="note">${esc(GG.company)}</span></div></div></div>`;
}
function contactPage(url, demo) {
  const sent = url.searchParams.has("gonderildi"), err = url.searchParams.has("hata");
  const paket = url.searchParams.get("paket");
  const preset = demo ? "Demo dileği" : paket === "yillik" ? `Yıllık dilek paketi (${tl(GG.price.yearly)} TL)` : paket === "aylik" ? `Aylık dilek paketi (${tl(GG.price.monthly)} TL)` : "";
  const path = demo ? "/demo" : "/iletisim";
  const crumbs = [[path, demo ? "Demo" : "İletişim"]];
  const alert = sent ? `<div class="alert ok" role="status">Dileğiniz lambaya ulaştı! En kısa sürede size dönüyoruz.</div>` : err ? `<div class="alert err" role="alert">Mesajınız iletilemedi. Alanları kontrol edip yeniden deneyin ya da bizi arayın.</div>` : "";
  const h = demo ? `Demonuzu <span class="gt">dileyin</span>` : `Lambayı <span class="gt">ovun</span>`;
  const lead = demo ? "Kendi logonuz ve bölgenizle hazırlanmış canlı bir önizleme görmek ister misiniz? Formu doldurun, aynı gün sizinle iletişime geçelim." : "Paketler, kurulum ya da teknik sorularınız için yazın veya arayın; cevap vermekten mutluluk duyarız.";
  const extra = demo ? `<h3 style="margin-top:28px">Demoda sizi neler bekliyor?</h3><ul class="list" style="margin-top:10px">${["Logonuzla hazırlanmış örnek ana sayfa", "Sihirli panelde birlikte haber girme", "Cin Editör’ün hazırladığı örnek taslaklar", "Bölgenize göre ayarlanmış haber akışı"].map((x) => `<li>${ic("check")}<span>${x}</span></li>`).join("")}</ul>` : "";
  const body = pageHead(crumbs, h, lead) + `<section class="s" style="border-top:0;padding-top:10px"><div class="w two"><div>${alert}${contactForm("talep", preset)}</div><aside class="aside">${contactInfo()}${extra}</aside></div></section>`;
  return layout({ path, title: demo ? "Demo Dileyin" : "İletişim", desc: demo ? "Alladdin demo talebi: logonuz ve bölgenizle hazırlanmış canlı haber sitesi önizlemesi." : `Alladdin iletişim: ${GG.phone} · ${GG.email} · ${GG.address.full}.`, crumbs, body, noindex: sent || err || !!paket });
}

function aboutPage() {
  const crumbs = [["/hakkimizda", "Hakkımızda"]];
  const body = pageHead(crumbs, `Lambanın <span class="gt">arkasındakiler</span>`, `${GG.brand}, ${GG.company} tarafından Ankara’da geliştirilir ve hizmet olarak sunulur.`) +
    `<section class="s" style="border-top:0;padding-top:10px"><div class="w two"><div class="prose"><p>Alladdin fikri basit bir gözlemden doğdu: Yerel yayıncıların çoğu haber yapmak istiyor ama zamanlarının büyük kısmı sunucu, eklenti, güncelleme ve boş kalan kategorilerle geçiyor.</p><p>Biz bu yükü bir lambanın içine koyduk. Kurulum, barındırma, haber akışı ve yapay zekâ destekli taslak üretimi tek pakette; yayıncıya kalan iş ise en keyifli olanı: habercilik.</p><p>Bugün aynı altyapı ${ALL_REFS().length}’den fazla haber sitesini ve il haber ağını her gün yayında tutuyor. Ekibimize telefonla, WhatsApp’tan ya da e-postayla doğrudan ulaşabilirsiniz.</p></div><aside class="aside">${contactInfo()}</aside></div></section>${ctaBand()}`;
  return layout({ path: "/hakkimizda", title: "Hakkımızda", desc: `Alladdin Haber Sitesi Yazılımı’nın hikâyesi ve ekibi — ${GG.company}, ${GG.address.full}.`, crumbs, body });
}

function kvkkPage() {
  const crumbs = [["/kvkk", "Kişisel Verilerin Korunması"]];
  const ps = [
    `Bu metin, ${GG.brand} (${GG.company}, ${GG.address.full}) tarafından alladdin.app üzerinden toplanan kişisel veriler hakkında bilgi vermek için hazırlanmıştır. Bize ${GG.email} adresinden ya da ${GG.phone} numarasından ulaşabilirsiniz.`,
    "Demo ve iletişim formlarına yazdığınız adınız, e-posta adresiniz, telefon numaranız ve mesajınız yalnızca size dönüş yapmak, teklif sunmak ve talep ettiğiniz hizmeti vermek için kullanılır.",
    "Bu veriler 6698 sayılı Kanun’un 5. maddesi kapsamında açık rızanıza ve bir sözleşmenin kurulmasıyla doğrudan ilgili olmasına dayanarak işlenir. Reklam ya da pazarlama amacıyla başka kişilere verilmez.",
    "Talebiniz sonuçlandıktan sonra veriler, ilgili mevzuatın gerektirdiği süre kadar saklanır; bu sürenin sonunda silinir ya da anonimleştirilir.",
    `Kanun’un 11. maddesindeki bilgi alma, düzeltme ve silme gibi haklarınız için ${GG.email} adresine yazmanız yeterlidir.`,
  ];
  const body = pageHead(crumbs, "Kişisel Verilerin Korunması", "") + `<section class="s" style="border-top:0;padding-top:0"><div class="w prose">${ps.map((x) => `<p>${esc(x)}</p>`).join("")}</div></section>`;
  return layout({ path: "/kvkk", title: "Kişisel Verilerin Korunması (KVKK)", desc: "Alladdin kişisel verilerin işlenmesine ilişkin aydınlatma metni.", crumbs, body });
}

function notFound(path) {
  const body = pageHead([], `Bu sayfa <span class="gt">lambadan çıkmadı</span>`, "Aradığınız sayfa burada değil. Belki taşındı, belki hiç dilenmedi.") +
    `<section class="s" style="border-top:0;padding-top:0"><div class="w"><div class="cta"><a class="btn btn-p" href="/">Ana sayfaya dön</a><a class="btn btn-g" href="/ozellikler">Sihirler</a><a class="btn btn-g" href="/iletisim">İletişim</a></div></div></section>`;
  return layout({ path, title: "Sayfa bulunamadı", desc: "Sayfa bulunamadı.", body, noindex: true });
}

const ALIASES = new Map([
  ["/haber-sitesi-kurmak", "/blog/haber-sitesi-nasil-kurulur"], ["/yapay-zeka-haber-sitesi", "/blog/yapay-zeka-ile-haber-sitesi"],
  ["/yerel-haber-sitesi", "/blog/yerel-haber-sitesi-acmak"], ["/haber-sitesi-fiyatlari", "/blog/haber-sitesi-maliyeti"],
  ["/paketler", "/fiyatlar"], ["/fiyat", "/fiyatlar"], ["/sihirler", "/ozellikler"], ["/cin-editor", "/ozellikler/cin-editor"],
  ["/contact", "/iletisim"], ["/hakkinda", "/hakkimizda"], ["/index.html", "/"], ["/faq", "/sss"], ["/neden-alladdin", "/karsilastirma"], ["/rehber", "/blog"],
]);

export function alladdinSitemapPaths() {
  return ["/", "/ozellikler", ...FEATURES.map((f) => "/ozellikler/" + f.slug), "/nasil-calisir", "/fiyatlar", "/referanslar", "/karsilastirma", "/sss", "/blog", ...POSTS.map((p) => "/blog/" + p.slug), "/demo", "/iletisim", "/hakkimizda", "/kvkk"];
}

function robotsTxt() {
  const bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Googlebot", "Bingbot", "Applebot", "Applebot-Extended", "CCBot", "Bytespider", "Amazonbot", "meta-externalagent", "DuckAssistBot", "cohere-ai", "MistralAI-User", "YandexBot", "xAI-Bot", "Grok"];
  const rules = "Allow: /\nDisallow: /editor\nDisallow: /api/\n";
  return `# ${GG.brand} — ${O}\n# Content-Signal: search=yes, ai-input=yes, ai-train=yes\nUser-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=yes\n${rules}\n${bots.map((b) => `User-agent: ${b}\n${rules}`).join("\n")}\nSitemap: ${O}/sitemap.xml\n`;
}
function sitemapXml() {
  const pr = (p) => (p === "/" ? "1.0" : /^\/(fiyatlar|ozellikler|demo)$/.test(p) ? "0.9" : "0.7");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${alladdinSitemapPaths().map((p) => `<url><loc>${O}${p}</loc><lastmod>2026-10-09</lastmod><changefreq>${p === "/" ? "weekly" : "monthly"}</changefreq><priority>${pr(p)}</priority></url>`).join("\n")}\n</urlset>\n`;
}
function llmsTxt() {
  const p = GG.price;
  return `# ${GG.brand}

> ${GG.brand} (alladdin.app), ${GG.company} tarafından Ankara'dan sunulan bir haber sitesi hizmetidir. Kurulum, barındırma, otomatik haber akışı, yönetim paneli ve "Cin Editör" adlı yapay zekâ destekli taslak üretimi tek pakettedir. Sihirli lamba / dilek temasıyla tanıtılır.

## Kısa bilgiler
- Paketler: aylık ${tl(p.monthly)} TL; yıllık ${tl(p.yearly)} TL (%${p.discountPct} indirim, aylık ${tl(p.yearlyPerMonth)} TL'ye denk). Barındırma ve Cin Editör iki pakette de var.
- Kurulum: genellikle aynı gün; teknik bilgi gerekmez.
- Şirket: ${GG.company} · ${GG.address.full}
- Telefon / WhatsApp: ${GG.phone} · E-posta: ${GG.email}
- Altyapıyı kullanan siteler: ${ALL_REFS().length}+ (${O}/referanslar)

## On beş sihir (özellikler)
${FEATURES.map((f) => `- [${f.title}](${O}/ozellikler/${f.slug}): ${f.short}`).join("\n")}

## Önemli sayfalar
- [Paketler ve fiyatlar](${O}/fiyatlar)
- [Lambadan siteye dört adım](${O}/nasil-calisir)
- [Klasik yol mu, sihirli yol mu?](${O}/karsilastirma)
- [Merak edilenler](${O}/sss)
- [Demo talebi](${O}/demo)
- [İletişim](${O}/iletisim)

## Okuma köşesi
${POSTS.map((x) => `- [${x.title}](${O}/blog/${x.slug}): ${x.desc}`).join("\n")}

## Merak edilenler
${FAQS.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}
`;
}
function aiTxt() {
  return `# ai.txt — ${O}\n# ${GG.brand} · ${GG.company}\nUser-Agent: *\nAllow: /\nDisallow: /editor\nDisallow: /api/\n\n# Bu sitenin herkese açık sayfaları yapay zekâ destekli arama, özet ve yanıtlarda kullanılabilir.\n# Alıntı yaparken ${O} bağlantısını kaynak olarak gösterin.\n# Makine için özet: ${O}/llms.txt\n# Ulaşın: ${GG.email} / ${GG.phone}\n`;
}

const HTML_H = { "content-type": "text/html; charset=utf-8", "x-yekpare-frontend": "cloudflare-alladdin-site", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "SAMEORIGIN" };

function respond(request, status, body, type, cache, extra = {}) {
  const headers = new Headers({ ...HTML_H, "content-type": type, "cache-control": cache, ...extra });
  return new Response(request.method === "HEAD" ? null : body, { status, headers });
}

/**
 * @returns {Promise<Response|null>|Response|null}
 */
export function serveAlladdinApp(request, incoming, env) {
  const host = String(incoming.hostname || "").toLowerCase();
  if (!ALLADDIN_HOSTS.has(host)) return null;
  const raw = incoming.pathname || "/";
  const lower = raw.toLowerCase();
  if (host === "www.alladdin.app") {
    const m = request.method === "GET" || request.method === "HEAD" ? 301 : 308;
    return new Response(null, { status: m, headers: { location: O + raw + incoming.search, "cache-control": "public, max-age=86400", "x-yekpare-frontend": "cloudflare-alladdin-site" } });
  }
  if (PASS_PREFIXES.some((p) => lower === p.replace(/\/$/, "") || lower.startsWith(p.endsWith("/") ? p : p + "/") || (!p.endsWith("/") && lower.startsWith(p + ".")))) {
    if (lower.startsWith("/alladdin/") && env?.ASSETS && (request.method === "GET" || request.method === "HEAD")) {
      return env.ASSETS.fetch(new Request(new URL(raw, "https://alladdin.app/").toString(), { method: request.method })).then((r) => {
        if (!r.ok) return r;
        const h = new Headers(r.headers);
        h.set("cache-control", "public, max-age=2592000, immutable");
        h.set("access-control-allow-origin", "*");
        h.set("x-yekpare-frontend", "cloudflare-alladdin-asset");
        return new Response(r.body, { status: r.status, headers: h });
      });
    }
    return null;
  }
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (raw.length > 1 && raw.endsWith("/")) {
    return new Response(null, { status: 301, headers: { location: O + raw.replace(/\/+$/, "") + incoming.search, "cache-control": "public, max-age=86400", "x-yekpare-frontend": "cloudflare-alladdin-site" } });
  }
  let path = raw;
  try { path = decodeURIComponent(raw); } catch {}
  path = path.toLowerCase();
  if (ALIASES.has(path)) {
    return new Response(null, { status: 301, headers: { location: O + ALIASES.get(path), "cache-control": "public, max-age=86400", "x-yekpare-frontend": "cloudflare-alladdin-site" } });
  }
  const C = "public, max-age=300, s-maxage=600";
  const T = "text/plain; charset=utf-8";
  if (path === "/robots.txt") return respond(request, 200, robotsTxt(), T, C);
  if (path === "/sitemap.xml") return respond(request, 200, sitemapXml(), "application/xml; charset=utf-8", C);
  if (path === "/llms.txt") return respond(request, 200, llmsTxt(), "text/markdown; charset=utf-8", C);
  if (path === "/ai.txt") return respond(request, 200, aiTxt(), T, C);
  if (path === `/${ALLADDIN_INDEXNOW_KEY}.txt`) return respond(request, 200, ALLADDIN_INDEXNOW_KEY, T, C);
  if (path === "/favicon.ico") return new Response(null, { status: 301, headers: { location: A + "/icon-48.png?v=" + REV, "cache-control": "public, max-age=86400" } });

  const H = "text/html; charset=utf-8";
  let html = null;
  let cache = C;
  if (path === "/") html = home();
  else if (path === "/ozellikler") html = featuresIndex();
  else if (path.startsWith("/ozellikler/") && FEAT.has(path.slice(12))) html = featurePage(FEAT.get(path.slice(12)));
  else if (path === "/nasil-calisir") html = howPage();
  else if (path === "/fiyatlar") html = pricePage();
  else if (path === "/referanslar") html = refsPage();
  else if (path === "/karsilastirma") html = comparePage();
  else if (path === "/sss") html = faqPage();
  else if (path === "/blog") html = blogIndex();
  else if (path.startsWith("/blog/") && POST.has(path.slice(6))) html = postPage(POST.get(path.slice(6)));
  else if (path === "/iletisim" || path === "/demo") { html = contactPage(incoming, path === "/demo"); cache = "no-store"; }
  else if (path === "/hakkimizda") html = aboutPage();
  else if (path === "/kvkk") html = kvkkPage();
  if (html) return respond(request, 200, html, H, cache);
  return respond(request, 404, notFound(path), H, "public, max-age=60");
}
