@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Service_Details'] ?? 'Service Details' }}
@endsection

@section('og-meta')
  <meta property="og:image" content="{{ asset('assets/front/img/user/services/' . $service->image) }}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1024">
  <meta property="og:image:height" content="1024">
@endsection

@section('meta-description', $service->meta_description)
@section('meta-keywords', $service->meta_keywords)

@section('page-name')
  {{ $keywords['Service_Details'] ?? 'Service Details' }}
@endsection
@section('br-name')
  {{ $keywords['Service_Details'] ?? 'Service Details' }}
@endsection

@section('content')

  <!--====== Service Details Start ======-->
  <section class="service-details section-gap">
    <div class="container">
      <div class="row">
        <!-- Details Content -->
        <div class="col-lg-10 offset-lg-1">
          <div class="post-details-wrap">
            <div class="post-content">
              <h3 class="title">{{ $service->title }}</h3>
              <div class="summernote-content">
                {!! replaceBaseUrl($service->content) !!}
              </div>
            </div>
            <div class="post-footer d-md-flex align-items-md-center justify-content-md-between">
              <div class="post-share">
                <ul class="d-flex align-items-center">
                  <li class="title mr-2">{{ $keywords['Share'] ?? 'Share' }}</li>
                  <li><a href="//www.facebook.com/sharer/sharer.php?u={{ urlencode(url()->current()) }}"><i
                        class="fab fa-facebook-f mr-2"></i></a></li>
                  <li><a href="//twitter.com/intent/tweet?text=my share text&amp;url={{ urlencode(url()->current()) }}"><i
                        class="fab fa-twitter mr-2"></i></a></li>
                  <li><a
                      href="//www.linkedin.com/shareArticle?mini=true&amp;url={{ urlencode(url()->current()) }}&amp;title={{ convertUtf8($service->name) }}"><i
                        class="fab fa-linkedin-in mr-2"></i></a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <!-- Sidebar -->
      </div>
    </div>
  </section>
  <!--====== Service Details End ======-->

@endsection
