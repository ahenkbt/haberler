// "Röportaj / Özel Haber ekle": admin form → TP news rows (category ozel-haber) on the selected PHP news sites.
// Images are stored in TP hm_ozel_media (resized in the browser) and served publicly from /api/bekci/media/<id>.<ext>.
// Rows use ids >= 2,000,000,000 so they can never collide with panel→PHP synced ids.
export const OZEL_CAT_SLUG = "ozel-haber";
const ID_BASE = 2000000000;
const EXCLUDE_SLUGS = new Set(["vkd", "trafik", "tr", "kirsehirhaber"]);
const EXCLUDE_DOMAINS = new Set(["tukav.org", "kirsehirhaber.org"]);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function slugify(t) {
  const m = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
  return String(t || "").toLocaleLowerCase("tr-TR").replace(/[çğıöşüâîû]/g, (c) => m[c]).normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "ozel-haber";
}
export async function ozelSites(sql) {
  const rows = await sql.query(`SELECT DISTINCT ON (lower(domain)) id, slug, display_name, domain FROM hm_news_sites WHERE active IS DISTINCT FROM false AND coalesce(domain,'')<>'' ORDER BY lower(domain), id`);
  return rows.filter((r) => !EXCLUDE_SLUGS.has(r.slug) && !EXCLUDE_DOMAINS.has(String(r.domain).toLowerCase()))
    .map((r) => ({ id: Number(r.id), slug: r.slug, name: String(r.display_name || r.slug), domain: String(r.domain).toLowerCase().replace(/^www\./, "") }))
    .sort((a, b) => a.id - b.id);
}
async function catId(sql) {
  const r = await sql.query(`SELECT id FROM categories WHERE slug=$1 AND exclusive_site_id IS NULL ORDER BY id LIMIT 1`, [OZEL_CAT_SLUG]);
  if (!r.length) throw new Error("ozel-haber kategorisi yok");
  return Number(r[0].id);
}
function videoHtml(v) {
  v = String(v || "").trim(); if (!v) return "";
  let m = v.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/);
  if (m) return `<div class="ozel-video" style="position:relative;padding-top:56.25%;margin:16px 0"><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="Video" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  if (/^https:\/\/[^\s"'<>]+\.(mp4|webm)(\?[^\s"'<>]*)?$/i.test(v)) return `<video controls preload="metadata" style="width:100%;margin:16px 0" src="${esc(v)}"></video>`;
  if (/^https:\/\/[^\s"'<>]+$/.test(v)) return `<p><a href="${esc(v)}" target="_blank" rel="noopener">▶ Videoyu izle</a></p>`;
  return "";
}
function bodyHtml(body, imgs, video) {
  const paras = String(body || "").replace(/\r/g, "").split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
  const out = []; const extra = imgs.slice(1);
  paras.forEach((p, i) => {
    out.push(`<p>${esc(p)}</p>`);
    if (extra.length && (i + 1) % 3 === 0) { const im = extra.shift(); out.push(`<figure><img src="${esc(im)}" alt="" loading="lazy" style="max-width:100%;height:auto"></figure>`); }
  });
  for (const im of extra) out.push(`<figure><img src="${esc(im)}" alt="" loading="lazy" style="max-width:100%;height:auto"></figure>`);
  const vh = videoHtml(video); if (vh) out.splice(Math.min(1, out.length), 0, vh);
  return out.join("\n");
}
function dataUrlToBytes(d) {
  const m = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(String(d || ""));
  if (!m) return null;
  const bin = atob(m[2]); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return { mime: m[1], bytes: b };
}
const toHex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export async function ozelCreate(sql, body, { origin = "https://ahenk.net.tr", who = "panel" } = {}) {
  const title = String(body.title || "").trim().slice(0, 220);
  const spot = String(body.spot || "").trim().slice(0, 600);
  const text = String(body.body || "").trim();
  if (title.length < 8) throw new Error("Başlık en az 8 karakter olmalı");
  if (text.length < 40) throw new Error("Haber metni çok kısa");
  const all = await ozelSites(sql);
  const want = body.allSites ? all : all.filter((s) => (body.sites || []).map(Number).includes(s.id));
  if (!want.length) throw new Error("En az bir site seçin");
  const images = [];
  for (const d of (body.images || []).slice(0, 8)) {
    const x = dataUrlToBytes(d); if (!x) continue;
    if (x.bytes.length > 1500000) throw new Error("Görsel çok büyük (en fazla 1,5 MB)");
    const r = await sql.query(`INSERT INTO hm_ozel_media (mime, data) VALUES ($1, decode($2,'hex')) RETURNING id`, [x.mime, toHex(x.bytes)]);
    images.push(`${origin}/api/bekci/media/${r[0].id}.${x.mime === "image/jpeg" ? "jpg" : x.mime.split("/")[1]}`);
  }
  for (const u of (body.imageUrls || []).slice(0, 4)) if (/^https:\/\/[^\s"'<>]+$/.test(String(u))) images.push(String(u));
  if (!images.length) throw new Error("En az bir görsel ekleyin (kapak görseli)");
  const cat = await catId(sql);
  const group = "ozel:" + crypto.randomUUID().slice(0, 12);
  const html = bodyHtml(text, images, body.video);
  const base = slugify(title);
  const [{ next }] = await sql.query(`SELECT GREATEST(COALESCE(max(id), $1), $1) + 1 AS next FROM news WHERE id >= $1`, [ID_BASE]);
  let id = Number(next); const rows = [];
  for (const s of want) {
    const slug = `${base}-oh${(id - ID_BASE).toString(36)}`;
    await sql.query(`INSERT INTO news (id, title, slug, spot, content, image_url, category_id, status, is_featured, is_breaking, views, tags, is_ai_generated, created_at, updated_at, site_id, is_editor_manual, site_only, owner_site_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'published',false,false,0,$8,false,now(),now(),$9,true,true,$9)`,
      [id, title, slug, spot || null, html, images[0], cat, [group, "ozel-haber", "roportaj"], s.id]);
    rows.push({ id, site: s.domain, siteId: s.id, url: `https://${s.domain}/haber/${slug}` });
    id++;
  }
  return { group, rows, images, by: who };
}
export async function ozelList(sql) {
  const r = await sql.query(`SELECT tags[1] AS grp, min(title) AS title, min(created_at) AS at, bool_or(status='published') AS live, count(*) AS n,
      json_agg(json_build_object('id', id, 'siteId', site_id, 'slug', slug, 'status', status) ORDER BY site_id) AS rows
    FROM news WHERE id >= $1 AND tags[1] LIKE 'ozel:%' GROUP BY 1 ORDER BY min(created_at) DESC LIMIT 30`, [ID_BASE]);
  return r;
}
export async function ozelSetStatus(sql, group, live) {
  if (!/^ozel:[0-9a-f-]{6,40}$/.test(String(group))) throw new Error("geçersiz kayıt");
  const r = await sql.query(`UPDATE news SET status=$2, updated_at=now() WHERE id >= $3 AND tags[1]=$1 RETURNING id, site_id`, [group, live ? "published" : "draft", ID_BASE]);
  return { n: r.length, siteIds: [...new Set(r.map((x) => Number(x.site_id)))] };
}
export async function ozelMedia(sql, id) {
  const r = await sql.query(`SELECT mime, encode(data,'base64') AS b64 FROM hm_ozel_media WHERE id=$1`, [Number(id)]);
  if (!r.length) return new Response("yok", { status: 404 });
  const bin = atob(r[0].b64); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return new Response(b, { headers: { "content-type": r[0].mime, "cache-control": "public, max-age=31536000, immutable", "access-control-allow-origin": "*" } });
}

export function ozelPage() {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Röportaj / Özel Haber ekle — Yönetim</title>
<style>body{font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;margin:0;background:#f5f6f8;color:#1b2430}header{background:#0B2A5B;color:#fff;padding:12px 18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}header a{color:#cfe0ff;text-decoration:none}main{padding:16px 18px;max-width:1000px;margin:auto}.card{background:#fff;border-radius:14px;box-shadow:0 1px 3px #0001;padding:16px 18px;margin-bottom:16px}h2{font-size:16px;margin:0 0 10px}label{display:block;font-weight:600;margin:12px 0 4px}input[type=text],input[type=url],textarea{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #cfd6e2;border-radius:8px;font:inherit}textarea{min-height:240px}button{background:#e61e25;color:#fff;border:0;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:600}button.sec{background:#fff;color:#0B2A5B;border:1px solid #c9d3e3;padding:5px 10px}.sites{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:4px 12px;margin-top:6px}.sites label{font-weight:400;margin:0}.m{color:#667;font-size:12px}.th{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.th img{width:110px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #ddd}table{border-collapse:collapse;width:100%}td,th{padding:7px 6px;border-bottom:1px solid #eceff3;text-align:left;font-size:13px;vertical-align:top}.ok{color:#11683a}.er{color:#a01515}</style></head><body>
<header><b style="font-size:17px">📝 Röportaj / Özel Haber ekle</b><span class="m" style="color:#cfe0ff">Seçilen haber sitelerinin “Özel Haber” bölümünde yayımlanır</span><span style="flex:1"></span><a href="/admin/ai-icerik-robotu">🤖 AI Haber Editörü</a><a href="/admin">← Yönetim paneli</a></header>
<main><form id="f" class="card">
<label>Başlık *</label><input type="text" id="title" maxlength="220" required>
<label>Özet (spot)</label><input type="text" id="spot" maxlength="600">
<label>Haber / röportaj metni * <span class="m">(paragrafları boş satırla ayırın)</span></label><textarea id="body" required></textarea>
<label>Görseller * <span class="m">(ilk görsel kapak olur; en fazla 8; tarayıcıda küçültülür)</span></label><input type="file" id="imgs" accept="image/*" multiple><div class="th" id="th"></div>
<label>Video bağlantısı (isteğe bağlı) <span class="m">YouTube veya .mp4 adresi</span></label><input type="url" id="video" placeholder="https://www.youtube.com/watch?v=...">
<label>Yayımlanacak siteler *</label><label style="font-weight:600"><input type="checkbox" id="all"> Tüm sitelerde yayınla</label><div class="sites" id="sites"><span class="m">Yükleniyor…</span></div>
<p style="margin-top:16px"><button type="submit" id="go">Yayınla</button> <span id="msg" class="m"></span></p></form>
<div class="card"><h2>Son özel haberler</h2><div id="list" class="m">Yükleniyor…</div></div></main>
<script>window.__BK_PAGE=1;
const f=(u,o)=>fetch(u,Object.assign({credentials:"include",cache:"no-store"},o||{})).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||("HTTP "+r.status));return d;});
const e=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const tr=d=>d?new Date(d).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"short",timeStyle:"short"}):"–";
let SITES=[],IMGS=[];
function shrink(file){return new Promise((ok,no)=>{const img=new Image();img.onload=()=>{const k=Math.min(1,1600/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext("2d").drawImage(img,0,0,c.width,c.height);let q=.82,d=c.toDataURL("image/webp",q);if(!d.startsWith("data:image/webp"))d=c.toDataURL("image/jpeg",q);while(d.length>1900000&&q>.4){q-=.12;d=c.toDataURL(d.startsWith("data:image/webp")?"image/webp":"image/jpeg",q);}ok(d);URL.revokeObjectURL(img.src);};img.onerror=()=>no(new Error("görsel okunamadı"));img.src=URL.createObjectURL(file);});}
document.getElementById("imgs").onchange=async ev=>{IMGS=[];const th=document.getElementById("th");th.innerHTML="";for(const fl of [...ev.target.files].slice(0,8)){try{const d=await shrink(fl);IMGS.push(d);th.insertAdjacentHTML("beforeend",'<img src="'+d+'">');}catch(x){alert(x.message);}}};
document.getElementById("all").onchange=ev=>document.querySelectorAll(".st").forEach(c=>{c.checked=ev.target.checked;c.disabled=ev.target.checked;});
async function load(){const d=await f("/api/bekci/ozel-haber");SITES=d.sites;
 document.getElementById("sites").innerHTML=d.sites.map(s=>'<label><input type="checkbox" class="st" value="'+s.id+'"> '+e(s.name)+' <span class=m>'+e(s.domain)+'</span></label>').join("");
 const byId=Object.fromEntries(d.sites.map(s=>[s.id,s]));
 document.getElementById("list").innerHTML=d.items.length?"<table><tr><th>Tarih</th><th>Başlık</th><th>Siteler</th><th>Durum</th><th></th></tr>"+d.items.map(it=>"<tr><td>"+tr(it.at)+"</td><td><b>"+e(it.title)+"</b></td><td>"+it.rows.map(r=>{const s=byId[r.siteId];return s?'<a target=_blank href="https://'+e(s.domain)+'/haber/'+e(r.slug)+'">'+e(s.domain)+"</a>":"#"+r.siteId}).join(", ")+"</td><td>"+(it.live?'<span class=ok>yayında</span>':'<span class=m>gizli</span>')+'</td><td><button class="sec tg" data-g="'+e(it.grp)+'" data-l="'+(it.live?0:1)+'">'+(it.live?"Gizle":"Yayına al")+"</button></td></tr>").join("")+"</table>":"Henüz özel haber yok.";
 document.querySelectorAll(".tg").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await f("/api/bekci/ozel-haber/status",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({group:b.dataset.g,live:b.dataset.l==="1"})});load();}catch(x){alert(x.message);b.disabled=false;}});}
document.getElementById("f").onsubmit=async ev=>{ev.preventDefault();const m=document.getElementById("msg"),go=document.getElementById("go");
 const all=document.getElementById("all").checked,sites=[...document.querySelectorAll(".st:checked")].map(c=>+c.value);
 if(!IMGS.length){m.textContent="En az bir görsel ekleyin.";return;} if(!all&&!sites.length){m.textContent="En az bir site seçin.";return;}
 go.disabled=true;m.textContent="Yayımlanıyor…";
 try{const d=await f("/api/bekci/ozel-haber",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:document.getElementById("title").value,spot:document.getElementById("spot").value,body:document.getElementById("body").value,video:document.getElementById("video").value,images:IMGS,allSites:all,sites})});
  m.innerHTML='<span class=ok>Yayımlandı: '+d.rows.length+' site.</span> '+d.rows.slice(0,4).map(r=>'<a target=_blank href="'+e(r.url)+'">'+e(r.site)+"</a>").join(", ")+(d.rows.length>4?" …":"");ev.target.reset();IMGS=[];document.getElementById("th").innerHTML="";load();}
 catch(x){m.innerHTML='<span class=er>'+e(x.message)+"</span>";}go.disabled=false;};
load().catch(x=>document.getElementById("sites").innerHTML='<span class=er>'+e(x.message)+"</span>");</script></body></html>`;
}
