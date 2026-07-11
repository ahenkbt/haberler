@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['room_details'] ?? 'Room Details' }}
@endsection

@section('og-meta')
  <meta property="og:image" content="{{ asset('assets/img/rooms/feature-images/' . $details->featured_img) }}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1024">
  <meta property="og:image:height" content="1024">
@endsection

@section('meta-description', !empty($userSeo) ? $userSeo->meta_description_room_details : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->meta_keyword_room_details : '')

@section('page-name')
  {{ $details->title }}
@endsection
@section('br-name')
  {{ $keywords['room_details'] ?? 'Room Details' }}
@endsection

@section('styles')
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme9/plugins.min.css') }}" />
@endsection

@section('content')

  <section class="room-details-wrapper section-padding">
    @php
      $position = $currencyInfo->base_currency_symbol_position;
      $symbol = $currencyInfo->base_currency_symbol;
    @endphp

    <div class="container">
      {{-- show error message for attachment --}}
      @error('attachment')
        <div class="row">
          <div class="col">
            <div class="alert alert-danger alert-block">
              <strong>{{ $message }}</strong>
              <button type="button" class="close" data-dismiss="alert">×</button>
            </div>
          </div>
        </div>
      @enderror

      {{-- show error message for room review --}}
      @error('rating')
        <div class="row">
          <div class="col">
            <div class="alert alert-danger alert-block">
              <strong>{{ $message }}</strong>
              <button type="button" class="close" data-dismiss="alert">×</button>
            </div>
          </div>
        </div>
      @enderror

      <div class="row">
        <!-- Room Details Section Start -->
        <div class="col-lg-8">
          <div class="room-details">
            <div class="entry-header">
              <div class="post-thumb position-relative">
                <div class="post-thumb-slider">
                  @php
                    $sliderImages = json_decode($details->room->slider_imgs);
                  @endphp

                  <div class="main-slider">
                    @foreach ($sliderImages as $image)
                      <div class="single-img">
                        <a href="{{ asset('assets/img/rooms/slider-images/' . $image) }}" class="main-img">
                          <img src="{{ asset('assets/img/rooms/slider-images/' . $image) }}" alt="Image">
                        </a>
                      </div>
                    @endforeach
                  </div>

                  <div class="dots-slider row">
                    @foreach ($sliderImages as $image)
                      <div class="single-dots">
                        <img src="{{ asset('assets/img/rooms/slider-images/' . $image) }}" alt="image">
                      </div>
                    @endforeach
                  </div>
                </div>
                <div class="price-tag">
                  {{ $position == 'left' ? $symbol : '' }}{{ formatNumber($details->room->rent) }}{{ $position == 'right' ? $symbol : '' }}
                  / {{ $keywords['Night'] ?? 'Night' }}
                </div>
              </div>

              <div class="d-flex align-items-center justify-content-between mb-4">
                @if ($roomSetting->room_category_status == 1)
                  <div class="room-cat mb-0">
                    <a
                      href="{{ route('front.user.rooms', [getParam(), 'category' => $details->roomCategory->id]) }}">{{ $details->roomCategory->name }}</a>
                  </div>
                @endif

                @if ($roomSetting->room_rating_status == 1)
                  <div class="rate">
                    <div class="rating" style="width:{{ $avgRating * 20 }}%"></div>
                  </div>
                @endif
              </div>

              <p id="room-id" class="d-none">{{ $details->room_id }}</p>

              <h2 class="entry-title">{{ convertUtf8($details->title) }}</h2>
              <ul class="entry-meta list-inline">
                <li><i class="far fa-bed"></i>{{ $details->room->bed }}
                  {{ $details->room->bed == 1 ? $keywords['Bed'] ?? __('Bed') : $keywords['Beds'] ?? __('Beds') }}
                </li>
                <li><i class="far fa-bath"></i>{{ $details->room->bath }}
                  {{ $details->room->bath == 1 ? $keywords['Bath'] ?? __('Bath') : $keywords['Baths'] ?? __('Baths') }}
                </li>
                @if (!empty($details->room->max_guests))
                  <li><i class="far fa-users"></i>{{ $details->room->max_guests }}
                    {{ $details->room->max_guests == 1 ? $keywords['Guest'] ?? __('Guest') : $keywords['Guests'] ?? __('Guests') }}
                  </li>
                @endif
              </ul>
            </div>

            <div class="room-details-tab">
              <div class="row">
                <div class="col-sm-3">
                  <ul class="nav desc-tab-item" role="tablist">
                    <li class="nav-item">
                      <a class="nav-link active" href="#desc" role="tab" data-toggle="tab">
                        {{ $keywords['room_details'] ?? 'Room Details' }}
                      </a>
                    </li>

                    <li class="nav-item">
                      <a class="nav-link" href="#amm" role="tab" data-toggle="tab">
                        {{ $keywords['Amenities'] ?? 'Amenities' }}
                      </a>
                    </li>

                    <li class="nav-item">
                      <a class="nav-link" href="#location" role="tab" data-toggle="tab">
                        {{ $keywords['contact_info'] ?? 'Contact Info' }}
                      </a>
                    </li>

                    <li class="nav-item {{ $roomSetting->room_rating_status == 0 ? 'd-none' : '' }}">
                      <a class="nav-link" href="#reviews" role="tab" data-toggle="tab">
                        {{ $keywords['Reviews'] ?? 'Reviews' }}
                      </a>
                    </li>
                  </ul>
                </div>

                <div class="col-sm-9">
                  <div class="tab-content desc-tab-content">
                    <div role="tabpanel" class="tab-pane fade in active show" id="desc">
                      <h5 class="tab-title">{{ $keywords['room_details'] ?? 'Room Details' }}</h5>
                      <div class="entry-content">
                        <p>{!! replaceBaseUrl($details->description, 'summernote') !!}</p>
                      </div>
                    </div>

                    <div role="tabpanel" class="tab-pane fade" id="amm">
                      <h5 class="tab-title">{{ $keywords['Amenities'] ?? 'Amenities' }}</h5>
                      <div class="ammenities">
                        @foreach ($amms as $key => $amm)
                          <a>{{ $amm }}</a>
                        @endforeach
                      </div>
                    </div>

                    <div role="tabpanel" class="tab-pane fade" id="location">
                      <div class="room-location">
                        <div class="row">
                          @if (!empty($details->address))
                            <div class="col-4">
                              <h6>{{ $keywords['address'] ?? 'Address' }}</h6>
                              <p>{{ $details->address }}</p>
                            </div>
                          @endif

                          @if (!empty($details->phone))
                            <div class="col-4">
                              <h6>{{ $keywords['phone'] ?? 'Phone' }}</h6>
                              <p>{{ $details->phone }}</p>
                            </div>
                          @endif

                          @if (!empty($details->email))
                            <div class="col-4">
                              <h6>{{ $keywords['email'] ?? 'Email' }}</h6>
                              <p>{{ $details->email }}</p>
                            </div>
                          @endif
                        </div>
                      </div>

                      @if (!empty($details->latitude) && !empty($details->longitude))
                        <h5 class="tab-title mt-3">{{ $keywords['Google_Map'] ?? 'Google Map' }}
                        </h5>
                        <div>
                          <iframe width="100%" height="400" frameborder="0" scrolling="no" marginheight="0"
                            marginwidth="0"
                            src="https://maps.google.com/maps?width=100%25&amp;height=600&amp;hl=en&amp;q={{ $details->latitude }},%20{{ $details->longitude }}+(My%20Business%20Name)&amp;t=&amp;z=15&amp;ie=UTF8&amp;iwloc=B&amp;output=embed"></iframe>
                        </div>
                      @endif
                    </div>

                    <div role="tabpanel" class="tab-pane fade" id="reviews">
                      <div class="comment-area">
                        <h5 class="tab-title">{{ $keywords['Reviews'] ?? 'Reviews' }}</h5>

                        @if (count($reviews) == 0)
                          <div class="bg-light py-5">
                            <h6 class="text-center">
                              {{ $keywords['no_reviews_found'] ?? 'This Room Has No Review Yet.' }}
                            </h6>
                          </div>
                        @else
                          <ul class="comment-list">
                            @foreach ($reviews as $review)
                              <li>
                                @php
                                  $user = $review->roomReviewedByCustomer()->first();
                                @endphp

                                <div class="comment-user">
                                  <img class="lazy"
                                    data-src="{{ !empty($user->image) ? asset('assets/user/img/users/' . $user->image) : asset('assets/img/user-profile.jpg') }}"
                                    alt="user image">
                                </div>

                                <div class="comment-desc">
                                  <h6>{{ $user->first_name . ' ' . $user->last_name }}
                                    <span class="comment-date">
                                      {{ date_format($review->created_at, 'd M Y') }}</span>
                                  </h6>
                                  <div class="user-rating">
                                    @for ($i = 1; $i <= $review->rating; $i++)
                                      <i class="fa fa-star"></i>
                                    @endfor
                                  </div>
                                  <p>{{ $review->comment }}</p>

                                </div>
                              </li>
                            @endforeach
                          </ul>
                        @endif
                      </div>

                      @guest('customer')
                        <h5>{{ $keywords['Please'] ?? 'Please' }}
                          <a class="text-primary"
                            href="{{ route('customer.login', [getParam(), 'redirectPath' => 'room_details']) }}">{{ $keywords['Login'] ?? 'Login' }}</a>
                          {{ $keywords['to_leave_a_review'] ?? 'To Give Your Review.' }}
                        </h5>
                      @endguest

                      @auth('customer')
                        <div class="review-form">
                          <h5 class="tab-title">
                            {{ $keywords['to_leave_a_review'] ?? 'To Give Your Review.' }}</h5>
                          <form
                            action="{{ route('front.user.room.store_review', [getParam(), 'id' => $details->room_id]) }}"
                            method="POST">
                            @csrf
                            <div class="mb-25">
                              <div class="review-content">
                                <ul class="review-value review-1">
                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="1">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>
                                </ul>

                                <ul class="review-value review-2">
                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="2">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>

                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="2">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>
                                </ul>

                                <ul class="review-value review-3">
                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="3">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>

                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="3">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>

                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="3">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>
                                </ul>

                                <ul class="review-value review-4">
                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="4">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>

                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="4">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>

                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="4">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>

                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="4">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>
                                </ul>

                                <ul class="review-value review-5">
                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="5">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>

                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="5">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>

                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="5">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>

                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="5">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>

                                  <li>
                                    <a class="cursor-pointer" data-ratingVal="5">
                                      <i class="far fa-star"></i>
                                    </a>
                                  </li>
                                </ul>
                              </div>
                            </div>

                            <input type="hidden" id="ratingId" name="rating">

                            <div class="input-wrap text-area">
                              <textarea placeholder="{{ $keywords['Review'] ?? 'Review' }}" name="comment">{{ old('comment') }}</textarea>
                            </div>

                            <div class="input-wrap">
                              <button type="submit" class="btn btn-block">
                                {{ $keywords['Submit'] ?? 'Submit' }}
                              </button>
                            </div>
                          </form>
                        </div>
                      @endauth
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Room Details Section End -->

        <!-- Sidebar Area Start -->
        <div class="col-lg-4">
          <div class="sidebar-wrap">
            <div class="widget booking-widget">
              <h4 class="widget-title">
                {{ $position == 'left' ? $symbol : '' }}{{ formatNumber($details->room->rent) }}{{ $position == 'right' ? $symbol : '' }}
                / <span>{{ $keywords['Night'] ?? 'Night' }}</span>
              </h4>

              {{-- @if (Auth::guard('customer')->check() == false && $roomSetting->room_guest_checkout_status == 0)
                                <div class="alert alert-warning">
                                    {{ __('You are now booking as a guest. if you want to log in before booking, then please') }}
                                    <a
                                        href="{{ route('customer.login', ['username' => getParam(), 'redirectPath' => 'room_details']) }}">{{ $keywords['Click_Here'] ?? 'Click Here' }}</a>
                                </div>
                            @else --}}
              <form action="{{ route('front.user.room_booking', getParam()) }}" method="POST"
                enctype="multipart/form-data" id="payment-form">
                @csrf
                <input type="hidden" name="room_id" value="{{ $details->room_id }}">

                <div class="mb-2">
                  <div class="input-wrap">
                    <input type="text"
                      placeholder="{{ $keywords['Check_In_/_Out_Date'] ?? __('Check In / Out Date') }}"
                      id="date-ranged" name="dates" value="{{ old('dates') }}" readonly>
                    <i class="far fa-calendar-alt"></i>
                  </div>
                  @error('dates')
                    <p class="ml-2 mt-2 text-danger">{{ $message }}</p>
                  @enderror
                </div>

                <div class="mb-2">
                  <div class="input-wrap">
                    <input type="text" placeholder="{{ $keywords['Number_of_Nights'] ?? 'Number of Nights' }}"
                      id="night" name="nights" value="{{ old('nights') }}" readonly>
                    <i class="fas fa-moon"></i>
                  </div>
                  <small class="text-primary mt-2 {{ $currentLanguageInfo->direction == 0 ? 'ml-2' : 'mr-2' }} mb-0">
                    {{ $keywords['Number_of_nights_will_be_calculated_based_on_checkin_&_checkout_date'] ?? __('Number of nights will be calculated based on checkin & checkout date') }}
                  </small>
                  @error('nights')
                    <p class="ml-2 text-danger">{{ $message }}</p>
                  @enderror
                </div>

                <div class="mb-2">
                  <div class="input-wrap">
                    <input type="text" placeholder="{{ $keywords['Number_of_Guests'] ?? 'Number of Guests' }}"
                      name="guests" value="{{ old('guests') }}">
                    <i class="far fa-users"></i>
                  </div>
                  @error('guests')
                    <p class="ml-2 mt-2 text-danger">{{ $message }}</p>
                  @enderror
                </div>

                <div class="mb-2">
                  <div class="input-wrap">
                    @guest('customer')
                      <input type="text" placeholder="{{ $keywords['Full_Name'] ?? 'Full Name' }}"
                        name="customer_name" value="{{ old('customer_name') }}">
                    @endguest

                    @auth('customer')
                      @php
                        if (
                            !empty(Auth::guard('customer')->user()->first_name) ||
                            !empty(Auth::guard('customer')->user()->last_name)
                        ) {
                            $name =
                                Auth::guard('customer')->user()->first_name .
                                ' ' .
                                Auth::guard('customer')->user()->last_name;
                        } else {
                            $name = '';
                        }
                      @endphp

                      <input type="text" placeholder="{{ $keywords['Full_Name'] ?? 'Full Name' }}"
                        name="customer_name" value="{{ $name }}">
                    @endauth
                    <i class="far fa-user"></i>
                  </div>
                  @error('customer_name')
                    <p class="ml-2 mt-2 text-danger">{{ $message }}</p>
                  @enderror
                </div>

                <div class="mb-2">
                  <div class="input-wrap">
                    @guest('customer')
                      <input type="text" placeholder="{{ $keywords['phone'] ?? 'Phone' }}" name="customer_phone"
                        value="{{ old('customer_phone') }}">
                    @endguest

                    @auth('customer')
                      <input type="text" placeholder="{{ $keywords['phone'] ?? 'Phone' }}" name="customer_phone"
                        value="{{ Auth::guard('customer')->user()->contact_number }}">
                    @endauth
                    <i class="far fa-phone"></i>
                  </div>
                  @error('customer_phone')
                    <p class="ml-2 mt-2 text-danger">{{ $message }}</p>
                  @enderror
                </div>

                <div class="mb-2">
                  <div class="input-wrap">
                    @guest('customer')
                      <input type="email" placeholder="{{ $keywords['email'] ?? 'Email' }}" name="customer_email"
                        value="{{ old('customer_email') }}">
                    @endguest

                    @auth('customer')
                      <input type="email" placeholder="{{ $keywords['email'] ?? 'Email' }}" name="customer_email"
                        value="{{ Auth::guard('customer')->user()->email }}">
                    @endauth
                    <i class="far fa-envelope"></i>
                  </div>
                  @error('customer_email')
                    <p class="ml-2 mt-2 text-danger">{{ $message }}</p>
                  @enderror
                </div>

                <div class="mb-2">
                  <div class="input-wrap">
                    <select class="nice-select" name="paymentType" id="payment-gateways">
                      <option selected disabled value="none">
                        {{ $keywords['select_payment_gateway'] ?? __('Select Payment Gateway') }}
                      </option>
                      @foreach ($onlineGateways as $onlineGateway)
                        <option value="{{ $onlineGateway->keyword }}"
                          {{ $onlineGateway->keyword == old('paymentType') ? 'selected' : '' }}>
                          {{ $keywords[$onlineGateway->name] ?? $onlineGateway->name }}
                        </option>
                      @endforeach

                      @if (!empty($offlineGateways))
                        @foreach ($offlineGateways as $offlineGateway)
                          <option value="{{ $offlineGateway['id'] }}">
                            {{ $offlineGateway['name'] }}
                          </option>
                        @endforeach
                      @endif
                    </select>
                  </div>
                </div>

                <div class="iyzico-element {{ old('paymentType') == 'iyzico' ? '' : 'd-none' }}">
                  <input type="text" name="city" class="form_control mb-2 mt-2" placeholder="City"
                    value="{{ old('city') }}">
                  @error('city')
                    <p class="text-danger text-left">{{ $message }}</p>
                  @enderror
                  <input type="text" name="country" class="form_control mb-2 mt-2" placeholder="Country"
                    value="{{ old('country') }}">
                  @error('country')
                    <p class="text-danger text-left">{{ $message }}</p>
                  @enderror
                  <input type="text" name="zip_code" class="form_control mb-2 mt-2" placeholder="Zip Code"
                    value="{{ old('zip_code') }}">
                  @error('zip_code')
                    <p class="text-danger text-left">{{ $message }}</p>
                  @enderror

                  <input type="text" name="address" class="form_control mb-2 mt-2" placeholder="Address"
                    value="{{ old('address') }}">
                  @error('address')
                    <p class="text-danger text-left">{{ $message }}</p>
                  @enderror

                  <input type="text" name="identity_number" class="form_control mb-2 mt-2"
                    placeholder="Identity Number" value="{{ old('identity_number') }}">
                  @error('identity_number')
                    <p class="text-danger text-left">{{ $message }}</p>
                  @enderror
                </div>
                <div class="mb-2">
                  <div class="{{ old('paymentType') == 'stripe' ? '' : 'd-none' }} " id="tab-stripe">
                    <div class="input-wrap ">
                      <div id="stripe-element" class="mb-2">
                        <!-- A Stripe Element will be inserted here. -->
                      </div>
                      <!-- Used to display form errors -->
                      <div id="stripe-errors" class="pb-2 text-danger" role="alert"></div>
                    </div>
                  </div>
                </div>
                <div style="{{ old('paymentType') == 'authorize.net' ? '' : 'd-none' }}" id="authorizenet-form">
                  <div class="row  ">
                    <div class="col-md-12 mb-4">
                      <div class="form_group">

                        <input type="text" class="form_control" id="AcardNumber" autocomplete="off"
                          name="AuthorizeCardNumber"
                          placeholder="{{ $keywords['enter_your_card_number'] ?? __('enter_your_card_number') . ' *' }}">
                        @error('AuthorizeCardNumber')
                          <p class="ml-2 mt-2 text-danger">{{ $message }}</p>
                        @enderror
                      </div>
                    </div>

                    <div class="col-md-12 mb-4">
                      <div class="form_group">

                        <input type="text" class="form_control" id="AcardCode" autocomplete="off"
                          name="AuthorizeCardCode"
                          placeholder="{{ $keywords['enter_card_code'] ?? __('enter_card_code') . ' *' }}">
                        @error('AuthorizeCardCode')
                          <p class="ml-2 mt-2 text-danger">{{ $message }}</p>
                        @enderror
                      </div>
                    </div>

                    <div class="col-md-12 mb-4">
                      <div class="form_group">

                        <input type="text" class="form_control" id="AexpMonth" name="AuthorizeMonth"
                          placeholder="{{ $keywords['enter_expiry_month'] ?? __('enter_expiry_month') . ' *' }}">
                        @error('AuthorizeMonth')
                          <p class="ml-2 mt-2 text-danger">{{ $message }}</p>
                        @enderror
                      </div>
                    </div>

                    <div class="col-md-12 mb-4">
                      <div class="form_group">

                        <input type="text" class="form_control" id="AexpYear" name="AuthorizeYear"
                          placeholder="{{ $keywords['enter_expiry_year'] ?? __('enter_expiry_year') . ' *' }}">
                        @error('AuthorizeYear')
                          <p class="ml-2 mt-2 text-danger">{{ $message }}</p>
                        @enderror
                      </div>
                    </div>

                    <input type="hidden" name="opaqueDataValue" id="opaqueDataValue">
                    <input type="hidden" name="opaqueDataDescriptor" id="opaqueDataDescriptor">

                    <ul id="anetErrors" style="display: none; margin-left: 33px;"></ul>
                  </div>
                </div>
                <div class="d-none my-3 px-2" id="gateway-description"></div>

                <div class="d-none mb-3 px-2" id="gateway-instruction"></div>

                <div class="input-wrap d-none mb-4 pl-2" id="gateway-attachment">
                  <input type="file" name="attachment">
                </div>

                <div class="mb-2 pt-2 d-flex flex-column w-100">
                  <div class="input-wrap d-flex">
                    <input type="text" id="coupon-code"
                      placeholder="{{ $keywords['Enter_Your_Coupon'] ?? 'Enter Your Coupon' }}">
                    <button type="button" class="btn filled-btn" onclick="applyCoupon(event)"
                      style="padding: 0px 15px;">
                      {{ $keywords['Apply'] ?? 'Apply' }}
                    </button>
                  </div>
                </div>

                <div class="price-option-table mt-4">
                  <ul>
                    <li class="single-price-option">
                      <span class="title">{{ $keywords['subtotal'] ?? 'Subtotal' }} <span
                          class="amount">{{ $position == 'left' ? $symbol : '' }}<span
                            id="subtotal-amount">{{ __('0.00') }}</span>{{ $position == 'right' ? $symbol : '' }}</span></span>
                    </li>

                    <li class="single-price-option">
                      <span class="title">{{ $keywords['Discount'] ?? 'Discount' }} <span class="text-success">(<i
                            class="fas fa-minus"></i>)</span> <span
                          class="amount">{{ $position == 'left' ? $symbol : '' }}<span
                            id="discount-amount">{{ __('0.00') }}</span>{{ $position == 'right' ? $symbol : '' }}</span></span>
                    </li>

                    <li class="single-price-option">
                      <span class="title">{{ $keywords['total'] ?? 'Total' }} <span
                          class="amount">{{ $position == 'left' ? $symbol : '' }}<span
                            id="total-amount">{{ __('0.00') }}</span>{{ $position == 'right' ? $symbol : '' }}</span></span>
                    </li>
                  </ul>
                </div>

                <div class="mt-4">
                  <div class="input-wrap">
                    <button type="submit" class="btn filled-btn btn-block" id="payment-submit-btn">
                      {{ $keywords['book_now'] ?? 'book now' }} <i class="far fa-long-arrow-right"></i>
                    </button>
                  </div>
                </div>
              </form>
              {{-- @endif --}}
            </div>
          </div>
        </div>
        <!-- Sidebar Area End -->
      </div>
    </div>
  </section>

  <!-- Latest Room Start -->
  <section class="latest-room-d section-bg section-padding">
    <div class="container">
      <!-- Section Title -->
      <div class="section-title text-center">
        <h1>{{ $keywords['Related_Rooms'] ?? 'Related Rooms' }}</h1>
      </div>

      <div class="row">
        {{-- @php
            dd(($latestRooms))
        @endphp --}}
        @forelse ($latestRooms as $latestRoom)
          <div class="col-lg-4 col-md-6">
            <!-- Single Room -->
            <div class="single-room">
              <a class="room-thumb d-block"
                href="{{ route('front.user.room_details', [getParam(), $latestRoom->room->id, $latestRoom->slug]) }}">
                <img class="lazy"
                  data-src="{{ asset('assets/img/rooms/feature-images/' . $latestRoom->room->featured_img) }}"
                  alt="room">
                <div class="room-price">
                  <p>
                    {{ $position == 'left' ? $symbol : '' }}{{ formatNumber($latestRoom->room->rent) }}{{ $position == 'right' ? $symbol : '' }}
                    / {{ $keywords['Night'] ?? 'Night' }}</p>
                </div>
              </a>
              <div class="room-desc">
                @if ($roomSetting->room_category_status == 1)
                  <div class="room-cat">
                    <a class="p-0 d-block"
                      href="{{ route('front.user.rooms', [getParam(), 'category' => $latestRoom->roomCategory->id]) }}">{{ $latestRoom->roomCategory->name }}</a>
                  </div>
                @endif
                <h4>
                  <a
                    href="{{ route('front.user.room_details', [getParam(), 'id' => $latestRoom->room_id, 'slug' => $latestRoom->slug]) }}">{{ convertUtf8($latestRoom->title) }}</a>
                </h4>
                <p>{{ $latestRoom->summary }}</p>
                <ul class="room-info">
                  <li><i class="far fa-bed"></i>{{ $latestRoom->room->bed }}
                    {{ $latestRoom->room->bed == 1 ? $keywords['Bed'] ?? 'Bed' : $keywords['Beds'] ?? 'Beds' }}
                  </li>
                  <li><i class="far fa-bath"></i>{{ $latestRoom->room->bath }}
                    {{ $latestRoom->room->bath == 1 ? $keywords['Bath'] ?? 'Bath' : $keywords['Baths'] ?? 'Baths' }}
                  </li>
                  @if (!empty($latestRoom->room->max_guests))
                    <li><i class="far fa-users"></i>{{ $latestRoom->room->max_guests }}
                      {{ $latestRoom->room->max_guests == 1 ? $keywords['Guest'] ?? 'Guest' : $keywords['Guests'] ?? 'Guests' }}
                    </li>
                  @endif
                </ul>
              </div>
            </div>
          </div>
        @empty
          <div class="col-lg-12">
            <h3 class="text-center ">
              {{ $keywords['No_Related_Rooms_Found'] ?? __('No Related Rooms Found!') }}</h3>
          </div>
        @endforelse

      </div>
    </div>
  </section>
  <!-- Latest Room End -->

@endsection

@section('scripts')
  @if (!empty($stripe_key))
    <script src="https://js.stripe.com/v3/"></script>
  @endif
  <script>
    'use strict';

    // assign php value to js variable
    var baseURL = "{!! url('/') !!}";
    let cUrl = "{{ route('front.user.apply_coupon', getParam()) }}"
    var bookingDates = {!! json_encode($bookingDates) !!};
    var offlineGateways = {!! json_encode($offlineGateways) !!};
    var roomRentPerNight = '{{ $details->rent }}';
    let stripe_key = "{{ $stripe_key }}";
    let stripeError = "{{ $stripeError }}";
    let anetCardError = "{{ $anetCardError }}";
    let anetYearError = "{{ $anetYearError }}";
    let anetMonthError = "{{ $anetMonthError }}";
    let anetExpirationDateError = "{{ $anetExpirationDateError }}";
    let anetCvvInvalidError = "{{ $anetCvvInvalidError }}";
  </script>

  <script src="{{ asset('assets/front/user/js/theme9/plugins.min.js') }}"></script>

  {{-- //stripe payment gateway details  --}}
  <script type="text/javascript">
    const clientKey = '{{ $anetClientKey ?? '' }}';
    const loginId = '{{ $anetLoginId ?? '' }}';
  </script>
  <script type="text/javascript" src="{{ $anetSource ?? '' }}" charset="utf-8"></script>
  <script>
    $('#authorizenet-form').hide();
    $('select[name="paymentType"]').on('change', function() {
      let value = $(this).val();
      let gatewayType = $(this).find(':selected').data('gateway_type');
      let hasAttachment = $(this).find(':selected').data('has_attachment');
      // show or hide 'authorize.net' form
      if (value == 'authorize.net') {
        $('#authorizenet-form').show();
        $('#authorizenet-form input').removeAttr('disabled');
      } else {
        $('#authorizenet-form').hide();
        $('#authorizenet-form input').attr('disabled', true);
      }
    });

    $('#payment-submit-btn').on('click', function(e) {
      e.preventDefault();

      let gateway = $('select[name="paymentType"]').val();

      if (gateway == 'authorize.net') {
        sendPaymentDataToAnet();
      } else if (gateway == 'stripe') {
        stripe.createToken(cardElement).then(function(result) {
          if (result.error) {
            // Display errors to the customer
            var errorElement = document.getElementById('stripe-errors');
            errorElement.textContent = stripeError;

          } else {
            // Send the token to your server
            stripeTokenHandler(result.token);
          }
        });
      } else {
        $('#payment-form').submit();
      }
    });
    // Authorize.Net js code

    function translateMessage(message) {
      const translations = {
        "Please provide valid credit card number.": anetCardError,
        "Please provide valid expiration year.": anetYearError,
        "Please provide valid expiration month.": anetMonthError,
        "Expiration date must be in the future.": anetExpirationDateError,
        "Please provide valid CVV.": anetCvvInvalidError,
      };

      return translations[message] || message;
    }

    function sendPaymentDataToAnet() {
      // set up authorisation to access the gateway.
      var authData = {};
      authData.clientKey = clientKey;
      authData.apiLoginID = loginId;

      var cardData = {};
      cardData.cardNumber = document.getElementById('AcardNumber').value;
      cardData.month = document.getElementById('AexpMonth').value;
      cardData.year = document.getElementById('AexpYear').value;
      cardData.cardCode = document.getElementById('AcardCode').value;

      // now send the card data to the gateway for tokenisation.
      // The responseHandler function will handle the response.
      var secureData = {};
      secureData.authData = authData;
      secureData.cardData = cardData;
      Accept.dispatchData(secureData, responseHandler);
    }

    function responseHandler(response) {
      if (response.messages.resultCode === 'Error') {
        var i = 0;
        let errors = ``;

        while (i < response.messages.message.length) {
          const errorMessage = response.messages.message[i].text;
          const translatedMessage = translateMessage(errorMessage);

          errors += `<li class="text-danger" style="margin-bottom: 5px; list-style-type: disc;">
        ${translatedMessage}
      </li>`;

          i = i + 1;
        }

        $('#anetErrors').html(errors);
        $('#anetErrors').show();
      } else {
        console.log('up')
        paymentFormUpdate(response.opaqueData);
      }
    }

    function paymentFormUpdate(opaqueData) {
      document.getElementById('opaqueDataDescriptor').value = opaqueData.dataDescriptor;
      document.getElementById('opaqueDataValue').value = opaqueData.dataValue;
      document.getElementById('payment-form').submit();
    }

    //stripe init start
    if (!!stripe_key) {
      // Set your Stripe public key
      var stripe = Stripe(stripe_key);

      // Create a Stripe Element for the card field
      var elements = stripe.elements();
      var cardElement = elements.create('card', {
        style: {
          base: {
            iconColor: '#454545',
            color: '#454545',
            fontWeight: '500',
            lineHeight: '50px',
            fontSmoothing: 'antialiased',
            backgroundColor: '#f2f2f2',
            ':-webkit-autofill': {
              color: '#454545',
            },
            '::placeholder': {
              color: '#454545',
            },
          }
        },
      });

      // Add an instance of the card Element into the `card-element` div
      cardElement.mount('#stripe-element');

      // Handle form submission
      var form = document.getElementById('payment-form');


      // Send the token to your server
      function stripeTokenHandler(token) {
        // Add the token to the form data before submitting to the server
        var form = document.getElementById('payment-form');
        var hiddenInput = document.createElement('input');
        hiddenInput.setAttribute('type', 'hidden');
        hiddenInput.setAttribute('name', 'stripeToken');
        hiddenInput.setAttribute('value', token.id);
        form.appendChild(hiddenInput);

        // Submit the form to your server
        form.submit();
      }
    }

    //stripe init start end
  </script>
  <script src="{{ asset('assets/front/user/js/theme9/room-details.js') }}"></script>
@endsection
