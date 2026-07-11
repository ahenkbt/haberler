@php
  use App\Constants\Constant;
  use App\Http\Helpers\Uploader;
@endphp
@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Purchase_History'] ?? __('Purchase History') }}
@endsection

@section('page-name')
  {{ $keywords['Purchase_History'] ?? __('Purchase History') }}
@endsection
@section('br-name')
  {{ $keywords['Purchase_History'] ?? __('Purchase History') }}
@endsection


@section('content')

  <!-- Start Purchase History Section -->
  <section class="user-dashbord pt-100 pb-100">
    <div class="container">
      <div class="row">
        <div class="col-12">
          <div class="row">
            <div class="col-lg-12">
              <div class="account-info">
                <div class="title">
                  <h4 class="mb-2">{{ $keywords['Purchase_History'] ?? __('Purchase History') }}</h4>
                </div>

                <div class="main-info">
                  <div class="main-table">
                    @if (count($allPurchase) == 0)
                      <h5 class="text-center mt-3">
                        {{ $keywords['no_information_found'] ?? __('No Information Found!') }}
                      </h5>
                    @else
                      <div class="table-responsive">
                        <table id="user-dataTable" class="table table-striped w-100">
                          <thead>
                            <tr>
                              <th>{{ $keywords['Order_ID'] ?? __('Order ID') }}</th>
                              <th>{{ $keywords['date'] ?? __('Date') }}</th>
                              <th>{{ $keywords['course'] ?? __('Course') }}</th>
                              <th>{{ $keywords['price'] ?? __('Price') }}</th>
                              <th>{{ $keywords['Paid_via'] ?? __('Paid via') }}</th>
                              <th>{{ $keywords['Payment_Status'] ?? __('Payment Status') }}
                              </th>
                              <th>{{ $keywords['Invoice'] ?? __('Invoice') }}</th>
                            </tr>
                          </thead>
                          <tbody>
                            @foreach ($allPurchase as $purchase)
                              @if (isset($purchase->title) && isset($purchase->slug))
                                <tr>
                                  <td>{{ '#' . $purchase->order_id }}</td>

                                  <td>{{ date_format($purchase->created_at, 'M d, Y') }}
                                  </td>

                                  <td>
                                    <a target="_blank"
                                      href="{{ route('front.user.course.details', [getParam(), 'slug' => $purchase->slug]) }}">
                                      {{ strlen($purchase->title) > 30 ? mb_substr($purchase->title, 0, 30, 'UTF-8') . '...' : $purchase->title }}
                                    </a>
                                  </td>

                                  <td>
                                    @if (!is_null($purchase->course_price))
                                      {{ $purchase->currency_symbol_position == 'left' ? $purchase->currency_symbol : '' }}{{ $purchase->course_price }}{{ $purchase->currency_symbol_position == 'right' ? $purchase->currency_symbol : '' }}
                                    @else
                                      <span
                                        class="{{ $userCurrentLang->rtl == 1 ? 'mr-2' : 'ml-1' }}">{{ $keywords['free'] ?? __('Free') }}</span>
                                    @endif
                                  </td>

                                  <td class="{{ $userCurrentLang->rtl == 1 ? 'pr-4' : 'pl-3' }}">
                                    @if (is_null($purchase->payment_method))
                                      -
                                    @else
                                      {{ $purchase->payment_method }}
                                    @endif
                                  </td>

                                  <td>
                                    @if ($purchase->payment_status == 'completed')
                                      <span
                                        class="completed {{ $userCurrentLang->rtl == 1 ? 'mr-2' : 'ml-2' }}">{{ $keywords['Completed'] ?? __('Completed') }}</span>
                                    @elseif ($purchase->payment_status == 'pending')
                                      <span
                                        class="pending {{ $userCurrentLang->rtl == 1 ? 'mr-2' : 'ml-2' }}">{{ $keywords['Pending'] ?? __('Pending') }}</span>
                                    @elseif ($purchase->payment_status == 'free')
                                      <span
                                        class="free {{ $userCurrentLang->rtl == 1 ? 'mr-2' : 'ml-2' }}">{{ $keywords['Free'] ?? __('Free') }}</span>
                                    @else
                                      <span
                                        class="rejected {{ $userCurrentLang->rtl == 1 ? 'mr-2' : 'ml-2' }}">{{ $keywords['Rejected'] ?? __('Rejected') }}</span>
                                    @endif
                                  </td>

                                  <td>
                                    @if (is_null($purchase->invoice))
                                      -
                                    @else
                                      <a href="{{ asset(\App\Constants\Constant::WEBSITE_ENROLLMENT_INVOICE . '/' . $purchase->invoice) }}"
                                        class="btn" target="_blank">
                                        {{ $keywords['Show'] ?? __('Show') }}
                                      </a>
                                    @endif
                                  </td>
                                </tr>
                              @endif
                            @endforeach
                          </tbody>
                        </table>
                      </div>
                    @endif
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <!-- End Purchase History Section -->
@endsection
@section('scripts')
  <script>
    //===== initialize bootstrap dataTable
    $('#user-dataTable').DataTable({
      ordering: false,
      responsive: true
    });
  </script>
@endsection
