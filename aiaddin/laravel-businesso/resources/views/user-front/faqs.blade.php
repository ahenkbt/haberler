@extends('user-front.layout')
@section('tab-title')
  {{ $keywords['FAQ'] ?? 'FAQ' }}
@endsection
@section('meta-description', !empty($userSeo) ? $userSeo->faqs_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->faqs_meta_keywords : '')
@section('page-name')
  {{ $keywords['FAQ'] ?? 'FAQ' }}
@endsection
@section('br-name')
  {{ $keywords['FAQ'] ?? 'FAQ' }}
@endsection
@section('content')
  <!--====== FAQ Section Start ======-->
  <section class="faq-section section-gap">
    <div class="container">
      <!-- FAQ LOOP -->
      @if (count($faqs) == 0)
        <div class="bg-light py-5">
          <h3 class="text-center">{{ $keywords['No_FAQ_Found'] ?? 'No FAQ Found!' }}</h3>
        </div>
      @else
        <div class="accordion faq-loop grey-header" id="faqAccordion">
          @foreach ($faqs as $key => $faq)
            <div class="card">
              <div @if ($key == 0) class="card-header active-header" @else class="card-header" @endif>
                <h6 class="collapsed" data-toggle="collapse" data-target="#collapse{{ $faq->id }}">
                  {{ $faq->question }}
                  <span class="icons">
                    @if ($key == 0)
                      <i class="far fa-minus"></i>
                    @else
                      <i class="far fa-plus"></i>
                    @endif
                  </span>
                </h6>
              </div>
              <div id="collapse{{ $faq->id }}" data-parent="#faqAccordion"
                @if ($key == 0) class="collapse show" @else class="collapse" @endif>
                <div class="card-body">
                  {{ $faq->answer }}
                </div>
              </div>
          @endforeach
      @endif
    </div>
    <!-- End Faq LOOP -->
    </div>
    </div>
  </section>
  <!--====== FAQ Section End ======-->
@endsection
