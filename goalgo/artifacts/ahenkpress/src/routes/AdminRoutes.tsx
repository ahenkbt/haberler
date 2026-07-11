import { Switch, Route, Redirect } from "wouter";
import { ProtectedAdminRoute } from "../components/ProtectedAdminRoute";
import Dashboard from "../pages/admin/Dashboard";
import Haberler from "../pages/admin/Haberler";
import HaberKategorileri from "../pages/admin/HaberKategorileri";
import HaberEditor from "../pages/admin/HaberEditor";
import YekpareHaberlerVitrinAyarlari from "../pages/admin/YekpareHaberlerVitrinAyarlari";
import RssKampanyalari from "../pages/admin/RssKampanyalari";
import AdminRssHaberler from "../pages/admin/AdminRssHaberler";
import RssKampanyaEditor from "../pages/admin/RssKampanyaEditor";
import RssLoglar from "../pages/admin/RssLoglar";
import BantYonetimi from "../pages/admin/BantYonetimi";
import ReklamAlanlari from "../pages/admin/ReklamAlanlari";
import YektubeYekpareQuickAdmin from "../pages/admin/YektubeYekpareQuickAdmin";
import AnasayfaModulleri from "../pages/admin/AnasayfaModulleri";
import AnasayfaTasarimi from "../pages/admin/AnasayfaTasarimi";
import TemaAyarlari from "../pages/admin/TemaAyarlari";
import Urunler from "../pages/admin/Urunler";
import KoseYazarlari from "../pages/admin/KoseYazarlari";
import BlogYazilari from "../pages/admin/BlogYazilari";
import Sayfalar from "../pages/admin/Sayfalar";
import Medya from "../pages/admin/Medya";
import AiIcerikRobotu from "../pages/admin/AiIcerikRobotu";
import GenelAyarlar from "../pages/admin/GenelAyarlar";
import AdminPostaVeDuyurular from "../pages/admin/AdminPostaVeDuyurular";
import PanelHesaplari from "../pages/admin/PanelHesaplari";
import UrunKategorileri from "../pages/admin/UrunKategorileri";
import TopluIceAktar from "../pages/admin/TopluIceAktar";
import Siparisler from "../pages/admin/Siparisler";
import OdemeAyarlari from "../pages/admin/OdemeAyarlari";
import MagazaYonetimi from "../pages/admin/MagazaYonetimi";
import MansetYonetimi from "../pages/admin/MansetYonetimi";
import FotoGaleri from "../pages/admin/FotoGaleri";
import VideoGaleri from "../pages/admin/VideoGaleri";
import ResmiIlanlar from "../pages/admin/ResmiIlanlar";
import Lisans from "../pages/admin/Lisans";
import TransportYonetimi from "../pages/admin/TransportYonetimi";
import AnsiklopediYonetimi from "../pages/admin/AnsiklopediYonetimi";
import WhatsAppAyarlari from "../pages/admin/WhatsAppAyarlari";
import YekpareAiCallOverview from "../pages/admin/yekpare-ai-call/YekpareAiCallOverview";
import YekpareAiCallSettings from "../pages/admin/yekpare-ai-call/YekpareAiCallSettings";
import YekpareAiCallAssistants from "../pages/admin/yekpare-ai-call/YekpareAiCallAssistants";
import YekpareAiCallCampaigns from "../pages/admin/yekpare-ai-call/YekpareAiCallCampaigns";
import YekpareAiCallLogs from "../pages/admin/yekpare-ai-call/YekpareAiCallLogs";
import YekpareAiCallMessaging from "../pages/admin/yekpare-ai-call/YekpareAiCallMessaging";
import YekpareAiCallTeam from "../pages/admin/yekpare-ai-call/YekpareAiCallTeam";
import YekpareAiCallRestApi from "../pages/admin/yekpare-ai-call/YekpareAiCallRestApi";
import YekpareAiCallWorkspaceRedirect from "../pages/admin/yekpare-ai-call/YekpareAiCallWorkspaceRedirect";
import PbxOverview from "../pages/admin/pbx/PbxOverview";
import PbxTrunks from "../pages/admin/pbx/PbxTrunks";
import PbxExtensions from "../pages/admin/pbx/PbxExtensions";
import PbxQueues from "../pages/admin/pbx/PbxQueues";
import PbxLiveMonitor from "../pages/admin/pbx/PbxLiveMonitor";
import PbxCampaigns from "../pages/admin/pbx/PbxCampaigns";
import PbxCampaignDetail from "../pages/admin/pbx/PbxCampaignDetail";
import PbxIvr from "../pages/admin/pbx/PbxIvr";
import PbxAgents from "../pages/admin/pbx/PbxAgents";
import PbxHybrid from "../pages/admin/pbx/PbxHybrid";
import PbxVerimorSettings from "../pages/admin/pbx/PbxVerimorSettings";
import Pbx3cxSettings from "../pages/admin/pbx/Pbx3cxSettings";
import HaritalarYonetimi from "../pages/admin/HaritalarYonetimi";
import GlobalMapNewsAdmin from "../pages/admin/GlobalMapNewsAdmin";
import OneCikanIsletmeler from "../pages/admin/OneCikanIsletmeler";
import SiparisIsletmeleri from "../pages/admin/SiparisIsletmeleri";
import SiparisKategoriler from "../pages/admin/SiparisKategoriler";
import SiparisBannerlari from "../pages/admin/SiparisBannerlari";
import SiparisMenuItems from "../pages/admin/SiparisMenuItems";
import AlisverisIsletmeleri from "../pages/admin/AlisverisIsletmeleri";
import ServisSaglayicilar from "../pages/admin/ServisSaglayicilar";
import TeslimatSiparisleri from "../pages/admin/TeslimatSiparisleri";
import KuponYonetimi from "../pages/admin/KuponYonetimi";
import IsOrtaklari from "../pages/admin/IsOrtaklari";
import TurizmIlanlar from "../pages/admin/TurizmIlanlar";
import TurizmRezervasyonlar from "../pages/admin/TurizmRezervasyonlar";
import TurizmYonetimi from "../pages/admin/TurizmYonetimi";
import OtomotivYonetimi from "../pages/admin/OtomotivYonetimi";
import SigortaYonetimi from "../pages/admin/SigortaYonetimi";
import IletisimMesajlari from "../pages/admin/IletisimMesajlari";
import KariyerBasvurulari from "../pages/admin/KariyerBasvurulari";
import PlatformDuyurular from "../pages/admin/PlatformDuyurular";
import KasiyerAdmin from "../pages/admin/KasiyerAdmin";
import DestekTalepleri from "../pages/admin/DestekTalepleri";
import IcerikHavuzu from "../pages/admin/IcerikHavuzu";
import HaberSiteleri from "../pages/admin/HaberSiteleri";
import AdminHmStaticPages from "../pages/admin/AdminHmStaticPages";
import HmKoseIceAktar from "../pages/admin/HmKoseIceAktar";
import HmHaberIceAktar from "../pages/admin/HmHaberIceAktar";
import HmKoseMakaleler from "../pages/admin/HmKoseMakaleler";

export default function AdminRoutes() {
  return (
    <Switch>
      {/* Protected admin routes */}
      <Route path="/admin">
        {() => <ProtectedAdminRoute component={Dashboard} />}
      </Route>
      <Route path="/admin/haber-havuzu">
        <Redirect to="/admin/icerik-havuzu" />
      </Route>
      <Route path="/admin/icerik-havuzu">
        {() => <ProtectedAdminRoute component={IcerikHavuzu} />}
      </Route>
      <Route path="/admin/haber-siteleri">
        {() => <ProtectedAdminRoute component={HaberSiteleri} />}
      </Route>
      <Route path="/admin/hm-telif-sayfalari">
        {() => <ProtectedAdminRoute component={AdminHmStaticPages} />}
      </Route>
      <Route path="/admin/hm-kose-ice-aktar">
        {() => <ProtectedAdminRoute component={HmKoseIceAktar} />}
      </Route>
      <Route path="/admin/hm-haber-ice-aktar">
        {() => <ProtectedAdminRoute component={HmHaberIceAktar} />}
      </Route>
      <Route path="/admin/hm-kose-makaleler">
        {() => <ProtectedAdminRoute component={HmKoseMakaleler} />}
      </Route>
      <Route path="/admin/haberler">
        {() => <ProtectedAdminRoute component={Haberler} />}
      </Route>
      <Route path="/admin/yekpare-haberler">
        {() => <ProtectedAdminRoute component={YekpareHaberlerVitrinAyarlari} />}
      </Route>
      <Route path="/admin/haber-kategorileri">
        {() => <ProtectedAdminRoute component={HaberKategorileri} />}
      </Route>
      <Route path="/admin/haberler/yeni">
        {() => <ProtectedAdminRoute component={HaberEditor} />}
      </Route>
      <Route path="/admin/haberler/:id/duzenle">
        {() => <ProtectedAdminRoute component={HaberEditor} />}
      </Route>
      <Route path="/admin/kose-yazarlari">
        {() => <ProtectedAdminRoute component={KoseYazarlari} />}
      </Route>
      <Route path="/admin/blog-yazilari">
        {() => <ProtectedAdminRoute component={BlogYazilari} />}
      </Route>
      <Route path="/admin/sayfalar">
        {() => <ProtectedAdminRoute component={Sayfalar} />}
      </Route>
      <Route path="/admin/medya">
        {() => <ProtectedAdminRoute component={Medya} />}
      </Route>
      <Route path="/admin/ai-icerik-robotu">
        {() => <ProtectedAdminRoute component={AiIcerikRobotu} />}
      </Route>
      <Route path="/admin/rss-haberleri">
        {() => <ProtectedAdminRoute component={AdminRssHaberler} />}
      </Route>
      <Route path="/admin/rss-kampanyalari">
        {() => <ProtectedAdminRoute component={RssKampanyalari} />}
      </Route>
      <Route path="/admin/rss-kampanyalari/yeni">
        {() => <ProtectedAdminRoute component={RssKampanyaEditor} />}
      </Route>
      <Route path="/admin/rss-kampanyalari/:id/duzenle">
        {() => <ProtectedAdminRoute component={RssKampanyaEditor} />}
      </Route>
      <Route path="/admin/rss-kampanyalari/loglar">
        {() => <ProtectedAdminRoute component={RssLoglar} />}
      </Route>
      <Route path="/admin/video-tv">
        {() => <ProtectedAdminRoute component={YektubeYekpareQuickAdmin} />}
      </Route>
      <Route path="/admin/tema-ayarlari">
        {() => <ProtectedAdminRoute component={TemaAyarlari} />}
      </Route>
      <Route path="/admin/anasayfa-tasarim">
        {() => <ProtectedAdminRoute component={AnasayfaTasarimi} />}
      </Route>
      <Route path="/admin/anasayfa-modulleri">
        {() => <ProtectedAdminRoute component={AnasayfaModulleri} />}
      </Route>
      <Route path="/admin/bant-yonetimi">
        {() => <ProtectedAdminRoute component={BantYonetimi} />}
      </Route>
      <Route path="/admin/reklam-alanlari">
        {() => <ProtectedAdminRoute component={ReklamAlanlari} />}
      </Route>
      <Route path="/admin/hizli-kurulum">
        <Redirect to="/admin/ayarlar" />
      </Route>
      <Route path="/admin/manset-yonetimi">
        {() => <ProtectedAdminRoute component={MansetYonetimi} />}
      </Route>
      <Route path="/admin/foto-galeri">
        {() => <ProtectedAdminRoute component={FotoGaleri} />}
      </Route>
      <Route path="/admin/video-galeri">
        {() => <ProtectedAdminRoute component={VideoGaleri} />}
      </Route>
      <Route path="/admin/seri-ilanlar">{() => <Redirect to="/admin/haritalar-yonetimi" />}</Route>
      <Route path="/admin/resmi-ilanlar">
        {() => <ProtectedAdminRoute component={ResmiIlanlar} />}
      </Route>
      <Route path="/admin/transport">
        {() => <ProtectedAdminRoute component={TransportYonetimi} />}
      </Route>
      <Route path="/admin/ansiklopedi-yonetimi">
        {() => <ProtectedAdminRoute component={AnsiklopediYonetimi} />}
      </Route>
      <Route path="/admin/whatsapp-ayarlari">
        {() => <ProtectedAdminRoute component={WhatsAppAyarlari} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/w/*">
        {() => <ProtectedAdminRoute component={YekpareAiCallWorkspaceRedirect} />}
      </Route>
      <Route path="/admin/yekpare-ai-call">
        {() => <ProtectedAdminRoute component={YekpareAiCallOverview} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/ayarlar">
        {() => <ProtectedAdminRoute component={YekpareAiCallSettings} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/asistanlar">
        {() => <ProtectedAdminRoute component={YekpareAiCallAssistants} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/ai-kampanya">
        {() => <ProtectedAdminRoute component={YekpareAiCallCampaigns} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/kayitlar">
        {() => <ProtectedAdminRoute component={YekpareAiCallLogs} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/mesajlasma">
        {() => <ProtectedAdminRoute component={YekpareAiCallMessaging} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/sip">
        <Redirect to="/admin/yekpare-ai-call/sip-trunk" />
      </Route>
      <Route path="/admin/yekpare-ai-call/ekip">
        {() => <ProtectedAdminRoute component={YekpareAiCallTeam} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/rest-api">
        {() => <ProtectedAdminRoute component={YekpareAiCallRestApi} />}
      </Route>
      <Route path="/admin/pbx/canli">
        <Redirect to="/admin/yekpare-ai-call/canli" />
      </Route>
      <Route path="/admin/pbx/trunk">
        <Redirect to="/admin/yekpare-ai-call/sip-trunk" />
      </Route>
      <Route path="/admin/pbx/dahili">
        <Redirect to="/admin/yekpare-ai-call/dahili" />
      </Route>
      <Route path="/admin/pbx/kuyruk">
        <Redirect to="/admin/yekpare-ai-call/kuyruk" />
      </Route>
      <Route path="/admin/pbx/temsilci">
        <Redirect to="/admin/yekpare-ai-call/temsilci" />
      </Route>
      <Route path="/admin/pbx/kampanya">
        <Redirect to="/admin/yekpare-ai-call/kampanya" />
      </Route>
      <Route path="/admin/pbx/ivr">
        <Redirect to="/admin/yekpare-ai-call/ivr" />
      </Route>
      <Route path="/admin/pbx/hibrit">
        <Redirect to="/admin/yekpare-ai-call/hibrit" />
      </Route>
      <Route path="/admin/pbx">
        <Redirect to="/admin/yekpare-ai-call/pbx" />
      </Route>
      <Route path="/admin/yekpare-ai-call/canli">
        {() => <ProtectedAdminRoute component={PbxLiveMonitor} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/sip-trunk">
        {() => <ProtectedAdminRoute component={PbxTrunks} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/dahili">
        {() => <ProtectedAdminRoute component={PbxExtensions} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/kuyruk">
        {() => <ProtectedAdminRoute component={PbxQueues} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/temsilci">
        {() => <ProtectedAdminRoute component={PbxAgents} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/kampanya/:id">
        {() => <ProtectedAdminRoute component={PbxCampaignDetail} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/kampanya">
        {() => <ProtectedAdminRoute component={PbxCampaigns} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/ivr">
        {() => <ProtectedAdminRoute component={PbxIvr} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/hibrit">
        {() => <ProtectedAdminRoute component={PbxHybrid} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/verimor">
        {() => <ProtectedAdminRoute component={PbxVerimorSettings} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/3cx">
        {() => <ProtectedAdminRoute component={Pbx3cxSettings} />}
      </Route>
      <Route path="/admin/yekpare-ai-call/pbx">
        {() => <ProtectedAdminRoute component={PbxOverview} />}
      </Route>
      <Route path="/admin/ai-cagri-merkezi">
        <Redirect to="/admin/yekpare-ai-call" />
      </Route>
      <Route path="/admin/lisans">
        {() => <ProtectedAdminRoute component={Lisans} />}
      </Route>
      <Route path="/admin/urunler">
        {() => <ProtectedAdminRoute component={Urunler} />}
      </Route>
      <Route path="/admin/urun-kategorileri">
        {() => <ProtectedAdminRoute component={UrunKategorileri} />}
      </Route>
      <Route path="/admin/toplu-ice-aktar">
        {() => <ProtectedAdminRoute component={TopluIceAktar} />}
      </Route>
      <Route path="/admin/siparisler">
        {() => <ProtectedAdminRoute component={Siparisler} />}
      </Route>
      <Route path="/admin/odeme-ayarlari">
        {() => <ProtectedAdminRoute component={OdemeAyarlari} />}
      </Route>
      <Route path="/admin/magaza-yonetimi">
        {() => <ProtectedAdminRoute component={MagazaYonetimi} />}
      </Route>
      <Route path="/admin/haritalar-yonetimi">
        {() => <ProtectedAdminRoute component={HaritalarYonetimi} />}
      </Route>
      <Route path="/admin/global-map-news">
        {() => <ProtectedAdminRoute component={GlobalMapNewsAdmin} />}
      </Route>
      <Route path="/admin/one-cikan-isletmeler">
        {() => <ProtectedAdminRoute component={OneCikanIsletmeler} />}
      </Route>
      <Route path="/admin/siparis-isletmeleri">
        {() => <ProtectedAdminRoute component={SiparisIsletmeleri} />}
      </Route>
      <Route path="/admin/siparis-kategoriler">
        {() => <ProtectedAdminRoute component={SiparisKategoriler} />}
      </Route>
      <Route path="/admin/siparis-bannerlari">
        {() => <ProtectedAdminRoute component={SiparisBannerlari} />}
      </Route>
      <Route path="/admin/siparis-menu-items">
        {() => <ProtectedAdminRoute component={SiparisMenuItems} />}
      </Route>
      <Route path="/admin/alisveris-isletmeleri">
        {() => <ProtectedAdminRoute component={AlisverisIsletmeleri} />}
      </Route>
      <Route path="/admin/sari-sayfalar-isletmeleri">
        {() => <Redirect to="/admin/haritalar-yonetimi" />}
      </Route>
      <Route path="/admin/ilan-yonetimi">
        {() => <Redirect to="/admin/haritalar-yonetimi" />}
      </Route>
      <Route path="/admin/servis-saglayicilar">
        {() => <ProtectedAdminRoute component={ServisSaglayicilar} />}
      </Route>
      <Route path="/admin/ayarlar">
        {() => <ProtectedAdminRoute component={GenelAyarlar} />}
      </Route>
      <Route path="/admin/posta-ve-duyurular">
        {() => <ProtectedAdminRoute component={AdminPostaVeDuyurular} />}
      </Route>
      <Route path="/admin/panel-hesaplari">
        {() => <ProtectedAdminRoute component={PanelHesaplari} />}
      </Route>
      <Route path="/admin/turizm-yonetimi">
        {() => <ProtectedAdminRoute component={TurizmYonetimi} />}
      </Route>
      <Route path="/admin/turizm-ilanlar">
        {() => <ProtectedAdminRoute component={TurizmIlanlar} />}
      </Route>
      <Route path="/admin/turizm-rezervasyonlar">
        {() => <ProtectedAdminRoute component={TurizmRezervasyonlar} />}
      </Route>
      <Route path="/admin/otomotiv">
        {() => <ProtectedAdminRoute component={OtomotivYonetimi} />}
      </Route>
      <Route path="/admin/sigorta">
        {() => <ProtectedAdminRoute component={SigortaYonetimi} />}
      </Route>
      <Route path="/admin/sigorta-acente">
        <Redirect to="/admin/sigorta" />
      </Route>
      <Route path="/admin/teslimat-siparisleri">
        {() => <ProtectedAdminRoute component={TeslimatSiparisleri} />}
      </Route>
      <Route path="/admin/kasiyer">
        {() => <ProtectedAdminRoute component={KasiyerAdmin} />}
      </Route>
      <Route path="/admin/kupon-kodlari">
        {() => <ProtectedAdminRoute component={KuponYonetimi} />}
      </Route>
      <Route path="/admin/is-ortaklari">
        {() => <ProtectedAdminRoute component={IsOrtaklari} />}
      </Route>
      <Route path="/admin/kariyer-basvurulari">
        {() => <ProtectedAdminRoute component={KariyerBasvurulari} />}
      </Route>
      <Route path="/admin/iletisim-mesajlari">
        {() => <ProtectedAdminRoute component={IletisimMesajlari} />}
      </Route>
      <Route path="/admin/platform-duyurular">
        {() => <ProtectedAdminRoute component={PlatformDuyurular} />}
      </Route>
      <Route path="/admin/destek-talepleri">
        {() => <ProtectedAdminRoute component={DestekTalepleri} />}
      </Route>
    </Switch>
  );
}
