@extends('user.layout')
@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('vCard_Preferences') }}</h4>
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
        <a href="#">{{ __('vCards') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ $vcard->vcard_name }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Preferences') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">

      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-6">
              <div class="card-title d-inline-block">{{ __('vCard_Preferences') }}</div>
            </div>
            <div class="col-6 text-right">
              <a href="{{ route('user.vcard') . '?language=' . request('language') }}" class="btn btn-primary btn-sm"><i
                  class="fas fa-backward"></i> {{ __('Back') }}</a>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row justify-content-center">
            <div class="col-lg-6">
              <form id="ajaxForm" class="" action="{{ route('user.vcard.prefUpdate', $vcard->id) }}"
                method="post">
                {{ csrf_field() }}
                <div class="form-group">
                  <div class="selectgroup selectgroup-pills mt-2 justify-content-center">
                    <label class="selectgroup-item">
                      <input type="checkbox" name="preferences[]" value="Call" class="selectgroup-input"
                        @if (is_array($preferences) && in_array('Call', $preferences)) checked @endif>
                      <span class="selectgroup-button">{{ __('Call_Button') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="checkbox" name="preferences[]" value="Whatsapp" class="selectgroup-input"
                        @if (is_array($preferences) && in_array('Whatsapp', $preferences)) checked @endif>
                      <span class="selectgroup-button">{{ __('Whatsapp_Button') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="checkbox" name="preferences[]" value="Mail" class="selectgroup-input"
                        @if (is_array($preferences) && in_array('Mail', $preferences)) checked @endif>
                      <span class="selectgroup-button">{{ __('Mail_Button') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="checkbox" name="preferences[]" value="Add to Contact" class="selectgroup-input"
                        @if (is_array($preferences) && in_array('Add to Contact', $preferences)) checked @endif>
                      <span class="selectgroup-button">{{ __('Add_to_Contact_Button') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="checkbox" name="preferences[]" value="Share vCard" class="selectgroup-input"
                        @if (is_array($preferences) && in_array('Share vCard', $preferences)) checked @endif>
                      <span class="selectgroup-button">{{ __('Share_vCard_Button') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="checkbox" name="preferences[]" value="Information" class="selectgroup-input"
                        @if (is_array($preferences) && in_array('Information', $preferences)) checked @endif>
                      <span class="selectgroup-button">{{ __('Information_Section') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="checkbox" name="preferences[]" value="Video" class="selectgroup-input"
                        @if (is_array($preferences) && in_array('Video', $preferences)) checked @endif>
                      <span class="selectgroup-button">{{ __('Video_Section') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="checkbox" name="preferences[]" value="About Us" class="selectgroup-input"
                        @if (is_array($preferences) && in_array('About Us', $preferences)) checked @endif>
                      <span class="selectgroup-button">{{ __('About_Us_Section') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="checkbox" name="preferences[]" value="Services" class="selectgroup-input"
                        @if (is_array($preferences) && in_array('Services', $preferences)) checked @endif>
                      <span class="selectgroup-button">{{ __('Services_Section') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="checkbox" name="preferences[]" value="Projects" class="selectgroup-input"
                        @if (is_array($preferences) && in_array('Projects', $preferences)) checked @endif>
                      <span class="selectgroup-button">{{ __('Projects_Section') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="checkbox" name="preferences[]" value="Testimonials" class="selectgroup-input"
                        @if (is_array($preferences) && in_array('Testimonials', $preferences)) checked @endif>
                      <span class="selectgroup-button">{{ __('Testimonials_Section') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="checkbox" name="preferences[]" value="Enquiry Form" class="selectgroup-input"
                        @if (is_array($preferences) && in_array('Enquiry Form', $preferences)) checked @endif>
                      <span class="selectgroup-button">{{ __('Enquiry_Form_Section') }}</span>
                    </label>
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
                <button type="submit" id="submitBtn" class="btn btn-success">{{ __('Update') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
@endsection
