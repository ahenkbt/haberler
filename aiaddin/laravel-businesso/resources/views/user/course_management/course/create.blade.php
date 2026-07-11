@extends('user.layout')

@php
  $symbol = $currencyInfo->base_currency_symbol;
@endphp
@section('styles')
  <style>
    .dis-none {
      display: none;
    }
  </style>
@endsection
@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Add_Course') }}</h4>
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
          href="{{ route('user.course_management.courses', ['language' => request('language')]) }}">{{ __('Courses') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Add_Course') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="card-title d-inline-block">{{ __('Add_Course') }}</div>
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
              <div class="alert alert-danger pb-1 dis-none" id="courseErrors">
                <button type="button" class="close" data-dismiss="alert">×</button>
                <ul></ul>
              </div>

              <form id="courseForm" action="{{ route('user.course_management.store_course') }}" method="POST"
                enctype="multipart/form-data">
                @csrf
                <div class="row">
                  <div class="col-lg-12">
                    <div class="form-group">
                      <div class="col-12 mb-2">
                        <label for="image"><strong>{{ __('Thumbnail_Image') }} *</strong></label>
                      </div>
                      <div class="col-md-12 mb-3">
                        <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." class="img-thumbnail"
                          id="uploaded-thumb-img">
                      </div>
                      <input type="file" name="thumbnail_image" id="thumb-img-input" class="form-control">
                      <p class="text-warning mb-0">{{ __('Upload_370_X_250_image_for_best_quality') }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="form-group mt-1">
                  <label for="">{{ __('Introduction_Video') }} *</label>
                  <input type="url" class="form-control" name="video_link"
                    placeholder="{{ __('Enter_Video_Link') }}">
                </div>

                <div class="row">
                  <div class="col-lg-12">
                    <div class="form-group">
                      <div class="col-12 mb-2">
                        <label for="image"><strong>{{ __('Cover_Image') }} *</strong></label>
                      </div>
                      <div class="col-md-12 mb-3">
                        <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." class="img-thumbnail"
                          id="uploaded-cover-img">
                      </div>
                      <input type="file" name="cover_image" id="cover-img-input" class="form-control">
                      <p class="text-warning mb-0">
                        {{ __('Upload_1920_X_550_image_for_best_quality') }}</p>
                    </div>
                  </div>
                </div>

                <div class="form-group mt-1">
                  <label for="">{{ __('Pricing_Type') }} *</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="pricing_type" value="free" class="selectgroup-input" checked>
                      <span class="selectgroup-button">{{ __('Free') }}</span>
                    </label>

                    <label class="selectgroup-item">
                      <input type="radio" name="pricing_type" value="premium" class="selectgroup-input">
                      <span class="selectgroup-button">{{ __('Premium') }}</span>
                    </label>
                  </div>
                </div>

                <div class="row d-none" id="price-input">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label>{{ __('Current_Price') }}({{ $symbol }})*</label>
                      <input type="number" step="0.01" name="current_price"
                        placeholder="{{ __('Enter_Current_Price') }}" class="form-control">
                    </div>
                  </div>

                  <div class="col-lg-6">
                    <div class="form-group">
                      <label>{{ __('Previous_Price') }}({{ $symbol }})</label>
                      <input type="number" step="0.01" name="previous_price"
                        placeholder="{{ __('Enter_Previous_Price') }}" class="form-control">
                    </div>
                  </div>
                </div>

                <div id="accordion" class="mt-3 custom-accordion">
                  @foreach ($languages as $language)
                    <div class="version mt-2">
                      <div class="version-header" id="heading{{ $language->id }}">
                        <h5 class="mb-0">
                          <button type="button" class="btn accordion-btn" data-toggle="collapse"
                            data-target="#collapse{{ $language->id }}"
                            aria-expanded="{{ $language->is_default == 1 ? 'true' : 'false' }}"
                            aria-controls="collapse{{ $language->id }}">
                            {{ $language->name . ' ' . __('Language') }}
                            {{ $language->is_default == 1 ? __('Default') : '' }}
                            <span class="caret"></span>
                          </button>
                        </h5>
                      </div>

                      <div id="collapse{{ $language->id }}"
                        class="collapse {{ $language->is_default == 1 ? 'show' : '' }} "
                        aria-labelledby="heading{{ $language->id }}" data-parent="#accordion">
                        <div class="version-body">
                          <div class="row">
                            <div class="col-lg-6">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Title') }} *</label>
                                <input type="text" class="form-control {{ ltrClass($language) }}"
                                  name="{{ $language->code }}_title" placeholder="{{ __('Enter_Title') }} ">
                              </div>
                            </div>

                            <div class="col-lg-6">
                              <div class="form-group {{ rtlClass($language) }}">
                                @php
                                  $categories = \App\Models\User\CourseManagement\CourseCategory::where(
                                      'language_id',
                                      $language->id,
                                  )
                                      ->where('user_id', \Illuminate\Support\Facades\Auth::guard('web')->user()->id)
                                      ->where('status', 1)
                                      ->orderByDesc('id')
                                      ->get();
                                @endphp

                                <label for="">{{ __('Category') }} *</label>
                                <select name="{{ $language->code }}_category_id" class="form-control">
                                  <option selected disabled>
                                    {{ __('Select_a_Category') }}
                                  </option>

                                  @foreach ($categories as $category)
                                    <option value="{{ $category->id }}">
                                      {{ $category->name }}</option>
                                  @endforeach
                                </select>
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col">
                              <div class="form-group {{ rtlClass($language) }}">
                                @php
                                  $instructors = \App\Models\User\CourseManagement\Instructor\Instructor::where(
                                      'language_id',
                                      $language->id,
                                  )
                                      ->where('user_id', \Illuminate\Support\Facades\Auth::guard('web')->user()->id)
                                      ->orderByDesc('id')
                                      ->get();
                                @endphp

                                <label for="">{{ __('Instructor') }} *</label>
                                <select name="{{ $language->code }}_instructor_id" class="form-control mb-2">
                                  <option selected disabled>{{ __('Select_Instructor') }}
                                  </option>

                                  @foreach ($instructors as $instructor)
                                    <option value="{{ $instructor->id }}">
                                      {{ $instructor->name }}</option>
                                  @endforeach
                                </select>

                                <a href="{{ route('user.instructors', ['language' => $defaultLang->code]) }}"
                                  target="_blank" id="instructor-link" class="text-warning">
                                  {{ __('Click_this_link_to_add_a_new_instructor') }}
                                </a>
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Features') }} *</label>
                                <textarea class="form-control {{ ltrClass($language) }}" name="{{ $language->code }}_features"
                                  placeholder="{{ __('Enter_Course_Features') }}" rows="7"></textarea>
                                <p class="text-warning mt-1 mb-0">
                                  {{ __('To_separate_the_features_enter_a_new_line_after_each_feature') }}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Description') }} *</label>
                                <textarea class="form-control summernote {{ ltrClass($language) }}" name="{{ $language->code }}_description"
                                  placeholder="{{ __('Enter_Course_Description') }}" data-height="300">
                                                                </textarea>
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Meta_Keywords') }}</label>
                                <input class="form-control {{ ltrClass($language) }}"
                                  name="{{ $language->code }}_meta_keywords"
                                  placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Meta_Description') }}</label>
                                <textarea class="form-control {{ ltrClass($language) }}" name="{{ $language->code }}_meta_description"
                                  rows="5" placeholder="{{ __('Enter_Meta_Description') }}"></textarea>
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col">
                              @php $currLang = $language @endphp
                              @foreach ($languages as $language)
                                @continue($language->id == $currLang->id)
                                <div class="form-check py-0">
                                  <label class="form-check-label">
                                    <input class="form-check-input" type="checkbox"
                                      onchange="cloneInput('collapse{{ $currLang->id }}', 'collapse{{ $language->id }}', event)">
                                    <span class="form-check-sign">{{ __('Clone_for') }}
                                      <strong class="text-capitalize text-secondary">{{ $language->name }}</strong>
                                      {{ __('language') }}</span>
                                  </label>
                                </div>
                              @endforeach
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
              <button type="submit" form="courseForm" class="btn btn-success">
                {{ __('Save') }}
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
