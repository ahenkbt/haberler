@extends('user.layout')
@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Offer Banner') }}</h4>
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
        <a href="#">{{ __('Offer Banner') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <form id="ajaxEditForm" action="{{ route('user.offerBanner.update') }}" enctype="multipart/form-data"
          method="post">
          <div class="card-header">
            <div class="card-title d-inline-block">{{ __('Edit Offer Banner') }}</div>
            <a class="btn btn-info btn-sm float-right d-inline-block"
              href="{{ route('user.offerBanner.index') . '?language=' . request()->input('language') }}">
              <span class="btn-label">
                <i class="fas fa-backward"></i>
              </span>
              {{ __('Back') }}
            </a>
          </div>
          <div class="card-body pt-5 pb-5">
            <div class="row">
              <div class="col-lg-6 offset-lg-3">
                @csrf
                <input type="hidden" name="offer_id" value="{{ $offer->id }}">
                <div class="form-group">
                  <div class="col-12 mb-2">
                    <label for="image"><strong>{{ __('Image') }} **</strong></label>
                  </div>
                  <div class="col-md-12 showImage mb-3">
                    <img
                      src="{{ $offer->image ? url('assets/front/img/user/offers/' . $offer->image) : asset('assets/admin/img/noimage.jpg') }}"
                      alt="..." class="img-thumbnail">
                  </div>
                  <input type="file" name="image" id="image" class="form-control">
                  <p id="erricon" class="mb-0 text-danger em"></p>
                </div>
                <div class="form-group">
                  <label for="">{{ __('Text 1') }}@if (!$userBs->theme == 'home_fourteen')
                      **
                    @endif
                  </label>
                  <input class="form-control" name="text_1" value="{{ $offer->text_1 }}"
                    placeholder="{{ __('Enter Text 1') }}">
                  <p id="errtext_1" class="mb-0 text-danger em"></p>
                </div>
                <div class="form-group">
                  <label for="">{{ __('Text 2') }} @if (!$userBs->theme == 'home_fourteen')
                      **
                    @endif
                  </label>
                  <input class="form-control" name="text_2" value="{{ $offer->text_2 }}"
                    placeholder="{{ __('Enter Text 2') }}">
                  <p id="errtext_2" class="mb-0 text-danger em"></p>
                </div>
                @if (!$userBs->theme == 'home_fourteen')
                  <div class="form-group">
                    <label for="">{{ __('Text 3') }} **</label>
                    <input class="form-control" name="text_3" value="{{ $offer->text_3 }}"
                      placeholder="{{ __('Enter Text 3') }}">
                    <p id="errtext_3" class="mb-0 text-danger em"></p>
                  </div>
                @endif
                @if ($userBs->theme == 'home_fourteen')
                  <div class="form-group">
                    <label for="">{{ __('Button Name') }} **</label>
                    <input class="form-control" type="btn_name" name="btn_name" value="{{ $offer->btn_name }}"
                      placeholder="{{ __('Enter url') }}">
                    <p id="errbtn_name" class="mb-0 text-danger em"></p>
                  </div>
                @endif
                <div class="form-group">
                  <label for="">{{ __('Url') }} **</label>
                  <input class="form-control" type="url" name="url" value="{{ $offer->url }}"
                    placeholder="{{ __('Enter url') }}">
                  <p id="errurl" class="mb-0 text-danger em"></p>
                </div>
                <div class="form-group">
                  <label for="">{{ __('Position') }} **</label>
                  <select name="position" id="" class="form-control">
                    <option {{ $offer->position == 'top' ? 'selected' : '' }} value="top">{{ __('Top') }}
                    </option>
                    <option {{ $offer->position == 'bottom' ? 'selected' : '' }} value="bottom">
                      {{ __('Bottom') }}</option>
                    @if (!$userBs->theme == 'home_fourteen')
                      <option {{ $offer->position == 'left' ? 'selected' : '' }} value="left">
                        {{ __('Left') }}</option>
                    @endif
                  </select>
                  <p id="errposition" class="mb-0 text-danger em"></p>
                </div>
              </div>
            </div>
          </div>
          <div class="card-footer pt-3">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-12 text-center">
                  <button id="updateBtn" type="submit" class="btn btn-success">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
@endsection
