@extends('front.layout')

@section('pagename')
    - {{ __('Blog Details') }}
@endsection

@section('meta-description', !empty($blog) ? $blog->meta_keywords : '')
@section('meta-keywords', !empty($blog) ? $blog->meta_description : '')

@section('og-meta')
    <meta property="og:image" content="{{ asset('assets/front/img/blogs/' . $blog->main_image) }}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1024">
    <meta property="og:image:height" content="1024">
@endsection

@section('breadcrumb-title')
    {{ strlen($blog->title) > 30 ? mb_substr($blog->title, 0, 30) . '...' : $blog->title }}
@endsection
@section('breadcrumb-link')
    {{ __('Blog Details') }}
@endsection

@section('content')

    <!--====== BLOG DETAILS PART START ======-->

    <div class="blog-details-area pt-120 pb-90">
        <div class="container">
            <div class="row justify-content-center gx-xl-5">
                <div class="col-lg-8">
                    <div class="blog-description mb-50">
                        <article class="item-single">
                            <div class="image">
                                <div class="lazy-container ratio-16-9">
                                    <img class="lazyload lazy-image img-fluid"
                                        src="{{ asset('assets/front/img/blogs/' . $blog->main_image) }}"
                                        data-src="{{ asset('assets/front/img/blogs/' . $blog->main_image) }}"
                                        alt="Blog Image">
                                </div>

                            </div>
                            <div class="content">
                                <div class="item-top">
                                    <ul class="info-list">

                                        <li><i
                                                class="fal fa-calendar"></i>{{ \Carbon\Carbon::parse($blog->created_at)->format('F j, Y') }}
                                        </li>
                                        <li><a href="{{ route('front.blogs', ['category' => $blog->bcategory->id]) }}"><i
                                                    class="fal fa-tag"></i>{{ $blog->bcategory->name }} </a></li>
                                    </ul>
                                    <div class="social-link">
                                        <span>Share:</span>
                                        <a href="//www.facebook.com/sharer/sharer.php?u={{ urlencode(url()->current()) }}"><i
                                                class="fab fa-facebook-f"></i></a>
                                        <a
                                            href="//twitter.com/intent/tweet?text=my share text&amp;url={{ urlencode(url()->current()) }}"><i
                                                class="fab fa-twitter"></i>
                                        </a>
                                        <a
                                            href="//www.linkedin.com/shareArticle?mini=true&amp;url={{ urlencode(url()->current()) }}&amp;title={{ $blog->title }}"><i
                                                class="fab fa-linkedin-in"></i>
                                        </a>
                                    </div>
                                </div>
                                <h4 class="title">
                                    {{ $blog->title }}
                                </h4>
                                <div class="summernote-content">
                                    {!! replaceBaseUrl($blog->content) !!}
                                </div>

                            </div>
                        </article>
                    </div>
                    <div class="blog-details-comment mt-5">
                        <div class="comment-lists">
                            <div id="disqus_thread"></div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <aside class="sidebar-widget-area">
                        <div class="widget widget-categories mb-30">
                            <h4 class="title">{{ __('All Categories') }}</h4>
                            <ul class="list-unstyled m-0">

                                @foreach ($bcats as $key => $bcat)
                                    <li class="d-flex align-items-center justify-content-between">
                                        <a href="{{ route('front.blogs', ['category' => $bcat->id]) }}"><i
                                                class="fal fa-folder"></i>{{ $bcat->name }}</a>
                                        <span class="tqy"> {{ '(' . $bcat->blogs->count() . ')' }}</span>
                                    </li>
                                @endforeach


                            </ul>
                        </div>
                        {{-- <div class="widget widget-social-link mb-30">
                            <h4 class="title">{{ __('Share') }}</h4>
                            <div class="social-link">

                                <a href="//www.facebook.com/sharer/sharer.php?u={{ urlencode(url()->current()) }}"><i
                                        class="fab fa-facebook-f"></i></a>
                                <a
                                    href="//twitter.com/intent/tweet?text=my share text&amp;url={{ urlencode(url()->current()) }}"><i
                                        class="fab fa-twitter"></i></a>
                                <a
                                    href="//www.linkedin.com/shareArticle?mini=true&amp;url={{ urlencode(url()->current()) }}&amp;title={{ $blog->title }}"><i
                                        class="fab fa-linkedin-in"></i></a>
                            </div>
                        </div> --}}
                        <div class="widget widget-post mb-30">
                            <h4 class="title">{{ __('Recent Posts') }}</h4>
                            @foreach ($recentBlogs as $blog)
                                <article class="article-item mb-30">
                                    <div class="image">
                                        <a href="blog-details.html" class="lazy-container ratio-1-1">
                                            <img class="lazyload lazy-image"
                                                src="{{ asset('assets/frontend/images/placeholder.png') }}"
                                                data-src="{{ asset('assets/front/img/blogs/' . $blog->main_image) }}"
                                                alt="Blog Image">
                                        </a>
                                    </div>
                                    <div class="content">
                                        <h6>
                                            <a
                                                href="{{ route('front.blogdetails', ['id' => $blog->id, 'slug' => $blog->slug]) }}">
                                                {{ $blog->title }} </a>
                                        </h6>
                                        <div class="time">
                                            {{ Carbon\Carbon::parse($blog->created_at)->diffForHumans() }}
                                        </div>
                                    </div>
                                </article>
                            @endforeach

                        </div>



                    </aside>
                </div>
            </div>
        </div>
    </div>
    <!--====== BLOG DETAILS PART ENDS ======-->


@endsection

@if ($bs->is_disqus == 1)
    @section('scripts')
        <script>
            "use strict";
            (function() {
                var d = document,
                    s = d.createElement('script');
                s.src = '//{{ $bs->disqus_shortname }}.disqus.com/embed.js';
                s.setAttribute('data-timestamp', +new Date());
                (d.head || d.body).appendChild(s);
            })();
        </script>
    @endsection
@endif
