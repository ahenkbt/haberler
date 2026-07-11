@extends('user.layout')

@section('styles')
  <link rel="stylesheet" href="{{ asset('assets/admin/css/bootstrap-iconpicker.min.css') }}">
@endsection
@php
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::id()],
      ['is_default', 1],
  ])->first();
  $userLanguages = \App\Models\User\Language::where('user_id', \Illuminate\Support\Facades\Auth::id())->get();

  $user = Auth::guard('web')->user();
  $package = \App\Http\Helpers\UserPermissionHelper::currentPackagePermission($user->id);
  if (!empty($user)) {
      $permissions = \App\Http\Helpers\UserPermissionHelper::packagePermission($user->id);
      $permissions = json_decode($permissions, true);
  }
@endphp
@includeIf('user.partials.rtl-style')

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Drag_and_Drop_Menu_Builder') }}</h4>
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
        <a href="#">{{ __('Menu_Builder') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-10">
              <div class="card-title">{{ __('Menu_Builder') }}</div>
            </div>
            <div class="col-lg-2">
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
            </div>
          </div>
        </div>
        <div class="card-body pt-5 pb-5">
          <div class="row no-gutters">
            <div class="col-lg-4">
              <div class="card border-primary mb-3">
                <div class="card-header bg-primary text-white">{{ __('Pre_built_Menus') }}</div>
                <div class="card-body">
                  <ul class="list-group">
                    <li class="list-group-item">
                      @if ($userBs->theme == 'home_twelve')
                        <i class="fas fa-home"></i>
                      @endif
                      {{ __('Home') }} <a data-text="{{ __('Home') }}" data-type="home"
                        @if ($userBs->theme == 'home_twelve') data-icon="fas fa-home" @endif
                        class="addToMenus btn btn-primary btn-sm float-right" href="">{{ __('Add_to_Menus') }}</a>
                    </li>
                    <li class="list-group-item">
                      @if ($userBs->theme == 'home_twelve')
                        <i class="la flaticon-picture"></i>
                      @endif
                      {{ __('Gallery') }} <a data-text="{{ __('Gallery') }}" data-type="gallery"
                        @if ($userBs->theme == 'home_twelve') data-icon="fas fa-home" @endif
                        class="addToMenus btn btn-primary btn-sm float-right" href="">{{ __('Add_to_Menus') }}</a>
                    </li>

                    @if (!empty($permissions) && in_array('Service', $permissions))
                      <li class="list-group-item">
                        @if ($userBs->theme == 'home_twelve')
                          <i class="fas fa-hands"></i>
                        @endif
                        {{ __('Services') }} <a @if ($userBs->theme == 'home_twelve') data-icon="fas fa-hands" @endif
                          data-text="{{ __('Services') }}" data-type="services"
                          class="addToMenus btn btn-primary btn-sm float-right"
                          href="">{{ __('Add_to_Menus') }}</a>
                      </li>
                    @endif
                    @if (!empty($permissions) && in_array('Hotel Booking', $permissions))
                      <li class="list-group-item">
                        @if ($userBs->theme == 'home_twelve')
                          <i class="fas fa-hotel"></i>
                        @endif
                        {{ __('Rooms') }} <a @if ($userBs->theme == 'home_twelve') data-icon="fas fa-hotel" @endif
                          data-text="{{ __('Rooms') }}" data-type="rooms"
                          class="addToMenus btn btn-primary btn-sm float-right"
                          href="">{{ __('Add_to_Menus') }}</a>
                      </li>
                    @endif
                    @if (!empty($permissions) && in_array('Course Management', $permissions))
                      <li class="list-group-item">
                        @if ($userBs->theme == 'home_twelve')
                          <i class="fas fa-play"></i>
                        @endif
                        {{ __('Courses') }} <a @if ($userBs->theme == 'home_twelve') data-icon="fas fa-play" @endif
                          data-text="{{ __('Courses') }}" data-type="courses"
                          class="addToMenus btn btn-primary btn-sm float-right"
                          href="">{{ __('Add_to_Menus') }}</a>
                      </li>
                    @endif
                    @if (!empty($permissions) && in_array('Donation Management', $permissions))
                      <li class="list-group-item">
                        @if ($userBs->theme == 'home_twelve')
                          <i class="fas fa-hand-holding-usd"></i>
                        @endif
                        {{ __('Causes') }} <a
                          @if ($userBs->theme == 'home_twelve') data-icon="fas fa-hand-holding-usd" @endif
                          data-text="{{ __('Causes') }}" data-type="causes"
                          class="addToMenus btn btn-primary btn-sm float-right"
                          href="">{{ __('Add_to_Menus') }}</a>
                      </li>
                    @endif
                    @if (!empty($permissions) && in_array('Blog', $permissions))
                      <li class="list-group-item">
                        @if ($userBs->theme == 'home_twelve')
                          <i class="fas fa-blog"></i>
                        @endif
                        {{ __('Blog') }} <a @if ($userBs->theme == 'home_twelve') data-icon="fas fa-blog" @endif
                          data-text="{{ __('Blog') }}" data-type="blog"
                          class="addToMenus btn btn-primary btn-sm float-right"
                          href="">{{ __('Add_to_Menus') }}</a>
                      </li>
                    @endif

                    @if (!empty($permissions) && in_array('Portfolio', $permissions))
                      <li class="list-group-item">{{ __('Portfolios') }} <a data-text="{{ __('Portfolios') }}"
                          data-type="portfolios" class="addToMenus btn btn-primary btn-sm float-right"
                          href="">{{ __('Add_to_Menus') }}</a></li>
                    @endif

                    <li class="list-group-item">
                      @if ($userBs->theme == 'home_twelve')
                        <i class="fas fa-chalkboard-teacher"></i>
                      @endif
                      {{ __('Contact') }} <a
                        @if ($userBs->theme == 'home_twelve') data-icon="fas fa-chalkboard-teacher" @endif
                        data-text="{{ __('Contact') }}" data-type="contact"
                        class="addToMenus btn btn-primary btn-sm float-right" href="">{{ __('Add_to_Menus') }}</a>
                    </li>

                    @if (!empty($permissions) && in_array('Team', $permissions))
                      <li class="list-group-item">
                        @if ($userBs->theme == 'home_twelve')
                          <i class="fas fa-user-friends"></i>
                        @endif
                        {{ __('Team') }} <a @if ($userBs->theme == 'home_twelve') data-icon="fas fa-user-friends" @endif
                          data-text="{{ __('Team') }}" data-type="team"
                          class="addToMenus btn btn-primary btn-sm float-right"
                          href="">{{ __('Add_to_Menus') }}</a>
                      </li>
                    @endif

                    @if (!empty($permissions) && in_array('Career', $permissions))
                      <li class="list-group-item">
                        @if ($userBs->theme == 'home_twelve')
                          <i class="fas fa-user-md"></i>
                        @endif
                        {{ __('Career') }} <a @if ($userBs->theme == 'home_twelve') data-icon="fas fa-user-md" @endif
                          data-text="{{ __('Career') }}" data-type="career"
                          class="addToMenus btn btn-primary btn-sm float-right"
                          href="">{{ __('Add_to_Menus') }}</a>
                      </li>
                    @endif

                    <li class="list-group-item">
                      @if ($userBs->theme == 'home_twelve')
                        <i class="far fa-question-circle"></i>
                      @endif
                      {{ __('FAQ') }} <a
                        @if ($userBs->theme == 'home_twelve') data-icon="far fa-question-circle" @endif
                        data-text="{{ __('FAQ') }}" data-type="faq"
                        class="addToMenus btn btn-primary btn-sm float-right"
                        href="">{{ __('Add_to_Menus') }}</a>
                    </li>
                    @if (!empty($permissions) && in_array('Ecommerce', $permissions))
                      <li class="list-group-item">
                        @if ($userBs->theme == 'home_twelve')
                          <i class="far fa-store-alt"></i>
                        @endif
                        {{ __('Shop') }} <a @if ($userBs->theme == 'home_twelve') data-icon="far fa-store-alt" @endif
                          data-text="{{ __('Shop') }}" data-type="shop"
                          class="addToMenus btn btn-primary btn-sm float-right"
                          href="">{{ __('Add_to_Menus') }}</a>
                      </li>
                      <li class="list-group-item">
                        @if ($userBs->theme == 'home_twelve')
                          <i class="far fa-cart-plus"></i>
                        @endif
                        {{ __('Cart') }} <a @if ($userBs->theme == 'home_twelve') data-icon="far fa-cart-plus" @endif
                          data-text="{{ __('Cart') }}" data-type="cart"
                          class="addToMenus btn btn-primary btn-sm float-right"
                          href="">{{ __('Add_to_Menus') }}</a>
                      </li>
                      <li class="list-group-item">
                        @if ($userBs->theme == 'home_twelve')
                          <i class="far fa-cart-plus"></i>
                        @endif
                        {{ __('Checkout') }} <a @if ($userBs->theme == 'home_twelve') data-icon="far fa-cart-plus" @endif
                          data-text="{{ __('Checkout') }}" data-type="checkout"
                          class="addToMenus btn btn-primary btn-sm float-right"
                          href="">{{ __('Add_to_Menus') }}</a>
                      </li>
                    @endif
                    @if (!empty($permissions) && in_array('Custom Page', $permissions))
                      @foreach ($apages as $apage)
                        <li class="list-group-item">
                          {{ $apage->name }} <span class="badge badge-primary">
                            {{ __('Custom Page') }}</span>
                          <a data-text="{{ $apage->name }}" data-type="{{ $apage->id }}" data-custom="yes"
                            class="addToMenus btn btn-primary btn-sm float-right"
                            href="">{{ __('Add_to_Menus') }}</a>
                        </li>
                      @endforeach
                    @endif

                  </ul>
                </div>
              </div>
            </div>
            <div class="col-lg-4">
              <div class="card border-primary mb-3">
                <div class="card-header bg-primary text-white">{{ __('Add_Edit_Menu') }}</div>
                <div class="card-body">
                  <form id="frmEdit" class="form-horizontal">
                    <input class="item-menu" type="hidden" name="type" value="">
                    @if ($userBs->theme == 'home_twelve')
                      <div class="form-group">
                        <label for="">{{ __('Icon') }}*</label>
                        <div class="btn-group d-block">
                          <button type="button" class="btn btn-primary iconpicker-component">
                            <i class="fas fa heart"></i>
                          </button>
                          <button type="button" class="icp icp-dd btn btn-primary dropdown-toggle"
                            data-selected="fa-car" data-toggle="dropdown"></button>
                          <div class="dropdown-menu"></div>
                        </div>

                        <input type="hidden" id="inputIcon" class="item-menu" name="icon">

                        <div class="text-warning mt-2">
                          <small>{{ __('Click_on_the_dropdown_icon_to_select_a_icon') }}.</small>
                        </div>
                      </div>
                    @endif
                    <div id="withUrl">

                      <div class="form-group">
                        <label for="text">{{ __('Text') }}</label>
                        <input type="text" class="form-control item-menu" name="text"
                          placeholder="{{ __('Text') }}">
                      </div>
                      <div class="form-group">
                        <label for="href">{{ __('URL') }}</label>
                        <input type="text" class="form-control item-menu" name="href"
                          placeholder="{{ __('URL') }}">
                      </div>
                      <div class="form-group">
                        <label for="target">{{ __('Target') }}</label>
                        <select name="target" id="target" class="form-control item-menu">
                          <option value="_self">{{ __('Self') }}</option>
                          <option value="_blank">{{ __('Blank') }}</option>
                          <option value="_top">{{ __('Top') }}</option>
                        </select>
                      </div>
                    </div>

                    <div id="withoutUrl" style="display: none;">
                      <div class="form-group">
                        <label for="text">{{ __('Text') }}</label>
                        <input type="text" class="form-control item-menu" name="text"
                          placeholder="{{ __('Text') }}">
                      </div>
                      <div class="form-group">
                        <label for="href">{{ __('URL') }}</label>
                        <input type="text" class="form-control item-menu" name="href"
                          placeholder="{{ __('URL') }}">
                      </div>
                      <div class="form-group">
                        <label for="target">{{ __('Target') }}</label>
                        <select name="target" class="form-control item-menu">
                          <option value="_self">{{ __('Self') }}</option>
                          <option value="_blank">{{ __('Blank') }}</option>
                          <option value="_top">{{ __('Top') }}</option>
                        </select>
                      </div>
                    </div>
                  </form>
                </div>
                <div class="card-footer">
                  <button type="button" id="btnUpdate" class="btn btn-primary" disabled><i
                      class="fas fa-sync-alt"></i> {{ __('Update') }}</button>
                  <button type="button" id="btnAdd" class="btn btn-success"><i class="fas fa-plus"></i>
                    {{ __('Add') }}</button>
                </div>
              </div>
            </div>
            <div class="col-lg-4">
              <div class="card mb-3">
                <div class="card-header bg-primary text-white">{{ __('Website_Menus') }}</div>
                <div class="card-body">
                  <ul id="myEditor" class="sortableLists list-group">
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="card-footer pt-3">
          <div class="form">
            <div class="form-group from-show-notify row">
              <div class="col-12 text-center">
                <button id="btnOutput" class="btn btn-success">{{ __('Update_Menu') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  @php
    $success_msg = __('Success') . '!';
    $warning_msg = __('Warning') . '!';
  @endphp
@endsection

@section('scripts')
  <script type="text/javascript" src="{{ asset('assets/admin/js/plugin/jquery-menu-editor/jquery-menu-editor.js') }}">
  </script>
  <script>
    "use strict";
    let success_msg = "{{ $success_msg }}";
    let warning_msg = "{{ $warning_msg }}";
    var prevMenus = @php echo json_encode($prevMenu) @endphp;
    var langid = {{ $lang_id }};
    var menuUpdate = "{{ route('user.menu_builder.update') }}";
  </script>
  <script type="text/javascript" src="{{ asset('assets/admin/js/menu-builder.js') }}"></script>
  <script>
    (function($) {

      $('.btnEdit').on('click', function() {
        setTimeout(() => {
          $(".iconpicker-component i").removeClass();
          $('.iconpicker-component i').addClass($('#inputIcon').val())
        }, 10);

      });
    })(jQuery);
  </script>
@endsection
