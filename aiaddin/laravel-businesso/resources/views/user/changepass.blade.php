@extends('user.layout')

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Password') }}</h4>
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
        <a href="#">{{ __('Profile_Settings') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Password') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <form action="{{ route('user.updatePassword') }}" method="post" role="form">
          <div class="card-header">
            <div class="card-title">{{ __('Update_Password') }}</div>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-lg-6 offset-lg-3">
                {{ csrf_field() }}
                <div class="form-body">
                  <div class="form-group">
                    <label>{{ __('Current_Password') }}</label>
                    <div class="">
                      <input class="form-control" name="old_password" placeholder="{{ __('Your_Current_Password') }}"
                        type="password">
                      @if ($errors->has('old_password'))
                        <span class="text-danger">
                          {{ $errors->first('old_password') }}
                        </span>
                      @else
                        @if ($errors->first('oldPassMatch'))
                          <span class="text-danger">
                            {{ __('Old_password_does_not_match_with_the_existing_password') }}
                          </span>
                        @endif
                      @endif
                    </div>
                  </div>
                  <div class="form-group">
                    <label>{{ __('New_Password') }}</label>
                    <div class="">
                      <input class="form-control" name="password" placeholder="{{ __('New_Password') }}" type="password">
                      @if ($errors->has('password'))
                        <span class="text-danger">
                          {{ $errors->first('password') }}
                        </span>
                      @endif
                    </div>
                  </div>
                  <div class="form-group">
                    <label>{{ __('New_Password_Again') }}</label>
                    <div class="">
                      <input class="form-control" name="password_confirmation"
                        placeholder="{{ __('New_Password_Again') }}" type="password">
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <div class="row">
              <div class="col-md-12 text-center">
                <button type="submit" class="btn btn-success">{{ __('Update') }}</button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>

@endsection
