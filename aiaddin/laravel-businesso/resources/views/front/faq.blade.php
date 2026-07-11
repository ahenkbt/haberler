@extends('front.layout')

@section('pagename')
    - {{ __('FAQ') }}
@endsection

@section('meta-description', !empty($seo) ? $seo->faqs_meta_description : '')
@section('meta-keywords', !empty($seo) ? $seo->faqs_meta_keywords : '')

@section('breadcrumb-title')
    {{ __('FAQ') }}
@endsection
@section('breadcrumb-link')
    {{ __('FAQ') }}
@endsection

@section('content')

    <!--====== Start faqs-section ======-->
    <div id="faq" class="faq-area pt-120 pb-90">
        <div class="container">
            <div class="accordion" id="faqAccordion">
                <div class="row">
                    @if (isset($faqs) && count($faqs) > 0)
                        <div class="col-lg-6 has-time-line" data-aos="fade-right">
                            <div class="row">

                                @foreach ($faqs->chunk(ceil($faqs->count() / 2))->first() as $key => $faq)
                                    @if ($key == 0)
                                        <div class="col-12">
                                            <div class="accordion-item">
                                                <h6 class="accordion-header" id="heading{{ $faq->serial_number }}">
                                                    <button class="accordion-button" type="button"
                                                        data-bs-toggle="collapse"
                                                        data-bs-target="#collapse{{ $faq->serial_number }}"
                                                        aria-expanded="true"
                                                        aria-controls="collapse{{ $faq->serial_number }}">
                                                        {{ $faq->serial_number }}. {{ $faq->question }}
                                                    </button>
                                                </h6>
                                                <div id="collapse{{ $faq->serial_number }}"
                                                    class="accordion-collapse collapse show"
                                                    aria-labelledby="heading{{ $faq->serial_number }}"
                                                    data-bs-parent="#faqAccordion">
                                                    <div class="accordion-body">
                                                        <p>{{ $faq->answer }}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    @else
                                        <div class="col-12">
                                            <div class="accordion-item">
                                                <h6 class="accordion-header" id="heading{{ $faq->serial_number }}">
                                                    <button class="accordion-button collapsed" type="button"
                                                        data-bs-toggle="collapse"
                                                        data-bs-target="#collapse{{ $faq->serial_number }}"
                                                        aria-expanded="true"
                                                        aria-controls="collapse{{ $faq->serial_number }}">
                                                        {{ $faq->serial_number }}. {{ $faq->question }}
                                                    </button>
                                                </h6>
                                                <div id="collapse{{ $faq->serial_number }}"
                                                    class="accordion-collapse collapse"
                                                    aria-labelledby="heading{{ $faq->serial_number }}"
                                                    data-bs-parent="#faqAccordion">
                                                    <div class="accordion-body">
                                                        <p>{{ $faq->answer }}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    @endif
                                @endforeach


                            </div>
                        </div>
                        <div class="col-lg-6" data-aos="fade-left">
                            <div class="row">
                                @if (count($faqs) > 1)
                                    @foreach ($faqs->chunk(ceil($faqs->count() / 2))->last() as $key => $faq)
                                        <div class="col-12">
                                            <div class="accordion-item">
                                                <h6 class="accordion-header" id="heading{{ $faq->serial_number }}">
                                                    <button class="accordion-button collapsed" type="button"
                                                        data-bs-toggle="collapse"
                                                        data-bs-target="#collapse{{ $faq->serial_number }}"
                                                        aria-expanded="true"
                                                        aria-controls="collapse{{ $faq->serial_number }}">
                                                        {{ $faq->serial_number }}. {{ $faq->question }}
                                                    </button>
                                                </h6>
                                                <div id="collapse{{ $faq->serial_number }}"
                                                    class="accordion-collapse collapse"
                                                    aria-labelledby="heading{{ $faq->serial_number }}"
                                                    data-bs-parent="#faqAccordion">
                                                    <div class="accordion-body">
                                                        <p>{{ $faq->answer }}</p>
                                                    </div>
                                                </div>
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
    <!--====== End faqs-section ======-->
@endsection
