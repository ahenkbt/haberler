@extends('user.layout')

@php
  $userLanguages = \App\Models\User\Language::where('user_id', \Illuminate\Support\Facades\Auth::id())->get();
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::id()],
      ['is_default', 1],
  ])->first();
@endphp

@includeIf('user.partials.rtl-style')

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Working Process Section') }}</h4>
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
        <a href="#">{{ __('Working Process Section') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-12">

      <div class="card">
        <div class="card-body">
          <div class="row justify-content-center">
            <div class="col-lg-3">
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-lg-5">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-6">
              <div class="card-title">{{ __('Texts & Images') }}</div>
            </div>
            <div class=" col-lg-6">
              @if (!is_null($userDefaultLang))
                @if (!empty($userLanguages))
                  <select name="userLanguage" class="form-control"
                    onchange="window.location='{{ url()->current() . '?language=' }}'+this.value">
                    <option value="" selected disabled>{{ __('Select a Language') }}</option>
                    @foreach ($userLanguages as $lang)
                      <option value="{{ $lang->code }}"
                        {{ $lang->code == request()->input('language') ? 'selected' : '' }}>
                        {{ $lang->name }}
                      </option>
                    @endforeach
                  </select>
                @endif
              @endif
            </div>
          </div>
        </div>

        <div class="card-body ">
          <div class="row">
            <div class="col-lg-12">
              <form id="skillSecForm"
                action="{{ route('user.home_page.update_work_process_section', ['language' => $language->code]) }}"
                method="POST" enctype="multipart/form-data">
                @csrf
                @if (
                    $userBs->theme === 'home_two' ||
                        $userBs->theme === 'home_six' ||
                        $userBs->theme === 'home_four' ||
                        $userBs->theme === 'home_five')
                  <div class="form-group">
                    <div class="col-12 mb-2">
                      <label for="">{{ __('Image') }}</label>
                    </div>
                    <div class="col-md-12 showImage mb-3">
                      <img
                        src="{{ isset($data->work_process_section_img) ? asset('assets/front/img/work_process/' . $data->work_process_section_img) : asset('assets/admin/img/noimage.jpg') }}"
                        alt="..." class="img-thumbnail">
                    </div>
                    <input type="file" name="work_process_section_img" id="image" class="form-control image">
                    @if ($errors->has('work_process_section_img'))
                      <p class="mt-2 mb-0 text-danger">
                        {{ $errors->first('work_process_section_img') }}</p>
                    @endif
                  </div>
                @endif
                <div class="form-group">
                  <div class="row">
                    <div class="col-lg-12">
                      <label for="">{{ __('Title') }}</label>
                      <input type="text" class="form-control" name="work_process_section_title"
                        value="{{ $data->work_process_section_title ?? '' }}" placeholder="{{ __('Enter title') }}">
                      @if ($errors->has('work_process_section_title'))
                        <p class="mt-2 mb-0 text-danger">
                          {{ $errors->first('work_process_section_title') }}</p>
                      @endif
                    </div>
                  </div>
                </div>
                @if ($userBs->theme != 'home_seven')
                  <div class="form-group">
                    <div class="row">
                      <div class="col-lg-12">
                        <label for="">{{ __('Subtitle') }}</label>
                        <input type="text" class="form-control" name="work_process_section_subtitle"
                          value="{{ $data->work_process_section_subtitle ?? '' }}"
                          placeholder="{{ __('Enter subtitle') }}">
                        @if ($errors->has('work_process_section_subtitle'))
                          <p class="mt-2 mb-0 text-danger">
                            {{ $errors->first('work_process_section_subtitle') }}</p>
                        @endif
                      </div>
                    </div>
                  </div>
                @endif
                @if ($userBs->theme != 'home_six')
                  <div class="form-group">
                    <label for="">{{ __('Text') }}</label>
                    <textarea class="form-control" name="work_process_section_text" rows="5" cols="80"
                      placeholder="{{ __('Enter_content') }}">{{ $data->work_process_section_text ?? null }}</textarea>
                    @if ($errors->has('work_process_section_text'))
                      <p class="mt-2 mb-0 text-danger">
                        {{ $errors->first('work_process_section_text') }}</p>
                    @endif
                  </div>
                @endif

                @if ($userBs->theme === 'home_two')
                  <div class="form-group">
                    <div class="col-12 mb-2">
                      <label for="">{{ __('Video Image') }}</label>
                    </div>
                    <div class="col-md-12 showTestimonialImage mb-3">
                      <img
                        src="{{ isset($data->work_process_section_video_img) ? asset('assets/front/img/work_process/' . $data->work_process_section_video_img) : asset('assets/admin/img/noimage.jpg') }}"
                        alt="..." class="img-thumbnail">
                    </div>
                    <input type="file" name="work_process_section_video_img" id="testimonial_image"
                      class="form-control image">
                    @if ($errors->has('work_process_section_video_img'))
                      <p class="mt-2 mb-0 text-danger">
                        {{ $errors->first('work_process_section_video_img') }}</p>
                    @endif
                  </div>
                  <div class="form-group">
                    <label for="">{{ __('Video URL') }}</label>
                    <input type="text" class="form-control" name="work_process_section_video_url"
                      value="{{ $data->work_process_section_video_url ?? '' }}"
                      placeholder="{{ __('Enter video url') }}">
                    @if ($errors->has('work_process_section_video_url'))
                      <p class="mt-2 mb-0 text-danger">
                        {{ $errors->first('work_process_section_video_url') }}</p>
                    @endif
                  </div>
                @endif
                @if ($userBs->theme === 'home_four' || $userBs->theme === 'home_five' || $userBs->theme === 'home_seven')
                  <div class="form-group">
                    <label for="">{{ __('Button text') }}</label>
                    <input type="text" class="form-control" name="work_process_btn_txt"
                      value="{{ $data->work_process_btn_txt ?? '' }}" placeholder="{{ __('Enter button text') }}">
                    @if ($errors->has('work_process_btn_txt'))
                      <p class="mt-2 mb-0 text-danger">
                        {{ $errors->first('work_process_btn_txt') }}</p>
                    @endif
                  </div>
                  <div class="form-group">
                    <label for="">{{ __('Button URL') }}</label>
                    <input type="text" class="form-control" name="work_process_btn_url"
                      value="{{ $data->work_process_btn_url ?? '' }}" placeholder="{{ __('Enter button url') }}">
                    @if ($errors->has('work_process_btn_url'))
                      <p class="mt-2 mb-0 text-danger">
                        {{ $errors->first('work_process_btn_url') }}</p>
                    @endif
                  </div>
                @endif
              </form>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-12 text-center">
              <button type="submit" form="skillSecForm" class="btn btn-success">
                {{ __('Update') }}
              </button>
            </div>
          </div>
        </div>
      </div>


    </div>
    <div class="col-lg-7">
      <div class="card">
        <div class="card-header">
          <div class="card-title d-inline-block">{{ __('Work Processes') }}</div>
          <a href="{{ route('user.home_page.work_process_section.create_work_process') }}"
            class="btn btn-primary btn-sm float-right"><i class="fas fa-plus"></i>
            {{ __('Add Work Process') }}</a>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (count($workProcessInfos) == 0)
                <h3 class="text-center">{{ __('NO WORK PROCESS FOUND!') }}</h3>
              @else
                <div class="table-responsive">
                  <table class="table table-striped mt-3">
                    <thead>
                      <tr>
                        <th scope="col">{{ __('Icon') }}</th>
                        <th scope="col">{{ __('Title') }}</th>
                        <th scope="col">{{ __('Serial Number') }}</th>
                        <th scope="col">{{ __('Actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($workProcessInfos as $workProcessInfo)
                        <tr>
                          <td><i class="{{ $workProcessInfo->icon }}"></i></td>
                          <td>{{ $workProcessInfo->title }}</td>
                          <td>{{ $workProcessInfo->serial_number }}</td>
                          <td>
                            <a class="btn btn-secondary btn-sm mr-1"
                              href="{{ route('user.home_page.work_process_section.edit_work_process', $workProcessInfo->id) . '?language=' . request()->input('language') }}">
                              <i class="fas fa-edit"></i>
                            </a>

                            <form class="deleteform d-inline-block"
                              action="{{ route('user.home_page.work_process_section.delete_work_process') }}"
                              method="post">
                              @csrf
                              <input type="hidden" name="work_process_id" value="{{ $workProcessInfo->id }}">
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

@section('scripts')
  <script src="{{ asset('assets/admin/js/home-sections.js') }}"></script>
@endsection
