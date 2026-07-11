@extends('admin.layout')

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Package Features') }}</h4>
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
                <a href="#">{{ __('Packages Management') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Package Features') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">

            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">{{ __('Package Features') }}</div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-8 offset-lg-2">
                            <form id="permissionsForm" class="" action="{{ route('admin.package.features') }}"
                                method="post">
                                {{ csrf_field() }}
                                <div class="alert alert-warning">
                                    {{ __('Only these selected features will be visible in frontend Pricing Section') }}
                                </div>
                                <div class="form-group">
                                    <label class="form-label">{{ __('Package Features') }}</label>
                                    <div class="selectgroup selectgroup-pills">
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Custom Domain"
                                                class="selectgroup-input" @if (is_array($features) && in_array('Custom Domain', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Custom Domain') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Subdomain"
                                                class="selectgroup-input" @if (is_array($features) && in_array('Subdomain', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Subdomain') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Ecommerce"
                                                class="selectgroup-input" @if (is_array($features) && in_array('Ecommerce', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Ecommerce') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Hotel Booking"
                                                class="selectgroup-input" @if (is_array($features) && in_array('Hotel Booking', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Hotel Booking') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Course Management"
                                                class="selectgroup-input" @if (is_array($features) && in_array('Course Management', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Course Management') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Donation Management"
                                                class="selectgroup-input" @if (is_array($features) && in_array('Donation Management', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Donation Management') }}</span>
                                        </label>


                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="vCard"
                                                class="selectgroup-input" @if (is_array($features) && in_array('vCard', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('vCard') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="QR Builder"
                                                class="selectgroup-input" @if (is_array($features) && in_array('QR Builder', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('QR Builder') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Follow/Unfollow"
                                                class="selectgroup-input" @if (is_array($features) && in_array('Follow/Unfollow', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Follow/Unfollow') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Request a Quote"
                                                class="selectgroup-input" @if (is_array($features) && in_array('Request a Quote', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Request a Quote') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Blog"
                                                class="selectgroup-input"
                                                @if (is_array($features) && in_array('Blog', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Blog') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Portfolio"
                                                class="selectgroup-input"
                                                @if (is_array($features) && in_array('Portfolio', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Portfolio') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Custom Page"
                                                class="selectgroup-input"
                                                @if (is_array($features) && in_array('Custom Page', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Custom Page') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Counter Information"
                                                class="selectgroup-input"
                                                @if (is_array($features) && in_array('Counter Information', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Counter Information') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Skill"
                                                class="selectgroup-input"
                                                @if (is_array($features) && in_array('Skill', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Skill') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Service"
                                                class="selectgroup-input"
                                                @if (is_array($features) && in_array('Service', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Service') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Testimonial"
                                                class="selectgroup-input"
                                                @if (is_array($features) && in_array('Testimonial', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Testimonial') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Career"
                                                class="selectgroup-input"
                                                @if (is_array($features) && in_array('Career', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Career') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Team"
                                                class="selectgroup-input"
                                                @if (is_array($features) && in_array('Team', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Team') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Plugins"
                                                class="selectgroup-input"
                                                @if (is_array($features) && in_array('Plugins', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Plugins') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Additional Language"
                                                class="selectgroup-input"
                                                @if (is_array($features) && in_array('Additional Language', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Additional Language') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="One-Click AI Website Setup"
                                                class="selectgroup-input"
                                                @if (is_array($features) && in_array('One-Click AI Website Setup', $features)) checked @endif>
                                            <span class="selectgroup-button">{{ __('One-Click AI Full Site Content') }}</span>
                                        </label>

                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="form">
                        <div class="form-group from-show-notify row">
                            <div class="col-12 text-center">
                                <button type="submit" id="permissionBtn"
                                    class="btn btn-success">{{ __('Update') }}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
