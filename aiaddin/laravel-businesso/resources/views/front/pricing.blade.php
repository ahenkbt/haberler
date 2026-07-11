@extends('front.layout')

@section('pagename')
    - {{ __('Pricing') }}
@endsection

@section('meta-description', !empty($seo) ? $seo->pricing_meta_description : '')
@section('meta-keywords', !empty($seo) ? $seo->pricing_meta_keywords : '')

@section('breadcrumb-title')
    {{ __('Pricing') }}
@endsection
@section('breadcrumb-link')
    {{ __('Pricing') }}
@endsection

@section('content')

    <!--====== Start saas-pricing section ======-->
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
                                        <button class="nav-link {{ $loop->first ? 'active' : '' }}" data-bs-toggle="tab"
                                            data-bs-target="#{{ strtolower($term) }}"
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
                                                    data-more="{{ __('Show More') }}" data-less="{{ __('Show Less') }}">

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
                                                            <li class="ai-hover-wrapper" data-bs-toggle="tooltip"
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
                                                                {{ __('Additional Languages') }} ({{ __('Unlimited') }})
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
    <!--====== End saas-pricing section ======-->
@endsection
