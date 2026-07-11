@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Courses'] ?? 'Courses' }}
@endsection

@section('meta-description', !empty($userSeo) ? $userSeo->meta_description_course : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->meta_keyword_course : '')

@section('page-name')
  {{ $keywords['Courses'] ?? 'Courses' }}
@endsection
@section('br-name')
  {{ $keywords['Courses'] ?? 'Courses' }}
@endsection

@section('content')

  <!--====== COURSES PART START ======-->
  <section class="course-grid-area courses-page pt-70 pb-100">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-9">
          <div class="course-grid mt-30">
            <div class="course-grid-top">
              <div class="course-filter">
                <select id="sort-type" class="course-select">
                  <option selected disabled>{{ $keywords['Sort_by'] ?? __('Sort By') }}</option>
                  <option {{ request()->input('sort') == 'new' ? 'selected' : '' }} value="new">
                    {{ $keywords['new_course'] ?? __('New Course') }}
                  </option>
                  <option {{ request()->input('sort') == 'old' ? 'selected' : '' }} value="old">
                    {{ $keywords['old_course'] ?? __('Old Course') }}
                  </option>
                  <option {{ request()->input('sort') == 'ascending' ? 'selected' : '' }} value="ascending">
                    {{ $keywords['price'] ?? __('Price') . ': ' }}{{ $keywords['ascending'] ?? __('Ascending') }}
                  </option>
                  <option {{ request()->input('sort') == 'descending' ? 'selected' : '' }} value="descending">
                    {{ $keywords['price'] ?? __('Price') . ': ' }}{{ $keywords['descending'] ?? __('Descending') }}
                  </option>
                </select>

                <div class="input-box">
                  <i class="fal fa-search" id="course-search-icon"></i>
                  <input type="text" id="search-input"
                    placeholder="{{ $keywords['search_course'] ?? __('Search Course') }}"
                    value="{{ !empty(request()->input('keyword')) ? request()->input('keyword') : '' }}">
                </div>
              </div>
            </div>
          </div>

          <div class="row mt-10">
            @if (count($courses) == 0)
              <div class="col-lg-12">
                <h3 class="text-center mt-30">
                  {{ $keywords['no_course_found'] ?? __('No Course Found!') }}</h3>
              </div>
            @else
              @foreach ($courses as $course)
                <div class="col-lg-4 col-md-6 col-sm-8">
                  <div class="single-courses mt-30">
                    <div class="courses-thumb">
                      <a class="d-block"
                        href="{{ route('front.user.course.details', [getParam(), 'slug' => $course->slug]) }}"><img
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
                            <span>{{ $keywords['Free'] ?? __('Free') }}</span>
                          @endif
                        </div>
                      </div>
                      <ul class="d-flex justify-content-center">
                        <li><i class="fal fa-users"></i>
                          {{ $course->enrolmentCount . ' ' }}{{ $keywords['students'] ?? __('Students') }}
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
                </div>
              @endforeach
            @endif

            <div class="col-lg-12">
              @if (count($courses) > 0)
                {{ $courses->appends([
                        'type' => request()->input('type'),
                        'category' => request()->input('category'),
                        'min' => request()->input('min'),
                        'max' => request()->input('max'),
                        'keyword' => request()->input('keyword'),
                        'sort' => request()->input('sort'),
                    ])->links() }}
              @endif
            </div>

            @if (is_array($packagePermissions) && in_array('Advertisement', $packagePermissions))
              @if (!empty(showAd(3)))
                <div class="course-add mt-30">
                  {!! showAd(3) !!}
                </div>
              @endif
            @endif
          </div>
        </div>

        <div class="col-lg-3 col-md-6 col-sm-8">
          <div class="course-sidebar">
            <div class="course-price-filter white-bg mt-30">
              <div class="course-title">
                <h4 class="title">{{ $keywords['course_type'] ?? __('Course Type') }}</h4>
              </div>
              <div class="input-radio-btn">
                <ul class="radio_common-2 radio_style2">
                  <li>
                    <input type="radio" {{ empty(request()->input('type')) ? 'checked' : '' }} name="type"
                      id="radio1" value="">
                    <label for="radio1"><span></span>{{ $keywords['all_courses'] ?? __('All Courses') }}</label>
                  </li>
                  <li>
                    <input type="radio" {{ request()->input('type') == 'free' ? 'checked' : '' }} name="type"
                      id="radio2" value="free">
                    <label for="radio2"><span></span>{{ $keywords['free_courses'] ?? __('Free Courses') }}</label>
                  </li>
                  <li>
                    <input type="radio" {{ request()->input('type') == 'premium' ? 'checked' : '' }} name="type"
                      id="radio3" value="premium">
                    <label
                      for="radio3"><span></span>{{ $keywords['premium_courses'] ?? __('Premium Courses') }}</label>
                  </li>
                </ul>
              </div>
            </div>

            @if (count($categories) > 0)
              <div class="course-price-filter white-bg mt-30">
                <div class="course-title">
                  <h4 class="title">{{ $keywords['Categories'] ?? __('Categories') }}</h4>
                </div>
                <div class="input-radio-btn">
                  <ul class="radio_common-2 radio_style2">
                    <li>
                      <input type="radio" {{ empty(request()->input('category')) ? 'checked' : '' }} name="category"
                        id="all-category" value="">
                      <label
                        for="all-category"><span></span>{{ $keywords['all_category'] ?? __('All Category') }}</label>
                    </li>

                    @foreach ($categories as $category)
                      <li>
                        <input type="radio" {{ request()->input('category') == $category->slug ? 'checked' : '' }}
                          name="category" id="{{ 'catRadio' . $category->id }}" value="{{ $category->slug }}">
                        <label for="{{ 'catRadio' . $category->id }}"><span></span>{{ $category->name }}</label>
                      </li>
                    @endforeach
                  </ul>
                </div>
              </div>
            @endif

            <div class="course-price-filter white-bg mt-30">
              <div class="course-title">
                <h4 class="title">{{ $keywords['Filter_By_Price'] ?? __('Filter By Price') }}</h4>
              </div>
              <div class="price-number">
                <ul>
                  <li><span class="amount">{{ $keywords['price'] ?? __('Price') . ' :' }}</span></li>
                  <li><input type="text" id="amount" readonly></li>
                </ul>
              </div>
              <div id="range-sliders"></div>
            </div>
            {{-- @if (is_array($packagePermissions) && in_array('Advertisement', $packagePermissions))
                            @if (!empty(showAd(2)))
                                <div class="course-add mt-30">
                                    {!! showAd(2) !!}
                                </div>
                            @endif
                        @endif --}}
          </div>
        </div>
      </div>
    </div>
  </section>
  <!--====== COURSES PART END ======-->

  <form id="filtersForms" class="d-none" action="{{ route('front.user.courses', getParam()) }}" method="GET">
    <input type="hidden" id="type-id" name="type"
      value="{{ !empty(request()->input('type')) ? request()->input('type') : '' }}">

    <input type="hidden" id="category-id" name="category"
      value="{{ !empty(request()->input('category')) ? request()->input('category') : '' }}">

    <input type="hidden" id="min-id" name="min"
      value="{{ !empty(request()->input('min')) ? request()->input('min') : '' }}">

    <input type="hidden" id="max-id" name="max"
      value="{{ !empty(request()->input('max')) ? request()->input('max') : '' }}">

    <input type="hidden" id="keyword-id" name="keyword"
      value="{{ !empty(request()->input('keyword')) ? request()->input('keyword') : '' }}">

    <input type="hidden" id="sort-id" name="sort"
      value="{{ !empty(request()->input('sort')) ? request()->input('sort') : '' }}">

    <button type="submit" id="submitBtn"></button>
  </form>
@endsection

@section('scripts')

  <script>
    "use strict";
    let currency_info = @php echo json_encode($currencyInfo) @endphp;
    // let position = currency_info.base_currency_symbol_position;
    let symbol = currency_info.base_currency_symbol;
    let min_price = {{ $minPrice }};
    let max_price = {{ $maxPrice }};
    let curr_min = {{ !empty(request()->input('min')) ? request()->input('min') : $minPrice }};
    let curr_max = {{ !empty(request()->input('max')) ? request()->input('max') : $maxPrice }};
  </script>
  <script>
    function clickSubmit() {
      $("#filtersForms input").each(function() {
        if ($(this).val().length == 0) {
          $(this).remove();
        }
      });
      $('#submitBtn').trigger('click');
    }
  </script>
  <script type="text/javascript" src="{{ asset('assets/tenant/js/course/course.js') }}"></script>
@endsection
