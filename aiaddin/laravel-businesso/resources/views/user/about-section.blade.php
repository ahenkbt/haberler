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
    <h4 class="page-title">{{ __('About_Section') }}</h4>
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
        <a href="#">{{ __('Home_Page') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('About_Section') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-10">
              <div class="card-title">{{ __('Update_About_Section') }}</div>
            </div>

            <div class="col-lg-2">
              @includeIf('user.partials.languages')
            </div>
          </div>
        </div>

        <div class="card-body pt-5 pb-5">
          <div class="row">
            <div class="col-lg-6 offset-lg-3">
              <form id="ajaxForm" action="{{ route('user.home.page.update.about') }}" method="POST"
                enctype="multipart/form-data">
                @csrf
                <input type="hidden" name="id" value="{{ $home_setting->id }}">
                <input type="hidden" name="language_id" value="{{ $home_setting->language_id }}">
                <div class="row">
                  <div class="col-lg-12">
                    <div class="form-group">
                      <div class="col-12 mb-2">
                        <label for="logo"><strong>{{ __('Image') }}</strong></label>
                      </div>
                      <div class="col-md-12 showAboutImage mb-3">
                        <img
                          src="{{ $home_setting->about_image ? asset('assets/front/img/user/home_settings/' . $home_setting->about_image) : asset('assets/admin/img/noimage.jpg') }}"
                          alt="..." class="img-thumbnail">
                      </div>
                      <input type="hidden" name="types[]" value="about_image">
                      <input type="file" name="about_image" id="about_image" class="form-control">
                      <p id="errabout_image" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-lg-{{ $userBs->theme == 'home_thirteen' ? 12 : 6 }} pr-0">
                    <div class="form-group">
                      <label for="">{{ __('Title') }}</label>
                      <input type="hidden" name="types[]" value="about_title">
                      <input type="text" class="form-control" name="about_title"
                        value="{{ $home_setting->about_title }}" placeholder="{{ __('Enter Title') }}">
                      <p id="errabout_title" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  @if ($userBs->theme !== 'home_eleven' && $userBs->theme !== 'home_thirteen')
                    <div class="col-lg-6 pl-0">
                      <div class="form-group">
                        <label for="">{{ __('Subtitle') }}</label>
                        <input type="hidden" name="types[]" value="about_subtitle">
                        <input type="text" class="form-control" name="about_subtitle"
                          value="{{ $home_setting->about_subtitle }}" placeholder="{{ __('Enter subtitle') }}">
                        <p id="errabout_subtitle" class="mb-0 text-danger em"></p>
                      </div>
                    </div>
                  @endif
                </div>
                <div class="form-group">
                  <label for="">{{ __('Content') }}</label>
                  <input type="hidden" name="types[]" value="about_content">
                  <textarea class="form-control" name="about_content" placeholder="{{ __('Enter_content') }}" rows="5">{{ $home_setting->about_content }}</textarea>
                  <p id="errabout_content" class="mb-0 text-danger em"></p>
                </div>
                @if (
                    (isset($userBs->theme) && !$userBs->theme === 'home_two') ||
                        $userBs->theme === 'home_eleven' ||
                        $userBs->theme == 'home_thirteen')
                  <div class="row">
                    <div class="col-lg-6 pr-0">
                      <div class="form-group">
                        <label for="">{{ __('Button_Text') }}</label>
                        <input type="hidden" name="types[]" value="about_button_text">
                        <input type="text" class="form-control" name="about_button_text"
                          placeholder="{{ __('Enter button text') }}" value="{{ $home_setting->about_button_text }}">
                        <p id="errabout_button_text" class="mb-0 text-danger em"></p>
                      </div>
                    </div>
                    <div class="col-lg-6 pl-0">
                      <div class="form-group">
                        <label for="">{{ __('Button_URL') }}</label>
                        <input type="hidden" name="types[]" value="about_button_url">
                        <input type="text" class="form-control" name="about_button_url"
                          placeholder="{{ __('Enter button url') }}" value="{{ $home_setting->about_button_url }}">
                        <p id="errabout_button_url" class="mb-0 text-danger em"></p>
                      </div>
                    </div>
                  </div>
                @endif
                @if (isset($userBs->theme) && $userBs->theme === 'home_eleven')
                  <div class="row">
                    <div class="col-lg-6 pr-0">
                      <div class="form-group">
                        <label for="">{{ __('Secound_Button_Text') }}</label>
                        <input type="hidden" name="types[]" value="about_snd_button_text">
                        <input type="text" class="form-control" name="about_snd_button_text"
                          placeholder="{{ __('Secound_Button_Text') }}"
                          value="{{ $home_setting->about_snd_button_text }}">
                        <p id="errabout_snd_button_text" class="mb-0 text-danger em"></p>
                      </div>
                    </div>
                    <div class="col-lg-6 pl-0">
                        <input type="hidden" name="types[]" value="about_snd_button_url">
                        <input type="text" class="form-control" name="about_snd_button_url"
                          placeholder="{{ __('Secound_Button_URL') }}"
                          value="{{ $home_setting->about_snd_button_url }}">
                        <p id="errabout_snd_button_url" class="mb-0 text-danger em"></p>
                      </div>
                    </div>
                  </div>
                @endif
                
                @if (isset($userBs->theme) && $userBs->theme === 'home_two')
                  <div class="form-group">
                    <div class="col-12 mb-2">
                      <label for="logo"><strong>{{ __('Video_Background_Image') }}</strong></label>
                    </div>
                    <div class="col-md-12 showAboutVideoImage mb-3">
                      <img
                        src="{{ $home_setting->about_video_image ? asset('assets/front/img/user/home_settings/' . $home_setting->about_video_image) : asset('assets/admin/img/noimage.jpg') }}"
                        alt="..." class="img-thumbnail">
                    </div>
                    <input type="hidden" name="types[]" value="about_video_image">
                    <input type="file" name="about_video_image" id="about_video_image" class="form-control">
                    <p id="errabout_video_image" class="mb-0 text-danger em"></p>
                  </div>
                  <div class="form-group">
                    <label for="">{{ __('Video_URL') }}</label>
                    <input type="hidden" name="types[]" value="about_video_url">
                    <input type="text" class="form-control" placeholder="{{ __('Video_URL') }}"
                      name="about_video_url" value="{{ $home_setting->about_video_url }}">
                    <p id="errabout_video_url" class="mb-0 text-danger em"></p>
                  </div>
                @endif
              </form>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-12 text-center">
              <button type="submit" id="submitBtn" class="btn btn-success">
                {{ __('Update') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
@endsection


@section('scripts')
  <script src="{{ asset('assets/admin/js/home-sections.js') }}"></script>
@endsection
