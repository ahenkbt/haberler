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
    <h4 class="page-title">{{ __('Services') }}</h4>
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
        <a href="#">{{ __('Service_Page') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Services') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">{{ __('Services') }}</div>
            </div>
            <div class="col-lg-3">
              @includeIf('user.partials.languages')
            </div>
            <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
              @if (!is_null($userDefaultLang))
                <a href="#" class="btn btn-primary float-right btn-sm" data-toggle="modal"
                  data-target="#createModal"><i class="fas fa-plus"></i> {{ __('Add_Service') }}</a>
                <button class="btn btn-danger float-right btn-sm mr-2 d-none bulk-delete"
                  data-href="{{ route('user.service.bulk.delete') }}"><i class="flaticon-interface-5"></i>
                  {{ __('Delete') }}</button>
              @endif
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (is_null($userDefaultLang))
                <h3 class="text-center">{{ __('NO_LANGUAGE_FOUND') }}</h3>
              @else
                @if (count($services) == 0)
                  <h3 class="text-center">{{ __('NO_SERVICE_FOUND') }}</h3>
                @else
                  <div class="table-responsive">
                    <table class="table table-striped mt-3" id="basic-datatables">
                      <thead>
                        <tr>
                          <th scope="col">
                            <input type="checkbox" class="bulk-check" data-val="all">
                          </th>
                          <th scope="col">{{ __('Image') }}</th>

                          @if ($userBs->theme === 'home_six' || $userBs->theme === 'home_seven' || $userBs->theme === 'home_nine')
                            <th scope="col">{{ __('Icon') }}</th>
                          @endif
                          <th scope="col">{{ __('Name') }}</th>
                          <th scope="col">{{ __('Language') }}</th>
                          @if ($userBs->theme == 'home_ten' || $userBs->theme == 'home_eleven')
                          @else
                            <th scope="col">{{ __('Featured') }}</th>
                          @endif
                          <th scope="col">{{ __('Actions') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        @foreach ($services as $key => $service)
                          <tr>
                            <td>
                              <input type="checkbox" class="bulk-check" data-val="{{ $service->id }}">
                            </td>
                            <td>
                              <img src="{{ asset('assets/front/img/user/services/' . $service->image) }}" alt=""
                                width="80">
                            </td>
                            @if ($userBs->theme === 'home_six' || $userBs->theme === 'home_seven' || $userBs->theme === 'home_nine')
                              <td>
                                <i class="{{ $service->icon }}"></i>
                              </td>
                            @endif
                            <td>
                              {{ strlen($service->name) > 30 ? mb_substr($service->name, 0, 30, 'UTF-8') . '...' : $service->name }}
                            </td>
                            <td>{{ $service->language->name }}</td>
                            @if ($userBs->theme == 'home_ten' || $userBs->theme == 'home_eleven')
                            @else
                              <td>
                                <form id="featureForm{{ $service->id }}" class="d-inline-block"
                                  action="{{ route('user.service.feature') }}" method="post">
                                  @csrf
                                  <input type="hidden" name="service_id" value="{{ $service->id }}">
                                  <select class="form-control {{ $service->featured == 1 ? 'bg-success' : 'bg-danger' }}"
                                    name="featured"
                                    onchange="document.getElementById('featureForm{{ $service->id }}').submit();">
                                    <option value="1" {{ $service->featured == 1 ? 'selected' : '' }}>
                                      {{ __('Yes') }}
                                    </option>
                                    <option value="0" {{ $service->featured == 0 ? 'selected' : '' }}>
                                      {{ __('No') }}
                                    </option>
                                  </select>
                                </form>


                              </td>
                            @endif
                            <td>
                              <a class="btn btn-secondary btn-sm"
                                href="{{ route('user.service.edit', $service->id) . '?language=' . $service->language->code }}">
                                <span class="btn-label">
                                  <i class="fas fa-edit"></i>
                                </span>
                                {{ __('Edit') }}
                              </a>
                              <form class="deleteform d-inline-block" action="{{ route('user.service.delete') }}"
                                method="post">
                                @csrf
                                <input type="hidden" name="id" value="{{ $service->id }}">
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
          <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add_Service') }}</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <form id="ajaxForm" enctype="multipart/form-data" class="modal-form"
            action="{{ route('user.service.store') }}" method="POST">
            @csrf
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
            @if ($userBs->theme === 'home_six' || $userBs->theme === 'home_seven' || $userBs->theme === 'home_nine')
              <div class="form-group">
                <label for="">{{ __('Service_Icon') }} **</label>
                <div class="btn-group d-block">
                  <button type="button" class="btn btn-primary iconpicker-component"><i
                      class="fa fa-fw fa-heart"></i></button>
                  <button type="button" class="icp icp-dd btn btn-primary dropdown-toggle" data-selected="fa-car"
                    data-toggle="dropdown">
                  </button>
                  <div class="dropdown-menu"></div>
                </div>
                <input id="inputIcon" type="hidden" name="icon" value="">
                @if ($errors->has('icon'))
                  <p class="mb-0 text-danger">{{ $errors->first('icon') }}</p>
                @endif
                <div class="text-warning mt-2">
                  <small>{{ __('Click_on_the_dropdown_icon_to_select_an_icon') }}</small>
                </div>
                <p id="erricon" class="mb-0 text-danger em"></p>
              </div>
            @endif
            <div class="form-group">
              <label for="">{{ __('Name') }} **</label>
              <input type="text" class="form-control" name="name" value=""
                placeholder="{{ __('Enter_Name') }}">
              <p id="errname" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Content') }}</label>
              <textarea class="form-control summernote" name="content" rows="8" cols="80"
                placeholder="{{ __('Enter_Content') }}"></textarea>
              <p id="errcontent" class="mb-0 text-danger em"></p>
            </div>

            <div class="form-group">
              <label for="">{{ __('Serial_Number') }} **</label>
              <input type="number" class="form-control" name="serial_number" value=""
                placeholder="{{ __('Enter_Serial_Number') }}">
              <p id="errserial_number" class="mb-0 text-danger em"></p>
              <p class="text-warning mb-0">
                <small>{{ __('Service_Serial_Number_text') }}</small>
              </p>
            </div>
            @if (
                $userBs->theme != 'home_nine' ||
                    $userBs->theme != 'home_ten' ||
                    $userBs->theme != 'home_eleven' ||
                    $userBs->theme != 'home_twelve')
            @else
              <div class="form-group">
                <label for="featured" class="my-label mr-3">{{ __('Featured') }}</label>
                <input id="featured" type="checkbox" name="featured" value="1">
                <p id="errfeatured" class="mb-0 text-danger em"></p>
              </div>
            @endif
            <div class="form-group">
              <div class="d-flex">
                <label class="mr-3">{{ __('Detail_Page') }}</label>
                <div class="radio mr-3">
                  <label><input type="radio" name="detail_page" value="1" checked
                      class="mr-1">{{ __('Enable') }}</label>
                </div>
                <div class="radio">
                  <label><input type="radio" name="detail_page" value="0"
                      class="mr-1">{{ __('Disable') }}</label>
                </div>
              </div>
              <p id="errdetail_page" class="mb-0 text-danger em"></p>
            </div>

            <div class="form-group">
              <label for="">{{ __('Meta_Keywords') }}</label>
              <input type="text" class="form-control" name="meta_keywords" value="" data-role="tagsinput"
                placeholder="{{ __('Enter_Meta_Keywords') }}">
            </div>
            <div class="form-group">
              <label for="">{{ __('Meta_Description') }}</label>
              <textarea type="text" class="form-control" name="meta_description" rows="5"
                placeholder="{{ __('Enter_Meta_Description') }}"></textarea>
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
