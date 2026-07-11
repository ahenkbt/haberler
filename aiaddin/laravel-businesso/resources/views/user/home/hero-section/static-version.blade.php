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
    <h4 class="page-title">{{ __('Static Version') }}</h4>
    <ul class="breadcrumbs">
      <li class="nav-home">
        <a href="{{ route('user-dashboard') }}">
          <i class="flaticon-home"></i>
        </a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Home Page') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Hero Section') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Static Version') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-10">
              <div class="card-title">{{ __('Update Static Version') }}</div>
            </div>
            <div class="col-lg-2">
              @includeIf('user.partials.languages')
            </div>
          </div>
        </div>
        @if ($userBs->theme != 'home_fourteen')
          <div class="card-body pt-5 pb-5">
            <div class="row">
              <div class="col-lg-6 offset-lg-3">
                <form id="staticVersionForm"
                  action="{{ route('user.home_page.hero.update_static_info', ['language' => request()->input('language')]) }}"
                  method="POST" enctype="multipart/form-data">
                  @csrf

                  <div class="form-group">
                    <div class="col-12 mb-2">
                      <label for="">{{ __('Image') }} *</label>
                    </div>
                    <div class="col-md-12 showImage mb-3">
                      <img
                        src="{{ isset($data->img) ? asset('assets/front/img/hero_static/' . $data->img) : asset('assets/admin/img/noimage.jpg') }}"
                        alt="..." class="img-thumbnail">
                    </div>
                    <input type="file" name="img" id="image" class="form-control image">
                    @if ($errors->has('img'))
                      <p class="mt-2 mb-0 text-danger">{{ $errors->first('img') }}</p>
                    @endif
                  </div>

                  <div class="row">
                    <div class="col-lg-12">
                      <div class="form-group">
                        <label for="">
                          @if ($userBs->theme == 'home_twelve')
                            {{ __('Name') }} *
                          @else
                            {{ __('Title') }} *
                          @endif
                        </label>
                        <input type="text" class="form-control" name="title" value="{{ $data->title ?? '' }}"
                          placeholder="{{ __('Enter title') }}">
                        @if ($errors->has('title'))
                          <p class="mt-2 mb-0 text-danger">{{ $errors->first('title') }}</p>
                        @endif
                      </div>
                    </div>
                  </div>
                  @if ($userBs->theme == 'home_twelve')
                    <div class="form-group">
                      <label for="">{{ __('Designation') }} </label>
                      <input type="text" class="form-control" name="designation"
                        value="{{ $data->designation ?? '' }}" data-role="tagsinput">
                      <small class="text-warning">{{ __('Use comma (,) to separate the designation') }}</small>

                    </div>
                  @endif
                  @if ($userBs->theme !== 'home_twelve')
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group">
                          <label for="">{{ __('Subtitle') }} *</label>
                          <input type="text" class="form-control" name="subtitle" value="{{ $data->subtitle ?? '' }}"
                            placeholder="{{ __('Enter subtitle') }}">
                          @if ($errors->has('subtitle'))
                            <p class="mt-2 mb-0 text-danger">{{ $errors->first('subtitle') }}</p>
                          @endif
                        </div>
                      </div>
                    </div>
                  @endif
                  @if ($userBs->theme == 'home_four' || $userBs->theme == 'home_five' || $userBs->theme == 'home_eleven')
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group">
                          <label for="">{{ __('Hero text') }} * </label>
                          <textarea class="form-control" name="hero_text" placeholder="{{ __('Enter text') }}">{{ $data->hero_text ?? '' }}</textarea>
                          @if ($errors->has('hero_text'))
                            <p class="mt-2 mb-0 text-danger">{{ $errors->first('hero_text') }}
                            </p>
                          @endif
                        </div>
                      </div>
                    </div>
                  @endif
                  <div class="row">
                    <div class="col-lg-12">
                      <div class="form-group">
                        <label for="btn_name">{{ __('Button Name') }}</label>
                        <input type="text" class="form-control" name="btn_name" value="{{ $data->btn_name ?? '' }}"
                          placeholder="{{ __('Enter button name') }}">
                        @if ($errors->has('btn_name'))
                          <p class="mt-2 mb-0 text-danger">{{ $errors->first('btn_name') }}</p>
                        @endif
                      </div>
                    </div>
                  </div>



                  <div class="form-group">
                    <label for="url">{{ __('Button URL') }}</label>
                    <input type="url" class="form-control" name="btn_url" value="{{ $data->btn_url ?? '' }}"
                      placeholder="{{ __('Enter button url') }}">
                    @if ($errors->has('btn_url'))
                      <p class="mt-2 mb-0 text-danger">{{ $errors->first('btn_url') }}</p>
                    @endif
                  </div>

                  @if ($userBs->theme == 'home_ten')
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group">
                          <label for="btn_name">{{ __('Second Button Name') }}</label>
                          <input type="text" class="form-control" name="secound_btn_name"
                            value="{{ $data->secound_btn_name ?? '' }}" placeholder="{{ __('Enter button name') }}">
                          @if ($errors->has('secound_btn_name'))
                            <p class="mt-2 mb-0 text-danger">
                              {{ $errors->first('secound_btn_name') }}</p>
                          @endif
                        </div>
                      </div>
                    </div>
                    <div class="form-group">
                      <label for="url">{{ __('Second Button URL') }}</label>
                      <input type="url" class="form-control" name="secound_btn_url"
                        value="{{ $data->secound_btn_url ?? '' }}" placeholder="{{ __('Enter button url') }}">
                      @if ($errors->has('secound_btn_url'))
                        <p class="mt-2 mb-0 text-danger">{{ $errors->first('secound_btn_url') }}
                        </p>
                      @endif
                    </div>
                  @endif
                  @if ($userBs->theme == 'home_eleven')
                    <div class="form-group">
                      <label for="btn_name">{{ __('Video Button Name') }}</label>
                      <input type="text" class="form-control" name="secound_btn_name"
                        value="{{ $data->secound_btn_name ?? '' }}" placeholder="{{ __('Enter button name') }}">
                      @if ($errors->has('secound_btn_name'))
                        <p class="mt-2 mb-0 text-danger">
                          {{ $errors->first('secound_btn_name') }}</p>
                      @endif
                    </div>
                    <div class="form-group">
                      <label for="url">{{ __('Video URL') }}</label>
                      <input type="url" class="form-control" name="secound_btn_url"
                        value="{{ $data->secound_btn_url ?? '' }}" placeholder="{{ __('Enter button url') }}">
                      @if ($errors->has('secound_btn_url'))
                        <p class="mt-2 mb-0 text-danger">{{ $errors->first('secound_btn_url') }}
                        </p>
                      @endif
                    </div>
                  @endif
                </form>
              </div>
            </div>
          </div>
        @endif
        @if ($userBs->theme == 'home_fourteen')
          <form id="staticVersionForm"
            action="{{ route('user.home_page.hero.update_static_info', ['language' => request()->input('language')]) }}"
            method="POST" enctype="multipart/form-data">
            @csrf
            <div class="card-body pt-5 pb-5">
              <div class="row">
                <div class="row col-lg-4">
                  <div class="col-lg-10 offset-lg-1">
                    <div class="form-group">
                      <div class="col-12 mb-2">
                        <label for="">{{ __('Image') }} *</label>
                      </div>
                      <div class="col-md-12 showImage mb-3">
                        <img
                          src="{{ isset($data->img) ? asset('assets/front/img/hero_static/' . $data->img) : asset('assets/admin/img/noimage.jpg') }}"
                          alt="..." class="img-thumbnail">
                      </div>
                      <input type="file" name="img" id="image" class="form-control image">
                      @if ($errors->has('img'))
                        <p class="mt-2 mb-0 text-danger">{{ $errors->first('img') }}</p>
                      @endif
                    </div>

                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group">
                          <label for="">{{ __('Title') }} *</label>
                          <input type="text" class="form-control" name="title" value="{{ $data->title ?? '' }}"
                            placeholder="{{ __('Enter title') }}">
                          @if ($errors->has('title'))
                            <p class="mt-2 mb-0 text-danger">{{ $errors->first('title') }}</p>
                          @endif
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group">
                          <label for="">{{ __('Toper_Subtitle') }}</label>
                          <input type="text" class="form-control" name="toper_subtitle"
                            value="{{ $data->toper_subtitle ?? '' }}" placeholder="{{ __('Enter subtitle') }}">
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group">
                          <label for="">{{ __('Lower_Subtitle') }} </label>
                          <input type="text" class="form-control" name="lower_subtitle"
                            value="{{ $data->lower_subtitle ?? '' }}" placeholder="{{ __('Enter subtitle') }}">
                        </div>
                      </div>
                    </div>

                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group">
                          <label for="btn_name">{{ __('Button Name') }}</label>
                          <input type="text" class="form-control" name="btn_name"
                            value="{{ $data->btn_name ?? '' }}" placeholder="{{ __('Enter button name') }}">
                          @if ($errors->has('btn_name'))
                            <p class="mt-2 mb-0 text-danger">{{ $errors->first('btn_name') }}</p>
                          @endif
                        </div>
                      </div>
                    </div>

                    <div class="form-group">
                      <label for="url">{{ __('Button URL') }}</label>
                      <input type="url" class="form-control" name="btn_url" value="{{ $data->btn_url ?? '' }}"
                        placeholder="{{ __('Enter button url') }}">
                      @if ($errors->has('btn_url'))
                        <p class="mt-2 mb-0 text-danger">{{ $errors->first('btn_url') }}</p>
                      @endif
                    </div>
                  </div>
                </div>
                <div class="row col-lg-4">
                  <div class="col-lg-10 offset-lg-1">

                    <div class="form-group">
                      <div class="col-12 mb-2">
                        <label for="">{{ __('Second_Image') }} *</label>
                      </div>
                      <div class="col-md-12 showImage2 mb-3">
                        <img
                          src="{{ isset($data->img2) ? asset('assets/front/img/hero_static/' . $data->img2) : asset('assets/admin/img/noimage.jpg') }}"
                          alt="..." class="img-thumbnail">
                      </div>
                      <input type="file" name="img2" id="image2" class="form-control image2">
                      @if ($errors->has('img2'))
                        <p class="mt-2 mb-0 text-danger">{{ $errors->first('img2') }}</p>
                      @endif
                    </div>

                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group">
                          <label for=""> {{ __('Second Title') }} </label>
                          <input type="text" class="form-control" name="second_title"
                            value="{{ $data->second_title ?? '' }}" placeholder="{{ __('Enter title') }}">
                          @if ($errors->has('second_title'))
                            <p class="mt-2 mb-0 text-danger">{{ $errors->first('second_title') }}</p>
                          @endif
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group">
                          <label for="">{{ __('Second_Subtitle') }}</label>
                          <input type="text" class="form-control" name="second_subtitle"
                            value="{{ $data->second_subtitle ?? '' }}" placeholder="{{ __('Enter subtitle') }}">
                        </div>
                      </div>
                    </div>

                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group">
                          <label for="btn_name">{{ __('Second Button Name') }}</label>
                          <input type="text" class="form-control" name="secound_btn_name"
                            value="{{ $data->secound_btn_name ?? '' }}" placeholder="{{ __('Enter button name') }}">
                          @if ($errors->has('secound_btn_name'))
                            <p class="mt-2 mb-0 text-danger">
                              {{ $errors->first('secound_btn_name') }}</p>
                          @endif
                        </div>
                      </div>
                    </div>
                    <div class="form-group">
                      <label for="url">{{ __('Second Button URL') }}</label>
                      <input type="url" class="form-control" name="secound_btn_url"
                        value="{{ $data->secound_btn_url ?? '' }}" placeholder="{{ __('Enter button url') }}">
                      @if ($errors->has('secound_btn_url'))
                        <p class="mt-2 mb-0 text-danger">{{ $errors->first('secound_btn_url') }}
                        </p>
                      @endif
                    </div>
                  </div>
                </div>
                <div class="row col-lg-4">
                  <div class="col-lg-10 offset-lg-1">

                    <div class="form-group">
                      <div class="col-12 mb-2">
                        <label for="">{{ __('Third_Image') }} *</label>
                      </div>
                      <div class="col-md-12 showImage3 mb-3">
                        <img
                          src="{{ isset($data->img3) ? asset('assets/front/img/hero_static/' . $data->img3) : asset('assets/admin/img/noimage.jpg') }}"
                          alt="..." class="img-thumbnail">
                      </div>
                      <input type="file" name="img3" id="image3" class="form-control image3">
                      @if ($errors->has('img3'))
                        <p class="mt-2 mb-0 text-danger">{{ $errors->first('img3') }}</p>
                      @endif
                    </div>

                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group">
                          <label for=""> {{ __('Third_Title') }} </label>
                          <input type="text" class="form-control" name="third_title"
                            value="{{ $data->third_title ?? '' }}" placeholder="{{ __('Enter title') }}">
                          @if ($errors->has('third_title'))
                            <p class="mt-2 mb-0 text-danger">{{ $errors->first('third_title') }}</p>
                          @endif
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group">
                          <label for="">{{ __('Third_Subtitle') }} </label>
                          <input type="text" class="form-control" name="third_subtitle"
                            value="{{ $data->third_subtitle ?? '' }}" placeholder="{{ __('Enter subtitle') }}">
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group">
                          <label for="btn_name">{{ __('Third_Button_Name') }}</label>
                          <input type="text" class="form-control" name="third_btn_name"
                            value="{{ $data->third_btn_name ?? '' }}" placeholder="{{ __('Enter button name') }}">
                        </div>
                      </div>
                    </div>
                    <div class="form-group">
                      <label for="url">{{ __('Third_Button_URL') }}</label>
                      <input type="url" class="form-control" name="third_btn_url"
                        value="{{ $data->third_btn_url ?? '' }}" placeholder="{{ __('Enter button url') }}">
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        @endif

        <div class="card-footer">
          <div class="row">
            <div class="col-12 text-center">
              <button type="submit" form="staticVersionForm" class="btn btn-success">
                {{ __('Update') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
@endsection
