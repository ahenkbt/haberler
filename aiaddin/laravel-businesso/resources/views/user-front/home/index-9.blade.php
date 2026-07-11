@extends('user-front.layout')
@section('tab-title')
  {{ $keywords['Home'] ?? 'Home' }}
@endsection
@php
  Config::set('app.timezone', $userBs->timezoneinfo->timezone ?? '');
@endphp
@section('meta-description', !empty($userSeo) ? $userSeo->home_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->home_meta_keywords : '')
@section('content')
  <!-- Main Wrap start -->
  <main>
    <!-- Hero Section Start -->
    <section class="hero-section" id="heroSlideActive">
      @if (count($sliders) > 0)
        @foreach ($sliders as $key => $slider)
          <div>
            <div class="single-hero-slide bg-img-center d-flex align-items-center text-center lazy"
              data-bg="{{ asset('assets/front/img/hero_slider/' . $slider->img) }}">
              <div class="container">
                <div class="slider-text">
                  <span class="small-text" data-animation="fadeInDown" data-delay=".3s">{{ $slider->title }}</span>
                  <h1 data-animation="fadeInLeft" data-delay=".6s">{{ $slider->subtitle }}</h1>
                  <a class="btn filled-btn" href="{{ $slider->btn_url }}" data-animation="fadeInUp" data-delay=".9s">
                    {{ $slider->btn_name }}
                    <i class="far fa-long-arrow-right"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        @endforeach
      @else
        <div class="single-hero-slide bg-img-center d-flex align-items-center text-center lazy"
          data-bg="{{ asset('assets/front/img/theme9/bg/hero-bg-1.jpg') }}">
          <div class="container">
            <div class="slider-text">
              <span class="small-text" data-animation="fadeInDown" data-delay=".3s">{{ __('Welcome to Hotelia') }}</span>
              <h1 data-animation="fadeInLeft" data-delay=".6s">{{ __('Luxury Living') }}</h1>
              <a class="btn filled-btn" href="#" data-animation="fadeInUp" data-delay=".9s">
                {{ __('get started') }}
                <i class="far fa-long-arrow-right"></i>
              </a>
            </div>
          </div>
        </div>
        <div class="single-hero-slide bg-img-center d-flex align-items-center text-center lazy"
          data-bg="{{ asset('assets/front/img/theme9/bg/hero-bg-2.jpg') }}">
          <div class="container">
            <div class="slider-text">
              <span class="small-text" data-animation="fadeInDown" data-delay=".3s">{{ __('Welcome to Hotelia') }}</span>
              <h1 data-animation="fadeInLeft" data-delay=".6s">{{ __('Luxury Living') }}</h1>
              <a class="btn filled-btn" href="#" data-animation="fadeInUp" data-delay=".9s">
                {{ __('get started') }}
                <i class="far fa-long-arrow-right"></i>
              </a>
            </div>
          </div>
        </div>
      @endif
    </section>
    <!-- End Hero Section -->

    <!-- Book Form Start -->
    <section class="booking-section">
      <div class="container">
        <div class="booking-form-wrap bg-img-center section-bg">
          <form action="{{ route('front.user.rooms', [getParam()]) }}" method="GET">
            @csrf
            <div class="row no-gutters">
              <div class="col-lg-3 col-md-6">
                <div class="input-wrap">
                  <input type="text"
                    placeholder="{{ $keywords['Check_In_/_Out_Date'] ?? __('Check In / Out Date') }} " id="date-range"
                    name="dates" readonly="">
                  <i class="far fa-calendar-alt"></i>
                </div>
              </div>
              <div class="col-lg-2 col-md-6">
                <div class="input-wrap">
                  <select name="beds" class="nice-select">
                    <option selected="" disabled="">{{ $keywords['Beds'] ?? 'Beds' }}</option>
                    @for ($i = 1; $i <= $numOfBed; $i++)
                      <option value="{{ $i }}">{{ $i }}</option>
                    @endfor
                  </select>
                </div>
              </div>
              <div class="col-lg-2 col-md-6">
                <div class="input-wrap">
                  <select name="baths" class="nice-select">
                    <option selected="" disabled="">{{ $keywords['Baths'] ?? 'Baths' }}</option>
                    @for ($i = 1; $i <= $numOfBath; $i++)
                      <option value="{{ $i }}">{{ $i }}</option>
                    @endfor
                  </select>
                </div>
              </div>
              <div class="col-lg-2 col-md-6">
                <div class="input-wrap">
                  <select name="guests" class="nice-select">
                    <option selected="" disabled="">{{ $keywords['Guests'] ?? 'Guests' }}
                    </option>
                    @for ($i = 1; $i <= $numOfGuest; $i++)
                      <option value="{{ $i }}">{{ $i }}</option>
                    @endfor
                  </select>
                </div>
              </div>
              <div class="col-lg-3 col-md-6">
                <div class="input-wrap">
                  <button type="submit" class="btn filled-btn btn-block rounded-0">
                    {{ $keywords['search'] ?? 'search' }}
                    <i class="far fa-long-arrow-right"></i>
                  </button>
                </div>
              </div>
            </div>
          </form>
          <div class="booking-shape-1">
            <img class="lazy" data-src=" {{ asset('assets/front/img/theme9/') }}/shape/01.png" alt="shape">
          </div>
          <div class="booking-shape-2">
            <img class="lazy" data-src="{{ asset('assets/front/img/theme9/') }}/shape/02.png" alt="shape">
          </div>
          <div class="booking-shape-3">
            <img class="lazy" data-src="{{ asset('assets/front/img/theme9/') }}/shape/03.png" alt="shape">
          </div>
        </div>
      </div>
    </section>
    <!-- Book Form End -->

    <!-- Latest About Section -->
    @if (isset($home_sections->intro_section) && $home_sections->intro_section == 1)
      @php
        $isIntroEmpty =
            empty($home_text->about_title) &&
            empty($home_text->about_subtitle) &&
            empty($home_text->about_content) &&
            empty($home_text->about_image);

        $isCounterEmpty = empty($counterInformations) || count($counterInformations) == 0;
      @endphp

      <section class="welcome-section section-padding">
        <div class="container">
          <div class="row align-items-center no-gutters">
            <!-- Title Gallery Start -->
            <div class="col-lg-6">
              <div class="title-gallery">
                <img class="lazy"
                  data-src="{{ empty($home_text->about_image) ? asset('assets/front/img/theme9/tile-gallery/1.jpg') : asset('assets/front/img/user/home_settings/' . $home_text->about_image) }}"
                  alt="image">
              </div>
            </div>
            <!-- Title Gallery End -->

            <div class="col-lg-5 offset-lg-1">
              <!-- Section Title -->
              <div class="section-title">
                @if ($isIntroEmpty)
                  <span class="title-top with-border">This is the Intro section</span>
                  <h1>Welcome to our website</h1>
                  <p>Intro content will appear here once added.</p>
                @else
                  @isset($home_text->about_title)
                    <span class="title-top with-border">{{ $home_text->about_title }}</span>
                  @endisset
                  @isset($home_text->about_subtitle)
                    <h1>{{ $home_text->about_subtitle }}</h1>
                  @endisset
                  @isset($home_text->about_content)
                    <p>{{ $home_text->about_content }}</p>
                  @endisset
                @endif
              </div>
              @if (isset($home_sections->counter_info_section) && $home_sections->counter_info_section == 1)
                <!-- Counter Start -->
                <div class="counter">
                  @if ($isCounterEmpty)
                    <div class="row justify-content-center py-5">
                      <div class="col-12 text-center">
                        <h4>This is the Counter Info section</h4>
                      </div>
                    </div>
                  @else
                    <div class="row">
                      @foreach ($counterInformations as $key => $counterInformation)
                        <div class="col-sm-4">
                          <div class="counter-box">
                            <i class="{{ $counterInformation->icon }}"></i>
                            <span class="counter-number">{{ $counterInformation->count }}</span>
                            <p>{{ $counterInformation->title }}</p>
                          </div>
                        </div>
                      @endforeach
                    </div>
                  @endif
                </div>
                <!-- Counter End -->
              @endif
            </div>
          </div>

        </div>
      </section>
    @endif

    <!-- Latest About Section Ends -->

    <!-- Latest Room Section Start -->
    @if (isset($home_sections->rooms_section) && $home_sections->rooms_section == 1)
      @php
        $isRoomsTextEmpty =
            empty($home_text->rooms_section_title) &&
            empty($home_text->rooms_section_subtitle) &&
            empty($home_text->rooms_section_content);

        $isRoomsEmpty = empty($rooms) || count($rooms) == 0;
      @endphp

      <section class="latest-room section-bg section-padding">
        <div class="container-fluid">
          <div class="row align-items-center no-gutters">
            <div class="col-lg-3">
              <!-- Section Title -->
              <div class="section-title">
                @if ($isRoomsTextEmpty)
                  <span class="title-top with-border">This is the Rooms section</span>
                  <h1>Rooms will be displayed here</h1>
                  <p>Room details and descriptions will appear once added.</p>
                @else
                  @isset($home_text->rooms_section_title)
                    <span class="title-top with-border">{{ convertUtf8($home_text->rooms_section_title) }}</span>
                  @endisset

                  @isset($home_text->rooms_section_subtitle)
                    <h1>{!! convertUtf8($home_text->rooms_section_subtitle) !!}</h1>
                  @endisset

                  @isset($home_text->rooms_section_content)
                    <p>{{ convertUtf8($home_text->rooms_section_content) }}</p>
                  @endisset
                @endif

                @if (!$isRoomsEmpty)
                  <!-- Page Info -->
                  <div class="page-Info"></div>
                @endif
                <!-- Room Arrow -->
                <div class="room-arrows"></div>
              </div>
            </div>

            <div class="col-lg-8 offset-lg-1">
              @if ($isRoomsEmpty)
                <div class="text-center py-5">
                  <h4>No rooms available at the moment.</h4>
                </div>
              @else
                <div class="latest-room-slider" id="roomSliderActive">
                  @foreach ($rooms as $room)
                    @if (!is_null($room->room))
                      <div class="single-room">
                        <a class="room-thumb d-block"
                          href="{{ route('front.user.room_details', [getParam(), $room->room_id, $room->slug]) }}">
                          <img class="lazy"
                            data-src="{{ asset('assets/img/rooms/feature-images/' . $room->room->featured_img) }}"
                            alt="">
                          <div class="room-price">
                            <p>
                              {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                              {{ formatNumber($room->room->rent) }}
                              {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                              / {{ $keywords['Night'] ?? 'Night' }}
                            </p>
                          </div>
                        </a>
                        <div class="room-desc">
                          @if ($roomSetting->room_category_status == 1)
                            <div class="room-cat">
                              <a class="d-block p-0"
                                href="{{ route('front.user.rooms', [getParam(), 'category' => $room->id]) }}">{{ $room->roomCategory->name }}
                              </a>
                            </div>
                          @endif
                          <h4>
                            <a
                              href="{{ route('front.user.room_details', [getParam(), $room->room_id, $room->slug]) }}">{{ convertUtf8($room->title) }}</a>
                          </h4>
                          <p>{{ $room->summary }}</p>
                          <ul class="room-info">
                            <li>
                              <i class="far fa-bed"></i>{{ $room->room->bed }}
                              {{ $room->room->bed == 1 ? $keywords['Bed'] ?? 'Bed' : $keywords['Beds'] ?? 'Beds' }}
                            </li>
                            <li>
                              <i class="far fa-bath"></i>{{ $room->room->bath }}
                              {{ $room->room->bath == 1 ? $keywords['Bath'] ?? 'Bath' : $keywords['Baths'] ?? 'Baths' }}
                            </li>
                            @if (!empty($room->room->max_guests))
                              <li><i class="far fa-users"></i>{{ $room->room->max_guests }}
                                {{ $room->room->max_guests == 1 ? $keywords['Guest'] ?? 'Guest' : $keywords['Guests'] ?? 'Guests' }}
                              </li>
                            @endif
                          </ul>
                        </div>
                      </div>
                    @endif
                  @endforeach
                </div>
              @endif
            </div>
          </div>
        </div>
      </section>
    @endif

    <!-- Latest Room Section End -->

    <!-- Service Section Start -->
    @if (isset($home_sections->featured_services_section) && $home_sections->featured_services_section == 1)
      @php
        $isServiceSectionEmpty =
            empty($home_text->service_title) &&
            empty($home_text->service_subtitle) &&
            (empty($services) || count($services) == 0);
      @endphp

      <section class="service-section section-padding">
        <div class="container">
          <!-- Section Title -->
          <div class="section-title text-center">
            <div class="row justify-content-center">
              <div class="col-lg-7">
                @if ($isServiceSectionEmpty)
                  <span class="title-top">This is the Services section</span>
                  <h1>Services will be displayed here</h1>
                @else
                  @isset($home_text->service_title)
                    <span class="title-top">{{ convertUtf8($home_text->service_title) }}</span>
                  @endisset
                  @isset($home_text->service_subtitle)
                    <h1>{!! $home_text->service_subtitle !!}</h1>
                  @endisset
                @endif
              </div>
            </div>
          </div>

          <!-- Service Boxes -->
          @if (!$isServiceSectionEmpty)
            <div class="row">
              @foreach ($services as $service)
                <div class="col-lg-4 col-md-6">
                  <div class="single-service-box text-center wow fadeIn animated" data-wow-duration="1500ms"
                    data-wow-delay="200ms">
                    <span class="service-counter">{{ $loop->iteration }}</span>
                    <div class="service-icon">
                      <i class="{{ $service->icon }}"></i>
                    </div>
                    <h4>{{ convertUtf8($service->name) }}</h4>
                    <p>
                      {!! strlen(strip_tags($service->content)) > 80
                          ? mb_substr(strip_tags($service->content), 0, 80, 'UTF-8') . '...'
                          : strip_tags($service->content) !!}
                    </p>
                    <a @if ($service->detail_page == 1) href="{{ route('front.user.service.detail', [getParam(), 'slug' => $service->slug, 'id' => $service->id]) }}" @endif
                      class="read-more"> {{ $keywords['read_more'] ?? 'read more' }} <i
                        class="far fa-long-arrow-right"></i>
                    </a>
                  </div>
                </div>
              @endforeach
            </div>
          @endif
        </div>
      </section>
    @endif

    <!-- Service Section End -->

    <!-- Call TO action start -->
    @if (isset($home_sections->video_section) && $home_sections->video_section == 1)
      @php
        $videoBg = $videoSectionDetails->video_section_image ?? 'video_bg_one.jpg';

        $isVideoSectionEmpty =
            empty($videoSectionDetails->video_section_title) &&
            empty($videoSectionDetails->video_section_subtitle) &&
            empty($videoSectionDetails->video_section_button_url) &&
            empty($videoSectionDetails->video_section_button_text) &&
            empty($videoSectionDetails->video_section_url);
      @endphp

      <section class="cta-section bg-img-center lazy"
        data-bg="{{ asset('assets/front/img/user/home_settings/' . $videoBg) }}">
        <div class="container">
          <div class="row align-items-center">
            <div class="col-md-10">
              <div class="cta-left-content">
                @if ($isVideoSectionEmpty)
                  <span class="title-tag">This is the Video section</span>
                  <h1>Video subtitle will appear here</h1>
                  <a href="#" class="btn filled-btn">Watch Video <i class="far fa-long-arrow-right"></i></a>
                @else
                  @if (!empty($videoSectionDetails->video_section_title))
                    <span class="title-tag">{{ $videoSectionDetails->video_section_title }}</span>
                  @endif
                  <h1>{{ $videoSectionDetails->video_section_subtitle ?? '' }}</h1>
                  @if (!empty($videoSectionDetails->video_section_button_url))
                    <a href="{{ $videoSectionDetails->video_section_button_url }}"
                      class="btn filled-btn">{{ $videoSectionDetails->video_section_button_text }}
                      <i class="far fa-long-arrow-right"></i></a>
                  @endif
                @endif
              </div>
            </div>

            @if (!$isVideoSectionEmpty && !empty($videoSectionDetails->video_section_url))
              <div class="col-md-2">
                <div class="video-icon text-right">
                  <a href="{{ $videoSectionDetails->video_section_url }}" class="video-popup">
                    <i class="fas fa-play"></i>
                  </a>
                </div>
              </div>
            @elseif ($isVideoSectionEmpty)
              <div class="col-md-2">
                <div class="video-icon text-right">
                  <a href="#" class="video-popup">
                    <i class="fas fa-play"></i>
                  </a>
                </div>
              </div>
            @endif
          </div>
        </div>
      </section>
    @endif

    <!-- Call TO action end -->

    <!-- Why Choose Us/Facility Section Start -->
    @if (isset($home_sections->why_choose_us_section) && $home_sections->why_choose_us_section == 1)
      @php
        $isChooseUsTextEmpty =
            empty($home_text->why_choose_us_section_title) && empty($home_text->why_choose_us_section_subtitle);

        $isChooseUsItemsEmpty = empty($chooseUsItems) || count($chooseUsItems) == 0;

        $isChooseUsImageEmpty = empty($home_text->why_choose_us_section_image);
      @endphp

      <section class="wcu-section section-bg section-padding">
        <div class="container">
          <div class="row align-items-center">
            <div class="col-lg-5 offset-lg-1">
              <!-- Section Title -->
              <div class="feature-left">
                <div class="section-title">
                  @if ($isChooseUsTextEmpty)
                    <span class="title-top with-border">This is the Why Choose Us section</span>
                    <h1>Popular reasons to choose us</h1>
                  @else
                    @isset($home_text->why_choose_us_section_title)
                      <span class="title-top with-border">{{ $home_text->why_choose_us_section_title }}</span>
                    @endisset
                    @isset($home_text->why_choose_us_section_subtitle)
                      <h1>{{ $home_text->why_choose_us_section_subtitle }}</h1>
                    @endisset
                  @endif
                </div>

                <ul class="feature-list">
                  @if ($isChooseUsItemsEmpty)
                    <li class="wow fadeInUp animated" data-wow-duration="1000ms" data-wow-delay="100ms">
                      <div class="feature-icon">
                        <i class="fas fa-info-circle"></i>
                      </div>
                      <h4>No features available</h4>
                      <p>Features will be displayed here once added.</p>
                    </li>
                  @else
                    @foreach ($chooseUsItems as $item)
                      <li class="wow fadeInUp animated" data-wow-duration="1000ms" data-wow-delay="100ms">
                        <div class="feature-icon">
                          <i class="{{ $item->icon }}"></i>
                        </div>
                        <h4>{{ $item->title }}</h4>
                        <p>{{ $item->content }}</p>
                      </li>
                    @endforeach
                  @endif
                </ul>
              </div>
            </div>

            <div class="col-lg-6">
              <div class="feature-img">
                <div class="feature-abs-con">
                  <div class="f-inner">
                    <i class="far fa-stars"></i>
                    <p>{{ $keywords['popular_features'] ?? 'Popular Features' }}</p>
                  </div>
                </div>
                <img class="lazy"
                  data-src="{{ $isChooseUsImageEmpty ? asset('assets/front/img/theme9/tile-gallery/2.jpg') : asset('assets/front/img/user/home_settings/' . $home_text->why_choose_us_section_image) }}"
                  alt="image">
              </div>
            </div>
          </div>
        </div>
      </section>
    @endif

    <!-- Why Choose Us/Facility Section End -->

    <!-- Feedback Section start -->
    @if (isset($home_sections->testimonials_section) && $home_sections->testimonials_section == 1)
      @php
        $isTestimonialTextEmpty = empty($home_text->testimonial_title) && empty($home_text->testimonial_subtitle);
        $isTestimonialsEmpty = empty($testimonials) || count($testimonials) == 0;
      @endphp

      <section class="feedback-section section-padding">
        <div class="container">
          <!-- Section Title -->
          <div class="section-title text-center">
            <div class="row justify-content-center">
              <div class="col-lg-7">
                @if ($isTestimonialTextEmpty)
                  <span class="title-top">This is the Testimonials section</span>
                  <h1>What our customers say</h1>
                @else
                  @if (!empty($home_text->testimonial_title))
                    <span class="title-top">{{ $home_text->testimonial_title }}</span>
                  @endif
                  <h1>{{ $home_text->testimonial_subtitle ?? '' }}</h1>
                @endif
              </div>
            </div>
          </div>

          @if ($isTestimonialsEmpty)
            <div class="text-center py-5">
              <p>No testimonials available yet.</p>
            </div>
          @else
            <div class="feadback-slide" id="feedbackSlideActive">
              @foreach ($testimonials as $testimonial)
                <div class="single-feedback-box">
                  <p>{{ replaceBaseUrl($testimonial->content) }}</p>
                  <h5 class="feedback-author">{{ convertUtf8($testimonial->name) }}</h5>
                </div>
              @endforeach
            </div>
          @endif
        </div>
      </section>
    @endif

    <!-- Feedback Section end -->

    <!-- Brands section start -->
    @if (isset($home_sections->brand_section) && $home_sections->brand_section == 1)
      @php
        $isBrandSectionEmpty = empty($brands) || count($brands) == 0;
      @endphp

      <section class="brands-section primary-bg">
        <div class="container">
          @if ($isBrandSectionEmpty)
            <div class="text-center py-5">
              <h4 class="text-white">This the brand section.</h4>
            </div>
          @else
            <div id="brandsSlideActive" class="row">
              @foreach ($brands as $brand)
                <a class="brand-item text-center d-block" href="{{ $brand->brand_url }}" target="_blank">
                  <img class="lazy" data-src="{{ asset('assets/front/img/user/brands/' . $brand->brand_img) }}"
                    alt="brand image">
                </a>
              @endforeach
            </div>
          @endif
        </div>
      </section>
    @endif

    <!-- Brands section End -->
  </main>
  <!-- Main Wrap end -->
@endsection
