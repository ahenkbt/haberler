@extends('user.layout')

@if (!empty($data->language) && $data->language->rtl == 1)
    @section('styles')
        <style>
            form input,
            form textarea,
            form select {
                direction: rtl;
            }

            .nicEdit-main {
                direction: rtl;
                text-align: right;
            }
        </style>
    @endsection
@endif

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Edit_Item_Subcategory') }}</h4>
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
                <a href="#">{{ __('Edit_Item_Subcategory') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">{{ __('Edit_Item_Subcategory') }}</div>
                    <a class="btn btn-info btn-sm float-right d-inline-block"
                        href="{{ route('user.itemsubcategory.index') . '?language=' . request()->input('language') }}">
                        <span class="btn-label">
                            <i class="fas fa-backward" style="font-size: 12px;"></i>
                        </span>
                        {{ __('Back') }}
                    </a>
                </div>
                <div class="card-body pt-5 pb-5">
                    <div class="row">
                        <div class="col-lg-6 offset-lg-3">
                            <form id="ajaxForm" action="{{ route('user.itemsubcategory.update') }}" method="POST">
                                @csrf
                                <input type="hidden" name="user_language_id" value="{{ $data->language_id }}">
                                <div class="form-group">
                                    <label for="">{{ __('Category') }} **</label>
                                    <select id="language" name="category_id" class="form-control">
                                        <option value="" selected disabled>{{ __('Select_a_category') }}</option>
                                        @foreach ($categories as $category)
                                            <option {{ $data->category_id == $category->id ? 'selected' : '' }}
                                                value="{{ $category->id }}">{{ $category->name }}</option>
                                        @endforeach
                                    </select>
                                    <p id="errcategory_id" class="mb-0 text-danger em"></p>
                                </div>
                                <div class="form-group">
                                    <label for="">{{ __('Name') }} **</label>
                                    <input type="text" class="form-control" name="name" value="{{ $data->name }}"
                                        placeholder="{{ __('Enter_name') }}">
                                    <p id="errname" class="mb-0 text-danger em"></p>
                                </div>
                                <input type="hidden" name="subcategory_id" value="{{ $data->id }}">
                                <div class="form-group">
                                    <label for="">{{ __('Status') }} **</label>
                                    <select class="form-control" name="status">
                                        <option value="" selected disabled>{{ __('Select_a_status') }}</option>
                                        <option value="1" {{ $data->status == 1 ? 'selected' : '' }}>
                                            {{ __('Active') }}</option>
                                        <option value="0" {{ $data->status == 0 ? 'selected' : '' }}>
                                            {{ __('Deactive') }}</option>
                                    </select>
                                    <p id="errstatus" class="mb-0 text-danger em"></p>
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
