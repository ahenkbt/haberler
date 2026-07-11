@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Change_Password'] ?? __('Change password') }}
@endsection

@section('page-name')
  {{ $keywords['Change_Password'] ?? __('Change Password') }}
@endsection
@section('br-name')
  {{ $keywords['Change_Password'] ?? __('Change Password') }}
@endsection
@section('content')
  <section class="user-dashbord pt-100 pb-60">
    <div class="container">
      <div class="row">
        @includeIf('user-front.customer.side-navbar')
        <div class="col-lg-9">
          <div class="row mb-5">
            <div class="col-lg-12">
              <div class="user-profile-details mb-40">
                <div class="account-info">
                  <div class="title mb-3">
                    <h4>{{ $keywords['Change_Password'] ?? __('Change Password') }}</h4>
                  </div>
                  <div class="edit-info-area">
                    <form action="{{ route('customer.update_password', getParam()) }}" method="POST">
                      @csrf
                      <div class="row">
                        <div class="col-lg-12 mb-3">
                          <input type="password" class="form_control"
                            placeholder="{{ $keywords['Current_Password'] ?? __('Current Password') }}"
                            name="current_password">
                          @error('current_password')
                            <p class="mb-3 text-danger">{{ $message }}</p>
                          @enderror
                        </div>
                      </div>
                      <div class="row">
                        <div class="col-lg-12 mb-3">
                          <input type="password" class="form_control"
                            placeholder="{{ $keywords['New_Password'] ?? __('New Password') }}" name="new_password">
                          @error('new_password')
                            <p class="mb-3 text-danger">{{ $message }}</p>
                          @enderror
                        </div>
                      </div>
                      <div class="row">
                        <div class="col-lg-12 mb-3">
                          <input type="password" class="form_control"
                            placeholder="{{ $keywords['Confirm_New_Password'] ?? __('Confirm New Password') }}"
                            name="new_password_confirmation">
                          @error('new_password_confirmation')
                            <p class="mb-3 text-danger">{{ $message }}</p>
                          @enderror
                        </div>
                      </div>
                      <div class="row">
                        <div class="col-lg-12">
                          <div class="form-button">
                            <button class="btn btn-form">{{ $keywords['Submit'] ?? __('Save Change') }}</button>
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
  </section>
@endsection
