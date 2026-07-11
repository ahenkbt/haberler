@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Shop_Details'] ?? 'Shop_Details' }}
@endsection
@php
  Config::set('app.timezone', $userBs->timezoneinfo->timezone ?? '');
@endphp
<meta property="og:title" content="{{ $ad_details->title }}">
<meta property="og:image" content="{{ asset('assets/front/img/user/items/thumbnail/' . $ad_details->item->thumbnail) }}">
@section('meta-keywords', !empty($ad_details) ? $ad_details->meta_keywords : '')
@section('meta-description', !empty($ad_details) ? $ad_details->meta_description : '')

@section('page-name')
  {{ $ad_details->title }}
@endsection
@section('br-name')
  {{ $keywords['Shop_Details'] ?? 'Shop Details' }}
@endsection

@section('content')
  <!--====== Shop Section Start ======-->
  @php
    $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($ad_details->item_id);
    $variations = App\Models\User\UserItemVariation::where('item_id', $ad_details->item_id)
        ->where('language_id', $userCurrentLang->id)
        ->get();
    $itemstock = $ad_details->item->stock;
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
  @endphp
  <section class="shop-details-wrap">
    <div class="container">
      <div class="product-details section-gap">
        <div class="row">
          <div class="col-lg-6">
            <div class="product-gallery clearfix">
              <div class="product-gallery-arrow"></div>
              <div class="gallery-slider-warp">
                <div class="product-gallery-slider">
                  <div class="single-gallery-itam"
                    data-thumb="{{ asset('assets/front/img/user/items/thumbnail/' . $ad_details->item->thumbnail) }}">
                    <a href="{{ asset('assets/front/img/user/items/thumbnail/' . $ad_details->item->thumbnail) }}"
                      class="img-popup">
                      <img data-src="{{ asset('assets/front/img/user/items/thumbnail/' . $ad_details->item->thumbnail) }}"
                        class="lazy" alt="Image">
                    </a>
                  </div>
                  @if ($ad_details->item->sliders)
                    @foreach ($ad_details->item->sliders as $slider)
                      <div class="single-gallery-itam"
                        data-thumb="{{ asset('assets/front/img/user/items/slider-images/' . $slider->image) }}">
                        <a href="{{ asset('assets/front/img/user/items/slider-images/' . $slider->image) }}"
                          class="img-popup"><img
                            data-src="{{ asset('assets/front/img/user/items/slider-images/' . $slider->image) }}"
                            alt="Image" class="lazy"></a>
                      </div>
                    @endforeach
                  @endif
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-6">
            <div class="product-summary">
              <div class="d-flex align-items-center">
                @if ($isFlash)
                  <span class="flash-badge">
                    <i class="fas fa-bolt"></i>
                    -{{ $ad_details->item->flash_percentage }}%
                  </span>
                @endif
                @if ($ad_details->item->type == 'physical')
                  @if ($stock == false)
                    <span class="stock-label position-relative">{{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                  @endif
                @endif
              </div>
              <h3 class="product-name">{{ $ad_details->title }}</h3>
              @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                <div class="rate mb-3">
                  <div class="rating" style="width:{{ $ad_details->item->rating * 20 }}%"></div>
                </div>
              @endif
              @if ($isFlash)
                @php
                  $n_price_d =
                      $ad_details->item->current_price -
                      ($ad_details->item->flash_percentage * $ad_details->item->current_price) / 100;
                @endphp
              @else
                @php
                  $n_price_d = $ad_details->item->current_price;
                @endphp
              @endif

              {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}<span
                class="price">{{ formatNumber($n_price_d) }}</span>{{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}

              @if ($isFlash)
                <span class="previous-price">
                  {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}<span>{{ formatNumber($ad_details->item->current_price) }}</span>{{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                </span>
              @elseif($ad_details->item->previous_price > 0)
                <span class="previous-price">
                  {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}<span>{{ formatNumber($ad_details->item->previous_price) }}</span>{{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                </span>
              @endif

              @php
                $dt = Carbon\Carbon::parse($ad_details->item->end_date);
                $year = $dt->year;
                $month = $dt->month;
                $day = $dt->day;
                $end_time = Carbon\Carbon::parse($ad_details->item->end_time);
                $hour = $end_time->hour;
                $minute = $end_time->minute;
                $now = str_replace('+00:00', '.000' . $userBs->timezoneinfo->gmt_offset . '00:00', gmdate('c'));
              @endphp
              @if ($isFlash)

                @if ($userBs->theme == 'home_fourteen')
                  @php
                    $endDateTime = Carbon\Carbon::parse($ad_details->item->end_date . ' ' . $ad_details->item->end_time)
                        ->tz($userBs->timezoneinfo->timezone)
                        ->format('Y-m-d\TH:i:s');
                    $startDateTime = Carbon\Carbon::parse(
                        $ad_details->item->start_date . ' ' . $ad_details->item->start_time,
                    )
                        ->tz($userBs->timezoneinfo->timezone)
                        ->format('Y-m-d\TH:i:s');
                  @endphp

                  <div class="product-countdown-2 " data-start_date="{{ $startDateTime }}"
                    data-end_date="{{ $endDateTime }}" data-item_id="{{ $ad_details->item->item_id }}">

                    <div class="count days">
                      <span class="count-value_{{ $ad_details->item->item_id }} count-value"></span>
                      <span class="count-period">{{ $keywords['Days'] ?? 'Days' }}</span>
                    </div>
                    <div class="count hours">
                      <span class="count-value_{{ $ad_details->item->item_id }} count-value"></span>
                      <span class="count-period">{{ $keywords['Hours'] ?? 'Hours' }}</span>
                    </div>
                    <div class="count minutes">
                      <span class="count-value_{{ $ad_details->item->item_id }} count-value"></span>
                      <span class="count-period">{{ $keywords['Mins'] ?? 'Mins' }}</span>
                    </div>
                    <div class="count seconds">
                      <span class="count-value_{{ $ad_details->item->item_id }} count-value"></span>
                      <span class="count-period">{{ $keywords['Sec'] ?? 'Sec' }}</span>
                    </div>
                  </div>
                @else
                  <div class="product-countdown position-static mb-3" data-year="{{ $year }}"
                    data-month="{{ $month }}" data-day="{{ $day }}" data-now="{{ $now }}"
                    data-timezone="{{ $userBs->timezoneinfo->gmt_offset }}" data-hour="{{ $hour }}"
                    data-minute="{{ $minute }}">
                  </div>
                @endif
              @endif

              @if ($ad_details->item->sku)
                <div class="sku mb-2">
                  <span class="d-inline-block">{{ __('SKU') }} :</span>
                  <strong>{{ $ad_details->item->sku }}</strong>
                </div>
              @endif

              <div class="short-description">
                <p>{{ $ad_details->summary }}</p>
              </div>
              <div class="add-to-cart-form mb-3">
                <form action="#">
                  @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                    @if (empty($variations))
                      <div class="quantity-input">
                        <div class="quantity-down" id="quantityDown">
                          <i class="fal fa-minus"></i>
                        </div>
                        <input id="detailsQuantity" disabled type="text" min="1" value="1" name="quantity">
                        <div class="quantity-up" id="quantityUP">
                          <i class="fal fa-plus"></i>
                        </div>
                      </div>
                    @endif
                    <div class="add-to-cart-btn">
                      <a class="cart-link cursor-pointer"
                        data-title="{{ strlen($ad_details->title) > 26 ? mb_substr($ad_details->title, 0, 26, 'UTF-8') . '...' : $ad_details->title }}"
                        data-current_price="{{ $n_price_d }}" data-item_id="{{ $ad_details->item_id }}"
                        data-flash_percentage="{{ $ad_details->item->flash_percentage ?? 0 }}"
                        data-variations="{{ json_encode($variations) }}"
                        data-href="{{ route('front.user.add.cart', ['id' => $ad_details->item_id, getParam()]) }}"
                        data-toggle="tooltip" data-placement="top"
                        title="{{ $keywords['Add_to_cart'] ?? 'Add To Cart' }}"><i class="far fa-shopping-cart "></i>
                        {{ $keywords['Add_to_cart'] ?? 'Add To Cart' }} </a>
                    </div>
                  @endif
                  <div class="add-to-cart-btn">
                    <a href="javascript:void(0)" class="wish add-to-wish cursor-pointer"
                      @if (!empty($myWishlist) && in_array($ad_details->item_id, $myWishlist)) title="{{ __('Remove From wishlist') }}" @else title="{{ __('Add to wishlist') }}" @endif
                      data-item_id="{{ $ad_details->item_id }}"
                      data-href="{{ route('front.user.add.wishlist', ['id' => $ad_details->item_id, getParam()]) }}"
                      data-toggle="tooltip" data-placement="top">
                      @if (!empty($myWishlist) && in_array($ad_details->item_id, $myWishlist))
                        <i class="fa fa-heart"></i>
                      @else
                        <i class="far fa-heart"></i>
                      @endif
                    </a>
                  </div>
                </form>
              </div>
              <ul class="product-share">
                <li class="title">{{ $keywords['Share_Now'] ?? 'Share Now' }}:</li>
                <li><a target="_blank"
                    href="https://www.facebook.com/sharer/sharer.php?u={{ route('front.user.item_details', ['slug' => $ad_details->slug, getParam()]) }}"><i
                      class="fab fa-facebook-f"></i></a></li>
                <li><a target="_blank"
                    href="https://twitter.com/intent/tweet?url={{ route('front.user.item_details', ['slug' => $ad_details->slug, getParam()]) }}"><i
                      class="fab fa-twitter"></i></a></li>

                <li>
                  <a href="https://www.linkedin.com/shareArticle?mini=true&url={{ route('front.user.item_details', ['slug' => $ad_details->slug, getParam()]) }}"
                    target="_blank"><i class="fab fa-linkedin"></i></a>
                </li>
              </ul>
            </div>
          </div>
          <div class="col-12">
            <div class="product-details-tab">
              <div class="tab-filter-nav">
                <div class="nav nav-tabs" id="nav-tab" role="tablist">
                  <a class="active" id="nav-desc" data-toggle="tab" href="#tab-desc" role="tab">
                    {{ $keywords['Description'] ?? 'Description' }}
                  </a>
                  @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                    <a id="nav-review" data-toggle="tab" href="#tab-review" role="tab">
                      {{ $keywords['Reviews'] ?? 'Reviews' }} ({{ count($reviews) }})
                    </a>
                  @endif
                </div>
              </div>
              <div class="tab-content" id="nav-tabContent">
                <div class="tab-pane fade show active" id="tab-desc" role="tabpanel">
                  <div class="product-description">
                    <div class="summernote-content">
                      {!! replaceBaseUrl($ad_details->description) !!}
                    </div>
                  </div>
                </div>
                @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                  <div class="tab-pane fade" id="tab-review" role="tabpanel">
                    <div class="product-review">
                      <ul class="review-list">
                        @if (count($reviews))
                          @foreach ($reviews as $review)
                            <li class="single-review">
                              <div class="review-thumb">
                                <img
                                  data-src="{{ is_null($review->customer->image) ? asset('assets/front/img/noimage.jpg') : asset('assets/user/img/users/' . $review->customer->image) }}"
                                  class="lazy" alt="Image">
                              </div>
                              <div class="review-content ">
                                <h5 class="name">
                                  {{ !empty(convertUtf8($review->customer)) ? convertUtf8($review->customer->username) : '' }}
                                  <br>
                                  <small>{{ $review->created_at->format('F j, Y') }}</small>
                                </h5>
                                <ul>
                                  <div class="rate">
                                    <div class="rating" style="width:{{ $review->review * 20 }}%">
                                    </div>
                                  </div>
                                </ul>
                                <p>{{ convertUtf8($review->comment) }}</p>
                              </div>
                            </li>
                          @endforeach
                        @else
                          {{ $keywords['no_reviews_found'] ?? 'No Review Found' }}
                        @endif
                      </ul>
                    </div>
                    @if (Auth::guard('customer')->user())
                      @if (App\Models\User\UserOrderItem::where('customer_id', Auth::guard('customer')->user()->id)->where('item_id', $ad_details->item_id)->exists())
                        <div class="shop-review-form mt-5">
                          @error('error')
                            <p class="text-danger my-2">{{ Session::get('error') }}</p>
                          @enderror
                          <form id="ajaxForm" action="{{ route('item.review.submit', getParam()) }}" method="POST">
                            @csrf
                            <div class="input-box">
                              <span>{{ __('Comment') }} *</span>
                              <textarea name="comment" cols="30" rows="10" placeholder="{{ __('Comment') }} *"></textarea>
                              @error('comment')
                                <div class="mb-3 text-danger">{{ $message }}</div>
                              @enderror
                            </div>
                            <input type="hidden" value="" id="reviewValue" name="review">
                            <input type="hidden" value="{{ $ad_details->item->id }}" name="item_id">
                            <div class="input-box mt-40">
                              <span>{{ __('Rating') }} *</span>
                              <div class="review-content ">
                                <ul class="review-value review-1">
                                  <li><a class="cursor-pointer" data-href="1"><i class="far fa-star"></i></a></li>
                                </ul>
                                <ul class="review-value review-2">
                                  <li><a class="cursor-pointer" data-href="2"><i class="far fa-star"></i></a></li>
                                  <li><a class="cursor-pointer" data-href="2"><i class="far fa-star"></i></a></li>
                                </ul>
                                <ul class="review-value review-3">
                                  <li><a class="cursor-pointer" data-href="3"><i class="far fa-star"></i></a></li>
                                  <li><a class="cursor-pointer" data-href="3"><i class="far fa-star"></i></a></li>
                                  <li><a class="cursor-pointer" data-href="3"><i class="far fa-star"></i></a></li>
                                </ul>
                                <ul class="review-value review-4">
                                  <li><a class="cursor-pointer" data-href="4"><i class="far fa-star"></i></a></li>
                                  <li><a class="cursor-pointer" data-href="4"><i class="far fa-star"></i></a></li>
                                  <li><a class="cursor-pointer" data-href="4"><i class="far fa-star"></i></a></li>
                                  <li><a class="cursor-pointer" data-href="4"><i class="far fa-star"></i></a></li>
                                </ul>
                                <ul class="review-value review-5">
                                  <li><a class="cursor-pointer" data-href="5"><i class="far fa-star"></i></a></li>
                                  <li><a class="cursor-pointer" data-href="5"><i class="far fa-star"></i></a></li>
                                  <li><a class="cursor-pointer" data-href="5"><i class="far fa-star"></i></a></li>
                                  <li><a class="cursor-pointer" data-href="5"><i class="far fa-star"></i></a></li>
                                  <li><a class="cursor-pointer" data-href="5"><i class="far fa-star"></i></a></li>
                                </ul>
                              </div>
                            </div>
                            @error('review')
                              <div class="mb-3 text-danger">{{ $message }}</div>
                            @enderror
                            <div class="input-btn mt-40">
                              <button type="submit" class="main-btn template-btn">{{ __('Submit') }}</button>
                            </div>
                          </form>
                        </div>
                      @endif
                    @else
                      <div class="review-login mt-40">
                        <a class="boxed-btn d-inline-block mr-2"
                          href="{{ route('customer.login', getParam()) }}">{{ $keywords['Login'] ?? __('Login') }}</a>
                        {{ $keywords['to_leave_a_review'] ?? __('to leave a review') }}
                      </div>
                    @endif
                  </div>
                @endif
              </div>
            </div>
          </div>
        </div>
      </div>
      @if (count($relateditems) > 0)
        <div class="related-product">
          <h2 class="related-title">{{ $keywords['Related_Items'] ?? 'Related Items' }}</h2>
          <div class="product-loop slider-col-4">
            @foreach ($relateditems as $item)
              @php
                $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);
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
              @endphp
              <div>
                <div class="single-product">
                  <div class="product-img">
                    <a class="d-block"
                      href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                      <img data-src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                        alt="image" class="lazy">
                    </a>
                    @if ($isFlash)
                      <span class="flash-badge"><i class="fas fa-bolt"></i>
                        -{{ $item->flash_percentage }}%</span>
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
                      @if ($userBs->theme == 'home_fourteen')
                        @php
                          $endDateTime = Carbon\Carbon::parse($item->end_date . ' ' . $item->end_time)
                              ->tz($userBs->timezoneinfo->timezone)
                              ->format('Y-m-d\TH:i:s');
                          $startDateTime = Carbon\Carbon::parse($item->start_date . ' ' . $item->start_time)
                              ->tz($userBs->timezoneinfo->timezone)
                              ->format('Y-m-d\TH:i:s');
                        @endphp

                        <div class="product-countdown-2 justify-content-center" data-start_date="{{ $startDateTime }}"
                          data-end_date="{{ $endDateTime }}" data-item_id="{{ $item->item_id }}">

                          <div class="count days">
                            <span class="count-value_{{ $item->item_id }} count-value"></span>
                            <span class="count-period">{{ $keywords['Days'] ?? 'Days' }}</span>
                          </div>
                          <div class="count hours">
                            <span class="count-value_{{ $item->item_id }} count-value"></span>
                            <span class="count-period">{{ $keywords['Hours'] ?? 'Hours' }}</span>
                          </div>
                          <div class="count minutes">
                            <span class="count-value_{{ $item->item_id }} count-value"></span>
                            <span class="count-period">{{ $keywords['Mins'] ?? 'Mins' }}</span>
                          </div>
                          <div class="count seconds">
                            <span class="count-value_{{ $item->item_id }} count-value"></span>
                            <span class="count-period">{{ $keywords['Sec'] ?? 'Sec' }}</span>
                          </div>
                        </div>
                      @else
                        <div class="product-countdown" data-year="{{ $year }}"
                          data-month="{{ $month }}" data-day="{{ $day }}"
                          data-now="{{ $now }}" data-timezone="{{ $userBs->timezoneinfo->gmt_offset }}"
                          data-hour="{{ $hour }}" data-minute="{{ $minute }}">
                        </div>
                        <!-- product-countdown -->
                        {{-- <div class="product-countdown-2 justify-content-center"
                      data-start_date="{{ $startDateTime }}" data-end_date="{{ $endDateTime }}"
                      data-item_id="{{ $item->item_id }}">

                      <div class="count days">
                        <span class="count-value_{{ $item->item_id }} count-value"></span>
                        <span class="count-period">{{ $keywords['Days'] ?? 'Days' }}</span>
                      </div>
                      <div class="count hours">
                        <span class="count-value_{{ $item->item_id }} count-value"></span>
                        <span class="count-period">{{ $keywords['Hours'] ?? 'Hours' }}</span>
                      </div>
                      <div class="count minutes">
                        <span class="count-value_{{ $item->item_id }} count-value"></span>
                        <span class="count-period">{{ $keywords['Mins'] ?? 'Mins' }}</span>
                      </div>
                      <div class="count seconds">
                        <span class="count-value_{{ $item->item_id }} count-value"></span>
                        <span class="count-period">{{ $keywords['Sec'] ?? 'Sec' }}</span>
                      </div>
                    </div> --}}
                      @endif
                    @endif
                    @if ($item->type == 'physical')
                      @if ($stock == false)
                        <span class="stock-label-2">{{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                      @endif
                    @endif
                    <div class="product-action">
                      @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                        <a class="cart-link cursor-pointer"
                          data-title="{{ strlen($item->title) > 26 ? mb_substr($item->title, 0, 26, 'UTF-8') . '...' : $item->title }}"
                          data-current_price="{{ $n_price }}" data-item_id="{{ $item->item_id }}"
                          data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                          data-variations="{{ json_encode($variations) }}"
                          data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}"
                          data-toggle="tooltip" data-placement="top" title="{{ __('Add to Cart') }}"><i
                            class="far fa-shopping-cart "></i>
                        </a>
                      @endif
                      <a class="add-to-wish cursor-pointer" data-item_id="{{ $item->item_id }}"
                        data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}"
                        data-toggle="tooltip" data-placement="top" title="{{ __('Add to Wishlist') }}">
                        @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                          <i class="fa fa-heart"></i>
                        @else
                          <i class="far fa-heart"></i>
                        @endif
                      </a>
                      <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"><i
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
                        href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                        {{ strlen($item->title) > 24 ? mb_substr($item->title, 0, 24, 'UTF-8') . '...' : $item->title }}
                      </a>
                    </h5>
                    <span class="price">
                      {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                      {{ $n_price }}
                      {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                    </span>
                    @if ($isFlash)
                      <span class="previous-price">
                        {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                        <span>{{ $item->current_price }}</span>
                        {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                      </span>
                    @elseif($item->previous_price > 0)
                      <span class="previous-price">
                        {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                        <span>{{ $item->previous_price }}</span>
                        {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                      </span>
                    @endif
                  </div>
                </div>
              </div>
            @endforeach
          </div>
        </div>
      @endif
    </div>
  </section>
  <!--====== Shop Section End ======-->
  {{-- Variation Modal Starts --}}
  @includeIf('front.partials.variation-modal')
  {{-- Variation Modal Ends --}}
@endsection
@section('scripts')
@endsection
