@extends('user.layout')
@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Order_Details') }}</h4>
        <ul class="breadcrumbs">
            <li class="nav-home">
                <a href="{{ route('user-dashboard') . '?language=' . request('language') }}">
                    <i class="flaticon-home"></i>
                </a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="{{ url()->previous() }}">{{ __('Order') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Order_Details') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-4">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">{{ __('Order') }} [ {{ $order->order_number }} ]</div>
                </div>
                <div class="card-body pt-5 pb-5">
                    <div class="payment-information">
                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong>{{ __('Payment_Status') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                @if ($order->payment_status == 'Pending')
                                    <span class="badge badge-warning">{{ __(convertUtf8($order->payment_status)) }} </span>
                                @elseif ($order->payment_status == 'processing')
                                    <span class="badge badge-primary">{{ __(convertUtf8($order->payment_status)) }} </span>
                                @elseif ($order->payment_status == 'Completed')
                                    <span class="badge badge-success">{{ __(convertUtf8($order->payment_status)) }} </span>
                                @elseif ($order->payment_status == 'rejected')
                                    <span class="badge badge-danger">{{ __(convertUtf8($order->payment_status)) }} </span>
                                @endif
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong>{{ __('Order_Status') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                @if ($order->order_status == 'Pending')
                                    <span class="badge badge-warning">{{ __(convertUtf8($order->order_status)) }} </span>
                                @elseif ($order->order_status == 'processing')
                                    <span class="badge badge-primary">{{ __(convertUtf8($order->order_status)) }} </span>
                                @elseif ($order->order_status == 'completed')
                                    <span class="badge badge-success">{{ __(convertUtf8($order->order_status)) }} </span>
                                @elseif ($order->order_status == 'rejected')
                                    <span class="badge badge-danger">{{ __(convertUtf8($order->order_status)) }} </span>
                                @endif
                            </div>
                        </div>
                        @if ($order->shipping_method)
                            <div class="row mb-2">
                                <div class="col-lg-6">
                                    <strong>{{ __('Shipping_Method') }} :</strong>
                                </div>
                                <div class="col-lg-6">
                                    {{ $order->shipping_method }}
                                </div>
                            </div>
                        @endif
                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong>{{ __('Cart_Total') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                {{ $order->cart_total }}
                                {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong class="text-success">{{ __('Discount') }}
                                    <span style="font-size: 10px;">(<i class="fas fa-minus"></i>)</span> :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                {{ $order->discount }}
                                {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong>{{ __('Subtotal') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                {{ round($order->cart_total - $order->discount, 2) }}
                                {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong class="text-danger">{{ __('Shipping_Charge') }}
                                    <span style="font-size: 10px;">(<i class="fas fa-plus"></i>)</span> :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                {{ $order->shipping_charge }}
                                {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong class="text-danger">{{ __('Tax') }} ({{ @$userBs->tax }}%)
                                    <span style="font-size: 10px;">(<i class="fas fa-plus"></i>)</span> :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                {{ $order->tax }}
                                {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong>{{ __('Total') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                {{ $order->total }}
                                {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong>{{ __('Payment_Method') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ convertUtf8($order->method) }}
                            </div>
                        </div>


                        <div class="row mb-0">
                            <div class="col-lg-6">
                                <strong>{{ __('Order_Date') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ convertUtf8($order->created_at->format('d-m-Y')) }}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

        </div>

        <div class="col-md-4">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">{{ __('Shipping_Details') }} </div>

                </div>
                <div class="card-body pt-5 pb-5">
                    <div class="payment-information">
                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong>{{ __('Email') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ convertUtf8($order->shpping_email) }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong>{{ __('Phone') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ $order->shpping_number }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong>{{ __('City') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ convertUtf8($order->shpping_city) }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong>{{ __('Address') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ convertUtf8($order->shpping_address) }}
                            </div>
                        </div>

                        <div class="row mb-0">
                            <div class="col-lg-6">
                                <strong>{{ __('Country') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ convertUtf8($order->billing_country) }}
                            </div>
                        </div>


                    </div>
                </div>
            </div>

        </div>

        <div class="col-md-4">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">{{ __('Billing_Details') }}</div>

                </div>
                <div class="card-body pt-5 pb-5">
                    <div class="payment-information">
                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong>{{ __('Email') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ convertUtf8($order->billing_email) }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong>{{ __('Phone') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ $order->billing_number }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong>{{ __('City') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ convertUtf8($order->billing_city) }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-6">
                                <strong>{{ __('Address') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ convertUtf8($order->billing_address) }}
                            </div>
                        </div>

                        <div class="row mb-0">
                            <div class="col-lg-6">
                                <strong>{{ __('Country') }} :</strong>
                            </div>
                            <div class="col-lg-6">
                                {{ convertUtf8($order->billing_country) }}
                            </div>
                        </div>


                    </div>
                </div>
            </div>

        </div>

        <div class="col-lg-12">
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">{{ __('Order_Items') }}</h4>
                </div>
                <div class="card-body">
                    <div class="table-responsive product-list">
                        <table class="table table-bordered">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>{{ __('Image') }}</th>
                                    <th>{{ __('Name') }}</th>
                                    <th>{{ __('Details') }}</th>
                                    <th>{{ __('Price') }}</th>
                                    <th>{{ __('Total') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($order->orderitems as $key => $item)
                                    <tr>
                                        <td>{{ $key + 1 }}</td>
                                        <td><img src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->image) }}"
                                                alt="product" width="100"></td>
                                        <td> <a title="{{ $item->title }}"
                                                href="{{ route('front.user.item_details', ['slug' => make_slug($item->title), Auth::guard('web')->user()->username]) }}"
                                                target='_blank'>{{ strlen($item->title) > 50 ? mb_substr($item->title, 0, 50, 'UTF-8') . '...' : $item->title }}</a>
                                            <br>
                                            <strong>{{ __('Item_Price') }} :
                                            </strong>{{ $be->base_currency_symbol_position == 'left' ? $be->base_currency_symbol : '' }}{{ $item->price / $item->qty }}
                                            <br>{{ $be->base_currency_symbol_position == 'right' ? $be->base_currency_symbol : '' }}
                                            <br>
                                            @if (!empty($item->variations))
                                                @php
                                                    $v_total = 0;
                                                    $variatons = json_decode($item->variations);
                                                @endphp
                                                @if (!empty($variatons))
                                                    <strong>{{ __('Variations') }}:</strong>
                                                    <br>

                                                    @foreach ($variatons as $k => $itm)
                                                        <strong>{{ $k }} </strong>
                                                        {{ $itm->name }} + &nbsp;
                                                        {{ $be->base_currency_symbol_position == 'left' ? $be->base_currency_symbol : '' }}{{ $itm->price }}{{ $be->base_currency_symbol_position == 'right' ? $be->base_currency_symbol : '' }}<br>
                                                        @php
                                                            $v_total += $itm->price;
                                                        @endphp
                                                    @endforeach
                                                @endif
                                            @endif
                                        </td>
                                        <td>
                                            <b>{{ __('Quantity') }}:</b> <span>{{ $item->qty }}</span><br>
                                        </td>
                                        <td>
                                            {{ __('Item') }}:
                                            {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}{{ $item->price }}{{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                            <br>
                                            @if ($item->variations != 'null')
                                                {{ __('Variations') }}:
                                                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}{{ $v_total * $item->qty }}{{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                            @endif
                                        </td>
                                        <td>{{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}{{ $item->price + $v_total * $item->qty }}{{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
