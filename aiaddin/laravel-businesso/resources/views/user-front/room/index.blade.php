@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Rooms'] ?? 'Rooms' }}
@endsection

@section('meta-description', !empty($userSeo) ? $userSeo->meta_description_rooms : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->meta_keyword_rooms : '')

@section('page-name')
  {{ $keywords['Rooms'] ?? 'Rooms' }}
@endsection
@section('br-name')
  {{ $keywords['Rooms'] ?? 'Rooms' }}
@endsection

@section('content')

  <!-- All Rooms Section Start -->
  <section class="rooms-warp list-view section-bg section-padding">
    <div class="container">
      <div class="row">
        @if (!is_null($roomSetting) && $roomSetting->room_category_status == 1)
          <div class="col-12">
            <div class="filter-view">
              <ul>
                <li @if (empty(request()->input('category'))) class="active-f-view" @endif><a
                    href="{{ route('front.user.rooms', getParam()) }}">{{ $keywords['All'] ?? 'All' }}</a>
                </li>
                @foreach ($Rcategories as $cat)
                  <li @if (request()->input('category') == $cat->id) class="active-f-view" @endif><a
                      href="{{ route('front.user.rooms', getparam()) . '?category=' . $cat->id }}">{{ $cat->name }}</a>
                  </li>
                @endforeach

              </ul>
            </div>
          </div>
        @endif
        <div class="col-lg-8">
          @if (count($roomInfos) == 0)
            <div class="row text-center">
              <div class="col bg-white py-5">
                <h3>{{ $keywords['No_Room_Found!'] ?? 'No Room Found!' }}</h3>
              </div>
            </div>
          @else
            <div class="row">
              @foreach ($roomInfos as $roomInfo)
                <div class="col-md-6">
                  <!-- Single Room -->
                  <div class="single-room">
                    <a class="room-thumb d-block"
                      href="{{ route('front.user.room_details', [getParam(), $roomInfo->room_id, $roomInfo->slug]) }}">
                      <img class="lazy"
                        data-src="{{ asset('assets/img/rooms/feature-images/' . $roomInfo->featured_img) }}"
                        alt="room">
                      <div class="room-price">
                        <p>
                          {{ $currencyInfo->base_currency_symbol_position == 'left' ? $currencyInfo->base_currency_symbol : '' }}
                          {{ formatNumber($roomInfo->rent) }}
                          {{ $currencyInfo->base_currency_symbol_position == 'right' ? $currencyInfo->base_currency_symbol : '' }}
                          / {{ $keywords['Night'] ?? 'Night' }}</p>
                      </div>
                    </a>

                    <div class="room-desc">
                      @if (!is_null($roomSetting) && $roomSetting->room_category_status == 1)
                        <div class="room-cat">
                          <a class="d-block p-0"
                            href="{{ route('front.user.rooms', [getParam(), 'category' => $roomInfo->id]) }}">
                            {{ $roomInfo->name }} </a>
                        </div>
                      @endif
                      <h4>
                        <a
                          href="{{ route('front.user.room_details', [getParam(), 'id' => $roomInfo->room_id, 'slug' => $roomInfo->slug]) }}">
                          {{ strlen($roomInfo->title) > 45 ? mb_substr($roomInfo->title, 0, 45, 'utf-8') . '...' : $roomInfo->title }}
                        </a>
                      </h4>
                      <p> {{ $roomInfo->summary }} </p>
                      <ul class="room-info">
                        <li><i class="far fa-bed"></i>{{ $roomInfo->bed }}
                          {{ $roomInfo->bed == 1 ? $keywords['Bed'] ?? 'Bed' : $keywords['Beds'] ?? 'Beds' }}
                        </li>
                        <li><i class="far fa-bath"></i>{{ $roomInfo->bath }}
                          {{ $roomInfo->bath == 1 ? $keywords['Bath'] ?? 'Bath' : $keywords['Baths'] ?? 'Baths' }}
                        </li>
                        @if (!empty($roomInfo->max_guests))
                          <li><i class="far fa-users"></i>{{ $roomInfo->max_guests }}
                            {{ $roomInfo->max_guests == 1 ? $keywords['Guest'] ?? 'Guest' : $keywords['Guests'] ?? 'Guests' }}
                          </li>
                        @endif
                      </ul>
                      @if (!is_null($roomSetting) && $roomRating->room_rating_status == 1)
                        @php
                          $avgRating = \App\Models\User\HotelBooking\RoomReview::where(
                              'room_id',
                              $roomInfo->room_id,
                          )->avg('rating');
                        @endphp
                        <div class="rate">
                          <div class="rating" style="width:{{ $avgRating * 20 }}%"></div>
                        </div>
                      @endif
                    </div>

                  </div>
                </div>
              @endforeach
            </div>
          @endif
        </div>
        @includeIf('user-front.room.room_sidebar')
      </div>
    </div>
  </section>
  <!--====== Room Section End ======-->
@endsection

@section('styles')
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme9/plugins.min.css') }}" />
@endsection

@section('scripts')
  <script src="{{ asset('assets/front/user/js/theme9/plugins.min.js') }}"></script>
  <script>
    "use strict";
    var currency_info = {!! json_encode($currencyInfo) !!};
    var minprice = {{ $minPrice }};
    var maxprice = {{ $maxPrice }};
    var priceValues = [{{ $minRent }}, {{ $maxRent }}];
  </script>

  <script src="{{ asset('assets/front/user/js/theme9/room-sidebar.js') }}"></script>
@endsection
