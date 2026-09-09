import { useState } from "react";
import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkPageHero } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { AHENK_PHOTOS } from "@/lib/ahenkAgencySite";

const CONSENT_KEY = "ahenk-urun-satisi-onay";

export default function AhenkUrunSatisi() {
  const [accepted, setAccepted] = useState(false);

  function onConsent(next: boolean) {
    setAccepted(next);
    try {
      if (next) sessionStorage.setItem(CONSENT_KEY, "1");
      else sessionStorage.removeItem(CONSENT_KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <AhenkAgencyChrome
      title="Ürün Satışı | Ahenk Bilgi Teknolojileri"
      description="Vatan İletişim Merkezi çağrı merkezi müşteri temsilcisi iş başvurusu ve çalışma esasları ön onay metni."
    >
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / <Link href="/kariyer">Kariyer</Link> / Ürün satışı
          </>
        }
        title="Ürün satışı ve çalışma esasları"
        lead="Başvuru formunu doldurmadan önce çalışma şartlarını, hukuki esasları ve operasyon süreçlerini okuyunuz."
        image={AHENK_PHOTOS.callCenter}
      />

      <article className="ahenk-section ahenk-legal-doc">
        <p className="ahenk-kicker">AHENK BİLGİ TEKNOLOJİLERİ</p>
        <h2>Vatan İletişim Merkezi — Çağrı Merkezi Müşteri Temsilcisi İş Başvurusu ve Çalışma Esasları Ön Onay Metni</h2>
        <p className="ahenk-lead">
          Lütfen başvuru formunu doldurmadan önce aşağıda yer alan çalışma şartlarını, hukuki esasları ve operasyon
          süreçlerini dikkatle okuyunuz. Başvuru formunu göndermeniz durumunda işbu metinde yer alan koşulları
          okuduğunuz, anladığınız ve kabul ettiğiniz varsayılacaktır.
        </p>

        <h2>1. Biz kimiz &amp; hukuki çerçeve</h2>
        <p>
          Ahenk Bilgi Teknolojileri (Vatan Sosyal Hizmetler Ltd.) (ahenk.net.tr); ajans hizmetleri, çağrı merkezi ve
          müşteri ilişkileri yönetimi, e-ticaret operasyonları, dijital pazarlama ve kurumsal yazılım altyapıları sunan
          köklü bir teknoloji ve hizmet şirketidir. Şirketimiz, 20 yılı aşkın süredir Türkiye’nin önde gelen sivil
          toplum kuruluşlarıyla stratejik ortaklıklar yürütmektedir.
        </p>
        <p>
          <strong>Hizmet esası ve yasal çerçeve:</strong> Şirketimiz tarafından yürütülen tüm müşteri hizmetleri
          operasyonları, anlaşmalı olduğumuz sivil toplum kuruluşlarının (STK) resmi iktisadi işletmeleri veya
          şirketleri ile imzalanan kurumsal Çağrı Merkezi Hizmet Sözleşmesi kapsamında gerçekleştirilmektedir.
        </p>
        <div className="ahenk-legal-warn">
          <strong>Önemli yasal uyarı:</strong> Yürüttüğümüz bu faaliyet, anlaşmalı olduğumuz sivil toplum kuruluşlarının
          iktisadi işletmeleri bünyesinde gerçekleştirilen ticari bir ürün satış ve tanıtım operasyonu olup,{" "}
          <strong>kesinlikle yardım toplama veya bağış faaliyeti değildir.</strong> Müşteri temsilcilerimiz
          görüşmelerinde bu hususu açıkça beyan ederler.
        </div>

        <h2>2. Mevcut proje ve ürün tanıtım içeriği</h2>
        <p>
          Güncel operasyonumuz kapsamında, anlaşmalı olduğumuz sivil toplum kuruluşlarının iktisadi işletmeleri iş
          birliğiyle; üniversite ve öğrenci burs çalışmalarına kaynak oluşturmak ile kurumsal faaliyetleri desteklemek
          amacıyla özel tanıtım paketi sunulmaktadır.
        </p>
        <div className="ahenk-table-wrap">
          <table className="ahenk-spec">
            <thead>
              <tr>
                <th>Parametre</th>
                <th>Açıklama / Detay</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Promosyon ürün paketi</th>
                <td>
                  Atatürk ve Türk Bayrağı temalı yüksek kaliteli dokuma duvar halısı ile kişiye özel olarak seri
                  numarasıyla düzenlenen Onur Belgesi.
                </td>
              </tr>
              <tr>
                <th>Ürün satış / destek bedeli</th>
                <td>2026 yılı güncel ürün bedeli 3.000 TL’dir.</td>
              </tr>
              <tr>
                <th>Şeffaf ödeme yöntemi</th>
                <td>
                  Müşteri temsilcilerimiz tanıtımı gerçekleştirir. Siparişi onaylanan ve hediyeleri teslim edilen
                  müşterilere anlaşmalı olduğumuz sivil toplum kuruluşunun iktisadi işletmesine ait resmi IBAN bilgileri
                  tarafımızdan iletilir. Müşteri ödemeyi doğrudan bu resmi banka hesabına yapar. Müşteri temsilcileri
                  kesinlikle kişisel veya nakit tahsilat yapmaz.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>3. Hedef kitle ve çalışma sahası</h2>
        <p>Müşteri Hizmetleri Temsilcilerimiz Türkiye genelinde belirlenmiş kurumsal hedef kitle ile iletişim kurar:</p>
        <ul>
          <li>
            <strong>Eğitim kurumları:</strong> Türkiye genelindeki resmi ve özel okullar, okul idarecileri.
          </li>
          <li>
            <strong>Yerel yönetimler:</strong> Türkiye genelindeki mahalle ve köy muhtarları.
          </li>
          <li>
            <strong>Kamu kurumları:</strong> Bakanlıkların il ve ilçe müdürlükleri ve kamu yetkilileri.
          </li>
        </ul>

        <h2>4. Home-office çalışma şartları, oryantasyon ve staj süreci</h2>
        <p>
          Çağrı Merkezi Müşteri Temsilcisi pozisyonumuz Home-Office (Uzaktan Çalışma) modeline dayanmaktadır.
        </p>
        <h3>A) 1. Hafta: Oryantasyon, eğitim ve staj süresi</h3>
        <ul>
          <li>
            <strong>Sistem kurulumu ve kullanıcı hesabı:</strong> İlk iş günü personelin sistem erişimleri tanımlanır.
            Personel, çağrı ve veri yönetimi için pbx.goalgo.org altyapısını, CRM ve PBX yazılımlarını kullanmayı
            öğrenir.
          </li>
          <li>
            <strong>Eğitim içeriği:</strong> Santral yazılımı kullanımı, arama senaryoları (script) ve veritabanı
            kullanımı detaylı olarak tarif edilir.
          </li>
          <li>
            <strong>Veri ve data temini:</strong> Mevcut panelde tanımlı olan kurum/kuruluş verilerinin haricinde,
            Türkiye genelindeki kamu, okul ve muhtarlık güncel verilerinin nereden ve nasıl yasal yollarla temin
            edileceği gösterilir.
          </li>
          <li>
            <strong>Günlük çalışma süresi:</strong> Staj süresince günlük çalışma süresi günde 4 saat (Part-Time)
            olarak uygulanır.
          </li>
        </ul>
        <h3>B) 2. Hafta ve sonrası: Resmi SGK girişi ve kısmi süreli çalışma</h3>
        <ul>
          <li>1 haftalık staj ve oryantasyon sürecini başarıyla tamamlayan personelin SGK girişi resmi olarak yapılır.</li>
          <li>Çalışma modeli Kısmi Süreli İş Sözleşmesi (Part-Time) olarak devam eder.</li>
          <li>
            <strong>Puantaj cetveli ve log kayıtları:</strong> Resmi SGK ve bordrolama süreçlerinin takibi için sistem
            üzerinden detaylı puantaj cetveli tutulur. Personelin pbx.goalgo.org ve CRM sistemine giriş-çıkış saatleri,
            aktif kaldığı süreler ve log kayıtları her ay sonunda puantaj olarak esas alınır.
          </li>
        </ul>

        <h2>5. Kalite standartları, güvenlik ve müşteri hizmetleri ilkeleri</h2>
        <ul>
          <li>
            <strong>Ses kaydı ve kalite standartları:</strong> Yapılan tüm görüşmeler kalite, güvenlik ve hizmet
            standartları gereğince santral sistemi üzerinden kayıt altına alınmaktadır.
          </li>
          <li>
            <strong>Sistem ve log sorumluluğu:</strong> Personel, kendisine tahsis edilen CRM ve PBX kullanıcı adı ve
            şifrelerini üçüncü kişilerle paylaşamaz. Sistem log kayıtları resmi puantaj ve yasal kanıt niteliğindedir.
          </li>
          <li>
            <strong>KVKK ve veri gizliliği:</strong> Personel, paneldeki ve erişim sağladığı kurumsal/kamusal dataları
            yalnızca Vatan İletişim Merkezi projeleri dahilinde kullanabilir. KVKK uyarınca veriler üçüncü şahıslara
            aktarılamaz.
          </li>
          <li>
            <strong>Kurumsal temsil:</strong> Görüşmelerde anlaşmalı sivil toplum kuruluşları ve şirket kurumsal
            yapısına uygun, saygın ve profesyonel bir dil kullanılması esastır.
          </li>
        </ul>

        <h2>6. Başvuru sahibi onam beyanı</h2>
        <p>
          Yukarıda yer alan Ahenk Bilgi Teknolojileri — Vatan İletişim Merkezi İş Başvuru ve Çalışma Esasları Metni’ni
          okudum, anladım. Projenin anlaşmalı olunan sivil toplum kuruluşlarının iktisadi işletmeleri bünyesinde
          yürütülen bir ürün satış/tanıtım faaliyeti olduğunu, 1 haftalık (günde 4 saat) staj/eğitim sürecini takiben
          Kısmi Süreli İş Sözleşmesi ve SGK girişi ile pbx.goalgo.org log kayıtları üzerinden puantaj tutularak
          çalışılacağını kabul ve beyan ederim.
        </p>

        <div className="ahenk-consent-box">
          <label className="ahenk-consent">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => onConsent(e.target.checked)}
            />
            <span>Yukarıdaki metni okudum, anladım ve kabul ediyorum</span>
          </label>
          {accepted ? (
            <Link href="/kariyer#basvuru" className="ahenk-btn">
              İş başvurusuna git
            </Link>
          ) : (
            <button type="button" className="ahenk-btn" disabled>
              İş başvurusuna git
            </button>
          )}
          <p className="ahenk-consent-hint">
            Kutuyu işaretledikten sonra başvuru formu {` `}
            <Link href="/kariyer">ahenk.net.tr/kariyer</Link> adresinde açılır.
          </p>
        </div>
      </article>
    </AhenkAgencyChrome>
  );
}
