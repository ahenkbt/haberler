@extends('front.layout')

@section('meta-description', !empty($seo) ? $seo->login_meta_description : '')
@section('meta-keywords', !empty($seo) ? $seo->login_meta_keywords : '')

@section('pagename')
    - {{ __('Login') }}
@endsection
@section('breadcrumb-title')
    {{ __('Login') }}
@endsection
@section('breadcrumb-link')
    {{ __('Login') }}
@endsection

@section('content')
    <!--====== Start user-form-section ======-->
    {{-- <section class="user-form-section pt-120 pb-120">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-8">
                    <div class="user-form">
                        <div class="title">
                            <h3>{{ __('login') }}</h3>
                        </div>
                        <form action="{{ route('user.login') }}" method="post" enctype="multipart/form-data">
                            @csrf
                            <div class="form_group">
                                <span>{{ __('Email Address') }}*</span>
                                <input type="email" name="email" class="form_control"
                                    value="{{ Request::old('email') }}">
                                @if (Session::has('err'))
                                    <p class="text-danger mb-2 mt-2">{{ Session::get('err') }}</p>
                                @endif
                                @error('email')
                                    <p class="text-danger mb-2 mt-2">{{ $message }}</p>
                                @enderror
                            </div>
                            <div class="form_group">
                                <span>{{ __('Password') }} *</span>
                                <input type="password" name="password" class="form_control"
                                    value="{{ Request::old('password') }}">
                                @error('password')
                                    <p class="text-danger mb-2 mt-2">{{ $message }}</p>
                                @enderror
                            </div>
                            <div class="form_group">
                                @if ($bs->is_recaptcha == 1)
                                    <div class="d-block mb-4">
                                        {!! NoCaptcha::renderJs() !!}
                                        {!! NoCaptcha::display() !!}
                                        @if ($errors->has('g-recaptcha-response'))
                                            @php
                                                $errmsg = $errors->first('g-recaptcha-response');
                                            @endphp
                                            <p class="text-danger mb-0 mt-2">{{ __("$errmsg") }}</p>
                                        @endif
                                    </div>
                                @endif
                            </div>
                            <div class="form_group">
                                <a href="{{ route('user.forgot.password.form') }}">{{ __('Lost your password') }}?</a>
                            </div>
                            <div class="form_group">
                                <button class="main-btn">{{ __('LOG IN') }}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </section> --}}
    <div class="authentication-area bg-light">
        <div class="container">
            <div class="row min-vh-100 align-items-center">
                <div class="col-12">
                    <div class="wrapper">
                        <div class="row align-items-center">

                            <div class="col-lg-6 bg-primary-light">
                                <div class="content">
                                    <div class="logo mb-3">
                                        <a href="{{ route('front.index') }}"><img
                                                src="{{ asset('assets/front/img/' . $bs->logo) }}" alt="Logo"></a>
                                    </div>
                                    <div class="svg-image">
                                        <svg class="mw-100" data-src="{{ asset('assets/frontend/images/login.svg') }}"
                                            data-unique-ids="disabled" data-cache="disabled"></svg>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-6">
                                <div class="main-form">
                                    <a href="{{ route('front.index') }}" class="icon-link" title="Go back to home"><i
                                            class="fal fa-home"></i></a>
                                    <div class="title">
                                        <h3 class="mb-4">{{ __('login') }} </h3>
                                    </div>
                                    <form action="{{ route('user.login') }}" method="post" enctype="multipart/form-data">
                                        @csrf
                                        <div class="form-group mb-3">
                                            <label>{{ __('Email Address') }}*</label>
                                            <input type="email" name="email" class="form-control"
                                                value="{{ Request::old('email') }}">
                                            @if (Session::has('err'))
                                                <p class="text-danger mb-2 mt-2">{{ Session::get('err') }}</p>
                                            @endif
                                            @error('email')
                                                <p class="text-danger mb-2 mt-2">{{ $message }}</p>
                                            @enderror
                                        </div>
                                        <div class="form-group mb-3">
                                            <label>{{ __('Password') }} *</label>
                                            <input type="password" name="password" class="form-control"
                                                value="{{ Request::old('password') }}">
                                            @error('password')
                                                <p class="text-danger mb-2 mt-2">{{ $message }}</p>
                                            @enderror
                                        </div>
                                        <div class="form-group mb-3">
                                        
                                            @if ($bs->is_recaptcha == 1)
                                                <div class="d-block mb-4">
                                                    {!! NoCaptcha::renderJs() !!}
                                                    {!! NoCaptcha::display() !!}
                                                    @if ($errors->has('g-recaptcha-response'))
                                                        @php
                                                            $errmsg = $errors->first('g-recaptcha-response');
                                                        @endphp
                                                        <p class="text-danger mb-0 mt-2">{{ __("$errmsg") }}</p>
                                                    @endif
                                                </div>
                                            @endif
                                        </div>
                                        <div class="link">
                                            <a
                                                href="{{ route('user.forgot.password.form') }}">{{ __('Lost your password') }}?</a>
                                        </div>
                                        <div class="text-center">
                                            <button class="btn btn-lg btn-primary w-100">{{ __('LOG IN') }}</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!--====== End user-form-section ======-->
@endsection
