@extends('user.layout')
@php
  $selLang = \App\Models\Language::where([
      ['code', \Illuminate\Support\Facades\Session::get('currentLangCode')],
  ])->first();
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::guard('web')->user()->id],
      ['is_default', 1],
  ])->first();
  $userLanguages = \App\Models\User\Language::where(
      'user_id',
      \Illuminate\Support\Facades\Auth::guard('web')->user()->id,
  )->get();
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
    <h4 class="page-title">{{ __('Item_Categories') }}</h4>
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
        <a href="#">{{ __('Shop_Management') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Manage_Items') }}</a>
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
              <a href="#" class="btn btn-primary float-right btn-sm" data-toggle="modal"
                data-target="#createModal"><i class="fas fa-plus"></i> {{ __('Add_Category') }}</a>
              <button class="btn btn-danger float-right btn-sm mr-2 d-none bulk-delete"
                data-href="{{ route('user.itemcategory.bulk.delete') }}"><i class="flaticon-interface-5"></i>
                {{ __('Delete') }}</button>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (count($itemcategories) == 0)
                <h3 class="text-center">{{ __('NO_ITEM_CATEGORY_FOUND') }}</h3>
              @else
                <div class="table-responsive">
                  <table class="table table-striped mt-3">
                    <thead>
                      <tr>
                        <th scope="col">
                          <input type="checkbox" class="bulk-check" data-val="all">
                        </th>
                        <th scope="col">{{ __('Name') }}</th>
                        <th scope="col">{{ __('Image') }}</th>
                        @if (
                            $userBs->theme != 'home_eight' &&
                                $userBs->theme != 'home_nine' &&
                                $userBs->theme != 'home_ten' &&
                                $userBs->theme != 'home_eleven' &&
                                $userBs->theme != 'home_twelve')
                          <th scope="col">{{ __('Featured') }}</th>
                        @endif
                        @if ($userBs->theme == 'home_fourteen')
                          <th scope="col">{{ __('Footer') }}</th>
                        @endif
                        <th scope="col">{{ __('Status') }}</th>
                        <th scope="col">{{ __('Actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($itemcategories as $key => $category)
                        <tr>
                          <td>
                            <input type="checkbox" class="bulk-check" data-val="{{ $category->id }}">
                          </td>

                          <td>{{ convertUtf8($category->name) }}</td>
                          <td>
                            <img
                              src="{{ $category->image ? asset('assets/front/img/user/items/categories/' . $category->image) : asset('assets/admin/img/noimage.jpg') }}"
                              alt="..." class="img-thumbnail">
                          </td>
                          @if (
                              $userBs->theme != 'home_eight' &&
                                  $userBs->theme != 'home_nine' &&
                                  $userBs->theme != 'home_ten' &&
                                  $userBs->theme != 'home_eleven' &&
                                  $userBs->theme != 'home_twelve')
                            <td>
                              <form class="d-inline-block" action="{{ route('user.itemcategory.feature') }}"
                                id="featureForm{{ $category->id }}" method="POST">
                                @csrf
                                <input type="hidden" name="category_id" value="{{ $category->id }}">
                                <select name="is_feature" id=""
                                  class="form-control form-control-sm 
                                                                        @if ($category->is_feature == 1) bg-success
                                                                        @else
                                                                        bg-danger @endif
                                                                        "
                                  onchange="document.getElementById('featureForm{{ $category->id }}').submit();">
                                  <option value="1" {{ $category->is_feature == 1 ? 'selected' : '' }}>
                                    {{ __('Yes') }}</option>
                                  <option value="0" {{ $category->is_feature == 0 ? 'selected' : '' }}>
                                    {{ __('No') }}</option>
                                </select>
                              </form>
                            </td>
                          @endif
                          @if ($userBs->theme == 'home_fourteen')
                            <td>
                              <form class="d-inline-block" action="{{ route('user.itemcategory.footer') }}"
                                id="footerForm{{ $category->id }}" method="POST">
                                @csrf
                                <input type="hidden" name="category_id" value="{{ $category->id }}">
                                <select name="is_footer" id=""
                                  class="form-control form-control-sm 
                                                                        @if ($category->is_footer == 1) bg-success
                                                                        @else
                                                                        bg-danger @endif
                                                                        "
                                  onchange="document.getElementById('footerForm{{ $category->id }}').submit();">
                                  <option value="1" {{ $category->is_footer == 1 ? 'selected' : '' }}>
                                    {{ __('Yes') }}</option>
                                  <option value="0" {{ $category->is_footer == 0 ? 'selected' : '' }}>
                                    {{ __('No') }}</option>
                                </select>
                              </form>
                            </td>
                          @endif
                          <td>
                            @if ($category->status == 1)
                              <h2 class="d-inline-block"><span class="badge badge-success">{{ __('Active') }}</span>
                              </h2>
                            @else
                              <h2 class="d-inline-block"><span class="badge badge-danger">{{ __('Deactive') }}</span>
                              </h2>
                            @endif
                          </td>
                          <td>
                            <a class="btn btn-secondary btn-sm editbtn"
                              href="{{ route('user.itemcategory.edit', $category->id) . '?language=' . request()->input('language') }}">
                              <span class="btn-label">
                                <i class="fas fa-edit"></i>
                              </span>
                              {{ __('Edit') }}
                            </a>
                            <form class="deleteform d-inline-block" action="{{ route('user.itemcategory.delete') }}"
                              method="post">
                              @csrf
                              <input type="hidden" name="category_id" value="{{ $category->id }}">
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
        <div class="card-footer">
          <div class="row">
            <div class="d-inline-block mx-auto">
              {{ $itemcategories->appends(['language' => request()->input('language')])->links() }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>


  <!-- Create Service Category Modal -->
  <div class="modal fade" id="createModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add_Item_Category') }}</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <form id="ajaxForm" class="modal-form" enctype="multipart/form-data"
            action="{{ route('user.itemcategory.store') }}" method="POST">
            @csrf
            <p id="errslug" class="mb-0 text-danger em"></p>
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


            <div class="form-group">
              <div class="col-12 mb-2">
                <label for="image"><strong>{{ __('Category_Image') }} **</strong></label>
              </div>
              <div class="col-md-12 showImage mb-3">
                <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." class="img-thumbnail">
              </div>
              <input type="file" name="image" id="image" class="form-control">
              <p id="errimage" class="mb-0 text-danger em"></p>
            </div>


            <div class="form-group">
              <label for=""> {{ __('Name') }} **</label>
              <input type="text" class="form-control" name="name" value=""
                placeholder="{{ __('Enter_name') }}">
              <p id="errname" class="mb-0 text-danger em"></p>
            </div>

            <div class="form-group">
              <label for=""> {{ __('Status') }} **</label>
              <select class="form-control" name="status">
                <option value="" selected disabled>{{ __('Select_a_status') }} </option>
                <option value="1"> {{ __('Active') }}</option>
                <option value="0"> {{ __('Deactive') }}</option>
              </select>
              <p id="errstatus" class="mb-0 text-danger em"></p>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal"> {{ __('Close') }}</button>
          <button id="submitBtn" type="button" class="btn btn-primary"> {{ __('Submit') }}</button>
        </div>
      </div>
    </div>
  </div>



@endsection

@section('scripts')
  <script>
    $(document).ready(function() {

      // make input fields RTL
      $("select[name='language_id']").on('change', function() {
        $(".request-loader").addClass("show");
        let url = "{{ url('/') }}/admin/rtlcheck/" + $(this).val();
        console.log(url);
        $.get(url, function(data) {
          $(".request-loader").removeClass("show");
          if (data == 1) {
            $("form.modal-form input").each(function() {
              if (!$(this).hasClass('ltr')) {
                $(this).addClass('rtl');
              }
            });
            $("form.modal-form select").each(function() {
              if (!$(this).hasClass('ltr')) {
                $(this).addClass('rtl');
              }
            });
            $("form.modal-form textarea").each(function() {
              if (!$(this).hasClass('ltr')) {
                $(this).addClass('rtl');
              }
            });
            $("form.modal-form .nicEdit-main").each(function() {
              $(this).addClass('rtl text-right');
            });

          } else {
            $("form.modal-form input, form.modal-form select, form.modal-form textarea")
              .removeClass('rtl');
            $("form.modal-form .nicEdit-main").removeClass('rtl text-right');
          }
        })
      });
    });
  </script>
@endsection
