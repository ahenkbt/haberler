@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Home'] ?? 'Home' }}
@endsection
@php
  Config::set('app.timezone', $userBs->timezoneinfo->timezone);
@endphp
@section('meta-description', !empty($userSeo) ? $userSeo->home_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->home_meta_keywords : '')

@section('content')

  <!--====== Banner part start ======-->
  <section class="banner-section">
    <div class="banner-slider" id="bannerSlider">
      @if (count($sliders) > 0)
        @foreach ($sliders as $slider)
          <div>
            <div class="single-banner lazy" data-bg="{{ asset('assets/front/img/hero_slider/' . $slider->img) }}">
              <div class="container">
                <div class="row">
                  <div class="col-lg-10">
                    <div class="banner-content">
                      <span class="promo-text" data-animation="fadeInDown" data-delay="0.8s">
                        {{ $slider->title }}
                      </span>
                      <h1 data-animation="fadeInUp" data-delay="1s">
                        {{ $slider->subtitle }}
                      </h1>
                      @if (!empty($slider->btn_url))
                        <ul class="btn-wrap">
                          <li data-animation="fadeInLeft" data-delay="1.2s">
                            <a href="{{ $slider->btn_url }}" class="main-btn main-btn-4">{{ $slider->btn_name }}</a>
                          </li>
                        </ul>
                      @endif
                    </div>
                  </div>
                </div>
              </div>
              <div class="banner-shapes">
                <div class="one"></div>
                <div class="two"></div>
                <div class="three"></div>
                <div class="four"></div>
              </div>
            </div>
          </div>
        @endforeach
      @else
        <div class="single-banner lazy" data-bg="{{ asset('assets/front/img/hero_slider/hero_bg.jpg') }}">
          <div class="container">
            <div class="row">
              <div class="col-lg-10">
                <div class="banner-content">
                  <span class="promo-text" data-animation="fadeInDown" data-delay="0.8s">
                    business & consulting
                  </span>
                  <h1 data-animation="fadeInUp" data-delay="1s">
                    Making Difference, Grow Your Business With Modern Ideas
                  </h1>
                  <ul class="btn-wrap">
                    <li data-animation="fadeInLeft" data-delay="1.2s">
                      <a href="#" class="main-btn main-btn-4">Our Services</a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div class="banner-shapes">
            <div class="one"></div>
            <div class="two"></div>
            <div class="three"></div>
            <div class="four"></div>
          </div>
        </div>
    </div>
    @endif
    </div>
  </section>
  <!--====== Banner part end ======-->



  <!--====== About Section start ======-->
  {{-- @if (isset($home_sections->intro_section) && $home_sections->intro_section == 1)
        <section class="about-section about-illustration-img section-gap">
            <div class="container">
                @php
                    $aboutImg = $home_text->about_image ?? 'about.png';
                @endphp
                <div class="row no-gutters justify-content-lg-end justify-content-center align-items-center">
                    <div class="col-lg-6">
                        <img class="lazy" data-src="{{ asset('assets/front/img/user/home_settings/' . $aboutImg) }}"
                            alt="Image">
                    </div>
                    <div class="col-lg-6">
                        <div class="about-text">
                            <div class="section-title left-border mb-40">
                                @if (!empty($home_text->about_title))
                                    <span class="title-tag">{{ $home_text->about_title }}</span>
                                @endif
                                <h2 class="title">{{ $home_text->about_subtitle ?? null }}</h2>
                            </div>
                            @if (!empty($home_text->about_content))
                            <p class="mb-25">
                                {!! nl2br($home_text->about_content) ?? null !!}
                            </p>
                            @endif
                            @if (!empty($home_text->about_button_url))
                            <a href="{{$home_text->about_button_url}}" class="main-btn">{{$home_text->about_button_text}}</a>
                            @endif
                        </div>
                    </div>
                </div>
            </div>
        </section>
    @endif --}}
  @if (isset($home_sections->intro_section) && $home_sections->intro_section == 1)
    <section class="about-section about-illustration-img section-gap">
      <div class="container">
        @php
          $aboutImg = $home_text->about_image ?? 'about.png';
          $isAboutEmpty =
              empty($home_text->about_title) &&
              empty($home_text->about_subtitle) &&
              empty($home_text->about_content) &&
              empty($home_text->about_button_url) &&
              empty($home_text->about_button_text);
        @endphp
        <div class="row no-gutters justify-content-lg-end justify-content-center align-items-center">
          <div class="col-lg-6">
            <img class="lazy" data-src="{{ asset('assets/front/img/user/home_settings/' . $aboutImg) }}" alt="Image">
          </div>
          <div class="col-lg-6">
            <div class="about-text">
              @if ($isAboutEmpty)
                <div class="section-title left-border mb-40">
                  <span class="title-tag">About</span>
                  <h2 class="title">This is the About section</h2>
                </div>
              @else
                <div class="section-title left-border mb-40">
                  @if (!empty($home_text->about_title))
                    <span class="title-tag">{{ $home_text->about_title }}</span>
                  @endif
                  <h2 class="title">{{ $home_text->about_subtitle ?? null }}</h2>
                </div>
                @if (!empty($home_text->about_content))
                  <p class="mb-25">
                    {!! nl2br($home_text->about_content) ?? null !!}
                  </p>
                @endif
                @if (!empty($home_text->about_button_url))
                  <a href="{{ $home_text->about_button_url }}" class="main-btn">{{ $home_text->about_button_text }}</a>
                @endif
              @endif
            </div>
          </div>
        </div>
      </div>
    </section>
  @endif

  <!--====== About Section end ======-->

  {{-- @if (in_array('Service', $packagePermissions) && isset($home_sections->featured_services_section) && $home_sections->featured_services_section == 1)
        <!--====== Service Part Start ======-->
        <section class="service-section shape-style-one section-gap grey-bg">
            <div class="container">
                <!-- Section Title -->
                <div class="section-title text-center both-border mb-30">
                    @if (!empty($home_text->service_title))
                        <span class="title-tag">{{ $home_text->service_title }}</span>
                    @endif
                    <h2 class="title">{{ $home_text->service_subtitle ?? null }}</h2>
                </div>
                <!-- Services Boxes -->
                <div class="row service-boxes justify-content-center">
                    @foreach ($services as $service)
                        <div class="col-lg-4 col-md-6 col-sm-8 col-10 col-tiny-12 wow fadeInLeft" data-wow-duration="1500ms"
                            data-wow-delay="400ms">
                            <div class="service-box text-center">
                                <a class="icon"
                                @if ($service->detail_page == 1)
                                href="{{route('front.user.service.detail',[getParam(),'slug' => $service->slug,'id' => $service->id])}}"
                                @endif>
                                    <img class="lazy" data-src="{{isset($service->image) ? asset('assets/front/img/user/services/'.$service->image) : asset('assets/front/img/profile/service-1.jpg')}}" alt="Icon">
                                </a>
                                <h3>
                                    <a
                                        @if ($service->detail_page == 1) href="{{ route('front.user.service.detail', [getParam(), 'slug' => $service->slug, 'id' => $service->id]) }}" @endif>{{ $service->name }}</a>
                                </h3>
                                <p>{!! strlen(strip_tags($service->content)) > 80
                                    ? mb_substr(strip_tags($service->content), 0, 80, 'UTF-8') . '...'
                                    : strip_tags($service->content) !!}</p>
                                @if ($service->detail_page == 1)
                                    <a href="{{ route('front.user.service.detail', [getParam(), 'slug' => $service->slug, 'id' => $service->id]) }}"
                                        class="service-link">
                                        <i class="fal fa-long-arrow-right"></i>
                                    </a>
                                @endif
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>
            <div class="dots-line">
                <img src="{{ asset('assets/front/user/img/lines/07.png') }}" alt="Image">
            </div>
        </section>
        <!--====== Service Part End ======-->
    @endif --}}
  @if (in_array('Service', $packagePermissions) &&
          isset($home_sections->featured_services_section) &&
          $home_sections->featured_services_section == 1)
    <!--====== Service Part Start ======-->
    <section class="service-section shape-style-one section-gap grey-bg">
      <div class="container">
        @php
          $isServiceSectionEmpty =
              empty($home_text->service_title) &&
              empty($home_text->service_subtitle) &&
              (empty($services) || count($services) == 0);
        @endphp

        @if ($isServiceSectionEmpty)
          <!-- Placeholder Title -->
          <div class="section-title text-center both-border mb-30">
            <span class="title-tag">Services</span>
            <h2 class="title">This is the Services section</h2>
          </div>
          <div class="row service-boxes justify-content-center">
          </div>
        @else
          <!-- Section Title -->
          <div class="section-title text-center both-border mb-30">
            @if (!empty($home_text->service_title))
              <span class="title-tag">{{ $home_text->service_title }}</span>
            @endif
            <h2 class="title">{{ $home_text->service_subtitle ?? null }}</h2>
          </div>
          <!-- Services Boxes -->
          <div class="row service-boxes justify-content-center">
            @foreach ($services as $service)
              <div class="col-lg-4 col-md-6 col-sm-8 col-10 col-tiny-12 wow fadeInLeft" data-wow-duration="1500ms"
                data-wow-delay="400ms">
                <div class="service-box text-center">
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
                  <p>{!! strlen(strip_tags($service->content)) > 80
                      ? mb_substr(strip_tags($service->content), 0, 80, 'UTF-8') . '...'
                      : strip_tags($service->content) !!}</p>
                  @if ($service->detail_page == 1)
                    <a href="{{ route('front.user.service.detail', [getParam(), 'slug' => $service->slug, 'id' => $service->id]) }}"
                      class="service-link">
                      <i class="fal fa-long-arrow-right"></i>
                    </a>
                  @endif
                </div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
      <div class="dots-line">
        <img src="{{ asset('assets/front/user/img/lines/07.png') }}" alt="Image">
      </div>
    </section>
    <!--====== Service Part End ======-->
  @endif

  @if (isset($home_sections->video_section) && $home_sections->video_section == 1)
    @php
      $videoBg = $videoSectionDetails->video_section_image ?? 'video_bg_one.jpg';

      $isVideoSectionEmpty =
          empty($videoSectionDetails->video_section_title) &&
          empty($videoSectionDetails->video_section_subtitle) &&
          empty($videoSectionDetails->video_section_text) &&
          empty($videoSectionDetails->video_section_button_url) &&
          empty($videoSectionDetails->video_section_button_text) &&
          empty($home_text->video_section_url);
    @endphp

    <section class="video-section bg-img-c section-gap lazy"
      data-bg="{{ asset('assets/front/img/user/home_settings/' . $videoBg) }}">
      <div class="container">
        <div class="row align-items-center justify-content-between">
          <div class="col-xl-7 col-lg-8 col-md-10 order-2 order-md-1">
            <div class="video-text">
              <div class="section-title left-border mb-30">
                @if ($isVideoSectionEmpty)
                  <span class="title-tag">Video</span>
                  <h2 class="title">This is the Video section</h2>
                @else
                  @if (!empty($videoSectionDetails->video_section_title))
                    <span class="title-tag">{{ $videoSectionDetails->video_section_title }}</span>
                  @endif
                  <h2 class="title">
                    {{ $videoSectionDetails->video_section_subtitle ?? null }}
                  </h2>
                @endif
              </div>

              @if (!$isVideoSectionEmpty)
                @if (!empty($videoSectionDetails->video_section_text))
                  <p>
                    {!! nl2br($videoSectionDetails->video_section_text) !!}
                  </p>
                @endif
                @if (!empty($videoSectionDetails->video_section_button_url))
                  <a href="{{ $videoSectionDetails->video_section_button_url }}"
                    class="main-btn">{{ $videoSectionDetails->video_section_button_text }}</a>
                @endif
              @endif
            </div>

          </div>
          <div class="col-lg-3 col-lg-4 col-md-2 order-1 order-md-2">
            <div class="video-btn text-md-center wow fadeInUp" data-wow-duration="1500ms" data-wow-delay="400ms">
              @if ($isVideoSectionEmpty)
                <!-- No video button shown -->
              @else
                @if (!empty($home_text->video_section_url))
                  <a href="{{ $home_text->video_section_url }}" class="play-btn popup-video">
                    <img src="{{ asset('assets/front/user/img/icons/play.svg') }}" alt="">
                    <i class="fas fa-play"></i>
                  </a>
                @endif
              @endif
            </div>
          </div>
        </div>
      </div>
      <div class="line-shape">
        <img src="{{ asset('assets/front/user/img/lines/08.png') }}" alt="Line">
      </div>
    </section>
  @endif

  <!--====== Video end ======-->

  @if (in_array('Portfolio', $packagePermissions) &&
          isset($home_sections->portfolio_section) &&
          $home_sections->portfolio_section == 1)
    <!--====== Portfolio Part start ======-->
    <section class="feature-section section-gap">
      <div class="container">
        @php
          $isPortfolioSectionEmpty =
              empty($home_text->portfolio_title) &&
              empty($home_text->portfolio_subtitle) &&
              (empty($portfolios) || count($portfolios) == 0);
        @endphp

        <div class="section-title text-center both-border mb-50">
          @if ($isPortfolioSectionEmpty)
            <span class="title-tag">Portfolio</span>
            <h2 class="title">This is the Portfolio section</h2>
          @else
            @if (!empty($home_text->portfolio_title))
              <span class="title-tag"> {{ $home_text->portfolio_title }} </span>
            @endif
            <h2 class="title">{{ $home_text->portfolio_subtitle ?? null }}</h2>
          @endif
        </div>

        @if (!$isPortfolioSectionEmpty)
          <!-- Feature boxes -->
          <div class="feature-boxes row justify-content-center">
            @foreach ($portfolios as $portfolio)
              <div class="col-lg-4 col-md-6 col-10 col-tiny-12">
                <div class="feature-box">
                  <a href="{{ route('front.user.portfolio.detail', [getParam(), $portfolio->slug, $portfolio->id]) }}"
                    class="feature-bg bg-img-c lazy"
                    data-bg="{{ asset('assets/front/img/user/portfolios/' . $portfolio->image) }}">
                  </a>
                  <div class="feature-desc">
                    <a href="{{ route('front.user.portfolio.detail', [getParam(), $portfolio->slug, $portfolio->id]) }}"
                      class="feature-link"><i class="fal fa-long-arrow-right"></i></a>
                    <a href="{{ route('front.user.portfolio.detail', [getParam(), $portfolio->slug, $portfolio->id]) }}"
                      class="feature-link d-block mb-0">
                      <h4>
                        {{ strlen($portfolio->title) > 25 ? mb_substr($portfolio->title, 0, 25, 'UTF-8') . '...' : $portfolio->title }}
                      </h4>
                    </a>

                    <p>{{ $portfolio->bcategory->name }}</p>
                  </div>
                </div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
    </section>
    <!--====== Portfolio Part end ======-->
  @endif

  @if (isset($home_sections->why_choose_us_section) && $home_sections->why_choose_us_section == 1)
    @php
      $whyChooseImg = $home_text->why_choose_us_section_image ?? 'why_choose_us.png';

      $isWhyChooseUsEmpty =
          empty($home_text->why_choose_us_section_title) &&
          empty($home_text->why_choose_us_section_subtitle) &&
          empty($home_text->why_choose_us_section_text) &&
          empty($home_text->why_choose_us_section_button_url) &&
          empty($home_text->why_choose_us_section_button_text);
    @endphp

    <section class="wcu-section box-style">
      <div class="container">
        <div class="wcu-inner">
          <div class="row align-items-center justify-content-center">
            <div class="col-lg-6">
              <div class="wcu-image text-center text-lg-left wow fadeInUp" data-wow-duration="1500ms"
                data-wow-delay="400ms">
                <img data-src="{{ asset('assets/front/img/user/home_settings/' . $whyChooseImg) }}" alt="Image"
                  class="lazy">
              </div>
            </div>
            <div class="col-lg-6 col-md-10">
              <div class="wcu-text">
                <div class="section-title left-border mb-40">
                  @if ($isWhyChooseUsEmpty)
                    <span class="title-tag">Why Choose Us</span>
                    <h2 class="title">This is the Why Choose Us section</h2>
                  @else
                    @if (!empty($home_text->why_choose_us_section_title))
                      <span class="title-tag">{{ $home_text->why_choose_us_section_title }}</span>
                    @endif
                    <h2 class="title">{{ $home_text->why_choose_us_section_subtitle ?? null }}</h2>
                  @endif
                </div>

                @if (!$isWhyChooseUsEmpty)
                  @if (!empty($home_text->why_choose_us_section_text))
                    <p class="mb-4">
                      {!! nl2br($home_text->why_choose_us_section_text) !!}
                    </p>
                  @endif
                  @if (!empty($home_text->why_choose_us_section_button_url))
                    <a href="{{ $home_text->why_choose_us_section_button_url }}" class="main-btn main-btn-4"
                      target="_blank">{{ $home_text->why_choose_us_section_button_text }}</a>
                  @endif
                @endif
              </div>
            </div>
          </div>
          <img data-src="{{ asset('assets/front/user/img/lines/03.png') }}" alt="shape"
            class="line-shape-one lazy">
          <img data-src="{{ asset('assets/front/user/img/lines/04.png') }}" alt="shape"
            class="line-shape-two lazy">
        </div>
      </div>
    </section>
  @endif

  <!--====== Why Choose Us Part End ======-->

  <!--====== Fact Part Start ======-->
  @if (isset($home_sections->counter_info_section) && $home_sections->counter_info_section == 1)
    @php
      $isCounterInfoEmpty = empty($counterInformations) || count($counterInformations) == 0;
    @endphp

    <section class="fact-section grey-bg">
      <div class="container">
        @if ($isCounterInfoEmpty)
          <div class="text-center py-5">
            <h3>This is the Counter Info section</h3>
          </div>
        @else
          <div class="fact-boxes row justify-content-between align-items-center">
            @foreach ($counterInformations as $counterInformation)
              <div class="col-lg-3 col-6">
                <div class="fact-box text-center mb-40">
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
    </section>
  @endif

  <!--====== Fact Part End ======-->

  <!--====== Team Section Start ======-->

  @if (in_array('Team', $packagePermissions) &&
          isset($home_sections->team_members_section) &&
          $home_sections->team_members_section == 1)
    @php
      $isTeamSectionEmpty =
          empty($home_text->team_section_title) &&
          empty($home_text->team_section_subtitle) &&
          (empty($teams) || count($teams) == 0);
    @endphp

    <section class="team-section section-gap">
      <div class="container">
        <!-- Section Title -->
        <div class="section-title mb-40 both-border text-center">
          @if ($isTeamSectionEmpty)
            <span class="title-tag">Team</span>
            <h2 class="title">This is the Team section</h2>
          @else
            @if (!empty($home_text->team_section_title))
              <span class="title-tag">{{ $home_text->team_section_title }}</span>
            @endif
            <h2 class="title">{{ $home_text->team_section_subtitle ?? null }}</h2>
          @endif
        </div>

        @if (!$isTeamSectionEmpty)
          <!-- Team Boxes -->
          <div class="team-members" id="teamSliderOne">
            @foreach ($teams as $team)
              <div class="team-member">
                <div class="member-picture-wrap">
                  <div class="member-picture">
                    <img src="{{ asset('/assets/front/img/user/team/' . $team->image) }}" alt="TeamMember">
                    <div class="social-icons">
                      @isset($team->facebook)
                        <a href="{{ $team->facebook }}">
                          <i class="fab fa-facebook-f"></i>
                        </a>
                      @endisset
                      @isset($team->twitter)
                        <a href="{{ $team->twitter }}">
                          <i class="fab fa-twitter"></i>
                        </a>
                      @endisset
                      @isset($team->instagram)
                        <a href="{{ $team->instagram }}">
                          <i class="fab fa-instagram"></i>
                        </a>
                      @endisset
                      @isset($team->linkedin)
                        <a href="{{ $team->linkedin }}">
                          <i class="fab fa-linkedin"></i>
                        </a>
                      @endisset
                    </div>
                  </div>
                </div>
                <div class="member-desc">
                  <h3 class="name"><a href="javascript:void(0)">{{ $team->name }}</a></h3>
                  <span class="pro">{{ $team->rank }}</span>
                </div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
    </section>
  @endif

  <!--====== Team Section End ======-->

  @if (isset($home_sections->skills_section) && $home_sections->skills_section == 1)
    @php
      $isSkillsSectionEmpty =
          empty($home_text->skills_title) &&
          empty($home_text->skills_subtitle) &&
          empty($home_text->skills_content) &&
          (empty($skills) || count($skills) == 0);
    @endphp

    <section class="skill-section">
      <div class="container">
        <div class="row align-items-center justify-content-center">
          <div class="col-lg-6 col-md-10">
            <!-- Skill Text Block -->
            <div class="skill-text">
              <div class="section-title mb-40 left-border">
                @if ($isSkillsSectionEmpty)
                  <span class="title-tag">Skills</span>
                  <h2 class="title">This is the Skills section</h2>
                @else
                  @if (!empty($home_text->skills_title))
                    <span class="title-tag">{{ $home_text->skills_title }}</span>
                  @endif
                  <h2 class="title">{{ $home_text->skills_subtitle ?? null }}</h2>
                @endif
              </div>

              @if (!$isSkillsSectionEmpty)
                @if (!empty($home_text->skills_content))
                  <p>{!! nl2br($home_text->skills_content ?? '') !!}</p>
                @endif
              @endif
            </div>
          </div>
          <div class="col-lg-6 col-md-10">
            @if (!$isSkillsSectionEmpty)
              <div class="piechart-boxes">
                @foreach ($skills as $skill)
                  <div class="chart-box">
                    <div class="chart" data-percent="{{ $skill->percentage }}"
                      data-bar-color="#{{ $skill->color }}">
                      <i class="{{ $skill->icon ?? 'fa fa-fw fa-heart' }}"></i>
                    </div>
                    <h4 class="title">{{ $skill->title }}</h4>
                  </div>
                @endforeach
              </div>
            @endif
          </div>
        </div>
      </div>
    </section>
  @endif

  <!--====== Skill Section End ======-->

  <!--====== Testimonials part start ======-->

  @if (isset($home_sections->testimonials_section) && $home_sections->testimonials_section == 1)
    @php
      $isTestimonialsEmpty =
          empty($home_text->testimonial_title) &&
          empty($home_text->testimonial_subtitle) &&
          (empty($testimonials) || count($testimonials) == 0);
      $tstmImg = $home_text->testimonial_image ?? 'testimonial.png';
    @endphp

    <section class="testimonial-section grey-bg">
      <div class="container">
        <div class="row justify-content-center justify-content-lg-start">
          <div class="col-lg-6 col-md-10 offset-lg-5">
            <div class="section-title left-border">
              @if ($isTestimonialsEmpty)
                <span class="title-tag">Testimonials</span>
                <h2 class="title">This is the Testimonials section</h2>
              @else
                @if (!empty($home_text->testimonial_title))
                  <span class="title-tag">{{ $home_text->testimonial_title }}</span>
                @endif
                <h2 class="title">{{ $home_text->testimonial_subtitle ?? null }}</h2>
              @endif
            </div>

            @if (!$isTestimonialsEmpty)
              <div class="testimonial-items" id="testimonialSliderOne">
                @foreach ($testimonials as $testimonial)
                  <div class="testimonial-item">
                    <div class="content">
                      <p>
                        <span class="quote-top">
                          <i class="fas fa-quote-left"></i>
                        </span>
                        {{ replaceBaseUrl($testimonial->content) }}
                        <span class="quote-bottom">
                          <i class="fas fa-quote-right"></i>
                        </span>
                      </p>
                    </div>
                    <div class="author">
                      <div class="thumb">
                        <img class="lazy"
                          data-src="{{ asset('assets/front/img/user/testimonials/' . $testimonial->image) }}"
                          alt="img">
                      </div>
                      <div class="desc">
                        <h4>{{ $testimonial->name }}</h4>
                        <span>{{ $testimonial->occupation ?? null }}</span>
                      </div>
                    </div>
                  </div>
                @endforeach
              </div>
              <div class="testimonial-arrows row"></div>
            @endif
          </div>
        </div>
      </div>

      <!-- Testimonials img -->
      <div class="testimonial-img">
        <img class="lazy" data-src="{{ asset('assets/front/img/user/home_settings/' . $tstmImg) }}"
          alt="testimonial">
      </div>
    </section>
  @endif

  <!--====== Testimonials part end ======-->

  <!--====== Client Area Start ======-->

  @if (isset($home_sections->brand_section) && $home_sections->brand_section == 1)
    @php
      $isBrandSectionEmpty = empty($brands) || count($brands) == 0;
    @endphp

    @if ($isBrandSectionEmpty)
      <section class="client-section">
        <div class="container">
          <div class="client-slider section-gap line-bottom">
            <div class="row align-items-center justify-content-center">
              <div class="col-12 text-center">
                <h3>This is the Brand section</h3>
                {{-- You can customize or style this placeholder as needed --}}
              </div>
            </div>
          </div>
        </div>
      </section>
    @else
      <section class="client-section">
        <div class="container">
          <div class="client-slider section-gap line-bottom">
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
          </div>
        </div>
      </section>
    @endif
  @endif

  <!--====== Client Area End ======-->

  @if (in_array('Blog', $packagePermissions) && isset($home_sections->blogs_section) && $home_sections->blogs_section == 1)
    @php
      $isBlogSectionEmpty =
          empty($home_text->blog_title) && empty($home_text->blog_subtitle) && (empty($blogs) || count($blogs) == 0);
    @endphp

    <!--====== Latest Post Start ======-->
    <section class="latest-post-section section-gap">
      <div class="container">
        <div class="row align-items-center justify-content-center">
          <div class="col-lg-6 col-md-8 col-10 col-tiny-12">
            <div class="section-title left-border">
              @if ($isBlogSectionEmpty)
                <span class="title-tag">Blog</span>
                <h2 class="title">This is the Blog section</h2>
              @else
                @if (!empty($home_text->blog_title))
                  <span class="title-tag">{{ $home_text->blog_title }}</span>
                @endif
                <h2 class="title">{{ $home_text->blog_subtitle ?? null }}</h2>
              @endif
            </div>
          </div>
          @if (!$isBlogSectionEmpty)
            <div class="col-lg-6 col-md-4 col-10 col-tiny-12">
              <div class="text-md-right mt-30 mt-md-0">
                <a href="{{ route('front.user.blogs', getParam()) }}"
                  class="main-btn">{{ $home_text->view_all_blog_text ?? 'View All' }}</a>
              </div>
            </div>
          @endif
        </div>

        @if (!$isBlogSectionEmpty)
          <div class="latest-post-loop row mt-50 justify-content-center">
            @foreach ($blogs as $blog)
              <div class="col-lg-4 col-md-6 col-10 col-tiny-12 wow fadeInLeft" data-wow-duration="1500ms"
                data-wow-delay="400ms">
                <div class="latest-post-box">
                  <div class="post-thumb-wrap">
                    <a class="post-thumb bg-img-c lazy"
                      href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}"
                      data-bg="{{ asset('assets/front/img/user/blogs/' . $blog->image) }}">
                    </a>
                  </div>
                  <div class="post-desc">
                    <span class="post-date"><i
                        class="far fa-calendar-alt"></i>{{ \Carbon\Carbon::parse($blog->created_at)->format('F j, Y') }}</span>
                    <h3 class="title">
                      <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">
                        {{ $blog->title }}
                      </a>
                    </h3>
                    <p>
                      {!! strlen(strip_tags($blog->content)) > 80
                          ? mb_substr(strip_tags($blog->content), 0, 80, 'UTF-8') . '...'
                          : strip_tags($blog->content) !!}
                    </p>
                    <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}"
                      class="post-link">
                      {{ $keywords['Learn_More'] ?? 'Learn More' }}
                      <i class="far fa-long-arrow-right"></i>
                    </a>
                  </div>
                </div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
    </section>
    <!--====== Latest Post End ======-->
  @endif

@endsection
