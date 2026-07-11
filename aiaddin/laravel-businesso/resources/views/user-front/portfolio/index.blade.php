@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Portfolios'] ?? 'Portfolios' }}
@endsection

@section('meta-description', !empty($userSeo) ? $userSeo->portfolios_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->portfolios_meta_keywords : '')

@section('page-name')
  {{ $keywords['Our_Projects'] ?? 'Our Projects' }}
@endsection
@section('br-name')
  {{ $keywords['Our_Projects'] ?? 'Our Projects' }}
@endsection

@section('content')

  <!--====== Project section Start ======-->
  <section class="project-section">
    <div class="container">
      @if (count($portfolio_categories) > 0)
        <div class="row align-items-center">
          <div class="col-lg-12 col-md-12">
            <ul class="project-nav project-isotope-filter">
              <li data-filter="*" class="active"> {{ $keywords['All'] ?? 'All' }} </li>
              @foreach ($portfolio_categories as $category)
                <li data-filter=".item-{{ $category->id }}">{{ convertUtf8($category->name) }}</li>
              @endforeach
            </ul>

          </div>
        </div>
      @else
        <div class="row">
          <div class="col-12 text-center">
            <h3>{{ $keywords['NO_PORTFOLIO_FOUND'] ?? 'NO PORTFOLIO FOUND!' }}</h3>
          </div>
        </div>
      @endif

      <!-- Project Boxes -->
      <div class="row project-boxes project-isotope mt-60 justify-content-center">
        @foreach ($portfolios as $portfolio)
          <div class="isotope-item col-lg-4 col-sm-6 item-{{ $portfolio->bcategory->id }}">
            <div class="project-box hover-style">
              <a class="project-thumb"
                href="{{ route('front.user.portfolio.detail', [getParam(), $portfolio->slug, $portfolio->id]) }}">
                <div class="thumb bg-img-c lazy"
                  data-bg="{{ asset('assets/front/img/user/portfolios/' . $portfolio->image) }}"></div>
              </a>
              <div class="project-desc text-center">
                <h4><a
                    href="{{ route('front.user.portfolio.detail', [getParam(), $portfolio->slug, $portfolio->id]) }}">{{ strlen($portfolio->title) > 30 ? mb_substr($portfolio->title, 0, 30, 'UTF-8') . '...' : $portfolio->title }}</a>
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
    </div>
  </section>
  <!--====== Project section End ======-->
@endsection

@section('scripts')
  @if (!empty(request()->input('category')))
    <script>
      "use strict";
      $(window).on('load', function() {
        setTimeout(function() {
          let catid = {{ request()->input('category') }};
          $("li[data-filter='.item-" + catid + "']").trigger('click');
        }, 500);
      });
    </script>
  @endif
@endsection
