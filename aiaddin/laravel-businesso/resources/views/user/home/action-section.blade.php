@extends('user.layout')

{{-- this style will be applied when the direction of language is right-to-left --}}
@includeIf('user.partials.rtl-style')

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Action Section') }}</h4>
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
        <a href="#">{{ __('Action Section') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-10">
              <div class="card-title">{{ __('Update Action Section') }}</div>
            </div>

            <div class="col-lg-2">
              @includeIf('user.partials.languages')
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="row">
            <div class="col-lg-8 offset-lg-2">
              <form id="ajaxForm"
                action="{{ route('user.home_page.update_action_section', ['language' => request()->input('language')]) }}"
                method="POST" enctype="multipart/form-data">
                @csrf
                <div class="row">
                  <div class="col-lg-12">
                    <div class="form-group">
                      <div class="col-12 mb-2">
                        <label for="image"><strong>{{ __('Background Image') . '*' }}</strong></label>
                      </div>
                      <div class="col-md-12 showImage mb-3">
                        <img
                          src="{{ isset($data->background_image) ? asset(\App\Constants\Constant::WEBSITE_ACTION_SECTION_IMAGE . '/' . $data->background_image) : asset('assets/admin/img/noimage.jpg') }}"
                          alt="..." class="img-thumbnail">
                      </div>
                      <input type="file" name="background_image" id="image" class="form-control">
                      <p id="errbackground_image" class="mt-2 mb-0 text-danger em"></p>
                      <p class="text-warning mb-0">
                        {{ __('Upload 1920 X 540 image for best quality') }}</p>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('First Title') }}</label>
                      <input type="text" class="form-control" name="first_title"
                        value="{{ empty($data->first_title) ? '' : $data->first_title }}"
                        placeholder="{{ __('Enter First Title') }}">
                      <p id="errfirst_title" class="mt-2 mb-0 text-danger em"></p>
                    </div>
                  </div>

                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Second Title') }}</label>
                      <input type="text" class="form-control" name="second_title"
                        value="{{ empty($data->second_title) ? '' : $data->second_title }}"
                        placeholder="{{ __('Enter Second Title') }}">
                      <p id="errsecond_title" class="mt-2 mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('First Button') }}</label>
                      <input type="text" class="form-control" name="first_button"
                        value="{{ empty($data->first_button) ? '' : $data->first_button }}"
                        placeholder="{{ __('Enter First Button Name') }}">
                      <p id="errfirst_button" class="mt-2 mb-0 text-danger em"></p>
                    </div>
                  </div>

                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('First Button URL') }}</label>
                      <input type="url" class="form-control" name="first_button_url"
                        value="{{ empty($data->first_button_url) ? '' : $data->first_button_url }}"
                        placeholder="{{ __('Enter First Button URL') }}">
                      <p id="errfirst_button_url" class="mt-2 mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Second Button') }}</label>
                      <input type="text" class="form-control" name="second_button"
                        value="{{ empty($data->second_button) ? '' : $data->second_button }}"
                        placeholder="{{ __('Enter Second Button Name') }}">
                      <p id="errsecond_button" class="mt-2 mb-0 text-danger em"></p>
                    </div>
                  </div>

                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Second Button URL') }}</label>
                      <input type="url" class="form-control" name="second_button_url"
                        value="{{ empty($data->second_button_url) ? '' : $data->second_button_url }}"
                        placeholder="{{ __('Enter Second Button URL') }}">
                      <p id="errsecond_button_url" class="mt-2 mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>

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
