<!DOCTYPE html>
<html lang="{{ str_replace('user_', '', app()->getLocale()) }}">

<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <meta content='width=device-width, initial-scale=1.0, shrink-to-fit=no' name='viewport' />
  <title>{{ $bs->website_title }} - {{ __('Dashboard') }}</title>
  <link rel="icon" href="{{ !empty($userBs->favicon) ? asset('assets/front/img/user/' . $userBs->favicon) : '' }}">
  @includeif('user.partials.styles')
  @php
    // Get current dashboard language from session
    $dashboardLang = session('user_dashboard_lang', 'user_en');
    $dashboardLangCode = str_replace('user_', '', $dashboardLang);
    $dashboardDirection = session('dashboard_direction', 0);

  @endphp

  @if ($dashboardDirection == 1)
    <style>
      #editModal form input,
      #editModal form textarea,
      #editModal form select {
        direction: rtl;
      }

      #editModal form .note-editor.note-frame .note-editing-area .note-editable {
        direction: rtl;
        text-align: right;
      }
    </style>
    <!-- RTL Style css -->
    <link rel="stylesheet" href="{{ asset('assets/admin/css/admin-rtl.css') }}">
  @endif


  @if ($dashboardLangCode !== 'ar')
    <style>
      .navbar-expand-lg .navbar-nav .dropdown-menu {
        left: auto;
        right: 0;
      }
    </style>
  @endif

</head>

<body @if (request()->cookie('user-theme') == 'dark') data-background-color="dark" @endif
  data-dashboard-language="{{ $user_dashboard_direction == 1 ? 'rtl' : 'ltr' }}">
  <div class="wrapper">
    {{-- top navbar area start --}}
    @includeif('user.partials.top-navbar')
    {{-- top navbar area end --}}
    {{-- side navbar area start --}}
    @includeif('user.partials.side-navbar')
    {{-- side navbar area end --}}
    <div class="main-panel">
      <div class="content">
        <div class="page-inner">
          @yield('content')
        </div>
      </div>
      @includeif('user.partials.footer')
    </div>
  </div>
  @includeif('user.partials.scripts')
  {{-- Loader --}}
  <div class="request-loader">
    <img src="{{ asset('assets/admin/img/loader.gif') }}" alt="">
  </div>
  {{-- Loader --}}
</body>

</html>
