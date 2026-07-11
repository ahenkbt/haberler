@php
  $shopSettings = App\Models\User\UserShopSetting::where('user_id', $user->id)->first();
  if ($shopSettings == null) {
      $shopSettings = new \stdClass();
      $shopSettings->is_shop = 0;
      $shopSettings->catalog_mode = 0;
  }

  $donation = DB::table('user_donation_settings')->where('user_id', $user->id)->first();
  $room = DB::table('user_room_settings')->where('user_id', $user->id)->first();

@endphp
<div class="col-lg-3">
  <div class="user-sidebar mb-40">
    <ul class="links reset-ul">
      <li>
        <a class="@if (request()->routeIs('customer.dashboard')) active @endif" href="{{ route('customer.dashboard', getParam()) }}"><i
            class="fal fa-tachometer-alt"></i>
          {{ $keywords['Dashboard'] ?? __('Dashboard') }}</a>
      </li>
      <li>
        <a class=" @if (request()->routeIs('customer.edit_profile')) active @endif"
          href="{{ route('customer.edit_profile', getParam()) }}"><i class="fal fa-user"></i>
          {{ $keywords['my_profile'] ?? __('My Profile') }}</a>
      </li>
      @if (in_array('Course Management', $packagePermissions))
        <li class="menu-item-has-children @if (request()->routeIs('customer.my_courses') || request()->routeIs('customer.purchase_history')) open @endif">
          <a href="#" target="_blank">
            <i class="far fa-play"></i>

            {{ $keywords['Courses'] ?? __('Courses') }}
          </a>
          <ul class="sub-menu reset-ul">
            <li>
              <a class=" @if (request()->routeIs('customer.my_courses')) active @endif"
                href="{{ route('customer.my_courses', getParam()) }}">
                <i class="far fa-play-circle"></i>
                {{ $keywords['my_courses'] ?? __('My Courses') }}
              </a>
            </li>
            <li>
              <a class=" @if (request()->routeIs('customer.purchase_history')) active @endif"
                href="{{ route('customer.purchase_history', getParam()) }}">
                <i class="far fa-file-alt"></i>
                {{ $keywords['Purchase_History'] ?? __('Enrollment History') }}</a>
            </li>
          </ul>
        </li>
      @endif
      @if (in_array('Donation Management', $packagePermissions))
        @if (!is_null($donation) && $donation->is_donation == 1)
          <li>
            <a class=" @if (request()->routeIs('customer.donations')) active @endif"
              href="{{ route('customer.donations', getParam()) }}"><i class="fas fa-hand-holding-usd"></i>
              {{ $keywords['donation'] ?? __('Donation') }}</a>
          </li>
        @endif
      @endif

      @if (in_array('Ecommerce', $packagePermissions))
        <li class="menu-item-has-children @if (request()->routeIs('customer.orders') ||
                request()->routeIs('customer.wishlist') ||
                request()->routeIs('customer.orders-details')) open @endif">
          <a href="#" target="_blank">
            <i class="fal fa-clipboard-list"></i>

            {{ $keywords['Products'] ?? __('Products') }}
          </a>
          <ul class="sub-menu reset-ul">
            @if ($shopSettings->is_shop == 1 && $shopSettings->catalog_mode == 0)
              <li>
                <a class=" @if (request()->routeIs('customer.orders') || request()->routeIs('customer.orders-details')) active @endif"
                  href="{{ route('customer.orders', getParam()) }}">
                  <i class="fal fa-folders"></i>
                  {{ $keywords['myOrders'] ?? __('Product Order') }}
                </a>
              </li>
            @endif
            <li>
              <a class=" @if (request()->routeIs('customer.wishlist')) active @endif"
                href="{{ route('customer.wishlist', getParam()) }}"><i class="fal fa-heart"></i>
                {{ $keywords['mywishlist'] ?? __('Product Wishlist') }}</a>
            </li>
          </ul>
        </li>
      @endif
      @if (in_array('Hotel Booking', $packagePermissions))
        @if (!is_null($room) && $room->is_room == 1)
          <li>
            <a class=" @if (request()->routeIs('customer.roomBookings')) active 
                            @elseif (request()->routeIs('customer.room_booking_details')) active @endif"
              href="{{ route('customer.roomBookings', getParam()) }}"><i class="far fa-hotel"></i>
              {{ $keywords['Room_Bookings'] ?? __('Room Bookings') }}</a>
          </li>
        @endif
      @endif
      @if (in_array('Ecommerce', $packagePermissions))
        @if ($shopSettings->is_shop == 1 && $shopSettings->catalog_mode == 0)
          <li>
            <a class=" @if (request()->routeIs('customer.shpping-details')) active @endif"
              href="{{ route('customer.shpping-details', getParam()) }}"><i class="far fa-truck"></i>
              {{ $keywords['shipping_details'] ?? __('Shipping Details') }}</a>
          </li>
        @endif
      @endif
      @if (in_array('Ecommerce', $packagePermissions) || in_array('Course Management', $packagePermissions))
        <li>
          <a class=" @if (request()->routeIs('customer.billing-details')) active @endif"
            href="{{ route('customer.billing-details', getParam()) }}"> <i class="fal fa-wallet"></i>
            {{ $keywords['billing_details'] ?? __('Billing Details') }}</a>
        </li>
      @endif
      @if ($userBs->theme === 'home_thirteen')
        @if (in_array('Blog', $packagePermissions))
          <li>
            <a class=" @if (request()->routeIs('customer.my_bookmarks')) active @endif"
              href="{{ route('customer.my_bookmarks', getParam()) }}"><i class="fas fa-bookmark"></i>
              {{ $keywords['Bookmark_List'] ?? __('Bookmark List') }}</a>
          </li>
        @endif
      @endif
      <li>
        <a class=" @if (request()->routeIs('customer.change_password')) active @endif"
          href="{{ route('customer.change_password', getParam()) }}"><i class="fal fa-unlock-alt"></i>
          {{ $keywords['Change_Password'] ?? __('Change Password') }} </a>
      </li>
      <li>
        <a href="{{ route('customer.logout', getParam()) }}"><i class="fal fa-sign-out"></i>
          {{ $keywords['Signout'] ?? __('Sign out') }}</a>
      </li>
    </ul>
  </div>
</div>
