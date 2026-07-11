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
    <h4 class="page-title">{{ __('Blog_Categories') }}</h4>
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
        <a href="#">{{ __('Blog') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Categories') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">

      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">{{ __('Categories') }}</div>
            </div>
            <div class="col-lg-3">
              @includeIf('user.partials.languages')
            </div>
            <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
              @if (!is_null($userDefaultLang))
                <a href="#" class="btn btn-primary float-right btn-sm" data-toggle="modal"
                  data-target="#createModal"><i class="fas fa-plus"></i> {{ __('Add_Blog_Category') }}</a>
                <button class="btn btn-danger float-right btn-sm mr-2 d-none bulk-delete"
                  data-href="{{ route('user.blog.category.bulk.delete') }}"><i class="flaticon-interface-5"></i>
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
                @if (count($bcategorys) == 0)
                  <h3 class="text-center">{{ __('NO_BLOG_CATEGORY_FOUND') }}</h3>
                @else
                  <div class="table-responsive">
                    <table class="table table-striped mt-3" id="basic-datatables">
                      <thead>
                        <tr>
                          <th scope="col">
                            <input type="checkbox" class="bulk-check" data-val="all">
                          </th>
                          @if ($userBs->theme == 'home_thirteen')
                            <th scope="col">{{ __('Image') }}</th>
                          @endif
                          <th scope="col">{{ __('Name') }}</th>
                          <th scope="col">{{ __('Status') }}</th>
                          @if ($userBs->theme == 'home_thirteen')
                            <th scope="col">{{ __('Featured') }}</th>
                          @endif
                          <th scope="col">{{ __('Serial_Number') }}</th>
                          <th scope="col">{{ __('Actions') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        @foreach ($bcategorys as $key => $bcategory)
                          <tr>
                            <td>
                              <input type="checkbox" class="bulk-check" data-val="{{ $bcategory->id }}">
                            </td>
                            @if ($userBs->theme == 'home_thirteen')
                              <td>
                                <img
                                  src="{{ $bcategory->image
                                      ? asset('assets/front/img/user/blogs/categories/' . $bcategory->image)
                                      : asset('assets/admin/img/noimage.jpg') }}"
                                  alt="category image" width="50">
                              </td>
                            @endif

                            <td>{{ $bcategory->name }}</td>
                            <td>
                              @if ($bcategory->status == 1)
                                <h2 class="d-inline-block"><span class="badge badge-success">{{ __('Active') }}</span>
                                </h2>
                              @else
                                <h2 class="d-inline-block"><span class="badge badge-danger">{{ __('Deactive') }}</span>
                                </h2>
                              @endif
                            </td>
                            @if ($userBs->theme == 'home_thirteen')
                              <td>
                                <form id="featuredForm-{{ $bcategory->id }}" class="d-inline-block"
                                  action="{{ route('user.blog.category.update_featured', ['id' => $bcategory->id]) }}"
                                  method="POST">
                                  @csrf
                                  <select
                                    class="form-control form-control-sm {{ $bcategory->is_featured == 1 ? 'bg-success' : 'bg-danger' }}"
                                    name="is_featured"
                                    onchange="document.getElementById('featuredForm-{{ $bcategory->id }}').submit();">
                                    <option value="1" {{ $bcategory->is_featured == 1 ? 'selected' : '' }}>
                                      {{ __('Yes') }}
                                    </option>
                                    <option value="0" {{ $bcategory->is_featured == 0 ? 'selected' : '' }}>
                                      {{ __('No') }}
                                    </option>
                                  </select>
                                </form>
                              </td>
                            @endif
                            <td>{{ $bcategory->serial_number }}</td>
                            <td>
                              <a class="btn btn-secondary btn-sm editbtn" href="#editModal" data-toggle="modal"
                                data-bcategory_id="{{ $bcategory->id }}" data-name="{{ $bcategory->name }}"
                                data-status="{{ $bcategory->status }}"
                                data-image="{{ $bcategory->image
                                    ? asset('assets/front/img/user/blogs/categories/' . $bcategory->image)
                                    : asset('assets/admin/img/noimage.jpg') }}"
                                data-serial_number="{{ $bcategory->serial_number }}">
                                <span class="btn-label">
                                  <i class="fas fa-edit"></i>
                                </span>
                                {{ __('Edit') }}
                              </a>
                              <form class="deleteform d-inline-block" action="{{ route('user.blog.category.delete') }}"
                                method="post">
                                @csrf
                                <input type="hidden" name="bcategory_id" value="{{ $bcategory->id }}">
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


  <!-- Create Blog Category Modal -->
  <div class="modal fade" id="createModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add_Blog_Category') }}</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <form id="ajaxForm" class="modal-form create" action="{{ route('user.blog.category.store') }}"
            method="POST">
            @csrf
            @if ($userBs->theme == 'home_thirteen')
              <div class="row">
                <div class="col-lg-12">
                  <div class="form-group">
                    <div class="col-12 mb-2">
                      <label for="image"><strong>{{ __('Thumbnail Image') }}
                          **</strong></label>
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
                placeholder="{{ __('Enter_name') }}">
              <p id="errname" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Status') }} **</label>
              <select class="form-control" name="status">
                <option value="" selected disabled>{{ __('Select_a_status') }}</option>
                <option value="1">{{ __('Active') }}</option>
                <option value="0">{{ __('Deactive') }}</option>
              </select>
              <p id="errstatus" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Serial_Number') }} **</label>
              <input type="number" class="form-control" name="serial_number" value=""
                placeholder="{{ __('Enter_Serial_Number') }}">
              <p id="errserial_number" class="mb-0 text-danger em"></p>
              <p class="text-warning"><small>{{ __('blog_category_Serial_Number_msg') }}</small></p>
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

  <!-- Edit Blog Category Modal -->
  <div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Edit_Blog_Category') }}</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <form id="ajaxEditForm" class="" action="{{ route('user.blog.category.update') }}" method="POST">
            @csrf
            <input id="inbcategory_id" type="hidden" name="bcategory_id" value="">

            @if ($userBs->theme == 'home_thirteen')
              <div class="form-group">
                <div class="col-12 mb-2">
                  <label for="image"><strong>{{ __('Thumbnail Image') }}
                      **</strong></label>
                </div>
                <div class="col-md-12 showEditImage mb-3">
                  <img src="" alt="..." class="in_image img-thumbnail">
                </div>
                <input type="file" name="image" id="edit_image" class="form-control image">
                <p id="eerrimage" class="mb-0 text-danger em"></p>
              </div>
            @endif


            <div class="form-group">
              <label for="">{{ __('Name') }} **</label>
              <input id="inname" type="name" class="form-control" name="name" value=""
                placeholder="{{ __('Enter_name') }}">
              <p id="eerrname" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Status') }} **</label>
              <select id="instatus" class="form-control" name="status">
                <option value="" selected disabled>{{ __('Select_a_status') }}</option>
                <option value="1">{{ __('Active') }}</option>
                <option value="0">{{ __('Deactive') }}</option>
              </select>
              <p id="eerrstatus" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Serial_Number') }} **</label>
              <input id="inserial_number" type="number" class="form-control" name="serial_number" value=""
                placeholder="{{ __('Enter_Serial_Number') }}">
              <p id="eerrserial_number" class="mb-0 text-danger em"></p>
              <p class="text-warning"><small>{{ __('blog_category_Serial_Number_msg') }}</small></p>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">{{ __('Close') }}</button>
          <button id="updateBtn" type="button" class="btn btn-primary">{{ __('Save_Changes') }}</button>
        </div>
      </div>
    </div>
  </div>
@endsection
@section('scripts')
  <script type="text/javascript" src="{{ asset('assets/user/js/edit-image-modal.js') }}"></script>
@endsection
