@extends('user-front.layout')

@section('meta-description', !empty($userSeo) ? $userSeo->cart_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->cart_meta_keywords : '')

@section('tab-title')
  {{ $keywords['Cart'] ?? 'Cart' }}
@endsection

@section('page-name')
  {{ $keywords['Cart'] ?? 'Cart' }}
@endsection
@section('br-name')
  {{ $keywords['Cart'] ?? 'Cart' }}
@endsection
@section('content')
  <section class="cart-area-section section-gap">
    <div class="container clearfix">
      <div class="row">
        <div class="col-xl-12 col-lg-12 col-md-12 col-sm-12">
          <div id="refreshDiv">
            <div class="cart-block">
              <ul class="total-item-info">
                @php
                  $cartTotal = 0;
                  $countitem = 0;
                  if ($cart) {
                      foreach ($cart as $p) {
                          $cartTotal += $p['total'];
                          $countitem += $p['qty'];
                      }
                  }
                @endphp
                <li>
                  <strong>{{ $keywords['Total_Items'] ?? 'Total Items' }}:</strong>
                  <strong class="cart-item-view">{{ $cart ? $countitem : 0 }}</strong>
                </li>
                <li>
                  <strong>{{ $keywords['Cart_Total'] ?? 'Cart Total' }} :</strong>
                  <strong class="cart-total-view" dir="ltr">
                    {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                    {{ formatNumber($cartTotal) }}
                    {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                  </strong>
                </li>
              </ul>
              <div class="table-outer table-responsive">
                @if ($cart != null)
                  <table class="cart-table">
                    <thead class="cart-header">
                      <tr>
                        <th class="prod-column">{{ $keywords['item'] ?? 'item' }}</th>
                        <th class="hide-column"></th>
                        <th>{{ $keywords['Quantity'] ?? __('Quantity') }}</th>
                        <th class="price">{{ $keywords['price'] ?? __('Price') }}</th>
                        <th>{{ $keywords['total'] ?? __('total') }}</th>
                        <th>{{ $keywords['Remove'] ?? __('Remove') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($cart as $key => $item)
                        @php
                          $id = $item['id'];
                          $product = App\Models\User\UserItem::findOrFail($item['id']);
                        @endphp
                        <tr class="remove{{ $key }}">
                          <td colspan="2" class="prod-column">
                            <div class="column-box">
                              <div class="product-image">
                                <a target="_blank"
                                  href="{{ route('front.user.item_details', ['slug' => $item['slug'], getParam()]) }}">
                                  <img
                                    src="{{ $item ? asset('assets/front/img/user/items/thumbnail/' . $product->thumbnail) : 'https://via.placeholder.com/350x350' }}"
                                    class="lazy">
                                </a>
                              </div>
                              <div class="title pl-0">
                                <input type="hidden" value="{{ $id }}" class="product_id">
                                <a target="_blank"
                                  href="{{ route('front.user.item_details', ['slug' => $item['slug'], getParam()]) }}">
                                  <h3 class="prod-title">
                                    {{ strlen($item['name']) > 32 ? mb_substr($item['name'], 0, 32, 'UTF-8') . '...' : $item['name'] }}
                                  </h3>
                                </a>
                                <div class="variation-content">

                                  <strong class="d-inline-block">
                                    {{ $keywords['Item_price'] ?? __('Item Price') }}:
                                  </strong>
                                  <span dir="ltr">
                                    {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                    {{ $item['product_price'] }}
                                    {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                  </span>

                                  @if (!empty($item['variations']))
                                    <h6>
                                      {{ $keywords['Variations'] ?? __('Variations') }}:
                                    </h6>
                                    @php
                                      $v_total = 0;
                                    @endphp
                                    @foreach ($item['variations'] as $k => $itm)
                                      <table class="variation-table">
                                        <tr>
                                          <td class="">
                                            <strong>{{ $k }} :
                                          </td>
                                          <td>{{ $itm['name'] }}: </td>
                                          <td>
                                            {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                            {{ $itm['price'] }}
                                            {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                          </td>
                                        </tr>
                                      </table>
                                      @php
                                        $v_total += $itm['price'];
                                      @endphp
                                    @endforeach
                                  @endif
                                </div>
                              </div>
                            </div>
                          </td>
                          <td class="qty crt-qty">
                            <div class="quantity-input">
                              <div class="quantity-down" id="quantityDown">
                                <i class="fal fa-minus"></i>
                              </div>
                              <input class="cart_qty" type="text" value="{{ $item['qty'] }}" name="quantity">
                              <div class="quantity-up" id="quantityUP">
                                <i class="fal fa-plus"></i>
                              </div>
                            </div>
                          </td>
                          <td class="price cart_price">
                            <div class="variation-content">
                              <p>
                                <strong>{{ $keywords['item'] ?? __('Item') }}:</strong>
                                <span dir="ltr">
                                  {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                  <span>{{ $item['variations'] ? $item['total'] - $v_total * $item['qty'] : $item['product_price'] * $item['qty'] }}</span>
                                  {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                </span>
                              </p>
                              @if (!empty($item['variations']))
                                <p>
                                  <strong>{{ $keywords['Variation'] ?? __('Variation') }}:</strong>
                                  {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                  <span>{{ $v_total * $item['qty'] }}</span>
                                  {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                </p>
                              @endif
                            </div>
                          </td>
                          <td class="sub-total">
                            <span dir="ltr">
                              {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                              {{ $item['total'] }}
                              {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                            </span>
                          </td>
                          <td>
                            <div class="remove">
                              <div class="checkbox">
                                <span class="fas fa-times cursor-pointer item-remove" rel="{{ $id }}"
                                  data-href="{{ route('front.cart.item.remove', ['uid' => $key, getParam()]) }}"></span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      @endforeach
                    </tbody>
                  </table>
                @else
                  <div class="bg-light py-5 text-center">
                    <h3 class="text-uppercase">{{ $keywords['Cart_is_empty'] ?? __('Cart is empty') }}
                    </h3>
                  </div>
                @endif
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="row cart-middle">
        @if ($cart != null)
          <div class="col-lg-12">
            <div class="update-cart">
              <button class="cart-btn" id="updateCart"
                data-href="{{ route('front.user.cart.update', getParam()) }}"><span>{{ $keywords['Update'] ?? __('Update') }}
                  {{ $keywords['Cart'] ?? __('Cart') }}</span></button>
              <a class="cart-btn"
                href="{{ route('front.user.checkout', getParam()) }}"><span>{{ $keywords['Checkout'] ?? __('Checkout') }}</span></a>
            </div>
          </div>
        @endif
      </div>
    </div>
  </section>
@endsection
@section('scripts')
@endsection
