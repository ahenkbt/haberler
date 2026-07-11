@extends('front.layout')

@section('pagename')
    - {{ __('Blog') }}
@endsection

@section('meta-description', !empty($seo) ? $seo->blogs_meta_description : '')
@section('meta-keywords', !empty($seo) ? $seo->blogs_meta_keywords : '')

@section('breadcrumb-title')
    {{ __('Blog') }}
@endsection
@section('breadcrumb-link')
    {{ __('Blog') }}
@endsection

@section('content')


    <div class="blog-area ptb-120">
        <div class="container">
            <div class="row justify-content-center">
                @foreach ($blogs as $blog)
                    <div class="col-md-6 col-lg-4">
                        <article class="card mb-30" data-aos="fade-up" data-aos-delay="100">
                            <div class="card-image">
                                <a href="{{ route('front.blogdetails', ['id' => $blog->id, 'slug' => $blog->slug]) }}"
                                    class="lazy-container ratio-16-9">
                                    <img class="lazyload lazy-image"
                                        src="{{ asset('assets/front/img/blogs/' . $blog->main_image) }}"
                                        data-src="{{ asset('assets/front/img/blogs/' . $blog->main_image) }}"
                                        alt="Blog Image">
                                </a>
                                <ul class="info-list">

                                    <li><i
                                            class="fal fa-calendar"></i>{{ \Carbon\Carbon::parse($blog->created_at)->format('F j, Y') }}
                                    </li>
                                    <li><a href="{{ route('front.blogs', ['category' => $blog->bcategory->id]) }}"><i
                                                class="fal fa-tag"></i>{{ $blog->bcategory->name }}</a></li>
                                </ul>
                            </div>
                            <div class="content">
                                <h5 class="card-title lc-2">
                                    <a href="{{ route('front.blogdetails', ['id' => $blog->id, 'slug' => $blog->slug]) }}">
                                        {{ $blog->title }}
                                    </a>
                                </h5>
                                <p class="card-text lc-2">
                                    {!! strlen($blog->content) > 90 ? mb_substr(strip_tags($blog->content), 0, 90, 'UTF-8') . '...' : $blog->content !!}
                                </p>
                                <a href="{{ route('front.blogdetails', ['id' => $blog->id, 'slug' => $blog->slug]) }}"
                                    class="card-btn">{{ __('Read More') }}</a>
                            </div>
                        </article>
                    </div>
                @endforeach
            </div>

            <nav class="pagination-nav" data-aos="fade-up">
                <ul class="pagination justify-content-center mb-0">
                    {{ $blogs->appends(['category' => request()->input('category')])->links() }}

                </ul>
            </nav>
        </div>
    </div>
    <!--====== End saas-blog section ======-->

@endsection
