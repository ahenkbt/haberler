@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Blog_Details'] ?? 'Blog Details' }}
@endsection

@section('og-meta')
  <meta property="og:image" content="{{ asset('assets/front/img/user/blogs/' . $blog->image) }}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1024">
  <meta property="og:image:height" content="1024">
@endsection

@section('meta-description', $blog->meta_description)
@section('meta-keywords', $blog->meta_keywords)

@section('page-name')
  {{ $blog->title }}
@endsection
@section('br-name')
  {{ $keywords['Blog_Details'] ?? 'Blog Details' }}
@endsection

@section('content')

  <!--====== Blog Section Start ======-->
  <section class="blog-section inner-section-gap">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <!-- Blog Details -->
          <div class="post-details-wrap">
            <div class="post-thumb">
              <img class="w-100 lazy" data-src="{{ asset('assets/front/img/user/blogs/' . $blog->image) }}"
                alt="Image">
            </div>
            <div class="post-meta">
              <ul>
                <li><i class="fal fa-folder-tree"></i><a
                    href="{{ route('front.user.blogs', getParam()) . '?category=' . $blog->bcategory->id }}">{{ $blog->bcategory->name }}</a>
                </li>
                <li><i class="far fa-calendar-alt"></i><a
                    href="javascript:void(0)">{{ \Carbon\Carbon::parse($blog->created_at)->format('F j, Y') }}</a>
                </li>
              </ul>
            </div>
            <div class="post-content">
              <h3 class="title">{{ $blog->title }}</h3>
              <div class="summernote-content">{!! replaceBaseUrl($blog->content) !!}</div>
            </div>
            <div class="post-footer d-md-flex align-items-md-center justify-content-md-between">
              <div class="post-share">
                <ul>
                  <li class="title">{{ $keywords['Share'] ?? 'Share' }}</li>
                  <li><a href="//www.facebook.com/sharer/sharer.php?u={{ urlencode(url()->current()) }}"><i
                        class="fab fa-facebook-f"></i></a></li>
                  <li><a
                      href="//twitter.com/intent/tweet?text=my share text&amp;url={{ urlencode(url()->current()) }}"><i
                        class="fab fa-twitter"></i></a></li>
                  <li><a
                      href="//www.linkedin.com/shareArticle?mini=true&amp;url={{ urlencode(url()->current()) }}&amp;title={{ convertUtf8($blog->title) }}"><i
                        class="fab fa-linkedin-in"></i></a></li>
                </ul>
              </div>
            </div>
            <div class="mt-5">
              <div id="disqus_thread"></div>
            </div>
          </div>
        </div>
        <div class="col-lg-4 col-md-8">
          <!-- sidebar -->
          <div class="sidebar">
            <!-- Search Widget -->
            <div class="widget search-widget">
              <form action="{{ route('front.user.blogs', getParam()) }}" method="GET">
                <input type="hidden" name="category" value="{{ request()->input('category') }}">
                <input type="text" placeholder="{{ $keywords['Search_your_keyword'] ?? 'Search your keyword' }}..."
                  name="term" value="{{ request()->input('term') }}">
                <button type="submit"><i class="far fa-search"></i></button>
              </form>
            </div>
            <!-- Cat Widget -->
            <div class="widget cat-widget">
              <h4 class="widget-title">{{ $keywords['Categories'] ?? 'Categories' }}</h4>
              @if (count($blog_categories) == 0)
                <h4>{{ __('No Blog Category Found!') }}</h4>
              @else
              @endif
              <ul>
                <li class="@if (empty(request()->input('category'))) active @endif"><a
                    href="{{ route('front.user.blogs', getParam()) }}">{{ $keywords['All'] ?? 'All' }}
                    <span>({{ $allCount }})</span></a></li>
                @foreach ($blog_categories as $bc)
                  <li class="@if ($bc->id == request()->input('category')) active @endif"><a
                      href="{{ route('front.user.blogs', getParam()) . '?category=' . $bc->id }}">{{ $bc->name }}
                      <span>({{ $bc->blogs()->count() }})</span></a>
                  </li>
                @endforeach
              </ul>
            </div>
            <!-- Recent Post Widget -->
            @if ($userBs->theme === 'home_thirteen')
              <div class="widget_box featured_post asasd mb-40">
                {{-- <h4>{{ @$home_text->featured_category_item_section_title }}</h4> --}}
                @foreach ($mostViewedblogs as $blog)
                  <div class="single_post blogger-single-post d-flex align-items-center">
                    <div class="post_img">
                      <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">
                        <img src="{{ asset('assets/front/img/user/blogs/' . $blog->image) }}" class="img-fluid lazy"
                          alt="post image">
                      </a>
                    </div>
                    <div class="post_content">
                      <h3 class="lc-2">
                        <a  href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">
                          {{$blog->title }}</a>
                      </h3>
                      <div class="post_meta">
                        @php
                          $date = Carbon\Carbon::parse($blog->created_at);
                        @endphp
                        <span class="calender">{{ date_format($date, 'M d, Y') }}</span>
                        <span class="eye">{{ $blog->views }}</span>
                      </div>
                    </div>
                  </div>
                @endforeach
              </div>
            @else
              <div class="widget recent-post-widget">
                <h4 class="widget-title">{{ $keywords['Latest_Blogs'] ?? 'Latest Blog' }}</h4>
                <div class="post-loops">
                  @if (count($latestBlogs) == 0)
                    <h4>{{ __('No Latest Blog Found!') }}</h4>
                  @else
                    @foreach ($latestBlogs as $latestBlog)
                      <div class="single-post">
                        <div class="post-thumb">
                          <a class="d-block"
                            href="{{ route('front.user.blog.detail', [getParam(), $latestBlog->slug, $latestBlog->id]) }}">
                            <img class="lazy img-fluid"
                              data-src="{{ asset('assets/front/img/user/blogs/' . $latestBlog->image) }}" alt="Image">
                          </a>
                        </div>
                        <div class="post-desc">
                          <span class="date"><i
                              class="far fa-calendar-alt"></i>{{ \Carbon\Carbon::parse($latestBlog->created_at)->format('F j, Y') }}</span>
                          <a
                            href="{{ route('front.user.blog.detail', [getParam(), $latestBlog->slug, $latestBlog->id]) }}">
                            {{ strlen($latestBlog->title) > 30 ? mb_substr($latestBlog->title, 0, 30, 'UTF-8') . '...' : $latestBlog->title }}
                          </a>
                        </div>
                      </div>
                    @endforeach
                  @endif
                </div>
              </div>
            @endif
          </div>
        </div>
      </div>
    </div>
  </section>
@endsection

@if (in_array('Plugins', $packagePermissions))
  @if ($userBs->disqus_status == 1)
    @section('scripts')
      <script>
        "use strict";
        (function() {
          const d = document,
            s = d.createElement('script');
          s.src = '//plusagency-2-5.disqus.com/embed.js';
          s.setAttribute('data-timestamp', +new Date());
          (d.head || d.body).appendChild(s);
        })();
      </script>
    @endsection
  @endif
@endif
