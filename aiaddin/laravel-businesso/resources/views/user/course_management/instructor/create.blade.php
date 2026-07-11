@extends('user.layout')

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Add_Instructor') }}</h4>
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
                <a href="#">{{ __('Instructors') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Add_Instructor') }}</a>
            </li>
        </ul>
    </div>

    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">
                        {{ __('Add_Instructor') }}
                    </div>
                    <a class="btn btn-info btn-sm float-right d-inline-block"
                        href="{{ route('user.instructors', ['language' => request('language')]) }}">
                        <span class="btn-label">
                            <i class="fas fa-backward"></i>
                        </span>
                        {{ __('Back') }}
                    </a>
                </div>

                <div class="card-body">
                    <div class="row justify-content-center">
                        <div class="col-lg-7">
                            <form id="ajaxForm" class="create" action="{{ route('user.store_instructor') }}" method="POST"
                                enctype="multipart/form-data">
                                @csrf
                                <div class="row">
                                    <div class="col-lg-12">
                                        <div class="form-group">
                                            <div class="col-12 mb-2">
                                                <label for="image"><strong>{{ __('Image') }} * </strong></label>
                                            </div>
                                            <div class="col-md-12 showImage mb-3">
                                                <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..."
                                                    class="img-thumbnail">
                                            </div>
                                            <input type="file" name="image" id="image" class="form-control">
                                            <p id="errimage" class="mt-2 mb-0 text-danger em"></p>
                                            <p class="text-warning mb-0">
                                                {{ __('Upload_370_X_370_image_for_best_quality') }}</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col">
                                        <div class="form-group">
                                            <label>{{ __('Language') }} * </label>
                                            <select name="user_language_id" class="form-control">
                                                <option selected disabled>
                                                    {{ __('Select_a_Language') }}
                                                </option>
                                                @foreach ($languages as $language)
                                                    <option value="{{ $language->id }}">
                                                        {{ $language->name }}
                                                    </option>
                                                @endforeach
                                            </select>
                                            <p id="erruser_language_id" class="mt-2 mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col">
                                        <div class="form-group">
                                            <label>{{ __('Name') }} * </label>
                                            <input type="text" class="form-control" name="name"
                                                placeholder="{{ __('Enter_Instructor_Name') }}">
                                            <p id="errname" class="mt-2 mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col">
                                        <div class="form-group">
                                            <label>{{ __('Occupation') }} * </label>
                                            <input type="text" class="form-control" name="occupation"
                                                placeholder="{{ __('Enter_Instructor_Occupation') }}">
                                            <p id="erroccupation" class="mt-2 mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col">
                                        <div class="form-group pb-0">
                                            <label>{{ __('Description') }} * </label>
                                            <textarea class="form-control summernote" name="description" placeholder="{{ __('Enter_Instructor_Description') }}"
                                                data-height="300"></textarea>
                                            <p id="errdescription" class="mb-0 text-danger em"></p>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="card-footer">
                    <div class="row">
                        <div class="col-12 text-center">
                            <button type="submit" class="btn btn-success" id="submitBtn">
                                {{ __('Save') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
