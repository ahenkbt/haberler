import { useState } from "react";
import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkPageHero } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { apiUrl } from "@/lib/apiBase";

export default function AhenkAgencyIletisim({ variant = "iletisim" }: { variant?: "iletisim" | "kunye" }) {
  const site = useAhenkAgencySite();
  const kunye = variant === "kunye";
  const pageTitle = kunye ? "İletişim · Künye" : "İletişim";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<null | "ok" | "err">(null);
  const [errText, setErrText] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setDone(null);
    setErrText("");
    try {
      const res = await fetch(apiUrl("/api/site/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          subject,
          message,
          pageSource: kunye ? "ahenk-agency/iletisim-kunye" : "ahenk-agency/iletisim",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDone("err");
        setErrText(typeof data.error === "string" ? data.error : "Gönderilemedi");
        return;
      }
      setDone("ok");
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
    } catch {
      setDone("err");
      setErrText("Bağlantı hatası");
    } finally {
      setSending(false);
    }
  }

  return (
    <AhenkAgencyChrome title={pageTitle} description="Ahenk Bilgi Teknolojileri iletişim, künye ve ofis bilgileri.">
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / {pageTitle}
          </>
        }
        title={pageTitle}
        lead={`${site.phone} · ${site.email}`}
        image={site.aboutImage}
      />
      <section className="ahenk-section ahenk-split">
        <form className="ahenk-form" onSubmit={(e) => void submit(e)}>
          <h2>Bize yazın</h2>
          <p className="ahenk-lead">Mesajınız yönetim paneline düşer; mevcut iletişim formu altyapısı kullanılır.</p>
          {done === "ok" ? <div className="ahenk-msg ahenk-msg-ok">Mesajınız iletildi.</div> : null}
          {done === "err" ? <div className="ahenk-msg ahenk-msg-err">{errText}</div> : null}
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad soyad" />
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Konu" />
          <textarea required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mesajınız" />
          <button type="submit" className="ahenk-btn" disabled={sending}>
            {sending ? "Gönderiliyor…" : "Gönder"}
          </button>
        </form>
        <aside>
          <h2>İletişim bilgileri</h2>
          <p>
            <strong>GSM:</strong> <a href={`tel:${site.phoneTel}`}>{site.phone}</a>
          </p>
          <p>
            <strong>WhatsApp:</strong>{" "}
            <a
              href={`https://wa.me/905413136245?text=${encodeURIComponent("Merhaba, web yazılımı hakkında bilgi almak istiyorum.")}`}
              target="_blank"
              rel="noreferrer"
            >
              {site.phone}
            </a>
          </p>
          <p>
            <strong>E-posta:</strong> <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>
          {kunye ? (
            <>
              <p>
                <strong>Unvan:</strong> {site.brandName}
              </p>
              <p>
                <strong>Web:</strong>{" "}
                <a href="https://ahenk.net.tr" rel="noreferrer">
                  ahenk.net.tr
                </a>
              </p>
            </>
          ) : null}
          <p>
            {site.pricePeriodNote}
            <br />
            {site.aiDeliveryLead}
          </p>
          <p>
            {site.hoursWeekday}
            <br />
            {site.hoursSunday}
          </p>
          <div className="ahenk-offices" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
            {site.offices.map((o) => (
              <article key={o.id} className="ahenk-office">
                <h3>
                  {o.flag} {o.country}
                </h3>
                <p>{o.address}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </AhenkAgencyChrome>
  );
}
