@extends('user.layout')

@php
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::id()],
      ['is_default', 1],
  ])->first();
  $userLanguages = \App\Models\User\Language::where('user_id', \Illuminate\Support\Facades\Auth::id())->get();
  Config::set('app.timezone', $userBs->timezoneinfo->timezone);
@endphp

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Testimonials') }}</h4>
    <ul class="breadcrumbs">
      <li class="nav-home">
        <a href="{{ route('user-dashboard') . '?language=' . request('language') }} ">
          <i class="flaticon-home"></i>
        </a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Testimonial_Page') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Testimonials') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">{{ __('Testimonials') }}</div>
            </div>
            <div class="col-lg-3">
              @includeIf('user.partials.languages')
            </div>
            <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
              <a href="#" class="btn btn-primary float-right btn-sm" data-toggle="modal"
                data-target="#createModal"><i class="fas fa-plus"></i> {{ __('Add_Testimonial') }}</a>
              <button class="btn btn-danger float-right btn-sm mr-2 d-none bulk-delete"
                data-href="{{ route('user.testimonial.bulk.delete') }}"><i class="flaticon-interface-5"></i>
                {{ __('Delete') }}</button>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (is_null($userDefaultLang))
                <h3 class="text-center">{{ __('NO_LANGUAGE_FOUND') }}</h3>
              @else
                @if (count($testimonials) == 0)
                  <h3 class="text-center">{{ __('NO_TESTIMONIAL_FOUND') }}</h3>
                @else
                  <div class="table-responsive">
                    <table class="table table-striped mt-3" id="basic-datatables">
                      <thead>
                        <tr>
                          <th scope="col">
                            <input type="checkbox" class="bulk-check" data-val="all">
                          </th>
                          @if ($userBs->theme !== 'home_nine')
                            <th scope="col">{{ __('Image') }}</th>
                          @endif
                          <th scope="col">{{ __('Name') }}</th>
                          <th scope="col">{{ __('Publish_Date') }}</th>
                          <th scope="col">{{ __('Serial_Number') }}</th>
                          <th scope="col">{{ __('Actions') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        @foreach ($testimonials as $key => $testimonial)
                          <tr>
                            <td>
                              <input type="checkbox" class="bulk-check" data-val="{{ $testimonial->id }}">
                            </td>
                            @if ($userBs->theme !== 'home_nine')
                              <td><img src="{{ asset('assets/front/img/user/testimonials/' . $testimonial->image) }}"
                                  alt="" width="80"></td>
                            @endif
                            <td>
                              {{ strlen($testimonial->name) > 30 ? mb_substr($testimonial->name, 0, 30, 'UTF-8') . '...' : $testimonial->name }}
                            </td>
                            <td>
                              @php
                                $date = \Carbon\Carbon::parse($testimonial->created_at);
                              @endphp
                              {{ $date->translatedFormat('jS F, Y') }}
                            </td>
                            <td>{{ $testimonial->serial_number }}</td>
                            <td>
                              <a class="btn btn-secondary btn-sm"
                                href="{{ route('user.testimonial.edit', $testimonial->id) . '?language=' . $testimonial->language->code }}">
                                <span class="btn-label">
                                  <i class="fas fa-edit"></i>
                                </span>
                                {{ __('Edit') }}
                              </a>
                              <form class="deleteform d-inline-block" action="{{ route('user.testimonial.delete') }}"
                                method="post">
                                @csrf
                                <input type="hidden" name="id" value="{{ $testimonial->id }}">
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
          <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add_Testimonial') }}</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">

          <form id="ajaxForm" enctype="multipart/form-data" class="modal-form"
            action="{{ route('user.testimonial.store') }}" method="POST">
            @csrf
            @if ($userBs->theme !== 'home_nine')
              <div class="row">
                <div class="col-lg-12">
                  <div class="form-group">
                    <div class="col-12 mb-2">
                      <label for="image"><strong>{{ __('Image') }}*</strong></label>
                    </div>
                    <div class="col-md-12 showImage mb-3">
                      <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." class="img-thumbnail">
                    </div>
                    <input type="file" name="image" id="image" class="form-control">
                    <p id="errimage" class="mb-0 text-danger em"></p>
                  </div>
                </div>
              </div>
            @endif
            <div class="form-group">
              <label for="">{{ __('Language') }} **</label>
              <select name="user_language_id" class="form-control">
                <option value="" selected disabled>{{ __('Select_a_language') }}</option>
                @foreach ($userLanguages as $lang)
                  <option value="{{ $lang->id }}">{{ $lang->name }}</option>
                @endforeach
              </select>
              <p id="erruser_language_id" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Name') }} **</label>
              <input type="text" class="form-control" name="name" value=""
                placeholder="{{ __('Enter_Name') }}">
              <p id="errname" class="mb-0 text-danger em"></p>
            </div>
            @if ($userBs->theme !== 'home_nine')
              <div class="form-group">
                <label for="">{{ __('Occupation') }}</label>
                <input type="text" class="form-control" name="occupation" value=""
                  placeholder="{{ __('Enter_occupation') }}">
                <p id="erroccupation" class="mb-0 text-danger em"></p>
              </div>
            @endif
            <div class="form-group">
              <label for="">{{ __('Feedback') }} **</label>
              <textarea class="form-control " name="content" rows="5" placeholder="{{ __('Enter_content') }}"></textarea>
              <p id="errcontent" class="mb-0 text-danger em"></p>
            </div>

            <div class="form-group">
              <label for="">{{ __('Serial_Number') }} **</label>
              <input type="number" class="form-control" name="serial_number" value=""
                placeholder="{{ __('Enter_Serial_Number') }}">
              <p id="errserial_number" class="mb-0 text-danger em"></p>
              <p class="text-warning mb-0">
                <small>{{ __('Testimonial_Serial_Number_text') }}</small>
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
