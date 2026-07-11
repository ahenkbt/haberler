/**
 * Yekpare SSS ve yasal sayfa varsayılan metinleri.
 * Platform modeli: firma rehberi + pazaryeri; Yekpare satıcı değildir.
 */

export const YEKPARE_PLATFORM_INTRO = `<p><strong>yekpare.net</strong> (Yekpare), işletmelerin abonelikle yer aldığı bir <strong>firma rehberi</strong> ve <strong>pazaryeri</strong>dir. Haber, video, harita, sipariş, alışveriş, ilan, turizm ve benzeri modüller aracılığıyla kayıtlı işletmelerin tanıtılmasını ve kullanıcıların bu işletmelere ulaşmasını sağlar.</p>
<p>Yekpare, platformda listelenen ürün veya hizmetlerin <strong>satıcısı, aracısı veya hizmet sağlayıcısı değildir</strong>. Sipariş, rezervasyon ve ödeme işlemleri kullanıcı ile platformda kayıtlı ilgili işletme arasında doğrudan gerçekleşir. TURSAB belgesi, seyahat acentesi ruhsatı, ürün/hizmet kalitesi ve zamanında ifa ilgili işletmenin sorumluluğundadır.</p>`;

export const YEKPARE_SSS_BODY_HTML = `${YEKPARE_PLATFORM_INTRO}

<h2>Yekpare nedir? Platform modeli nasıl çalışır?</h2>
<p>Yekpare; restoran, market, mağaza, turizm acentesi, otel, transfer firması ve yerel hizmet sağlayıcılarının abonelikle listelendiği dijital bir vitrin ve rehberdir. Kullanıcılar konum, arama veya modül sekmeleriyle işletmeleri keşfeder; sipariş, rezervasyon veya iletişim talebini ilgili işletmeye yönlendirir.</p>
<p>Platformun gelir modeli, işletmelerin listelenme ve görünürlük hizmeti için ödediği <strong>abonelik ücretlerinden</strong> oluşur. Son kullanıcılar siteyi ücretsiz kullanır. Abonelik bedeli, kullanıcının işletmeden aldığı ürün veya hizmet fiyatını kapsamaz ve Yekpare'yi o işlemin satıcısı yapmaz.</p>
<p>Yekpare; yer sağlayıcı, arama ve keşif altyapısı, işletme paneli, harita entegrasyonu ve modül bazlı vitrinler sunar. Her modülde (yemek, market, alışveriş, turizm, ulaşım vb.) listelenen içerik ilgili işletmenin kendi profilinden yönetilir.</p>

<h2>Kim satıcıdır? Kim sorumludur?</h2>
<p><strong>Satıcı ve hizmet sağlayıcı</strong>, platformda listelenen ve siparişi/rezervasyonu kabul eden <strong>işletmedir</strong> (mağaza, restoran, turizm acentesi, otel, transfer firması vb.). İşletmenin ticari unvanı, iletişim bilgileri, vergi/MERSİS bilgileri (varsa) ve sektörel belgeleri kendi profilinde veya sipariş/rezervasyon öncesi ekranda gösterilir.</p>
<p><strong>Yekpare</strong> bu işlemlerde satıcı konumunda değildir. Platform; listeleme, arama, yönlendirme ve teknik altyapı sağlar. Ürün/hizmetin niteliği, fiyatı, stok durumu, teslimat veya ifa süresi, iptal ve iade koşulları listelenen işletmenin sorumluluğundadır.</p>
<p>Tüketici hakları bakımından mesafeli satış sözleşmesi, kullanıcı ile <strong>ilgili işletme</strong> arasında kurulur. Yekpare, işletmelerin platformda yer almasına aracılık eden bir liste ve rehber hizmeti sunar.</p>

<h2>Sipariş ve rezervasyon süreci nasıl işler?</h2>
<p><strong>Yemek ve market:</strong> Kullanıcı restoran veya market seçer, sepete ürün ekler, teslimat adresini girer ve siparişi onaylar. Sipariş kaydı ilgili işletmeye iletilir; hazırlık, kurye ve teslimat süreci işletme ve varsa anlaşmalı kurye ağı tarafından yürütülür.</p>
<p><strong>Alışveriş (mağaza):</strong> Her mağazanın kendi vitrin sayfası vardır. Sepet, ödeme ve kargo adımları mağazanın politikasına göre tamamlanır. Sipariş numarası ile <a href="/siparis-takip">sipariş takip</a> ekranından durum sorgulanabilir.</p>
<p><strong>Turizm (otel, tur, villa, araç, yat, transfer, uçuş):</strong> İlan veya arama sonucunda işletme profiline gidilir; rezervasyon, teklif talebi veya iletişim doğrudan işletmeyle yapılır. Uçuş ve otobüs gibi bazı modüllerde fiyat karşılaştırması sunulabilir; nihai satın alma ve ödeme partner işletme veya yetkili acente üzerinden gerçekleşir.</p>
<p>Rezervasyon veya sipariş öncesinde işletmenin iletişim bilgilerini, iptal koşullarını ve varsa TURSAB/ruhsat belgelerini doğrudan teyit etmenizi öneririz.</p>

<h2>Otomotiv ve sigorta modülü</h2>
<p>Yekpare Otomotiv (<a href="/otomotiv">/otomotiv</a>) modülünde araç, yedek parça, servis ve sigorta acenteleri abonelikle listelenir. Araç satışı, parça alımı, servis randevusu ve sigorta poliçesi işlemleri <strong>doğrudan listelenen işletme veya lisanslı sigorta acentesi</strong> ile yapılır.</p>
<p>Sigorta teklif formları yalnızca <strong>lead (talep iletimi)</strong> amacı taşır; canlı prim teklifi broker API entegrasyonu sonrası sunulur. Yekpare sigortacı veya ödeme aracısı değildir; poliçe düzenleme ve prim ödemesi acente / sigorta firması sorumluluğundadır.</p>

<h2>Ödeme kime yapılır? Yekpare ödeme alır mı?</h2>
<p>Ödeme, <strong>doğrudan ilgili işletmeye</strong> veya işletmenin kullandığı ödeme altyapısına (online POS, havale/EFT, kapıda ödeme, işletme linki vb.) yapılır. Yekpare, kullanıcıların işletmelere yaptığı ürün ve hizmet ödemelerinde <strong>ödeme aracısı veya satıcı değildir</strong>; bu ödemeleri tahsil etmez.</p>
<p>İşletmelerin Yekpare'ye ödediği tutar yalnızca <strong>abonelik ve listeleme hizmeti</strong> bedelidir. Kullanıcı ödemeleri ile karıştırılmamalıdır. Ödeme yöntemleri işletme bazında değişir; sipariş veya rezervasyon ekranında sunulan seçenekler o işletmeye aittir.</p>

<h2>İade, iptal ve şikayet süreci</h2>
<p>İade, iptal ve cayma hakları öncelikle <strong>ilgili işletmenin politikası</strong> ve 6502 sayılı Tüketicinin Korunması Hakkında Kanun çerçevesinde değerlendirilir. Cayma bildirimi, ürün iadesi veya rezervasyon iptali taleplerinizi önce işletmenin bildirdiği kanallarla (telefon, e-posta, panel mesajı) iletmeniz gerekir.</p>
<p>Malın tesliminden itibaren <strong>14 gün</strong> içinde cayma hakkı (istisna ürünler hariç) tüketici lehine geçerlidir. Hijyen, kişiye özel üretim ve çabuk bozulabilen ürünler mevzuattaki istisnalara tabidir. Turizm ve hizmet rezervasyonlarında iptal koşulları işletmenin sözleşme ve ilan metninde belirtilir.</p>
<p>İşletmeyle çözülemeyen platform kullanımı, yanıltıcı ilan veya teknik sorunlarda <a href="/destek">Destek</a> sayfasından talep oluşturabilirsiniz. Yekpare, işletme ile kullanıcı arasındaki ticari uyuşmazlıklarda taraf değildir; gerektiğinde iletişim kolaylaştırır ve platform kuralları çerçevesinde inceleme yapar.</p>

<h2>TURSAB belgesi ve seyahat acentesi sorumluluğu</h2>
<p>TURSAB (Türkiye Seyahat Acentaları Birliği) belgesi, seyahat acentesi ruhsatı ve benzeri sektörel izinler <strong>listelenen turizm işletmelerine</strong> aittir. Yekpare bu belgelerin geçerliliğini, güncelliğini veya içeriğini taahhüt etmez; belgeler bilgilendirme amaçlı profilde gösterilebilir.</p>
<p>Paket tur, otel, uçak bileti, transfer veya yat kiralama rezervasyonu yapmadan önce acentenin TURSAB numarasını, yetki belgesini ve sözleşme koşullarını <strong>doğrudan işletmeden teyit etmenizi</strong> şiddetle öneririz. Belge sahteciliği veya yanıltıcı ilan şüphesinde Destek üzerinden bildirimde bulunabilirsiniz.</p>

<h2>Turizm, otel, uçuş ve transfer rezervasyonları</h2>
<p>Yekpare Seyahat modülü (<a href="/turizm">/turizm</a>), otel, villa, tur paketi, araç kiralama, yat turu ve VIP transfer firmalarının ilanlarını listeler. Fiyat ve müsaitlik bilgisi işletme tarafından güncellenir; Yekpare fiyat garantisi vermez.</p>
<p>Uçuş arama ekranlarında karşılaştırmalı fiyat sunulabilir; bilet satın alma işlemi yetkili acente veya havayolu partneri üzerinden tamamlanır. VIP transfer ve şoförlü araç hizmetlerinde rezervasyon ve ödeme listelenen transfer firmasıyla yapılır.</p>
<p>Seyahat özelinde ayrıntılı sorular için <a href="/turizm/turlar/sss">Turizm SSS</a> sayfasına bakabilirsiniz.</p>

<h2>Yemek siparişi ve market</h2>
<p>Yemek (<a href="/yemek">/yemek</a>) ve market (<a href="/market">/market</a>) modüllerinde listelenen restoran ve marketler kendi menü, fiyat ve teslimat bölgelerini yönetir. Minimum sepet tutarı, teslimat ücreti ve hazırlık süresi işletmeye özeldir.</p>
<p>Sipariş onayından sonra iptal veya değişiklik talepleri işletmenin operasyon politikasına tabidir. Gıda güvenliği, hijyen ve ürün içeriği sorumluluğu siparişi hazırlayan işletmeye aittir.</p>

<h2>Abonelik modeli — işletmeler nasıl listelenir?</h2>
<p>İşletmeler, Yekpare'de görünmek ve modül vitrinlerinde yer almak için <strong>abonelik modeliyle</strong> kayıt olur. Başvuru <a href="/isletme-basvuru">işletme başvurusu</a> veya ilgili modül paneli üzerinden yapılır; onay sonrası profil, menü, ürün veya ilan yönetimi servis sağlayıcı panelinden sürdürülür.</p>
<p>Abonelik paketleri listeleme süresi, görünürlük ve modül erişimine göre değişir. Abonelik yenilenmediğinde ilanlar yayından kaldırılabilir. Abonelik bedeli, son kullanıcıdan alınan sipariş veya rezervasyon bedeli değildir.</p>

<h2>Kişisel veriler ve gizlilik</h2>
<p>Hesap oluşturma, sipariş ve destek süreçlerinde kimlik ve iletişim verileriniz işlenir. Ayrıntılar <a href="/gizlilik-kvkk">Gizlilik Politikası ve KVKK Aydınlatma Metni</a> sayfasında yer alır. Veri sorumlusu VATAN SOSYAL HIZMETLER LTD'dir; başvuru: <a href="mailto:yekparenet@gmail.com">yekparenet@gmail.com</a>.</p>

<h2>İşletme paneli ve doğrulama</h2>
<p>Onaylı işletmeler <a href="/servis-saglayici-giris">servis sağlayıcı paneli</a>, <a href="/turizm-paneli">turizm paneli</a> veya mağaza paneli üzerinden içeriklerini yönetir. Yekpare, başvuru sırasında temel ticari bilgi ve sektörel belge talep edebilir; nihai doğrulama ve güncellik işletmenin beyanına dayanır.</p>
<p>Doğrulanmış rozet veya öne çıkan listeleme, platform kurallarına uyum ve abonelik paketine bağlıdır; tek başına kalite veya yasal uygunluk garantisi anlamına gelmez.</p>

<h2>Yanıltıcı ilan veya eksik bilgi görürsem ne yapmalıyım?</h2>
<p>Fiyat, belge, adres veya hizmet kapsamıyla ilgili yanıltıcı içerik tespit ederseniz ilgili ilan sayfasındaki bildir seçeneğini veya <a href="/destek">Destek</a> formunu kullanın. Konu satırında işletme adı, ilan linki ve tespitinizi açıkça yazın.</p>
<p>Yekpare, bildirilen içerikleri platform kuralları ve mevzuat çerçevesinde inceleyebilir; ihlal tespitinde ilanı askıya alma veya işletme hesabını kısıtlama hakkını saklı tutar.</p>

<h2>Yekpare ile işletme arasındaki ilişki</h2>
<p>Yekpare ile işletme arasında <strong>liste ve rehberlik hizmeti</strong> sözleşmesi bulunur. Bu sözleşme, işletmenin platformda vitrin açmasına ve kullanıcı trafiği almasına aracılık eder; işletmenin sizinle kuracağı satış veya hizmet sözleşmesinin tarafı değildir.</p>
<p>İşletme, yayınladığı içeriklerin doğruluğundan, fiyatlandırmadan, stok ve müsaitlik bilgisinden ve yasal yükümlülüklerinden (TURSAB, gıda ruhsatı, vergi vb.) bizzat sorumludur.</p>

<h2>Hukuki sorumluluk sınırları</h2>
<p>Yekpare, üçüncü taraf işletmelerin fiil ve eksikliklerinden, kullanıcı ile işletme arasındaki sözleşmesel uyuşmazlıklardan, ödeme iadesinden veya hizmetin geç/eksik ifasından <strong>doğrudan sorumlu tutulamaz</strong>, mevzuatta yer sağlayıcı için öngörülen çerçeve saklıdır.</p>
<p>Platform; teknik erişilebilirlik, arama sonuçlarının gösterimi ve kötüye kullanımın önlenmesi için makul önlemler alır. Güncel kullanım koşulları: <a href="/kullanim-kosullari">Kullanım Koşulları</a>. Mesafeli satış, iade ve teslimat: <a href="/mesafeli-satis-sozlesmesi">Mesafeli Satış</a>, <a href="/iade-degisim">İade</a>, <a href="/teslimat-kargo">Teslimat</a>.</p>`;

export const YEKPARE_KULLANIM_KOSULLARI_BODY_HTML = `${YEKPARE_PLATFORM_INTRO}

<h2>1. Taraflar ve kabul</h2>
<p>İşbu Kullanım Koşulları, <strong>yekpare.net</strong> web sitesi ve bağlı mobil deneyimini kullanan ziyaretçi, üye ve işletmeler ile platform işletmecisi arasındaki hak ve yükümlülükleri düzenler. Siteye erişim, üyelik oluşturma veya işletme başvurusu bu koşulların kabulü anlamına gelir.</p>

<h2>2. Platformun niteliği</h2>
<p>Yekpare; haber, video, harita, sipariş, alışveriş, ilan, turizm, ulaşım ve benzeri modüllerde <strong>işletmelerin listelendiği</strong> bir firma rehberi ve pazaryeridir. Platform, listelenen mal ve hizmetlerin satıcısı değildir. Ticari işlemler kullanıcı ile ilgili işletme arasında kurulur.</p>

<h2>3. Abonelik ve işletme listeleme</h2>
<p>İşletmeler platformda yer almak için abonelik modeliyle kayıt olur. Abonelik ücreti listeleme ve görünürlük hizmeti içindir. İşletme, profilinde yayınladığı tüm bilgi, fiyat, görsel ve belgelerin doğruluğundan sorumludur. Yekpare, işletme içeriklerini önceden tek tek onaylamak zorunda değildir; bildirim üzerine inceleme yapabilir.</p>

<h2>4. Kullanıcı yükümlülükleri</h2>
<p>Kullanıcılar doğru iletişim ve teslimat bilgisi vermek, ödeme yükümlülüklerini işletmeyle olan sözleşme çerçevesinde yerine getirmek ve platformu kötüye kullanmamakla yükümlüdür. Sahte sipariş, spam, telif ihlali ve yanıltıcı şikayet hesap kısıtlamasına yol açabilir.</p>

<h2>5. Sorumluluk sınırlaması</h2>
<p>Yekpare aşağıdakilerden sorumlu değildir:</p>
<ul>
<li>Listelenen işletmelerin ürün/hizmet kalitesi, fiyatı, zamanında teslimi veya ifası</li>
<li>TURSAB, acente ruhsatı ve sektörel izinlerin geçerliliği (belgeler işletmeye aittir)</li>
<li>İşletme ile kullanıcı arasındaki ödeme, iade ve uyuşmazlıklar</li>
<li>Üçüncü taraf ödeme kuruluşları veya kargo firmalarının performansı</li>
</ul>
<p>Rezervasyon veya satın alma öncesinde belge ve iletişim bilgilerini işletmeden teyit etmeniz önerilir.</p>

<h2>6. Fikri mülkiyet</h2>
<p>Yekpare markası, arayüz tasarımı ve platform yazılımı işletmeciye aittir. İşletmeler yalnızca kendi yükledikleri içeriklerden sorumludur ve yükleme ile gerekli haklara sahip olduklarını beyan eder.</p>

<h2>7. Hesap güvenliği ve fesih</h2>
<p>Şifre ve oturum güvenliği kullanıcı ve işletmeye aittir. Koşullara aykırı kullanımda hesap askıya alınabilir veya sonlandırılabilir.</p>

<h2>8. Değişiklikler ve uyuşmazlık</h2>
<p>Koşullar güncellenebilir; önemli değişiklikler sitede duyurulur. Güncel SSS: <a href="/sss">/sss</a>. Uyuşmazlıklarda Türkiye Cumhuriyeti kanunları uygulanır; tüketici işlemlerinde kullanıcının yerleşim yerindeki Tüketici Hakem Heyeti ve Tüketici Mahkemeleri yetkilidir.</p>`;

export const YEKPARE_GIZLILIK_BODY_HTML = `<p>Veri sorumlusu: <strong>VATAN SOSYAL HIZMETLER LTD</strong> (&quot;Yekpare&quot;). 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında kişisel verileriniz aşağıda açıklanan çerçevede işlenmektedir.</p>

<h2>1. Platform modeli ve veri işleme amacı</h2>
<p>Yekpare, işletmelerin abonelikle listelendiği firma rehberi ve pazaryeridir; satıcı konumunda değildir. Kişisel verileriniz hesap yönetimi, sipariş ve rezervasyonun ilgili işletmeye iletilmesi, müşteri desteği, güvenlik, yasal yükümlülükler ve platform iyileştirmesi amacıyla işlenir.</p>

<h2>2. İşlenen veri kategorileri</h2>
<ul>
<li><strong>Kimlik ve iletişim:</strong> Ad-soyad, telefon, e-posta, teslimat/adres bilgisi</li>
<li><strong>İşlem güvenliği:</strong> Sipariş ve rezervasyon kayıtları, oturum logları, IP ve cihaz bilgisi</li>
<li><strong>İşletme başvurusu:</strong> Ticari unvan, vergi/MERSİS, belge yüklemeleri (işletme sahipleri için)</li>
<li><strong>Konum:</strong> İsteğe bağlı konum seçimi (harita, yakınımdakiler, teslimat)</li>
</ul>

<h2>3. Aktarım</h2>
<p>Sipariş ve rezervasyonun yerine getirilmesi için iletişim ve teslimat verileri <strong>ilgili işletmeye</strong> aktarılır. Ödeme bilgileri mümkün olduğunca işletmenin veya lisanslı ödeme kuruluşunun sisteminde işlenir; Yekpare kart verisi saklamaz.</p>

<h2>4. Saklama süresi</h2>
<p>Veriler işleme amacının gerektirdiği süre ve yasal zamanaşımı süreleri boyunca saklanır; süre sonunda silinir, anonimleştirilir veya arşivlenir.</p>

<h2>5. Haklarınız</h2>
<p>KVKK md. 11 kapsamında; işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltme, silme, itiraz ve zararın giderilmesini talep etme haklarına sahipsiniz.</p>
<p>Başvuru: <a href="mailto:yekparenet@gmail.com">yekparenet@gmail.com</a> · Destek: <a href="/destek">/destek</a></p>

<h2>6. Çerezler</h2>
<p>Oturum, tercih ve analitik çerezleri site işlevselliği için kullanılır. Tarayıcı ayarlarından çerezleri yönetebilirsiniz.</p>`;

export const YEKPARE_MESAFELI_SATIS_BODY_HTML = `<p>İşbu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği çerçevesinde <strong>yekpare.net</strong> üzerinden ilgili işletmeye yönlendirilerek gerçekleştirilen mal/hizmet işlemlerinde tarafların hak ve yükümlülüklerini açıklar.</p>

<h2>1. Platformun rolü</h2>
<p><strong>Yekpare satıcı değildir.</strong> Platform, işletmelerin listelendiği firma rehberi ve pazaryeridir. Mesafeli satış sözleşmesi, siparişi onaylayan <strong>işletme (satıcı)</strong> ile siparişi veren <strong>tüketici (alıcı)</strong> arasında kurulur. Yekpare bu sözleşmenin tarafı değildir; listeleme ve teknik aracılık hizmeti sunar.</p>

<h2>2. Taraflar</h2>
<p><strong>Satıcı:</strong> Siparişi onaylayan işletme; ticari unvan, iletişim ve vergi bilgileri sipariş öncesi ekranda ve onayda gösterilir.<br>
<strong>Alıcı:</strong> Siparişi veren tüketici; ad, iletişim ve teslimat bilgileri sipariş kaydında yer alır.</p>

<h2>3. Sözleşme konusu</h2>
<p>Ürün veya hizmetin nitelikleri, adedi, vergiler dahil toplam bedeli ve teslimat/ifşa şekli sepet ve ödeme adımında açıkça listelenir. Fiyat ve stok bilgisi satıcı işletme tarafından yönetilir.</p>

<h2>4. Cayma hakkı</h2>
<p>Malın tesliminden itibaren <strong>14 (on dört) gün</strong> içinde hiçbir gerekçe göstermeksizin cayma hakkı kullanılabilir (kanuni istisnalar saklıdır). Cayma talebi satıcı işletmeye iletilir. İstisnalar: hijyen ürünleri, kişiye özel üretim, çabuk bozulabilen mallar vb.</p>

<h2>5. Ödeme ve teslimat</h2>
<p>Ödeme doğrudan satıcı işletmeye veya işletmenin ödeme altyapısına yapılır. Teslimat süreleri ve kargo firması satıcı tarafından belirlenir.</p>

<h2>6. Uyuşmazlık</h2>
<p>Tüketici şikayetleri için tüketicinin yerleşim yerindeki Tüketici Hakem Heyeti ve Tüketici Mahkemeleri yetkilidir. Platform kullanımı için <a href="/kullanim-kosullari">Kullanım Koşulları</a> geçerlidir.</p>`;

export const YEKPARE_ON_BILGILENDIRME_BODY_HTML = `<p>6502 sayılı Kanun uyarınca, ödeme öncesinde aşağıdaki hususlarda bilgilendirilirsiniz. Siparişi onaylayarak bu formu okuduğunuzu ve ilgili işletme ile mesafeli satış sözleşmesini kabul ettiğinizi beyan edersiniz.</p>

<h2>Platform bilgisi</h2>
<p><strong>yekpare.net</strong> satıcı konumunda değildir; firma rehberi ve pazaryeri olarak işletmeleri listeler. Satın alma sözleşmesi sizinle siparişi alan işletme arasında kurulur.</p>

<h2>Satıcı bilgileri</h2>
<p>Satıcının ticari unvanı, iletişim bilgileri ve MERSİS/vergi bilgileri (varsa) sipariş ekranında gösterilir. Eksik bilgi görürseniz sipariş öncesi işletmeyle teyit edin.</p>

<h2>Mal / hizmetin temel özellikleri</h2>
<p>Ürün adı, miktar, birim fiyat, vergi ve toplam tutar sepet ve ödeme adımında listelenir.</p>

<h2>Ödeme</h2>
<p>Ödeme ilgili işletmeye veya işletmenin sunduğu ödeme kanalına yapılır. Yekpare kullanıcı ödemesi tahsil etmez.</p>

<h2>Cayma hakkı</h2>
<p>Teslimattan itibaren 14 gün içinde cayma hakkınız bulunduğu; istisna ürünlerde gerekçe ve süreç sipariş öncesi açıklanır.</p>

<h2>Şikayet kanalı</h2>
<p>Öncelikle satıcı işletme iletişim bilgileri; platform teknik ve ilan şikayetleri için <a href="/destek">/destek</a>.</p>`;

export const YEKPARE_IADE_BODY_HTML = `<p>İptal, iade ve değişim işlemleri <strong>ilgili işletmenin politikası</strong> ve tüketici mevzuatı çerçevesinde yürütülür. Yekpare satıcı olmadığından, iade sürecini öncelikle siparişi alan işletmeyle başlatmanız gerekir.</p>

<h2>Cayma hakkı süresi</h2>
<p>Malın tesliminden itibaren <strong>14 gün</strong> içinde cayma bildirimi yapılabilir (istisnalar saklıdır). Hizmet ve turizm rezervasyonlarında iptal koşulları işletmenin sözleşme metninde belirtilir.</p>

<h2>İade süreci</h2>
<p>Cayma bildirimi sonrası ürün, işletmenin bildirdiği adrese orijinal ambalajı ve faturası ile gönderilmelidir. İade kargo ücreti işletme politikasına tabidir.</p>

<h2>İadesi mümkün olmayan ürünler</h2>
<ul>
<li>Hijyen nedeniyle iadesi uygun olmayan ürünler</li>
<li>Kişiselleştirilmiş veya kişiye özel üretim ürünler</li>
<li>Çabuk bozulabilen gıda ve benzeri mallar</li>
<li>Tüketicinin onayı ile ifasına başlanan anında hizmetler (mevzuat istisnası)</li>
</ul>

<h2>Şikayet</h2>
<p>İşletme ile çözülemeyen durumlarda <a href="/destek">Destek</a> üzerinden platforma bildirim yapılabilir. Tüketici hakem heyeti başvurusu yerleşim yerinizdeki kurumlara yapılır.</p>`;

export const YEKPARE_TESLIMAT_BODY_HTML = `<p>Teslimat süreleri, kargo firması, bölgesel kapsama ve ücretlendirme <strong>satıcı işletme</strong> tarafından belirlenir; mağaza veya restoran sayfasında ve sipariş onayında gösterilir. Yekpare kargo operasyonu yürütmez.</p>

<h2>Kargo ücreti</h2>
<p>Ücretsiz kargo alt limiti ve bölgesel ücretlendirme işletme tarafından duyurulur. Kapıda ödeme veya kurye teslimatı işletme politikasına bağlıdır.</p>

<h2>Takip</h2>
<p>Sipariş numarası ile <a href="/siparis-takip">Sipariş takip</a> ekranından durum sorgulanabilir. Gecikme ve hasar talepleri öncelikle satıcı ve kargo firması kanallarıyla çözülür.</p>

<h2>Market ve yemek</h2>
<p>Restoran ve market modüllerinde teslimat süresi hazırlık + kurye rotasına göre değişir; tahmini süre sipariş ekranında işletme tarafından gösterilir.</p>`;

export const YEKPARE_TURIZM_SSS_BODY_HTML = `${YEKPARE_PLATFORM_INTRO}

<h2>Yekpare Seyahat modülü nedir?</h2>
<p><a href="/turizm">Yekpare Seyahat</a>, turizm işletmelerinin (otel, tur operatörü, transfer firması, araç kiralama, yat kiralama vb.) abonelikle listelendiği bir vitrin ve arama alanıdır. Rezervasyon, ödeme ve sözleşme ilişkisi kullanıcı ile listelenen işletme arasında kurulur; Yekpare satıcı veya acente değildir.</p>

<h2>Tur ve paket rezervasyonu nasıl yapılır?</h2>
<p>Tur ilanlarında tarih, kişi sayısı ve fiyat bilgisi işletme tarafından yayınlanır. Rezervasyon talebi veya ödeme adımları ilgili tur operatörünün sayfasında tamamlanır. Paket tur sözleşmesi, TURSAB belgeli acente ile kullanıcı arasında yapılır; sözleşme metnini ve iptal koşullarını rezervasyon öncesi okuyun.</p>

<h2>Otel ve konaklama</h2>
<p>Otel, butik otel ve villa ilanları işletme veya yetkili temsilci tarafından yönetilir. Müsaitlik, oda tipi ve fiyat garantisi işletmeye aittir. Check-in/check-out saatleri ve ek ücretler ilan detayında belirtilir.</p>

<h2>Uçuş bileti arama</h2>
<p>Uçuş modülünde karşılaştırmalı fiyat listesi sunulabilir. Bilet satın alma ve ödeme, yetkili havayolu acentesi veya partner site üzerinden gerçekleşir. PNR, iptal ve iade kuralları bileti düzenleyen tarafın koşullarına tabidir.</p>

<h2>VIP transfer ve şoförlü araç</h2>
<p><a href="/turizm/servis">VIP Transfer</a> sayfasında listelenen firmalar kendi araç filosu, fiyat ve bölge bilgilerini yayınlar. Rezervasyon ve ödeme doğrudan transfer firmasıyla yapılır. Meet &amp; greet, bebek koltuğu gibi ek hizmetler firma politikasına göre sunulur.</p>

<h2>TURSAB ve acente belgeleri</h2>
<p>TURSAB belgesi ve seyahat acentesi ruhsatı listelenen işletmelere aittir. Yekpare belge geçerliliğini taahhüt etmez. Rezervasyon öncesi TURSAB numarasını ve yetki belgesini işletmeden yazılı olarak teyit edin.</p>

<h2>Ödeme ve iptal</h2>
<p>Turizm ödemeleri ilgili işletmeye veya işletmenin ödeme linkine yapılır. Yekpare turizm bedeli tahsil etmez. İptal, erteleme ve iade kuralları her ilanın ve işletmenin sözleşme metninde yer alır; genel SSS için <a href="/sss">/sss</a> sayfasına bakın.</p>

<h2>Şikayet ve destek</h2>
<p>Operasyonel sorunlarda (ulaşım, konaklama, tur iptali) önce işletmeyle iletişime geçin. Yanıltıcı ilan veya platform hatası için <a href="/destek">Destek</a> talebi açın; ilan linki ve rezervasyon referansını ekleyin.</p>`;

/** Destek sayfası üst bilgi ve SSS özeti */
export const YEKPARE_DESTEK_FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "Yekpare siparişimle ilgilenir mi?",
    answer:
      "Yekpare satıcı konumunda değildir. Sipariş, teslimat ve iade süreçleri ilgili işletmeyle yürütülür. Platform yalnızca teknik erişim, ilan ve kötüye kullanım bildirimlerinde destek sağlar.",
  },
  {
    question: "Ödemem Yekpare'ye mi gitti?",
    answer:
      "Hayır. Ürün ve hizmet ödemeleri doğrudan ilgili işletmeye veya işletmenin ödeme altyapısına yapılır. Yekpare yalnızca işletmelerden abonelik/listeleme ücreti alır.",
  },
  {
    question: "TURSAB belgesini nereden doğrularım?",
    answer:
      "Turizm ilanındaki acente bilgilerini ve TURSAB numarasını rezervasyon öncesi doğrudan işletmeden teyit edin. Şüpheli ilanları Destek formundan bildirebilirsiniz.",
  },
  {
    question: "Destek talebi ne zaman açmalıyım?",
    answer:
      "Önce ilgili işletmeyle iletişime geçin. Çözülmeyen platform hatası, yanıltıcı ilan, hesap veya teknik sorunlarda giriş yaparak Destek formunu kullanın.",
  },
  {
    question: "İşletme olarak nasıl listelenirim?",
    answer:
      "İşletme başvurusu veya ilgili modül paneli üzerinden abonelikli kayıt yapılır. Onay sonrası profil ve ilanlarınızı servis sağlayıcı panelinden yönetirsiniz.",
  },
];
