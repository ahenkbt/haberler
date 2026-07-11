@extends('front.layout')

@section('styles')
    <link rel="stylesheet" href="{{ asset('assets/front/css/forgot-password.css') }}">
@endsection



@section('pagename')
    - {{ __('Reset Password') }}
@endsection
@section('breadcrumb-title')
    {{ __('Reset Password') }}
@endsection
@section('breadcrumb-link')
    {{ __('Reset Password') }}
@endsection

@section('content')
    <!--====== End Breadcrumbs section ======-->
    <section class="login-section pb-1000">
        <div class="container">
            <div class="row justify-content-center ptb-120">
                <div class="col-lg-8">
                    <div class="user-form">
                        <form class="login-form" action="{{ route('user.reset.password.submit') }}" method="post"
                            enctype="multipart/form-data">
                            @csrf
                            <input type="hidden" name="token" value="{{ $token }}">
                            <div class="form-group mb-3">
                                <label class="form-label">{{ __('Email Address') }}*</label>
                                <input type="email" name="email" class="form-control" placeholder="{{ __('email') }}"
                                    value="{{ $email }}">
                                @error('email')
                                    <p class="text-danger mb-2 mt-2">{{ $message }}</p>
                                @enderror
                            </div>
                            <div class="form-group mb-3">
                                <label class="form-label">{{ __('Password') }}*</label>
                                <input type="password" class="form-control" placeholder="{{ __('password') }}"
                                    name="password" value="{{ old('password') }}" required>
                                @error('password')
                                    <p class="text-danger mb-2 mt-2">{{ $message }}</p>
                                @enderror
                            </div>
                            <div class="form-group mb-3">
                                <label class="form-label">{{ __('Confirm password') }}*</label>
                                <input id="password-confirm" type="password" class="form-control"
                                    placeholder="{{ __('confirm Password') }}" name="password_confirmation" required
                                    autocomplete="new-password">
                                @error('password')
                                    <p class="text-danger mb-2 mt-2">{{ $message }}</p>
                                @enderror
                            </div>
                            <div class="form-group">
                                <button class="btn btn-lg btn-primary">{{ __('Reset Password') }}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </section>
@endsection
