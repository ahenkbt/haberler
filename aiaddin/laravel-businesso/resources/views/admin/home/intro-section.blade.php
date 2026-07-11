@extends('admin.layout')

@if (!empty($abs->language) && $abs->language->rtl == 1)
    @section('styles')
        {{-- <style>
            form input,
            form textarea,
            form select,
            select {
                direction: rtl;
            }

            form .note-editor.note-frame .note-editing-area .note-editable {
                direction: rtl;
                text-align: right;
            }
        </style> --}}
    @endsection
@endif

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
                            
                        </div>
                    </div>
                </div>
                <div class="card-body pt-5 pb-4">
                    <div class="row">
                        <div class="col-lg-6 offset-lg-3">

                            <form id="ajaxForm" action="{{ route('admin.introsection.update', $lang_id) }}"
                                method="post">
                                @csrf
                                <div class="form-group">
                                    <label for="">{{ __('Title') }} </label>
                                    <input type="text" class="form-control" name="intro_title"
                                        value="{{ $abs->intro_title }}">
                                    <p id="errintro_title" class="em text-danger mb-0"></p>
                                </div>

                                <div class="form-group">
                                    <label for="">{{ __('Subtitle') }}</label>
                                    <input type="text" class="form-control" name="intro_subtitle"
                                        value="{{ $abs->intro_subtitle }}">
                                    <p id="errintro_subtitle" class="em text-danger mb-0"></p>
                                </div>

                                <div class="form-group">
                                    <label for="">{{ __('Text') }} </label>
                                    <textarea name="intro_text" class="form-control" rows="4">{{ $abs->intro_text }}</textarea>
                                    <p id="errintro_text" class="em text-danger mb-0"></p>
                                </div>


                                <div class="form-group">
                                    <label for="">{{ __('Button Name') }} </label>
                                    <input type="text" class="form-control" name="intro_button_name"
                                        value="{{ $abs->intro_button_name }}">
                                    <p id="errintro_button_name" class="em text-danger mb-0"></p>
                                </div>
                                <div class="form-group">
                                    <label for="">{{ __('Button Url') }} </label>
                                    <input type="text" class="form-control" name="intro_button_url"
                                        value="{{ $abs->intro_button_url }}">
                                    <p id="errintro_button_url" class="em text-danger mb-0"></p>
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
