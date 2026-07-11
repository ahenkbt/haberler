@extends('user.layout')

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Plugins') }}</h4>
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
                <a href="#">{{ __('Basic_Settings') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Plugins') }}</a>
            </li>
        </ul>
    </div>

    <div class="row">

        <div class="col-lg-4">
            <div class="card">
                <form action="{{ route('user.update_analytics') }}" method="post">
                    @csrf
                    <div class="card-header">
                        <div class="row">
                            <div class="col-lg-12">
                                <div class="card-title">{{ __('Google_Analytics') }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="card-body">
                        <div class="row">
                            <div class="col-lg-12">
                                <div class="form-group">
                                    <label>{{ __('Google_Analytics_Status') }}*</label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="analytics_status" value="1"
                                                class="selectgroup-input"
                                                {{ isset($data) && $data->analytics_status == 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Active') }}</span>
                                        </label>

                                        <label class="selectgroup-item">
                                            <input type="radio" name="analytics_status" value="0"
                                                class="selectgroup-input"
                                                {{ !isset($data) || $data->analytics_status != 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Deactive') }}</span>
                                        </label>
                                    </div>

                                    @if ($errors->has('analytics_status'))
                                        <p class="mt-1 mb-0 text-danger">{{ $errors->first('analytics_status') }}</p>
                                    @endif
                                </div>

                                <div class="form-group">
                                    <label>{{ __('Measurement_ID') }} *</label>
                                    <input type="text" class="form-control" name="measurement_id"
                                        value="{{ isset($data) && $data->measurement_id ? $data->measurement_id : null }}">
                                    @if ($errors->has('measurement_id'))
                                        <p class="mt-1 mb-0 text-danger">{{ $errors->first('measurement_id') }}</p>
                                    @endif
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card-footer">
                        <div class="row">
                            <div class="col-12 text-center">
                                <button type="submit" class="btn btn-success">
                                    {{ __('Update') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>


        <div class="col-lg-4">
            <form action="{{ route('user.basic_settings.update_recaptcha') }}" method="post">
                @csrf
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            {{ __('Google_Recaptcha') }}
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>{{ __('Google_Recaptcha_Status') }}</label>
                            <div class="selectgroup w-100">
                                <label class="selectgroup-item">
                                    <input type="radio" name="is_recaptcha" value="1" class="selectgroup-input"
                                        {{ $data->is_recaptcha == 1 ? 'checked' : '' }}>
                                    <span class="selectgroup-button">{{ __('Active') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="radio" name="is_recaptcha" value="0" class="selectgroup-input"
                                        {{ $data->is_recaptcha == 0 ? 'checked' : '' }}>
                                    <span class="selectgroup-button">{{ __('Deactive') }}</span>
                                </label>
                            </div>
                            @if ($errors->has('analytics_status'))
                                <p class="mt-1 mb-0 text-danger">{{ $errors->first('is_recaptcha') }}</p>
                            @endif
                        </div>
                        <div class="form-group">
                            <label>{{ __('Google_Recaptcha_Site_key') }}</label>
                            <input class="form-control" name="google_recaptcha_site_key"
                                value="{{ $data->google_recaptcha_site_key }}">
                            @if ($errors->has('google_recaptcha_site_key'))
                                <p class="mt-1 mb-0 text-danger">{{ $errors->first('google_recaptcha_site_key') }}</p>
                            @endif
                        </div>
                        <div class="form-group">
                            <label>{{ __('Google_Recaptcha_Secret_key') }}</label>
                            <input class="form-control" name="google_recaptcha_secret_key"
                                value="{{ $data->google_recaptcha_secret_key }}">
                            @if ($errors->has('google_recaptcha_secret_key'))
                                <p class="mt-1 mb-0 text-danger">{{ $errors->first('google_recaptcha_secret_key') }}</p>
                            @endif

                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="row">
                            <div class="col-12 text-center">
                                <button type="submit" id="recaptchaSubmitBtn" class="btn btn-success">
                                    {{ __('Update') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>


        <div class="col-lg-4">
            <div class="card">
                <form action="{{ route('user.update_disqus') }}" method="post">
                    @csrf
                    <div class="card-header">
                        <div class="row">
                            <div class="col-lg-12">
                                <div class="card-title">{{ __('Disqus') }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="card-body">
                        <div class="row">
                            <div class="col-lg-12">
                                <div class="form-group">
                                    <label>{{ __('Disqus_Status') }} * </label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="disqus_status" value="1"
                                                class="selectgroup-input"
                                                {{ isset($data) && $data->disqus_status == 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Active') }}</span>
                                        </label>

                                        <label class="selectgroup-item">
                                            <input type="radio" name="disqus_status" value="0"
                                                class="selectgroup-input"
                                                {{ !isset($data) || $data->disqus_status != 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Deactive') }}</span>
                                        </label>
                                    </div>
                                    @if ($errors->has('disqus_status'))
                                        <p class="mb-0 text-danger">{{ $errors->first('disqus_status') }}</p>
                                    @endif
                                </div>

                                <div class="form-group">
                                    <label>{{ __('Disqus_Short_Name') }} * </label>
                                    <input type="text" class="form-control" name="disqus_short_name"
                                        value="{{ isset($data) ? $data->disqus_short_name : null }}">
                                    @if ($errors->has('disqus_short_name'))
                                        <p class="mb-0 text-danger">{{ $errors->first('disqus_short_name') }}</p>
                                    @endif
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card-footer">
                        <div class="row">
                            <div class="col-12 text-center">
                                <button type="submit" class="btn btn-success">
                                    {{ __('Update') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <div class="col-lg-4">
            <div class="card">
                <form action="{{ route('user.update_whatsapp') }}" method="post">
                    @csrf
                    <div class="card-header">
                        <div class="row">
                            <div class="col-lg-12">
                                <div class="card-title">{{ __('WhatsApp') }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="card-body">
                        <div class="row">
                            <div class="col-lg-12">
                                <div class="form-group">
                                    <label>{{ __('WhatsApp_Status') }} *</label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="whatsapp_status" value="1"
                                                class="selectgroup-input"
                                                {{ isset($data) && $data->whatsapp_status == 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Active') }}</span>
                                        </label>

                                        <label class="selectgroup-item">
                                            <input type="radio" name="whatsapp_status" value="0"
                                                class="selectgroup-input"
                                                {{ !isset($data) || $data->whatsapp_status != 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Deactive') }}</span>
                                        </label>
                                    </div>
                                    @if ($errors->has('whatsapp_status'))
                                        <p class="mb-0 text-danger">{{ $errors->first('whatsapp_status') }}</p>
                                    @endif
                                </div>

                                <div class="form-group">
                                    <label>{{ __('WhatsApp_Number') }} * </label>
                                    <input type="text" class="form-control" name="whatsapp_number"
                                        value="{{ isset($data) && $data->whatsapp_number ? $data->whatsapp_number : null }}">
                                    <p class="text-warning mb-0">{{ __('Phone_Code_must_be_included_in_Phone_Number') }}
                                    </p>

                                    @if ($errors->has('whatsapp_number'))
                                        <p class="mb-0 text-danger">{{ $errors->first('whatsapp_number') }}</p>
                                    @endif
                                </div>

                                <div class="form-group">
                                    <label>{{ __('WhatsApp_Header_Title') }} * </label>
                                    <input type="text" class="form-control" name="whatsapp_header_title"
                                        value="{{ isset($data) && $data->whatsapp_header_title ? $data->whatsapp_header_title : null }}">

                                    @if ($errors->has('whatsapp_header_title'))
                                        <p class="mb-0 text-danger">{{ $errors->first('whatsapp_header_title') }}</p>
                                    @endif
                                </div>

                                <div class="form-group">
                                    <label>{{ __('WhatsApp_Popup_Status') }} * </label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="whatsapp_popup_status" value="1"
                                                class="selectgroup-input"
                                                {{ isset($data) && $data->whatsapp_popup_status == 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Active') }}</span>
                                        </label>

                                        <label class="selectgroup-item">
                                            <input type="radio" name="whatsapp_popup_status" value="0"
                                                class="selectgroup-input"
                                                {{ !isset($data) || $data->whatsapp_popup_status != 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Deactive') }}</span>
                                        </label>
                                    </div>
                                    @if ($errors->has('whatsapp_popup_status'))
                                        <p class="mb-0 text-danger">{{ $errors->first('whatsapp_popup_status') }}</p>
                                    @endif
                                </div>

                                <div class="form-group">
                                    <label>{{ __('WhatsApp_Popup_Message') }} * </label>
                                    <textarea class="form-control" name="whatsapp_popup_message" rows="2">{{ isset($data) && $data->whatsapp_popup_message ? $data->whatsapp_popup_message : null }}</textarea>
                                    @if ($errors->has('whatsapp_popup_message'))
                                        <p class="mb-0 text-danger">{{ $errors->first('whatsapp_popup_message') }}</p>
                                    @endif
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card-footer">
                        <div class="row">
                            <div class="col-12 text-center">
                                <button type="submit" class="btn btn-success">
                                    {{ __('Update') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <div class="col-lg-4">
            <div class="card">
                <form id="ajaxFormDisqus" action="{{ route('user.update_pixel') }}" method="post">
                    @csrf
                    <div class="card-header">
                        <div class="row">
                            <div class="col-lg-12">
                                <div class="card-title">{{ __('Facebook_Pixel') }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="card-body">
                        <div class="row">
                            <div class="col-lg-12">
                                <div class="form-group">
                                    <label>{{ __('Facebook_Pixel_Status') }} * </label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="pixel_status" value="1"
                                                class="selectgroup-input"
                                                {{ isset($data) && $data->pixel_status == 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Active') }}</span>
                                        </label>

                                        <label class="selectgroup-item">
                                            <input type="radio" name="pixel_status" value="0"
                                                class="selectgroup-input"
                                                {{ !isset($data) || $data->pixel_status != 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Deactive') }}</span>
                                        </label>
                                    </div>
                                    <p id="errpixel_status" class="mb-0 text-danger em"></p>
                                    <p class="text text-warning">
                                        <strong>{{ __('Hint') }} : </strong> <a class="text-primary"
                                            href="https://prnt.sc/5u1ZP6YjAw5O"
                                            target="_blank">{{ __('Click_Here') }}</a>
                                        {{ __('to_see_where_to_get_the_Facebook_Pixel_ID') }}
                                    </p>
                                    @if ($errors->has('pixel_status'))
                                        <p class="text-danger">{{ $errors->first('pixel_status') }}</p>
                                    @endif
                                </div>

                                <div class="form-group">
                                    <label>{{ __('Facebook_Pixel_ID') }} * </label>
                                    <input type="text" class="form-control" name="pixel_id"
                                        value="{{ isset($data) ? $data->pixel_id : null }}">
                                    <p id="errpixel_id" class="mb-0 text-danger em"></p>
                                    @if ($errors->has('pixel_id'))
                                        <p class="text-danger">{{ $errors->first('pixel_id') }}</p>
                                    @endif
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card-footer">
                        <div class="row">
                            <div class="col-12 text-center">
                                <button type="submit" class="btn btn-success">
                                    {{ __('Update') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <div class="col-lg-4">
            <div class="card">
                <form action="{{ route('user.update_tawkto') }}" method="POST">
                    @csrf
                    <div class="card-header">
                        <div class="card-title">{{ __('Tawk_to') }}</div>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>{{ __('Tawk_to_status') }}</label>
                            <div class="selectgroup w-100">
                                <label class="selectgroup-item">
                                    <input type="radio" name="tawkto_status" value="1" class="selectgroup-input"
                                        {{ isset($data) && $data->tawkto_status == 1 ? 'checked' : '' }}>
                                    <span class="selectgroup-button">{{ __('Active') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="radio" name="tawkto_status" value="0" class="selectgroup-input"
                                        {{ isset($data) && $data->tawkto_status == 0 ? 'checked' : '' }}>
                                    <span class="selectgroup-button">{{ __('Deactive') }}</span>
                                </label>
                            </div>
                            @if ($errors->has('tawkto_status'))
                                <p class="mb-0 text-danger">{{ $errors->first('tawkto_status') }}</p>
                            @endif
                        </div>
                        <div class="form-group">
                            <label>{{ __('Tawk_to_Direct_Chat_Link') }}</label>
                            <input class="form-control" name="tawkto_direct_chat_link"
                                value="{{ isset($data) ? $data->tawkto_direct_chat_link : '' }}">
                            @if ($errors->has('tawkto_direct_chat_link'))
                                <p class="mb-0 text-danger">{{ $errors->first('tawkto_direct_chat_link') }}</p>
                            @endif
                        </div>
                    </div>
                    <div class="card-footer text-center">
                        <button class="btn btn-success" type="submit">{{ __('Update') }}</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
@endsection
