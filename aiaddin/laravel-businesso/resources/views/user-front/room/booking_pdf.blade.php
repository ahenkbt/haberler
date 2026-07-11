<!DOCTYPE html>
<html>

<head lang="en">
    {{-- required meta tags --}}
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">

    {{-- title --}}
    <title>{{ 'Room Booking Invoice | ' . config('app.name') }}</title>

    {{-- fav icon --}}
    <link rel="shortcut icon" type="image/png" href="{{ asset('assets/img/' . $userBs->favicon) }}">

    {{-- styles --}}
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/bootstrap.min.css') }}">
</head>

<body>
    <div class="room-booking-invoice my-5">
        <div class="container">
            <div class="row">
                <div class="col-lg-12">
                    <div class="logo text-center" style="margin-bottom: 35px;">
                        <img src="{{ asset('assets/front/img/user/' . $userBs->logo) }}" alt="Company Logo">
                    </div>

                    <div class="mb-3">
                        <h2 class="text-center">
                            {{ __('ROOM BOOKING INVOICE') }}
                        </h2>
                    </div>

                    @php
                        $position = $bookingInfo->currency_text_position;
                        $currency = $bookingInfo->currency_text;
                    @endphp

                    <div class="row">
                        <div class="col">
                            <table class="table table-striped table-bordered">
                                <tbody>
                                    <tr>
                                        <th scope="col">{{ __('Booking Number:') }}</th>
                                        <td>{{ '#' . $bookingInfo->booking_number }}</td>
                                    </tr>

                                    <tr>
                                        <th scope="col">{{ __('Booking Date:') }}</th>
                                        <td>
                                            {{ date_format($bookingInfo->created_at, 'M d, Y') }}
                                        </td>
                                    </tr>

                                    <tr>
                                        <th scope="col">{{ __('Room Name:') }}</th>
                                        <td>{{ $bookingInfo->hotelRoom->roomContent->where('language_id', $userCurrentLang->id)->first()->title }}
                                        </td>
                                    </tr>

                                    <tr>
                                        <th scope="col">{{ __('Subtotal:') }}</th>
                                        <td class="text-capitalize">
                                            {{ $position == 'left' ? $currency . ' ' : '' }}{{ $bookingInfo->subtotal }}{{ $position == 'right' ? ' ' . $currency : '' }}
                                        </td>
                                    </tr>

                                    <tr>
                                        <th scope="col">{{ __('Discount:') }}</th>
                                        <td class="text-capitalize">
                                            {{ $position == 'left' ? $currency . ' ' : '' }}{{ $bookingInfo->discount }}{{ $position == 'right' ? ' ' . $currency : '' }}
                                        </td>
                                    </tr>

                                    <tr>
                                        <th scope="col">{{ __('Grand Total:') }}</th>
                                        <td class="text-capitalize">
                                            {{ $position == 'left' ? $currency . ' ' : '' }}{{ $bookingInfo->grand_total }}{{ $position == 'right' ? ' ' . $currency : '' }}
                                        </td>
                                    </tr>

                                    <tr>
                                        <th scope="col">{{ __('Customer Name:') }}</th>
                                        <td>{{ $bookingInfo->customer_name }}</td>
                                    </tr>

                                    <tr>
                                        <th scope="col">{{ __('Customer Phone:') }}</th>
                                        <td>{{ $bookingInfo->customer_phone }}</td>
                                    </tr>

                                    <tr>
                                        <th scope="col">{{ __('Paid via:') }}</th>
                                        <td>{{ $bookingInfo->payment_method }}</td>
                                    </tr>

                                    <tr>
                                        <th scope="col">{{ __('Payment Status:') }}</th>
                                        <td>
                                            @if ($bookingInfo->payment_status == 1)
                                                {{ __('Complete') }}
                                            @else
                                                {{ __('Incomplete') }}
                                            @endif
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>

</html>
