@extends('admin.layout')
@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Plugins') }}</h4>
        <ul class="breadcrumbs">
            <li class="nav-home">
                <a href="{{ route('admin.dashboard') }}">
                    <i class="flaticon-home"></i>
                </a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Basic Settings') }}</a>
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
        <div class="col-md-12">
            <form id="scriptForm" class="" action="{{ route('admin.script.update') }}" method="post">
                @csrf
                <div class="row">

                    <div class="col-lg-4">
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title">
                                    {{ __('Google Recaptcha') }}
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="form-group">
                                    <label>{{ __('Google Recaptcha Status') }}</label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="is_recaptcha" value="1"
                                                class="selectgroup-input" {{ $data->is_recaptcha == 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Active') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="radio" name="is_recaptcha" value="0"
                                                class="selectgroup-input" {{ $data->is_recaptcha == 0 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Deactive') }}</span>
                                        </label>
                                    </div>
                                    @if ($errors->has('is_recaptcha'))
                                        <p class="mb-0 text-danger">{{ $errors->first('is_recaptcha') }}</p>
                                    @endif
                                </div>
                                <div class="form-group">
                                    <label>{{ __('Google Recaptcha Site key') }}</label>
                                    <input class="form-control" name="google_recaptcha_site_key"
                                        value="{{ $data->google_recaptcha_site_key }}">
                                    @if ($errors->has('google_recaptcha_site_key'))
                                        <p class="mb-0 text-danger">{{ $errors->first('google_recaptcha_site_key') }}</p>
                                    @endif
                                </div>
                                <div class="form-group">
                                    <label>{{ __('Google Recaptcha Secret key') }}</label>
                                    <input class="form-control" name="google_recaptcha_secret_key"
                                        value="{{ $data->google_recaptcha_secret_key }}">
                                    @if ($errors->has('google_recaptcha_secret_key'))
                                        <p class="mb-0 text-danger">{{ $errors->first('google_recaptcha_secret_key') }}</p>
                                    @endif
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-4">
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title">{{ __('Disqus') }}</div>
                            </div>
                            <div class="card-body">
                                <div class="form-group">
                                    <label>{{ __('Disqus Status') }}</label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="is_disqus" value="1" class="selectgroup-input"
                                                {{ $data->is_disqus == 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Active') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="radio" name="is_disqus" value="0" class="selectgroup-input"
                                                {{ $data->is_disqus == 0 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Deactive') }}</span>
                                        </label>
                                    </div>
                                    @if ($errors->has('is_disqus'))
                                        <p class="mb-0 text-danger">{{ $errors->first('is_disqus') }}</p>
                                    @endif
                                </div>

                                <div class="form-group">
                                    <label>{{ __('Disqus Shortname') }}</label>
                                    <input class="form-control" name="disqus_shortname"
                                        value="{{ $data->disqus_shortname }}">
                                    @if ($errors->has('disqus_shortname'))
                                        <p class="mb-0 text-danger">{{ $errors->first('disqus_shortname') }}</p>
                                    @endif
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-4">
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title">{{ __('Tawk.to') }}</div>
                            </div>
                            <div class="card-body">
                                <div class="form-group">
                                    <label>{{ __('Tawk.to Status') }}</label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="is_tawkto" value="1" class="selectgroup-input"
                                                {{ $data->is_tawkto == 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Active') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="radio" name="is_tawkto" value="0" class="selectgroup-input"
                                                {{ $data->is_tawkto == 0 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Deactive') }}</span>
                                        </label>
                                    </div>
                                    <p class="mb-0 text-warning">
                                        {{ __('If you enable Tawk.to, then WhatsApp must be disabled') . '.' }}</p>
                                    @if ($errors->has('is_tawkto'))
                                        <p class="mb-0 text-danger">{{ $errors->first('is_tawkto') }}</p>
                                    @endif
                                </div>
                                <div class="form-group">
                                    <label>{{ __('Tawk.to Direct Chat Link') }}</label>
                                    <input class="form-control" name="tawkto_property_id"
                                        value="{{ $data->tawkto_property_id }}">
                                    @if ($errors->has('tawkto_property_id'))
                                        <p class="mb-0 text-danger">{{ $errors->first('tawkto_property_id') }}</p>
                                    @endif
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4">
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title">{{ __('WhatsApp Chat Button') }}</div>
                            </div>
                            <div class="card-body">
                                <div class="form-group">
                                    <label>{{ __('Status') }}</label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="is_whatsapp" value="1"
                                                class="selectgroup-input" {{ $data->is_whatsapp == 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Active') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="radio" name="is_whatsapp" value="0"
                                                class="selectgroup-input" {{ $data->is_whatsapp == 0 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Deactive') }}</span>
                                        </label>
                                    </div>
                                    <p class="text-warning mb-0">
                                        {{ __('If you enable WhatsApp, then Tawk.to must be disabled') . '.' }}</p>
                                </div>
                                <div class="form-group">
                                    <label>{{ __('WhatsApp Number') }}</label>
                                    <input class="form-control" type="text" name="whatsapp_number"
                                        value="{{ $data->whatsapp_number }}">
                                    <p class="text-warning mb-0">{{ __('Enter Phone number with Country Code') }}</p>
                                </div>
                                <div class="form-group">
                                    <label>{{ __('WhatsApp Header Title') }}</label>
                                    <input class="form-control" type="text" name="whatsapp_header_title"
                                        value="{{ $data->whatsapp_header_title }}">
                                    @if ($errors->has('whatsapp_header_title'))
                                        <p class="mb-0 text-danger">{{ $errors->first('whatsapp_header_title') }}</p>
                                    @endif
                                </div>
                                <div class="form-group">
                                    <label>{{ __('WhatsApp Popup Message') }}</label>
                                    <textarea class="form-control" name="whatsapp_popup_message" rows="2">{{ $data->whatsapp_popup_message }}</textarea>
                                    @if ($errors->has('whatsapp_popup_message'))
                                        <p class="mb-0 text-danger">{{ $errors->first('whatsapp_popup_message') }}</p>
                                    @endif
                                </div>
                                <div class="form-group">
                                    <label>{{ __('Popup') }}</label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="whatsapp_popup" value="1"
                                                class="selectgroup-input"
                                                {{ $data->whatsapp_popup == 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Active') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="radio" name="whatsapp_popup" value="0"
                                                class="selectgroup-input"
                                                {{ $data->whatsapp_popup == 0 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Deactive') }}</span>
                                        </label>
                                    </div>
                                    @if ($errors->has('whatsapp_popup'))
                                        <p class="mb-0 text-danger">{{ $errors->first('whatsapp_popup') }}</p>
                                    @endif
                                </div>
                            </div>
                        </div>
                    </div>
                    @php
                        $openaiContentType = $data->openai_content_type ?? 'all';
                        $geminiContentType = $data->gemini_content_type ?? 'all';
                        $pollinationsContentType = $data->pollinations_content_type ?? 'all';
                    @endphp
                    <div class="col-lg-4">
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title">{{ __('OpenAI') }}</div>
                            </div>

                            <div class="card-body">

                                <div class="form-group">
                                    <label>{{ __('OpenAI API Key') }}</label>
                                    <input type="text" class="form-control" name="openai_api_key"
                                        value="{{ $data->openai_api_key }}" placeholder="sk-projXXXXXXXX">
                                </div>
                                {{-- Text Model --}}
                                <div class="form-group js-model js-openai-text">
                                    <label>{{ __('OpenAI Text Model') }}</label>
                                    <input type="text" class="form-control" name="openai_text_model"
                                        value="{{ $data->openai_text_model ?? 'gpt-4o' }}" placeholder="gpt-4o">
                                    <small class="text-warning">
                                        {{ __('Examples') . ': ' . __('gpt-4o-mini, gpt-4o, gpt-4.1, gpt-3.5-turbo') }}
                                    </small>
                                </div>

                                {{-- Image Model --}}
                                <div class="form-group js-model js-openai-image">
                                    <label>{{ __('OpenAI Image Model') }}</label>
                                    <input type="text" class="form-control" name="openai_image_model"
                                        value="{{ $data->openai_image_model ?? 'dall-e-3' }}" placeholder="dall-e-3">
                                    <small class="text-warning">
                                        {{ __('Examples') . ': ' . __('gpt-image-1, dall-e-3, dall-e-2') }}
                                    </small>
                                </div>

                                <div class="form-group">
                                    <label>{{ __('OpenAI Content Type') }}</label>
                                    <select name="openai_content_type" class="form-control">
                                        <option value="all" {{ $openaiContentType === 'all' ? 'selected' : '' }}>
                                            {{ __('All') }}
                                        </option>
                                        <option value="text" {{ $openaiContentType === 'text' ? 'selected' : '' }}>
                                            {{ __('Text Only') }}
                                        </option>
                                        <option value="image" {{ $openaiContentType === 'image' ? 'selected' : '' }}>
                                            {{ __('Image Only') }}
                                        </option>
                                    </select>
                                    <small class="text-warning d-block mt-2">
                                        {{ __("Selecting 'All' allows users to generate both text and images") . '. ' . __("Selecting 'Text Only' restricts generation to text content only, and selecting 'Image Only' allows image generation only") . '.' }}
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-4">
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title">{{ __('Google Gemini') }}</div>
                            </div>

                            <div class="card-body">

                                {{-- API Key --}}
                                <div class="form-group">
                                    <label>{{ __('Gemini API Key') }}</label>
                                    <input type="text" class="form-control" name="gemini_api_key"
                                        value="{{ $data->gemini_api_key }}" placeholder="AIzaSyXXXXXXXX">
                                </div>


                                {{-- Text Model --}}
                                <div class="form-group js-model js-gemini-text">
                                    <label>{{ __('Gemini Text Model') }}</label>
                                    <input type="text" class="form-control" name="gemini_text_model"
                                        value="{{ $data->gemini_text_model ?? 'gemini-2.0-flash' }}"
                                        placeholder="gemini-2.0-flash">
                                    <small
                                        class="text-warning">{{__('Examples') . ': '. __('gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash') }}</small>
                                </div>

                                {{-- Image Model --}}
                                <div class="form-group js-model js-gemini-image">
                                    <label>{{ __('Gemini Image Model') }}</label>
                                    <input type="text" class="form-control" name="gemini_image_model"
                                        value="{{ $data->gemini_image_model ?? 'imagen-4.0-generat-001' }}"
                                        placeholder="imagen-4.0-generat-001">
                                    <small
                                        class="text-warning">{{ __('Examples').': ' . __('imagen-4.0-generat-001, imagen-4.0-fast-generate-001') }}</small>

                                    <br>

                                    <small class="text-warning">
                                        {{ __('Gemini Image models must include the version suffix (-001)') . '. ' . __('Without the suffix, the API will return a 404 model not found error') }}
                                    </small>
                                </div>

                                <div class="form-group">
                                    <label>{{ __('Gemini Content Type') }}</label>
                                    <select name="gemini_content_type" class="form-control">
                                        <option value="all" {{ $geminiContentType === 'all' ? 'selected' : '' }}>
                                            {{ __('All') }}
                                        </option>
                                        <option value="text" {{ $geminiContentType === 'text' ? 'selected' : '' }}>
                                            {{ __('Text Only') }}
                                        </option>
                                        <option value="image" {{ $geminiContentType === 'image' ? 'selected' : '' }}>
                                            {{ __('Image Only') }}
                                        </option>
                                    </select>
                                    <small class="text-warning d-block mt-2">
                                        {{ __("Selecting 'All' allows users to generate both text and images") . '. ' . __("Selecting 'Text Only' restricts generation to text content only, and selecting 'Image Only' allows image generation only") . '.' }}
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-4">
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title">{{ __('Pollinations AI') }}</div>
                            </div>

                            <div class="card-body">

                                <div class="form-group">
                                    <label>{{ __('Pollinations Content Type') }}</label>
                                    <select name="pollinations_content_type" class="form-control">
                                        <option value="all"
                                            {{ $pollinationsContentType === 'all' ? 'selected' : '' }}>
                                            {{ __('All') }}
                                        </option>
                                        <option value="text"
                                            {{ $pollinationsContentType === 'text' ? 'selected' : '' }}>
                                            {{ __('Text Only') }}
                                        </option>
                                        <option value="image"
                                            {{ $pollinationsContentType === 'image' ? 'selected' : '' }}>
                                            {{ __('Image Only') }}
                                        </option>
                                    </select>
                                    <small class="text-warning d-block mt-2">
                                        {{ __("Selecting 'All' allows users to generate both text and images") . '. ' . __("Selecting 'Text Only' restricts generation to text content only, and selecting 'Image Only' allows image generation only") . '.' }}
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-footer">
                        <div class="form">
                            <div class="form-group from-show-notify row">
                                <div class="col-12 text-center">
                                    <button type="submit" form="scriptForm"
                                        class="btn btn-success">{{ __('Update') }}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </div>
@endsection
