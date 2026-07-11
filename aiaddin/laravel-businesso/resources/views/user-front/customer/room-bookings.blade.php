@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Room_Bookings'] ?? __('Room Bookings') }}
@endsection

@section('page-name')
  {{ $keywords['Room_Bookings'] ?? __('Room Bookings') }}
@endsection
@section('br-name')
  {{ $keywords['Room_Bookings'] ?? __('Room Bookings') }}
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
              @if (count($roomBookingInfos) == 0)
                <div class="py-5 bg-light">
                  <h3 class="text-center">
                    {{ $keywords['NO_ROOM_BOOKING_FOUND'] ?? __('No Room Booking Found!') }}</h3>
                </div>
              @else
                <div class="user-profile-details">
                  <div class="account-info">
                    <div class="title">
                      <h4>{{ $keywords['Recent_Room_Bookings'] ?? __('Recent Room Bookings') }}</h4>
                    </div>
                    <div class="main-info">
                      <div class="main-table">
                        <div class="table-responsiv">
                          <table id="dashboard-datatable"
                            class="dataTables_wrapper dt-responsive table-striped dt-bootstrap4" style="width:100%">
                            <thead>
                              <tr>
                                <th>{{ $keywords['Booking_Number'] ?? __('Booking Number') }}
                                </th>
                                <th>{{ $keywords['title'] ?? __('Title') }}</th>
                                <th>{{ $keywords['Booking_Date'] ?? __('Booking Date') }}
                                </th>
                                <th>{{ $keywords['Booking_Status'] ?? __('Booking Status') }}
                                </th>
                                <th>{{ $keywords['action'] ?? __('Action') }}</th>
                              </tr>
                            </thead>
                            <tbody>
                              @foreach ($roomBookingInfos as $info)
                                <tr>
                                  <td class="pl-3">{{ '#' . $info->booking_number }}
                                  </td>
                                  @php
                                    $room = $info->hotelRoom()->first();
                                    $roomTitle = '---';
                                    if ($room) {
                                        $roomDetails = $room
                                            ->roomContent()
                                            ->where('language_id', $langInfo->id)
                                            ->first();

                                        $roomTitle = $roomDetails->title ?? '---';
                                    }
                                  @endphp

                                  <td class="pl-3">
                                    @if ($room && $roomDetails)
                                      <a target="_blank"
                                        href="{{ route('front.user.room_details', [getParam(), $roomDetails->room_id, $roomDetails->slug]) }}">
                                        {{ strlen($roomTitle) > 20 ? mb_substr($roomTitle, 0, 20) . '...' : $roomTitle }}
                                      </a>
                                    @else
                                      {{ $roomTitle }}
                                    @endif
                                  </td>

                                  <td class="pl-3">
                                    {{ date_format($info->created_at, 'M d, Y') }}</td>
                                  @if ($info->payment_status == 1)
                                    <td class="pl-3"><span
                                        class="complete">{{ $keywords['Completed'] ?? __('Complete') }}</span>
                                    </td>
                                  @else
                                    <td class="pl-3"><span
                                        class="pending">{{ $keywords['Pending'] ?? __('Pending') }}</span>
                                    </td>
                                  @endif

                                  <td class="pl-3">
                                    <a href="{{ route('customer.room_booking_details', [getParam(), 'id' => $info->id]) }}"
                                      class="btn">
                                      {{ $keywords['details'] ?? __('Details') }}
                                    </a>
                                  </td>
                                </tr>
                              @endforeach
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              @endif
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <!--======  End User Edit-Profile Section  ======-->
@endsection
