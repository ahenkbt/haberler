@extends('user.layout')

@if (!empty($blog->language) && $blog->language->rtl == 1)
  @section('styles')
    <style>
      form input,
      form textarea,
      form select {
        direction: rtl;
      }

      form .note-editor.note-frame .note-editing-area .note-editable {
        direction: rtl;
        text-align: right;
      }
    </style>
  @endsection
@endif

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Edit_Blog') }}</h4>
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
        <a href="#">{{ __('Blog_Page') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Edit_Blog') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="card-title d-inline-block">{{ __('Edit_Blog') }}</div>
          <a class="btn btn-info btn-sm float-right d-inline-block"
            href="{{ route('user.blog.index') . '?language=' . $blog->language->code }}">
            <span class="btn-label">
              <i class="fas fa-backward"></i>
            </span>
            {{ __('Back') }}
          </a>
        </div>
        <div class="card-body pt-5 pb-5">
          <div class="row">
            <div class="col-lg-10 offset-lg-1">
              <form id="ajaxForm" class="" action="{{ route('user.blog.update') }}" method="post"
                enctype="multipart/form-data">
                @csrf
                <input type="hidden" name="blog_id" value="{{ $blog->id }}">
                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <div class="col-12 mb-2">
                        <label for="image"><strong>{{ __('Image') }}</strong></label>
                      </div>
                      <div class="col-md-12 showImage mb-3">
                        <img
                          src="{{ $blog->image ? asset('assets/front/img/user/blogs/' . $blog->image) : asset('assets/admin/img/noimage.jpg') }}"
                          alt="..." class="img-thumbnail">
                      </div>
                      <input type="file" name="image" id="image" class="form-control">
                      <p id="errimage" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  {{-- @if ($userBs->theme == 'home_thirteen')
                    <div class="col-lg-6">
                      <div class="form-group">
                        <div class="col-12 mb-2">
                          <label for="image2"><strong>{{ __('Thumbnail Image') }}</strong></label>
                        </div>
                        <div class="col-md-12 showImage2 mb-3">
                          <img
                            src="{{ $blog->image2 ? asset('assets/front/img/user/blogs/' . $blog->image2) : asset('assets/admin/img/noimage.jpg') }}"
                            alt="..." class="img-thumbnail2">
                        </div>
                        <input type="file" name="image2" id="image2" class="form-control">
                        <p id="errimage2" class="mb-0 text-danger em"></p>
                      </div>
                    </div>
                  @endif --}}
                </div>
                <div class="form-group">
                  <label for="">{{ __('Title') }} **</label>
                  <input type="text" class="form-control" name="title" value="{{ $blog->title }}"
                    placeholder="{{ __('Enter_title') }}">
                  <p id="errtitle" class="mb-0 text-danger em"></p>
                </div>
                <div class="form-group">
                  <label for="">{{ __('Category') }} **</label>
                  <select class="form-control" name="category">
                    <option value="" selected disabled>{{ __('Select_a_category') }}</option>
                    @foreach ($bcats as $key => $bcat)
                      <option value="{{ $bcat->id }}" {{ $bcat->id == $blog->bcategory->id ? 'selected' : '' }}>
                        {{ $bcat->name }}</option>
                    @endforeach
                  </select>
                  <p id="errcategory" class="mb-0 text-danger em"></p>
                </div>
                <div class="form-group">
                  <label for="">{{ __('Content') }} **</label>
                  <textarea class="form-control summernote" name="content" data-height="300" placeholder="{{ __('Enter_content') }}">{{ replaceBaseUrl($blog->content) }}</textarea>
                  <p id="errcontent" class="mb-0 text-danger em"></p>
                </div>

                <div class="form-group">
                  <label for="">{{ __('Serial_Number') }} **</label>
                  <input type="number" class="form-control" name="serial_number" value="{{ $blog->serial_number }}"
                    placeholder="{{ __('Enter_Serial_Number') }}">
                  <p id="errserial_number" class="mb-0 text-danger em"></p>
                  <p class="text-warning"><small>{{ __('bolg_Serial_Number_msg') }}</small></p>
                </div>
                <div class="form-group">
                  <label for="">{{ __('Meta_Keywords') }}</label>
                  <input type="text" class="form-control" name="meta_keywords" value="{{ $blog->meta_keywords }}"
                    data-role="tagsinput">
                  <p id="errmeta_keywords" class="mb-0 text-danger em"></p>
                </div>
                <div class="form-group">
                  <label for="">{{ __('Meta_Description') }}</label>
                  <textarea type="text" class="form-control" name="meta_description" rows="5">{{ $blog->meta_description }}</textarea>
                  <p id="errmeta_description" class="mb-0 text-danger em"></p>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <div class="form">
            <div class="form-group from-show-notify row">
              <div class="col-12 text-center">
                <button type="submit" id="submitBtn" class="btn btn-success">{{ __('Update') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
@endsection
