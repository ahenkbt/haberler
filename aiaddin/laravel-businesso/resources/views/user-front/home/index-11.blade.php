@extends('user-front.layout')
@section('tab-title')
  {{ $keywords['Home'] ?? 'Home' }}
@endsection
@php
  Config::set('app.timezone', $userBs->timezoneinfo->timezone ?? '');
@endphp
@section('styles')
  @php
    $img = !empty($home_text->newsletter_snd_image)
        ? asset('assets/front/img/user/home_settings/' . $home_text->newsletter_snd_image)
        : asset('assets/front/img/themes/community-bg.jpg');
  @endphp
  <style>
    .testimonials-area,
    .pattren-bg,
    .features_v1::before {
      background: url(<?php echo asset('assets/front/img/themes/pattren-bg.png'); ?>) no-repeat;
      background-position: center center;
    }

    .features_v1 .single-box-item:before,
    .brand-partner-bg:before {
      background: url(<?php echo asset('assets/front/img/themes/hand.png'); ?>) no-repeat;
      background-position: center center;
    }
  </style>
@endsection
@section('meta-description', !empty($userSeo) ? $userSeo->home_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->home_meta_keywords : '')
@section('content')
  <!-- hero area html code -->
  <div class="hero-banner banner_v1">
    <div class="banner-bg">
      <img
        src="{{ empty($static->img) ? asset('assets/front/img/themes/D-static_banner.jpg') : asset('/assets/front/img/hero_static/' . $static->img) }}"
        alt="">
    </div>
    <div class="container">
      <div class="row">
        <div class="col-lg-6">
          {{-- @dd($static) --}}
          @if (empty($static->title) && empty($static->subtitle))
            <div class="hero-content">
              <span class="wow fadeInUp" data-wow-delay=".1s">{{ 'Charity is Priority' }} </span>
              <h1 class="wow fadeInUp" data-wow-delay=".2s">
                {{ 'Small efforts make big changes' }}</h1>
              <p class="wow fadeInUp" data-wow-delay=".3s">
                {{ 'Won fruit tree meat fourth tone give for the yieldinga behold fish night after lesser let firmament from and made. Divided he make fruitful shall had also give life without signs third.' }}
              </p>
              <a href="#" class="btn wow fadeInUp" data-wow-delay=".3s">{{ 'bcecome volunteer' }}</a>
              <a href="#" class="video video-icon wow fadeInUp"><i
                  class="flaticon-play-button"></i>{{ 'INTRO VIDEO' }}</a>
            </div>
          @else
            <div class="hero-content">
              <span class="wow fadeInUp" data-wow-delay=".1s">{{ !empty($static->title) ? $static->title : '' }}
              </span>
              <h1 class="wow fadeInUp" data-wow-delay=".2s">
                {{ !empty($static->subtitle) ? $static->subtitle : '' }}</h1>
              <p class="wow fadeInUp" data-wow-delay=".3s">
                {{ !empty($static->hero_text) ? $static->hero_text : '' }}
              </p>
              @if (!empty($static->btn_url))
                <a href="{{ $static->btn_url }}" class="btn wow fadeInUp"
                  data-wow-delay=".3s">{{ !empty($static->btn_name) ? $static->btn_name : '' }}</a>
              @endif
              @if (!empty($static->secound_btn_url))
                <a href="{{ $static->secound_btn_url }}" class="video video-icon wow fadeInUp"><i
                    class="flaticon-play-button"></i>{{ !empty($static->secound_btn_name) ? $static->secound_btn_name : '' }}</a>
              @endif
            </div>
          @endif
        </div>
      </div>
    </div>
  </div>
  @if (isset($home_sections->featured_section) && $home_sections->featured_section == 1)
    <!-- features-html-code -->

    <section class="features-area features_v1 features_eleven  pt-130 pb-140">
      <div class="container">
        <div class="row">
          <div class="col-md-6 offset-md-3">
            <div class="section-title mb-50 text-center">
              <span class="shape">{{ @$home_text->featured_section_title }}</span>
              <h2>{{ @$home_text->featured_section_subtitle }}</h2>
            </div>
          </div>
        </div>
        <div class="row">
          @if (count($features) == 0)
            <div class="col text-center pb-140">
              <h3>{{ $keywords['No_Feature_Found'] ?? __('No Feature Found') }} </h3>
            </div>
          @else
            @foreach ($features as $feature)
              <div class="col-lg-4 col-md-6">
                <div class="single-box-item  text-center" style="background-color: #{{ $feature->color }}">
                  <img src="{{ asset('assets/front/img/user/feature/') . '/' . $feature->icon }} " alt=""
                    class="features-icon">
                  <h3>{{ $feature->title }}</h3>
                  <p>{{ $feature->text }} </p>
                </div>
              </div>
            @endforeach
          @endif

        </div>
      </div>
    </section>
  @endif
  @if (isset($home_sections->intro_section) && $home_sections->intro_section == 1)
    <!-- service-area-html-code -->
    <section class="nusafe-service service_v1">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-lg-6 col-md-12">
            <div class="nusafe-img-box">
              <div class="nusafe-img">
                @if (isset($home_text))
                  <img
                    src="{{ empty($home_text->about_image) ? asset('assets/front/img/static_intro.jpg') : asset('assets/front/img/user/home_settings/') . '/' . $home_text->about_image }}"
                    alt="">
                @endif
              </div>
            </div>
          </div>
          <div class="col-lg-6 col-md-12">
            <div class="section-title">
              @if (isset($home_text))
                <h2>{{ $home_text->about_title }}</h2>
              @endif
              @if (isset($home_text) && !empty($home_text->about_button_url))
                <a href="{{ $home_text->about_button_url }}"
                  class="btn service-btn">{{ $home_text->about_button_text }}</a>
              @endif
              @if (isset($home_text) && $home_text->about_snd_button_url)
                <a href="{{ $home_text->about_snd_button_url }}"
                  class="btn service-btn">{{ $home_text->about_snd_button_text }}</a>
              @endif
              @if (isset($home_text))
                <p>{{ $home_text->about_content }}</p>
              @endif
            </div>
          </div>
        </div>
      </div>
    </section>
  @endif
  <!-- project-counter-area-html-code -->
  @if (isset($home_sections->counter_info_section) && $home_sections->counter_info_section == 1)
    <section class="counter-area counter_v1 pt-140 pb-120">
      <div class="container">

        @if (count($countInfos) == 0)
          <div class="row text-center">
            <div class="col">
              <h3 class="text-dark">
                {{ $keywords['no_information_found'] ?? __('No Counter Information Found') }}
                {{ '!' }}</h3>
            </div>
          </div>
        @else
          <div class="row">
            @foreach ($countInfos as $countInfo)
              <div class="col-lg-3 col-md-6">
                <div class="single-project-count">
                  <div class="counter-icon bg-1">
                    <i class="{{ $countInfo->icon }}"></i>
                  </div>
                  <div class="counter-text">
                    <h2 class="counter">{{ $countInfo->count }}</h2>
                    <h3>{{ $countInfo->title }}</h3>
                  </div>
                </div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
    </section>
  @endif
  @if (isset($home_sections->causes_section) && $home_sections->causes_section == 1)
    <!-- work-area-html-code -->
    <section class="work-area work-area-v1 pattren-bg pt-130 pb-60">
      <div class="container">
        <div class="row">
          <div class="col-lg-6 offset-lg-3">
            <div class="section-title text-center pb-70">
              <span class="shape">{{ @$home_text->causes_section_title }}</span>
              <h2>{{ @$home_text->causes_section_subtitle }}</h2>
            </div>
          </div>
        </div>
        <div class="row">
          @forelse ($causes as $cause)
            @if (!empty($cause->title))
              <div class="col-lg-4 col-md-6">
                <div class="single-work-box">
                  <div class="single-work-img">
                    <img src="{{ asset(\App\Constants\Constant::WEBSITE_CAUSE_IMAGE . '/' . $cause->image) }}"
                      alt="">
                  </div>
                  <div class="single-work-content">
                    <h3><a
                        href="{{ route('front.user.causesDetails', [getParam(), 'slug' => $cause->slug]) }}">{{ strlen($cause->title > 23) ? mb_substr($cause->title, 0, 23, 'UTF-8') . '...' : $cause->title }}</a>
                    </h3>
                    <div class="progress-bar-area">
                      <div class="progress-bar">
                        <div class="progress-bar-inner  wow slideInLeft"
                          style="width: {{ $cause->goal_percentage . '%' }}">
                          <div class="progress-bar-style"></div>
                        </div>
                      </div>
                    </div>

                    <div class="work-meta">
                      <span class="mission">{{ $keywords['goal'] . ':' ?? __('Goal') . ':' }}

                        @if ($userBs->base_currency_symbol_position == 'left')
                          {{ $userBs->base_currency_symbol . formatNumber($cause->goal_amount) }}
                        @elseif($userBs->base_currency_symbol_position == 'right')
                          {{ formatNumber($cause->goal_amount) . $userBs->base_currency_symbol }}
                        @endif
                      </span>
                      <span class="goal">{{ $keywords['raised'] . ':' ?? __('Raised') . ':' }}
                        @if ($userBs->base_currency_symbol_position == 'left')
                          {{ $userBs->base_currency_symbol . formatNumber($cause->raised_amount) }}
                        @elseif($userBs->base_currency_symbol_position == 'right')
                          {{ formatNumber($cause->raised_amount) . $userBs->base_currency_symbol }}
                        @endif

                      </span>
                    </div>
                    <h2 class="absolute-counter">{{ $cause->goal_percentage . '%' }}</h2>
                    <a href="{{ route('front.user.causesDetails', [getParam(), 'slug' => $cause->slug]) }}"
                      class="btn work-btn btn-bg-1">{{ $keywords['read_more'] ?? __('Read more') }}
                      <i class="fa fa-arrow-right"></i></a>
                  </div>
                </div>
              </div>
            @endif
          @empty
            <div class="col-12">
              <h3 class="text-dark text-center mb-30">
                {{ $keywords['no_information_found'] ?? __('No Cause  Found!') }}
              </h3>
              {{-- SPacer --}}
              <div class="pb-30"></div>
            </div>
          @endforelse

        </div>
      </div>
    </section>
  @endif
  @if (isset($home_sections->category_section) && $home_sections->category_section == 1)
    <!-- categories-area -->
    <section class="categories-area categories-area-v1 pt-130 pb-140">
      <div class="container">
        <div class="row">
          <div class="col-lg-6 offset-lg-3">
            <div class="section-title text-center mb-80">
              <span class="shape">{{ @$home_text->category_section_title }}</span>
              <h2>{{ @$home_text->category_section_subtitle }}</h2>
            </div>
          </div>
        </div>
        <div class="row">
          @forelse ($donationCategories as $category)
            <div class="col-lg-3 col-md-6">
              <a href="{{ route('front.user.causes', [getParam(), 'category' => $category->slug]) }}"
                class="single-categori-item categori-bg-1 bg-image"
                style="background-image: url({{ empty($category->image) ? asset('/img/faculty/1.jpg') : asset(\App\Constants\Constant::WEBSITE_CAUSE_CATEGORY_IMAGE . '/' . $category->image) }});">
                <i class="{{ $category->icon }}"></i>
                <h3>{{ $category->name }}</h3>
                <p>{{ $category->short_description }}</p>
              </a>
            </div>
          @empty
            <div class="col-12">
              <h3 class="text-dark text-center">
                {{ $keywords['no_information_found'] ?? __('No Category  Found!') }} </h3>
            </div>
          @endforelse

        </div>
      </div>
    </section>
  @endif
  @if (isset($home_sections->testimonials_section) && $home_sections->testimonials_section == 1)
    <!-- testimonials-area- -->
    <section class="testimonials-area testimonials_v1 pattren-bg pt-135 pb-250">
      <div class="container">
        <div class="row">
          <div class="col-md-6">
            <div class="section-title testimonial_title pb-30">
              <span class="span-border">{{ @$home_text->testimonial_title }}</span>
              <h2>{{ $home_text->testimonial_subtitle ?? null }}</h2>
            </div>
          </div>
        </div>
        @if (count($testimonials) == 0)
          <div class="row text-center">
            <div class="col">
              <h3>{{ $keywords['NO_TESTIMONIAL_FOUND'] ?? __('No Testimonial Found!') }}
              </h3>
            </div>
          </div>
        @else
          <div class="testimonial-carousel">
            @foreach ($testimonials as $testimonial)
              <div class="single-testimonial-item">
                <div class="row align-items-center">
                  <div class="col-lg-8 col-md-12">
                    <div class="testimonial-content">
                      <p>{{ replaceBaseUrl($testimonial->content) }}</p>
                      <h2 class="author-details">{{ $testimonial->name }} <span> _
                          {{ convertUtf8($testimonial->occupation) ?? null }} </span> </h2>
                    </div>
                  </div>
                  <div class="col-lg-4 col-md-12">
                    <div class="author-img">
                      <img src="{{ asset('assets/front/img/user/testimonials/' . $testimonial->image) }}"
                        alt="">
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
  @if (isset($home_sections->brand_section) && $home_sections->brand_section == 1)
    <!-- brand-partner-area-html-code -->
    <section class="brand-partner-area partner-area-v1 pb-130">
      <div class="container">
        <div class="row no-gutters">
          <div class="col-md-3">
            <div class="brand-partner-bg">
              <h2> {{ @$home_text->donor_title }} </h2>
            </div>
          </div>
          <div class="col-md-9">
            <div class="single-brand-img-area">
              <div class="brand-slider-1">
                @foreach ($brands as $brand)
                  <div class="single-brand">
                    <a href="{{ $brand->brand_url }}">
                      <img src="{{ asset('assets/front/img/user/brands/' . $brand->brand_img) }}" class="img-fluid"
                        alt="">
                    </a>
                  </div>
                @endforeach
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  @endif

  @if (in_array('Blog', $packagePermissions) && isset($home_sections->blogs_section) && $home_sections->blogs_section == 1)
    <!-- blog-aria-html-code -->
    <section class="nusafe-blog blog-v1 pb-140">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-6">
            <div class="section-title text-center mb-80">
              <span class="shape">{{ @$home_text->blog_title }} </span>
              <h2>{{ @$home_text->blog_subtitle }}</h2>
            </div>
          </div>
        </div>
        <div class="row">
          @forelse ($blogs as $blog)
            <div class="col-lg-6 col-md-12">
              <div class="blog-list">
                <div class="blog-box">
                  <div class="blog-img">
                    <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">
                      <img src="{{ asset('assets/front/img/user/blogs/' . $blog->image) }}" class="img-fluid"
                        alt="">
                    </a>

                  </div>
                  <div class="blog-content">
                    <a href="{{ route('front.user.blogs', [getParam(), 'category' => $blog->bcategory->id]) }}">
                      <span class="tag">{{ $blog->bcategory->name }}</span> </a>

                    <h3><a
                        href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">{{ $blog->title }}</a>
                    </h3>
                    <div class="blog-meta">
                      <span><i class="ti-calendar"></i>
                        {{ \Carbon\Carbon::parse($blog->created_at)->toFormattedDateString() }}
                      </span>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          @empty
            <div class="col-12">
              <h3 class="text-dark text-center">
                {{ $keywords['no_information_found'] ?? __('No Blog  Found') }}
                {{ '!' }}</h3>
            </div>
          @endforelse

        </div>
      </div>
    </section>
  @endif
@endsection
