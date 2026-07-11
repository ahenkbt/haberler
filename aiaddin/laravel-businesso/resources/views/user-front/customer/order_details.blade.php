@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Order_details'] ?? __('Order details') }}
@endsection

@section('page-name')
  {{ $keywords['Order_details'] ?? __('Order details') }}
@endsection

@section('br-name')
  {{ $keywords['Order_details'] ?? __('Order details') }}
@endsection


@section('content')
  <section class="user-dashbord section-gap">
    <div class="container">
      <div class="row">
        @includeIf('user-front.customer.side-navbar')
        <div class="col-lg-9">
          <div class="row">
            <div class="col-lg-12">
              <div class="user-profile-details">
                <div class="order-details">
                  @if (!onlyDigitalItems($data))
                    <div class="progress-area-step">
                      <ul class="progress-steps">
                        <li class="step {{ $data->order_status == 'Pending' ? 'active' : '' }}">
                          <div class="step-trigger">
                            <div class="icon">1</div>
                            <div class="progress-title">{{ $keywords['Pending'] ?? __('Pending') }}</div>
                          </div>
                        </li>
                        <li class="step {{ $data->order_status == 'processing' ? 'active' : '' }}">
                          <div class="step-trigger">
                            <div class="icon">2</div>
                            <div class="progress-title">{{ $keywords['Processing'] ?? __('Processing') }}</div>
                          </div>
                        </li>
                        <li class="step {{ $data->order_status == 'completed' ? 'active' : '' }}">
                          <div class="step-trigger">
                            <div class="icon">3</div>
                            <div class="progress-title">{{ $keywords['Completed'] ?? __('Completed') }}</div>
                          </div>
                        </li>
                        <li class="step {{ $data->order_status == 'rejected' ? 'active' : '' }}">
                          <div class="step-trigger">
                            <div class="icon">4</div>
                            <div class="progress-title">{{ $keywords['Rejected'] ?? __('Rejected') }}</div>
                          </div>
                        </li>
                      </ul>
                    </div>
                  @else
                    <div class="progress-area-step">
                      <ul class="progress-steps">
                        <li class="{{ $data->order_status == 'Pending' ? 'active' : '' }}">
                          <div class="icon">1</div>
                          <div class="progress-title">{{ $keywords['Pending'] ?? __('Pending') }}</div>
                        </li>
                        <li class="{{ $data->order_status == 'processing' ? 'active' : '' }}">
                          <div class="icon">2</div>
                          <div class="progress-title">{{ $keywords['Processing'] ?? __('Processing') }}</div>
                        </li>
                        <li class="{{ $data->order_status == 'completed' ? 'active' : '' }}">
                          <div class="icon">3</div>
                          <div class="progress-title">{{ $keywords['Completed'] ?? __('Completed') }}</div>
                        </li>
                        <li class="{{ $data->order_status == 'rejected' ? 'active' : '' }}">
                          <div class="icon">4</div>
                          <div class="progress-title">{{ $keywords['Rejected'] ?? __('Rejected') }}</div>
                        </li>
                      </ul>
                    </div>
                  @endif
                  <div class="title">
                    <h4>{{ $keywords['Item_Order_details'] ?? __('Item Order Details') }}</h4>
                  </div>
                  <div id="print">
                    <div class="view-order-page">
                      <div class="order-info-area">
                        <div class="row align-items-center">
                          <div class="col-lg-8">
                            <div class="order-info">
                              <h4>{{ $keywords['order'] ?? __('Order') }}
                                {{ $data->order_id }}
                                [{{ $data->order_number }}]</h4>
                              <p><strong>{{ $keywords['order'] ?? __('Order') }}
                                  {{ $keywords['date'] ?? __('Date') }}:</strong>
                                {{ $data->created_at->format('d-m-Y') }}</p>
                            </div>
                          </div>
                          <div class="col-lg-4 print-btn">
                            <div class="prinit float-lg-end">
                              <a href="{{ asset('assets/front/invoices/' . $data->invoice_number) }}"
                                download="invoice.pdf" id="print-click" class="btn btn-primary ">
                                <i class="fas fa-print"></i>{{ $keywords['Download_Invoice'] ?? __('Download Invoice') }}
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="billing-add-area mb-20">
                      <div class="row">
                        <div class="col-md-4 ">
                          <div class="main-info mb-20 payment-information">
                            <h4>{{ $keywords['Order_details'] ?? __('Order Details') }} :
                            </h4>
                            <ul>

                              <li><strong>{{ $keywords['Payment_Status'] ?? __('Payment Status') }}</strong>
                                :
                                @if ($data->payment_status == 'Pending' || $data->payment_status == 'pending')
                                  <span
                                    class="badge badge-danger">{{ $keywords[$data->payment_status] ?? $data->payment_status }}
                                  </span>
                                @else
                                  <span
                                    class="badge badge-success">{{ $keywords[$data->payment_status] ?? $data->payment_status }}</span>
                                  </span>
                                @endif
                              </li>
                              @if (!empty($data->shipping_method))
                                <li><strong>{{ $keywords['Shipping_Method'] ?? __('Shipping Method') }}
                                  </strong> :
                                  {{ $data->shipping_method }}
                                </li>
                              @endif
                              <li><strong>
                                  {{ $keywords['Cart_Total'] ?? __('Cart Total') }}</strong>
                                : <span
                                  class="amount">{{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}

                                  {{ $data->cart_total }}

                                  {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}</span>
                              </li>
                              <li class="text-success">
                                <strong>{{ $keywords['Discount'] ?? __('Discount') }}</strong>
                                <span style="font-size: 12px;">(<i class="fas fa-minus"></i>)</span> : <span
                                  class="amount">{{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}

                                  {{ $data->discount }}

                                  {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}</span>
                              </li>
                              <li> <strong>{{ $keywords['subtotal'] ?? __('Subtotal') }}</strong>
                                : <span
                                  class="amount">{{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}

                                  {{ $data->cart_total - $data->discount }}

                                  {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}</span>
                              </li>
                              @if (!empty($data->shipping_method))
                                <li class="text-danger">
                                  <strong>{{ $keywords['Shipping_charge'] ?? __('Shipping Charge') }}</strong>
                                  <span style="font-size: 12px;">(<i class="fas fa-plus"></i>)</span> : <span
                                    class="amount">{{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}

                                    {{ $data->shipping_charge }}

                                    {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}</span>
                                </li>
                              @endif
                              <li class="text-danger">
                                <strong>{{ $keywords['tax'] ?? __('Tax') }}</strong>
                                ({{ $userBs->tax }}%) <span style="font-size: 12px;">(<i
                                    class="fas fa-plus"></i>)</span> : <span
                                  class="amount">{{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}

                                  {{ $data->tax }}

                                  {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}</span>
                              </li>
                              <li> <strong> {{ $keywords['Paid_Amount'] ?? __('Paid Amount') }}
                                </strong> : <span
                                  class="amount">{{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                  {{ $data->total }}
                                  {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}</span>
                              </li>
                              <li> <strong>
                                  {{ $keywords['Payment_Method'] ?? __('Payment Method') }}
                                </strong> :
                                {{ $keywords[$data->method] ?? $data->method }}
                              </li>
                            </ul>
                          </div>
                        </div>
                        <div class="col-md-4">
                          <div class="main-info mb-20">
                            <h4> {{ $keywords['shipping_details'] ?? __('Shipping Details') }}
                              </h5>
                              <ul class="list">
                                <li>
                                  <p><span> <strong>{{ $keywords['email'] ?? __('Email') }}
                                      </strong>
                                      :</span>{{ $data->shpping_email }}
                                  </p>
                                </li>
                                <li>
                                  <p><span> <strong>{{ $keywords['phone'] ?? __('Phone') }}
                                      </strong>
                                      :</span>{{ $data->shpping_number }}
                                  </p>
                                </li>
                                <li>
                                  <p><span> <strong>{{ $keywords['city'] ?? __('City') }}
                                      </strong>
                                      :</span>{{ $data->shpping_city }}
                                  </p>
                                </li>
                                <li>
                                  <p><span>
                                      <strong>{{ $keywords['address'] ?? __('Address') }}</strong>
                                      :</span>{{ $data->shpping_address }}
                                  </p>
                                </li>
                                <li>
                                  <p> <span> <strong>{{ $keywords['country'] ?? __('Country') }}
                                      </strong> : </span>{{ $data->shpping_country }}
                                  </p>
                                </li>
                              </ul>
                          </div>
                        </div>
                        <div class="col-md-4">
                          <div class="main-info mb-20">
                            <h4>{{ $keywords['billing_details'] ?? __('Billing Details') }}
                            </h4>
                            <ul class="list">
                              <li>
                                <p><span> <strong> {{ $keywords['email'] ?? __('Email') }}
                                    </strong>
                                    :</span>{{ $data->billing_email }}
                                </p>
                              </li>
                              <li>
                                <p><span> <strong>{{ $keywords['phone'] ?? __('Phone') }}
                                    </strong>
                                    :</span>{{ $data->billing_number }}
                                </p>
                              </li>
                              <li>
                                <p><span> <strong>{{ $keywords['city'] ?? __('City') }}
                                    </strong>
                                    :</span>{{ $data->billing_city }}
                                </p>
                              </li>
                              <li>
                                <p><span> <strong>{{ $keywords['address'] ?? __('Address') }}
                                    </strong>
                                    :</span>{{ $data->billing_address }}
                                </p>
                              </li>
                              <li>
                                <p><span>
                                    <strong>{{ $keywords['country'] ?? __('Country') }}</strong>
                                    :</span>{{ $data->billing_country }}
                                </p>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="table-responsive product-list">
                      <h5>{{ $keywords['Ordered_Items'] ?? __('Ordered Items') }}</h5>
                      <table class="table table-bordered">
                        <thead>
                          <tr>
                            <th>{{ $keywords['Image'] ?? __('Image') }}</th>
                            <th>{{ $keywords['Name'] ?? __('Name') }}</th>
                            <th>{{ $keywords['details'] ?? __('Details') }}</th>

                            <th>{{ $keywords['total'] ?? __('Total') }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          @foreach ($data->orderitems as $key => $order)
                            @php

                              // $itemcontent = App\Models\User\UserItemContent::where('item_id', $order->item_id)
                              //     ->where('language_id', $currentLanguage->id)
                              //     ->first();
                              $itemcontent = App\Models\User\UserItemContent::where('item_id', $order->item_id)
                                  ->where(function ($query) use ($currentLanguage, $defaultLanguage) {
                                      $query->where('language_id', $currentLanguage->id);
                                      if ($currentLanguage->id !== $defaultLanguage->id) {
                                          $query->orWhere('language_id', $defaultLanguage->id);
                                      }
                                  })
                                  ->orderByRaw('FIELD(language_id, ?, ?)', [$currentLanguage->id, $defaultLanguage->id])
                                  ->first();
                              $ser = 0;
                            @endphp
                            @if ($order->item->type == 'digital')
                              @for ($i = 0; $i < $order->qty; $i++)
                                <tr>
                                  <td><img
                                      src="{{ asset('assets/front/img/user/items/thumbnail/' . $order->item->thumbnail) }}"
                                      alt="product" width="100"></td>
                                  <td>
                                    <a class="d-block"
                                      href="{{ route('front.user.item_details', ['slug' => $itemcontent->slug, getParam()]) }}">
                                      {{ strlen($order->title) > 24 ? mb_substr($order->title, 0, 24, 'UTF-8') . '...' : $order->title }}
                                    </a>
                                    @if ($order->item->type == 'digital' && $data->payment_status == 'Completed')
                                      @if (!empty($order->item->download_file))
                                        <form action="{{ route('user-digital-download') }}" method="POST">
                                          @csrf
                                          <input type="hidden" name="item_id" value="{{ $order->item->id }}">
                                          <button type="submit"
                                            class="digital-donwload-btn btn btn-primary btn-sm border-0">{{ $keywords['download'] ?? __('Download') }}</button>
                                        </form>
                                      @elseif (!empty($order->item->download_link))
                                        <a style="font-size: 12px;" href="{{ $order->item->download_link }}"
                                          target="_blank"
                                          class="digital-donwload-btn btn btn-primary btn-sm border-0 base-bg text-uppercase">{{ $keywords['download'] ?? __('Download') }}</a>
                                      @endif
                                    @endif
                                  </td>
                                  <td>
                                    <b>{{ $keywords['Quantity'] ?? __('Quantity') }}
                                      :</b> <span>1</span><br>
                                  </td>
                                  <td>
                                    {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}{{ $order->price }}{{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                  </td>
                                </tr>
                              @endfor
                            @else
                              <tr>
                                <td>
                                  <img
                                    src="{{ asset('assets/front/img/user/items/thumbnail/' . $order->item->thumbnail) }}"
                                    alt="product" width="100">
                                </td>
                                <td>
                                  <a class="d-block" title="{{ $order->title }}"
                                    href="{{ route('front.user.item_details', ['slug' => $itemcontent->slug, getParam()]) }}">{{ strlen($order->title) > 35 ? mb_substr($order->title, 0, 35, 'UTF-8') . '...' : $order->title }}</a>

                                  <strong>{{ $keywords['Item_price'] ?? __('Item Price') }}:
                                  </strong>{{ $be->base_currency_symbol_position == 'left' ? $be->base_currency_symbol : '' }}{{ $order->price / $order->qty }}
                                  <br>{{ $be->base_currency_symbol_position == 'right' ? $be->base_currency_symbol : '' }}
                                  <br>
                                  @if (!empty($order->variations))
                                    @php
                                      $v_total = 0;
                                      $variatons = json_decode($order->variations);
                                    @endphp
                                    @if (!empty($variatons))
                                      <p>
                                        <strong>{{ $keywords['Variations'] ?? __('Variations') }}:</strong>
                                      </p>
                                      @foreach ($variatons as $k => $itm)
                                        <strong>{{ $k }} </strong>:
                                        {{ $itm->name }} + &nbsp;
                                        {{ $be->base_currency_symbol_position == 'left' ? $be->base_currency_symbol : '' }}
                                        {{ $itm->price }} <br>
                                        {{ $be->base_currency_symbol_position == 'right' ? $be->base_currency_symbol : '' }}
                                        @php
                                          $v_total += $itm->price;
                                        @endphp
                                      @endforeach
                                    @endif
                                  @endif
                                  <form action="{{ route('user-digital-download') }}" method="POST">
                                    @csrf
                                    <input type="hidden" name="product_id" value="{{ $order->item->id }}">
                                    @if ($order->item->type == 'digital')
                                      <button type="submit"
                                        class="digital-donwload-btn btn btn-primary btn-sm border-0">{{ $keywords['download'] ?? __('Download') }}</button>
                                    @endif
                                  </form>
                                </td>
                                <td>
                                  <b>{{ $keywords['Quantity'] ?? __('Quantity') }} :</b>
                                  <span>{{ $order->qty }}</span><br>

                                </td>
                                <td>
                                  {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}{{ $order->price + $v_total * $order->qty }}{{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                </td>
                              </tr>
                            @endif
                          @endforeach
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div class="edit-account-info">
                    <a href="{{ URL::previous() }}"
                      class="btn btn-primary btn-lg">{{ $keywords['Back'] ?? __('Back') }}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
@endsection
