@extends('user.layout')

@if (!empty($job->language) && $job->language->rtl == 1)
    @section('styles')
        <style>
            form input,
            form textarea,
            form select {
                direction: rtl;
            }

            form .note-editor.note-frame .note-editing-area .note-editable {
                direction: rtl;
                text-align: right;
            }
        </style>
    @endsection
@endif

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Edit_Job') }}</h4>
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
                <a href="#">{{ __('Edit_Job') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">{{ __('Edit_Job') }}</div>
                    <a class="btn btn-info btn-sm float-right d-inline-block"
                        href="{{ route('user.job.index') . '?language=' . request('language') }}">
                        <span class="btn-label">
                            <i class="fas fa-backward" style="font-size: 12px;"></i>
                        </span>
                        {{ __('Back') }}
                    </a>
                </div>
                <div class="card-body pt-5 pb-5">
                    <div class="row">
                        <div class="col-lg-12">

                            <form id="ajaxForm" class="" action="{{ route('user.job.update') }}" method="post">
                                @csrf
                                <input type="hidden" name="job_id" value="{{ $job->id }}">
                                <div id="sliders"></div>
                                <div class="row">
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Title') }} **</label>
                                            <input type="text" class="form-control" name="title"
                                                value="{{ $job->title }}" placeholder="{{ __('Enter_title') }}">
                                            <p id="errtitle" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Category') }} **</label>
                                            <select class="form-control" name="jcategory_id">
                                                <option value="" selected disabled>{{ __('Select_a_category') }}
                                                </option>
                                                @foreach ($jcats as $key => $jcat)
                                                    <option value="{{ $jcat->id }}"
                                                        {{ $job->jcategory_id == $jcat->id ? 'selected' : '' }}>
                                                        {{ $jcat->name }}</option>
                                                @endforeach
                                            </select>
                                            <p id="errjcategory_id" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Employment_Status') }} **</label>
                                            <input type="text" class="form-control" name="employment_status"
                                                value="{{ $job->employment_status }}" data-role="tagsinput" placeholder="{{ __('Enter Employment Status') }}">
                                            <p class="text-warning mb-0">
                                                <small>{{ __('Employment_Status_seperator_text') }}</small></p>
                                            <p id="erremployment_status" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Vacancy') }} **</label>
                                            <input type="number" class="form-control" name="vacancy"
                                                value="{{ $job->vacancy }}"
                                                placeholder="{{ __('Enter_number_of_vacancy') }}" min="1">
                                            <p id="errvacancy" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Application_Deadline') }} **</label>
                                            <input id="deadline" type="text" class="form-control datepicker"
                                                name="deadline" value="{{ $job->deadline }}"
                                                placeholder="{{ __('Enter_application_deadline') }}" autocomplete="off">
                                            <p id="errdeadline" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Experience_in_Years') }} **</label>
                                            <input type="text" class="form-control" name="experience"
                                                value="{{ $job->experience }}"
                                                placeholder="{{ __('Enter_years_of_experience') }}">
                                            <p id="errexperience" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Job_Responsibilities') }}</label>
                                            <textarea class="form-control summernote" id="jobRes" name="job_responsibilities" data-height="150">{{ replaceBaseUrl($job->job_responsibilities) }}</textarea>
                                            <p id="errjob_responsibilities" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Educational_Requirements') }}</label>
                                            <textarea class="form-control summernote" id="eduReq" name="educational_requirements" data-height="150">{{ replaceBaseUrl($job->educational_requirements) }}</textarea>
                                            <p id="erreducational_requirements" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Experience_Requirements') }}</label>
                                            <textarea class="form-control summernote" id="expReq" name="experience_requirements" data-height="150">{{ replaceBaseUrl($job->experience_requirements) }}</textarea>
                                            <p id="errexperience_requirements" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Additional_Requirements') }}</label>
                                            <textarea class="form-control summernote" id="addReq" name="additional_requirements" data-height="150">{{ replaceBaseUrl($job->additional_requirements) }}</textarea>
                                            <p id="erradditional_requirements" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Salary') }} **</label>
                                            <textarea class="form-control summernote" id="salary" name="salary" data-height="150">{{ replaceBaseUrl($job->salary) }}</textarea>
                                            <p id="errsalary" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Benefits') }}</label>
                                            <textarea class="form-control summernote" id="benefits" name="benefits" data-height="150">{{ replaceBaseUrl($job->benefits) }}</textarea>
                                            <p id="errbenefits" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Job_Location') }} **</label>
                                            <input type="text" class="form-control" name="job_location"
                                                value="{{ $job->job_location }}"
                                                placeholder="{{ __('Enter_job_location') }}">
                                            <p id="errjob_location" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Email') }} <span
                                                    class="text-warning">({{ __('Where_applicatints_will_send_their_CVs') }})</span>
                                                **</label>
                                            <input type="email" class="form-control" name="email"
                                                value="{{ $job->email }}"
                                                placeholder="{{ __('Enter_email_address') }}">
                                            <p id="erremail" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Read_Before_Apply') }}</label>
                                            <textarea class="form-control summernote" id="read_before_apply" name="read_before_apply" data-height="150">{{ replaceBaseUrl($job->read_before_apply) }}</textarea>
                                            <p id="errread_before_apply" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label for="">{{ __('Serial_Number') }} **</label>
                                            <input type="number" class="form-control" name="serial_number"
                                                value="{{ $job->serial_number }}"
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
                                            <input class="form-control" name="meta_keywords"
                                                value="{{ $job->meta_keywords }}"
                                                placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group">
                                            <label>{{ __('Meta_Description') }}</label>
                                            <textarea class="form-control" name="meta_description" rows="3"
                                                placeholder="{{ __('Enter_Meta_Description') }}">{{ $job->meta_description }}</textarea>
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
                                <button type="submit" id="submitBtn"
                                    class="btn btn-success">{{ __('Update') }}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
@endsection
