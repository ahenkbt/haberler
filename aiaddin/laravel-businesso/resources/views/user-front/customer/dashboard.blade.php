@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Dashboard'] ?? __('Dashboard') }}
@endsection

@section('page-name')
  {{ $keywords['Dashboard'] ?? __('Dashboard') }}
@endsection

@section('br-name')
  {{ $keywords['Dashboard'] ?? __('Dashboard') }}
@endsection

@section('content')
  <!--====== Breadcrumb part End ======-->
  <section class="user-dashbord pt-100 pb-60">
    <div class="container">
      <div class="row">
        @includeIf('user-front.customer.side-navbar')
        <div class="col-lg-9">
          <div class="row mb-4">
            <div class="col-lg-12">

              <div class="user-profile-details">
                <div class="account-info mb-3">
                  <div class="title">
                    <h4 class="mb-2">
                      {{ $keywords['account_information'] ?? __('Account Information') }}</h4>
                  </div>
                  <div class="main-info">


                    <ul class="list">
                      <li class="py-1"><strong>{{ $keywords['Name'] ?? __('Name') }}:</strong>
                        {{ Auth::guard('customer')->user()->first_name }}
                        {{ Auth::guard('customer')->user()->last_name }}</li>
                      <li class="py-1"><strong>{{ $keywords['email'] ?? __('Email') }}:</strong>
                        {{ Auth::guard('customer')->user()->email }}</li>
                      <li class="py-1">
                        <strong>{{ $keywords['Phone_Number'] ?? __('phone') }}:</strong>
                        {{ Auth::guard('customer')->user()->contact_number }}
                      </li>
                      <li class="py-1">
                        <strong>{{ $keywords['address'] ?? __('Address') }}:</strong>
                        {{ Auth::guard('customer')->user()->address }}
                      </li>
                      <li class="py-1"><strong>{{ $keywords['state'] ?? __('State') }}:</strong>
                        {{ Auth::guard('customer')->user()->billing_state }}</li>
                      <li class="py-1"><strong>{{ $keywords['city'] ?? __('City') }}:</strong>
                        {{ Auth::guard('customer')->user()->billing_city }}
                      </li>
                      <li class="py-1">
                        <strong>{{ $keywords['country'] ?? __('Country') }}:</strong>
                        {{ Auth::guard('customer')->user()->billing_country }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="row">

            @if (in_array('Ecommerce', $packagePermissions))
              @if ($userShopSetting->is_shop == 1 && $userShopSetting->catalog_mode == 0)
                <div class="col-md-4">
                  <a href="{{ route('customer.orders', getParam()) }}" class="card card-box box-1 mb-3">
                    <div class="card-info">
                      <h5>{{ $keywords['myOrders'] ?? __('My Orders') }}</h5>
                      <p>{{ $totalorders }}</p>
                    </div>
                  </a>
                </div>
              @endif
              <div class="col-md-4">
                <a href="{{ route('customer.wishlist', getParam()) }}" class="card card-box box-2 mb-3">
                  <div class="card-info">
                    <h5>{{ $keywords['mywishlist'] ?? __('my wishlist') }}</h5>
                    <p>{{ $totalwishlist }} </p>
                  </div>
                </a>
              </div>
            @endif
            @if (in_array('Course Management', $packagePermissions))
              <div class="col-md-4">
                <a class="card card-box box-3 mb-3" href="{{ route('customer.purchase_history', getParam()) }}">
                  <div class="card-info">
                    <h5>{{ $keywords['Enrolled_Courses'] ?? __('Enrolled Courses') }}</h5>
                    <p>{{ $couseCount }}
                    </p>
                  </div>
                </a>
              </div>
            @endif
            @if (in_array('Hotel Booking', $packagePermissions))
              @if (isset($roomSetting) && $roomSetting->is_room == 1)
                <div class="col-md-4">
                  <a class="card card-box box-4 mb-3" href="{{ route('customer.purchase_history', getParam()) }}">
                    <div class="card-info">
                      <h5>{{ $keywords['Room_Bookings'] ?? __('Room Bookings') }}</h5>
                      <p>{{ $roomBookingCount }}
                      </p>
                    </div>
                  </a>
                </div>
              @endif
            @endif
          </div>
        </div>

      </div>
    </div>
    </div>
  </section>
  <!--====== Footer Part Start ======-->
@endsection
