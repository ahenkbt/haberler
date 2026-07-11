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
    <h4 class="page-title">{{ __('Jobs') }}</h4>
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
        <a href="#">{{ __('Jobs') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">

      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">{{ __('Jobs') }}</div>
            </div>
            <div class="col-lg-3">
              @includeIf('user.partials.languages')
            </div>
            <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
              <a href="{{ route('user.job.create') . '?language=' . request()->input('language') }}"
                class="btn btn-primary float-lg-right float-left btn-sm"><i class="fas fa-plus"></i>
                {{ __('Post_Job') }}</a>
              <button class="btn btn-danger float-right btn-sm mr-2 d-none bulk-delete"
                data-href="{{ route('user.job.bulk.delete') }}"><i class="flaticon-interface-5"></i>
                {{ __('Delete') }}</button>
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (count($jobs) == 0)
                <h3 class="text-center">{{ __('NO_JOB_FOUND') }}</h3>
              @else
                <div class="table-responsive">
                  <table class="table table-striped mt-3" id="basic-datatables">
                    <thead>
                      <tr>
                        <th scope="col">
                          <input type="checkbox" class="bulk-check" data-val="all">
                        </th>
                        <th scope="col">{{ __('Title') }}</th>
                        <th scope="col">{{ __('Category') }}</th>
                        <th scope="col">{{ __('Vacancy') }}</th>
                        <th scope="col">{{ __('Serial_Number') }}</th>
                        <th scope="col" width="17%">{{ __('Actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($jobs as $key => $job)
                        <tr>
                          <td>
                            <input type="checkbox" class="bulk-check" data-val="{{ $job->id }}">
                          </td>
                          <td>
                            {{ strlen($job->title) > 70 ? mb_substr($job->title, 0, 70, 'UTF-8') . '...' : $job->title }}
                          </td>
                          <td>
                            @if (!empty($job->jcategory))
                              {{ convertUtf8($job->jcategory->name) }}
                            @endif
                          </td>
                          <td>{{ $job->vacancy }}</td>
                          <td>{{ $job->serial_number }}</td>
                          <td width="17%">
                            <a class="btn btn-secondary btn-sm"
                              href="{{ route('user.job.edit', $job->id) . '?language=' . request()->input('language') }}">
                              <i class="fas fa-edit"></i>
                            </a>
                            <form class="deleteform d-inline-block" action="{{ route('user.job.delete') }}"
                              method="post">
                              @csrf
                              <input type="hidden" name="job_id" value="{{ $job->id }}">
                              <button type="submit" class="btn btn-danger btn-sm deletebtn">
                                <i class="fas fa-trash"></i>
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

@endsection
