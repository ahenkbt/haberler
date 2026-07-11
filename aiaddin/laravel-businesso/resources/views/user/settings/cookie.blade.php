@extends('user.layout')

{{-- this style will be applied when the direction of language is right-to-left --}}
{{-- @includeIf('user.partials.rtl-style') --}}

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Cookie_Alert') }}</h4>
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
        <a href="#">{{ __('Cookie_Alert') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <form class="" action="{{ route('user.cookie.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-10">
                <div class="card-title">{{ __('Update_Cookie_Alert') }}</div>
              </div>
              <div class="col-lg-2">
              </div>
            </div>
          </div>
          <div class="card-body pt-5 pb-5">
            <div class="row">
              <div class="col-lg-6 offset-lg-3">
                @csrf
                <div class="form-group">
                  <label>{{ __('Cookie_Alert_Status') }} **</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="cookie_alert_status" value="1" class="selectgroup-input"
                        {{ $abe->cookie_alert_status == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }} </span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="cookie_alert_status" value="0" class="selectgroup-input"
                        {{ $abe->cookie_alert_status == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }} </span>
                    </label>
                  </div>
                  @if ($errors->has('cookie_alert_status'))
                    <p class="mb-0 text-danger">{{ $errors->first('cookie_alert_status') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label>{{ __('Cookie_Alert_Button_Text') }} **</label>
                  <input class="form-control" name="cookie_alert_button_text"
                    value="{{ $abe->cookie_alert_button_text }}">
                  @if ($errors->has('cookie_alert_button_text'))
                    <p class="mb-0 text-danger">{{ $errors->first('cookie_alert_button_text') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label for="">{{ __('Cookie_Alert_Text') }} **</label>
                  <textarea class="form-control summernote" name="cookie_alert_text" rows="3"
                    placeholder="{{ __('Enter_Cookie_Alert_Text') }}" data-height="100" id="cookie_alert_text">{{ replaceBaseUrl($abe->cookie_alert_text) }}</textarea>
                  <p id="errcontent" class="mb-0 text-danger em"></p>
                  @if ($errors->has('cookie_alert_text'))
                    <p class="mb-0 text-danger">{{ $errors->first('cookie_alert_text') }}</p>
                  @endif
                </div>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-12 text-center">
                  <button type="submit" id="displayNotif" class="btn btn-success">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
@endsection
