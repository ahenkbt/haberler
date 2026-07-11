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
  <!--====== Start Hero Area ======-->
  <section class="hero-area-two have-animate-icons">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-10">
          <div class="hero-content wow fadeInUp" data-wow-delay="0.3s">
            <span class="tagline">{{ $static->title ?? 'Business & Consulting' }}</span>
            <h1 class="hero-title">
              {{ $static->subtitle ?? 'Perfect Agency For Innovative Business' }}
            </h1>
            <p>
              {{ $static->hero_text ?? 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam aperiam eaque abillo inventore veritatis' }}
            </p>
            @if (!empty($static->btn_url))
              <a href="{{ $static->btn_url }}" target="_blank" class="template-btn">
                {{ $static->btn_name ?? 'Our Services' }} <i class="far fa-long-arrow-right"></i>
              </a>
            @endif
          </div>
        </div>
        <div class="col-12">
          <div class="hero-img wow fadeInDown" data-wow-delay="0.4s">
            <img class="lazy"
              data-src=" {{ isset($static->img) ? asset('assets/front/img/hero_static/' . $static->img) : asset('assets/front/img/static/theme45/hero-illustration-two.png') }}"
              alt="hero-image">
          </div>
        </div>
      </div>
    </div>
    <div class="animate-icons">
      <img src="{{ asset('assets/front/img/static/theme45/gradient-pipe.png') }}" alt="particles"
        class="icon-one animate-rotate-me">
      <img src="{{ asset('assets/front/img/static/theme45/wave-line.png') }}" alt="particles"
        class="icon-two animate-float-bob-x">
      <img src="{{ asset('assets/front/img/static/theme45/stars.png') }}" alt="particles"
        class="icon-three animate-float-bob-x">
      <img src="{{ asset('assets/front/img/static/theme45/triangle.png') }}" alt="particles"
        class="icon-four animate-float-bob-y">
      <img src="{{ asset('assets/front/img/static/theme45/triangle-2.png') }}" alt="particles"
        class="icon-five animate-rotate-me">
      <img src="{{ asset('assets/front/img/static/theme45/circle.png') }}" alt="particles"
        class="icon-six animate-zoom-fade">
      <img src="{{ asset('assets/front/img/static/theme45/circle-small.png') }}" alt="particles"
        class="icon-seven animate-float-bob-y">
    </div>
  </section>
  <!--====== End Hero Area ======-->

  <!--====== Service Section Start ======-->
  @if (in_array('Service', $packagePermissions) &&
          isset($home_sections->featured_services_section) &&
          $home_sections->featured_services_section == 1)
    @php
      $isServiceSectionEmpty =
          empty($home_text->service_title) &&
          empty($home_text->service_subtitle) &&
          (empty($services) || count($services) == 0);
    @endphp

    <section class="service-section section-gap">
      <div class="container">
        <div class="section-heading text-center mb-30">
          @if ($isServiceSectionEmpty)
            <span class="title">Services</span>
            <h2 class="tagline">This is the Services section</h2>
          @else
            @if (!empty($home_text->service_title))
              <span class="title">{{ $home_text->service_title }}</span>
            @endif
            <h2 class="tagline">{{ $home_text->service_subtitle ?? null }}</h2>
          @endif
        </div>

        @if (!$isServiceSectionEmpty)
          <div class="row justify-content-center">
            @foreach ($services as $service)
              <div class="col-lg-4 col-sm-6 wow fadeInUp">
                <div class="iconic-box icon-left mt-30">
                  <div class="icon">
                    <img class="lazy"
                      data-src="{{ isset($service->image) ? asset('assets/front/img/user/services/' . $service->image) : asset('assets/front/img/icon/code.png') }}"
                      alt="Icon">
                  </div>
                  <div class="content">
                    <h5 class="title">
                      <a
                        @if ($service->detail_page == 1) href="{{ route('front.user.service.detail', [getParam(), 'slug' => $service->slug, 'id' => $service->id]) }}" @endif>{{ $service->name }}</a>
                    </h5>
                    <p>{!! strlen(strip_tags($service->content)) > 80
                        ? mb_substr(strip_tags($service->content), 0, 80, 'UTF-8') . '...'
                        : strip_tags($service->content) !!}
                    </p>
                  </div>
                </div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
    </section>
  @endif

  <!--====== Service Section End ======-->

  <!--====== work Section Start ======-->

  <div class="section-blob-bg">
    {{-- Work Process Section --}}
    @if (isset($home_sections->work_process_section) && $home_sections->work_process_section == 1)
      @php
        $isWorkProcessEmpty =
            empty($home_text->work_process_section_title) &&
            empty($home_text->work_process_section_subtitle) &&
            (empty($work_processes) || count($work_processes) == 0);
      @endphp

      <section class="feature-section section-gap-bottom">
        <div class="container">
          <div class="row align-items-center justify-content-center">
            <div class="col-lg-6 col-md-10">
              <div class="feature-images row align-items-center content-mb-md-50">
                <div class="col-md-12">
                  <img
                    data-src="{{ isset($home_text->work_process_section_img) ? asset('assets/front/img/work_process/' . $home_text->work_process_section_img) : asset('assets/front/img/feature-1.jpg') }}"
                    alt="Image" class="animate-float-bob-y lazy">
                </div>
              </div>
            </div>
            <div class="col-lg-6 col-md-10">
              <div class="feature-text-block content-l-spacing">
                <div class="section-heading mb-50">
                  @if ($isWorkProcessEmpty)
                    <h2 class="title">This is the Work Process section</h2>
                    <span class="tagline"></span>
                  @else
                    @isset($home_text->work_process_section_title)
                      <h2 class="title">{{ $home_text->work_process_section_title }}</h2>
                    @endisset
                    <span class="tagline">{{ $home_text->work_process_section_subtitle ?? null }}</span>
                  @endif
                </div>
                @if (!$isWorkProcessEmpty)
                  <div class="feature-lists">
                    @foreach ($work_processes as $key => $work_process)
                      <div class="simple-icon-box icon-left mb-30">
                        <div class="icon">
                          <i class="{{ $work_process->icon }}"></i>
                        </div>
                        <div class="content">
                          <h4 class="title">{{ $work_process->title }}</h4>
                          @if (!empty($work_process->text))
                            <p>{!! nl2br($work_process->text) !!}</p>
                          @endif
                        </div>
                      </div>
                    @endforeach
                  </div>
                  @isset($home_text->work_process_btn_txt)
                    <a href="{{ $home_text->work_process_btn_url }}"
                      class="template-btn mt-10">{{ $home_text->work_process_btn_txt }} <i
                        class="far fa-long-arrow-right"></i></a>
                  @endisset
                @endif
              </div>
            </div>
          </div>
        </div>
      </section>
    @endif

    {{-- Counter Info Section --}}
    @if (isset($home_sections->counter_info_section) && $home_sections->counter_info_section == 1)
      @php
        $isCounterInfoEmpty = empty($counterInformations) || count($counterInformations) == 0;
      @endphp

      <section class="counter-section counter-boxed">
        <div class="container bg-color-primary section-wave-bg">
          @if ($isCounterInfoEmpty)
            <div class="text-center py-5" style="color: white;">
              <h3>This is the Counter Info section</h3>
            </div>
          @else
            <div class="counter-items row justify-content-lg-between justify-content-center">
              @foreach ($counterInformations as $key => $counterInformation)
                <div class="col-xl-2 col-lg-3 col-sm-5">
                  <div class="counter-item counter-white mt-40">
                    <div class="counter-wrap">
                      <span class="counter">{{ $counterInformation->count }}</span>
                      <span class="suffix">+</span>
                    </div>
                    <h6 class="title">{{ $counterInformation->title }}</h6>
                  </div>
                </div>
              @endforeach
            </div>
          @endif
        </div>
      </section>
    @endif

    {{-- Portfolio Section --}}
    @if (isset($home_sections->portfolio_section) && $home_sections->portfolio_section == 1)
      @php
        $isPortfolioEmpty =
            empty($home_text->portfolio_title) &&
            empty($home_text->portfolio_subtitle) &&
            (empty($portfolios) || count($portfolios) == 0);
      @endphp

      <section class="portfolio-section section-gap">
        <div class="container">
          <div class="section-heading text-center mb-50">
            @if ($isPortfolioEmpty)
              <h2 class="title">This is the Portfolio section</h2>
              <span class="tagline"></span>
            @else
              @isset($home_text->portfolio_title)
                <h2 class="title">{{ $home_text->portfolio_title }}</h2>
              @endisset
              <span class="tagline">{{ $home_text->portfolio_subtitle ?? null }}</span>
            @endif
          </div>

          @if (!$isPortfolioEmpty)
            <div class="portfolio-filter">
              <ul>
                <li data-filter="*" class="active">{{ $keywords['All'] ?? 'All' }}</li>
                @foreach ($portfolioCategories as $key => $value)
                  <li data-filter=".portfolio{{ $value->id }}">{{ $value->name }}</li>
                @endforeach
              </ul>
            </div>
            <div class="row filter-items">
              @foreach ($portfolios as $portfolio)
                <div class="col-lg-4 col-sm-6 filter-item portfolio{{ $portfolio->category_id }}">
                  <div class="portfolio-items-two mt-50">
                    <div class="portfolio-thumb">
                      <img src="{{ asset('assets/front/img/user/portfolios/' . $portfolio->image) }}" alt="Image">
                      <a href="{{ route('front.user.portfolio.detail', [getParam(), $portfolio->slug, $portfolio->id]) }}"
                        class="portfolio-link"></a>
                    </div>
                    <div class="portfolio-content">
                      <h4 class="title"><a target="_blank"
                          href="{{ route('front.user.portfolio.detail', [getParam(), $portfolio->slug, $portfolio->id]) }}">{{ strlen($portfolio->title) > 25 ? mb_substr($portfolio->title, 0, 25, 'UTF-8') . '...' : $portfolio->title }}</a>
                      </h4>
                      <div class="categories">
                        <a
                          href="{{ route('front.user.portfolios', [getParam(), 'category' => $portfolio->bcategory->id]) }}">{{ $portfolio->bcategory->name }}</a>
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
    <!--====== Portfolio Section End ======-->
  </div>


  @if (isset($home_sections->contact_section) && $home_sections->contact_section == 1)
    <!--====== Consultation Section Start ======-->
    <section
      class="consultation-section section-gap bg-cover-center triangle-pattern-left have-blob-image overflow-hidden">
      <div class="container">
        <div class="row justify-content-lg-between align-items-center justify-content-center">
          <div class="col-lg-5 col-md-10">
            <div class="consultation-form-area">
              <div class="consultation-form">
                @isset($contact->contact_form_title)
                  <h2 class="title">{{ $contact->contact_form_title }}</h2>
                @endisset
                <span class="subtitle">{{ $contact->contact_form_subtitle ?? null }}</span>
                <form action="{{ route('front.contact.message', getParam()) }}" method="POST"
                  enctype="multipart/form-data">
                  @csrf
                  <input type="hidden" name="id" value="{{ $user->id }}">
                  <div class="input-field">
                    <input type="text" placeholder="{{ $keywords['Name'] ?? 'Name' }}" name="fullname" required>
                    @if ($errors->has('fullname'))
                      <small class="text-danger">{{ $errors->first('fullname') }}</small>
                    @endif
                  </div>
                  <div class="input-field">
                    <input type="text" placeholder="{{ $keywords['Email_Address'] ?? 'Email Address' }}"
                      name="email" required>
                    @if ($errors->has('email'))
                      <small class="text-danger">{{ $errors->first('email') }}</small>
                    @endif
                  </div>
                  <div class="input-field">
                    <input type="text" placeholder="{{ $keywords['Subject'] ?? 'Subject' }}" name="subject"
                      required>
                    @if ($errors->has('subject'))
                      <small class="text-danger">{{ $errors->first('subject') }}</small>
                    @endif
                  </div>
                  <div class="input-field">
                    <textarea class="form_control" placeholder="{{ $keywords['Message'] ?? 'Message' }}" name="message" required></textarea>
                    @if ($errors->has('message'))
                      <small class="text-danger">{{ $errors->first('message') }}</small>
                    @endif
                  </div>
                  <div class="input-field">
                    <button type="submit" class="template-btn">{{ $keywords['Send_Message'] ?? 'Send Message' }} <i
                        class="far fa-long-arrow-right"></i></button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div class="col-lg-7 col-md-10">
            <div class="fancy-image-gallery content-l-spacing content-mt-md-50">
              <div class="images-wrap">
                <div class="wow fadeInUp" data-wow-delay="0.1s">
                  <img class="lazy"
                    data-src="{{ !empty($home_text->contact_section_image) ? asset('assets/front/img/user/home_settings/' . $home_text->contact_section_image) : asset('assets/front/img/fancy-gallery/01.jpg') }}"
                    alt="Image">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="blob-image">
        <img src="{{ asset('assets/front/img/static/theme45/blob-white.png') }}" alt="">
      </div>
    </section>
    <!--====== Consultation Section End ======-->
  @endif

  <!--====== Call To Action Start ======-->
  @if (in_array('Request a Quote', $packagePermissions) && $userBs->is_quote == 1)
    @php
      $isQuoteSectionEmpty = empty($home_text->quote_section_title) && empty($home_text->quote_section_subtitle);
    @endphp

    <section class="call-to-action style-two bg-color-primary">
      <div class="container">
        <div class="row align-items-center justify-content-between">
          <div class="col-lg-7">
            <div class="cta-content">
              @if ($isQuoteSectionEmpty)
                <h2 class="title">This is the Quote section</h2>
                <p class="subtitle"></p>
              @else
                @isset($home_text->quote_section_title)
                  <h2 class="title">{{ $home_text->quote_section_title }}</h2>
                @endisset
                <p class="subtitle">
                  {{ !empty($home_text->quote_section_subtitle) ? $home_text->quote_section_subtitle : null }}
                </p>
              @endif
            </div>
          </div>
          <div class="col-auto">
            <a href="{{ route('front.user.quote', getParam()) }}"
              class="template-btn bordered-btn bordered-white">{{ $keywords['Request_A_Quote'] ?? 'Request A Quote' }}
              <i class="far fa-long-arrow-right"></i></a>
          </div>
        </div>
      </div>
      <div class="cta-shape">
        <img src="{{ asset('assets/front/img/static/theme45/cta-shape.png') }}" alt="Shape">
      </div>
    </section>
  @endif
  <!--====== Call To Action End ======-->

  <!--====== Testimonial , faq and video Section Start ======-->

  <div class="section-blob-bg-two">
    {{-- Testimonial Section --}}
    @if (isset($home_sections->testimonials_section) && $home_sections->testimonials_section == 1)
      @php
        $isTestimonialEmpty =
            empty($home_text->testimonial_title) &&
            empty($home_text->testimonial_subtitle) &&
            (empty($testimonials) || count($testimonials) == 0);
      @endphp

      <section class="testimonial-section section-gap">
        <div class="container">
          <div class="testimonial-area">
            <div class="section-heading text-center mb-50">
              @if ($isTestimonialEmpty)
                <h2 class="title">This is the Testimonial section</h2>
                <span class="tagline"></span>
              @else
                @if (!empty($home_text->testimonial_title))
                  <h2 class="title">{{ $home_text->testimonial_title }}</h2>
                @endif
                <span class="tagline">{{ $home_text->testimonial_subtitle ?? null }}</span>
              @endif
            </div>

            @if (!$isTestimonialEmpty)
              <div class="testimonial-slider-two">
                @foreach ($testimonials as $testimonial)
                  <div class="testimonial-item">
                    <div class="content">
                      <p> {{ replaceBaseUrl($testimonial->content) }} </p>
                    </div>
                    <div class="author">
                      <div class="author-photo">
                        <img src="{{ asset('assets/front/img/user/testimonials/' . $testimonial->image) }}"
                          alt="Author thumb">
                      </div>
                      <div class="author-info">
                        <h4 class="name">{{ convertUtf8($testimonial->name) }}</h4>
                        <span class="title">{{ convertUtf8($testimonial->occupation) ?? null }}</span>
                      </div>
                    </div>
                  </div>
                @endforeach
              </div>
            @endif
          </div>
        </div>
      </section>
      <!--====== Testimonial Section End ======-->
    @endif

    {{-- FAQ and Video Section --}}
    <section class="faq-section">
      <div class="container">
        <div class="content-boxed">
          {{-- Video Section --}}
          @if (isset($home_sections->video_section) && $home_sections->video_section == 1)
            @php
              $videoBg = $videoSectionDetails->video_section_image ?? 'video_bg.jpg';
              $isVideoSectionEmpty = empty($videoSectionDetails->video_section_url) && empty($videoBg);
            @endphp

            <div class="content-left">
              <div class="tilke-video lazy" data-bg="{{ asset('assets/front/img/user/home_settings/' . $videoBg) }}">
                @if (!$isVideoSectionEmpty && !empty($videoSectionDetails->video_section_url))
                  <a href="{{ $videoSectionDetails->video_section_url }}" class="video-popup" data-lity><i
                      class="fas fa-play"></i></a>
                @elseif ($isVideoSectionEmpty)
                  <div class="text-center py-5" style="color: #333;">
                    <h3>This is the Video section</h3>
                  </div>
                @endif
              </div>
            </div>
          @endif

          {{-- FAQ Section --}}
          @if (isset($home_sections->faq_section) && $home_sections->faq_section == 1)
            @php
              $isFaqSectionEmpty =
                  empty($home_text->faq_section_title) &&
                  empty($home_text->faq_section_subtitle) &&
                  (empty($faqs) || count($faqs) == 0);
            @endphp

            <div class="content-right">
              <div class="section-heading mb-30">
                @if ($isFaqSectionEmpty)
                  <h2 class="title">This is the FAQ section</h2>
                  <span class="tagline"></span>
                @else
                  @isset($home_text->faq_section_title)
                    <h2 class="title">{{ $home_text->faq_section_title }}</h2>
                  @endisset
                  <span class="tagline">{{ $home_text->faq_section_subtitle ?? null }}</span>
                @endif
              </div>

              @if (!$isFaqSectionEmpty)
                <div class="accordion" id="accordionFaqOne">
                  @foreach ($faqs as $key => $faq)
                    <div class="accordion-item {{ $key == 0 ? 'accordion-active' : '' }}">
                      <h5 class="accordion-title collapsed" data-toggle="collapse"
                        aria-expanded="{{ $key == 0 ? 'true' : 'false' }}"
                        data-target="#accordion-{{ $faq->id }}">
                        {{ $faq->question }}
                      </h5>
                      <div id="accordion-{{ $faq->id }}" class="collapse {{ $key == 0 ? 'show' : '' }}"
                        data-parent="#accordionFaqOne">
                        <div class="accordion-content">{{ $faq->answer }}</div>
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
  </div>
  <!--====== testimonial, Faq and Video  Section End ======-->

  <!--====== Blog Section Start ======-->
  @if (in_array('Blog', $packagePermissions) && isset($home_sections->blogs_section) && $home_sections->blogs_section == 1)
    @php
      $isBlogSectionEmpty =
          empty($home_text->blog_title) && empty($home_text->blog_subtitle) && (empty($blogs) || count($blogs) == 0);
    @endphp
    <section class="bg-color-primary-7 section-gap triangle-pattern-right">
      <div class="container">
        <div class="section-heading text-center mb-30">
          @if ($isBlogSectionEmpty)
            <h2 class="title">This is the Blog section</h2>
            <span class="tagline"></span>
          @else
            @if (!empty($home_text->blog_title))
              <h2 class="title">{{ $home_text->blog_title }}</h2>
            @endif
            <span class="tagline">{{ $home_text->blog_subtitle ?? null }}</span>
          @endif
        </div>

        @if (!$isBlogSectionEmpty)
          <div class="row justify-content-center">
            @foreach ($blogs as $blog)
              @if (!$loop->first && $loop->last)
                @continue
              @endif
              <div class="col-xl-6 col-lg-10 wow fadeInUp">
                <div class="latest-post-box thumbnail-left mt-30">
                  <div class="post-thumb">
                    <img data-src="{{ asset('assets/front/img/user/blogs/' . $blog->image) }}" class="lazy"
                      alt="">
                  </div>
                  <div class="post-content">
                    <h4 class="post-title">
                      <a
                        href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">{{ $blog->title }}</a>
                    </h4>
                    <div class="post-meta">
                      <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">
                        <i
                          class="far fa-calculator"></i>{{ \Carbon\Carbon::parse($blog->created_at)->toFormattedDateString() }}
                      </a>
                    </div>
                    <p>
                      {!! strlen(strip_tags($blog->content)) > 80
                          ? mb_substr(strip_tags($blog->content), 0, 80, 'UTF-8') . '...'
                          : strip_tags($blog->content) !!}
                    </p>
                    <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}"
                      class="template-btn bg-primary-10">{{ $keywords['Learn_More'] ?? 'Learn More' }}
                      <i class="far fa-long-arrow-right"></i></a>
                  </div>
                </div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
    </section>
  @endif
  <!--====== Blog Section End ======-->

@endsection
