@extends('front.layout')

@section('pagename')
    - {{ __('vCards') }}
@endsection

@section('meta-description', !empty($seo) ? $seo->vcard_template_description : '')
@section('meta-keywords', !empty($seo) ? $seo->vcard_template_keywords : '')

@section('breadcrumb-title')
    {{ __('vCards') }}
@endsection
@section('breadcrumb-link')
    {{ __('vCards') }}
@endsection

@section('content')

    <!-- Vcard Start -->
    <div class="vcard-area ptb-120">
        <div class="container">
            <div class="row justify-content-center">
                @foreach ($vcards as $vcard)
                    <div class="col-xl-3 col-lg-4 col-sm-6" data-aos="fade-up">
                        <div class="card text-center mb-30">
                            <div class="card-image">
                                <div class="lazy-container">
                                    <img class="lazyload lazy-image"
                                        data-src="{{ asset('assets/front/img/template-previews/vcard/' . $vcard->template_img) }}"
                                        alt="{{ $vcard->vcard_name }}" />
                                </div>
                                <div class="hover-show">
                                    <a href="{{ route('front.user.vcard', [$vcard->user->username, $vcard->id]) }}"
                                        target="_self" class="btn-icon rounded-circle" title="{{ __('View Details') }}">
                                        <i class="fal fa-link"></i>
                                    </a>
                                </div>
                            </div>
                            @php
                            preg_match('/\d+/', $vcard->template_name, $matches);
                            $number = $matches[0] ?? '';
                            $vcardLabel = __('vCard');
                            @endphp
                            <h5 class="card-title">
                                <a href="{{ route('front.user.vcard', [$vcard->user->username, $vcard->id]) }}"
                                    title="Link" target="_self">
                                    {{ $vcardLabel . ' ' . $number }}
                                </a>
                            </h5>
                        </div>
                    </div>
                @endforeach

            </div>
            <nav class="pagination-nav" data-aos="fade-up">
                <ul class="pagination justify-content-center mb-0">
                    {{ $vcards->links() }}
                </ul>
            </nav>
        </div>
    </div>
    <!-- Vcard End -->


@endsection
