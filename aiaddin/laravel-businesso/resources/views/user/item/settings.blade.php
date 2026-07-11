@extends('user.layout')
@section('content')
    @php
        $type = request()->input('type');
    @endphp
    <div class="page-header">
        <h4 class="page-title">{{  __('Settings')  }}</h4>
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
                <a href="#">{{  __('Shop_Management') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{  __('Settings')  }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">{{  __('Settings')  }}</div>
                </div>
                <div class="card-body pt-5 pb-5">
                    <div class="row">
                        <div class="col-lg-6 offset-lg-3">
                            <form id="ajaxForm" class="" action="{{ route('user.item.settings') }}" method="post"
                                enctype="multipart/form-data">
                                @csrf
                                <div class="form-group">
                                    <label>{{  __('Shop')  }} **</label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="is_shop" value="1" class="selectgroup-input"
                                                @if ($shopsettings) {{ $shopsettings->is_shop == 1 ? 'checked' : '' }} @endif>
                                            <span class="selectgroup-button">{{  __('Active')  }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="radio" name="is_shop" value="0" class="selectgroup-input"
                                                @if ($shopsettings) {{ $shopsettings->is_shop == 0 ? 'checked' : '' }} @endif>
                                            <span class="selectgroup-button">{{  __('Deactive')  }}</span>
                                        </label>
                                    </div>
                                    <p id="erris_shop" class="mb-0 text-danger em"></p>
                                    <p class="text-warning mb-0">{{  __('shop_enable_disable_warning_message')  }} </p>
                                </div>
                                <div class="form-group">
                                    <label>{{  __('Catalog_Mode') }} **</label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="catalog_mode" value="1"
                                                class="selectgroup-input"
                                                @if ($shopsettings) {{ $shopsettings->catalog_mode == 1 ? 'checked' : '' }} @endif>
                                            <span class="selectgroup-button">{{  __('Active')  }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="radio" name="catalog_mode" value="0"
                                                class="selectgroup-input"
                                                @if ($shopsettings) {{ $shopsettings->catalog_mode == 0 ? 'checked' : '' }} @endif>
                                            <span class="selectgroup-button">{{  __('Deactive')  }}</span>
                                        </label>
                                    </div>
                                    <p id="errcatalog_mode" class="mb-0 text-danger em"></p>
                                    <p class="text-warning mb-0">{{  __('catalog_mode_warning_message') }}</p>
                                </div>
                                <div class="form-group">
                                    <label>{{  __('Rating_System')  }} **</label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="item_rating_system" value="1"
                                                class="selectgroup-input"
                                                @if ($shopsettings) {{ $shopsettings->item_rating_system == 1 ? 'checked' : '' }} @endif>
                                            <span class="selectgroup-button">{{  __('Active')  }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="radio" name="item_rating_system" value="0"
                                                class="selectgroup-input"
                                                @if ($shopsettings) {{ $shopsettings->item_rating_system == 0 ? 'checked' : '' }} @endif>
                                            <span class="selectgroup-button">{{  __('Deactive')  }}</span>
                                        </label>
                                    </div>
                                    <p id="erritem_rating_system" class="mb-0 text-danger em"></p>
                                </div>
                                <div class="form-group">
                                    <label for="">{{  __('Tax')  }} **</label>
                                    <input type="text" class="form-control" name="tax"
                                        value="{{ $shopsettings ? $shopsettings->tax : '' }}" placeholder="Enter tax">
                                    <p id="errtax" class="mb-0 text-danger em"></p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="form">
                        <div class="form-group from-show-notify row">
                            <div class="col-12 text-center">
                                <button type="submit" form="ajaxForm" id="submitBtn"
                                    class="btn btn-success">{{  __('Submit')  }}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
