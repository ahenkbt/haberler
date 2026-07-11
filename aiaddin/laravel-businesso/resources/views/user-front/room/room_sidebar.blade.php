<div class="col-lg-4">
  <div class="sidebar-wrap">
    <div class="widget fillter-widget">
      <h4 class="widget-title">{{ $keywords['Filters'] ?? 'Filters' }}</h4>
      <form action="{{ route('front.user.rooms', getParam()) }}" method="GET">
        @if (!is_null($roomSetting) && $roomSetting->room_category_status == 1)
          <input type="hidden" name="category" value="{{ request()->input('category') }}">
        @endif
        <div class="input-wrap">
          <label
            for=""><strong>{{ $keywords['Check_In_/_Out_Date'] ?? __('Check In / Out Date') }}</strong></label>
          <input type="text" placeholder="{{ $keywords['Dates'] ?? __('Dates') }}" id="date-ranges" name="dates"
            value="{{ request()->input('dates') }}" readonly>
        </div>

        <div class="input-wrap">
          <label for=""><strong>{{ $keywords['Beds'] ?? 'Beds' }}</strong></label>
          <select class="nice-select" name="beds">
            <option selected value="">{{ $keywords['All'] ?? 'All' }}</option>

            @for ($i = 1; $i <= $numOfBed; $i++)
              <option value="{{ $i }}" {{ request()->input('beds') == $i ? 'selected' : '' }}>
                {{ $i }}</option>
            @endfor
          </select>
        </div>

        <div class="input-wrap">
          <label for=""><strong>{{ $keywords['Baths'] ?? 'Baths' }}</strong></label>
          <select class="nice-select" name="baths">
            <option selected value="">{{ $keywords['All'] ?? __('All') }}</option>

            @for ($i = 1; $i <= $numOfBath; $i++)
              <option value="{{ $i }}" {{ request()->input('baths') == $i ? 'selected' : '' }}>
                {{ $i }}</option>
            @endfor
          </select>
        </div>

        <div class="input-wrap">
          <label for=""><strong>{{ $keywords['Guests'] ?? 'Guests' }}</strong></label>
          <select class="nice-select" name="guests">
            <option selected value="">{{ $keywords['All'] ?? 'All' }}</option>

            @for ($i = 1; $i <= $maxGuests; $i++)
              <option value="{{ $i }}" {{ request()->input('guests') == $i ? 'selected' : '' }}>
                {{ $i }}</option>
            @endfor
          </select>
        </div>

        <div class="input-wrap">
          <label for=""><strong>{{ $keywords['Sort_by'] ?? __('Sort By') }}</strong></label>
          <select class="nice-select" name="sort_by">
            <option
              {{ !empty(request()->input('sort_by')) || request()->input('sort_by') == 'desc' ? 'selected' : '' }}
              value="desc">{{ $keywords['Latest_Rooms'] ?? __('Latest Rooms') }}</option>
            <option {{ request()->input('sort_by') == 'asc' ? 'selected' : '' }} value="asc">
              {{ $keywords['Oldest_Rooms'] ?? __('Oldest Rooms') }}</option>
            <option {{ request()->input('sort_by') == 'price-asc' ? 'selected' : '' }} value="price-asc">
              {{ $keywords['SoRent:_Low_to_Highrt'] ?? __('Rent: Low to High') }}</option>
            <option {{ request()->input('sort_by') == 'price-desc' ? 'selected' : '' }} value="price-desc">
              {{ $keywords['Rent:_High_to_Low'] ?? __('Rent: High to Low') }}</option>
          </select>
        </div>

        <div class="input-wrap">
          <label for=""><strong>{{ $keywords['Rent'] ?? 'Rent' }} /
              {{ $keywords['Night'] ?? 'Night' }}
              ({{ $userBs->base_currency_text }})</strong></label>
          <div class="price-range-wrap">
            <div class="slider-range">
              <div id="price-range-slider"></div>
            </div>

            <div class="price-ammount">
              <input type="text" id="amount" name="rents" readonly />
            </div>
          </div>
        </div>

        <div class="input-wrap">
          <div class="checkboxes">
            @foreach ($amenities as $amenity)
              @if ($loop->iteration <= 3)
                <p class="d-block">
                  <input type="checkbox" name="ammenities[]" value="{{ $amenity->id }}" id="amm{{ $amenity->id }}"
                    {{ is_array(request()->input('ammenities')) && in_array($amenity->id, request()->input('ammenities')) ? 'checked' : '' }}>
                  <label for="amm{{ $amenity->id }}">{{ $amenity->name }}</label>
                </p>
              @else
                <p class="d-none show-more">
                  <input type="checkbox" name="ammenities[]" value="{{ $amenity->id }}" id="amm{{ $amenity->id }}"
                    {{ is_array(request()->input('ammenities')) && in_array($amenity->id, request()->input('ammenities')) ? 'checked' : '' }}>
                  <label for="amm{{ $amenity->id }}">{{ $amenity->name }}</label>
                </p>
              @endif
            @endforeach

            @if (count($amenities) > 3)
              <div class="more-ammenities">
                <a href="#">{{ $keywords['More_Amenities'] ?? 'More Amenities' }}...</a>
              </div>
            @endif
          </div>
        </div>

        <div class="input-wrap">
          <button type="submit" class="btn filled-btn btn-block">
            {{ $keywords['Filter_Rooms'] ?? 'Filter Rooms' }} <i class="far fa-long-arrow-right"></i>
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
