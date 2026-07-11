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
    <h4 class="page-title">{{ __('Blog') }}</h4>
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
        <a href="#">{{ __('Blog_Page') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Blog') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">{{ __('Blog') }}</div>
            </div>
            <div class="col-lg-3">
              @includeIf('user.partials.languages')
            </div>
            <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
              @if (!is_null($userDefaultLang))
                <a href="#" class="btn btn-primary float-right btn-sm" data-toggle="modal"
                  data-target="#createModal"><i class="fas fa-plus"></i> {{ __('Add_Blog') }}</a>
                <button class="btn btn-danger float-right btn-sm mr-2 d-none bulk-delete"
                  data-href="{{ route('user.blog.bulk.delete') }}"><i class="flaticon-interface-5"></i>
                  {{ __('Delete') }}</button>
              @endif
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (is_null($userDefaultLang))
                <h3 class="text-center">{{ 'NO_LANGUAGE_FOUND' }}</h3>
              @else
                @if (count($blogs) == 0)
                  <h3 class="text-center">{{ __('NO_BLOG_FOUND') }}</h3>
                @else
                  <div class="table-responsive">
                    <table class="table table-striped mt-3" id="basic-datatables">
                      <thead>
                        <tr>
                          <th scope="col">
                            <input type="checkbox" class="bulk-check" data-val="all">
                          </th>
                          <th scope="col">{{ __('Image') }}</th>
                          <th scope="col">{{ __('Title') }}</th>
                          <th scope="col">{{ __('Category') }}</th>
                          @if ($userBs->theme == 'home_thirteen')
                            <th scope="col">{{ __('Slider') }}</th>
                          @endif
                          @if ($userBs->theme == 'home_thirteen')
                            <th scope="col">{{ __('Featured') }}</th>
                          @endif

                          <th scope="col">{{ __('Serial_Number') }}</th>
                          <th scope="col">{{ __('Actions') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        @foreach ($blogs as $key => $blog)
                          <tr>
                            <td>
                              <input type="checkbox" class="bulk-check" data-val="{{ $blog->id }}">
                            </td>
                            <td><img src="{{ asset('assets/front/img/user/blogs/' . $blog->image) }}" alt=""
                                width="80"></td>
                            <td>
                              {{ strlen($blog->title) > 30 ? mb_substr($blog->title, 0, 30, 'UTF-8') . '...' : $blog->title }}
                            </td>
                            <td>{{ $blog->bcategory->name }}</td>

                            @if ($userBs->theme == 'home_thirteen')
                              <td>
                                <form class="d-inline-block">
                                  <select
                                    class="form-control form-control-sm {{ $blog->is_slider == 1 ? 'bg-success' : 'bg-danger' }} slider-post"
                                    data-id="{{ $blog->id }}">
                                    <option value="1" {{ $blog->is_slider == 1 ? 'selected' : '' }}>
                                      {{ __('Yes') }}
                                    </option>
                                    <option value="0" {{ $blog->is_slider == 0 ? 'selected' : '' }}>
                                      {{ __('No') }}
                                    </option>
                                  </select>
                                </form>
                                @if ($blog->is_slider == 1)
                                  <a href="#" class="btn btn-primary btn-sm" data-toggle="modal"
                                    data-target="#sliderImage{{ $blog->id }}">{{ __('Image') }}</a>
                                @endif
                              </td>
                              {{-- -- Slider Image Modal --> --}}
                              @if ($userBs->theme == 'home_thirteen')
                                @if ($blog->is_slider == 1)
                                  <!-- Modal -->
                                  <div class="modal fade" id="sliderImage{{ $blog->id }}" tabindex="-1"
                                    role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                                    <div class="modal-dialog modal-dialog-centered" role="document">
                                      <div class="modal-content">
                                        <div class="modal-header">
                                          <h5 class="modal-title" id="exampleModalLongTitle">
                                            {{ $blog->title }}</h5>
                                          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                            <span aria-hidden="true">&times;</span>
                                          </button>
                                        </div>
                                        <div class="modal-body text-center">
                                          <img
                                            src="{{ asset('assets/front/img/user/blogs/slider/' . $blog->slider_post_image) }}"
                                            class="img-fluid" alt="">
                                        </div>
                                        <div class="modal-footer">
                                          <button type="button" class="btn btn-secondary"
                                            data-dismiss="modal">{{ __('Close') }}</button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                @endif
                              @endif
                            @endif

                            @if ($userBs->theme == 'home_thirteen')
                              <td>
                                <form class="d-inline-block">
                                  <select
                                    class="form-control form-control-sm {{ $blog->is_featured == 1 ? 'bg-success' : 'bg-danger' }} featured-post"
                                    data-id="{{ $blog->id }}">
                                    <option value="1" {{ $blog->is_featured == 1 ? 'selected' : '' }}>
                                      {{ __('Yes') }}
                                    </option>
                                    <option value="0" {{ $blog->is_featured == 0 ? 'selected' : '' }}>
                                      {{ __('No') }}
                                    </option>
                                  </select>
                                </form>
                                @if ($blog->is_featured == 1)
                                  <a href="#" class="btn btn-primary btn-sm" data-toggle="modal"
                                    data-target="#featuredImage{{ $blog->id }}">{{ __('Image') }}</a>
                                @endif
                              </td>

                              @if ($blog->is_featured == 1)
                                <!-- Modal -->
                                <div class="modal fade" id="featuredImage{{ $blog->id }}" tabindex="-1"
                                  role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                                  <div class="modal-dialog modal-dialog-centered" role="document">
                                    <div class="modal-content">
                                      <div class="modal-header">
                                        <h5 class="modal-title" id="exampleModalLongTitle">
                                          {{ $blog->title }}</h5>
                                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                          <span aria-hidden="true">&times;</span>
                                        </button>
                                      </div>
                                      <div class="modal-body text-center">
                                        <img
                                          src="{{ asset('assets/front/img/user/blogs/featured/' . $blog->featured_post_image) }}"
                                          class="img-fluid" alt="">
                                      </div>
                                      <div class="modal-footer">
                                        <button type="button" class="btn btn-secondary"
                                          data-dismiss="modal">{{ __('Close') }}</button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              @endif
                            @endif
                            <td>{{ $blog->serial_number }}</td>
                            <td>
                              <a class="btn btn-secondary btn-sm"
                                href="{{ route('user.blog.edit', $blog->id) . '?language=' . $blog->language->code }}">
                                <span class="btn-label">
                                  <i class="fas fa-edit"></i>
                                </span>
                                {{ __('Edit') }}
                              </a>
                              <form class="deleteform d-inline-block" action="{{ route('user.blog.delete') }}"
                                method="post">
                                @csrf
                                <input type="hidden" name="blog_id" value="{{ $blog->id }}">
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
          <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add_Blog') }}</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">

          <form id="ajaxForm" enctype="multipart/form-data" class="modal-form"
            action="{{ route('user.blog.store') }}" method="POST">
            @csrf
            <div class="row">
              <div class="col-lg-12">
                <div class="form-group">
                  <div class="col-12 mb-2">
                    <label for="image"><strong>{{ __('Image') }}</strong></label>
                  </div>
                  <div class="col-md-12 showImage mb-3">
                    <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." class="img-thumbnail">
                  </div>
                  <input type="file" name="image" id="image" class="form-control">
                  <p id="errimage" class="mb-0 text-danger em"></p>
                </div>
              </div>
              {{-- @if ($userBs->theme == 'home_thirteen')
                <div class="col-lg-12">
                  <div class="form-group">
                    <div class="col-12 mb-2">
                      <label for="image2"><strong>{{ __('Thumbnail Image') }}</strong></label>
                    </div>
                    <div class="col-md-12 showImage2 mb-3">
                      <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." class="img-thumbnail">
                    </div>
                    <input type="file" name="image2" id="image2" class="form-control image2">
                    <p id="errimage" class="mb-0 text-danger em"></p>
                  </div>
                </div>
              @endif --}}
            </div>

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
              <label for="">{{ __('Title') }} **</label>
              <input type="text" class="form-control" name="title" placeholder="{{ __('Enter_title') }}"
                value="">
              <p id="errtitle" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Category') }} **</label>
              <select id="ucategory" class="form-control" name="category" disabled>
                <option value="" selected disabled>{{ __('Select_a_category') }}</option>
              </select>
              <p id="errcategory" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Content') }} **</label>
              <textarea class="form-control summernote" name="content" rows="8" cols="80"
                placeholder__="{{ 'Enter_content' }}"></textarea>
              <p id="errcontent" class="mb-0 text-danger em"></p>
            </div>

            <div class="form-group">
              <label for="">{{ __('Serial_Number') }} **</label>
              <input type="number" class="form-control" name="serial_number" value=""
                placeholder="{{ __('Enter_Serial_Number') }}">
              <p id="errserial_number" class="mb-0 text-danger em"></p>
              <p class="text-warning mb-0"><small>{{ __('bolg_Serial_Number_msg') }}</small></p>
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
  {{-- slider-post modal --}}
  @include('user.blog.blog.slider-post')
  {{-- featured-post modal --}}
  @include('user.blog.blog.featured-post')
@endsection

@section('scripts')
  <script>
    "use strict";
    const currUrl = "{{ url()->current() }}";
    const mainURL = "{{ url('/') }}";
  </script>
  <script type="text/javascript" src="{{ asset('assets/user/js/post.js') }}"></script>
@endsection
