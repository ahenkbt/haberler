@extends('user.layout')

@php
  $selLang = \App\Models\Language::where([
      ['code', \Illuminate\Support\Facades\Session::get('currentLangCode')],
  ])->first();
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::id()],
      ['is_default', 1],
  ])->first();
  $userLanguages = \App\Models\User\Language::where('user_id', \Illuminate\Support\Facades\Auth::id())->get();
@endphp
@if (!empty($selLang) && $selLang->rtl == 1)
  @section('styles')
    <style>
      form:not(.modal-form) input,
      form:not(.modal-form) textarea,
      form:not(.modal-form) select,
      select[name='userLanguage'] {
        direction: rtl;
      }

      form:not(.modal-form) .note-editor.note-frame .note-editing-area .note-editable {
        direction: rtl;
        text-align: right;
      }
    </style>
  @endsection
@endif

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Work experience') }}</h4>
    <ul class="breadcrumbs">
      <li class="nav-home">
        <a href="{{ route('user.services.index') }}">
          <i class="flaticon-home"></i>
        </a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Work Experience Section') }}a</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Work experience') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">{{ __('Work experience') }}</div>
            </div>
            <div class="col-lg-3">
              @includeIf('user.partials.languages')
            </div>
            <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
              <a href="#" class="btn btn-primary float-right btn-sm" data-toggle="modal"
                data-target="#createModal"><i class="fas fa-plus"></i> {{ __('Add Work Experience') }}</a>
              <button class="btn btn-danger float-right btn-sm mr-2 d-none bulk-delete"
                data-href="{{ route('user.job.experience.bulk.delete') }}"><i class="flaticon-interface-5"></i>
                {{ __('Delete') }}</button>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (count($job_experiences) == 0)
                <h3 class="text-center">{{ __('No work experience found') }}</h3>
              @else
                <div class="table-responsive">
                  <table class="table table-striped mt-3" id="basic-datatables">
                    <thead>
                      <tr>
                        <th scope="col">
                          <input type="checkbox" class="bulk-check" data-val="all">
                        </th>
                        <th scope="col">{{ __('Company name') }}</th>
                        <th scope="col">{{ __('Use') }}</th>
                        <th scope="col">{{ __('Start date') }}</th>
                        <th scope="col">{{ __('Actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($job_experiences as $key => $job_experience)
                        <tr>
                          <td>
                            <input type="checkbox" class="bulk-check" data-val="{{ $job_experience->id }}">
                          </td>

                          <td>
                            {{ strlen($job_experience->company_name) > 30 ? mb_substr($job_experience->company_name, 0, 30, 'UTF-8') . '...' : $job_experience->company_name }}
                          </td>
                          <td>{{ $job_experience->designation }}</td>
                          <td>
                            @php
                              $date = \Carbon\Carbon::parse($job_experience->start_date);
                            @endphp
                            {{ $date->translatedFormat('jS F, Y') }}
                          </td>
                          <td>
                            <a class="btn btn-secondary btn-sm"
                              href="{{ route('user.job.experience.edit', $job_experience->id) . '?language=' . $job_experience->language->code }}">
                              <span class="btn-label">
                                <i class="fas fa-edit"></i>
                              </span>
                              {{ __('edit') }}
                            </a>
                            <form class="deleteform d-inline-block" action="{{ route('user.job.experience.delete') }}"
                              method="post">
                              @csrf
                              <input type="hidden" name="id" value="{{ $job_experience->id }}">
                              <button type="submit" class="btn btn-danger btn-sm deletebtn">
                                <span class="btn-label">
                                  <i class="fas fa-trash"></i>
                                </span>
                                {{ __('delete') }}
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
  <!-- Create Blog Modal -->
  <div class="modal fade" id="createModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add Work Experience') }}</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">

          <form id="ajaxForm" enctype="multipart/form-data" class="modal-form"
            action="{{ route('user.job.experience.store') }}" method="POST">
            @csrf
            <div class="form-group">
              <label for="">{{ __('Language') }} **</label>
              <select id="language" name="user_language_id" class="form-control">
                <option value="" selected disabled>{{ __('Select Language') }}</option>
                @foreach ($userLanguages as $lang)
                  <option value="{{ $lang->id }}">{{ $lang->name }}</option>
                @endforeach
              </select>
              <p id="erruser_language_id" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Company name') }} **</label>
              <input type="text" class="form-control" name="company_name"
                placeholder="{{ __('Enter Company name') }}da" value="">
              <p id="errcompany_name" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Use / task') }} **</label>
              <input type="text" class="form-control" name="designation" placeholder="{{ __('Enter use/task') }}"
                value="">
              <p id="errdesignation" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Work Responsibility') }}</label>
              <textarea class="form-control" name="content" rows="5" placeholder="{{ __('Enter job responsibility') }}"></textarea>
              <p id="errcontent" class="mb-0 text-danger em"></p>
            </div>
            <div class="row">
              <div class="col-lg-6">
                <div class="form-group">
                  <label for="">{{ __('Start Date') }} **</label>
                  <input type="date" class="form-control" name="start_date" value="">
                  <p id="errstart_date" class="mb-0 text-danger em"></p>
                </div>
              </div>
              <div class="col-lg-6">
                <div class="form-group">
                  <label for="">{{ __('End Date') }}</label>
                  <input type="date" class="form-control" id="myDate" name="end_date" value="">
                  <p id="errend_date" class="mb-0 text-danger em"></p>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-lg-6">

              </div>
              <div class="col-lg-6">
                <div class="form-group">
                  <input id="is_continue" type="checkbox" name="is_continue" class="is_continue" rows="5"
                    value=1 onchange="valueChanged()">
                  <label for="is_continue" class="my-label mr-4">{{ __('I currently work there') }}</label>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="">{{ __('Display priority') }} **</label>
              <input type="number" class="form-control" name="serial_number" value=""
                placeholder="{{ __('Enter_Serial_Number') }}">
              <p id="errserial_number" class="mb-0 text-danger em"></p>
              <p class="text-warning mb-0">
                <small>{{ __('Enter 1 to view as first result, 2 as second, etc...') }}</small>
              </p>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">{{ __('Close') }}</button>
          <button id="submitBtn" type="button" class="btn btn-primary">{{ __('Save') }}</button>
        </div>
      </div>
    </div>
  </div>
@endsection

@section('scripts')
  <script type="text/javascript">
    "use strict";

    function valueChanged() {
      if ($('.is_continue').is(":checked"))
        $("#myDate").attr("disabled", "disabled");
      else
        $("#myDate").removeAttr("disabled");
    }
  </script>
@endsection
