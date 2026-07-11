@extends('front.layout')

@section('pagename')
    - {{ __('Home') }}
@endsection
@section('meta-description', !empty($seo) ? $seo->home_meta_description : '')
@section('meta-keywords', !empty($seo) ? $seo->home_meta_keywords : '')
@section('content')
    <!-- Home Start-->
    <section id="home" class="home-banner pb-80">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-xl-10">
                    <div class="content mb-40 mx-auto text-center">
                        <span class="subtitle color-primary" data-aos="fade-up"> {{ $be->hero_section_title }}</span>
                        <h1 class="title" data-aos="fade-up" data-aos-delay="100">
                            {{ $be->hero_section_subtitle }}
                        </h1>
                        <p data-aos="fade-up" data-aos-delay="150">
                            {{ $be->hero_section_text }}
                        </p>
                        <div class="btn-groups justify-content-center" data-aos="fade-up" data-aos-delay="200">
                            @if (!empty($be->hero_section_button_url))
                                <a href="{{ $be->hero_section_button_url }}" class="btn btn-lg btn-primary"
                                    title="{{ $be->hero_section_button_text }}"
                                    target="_self">{{ $be->hero_section_button_text }}</a>
                            @endif
                            @if (!empty($be->hero_section_secound_button_url))
                                <a href="{{ $be->hero_section_secound_button_url }}" class="btn btn-lg btn-outline"
                                    title="{{ $be->hero_section_secound_button_text }}"
                                    target="_self">{{ $be->hero_section_secound_button_text }}</a>
                            @endif
                        </div>
                    </div>
                    <div class="banner-img mb-40 text-center" data-aos="fade-left">

                        <img class="lazyload"
                            data-src="{{ !empty($be->hero_img) ? asset('assets/front/img/' . $be->hero_img) : asset('assets/frontend/images/banner.png') }}"
                            alt="Banner Image">
                    </div>
                </div>
            </div>
        </div>
        <!-- Banner Images -->
        <div class="banner-images d-none d-lg-block">
            <img class="lazyload blur-up img-1"
                data-src="{{ !empty($be->hero_img2) ? asset('assets/front/img/' . $be->hero_img2) : asset('assets/frontend/images/banner-img-1.jpg') }}"
                alt="Banner Image">
            <img class="lazyload blur-up img-2"
                data-src="{{ !empty($be->hero_img3) ? asset('assets/front/img/' . $be->hero_img3) : asset('assets/frontend/images/banner-img-2.jpg') }}"
                alt="Banner Image">
            <img class="lazyload blur-up img-3"
                data-src="{{ !empty($be->hero_img4) ? asset('assets/front/img/' . $be->hero_img4) : asset('assets/frontend/images/banner-img-3.jpg') }}"
                alt="Banner Image">
            <img class="lazyload blur-up img-4"
                data-src="{{ !empty($be->hero_img5) ? asset('assets/front/img/' . $be->hero_img5) : asset('assets/frontend/images/banner-img-4.jpg') }}"
                alt="Banner Image">
        </div>
        <!-- Bg-shape -->
        <div class="bg-shape bg-primary-light">
            <img class="lazyload" data-src="{{ asset('assets/frontend/images/banner-bg.png') }}" alt="Shape">
        </div>
        <!-- Shape -->
        <div class="shape">
            <img class="lazyload shape-1" data-src="{{ asset('assets/frontend/images/shape/shape-1.png') }}"
                alt="Shape">
            <img class="lazyload shape-2" data-src="{{ asset('assets/frontend/images/shape/shape-2.png') }}"
                alt="Shape">
            <img class="lazyload shape-3" data-src="{{ asset('assets/frontend/images/shape/shape-3.png') }}"
                alt="Shape">
            <img class="lazyload shape-4" data-src="{{ asset('assets/frontend/images/shape/shape-4.png') }}"
                alt="Shape">
            <img class="lazyload shape-5" data-src="{{ asset('assets/frontend/images/shape/shape-5.png') }}"
                alt="Shape">
            <img class="lazyload shape-6" data-src="{{ asset('assets/frontend/images/shape/shape-6.png') }}"
                alt="Shape">
            <img class="lazyload shape-7" data-src="{{ asset('assets/frontend/images/shape/shape-7.png') }}"
                alt="Shape">
        </div>
    </section>
    <!-- Home End -->
    @if ($bs->partners_section == 1)
        <!-- Sponsor Start  -->
        <section class="sponsor">
            <div class="container">
                <div class="row">
                    <div class="col-12">
                        <div class="section-title title-center mb-50" data-aos="fade-up">
                            <span class="subtitle">{{ $bs->partners_section_title }}</span>
                            <h2 class="title">{{ $bs->partners_section_subtitle }}</h2>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="swiper sponsor-slider">
                            <div class="swiper-wrapper">
                                @foreach ($partners as $partner)
                                    <div class="swiper-slide">
                                        <div class="item-single d-flex justify-content-center">
                                            <div class="sponsor-img">
                                                <img class="lazyload blur-up"
                                                    data-src="{{ asset('assets/front/img/partners/' . $partner->image) }}"
                                                    alt="Sponsor">
                                            </div>
                                        </div>
                                    </div>
                                @endforeach
                            </div>
                            <div class="swiper-pagination position-static mt-30" data-aos="fade-up"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <!-- Sponsor End -->
    @endif
    @if ($bs->process_section == 1)
        <!-- Store Start -->
        <section class="store-area pt-120 pb-90">
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-12">
                        <div class="section-title title-inline mb-50" data-aos="fade-up">
                            <h2 class="title">{{ $bs->work_process_title }}</h2>

                        </div>
                    </div>
                    <div class="col-12">
                        <div class="row justify-content-center">
                            @foreach ($processes as $key => $process)
                                <div class="col-sm-6 col-lg-4 col-xl-3 mb-30 item" data-aos="fade-up">
                                    <div class="card">
                                        <div class="card-icon">
                                            @if (!empty($process->image))
                                                <img class="lazyload"
                                                    data-src="{{ asset('assets/front/img/process/' . $process->image) }}"
                                                    alt="Icon">
                                            @endif
                                        </div>
                                        <div class="card-content">
                                            <a href="javaScript:void(0)">
                                                <h4 class="card-title  ">{{ $process->title }}</h4>
                                            </a>
                                            <p class="card-text ">
                                                {{ $process->subtitle }}
                                            </p>

                                        </div>
                                    </div>
                                </div>
                            @endforeach

                        </div>
                    </div>
                </div>
            </div>
            <!-- Bg Shape -->
            <div class="shape">
                <img class="shape-1" src="{{ asset('assets/frontend/images/shape/shape-3.png') }}" alt="Shape">
                <img class="shape-2" src="{{ asset('assets/frontend/images/shape/shape-9.png') }}" alt="Shape">
                <img class="shape-3" src="{{ asset('assets/frontend/images/shape/shape-6.png') }}" alt="Shape">
                <img class="shape-4" src="{{ asset('assets/frontend/images/shape/shape-1.png') }}" alt="Shape">
            </div>
        </section>
        <!-- Store End -->
    @endif
    @if ($bs->templates_section == 1)

        <!-- Template Start -->
        <section class="template-area bg-primary-light ptb-120">
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-8 col-lg-6">
                        <div class="section-title title-center mb-50" data-aos="fade-up">
                            <span class="subtitle">{{ $bs->preview_templates_title }}</span>
                            <h2 class="title mt-0">{{ $bs->preview_templates_subtitle }}</h2>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="row justify-content-center">
                            @foreach ($templates as $template)
                                <div class="col-lg-4 col-sm-6" data-aos="fade-up">
                                    <div class="card text-center mb-50">
                                        <div class="card-image">
                                            <div class="lazy-container">
                                                <img class="lazyload lazy-image"
                                                    data-src="{{ asset('assets/front/img/template-previews/' . $template->template_img) }}"
                                                    alt="Demo Image" />
                                            </div>
                                            <div class="hover-show">
                                                <a href="{{ detailsUrl($template) }}" target="_blank"
                                                    class="btn-icon rounded-circle" title="View Details">
                                                    <i class="fal fa-link"></i>
                                                </a>
                                            </div>
                                        </div>
                                        <h4 class="card-title">
                                            <a href="{{ detailsUrl($template) }}" title="Link" target="_blank">
                                                {{ __($template->template_name) }}
                                            </a>
                                        </h4>
                                    </div>
                                </div>
                            @endforeach

                            <div class="col-12 text-center">
                                <a href="{{ route('front.templates') }}" class="btn btn-lg btn-primary"
                                    title="{{ __('More Templates') }}" target="_blank">{{ __('More Templates') }}</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Bg Shape -->
            <div class="shape">
                <img class="shape-1" src="{{ asset('assets/frontend/images/shape/shape-4.png') }}" alt="Shape">
                <img class="shape-2" src="{{ asset('assets/frontend/images/shape/shape-3.png') }}" alt="Shape">
                <img class="shape-3" src="{{ asset('assets/frontend/images/shape/shape-9.png') }}" alt="Shape">
                <img class="shape-4" src="{{ asset('assets/frontend/images/shape/shape-7.png') }}" alt="Shape">
                <img class="shape-5" src="{{ asset('assets/frontend/images/shape/shape-11.png') }}" alt="Shape">
                <img class="shape-6" src="{{ asset('assets/frontend/images/shape/shape-4.png') }}" alt="Shape">
                <img class="shape-7" src="{{ asset('assets/frontend/images/shape/shape-8.png') }}" alt="Shape">
                <img class="shape-8" src="{{ asset('assets/frontend/images/shape/shape-4.png') }}" alt="Shape">
                <img class="shape-9" src="{{ asset('assets/frontend/images/shape/shape-7.png') }}" alt="Shape">
                <img class="shape-10" src="{{ asset('assets/frontend/images/shape/shape-10.png') }}" alt="Shape">
            </div>
        </section>
        <!-- Template End -->
    @endif

    @if ($bs->feature_section == 1 || $bs->intro_section == 1)
        <!-- Choose Start -->
        <section class="choose-area pt-120 pb-80">
            <div class="container">
                <div class="row align-items-center">
                    @if ($bs->intro_section == 1)
                        <div class="col-lg-6">
                            <div class="content-title mb-40 pe-lg-5" data-aos="fade-right">
                                <span class="subtitle">{{ $bs->intro_title }}</span>
                                <h2 class="title">{{ $bs->intro_subtitle }}</h2>
                                @php
                                    $contents = explode(PHP_EOL, $bs->intro_text);
                                @endphp

                                @foreach ($contents as $content)
                                    @if ($loop->first)
                                        <p class="text">{{ $content }}</p>
                                    @endif
                                @endforeach

                                <ul class="choose-list list-unstyled p-0">
                                    @foreach ($contents as $content)
                                        @if (!$loop->first)
                                            <li class="ps-0">
                                                {{ $content }}
                                            </li>
                                        @endif
                                    @endforeach

                                </ul>
                                @if ($bs->intro_button_name && $bs->intro_button_url)
                                    <a href="{{ $bs->intro_button_url }}" class="btn btn-lg btn-primary"
                                        title="Purchase Now" target="_self">{{ $bs->intro_button_name }}</a>
                                @endif
                            </div>
                        </div>
                    @endif
                    @if ($bs->feature_section == 1)
                        <div @if ($bs->intro_section != 1) class="col-lg-12" @else class="col-lg-6" @endif>
                            <div class="row justify-content-center mb-10">
                                @foreach ($features as $feature)
                                    <div class="col-sm-6" data-aos="fade-up">
                                        <div class="card mb-30">
                                            <div class="card-icon">
                                                <img src="{{ $feature->image ? asset('assets/front/img/features/' . $feature->image) : asset('assets/frontend/images/icon/languages.png') }}"
                                                    alt="Icon">
                                            </div>
                                            <div class="card-content">
                                                <a href="#">
                                                    <h4 class="card-title ">{{ $feature->title }}</h4>
                                                </a>
                                                <p class="card-text">{{ $feature->text }}</p>
                                            </div>
                                        </div>
                                    </div>
                                @endforeach

                            </div>
                        </div>
                    @endif
                </div>
            </div>
            <!-- Bg Shape -->
            <div class="shape">
                <img class="shape-1" src="{{ asset('assets/frontend/images/shape/shape-6.png') }}" alt="Shape">
                <img class="shape-2" src="{{ asset('assets/frontend/images/shape/shape-7.png') }}" alt="Shape">
                <img class="shape-3" src="{{ asset('assets/frontend/images/shape/shape-3.png') }}" alt="Shape">
                <img class="shape-4" src="{{ asset('assets/frontend/images/shape/shape-4.png') }}" alt="Shape">
                <img class="shape-5" src="{{ asset('assets/frontend/images/shape/shape-5.png') }}" alt="Shape">
                <img class="shape-6" src="{{ asset('assets/frontend/images/shape/shape-11.png') }}" alt="Shape">
            </div>
        </section>
        <!-- Choose End -->
    @endif
    @if ($bs->vcard_section == 1)
        <!-- Vcard Start -->
        <section class="vcard-area bg-primary-light pt-120 pb-80">
            <div class="container">
                <div class="row align-items-center">
                    <div class="col-lg-6">
                        <div class="content-title mb-40 pe-lg-5" data-aos="fade-right">
                            <h2 class="title">
                                {{ $bs->vcard_section_title }}
                            </h2>
                            <p class="text">
                                {{ $bs->vcard_section_subtitle }}
                            </p>
                            <a href="{{ route('front.vcards') }}" class="btn btn-lg btn-primary"
                                title="{{ __('More Templates') }}" target="_self">{{ __('More Templates') }}
                            </a>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="swiper vcard-slider mb-40"
                            @if (count($vcards) < 3) data-slides-per-view="2" @else data-slides-per-view="3" @endif>
                            <div class="swiper-wrapper">
                                @foreach ($vcards as $vcard)
                                    <div class="swiper-slide">
                                        <div class="card text-center">
                                            <div class="card-image">
                                                <div class="lazy-container">
                                                    <img class="lazyload lazy-image"
                                                        data-src="{{ asset('assets/front/img/template-previews/vcard/' . $vcard->template_img) }}"
                                                        alt="{{ $vcard->vcard_name }}" />
                                                </div>
                                                <div class="hover-show">
                                                    <a href="{{ route('front.user.vcard', [$vcard->user->username, $vcard->id]) }}"
                                                        target="_blank" class="btn-icon rounded-circle"
                                                        title="View Details">
                                                        <i class="fal fa-link"></i>
                                                    </a>
                                                </div>
                                            </div>
                                            @php
                                                preg_match('/\d+/', $vcard->template_name, $matches);
                                                $number = $matches[0] ?? '';
                                                $vcardLabel = __('vCard');
                                            @endphp
                                            <h6 class="card-title">
                                                <a href="{{ route('front.user.vcard', [$vcard->user->username, $vcard->id]) }}"
                                                    title="Link" target="_blank">
                                                    {{ $vcardLabel . ' ' . $number }}
                                                </a>
                                            </h6>
                                        </div>
                                    </div>
                                @endforeach
                            </div>
                            <!-- Slider pagination's -->
                            <div class="swiper-pagination position-static vcard-slider-pagination mt-30"></div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Bg Shape -->
            <div class="shape">
                <img class="shape-1" src="{{ asset('assets/frontend/images/shape/shape-1.png') }}" alt="Shape">
                <img class="shape-2" src="{{ asset('assets/frontend/images/shape/shape-3.png') }}" alt="Shape">
                <img class="shape-3" src="{{ asset('assets/frontend/images/shape/shape-6.png') }}" alt="Shape">
                <img class="shape-4" src="{{ asset('assets/frontend/images/shape/shape-4.png') }}" alt="Shape">
                <img class="shape-5" src="{{ asset('assets/frontend/images/shape/shape-11.png') }}" alt="Shape">
                <img class="shape-6" src="{{ asset('assets/frontend/images/shape/shape-10.png') }}" alt="Shape">
            </div>
        </section>
        <!-- Vcard End -->
    @endif
    @if ($bs->pricing_section == 1)
        <!-- Pricing Start -->
        <section class="pricing-area pt-120 pb-90">
            <div class="container">
                <div class="row">
                    <div class="col-12">
                        <div class="section-title title-center mb-50" data-aos="fade-up">
                            <span class="subtitle">{{ $bs->pricing_title }}</span>
                            <h2 class="title mb-2 mt-0">{{ $bs->pricing_subtitle }}</h2>
                            <p class="text">{{ $bs->pricing_text }}</p>
                        </div>
                    </div>
                    <div class="col-12">
                        @if (count($terms) > 1)
                            <div class="nav-tabs-navigation text-center" data-aos="fade-up">
                                <ul class="nav nav-tabs">
                                    @foreach ($terms as $term)
                                        <li class="nav-item">
                                            <button class="nav-link {{ $loop->first ? 'active' : '' }}"
                                                data-bs-toggle="tab" data-bs-target="#{{ strtolower($term) }}"
                                                type="button">{{ __($term) }}</button>
                                        </li>
                                    @endforeach

                                </ul>
                            </div>
                        @endif
                        <div class="tab-content">
                            @foreach ($terms as $term)
                                <div class="tab-pane fade {{ $loop->first ? 'active show' : '' }} "
                                    id="{{ strtolower($term) }}">
                                    <div class="row justify-content-center">
                                        @php
                                            $packages = \App\Models\Package::where('status', '1')
                                                ->where('featured', '1')
                                                ->where('term', strtolower($term))
                                                ->orderBy('serial_number', 'ASC')
                                                ->get();
                                        @endphp
                                        @foreach ($packages as $package)
                                            @php
                                                $pFeatures = json_decode($package->features);
                                                //  AI fields
                                                $aiEngines = !empty($package->ai_engines)
                                                    ? json_decode($package->ai_engines, true)
                                                    : [];
                                                $aiPages = !empty($package->ai_pages)
                                                    ? json_decode($package->ai_pages, true)
                                                    : [];

                                                //  Engine label + paid/free text
                                                $engineMeta = [
                                                    'openai' => [
                                                        'label' => 'OpenAI',
                                                        'type' => 'Paid (API Key required)',
                                                    ],
                                                    'gemini' => [
                                                        'label' => 'Gemini',
                                                        'type' => 'Paid (API Key required)',
                                                    ],
                                                    'pollinations' => [
                                                        'label' => 'Pollinations',
                                                        'type' => 'Free (No API Key needed)',
                                                    ],
                                                ];
                                            @endphp
                                            <div class="col-md-6 col-lg-4">
                                                <div class="card mb-30" data-aos="fade-up" data-aos-delay="100">
                                                    <div class="d-flex align-items-center mb-20">
                                                        <div class="icon"><i class="{{ $package->icon }}"></i></div>
                                                        <div class="label">
                                                            <h4>{{ __($package->title) }}</h4>
                                                        </div>
                                                    </div>
                                                    <div class="d-flex align-items-center">
                                                        <span class="price">
                                                            {{ $package->price != 0 && $be->base_currency_symbol_position == 'left' ? $be->base_currency_symbol : '' }}{{ $package->price == 0 ? __('Free') : $package->price }}{{ $package->price != 0 && $be->base_currency_symbol_position == 'right' ? $be->base_currency_symbol : '' }}
                                                        </span>
                                                        <span class="period">/ @if ($package->term == 'monthly')
                                                                {{ __('month') }}
                                                            @elseif($package->term == 'yearly')
                                                                {{ __('year') }}
                                                            @else
                                                                {{ __($package->term) }}
                                                            @endif
                                                        </span>
                                                    </div>
                                                    <h5>{{ __("What's Included") }}</h5>
                                                    <ul class="pricing-list list-unstyled p-0"
                                                        data-more="{{ __('Show More') }}"
                                                        data-less="{{ __('Show Less') }}">

                                                        {{-- ===================== AI SECTION START ===================== --}}

                                                        @if (is_array($allPfeatures) && in_array('One-Click AI Website Setup', $allPfeatures))
                                                            @php
                                                                $pFeatures = !empty($package->features)
                                                                    ? json_decode($package->features, true)
                                                                    : [];

                                                                // show only if One-Click AI Website Setup feature enabled
                                                                $hasAiFeature =
                                                                    is_array($pFeatures) &&
                                                                    in_array('One-Click AI Website Setup', $pFeatures);

                                                                $aiEngine = $package->ai_engine ?? null;
                                                                $aiGenerateLimit = $package->ai_generate_limit ?? null;

                                                                // pages list
                                                                $aiPages = !empty($package->ai_pages)
                                                                    ? json_decode($package->ai_pages, true)
                                                                    : [];

                                                                $engineMap = [
                                                                    'openai' => 'OpenAI',
                                                                    'gemini' => 'Gemini',
                                                                    'pollinations' => 'Pollinations',
                                                                ];

                                                                $engineName = $aiEngine
                                                                    ? $engineMap[$aiEngine] ?? ucfirst($aiEngine)
                                                                    : null;
                                                            @endphp

                                                            @php
                                                                // ========= Tooltip content build =========
                                                                $aiTooltip = "<div class='ai-tt'>";
                                                                $aiTooltip .=
                                                                    "<div class='ai-tt__title'>" .
                                                                    e(__('One-Click AI Full Site Content')) .
                                                                    '</div>';

                                                                $aiTooltip .=
                                                                    "<div class='ai-tt__desc'>" .
                                                                    e(
                                                                        __(
                                                                            'This package includes AI website page generation features',
                                                                        ),
                                                                    ) .
                                                                    '</div>';

                                                                if (!empty($engineName)) {
                                                                    $aiTooltip .=
                                                                        "<div class='ai-tt__sub'>" .
                                                                        e(__('Engine')) .
                                                                        '</div>';
                                                                    $aiTooltip .=
                                                                        "<div class='ai-tt__pill'>" .
                                                                        e($engineName) .
                                                                        '</div>';
                                                                }

                                                                if (!empty($aiGenerateLimit)) {
                                                                    $aiTooltip .=
                                                                        "<div class='ai-tt__sub'>" .
                                                                        e(
                                                                            __(
                                                                                'AI Website Content Generation Attempts Limit',
                                                                            ),
                                                                        ) .
                                                                        '</div>';

                                                                    if ((int) $aiGenerateLimit === 999999) {
                                                                        $aiTooltip .=
                                                                            "<div class='ai-tt__pill'>" .
                                                                            e(__('Unlimited')) .
                                                                            '</div>';
                                                                    } else {
                                                                        $aiTooltip .=
                                                                            "<div class='ai-tt__pill'>" .
                                                                            e($aiGenerateLimit) .
                                                                            '</div>';
                                                                    }
                                                                }

                                                                if (!empty($aiPages) && is_array($aiPages)) {
                                                                    $aiTooltip .=
                                                                        "<div class='ai-tt__sub'>" .
                                                                        e(__('Included Pages')) .
                                                                        '</div>';
                                                                    $aiTooltip .= "<ul class='ai-tt__pages'>";
                                                                    foreach ($aiPages as $pg) {
                                                                        $aiTooltip .=
                                                                            "<li><i class='fal fa-check'></i><span>" .
                                                                            e(__($pg)) .
                                                                            '</span></li>';
                                                                    }
                                                                    $aiTooltip .= '</ul>';
                                                                } else {
                                                                    $aiTooltip .=
                                                                        "<div class='ai-tt__desc' style='margin-top:8px;opacity:.85'>No AI pages configured.</div>";
                                                                }

                                                                $aiTooltip .= '</div>';
                                                            @endphp
                                                        @endif

                                                        {{-- ===================== AI SECTION END ======================= --}}

                                                        @foreach ($allPfeatures as $feature)
                                                            @continue($feature == 'Additional Language' || $feature == 'One-Click AI Website Setup')
                                                            <li>
                                                                @if (is_array($pFeatures) && in_array($feature, $pFeatures))
                                                                    <i class="fal fa-check"></i>
                                                                @else
                                                                    <i class="fal fa-times"></i>
                                                                @endif

                                                                @if ($feature == 'vCard' && is_array($pFeatures) && in_array($feature, $pFeatures))
                                                                    @if ($package->number_of_vcards == 999999)
                                                                        {{ __('Unlimited') }} {{ __('vCards') }}
                                                                    @elseif(empty($package->number_of_vcards))
                                                                        0 {{ __('vCard') }}
                                                                    @else
                                                                        {{ $package->number_of_vcards }}
                                                                        {{ $package->number_of_vcards > 1 ? __('vCards') : __('vCard') }}
                                                                    @endif
                                                                    @continue
                                                                @elseif($feature == 'vCard' && (is_array($pFeatures) && !in_array($feature, $pFeatures)))
                                                                    {{ __('vCards') }}
                                                                    @continue
                                                                @endif
                                                                {{ __("$feature") }}
                                                                @if ($feature == 'Plugins')
                                                                    ({{ __('Google Analytics, Disqus, WhatsApp, Facebook Pixel, Tawk.to') }})
                                                                @endif
                                                            </li>

                                                            {{-- AI LINE after  Donation Management --}}
                                                            @if (
                                                                $feature === 'Donation Management' &&
                                                                    is_array($allPfeatures) &&
                                                                    in_array('One-Click AI Website Setup', $allPfeatures) &&
                                                                    $hasAiFeature)
                                                                <li class="ai-hover-wrapper"            data-bs-toggle="tooltip"
                                                                    data-bs-placement="top" data-bs-html="true"
                                                                    data-bs-custom-class="ai-tooltip"
                                                                    data-bs-title="{!! $aiTooltip !!}">

                                                                    @if (!empty($aiEngine))
                                                                        <i class="fal fa-check"></i>
                                                                    @else
                                                                        <i class="fal fa-times"></i>
                                                                    @endif

                                                                    <span class="ai-hover-title">
                                                                        <span>{{ __('One-Click AI Full Site Content') }}</span>
                                                                        @if (!empty($engineName))
                                                                            <span
                                                                                class="ai-engine">({{ __($engineName) }})</span>
                                                                        @endif
                                                                        <i class="fal fa-info-circle ai-info"></i>
                                                                    </span>
                                                                </li>
                                                            @endif
                                                        @endforeach

                                                        @if (is_array($allPfeatures) && in_array('Additional Language', $allPfeatures))
                                                            <li>
                                                                @if ($package->number_of_languages == 999999)
                                                                    <i class="fal fa-check"></i>
                                                                    {{ __('Additional Languages') }}
                                                                    ({{ __('Unlimited') }})
                                                                @elseif($package->number_of_languages > 0)
                                                                    <i class="fal fa-check"></i>
                                                                    {{ $package->number_of_languages > 1 ? __('Additional Languages') : __('Additional Language') }}
                                                                    ({{ $package->number_of_languages }})
                                                                @else
                                                                    <i class="fal fa-times"></i>
                                                                    {{ __('Additional Language') }}
                                                                @endif
                                                            </li>
                                                        @endif
                                                    </ul>
                                                    <div class="btn-groups">

                                                        @if ($package->is_trial === '1' && $package->price != 0)
                                                            <a href="{{ route('front.register.view', ['status' => 'trial', 'id' => $package->id]) }}"
                                                                class="btn btn-lg btn-primary no-animation"
                                                                target="_self">{{ __('Trial') }}</a>
                                                        @endif
                                                        @if ($package->price == 0)
                                                            <a href="{{ route('front.register.view', ['status' => 'regular', 'id' => $package->id]) }}"
                                                                target="_self"
                                                                class="btn btn-lg btn-outline no-animation">{{ __('Signup') }}</a>
                                                        @else
                                                            <a href="{{ route('front.register.view', ['status' => 'regular', 'id' => $package->id]) }}"
                                                                target="_self"
                                                                class="btn btn-lg btn-outline no-animation">{{ __('Purchase') }}</a>
                                                        @endif
                                                    </div>
                                                </div>
                                            </div>
                                        @endforeach
                                    </div>
                                </div>
                            @endforeach
                        </div>
                    </div>
                </div>
            </div>
            <!-- Bg Shape -->
            <div class="shape">
                <img class="shape-1" src="{{ asset('assets/frontend/images/shape/shape-6.png') }}" alt="Shape">
                <img class="shape-2" src="{{ asset('assets/frontend/images/shape/shape-7.png') }}" alt="Shape">
                <img class="shape-3" src="{{ asset('assets/frontend/images/shape/shape-1.png') }}" alt="Shape">
                <img class="shape-4" src="{{ asset('assets/frontend/images/shape/shape-4.png') }}" alt="Shape">
                <img class="shape-5" src="{{ asset('assets/frontend/images/shape/shape-3.png') }}" alt="Shape">
                <img class="shape-6" src="{{ asset('assets/frontend/images/shape/shape-9.png') }}" alt="Shape">
            </div>
        </section>
        <!-- Pricing End -->
    @endif
    @if ($bs->featured_users_section == 1)
        <!-- User Profile Start -->
        <section class="user-profile-area pb-120">
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-12">
                        <div class="section-title title-inline mb-50" data-aos="fade-up">

                            @if (!empty($bs->featured_users_subtitle))
                                <h2 class="title mt-0">{{ $bs->featured_users_subtitle }}</h2>
                            @endif
                            <!-- Slider navigation buttons -->
                            <div class="slider-navigation">
                                <button type="button" title="Slide prev" class="slider-btn" id="user-slider-prev">
                                    <i class="fal fa-angle-left"></i>
                                </button>
                                <button type="button" title="Slide next" class="slider-btn" id="user-slider-next">
                                    <i class="fal fa-angle-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="swiper user-slider" data-aos="fade-up">
                            <div class="swiper-wrapper">
                                @foreach ($featured_users as $featured_user)
                                    <div class="swiper-slide">
                                        <div class="card text-center">
                                            <div class="icon mx-auto">
                                                <img class="lazyload"
                                                    data-src="{{ isset($featured_user->photo) ? asset('assets/front/img/user/' . $featured_user->photo) : asset('assets/admin/img/propics/blank_user.jpg') }}"
                                                    alt="User">
                                            </div>
                                            <div class="card-content">
                                                <h4 class="card-title">
                                                    {{ $featured_user->first_name . ' ' . $featured_user->last_name }}
                                                </h4>
                                                <div class="social-link">
                                                    @foreach ($featured_user->social_media as $social)
                                                        <a href="{{ $social->url }}" target="_blank"><i
                                                                class="{{ $social->icon }}"></i></a>
                                                    @endforeach

                                                </div>
                                                <div class="btn-groups justify-content-center">
                                                    <a @if ($featured_user->status == 0) title="Account deactivated" @endif
                                                        target="_blank"
                                                        href=" @if ($featured_user->status == 1) {{ detailsUrl($featured_user) }} @else # @endif"
                                                        class="btn btn-sm btn-outline @if ($featured_user->status == 0) cursor-not-allowed @endif">
                                                        {{ __('Website') }}</a>
                                                    @guest
                                                        <a href="{{ route('user.follow', ['id' => $featured_user->id]) }}"
                                                            class="btn btn-sm btn-primary">{{ __('Follow') }}
                                                        </a>
                                                    @endguest

                                                    @if (Auth::guard('web')->check() && Auth::guard('web')->id() != $featured_user->id)
                                                        @if (App\Models\User\Follower::where('follower_id', Auth::id())->where('following_id', $featured_user->id)->count() > 0)
                                                            <a href="{{ route('user.unfollow', Auth::guard('web')->id()) }}"
                                                                class="btn btn-sm btn-primary">{{ __('Unfollow') }}
                                                            </a>
                                                        @else
                                                            <a href="{{ route('user.follow', ['id' => $featured_user->id]) }}"
                                                                class="btn btn-sm btn-primary">{{ __('Follow') }}
                                                            </a>
                                                        @endif
                                                    @endif

                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                @endforeach
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Bg Shape -->
            <div class="shape">
                <img class="shape-1" src="{{ asset('assets/frontend/images/shape/shape-10.png') }}" alt="Shape">
                <img class="shape-2" src="{{ asset('assets/frontend/images/shape/shape-6.png') }}" alt="Shape">
                <img class="shape-3" src="{{ asset('assets/frontend/images/shape/shape-7.png') }}" alt="Shape">
                <img class="shape-4" src="{{ asset('assets/frontend/images/shape/shape-4.png') }}" alt="Shape">
                <img class="shape-5" src="{{ asset('assets/frontend/images/shape/shape-3.png') }}" alt="Shape">
                <img class="shape-6" src="{{ asset('assets/frontend/images/shape/shape-8.png') }}" alt="Shape">
            </div>
        </section>
        <!-- User Profile End -->
    @endif
    @if ($bs->testimonial_section == 1)
        <!-- Testimonial Start -->
        <section class="testimonial-area pb-80">
            <div class="container">
                <div class="row align-items-center gx-xl-5">
                    <div class="col-lg-6">
                        <div class="content mb-30" data-aos="fade-up">
                            <h2 class="title">{{ $bs->testimonial_title }}</h2>
                        </div>
                        <div class="swiper testimonial-slider mb-40" data-aos="fade-up">
                            <div class="swiper-wrapper">
                                @foreach ($testimonials as $testimonial)
                                    <div class="swiper-slide">
                                        <div class="slider-item bg-primary-light">
                                            <div class="ratings justify-content-between size-md">
                                                <div class="rate">
                                                    <div class="rating-icon"
                                                        style="width: {{ $testimonial->rating * 20 }}%!important"></div>
                                                </div>
                                                <span class="ratings-total">
                                                    {{ number_format($testimonial->rating) }}
                                                    @if ($testimonial->rating > 1)
                                                        {{ __('Stars') }}
                                                    @else
                                                        {{ __('Star') }}
                                                    @endif
                                                </span>
                                            </div>
                                            <div class="quote">
                                                <p class="text mb-0">
                                                    {{ $testimonial->comment }}
                                                </p>
                                            </div>
                                            <div class="client flex-wrap">
                                                <div class="client-info d-flex align-items-center">
                                                    <div class="client-img">
                                                        <div class="lazy-container ratio ratio-1-1">
                                                            <img class="lazyload"
                                                                src="{{ asset('assets/frontend/images/placeholder.png') }}"
                                                                data-src="{{ $testimonial->image ? asset('assets/front/img/testimonials/' . $testimonial->image) : asset('assets/front/img/thumb-1.jpg') }}"
                                                                alt="Person Image">
                                                        </div>
                                                    </div>
                                                    <div class="content">
                                                        <h6 class="name">{{ $testimonial->name }}</h6>
                                                        <span class="designation">{{ $testimonial->rank }}</span>
                                                    </div>
                                                </div>
                                                <span class="icon"><i class="fas fa-quote-right"></i></span>
                                            </div>
                                        </div>
                                    </div>
                                @endforeach
                            </div>
                            <div class="swiper-pagination" id="testimonial-slider-pagination" data-min data-max></div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="image mb-40" data-aos="fade-left">
                            <img src="{{ !empty($bs->testimonial_image) ? asset('assets/front/img/testimonials/' . $bs->testimonial_image) : asset('assets/frontend/images/testimonial.png') }}"
                                alt="Image">
                        </div>
                    </div>
                </div>
            </div>
            <!-- Bg Shape -->
            <div class="shape">
                <img class="shape-1" src="{{ asset('assets/frontend/images/shape/shape-8.png') }}" alt="Shape">
                <img class="shape-2" src="{{ asset('assets/frontend/images/shape/shape-3.png') }}" alt="Shape">
                <img class="shape-3" src="{{ asset('assets/frontend/images/shape/shape-4.png') }}" alt="Shape">
                <img class="shape-4" src="{{ asset('assets/frontend/images/shape/shape-7.png') }}" alt="Shape">
                <img class="shape-5" src="{{ asset('assets/frontend/images/shape/shape-6.png') }}" alt="Shape">
                <img class="shape-6" src="{{ asset('assets/frontend/images/shape/shape-10.png') }}" alt="Shape">
            </div>
        </section>
        <!-- Testimonial End -->
    @endif

    @if ($bs->news_section == 1)
        <!-- Blog Start -->
        <section class="blog-area pb-90">
            <div class="container">
                <div class="section-title title-inline mb-50" data-aos="fade-up">
                    <h2 class="title">{{ $bs->blog_title }}</h2>
                    <a href="{{ route('front.blogs') }}" class="btn btn-lg btn-primary" title="View More"
                        target="_self">{{ __('View More') }}</a>
                </div>
                <div class="row">
                    @foreach ($blogs as $blog)
                        <div class="col-md-6 col-lg-4">
                            <article class="card mb-30" data-aos="fade-up" data-aos-delay="100">
                                <div class="card-image">
                                    <a href="{{ route('front.blogdetails', ['id' => $blog->id, 'slug' => $blog->slug]) }}"
                                        class="lazy-container ratio-16-9">
                                        <img class="lazyload lazy-image"
                                            src="{{ asset('assets/frontend/images/placeholder.png') }}"
                                            data-src="{{ asset('assets/front/img/blogs/' . $blog->main_image) }}"
                                            alt="Blog Image">
                                    </a>
                                    <ul class="info-list">
                                        <li><i
                                                class="fal fa-calendar"></i>{{ \Carbon\Carbon::parse($blog->created_at)->format('F j, Y') }}
                                        </li>
                                        <li><a href="{{ route('front.blogs', ['category' => $blog->bcategory->id]) }}">
                                                <i class="fal fa-tag"></i>{{ $blog->bcategory->name }}</a></li>
                                    </ul>
                                </div>
                                <div class="content">
                                    <h5 class="card-title lc-2">
                                        <a
                                            href="{{ route('front.blogdetails', ['id' => $blog->id, 'slug' => $blog->slug]) }}">{{ $blog->title }}
                                        </a>
                                    </h5>
                                    <p class="card-text lc-2">
                                        {!! strlen($blog->content) > 90 ? mb_substr(strip_tags($blog->content), 0, 90, 'UTF-8') . '...' : $blog->content !!}
                                    </p>
                                    <a href="{{ route('front.blogdetails', ['id' => $blog->id, 'slug' => $blog->slug]) }}"
                                        class="card-btn">{{ __('Read More') }}</a>
                                </div>
                            </article>
                        </div>
                    @endforeach
                </div>
            </div>
            <!-- Bg Shape -->
            <div class="shape">
                <img class="shape-1" src="{{ asset('assets/frontend/images/shape/shape-10.png') }}" alt="Shape">
                <img class="shape-2" src="{{ asset('assets/frontend/images/shape/shape-6.png') }}" alt="Shape">
                <img class="shape-3" src="{{ asset('assets/frontend/images/shape/shape-7.png') }}" alt="Shape">
                <img class="shape-4" src="{{ asset('assets/frontend/images/shape/shape-4.png') }}" alt="Shape">
                <img class="shape-5" src="{{ asset('assets/frontend/images/shape/shape-3.png') }}" alt="Shape">
                <img class="shape-6" src="{{ asset('assets/frontend/images/shape/shape-8.png') }}" alt="Shape">
            </div>
        </section>
        <!-- Blog End -->
    @endif
@endsection
