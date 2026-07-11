@extends('user.layout')

@if (!empty($skill->language) && $skill->language->rtl == 1)
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
        <h4 class="page-title">{{ __('Edit_Skill') }}</h4>
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
                <a href="#">{{ __('Skill_Page') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Edit_Skill') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">{{ __('Edit_Skill') }}</div>
                    <a class="btn btn-info btn-sm float-right d-inline-block"
                        href="{{ route('user.skill.index') . '?language=' . $skill->language->code }}">
                        <span class="btn-label">
                            <i class="fas fa-backward"></i>
                        </span>
                        {{ __('Back') }}
                    </a>
                </div>
                <div class="card-body pt-5 pb-5">
                    <div class="row">
                        <div class="col-lg-6 offset-lg-3">
                            <form id="ajaxForm" class="" action="{{ route('user.skill.update') }}" method="post"
                                enctype="multipart/form-data">
                                @csrf
                                <input type="hidden" name="skill_id" value="{{ $skill->id }}">
                                @if ($userBs->theme !== 'home_twelve')
                                    <div class="form-group">
                                        <label for="">{{ __('Icon') }} * </label>
                                        <div class="btn-group d-block">
                                            <button type="button" class="btn btn-primary iconpicker-component"><i
                                                    class="{{ $skill->icon ?? 'fa fa-fw fa-heart' }}"></i></button>
                                            <button type="button" class="icp icp-dd btn btn-primary dropdown-toggle"
                                                data-selected="fa-car" data-toggle="dropdown"></button>
                                            <div class="dropdown-menu"></div>
                                        </div>
                                        <input type="hidden" id="inputIcon" name="icon">
                                        <p id="editErr_icon" class="mt-1 mb-0 text-danger em"></p>
                                        <div class="text-warning mt-2">
                                            <small>{{ __('Click_on_the_dropdown_icon_to_select_a_icon') }}</small>
                                        </div>
                                    </div>
                                @endif
                                <div class="form-group">
                                    <label for="">{{ __('Title') }} **</label>
                                    <input type="text" class="form-control" name="title" value="{{ $skill->title }}">
                                    <p id="errtitle" class="mb-0 text-danger em"></p>
                                </div>
                                <div class="form-group">
                                    <label for="percentage">{{ __('Percentage') }}**</label>
                                    <input id="percentage" type="number" class="form-control" name="percentage"
                                        value="{{ $skill->percentage }}" min="1" max="100"
                                        onkeyup="if(parseInt(this.value)>100 || parseInt(this.value)<=0 ){this.value =100; return false;}">
                                    <p id="errpercentage" class="mb-0 text-danger em"></p>
                                    <p class="text-warning mb-0">
                                        <small>{{ __('The_percentage_should_between_1_to_100') }}</small>
                                    </p>
                                </div>
                                <div class="form-group">
                                    <label for="">{{ __('Color') }} **</label>
                                    <input type="text" class="form-control  jscolor" name="color"
                                        value="#{{ $skill->color }}">
                                    <p id="errcolor" class="mb-0 text-danger em"></p>
                                </div>
                                <div class="form-group">
                                    <label for="">{{ __('Serial_Number') }} **</label>
                                    <input type="number" class="form-control" name="serial_number"
                                        value="{{ $skill->serial_number }}">
                                    <p id="errserial_number" class="mb-0 text-danger em"></p>
                                    <p class="text-warning">
                                        <small>{{ __('Skill_Serial_Number_text') }}</small>
                                    </p>
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
