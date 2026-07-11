@extends('user.layout')

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
        <h4 class="page-title">{{ __('Edit_Keyword') }}</h4>
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
                <a href="#">{{ __('Language_Management') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Edit_Keyword') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">{{ __('Edit_Language_Keyword') }}</div>
                    <a class="btn btn-info btn-sm float-right d-inline-block"
                        href="{{ route('user.language.index') . '?language=' . request('language') }}">
                        <span class="btn-label">
                            <i class="fas fa-backward"></i>
                        </span>
                        {{ __('Back') }}
                    </a>
                </div>

                <div class="card-body pt-5 pb-5">
                    <div class="row">
                        <div class="col-lg-12">
                            <form method="post" action="{{ route('user.language.updateKeyword', $la->id) }}"
                                id="langForm">
                                @csrf
                                <div class="row">
                                    @foreach ($languageKeywords as $key => $val)
                                        <div class="col-md-4 mt-2">
                                            <div class="form-group">
                                                {{-- <label class="control-label">{{ str_replace('_', ' ', $key) }}</label> --}}
                                                <label class="control-label">{{  $key }}</label>
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
            </div>

        </div>
    </div>
@endsection
