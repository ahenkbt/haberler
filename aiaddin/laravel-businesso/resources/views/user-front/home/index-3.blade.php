@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Home'] ?? 'Home' }}
@endsection

@section('meta-description', !empty($userSeo) ? $userSeo->home_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->home_meta_keywords : '')

@section('content')

  <!--====== Banner Section start ======-->
  <section class="banner-section banner-section-three">
    <div class="banner-slider">
      <div class="single-banner">
        <div class="container-fluid container-1600">
          <div class="row align-items-center">
            <div class="col-md-5">
              <div class="banner-content">
                <span class="promo-text wow fadeInLeft" data-wow-duration="1500ms"
                  data-wow-delay="400ms">{{ $static->title ?? 'Business & Consulting' }}</span>
                <h1 class="wow fadeInLeft" data-wow-duration="1500ms" data-wow-delay="500ms">
                  {{ $static->subtitle ?? 'Perfect Agency For Innovative Business' }}
                </h1>
                @if (!empty($static->btn_url))
                  <ul class="btn-wrap">
                    <li class="wow fadeInUp" data-wow-duration="1500ms" data-wow-delay="600ms">
                      <a href="{{ $static->btn_url }}" target="_blank"
                        class="main-btn">{{ $static->btn_name ?? 'Our Services' }}</a>
                    </li>
                  </ul>
                @endif
              </div>
            </div>
            <div class="col-md-7 d-none d-md-block">
              <div class="banner-img text-right wow fadeInRight" data-wow-duration="1500ms" data-wow-delay="800ms">
                @if (isset($static->img))
                  <img class="lazy" data-src="{{ asset('assets/front/img/hero_static/' . $static->img) }}"
                    alt="Hero Image">
                @else
                  <img class="lazy" data-src="{{ asset('assets/front/img/hero_static/hero_3.png') }}" alt="Hero Image">
                @endif
              </div>
            </div>
          </div>
        </div>
        <div class="banner-shapes">
          <div class="one"></div>
          <div class="two"></div>
          <div class="three"></div>
        </div>
        <div class="banner-line">
          <img class="lazy" data-src="{{ asset('assets/front/user/img/lines/17.png') }}" alt="Image">
        </div>
      </div>
    </div>
  </section>
  <!--====== Banner Section end ======-->

  @if (in_array('Service', $packagePermissions) &&
          isset($home_sections->featured_services_section) &&
          $home_sections->featured_services_section == 1)
    @php
      $isServiceSectionEmpty =
          empty($home_text->service_title) &&
          empty($home_text->service_subtitle) &&
          (empty($services) || count($services) == 0);
    @endphp

    <!--====== Service Section Start ======-->
    <section class="service-section section-gap">
      <div class="container">
        <!-- Section Title -->
        <div class="section-title text-center both-border mb-50">
          @if ($isServiceSectionEmpty)
            <span class="title-tag">Services</span>
            <h2 class="title">This is the Services section</h2>
          @else
            @if (!empty($home_text->service_title))
              <span class="title-tag">{{ $home_text->service_title }}</span>
            @endif
            <h2 class="title">{{ $home_text->service_subtitle ?? null }}</h2>
          @endif
        </div>

        @if (!$isServiceSectionEmpty)
          <!-- Services Boxes -->
          <div class="row service-boxes justify-content-center">
            @foreach ($services as $service)
              <div class="col-lg-3 col-sm-6 col-10 wow fadeInLeft" data-wow-duration="1500ms" data-wow-delay="400ms">
                <div class="service-box-three">
                  <a class="icon"
                    @if ($service->detail_page == 1) href="{{ route('front.user.service.detail', [getParam(), 'slug' => $service->slug, 'id' => $service->id]) }}" @endif>
                    <img class="lazy"
                      data-src="{{ isset($service->image) ? asset('assets/front/img/user/services/' . $service->image) : asset('assets/front/img/profile/service-1.jpg') }}"
                      alt="Icon">
                  </a>
                  <h3>
                    <a
                      @if ($service->detail_page == 1) href="{{ route('front.user.service.detail', [getParam(), 'slug' => $service->slug, 'id' => $service->id]) }}" @endif>{{ $service->name }}</a>
                  </h3>
                  @if ($service->detail_page == 1)
                    <a href="{{ route('front.user.service.detail', [getParam(), 'slug' => $service->slug, 'id' => $service->id]) }}"
                      class="service-link mt-0">
                      <i class="fal fa-long-arrow-right"></i>
                    </a>
                  @endif
                </div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
    </section>
    <!--====== Service Section End ======-->
  @endif

  @if (isset($home_sections->intro_section) && $home_sections->intro_section == 1)
    @php
      $isAboutSectionEmpty =
          empty($home_text->about_title) &&
          empty($home_text->about_subtitle) &&
          empty($home_text->about_content) &&
          empty($home_text->about_button_url) &&
          empty($home_text->about_button_text);

      $aboutImg = $home_text->about_image ?? 'about.jpg';
    @endphp

    <section class="about-section-three section-gap">
      <div class="container">
        <div class="row justify-content-center align-items-center">
          <div class="col-lg-6 col-md-10 order-2 order-lg-1">
            <div class="about-text-three">
              <div class="section-title left-border mb-40">
                @if ($isAboutSectionEmpty)
                  <span class="title-tag">About</span>
                  <h2 class="title">This is the About section</h2>
                @else
                  @isset($home_text->about_title)
                    <span class="title-tag">{{ $home_text->about_title }}</span>
                  @endisset
                  <h2 class="title">
                    {{ !empty($home_text->about_subtitle) ? $home_text->about_subtitle : null }}
                  </h2>
                @endif
              </div>

              @if (!$isAboutSectionEmpty)
                @isset($home_text->about_content)
                  <p class="mb-25">
                    {!! nl2br($home_text->about_content) !!}
                  </p>
                @endisset
                @if (!empty($home_text->about_button_url))
                  <a href="{{ $home_text->about_button_url }}"
                    class="main-btn main-btn-4">{{ $home_text->about_button_text }}</a>
                @endif
              @endif
            </div>
          </div>
          <div class="col-lg-6 col-md-10 order-1 order-lg-2">
            <div class="about-tile-gallery">
              <img data-src="{{ asset('assets/front/img/user/home_settings/' . $aboutImg) }}" alt="Image"
                class="image-one wow fadeInRight lazy" data-wow-duration="1500ms" data-wow-delay="400ms">
            </div>
          </div>
        </div>
      </div>
    </section>
  @endif

  <!--====== About Section end ======-->

  <!--====== Project Section Start ======-->
  @if (in_array('Portfolio', $packagePermissions) &&
          isset($home_sections->portfolio_section) &&
          $home_sections->portfolio_section == 1)
    @php
      $isPortfolioSectionEmpty =
          empty($home_text->portfolio_title) &&
          empty($home_text->portfolio_subtitle) &&
          (empty($portfolios) || count($portfolios) == 0);
    @endphp

    <section class="project-section-two section-gap">
      <div class="container">
        <div class="row">
          <div class="col-12">
            <!-- Section Title -->
            <div class="section-title text-center">
              @if ($isPortfolioSectionEmpty)
                <span class="title-tag">Portfolio</span>
                <h2 class="title">This is the Portfolio section</h2>
              @else
                @isset($home_text->portfolio_title)
                  <span class="title-tag">{{ $home_text->portfolio_title }}</span>
                @endisset
                <h2 class="title">{{ $home_text->portfolio_subtitle ?? null }}</h2>
              @endif
            </div>
          </div>
        </div>

        @if (!$isPortfolioSectionEmpty)
          <!-- Project Boxes -->
          <div class="row project-boxes mt-80 masonary-layout align-items-center">
            @foreach ($portfolios as $portfolio)
              <div class="col-lg-4 col-sm-6 order-2 order-lg-1">
                <div class="project-box wow fadeInLeft" data-wow-duration="1500ms" data-wow-delay="400ms">
                  <a class="project-thumb"
                    href="{{ route('front.user.portfolio.detail', [getParam(), $portfolio->slug, $portfolio->id]) }}">
                    <div class="thumb bg-img-c lazy"
                      data-bg="{{ asset('assets/front/img/user/portfolios/' . $portfolio->image) }}">
                    </div>
                  </a>
                  <div class="project-desc text-center">
                    <h4>
                      <a
                        href="{{ route('front.user.portfolio.detail', [getParam(), $portfolio->slug, $portfolio->id]) }}">
                        {{ strlen($portfolio->title) > 25 ? mb_substr($portfolio->title, 0, 25, 'UTF-8') . '...' : $portfolio->title }}
                      </a>
                    </h4>
                    <p>{{ $portfolio->bcategory->name }}</p>
                    <a href="{{ route('front.user.portfolio.detail', [getParam(), $portfolio->slug, $portfolio->id]) }}"
                      class="project-link">
                      <i class="fal fa-long-arrow-right"></i>
                    </a>
                  </div>
                </div>
              </div>
            @endforeach
          </div>

          <div class="view-more-btn text-center mt-50">
            <a href="{{ route('front.user.portfolios', getParam()) }}"
              class="main-btn main-btn-3">{{ $home_text->view_all_portfolio_text ?? 'View All' }}</a>
          </div>
        @endif
      </div>
    </section>
  @endif

  <!--====== Project Section End ======-->

  <!--====== FAQ Section Start ======-->
  @if (isset($home_sections->faq_section) && $home_sections->faq_section == 1)
    @php
      $faqBg = $home_text->faq_section_image ?? 'faq_bg.png';

      $isFaqSectionEmpty =
          empty($home_text->faq_section_title) &&
          empty($home_text->faq_section_subtitle) &&
          (empty($faqs) || count($faqs) == 0);
    @endphp

    <section class="faq-section section-gap with-illustration with-shape grey-bg">
      <div class="container">
        <div class="row justify-content-lg-end justify-content-center">
          <div class="col-lg-6">
            <img class="lazy" data-src="{{ asset('assets/front/img/user/home_settings/' . $faqBg) }}"
              alt="illustration">
          </div>
          <div class="col-lg-6">
            <div class="faq-content">
              <div class="section-title mb-40 left-border">
                @if ($isFaqSectionEmpty)
                  <span class="title-tag">FAQ</span>
                  <h2 class="title">This is the FAQ section</h2>
                @else
                  @isset($home_text->faq_section_title)
                    <span class="title-tag">{{ $home_text->faq_section_title }}</span>
                  @endisset
                  <h2 class="title">
                    {{ !empty($home_text->faq_section_subtitle) ? $home_text->faq_section_subtitle : null }}
                  </h2>
                @endif
              </div>

              @if (!$isFaqSectionEmpty)
                <!-- FAQ LOOP -->
                <div class="accordion faq-loop" id="faqAccordion">
                  @foreach ($faqs as $key => $faq)
                    <div class="card">
                      <div
                        @if ($key == 0) class="card-header active-header"
                                             @else class="card-header" @endif>
                        <h6 class="collapsed" data-toggle="collapse" data-target="#collapse{{ $faq->id }}">
                          {{ $faq->question }}
                          <span class="icons">
                            @if ($key == 0)
                              <i class="far fa-minus"></i>
                            @else
                              <i class="far fa-plus"></i>
                            @endif
                          </span>
                        </h6>
                      </div>

                      <div id="collapse{{ $faq->id }}" data-parent="#faqAccordion"
                        @if ($key == 0) class="collapse show" @else class="collapse" @endif>
                        <div class="card-body">
                          {{ $faq->answer }}
                        </div>
                      </div>
                    </div>
                  @endforeach
                </div>
                <!-- End Faq LOOP -->
              @endif
            </div>
          </div>
        </div>
      </div>
    </section>
  @endif

  <!--====== FAQ Section End ======-->

  {{-- Work Process and counter section start here --}}
  @if (
      (isset($home_sections->counter_info_section) && $home_sections->counter_info_section == 1) ||
          (isset($home_sections->work_process_section) && $home_sections->work_process_section == 1))
    @php
      // Work Process empty check
      $isWorkProcessEmpty =
          empty($home_text->work_process_section_title) &&
          empty($home_text->work_process_section_subtitle) &&
          empty($home_text->work_process_section_text) &&
          (empty($work_processes) || count($work_processes) == 0);

      // Counter Info empty check
      $isCounterInfoEmpty = empty($counterInformations) || count($counterInformations) == 0;
    @endphp

    <!--====== Fact Section Start ======-->
    <section class="fact-section-three section-gap working-process-section">
      <div class="container">
        <div class="row align-items-center justify-content-center">

          @if (isset($home_sections->work_process_section) && $home_sections->work_process_section == 1)
            <div
              class="{{ isset($home_sections->counter_info_section) && $home_sections->counter_info_section == 1 ? 'col-lg-6' : 'col-12' }} order-lg-1 order-2">
              <div class="process-text">
                <!-- Section Title -->
                <div class="section-title left-border mb-30">
                  @if ($isWorkProcessEmpty)
                    <span class="title-tag">Work Process</span>
                    <h2 class="title">This is the Work Process section</h2>
                  @else
                    @isset($home_text->work_process_section_title)
                      <span class="title-tag">{{ $home_text->work_process_section_title }}</span>
                    @endisset
                    <h2 class="title">{{ $home_text->work_process_section_subtitle ?? null }}</h2>
                  @endif
                </div>

                @if (!$isWorkProcessEmpty)
                  @if (!empty($home_text->work_process_section_text))
                    <p>{!! nl2br($home_text->work_process_section_text) !!}</p>
                  @endif

                  <!-- process-loop -->
                  <div class="process-loop">
                    @foreach ($work_processes as $key => $work_process)
                      <div class="single-process wow fadeInUp" data-wow-duration="1500ms" data-wow-delay="400ms">
                        <div class="icon">
                          <i class="{{ $work_process->icon }}"></i>
                          <span>{{ $key + 1 < 10 ? '0' . ($key + 1) : $key + 1 }}</span>
                        </div>
                        <div class="content">
                          <h4>{{ $work_process->title }}</h4>
                          @if (!empty($work_process->text))
                            <p>{!! nl2br($work_process->text) !!}</p>
                          @endif
                        </div>
                      </div>
                    @endforeach
                  </div>
                @endif
              </div>
            </div>
          @endif

          @if (isset($home_sections->counter_info_section) && $home_sections->counter_info_section == 1)
            <div class="col-lg-6 col-md-10 order-1 order-lg-2">
              @if ($isCounterInfoEmpty)
                <div class="text-center py-5">
                  <h3>This is the Counter Info section</h3>
                </div>
              @else
                <div class="fact-boxes row" id="factIsotpe">
                  @foreach ($counterInformations as $key => $counterInformation)
                    <div class="col-6 col-tiny-12">
                      <div class="fact-box fact-box-three text-center {{ $key > 0 ? 'mt-30' : '' }}">
                        <div class="icon">
                          <i class="{{ $counterInformation->icon }}"></i>
                        </div>
                        <h2 class="counter">{{ $counterInformation->count }}</h2>
                        <p class="title">{{ $counterInformation->title }}</p>
                      </div>
                    </div>
                  @endforeach
                </div>
              @endif
            </div>
          @endif

        </div>
      </div>
    </section>
  @endif

  <!--====== Fact Section End ======-->

  {{-- Team Section start here --}}
  @if (in_array('Team', $packagePermissions) &&
          isset($home_sections->team_members_section) &&
          $home_sections->team_members_section == 1)
    @php
      $isTeamSectionEmpty =
          empty($home_text->team_section_title) &&
          empty($home_text->team_section_subtitle) &&
          (empty($teams) || count($teams) == 0);
    @endphp

    <!--====== Team Section Start ======-->
    <section class="team-section">
      <div class="container-fluid p-70">
        <div class="section-title text-center both-border mb-80">
          @if ($isTeamSectionEmpty)
            <span class="title-tag">Team</span>
            <h2 class="title">This is the Team section</h2>
          @else
            @isset($home_text->team_section_title)
              <span class="title-tag">{{ $home_text->team_section_title }}</span>
            @endisset
            <h2 class="title">{{ $home_text->team_section_subtitle ?? null }}</h2>
          @endif
        </div>

        @if (!$isTeamSectionEmpty)
          <!-- Team Slider -->
          <div class="team-members-two row" id="teamSliderTwo">
            @foreach ($teams as $team)
              <div class="col">
                <div class="team-member">
                  <div class="member-picture">
                    <img src="{{ asset('/assets/front/img/user/team/' . $team->image) }}" alt="TeamMember">
                  </div>
                  <div class="member-desc">
                    <h3 class="name"><a href="javascript:void(0)">{{ convertUtf8($team->name) }}</a></h3>
                    <span class="pro">{{ convertUtf8($team->rank) }}</span>

                    <ul class="social-icons">
                      @isset($team->facebook)
                        <li><a href="{{ $team->facebook }}" target="_blank"><i class="fab fa-facebook-f"></i></a></li>
                      @endisset
                      @isset($team->twitter)
                        <li><a href="{{ $team->twitter }}" target="_blank"><i class="fab fa-twitter"></i></a></li>
                      @endisset
                      @isset($team->instagram)
                        <li><a href="{{ $team->instagram }}" target="_blank"><i class="fab fa-instagram"></i></a></li>
                      @endisset
                      @isset($team->linkedin)
                        <li><a href="{{ $team->linkedin }}" target="_blank"><i class="fab fa-linkedin"></i></a></li>
                      @endisset
                    </ul>
                  </div>
                </div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
    </section>
  @endif

  <!--====== Team Section end ======-->

  <!--====== Why Choose Us Section Start ======-->
  @if (isset($home_sections->why_choose_us_section) && $home_sections->why_choose_us_section == 1)
    @php
      $whyBg = $home_text->why_choose_us_section_image ?? 'why_choose_us_bg.jpg';
      $vidBg = $home_text->why_choose_us_section_video_image ?? 'why_choose_us_video_bg.jpg';

      $isWhyChooseUsEmpty =
          empty($home_text->why_choose_us_section_title) &&
          empty($home_text->why_choose_us_section_subtitle) &&
          empty($home_text->why_choose_us_section_text) &&
          empty($home_text->why_choose_us_section_button_url) &&
          empty($home_text->why_choose_us_section_button_text) &&
          empty($home_text->why_choose_us_section_video_url);
    @endphp

    <section class="wcu-section section-gap">
      <div class="container">
        <div class="row align-items-center justify-content-center">
          <div class="col-lg-6 col-md-10">
            <div class="wcu-video wow fadeInLeft" data-wow-duration="1500ms" data-wow-delay="400ms">
              <div class="video-poster-one bg-img-c"
                style="background-image: url({{ asset('assets/front/img/user/home_settings/' . $whyBg) }});">
              </div>
              <div class="video-poster-two bg-img-c lazy"
                data-bg="{{ asset('assets/front/img/user/home_settings/' . $vidBg) }}">
                @if (!$isWhyChooseUsEmpty && !empty($home_text->why_choose_us_section_video_url))
                  <a href="{{ $home_text->why_choose_us_section_video_url }}" class="popup-video">
                    <i class="fas fa-play"></i>
                  </a>
                @endif
              </div>
            </div>
          </div>
          <div class="col-lg-6 col-md-10">
            <div class="wcu-text-two">
              <div class="section-title left-border mb-40">
                @if ($isWhyChooseUsEmpty)
                  <span class="title-tag">Why Choose Us</span>
                  <h2 class="title">This is the Why Choose Us section</h2>
                @else
                  @isset($home_text->why_choose_us_section_title)
                    <span class="title-tag">{{ $home_text->why_choose_us_section_title }}</span>
                  @endisset
                  <h2 class="title">{{ $home_text->why_choose_us_section_subtitle ?? null }}</h2>
                @endif
              </div>

              @if (!$isWhyChooseUsEmpty)
                @isset($home_text->why_choose_us_section_text)
                  <p class="mb-4">
                    {!! nl2br($home_text->why_choose_us_section_text) !!}
                  </p>
                @endisset
                @isset($home_text->why_choose_us_section_button_url)
                  <a href="{{ $home_text->why_choose_us_section_button_url }}" class="main-btn"
                    target="_blank">{{ $home_text->why_choose_us_section_button_text }}</a>
                @endisset
              @endif
            </div>
          </div>
        </div>
      </div>
    </section>
  @endif

  <!--====== Why Choose Us Section End ======-->

  <!--====== CTA Start ======-->
  @if (in_array('Request a Quote', $packagePermissions))
    @if ($userBs->is_quote)
      @php
        $isQuoteSectionEmpty = empty($home_text->quote_section_title) && empty($home_text->quote_section_subtitle);
      @endphp

      <section class="cta-aection section-gap-bottom">
        <div class="container">
          <div class="cta-wrap bg-img-c lazy"
            data-bg="{{ asset('assets/front/img/user/home_settings/quote_bg.png') }}">
            <div class="row justify-content-center">
              <div class="col-lg-8">
                <div class="cta-content text-center">
                  <div class="section-title both-border mb-30">
                    @if ($isQuoteSectionEmpty)
                      <span class="title-tag">Quote</span>
                      <h2 class="title">This is the Quote section</h2>
                    @else
                      @isset($home_text->quote_section_title)
                        <span class="title-tag">{{ $home_text->quote_section_title }}</span>
                      @endisset
                      <h2 class="title">
                        {{ !empty($home_text->quote_section_subtitle) ? $home_text->quote_section_subtitle : null }}
                      </h2>
                    @endif
                  </div>
                  <a href="{{ route('front.user.quote', getParam()) }}"
                    class="main-btn main-btn-3">{{ $keywords['Request_A_Quote'] ?? 'Request A Quote' }}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    @endif
  @endif


  <!--====== CTA Start ======-->

  <!--====== Testimonials Section start ======-->
  @if (isset($home_sections->testimonials_section) && $home_sections->testimonials_section == 1)
    @php
      $tstmBg = $home_text->testimonial_image ?? 'testimonial_bg_3.jpg';
      $isTestimonialSectionEmpty = empty($testimonials) || count($testimonials) == 0;
    @endphp

    <section class="testimonial-section-three bg-img-c lazy"
      data-bg="{{ asset('assets/front/img/user/home_settings/' . $tstmBg) }}">
      <div class="container">
        <div class="row justify-content-center no-gutters">
          <div class="col-lg-10">
            @if ($isTestimonialSectionEmpty)
              <div class="text-center py-5" style="color: white;">
                <h3 class="text-white">This is the Testimonial section</h3>
              </div>
            @else
              <div class="testimonial-items" id="testimonialSliderThree">
                @foreach ($testimonials as $testimonial)
                  <div class="testimonial-item text-center">
                    <div class="author-thumb">
                      <img src="{{ asset('assets/front/img/user/testimonials/' . $testimonial->image) }}"
                        alt="image">
                    </div>

                    <div class="content">
                      <p>
                        <span class="quote-top">
                          <i class="fal fa-quote-left"></i>
                        </span>
                        {{ replaceBaseUrl($testimonial->content) }}
                        <span class="quote-bottom">
                          <i class="fal fa-quote-right"></i>
                        </span>
                      </p>
                    </div>

                    <div class="author">
                      <h4>{{ convertUtf8($testimonial->name) }}</h4>
                      <span>{{ convertUtf8($testimonial->occupation) ?? null }}</span>
                    </div>
                  </div>
                @endforeach
              </div>
            @endif
          </div>
        </div>
      </div>
    </section>
  @endif

  <!--====== Testimonials Section end ======-->

  <!--====== Contact Section start ======-->
  @if (isset($home_sections->contact_section) && $home_sections->contact_section == 1)
    <section class="contact-section boxed-style-with-map">
      <div class="container">
        <div class="contact-inner mt-negative grey-bg">
          <div class="row no-gutters">
            <div class="col-lg-6">
              <div class="contact-map">
                <iframe class="border-0"
                  src="//www.google.com/maps?width=100%25&amp;height=600&amp;hl=en&amp;q={{ $contact->latitude ?? '36.7783' }},%20{{ $contact->longitude ?? '119.4179' }}+(My%20Business%20Name)&amp;t=&amp;z={{ $contact->map_zoom ?? 12 }}&amp;ie=UTF8&amp;iwloc=B&amp;output=embed"
                  allowfullscreen="" aria-hidden="false" tabindex="0"></iframe>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="contact-form">
                <div class="section-title left-border mb-30">
                  @isset($contact->contact_form_title)
                    <span class="title-tag">{{ $contact->contact_form_title }}</span>
                  @endisset
                  <h2 class="title">{{ $contact->contact_form_subtitle ?? null }}</h2>
                </div>

                <form action="{{ route('front.contact.message', getParam()) }}" method="POST"
                  enctype="multipart/form-data">
                  @csrf
                  <div class="row">
                    <div class="col-12">
                      <div class="input-group mb-30">
                        <input type="text" placeholder="{{ $keywords['Name'] ?? 'Name' }}" name="fullname"
                          value="{{ old('fullname') }}" required>
                        <span class="icon"><i class="far fa-user-circle"></i></span>
                        @error('fullname')
                          <p class="mb-0 ml-3 text-danger">{{ $message }}</p>
                        @enderror
                      </div>
                    </div>
                    <input type="hidden" name="id" value="{{ $user->id }}">
                    <div class="col-12">
                      <div class="input-group mb-30">
                        <input type="email" placeholder="{{ $keywords['Email_Address'] ?? 'Email Address' }}"
                          name="email" value="{{ old('email') }}" required>
                        <span class="icon"><i class="far fa-envelope-open"></i></span>
                        @error('email')
                          <p class="mb-0 ml-3 text-danger">{{ $message }}</p>
                        @enderror
                      </div>
                    </div>
                    <div class="col-12">
                      <div class="input-group select mb-30">
                        <input type="text" placeholder="{{ $keywords['Subject'] ?? 'Subject' }}" name="subject"
                          value="{{ old('subject') }}" required>
                        <span class="icon"><i class="far fa-envelope"></i></span>
                        @error('subject')
                          <p class="mb-0 ml-3 text-danger">{{ $message }}</p>
                        @enderror
                      </div>
                    </div>
                    <div class="col-12">
                      <div class="input-group textarea mb-30">
                        <textarea placeholder="{{ $keywords['Message'] ?? 'Message' }}" name="message" required>{{ old('message') }}</textarea>
                        <span class="icon"><i class="far fa-pencil"></i></span>
                        @error('message')
                          <p class="mb-0 ml-3 text-danger">{{ $message }}</p>
                        @enderror
                      </div>
                    </div>
                    <div class="col-12">
                      <button type="submit" class="main-btn">
                        {{ $keywords['Send_Message'] ?? 'Send Message' }}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  @endif

  <!--====== Contact Section start ======-->

  <!--====== Client Area Start ======-->
  @if (isset($home_sections->brand_section) && $home_sections->brand_section == 1)
    @php
      $isBrandSectionEmpty = empty($brands) || count($brands) == 0;
    @endphp

    <section class="client-section">
      <div class="container">
        <div class="client-slider section-gap">
          @if ($isBrandSectionEmpty)
            <div class="row align-items-center justify-content-center">
              <div class="col-12 text-center">
                <h3>This is the Brand section</h3>
              </div>
            </div>
          @else
            <div class="row align-items-center justify-content-between" id="clientSlider">
              @foreach ($brands as $brand)
                <div class="col">
                  <a href="{{ $brand->brand_url }}" class="client-img d-block text-center" target="_blank">
                    <img class="lazy" data-src="{{ asset('assets/front/img/user/brands/' . $brand->brand_img) }}"
                      alt="">
                  </a>
                </div>
              @endforeach
            </div>
          @endif
        </div>
      </div>
    </section>
  @endif

  <!--====== Client Area End ======-->
@endsection
