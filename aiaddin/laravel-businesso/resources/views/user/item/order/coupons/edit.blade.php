@extends('user.layout')

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Edit_Coupon') }}</h4>
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
                <a href="#">{{ __('Shop_Management') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Coupons') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Edit') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">{{ __('Edit_Coupon') }}</div>
                    <a class="btn btn-info btn-sm float-right d-inline-block"
                        href="{{ route('user.coupon.index') . '?language=' . request('language') }}">
                        <span class="btn-label">
                            <i class="fas fa-backward"></i>
                        </span>
                        {{ __('Back') }}
                    </a>
                </div>
                <div class="card-body pt-5 pb-5">
                    <div class="row">
                        <div class="col-lg-6 offset-lg-3">

                            <form id="ajaxForm" class="modal-form" action="{{ route('user.coupon.update') }}"
                                method="POST">
                                @csrf
                                <input type="hidden" name="coupon_id" value="{{ $coupon->id }}">

                                <div class="row no-gutters">
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Name') }} **</label>
                                            <input type="text" class="form-control" name="name"
                                                value="{{ $coupon->name }}" placeholder="{{ __('Enter_name') }}">
                                            <p id="errname" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Code') }} **</label>
                                            <input type="text" class="form-control" name="code"
                                                value="{{ $coupon->code }}" placeholder="{{ __('Enter_code') }}">
                                            <p id="errcode" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>

                                <div class="row no-gutters">
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Type') }} **</label>
                                            <select name="type" id="" class="form-control">
                                                <option value="percentage"
                                                    {{ $coupon->type == 'percentage' ? 'selected' : '' }}>
                                                    {{ __('Percentage') }}
                                                </option>
                                                <option value="fixed" {{ $coupon->type == 'fixed' ? 'selected' : '' }}>
                                                    {{ __('Fixed') }}</option>
                                            </select>
                                            <p id="errtype" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Value') }} **</label>
                                            <input type="text" class="form-control" name="value"
                                                value="{{ $coupon->value }}" placeholder="{{ __('Enter_value') }}"
                                                autocomplete="off">
                                            <p id="errvalue" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>

                                <div class="row no-gutters">
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Start_Date') }}
                                                **</label>
                                            <input type="text" class="form-control datepicker" name="start_date"
                                                value="{{ $coupon->start_date }}"
                                                placeholder="{{ __('Enter_start_date') }}" autocomplete="off">
                                            <p id="errstart_date" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('End_Date') }} **</label>
                                            <input type="text" class="form-control datepicker" name="end_date"
                                                value="{{ $coupon->end_date }}" placeholder="{{ __('Enter_end_date') }}"
                                                autocomplete="off">
                                            <p id="errend_date" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>

                                <div class="row no-gutters">
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Minimum_Spend') }}
                                                ({{ $userBs->base_currency_text }})
                                                **</label>
                                            <input type="text" class="form-control" name="minimum_spend"
                                                value="{{ $coupon->minimum_spend }}"
                                                placeholder="{{ __('Enter_minimum_spend') }}" autocomplete="off">
                                            <p class="mb-0 text-warning">
                                                {{ __('Keep_it_blank_if_you_do_not_want_to_keep_any_minimum_spend_limit') }}
                                            </p>
                                            <p id="errminimum_spend" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>

                            </form>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="form">
                        <div class="form-group from-show-notify row">
                            <div class="col-12 text-center">
                                <button type="submit" id="submitBtn"
                                    class="btn btn-success">{{ __('Update') }}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
@endsection
