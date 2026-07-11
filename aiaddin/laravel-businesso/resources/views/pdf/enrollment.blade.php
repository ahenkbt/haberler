<!DOCTYPE html>
<html>

<head>
    {{-- required meta tags --}}
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">

    {{-- title --}}
    <title>{{ 'Invoice | ' . $userBs->website_title }}</title>

    {{-- fav icon --}}
    <link rel="shortcut icon" type="image/png" href="{{ asset('assets/img/' . $userBs->favicon) }}">

    {{-- styles --}}
    <link rel="stylesheet" href="{{ asset('assets/admin/css/bootstrap.min.css') }}">
</head>

<body>
    <div class="my-5">
        <div class="container">
            <div class="row">
                <div class="col-lg-12">
                    <div class="logo text-center">
                        <img src="{{ asset('assets/front/img/user/' . $userBs->logo) }}" alt="Company Logo">
                    </div>

                    <div class="bg-primary mt-4">
                        <h2 class="text-center text-light pt-2">
                            {{  $keywords["ENROLMENT_INVOICE"] ??  __('ENROLMENT INVOICE') }}
                        </h2>
                    </div>

                    @php
                        $position = $enrolmentInfo->currency_text_position;
                        $currency = $enrolmentInfo->currency_text;
                    @endphp

                    <div class="row">
                        {{-- enrolment details start --}}
                        <div style="width: 50%;float: left;">
                            <div class="mt-4 mb-1">
                                <h4><strong>{{  $keywords["Enrolment_Details"] ??   __('Enrolment Details') }}</strong></h4>
                            </div>

                            <p>
                                <strong>{{  $keywords["Order_Id"] ?? __('Order ID')}} : </strong>{{ '#' . $enrolmentInfo->order_id }}
                            </p>

                            <p>
                                <strong>{{ $keywords["Enrolment_Date"] ?? __('Enrolment Date')}} : </strong>{{ date_format($enrolmentInfo->created_at, 'M d, Y') }}
                            </p>

                            <p style="word-break:break-all;">
                                <strong>{{ $keywords["Course"] ?? __('Course')}} : </strong>{{ $courseInfo->title }}
                            </p>

                            <p>
                                <strong>{{ $keywords["Course_Price"] ?? __('Course Price')}} : </strong>{{ $position == 'left' ? $currency . ' ' : '' }}{{ is_null($enrolmentInfo->course_price) ? '0.00' : $enrolmentInfo->course_price }}{{ $position == 'right' ? ' ' . $currency : '' }}
                            </p>

                            <p>
                                <strong>{{ $keywords["Discount"] ?? __('Discount')}} : </strong>{{ $position == 'left' ? $currency . ' ' : '' }}{{ is_null($enrolmentInfo->discount) ? '0.00' : $enrolmentInfo->discount }}{{ $position == 'right' ? ' ' . $currency : '' }}
                            </p>

                            <p>
                                <strong>{{ $keywords["Grand_Total"] ?? __('Grand Total')}} : </strong>{{ $position == 'left' ? $currency . ' ' : '' }}{{ is_null($enrolmentInfo->grand_total) ? '0.00' : $enrolmentInfo->grand_total }}{{ $position == 'right' ? ' ' . $currency : '' }}
                            </p>

                            <p>
                                <strong>{{ $keywords["Payment_Method"] ?? __('Payment Method')}} : </strong>{{ is_null($enrolmentInfo->payment_method) ? '-' : $enrolmentInfo->payment_method }}
                            </p>

                            <p>
                                <strong>{{ $keywords["Payment_Status"] ?? __('Payment Status')}} : </strong>
                                @if ($enrolmentInfo->payment_status == 'completed')
                                    {{ $keywords["Completed"] ?? __('Completed') }}
                                @elseif ($enrolmentInfo->payment_status == 'pending')
                                    {{ $keywords["Pending"] ?? __('Pending') }}
                                @elseif ($enrolmentInfo->payment_status == 'rejected')
                                    {{ $keywords["Rejected"] ?? __('Rejected') }}
                                @else
                                    -
                                @endif
                            </p>
                        </div>
                        {{-- enrolment details start --}}

                        {{-- billing details start --}}
                        <div style="width: 50%;float: left;">
                            <div class="mt-4 mb-1">
                                <h4><strong>{{ $keywords["Billing_Details"] ?? __('Billing Details') }}</strong></h4>
                            </div>

                            <p>
                                <strong>{{ $keywords["Name"] ?? __('Name')}} : </strong>{{ $enrolmentInfo->billing_first_name . ' ' . $enrolmentInfo->billing_last_name }}
                            </p>

                            <p>
                                <strong>{{ $keywords["Email"] ?? __('Email')}} : </strong>{{ $enrolmentInfo->billing_email }}
                            </p>

                            <p>
                                <strong>{{ $keywords["Contact"] ?? __('Contact Number')}} : </strong>{{ $enrolmentInfo->billing_contact_number }}
                            </p>

                            <p>
                                <strong>{{ $keywords["Address"] ?? __('Address')}} : </strong>{{ $enrolmentInfo->billing_address }}
                            </p>

                            <p>
                                <strong>{{ $keywords["City"] ?? __('City')}} : </strong>{{ $enrolmentInfo->billing_city }}
                            </p>

                            <p>
                                <strong>{{ $keywords["State"] ?? __('State')}} : </strong>{{ is_null($enrolmentInfo->billing_state) ? '-' : $enrolmentInfo->billing_state }}
                            </p>

                            <p>
                                <strong>{{ $keywords["Country"] ?? __('Country')}} : </strong>{{ $enrolmentInfo->billing_country }}
                            </p>
                        </div>
                        {{-- billing details end --}}
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>

</html>
