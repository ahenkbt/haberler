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
    <h4 class="page-title">{{ __('Post_Job') }}</h4>
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
        <a href="#">{{ __('Career_Page') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Post_Job') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="card-title d-inline-block">{{ __('Post_Job') }}</div>
        </div>
        <div class="card-body pt-5 pb-5">
          <div class="row">
            <div class="col-lg-12">
              <form id="ajaxForm" class="" action="{{ route('user.job.store') }}" method="post">
                @csrf
                <div id="sliders"></div>
                <div class="row">
                  <div class="col-lg-4">
                    <div class="form-group">
                      <label for="">{{ __('Language') }} **</label>
                      <select id="language" name="user_language_id" class="form-control">
                        <option value="" selected disabled>{{ __('Select_a_language') }}
                        </option>
                        @foreach ($userLanguages as $lang)
                          <option value="{{ $lang->id }}">{{ $lang->name }}</option>
                        @endforeach
                      </select>
                      <p id="erruser_language_id" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-4">
                    <div class="form-group">
                      <label for="">{{ __('Title') }} **</label>
                      <input type="text" class="form-control" name="title" value=""
                        placeholder="{{ __('Enter_title') }}">
                      <p id="errtitle" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-4">
                    <div class="form-group">
                      <label for="">{{ __('Category') }} **</label>
                      <select id="jcategory" class="form-control" name="jcategory_id" disabled>
                        <option value="" selected disabled>{{ __('Select_a_category') }}
                        </option>
                      </select>
                      <p id="errjcategory_id" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Employment_Status') }} **</label>
                      <input type="text" class="form-control" name="employment_status" value=""
                        data-role="tagsinput" placeholder="{{ __('Enter Employment Status') }}">
                      <p class="text-warning mb-0">
                        <small>{{ __('Employment_Status_seperator_text') }}</small>
                      </p>
                      <p id="erremployment_status" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Vacancy') }} **</label>
                      <input type="number" class="form-control" name="vacancy" value=""
                        placeholder="{{ __('Enter_number_of_vacancy') }}" min="1">
                      <p id="errvacancy" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Application_Deadline') }} **</label>
                      <input id="deadline" type="text" class="form-control datepicker" name="deadline" value=""
                        placeholder="{{ __('Enter_application_deadline') }}" autocomplete="off">
                      <p id="errdeadline" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Experience_in_Years') }} **</label>
                      <input type="text" class="form-control" name="experience" value=""
                        placeholder="{{ __('Enter_years_of_experience') }}">
                      <p id="errexperience" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Job_Responsibilities') }}</label>
                      <textarea class="form-control summernote" id="jobRes" name="job_responsibilities" data-height="150"></textarea>
                      <p id="errjob_responsibilities" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Educational_Requirements') }}</label>
                      <textarea class="form-control summernote" id="eduReq" name="educational_requirements" data-height="150"></textarea>
                      <p id="erreducational_requirements" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Experience_Requirements') }}</label>
                      <textarea class="form-control summernote" id="expReq" name="experience_requirements" data-height="150"></textarea>
                      <p id="errexperience_requirements" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Additional_Requirements') }}</label>
                      <textarea class="form-control summernote" id="addReq" name="additional_requirements" data-height="150"></textarea>
                      <p id="erradditional_requirements" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Salary') }} **</label>
                      <textarea class="form-control summernote" id="salary" name="salary" data-height="150"></textarea>
                      <p id="errsalary" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Benefits') }}</label>
                      <textarea class="form-control summernote" id="benefits" name="benefits" data-height="150"></textarea>
                      <p id="errbenefits" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Job_Location') }} **</label>
                      <input type="text" class="form-control" name="job_location" value=""
                        placeholder="{{ __('Enter_job_location') }}">
                      <p id="errjob_location" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Email') }} <span
                          class="text-warning">({{ __('Where_applicatints_will_send_their_CVs') }})</span>
                        **</label>
                      <input type="email" class="form-control" name="email" value=""
                        placeholder="{{ __('Enter_email_address') }}">
                      <p id="erremail" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Read_Before_Apply') }}</label>
                      <textarea class="form-control summernote" id="read_before_apply" name="read_before_apply" data-height="150"></textarea>
                      <p id="errread_before_apply" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Serial_Number') }} **</label>
                      <input type="number" class="form-control" name="serial_number" value=""
                        placeholder="{{ __('Enter_Serial_Number') }}">
                      <p id="errserial_number" class="mb-0 text-danger em"></p>
                      <p class="text-warning"><small>{{ __('job_Serial_Number_msg') }}</small></p>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label>{{ __('Meta_Keywords') }}</label>
                      <input class="form-control" name="meta_keywords" value=""
                        placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label>{{ __('Meta_Description') }}</label>
                      <textarea class="form-control" name="meta_description" placeholder="{{ __('Enter_Meta_Description') }}"
                        rows="4"></textarea>
                    </div>
                  </div>
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


@section('type', 'no-modal')


@section('scripts')

  <script>
    $(document).ready(function() {


      $("select[name='user_language_id']").on('change', function() {
        $("#jcategory").removeAttr('disabled');

        let langid = $(this).val();
        let url = "{{ url('/') }}/user/job/" + langid + "/getcats";
        $.get(url, function(data) {
          let options = `<option value="" disabled selected> ` + $Select_a_category +
            ` </option>`;
          for (let i = 0; i < data.length; i++) {
            options += `<option value="${data[i].id}">${data[i].name}</option>`;
          }
          $("#jcategory").html(options);

        });
      });

    });
  </script>
@endsection
