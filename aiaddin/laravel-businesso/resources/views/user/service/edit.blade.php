@extends('user.layout')

@if (!empty($service->language) && $service->language->rtl == 1)
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
        <h4 class="page-title">{{ __('Edit_Service') }}</h4>
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
                <a href="#">{{ __('Edit_Service') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">{{ __('Edit_Service') }}</div>
                    <a class="btn btn-info btn-sm float-right d-inline-block"
                        href="{{ route('user.services.index') . '?language=' . $service->language->code }}">
                        <span class="btn-label">
                            <i class="fas fa-backward"></i>
                        </span>
                        {{ __('Back') }}
                    </a>
                </div>
                <div class="card-body pt-5 pb-5">
                    <div class="row">
                        <div class="col-lg-6 offset-lg-3">
                            <form id="ajaxForm" class="" action="{{ route('user.service.update') }}" method="post"
                                enctype="multipart/form-data">
                                @csrf
                                <input type="hidden" name="id" value="{{ $service->id }}">
                                <div class="row">
                                    <div class="col-lg-12">
                                        <div class="form-group">
                                            <div class="col-12 mb-2">
                                                <label for="image"><strong>{{ __('Image') }}*</strong></label>
                                            </div>
                                            <div class="col-md-12 showImage mb-3">
                                                <img src="{{ isset($service->image) ? asset('assets/front/img/user/services/' . $service->image) : asset('assets/admin/img/noimage.jpg') }}"
                                                    alt="..." class="img-thumbnail">
                                            </div>
                                            <input type="file" name="image" id="image" class="form-control">
                                            <p id="errimage" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>
                                @if ($userBs->theme === 'home_six' || $userBs->theme === 'home_seven' || $userBs->theme === 'home_nine')
                                    <div class="form-group">
                                        <label for="">{{ __('Service_Icon') }} **</label>
                                        <div class="btn-group d-block">
                                            <button type="button" class="btn btn-primary iconpicker-component"><i
                                                    class="{{ $service->icon }}"></i></button>
                                            <button type="button" class="icp icp-dd btn btn-primary dropdown-toggle"
                                                data-selected="fa-car" data-toggle="dropdown">
                                            </button>
                                            <div class="dropdown-menu"></div>
                                        </div>
                                        <input id="inputIcon" type="hidden" name="icon" value="{{ $service->icon }}">
                                        @if ($errors->has('icon'))
                                            <p class="mb-0 text-danger">{{ $errors->first('icon') }}</p>
                                        @endif
                                        <div class="mt-2">
                                            <small>{{ __('Click_on_the_dropdown_icon_to_select_an_icon') }}</small>
                                        </div>
                                    </div>
                                @endif
                                <div class="form-group">
                                    <label for="">{{ __('Name') }}*</label>
                                    <input type="text" class="form-control" name="name" value="{{ $service->name }}" placeholder="{{ __('Enter_Name') }}">
                                    <p id="errname" class="mb-0 text-danger em"></p>
                                </div>
                                <div class="form-group">
                                    <label for="">{{ __('Content') }} </label>
                                    <textarea class="form-control summernote" name="content" data-height="300" placeholder="{{ __('Enter_Content') }}">{{ replaceBaseUrl($service->content) }}</textarea>
                                    <p id="errcontent" class="mb-0 text-danger em"></p>
                                </div>

                                <div class="form-group">
                                    <label for="">{{ __('Serial_Number') }} **</label>
                                    <input type="number" class="form-control" name="serial_number"
                                        value="{{ $service->serial_number }}" placeholder="{{ __('Enter_Serial_Number') }}">
                                    <p id="errserial_number" class="mb-0 text-danger em"></p>
                                    <p class="text-warning">
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
                                        <input id="featured" type="checkbox" name="featured" value="1"
                                            {{ $service->featured == 1 ? 'checked' : '' }}>
                                        <p id="errfeatured" class="mb-0 text-danger em"></p>
                                    </div>
                                @endif
                                <div class="form-group">
                                    <div class="d-flext">
                                        <label class="mr-3">{{ __('Detail_Page') }}</label>
                                        <div class="radio mr-3">
                                            <label><input class="mr-1" type="radio" name="detail_page"
                                                    value="1"
                                                    {{ $service->detail_page == 1 ? 'checked' : '' }}>{{ __('Enable') }}</label>
                                        </div>
                                        <div class="radio">
                                            <label><input class="mr-1" type="radio" name="detail_page"
                                                    value="0"
                                                    {{ $service->detail_page == 0 ? 'checked' : '' }}>{{ __('Disable') }}</label>
                                        </div>
                                    </div>
                                    <p id="errdetail_page" class="mb-0 text-danger em"></p>
                                </div>
                                <div class="form-group">
                                    <label for="">{{ __('Meta_Keywords') }}</label>
                                    <input type="text" class="form-control" name="meta_keywords"
                                        value="{{ $service->meta_keywords }}" data-role="tagsinput" placeholder="{{ __('Enter_Meta_Keywords') }}">
                                    <p id="errmeta_keywords" class="mb-0 text-danger em"></p>
                                </div>
                                <div class="form-group">
                                    <label for="">{{ __('Meta_Description') }}</label>
                                    <textarea type="text" class="form-control" name="meta_description" rows="5" placeholder="{{ __('Enter_Meta_Description') }}">{{ $service->meta_description }}</textarea>
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
                                <button type="submit" id="submitBtn"
                                    class="btn btn-success">{{ __('Update') }}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
