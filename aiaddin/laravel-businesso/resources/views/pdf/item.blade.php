<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Invoice</title>
    <link rel="stylesheet" href="{{ asset('assets/front/css/design-pdf.css') }}">
</head>

<body>
    <div class="main">
        <table class="heading">
            <tr>
                <td>
                    @if ($userBs->logo)
                        <img src="{{ asset('/assets/front/img/user/' . $userBs->logo) }}" height="40"
                            class="d-inline-block ">
                    @else
                        <img src="{{ asset('assets/admin/img/noimage.jpg') }}" height="40" class="d-inline-block">
                    @endif
                </td>
                <td class="text-right strong invoice-heading">{{ __('INVOICE') }}</td>
            </tr>
        </table>
        <div class="header">
            <div class="ml-20">
                <table class="text-left">
                    <tr>
                        <td class="strong small gry-color">{{ __('Bill to') }}:</td>
                    </tr>
                    <tr>
                        <td class="strong">
                            {{ ucfirst($order->billing_fname) }} {{ ucfirst($order->billing_lname) }}
                        </td>
                    </tr>
                    <tr>
                        <td>
                            {{ $order->billing_address }}
                        </td>
                    </tr>
                    <tr>
                        <td>
                            {{ $order->billing_city }} , {{ $order->billing_state }}
                        </td>
                    </tr>
                    <tr>
                        <td>
                            {{ $order->billing_country }}
                        </td>
                    </tr>
                    <tr>
                        <td>
                            {{ $order->billing_email }}
                        </td>
                    </tr>
                </table>
            </div>
            <div class="order-details">
                <table class="text-right">
                    <tr>
                        <td class="strong">{{ __('Order Details') }}:</td>
                    </tr>
                    <tr>
                        <td class="gry-color small"><strong>{{ __('Order ID') }}:</strong> #
                            {{ $order->order_number }}</td>
                    </tr>
                    <tr>
                        <td class="gry-color small"><strong>{{ __('Payment Method') }}:</strong>
                            {{ $order->method }}</td>
                    </tr>
                    <tr>
                        <td class="gry-color small">
                            <strong>{{ __('Payment Status') }}:</strong>{{ $order->payment_status }}
                        </td>
                    </tr>
                    <tr>
                        <td class="gry-color small"><strong>{{ __('Order Date') }}:</strong>
                            {{ \Illuminate\Support\Carbon::now()->format('d/m/Y') }}</td>
                    </tr>

                </table>
            </div>
        </div>
        <div class="package-info">
            <table class="padding text-left small border-bottom">
                <thead>
                    <tr class="gry-color info-titles">
                        <th width="20%">{{ __('Title') }}</th>
                        <th width="20%">{{ __('Quantity') }}</th>
                        <th width="20%">{{ __('Price') }}</th>
                    </tr>
                </thead>
                <tbody class="strong">
                    @foreach ($order->orderitems as $item)
                        <tr class="text-center">

                            <td>{{ $item->title }}</td>
                            <td>{{ $item->qty }}</td>
                            <td>
                                {{ $be->base_currency_text_position == 'left' ? $be->base_currency_text : '' }}
                                {{ $item->price }}
                                {{ $be->base_currency_text_position == 'right' ? $be->base_currency_text : '' }}
                                <br>
                                @if ($item->variations != 'null')
                                    @php
                                        $variations = json_decode($item->variations);
                                    @endphp
                                    @foreach ($variations as $k => $vitm)
                                        <table class="variation-table">
                                            <tr>
                                                <td>{{ $vitm->name }} <small>({{ $k }})</small> : </td>
                                                <td>{{ $be->base_currency_text_position == 'left' ? $be->base_currency_text : '' }}
                                                    {{ $vitm->price }}
                                                    {{ $be->base_currency_text_position == 'right' ? $be->base_currency_text : '' }}
                                                </td>
                                            </tr>
                                        </table>
                                    @endforeach
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
            <div class="text-right small">
                @if ($order->tax)
                    <strong>{{ __('Tax') }}:</strong>
                    {{ $be->base_currency_text_position == 'left' ? $be->base_currency_text : '' }}
                    {{ $order->tax }} <br>
                    {{ $be->base_currency_text_position == 'right' ? $be->base_currency_text : '' }}
                    <br>
                @endif
                @if ($order->shipping_charge)
                    <strong>{{ __('Shipping charge') }}:</strong>
                    {{ $be->base_currency_text_position == 'left' ? $be->base_currency_text : '' }}
                    {{ $order->shipping_charge }} <br>
                    {{ $be->base_currency_text_position == 'right' ? $be->base_currency_text : '' }}
                    <br>
                @endif
                @if ($order->discount)
                    <strong>{{ __('Discount') }}:</strong>
                    {{ $be->base_currency_text_position == 'left' ? $be->base_currency_text : '' }}
                    {{ $order->discount }} <br>
                    {{ $be->base_currency_text_position == 'right' ? $be->base_currency_text : '' }}
                    <br>
                @endif
                @if ($order->cart_total)
                    <strong>{{ __('Cart total') }}:</strong>
                    {{ $be->base_currency_text_position == 'left' ? $be->base_currency_text : '' }}
                    {{ $order->cart_total }} <br>
                    {{ $be->base_currency_text_position == 'right' ? $be->base_currency_text : '' }}
                    <br>
                @endif
                <strong>{{ __('Total') }}:</strong>
                {{ $be->base_currency_text_position == 'left' ? $be->base_currency_text : '' }}
                {{ $order->total }}
                {{ $be->base_currency_text_position == 'right' ? $be->base_currency_text : '' }}
                <br>
            </div>
        </div>

        <table class="ml-20">
            <tr>
                <td class=" regards">{{ __('Thanks & Regards') }},</td>
            </tr>
            <tr>
                <td class=" strong regards">{{ $userBs->website_title }}</td>
            </tr>
        </table>
    </div>
</body>

</html>
