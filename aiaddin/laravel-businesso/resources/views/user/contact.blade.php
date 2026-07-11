@extends('user.layout')
@php
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::id()],
      ['is_default', 1],
  ])->first();
  $userLanguages = \App\Models\User\Language::where('user_id', \Illuminate\Support\Facades\Auth::id())->get();
@endphp

@includeIf('user.partials.rtl-style')

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Contact_Page') }}</h4>
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
        <a href="#">{{ __('Contact_Page') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-10">
              <div class="card-title">{{ __('Update_Contact') }}</div>
            </div>
            <div class="col-lg-2">
              @includeIf('user.partials.languages')
            </div>
          </div>
        </div>

        <div class="card-body pt-5 pb-5">
          <div class="row">
            <div class="col-lg-6 offset-lg-3">
              <form id="contactSecForm"
                action="{{ route('user.contact.update', ['language' => request()->input('language')]) }}" method="POST"
                enctype="multipart/form-data">
                @csrf
                <div class="row">
                  <div class="col-lg-12">
                    <div class="form-group">
                      <div class="col-12 mb-2">
                        <label for="image"><strong>{{ __('Contact_Form_Image') }}</strong></label>
                      </div>
                      <div class="col-md-12 showImage mb-3">
                        <img
                          src="{{ isset($data->contact_form_image) ? asset('assets/front/img/user/' . $data->contact_form_image) : asset('assets/admin/img/noimage.jpg') }}"
                          alt="..." class="img-thumbnail">
                      </div>
                      <input type="file" name="contact_form_image" id="image" class="form-control">
                      @if ($errors->has('contact_form_image'))
                        <p class="mt-2 mb-0 text-danger">{{ $errors->first('contact_form_image') }}</p>
                      @endif
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <label for="">{{ __('Form_Title') }}</label>
                  <input type="text" class="form-control" name="contact_form_title"
                    value="{{ $data->contact_form_title ?? '' }}" placeholder="{{ __('Enter_title') }}">
                  @if ($errors->has('contact_form_title'))
                    <p class="mt-2 mb-0 text-danger">{{ $errors->first('contact_form_title') }}</p>
                  @endif
                </div>

                <div class="form-group">
                  <label for="">{{ __('Form_Subtitle') }}</label>
                  <input type="text" class="form-control" name="contact_form_subtitle"
                    value="{{ $data->contact_form_subtitle ?? '' }}" placeholder="{{ __('Enter_Subtitle') }}">
                  @if ($errors->has('contact_form_subtitle'))
                    <p class="mt-2 mb-0 text-danger">{{ $errors->first('contact_form_subtitle') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label>{{ __('Address') }}</label>
                  <textarea class="form-control" name="contact_addresses" rows="3" placeholder="{{ __('Enter_Address') }}">{{ $data->contact_addresses ?? null }}</textarea>
                  <p class="mb-0 text-warning">{{ __('Use_newline_to_seperate_multiple_addresses') }}</p>
                  @if ($errors->has('contact_addresses'))
                    <p class="mb-0 text-danger">{{ $errors->first('contact_addresses') }}</p>
                  @endif
                </div>

                <div class="form-group">
                  <label>{{ __('Phone') }}</label>
                  <input class="form-control" name="contact_numbers" data-role="tagsinput"
                    value="{{ $data->contact_numbers ?? null }}" placeholder="{{ __('Enter_phone') }}">
                  <p class="mb-0 text-warning">{{ __('Phone_seperate_text') }}</p>
                  @if ($errors->has('contact_numbers'))
                    <p class="mb-0 text-danger">{{ $errors->first('contact_numbers') }}</p>
                  @endif
                </div>

                <div class="form-group">
                  <label>{{ __('Email') }}</label>
                  <input class="form-control ltr" name="contact_mails" data-role="tagsinput"
                    value="{{ $data->contact_mails ?? null }}" placeholder="{{ __('Enter_Email_Address') }}">
                  <p class="mb-0 text-warning">{{ __('email_seperate_text') }}</p>
                  @if ($errors->has('contact_mails'))
                    <p class="mb-0 text-danger">{{ $errors->first('contact_mails') }}</p>
                  @endif
                </div>

                <div class="form-group">
                  <label>{{ __('Latitude') }} </label>
                  <input class="form-control" name="latitude" value="{{ $data->latitude ?? null }}"
                    placeholder="{{ __('Enter latitude') }}">
                  @if ($errors->has('latitude'))
                    <p class="mb-0 text-danger">{{ $errors->first('latitude') }}</p>
                  @endif
                </div>

                <div class="form-group">
                  <label>{{ __('Longitude') }}</label>
                  <input class="form-control" name="longitude" value="{{ $data->longitude ?? null }}"
                    placeholder="{{ __('Enter longitude') }}">
                  @if ($errors->has('longitude'))
                    <p class="mb-0 text-danger">{{ $errors->first('longitude') }}</p>
                  @endif
                </div>

                <div class="form-group">
                  <label>{{ __('Map_Zoom') }}</label>
                  <input class="form-control" name="map_zoom" value="{{ $data->map_zoom ?? 12 }}"
                    placeholder="{{ __('Enter map zoom value') }}">
                  @if ($errors->has('map_zoom'))
                    <p class="mb-0 text-danger">{{ $errors->first('map_zoom') }}</p>
                  @endif
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-12 text-center">
              <button type="submit" form="contactSecForm" class="btn btn-success">
                {{ __('Update') }}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
@endsection
