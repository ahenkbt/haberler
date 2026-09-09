import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkFaqList,
  AhenkPageHero,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { apiUrl } from "@/lib/apiBase";
import { AHENK_PHOTOS } from "@/lib/ahenkAgencySite";

const SERVICES = [
  {
    title: "Giden arama ve ürün tanıtımı",
    text: "Kurumsal hedef kitleye yönelik outbound çağrı, tanıtım senaryosu ve sipariş teyidi. Temsilciler kişisel tahsilat yapmaz; ödeme resmi hesaplara yönlendirilir.",
  },
  {
    title: "Müşteri hizmetleri ve CRM",
    text: "Gelen/giden çağrı, not, randevu ve sonuç kaydı aynı operasyon masasında tutulur. pbx.goalgo.org üzerinden CRM ve PBX altyapısı kullanılır.",
  },
  {
    title: "Home-office çağrı operasyonu",
    text: "Uzaktan çalışma modeli: oryantasyon, kısmi süreli sözleşme ve sistem log’larına dayalı puantaj. Kalite için tüm görüşmeler kayıt altındadır.",
  },
  {
    title: "Eğitim, kalite ve KVKK",
    text: "Santral, script ve veri kullanımı eğitimi; ses kaydı, log sorumluluğu ve KVKK uyumu. Veriler yalnızca ilgili proje kapsamında kullanılır.",
  },
];

const AUDIENCE = [
  {
    title: "Eğitim kurumları",
    text: "Türkiye genelindeki resmi ve özel okullar ile okul idarecileri.",
  },
  {
    title: "Yerel yönetimler",
    text: "Mahalle ve köy muhtarları ile yerel idare iletişim noktaları.",
  },
  {
    title: "Kamu kurumları",
    text: "Bakanlıkların il ve ilçe müdürlükleri ve kamu yetkilileri.",
  },
];

const QUALITIES = [
  "Diksiyonu düzgün, saygın ve profesyonel dil kullanan",
  "Hedef odaklı, düzenli home-office çalışabilen",
  "CRM / santral yazılımını öğrenmeye açık",
  "KVKK ve kurumsal temsil kurallarına riayet eden",
];

const FAQS = [
  {
    q: "Başvurmadan önce ne okumalıyım?",
    a: "Ürün satışı ve çalışma esasları metnini (/urun-satisi) okuyup onaylamanız gerekir. Formu göndermeniz, bu koşulları kabul ettiğiniz anlamına gelir.",
  },
  {
    q: "Çalışma modeli nedir?",
    a: "İlk hafta günde 4 saat oryantasyon ve staj; ardından kısmi süreli iş sözleşmesi ve resmi SGK girişi. Puantaj, pbx.goalgo.org ve CRM log kayıtlarına dayanır.",
  },
  {
    q: "Bu bir bağış veya yardım toplama işi mi?",
    a: "Hayır. Anlaşmalı sivil toplum kuruluşlarının iktisadi işletmeleri bünyesinde yürütülen ticari ürün satış ve tanıtım operasyonudur.",
  },
  {
    q: "Başvuru nereye düşer?",
    a: "Form yönetim paneline düşer (Kariyer başvuruları). Uygun adaylarla en kısa sürede iletişime geçilir.",
  },
];

const MAX_CV_BYTES = 5 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error ?? new Error("Dosya okunamadı"));
    reader.readAsDataURL(file);
  });
}

export default function Kariyer() {
  const site = useAhenkAgencySite();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<null | "ok" | "err">(null);
  const [errText, setErrText] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!accepted) {
      setDone("err");
      setErrText("Çalışma esasları metnini okuyup onaylamanız gerekir.");
      return;
    }
    setSending(true);
    setDone(null);
    setErrText("");
    try {
      let cvDataUrl = "";
      let cvFileName = "";
      if (cvFile) {
        if (cvFile.type !== "application/pdf" && !cvFile.name.toLowerCase().endsWith(".pdf")) {
          setDone("err");
          setErrText("CV yalnızca PDF olmalıdır.");
          setSending(false);
          return;
        }
        if (cvFile.size > MAX_CV_BYTES) {
          setDone("err");
          setErrText("CV 5 MB sınırını aşıyor.");
          setSending(false);
          return;
        }
        cvDataUrl = await fileToDataUrl(cvFile);
        cvFileName = cvFile.name;
      }
      const res = await fetch(apiUrl("/api/career/apply"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          city,
          experienceYears,
          coverLetter,
          cvUrl: cvUrl.trim() || undefined,
          cvDataUrl: cvDataUrl || undefined,
          cvFileName: cvFileName || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setDone("err");
        setErrText(typeof data.error === "string" ? data.error : "Başvuru gönderilemedi.");
        return;
      }
      setDone("ok");
      setFullName("");
      setEmail("");
      setPhone("");
      setCity("");
      setExperienceYears("");
      setCoverLetter("");
      setCvUrl("");
      setCvFile(null);
      setAccepted(false);
    } catch {
      setDone("err");
      setErrText("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AhenkAgencyChrome
      title="Çağrı Merkezi | Ahenk Bilgi Teknolojileri"
      description="Ahenk Bilgi Teknolojileri çağrı merkezi hizmetleri ve Vatan İletişim Merkezi müşteri temsilcisi iş başvurusu."
    >
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Çağrı merkezi
          </>
        }
        title="Ahenk BT ailesine katılmaya hazır mısınız?"
        lead={`${site.brandName} çağrı merkezi ve müşteri hizmetleri operasyonu. Home-office müşteri temsilcisi kadromuza katılın.`}
        image={AHENK_PHOTOS.callCenter}
      />

      <section className="ahenk-section">
        <h2>Çağrı merkezi hizmetleri</h2>
        <p className="ahenk-lead">
          Ahenk Bilgi Teknolojileri; çağrı merkezi, müşteri ilişkileri yönetimi ve ürün tanıtım operasyonları yürütür.
          Temsilcilerimiz pbx.goalgo.org üzerindeki CRM ve PBX altyapısı ile Türkiye genelinde kurumsal hedef kitleye
          ulaşır. Yazılım ürünümüz için{" "}
          <Link href="/cagri-merkezi-crm">çağrı merkezi CRM</Link> sayfasına bakabilirsiniz.
        </p>
        <div className="ahenk-career-grid">
          {SERVICES.map((item) => (
            <article key={item.title} className="ahenk-career-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section">
        <h2>Çalışma sahası</h2>
        <p className="ahenk-lead">Müşteri hizmetleri temsilcilerimiz belirlenmiş kurumsal kitle ile iletişim kurar.</p>
        <div className="ahenk-career-grid">
          {AUDIENCE.map((item) => (
            <article key={item.title} className="ahenk-career-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section ahenk-split">
        <div>
          <h2>Kimi arıyoruz?</h2>
          <ul className="ahenk-mods">
            {QUALITIES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Çalışma modeli</h2>
          <p>
            İlk hafta günde 4 saat oryantasyon ve staj; ardından kısmi süreli iş sözleşmesi ve resmi SGK girişi.
            Puantaj, sistem giriş-çıkış ve log kayıtlarına göre tutulur. Ayrıntılar ve yasal çerçeve{" "}
            <Link href="/urun-satisi">ürün satışı ve çalışma esasları</Link> sayfasındadır.
          </p>
          <p>
            <Link href="/urun-satisi" className="ahenk-btn ahenk-btn-light">
              Çalışma esaslarını oku
            </Link>
          </p>
        </div>
      </section>

      <section className="ahenk-section" id="basvuru">
        <div className="ahenk-split">
          <form className="ahenk-form" onSubmit={(e) => void submit(e)}>
            <h2>İş başvurusu</h2>
            <p className="ahenk-lead">
              Çağrı Merkezi Müşteri Temsilcisi pozisyonu için formu doldurun. CV olarak PDF yükleyebilir veya bir
              bağlantı bırakabilirsiniz.
            </p>
            {done === "ok" ? (
              <div className="ahenk-msg ahenk-msg-ok">Başvurunuz alındı. En kısa sürede sizinle iletişime geçeceğiz.</div>
            ) : null}
            {done === "err" ? <div className="ahenk-msg ahenk-msg-err">{errText}</div> : null}
            <label>
              Ad soyad
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ad soyad" />
            </label>
            <label>
              E-posta
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta"
              />
            </label>
            <label>
              Telefon
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" />
            </label>
            <label>
              Şehir
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Şehir" />
            </label>
            <label>
              Deneyim
              <input
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="Örn. 2 yıl çağrı merkezi"
              />
            </label>
            <label>
              Ön yazı
              <textarea
                required
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Kısa ön yazınız"
              />
            </label>
            <label>
              CV (PDF, en fazla 5 MB) — isteğe bağlı
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label>
              veya CV bağlantısı
              <input
                type="url"
                value={cvUrl}
                onChange={(e) => setCvUrl(e.target.value)}
                placeholder="https://…"
              />
            </label>
            <label className="ahenk-consent">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <span>
                <Link href="/urun-satisi">Ürün satışı ve çalışma esasları</Link> metnini okudum, anladım ve kabul
                ediyorum.
              </span>
            </label>
            <button type="submit" className="ahenk-btn" disabled={sending || !accepted}>
              {sending ? "Gönderiliyor…" : "Başvuruyu gönder"}
            </button>
          </form>
          <aside>
            <h2>Başvuru notu</h2>
            <p>
              Formu göndermeden önce <Link href="/urun-satisi">ön onay metnini</Link> okumanız gerekir. Metni kabul
              etmeden başvuru butonu açılmaz.
            </p>
            <p>
              <strong>GSM:</strong> <a href={`tel:${site.phoneTel}`}>{site.phone}</a>
              <br />
              <strong>E-posta:</strong> <a href={`mailto:${site.email}`}>{site.email}</a>
            </p>
          </aside>
        </div>
      </section>

      <section className="ahenk-section">
        <h2>Sık sorulanlar</h2>
        <AhenkFaqList faqs={FAQS} />
      </section>
    </AhenkAgencyChrome>
  );
}
