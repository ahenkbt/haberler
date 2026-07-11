@php
  $user = Auth::guard('web')->user();
  $userLanguages = \App\Models\User\Language::where('user_id', $user->id)->get();
@endphp

@if (Session::has('currentLangCode'))
  @php
    $default = \App\Models\User\Language::where('code', Session::get('currentLangCode'))
        ->where('user_id', $user->id)
        ->first();
  @endphp
@else
  @php
    $default = \App\Models\User\Language::where('is_default', 1)->where('user_id', $user->id)->first();
  @endphp
@endif
<div class="main-header">
  <!-- Logo Header -->
  <div class="logo-header" @if (request()->cookie('user-theme') == 'dark') data-background-color="dark2" @endif>
    <a href="{{ route('front.index') }}" class="logo" target="_blank">
      @if (!empty($userBs->logo))
        <img src="{{ !empty($userBs->logo) ? asset('assets/front/img/user/' . $userBs->logo) : 'logo' }}" alt="LOGO"
          class="navbar-brand">
      @else
        {{ __('logo') }}
      @endif
    </a>
    <button class="navbar-toggler sidenav-toggler ml-auto" type="button" data-toggle="collapse" data-target="collapse"
      aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon">
        <i class="icon-menu"></i>
      </span>
    </button>
    <button class="topbar-toggler more"><i class="icon-options-vertical"></i></button>
    <div class="nav-toggle">
      <button class="btn btn-toggle toggle-sidebar">
        <i class="icon-menu"></i>
      </button>
    </div>
  </div>
  <!-- End Logo Header -->
  <!-- Navbar Header -->

  <nav class="navbar navbar-header navbar-expand-lg"
    @if (request()->cookie('user-theme') == 'dark') data-background-color="dark" @endif>
    <div class="container-fluid">
      <ul class="navbar-nav topbar-nav ml-md-auto align-items-center">
        {{-- <li>
          @if (!empty($userLangs) && count($userLangs) > 1)
            <select name="adminLanguage" class="form-control language-select"
              onchange="window.location='{{ route('user.change.language') . '?language=' }}'+this.value">
              @foreach ($userLangs as $a__lang)
                <option value="{{ $a__lang->code }}"
                  {{ $a__lang->code == request()->input('language') ? 'selected' : '' }}>
                  {{ $a__lang->name }}
                </option>
              @endforeach
            </select>
          @endif
        </li> --}}
        <form action="{{ route('user.theme.change') }}" class="mr-4 form-inline" id="adminThemeForm">
          <div class="form-group">
            <div class="selectgroup selectgroup-secondary selectgroup-pills">
              <label class="selectgroup-item">
                <input type="radio" name="theme" value="light" class="selectgroup-input"
                  {{ empty(request()->cookie('user-theme')) || request()->cookie('user-theme') == 'light' ? 'checked' : '' }}
                  onchange="document.getElementById('adminThemeForm').submit();">
                <span class="selectgroup-button selectgroup-button-icon"><i class="fa fa-sun"></i></span>
              </label>
              <label class="selectgroup-item">
                <input type="radio" name="theme" value="dark" class="selectgroup-input"
                  {{ request()->cookie('user-theme') == 'dark' ? 'checked' : '' }}
                  onchange="document.getElementById('adminThemeForm').submit();">
                <span class="selectgroup-button selectgroup-button-icon"><i class="fa fa-moon"></i></span>
              </label>
            </div>
          </div>
        </form>
        <li>
        <li class="mr-4">
          <a class="btn btn-primary btn-sm btn-round" target="_blank"
            href="{{ route('front.user.detail.view', Auth::user()->username) }}" title="View Website">
            <i class="fas fa-eye"></i>
          </a>
        </li>
        </li>


        <li class="d-flex mr-4">
          <label class="switch">
            <input type="checkbox" name="online_status" id="toggle-btn" data-toggle="toggle" data-on="1"
              data-off="0" @if (Auth::user()->online_status == 1) checked @endif>
            <span class="slider round"></span>
          </label>
          @if (Auth::user()->online_status == 1)
            <h5 class="mt-2 ml-2 @if (request()->cookie('user-theme') == 'dark') text-white @endif">
              {{ __('Active') }}
            </h5>
          @else
            <h5 class="mt-2 ml-2 @if (request()->cookie('user-theme') == 'dark') text-white @endif">
              {{ __('Deactive') }}
            </h5>
          @endif
        </li>
        <li class="nav-item dropdown hidden-caret">
          <a class="dropdown-toggle profile-pic" data-toggle="dropdown" href="#" aria-expanded="false">
            <div class="avatar-sm">
              @if (!empty(Auth::user()->photo))
                <img src="{{ asset('assets/front/img/user/' . Auth::user()->photo) }}" alt="..."
                  class="avatar-img rounded-circle">
              @else
                <img src="{{ asset('assets/admin/img/propics/blank_user.jpg') }}" alt="..."
                  class="avatar-img rounded-circle">
              @endif
            </div>
          </a>
          <ul class="dropdown-menu dropdown-user animated fadeIn">
            <div class="dropdown-user-scroll scrollbar-outer">
              <li>
                <div class="user-box">
                  <div class="avatar-lg">
                    @if (!empty(Auth::user()->photo))
                      <img src="{{ asset('assets/front/img/user/' . Auth::user()->photo) }}" alt="..."
                        class="avatar-img rounded">
                    @else
                      <img src="{{ asset('assets/admin/img/propics/blank_user.jpg') }}" alt="..."
                        class="avatar-img rounded">
                    @endif
                  </div>
                  <div class="u-text">
                    <h4>{{ Auth::user()->first_name }} {{ Auth::user()->last_name }}</h4>
                    <p class="text-muted">{{ Auth::user()->email }}</p>
                    <a href="{{ route('user-profile-update') }}"
                      class="btn btn-xs btn-secondary btn-sm">{{ __('Edit_Profile') }}</a>
                  </div>
                </div>
              </li>
              <li>
                <div class="dropdown-divider"></div>
                <a class="dropdown-item" href="{{ route('user-profile-update') }}">{{ __('Edit_Profile') }}</a>
                <div class="dropdown-divider"></div>
                <a class="dropdown-item" href="{{ route('user.changePass') }}">{{ __('Change_Password') }}</a>
                <div class="dropdown-divider"></div>
                <a class="dropdown-item" href="{{ route('user-logout') }}">{{ __('Logout') }}</a>
              </li>
            </div>
          </ul>
        </li>
      </ul>
    </div>
  </nav>
  <!-- End Navbar -->
</div>
