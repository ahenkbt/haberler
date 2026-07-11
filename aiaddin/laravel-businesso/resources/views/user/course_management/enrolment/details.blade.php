@extends('user.layout')

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __("Enrolment_Details")  }}</h4>
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
                <a href="#">{{  __("Course_Enrolments") }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{   __("Enrolment_Details")  }}</a>
            </li>
        </ul>
    </div>

    <div class="row">
        @php
            $position = $enrolmentInfo->currency_text_position;
            $currency = $enrolmentInfo->currency_text;
        @endphp

        <div class="col-md-6">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">
                        {{ __("Order_Id") }} {{'#' . $enrolmentInfo->order_id }}
                    </div>
                </div>

                <div class="card-body">
                    <div class="payment-information">
                        <div class="row mb-2">
                            <div class="col-lg-4">
                                <strong>{{ __("Course") }} : </strong>
                            </div>
                            <div class="col-lg-8">
                                {{ $courseTitle }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-4">
                                <strong>{{ __("Course_Price") }} : </strong>
                            </div>
                            <div class="col-lg-8">
                                @if (!is_null($enrolmentInfo->course_price))
                                    {{ $position == 'left' ? $currency . ' ' : '' }}{{ $enrolmentInfo->course_price }}{{ $position == 'right' ? ' ' . $currency : '' }}
                                @else
                                    -
                                @endif
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-4">
                                <strong class="text-success">{{   __("Discount")  }} <span>(<i
                                            class="far fa-minus"></i>)</span> :</strong>
                            </div>
                            <div class="col-lg-8">
                                @if (!is_null($enrolmentInfo->discount))
                                    {{ $position == 'left' ? $currency . ' ' : '' }}{{ $enrolmentInfo->discount }}{{ $position == 'right' ? ' ' . $currency : '' }}
                                @else
                                    -
                                @endif
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-4">
                                <strong>{{  __("Total") }} : </strong>
                            </div>
                            <div class="col-lg-8">
                                @if (!is_null($enrolmentInfo->grand_total))
                                    {{ $position == 'left' ? $currency . ' ' : '' }}{{ $enrolmentInfo->grand_total }}{{ $position == 'right' ? ' ' . $currency : '' }}
                                @else
                                    -
                                @endif
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-4">
                                <strong>{{   __("Paid_Via") }} : </strong>
                            </div>
                            <div class="col-lg-8">
                                @if (!is_null($enrolmentInfo->payment_method))
                                    {{ $enrolmentInfo->payment_method }}
                                @else
                                    -
                                @endif
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-4">
                                <strong>{{   __("Payment_Status") }} : </strong>
                            </div>
                            <div class="col-lg-8">
                                @if ($enrolmentInfo->payment_status == 'completed')
                                    <span class="badge badge-success">{{ __("Completed")  }}</span>
                                @elseif ($enrolmentInfo->payment_status == 'pending')
                                    <span class="badge badge-warning">{{ __("Pending")  }}</span>
                                @elseif ($enrolmentInfo->payment_status == 'rejected')
                                    <span class="badge badge-danger">{{ __("Rejected")  }}</span>
                                @else
                                    -
                                @endif
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-lg-4">
                                <strong>{{ __("Enrol_Date") }} : </strong>
                            </div>
                            <div class="col-lg-8">
                                {{ date_format($enrolmentInfo->created_at, 'M d, Y') }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-md-6">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">
                        {{   __("Billing_Details") }}
                    </div>
                </div>

                <div class="card-body">
                    <div class="payment-information">
                        <div class="row mb-2">
                            <div class="col-lg-4">
                                <strong>{{  __("Name")  }} : </strong>
                            </div>
                            <div class="col-lg-8">
                                {{ $enrolmentInfo->billing_first_name . ' ' . $enrolmentInfo->billing_last_name }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-4">
                                <strong>{{   __("Email")  }} : </strong>
                            </div>
                            <div class="col-lg-8">
                                {{ $enrolmentInfo->billing_email }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-4">
                                <strong>{{   __("Phone")  }} : </strong>
                            </div>
                            <div class="col-lg-8">
                                {{ $enrolmentInfo->billing_contact_number }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-4">
                                <strong>{{  __("Address")  }} : </strong>
                            </div>
                            <div class="col-lg-8">
                                {{ $enrolmentInfo->billing_address }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-4">
                                <strong>{{ __("City")  }} : </strong>
                            </div>
                            <div class="col-lg-8">
                                {{ $enrolmentInfo->billing_city }}
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-lg-4">
                                <strong>{{  __("State")  }} : </strong>
                            </div>
                            <div class="col-lg-8">
                                @if (!is_null($enrolmentInfo->billing_state))
                                    {{ $enrolmentInfo->billing_state }}
                                @else
                                    -
                                @endif
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-lg-4">
                                <strong>{{   __("Country")  }} : </strong>
                            </div>
                            <div class="col-lg-8">
                                {{ $enrolmentInfo->billing_country }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
