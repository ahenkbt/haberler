@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Home'] ?? 'Home' }}
@endsection
@php
  Config::set('app.timezone', $userBs->timezoneinfo->timezone);
@endphp
@section('styles')
  @php
    $img = !empty($home_text->newsletter_snd_image)
        ? asset('assets/front/img/user/home_settings/' . $home_text->newsletter_snd_image)
        : asset('assets/front/img/themes/community-bg.jpg');
  @endphp
  <style>
    .community-area::before {
      background-image: url(<?php echo $img; ?>);
    }
  </style>
@endsection
@section('meta-description', !empty($userSeo) ? $userSeo->home_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->home_meta_keywords : '')

@section('content')
  <!--====== BANNER PART START ======-->
  <section class="banner-area bg_cover lazy"
    data-bg="{{ empty($static->img) ? asset('assets/front/img/themes/C-static_banner.jpg') : asset('/assets/front/img/hero_static/' . $static->img) }}">
    <div class="container">
      <div class="row">
        <div class="col-lg-7">
          <div class="banner-content">

            @if (empty($static->title) && empty($static->subtitle) && empty($static->img))
              <span>{{ __('COURSELA DIGITAL INSTITUTE') }} </span>
              <h1 class="title"> {{ __('The New Way to Learn') }}
              </h1>
              <ul>
                <li><a class="main-btn" href="javaScript:Void(0)">
                    {{ __('Our Courses') }}</a></li>
                <li> <a class="main-btn-2 main-btn" href="javaScript:Void(0)">{{ __('Meet Instructors') }}</a>
                </li>
              </ul>
            @else
              <span>{{ @$static->title }} </span>
              <h1 class="title"> {{ @$static->subtitle }}
              </h1>
              <ul>

                @if (!empty($static->btn_url))
                  <li><a class="main-btn" href="{{ $static->btn_url }}">
                      {{ @$static->btn_name }}</a></li>
                @endif
                @if (!empty($static->secound_btn_url))
                  <li> <a class="main-btn-2 main-btn"
                      href="{{ $static->secound_btn_url }}">{{ @$static->secound_btn_name }}</a>
                  </li>
                @endif

              </ul>
            @endif
          </div>
        </div>
      </div>
    </div>
    <div class="banner-shape-1">
      <img src="{{ asset('assets/front/img/themes/shapes/item-1.png') }}" alt="shape">
    </div>
    <div class="banner-shape-2">
      <img src=" {{ asset('assets/front/img/themes/shapes/item-2.png') }}" alt="shape">
    </div>
  </section>
  <!--====== BANNER PART ENDS ======-->

  <!--====== DREAM COURSE PART START ======-->
  <div class="dream-course-area">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-10">
          <div class="dream-course-content">
            <div class="dream-course-title text-center">
              <span>{{ $keywords['find_your_dream_course'] ?? __('Find Your Dream Course') }}</span>
            </div>
            <form action="{{ route('front.user.courses', getParam()) }}" method="GET">
              <div class="dream-course-search d-flex">
                <div class="input-box">
                  <i class="fal fa-search"></i>
                  <input type="text" name="keyword"
                    placeholder="{{ $keywords['search_course'] ?? __('Search Course Here') }}">
                </div>

                @if (count($categories) > 0)
                  <div class="dream-course-category d-none d-lg-inline-block">
                    <select name="category">
                      <option selected disabled>
                        {{ $keywords['Select_a_Category'] ?? __('Select a Category') }}</option>
                      @foreach ($categories as $category)
                        <option value="{{ $category->slug }}">{{ $category->name }}</option>
                      @endforeach
                    </select>
                  </div>
                @endif

                <div class="dream-course-btn">
                  <button type="submit">{{ $keywords['find_course'] ?? __('Find Course') }}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!--====== DREAM COURSE PART ENDS ======-->

  <!--====== SERVICES  PART START ======-->
  @if (isset($home_sections->category_section) && $home_sections->category_section == 1)
    @php
      $isCategoryTitleEmpty = empty($home_text->category_section_title);
      $isCategoriesEmpty = empty($categories) || count($categories) == 0;
    @endphp

    <section class="services-area pb-120">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-11">
            <div class="section-title text-center">
              @if ($isCategoryTitleEmpty)
                <h3 class="title">This is the Category section</h3>
              @else
                <h3 class="title">{{ $home_text->category_section_title }}</h3>
              @endif
            </div>
          </div>
        </div>

        @if ($isCategoriesEmpty)
          <div class="row text-center">
            <div class="col">
              <h3>{{ $keywords['no_course_category_found'] ?? __('No Course Category Found!') }}</h3>
            </div>
          </div>
        @else
          <div class="services-border">
            <div class="row no-gutters">
              @foreach ($categories as $category)
                <div class="col-lg-3 col-md-6 col-sm-6">
                  <a class="single-services text-center d-block"
                    href="{{ route('front.user.courses', [getParam(), 'category' => $category->slug]) }}">
                    <i class="{{ $category->icon }}" style="color: {{ '#' . $category->color }};"></i>
                    <h5 class="title">{{ $category->name }}</h5>
                  </a>
                </div>
              @endforeach
            </div>
          </div>
        @endif
      </div>
    </section>
  @endif

  <!--====== SERVICES  PART ENDS ======-->

  <!--====== OFFER PART START ======-->
  @if (isset($home_sections->call_to_action_section_status) && $home_sections->call_to_action_section_status == 1)
    @php
      $isCallToActionEmpty =
          empty($callToActionInfo) ||
          (empty($callToActionInfo->first_title) &&
              empty($callToActionInfo->second_title) &&
              empty($callToActionInfo->first_button) &&
              empty($callToActionInfo->first_button_url) &&
              empty($callToActionInfo->second_button) &&
              empty($callToActionInfo->second_button_url));
    @endphp

    <section class="offer-area bg_cover pt-110 pb-120 lazy"
      data-bg="{{ $isCallToActionEmpty
          ? asset('assets/front/img/themes/offer-bg.jpg')
          : asset(\App\Constants\Constant::WEBSITE_ACTION_SECTION_IMAGE . '/' . $callToActionInfo->background_image) }}">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-11">
            <div class="offer-content text-center">
              @if ($isCallToActionEmpty)
                <span>This is the Call to Action section</span>
                <h1 class="title">Your compelling offer goes here</h1>
                <ul>
                  <li><a class="main-btn" href="#">Primary Action</a></li>
                  <li><a class="main-btn-2 main-btn" href="#">Secondary Action</a></li>
                </ul>
              @else
                <span>{{ $callToActionInfo->first_title ?? '' }}</span>
                <h1 class="title">{{ $callToActionInfo->second_title ?? '' }}</h1>
                <ul>
                  @if (!empty($callToActionInfo->first_button) && !empty($callToActionInfo->first_button_url))
                    <li><a class="main-btn"
                        href="{{ $callToActionInfo->first_button_url }}">{{ $callToActionInfo->first_button }}</a>
                    </li>
                  @endif

                  @if (!empty($callToActionInfo->second_button) && !empty($callToActionInfo->second_button_url))
                    <li><a class="main-btn-2 main-btn"
                        href="{{ $callToActionInfo->second_button_url }}">{{ $callToActionInfo->second_button }}</a>
                    </li>
                  @endif
                </ul>
              @endif
            </div>
          </div>
        </div>
      </div>
    </section>
  @endif
  <!--====== OFFER PART ENDS ======-->

  <!--====== ADVANCE COURSES PART START ======-->
  @if (isset($home_sections->featured_courses_section_status) && $home_sections->featured_courses_section_status == 1)
    @php
      $isFeaturedCourseTitleEmpty = empty($home_text->featured_course_section_title);
      $isCoursesEmpty = empty($courses) || count($courses) == 0;
    @endphp

    <section class="advance-courses-area pb-120">
      <div class="container">
        <div class="row">
          <div class="col-lg-7">
            <div class="section-title">
              @if ($isFeaturedCourseTitleEmpty)
                <h3 class="title">This is the Featured Courses section</h3>
              @else
                <h3 class="title">{{ $home_text->featured_course_section_title }}</h3>
              @endif
            </div>
          </div>
        </div>

        @if ($isCoursesEmpty)
          <div class="row text-center">
            <div class="col">
              <h3>{{ $keywords['no_featured_course_found'] ?? __('No Featured Course Found') }}!</h3>
            </div>
          </div>
        @else
          <div class="courses-active">
            @foreach ($courses as $course)
              <div class="single-courses mt-30">
                <div class="courses-thumb">
                  <a class="d-block"
                    href="{{ route('front.user.course.details', [getParam(), 'slug' => $course->slug]) }}">
                    <img
                      data-src="{{ asset(\App\Constants\Constant::WEBSITE_COURSE_THUMBNAIL_IMAGE . '/' . $course->thumbnail_image) }}"
                      class="lazy" alt="image"></a>

                  <div class="corses-thumb-title">
                    <a class="category"
                      href="{{ route('front.user.courses', [getParam(), 'category' => $course->categorySlug]) }}">{{ $course->categoryName }}</a>
                  </div>
                </div>

                <div class="courses-content">
                  <a href="{{ route('front.user.course.details', [getParam(), 'slug' => $course->slug]) }}">
                    <h4 class="title">
                      {{ strlen($course->title) > 45 ? mb_substr($course->title, 0, 45, 'UTF-8') . '...' : $course->title }}
                    </h4>
                  </a>
                  <div class="courses-info d-flex justify-content-between">
                    <div class="item">
                      <img
                        data-src="{{ asset(\App\Constants\Constant::WEBSITE_INSTRUCTOR_IMAGE . '/' . $course->instructorImage) }}"
                        class="lazy" alt="instructor">
                      <p>
                        {{ strlen($course->instructorName) > 10 ? mb_substr($course->instructorName, 0, 10, 'utf-8') . '...' : $course->instructorName }}
                      </p>
                    </div>

                    <div class="price">
                      @if ($course->pricing_type == 'premium')
                        <span>{{ $currencyInfo->base_currency_symbol_position == 'left' ? $currencyInfo->base_currency_symbol : '' }}{{ formatNumber($course->current_price) }}{{ $currencyInfo->base_currency_symbol_position == 'right' ? $currencyInfo->base_currency_symbol : '' }}</span>

                        @if (!is_null($course->previous_price))
                          <span
                            class="pre-price">{{ $currencyInfo->base_currency_symbol_position == 'left' ? $currencyInfo->base_currency_symbol : '' }}{{ formatNumber($course->previous_price) }}{{ $currencyInfo->base_currency_symbol_position == 'right' ? $currencyInfo->base_currency_symbol : '' }}</span>
                        @endif
                      @else
                        <span>{{ $keywords['free'] ?? __('Free') }}</span>
                      @endif
                    </div>
                  </div>
                  <ul class="d-flex justify-content-center">
                    <li><i class="fal fa-users"></i>
                      {{ $course->enrolmentCount . ' ' }}
                      {{ $keywords['students'] ?? __('Students') }}
                    </li>

                    @php
                      $period = $course->duration;
                      $array = explode(':', $period);
                      $hour = $array[0];
                      $courseDuration = \Carbon\Carbon::parse($period);
                    @endphp

                    <li><i class="fal fa-clock"></i>
                      {{ $hour == '00' ? '00' : $courseDuration->format('h') }}h
                      {{ $courseDuration->format('i') }}m</li>
                  </ul>
                </div>
              </div>
            @endforeach
          </div>
        @endif

        @if (is_array($packagePermissions) && in_array('Advertisement', $packagePermissions))
          @if (!empty(showAd(3)))
            <div class="text-center mt-5">
              {!! showAd(3) !!}
            </div>
          @endif
        @endif

      </div>
    </section>
  @endif

  <!--====== ADVANCE COURSES PART ENDS ======-->

  <!--====== FEATURES PART START ======-->
  @if (isset($home_sections->featured_section) && $home_sections->featured_section == 1)
    @php
      $isFeaturesEmpty = empty($features) || count($features) == 0;
      $bgImage = !empty($featuredImage)
          ? asset(\App\Constants\Constant::WEBSITE_FEATURE_SECTION_IMAGE . '/' . $featuredImage)
          : asset('assets/front/img/themes/features-bg.jpg');
    @endphp

    @if ($isFeaturesEmpty)
      <section class="features-area gray-bg py-5">
        <div class="container">
          <div class="row text-center">
            <div class="col">
              <h3>{{ $keywords['No_Feature_Found'] ?? __('No Feature Found') }}</h3>
            </div>
          </div>
        </div>
      </section>
    @else
      <section class="features-area gray-bg bg_cover lazy" data-bg="{{ $bgImage }}">
        <div class="container-fluid">
          <div class="features-margin pl-70 pr-70">
            <div class="row">
              <div class="col-lg-9">
                <div class="row">
                  @foreach ($features as $feature)
                    <div class="col-lg-6 col-md-6">
                      <div class="single-features mt-30" style="background: {{ '#' . $feature->background_color }};">
                        <h4 class="title">{{ $feature->title }}</h4>
                        <p>{{ $feature->text }}</p>
                      </div>
                    </div>
                  @endforeach
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    @endif
  @endif

  <!--====== FEATURES PART ENDS ======-->

  <!--====== PLAY PART START ======-->
  @if (isset($home_sections->video_section) && $home_sections->video_section == 1)
    <section class="play-area">
      <div class="container">
        <div class="row">
          <div class="col-lg-12">
            <div class="play-thumb">
              @php
                $hasVideoData = !empty($videoData);
                $videoImage =
                    $hasVideoData && !empty($videoData->video_section_image)
                        ? asset('assets/front/img/user/home_settings/' . $videoData->video_section_image)
                        : asset('assets/front/img/themes/play-thumb.png');
                $videoUrl =
                    $hasVideoData && !empty($videoData->video_section_url) ? $videoData->video_section_url : '#';
              @endphp

              <img data-src="{{ $videoImage }}" class="lazy" alt="image">

              <div class="play-btn">
                <a href="{{ $videoUrl }}" class="video-popup"><i class="fas fa-play"></i></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  @endif

  <!--====== PLAY PART ENDS ======-->

  <!--====== COUNTER PART START ======-->
  @if (isset($home_sections->counter_info_section) && $home_sections->counter_info_section == 1)
    @php
      $isCountInfosEmpty = empty($countInfos) || count($countInfos) == 0;
      $bgImage = !empty($home_text->counter_section_image)
          ? asset('assets/front/img/user/home_settings/' . $home_text->counter_section_image)
          : asset('assets/front/img/themes/counter-bg.jpg');
    @endphp

    <section class="counter-area bg_cove lazy" data-bg="{{ $bgImage }}">
      <div class="container">
        @if ($isCountInfosEmpty)
          <div class="row text-center">
            <div class="col">
              <h3 class="text-light">{{ $keywords['no_information_found'] ?? __('No Information Found!') }}
              </h3>
            </div>
          </div>
        @else
          <div class="row">
            @foreach ($countInfos as $countInfo)
              <div class="col-lg-3 col-md-6 col-sm-6">
                <div class="counter-item text-center pt-40">
                  <h3 class="title"><span class="counter">{{ $countInfo->count }}</span>+</h3>
                  <span>{{ $countInfo->title }}</span>
                </div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
      <div class="counter-dot">
        <img src="{{ asset('assets/front/img/themes/counter-dot.png') }}" alt="dot">
      </div>
    </section>
  @endif

  <!--====== COUNTER PART ENDS ======-->

  \ <!--====== TESTIMONIALS PART START ======-->
  @if (isset($home_sections->testimonials_section) && $home_sections->testimonials_section == 1)
    <section class="testimonials-area  overlay pb-115 bg_cover lazy"
      data-bg="{{ !empty($home_text->testimonial_image) ? asset('assets/front/img/user/home_settings/' . $home_text->testimonial_image) : asset('assets/front/img/themes/testimonials-pattern.png') }}">
      <div class="container">
        @if (count($testimonials) == 0)
          <div class="row text-center">
            <div class="col">
              <h3>{{ $keywords['no_testimonial_found'] ?? __('No Testimonial Found') }} {{ '!' }}
              </h3>
            </div>
          </div>
        @else
          <div class="row testimonials-active">
            @foreach ($testimonials as $testimonial)
              <div class="col-lg-12">
                <div class="testimonials-content text-center">
                  <i class="fas fa-quote-left"></i>
                  <p>{!! replaceBaseUrl($testimonial->content) !!}</p>
                  <img data-src="{{ asset('assets/front/img/user/testimonials/' . $testimonial->image) }}"
                    class="lazy" alt="client">
                  <h5>{{ $testimonial->name }}</h5>
                  <span>{{ convertUtf8($testimonial->occupation) ?? null }}</span>
                </div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
    </section>
  @endif
  <!--====== TESTIMONIALS PART ENDS ======-->
  @if (isset($home_sections->newsletter_section) && $home_sections->newsletter_section == 1)
    <!--======COMMUNITY PART START ======-->
    <section class="community-area">

      <div class="container">
        <div class="row">
          <div class="col-lg-7">
            <div class="community-content">
              <h3 class="title">{{ @$home_text->newsletter_title }}</h3>
              <p class="mt-3">{{ @$home_text->newsletter_subtitle }}</p>

              <form class="newsletter-form" action="{{ route('front.user.subscriber', getParam()) }}" method="POST">
                @csrf
                <div class="input-box">
                  <input type="email" placeholder="{{ $keywords['Email_Address'] ?? 'Email Address' }}"
                    name="subscriber_email" value="{{ old('subscriber_email') }}">
                  @if ($errors->has('subscriber_email'))
                    <small class="text-danger">{{ $errors->first('subscriber_email') }}</small>
                  @endif
                  <button type="submit">{{ $keywords['Subscribe'] ?? 'Subscribe' }}</button>
                </div>
                <div class="form-group mt-3 ">
                  @if ($userBs->is_recaptcha == 1)
                    <div class="d-block mb-4">
                      {!! NoCaptcha::renderJs() !!}
                      {!! NoCaptcha::display() !!}
                      @error('g-recaptcha-response')
                        <p id="errg-recaptcha-response"class=" text-danger err-g-recaptcha-response mt-2">
                          {{ $message }}
                        </p>
                      @enderror
                    </div>
                  @endif
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div class="community-thumb d-none d-lg-block">
        <img
          src="{{ !empty($home_text->newsletter_image) ? asset('assets/front/img/user/home_settings/' . $home_text->newsletter_image) : asset('assets/front/img/themes/community-thumb.jpg') }}  "
          alt="community">
      </div>


    </section>
    <!--======COMMUNITY PART ENDS ======-->
  @endif
@endsection
