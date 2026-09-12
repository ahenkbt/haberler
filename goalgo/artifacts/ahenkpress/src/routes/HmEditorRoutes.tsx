import { Redirect, Route, Switch } from "wouter";
import { HmEditorRoute } from "@/components/HmEditorRoute";
import HaberEditor from "@/pages/admin/HaberEditor";
import EditorDashboard from "@/pages/editor/EditorDashboard";
import EditorHaberler from "@/pages/editor/EditorHaberler";
import EditorYekpareHaberleri from "@/pages/editor/EditorYekpareHaberleri";
import EditorIletisim from "@/pages/editor/EditorIletisim";
import EditorPostaKutusu from "@/pages/editor/EditorPostaKutusu";
import EditorBlog from "@/pages/editor/EditorBlog";
import EditorMakaleler from "@/pages/editor/EditorMakaleler";
import EditorHmMakale from "@/pages/editor/EditorHmMakale";
import EditorKoseYazarlari from "@/pages/editor/EditorKoseYazarlari";
import EditorFotoGaleri from "@/pages/editor/EditorFotoGaleri";
import EditorVideoGaleri from "@/pages/editor/EditorVideoGaleri";
import EditorVideoTvYonetimi from "@/pages/editor/EditorVideoTvYonetimi";
import EditorMedya from "@/pages/editor/EditorMedya";
import EditorGenelAyarlari from "@/pages/editor/EditorGenelAyarlari";
import EditorReklamAlanlari from "@/pages/editor/EditorReklamAlanlari";
import EditorManset from "@/pages/editor/EditorManset";
import EditorKategoriler from "@/pages/editor/EditorKategoriler";
import EditorSayfalar from "@/pages/editor/EditorSayfalar";
import EditorVitrinAyarlari from "@/pages/editor/EditorVitrinAyarlari";
import EditorMenuler from "@/pages/editor/EditorMenuler";
import EditorWordPressImport from "@/pages/editor/EditorWordPressImport";
import EditorWordPressTemplatePages from "@/pages/editor/EditorWordPressTemplatePages";
import EditorGiris from "@/pages/editor/EditorGiris";
import EditorProfil from "@/pages/editor/EditorProfil";
import EditorRssKampanyalari from "@/pages/editor/EditorRssKampanyalari";
import EditorRssKampanyaEditor from "@/pages/editor/EditorRssKampanyaEditor";
import EditorRssLoglar from "@/pages/editor/EditorRssLoglar";

/** HM özel alanı — editör yüzeyi ayrı chunk (haber vitrini 4MB portal yığınını çekmez). */
export default function HmEditorRoutes() {
  return (
    <Switch>
      <Route path="/editor/giris">{() => <EditorGiris />}</Route>
      <Route path="/editor/blog">
        {() => (
          <HmEditorRoute>
            <EditorBlog />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/makaleler/yeni">
        {() => (
          <HmEditorRoute>
            <EditorHmMakale />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/makaleler/:id/duzenle">
        {() => (
          <HmEditorRoute>
            <EditorHmMakale />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/makaleler">
        {() => (
          <HmEditorRoute>
            <EditorMakaleler />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/haberler/yeni">
        {() => (
          <HmEditorRoute>
            <HaberEditor />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/haberler/:id/duzenle">
        {() => (
          <HmEditorRoute>
            <HaberEditor />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/haberler">
        {() => (
          <HmEditorRoute>
            <EditorHaberler />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/rss-kampanyalari/yeni">
        {() => (
          <HmEditorRoute>
            <EditorRssKampanyaEditor />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/rss-kampanyalari/loglar">
        {() => (
          <HmEditorRoute>
            <EditorRssLoglar />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/rss-kampanyalari/:id/duzenle">
        {() => (
          <HmEditorRoute>
            <EditorRssKampanyaEditor />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/rss-kampanyalari">
        {() => (
          <HmEditorRoute>
            <EditorRssKampanyalari />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/yekpare-haberleri">
        {() => (
          <HmEditorRoute>
            <EditorYekpareHaberleri />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/iletisim">
        {() => (
          <HmEditorRoute>
            <EditorIletisim />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/posta-kutusu">
        {() => (
          <HmEditorRoute>
            <EditorPostaKutusu />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/wordpress-ice-aktar">
        {() => (
          <HmEditorRoute>
            <EditorWordPressImport />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/wordpress-template-sayfalari">
        {() => (
          <HmEditorRoute>
            <EditorWordPressTemplatePages />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/kose-yazarlari">
        {() => (
          <HmEditorRoute>
            <EditorKoseYazarlari />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/foto-galeri">
        {() => (
          <HmEditorRoute>
            <EditorFotoGaleri />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/video-galeri">
        {() => (
          <HmEditorRoute>
            <EditorVideoGaleri />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/video-tv-yonetimi">
        {() => (
          <HmEditorRoute>
            <EditorVideoTvYonetimi />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/medya">
        {() => (
          <HmEditorRoute>
            <EditorMedya />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/site-sayfalari">{() => <Redirect to="/editor/sayfalar" />}</Route>
      <Route path="/editor/profil">
        {() => (
          <HmEditorRoute>
            <EditorProfil />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/genel-ayarlar">
        {() => (
          <HmEditorRoute>
            <EditorGenelAyarlari />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/reklam-alanlari">
        {() => (
          <HmEditorRoute>
            <EditorReklamAlanlari />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/manset">
        {() => (
          <HmEditorRoute>
            <EditorManset />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/kategoriler">
        {() => (
          <HmEditorRoute>
            <EditorKategoriler />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/sayfalar">
        {() => (
          <HmEditorRoute>
            <EditorSayfalar />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/menuler">
        {() => (
          <HmEditorRoute>
            <EditorMenuler />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/vitrin">
        {() => (
          <HmEditorRoute>
            <EditorVitrinAyarlari />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor">
        {() => (
          <HmEditorRoute>
            <EditorDashboard />
          </HmEditorRoute>
        )}
      </Route>
    </Switch>
  );
}
