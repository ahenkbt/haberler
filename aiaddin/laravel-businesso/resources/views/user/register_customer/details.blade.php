@extends('user.layout')

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Customer_Details') }}</h4>
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
                <a href="#">{{ __('Customers') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Customer_Details') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-3">
            <div class="card">
                <div class="card-body text-center p-4">
                    <img src="{{ !empty($user->image) ? asset('assets/user/img/users/' . $user->image) : asset('assets/user/img/profile.jpg') }}"
                        alt="" width="100%">
                </div>
            </div>
        </div>
        <div class="col-md-9">
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">{{ __('Customer_Details') }}</h4>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-lg-6">
                            <strong>{{ __('Username') }}: </strong>
                        </div>
                        <div class="col-lg-6">
                            {{ $user->username ?? '-' }}
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-lg-6">
                            <strong>{{ __('First_Name') }}:</strong>
                        </div>
                        <div class="col-lg-6">
                            {{ $user->first_name ?? '-' }}
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-lg-6">
                            <strong>{{ __('Last_Name') }}:</strong>
                        </div>
                        <div class="col-lg-6">
                            {{ $user->last_name ?? '-' }}
                        </div>
                    </div>

                    <div class="row mb-3">
                        <div class="col-lg-6">
                            <strong>{{ __('Email') }} : </strong>
                        </div>
                        <div class="col-lg-6">
                            {{ $user->email ?? '-' }}
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-lg-6">
                            <strong>{{ __('Number') }} : </strong>
                        </div>
                        <div class="col-lg-6">
                            {{ $user->phone ?? '-' }}
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-lg-6">
                            <strong>{{ __('City') }}:</strong>
                        </div>
                        <div class="col-lg-6">
                            {{ $user->city ?? '-' }}
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-lg-6">
                            <strong>{{ __('State') }}:</strong>
                        </div>
                        <div class="col-lg-6">
                            {{ $user->state ?? '-' }}
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-lg-6">
                            <strong>{{ __('Country') }}:</strong>
                        </div>
                        <div class="col-lg-6">
                            {{ $user->country }}
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-lg-6">
                            <strong>{{ __('Address') }}:</strong>
                        </div>
                        <div class="col-lg-6">
                            {{ $user->address }}
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-lg-6">
                            <strong>{{ __('Email_Status') }}:</strong>
                        </div>
                        <div class="col-lg-6">
                            <form id="emailForm{{ $user->id }}" class="d-inline-block"
                                action="{{ route('register.customer.email') }}" method="post">
                                @csrf
                                <select
                                    class="form-control form-control-sm {{ $user->email_verified_at ? 'bg-success' : 'bg-danger' }}"
                                    name="email_verified"
                                    onchange="document.getElementById('emailForm{{ $user->id }}').submit();">
                                    <option value="1" {{ $user->email_verified_at != null ? 'selected' : '' }}>
                                        {{ __('Verified') }} </option>
                                    <option value="2" {{ $user->email_verified_at == null ? 'selected' : '' }}>
                                        {{ __('Nonverified') }} </option>
                                </select>
                                <input type="hidden" name="user_id" value="{{ $user->id }}">
                            </form>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-lg-6">
                            <strong>{{ __('Account_Status') }}:</strong>
                        </div>
                        <div class="col-lg-6">

                            <form id="userFrom{{ $user->id }}" class="d-inline-block"
                                action="{{ route('user.customer.ban') }}" method="post">
                                @csrf
                                <select
                                    class="form-control form-control-sm {{ $user->status == 1 ? 'bg-success' : 'bg-danger' }}"
                                    name="status"
                                    onchange="document.getElementById('userFrom{{ $user->id }}').submit();">
                                    <option value="1" {{ $user->status == 1 ? 'selected' : '' }}>
                                        {{ __('Account_Status') }}</option>
                                    <option value="0" {{ $user->status == 0 ? 'selected' : '' }}>
                                        {{ __('Account_Status') }}</option>
                                </select>
                                <input type="hidden" name="user_id" value="{{ $user->id }}">
                            </form>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    </div>
@endsection
@section('scripts')
    <script>
        "use strict";
        const currUrl = "{{ url()->current() }}"
        const mainURL = "{{ url('/') }}";
    </script>
    <script type="text/javascript" src="{{ asset('assets/user/dashboard/js/post.js') }}"></script>
@endsection
