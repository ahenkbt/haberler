@extends('front.layout')

@section('pagename')
    - {{ __('Templates') }}
@endsection

@section('meta-description', !empty($seo) ? $seo->website_template_description : '')
@section('meta-keywords', !empty($seo) ? $seo->website_template_keywords : '')

@section('breadcrumb-title')
    {{ __('Templates') }}
@endsection
@section('breadcrumb-link')
    {{ __('Templates') }}
@endsection

@section('content')

    <!-- Template Start -->
    <div class="template-area ptb-120">
        <div class="container">
            <div class="row justify-content-center">
                @foreach ($templates as $template)
                    <div class="col-lg-4 col-sm-6" data-aos="fade-up">
                        <div class="card text-center mb-40">
                            <div class="card-image">
                                <div class="lazy-container">
                                    <img class="lazyload lazy-image"
                                        data-src="{{ asset('assets/front/img/template-previews/' . $template->template_img) }}"
                                        alt="Demo Image" />
                                </div>
                                <div class="hover-show">
                                    <a href="{{ detailsUrl($template) }}" target="_self" class="btn-icon rounded-circle"
                                        title="View Details">
                                        <i class="fal fa-link"></i>
                                    </a>
                                </div>
                            </div>
                            <h4 class="card-title">
                                <a href="{{ detailsUrl($template) }}" title="Link" target="_self">
                                    {{ __($template->template_name) }}
                                </a>
                            </h4>
                        </div>
                    </div>
                @endforeach

            </div>
            <nav class="pagination-nav" data-aos="fade-up">
                <ul class="pagination justify-content-center mb-0">
                    {{ $templates->links() }}
                </ul>
            </nav>
        </div>
    </div>
    <!-- Template End -->


@endsection
