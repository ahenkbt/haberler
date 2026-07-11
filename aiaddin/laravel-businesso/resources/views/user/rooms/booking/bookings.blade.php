@extends('user.layout')

@section('content')
  @php
    $defaultLang = \App\Models\User\Language::where('is_default', 1)
        ->where('user_id', Auth::user()->id)
        ->first();
  @endphp
  <div class="page-header">
    @if (request()->routeIs('user.room_bookings.all_bookings'))
      <h4 class="page-title">{{ __('All_Bookings') }}</h4>
    @elseif (request()->routeIs('user.room_bookings.paid_bookings'))
      <h4 class="page-title">{{ __('Paid_Bookings') }}</h4>
    @elseif (request()->routeIs('user.room_bookings.unpaid_bookings'))
      <h4 class="page-title">{{ __('Unpaid_Bookings') }}</h4>
    @endif

    <ul class="breadcrumbs">
      <li class="nav-home">
        <a href="{{ route('user-dashboard') . '?language=' . request('language') }}">
          <i class="flaticon-home"></i>
        </a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Hotel_Management') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Room_Bookings') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        @if (request()->routeIs('user.room_bookings.all_bookings'))
          <a href="#">{{ __('All_Bookings') }}</a>
        @elseif (request()->routeIs('user.room_bookings.paid_bookings'))
          <a href="#">{{ __('Paid_Bookings') }}</a>
        @elseif (request()->routeIs('user.room_bookings.unpaid_bookings'))
          <a href="#">{{ __('Unpaid_Bookings') }}</a>
        @endif
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title">
                @if (request()->routeIs('user.room_bookings.all_bookings'))
                  {{ __('All_Room_Bookings') }}
                @elseif (request()->routeIs('user.room_bookings.paid_bookings'))
                  {{ __('Paid_Room_Bookings') }}
                @elseif (request()->routeIs('user.room_bookings.unpaid_bookings'))
                  {{ __('Unpaid_Room_Bookings') }}
                @endif
              </div>
            </div>

            <div class="col-lg-6 offset-lg-2">
              <button class="btn btn-danger btn-sm float-right d-none bulk-delete ml-3 mt-1"
                data-href="{{ route('user.room_bookings.bulk_delete_booking') }}">
                <i class="flaticon-interface-5"></i> {{ __('Delete') }}
              </button>

              <form class="float-right"
                @if (request()->routeIs('user.room_bookings.all_bookings')) action="{{ route('user.room_bookings.all_bookings') }}"
                @elseif (request()->routeIs('user.room_bookings.paid_bookings'))
                  action="{{ route('user.room_bookings.paid_bookings') }}"
                @elseif (request()->routeIs('user.room_bookings.unpaid_bookings'))
                  action="{{ route('user.room_bookings.unpaid_bookings') }}" @endif
                method="GET">
                <input name="booking_no" type="text" class="form-control"
                  placeholder="{{ __('Search_By_Booking_No') }}"
                  value="{{ !empty(request()->input('booking_no')) ? request()->input('booking_no') : '' }}">
              </form>

              <a href="#" data-toggle="modal" data-target="#roomModal"
                class="btn btn-primary btn-sm float-right mr-3 mt-1">
                {{ __('Add_Booking') }}
              </a>
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (count($bookings) == 0)
                <h3 class="text-center mt-2">
                  {{ __('NO_ROOM_BOOKING_FOUND') }}</h3>
              @else
                <div class="table-responsive">
                  <table class="table table-striped mt-3">
                    <thead>
                      <tr>
                        <th scope="col">
                          <input type="checkbox" class="bulk-check" data-val="all">
                        </th>
                        <th scope="col">{{ __('Booking_No') }}
                        </th>
                        <th scope="col">{{ __('Room') }}</th>
                        <th scope="col">{{ __('Rent') }}</th>
                        <th scope="col">{{ __('Paid_via') }}</th>
                        <th scope="col">{{ __('Payment_Status') }}</th>
                        <th scope="col">{{ __('Attachment') }}</th>
                        <th scope="col">{{ __('Actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($bookings as $booking)
                        <tr>
                          <td>
                            <input type="checkbox" class="bulk-check" data-val="{{ $booking->id }}">
                          </td>
                          <td>{{ '#' . $booking->booking_number }}</td>
                          <td>
                            @php
                              $title = $booking->hotelRoom->roomContent->where('language_id', $defaultLang->id)->first()
                                  ->title;
                            @endphp

                            {{ strlen($title) > 25 ? mb_substr($title, 0, 25, 'utf-8') . '...' : $title }}
                          </td>
                          <td>
                            {{ $booking->currency_text_position == 'left' ? $booking->currency_text : '' }}
                            {{ $booking->grand_total }}
                            {{ $booking->currency_text_position == 'right' ? $booking->currency_text : '' }}
                          </td>
                          <td>{{ $booking->payment_method }}</td>
                          <td>
                            @if ($booking->gateway_type == 'online')
                              @if ($booking->payment_status == 1)
                                <h2 class="d-inline-block"><span class="badge badge-success">{{ __('Paid') }}</span>
                                </h2>
                              @else
                                <h2 class="d-inline-block"><span class="badge badge-danger">{{ __('Unpaid') }}</span>
                                </h2>
                              @endif
                            @else
                              <form id="paymentStatusForm{{ $booking->id }}" class="d-inline-block"
                                action="{{ route('user.room_bookings.update_payment_status') }}" method="post">
                                @csrf
                                <input type="hidden" name="booking_id" value="{{ $booking->id }}">

                                <select
                                  class="form-control form-control-sm {{ $booking->payment_status == 1 ? 'bg-success' : 'bg-danger' }}"
                                  name="payment_status"
                                  onchange="document.getElementById('paymentStatusForm{{ $booking->id }}').submit();">
                                  <option value="1" {{ $booking->payment_status == 1 ? 'selected' : '' }}>
                                    {{ __('Paid') }}
                                  </option>
                                  <option value="0" {{ $booking->payment_status == 0 ? 'selected' : '' }}>
                                    {{ __('Unpaid') }}
                                  </option>
                                </select>
                              </form>
                            @endif
                          </td>
                          <td>
                            @if (!empty($booking->attachment))
                              <a class="btn btn-sm btn-info" href="#" data-toggle="modal"
                                data-target="#attachmentModal{{ $booking->id }}">
                                {{ __('Show') }}
                              </a>
                            @else
                              -
                            @endif
                          </td>
                          <td>
                            <div class="dropdown">
                              <button class="btn btn-secondary btn-sm dropdown-toggle" type="button"
                                id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                {{ __('Select') }}
                              </button>

                              <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                                <a href="{{ route('user.room_bookings.booking_details_and_edit', ['id' => $booking->id]) . '?language=' . request('language') }}"
                                  class="dropdown-item">
                                  {{ __('Details_and_Edit') }}
                                </a>
                                @if (!empty($booking->invoice) && file_exists(public_path('assets/invoices/rooms/' . $booking->invoice)))
                                  <a href="{{ asset('assets/invoices/rooms/' . $booking->invoice) }}"
                                    class="dropdown-item" target="_blank">
                                    {{ __('Invoice') }}
                                  </a>
                                @endif

                                <a href="#" class="dropdown-item mailBtn" data-target="#mailModal"
                                  data-toggle="modal" data-customer_email="{{ $booking->customer_email }}">
                                  {{ __('Send_Mail') }}
                                </a>

                                <form class="deleteform d-block  "
                                  action="{{ route('user.room_bookings.delete_booking', ['id' => $booking->id]) }}"
                                  method="post">
                                  @csrf
                                  <button type="submit" class="deletebtn">
                                    {{ __('Delete') }}
                                  </button>
                                </form>
                              </div>
                            </div>
                          </td>
                        </tr>

                        @includeIf('user.rooms.booking.show_attachment')
                      @endforeach
                    </tbody>
                  </table>
                </div>
              @endif
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="row">
            <div class="d-inline-block mx-auto">
              {{ $bookings->appends(['booking_no' => request()->input('booking_no')])->links() }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  @includeIf('user.rooms.booking.send_mail')

  @includeIf('user.rooms.booking.all_rooms')
@endsection

@section('scripts')
  <script type="text/javascript" src="{{ asset('assets/admin/js/admin-room.js') }}"></script>
@endsection
