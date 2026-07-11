@extends('user-front.layout')
@section('tab-title')
  {{ $keywords['Home'] ?? 'Home' }}
@endsection
@php
  Config::set('app.timezone', $userBs->timezoneinfo->timezone ?? '');
@endphp
@section('meta-description', !empty($userSeo) ? $userSeo->home_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->home_meta_keywords : '')
@section('content')


  <!-- ======= START HERO section ========= -->
  <section class="hero-banner pt-24 pb-lg-70 pb-50 header-next">
    <div class="container">
      <div class="row">
        <div class="col-lg-7">
          <div class="banner-lg radius-lg ratio ratio-5-4">
            <img class="lazyload bg-img blur-up"
              src="{{ empty($static->img) ? asset('assets/front/img/themes/banner-1.png') : asset('assets/front/img/hero_static/' . $static->img) }}"
              alt="Banner">
            <div class="content-wrapper">
              <div class="content">

                <span class="sub-title">{{ @$static->toper_subtitle }}</span>
                <h1 class="title">{{ @$static->title }}</h1>
                <p class="desc">{{ @$static->lower_subtitle }}</p>
                @if (@$static->btn_name && @$static->btn_url)
                  <a href="{{ $static->btn_url }}" class="btn btn-md thm-btn">{{ $static->btn_name }}</a>
                @endif
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="d-flex flex-column gap-30">
            <div class="banner-sm radius-lg ratio ratio-5-2">
              <img class="lazyload bg-img blur-up"
                src="{{ empty($static->img2) ? asset('assets/front/img/themes/banner-sm-1.png') : asset('assets/front/img/hero_static/' . $static->img2) }}"
                alt="Banner">
              <div class="content-wrapper">
                <div class="content">
                  <span class="sub-title">{{ @$static->second_subtitle }}</span>
                  <h3 class="title">{{ @$static->second_title }}</h3>
                  @if (@$static->secound_btn_name && @$static->secound_btn_url)
                    <a href="{{ $static->secound_btn_url }}" class="btn-link">
                      {{ $static->secound_btn_name }}
                      <i class="fa-regular fa-arrow-right-long"></i>
                    </a>
                  @endif
                </div>
              </div>
            </div>
            <div class="banner-sm radius-lg ratio ratio-5-2 ">
              <img class="lazyload bg-img blur-up"
                src="{{ empty($static->img3) ? asset('assets/front/img/themes/banner-sm-2.png') : asset('assets/front/img/hero_static/' . $static->img3) }}"
                alt="Banner">
              <div class="content-wrapper">
                <div class="content">
                  <span class="sub-title">{{ @$static->third_subtitle }}</span>
                  <h3 class="title">{{ @$static->third_title }}</h3>

                  @if (@$static->third_btn_name && @$static->third_btn_url)
                    <a href="{{ $static->third_btn_url }}" class="btn-link">
                      {{ $static->third_btn_name }}
                      <i class="fa-regular fa-arrow-right-long"></i>
                    </a>
                  @endif
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <!-- ========= END HERO section ========= -->

  <!-- ======= START Featured section ========= -->
  @if ($home_sections->featured_section == 1)
    @if (count($features) > 0)
      <section class="section-featured pb-lg-100 pb-50">
        <div class="container">
          <div class="row">
            @foreach ($features as $feature)
              <div class="col-xl-3 col-md-6 col-sm-6 ">
                <div class="featured-item">
                  <div class="icon">
                    <img data-src="{{ asset('assets/front/img/user/feature/' . $feature->icon) }}" class="lazy"
                      alt="services">
                  </div>
                  <div class="content">
                    <h5 class="mb-0">{{ $feature->title }}</h5>
                    <p class="small mb-0">{{ $feature->text }}</p>
                  </div>
                </div>
              </div>
            @endforeach
          </div>
        </div>
      </section>
    @endif
  @endif

  <!-- ======= End Featured section ========= -->

  <!-- ======= START Product section ========= -->
  @if ($home_sections->flashsale_item_section == 1)
    <section class="section-product pb-lg-80 pb-20">
      <div class="container">
        <div class="row">
          <div class="col-lg-12">
            <div class="section-title-inline mb-50">
              <h2>{{ @$home_text->flash_sale_title }} </h2>
              <a href="{{ route('front.user.shop', getParam()) . '?sale=flash' }}"
                class="btn btn-md thm-btn">{{ $keywords['shop_now'] ?? __('Shop Now') }}</a>
            </div>
          </div>
        </div>
        <div data-aos="fade-up" data-aos-delay="100">
          <div class="product-slider-slick" id="product-slider-slick-4" data-slidestoscroll="4" data-slidespace="24"
            data-xsmview="1" data-smview="2" data-mdview="2" data-lgview="3" data-xlview="4">
            @if ($flash_items->count() > 0)
              @foreach ($flash_items as $item)
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
                <div class="slide-item">
                  <div class="product-default mb-30">
                    <figure class="product-image mb-20">
                      <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"
                        class="lazy-container ratio ratio-1-1">
                        <img src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                          alt="product">
                      </a>
                      <div class="btn-icon-group">
                        <a href="#" target="_self" title="{{ $keywords['Favourite'] ?? 'Favourite' }}"
                          class="btn-icon rounded-pill add-to-wish cursor-pointer"data-toggle="tooltip"
                          data-placement="top" data-item_id="{{ $item->item_id }}"
                          data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}">
                          @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                            <i class="fa fa-heart"></i>
                          @else
                            <i class="far fa-heart"></i>
                          @endif
                        </a>
                        <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"
                          target="_self" title="{{ $keywords['Details'] ?? 'Details' }}" class="btn-icon rounded-pill">
                          <i class="fas fa-eye"></i>
                        </a>
                        @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                          <a target="_self" title="{{ $keywords['Add_to_cart'] ?? 'Add to cart' }}"
                            class="btn-icon rounded-pill add-to-cart cart-link"
                            data-title="{{ strlen($item->title) > 26 ? mb_substr($item->title, 0, 26, 'UTF-8') . '...' : $item->title }}"
                            data-current_price="{{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}"
                            data-item_id="{{ $item->item_id }}"
                            data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                            data-variations="{{ json_encode($variations) }}"
                            data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}">
                            <i class="fas fa-shopping-cart"></i>
                          </a>
                        @endif
                      </div>

                      @if ($item->type == 'physical')
                        @if ($stock == false)
                          <span class="stock-out danger"><i class="far fa-times"></i>
                            {{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                        @endif
                      @endif
                      <!-- flash-badge -->
                      @if ($isFlash)
                        <span class="flash-badge"><i class="fas fa-bolt"></i> -{{ $item->flash_percentage }}%</span>
                      @endif

                      @php
                        $endDateTime = Carbon\Carbon::parse($item->end_date . ' ' . $item->end_time)
                            ->tz($userBs->timezoneinfo->timezone)
                            ->format('Y-m-d\TH:i:s');
                        $startDateTime = Carbon\Carbon::parse($item->start_date . ' ' . $item->start_time)
                            ->tz($userBs->timezoneinfo->timezone)
                            ->format('Y-m-d\TH:i:s');
                      @endphp

                      <!-- product-countdown -->
                      @if ($isFlash)
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
                      @endif

                    </figure>
                    <div class="product-details px-18 text-center">
                      <h5 class="product-title fs-5 lc-2 ">
                        <a
                          href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">{{ $item->title }}</a>
                      </h5>
                      <!-- Review -->
                      @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                        @php
                          $avgRating = \App\Models\User\ItemReview::where('item_id', $item->item_id)->avg('review');
                          $totalReview = \App\Models\User\ItemReview::where('item_id', $item->item_id)->count();
                        @endphp
                        <div class="d-flex align-items-center justify-content-center mb-10 gap-1">
                          <div class="review rate">
                            <div class="rating" style="width:{{ $avgRating * 20 }}%"></div>
                          </div>
                          <span class="ratings-total small">({{ $totalReview }}
                            {{ $totalReview <= 1 ? 'Review' : 'Reviews' }})</span>
                        </div>
                      @endif
                      <div class="price d-flex align-items-center justify-content-center gap-2">
                        <h5 class=" mb-0 new-price">
                          {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}


                          {{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}
                          {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                        </h5>
                        @if ($item->flash)
                          <h5 class=" mb-0 old-price">
                            {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                            {{ formatNumber($item->current_price) }}
                            {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                          </h5>
                        @elseif($item->previous_price > 0)
                          <h5 class=" mb-0 old-price">
                            {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                            {{ formatNumber($item->previous_price) }}
                            {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                          </h5>
                        @endif
                      </div>
                    </div>
                  </div>
                </div>
              @endforeach
            @endif
            <!-- Slider pagination -->
          </div>
          <div class="slick-pagination" id="product-slider-slick-4-pagination"></div>
        </div>
      </div>
    </section>
  @endif
  <!-- ======= End Product section ========= -->

  <!-- ======= START Product section ========= -->
  @if ($home_sections->offer_banner_section == 1)
    <section class="section-banner pb-lg-90 pb-50">
      <div class="container">
        <div class="row justify-content-center">
          @if (count($topbanners) > 0)
            @foreach ($topbanners as $banner)
              <div class="col-xl-4 col-lg-6 col-md-6">
                <div class="banner-sm mb-30 radius-lg ratio ratio-5-2">
                  <img class="lazyload bg-img blur-up"
                    src="{{ asset('assets/front/img/user/offers/' . $banner->image) }}" alt="Banner">
                  <div class="content-wrapper">
                    <div class="content">
                      <span class="sub-title small">{{ $banner->text_2 }}</span>
                      <h3 class="title">{{ $banner->text_1 }}</h3>
                      <a href="{{ $banner->url }}" class="btn-link">
                        {{ $banner->btn_name }} <i class="fa-regular fa-arrow-right-long"></i>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            @endforeach
          @endif
        </div>
      </div>
    </section>
  @endif
  <!-- ======= End Product section ========= -->

  <!-- ======= START category section ========= -->
  @if ($home_sections->featured_category_section == 1)
    <section class="section-category pb-lg-100 pb-50">
      <div class="container">
        <div class="row">
          <div class="col-12">
            <div class="section-title text-center mb-30 mb-lg-40">
              <h2 class="title">{{ @$home_text->category_section_title }}</h2>
            </div>
          </div>
        </div>

        <div class="row">
          @foreach ($featureCategories->take(8) as $category)
            <div class="col-xl-3 col-lg-4 col-md-6">
              <div class="category-item category-inline mb-30">
                <div class="category-img">
                  <img class="lazyload bg-img blur-up"
                    src="{{ $category->image ? asset('assets/front/img/user/items/categories/' . $category->image) : asset('assets/admin/img/noimage.jpg') }}"
                    alt="Banner">
                </div>
                <div class="category-details">
                  <a href="{{ route('front.user.shop', getParam()) . '?category=' . urlencode($category->slug) }}">
                    <h5 class="category-title fs-5 mb-1">{{ $category->name }}</h5>
                  </a>
                  @if ($category->subcategories->count())
                    <ul class="list-group reset-ul toggle-list" data-toggle-list="categoryToggle" data-toggle-show="3">
                      @foreach ($category->subcategories as $sub)
                        <li>
                          <a
                            href="{{ route('front.user.shop', getParam()) . '?category=' . urlencode($category->slug) . '&subcategory=' . urlencode($sub->slug) }}">{{ ucfirst($sub->name) }}</a>
                        </li>
                      @endforeach
                    </ul>
                  @endif
                  <span class="show-more-btn mt-1 text-primary"
                    data-toggle-btn="toggleListBtn">{{ $keywords['Show_More'] ?? 'Show more' }}</span>
                </div>
              </div>
            </div>
          @endforeach
        </div>
      </div>
    </section>
  @endif
  <!-- ======= End category section ========= -->

  <!-- ======= START product-grid section ========= -->
  @if ($home_sections->featured_item_section == 1)
    <section class="section-product-grid pb-lg-80 pb-20">
      <div class="container">
        <div class="row">
          <div class="col-lg-12">
            <div class="text-center mb-50">
              <h2>{{ @$home_text->featured_item_section_title }}</h2>
            </div>
          </div>
        </div>

        <!-- slider-start -->
        <div data-aos="fade-up" data-aos-delay="100">
          <div class="product-slider-slick" id="product-slider-slick-11" data-slidestoscroll="4" data-slidespace="24"
            data-xsmview="1" data-smview="2" data-mdview="2" data-lgview="3" data-xlview="4">

            @if ($featured_items->count())
              @foreach ($featured_items as $item)
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
                  $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);
                @endphp

                <div class="slide-item">
                  <div class="product-default mb-30">

                    <figure class="product-image mb-20">
                      <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"
                        class="">
                        <img class="lazyload blur-up"
                          src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                          alt="product">
                      </a>
                      <div class="btn-icon-group">
                        <a href="#" target="_self" title="{{ $keywords['Favourite'] ?? 'Favourite' }}"
                          class="btn-icon rounded-pill add-to-wish cursor-pointer"data-toggle="tooltip"
                          data-placement="top" data-item_id="{{ $item->item_id }}"
                          data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}">
                          @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                            <i class="fa fa-heart"></i>
                          @else
                            <i class="far fa-heart"></i>
                          @endif
                        </a>
                        <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"
                          target="_self" title="{{ $keywords['Details'] ?? 'Details' }}"
                          class="btn-icon rounded-pill">
                          <i class="fas fa-eye"></i>
                        </a>
                        @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                          <a target="_self" title="{{ $keywords['Add_to_cart'] ?? 'Add to cart' }}"
                            class="btn-icon rounded-pill add-to-cart cart-link"
                            data-title="{{ strlen($item->title) > 26 ? mb_substr($item->title, 0, 26, 'UTF-8') . '...' : $item->title }}"
                            data-current_price="{{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}"
                            data-item_id="{{ $item->item_id }}"
                            data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                            data-variations="{{ json_encode($variations) }}"
                            data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}">
                            <i class="fas fa-shopping-cart"></i>
                          </a>
                        @endif
                      </div>
                      @if ($item->type == 'physical')
                        @if ($stock == false)
                          <span class="stock-out danger"><i class="far fa-times"></i>
                            {{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                        @endif
                      @endif
                      <!-- flash-badge -->
                      @if ($isFlash)
                        <span class="flash-badge"><i class="fas fa-bolt"></i> -{{ $item->flash_percentage }}%</span>
                      @endif
                      @php
                        $endDateTime = Carbon\Carbon::parse($item->end_date . ' ' . $item->end_time)
                            ->tz($userBs->timezoneinfo->timezone)
                            ->format('Y-m-d\TH:i:s');
                        $startDateTime = Carbon\Carbon::parse($item->start_date . ' ' . $item->start_time)
                            ->tz($userBs->timezoneinfo->timezone)
                            ->format('Y-m-d\TH:i:s');
                      @endphp

                      <!-- product-countdown -->
                      @if ($isFlash)
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
                      @endif


                    </figure>
                    <div class="product-details px-18 text-center">
                      <h5 class="product-title fs-5 lc-2 ">
                        <a
                          href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">{{ strlen($item->title) > 35 ? mb_substr($item->title, 0, 35, 'UTF-8') . '...' : $item->title }}</a>
                      </h5>
                      <!-- Review -->
                      @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                        @php
                          $avgRating = \App\Models\User\ItemReview::where('item_id', $item->item_id)->avg('review');
                          $totalReview = \App\Models\User\ItemReview::where('item_id', $item->item_id)->count();
                        @endphp
                        <div class="d-flex align-items-center justify-content-center mb-10 gap-1">
                          <div class="review rate">
                            <div class="rating" style="width:{{ $avgRating * 20 }}%"></div>
                          </div>
                          <span class="ratings-total small">({{ $totalReview }}
                            {{ $totalReview <= 1 ? 'Review' : 'Reviews' }})</span>
                        </div>
                      @endif

                      <div class="price d-flex align-items-center justify-content-center gap-2">
                        <h5 class=" mb-0 new-price">
                          {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                          {{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}
                          {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                        </h5>
                        @if ($item->flash)
                          <h5 class=" mb-0 old-price">
                            {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                            {{ formatNumber($item->current_price) }}
                            {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                          </h5>
                        @elseif($item->previous_price > 0)
                          <h5 class=" mb-0 old-price">
                            {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                            {{ formatNumber($item->previous_price) }}
                            {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                          </h5>
                        @endif
                      </div>
                    </div>

                  </div>
                </div>
              @endforeach
            @else
              <h3>{{ $keywords['No_Feature_Item_Found'] ?? 'No Feature Item Found!' }} </h3>
            @endif
          </div>
          <div class="slick-pagination" id="product-slider-slick-11-pagination"></div>
        </div>
      </div>
    </section>
  @endif
  <!-- ======= End product-grid section ========= -->

  <!-- ======= START Product tab section ========= -->
  @if ($home_sections->featured_category_item == 1)
    <section class="section-product-tab pb-lg-80 pb-20">
      <div class="container">
        <div class="row">
          <div class="col-lg-12">
            <div class="section-header text-center mb-50">
              <h2 class="mb-20">{{ @$home_text->featured_category_item_section_title }}</h2>

              <!-- tabs-navigation -->
              <div class="tabs-navigation tabs-navigation-v2 text-center mx-auto">
                <ul class="nav nav-tabs gap-14" data-hover="fancyHover">
                  <li class="nav-item active">
                    <button class="nav-link active hover-effect" data-bs-toggle="tab" data-bs-target="#allproducts"
                      type="button">All Products</button>
                  </li>
                  @foreach ($featureCategories->take(5) as $category)
                    <li class="nav-item ">
                      <button class="nav-link hover-effect " data-bs-toggle="tab"
                        data-bs-target="#category{{ $category->id }}" type="button">{{ $category->name }}</button>
                    </li>
                  @endforeach
                </ul>
              </div>
            </div>
          </div>
        </div>
        <!-- tab-content -->
        <div class="tab-content" id="productTabContent">
          <div class="tab-pane fade show active" id="allproducts" role="tabpanel" tabindex="0">
            <div class="row">
              @php
                $allItems = DB::table('user_items')
                    ->where('user_items.status', 1)
                    ->where('user_items.user_id', $user->id)
                    ->Join('user_item_contents', 'user_items.id', '=', 'user_item_contents.item_id')
                    ->join('user_item_categories', 'user_item_contents.category_id', '=', 'user_item_categories.id')
                    ->select(
                        'user_items.*',
                        'user_items.id AS item_id',
                        'user_item_contents.*',
                        'user_item_categories.name AS category',
                    )
                    ->orderBy('user_items.id', 'DESC')
                    ->where('user_item_contents.language_id', '=', $userCurrentLang->id)
                    ->where('user_item_categories.language_id', '=', $userCurrentLang->id)
                    ->limit(8)
                    ->get();

              @endphp
              @foreach ($allItems as $item)
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
                  $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);
                @endphp
                <div class="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                  <div class="product-default mb-30">
                    <figure class="product-image mb-20">
                      <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"
                        class="lazy-container ratio ratio-1-1">
                        <img src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                          alt="product">
                      </a>
                      <div class="btn-icon-group">
                        <a href="#" target="_self" title="{{ $keywords['Favourite'] ?? 'Favourite' }}"
                          class="btn-icon rounded-pill add-to-wish cursor-pointer"data-toggle="tooltip"
                          data-placement="top" data-item_id="{{ $item->item_id }}"
                          data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}">
                          @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                            <i class="fa fa-heart"></i>
                          @else
                            <i class="far fa-heart"></i>
                          @endif
                        </a>
                        <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"
                          target="_self" title="{{ $keywords['Details'] ?? 'Details' }}"
                          class="btn-icon rounded-pill">
                          <i class="fas fa-eye"></i>
                        </a>
                        @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                          <a target="_self" title="{{ $keywords['Add_to_cart'] ?? 'Add to cart' }}"
                            class="btn-icon rounded-pill add-to-cart cart-link"
                            data-title="{{ strlen($item->title) > 26 ? mb_substr($item->title, 0, 26, 'UTF-8') . '...' : $item->title }}"
                            data-current_price="{{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}"
                            data-item_id="{{ $item->item_id }}"
                            data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                            data-variations="{{ json_encode($variations) }}"
                            data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}">
                            <i class="fas fa-shopping-cart"></i>
                          </a>
                        @endif
                      </div>
                      @if ($item->type == 'physical')
                        @if ($stock == false)
                          <span class="stock-out danger"><i class="far fa-times"></i>
                            {{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                        @endif
                      @endif
                      <!-- flash-badge -->
                      @if ($isFlash)
                        <span class="flash-badge"><i class="fas fa-bolt"></i> -{{ $item->flash_percentage }}%</span>
                      @endif
                      @php
                        $endDateTime = Carbon\Carbon::parse($item->end_date . ' ' . $item->end_time)
                            ->tz($userBs->timezoneinfo->timezone)
                            ->format('Y-m-d\TH:i:s');
                        $startDateTime = Carbon\Carbon::parse($item->start_date . ' ' . $item->start_time)
                            ->tz($userBs->timezoneinfo->timezone)
                            ->format('Y-m-d\TH:i:s');
                      @endphp

                      <!-- product-countdown -->
                      @if ($isFlash)
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
                      @endif

                    </figure>
                    <div class="product-details px-18 text-center">
                      <h5 class="product-title fs-5 lc-2 ">
                        <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                          {{ strlen($item->title) > 30 ? mb_substr($item->title, 0, 30, 'UTF-8') . '...' : $item->title }}</a>
                      </h5>
                      <!-- Review -->
                      @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                        @php
                          $avgRating = \App\Models\User\ItemReview::where('item_id', $item->item_id)->avg('review');
                          $totalReview = \App\Models\User\ItemReview::where('item_id', $item->item_id)->count();
                        @endphp
                        <div class="d-flex align-items-center justify-content-center mb-10 gap-1">
                          <div class="review rate">
                            <div class="rating" style="width:{{ $avgRating * 20 }}%"></div>
                          </div>
                          <span class="ratings-total small">({{ $totalReview }}
                            {{ $totalReview <= 1 ? 'Review' : 'Reviews' }})</span>
                        </div>
                      @endif

                      <div class="price d-flex align-items-center justify-content-center gap-2">
                        <h5 class=" mb-0 new-price">
                          {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                          {{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}
                          {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                        </h5>
                        @if ($item->flash)
                          <h5 class=" mb-0 old-price">
                            {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                            {{ formatNumber($item->current_price) }}
                            {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                          </h5>
                        @elseif($item->previous_price > 0)
                          <h5 class=" mb-0 old-price">
                            {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                            {{ formatNumber($item->previous_price) }}
                            {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                          </h5>
                        @endif
                      </div>
                    </div>
                  </div>
                </div>
              @endforeach

            </div>
          </div>
          @foreach ($featureCategories->take(5) as $category)
            <div class="tab-pane fade" id="category{{ $category->id }}" role="tabpanel" tabindex="0">
              <div class="row">
                @php
                  $allItems = DB::table('user_items')
                      ->where('user_items.status', 1)
                      ->where('user_items.user_id', $user->id)
                      ->Join('user_item_contents', 'user_items.id', '=', 'user_item_contents.item_id')
                      ->join('user_item_categories', 'user_item_contents.category_id', '=', 'user_item_categories.id')
                      ->select(
                          'user_items.*',
                          'user_items.id AS item_id',
                          'user_item_contents.*',
                          'user_item_categories.name AS category',
                      )
                      ->orderBy('user_items.id', 'DESC')
                      ->where('user_item_contents.language_id', '=', $userCurrentLang->id)
                      ->where('user_item_contents.category_id', '=', $category->id)
                      ->where('user_item_categories.language_id', '=', $userCurrentLang->id)
                      ->limit(8)
                      ->get();

                @endphp
                @foreach ($allItems as $item)
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
                    $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);
                  @endphp
                  <div class="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                    <div class="product-default mb-30">
                      <figure class="product-image mb-20">

                        <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"
                          class="lazy-container ratio ratio-1-1">
                          <img src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                            alt="product">
                        </a>
                        <div class="btn-icon-group">
                          <a href="#" target="_self" title="{{ $keywords['Favourite'] ?? 'Favourite' }}"
                            class="btn-icon rounded-pill add-to-wish cursor-pointer"data-toggle="tooltip"
                            data-placement="top" data-item_id="{{ $item->item_id }}"
                            data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}">
                            @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                              <i class="fa fa-heart"></i>
                            @else
                              <i class="far fa-heart"></i>
                            @endif
                          </a>
                          <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"
                            target="_self" title="{{ $keywords['Details'] ?? 'Details' }}"
                            class="btn-icon rounded-pill">
                            <i class="fas fa-eye"></i>
                          </a>
                          @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                            <a target="_self" title="{{ $keywords['Add_to_cart'] ?? 'Add to cart' }}"
                              class="btn-icon rounded-pill add-to-cart cart-link"
                              data-title="{{ strlen($item->title) > 26 ? mb_substr($item->title, 0, 26, 'UTF-8') . '...' : $item->title }}"
                              data-current_price="{{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}"
                              data-item_id="{{ $item->item_id }}"
                              data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                              data-variations="{{ json_encode($variations) }}"
                              data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}">
                              <i class="fas fa-shopping-cart"></i>
                            </a>
                          @endif
                        </div>
                        @if ($item->type == 'physical')
                          @if ($stock == false)
                            <span class="stock-out danger"><i class="far fa-times"></i>
                              {{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                          @endif
                        @endif
                        <!-- flash-badge -->
                        @if ($isFlash)
                          <span class="flash-badge"><i class="fas fa-bolt"></i> -{{ $item->flash_percentage }}%</span>
                        @endif
                        @php
                          $endDateTime = Carbon\Carbon::parse($item->end_date . ' ' . $item->end_time)
                              ->tz($userBs->timezoneinfo->timezone)
                              ->format('Y-m-d\TH:i:s');
                          $startDateTime = Carbon\Carbon::parse($item->start_date . ' ' . $item->start_time)
                              ->tz($userBs->timezoneinfo->timezone)
                              ->format('Y-m-d\TH:i:s');
                        @endphp
                        <!-- product-countdown -->
                        @if ($isFlash)
                          <div class="product-countdown-2 justify-content-center"
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
                          </div>
                        @endif

                      </figure>
                      <div class="product-details px-18 text-center">
                        <h5 class="product-title fs-5 lc-2 ">
                          <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                            {{ strlen($item->title) > 30 ? mb_substr($item->title, 0, 30, 'UTF-8') . '...' : $item->title }}</a>
                        </h5>
                        <!-- Review -->
                        @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                          @php
                            $avgRating = \App\Models\User\ItemReview::where('item_id', $item->item_id)->avg('review');
                            $totalReview = \App\Models\User\ItemReview::where('item_id', $item->item_id)->count();
                          @endphp
                          <div class="d-flex align-items-center justify-content-center mb-10 gap-1">
                            <div class="review rate">
                              <div class="rating" style="width:{{ $avgRating * 20 }}%"></div>
                            </div>
                            <span class="ratings-total small">({{ $totalReview }}
                              {{ $totalReview <= 1 ? 'Review' : 'Reviews' }})</span>
                          </div>
                        @endif

                        <div class="price d-flex align-items-center justify-content-center gap-2">
                          <h5 class=" mb-0 new-price">
                            {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                            {{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}
                            {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                          </h5>
                          @if ($item->flash)
                            <h5 class=" mb-0 old-price">
                              {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                              {{ formatNumber($item->current_price) }}
                              {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                            </h5>
                          @elseif($item->previous_price > 0)
                            <h5 class=" mb-0 old-price">
                              {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                              {{ formatNumber($item->previous_price) }}
                              {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                            </h5>
                          @endif
                        </div>
                      </div>
                    </div>
                  </div>
                @endforeach

              </div>
            </div>
          @endforeach
        </div>
      </div>
    </section>
  @endif


  <!-- ======= End Product tab section ========= -->

  <!-- ======= START Product section ========= -->
  @if ($home_sections->toprated_item_section == 1)
    <section class="section-product pb-lg-80 pb-20 overflow-hidden">
      <div class="container">
        <div class="row">
          <div class="col-lg-6">
            <div class="banner-lg mb-30 radius-lg ratio ratio-5-4">
              <img class="lazyload bg-img blur-up"
                src="{{ !empty(@$home_text->counter_section_image) ? asset('assets/front/img/user/home_settings/' . $home_text->counter_section_image) : asset('assets/front/img/themes/banner-lg-2.png') }}"
                alt="Banner">
              <div class="content-wrapper">
                <div class="content mx-auto">
                  <h4 class="title mb-30">{{ @$home_text->featured_course_section_title }}</h4>
                  <a href="{{ @$home_text->faq_section_subtitle }}" class="btn btn-md thm-btn">
                    {{ @$home_text->faq_section_title }}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="section-title mb-30">
              <h2>{{ @$home_text->toprated_item_title }}</h2>
            </div>

            <!-- slider-start -->
            <div data-aos="fade-up" data-aos-delay="100">
              <div class="product-slider-slick" id="product-slider-slick-3" data-slidestoscroll="2"
                data-slidespace="24" data-xsmview="1" data-smview="2" data-mdview="2" data-lgview="2"
                data-xlview="2">
                @if (count($rating_items) > 0)
                  @foreach ($rating_items as $item)
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
                      $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);
                    @endphp
                    <div class="slide-item">
                      <div class="product-default mb-30">
                        <figure class="product-image mb-20">
                          <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"
                            class="lazy-container ratio ratio-1-1">
                            <img data-src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                              alt="product">
                          </a>
                          <div class="btn-icon-group">
                            <a href="#" target="_self" title="{{ $keywords['Favourite'] ?? 'Favourite' }}"
                              class="btn-icon rounded-pill add-to-wish cursor-pointer"data-toggle="tooltip"
                              data-placement="top" data-item_id="{{ $item->item_id }}"
                              data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}">
                              @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                                <i class="fa fa-heart"></i>
                              @else
                                <i class="far fa-heart"></i>
                              @endif
                            </a>
                            <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"
                              target="_self" title="{{ $keywords['Details'] ?? 'Details' }}"
                              class="btn-icon rounded-pill">
                              <i class="fas fa-eye"></i>
                            </a>
                            @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                              <a target="_self" title="{{ $keywords['Add_to_cart'] ?? 'Add to cart' }}"
                                class="btn-icon rounded-pill add-to-cart cart-link"
                                data-title="{{ strlen($item->title) > 26 ? mb_substr($item->title, 0, 26, 'UTF-8') . '...' : $item->title }}"
                                data-current_price="{{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}"
                                data-item_id="{{ $item->item_id }}"
                                data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                                data-variations="{{ json_encode($variations) }}"
                                data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}">
                                <i class="fas fa-shopping-cart"></i>
                              </a>
                            @endif
                          </div>
                          @if ($item->type == 'physical')
                            @if ($stock == false)
                              <span class="stock-out danger"><i class="far fa-times"></i>
                                {{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                            @endif
                          @endif
                          <!-- flash-badge -->
                          @if ($isFlash)
                            <span class="flash-badge"><i class="fas fa-bolt"></i>
                              -{{ $item->flash_percentage }}%</span>
                          @endif

                          @php
                            $endDateTime = Carbon\Carbon::parse($item->end_date . ' ' . $item->end_time)
                                ->tz($userBs->timezoneinfo->timezone)
                                ->format('Y-m-d\TH:i:s');
                            $startDateTime = Carbon\Carbon::parse($item->start_date . ' ' . $item->start_time)
                                ->tz($userBs->timezoneinfo->timezone)
                                ->format('Y-m-d\TH:i:s');
                          @endphp

                          <!-- product-countdown -->
                          @if ($isFlash)
                            <div class="product-countdown-2 justify-content-center"
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
                            </div>
                          @endif

                        </figure>
                        <div class="product-details px-18 text-center">
                          <h5 class="product-title fs-5 lc-2 ">
                            <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                              {{ strlen($item->title) > 30 ? mb_substr($item->title, 0, 30, 'UTF-8') . '...' : $item->title }}</a>
                          </h5>
                          <!-- Review -->
                          @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                            @php
                              $avgRating = \App\Models\User\ItemReview::where('item_id', $item->item_id)->avg('review');
                              $totalReview = \App\Models\User\ItemReview::where('item_id', $item->item_id)->count();
                            @endphp
                            <div class="d-flex align-items-center justify-content-center mb-10 gap-1">
                              <div class="review rate">
                                <div class="rating" style="width:{{ $avgRating * 20 }}%"></div>
                              </div>
                              <span class="ratings-total small">({{ $totalReview }}
                                {{ $totalReview <= 1 ? 'Review' : 'Reviews' }})</span>
                            </div>
                          @endif
                          <div class="price d-flex align-items-center justify-content-center gap-2">
                            <h5 class=" mb-0 new-price">
                              {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                              {{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}
                              {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                            </h5>
                            @if ($item->flash)
                              <h5 class=" mb-0 old-price">
                                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                {{ formatNumber($item->current_price) }}
                                {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                              </h5>
                            @elseif($item->previous_price > 0)
                              <h5 class=" mb-0 old-price">
                                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                {{ formatNumber($item->previous_price) }}
                                {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                              </h5>
                            @endif
                          </div>
                        </div>
                      </div>
                    </div>
                  @endforeach
                @else
                  <div class="col-lg-12">
                    <h3 class="text-center">{{ $keywords['No_Item_Found!'] ?? 'No  Item Found!' }}
                    </h3>
                  </div>
                @endif
                <!-- Slider pagination -->
              </div>
              <div class="slick-pagination" id="product-slider-slick-3-pagination"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  @endif
  <!-- ======= End Product section ========= -->

  <!-- ======= START Product section ========= -->
  @if ($home_sections->bottom_offer_banner_section == 1)
    <section class="section-banner pb-lg-90 pb-50">
      <div class="container">
        <div class="row">
          @if (count($bottombanners) > 0)
            @foreach ($bottombanners as $bannerb)
              <div class="col-lg-6 col-md-6">
                <div class="banner-sm mb-30 radius-lg ratio ratio-21-8">
                  <img class="lazyload bg-img blur-up"
                    src="{{ asset('assets/front/img/user/offers/' . $bannerb->image) }}" alt="Banner">
                  <div class="content-wrapper">
                    <div class="content">
                      <span class="sub-title small">{{ $bannerb->text_2 }}</span>
                      <h3 class="title">{{ $bannerb->text_1 }}</h3>
                      <a href="{{ $bannerb->url }}" class="btn-link text-dark">
                        {{ $bannerb->btn_name }} <i class="fa-regular fa-arrow-right-long"></i>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            @endforeach
          @endif
        </div>
      </div>
    </section>
  @endif
  <!-- ======= End Product section ========= -->

  <!-- ======= START Product Inline section ========= -->
  @if ($home_sections->on_sale_section == 1)
    <section class="section-product-inline pb-lg-80 pb-20">
      <div class="container">
        <div class="row">
          <div class="col-lg-12">
            <div class="section-title text-center mb-30">
              <h2>{{ @$home_text->on_sale_section_title }}</h2>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-lg-4">
            @foreach ($on_sale_items->take(3) as $item)
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
                $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);
              @endphp
              <div class="product-inline mb-30">
                <figure class="product-image">
                  <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"
                    class="lazy-container ratio ratio-1-1">
                    <img src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                      alt="product">
                  </a>
                  <!-- flash-badge -->
                  @if ($isFlash)
                    <span class="flash-badge"><i class="fas fa-bolt"></i>
                      -{{ $item->flash_percentage }}%</span>
                  @endif

                  @if ($item->type == 'physical')
                    @if ($stock == false)
                      <span class="stock-out danger"><i class="far fa-times"></i>
                        {{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                    @endif
                  @endif

                </figure>
                <div class="product-details">
                  <h5 class="product-title fs-5 lc-2 ">
                    <a
                      href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">{{ strlen($item->title) > 35 ? mb_substr($item->title, 0, 35, 'UTF-8') . '...' : $item->title }}</a>
                  </h5>
                  <!-- Review -->

                  @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                    @php
                      $avgRating = \App\Models\User\ItemReview::where('item_id', $item->item_id)->avg('review');
                      $totalReview = \App\Models\User\ItemReview::where('item_id', $item->item_id)->count();
                    @endphp
                    <div class="d-flex align-items-center mb-10 gap-1">
                      <div class="review rate">
                        <div class="rating" style="width:{{ $avgRating * 20 }}%"></div>
                      </div>
                      <span class="ratings-total small">({{ $totalReview }}
                        {{ $totalReview <= 1 ? 'Review' : 'Reviews' }})</span>
                    </div>
                  @endif

                  <div class="price d-flex align-items-center gap-2 mb-10">
                    <h5 class=" mb-0 new-price">
                      {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                      {{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}
                      {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                    </h5>
                    @if ($item->flash)
                      <h5 class=" mb-0 old-price">
                        {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                        {{ formatNumber($item->current_price) }}
                        {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                      </h5>
                    @elseif($item->previous_price > 0)
                      <h5 class=" mb-0 old-price">
                        {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                        {{ formatNumber($item->previous_price) }}
                        {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                      </h5>
                    @endif
                  </div>

                  <div class="btn-icon-group">
                    <a href="#" target="_self" title="{{ $keywords['Favourite'] ?? 'Favourite' }}"
                      class="btn-icon rounded-pill add-to-wish cursor-pointer"data-toggle="tooltip" data-placement="top"
                      data-item_id="{{ $item->item_id }}"
                      data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}">
                      @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                        <i class="fa fa-heart"></i>
                      @else
                        <i class="far fa-heart"></i>
                      @endif
                    </a>
                    <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"
                      target="_self" title="{{ $keywords['Details'] ?? 'Details' }}" class="btn-icon rounded-pill">
                      <i class="fas fa-eye"></i>
                    </a>
                    @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                      <a target="_self" title="{{ $keywords['Add_to_cart'] ?? 'Add to cart' }}"
                        class="btn-icon rounded-pill add-to-cart cart-link"
                        data-title="{{ strlen($item->title) > 26 ? mb_substr($item->title, 0, 26, 'UTF-8') . '...' : $item->title }}"
                        data-current_price="{{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}"
                        data-item_id="{{ $item->item_id }}"
                        data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                        data-variations="{{ json_encode($variations) }}"
                        data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}">
                        <i class="fas fa-shopping-cart"></i>
                      </a>
                    @endif
                  </div>
                </div>
              </div>
            @endforeach
          </div>
          <div class="col-lg-4">
            <div class="banner-lg mb-30 radius-lg ratio ratio-1-3">
              <img class="lazyload bg-img blur-up"
                src="{{ !empty(@$home_text->on_sale_section_image) ? asset('assets/front/img/user/home_settings/' . $home_text->on_sale_section_image) : asset('assets/front/img/themes/banner-lg-2.png') }}"
                alt="Banner">
              <div class="content-wrapper">
                <div class="content mx-auto">
                  <h4 class="title mb-30">{{ @$home_text->on_sale_section_subtitle }}</h4>
                  @if (@$home_text->on_sale_section_section_button_link && @$home_text->on_sale_section_section_button_name)
                    <a href="{{ @$home_text->on_sale_section_section_button_link }}" class="btn btn-md thm-btn">
                      {{ @$home_text->on_sale_section_section_button_name }}
                    </a>
                  @endif
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-4">
            @foreach ($on_sale_items->skip(3) as $item)
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
                $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);
              @endphp
              <div class="product-inline mb-30">
                <figure class="product-image">
                  <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"
                    class="lazy-container ratio ratio-1-1">
                    <img src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                      alt="product">
                  </a>
                  <!-- flash-badge -->
                  @if ($isFlash)
                    <span class="flash-badge"><i class="fas fa-bolt"></i>
                      -{{ $item->flash_percentage }}%</span>
                  @endif
                  {{-- stock-out --}}
                  @if ($item->type == 'physical')
                    @if ($stock == false)
                      <span class="stock-out danger"><i class="far fa-times"></i>
                        {{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                    @endif
                  @endif

                </figure>
                <div class="product-details">
                  <h5 class="product-title fs-5 lc-2 ">
                    <a
                      href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">{{ strlen($item->title) > 35 ? mb_substr($item->title, 0, 35, 'UTF-8') . '...' : $item->title }}</a>
                  </h5>
                  <!-- Review -->

                  @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                    @php
                      $avgRating = \App\Models\User\ItemReview::where('item_id', $item->item_id)->avg('review');
                      $totalReview = \App\Models\User\ItemReview::where('item_id', $item->item_id)->count();
                    @endphp
                    <div class="d-flex align-items-center mb-10 gap-1">
                      <div class="review rate">
                        <div class="rating" style="width:{{ $avgRating * 20 }}%"></div>
                      </div>
                      <span class="ratings-total small">({{ $totalReview }}
                        {{ $totalReview <= 1 ? 'Review' : 'Reviews' }})</span>
                    </div>
                  @endif

                  <div class="price d-flex align-items-center gap-2 mb-10">
                    <h5 class=" mb-0 new-price">
                      {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                      {{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}
                      {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                    </h5>
                    @if ($item->flash)
                      <h5 class=" mb-0 old-price">
                        {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                        {{ formatNumber($item->current_price) }}
                        {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                      </h5>
                    @elseif($item->previous_price > 0)
                      <h5 class=" mb-0 old-price">
                        {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                        {{ formatNumber($item->previous_price) }}
                        {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                      </h5>
                    @endif
                  </div>

                  <div class="btn-icon-group">
                    <a href="#" target="_self" title="{{ $keywords['Favourite'] ?? 'Favourite' }}"
                      class="btn-icon rounded-pill add-to-wish cursor-pointer"data-toggle="tooltip" data-placement="top"
                      data-item_id="{{ $item->item_id }}"
                      data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}">
                      @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                        <i class="fa fa-heart"></i>
                      @else
                        <i class="far fa-heart"></i>
                      @endif
                    </a>
                    <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"
                      target="_self" title="{{ $keywords['Details'] ?? 'Details' }}" class="btn-icon rounded-pill">
                      <i class="fas fa-eye"></i>
                    </a>
                    @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                      <a target="_self" title="{{ $keywords['Add_to_cart'] ?? 'Add to cart' }}"
                        class="btn-icon rounded-pill add-to-cart cart-link"
                        data-title="{{ strlen($item->title) > 26 ? mb_substr($item->title, 0, 26, 'UTF-8') . '...' : $item->title }}"
                        data-current_price="{{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}"
                        data-item_id="{{ $item->item_id }}"
                        data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                        data-variations="{{ json_encode($variations) }}"
                        data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}">
                        <i class="fas fa-shopping-cart"></i>
                      </a>
                    @endif
                  </div>
                </div>
              </div>
            @endforeach
          </div>
        </div>
      </div>
    </section>
  @endif
  <!-- ======= START Product Inline section ========= -->
  <!-- ==== back to top ==== -->
  <div class="go-top">
    <i class="fa-regular fa-angles-up"></i>
  </div>
  {{-- Variation Modal Starts --}}
  @includeIf('front.partials.variation-modal')
  {{-- Variation Modal Ends --}}
@endsection
