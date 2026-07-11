@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Portfolio_Details'] ?? 'Portfolio Details' }}
@endsection

@section('og-meta')
  <meta property="og:image" content="{{ asset('assets/front/img/user/portfolios/' . $portfolio->image) }}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1024">
  <meta property="og:image:height" content="1024">
@endsection

@section('meta-description', $portfolio->meta_description)
@section('meta-keywords', $portfolio->meta_keywords)

@section('page-name')
  {{ $portfolio->title }}
@endsection
@section('br-name')
  {{ $keywords['Portfolio_Details'] ?? 'Portfolio Details' }}
@endsection

@section('content')

  <!--====== Project Details Start ======-->
  <section class="project-details section-gap">
    <div class="container">


      <div class="project-content">
        <div class="row">
          <div class="col-lg-8 order-2 order-lg-2">
            @if ($portfolio->portfolio_images()->count() > 0)
              <div class="portfolio-details-slider">
                @foreach ($portfolio->portfolio_images as $pi)
                  <a href="{{ asset('assets/front/img/user/portfolios/' . $pi->image) }}" class="img-popup">
                    <img class="w-100 lazy"
                      data-src="{{ $pi->image ? asset('assets/front/img/user/portfolios/' . $pi->image) : asset('assets/front/img/user/portfolios/demo.jpg') }}"
                      alt="Image">
                  </a>
                @endforeach
              </div>
            @endif
            <div class="content mt-4">
              <h2>{{ $portfolio->title }}</h2>
              <div class="summernote-content mb-40">
                {!! replaceBaseUrl($portfolio->content) !!}
              </div>
              <div class="post-footer d-md-flex align-items-md-center justify-content-md-between">
                <div class="post-share">
                  <ul class="d-flex align-items-center">
                    <li class="title mr-2">{{ $keywords['Share'] ?? 'Share' }}</li>
                    <li><a href="//www.facebook.com/sharer/sharer.php?u={{ urlencode(url()->current()) }}"><i
                          class="fab fa-facebook-f mr-2"></i></a></li>
                    <li><a
                        href="//twitter.com/intent/tweet?text=my share text&amp;url={{ urlencode(url()->current()) }}"><i
                          class="fab fa-twitter mr-2"></i></a></li>
                    <li><a
                        href="//www.linkedin.com/shareArticle?mini=true&amp;url={{ urlencode(url()->current()) }}&amp;title={{ convertUtf8($portfolio->title) }}"><i
                          class="fab fa-linkedin-in mr-2"></i></a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-4 order-1 order-lg-2">
            <div class="details">
              <ul>
                @if (!is_null($portfolio->bcategory))
                  <li>
                    <h3>{{ $keywords['Category'] ?? 'Category' }}</h3>
                    <p>{{ $portfolio->bcategory->name }}</p>
                  </li>
                @endif
                @if (!is_null($portfolio->client_name))
                  <li>
                    <h3>{{ $keywords['Client_Name'] ?? 'Client Name' }}</h3>
                    <p>{{ $portfolio->client_name }}</p>
                  </li>
                @endif
                @if (!is_null($portfolio->start_date))
                  <li>
                    <h3>{{ $keywords['Start_Date'] ?? 'Start Date' }}</h3>
                    <p>{{ \Illuminate\Support\Carbon::parse($portfolio->start_date)->format('d M, Y') }}</p>
                  </li>
                @endif
                @if (!is_null($portfolio->submission_date))
                  <li>
                    <h3>{{ $keywords['End_Date'] ?? 'End Date' }}</h3>
                    <p>{{ \Illuminate\Support\Carbon::parse($portfolio->submission_date)->format('d M, Y') }}</p>
                  </li>
                @endif
                @if (!is_null($portfolio->website_link))
                  <li>
                    <h3>{{ $keywords['Website_Link'] ?? 'Website Link' }}</h3>
                    <p><a target="_blank" class="text-white"
                        href="{{ $portfolio->website_link }}">{{ $portfolio->website_link }}</a></p>
                  </li>
                @endif

              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  </section>
  <!--====== Project Details End ======-->

@endsection
