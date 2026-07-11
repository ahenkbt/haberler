@extends('user.layout')

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Settings') }}</h4>
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
        <a href="#">{{ __('Gallery_Management') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Settings') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">
                {{ __('Gallery_Settings') }}</div>
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="row">
            <div class="col-lg-6 offset-lg-3">
              <form id="settingsForm" action="{{ route('user.gallery_management.update_settings') }}" method="POST"
                enctype="multipart/form-data">
                @csrf
                @if ($userBs->theme == 'home_thirteen')
                  <div class="row">
                    <div class="col-lg-12">
                      <div class="form-group">
                        <div class="col-12 mb-2">
                          <label for="image"><strong>{{ __('Image') }}</strong></label>
                        </div>
                        <div class="col-md-12 showImage mb-3">
                          <img
                            src="{{ $data->gallery_bg ? asset('assets/front/img/user/gallery/bg/' . $data->gallery_bg) : asset('assets/admin/img/noimage.jpg') }}"
                            alt="..." class="img-thumbnail">
                        </div>
                        <input type="file" name="gallery_bg" id="image" class="form-control">
                        <p id="errimage" class="mb-0 text-danger em"></p>
                      </div>
                    </div>
                  </div>
                @endif
                <div class="form-group mt-3">
                  <label>{{ __('Category_Status') . '*' }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="gallery_category_status" value="1" class="selectgroup-input"
                        {{ $data->gallery_category_status == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>

                    <label class="selectgroup-item">
                      <input type="radio" name="gallery_category_status" value="0" class="selectgroup-input"
                        {{ $data->gallery_category_status == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                  @if ($errors->has('gallery_category_status'))
                    <p class="mt-2 mb-0 text-danger">{{ $errors->first('gallery_category_status') }}
                    </p>
                  @endif

                  <p class="mt-2 mb-0 text-warning">
                    {{ __('Specify whether the gallery category will be active or not.') }}
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-12 text-center">
              <button type="submit" form="settingsForm" class="btn btn-success">
                {{ __('Update') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
@endsection
