@extends('user.layout')
@section('styles')
  <style>
    .dis-none {
      display: none;
    }
  </style>
@endsection
@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Thanks_Page') }}</h4>
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
        <a href="#">{{ __('Course_Management') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a
          href="{{ route('user.course_management.courses', ['language' => $defaultLang->code]) }}">{{ __('Courses') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        @php
          $title = $course->courseInformation()->where('language_id', $defaultLang->id)->pluck('title')->first();
        @endphp

        <a href="#">{{ strlen($title) > 35 ? mb_substr($title, 0, 35, 'UTF-8') . '...' : $title }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Edit_Thanks_Page') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="card-title d-inline-block">{{ __('Edit_Thanks_Page') }}</div>
          <a class="btn btn-info btn-sm float-right d-inline-block"
            href="{{ route('user.course_management.courses', ['language' => request('language')]) }}">
            <span class="btn-label">
              <i class="fas fa-backward"></i>
            </span>
            {{ __('Back') }}
          </a>
        </div>

        <div class="card-body">
          <div class="row">
            <div class="col-lg-8 offset-lg-2">
              <div class="alert alert-danger pb-1 dis-none" id="thanksPageErrors">
                <button type="button" class="close" data-dismiss="alert">×</button>
                <ul></ul>
              </div>

              <form id="thanksPageForm"
                action="{{ route('user.course_management.course.update_thanks_page', ['id' => $course->id]) }}"
                method="POST">

                @csrf
                <div id="accordion" class="mt-3 custom-accordion">
                  @foreach ($languages as $language)
                    @php
                      $courseData = $language
                          ->courseInformation()
                          ->where('user_id', Auth::guard('web')->user()->id)
                          ->where('course_id', $course->id)
                          ->first();
                    @endphp

                    <div class="version mt-2">
                      <div class="version-header" id="heading{{ $language->id }}">
                        <h5 class="mb-0">
                          <button type="button" class="btn accordion-btn" data-toggle="collapse"
                            data-target="#collapse{{ $language->id }}"
                            aria-expanded="{{ $language->is_default == 1 ? 'true' : 'false' }}"
                            aria-controls="collapse{{ $language->id }}">
                            {{ $language->name . ' ' . __('Language') }}
                            {{ $language->is_default == 1 ? __('Default') : '' }}
                          </button>
                        </h5>
                      </div>

                      <div id="collapse{{ $language->id }}"
                        class="collapse {{ $language->is_default == 1 ? 'show' : '' }}"
                        aria-labelledby="heading{{ $language->id }}" data-parent="#accordion">
                        <div class="version-body">
                          <div class="row">
                            <div class="col">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Content') }} *</label>
                                <textarea class="form-control summernote" name="{{ $language->code }}_thanks_page_content"
                                  placeholder="{{ __('Enter_Page_Content') }}" data-height="300">{{ !isset($courseData->thanks_page_content) ? '' : replaceBaseUrl($courseData->thanks_page_content) }}</textarea>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  @endforeach
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-12 text-center">
              <button type="submit" form="thanksPageForm" class="btn btn-success">
                {{ __('Update') }}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
@endsection

@section('scripts')
  <script type="text/javascript" src="{{ asset('assets/user/js/partial.js') }}"></script>
@endsection
