/** Askıya alınan haber sitesinin kamu sayfası. */
export const HM_PUBLIC_SUSPENDED_PAGE_HTML = `<!DOCTYPE html>
<html lang="tr" class="dark h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hizmet Askıya Alındı | Ahenk Bilgi Teknolojileri</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        brand: {
                            50: '#f0f7ff',
                            100: '#e0effe',
                            500: '#0284c7',
                            600: '#0369a1',
                            900: '#0c4a6e',
                        },
                        amberGlow: '#f59e0b',
                        dangerGlow: '#ef4444'
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    animation: {
                        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        'float': 'float 6s ease-in-out infinite',
                        'glow': 'glow 2s ease-in-out infinite alternate',
                    },
                    keyframes: {
                        float: {
                            '0%, 100%': { transform: 'translateY(0px)' },
                            '50%': { transform: 'translateY(-10px)' },
                        },
                        glow: {
                            '0%': { opacity: '0.4', filter: 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.4))' },
                            '100%': { opacity: '0.8', filter: 'drop-shadow(0 0 30px rgba(239, 68, 68, 0.8))' }
                        }
                    }
                }
            }
        }
    </script>
    <!-- Google Fonts Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- FontAwesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #080b11;
            color: #f3f4f6;
            overflow-x: hidden;
        }

        /* Glassmorphism card utility */
        .glass-card {
            background: rgba(17, 24, 39, 0.65);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }

        .aski-fold summary {
            list-style: none;
            cursor: pointer;
        }
        .aski-fold summary::-webkit-details-marker {
            display: none;
        }
        .aski-fold[open] .aski-chevron {
            transform: rotate(180deg);
        }

        .glass-card-interactive {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glass-card-interactive:hover {
            border-color: rgba(239, 68, 68, 0.3);
            box-shadow: 0 12px 40px -10px rgba(239, 68, 68, 0.15);
            transform: translateY(-2px);
        }

        .glass-badge {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.25);
        }

        /* Animated Mesh Gradient Overlay */
        .bg-mesh {
            background-image: 
                radial-gradient(at 10% 10%, rgba(239, 68, 68, 0.08) 0px, transparent 50%),
                radial-gradient(at 90% 20%, rgba(14, 165, 233, 0.06) 0px, transparent 50%),
                radial-gradient(at 50% 80%, rgba(245, 158, 11, 0.05) 0px, transparent 50%);
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #080b11;
        }
        ::-webkit-scrollbar-thumb {
            background: #1f2937;
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #374151;
        }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between relative antialiased selection:bg-red-500 selection:text-white">

    <!-- Background Canvas Particles -->
    <canvas id="particleCanvas" class="fixed inset-0 pointer-events-none z-0 opacity-40"></canvas>
    <div class="fixed inset-0 bg-mesh pointer-events-none z-0"></div>

    <!-- Header / Brand Bar -->
    <header class="relative z-10 w-full border-b border-gray-800/60 bg-gray-950/40 backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <!-- Brand Logo -->
            <a href="https://ahenk.net.tr" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 group">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-amber-500 to-cyan-500 p-[1px] shadow-lg shadow-red-950/40 group-hover:scale-105 transition-transform duration-300">
                    <div class="w-full h-full bg-gray-950 rounded-[11px] flex items-center justify-center">
                        <i class="fa-solid fa-shield-halved text-red-500 text-lg group-hover:text-red-400 transition-colors"></i>
                    </div>
                </div>
                <div class="flex flex-col">
                    <span class="text-lg font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">AHENK</span>
                    <span class="text-[10px] tracking-widest text-gray-400 font-semibold uppercase -mt-1">BİLGİ TEKNOLOJİLERİ</span>
                </div>
            </a>

            <!-- Status Badge -->
            <div class="glass-badge px-3.5 py-1.5 rounded-full flex items-center gap-2.5">
                <span class="relative flex h-2.5 w-2.5">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <span class="text-xs font-semibold text-red-400 uppercase tracking-wider hidden sm:inline-block">DURUM: GEÇİCİ OLARAK ASKIYA ALINDI</span>
                <span class="text-xs font-semibold text-red-400 uppercase tracking-wider sm:hidden">ASKIYA ALINDI</span>
            </div>
        </div>
    </header>

    <!-- Main Container -->
    <main class="relative z-10 flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col justify-center">

        <!-- Hero Section -->
        <div class="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div class="inline-flex items-center justify-center p-4 rounded-3xl bg-red-950/30 border border-red-500/20 text-red-500 mb-6 shadow-2xl shadow-red-900/20 animate-float">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-b from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/30">
                    <i class="fa-solid fa-triangle-exclamation text-3xl text-red-500"></i>
                </div>
            </div>
            
            <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
                Hizmet Geçici Olarak <br class="hidden sm:inline"/>
                <span class="bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-amber-400 to-red-400">
                    Askıya Alınmıştır
                </span>
            </h1>
            
            <p class="text-base sm:text-lg text-gray-300 font-normal leading-relaxed max-w-2xl mx-auto">
                <strong class="text-white font-semibold">Ahenk Bilgi Teknolojileri</strong> altyapısıyla yayın yapan bu platforma erişim; sistem güvenliği, lisans yenileme şartları veya yasal mevzuatlar gereğince geçici olarak durdurulmuştur.
            </p>
        </div>

        <!-- Filter Tabs for Categories -->
        <div class="flex items-center justify-center gap-2 mb-8 flex-wrap">
            <button onclick="filterCategory('all')" id="tab-all" class="category-tab active bg-red-600 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shadow-lg shadow-red-900/30">
                Tüm Nedenler (8)
            </button>
            <button onclick="filterCategory('finance')" id="tab-finance" class="category-tab glass-card text-gray-300 hover:text-white hover:bg-gray-800/80 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all">
                <i class="fa-solid fa-credit-card mr-1.5 text-amber-400"></i> Finans & Lisans
            </button>
            <button onclick="filterCategory('legal')" id="tab-legal" class="category-tab glass-card text-gray-300 hover:text-white hover:bg-gray-800/80 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all">
                <i class="fa-solid fa-scale-balanced mr-1.5 text-red-400"></i> İçerik & Yasal
            </button>
            <button onclick="filterCategory('contract')" id="tab-contract" class="category-tab glass-card text-gray-300 hover:text-white hover:bg-gray-800/80 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all">
                <i class="fa-solid fa-file-signature mr-1.5 text-cyan-400"></i> Sözleşme Şartları
            </button>
            <button onclick="filterCategory('security')" id="tab-security" class="category-tab glass-card text-gray-300 hover:text-white hover:bg-gray-800/80 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all">
                <i class="fa-solid fa-shield-virus mr-1.5 text-emerald-400"></i> Teknik & Güvenlik
            </button>
        </div>

        <!-- Reasons Multi-Column Grid Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12" id="reasonsGrid">
            
            <!-- CATEGORY 1: Finansal ve Lisans -->
            <div class="reason-card glass-card glass-card-interactive rounded-2xl p-6 flex flex-col justify-between" data-category="finance">
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <i class="fa-solid fa-file-invoice-dollar text-lg"></i>
                        </div>
                        <span class="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">FİNANSAL</span>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-2">Yıllık Servis & Bakım Lisansı</h3>
                    <p class="text-xs text-gray-400 leading-relaxed mb-4">
                        Altyapı, sunucu barındırma ve yıllık yazılım lisans yenileme bedellerinin vadesi içinde ödenmemiş veya tamamlanmamış olması.
                    </p>
                </div>
                <div class="pt-3 border-t border-gray-800/60 flex items-center text-xs text-gray-500">
                    <i class="fa-regular fa-clock mr-1.5 text-amber-400"></i>
                    Gecikme Süresi Toleransı Vadesindedir
                </div>
            </div>

            <div class="reason-card glass-card glass-card-interactive rounded-2xl p-6 flex flex-col justify-between" data-category="finance">
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <i class="fa-solid fa-globe text-lg"></i>
                        </div>
                        <span class="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">ALAN ADI</span>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-2">Domain / Hosting Süresi</h3>
                    <p class="text-xs text-gray-400 leading-relaxed mb-4">
                        Web sitesine bağlı alan adı (domain) veya sunucu barındırma (hosting) paketlerinin yenileme döneminde güncellenmemesi.
                    </p>
                </div>
                <div class="pt-3 border-t border-gray-800/60 flex items-center text-xs text-gray-500">
                    <i class="fa-solid fa-rotate-right mr-1.5 text-amber-400"></i>
                    Yenileme Bekleniyor
                </div>
            </div>

            <!-- CATEGORY 2: İçerik ve Yasal Mevzuat -->
            <div class="reason-card glass-card glass-card-interactive rounded-2xl p-6 flex flex-col justify-between" data-category="legal">
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                            <i class="fa-solid fa-gavel text-lg"></i>
                        </div>
                        <span class="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">YASAL İHLAL</span>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-2">Mevzuat ve Suç Övgüsü</h3>
                    <p class="text-xs text-gray-400 leading-relaxed mb-4">
                        T.C. kanunlarına aykırı, suç teşkil eden veya suç ve suçluyu övücü mahiyetteki haber, materyal ve paylaşımların yapılması.
                    </p>
                </div>
                <div class="pt-3 border-t border-gray-800/60 flex items-center text-xs text-gray-500">
                    <i class="fa-solid fa-ban mr-1.5 text-red-400"></i>
                    Sıfır Tolerans Politikası
                </div>
            </div>

            <div class="reason-card glass-card glass-card-interactive rounded-2xl p-6 flex flex-col justify-between" data-category="legal">
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                            <i class="fa-solid fa-copyright text-lg"></i>
                        </div>
                        <span class="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">TELİF / AJANS</span>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-2">Telif ve Fikri Mülkiyet</h3>
                    <p class="text-xs text-gray-400 leading-relaxed mb-4">
                        İzinsiz veya lisanssız ajans materyallerinin, medya dosyalarının ya da mülkiyeti başkasına ait içeriklerin izinsiz kullanımı.
                    </p>
                </div>
                <div class="pt-3 border-t border-gray-800/60 flex items-center text-xs text-gray-500">
                    <i class="fa-solid fa-copyright mr-1.5 text-red-400"></i>
                    Telif İhtarı Tespiti
                </div>
            </div>

            <!-- CATEGORY 3: Hizmet ve Sözleşme -->
            <div class="reason-card glass-card glass-card-interactive rounded-2xl p-6 flex flex-col justify-between" data-category="contract">
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <i class="fa-solid fa-link-slash text-lg"></i>
                        </div>
                        <span class="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">ALTYAPI İMZASI</span>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-2">Ajans ve Yazılım İmzası</h3>
                    <p class="text-xs text-gray-400 leading-relaxed mb-4">
                        Platform altbilgisinde (footer) zorunlu yer alması gereken ajans üyeliği, yazılım logosu ve bağlantıların izinsiz kaldırılması.
                    </p>
                </div>
                <div class="pt-3 border-t border-gray-800/60 flex items-center text-xs text-gray-500">
                    <i class="fa-solid fa-code mr-1.5 text-cyan-400"></i>
                    Sözleşme İhlali
                </div>
            </div>

            <div class="reason-card glass-card glass-card-interactive rounded-2xl p-6 flex flex-col justify-between" data-category="contract">
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <i class="fa-solid fa-sliders text-lg"></i>
                        </div>
                        <span class="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">KOTA İHLALİ</span>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-2">Kullanım Şartları & Kota</h3>
                    <p class="text-xs text-gray-400 leading-relaxed mb-4">
                        Hizmet sözleşmesinde belirlenen sunucu kullanım şartlarının veya adil kullanım kotalarının aşılması ve ihlal edilmesi.
                    </p>
                </div>
                <div class="pt-3 border-t border-gray-800/60 flex items-center text-xs text-gray-500">
                    <i class="fa-solid fa-gauge-high mr-1.5 text-cyan-400"></i>
                    Limit Aşımı
                </div>
            </div>

            <!-- CATEGORY 4: Teknik ve Güvenlik -->
            <div class="reason-card glass-card glass-card-interactive rounded-2xl p-6 flex flex-col justify-between" data-category="security">
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <i class="fa-solid fa-bug text-lg"></i>
                        </div>
                        <span class="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">GÜVENLİK</span>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-2">Zararlı Yazılım / Malware</h3>
                    <p class="text-xs text-gray-400 leading-relaxed mb-4">
                        Sitede kötü amaçlı yazılım (malware), yetkisiz erişim veya spambot faaliyetlerinin tespit edilmesiyle oluşan risk durumu.
                    </p>
                </div>
                <div class="pt-3 border-t border-gray-800/60 flex items-center text-xs text-gray-500">
                    <i class="fa-solid fa-shield-cat mr-1.5 text-emerald-400"></i>
                    Otomatik Sunucu Koruması
                </div>
            </div>

            <div class="reason-card glass-card glass-card-interactive rounded-2xl p-6 flex flex-col justify-between" data-category="security">
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <i class="fa-solid fa-microchip text-lg"></i>
                        </div>
                        <span class="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SUNUCU MİMARİSİ</span>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-2">Aşırı Kaynak Tüketimi</h3>
                    <p class="text-xs text-gray-400 leading-relaxed mb-4">
                        Sunucu genel performansını olumsuz etkileyecek seviyede aşırı CPU/RAM kullanımı veya anormal bant genişliği tüketimi.
                    </p>
                </div>
                <div class="pt-3 border-t border-gray-800/60 flex items-center text-xs text-gray-500">
                    <i class="fa-solid fa-server mr-1.5 text-emerald-400"></i>
                    Kaynak Dengeleme Modu
                </div>
            </div>

        </div>

        <!-- Reminder accordion -->
        <div class="glass-card rounded-2xl p-6 sm:p-8 border-l-4 border-l-amber-400 mb-12 relative overflow-hidden">
            <div class="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="relative z-10">
                <h4 class="text-base font-bold text-white mb-3 flex items-center gap-2">
                    <i class="fa-solid fa-bell text-amber-400"></i>
                    HATIRLATMA UYARISI
                </h4>
                <p class="text-xs sm:text-sm text-gray-300 leading-relaxed mb-3">
                    Sitenize ait hizmet; altyapı kullanım şartları, ödeme süreçleri ve yasal mevzuat gereksinimleri sebebiyle geçici olarak askıya alınmıştır.
                </p>
                <p class="text-xs sm:text-sm text-gray-300 leading-relaxed mb-5">
                    Sitenizin yayına tekrar açılabilmesi ve sistemin aktif hale getirilebilmesi için aşağıda belirtilen bilgi ve belgelerin tarafımıza iletilmesi gerekmektedir:
                </p>
                <div class="space-y-3">
                    <details class="aski-fold rounded-xl border border-amber-500/25 bg-gray-950/50">
                        <summary class="flex items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-white">
                            <span>GEREKLİ BELGELER</span>
                            <i class="aski-chevron fa-solid fa-chevron-down text-amber-400 text-xs transition-transform"></i>
                        </summary>
                        <div class="px-4 pb-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
                            <ul class="space-y-2 list-disc pl-5">
                                <li><strong class="text-white font-semibold">Ödeme Dekontu:</strong> Kullanım ücreti ödemesine ait dekont,</li>
                                <li>
                                    <strong class="text-white font-semibold">Yasal ve Kurumsal Belgeler:</strong>
                                    <ul class="mt-2 space-y-1 list-disc pl-5">
                                        <li>Vergi Levhası,</li>
                                        <li>İmza Sirküsü,</li>
                                        <li>Basın Savcılığı İzin / Alındı Belgesi,</li>
                                        <li>Meslek Odası Kayıt Belgesi.</li>
                                    </ul>
                                </li>
                            </ul>
                            <p class="mt-4">
                                Ödeme dekontu ve belirtilen yasal belgeler <a href="mailto:bilgi@ahenk.net.tr" class="text-amber-300 font-semibold hover:text-amber-200">e-posta adresimize</a> iletildiğinde yayınınız derhal aktif edilecektir.
                            </p>
                        </div>
                    </details>
                    <details class="aski-fold rounded-xl border border-amber-500/25 bg-gray-950/50">
                        <summary class="flex items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-white">
                            <span>YASAL ZORUNLULUKLAR VE BİLGİLENDİRME</span>
                            <i class="aski-chevron fa-solid fa-chevron-down text-amber-400 text-xs transition-transform"></i>
                        </summary>
                        <div class="px-4 pb-4 space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
                            <p>
                                <strong class="text-white font-semibold">İnternet Haber Sitesi Statüsü ve Beyanname Zorunluluğu:</strong>
                                5187 sayılı Basın Kanunu kapsamındaki haklardan yararlanabilmek, resmi olarak "internet haber sitesi" vasfı kazanabilmek ve yasal yayın faaliyeti yürütebilmek için yetkili mercilere beyanname verilerek Alındı Belgesi'nin alınmış olması zorunludur. Kayıtsız ve belgesiz yayın yapılması kanunen suç teşkil etmektedir.
                            </p>
                            <p>
                                <strong class="text-white font-semibold">İçerik Koruma, Arşiv ve Yayın Yükümlülükleri:</strong>
                                5187 sayılı Kanun uyarınca; yayımlanan içeriklerin doğruluğunun sağlanması, arşiv/içerik muhafaza yükümlülüklerinin yerine getirilmesi, Düzeltme ve Cevap Hakkı (Tekzip) ilkelerine uyulması ve cezai sorumluluk doğuracak hususlarda yasal standartların korunması gerekmektedir.
                            </p>
                            <p>
                                <strong class="text-white font-semibold">Cezai Sorumluluk ve Dezenformasyon Maddesi:</strong>
                                Türk Ceza Kanunu (TCK) Madde 217/A uyarınca "Halkı yanıltıcı bilgiyi alenen yayma" (dezenformasyon) suçu kapsamında doğabilecek idari ve cezai yaptırımların önüne geçilebilmesi adına, işletmeci/yayıncı bilgilerini doğrulayan yukarıdaki yasal belgelerin sistemimizde tanımlı olması hukuki bir zorunluluktur.
                            </p>
                        </div>
                    </details>
                    <details class="aski-fold rounded-xl border border-red-500/30 bg-gray-950/50">
                        <summary class="flex items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-white">
                            <span>ÖNEMLİ BİLGİLENDİRME &amp; VERİ SİLİNME UYARISI</span>
                            <i class="aski-chevron fa-solid fa-chevron-down text-red-400 text-xs transition-transform"></i>
                        </summary>
                        <div class="px-4 pb-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
                            Askıya alınan web sitelerinde gerekli finansal, hukuki veya teknik yükümlülükler belirli zaman dilimi içerisinde yerine getirilmediği takdirde; <span class="text-red-400 font-semibold underline underline-offset-2">veri kaybını önlemek adına site verileri koruma süresi sonunda sistemden kalıcı olarak silinecek</span> ve erişim tamamen kapatılacaktır.
                        </div>
                    </details>
                </div>
            </div>
        </div>

        <!-- Contact & Resolution Actions -->
        <div class="glass-card rounded-3xl p-8 sm:p-10 border border-gray-700/50 shadow-2xl relative overflow-hidden">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                <div class="lg:col-span-7">
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-4">
                        <i class="fa-solid fa-headset"></i> ÇÖZÜM VE YENİDEN AKTİVASYON
                    </div>
                    <h3 class="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                        Hizmeti Yeniden Aktif Hale Getirin
                    </h3>
                    <p class="text-sm text-gray-300 leading-relaxed mb-6">
                        Yayın akışınızı tekrar sağlamak, ödeme ve lisans yenileme işlemlerinizi gerçekleştirmek veya teknik destek almak için yetkili ekibimizle doğrudan iletişime geçebilirsiniz.
                    </p>

                    <div class="flex flex-wrap items-center gap-4 text-sm">
                        <div class="flex items-center gap-3 bg-gray-900/80 border border-gray-800 px-4 py-2.5 rounded-xl">
                            <i class="fa-solid fa-envelope text-red-400"></i>
                            <span class="text-gray-300">E-Posta:</span>
                            <span class="text-white font-mono font-medium">bilgi@ahenk.net.tr</span>
                            <button onclick="copyEmail()" class="ml-2 text-gray-400 hover:text-white transition-colors" title="Kopyala">
                                <i class="fa-regular fa-copy"></i>
                            </button>
                        </div>
                        <div class="flex items-center gap-3 bg-gray-900/80 border border-gray-800 px-4 py-2.5 rounded-xl">
                            <i class="fa-solid fa-globe text-cyan-400"></i>
                            <span class="text-gray-300">Web Site:</span>
                            <a href="https://ahenk.net.tr" target="_blank" rel="noopener noreferrer" class="text-white font-medium hover:text-cyan-400 transition-colors">ahenk.net.tr</a>
                        </div>
                    </div>
                </div>

                <div class="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-4">
                    <a href="mailto:bilgi@ahenk.net.tr?subject=Site%20Ask%C4%B1%20Hakk%C4%B1nda%20Destek%20Talebi" class="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-red-950/50 transition-all duration-300 hover:scale-[1.02] text-sm">
                        <i class="fa-solid fa-paper-plane"></i>
                        Destek Talebi Oluştur
                    </a>
                    <a href="https://ahenk.net.tr" target="_blank" rel="noopener noreferrer" class="w-full inline-flex items-center justify-center gap-3 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 hover:text-white border border-gray-600/50 font-semibold py-4 px-6 rounded-2xl transition-all duration-300 text-sm">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        Ahenk.net.tr Ziyaret Et
                    </a>
                </div>

            </div>
        </div>

    </main>

    <!-- Footer -->
    <footer class="relative z-10 border-t border-gray-800/60 bg-gray-950/60 backdrop-blur-md py-6">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <p>&copy; 2026 Ahenk Bilgi Teknolojileri. Tüm hakları saklıdır.</p>
            <div class="flex items-center gap-6">
                <span class="flex items-center gap-1.5 text-gray-400">
                    <i class="fa-solid fa-shield-halved text-emerald-500"></i> Güvenli Sunucu Altyapısı
                </span>
                <a href="https://ahenk.net.tr" target="_blank" rel="noopener noreferrer" class="hover:text-gray-300 transition-colors">Gizlilik & Koşullar</a>
            </div>
        </div>
    </footer>

    <!-- Toast Notification for Clipboard -->
    <div id="toast" class="fixed bottom-6 right-6 z-50 transform translate-y-20 opacity-0 transition-all duration-300 pointer-events-none glass-card bg-gray-900/90 border border-emerald-500/40 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <i class="fa-solid fa-check text-sm"></i>
        </div>
        <div>
            <h5 class="text-xs font-bold text-white">Başarıyla Kopyalandı</h5>
            <p class="text-[11px] text-gray-400">bilgi@ahenk.net.tr panoya kopyalandı.</p>
        </div>
    </div>

    <!-- JavaScript Logic -->
    <script>
        // Copy Email to Clipboard Functionality
        function copyEmail() {
            const email = "bilgi@ahenk.net.tr";
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(email).then(showToast);
            } else {
                // Fallback for iframe / unsupported browsers
                const tempInput = document.createElement('input');
                tempInput.value = email;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                showToast();
            }
        }

        function showToast() {
            const toast = document.getElementById('toast');
            toast.classList.remove('translate-y-20', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
            setTimeout(() => {
                toast.classList.remove('translate-y-0', 'opacity-100');
                toast.classList.add('translate-y-20', 'opacity-0');
            }, 3000);
        }

        // Category Filter logic
        function filterCategory(cat) {
            const cards = document.querySelectorAll('.reason-card');
            const tabs = document.querySelectorAll('.category-tab');

            tabs.forEach(tab => {
                tab.classList.remove('bg-red-600', 'text-white', 'shadow-lg', 'shadow-red-900/30');
                tab.classList.add('glass-card', 'text-gray-300');
            });

            const activeTab = document.getElementById(\`tab-\${cat}\`);
            if (activeTab) {
                activeTab.classList.remove('glass-card', 'text-gray-300');
                activeTab.classList.add('bg-red-600', 'text-white', 'shadow-lg', 'shadow-red-900/30');
            }

            cards.forEach(card => {
                if (cat === 'all' || card.getAttribute('data-category') === cat) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        // Background Particle Effect
        const canvas = document.getElementById('particleCanvas');
        const ctx = canvas.getContext('2d');

        let particlesArray = [];
        const numberOfParticles = 40;

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.4;
                this.speedY = (Math.random() - 0.5) * 0.4;
                this.color = Math.random() > 0.5 ? 'rgba(239, 68, 68, ' : 'rgba(14, 165, 233, ';
                this.alpha = Math.random() * 0.4 + 0.1;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
                if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
            }

            draw() {
                ctx.fillStyle = this.color + this.alpha + ')';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function initParticles() {
            particlesArray = [];
            for (let i = 0; i < numberOfParticles; i++) {
                particlesArray.push(new Particle());
            }
        }

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particlesArray.forEach(particle => {
                particle.update();
                particle.draw();
            });
            requestAnimationFrame(animateParticles);
        }

        window.onload = function() {
            initParticles();
            animateParticles();
        };
    </script>
</body>
</html>`;
