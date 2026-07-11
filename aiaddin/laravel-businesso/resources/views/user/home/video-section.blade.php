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
    <h4 class="page-title">{{ __('Video_Section') }}</h4>
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
        <a href="#">{{ __('Video_Section') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row justify-content-between">
            <div class="col-lg-4">
              <div class="card-title">{{ __('Update_Video_Section') }}</div>
            </div>
            <div class=" col-lg-3">
              @if (!is_null($userDefaultLang))
                @if (!empty($userLanguages))
                  <select name="userLanguage" class="form-control"
                    onchange="window.location='{{ url()->current() . '?language=' }}'+this.value">
                    <option value="" selected disabled>{{ __('Select a Language') }}</option>
                    @foreach ($userLanguages as $lang)
                      <option value="{{ $lang->code }}"
                        {{ $lang->code == request()->input('language') ? 'selected' : '' }}>
                        {{ $lang->name }}
                      </option>
                    @endforeach
                  </select>
                @endif
              @endif
            </div>

          </div>
        </div>

        <div class="card-body pt-5 pb-5">
          <div class="row">
            <div class="col-lg-6 offset-lg-3">
              <form id="videoSecForm"
                action="{{ route('user.home.page.update.video', ['language' => request()->input('language')]) }}"
                method="POST" enctype="multipart/form-data">
                @csrf

                <div class="form-group">
                  <div class="col-12 mb-2">
                    <label for="image"><strong>{{ __('Background_Image') }} **</strong></label>
                  </div>
                  <div class="col-md-12 showImage mb-3">
                    <img
                      src="{{ isset($data->video_section_image) ? asset('assets/front/img/user/home_settings/' . $data->video_section_image) : asset('assets/admin/img/noimage.jpg') }}"
                      alt="..." class="img-thumbnail">
                  </div>
                  <input type="file" name="video_section_image" id="image" class="form-control image">
                  @if ($errors->has('video_section_image'))
                    <div class="error text-danger">{{ $errors->first('video_section_image') }}
                    </div>
                  @endif
                </div>

                @if ($userBs->theme != 'home_ten' && $userBs->theme != 'home_five' && $userBs->theme != 'home_four')
                  <div class="form-group">
                    <label for="">{{ __('Video_Section_Title') }}</label>
                    <input type="text" class="form-control" name="video_section_title"
                      placeholder="{{ __('Enter_title') }}"
                      value="{{ $data->video_section_title ?? old('video_section_title') }}">
                    @if ($errors->has('video_section_title'))
                      <p class="mt-2 mb-0 text-danger">{{ $errors->first('video_section_title') }}
                      </p>
                    @endif
                  </div>
                @endif
                @if ($userBs->theme != 'home_ten' && $userBs->theme != 'home_five' && $userBs->theme != 'home_four')

                  @if ($userBs->theme != 'home_two')
                    @if ($userBs->theme != 'home_seven')
                      <div class="form-group">
                        <label for="">{{ __('Video_Section_Subtitle') }}</label>
                        <input type="text" class="form-control" name="video_section_subtitle"
                          placeholder="{{ __('Enter subtitle') }}"
                          value="{{ $data->video_section_subtitle ?? old('video_section_subtitle') }}">
                        @if ($errors->has('video_section_subtitle'))
                          <p class="mt-2 mb-0 text-danger">
                            {{ $errors->first('video_section_subtitle') }}</p>
                        @endif
                      </div>
                    @endif
                    @if ($userBs->theme != 'home_nine' && $userBs->theme != 'home_one')
                      <div class="form-group">
                        <label for="">{{ __('Video_Section_Text') }}</label>
                        <textarea class="form-control" name="video_section_text" placeholder="{{ __('Enter text') }}" rows="3"
                          cols="80">{{ $data->video_section_text ?? old('video_section_text') }}</textarea>
                        @if ($errors->has('video_section_text'))
                          <p class="mt-2 mb-0 text-danger">
                            {{ $errors->first('video_section_text') }}
                          </p>
                        @endif
                      </div>
                    @endif
                    @if ($userBs->theme != 'home_seven')
                      <div class="form-group">
                        <label for="">{{ __('Video_Section_Button_Text') }}</label>
                        <input type="text" class="form-control" name="video_section_button_text"
                          placeholder="{{ __('Enter button text') }}"
                          value="{{ $data->video_section_button_text ?? old('video_section_button_text') }}">
                        @if ($errors->has('video_section_button_text'))
                          <p class="mt-2 mb-0 text-danger">
                            {{ $errors->first('video_section_button_text') }}</p>
                        @endif
                      </div>
                    @endif
                    @if ($userBs->theme != 'home_seven')
                      <div class="form-group">
                        <label for="">{{ __('Video_Section_Button_URL') }}</label>
                        <input type="text" class="form-control" name="video_section_button_url"
                          placeholder="{{ __('Enter button url') }}"
                          value="{{ $data->video_section_button_url ?? old('video_section_button_url') }}">
                        @if ($errors->has('video_section_button_url'))
                          <p class="mt-2 mb-0 text-danger">
                            {{ $errors->first('video_section_button_url') }}</p>
                        @endif
                      </div>
                    @endif
                  @endif
                @endif
                <div class="form-group">
                  <label for="">{{ __('Video_URL') }}</label>
                  <input type="text" class="form-control" name="video_section_url"
                    placeholder="{{ __('Enter video url') }}"
                    value="{{ $data->video_section_url ?? old('video_section_url') }}">
                  @if ($errors->has('video_section_url'))
                    <p class="mt-2 mb-0 text-danger">{{ $errors->first('video_section_url') }}
                    </p>
                  @endif
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-12 text-center">
              <button type="submit" form="videoSecForm" class="btn btn-success">
                {{ __('Update') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
@endsection
