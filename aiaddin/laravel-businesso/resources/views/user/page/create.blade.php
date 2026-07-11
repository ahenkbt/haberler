@extends('user.layout')

@php
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::id()],
      ['is_default', 1],
  ])->first();
  $userLanguages = \App\Models\User\Language::where('user_id', \Illuminate\Support\Facades\Auth::id())->get();
@endphp

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Pages') }}</h4>
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
        <a href="#">{{ __('Create_Page') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Pages') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="card-title">{{ __('Create_Page') }}</div>
        </div>
        <div class="card-body pt-5 pb-4">
          <div class="row">
            <div class="col-lg-10 offset-lg-1">
              <form id="ajaxForm" action="{{ route('user.page.store') }}" method="post">
                @csrf
                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Language') }} **</label>
                      <select id="language" name="user_language_id" class="form-control">
                        <option value="" selected disabled>{{ __('Select_a_language') }}
                        </option>
                        @if (!is_null($userDefaultLang))
                          @if (!empty($userLanguages))
                            @foreach ($userLanguages as $lang)
                              <option value="{{ $lang->id }}">{{ $lang->name }}</option>
                            @endforeach
                          @endif
                        @endif
                      </select>
                      <p id="erruser_language_id" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Name') }} **</label>
                      <input type="text" name="name" class="form-control" placeholder="{{ __('Enter_Name') }}"
                        value="">
                      <p id="errname" class="em text-danger mb-0"></p>
                    </div>
                  </div>
                  <div class="col-lg-12">
                    <div class="form-group">
                      <label for="">{{ __('Title') }} **</label>
                      <input type="text" class="form-control" name="title" placeholder="{{ __('Enter_Title') }}"
                        value="">
                      <p id="errtitle" class="em text-danger mb-0"></p>
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <label for="">{{ __('Body') }} **</label>
                  <textarea id="body" class="form-control summernote" name="body" data-height="500"></textarea>
                  <p id="errbody" class="em text-danger mb-0"></p>
                </div>
                <div class="form-group">
                  <label>{{ __('Meta_Keywords') }}</label>
                  <input class="form-control" name="meta_keywords" value=""
                    placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                </div>
                <div class="form-group">
                  <label>{{ __('Meta_Description') }}</label>
                  <textarea class="form-control" name="meta_description" rows="5" placeholder="{{ __('Enter_Meta_Description') }}"></textarea>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <div class="form">
            <div class="form-group from-show-notify row">
              <div class="col-12 text-center">
                <button type="submit" id="submitBtn" class="btn btn-success">{{ __('Submit') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
@endsection
