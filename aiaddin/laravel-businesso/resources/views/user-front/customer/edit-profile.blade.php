@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['edit_profile'] ?? __('Edit profile') }}
@endsection

@section('page-name')
  {{ $keywords['edit_profile'] ?? __('Edit profile') }}
@endsection
@section('br-name')
  {{ $keywords['edit_profile'] ?? __('Edit profile') }}
@endsection

@section('content')
  <!--====== Start User Edit-Profile Section  ======-->
  <section class="user-dashbord pt-100 pb-60">
    <div class="container">
      <div class="row">
        @includeIf('user-front.customer.side-navbar')
        <div class="col-lg-9">
          <div class="profile-edit account-info mb-40">
            <div class="profile-sidebar-title">
              <h4 class="title mb-2">{{ $keywords['edit_profile'] ?? __('Edit Profile') }}
              </h4>
            </div>
            <div class="profile-form">
              <form action="{{ route('customer.update_profile', getParam()) }}" method="POST"
                enctype="multipart/form-data">
                @csrf
                <div class="row">

                  <div class="col-md-12">
                    <div class="single-form mb-3">
                      <div class="col-md-12 showImage mb-3">
                        <img
                          data-src="{{ is_null($authUser->image) ? asset('assets/front/img/noimage.jpg') : asset('assets/user/img/users/' . $authUser->image) }}"
                          alt="user image" class="user-photo lazy">
                      </div>
                      <div class="custom-file mt-3">
                        <input type="file" accept=".jpg, .jpeg, .png" name="image" id="image" class="input-file">
                        <label for="image" class="js-labelFile">
                          <span class="js-fileName"><i class="fal fa-cloud-upload"></i>
                            {{ $keywords['choose_photo'] ?? __('Choose a photo') }}
                          </span>
                        </label>
                        @error('image')
                          <p class="mb-3 text-danger">{{ $message }}</p>
                        @enderror
                      </div>
                    </div>
                  </div>

                  <div class="col-md-6">
                    <div class="single-form mb-3">
                      <label>{{ $keywords['first_name'] ?? __('First Name') }}</label>
                      <input type="text" class="form_control"
                        placeholder="{{ $keywords['first_name'] ?? __('First Name') }}" name="first_name"
                        value="{{ $authUser->first_name }}">
                      @error('first_name')
                        <p class="mb-3 text-danger">{{ $message }}</p>
                      @enderror
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="single-form mb-3">
                      <label>{{ $keywords['last_name'] ?? __('Last Name') }}</label>
                      <input type="text" class="form_control"
                        placeholder="{{ $keywords['last_name'] ?? __('Last Name') }}" name="last_name"
                        value="{{ $authUser->last_name }}">
                      @error('last_name')
                        <p class="mb-3 text-danger">{{ $message }}</p>
                      @enderror
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="single-form mb-3">
                      <label>{{ $keywords['email'] ?? __('Email') }}</label>
                      <input type="email" class="form_control" placeholder="{{ $keywords['email'] ?? __('Email') }}"
                        value="{{ $authUser->email }}" readonly>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="single-form mb-3">
                      <label>{{ $keywords['phone'] ?? __('Phone') }}</label>
                      <input type="text" class="form_control" placeholder="{{ $keywords['phone'] ?? __('Phone') }}"
                        name="contact_number" value="{{ $authUser->contact_number }}">
                      @error('contact_number')
                        <p class="mb-3 text-danger">{{ $message }}</p>
                      @enderror
                    </div>
                  </div>
                  <div class="col-md-12">
                    <div class="single-form mb-3">
                      <label>{{ $keywords['address'] ?? __('Address') }}</label>
                      <textarea class="form_control" placeholder="{{ $keywords['address'] ?? __('Address') }}" name="address">{{ $authUser->address }}</textarea>
                      @error('address')
                        <p class="mb-3 text-danger">{{ $message }}</p>
                      @enderror
                    </div>
                  </div>
                  <div class="col-md-12">
                    <div class="single-form">
                      <button class="btn btn-form">{{ $keywords['Update_profile'] ?? 'Update profile' }}</button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <!--======  End User Edit-Profile Section  ======-->
@endsection
