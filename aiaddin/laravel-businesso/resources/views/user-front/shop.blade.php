@extends('user-front.layout')
@section('tab-title')
  {{ $keywords['Shop'] ?? 'Shop' }}
@endsection
@php
  Config::set('app.timezone', $userBs->timezoneinfo->timezone ?? '');
@endphp
@section('meta-description', !empty($userSeo) ? $userSeo->shop_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->shop_meta_keywords : '')
@section('page-name')
  {{ $keywords['Shop'] ?? 'Shop' }}
@endsection
@section('br-name')
  {{ $keywords['Shop'] ?? 'Shop' }}
@endsection
@section('content')
  <!--====== Shop Section Start ======-->
  <section class="shop-page-wrap section-gap">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-12 order-1">
          <div class="row shop-top-bar justify-content-between">
            <div class="col-lg-3 col-sm-6 col-12 mb-2">
              <div class="product-search">
                <input type="search" class="input-search" name="search"
                  value="{{ request()->input('search') ? request()->input('search') : '' }}"
                  placeholder="{{ $keywords['Search_your_keyword'] ?? __('Search your keyword') }}">
                <button type="submit"><i class="far fa-search"></i></button>
              </div>
            </div>
            <div class="col-lg-2 col-sm-6 col-12 mb-2">
              <div class="product-shorting">
                <select class="form-control" name="type" id="type_sort">
                  <option value="0" disabled selected>{{ $keywords['Sort_by'] ?? 'Sort by' }}
                  </option>
                  <option value="new" {{ request('type') == 'new' ? 'selected' : '' }}>
                    {{ $keywords['Latest'] ?? 'Latest' }}
                  </option>
                  <option value="old" {{ request('type') == 'old' ? 'selected' : '' }}>
                    {{ $keywords['Oldest'] ?? 'Oldest' }}
                  </option>
                  <option value="high-to-low" {{ request('type') == 'high-to-low' ? 'selected' : '' }}>
                    {{ $keywords['Price_Hight_to_Low'] ?? 'Price:Hight-to-Low' }}</option>
                  <option value="low-to-high" {{ request('type') == 'low-to-high' ? 'selected' : '' }}>
                    {{ $keywords['Price_Low_to_High'] ?? 'Price:Low-to-High' }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-10 order-3 order-lg-2">
          <div class="shop-sidebar">
            <div class="widget product-cat-widget">
              <h4 class="widget-title">{{ $keywords['Category'] ?? 'Category' }}</h4>
              <ul class="reset-ul" data-toggle-list="categoriesToggle" data-toggle-show="6">
                <li class="">
                  <a href="{{ route('front.user.shop', getParam()) }}" class="category-id cursor-pointer">
                    <div class="single-list-category d-flex justify-content-between align-items-center">
                      <div class="category-text">
                        <h6 class="title {{ request()->input('category') == '' ? 'active-search' : '' }} ">
                          {{ $keywords['All'] ?? 'All' }} </h6>
                      </div>
                    </div>
                  </a>
                </li>
                @foreach ($categories as $category)
                  <li>
                    <a href="{{ route('front.user.shop', getParam()) . '?category=' . urlencode($category->slug) }}"
                      class="category-id cursor-pointer {{ request()->input('category') == $category->slug ? 'active-search' : '' }}">{{ $category->name }}</a>
                    @if (request()->input('category') == $category->slug)
                      @if ($category->subcategories->count() > 0)
                        <ul class="ml-20">
                          @foreach ($category->subcategories as $sub)
                            <li>
                              <a href="{{ route('front.user.shop', getParam()) . '?category=' . urlencode($category->slug) . '&subcategory=' . urlencode($sub->slug) }}"
                                class="subcategory-id cursor-pointer {{ request('subcategory') == $sub->slug ? 'active-search' : '' }}"><i
                                  class="fa fa-angle-right"></i>
                                {{ $sub->name }}</a>
                            </li>
                          @endforeach
                        </ul>
                      @endif
                    @endif
                  </li>
                @endforeach
              </ul>
              <span class="show-more mt-10" data-toggle-btn="toggleListBtn">Show More +</span>
            </div>

            <div class="widget product-filter-widget custom-checkbox">
              <h4 class="widget-title">Sale Type</h4>
              <div class="mb-10">
                <input class="form-check-input input-checkbox sale"
                  {{ (request()->input('sale') == 'all' ? 'checked' : request()->input('sale') == '') ? 'checked' : '' }}
                  value="all" type="checkbox" name="flexRadioDefault" id="flexRadioDefault1">
                <label class="form-check-label" for="flexRadioDefault1">
                  {{ $keywords['All'] ?? 'All' }}
                </label>
              </div>
              <div class="mb-10">
                <input class="form-check-input input-checkbox sale"
                  {{ request()->input('sale') == 'flash' ? 'checked' : '' }} value="flash" type="checkbox"
                  name="flexRadioDefault" id="flexRadioDefault2">
                <label class="form-check-label" for="flexRadioDefault2">
                  {{ $keywords['Flash_Sale'] ?? 'Flash Sale' }}
                </label>
              </div>
              <div class="mb-0">
                <input class="form-check-input input-checkbox sale"
                  {{ request()->input('sale') == 'onsale' ? 'checked' : '' }} value="onsale" type="checkbox"
                  name="flexRadioDefault" id="flexRadioDefault3">
                <label class="form-check-label" for="flexRadioDefault3">
                  {{ $keywords['On_Sale'] ?? 'On Sale' }}
                </label>
              </div>
            </div>
            <div class="widget product-filter-widget">
              <h4 class="widget-title">{{ $keywords['Filter_By_Price'] ?? 'Filter By Price' }}</h4>
              <div id="slider-range" class="slider-range"></div>
              <div class="range">
                <div class="price-input">
                  <input type="text" min="0"
                    value="{{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}{{ request()->input('minprice') ?: formatNumber($min_price) }}{{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}"
                    name="minprice" id="amount1" readonly />
                  <input type="text" min="0"
                    value="{{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}{{ request()->input('maxprice') ?: formatNumber($max_price) }}{{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}"
                    name="maxprice" id="amount2" readonly />
                </div>

                <button class="filter-button main-btn main-btn-2 template-btn"
                  type="submit">{{ $keywords['Filter'] ?? 'Filter' }}</button>
              </div>

            </div>
          </div>
        </div>
        <div class="col-lg-9 order-2 order-lg-2">
          <div class="product-loop row">
            @if (count($items) == 0)
              <div class="not-found-block w-100 d-flex justify-content-center">
                <h2 class="text-muted">{{ $keywords['no_items'] ?? 'No Item Found' }}!</h2>
              </div>
            @endif

            @foreach ($items as $item)
              @php
                $variations = App\Models\User\UserItemVariation::where('item_id', $item->item_id)
                    ->where('language_id', $userCurrentLang->id)
                    ->get();
                $itemstock = $item->stock;
                if (count($variations) == 0) {
                    if ($itemstock > 0) {
                        $stock = true;
                    } else {
                        $stock = false;
                    }
                    $variations = null;
                } else {
                    $stock = true;
                    $tstock = '';
                    if (count($variations)) {
                        foreach ($variations as $varkey => $varvalue) {
                            $tstock = array_sum(json_decode($varvalue->option_stock));
                            if ($tstock == 0) {
                                $stock = false;
                            }
                        }
                    } else {
                        $stock = true;
                    }
                }
                $n_price = $item->current_price - ($item->flash_percentage * $item->current_price) / 100;
                $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);
              @endphp
              <div class="col-lg-4 col-sm-6">
                <div class="single-product">
                  <div class="product-img">
                    <a class="d-block"
                      href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                      <img data-src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                        class="lazy" alt="image">
                    </a>

                    @if ($isFlash)
                      <span class="flash-badge"><i class="fas fa-bolt"></i>-{{ $item->flash_percentage }}%</span>
                      @php
                        $n_price = $item->current_price - ($item->flash_percentage * $item->current_price) / 100;
                      @endphp
                    @else
                      @php
                        $n_price = $item->current_price;
                      @endphp
                    @endif
                    @php
                      $dt = Carbon\Carbon::parse($item->end_date);
                      $year = $dt->year;
                      $month = $dt->month;
                      $day = $dt->day;
                      $end_time = Carbon\Carbon::parse($item->end_time);
                      $hour = $end_time->hour;
                      $minute = $end_time->minute;
                      $now = str_replace('+00:00', '.000' . $userBs->timezoneinfo->gmt_offset . '00:00', gmdate('c'));
                    @endphp
                    @if ($isFlash)
                      <div class="product-countdown" data-year="{{ $year }}" data-month="{{ $month }}"
                        data-day="{{ $day }}" data-now="{{ $now }}"
                        data-timezone="{{ $userBs->timezoneinfo->gmt_offset }}" data-hour="{{ $hour }}"
                        data-minute="{{ $minute }}">
                      </div>
                    @endif
                    @if ($item->type == 'physical')
                      @if ($stock == false)
                        <span class="stock-label">{{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                      @endif
                    @endif
                    <div class="product-action">
                      @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode))
                        <a class="cart-link cursor-pointer"
                          data-title="{{ strlen($item->title) > 26 ? mb_substr($item->title, 0, 26, 'UTF-8') . '...' : $item->title }}"
                          data-current_price="{{ $n_price }}"
                          data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                          data-item_id="{{ $item->item_id }}" data-variations="{{ json_encode($variations) }}"
                          data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}"
                          data-toggle="tooltip" data-placement="top" title="{{ __('Add to Cart') }}"><i
                            class="far fa-shopping-cart "></i></a>
                      @endif
                      <a class="add-to-wish cursor-pointer" data-item_id="{{ $item->item_id }}"
                        data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}"
                        data-toggle="tooltip" data-placement="top">
                        @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                          <i class="fa fa-heart"></i>
                        @else
                          <i class="far fa-heart"></i>
                        @endif
                      </a>
                      <a title="{{ __('Details') }}"
                        href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"><i
                          class="far fa-eye"></i></a>
                    </div>
                  </div>
                  <div class="product-desc">
                    @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                      <div class="rate mx-auto">
                        <div class="rating" style="width:{{ $item->rating * 20 }}%"></div>
                      </div>
                    @endif
                    <h5 class="title">
                      <a title="{{ $item->title }}"
                        href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }} ">
                        {{ $item->title }}
                      </a>
                    </h5>
                    <span class="price">
                      {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                      <span>{{ formatNumber($n_price) }}</span>
                      {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                    </span>
                    @if ($isFlash)
                      <span class="previous-price">
                        {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                        <span>{{ formatNumber($item->current_price) }}</span>
                        {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                      </span>
                    @elseif($item->previous_price > 0)
                      <span class="previous-price">
                        {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                        <span>{{ formatNumber($item->previous_price) }}</span>
                        {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                      </span>
                    @endif
                  </div>
                </div>
              </div>
            @endforeach
          </div>
          <div class="pagination-wrap text-center">
            <ul class="pagination justify-content-center">
              <div class="row">
                <div class="col-md-12">
                  <nav class="pagination-nav {{ $items->count() > 6 ? 'mb-4' : '' }}">
                    {{ $items->appends(['minprice' => request()->input('minprice'), 'maxprice' => request()->input('maxprice'), 'category_id' => request()->input('category_id'), 'type' => request()->input('type')])->links() }}
                  </nav>
                </div>
              </div>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
  <!--====== Shop Section End ======-->
  <form id="searchForm" class="d-none" action="{{ route('front.user.shop', getParam()) }}" method="get">
    <input type="hidden" id="search" name="search"
      value="{{ !empty(request()->input('search')) ? request()->input('search') : '' }}">
    <input type="hidden" id="minprice" name="minprice"
      value="{{ !empty(request()->input('minprice')) ? request()->input('minprice') : '' }}">
    <input type="hidden" id="maxprice" name="maxprice"
      value="{{ !empty(request()->input('maxprice')) ? request()->input('maxprice') : '' }}">
    <input type="hidden" name="category"
      value="{{ !empty(request()->input('category')) ? request()->input('category') : null }}">
    <input type="hidden" name="subcategory"
      value="{{ !empty(request()->input('subcategory')) ? request()->input('subcategory') : null }}">
    <input type="hidden" name="sale" id="sale"
      value="{{ !empty(request()->input('sale')) ? request()->input('sale') : null }}">
    <input type="hidden" name="type" id="type"
      value="{{ !empty(request()->input('type')) ? request()->input('type') : 'new' }}">
    <button id="searchButton" type="submit"></button>
  </form>
  {{-- Variation Modal Starts --}}
  @includeIf('front.partials.variation-modal')
  {{-- Variation Modal Ends --}}


@endsection

@section('scripts')
  <script>
    let maxprice = 0;
    let minprice = 0;
    let typeSort = '';
    let category = '';
    let attributes = '';
    let review = '';
    let search = '';
    let countryId = '';
    let stateId = '';
    let cityId = '';



    $(document).on('click', '.filter-button', function() {
      let filterval1 = $('#amount1').val();
      let filterval2 = $('#amount2').val();
      minprice = filterval1.replace('$', '');
      maxprice = filterval2.replace('$', '');
      $('#maxprice').val(maxprice);
      $('#minprice').val(minprice);
      $('#searchButton').click();
    });

    $(document).on('change', '#type_sort', function() {
      typeSort = $(this).val();
      $('#type').val(typeSort);
      $('#searchButton').click();
    })
    $(document).on('change', '.sale', function() {
      sale = $(this).val();
      $('#sale').val(sale);
      $('#searchButton').click();
    })
    $(document).ready(function() {
      typeSort = $('#type_sort').val();
      $('#type').val(typeSort);
    })
    $(document).on('click', '.review_val', function() {
      review = $(".review_val:checked").val();
      $('#review').val(review);
      $('#searchButton').click();
    })
    $(document).on('change', '.input-search', function(e) {
      var key = e.which;
      search = $('.input-search').val();
      $('#search').val(search);
      $('#searchButton').click();
      return false;
    })
  </script>
  @php
    $selMinPrice = request()->input('minprice') ? request()->input('minprice') : formatNumber($min_price);
    $selMaxPrice = request()->input('maxprice') ? request()->input('maxprice') : formatNumber($max_price);
  @endphp
  <script>
    $("#slider-range").slider({
      range: true,
      min: {{ formatNumber($min_price) }},
      max: {{ formatNumber($max_price) }},
      values: [{{ formatNumber($selMinPrice) }}, {{ formatNumber($selMaxPrice) }}],
      slide: function(event, ui) {
        $("#amount1").val(
          `{{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}` +
          ui.values[0] + ".00" +
          `{{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}`
        );
        $("#amount2").val(
          `{{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}` +
          ui.values[1] + ".00" +
          `{{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}`
        );
      }
    });
  </script>


@endsection
