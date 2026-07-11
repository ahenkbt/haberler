@extends('admin.layout')

@php
    use App\Models\Language;
    $selLang = Language::where('code', request()->input('language'))->first();
@endphp
@if (!empty($selLang->language) && $selLang->language->rtl == 1)
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
        <h4 class="page-title">{{ __('Edit package') }}</h4>
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
                <a href="#">{{ __('Packages') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Edit') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="card-title d-inline-block">{{ __('Edit package') }}</div>
                    <a class="btn btn-info btn-sm float-right d-inline-block"
                        href="{{ route('admin.package.index') . '?language=' . request('language') }}">
                        <span class="btn-label">
                            <i class="fas fa-backward"></i>
                        </span>
                        {{ __('Back') }}
                    </a>
                </div>
                <div class="card-body pt-5 pb-5">
                    <div class="row">
                        <div class="col-lg-6 offset-lg-3">
                            <form id="ajaxForm" class="" action="{{ route('admin.package.update') }}" method="post"
                                enctype="multipart/form-data">
                                @csrf
                                <input type="hidden" name="package_id" value="{{ $package->id }}">

                                <div class="form-group">
                                    <label for="">{{ __('Icon') }} **</label>
                                    <div class="btn-group d-block">
                                        <button type="button" class="btn btn-primary iconpicker-component"><i
                                                class="{{ $package->icon }}"></i></button>
                                        <button type="button" class="icp icp-dd btn btn-primary dropdown-toggle"
                                            data-selected="fa-car" data-toggle="dropdown">
                                        </button>
                                        <div class="dropdown-menu"></div>
                                    </div>
                                    <input id="inputIcon" type="hidden" name="icon" value="{{ $package->icon }}">
                                    <p id="erricon" class="mb-0 text-danger em"></p>
                                    <div class="mt-2">
                                        <small class="text-warning">{{'*'. __('Click on the dropdown sign to select a icon') . '.' }}</small>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="title">{{ __('Package title') }}*</label>
                                    <input id="title" type="text" class="form-control" name="title"
                                        value="{{ __($package->title) }}" placeholder="{{ __('Enter name') }}">
                                    <p id="errtitle" class="mb-0 text-danger em"></p>
                                </div>
                                {{-- <div class="form-group">
                                    <label for="subtitle">{{ __('Package subtitle') }}</label>
                                    <input id="subtitle" type="text" class="form-control" name="subtitle"
                                        value="{{ $package->subtitle }}" placeholder="{{ __('Enter subtitle') }}">
                                    <p id="errsubtitle" class="mb-0 text-danger em"></p>
                                </div> --}}
                                <div class="form-group">
                                    <label for="price">{{ __('Price') }} ({{ $bex->base_currency_text }})*</label>
                                    <input id="price" type="number" class="form-control" name="price"
                                        placeholder="{{ __('Enter Package price') }}" value="{{ $package->price }}">
                                    <p class="text-warning">
                                        <small>{{ __('If price is 0 , than it will appear as free') }}</small>
                                    </p>
                                    <p id="errprice" class="mb-0 text-danger em"></p>
                                </div>
                                <div class="form-group">
                                    <label for="plan_term">{{ __('Package term') }}*</label>
                                    <select id="plan_term" name="term" class="form-control">
                                        <option value="" selected disabled>{{ __('Select a Term') }}</option>
                                        <option value="monthly" {{ $package->term == 'monthly' ? 'selected' : '' }}>
                                            {{ __('monthly') }}</option>
                                        <option value="yearly" {{ $package->term == 'yearly' ? 'selected' : '' }}>
                                            {{ __('yearly') }}</option>
                                        <option value="lifetime" {{ $package->term == 'lifetime' ? 'selected' : '' }}>
                                            {{ __('lifetime') }}</option>
                                    </select>
                                    <p id="errterm" class="mb-0 text-danger em"></p>
                                </div>
                                @php
                                    $permissions = $package->features;
                                    if (!empty($package->features)) {
                                        $permissions = json_decode($permissions, true);
                                    }
                                @endphp

                                <div class="form-group">
                                    <label class="form-label">{{ __('Package Features') }}</label>
                                    <div class="selectgroup selectgroup-pills">
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Custom Domain"
                                                class="selectgroup-input" @if (is_array($permissions) && in_array('Custom Domain', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Custom Domain') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Subdomain"
                                                class="selectgroup-input" @if (is_array($permissions) && in_array('Subdomain', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Subdomain') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="vCard"
                                                class="selectgroup-input" @if (is_array($permissions) && in_array('vCard', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('vCard') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="QR Builder"
                                                class="selectgroup-input" @if (is_array($permissions) && in_array('QR Builder', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('QR Builder') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Follow/Unfollow"
                                                class="selectgroup-input" @if (is_array($permissions) && in_array('Follow/Unfollow', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Follow/Unfollow') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Request a Quote"
                                                class="selectgroup-input" @if (is_array($permissions) && in_array('Request a Quote', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Request a Quote') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Blog"
                                                class="selectgroup-input" @if (is_array($permissions) && in_array('Blog', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Blog') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Portfolio"
                                                class="selectgroup-input" @if (is_array($permissions) && in_array('Portfolio', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Portfolio') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Custom Page"
                                                class="selectgroup-input" @if (is_array($permissions) && in_array('Custom Page', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Custom Page') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Counter Information"
                                                class="selectgroup-input"
                                                @if (is_array($permissions) && in_array('Counter Information', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Counter Information') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Skill"
                                                class="selectgroup-input"
                                                @if (is_array($permissions) && in_array('Skill', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Skill') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Service"
                                                class="selectgroup-input"
                                                @if (is_array($permissions) && in_array('Service', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Service') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Testimonial"
                                                class="selectgroup-input"
                                                @if (is_array($permissions) && in_array('Testimonial', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Testimonial') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Career"
                                                class="selectgroup-input"
                                                @if (is_array($permissions) && in_array('Career', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Career') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Team"
                                                class="selectgroup-input"
                                                @if (is_array($permissions) && in_array('Team', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Team') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Plugins"
                                                class="selectgroup-input"
                                                @if (is_array($permissions) && in_array('Plugins', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Plugins') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Ecommerce"
                                                class="selectgroup-input"
                                                @if (is_array($permissions) && in_array('Ecommerce', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Ecommerce') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="checkbox" name="features[]" value="Hotel Booking"
                                                class="selectgroup-input"
                                                @if (is_array($permissions) && in_array('Hotel Booking', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Hotel Booking') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input id="CourseManagement" type="checkbox" name="features[]"
                                                value="Course Management" class="selectgroup-input"
                                                @if (is_array($permissions) && in_array('Course Management', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Course Management') }}</span>
                                        </label>

                                        <label class="selectgroup-item">
                                            <input id="DonationManagement" type="checkbox" name="features[]"
                                                value="Donation Management" class="selectgroup-input"
                                                @if (is_array($permissions) && in_array('Donation Management', $permissions)) checked @endif>
                                            <span class="selectgroup-button">{{ __('Donation Management') }}</span>
                                        </label>

                                        <label class="selectgroup-item">
                                            <input type="checkbox" id="OneClickAIWebsiteSetup" name="features[]"
                                                value="One-Click AI Website Setup" class="selectgroup-input"
                                                @if (is_array($permissions) && in_array('One-Click AI Website Setup', $permissions)) checked @endif>
                                            <span
                                                class="selectgroup-button">{{ __('One-Click AI Full Site Content') }}</span>
                                        </label>

                                    </div>
                                </div>
                                @php
                                    $aiEngine = $package->ai_engine ?? null;
                                    $aiPages = $package->ai_pages ? json_decode($package->ai_pages, true) : [];
                                    $aiGenerateLimit = $package->ai_generate_limit ?? null;
                                @endphp

                                <div id="aiWebsiteSetupWrapper" class="ai-setup-hidden">

                                    {{-- AI Engine --}}
                                    <div class="form-group">
                                        <label class="form-label d-block mb-2">{{ __('AI Engine') }}<span
                                                class="text-danger">*</span></label>

                                        <div class="selectgroup selectgroup-pills d-flex flex-wrap">

                                            <label class="selectgroup-item">
                                                <input type="radio" name="ai_engine" value="openai"
                                                    class="selectgroup-input"
                                                    @if ($aiEngine === 'openai') checked @endif>
                                                <span
                                                    class="selectgroup-button d-flex align-items-center justify-content-between">
                                                    <span>{{ __('OpenAI') }}</span>
                                                    <span class="badge badge-danger ml-2">{{ __('Paid') }}</span>
                                                </span>
                                            </label>

                                            <label class="selectgroup-item">
                                                <input type="radio" name="ai_engine" value="gemini"
                                                    class="selectgroup-input"
                                                    @if ($aiEngine === 'gemini') checked @endif>
                                                <span
                                                    class="selectgroup-button d-flex align-items-center justify-content-between">
                                                    <span>{{ __('Gemini') }}</span>
                                                    <span class="badge badge-danger ml-2">{{ __('Paid') }}</span>
                                                </span>
                                            </label>

                                            <label class="selectgroup-item">
                                                <input type="radio" name="ai_engine" value="pollinations"
                                                    class="selectgroup-input"
                                                    @if ($aiEngine === 'pollinations') checked @endif>
                                                <span
                                                    class="selectgroup-button d-flex align-items-center justify-content-between">
                                                    <span>{{ __('Pollinations') }}</span>
                                                    <span class="badge badge-success ml-2">{{ __('Free') }}</span>
                                                </span>
                                            </label>

                                        </div>

                                        <p id="errai_engine" class="mb-0 text-danger em"></p>

                                        <small class="text-warning d-block mt-2">
                                            {{'*'.  __('Paid AI engines require a valid API key and active billing') . '. '. __('Free engines do not require any API key'). '.' }}
                                        </small>

                                        <small class="text-warning d-block mt-1">
                                            {{ '*' . __('If One-Click AI Website Setup is enabled, you must select an AI Engine and at least one AI Generated Page') . '.' }}
                                        </small>
                                    </div>

                                    {{--  AI Pages --}}
                                    <div class="form-group">
                                        <label class="form-label d-block mb-2">{{ __('AI will generate content for selected pages') }} <span
                                                class="text-danger">*</span></label>

                                        <div class="selectgroup selectgroup-pills d-flex flex-wrap">
                                            @php
                                                $pageOptions = [
                                                    'Home Page' => 'Home',
                                                    'About Page' => 'About',
                                                    'Services Page' => 'Services',
                                                    'Team Page' => 'Team',
                                                    'Career Page' => 'Career',
                                                    'FAQ Page' => 'FAQ',
                                                    'Gallery Page' => 'Gallery',
                                                    'Blog Page' => 'Blog',
                                                    'Portfolio Page' => 'Portfolio',
                                                    'Contact Page' => 'Contact',
                                                    'Shop Page' => 'Shop',
                                                    'Course Page' => 'Courses',
                                                    'Room Page' => 'Rooms',
                                                    'Cause Page' => 'Causes',
                                                ];
                                            @endphp

                                            @foreach ($pageOptions as $value => $label)
                                                <label class="selectgroup-item">
                                                    <input type="checkbox" name="ai_pages[]" value="{{ $value }}"
                                                        class="selectgroup-input"
                                                        @if (is_array($aiPages) && in_array($value, $aiPages)) checked @endif>
                                                    <span class="selectgroup-button">{{ __($label) }}</span>
                                                </label>
                                            @endforeach
                                        </div>

                                        <p id="errai_pages" class="mb-0 text-danger em"></p>
                                    </div>
                                    {{-- AI Generate Limit --}}
                                    <div class="form-group">
                                        <label class="form-label d-block mb-2">
                                            {{ __('AI Website Content Generation Attempts Limit') }} <span class="text-danger">*</span>
                                        </label>
                                        <input type="number" name="ai_generate_limit" class="form-control"
                                            value="{{ old('ai_generate_limit', $aiGenerateLimit) }}"
                                            placeholder="{{ __('How many times content can be generated') }}"
                                            min="1">
                                        <p id="errai_generate_limit" class="mb-0 text-danger em"></p>

                                        <small class="text-warning d-block mt-2">
                                            {{'*'. __('Set how many times user can generate full site content using AI in this package') . '.' }}
                                        </small>
                                    </div>


                                </div>

                                <div class="form-group" id="max_video_size">
                                    <label for="products ">{{ __('Maximum Size of Single Video') }} (MB) *</label>
                                    <input id="products " type="number" class="form-control" name="video_size_limit"
                                        placeholder="{{ __('Enter max video size') }}"
                                        value="{{ $package->video_size_limit }}">
                                    <p class="text-warning">
                                        <small>{{ __('Enter 999999 , then it will appear as unlimited') }}</small>
                                    </p>
                                    <p id="errvideo_size_limit" class="mb-0 text-danger em"></p>
                                </div>
                                <div class="form-group" id="max_file_size">
                                    <label for="products1">{{ __('Maximum Size of Single File') }} (MB) *</label>
                                    <input id="products1" type="number" class="form-control" name="file_size_limit"
                                        placeholder="{{ __('Enter max file size') }}"
                                        value="{{ $package->file_size_limit }}">
                                    <p class="text-warning">
                                        <small>{{ __('Enter 999999 , then it will appear as unlimited') }}</small>
                                    </p>
                                    <p id="errfile_size_limit" class="mb-0 text-danger em"></p>
                                </div>
                                <div
                                    class="form-group @if (is_array($permissions) && in_array('vCard', $permissions)) @else vcrd-none @endif  v-card-box ">
                                    <label for="">{{ __('Number of vcards') }} * </label>
                                    <input type="number" class="form-control" name="number_of_vcards"
                                        value="{{ $package->number_of_vcards }}">
                                    <p id="errnumber_of_vcards" class="mb-0 text-danger em"></p>
                                    <p class="text-warning">{{ __('Enter 999999 , then it will appear as unlimited') }}
                                    </p>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">{{ __('Featured') }} *</label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="featured" value="1"
                                                class="selectgroup-input" {{ $package->featured == 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Yes') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="radio" name="featured" value="0"
                                                class="selectgroup-input" {{ $package->featured == 0 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('No') }}</span>
                                        </label>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">{{ __('Trial') }} *</label>
                                    <div class="selectgroup w-100">
                                        <label class="selectgroup-item">
                                            <input type="radio" name="is_trial" value="1"
                                                class="selectgroup-input" {{ $package->is_trial == 1 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('Yes') }}</span>
                                        </label>
                                        <label class="selectgroup-item">
                                            <input type="radio" name="is_trial" value="0"
                                                class="selectgroup-input" {{ $package->is_trial == 0 ? 'checked' : '' }}>
                                            <span class="selectgroup-button">{{ __('No') }}</span>
                                        </label>
                                    </div>
                                </div>

                                @if ($package->is_trial == 1)
                                    <div class="form-group" id="trial_day" style="display: block">
                                        <label for="trial_days_2">{{ __('Trial days') }}*</label>
                                        <input id="trial_days_2" type="number" class="form-control" name="trial_days"
                                            placeholder="{{ __('Enter trial days') }}"
                                            value="{{ $package->trial_days }}">
                                    </div>
                                @else
                                    <div class="form-group" id="trial_day" style="display: none">
                                        <label for="trial_days_1">{{ __('Trial days') }}*</label>
                                        <input id="trial_days_1" type="number" class="form-control" name="trial_days"
                                            placeholder="{{ __('Enter trial days') }}"
                                            value="{{ $package->trial_days }}">
                                    </div>
                                @endif
                                <p id="errtrial_days" class="mb-0 text-danger em"></p>
                                <div class="form-group">
                                    <label for="status">{{ __('Status') }}*</label>
                                    <select id="status" class="form-control" name="status">
                                        <option value="" selected disabled>{{ __('Select a status') }}</option>
                                        <option value="1" {{ $package->status == '1' ? 'selected' : '' }}>
                                            {{ __('Active') }}</option>
                                        <option value="0" {{ $package->status == '0' ? 'selected' : '' }}>
                                            {{ __('Deactive') }}</option>
                                    </select>
                                    <p id="errstatus" class="mb-0 text-danger em"></p>
                                </div>

                                <div class="form-group">
                                    <label for="status">{{ __('Additional Languages Limit') }}*</label>
                                    <input type="number" class="form-control" name="number_of_languages"
                                        value="{{ $package->number_of_languages }}"
                                        placeholder="{{ __('Enter number of languages') }}">
                                    <p id="errnumber_of_languages" class="mb-0 text-danger em"></p>
                                    <p class="text-warning">{{ __('Enter 999999 , then it will appear as unlimited') }}
                                    </p>
                                </div>
                                <div class="form-group">
                                    <label for="meta_keywords">{{ __('Meta Keywords') }}</label>
                                    <input id="meta_keywords" type="text" class="form-control" name="meta_keywords"
                                        value="{{ $package->meta_keywords }}" data-role="tagsinput">
                                </div>

                                <div class="form-group">
                                    <label for="meta_description">{{ __('Meta Description') }}</label>
                                    <textarea id="meta_description" type="text" class="form-control" name="meta_description" rows="5">{{ $package->meta_description }}</textarea>
                                </div>

                                <div class="form-group  ">
                                    <label for="">{{ __('Serial Number') }} * </label>
                                    <input type="number" class="form-control" name="serial_number"
                                        value="{{ $package->serial_number }}">
                                    <p id="errserial_number" class="mb-0 text-danger em"></p>
                                    <p class="text-warning">
                                        {{ __('The higher the serial number is, the later the feature will be shown.') }}
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

@section('scripts')
    <script src="{{ asset('assets/admin/js/packages.js') }}"></script>
    <script src="{{ asset('assets/admin/js/edit-package.js') }}"></script>
@endsection
