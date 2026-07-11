@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['payment_success'] ?? 'Payment Success' }}
@endsection
@section('content')
  <div class="purchase-message">
    <div class="container">
      <div class="row">
        <div class="col-lg-12">
          <div class="purchase-success">
            <div class="icon text-success"><i class="far fa-check-circle"></i></div>
            <h2>{{ $keywords['Success'] ?? __('Success') . '!' }}</h2>
            @if (request()->input('type') == 'offline')
              <p>{{ $keywords['We_have_received_your_booking_request.'] ?? 'We have received your booking request.' }}
              </p>
            @else
              <p>{{ $keywords['Your_transaction_was_successful'] ?? __('Your transaction was successful.') }}
              </p>
            @endif

            <p>
              {{ $keywords['We_have_sent_you_a_mail_with_an_invoice'] ?? __('We have sent you a mail with an invoice.') }}
            </p>

            @if (request()->input('type') == 'offline')
              <p>{{ __('You will be notified via mail once it is approved.') }}</p>
            @endif
            <p class="mt-4">{{ $keywords['Thank_You.'] ?? 'Thank You.' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
@endsection
