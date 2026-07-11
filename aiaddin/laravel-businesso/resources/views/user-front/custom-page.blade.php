@extends('user-front.layout')

@section('tab-title')
  {{ $page->name }}
@endsection

@section('meta-description', !empty($userSeo) ? $userSeo->blogs_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->blogs_meta_keywords : '')

@section('page-name')
  {{ $page->title }}
@endsection
@section('br-name')
  {{ $page->name }}
@endsection

@section('content')
  <!--====== Blog Section Start ======-->
  <section class="blog-section section-gap">
    <div class="container">
      <div class="row">
        <div class="col-12">
          <div class="summernote-content">
            {!! replaceBaseUrl($page->body) !!}
          </div>
        </div>
      </div>
    </div>
  </section>
  <!--====== Blog Section End ======-->
@endsection
