@extends('front.layout')

@section('pagename')
    - Haber Merkezi
@endsection

@section('meta-description', 'AIADDIN Haber Merkezi — yapay zekâ destekli haber siteniz, havuz, AI içerik robotu ve hazır şablonlar.')
@section('breadcrumb-title')
    Haber Merkezi
@endsection
@section('breadcrumb-link')
    Haber Merkezi
@endsection

@section('content')
    <section class="hm-hero text-center">
        <div class="container position-relative">
            <div class="hm-badge mx-auto mb-4">HM</div>
            <p class="hm-kicker">AIADDIN</p>
            <h1 class="display-5 fw-black text-white mb-3">Haber Merkezi</h1>
            <p class="lead text-white-50 mx-auto hm-lead">
                Yapay zekâ destekli haber siteniz <strong class="text-white">anında yayında</strong>.
                Gündem, ekonomi, spor ve onlarca kategoride içerik havuzu ve AI editör ile
                <strong class="text-white">7/24 güncel</strong> kalın — Yekpare Haber Merkezi deneyiminin AIADDIN sürümü.
            </p>
            <div class="d-flex flex-wrap justify-content-center gap-3 mt-4">
                <a href="{{ route('user.login') }}" class="btn btn-danger btn-lg px-4 fw-bold">Panele giriş</a>
                <a href="{{ route('front.pricing') }}" class="btn btn-outline-light btn-lg px-4">Paketleri gör</a>
                <a href="#sablonlar" class="btn btn-outline-light btn-lg px-4">Şablonları incele</a>
            </div>
        </div>
    </section>

    @php
        $turkeyCities = [
            ['plate' => '01', 'name' => 'Adana'],
            ['plate' => '02', 'name' => 'Adıyaman'],
            ['plate' => '03', 'name' => 'Afyonkarahisar'],
            ['plate' => '04', 'name' => 'Ağrı'],
            ['plate' => '05', 'name' => 'Amasya'],
            ['plate' => '06', 'name' => 'Ankara'],
            ['plate' => '07', 'name' => 'Antalya'],
            ['plate' => '08', 'name' => 'Artvin'],
            ['plate' => '09', 'name' => 'Aydın'],
            ['plate' => '10', 'name' => 'Balıkesir'],
            ['plate' => '11', 'name' => 'Bilecik'],
            ['plate' => '12', 'name' => 'Bingöl'],
            ['plate' => '13', 'name' => 'Bitlis'],
            ['plate' => '14', 'name' => 'Bolu'],
            ['plate' => '15', 'name' => 'Burdur'],
            ['plate' => '16', 'name' => 'Bursa'],
            ['plate' => '17', 'name' => 'Çanakkale'],
            ['plate' => '18', 'name' => 'Çankırı'],
            ['plate' => '19', 'name' => 'Çorum'],
            ['plate' => '20', 'name' => 'Denizli'],
            ['plate' => '21', 'name' => 'Diyarbakır'],
            ['plate' => '22', 'name' => 'Edirne'],
            ['plate' => '23', 'name' => 'Elazığ'],
            ['plate' => '24', 'name' => 'Erzincan'],
            ['plate' => '25', 'name' => 'Erzurum'],
            ['plate' => '26', 'name' => 'Eskişehir'],
            ['plate' => '27', 'name' => 'Gaziantep'],
            ['plate' => '28', 'name' => 'Giresun'],
            ['plate' => '29', 'name' => 'Gümüşhane'],
            ['plate' => '30', 'name' => 'Hakkari'],
            ['plate' => '31', 'name' => 'Hatay'],
            ['plate' => '32', 'name' => 'Isparta'],
            ['plate' => '33', 'name' => 'Mersin'],
            ['plate' => '34', 'name' => 'İstanbul'],
            ['plate' => '35', 'name' => 'İzmir'],
            ['plate' => '36', 'name' => 'Kars'],
            ['plate' => '37', 'name' => 'Kastamonu'],
            ['plate' => '38', 'name' => 'Kayseri'],
            ['plate' => '39', 'name' => 'Kırklareli'],
            ['plate' => '40', 'name' => 'Kırşehir'],
            ['plate' => '41', 'name' => 'Kocaeli'],
            ['plate' => '42', 'name' => 'Konya'],
            ['plate' => '43', 'name' => 'Kütahya'],
            ['plate' => '44', 'name' => 'Malatya'],
            ['plate' => '45', 'name' => 'Manisa'],
            ['plate' => '46', 'name' => 'Kahramanmaraş'],
            ['plate' => '47', 'name' => 'Mardin'],
            ['plate' => '48', 'name' => 'Muğla'],
            ['plate' => '49', 'name' => 'Muş'],
            ['plate' => '50', 'name' => 'Nevşehir'],
            ['plate' => '51', 'name' => 'Niğde'],
            ['plate' => '52', 'name' => 'Ordu'],
            ['plate' => '53', 'name' => 'Rize'],
            ['plate' => '54', 'name' => 'Sakarya'],
            ['plate' => '55', 'name' => 'Samsun'],
            ['plate' => '56', 'name' => 'Siirt'],
            ['plate' => '57', 'name' => 'Sinop'],
            ['plate' => '58', 'name' => 'Sivas'],
            ['plate' => '59', 'name' => 'Tekirdağ'],
            ['plate' => '60', 'name' => 'Tokat'],
            ['plate' => '61', 'name' => 'Trabzon'],
            ['plate' => '62', 'name' => 'Tunceli'],
            ['plate' => '63', 'name' => 'Şanlıurfa'],
            ['plate' => '64', 'name' => 'Uşak'],
            ['plate' => '65', 'name' => 'Van'],
            ['plate' => '66', 'name' => 'Yozgat'],
            ['plate' => '67', 'name' => 'Zonguldak'],
            ['plate' => '68', 'name' => 'Aksaray'],
            ['plate' => '69', 'name' => 'Bayburt'],
            ['plate' => '70', 'name' => 'Karaman'],
            ['plate' => '71', 'name' => 'Kırıkkale'],
            ['plate' => '72', 'name' => 'Batman'],
            ['plate' => '73', 'name' => 'Şırnak'],
            ['plate' => '74', 'name' => 'Bartın'],
            ['plate' => '75', 'name' => 'Ardahan'],
            ['plate' => '76', 'name' => 'Iğdır'],
            ['plate' => '77', 'name' => 'Yalova'],
            ['plate' => '78', 'name' => 'Karabük'],
            ['plate' => '79', 'name' => 'Kilis'],
            ['plate' => '80', 'name' => 'Osmaniye'],
            ['plate' => '81', 'name' => 'Düzce'],
        ];
        $encyclopediaBaseUrl = 'https://ankarasehirgazetesi.com/ansiklopedi/';
    @endphp

    <section class="aiaddin-section alt hm-cities-section" id="turkiye-sehirleri">
        <div class="container">
            <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
                <div>
                    <span class="badge bg-danger mb-2">Ansiklopedi</span>
                    <h2 class="h3 fw-bold mb-2">Türkiye Şehirleri</h2>
                    <p class="text-muted mb-0">
                        Haber sitesindeki şehir modülü gibi 81 ili tek alanda gösterin; her il ansiklopedi aramasına gider.
                    </p>
                </div>
                <a href="{{ $encyclopediaBaseUrl }}" class="btn btn-outline-danger" target="_blank" rel="noopener">
                    Ansiklopediye git
                </a>
            </div>
            <div class="hm-city-grid">
                @foreach ($turkeyCities as $city)
                    <a class="hm-city-card"
                        href="{{ $encyclopediaBaseUrl . '?q=' . rawurlencode($city['name']) }}"
                        target="_blank"
                        rel="noopener"
                        aria-label="{{ $city['name'] }} ansiklopedi aramasını aç">
                        <span class="hm-city-plate">{{ $city['plate'] }}</span>
                        <span class="hm-city-name">{{ $city['name'] }}</span>
                        <i class="fas fa-book-open" aria-hidden="true"></i>
                    </a>
                @endforeach
            </div>
        </div>
    </section>

    <section class="aiaddin-section">
        <div class="container">
            <h2 class="h3 fw-bold text-center mb-2">Nasıl çalışır?</h2>
            <p class="text-muted text-center mx-auto mb-5" style="max-width: 42rem;">
                Eklediğiniz haberler <strong>haber havuzuna</strong> düşer; AI ile özgünleştirilerek yayınlanır.
                Siz özel haberlerinizi ve köşe yazarlarınızı yönetirsiniz — robot rutin akışı günceller.
            </p>
            <div class="row g-4">
                @foreach ([
                    ['icon' => 'fa-magic', 'title' => 'Özgün içerik', 'text' => 'Gündem, ekonomi, dünya ve sporda AI ile özgünleştirilmiş metinler.'],
                    ['icon' => 'fa-newspaper', 'title' => 'Havuz ve yayılım', 'text' => 'Çok kaynaklı haber havuzu; kendi markanızla yayın.'],
                    ['icon' => 'fa-robot', 'title' => 'AI içerik robotu', 'text' => 'RSS, kampanya ve toplu işleme — WordPress eklentisi ve panel entegrasyonu.'],
                    ['icon' => 'fa-globe', 'title' => 'Özel kategori', 'text' => 'Şehir, ilçe veya konuya özel kategori ve manşet alanları.'],
                    ['icon' => 'fa-bolt', 'title' => 'Otomatik akış', 'text' => 'Zamanlanmış çekim ve yayın; minimum operasyon yükü.'],
                    ['icon' => 'fa-cloud', 'title' => 'Sıfır sunucu stresi', 'text' => 'Barındırma ve güncelleme AIADDIN paketlerine dahil.'],
                ] as $item)
                    <div class="col-md-6 col-lg-4">
                        <article class="hm-feature-card h-100">
                            <div class="hm-feature-icon"><i class="fas {{ $item['icon'] }}"></i></div>
                            <h3 class="h6 fw-bold mt-3">{{ $item['title'] }}</h3>
                            <p class="small text-muted mb-0">{{ $item['text'] }}</p>
                        </article>
                    </div>
                @endforeach
            </div>
        </div>
    </section>

    <section class="aiaddin-section alt" id="ai-robot">
        <div class="container">
            <div class="row align-items-center g-5">
                <div class="col-lg-6">
                    <span class="badge bg-danger mb-2">AI İçerik Robotu</span>
                    <h2 class="h3 fw-bold">Businesso + Ahenk AI eklentisi</h2>
                    <p class="text-muted">
                        Yekpare’deki <em>AI İçerik Robotu</em> ve <em>İçerik Havuzu</em> akışının aynı işlevleri
                        AIADDIN paketlerinde sunulur: kaynak seçimi, özgünleştirme, yayın ve köşe yazarı yönetimi.
                    </p>
                    <ul class="list-unstyled small text-muted mb-4">
                        @foreach ($aiFeatures as $line)
                            <li class="mb-2"><i class="fas fa-check text-success me-2"></i>{{ $line }}</li>
                        @endforeach
                    </ul>
                    <a href="{{ route('front.pricing') }}" class="btn btn-primary">AI paketlerini gör</a>
                </div>
                <div class="col-lg-6">
                    <div class="hm-ai-panel p-4 rounded-4">
                        <p class="small text-uppercase fw-bold text-danger mb-2">Örnek iş akışı</p>
                        <ol class="small mb-0 ps-3">
                            <li class="mb-2">RSS / Google News kaynağı tanımla</li>
                            <li class="mb-2">Havuzda önizle — AI özgünleştir</li>
                            <li class="mb-2">Kategori ve manşete ata</li>
                            <li>Yayınla — sosyal paylaşım (Gold+ paket)</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="aiaddin-section" id="sablonlar">
        <div class="container">
            <h2 class="h3 fw-bold mb-2">Canlı Businesso haber şablonları</h2>
            <p class="text-muted small mb-4">Her kart gerçek önizleme sitesine gider — statik sahte sayfa değil.</p>
            <div class="aiaddin-feature-grid mb-5">
                @foreach ($newsTemplates as $tpl)
                    <article class="aiaddin-template-card h-100">
                        <div class="p-4">
                            <div class="icon mb-3" style="background: {{ $tpl['tone'] }}22; color: {{ $tpl['tone'] }};">
                                <i class="{{ $tpl['icon'] }}"></i>
                            </div>
                            <h3 class="h6 fw-bold">{{ $tpl['name'] }}</h3>
                            @if (!empty($tpl['username']))
                                <p class="small text-primary mb-1">/{{ $tpl['username'] }}</p>
                            @endif
                            <p class="text-muted small mb-3">{{ $tpl['desc'] }}</p>
                            <a href="{{ $tpl['preview_url'] }}" class="btn btn-sm btn-primary" target="_blank" rel="noopener">Canlı önizle</a>
                        </div>
                    </article>
                @endforeach
            </div>

            <h2 class="h3 fw-bold mb-2" id="wordpress-temalari">WordPress haber temaları (paket içi)</h2>
            <p class="text-muted small mb-4">
                Yüklediğiniz Ahenk Haber, Yenitema ve legacy Ankara Haber temaları kurulum paketinde yer alır.
            </p>
            <div class="row g-4">
                @foreach ($wpThemes as $theme)
                    <div class="col-md-6 col-lg-3">
                        <article class="aiaddin-template-card h-100">
                            @if ($theme['preview_image'])
                                <div class="thumb">
                                    <img src="{{ $theme['preview_image'] }}" alt="{{ $theme['name'] }}" loading="lazy">
                                </div>
                            @else
                                <div class="thumb d-flex align-items-center justify-content-center"
                                    style="background: {{ $theme['tone'] }}18;">
                                    <i class="{{ $theme['icon'] }} fa-2x" style="color: {{ $theme['tone'] }};"></i>
                                </div>
                            @endif
                            <div class="p-3">
                                <h3 class="h6 fw-bold mb-1">{{ $theme['name'] }}</h3>
                                <p class="small text-muted mb-2">v{{ $theme['version'] }}</p>
                                <p class="small text-muted mb-0">{{ $theme['desc'] }}</p>
                            </div>
                        </article>
                    </div>
                @endforeach
            </div>
        </div>
    </section>

    <section class="aiaddin-section alt">
        <div class="container">
            <h2 class="h3 fw-bold text-center mb-4">Üyelik paketleri (özet)</h2>
            <div class="row g-4 justify-content-center">
                @foreach ([
                    ['name' => 'Standart', 'price' => '1.000', 'old' => '2.000', 'items' => ['Sunucu + otomatik güncelleme', 'AI editör', 'Günlük haber akışı']],
                    ['name' => 'Gold', 'price' => '2.000', 'old' => '3.000', 'highlight' => true, 'items' => ['Standart + sosyal otomasyon', 'Facebook / LinkedIn paylaşım']],
                    ['name' => 'Premium', 'price' => '3.000', 'old' => '5.000', 'items' => ['Gold + video / Reels ağı', 'Öncelikli destek']],
                ] as $pkg)
                    <div class="col-md-6 col-lg-4">
                        <div class="hm-price-card h-100 p-4 {{ !empty($pkg['highlight']) ? 'hm-price-card--gold' : '' }}">
                            @if (!empty($pkg['highlight']))
                                <span class="hm-price-badge">Popüler</span>
                            @endif
                            <h3 class="h5 fw-bold">{{ $pkg['name'] }}</h3>
                            <p class="small text-muted mb-1"><s>{{ $pkg['old'] }} TL/ay</s></p>
                            <p class="h3 fw-black text-danger mb-3">{{ $pkg['price'] }} <span class="fs-6 fw-normal text-muted">TL/ay</span></p>
                            <ul class="list-unstyled small text-muted mb-0">
                                @foreach ($pkg['items'] as $item)
                                    <li class="mb-2"><i class="fas fa-check text-success me-2"></i>{{ $item }}</li>
                                @endforeach
                            </ul>
                        </div>
                    </div>
                @endforeach
            </div>
            <p class="text-center text-muted small mt-4 mb-0">
                Kesin fiyat ve sözleşme için <a href="{{ route('front.contact') }}">iletişim</a> veya
                <a href="{{ route('front.pricing') }}">fiyatlandırma</a> sayfasına bakın.
            </p>
        </div>
    </section>

    <section class="container pb-5">
        <div class="aiaddin-cta">
            <h2 class="h4 fw-bold mb-2">Haber sitenizi bugün başlatın</h2>
            <p class="mb-4 opacity-90">Şablon seçin, AI robotunu bağlayın, alan adınızı yönlendirin.</p>
            <a href="{{ route('user-register') }}" class="btn btn-light btn-lg me-2 fw-semibold">Ücretsiz dene</a>
            <a href="{{ route('front.demo') }}" class="btn btn-outline-light btn-lg">Tüm demolar</a>
        </div>
    </section>
@endsection
