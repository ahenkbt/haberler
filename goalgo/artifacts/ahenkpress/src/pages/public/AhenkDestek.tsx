import { useState } from "react";
import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkFaqList, AhenkPageHero } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { apiUrl } from "@/lib/apiBase";

const FAQS = [
  {
    q: "Destek talebi nereye düşer?",
    a: "Form yönetim paneline (İletişim mesajları / Destek talepleri) düşer. Ahenk ekibi en kısa sürede dönüş yapar.",
  },
  {
    q: "Haber sitesi veya web yazılımı için ne yazmalıyım?",
    a: "İstediğiniz sektörü, alan adını ve teslim süresini belirtin. Haber sitesi yazılımı için /haber-sitesi-yazilimi ve canlı demo için /haberler sayfalarına bakabilirsiniz.",
  },
  {
    q: "Çağrı merkezi başvurusu buradan mı?",
    a: "Hayır. Kariyer başvuruları /kariyer formundan alınır. Destek sayfası teknik ve kurumsal sorular içindir.",
  },
];

export default function AhenkDestek() {
  const site = useAhenkAgencySite();
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
          subject: subject.trim() || "Destek talebi",
          message,
          pageSource: "ahenk-agency/destek",
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
    <AhenkAgencyChrome
      title="Destek | Ahenk Bilgi Teknolojileri"
      description="Ahenk BT teknik destek ve kurumsal talep formu. Giriş zorunlu değildir."
    >
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Destek
          </>
        }
        title="Destek"
        lead={`${site.phone} · ${site.email} · Giriş gerekmez.`}
        image={site.aboutImage}
      />
      <section className="ahenk-section ahenk-split">
        <form className="ahenk-form" onSubmit={(e) => void submit(e)}>
          <h2>Destek talebi</h2>
          <p className="ahenk-lead">
            Web yazılımı, haber sitesi, asistan AI veya yayın sorunları için yazın. Mesajınız yönetim paneline düşer.
          </p>
          {done === "ok" ? <div className="ahenk-msg ahenk-msg-ok">Talebiniz iletildi.</div> : null}
          {done === "err" ? <div className="ahenk-msg ahenk-msg-err">{errText}</div> : null}
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad soyad" />
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Konu" />
          <textarea required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Sorununuz veya talebiniz" />
          <button type="submit" className="ahenk-btn" disabled={sending}>
            {sending ? "Gönderiliyor…" : "Gönder"}
          </button>
        </form>
        <aside>
          <h2>İletişim</h2>
          <p>
            <strong>GSM:</strong> <a href={`tel:${site.phoneTel}`}>{site.phone}</a>
          </p>
          <p>
            <strong>E-posta:</strong> <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>
          <p>
            <Link href="/iletisim">İletişim</Link>
            {" · "}
            <Link href="/iletisim-kunye">Künye</Link>
            {" · "}
            <Link href="/haberler">AHENK HABER demosu</Link>
          </p>
          <AhenkFaqList faqs={FAQS} />
        </aside>
      </section>
    </AhenkAgencyChrome>
  );
}
