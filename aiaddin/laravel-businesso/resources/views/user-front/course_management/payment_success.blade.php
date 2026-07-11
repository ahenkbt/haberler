@extends('user-front.layout')

@section('tab-title')
    {{ $keywords['payment_success'] ?? 'Payment Success' }}
@endsection
@section('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/summernote-content.css') }}">
@endsection
@section('br-name')
    {{ $keywords['Success'] ?? 'Success' }}
@endsection

@section('content')
    <!--====== Purchase Success Section Start ======-->
    @if ($paidVia == 'offline')
        <div class="purchase-message text-center">
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-8 col-lg-6">
                        <div class="purchase-success">
                            <div class="icon text-success"><i class="far fa-check-circle"></i></div>
                            <h2 class="mb-3">{{ $keywords['Success'] ?? __('Success') . '!' }}</h2>
                            <p>{{ $keywords['Your_transaction_request_was_received_and_sent_for_review'] ?? __('Your transaction request was received and sent for review.') }}
                            </p>
                            <p>{{ $keywords['It_might_take_upto_24_-_48_hours'] ?? __('It might take upto 24 - 48 hours.') }}
                            </p>

                            <div class="summernote-content px-3">
                                {!! replaceBaseUrl($courseInfo->thanks_page_content, 'summernote') !!}
                            </div>

                            <h6 class="mt-3 mb-0">{{ $keywords['Thank_You'] ?? __('Thank you.') }}</h6>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    @elseif($paidVia == 'coupon100')
        <div class="purchase-message text-center">
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-8 col-lg-6">
                        <div class="purchase-success">
                            <div class="icon text-success"><i class="far fa-check-circle"></i></div>
                            <h2 class="mb-3">{{ $keywords['Success'] ?? __('Success') . '!' }}</h2>
                            <p>{{ __('You have enrolled successfully with 100% discount') . '.' }}</p>
                            <p>{{ $keywords['We_have_sent_you_a_mail_with_an_invoice'] ?? __('We have sent you a mail with an invoice.') }}
                            </p>

                            <div class="summernote-content px-3">
                                {!! replaceBaseUrl($courseInfo->thanks_page_content, 'summernote') !!}
                            </div>

                            <h6 class="mt-3 mb-0">{{ $keywords['Thank_You'] ?? __('Thank you') . '.' }}</h6>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    @else
        <div class="purchase-message text-center">
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-8 col-lg-6">
                        <div class="purchase-success">
                            <div class="icon text-success"><i class="far fa-check-circle"></i></div>
                            <h2 class="mb-3">{{ $keywords['Success'] ?? __('Success') . '!' }}</h2>
                            <p>{{ $keywords['Your_transaction_was_successful'] ?? __('Your transaction was successful') . '.' }}
                            </p>
                            <p>{{ $keywords['We_have_sent_you_a_mail_with_an_invoice'] ?? __('We have sent you a mail with an invoice.') }}
                            </p>

                            <div class="summernote-content px-3">
                                {!! replaceBaseUrl($courseInfo->thanks_page_content, 'summernote') !!}
                            </div>

                            <h6 class="mt-4">{{ $keywords['Thank_You'] ?? __('Thank you') . '.' }}</h6>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    @endif
    <!--====== Purchase Success Section End ======-->
@endsection
