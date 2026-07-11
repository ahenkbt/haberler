@extends('admin.layout')

@if (!empty($la) && $la->rtl == 1)
    @section('styles')
        <style>
            form input {
                direction: rtl;
            }
        </style>
    @endsection
@endif

@if (empty($la) && $be->default_language_direction == 'rtl')
    @section('styles')
        <style>
            form input {
                direction: rtl;
            }
        </style>
    @endsection
@endif

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Edit Keyword') }}</h4>
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
                <a href="#">{{ __('Language Management') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Edit Keyword') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">{{ __('Edit Language Keyword') }}</div>
                    <a href="#" data-toggle="modal" data-target="#createModal"
                        class="btn btn-primary btn-sm  float-right d-inline-block">
                        <i class="fas fa-plus"></i> {{ __('Add Keywords') }}
                    </a>
                </div>
                <div class="card-body pt-5 pb-5">
                    <div class="row">
                        <div class="col-lg-12">
                            <form method="post" action="{{ route('admin.tenant_language.updateKeyword', $la->id) }}"
                                id="langForm">
                                @csrf
                                <div class="row">
                                    @foreach ($languageKeywords as $key => $val)
                                        <div class="col-md-4 mt-2">
                                            <div class="form-group">
                                                <label class="control-label">{{ str_replace('_', ' ', $key) }}</label>
                                                <div class="input-group">
                                                    <input type="text" value="{{ $val }}"
                                                        name="{{ $key }}" class="form-control form-control-lg">
                                                </div>
                                            </div>
                                        </div>
                                    @endforeach
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="form">
                        <div class="form-group from-show-notify row">
                            <div class="col-12 text-center">
                                <button id="langBtn" type="button" class="btn btn-success">{{ __('Update') }}</button>
                            </div>
                        </div>
                    </div>
                </div>
                @includeIf('admin.language.tenant.addKeywords')
            </div>
        </div>
    </div>
@endsection
