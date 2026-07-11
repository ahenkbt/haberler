@extends('user.layout')
@php
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::guard('web')->user()->id],
      ['is_default', 1],
  ])->first();
  $userLanguages = \App\Models\User\Language::where(
      'user_id',
      \Illuminate\Support\Facades\Auth::guard('web')->user()->id,
  )->get();
@endphp
@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Features') }}</h4>
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
        <a href="#">{{ __('Home Page') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Features') }}</a>
      </li>
    </ul>
  </div>
  @if ($userBs->theme == 'home_ten')
    <div class="row">
      <div class="col-md-12">
        <div class="card">
          <div class="card-header">
            <div class="row">
              <div class="col-lg-10">
                <div class="card-title">{{ __('Features Section Image') }}</div>
              </div>
              <div class="col-lg-2">
                @includeIf('user.partials.languages')
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="row">
              <div class="col-lg-6 offset-lg-3">
                <form id="featureSectionForm" action="{{ route('user.feature.image_update') }}" method="POST"
                  enctype="multipart/form-data">
                  @csrf
                  <div class="row">
                    <div class="col-lg-12">
                      <div class="form-group">
                        <div class="col-12 mb-2">
                          <label for="image"><strong>{{ __('Image') . '*' }}</strong></label>
                        </div>
                        <div class="col-md-12 showImage mb-3">
                          <img
                            src="@if (!empty($featuredImage->features_section_image)) {{ asset(\App\Constants\Constant::WEBSITE_FEATURE_SECTION_IMAGE . '/' . $featuredImage->features_section_image) }} @else {{ asset('assets/admin/img/noimage.jpg') }} @endif"
                            alt="..." class="img-thumbnail">
                        </div>
                        <input type="file" name="features_section_image" id="image" class="form-control">
                        <p id="errfeatures_section_image" class="mt-2 mb-0 text-danger em"></p>
                        <p class="text-warning mb-0">{{ __('Upload 625 X 810 image for best quality') }}</p>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="row">
              <div class="col-12 text-center">
                <button type="submit" id="submitFeatureSectionBtn" class="btn btn-success">
                  {{ __('Update') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  @endif
  <div class="row">
    <div class="col-md-12">

      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">{{ __('Features') }}</div>
            </div>
            <div class="col-lg-3">
              @includeIf('user.partials.languages')
            </div>
            <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
              <a href="#" class="btn btn-primary float-lg-right float-left" data-toggle="modal"
                data-target="#createModal"><i class="fas fa-plus"></i> {{ __('Add Feature') }}</a>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (count($features) == 0)
                <h3 class="text-center">{{ __('NO FEATURE FOUND') }}</h3>
              @else
                <div class="table-responsive">
                  <table class="table table-striped mt-3" id="basic-datatables">
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        @if ($userBs->theme != 'home_ten')
                          <th scope="col">{{ __('Icon') }}</th>
                        @endif
                        <th scope="col">{{ __('Title') }}</th>
                        <th scope="col">{{ __('Serial Number') }}</th>
                        <th scope="col">{{ __('Actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($features as $key => $feature)
                        <tr>
                          <td>{{ $loop->iteration }}</td>
                          @if ($userBs->theme != 'home_ten')
                            <td>
                              <img
                                src="{{ $feature->icon ? asset('assets/front/img/user/feature/' . $feature->icon) : asset('assets/admin/img/noimage.jpg') }}"
                                alt="..." class="img-thumbnail">
                            </td>
                          @endif
                          <td>{{ $feature->title }}</td>
                          <td>{{ $feature->serial_number }}</td>
                          <td>
                            <a class="btn btn-secondary btn-sm"
                              href="{{ route('user.feature.edit', $feature->id) . '?language=' . request()->input('language') }}">
                              <span class="btn-label">
                                <i class="fas fa-edit"></i>
                              </span>
                              {{ __('Edit') }}
                            </a>
                            <form class="deleteform d-inline-block" action="{{ route('user.feature.delete') }}"
                              method="post">
                              @csrf
                              <input type="hidden" name="feature_id" value="{{ $feature->id }}">
                              <button type="submit" class="btn btn-danger btn-sm deletebtn">
                                <span class="btn-label">
                                  <i class="fas fa-trash"></i>
                                </span>
                                {{ __('Delete') }}
                              </button>
                            </form>
                          </td>
                        </tr>
                      @endforeach
                    </tbody>
                  </table>
                </div>
              @endif
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Create Feature Modal -->
  <div class="modal fade" id="createModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add Feature') }}</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <form id="ajaxForm" class="modal-form" action="{{ route('user.feature.store') }}"
            enctype="multipart/form-data" method="POST">
            @csrf
            <div class="form-group">
              <label for="">{{ __('Language') }} **</label>
              <select id="language" name="user_language_id" class="form-control">
                <option value="" selected disabled>{{ __('Select_a_language') }}</option>
                @foreach ($userLanguages as $lang)
                  <option value="{{ $lang->id }}">{{ $lang->name }}</option>
                @endforeach
              </select>
              <p id="erruser_language_id" class="mb-0 text-danger em"></p>
            </div>
            @if ($userBs->theme != 'home_ten')
              <div class="form-group">
                <div class="col-12 mb-2">
                  <label for="image"><strong>{{ __('Icon') }} **</strong></label>
                </div>
                <div class="col-md-12 showImage mb-3">
                  <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." class="img-thumbnail">
                </div>
                <input type="file" name="icon" id="image" class="form-control">
                <p id="erricon" class="mb-0 text-danger em"></p>
              </div>
            @endif
            <div class="form-group">
              <label for="">{{ __('Title') }} **</label>
              <input class="form-control" name="title" placeholder="{{ __('Enter_title') }}">
              <p id="errtitle" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Text') }} **</label>
              <textarea class="form-control" name="text" placeholder="{{ __('Enter text') }}" rows="5"></textarea>
              <p id="errtext" class="mb-0 text-danger em"></p>
            </div>
            @if ($userBs->theme == 'home_eleven')
              <div class="form-group">
                <label for="">{{ __('Background Color') . ' *' }}</label>
                <input type="text" class="form-control jscolor" name="color">
                <p id="errcolor" class="mb-0 text-danger em"></p>
              </div>
            @endif
            <div class="form-group">
              <label for="">{{ __('Serial Number') }} **</label>
              <input type="number" class="form-control" name="serial_number" value=""
                placeholder="{{ __('Enter Serial Number') }}">
              <p id="errserial_number" class="mb-0 text-danger em"></p>
              <p class="text-warning">
                <small>{{ __('The higher the serial number is, the later the feature will be shown') . '.' }}</small>
              </p>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">{{ __('Close') }}</button>
          <button id="submitBtn" type="button" class="btn btn-primary">{{ __('Submit') }}</button>
        </div>
      </div>
    </div>
  </div>
@endsection

@section('scripts')
  <script>
    /* ******************** *******************************
                                    ==========Form Submit with AJAX Request Start==========
                             ******************************************************/
    $("#submitFeatureSectionBtn").on('click', function(e) {
      $(e.target).attr('disabled', true);
      $(".request-loader").addClass("show");
      let ajaxForm = document.getElementById('featureSectionForm');
      let fd = new FormData(ajaxForm);
      let url = $("#featureSectionForm").attr('action');
      let method = $("#featureSectionForm").attr('method');

      $.ajax({
        url: url,
        method: method,
        data: fd,
        contentType: false,
        processData: false,
        success: function(data) {
          $(e.target).attr('disabled', false);
          $(".request-loader").removeClass("show");

          $(".em").each(function() {
            $(this).html('');
          })

          if (data == "success") {
            location.reload();
          }
          // if error occurs
          else if (typeof data.error != 'undefined') {
            for (let x in data) {
              if (x == 'error') {
                continue;
              }
              document.getElementById('err' + x).innerHTML = data[x][0];
            }
          } else if (data?.errors?.error) {
            const errors = data?.errors;
            Object.keys(errors).map(function(key) {
              if (key !== 'error')
                document.getElementById('err' + key).innerHTML = errors[key][0];
            });
          }
        },
        error: function(error) {
          $(".em").each(function() {
            $(this).html('');
          })
          for (let x in error.responseJSON.errors) {
            document.getElementById('err' + x).innerHTML = error.responseJSON.errors[x][0];
          }
          $(".request-loader").removeClass("show");
          $(e.target).attr('disabled', false);
          if (error?.responseJSON?.exception) {
            bootnotify(error?.responseJSON?.exception, "Warning", "warning");
          }
        }
      });
    });
  </script>
@endsection
