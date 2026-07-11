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
  <!--====== BANNER PART START ======-->
  <section class="banner-slide-3">
    @if (count($sliders) > 0)
      @foreach ($sliders as $slider)
        <div class="banner-area banner-area-4">
          <div class=" bg_cover lazy" data-bg="{{ asset('assets/front/img/hero_slider/' . $slider->img) }}">
            <div class="banner-overlay d-flex align-items-center">
              <div class="container">
                <div class="row justify-content-center">
                  <div class="col-lg-9">
                    <div class="banner-content text-center">
                      <h1 data-animation="fadeInUp" data-delay=".3s" class="title">
                        {{ $slider->title }}</h1>
                      <p data-animation="fadeInUp" data-delay=".9s">{{ $slider->subtitle }}</p>

                      <ul>
                        @if (!empty($slider->btn_url))
                          <li><a data-animation="fadeInLeft" data-delay="1.5s" class="main-btn"
                              href="{{ $slider->btn_url }}">{{ $slider->btn_name }} <i
                                class="flaticon-arrow-pointing-to-right"></i></a>
                          </li>
                        @endif
                      </ul>
                    </div> <!-- banner content -->
                  </div>
                </div> <!-- row -->
              </div> <!-- container -->
            </div>
          </div>
        </div>
      @endforeach
    @else
      <div class="banner-area banner-area-4 bg_cover lazy"
        data-bg="{{ asset('assets/front/img/static/industry/hero.jpg') }}">
        <div class="banner-overlay d-flex align-items-center">
          <div class="container">
            <div class="row justify-content-center">
              <div class="col-lg-9">
                <div class="banner-content text-center">
                  <h1 data-animation="fadeInUp" data-delay=".3s" class="title">Industrial
                    Services Provider Agency</h1>
                  <p data-animation="fadeInUp" data-delay=".9s">Lorem ipsum dolor sit amet consectetur
                    adipisicing elit sed do eiusmod tempor incidide unt ut labore et dolore magna
                    aliqua. Ut enim ad minim veniam </p>

                  <ul>
                    <li><a data-animation="fadeInLeft" data-delay="1.5s" class="main-btn" href="#">read more <i
                          class="flaticon-arrow-pointing-to-right"></i></a>
                    </li>
                  </ul>
                </div> <!-- banner content -->
              </div>
            </div> <!-- row -->
          </div> <!-- container -->
        </div>
      </div>
      <style>
        .banner-slide-3::after {
          display: none;
        }
      </style>
    @endif
  </section>
  <!--====== BANNER PART ENDS ======-->

  <!--====== Work Process PART START ======-->
  @if (isset($home_sections->work_process_section) && $home_sections->work_process_section == 1)
    @php
      $isWorkProcessEmpty =
          empty($home_text->work_process_section_title) &&
          empty($home_text->work_process_section_text) &&
          (empty($work_processes) || count($work_processes) == 0);
    @endphp

    <section class="about-us-area pt-145 pb-130">
      <div class="container">
        <div class="row">
          <div class="col-lg-5">
            <div class="about-content mt-30">
              @if ($isWorkProcessEmpty)
                <h3 class="title">This is the Work Process section</h3>
                <p></p>
              @else
                @isset($home_text->work_process_section_title)
                  <h3 class="title">{{ $home_text->work_process_section_title }}</h3>
                @endisset
                <p>{{ $home_text->work_process_section_text ?? '' }}</p>
                @if (!empty($home_text->work_process_btn_url))
                  <a class="main-btn" target="_blank"
                    href="{{ $home_text->work_process_btn_url }}">{{ $home_text->work_process_btn_txt ?? '' }}
                    <i class="flaticon-arrow-pointing-to-right"></i></a>
                @endif
              @endif
            </div>
          </div>
          @if (!$isWorkProcessEmpty)
            <div class="col-lg-7">
              <div class="row">
                @foreach ($work_processes as $key => $work_process)
                  <div class="col-lg-6 col-md-6 col-sm-6">
                    <div class="about-features mt-30">
                      <i class="{{ $work_process->icon }}"></i>
                      <h5 class="title">{{ $work_process->title }}</h5>
                      @if (!empty($work_process->text))
                        <p>{!! strlen(strip_tags($work_process->text)) > 80
                            ? mb_substr(strip_tags($work_process->text), 0, 80, 'UTF-8') . '...'
                            : strip_tags($work_process->text) !!}</p>
                      @endif
                    </div>
                  </div>
                @endforeach
              </div>
            </div>
          @endif
        </div>
      </div>
    </section>
  @endif

  <!--====== Work Process PART ENDS ======-->

  <!--====== VIDEO PART START ======-->
  @if (isset($home_sections->video_section) && $home_sections->video_section == 1)
    @php
      $videoBg = $videoSectionDetails->video_section_image ?? 'video_bg.jpg';
      $isVideoSectionEmpty =
          empty($videoSectionDetails->video_section_url) &&
          empty($videoSectionDetails->video_section_title) &&
          empty($videoSectionDetails->video_section_text);
    @endphp

    <section class="video-area">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-lg-7">
            <div class="video-thumb">
              <img data-src="{{ asset('assets/front/img/user/home_settings/' . $videoBg) }}" class="lazy"
                alt="video">
              <div class="video-overlay">
                @if (!$isVideoSectionEmpty && !empty($videoSectionDetails->video_section_url))
                  <a class="video-popup" href="{{ $videoSectionDetails->video_section_url }}"><i
                      class="fas fa-play"></i></a>
                @elseif ($isVideoSectionEmpty)
                  <div class="text-center py-5" style="color: #333;">
                    <h3 class="text-white">This is the Video section</h3>
                  </div>
                @endif
              </div>
            </div>
          </div>
          <div class="col-lg-5">
            <div class="video-content">
              @if ($isVideoSectionEmpty)
                <h3 class="title">Video Title Placeholder</h3>
              @else
                <h3 class="title">{{ $videoSectionDetails->video_section_title ?? '' }}</h3>
                <p>{{ $videoSectionDetails->video_section_text ?? '' }}</p>
              @endif
            </div>
          </div>
        </div>
      </div>
      <div class="video-dot">
        <img src="assets/front/img/theme7/video-dot.png" alt="dot">
      </div>
    </section>
  @endif
  <!--====== VIDEO PART ENDS ======-->

  <!--====== COUNTER 4 PART START ======-->
  @php
    $isCounterInfoEmpty = empty($counterInformations) || count($counterInformations) == 0;
  @endphp

  <div class="counter-4-area gray-bg">
    <div class="container">
      @if (isset($home_sections->counter_info_section) && $home_sections->counter_info_section == 1)
        @if ($isCounterInfoEmpty)
          <div class="row justify-content-center">
            <div class="col-12 text-center py-5">
              <h3>This is the Counter Info section</h3>
            </div>
          </div>
        @else
          <div class="row">
            @foreach ($counterInformations as $key => $counterInformation)
              <div class="col-lg-3 col-md-6 col-sm-6">
                <div class="progress-counter mt-30">
                  <div class="history-progress text-center">
                    <div class="circle"></div>
                    <h2 class="title"><span class="counter">{{ $counterInformation->count }}</span>
                    </h2>
                    <p>{{ $counterInformation->title }}</p>
                    <i class="{{ $counterInformation->icon }}"></i>
                  </div>
                </div>
              </div>
            @endforeach
          </div>
        @endif
      @endif
    </div>
  </div>
  {{-- @endif --}}

  <!--====== COUNTER 4 PART ENDS ======-->

  <!--====== OUR SERVICES PART START ======-->
  @if (in_array('Service', $packagePermissions) &&
          isset($home_sections->featured_services_section) &&
          $home_sections->featured_services_section == 1)
    @php
      $isServiceSectionEmpty =
          empty($home_text->service_title) &&
          empty($home_text->service_subtitle) &&
          (empty($services) || count($services) == 0);
    @endphp

    <section class="our-services-4-area">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-6">
            <div class="section-title-4 text-center">
              @if ($isServiceSectionEmpty)
                <h2 class="title">This is the Services section</h2>
                <p></p>
              @else
                <h2 class="title">{{ $home_text->service_title ?? '' }}</h2>
                <p>{{ $home_text->service_subtitle ?? '' }}</p>
              @endif
            </div>
          </div>
        </div>

        @if (!$isServiceSectionEmpty)
          <div class="row services-active owl-carousel">
            @foreach ($services as $service)
              <div class="col-lg-12">
                <div class="single-services mt-30">
                  <div class="services-thumb">
                    <a @if ($service->detail_page == 1) href="{{ route('front.user.service.detail', [getParam(), 'slug' => $service->slug, 'id' => $service->id]) }}" @endif
                      class="d-block">
                      <img
                        src="{{ isset($service->image) ? asset('assets/front/img/user/services/' . $service->image) : asset('assets/front/img/theme7/our-services-4.png') }}"
                        alt="services">
                      <i class="{{ $service->icon }}"></i>
                    </a>
                  </div>
                  <div class="services-content text-center">
                    <a
                      @if ($service->detail_page == 1) href="{{ route('front.user.service.detail', [getParam(), 'slug' => $service->slug, 'id' => $service->id]) }}" @endif>
                      <h4 class="title">{{ $service->name }}</h4>
                    </a>
                    <p>{!! strlen(strip_tags($service->content)) > 80
                        ? mb_substr(strip_tags($service->content), 0, 80, 'UTF-8') . '...'
                        : strip_tags($service->content) !!}</p>
                  </div>
                </div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
    </section>
  @endif

  <!--====== OUR SERVICES PART ENDS ======-->

  <!--====== PORTFOLIO PART START ======-->
  @if (in_array('Portfolio', $packagePermissions) &&
          isset($home_sections->portfolio_section) &&
          $home_sections->portfolio_section == 1)
    @php
      $isPortfolioEmpty = empty($portfolios) || count($portfolios) == 0;
    @endphp

    <section class="portfolio-area">
      <div class="container-fluid p-0">
        @if ($isPortfolioEmpty)
          <div class="row justify-content-center">
            <div class="col-12 text-center py-5">
              <h3>This is the Portfolio section</h3>
            </div>
          </div>
        @else
          <div class="row no-gutters">
            @foreach ($portfolios as $portfolio)
              <div class="col-lg-3 col-md-6 col-sm-6">
                <div class="portfolio-item">
                  <img class="lazy" data-src="{{ asset('assets/front/img/user/portfolios/' . $portfolio->image) }}"
                    alt="portfolio">
                  <div class="portfolio-overlay">
                    <div class="portfolio-content text-center">
                      <a
                        href="{{ route('front.user.portfolio.detail', [getParam(), $portfolio->slug, $portfolio->id]) }}">
                        <i class="fas fa-plus"></i>
                      </a>
                      <h4 class="title">
                        {{ strlen($portfolio->title) > 25 ? mb_substr($portfolio->title, 0, 25, 'UTF-8') . '...' : $portfolio->title }}
                      </h4>
                      <span>{{ $portfolio->bcategory->name }}</span>
                    </div>
                  </div>
                </div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
    </section>
  @endif
  <!--====== PORTFOLIO PART ENDS ======-->

  <!--====== TEAM 4 PART START ======-->

  @if (in_array('Team', $packagePermissions) &&
          isset($home_sections->team_members_section) &&
          $home_sections->team_members_section == 1)
    @php
      $isTeamSectionEmpty =
          empty($home_text->team_section_title) &&
          empty($home_text->team_section_subtitle) &&
          (empty($teams) || count($teams) == 0);
    @endphp

    <section class="team-4-area">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-6">
            <div class="section-title-4 text-center">
              @if ($isTeamSectionEmpty)
                <h2 class="title">This is the Team section</h2>
                <p></p>
              @else
                @isset($home_text->team_section_title)
                  <h2 class="title">{{ $home_text->team_section_title ?? '' }}</h2>
                @endisset
                <p>{{ $home_text->team_section_subtitle ?? '' }}</p>
              @endif
            </div>
          </div>
        </div>

        @if (!$isTeamSectionEmpty)
          <div class="row justify-content-center">
            @foreach ($teams as $team)
              <div class="col-lg-4 col-md-6 col-sm-8">
                <div class="single-team mt-30">
                  <div class="team-thumb">
                    <img class="lazy" data-src="{{ asset('/assets/front/img/user/team/' . $team->image) }}"
                      alt="team">
                  </div>
                  <div class="team-content">
                    <span>{{ convertUtf8($team->rank) }}</span>
                    <h5 class="title">{{ convertUtf8($team->name) }}</h5>
                    <ul>
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

  <!--====== TEAM 4 PART ENDS ======-->


  <!--====== FAQ and testimonial PART START ======-->
  <section class="faq-area">
    <div class="container-fluid">
      <div class="row justify-content-between">
        {{-- Testimonials Section --}}
        @if (isset($home_sections->testimonials_section) && $home_sections->testimonials_section == 1)
          @php
            $isTestimonialEmpty =
                empty($home_text->testimonial_title) &&
                empty($home_text->testimonial_subtitle) &&
                (empty($testimonials) || count($testimonials) == 0);
            $tstmBg = $home_text->testimonial_image ?? 'testimonial_bg_3.jpg';
          @endphp
          <div class="col-lg-5 col-md-5">
            <div class="faq-clients-item">
              <div class="clients-title">
                @if ($isTestimonialEmpty)
                  <h3 class="title">This is the Testimonial section</h3>
                  <p></p>
                @else
                  @if (!empty($home_text->testimonial_title))
                    <h3 class="title">{{ $home_text->testimonial_title }}</h3>
                  @endif
                  <p>{{ $home_text->testimonial_subtitle ?? null }}</p>
                @endif
              </div>

              @if (!$isTestimonialEmpty)
                <div class="clients-active">
                  @foreach ($testimonials as $testimonial)
                    <div class="single-clients">
                      <p>{{ replaceBaseUrl($testimonial->content) }}</p>
                      <div class="clients-user d-flex align-items-center">
                        <div class="clients-thumb">
                          <img class="lazy"
                            data-src="{{ asset('assets/front/img/user/testimonials/' . $testimonial->image) }}"
                            alt="clients">
                        </div>
                        <div class="clients-info">
                          <h5 class="title">{{ convertUtf8($testimonial->name) }}</h5>
                          <span>{{ convertUtf8($testimonial->occupation) ?? null }}</span>
                        </div>
                      </div>
                    </div>
                  @endforeach
                </div>
              @endif
            </div>
          </div>
        @endif

        {{-- FAQ Section --}}
        @if (isset($home_sections->faq_section) && $home_sections->faq_section == 1)
          @php
            $isFaqEmpty =
                empty($home_text->faq_section_title) &&
                empty($home_text->faq_section_subtitle) &&
                (empty($faqs) || count($faqs) == 0);
          @endphp
          <div class="col-lg-6 col-md-6">
            <div class="faq-item">
              <div class="faq-title">
                @if ($isFaqEmpty)
                  <h3 class="title">This is the FAQ section</h3>
                  <p></p>
                @else
                  @isset($home_text->faq_section_title)
                    <h3 class="title">{{ $home_text->faq_section_title }}</h3>
                  @endisset
                  <p>{{ $home_text->faq_section_subtitle ?? null }}</p>
                @endif
              </div>

              @if (!$isFaqEmpty)
                <div class="faq-accordion">
                  <div class="accordion" id="accordionExample">
                    @foreach ($faqs as $key => $faq)
                      <div class="card">
                        <div class="card-header" id="heading{{ $faq->id }}">
                          <a href="" data-toggle="collapse" data-target="#collapse{{ $faq->id }}"
                            aria-expanded="{{ $key == 0 ? 'true' : 'false' }}"
                            aria-controls="collapse{{ $faq->id }}">
                            <i class="far fa-{{ $key == 0 ? 'minus' : 'plus' }}"></i>{{ $faq->question }}
                          </a>
                        </div>

                        <div id="collapse{{ $faq->id }}" class="collapse {{ $key == 0 ? 'show' : '' }}"
                          aria-labelledby="heading{{ $faq->id }}" data-parent="#accordionExample">
                          <div class="card-body">
                            <p>{{ $faq->answer }}</p>
                          </div>
                        </div>
                      </div> <!-- card -->
                    @endforeach
                  </div>
                </div>
              @endif
            </div>
          </div>
        @endif
      </div>
    </div>
  </section>
  <!--====== FAQ PART ENDS ======-->

  <!--====== contact START ======-->
  @if (isset($home_sections->contact_section) && $home_sections->contact_section == 1)
    <section class="quote-area">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-6">
            <div class="section-title-4 text-center">
              @isset($home_text->contact_section_title)
                <h2 class="title">{{ $home_text->contact_section_title }}</h2>
              @endisset
              <p>{{ $home_text->contact_section_subtitle ?? null }}</p>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-lg-7">
            <div class="quote-form">
              <form action="{{ route('front.contact.message', getParam()) }}" method="POST"
                enctype="multipart/form-data">
                @csrf
                <input type="hidden" name="id" value="{{ $user->id }}">
                <div class="row">
                  <div class="col-lg-12">
                    <div class="input-box mt-30">
                      <input type="text" placeholder="{{ $keywords['Name'] ?? 'Name' }}" name="fullname">
                      @if ($errors->has('fullname'))
                        <small class="text-danger">{{ $errors->first('fullname') }}</small>
                      @endif
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="input-box mt-30">
                      <input type="email" placeholder="{{ $keywords['Email_Address'] ?? 'Email Address' }}"
                        name="email">
                      @if ($errors->has('email'))
                        <small class="text-danger">{{ $errors->first('email') }}</small>
                      @endif
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="input-box mt-30">
                      <input type="text" placeholder="{{ $keywords['Subject'] ?? 'Subject' }}" name="subject">
                      @if ($errors->has('fullname'))
                        <small class="text-danger">{{ $errors->first('subject') }}</small>
                      @endif
                    </div>
                  </div>
                  <div class="col-lg-12">
                    <div class="input-box mt-30">
                      <textarea name="message" id="#" cols="30" rows="10"
                        placeholder="{{ $keywords['Message'] ?? 'Message' }}"></textarea>
                      @if ($errors->has('message'))
                        <small class="text-danger">{{ $errors->first('message') }}</small>
                      @endif
                      <button class="main-btn" type="submit">{{ $keywords['Send_Message'] ?? 'Send Message' }} <i
                          class="flaticon-arrow-pointing-to-right"></i></button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
          <div class="col-lg-5">
            <div class="quote-thumb d-none d-lg-inline-block">
              <img
                data-src="{{ !empty($home_text->contact_section_image) ? asset('assets/front/img/user/home_settings/' . $home_text->contact_section_image) : asset('assets/front/img/theme7/quote-thumb.jpg') }}"
                class="lazy" alt="quote">
            </div>
          </div>
        </div>
      </div>
    </section>
  @endif
  <!--====== contact ENDS ======-->

  <!--====== CTA PART START ======-->
  @if (in_array('Request a Quote', $packagePermissions))
    @if ($userBs->is_quote)
      @php
        $isQuoteSectionEmpty = empty($home_text->quote_section_title) && empty($home_text->quote_section_subtitle);
      @endphp

      <section class="cta-area pb-130 pt-150">
        <div class="container">
          <div class="row justify-content-center">
            <div class="col-lg-8">
              <div class="cta-item text-center">
                @if ($isQuoteSectionEmpty)
                  <h2 class="title">This is the Quote section</h2>
                  <p></p>
                @else
                  @isset($home_text->quote_section_title)
                    <h2 class="title">{{ $home_text->quote_section_title }}</h2>
                  @endisset
                  <p>{{ $home_text->quote_section_subtitle ?? '' }}</p>
                @endif
                <a href="{{ route('front.user.quote', getParam()) }}"
                  class="main-btn">{{ $keywords['Request_A_Quote'] ?? 'Request A Quote' }} <i
                    class="far fa-long-arrow-right"></i></a>
              </div>
            </div>
          </div>
        </div>
      </section>
    @endif
  @endif
  <!--====== CTA PART ENDS ======-->

  <!--====== BLOG 4 PART START ======-->

  @if (in_array('Blog', $packagePermissions) && isset($home_sections->blogs_section) && $home_sections->blogs_section == 1)
    @php
      $isBlogSectionEmpty =
          empty($home_text->blog_title) && empty($home_text->blog_subtitle) && (empty($blogs) || count($blogs) == 0);
    @endphp

    <section class="blog-4-area gray-bg pb-130">
      <div class="container">
        <div class="row justify-content-between align-items-center">
          <div class="col-lg-6 col-md-7">
            <div class="section-title-4 text-left">
              @if ($isBlogSectionEmpty)
                <h2 class="title">This is the Blog section</h2>
                <p></p>
              @else
                @if (!empty($home_text->blog_title))
                  <h2 class="title">{{ $home_text->blog_title }}</h2>
                @endif
                <p>{{ $home_text->blog_subtitle ?? null }}</p>
              @endif
            </div>
          </div>
          <div class="col-lg-6 col-md-5">
            @if (!$isBlogSectionEmpty)
              <div class="blog-title-btn text-left text-md-right">
                <a class="main-btn"
                  href="{{ route('front.user.blogs', getParam()) }}">{{ $home_text->view_all_blog_text ?? 'View All' }}
                  <i class="far fa-long-arrow-right"></i></a>
              </div>
            @endif
          </div>
        </div>

        @if (!$isBlogSectionEmpty)
          <div class="row">
            @foreach ($blogs as $blog)
              @if ($loop->last)
                @continue
              @endif
              <div class="col-lg-6">
                <div class="single-blog bg-white mt-30">
                  <div class="row">
                    <div class="col-lg-6 col-md-6 col-sm-6">
                      <div class="blog-thumb">
                        <img class="lazy" data-src="{{ asset('assets/front/img/user/blogs/' . $blog->image) }}"
                          alt="blog">
                      </div>
                    </div>
                    <div class="col-lg-6 col-md-6 col-sm-6">
                      <div class="blog-content">
                        <ul>
                          <li><i class="far fa-user"></i> {{ $blog->bcategory->name }}</li>
                          <li><i class="far fa-calendar-alt"></i>
                            {{ \Carbon\Carbon::parse($blog->created_at)->toFormattedDateString() }}
                          </li>
                        </ul>
                        <h4 class="title">{{ $blog->title }}</h4>
                        <p>
                          {!! strlen(strip_tags($blog->content)) > 80
                              ? mb_substr(strip_tags($blog->content), 0, 80, 'UTF-8') . '...'
                              : strip_tags($blog->content) !!}
                        </p>
                        <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}"
                          class="main-btn">{{ $keywords['Learn_More'] ?? 'Learn More' }} <i
                            class="far fa-long-arrow-right"></i></a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
    </section>
  @endif

  <!--====== BLOG 4 PART ENDS ======-->
@endsection
