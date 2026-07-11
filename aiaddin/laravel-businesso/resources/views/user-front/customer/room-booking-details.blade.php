@extends('user-front.layout')
@section('tab-title')
  {{ $keywords['Room_Booking_Details'] ?? __('Room Booking Details') }}
@endsection

@section('page-name')
  {{ $keywords['Room_Booking_Details'] ?? __('Room Booking Details') }}
@endsection
@section('br-name')
  {{ $keywords['Room_Booking_Details'] ?? __('Room Booking Details') }}
@endsection

@section('content')
  <!--====== Start User Edit-Profile Section  ======-->
  <section class="user-dashbord pt-100 pb-60">
    <div class="container">
      <div class="row">
        @includeIf('user-front.customer.side-navbar')
        <div class="col-lg-9">
          <div class="row">
            <div class="col-lg-12">
              <div class="user-profile-details">
                <div class="order-details account-info">
                  <div class="title mb-2">
                    <h4>{{ $keywords['Room_Booking_Details'] ?? __('Room Booking Details') }}</h4>
                  </div>
                  <div class="view-order-page mb-3">
                    <div class="order-info-area">
                      <div class="row align-items-center">
                        <div class="col-lg-8">
                          <div class="order-info">
                            <h3>
                              {{ ($keywords['Booking_No'] ?? __('Booking No')) . ': ' . '#' . $details->booking_number }}
                            </h3>

                            <p>
                              {{ ($keywords['Booking_Date'] ?? __('Booking Date')) . ': ' . date_format($details->created_at, 'M d, Y') }}
                            </p>
                          </div>
                        </div>

                        <div class="col-lg-4">
                          <div class="print">
                            <a href="{{ asset('assets/invoices/rooms/' . $details->invoice) }}" download class="btn">
                              <i class="fas fa-download"></i>{{ $keywords['Invoice'] ?? __('Invoice') }}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="billing-add-area">
                    <div class="row">
                      <div class="col-md-6">
                        <div class="main-info">
                          <h5>{{ $keywords['User_Information'] ?? __('User Information') }}</h5>
                          <ul class="list">
                            <li>
                              <p><span>{{ $keywords['Name'] ?? __('Name') }}</span>:
                                {{ $userInfo->first_name . ' ' . $userInfo->last_name }}
                              </p>
                            </li>

                            <li>
                              <p><span>{{ $keywords['email'] ?? __('Email') }}</span>: {{ $userInfo->email }}
                              </p>
                            </li>

                            <li>
                              <p><span>{{ $keywords['phone'] ?? __('Phone') }}</span>: {{ $userInfo->contact_number }}
                              </p>
                            </li>

                            <li>
                              <p><span>{{ $keywords['address'] ?? __('Address') }}</span>: {{ $userInfo->address }}
                              </p>
                            </li>

                            <li>
                              <p><span>{{ $keywords['city'] ?? __('City') }}</span>: {{ $userInfo->city }}
                              </p>
                            </li>

                            <li>
                              <p><span>{{ $keywords['state'] ?? __('State') }}</span>: {{ $userInfo->state }}
                              </p>
                            </li>

                            <li>
                              <p><span>{{ $keywords['country'] ?? __('Country') }}</span>: {{ $userInfo->country }}
                              </p>
                            </li>
                          </ul>
                        </div>
                      </div>

                      @php
                        $position = $details->currency_symbol_position;
                        $symbol = $details->currency_symbol;
                      @endphp

                      <div class="col-md-6">
                        <div class="main-info">
                          <h5>{{ $keywords['Payment_Information'] ?? __('Payment Information') }}
                          </h5>
                          <ul class="list">
                            <li>
                              <p><span>{{ $keywords['subtotal'] ?? __('Subtotal') . ':' }}</span><span class="amount">:
                                  {{ $position == 'left' ? $symbol : '' }}{{ $details->subtotal }}{{ $position == 'right' ? $symbol : '' }}</span>
                              </p>
                            </li>

                            <li>
                              <p><span>{{ $keywords['Discount'] ?? __('Discount') }} (<i
                                    class="far fa-minus text-success"></i>): </span><span
                                  class="amount">{{ $position == 'left' ? $symbol : '' }}{{ $details->discount }}{{ $position == 'right' ? $symbol : '' }}</span>
                              </p>
                            </li>

                            <li>
                              <p><span>{{ $keywords['total'] ?? __('Total' . ':') }}: </span><span
                                  class="amount">{{ $position == 'left' ? $symbol : '' }}{{ $details->grand_total }}{{ $position == 'right' ? $symbol : '' }}</span>
                              </p>
                            </li>

                            <li>
                              <p><span>{{ $keywords['Paid_via'] ?? __('Paid via') . ':' }}:
                                </span>{{ $details->payment_method }}
                              </p>
                            </li>

                            <li>
                              @if ($details->payment_status == 1)
                                <p><span>{{ $keywords['Payment_Status'] ?? __('Payment Status') . ':' }}</span>: <span
                                    class="badge badge-success px-2 py-1">{{ $keywords['Completed'] ?? __('Complete') }}</span>
                                </p>
                              @else
                                <p><span>{{ $keywords['Payment_Status'] ?? __('Payment Status') . ':' }}</span>: <span
                                    class="badge badge-warning px-2 py-1">{{ $keywords['Pending'] ?? __('Pending') }}</span>
                                </p>
                              @endif
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="edit-account-info">
                    <a href="{{ url()->previous() }}" class="btn">{{ $keywords['Back'] ?? __('back') }}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
@endsection
