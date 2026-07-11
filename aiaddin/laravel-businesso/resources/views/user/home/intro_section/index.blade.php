@extends('user.layout')

@php
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::id()],
      ['is_default', 1],
  ])->first();
  $userLanguages = \App\Models\User\Language::where('user_id', \Illuminate\Support\Facades\Auth::id())->get();
@endphp

@includeIf('user.partials.rtl-style')

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Intro Section') }}</h4>
    <ul class="breadcrumbs">
      <li class="nav-home">
        <a href="{{ route('admin.dashboard') }}">
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
        <a href="#">{{ __('Intro Section') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-10">
              <div class="card-title">{{ __('Update Intro Section') }}</div>
            </div>

            <div class="col-lg-2">
              @if (!is_null($userDefaultLang))
                @if (!empty($userLanguages))
                  <select name="userLanguage" class="form-control"
                    onchange="window.location='{{ url()->current() . '?language=' }}'+this.value">
                    <option value="" selected disabled>{{ __('Select a Language') }}</option>
                    @foreach ($userLanguages as $lang)
                      <option value="{{ $lang->code }}"
                        {{ $lang->code == request()->input('language') ? 'selected' : '' }}>
                        {{ $lang->name }}</option>
                    @endforeach
                  </select>
                @endif
              @endif
            </div>
          </div>
        </div>

        <div class="card-body pt-5 pb-4">
          <div class="row">
            <div class="col-lg-8 offset-lg-2">
              <form id="introSecForm"
                action="{{ route('user.home_page.update_intro_section', ['language' => request()->input('language')]) }}"
                method="POST" enctype="multipart/form-data">
                @csrf
                <input type="hidden" name="old_img" value="{{ $data->intro_img }}" />
                <div class="form-group">
                  <div class="col-12 mb-2">
                    <label for="image"><strong>{{ __('Background Image') }}</strong></label>
                  </div>
                  <div class="col-md-12 showImage mb-3">
                    <img
                      src="{{ isset($data->intro_img) ? asset('assets/img/intro_section/' . $data->intro_img) : asset('assets/img/noimage.jpg') }}"
                      alt="..." class="img-thumbnail">
                  </div>
                  <input type="file" name="intro_img" id="image" class="form-control image">
                  <p id="error_intro_img" class="mb-0 text-danger em"></p>
                </div>
                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Intro Primary Title') }} * </label>
                      <input type="text" class="form-control" name="intro_primary_title"
                        value="{{ $data->intro_primary_title ?? '' }}">
                      @if ($errors->has('intro_primary_title'))
                        <p class="mt-2 mb-0 text-danger">
                          {{ $errors->first('intro_primary_title') }}</p>
                      @endif
                    </div>
                  </div>

                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Intro Secondary Title') }} * </label>
                      <input type="text" class="form-control" name="intro_secondary_title"
                        value="{{ $data->intro_secondary_title ?? '' }}">
                      @if ($errors->has('intro_secondary_title'))
                        <p class="mt-2 mb-0 text-danger">
                          {{ $errors->first('intro_secondary_title') }}</p>
                      @endif
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label for="">{{ __('Intro Text') }} *</label>
                  <textarea class="form-control" name="intro_text" rows="5" cols="80">{{ $data->intro_text ?? '' }}</textarea>
                  @if ($errors->has('intro_text'))
                    <p class="mt-2 mb-0 text-danger">{{ $errors->first('intro_text') }}</p>
                  @endif
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-12 text-center">
              <button type="submit" form="introSecForm" class="btn btn-success">
                {{ __('Update') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title d-inline-block">{{ __('Counter Information') }}</div>
          <a href="{{ route('admin.home_page.intro_section.create_count_info') . '?language=' . request()->input('language') }}"
            class="btn btn-sm btn-primary float-lg-right float-left"><i class="fas fa-plus"></i>
            {{ __('Add') }}</a>
        </div>

        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (count($counterInfos) == 0)
                <h3 class="text-center">{{ __('NO COUNTER INFO FOUND!') }}</h3>
              @else
                <div class="table-responsive">
                  <table class="table table-striped mt-3">
                    <thead>
                      <tr>
                        <th scope="col">{{ __('#') }}</th>
                        <th scope="col">{{ __('Icon') }}</th>
                        <th scope="col">{{ __('Title') }}</th>
                        <th scope="col">{{ __('Amount') }}</th>
                        <th scope="col">{{ __('Serial Number') }}</th>
                        <th scope="col">{{ __('Actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($counterInfos as $counterInfo)
                        <tr>
                          <td>{{ $loop->iteration }}</td>
                          <td><i class="{{ $counterInfo->icon }}"></i></td>
                          <td>{{ convertUtf8($counterInfo->title) }}</td>
                          <td>{{ $counterInfo->amount }}</td>
                          <td>{{ $counterInfo->serial_number }}</td>
                          <td>
                            <a class="btn btn-secondary btn-sm mr-1"
                              href="{{ route('admin.home_page.intro_section.edit_count_info', ['id' => $counterInfo->id]) . '?language=' . request()->input('language') }}">
                              <span class="btn-label">
                                <i class="fas fa-edit"></i>
                              </span>
                              {{ __('Edit') }}
                            </a>

                            <form class="deleteform d-inline-block"
                              action="{{ route('admin.home_page.intro_section.delete_count_info') }}" method="post">
                              @csrf
                              <input type="hidden" name="counterInfo_id" value="{{ $counterInfo->id }}">
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
@endsection
