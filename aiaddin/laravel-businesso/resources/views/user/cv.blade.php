@extends('user.layout')

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('CV_Upload') }}</h4>
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
        <a href="">{{ __('CV_Upload') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="card-title">{{ __('Update_CV_Upload') }}</div>
        </div>
        <div class="card-body pt-5 pb-4">
          <div class="row">
            <div class="col-lg-6 offset-lg-3">

              <div class="row">
                <div class="col-lg-12">
                  @if (isset($basic_setting->cv))
                    <div class="form-group">
                      <a class="btn btn-primary btn-sm"
                        href="{{ asset('assets/front/img/user/cv/' . $basic_setting->cv) }}" target="_blank"
                        download="{{ Auth::guard('web')->user()->username }}.pdf">
                        <i class="fas fa-download"></i>
                        &nbsp;&nbsp;
                        <span>{{ 'Download' }}</span>
                      </a>
                      <span class="ml-2">
                        <strong>{{ $basic_setting->cv_original }}</strong>
                        <form class="d-inline-block" action="{{ route('user.cv.upload.delete') }}" method="POST">
                          @csrf
                          <button type="submit" class="btn btn-danger text-white btn-sm ml-2"><i
                              class="far fa-times"></i></button>
                        </form>
                      </span>
                    </div>
                  @endif
                  <form action="{{ route('user.cv.upload.update') }}" method="POST" enctype="multipart/form-data">
                    @csrf
                    <div class="form-group">
                      <div class="col-12 mb-2">
                        <label for="image"><strong>{{ __('CV_Upload') }}*</strong></label>
                      </div>
                      <input type="file" name="cv" class="form-control" required>
                      @error('cv')
                        <p id="errcv" class="mb-0 text-danger em">{{ $message }}</p>
                      @enderror
                    </div>
                    <div class="card-footer">
                      <div class="form">
                        <div class="form-group from-show-notify row">
                          <div class="col-12 text-center">
                            <button type="submit" class=" btn btn-success">{{ __('Update') }}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
@endsection
