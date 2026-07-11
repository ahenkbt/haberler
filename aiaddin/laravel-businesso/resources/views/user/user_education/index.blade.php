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
      select[name='language'] {
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
    <h4 class="page-title">{{ __('Training') }}</h4>
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
        <a href="#">{{ __('Training Section') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Training') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">{{ __('Training') }}</div>
            </div>
            <div class="col-lg-3">
            </div>
            <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
              @if (!is_null($userDefaultLang))
                <a href="#" class="btn btn-primary float-right btn-sm" data-toggle="modal"
                  data-target="#createModal"><i class="fas fa-plus"></i> {{ __('Add Training') }}</a>
                <button class="btn btn-danger float-right btn-sm mr-2 d-none bulk-delete"
                  data-href="{{ route('user.experience.bulk.delete') }}"><i class="flaticon-interface-5"></i>
                  {{ __('delete') }}</button>
              @endif
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (is_null($userDefaultLang))
                <h3 class="text-center">{{ __('No Language Found') }}</h3>
              @else
                @if (count($educations) == 0)
                  <h3 class="text-center">{{ __('No Information Found') }}</h3>
                @else
                  <div class="table-responsive">
                    <table class="table table-striped mt-3" id="basic-datatables">
                      <thead>
                        <tr>
                          <th scope="col">
                            <input type="checkbox" class="bulk-check" data-val="all">
                          </th>
                          <th scope="col">{{ __('Type of training') }}</th>
                          <th scope="col">{{ __('Start date') }}</th>
                          <th scope="col">{{ __('End date') }}</th>
                          <th scope="col">{{ __('Actions') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        @foreach ($educations as $key => $education)
                          <tr>
                            <td>
                              <input type="checkbox" class="bulk-check" data-val="{{ $education->id }}">
                            </td>

                            <td>
                              {{ strlen($education->degree_name) > 30
                                  ? mb_substr($education->degree_name, 0, 30, 'UTF-8') . '...'
                                  : $education->degree_name }}
                            </td>
                            @php
                              $start_date = \Carbon\Carbon::parse($education->start_date);
                              $end_date = \Carbon\Carbon::parse($education->end_date);
                            @endphp
                            <td>
                              {{ $start_date->translatedFormat('jS F, Y') }}
                            </td>
                            <td>
                              {{ $end_date->translatedFormat('jS F, Y') }}
                            </td>
                            <td>
                              <a class="btn btn-secondary btn-sm"
                                href="{{ route('user.experience.edit', $education->id) . '?language=' . request()->input('language') }}">
                                <span class="btn-label">
                                  <i class="fas fa-edit"></i>
                                </span>
                                {{ __('Edit') }}
                              </a>
                              <form class="deleteform d-inline-block" action="{{ route('user.experience.delete') }}"
                                method="post">
                                @csrf
                                <input type="hidden" name="id" value="{{ $education->id }}">
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
          <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add Training') }}</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">

          <form id="ajaxForm" enctype="multipart/form-data" class="modal-form"
            action="{{ route('user.experience.store') }}" method="POST">
            @csrf
            <div class="row">
              <div class="col-lg-6">
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
              </div>
              <div class="col-lg-6">
                <div class="form-group">
                  <label for="">{{ __('Training type') }} **</label>
                  <input type="text" class="form-control" name="degree_name"
                    placeholder="{{ __('Enter Training Type') }}" value="">
                  <p id="errdegree_name" class="mb-0 text-danger em"></p>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label for="">{{ __('Short description') }}</label>
              <textarea name="short_description" class="form-control" rows="5" placeholder="{{ __('Enter_Content') }}"></textarea>
            </div>
            <div class="row">
              <div class="col-lg-6">
                <div class="form-group">
                  <label for="">{{ __('Start Date') }} </label>
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
            <div class="form-group">
              <label for="">{{ __('Display priority') }} **</label>
              <input type="number" class="form-control" name="serial_number" value=""
                placeholder="{{ __('Enter_Serial_Number') }}">
              <p id="errserial_number" class="mb-0 text-danger em"></p>
              <p class="text-warning mb-0">
                <small>{{ __('Enter 1 to view as first result, 2 as second, etc..') }}</small>
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
