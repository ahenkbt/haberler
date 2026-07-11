@extends('user.layout')
@php
    $user = Auth::guard('web')->user();
    $package = \App\Http\Helpers\UserPermissionHelper::currentPackagePermission($user->id);
    if (!empty($user)) {
        $permissions = \App\Http\Helpers\UserPermissionHelper::packagePermission($user->id);
        $permissions = json_decode($permissions, true);
        $userBs = \App\Models\User\BasicSetting::where('user_id', $user->id)->first();
    }
@endphp


@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Home_Page_Version') }}</h4>
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
                <a href="#">{{ __('Home_Page_Version') }}</a>
            </li>
        </ul>
    </div>

    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="row">
                        <div class="col-lg-4">
                            <div class="card-title">{{ __('Theme_Settings') }}</div>
                        </div>
                    </div>
                </div>

                @php
                    $aiSession = session('ai_generating');
                    $showLoader = false;

                    if (!empty($aiSession) && isset($aiSession['user_id'], $aiSession['started_at'])) {
                        $currentUserId = Auth::guard('web')->id();
                        $startedAt = $aiSession['started_at'];
                        $now = now()->timestamp;

                        if ($aiSession['user_id'] == $currentUserId && $now - $startedAt <= 300) {
                            $showLoader = true;
                        } else {
                            session()->forget('ai_generating');
                        }
                    }
                @endphp


                <div class="ai-loader-area2 {{ $showLoader ? '' : 'd-none' }}">
                    <div id="aiLoader2" class="ai-loader2 alert shadow-sm border-primary">

                        <div class="d-flex align-items-start gap-3 w-100">

                            <!-- Spinner -->
                            <div class="spinner-border text-primary mt-1" role="status"></div>

                            <!-- Text Area -->
                            <div class="flex-grow-1">

                                <h5 class="mb-2 text-primary">
                                    <i class="fas fa-robot me-1"></i>
                                    {{ __('AI is generating your website content') }}
                                </h5>

                                <p class="mb-1 text-muted">
                                    {{ __('The process is running in the background') }}
                                </p>

                                <div class="alert alert-warning py-2 px-3 mb-2 small ai-loader2-small-alert ">
                                    <i class="fas fa-exclamation-triangle me-1"></i>
                                    {{ __('If you change the theme before generation is completed') . ', ' . __('the content will be generated based on the updated theme') }}
                                </div>

                                <ul class="mb-1 ps-3 small text-dark">
                                    <li>{{ __('Full generation may take 40–45 minutes') }}</li>
                                    <li>{{ __('The time depends on the number of pages selected') }}</li>
                                    <li>{{ __('You will be notified by email once the process is complete') }}
                                    </li>
                                </ul>
                            </div>

                            <!-- Close Button -->
                            <span id="loader2Close" class="loader2-close text-danger ms-2" style="cursor: pointer;">
                                <i class="fas fa-times"></i>
                            </span>

                        </div>
                    </div>
                </div>

                <div class="card-body pt-5 pb-5">
                    <div class="row justify-content-center">
                        <div class="col-lg-8">

                            <!-- Modal -->
                            <div class="modal fade ai_generate_modal" id="aigenerateModal" tabindex="-1"
                                aria-labelledby="aigenerateModalLabel" aria-hidden="true">
                                <div class="modal-dialog">
                                    <div class="modal-content">
                                        <div class="modal-header">
                                            <h4 class="modal-title" id="aigenerateModalLabel">
                                                <i class="fas fa-sliders-h text-primary"></i>
                                                {{ __('Update theme with or without AI') }}
                                            </h4>
                                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                <span aria-hidden="true">&times;</span>
                                            </button>
                                        </div>
                                        <div class="modal-body">

                                            <div class="text-center p-3 mb-3 rounded border">
                                                <label class="form-label fw-bold d-block mb-3">
                                                    {{ __('Would you like AI to generate new content & images based on the selected theme') . '?' }}
                                                </label>
                                                <div class="btn-group btn-group-toggle w-100" data-toggle="buttons">
                                                    <!-- NO -->
                                                    <label class="btn btn-outline-primary active flex-fill py-3">
                                                        <input type="radio" name="ai_mode" value="0" checked>
                                                        <i class="fas fa-ban fa-2x d-block mb-2"></i>
                                                        <strong>{{ __('No') }}</strong><br>
                                                        <small>{{ __('Keep existing content & images') }}</small>
                                                    </label>

                                                    <!-- YES -->
                                                    <label class="btn btn-outline-success flex-fill py-3">
                                                        <input type="radio" name="ai_mode" value="1">
                                                        <i class="fas fa-robot fa-2x d-block mb-2"></i>
                                                        <strong>{{ __('Yes') }}</strong><br>
                                                        <small>{{ __('Generate new content & images using AI') }}</small>
                                                    </label>
                                                </div>
                                            </div>

                                            {{-- Page Selection Checkboxes - Without form-check class --}}
                                            <div id="pageSelectionSection" class="form-group p-3 border rounded mb-3"
                                                style="display: none;">
                                                <label
                                                    class="form-label fw-bold">{{ __('Select Pages to Generate') }}</label>
                                                <p class="text-muted small mb-3">
                                                    {{ __('Checked pages will be created/updated with the selected theme') . '. ' . __('Home is always included') }}
                                                </p>

                                                @php
                                                    $selectedPages = !empty($data->selected_pages)
                                                        ? json_decode($data->selected_pages, true)
                                                        : ['home'];

                                                    // ai_pages from package 
                                                    $aiPagesRaw = !empty($package->ai_pages) ? json_decode($package->ai_pages, true) : [];

                                                    // Convert labels to slugs 
                                                    $aiAllowedPages = collect($aiPagesRaw)->map(function ($p) {
                                                        $p = strtolower(trim($p));

                                                        $map = [
                                                            'home page'      => 'home',
                                                            'about page'     => 'about',
                                                            'services page'  => 'services',
                                                            'team page'      => 'team',
                                                            'career page'    => 'career',
                                                            'faq page'       => 'faq',
                                                            'gallery page'   => 'gallery',
                                                            'blog page'      => 'blog',
                                                            'portfolio page' => 'portfolios', 
                                                            'contact page'   => 'contact',
                                                            'shop page'      => 'shop',
                                                            'course page'    => 'courses',
                                                            'room page'      => 'rooms',
                                                            'cause page'     => 'causes',
                                                        ];

                                                        return $map[$p] ?? null;
                                                    })->filter()->values()->toArray();

                                                    // Home always allowed
                                                    if (!in_array('home', $aiAllowedPages)) {
                                                        $aiAllowedPages[] = 'home';
                                                    }
                                                @endphp

                                                <div class="row g-3">

                                                    <!-- Home - Always included -->
                                                    <div class="col-md-4 col-sm-6">
                                                        <div class="custom-checkbox d-flex gap-1 align-items-center">
                                                            <input type="checkbox" id="page_home" checked disabled>
                                                            <label for="page_home"
                                                                style="margin-bottom: 0; cursor: pointer; font-weight: 500;">
                                                                {{ __('Home') }}
                                                                <span
                                                                    class="text-info small ms-1">({{ __('Always included') }})</span>
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <!-- Shop -->
                                                    @if (!empty($permissions) && in_array('Ecommerce', $permissions))
                                                        <div class="col-md-4 col-sm-6">
                                                            <div class="custom-checkbox d-flex gap-1 align-items-center">

                                                                @php $shopDisabled = !in_array('shop', $aiAllowedPages); @endphp

                                                                <input class="page-checkbox" type="checkbox" name="pages[]"
                                                                    value="shop" id="page_shop"
                                                                    {{ in_array('shop', $selectedPages) ? 'checked' : '' }} {{ $shopDisabled ? 'disabled' : '' }}>
                                                                <label for="page_shop"
                                                                    style="margin-bottom: 0; cursor: pointer;">
                                                                    {{ __('Shop') }}
                                                                </label>
                                                            </div>
                                                        </div>
                                                    @endif

                                                    <!-- About -->
                                                    <div class="col-md-4 col-sm-6">
                                                        <div class="custom-checkbox d-flex gap-1 align-items-center">

                                                            @php $aboutDisabled = !in_array('about', $aiAllowedPages); @endphp

                                                            <input class="page-checkbox" type="checkbox" name="pages[]"
                                                                value="about" id="page_about"
                                                                {{ in_array('about', $selectedPages) ? 'checked' : '' }} {{ $aboutDisabled ? 'disabled' : '' }}>
                                                            <label for="page_about"
                                                                style="margin-bottom: 0; cursor: pointer;">
                                                                {{ __('About') }}
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <!-- Team -->
                                                    <div class="col-md-4 col-sm-6">
                                                        <div class="custom-checkbox d-flex gap-1 align-items-center">
                                                            @php $teamDisabled = !in_array('team', $aiAllowedPages); @endphp

                                                            <input class="page-checkbox" type="checkbox" name="pages[]"
                                                                value="team" id="page_team"
                                                                {{ in_array('team', $selectedPages) ? 'checked' : '' }} {{ $teamDisabled ? 'disabled' : '' }}>
                                                            <label for="page_team"
                                                                style="margin-bottom: 0; cursor: pointer;">
                                                                {{ __('Team') }}
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <!-- Career -->
                                                    <div class="col-md-4 col-sm-6">
                                                        <div class="custom-checkbox d-flex gap-1 align-items-center">

                                                            @php $careerDisabled = !in_array('career', $aiAllowedPages); @endphp

                                                            <input class="page-checkbox" type="checkbox" name="pages[]"
                                                                value="career" id="page_career"
                                                                {{ in_array('career', $selectedPages) ? 'checked' : '' }}{{ $careerDisabled ? 'disabled' : '' }}>
                                                            <label for="page_career"
                                                                style="margin-bottom: 0; cursor: pointer;">
                                                                {{ __('Career') }}
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <!-- FAQ -->
                                                    <div class="col-md-4 col-sm-6">
                                                        <div class="custom-checkbox d-flex gap-1 align-items-center">

                                                            @php $faqDisabled = !in_array('faq', $aiAllowedPages); @endphp

                                                            <input class="page-checkbox" type="checkbox" name="pages[]"
                                                                value="faq" id="page_faq"
                                                                {{ in_array('faq', $selectedPages) ? 'checked' : '' }} {{ $faqDisabled ? 'disabled' : '' }}>
                                                            <label for="page_faq"
                                                                style="margin-bottom: 0; cursor: pointer;">
                                                                {{ __('FAQ') }}
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <!-- Gallery -->
                                                    <div class="col-md-4 col-sm-6">
                                                        <div class="custom-checkbox d-flex gap-1 align-items-center">

                                                        @php $galleryDisabled = !in_array('gallery', $aiAllowedPages); @endphp

                                                            <input class="page-checkbox" type="checkbox" name="pages[]"
                                                                value="gallery" id="page_gallery"
                                                                {{ in_array('gallery', $selectedPages) ? 'checked' : '' }} {{ $galleryDisabled ? 'disabled' : '' }}>
                                                            <label for="page_gallery"
                                                                style="margin-bottom: 0; cursor: pointer;">
                                                                {{ __('Gallery') }}
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <!-- Services -->
                                                    <div class="col-md-4 col-sm-6">
                                                        <div class="custom-checkbox d-flex gap-1 align-items-center">

                                                            @php $servicesDisabled = !in_array('services', $aiAllowedPages); @endphp

                                                            <input class="page-checkbox" type="checkbox" name="pages[]"
                                                                value="services" id="page_services"
                                                                {{ in_array('services', $selectedPages) ? 'checked' : '' }} {{ $servicesDisabled ? 'disabled' : '' }}>
                                                            <label for="page_services"
                                                                style="margin-bottom: 0; cursor: pointer;">
                                                                {{ __('Services') }}
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <!-- Portfolios -->
                                                    <div class="col-md-4 col-sm-6">
                                                        <div class="custom-checkbox d-flex gap-1 align-items-center">

                                                            @php $portfoliosDisabled = !in_array('portfolios', $aiAllowedPages); @endphp

                                                            <input class="page-checkbox" type="checkbox" name="pages[]"
                                                                value="portfolios" id="page_portfolios"
                                                                {{ in_array('portfolios', $selectedPages) ? 'checked' : '' }} {{ $portfoliosDisabled ? 'disabled' : '' }}>
                                                            <label for="page_portfolios"
                                                                style="margin-bottom: 0; cursor: pointer;">
                                                                {{ __('Portfolios') }}
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <!-- Blog -->
                                                    <div class="col-md-4 col-sm-6">
                                                        <div class="custom-checkbox d-flex gap-1 align-items-center">

                                                            @php $blogDisabled = !in_array('blog', $aiAllowedPages); @endphp

                                                            <input class="page-checkbox" type="checkbox" name="pages[]"
                                                                value="blog" id="page_blog"
                                                                {{ in_array('blog', $selectedPages) ? 'checked' : '' }} {{ $blogDisabled ? 'disabled' : '' }}>
                                                            <label for="page_blog"
                                                                style="margin-bottom: 0; cursor: pointer;">
                                                                {{ __('Blog') }}
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <!-- Contact -->
                                                    <div class="col-md-4 col-sm-6">
                                                        <div class="custom-checkbox d-flex gap-1 align-items-center">

                                                            @php $contactDisabled = !in_array('contact', $aiAllowedPages); @endphp

                                                            <input class="page-checkbox" type="checkbox" name="pages[]"
                                                                value="contact" id="page_contact"
                                                                {{ in_array('contact', $selectedPages) ? 'checked' : '' }} {{ $contactDisabled ? 'disabled' : '' }}>
                                                            <label for="page_contact"
                                                                style="margin-bottom: 0; cursor: pointer;">
                                                                {{ __('Contact') }}
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <!-- Causes -->
                                                    <div class="col-md-4 col-sm-6">
                                                        <div class="custom-checkbox d-flex gap-1 align-items-center">

                                                            @php $causesDisabled = !in_array('causes', $aiAllowedPages); @endphp

                                                            <input class="page-checkbox" type="checkbox" name="pages[]"
                                                                value="causes" id="page_causes"
                                                                {{ in_array('causes', $selectedPages) ? 'checked' : '' }} {{ $causesDisabled ? 'disabled' : '' }}>
                                                            <label for="page_causes"
                                                                style="margin-bottom: 0; cursor: pointer;">
                                                                {{ __('Causes') }}
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <!-- Rooms -->
                                                    <div class="col-md-4 col-sm-6">
                                                        <div class="custom-checkbox d-flex gap-1 align-items-center">

                                                            @php $roomsDisabled = !in_array('rooms', $aiAllowedPages); @endphp

                                                            <input class="page-checkbox" type="checkbox" name="pages[]"
                                                                value="rooms" id="page_rooms"
                                                                {{ in_array('rooms', $selectedPages) ? 'checked' : '' }} {{ $roomsDisabled ? 'disabled' : '' }}>
                                                            <label for="page_rooms"
                                                                style="margin-bottom: 0; cursor: pointer;">
                                                                {{ __('Rooms') }}
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <!-- Courses -->
                                                    <div class="col-md-4 col-sm-6">
                                                        <div class="custom-checkbox d-flex gap-1 align-items-center">

                                                            @php $coursesDisabled = !in_array('courses', $aiAllowedPages); @endphp

                                                            <input class="page-checkbox" type="checkbox" name="pages[]"
                                                                value="courses" id="page_courses"
                                                                {{ in_array('courses', $selectedPages) ? 'checked' : '' }} {{ $coursesDisabled ? 'disabled' : '' }}>
                                                            <label for="page_courses"
                                                                style="margin-bottom: 0; cursor: pointer;">
                                                                {{ __('Courses') }}
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {{-- End Page Selection --}}

                                            <div id="aiFields" class="p-3 border rounded " style="display: none;">
                                                <h4 class="text-success mb-2">
                                                    <i class="fas fa-sparkles"></i>
                                                    {{ __('Tell AI about your business') }}
                                                </h4>
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <div class="form-group">
                                                            <label>{{ __('Business Name') }} <span
                                                                    class="text-danger">*</span></label>
                                                            <input type="text" name="business_name"
                                                                class="form-control"
                                                                placeholder="{{ __('Enter Business Name') }}">

                                                                    <small class="text-info d-block mt-1">
                                                                        {{ __('e.g.') }}
                                                                        {{ __('TechNova Solutions') }},
                                                                        {{ __('ShopEase') }},
                                                                        {{ __('Dream Hotel') }},
                                                                        {{ __('Green Mart') }}
                                                                    </small>
                                                            <p class="text-danger mb-0 mt-1 err-business_name"></p>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="form-group">
                                                            <label>{{ __('Industry Type') }} <span
                                                                    class="text-danger">*</span></label>
                                                            <input type="text" name="industry_type"
                                                                class="form-control"
                                                                placeholder="{{ __('Enter Industry Type') }}">

                                                                <small class="text-info d-block mt-1">
                                                                    {{ __('e.g.') }}
                                                                    {{ __('IT Services') }},
                                                                    {{ __('E-commerce') }},
                                                                    {{ __('Software Company') }},
                                                                    {{ __('Online Retail') }}
                                                                </small>
                                                            <p class="text-danger mb-0 mt-1 err-industry_type"></p>
                                                        </div>
                                                    </div>
                                                    <div class="col-12">
                                                        <div class="form-group">
                                                            <label>{{ __('Business Description') }} <span
                                                                    class="text-danger">*</span></label>
                                                            <textarea name="business_info" class="form-control" rows="4"
                                                                placeholder="{{ __('Describe your business') . '...' . '(' . __('more details') . ' ' . '=' . ' ' . __('better result') . ')' }}"></textarea>
                                                            <p class="text-danger mb-0 mt-1 err-business_info"></p>
                                                        </div>
                                                    </div>

                                                    <div class="col-12">
                                                        <div class="form-group">
                                                            <label class="form-label">
                                                                {{ __('AI Generation Settings') }}
                                                            </label>

                                                            <select name="delete_prev_theme_data" class="form-control">
                                                                <option value="1">
                                                                    {{ __('Delete existing data for the selected theme and generate fresh content') }}
                                                                    — {{ __('Recommended') }}
                                                                </option>
                                                                <option value="0">
                                                                    {{ __('Keep existing data and generate new content') }}
                                                                </option>
                                                            </select>

                                                            <div class="mt-2">
                                                                <small class="text-warning d-block">
                                                                    {{ '*' . __('Deleting existing data will remove all previously saved content and images for the selected theme before generating new AI content') . '.' }}
                                                                </small>
                                                                <small class="text-warning d-block">
                                                                    {{ '*' . __('Keeping existing data may result in duplicate or mismatched content if similar sections already exist') . '.' }}
                                                                </small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="modal-footer">
                                            <button type="button" class="btn btn-secondary"
                                                data-dismiss="modal">{{ __('Close') }}</button>
                                            <button type="button" class="btn btn-primary"
                                                id="saveThemeFromModal">{{ __('Update') }}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form id="ajaxFormOnlyTheme" action="{{ route('user.theme.update') }}" method="post">
                                @csrf

                                <div class="form-group">
                                    <label class="form-label">{{ __('Themes') }} *</label>
                                    <div class="row">
                                        <div class="col-4 col-sm-4">
                                            <label class="imagecheck mb-2">
                                                <input data-toggle="modal" data-target="#aigenerateModal" name="theme2"
                                                    type="radio" value="home_one" class="imagecheck-input theme-radio"
                                                    {{ !empty($data->theme) && $data->theme == 'home_one' ? 'checked' : '' }}>
                                                <figure class="imagecheck-figure">
                                                    <img src="{{ asset('assets/front/img/user/templates/1.png') }}"
                                                        alt="title" class="imagecheck-image">
                                                </figure>
                                            </label>
                                            <h5 class="text-center">{{ __('Theme_One') }}</h5>
                                        </div>

                                        <div class="col-4 col-sm-4">
                                            <label data-toggle="modal" data-target="#aigenerateModal"
                                                class="imagecheck mb-2">
                                                <input name="theme2" type="radio" value="home_two"
                                                    class="imagecheck-input theme-radio"
                                                    {{ !empty($data->theme) && $data->theme == 'home_two' ? 'checked' : '' }}>
                                                <figure class="imagecheck-figure">
                                                    <img src="{{ asset('assets/front/img/user/templates/2.png') }}"
                                                        alt="title" class="imagecheck-image">
                                                </figure>
                                            </label>
                                            <h5 class="text-center">{{ __('Theme_Two') }}</h5>
                                        </div>

                                        <div class="col-4 col-sm-4">
                                            <label data-toggle="modal" data-target="#aigenerateModal"
                                                class="imagecheck mb-2">
                                                <input name="theme2" type="radio" value="home_three"
                                                    class="imagecheck-input theme-radio"
                                                    {{ !empty($data->theme) && $data->theme == 'home_three' ? 'checked' : '' }}>
                                                <figure class="imagecheck-figure">
                                                    <img src="{{ asset('assets/front/img/user/templates/3.png') }}"
                                                        alt="title" class="imagecheck-image">
                                                </figure>
                                            </label>
                                            <h5 class="text-center">{{ __('Theme_Three') }}</h5>
                                        </div>

                                        <div class="col-4 col-sm-4">
                                            <label data-toggle="modal" data-target="#aigenerateModal"
                                                class="imagecheck mb-2">
                                                <input name="theme2" type="radio" value="home_four"
                                                    class="imagecheck-input theme-radio"
                                                    {{ !empty($data->theme) && $data->theme == 'home_four' ? 'checked' : '' }}>
                                                <figure class="imagecheck-figure">
                                                    <img src="{{ asset('assets/front/img/user/templates/4.png') }}"
                                                        alt="title" class="imagecheck-image">
                                                </figure>
                                            </label>
                                            <h5 class="text-center">{{ __('Theme_Four') }}</h5>
                                        </div>

                                        <div class="col-4 col-sm-4">
                                            <label data-toggle="modal" data-target="#aigenerateModal"
                                                class="imagecheck mb-2">
                                                <input name="theme2" type="radio" value="home_five"
                                                    class="imagecheck-input theme-radio"
                                                    {{ !empty($data->theme) && $data->theme == 'home_five' ? 'checked' : '' }}>
                                                <figure class="imagecheck-figure">
                                                    <img src="{{ asset('assets/front/img/user/templates/5.png') }}"
                                                        alt="title" class="imagecheck-image">
                                                </figure>
                                            </label>
                                            <h5 class="text-center">{{ __('Theme_Five') }}</h5>
                                        </div>

                                        <div class="col-4 col-sm-4">
                                            <label data-toggle="modal" data-target="#aigenerateModal"
                                                class="imagecheck mb-2">
                                                <input name="theme2" type="radio" value="home_six"
                                                    class="imagecheck-input theme-radio"
                                                    {{ !empty($data->theme) && $data->theme == 'home_six' ? 'checked' : '' }}>
                                                <figure class="imagecheck-figure">
                                                    <img src="{{ asset('assets/front/img/user/templates/6.png') }}"
                                                        alt="title" class="imagecheck-image">
                                                </figure>
                                            </label>
                                            <h5 class="text-center">{{ __('Theme_Six') }}</h5>
                                        </div>

                                        <div class="col-4 col-sm-4">
                                            <label data-toggle="modal" data-target="#aigenerateModal"
                                                class="imagecheck mb-2">
                                                <input name="theme2" type="radio" value="home_seven"
                                                    class="imagecheck-input theme-radio"
                                                    {{ !empty($data->theme) && $data->theme == 'home_seven' ? 'checked' : '' }}>
                                                <figure class="imagecheck-figure">
                                                    <img src="{{ asset('assets/front/img/user/templates/7.png') }}"
                                                        alt="title" class="imagecheck-image">
                                                </figure>
                                            </label>
                                            <h5 class="text-center">{{ __('Theme_Seven') }}</h5>
                                        </div>

                                        @if (!empty($permissions) && in_array('Ecommerce', $permissions))
                                            <div class="col-4 col-sm-4">
                                                <label data-toggle="modal" data-target="#aigenerateModal"
                                                    class="imagecheck mb-2">
                                                    <input name="theme2" type="radio" value="home_eight"
                                                        class="imagecheck-input theme-radio"
                                                        {{ !empty($data->theme) && $data->theme == 'home_eight' ? 'checked' : '' }}>
                                                    <figure class="imagecheck-figure">
                                                        <img src="{{ asset('assets/front/img/user/templates/8.png') }}"
                                                            alt="title" class="imagecheck-image">
                                                    </figure>
                                                </label>
                                                <h5 class="text-center">{{ __('Theme_Eight') }}</h5>
                                            </div>
                                        @endif

                                        @if (!empty($permissions) && in_array('Hotel Booking', $permissions))
                                            <div class="col-4 col-sm-4">
                                                <label data-toggle="modal" data-target="#aigenerateModal"
                                                    class="imagecheck mb-2">
                                                    <input name="theme2" type="radio" value="home_nine"
                                                        class="imagecheck-input theme-radio"
                                                        {{ !empty($data->theme) && $data->theme == 'home_nine' ? 'checked' : '' }}>
                                                    <figure class="imagecheck-figure">
                                                        <img src="{{ asset('assets/front/img/user/templates/9.png') }}"
                                                            alt="title" class="imagecheck-image">
                                                    </figure>
                                                </label>
                                                <h5 class="text-center">{{ __('Theme_Nine') }}</h5>
                                            </div>
                                        @endif

                                        @if (!empty($permissions) && in_array('Course Management', $permissions))
                                            <div class="col-4 col-sm-4">
                                                <label data-toggle="modal" data-target="#aigenerateModal"
                                                    class="imagecheck mb-2">
                                                    <input name="theme2" type="radio" value="home_ten"
                                                        class="imagecheck-input theme-radio"
                                                        {{ !empty($data->theme) && $data->theme == 'home_ten' ? 'checked' : '' }}>
                                                    <figure class="imagecheck-figure">
                                                        <img src="{{ asset('assets/front/img/user/templates/10.png') }}"
                                                            alt="title" class="imagecheck-image">
                                                    </figure>
                                                </label>
                                                <h5 class="text-center">{{ __('Theme_Ten') }}</h5>
                                            </div>
                                        @endif

                                        @if (!empty($permissions) && in_array('Donation Management', $permissions))
                                            <div class="col-4 col-sm-4">
                                                <label data-toggle="modal" data-target="#aigenerateModal"
                                                    class="imagecheck mb-2">
                                                    <input name="theme2" type="radio" value="home_eleven"
                                                        class="imagecheck-input theme-radio"
                                                        {{ !empty($data->theme) && $data->theme == 'home_eleven' ? 'checked' : '' }}>
                                                    <figure class="imagecheck-figure">
                                                        <img src="{{ asset('assets/front/img/user/templates/11.png') }}"
                                                            alt="title" class="imagecheck-image">
                                                    </figure>
                                                </label>
                                                <h5 class="text-center">{{ __('Theme_Eleven') }}</h5>
                                            </div>
                                        @endif

                                        @if (!empty($permissions) && in_array('Portfolio', $permissions))
                                            <div class="col-4 col-sm-4">
                                                <label data-toggle="modal" data-target="#aigenerateModal"
                                                    class="imagecheck mb-2">
                                                    <input name="theme2" type="radio" value="home_twelve"
                                                        class="imagecheck-input theme-radio"
                                                        {{ !empty($data->theme) && $data->theme == 'home_twelve' ? 'checked' : '' }}>
                                                    <figure class="imagecheck-figure">
                                                        <img src="{{ asset('assets/front/img/user/templates/12.png') }}"
                                                            alt="title" class="imagecheck-image">
                                                    </figure>
                                                </label>
                                                <h5 class="text-center">{{ __('Theme_Twelve') }}</h5>
                                            </div>
                                        @endif

                                        <div class="col-4 col-sm-4">
                                            <label data-toggle="modal" data-target="#aigenerateModal"
                                                class="imagecheck mb-2">
                                                <input name="theme2" type="radio" value="home_thirteen"
                                                    class="imagecheck-input theme-radio"
                                                    {{ !empty($data->theme) && $data->theme == 'home_thirteen' ? 'checked' : '' }}>
                                                <figure class="imagecheck-figure">
                                                    <img src="{{ asset('assets/front/img/user/templates/13.png') }}"
                                                        alt="title" class="imagecheck-image">
                                                </figure>
                                            </label>
                                            <h5 class="text-center">{{ __('Theme_Thirteen') }}</h5>
                                        </div>

                                        @if (!empty($permissions) && in_array('Ecommerce', $permissions))
                                            <div class="col-4 col-sm-4">
                                                <label data-toggle="modal" data-target="#aigenerateModal"
                                                    class="imagecheck mb-2">
                                                    <input name="theme2" type="radio" value="home_fourteen"
                                                        class="imagecheck-input theme-radio"
                                                        {{ !empty($data->theme) && $data->theme == 'home_fourteen' ? 'checked' : '' }}>
                                                    <figure class="imagecheck-figure">
                                                        <img src="{{ asset('assets/front/img/user/templates/14.png') }}"
                                                            alt="title" class="imagecheck-image">
                                                    </figure>
                                                </label>
                                                <h5 class="text-center">{{ __('Theme_Fourteen') }}</h5>
                                            </div>
                                        @endif
                                    </div>
                                </div>

                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
@section('scripts')
    <script>
        $(function() {
            const $aiFields = $('#aiFields');
            const $aiModeRadios = $('input[name="ai_mode"]');

            const aiSupportedThemes = [
                'home_one', 'home_two', 'home_three', 'home_four', 'home_five',
                'home_six', 'home_seven', 'home_eight', 'home_nine', 'home_ten', 'home_eleven', 'home_twelve',
                'home_thirteen', 'home_fourteen'
            ];

            const $themeItems = $('.imagecheck.mb-2');

            function filterThemesForAI() {
                const isAiMode = $('input[name="ai_mode"]:checked').val() == '1';

                $themeItems.each(function() {
                    const $input = $(this).find('input[name="theme2"]');
                    const themeValue = $input.val();

                    if (isAiMode) {

                        if (aiSupportedThemes.includes(themeValue)) {
                            $(this).closest('.col-4, .col-sm-4').show();
                        } else {
                            $(this).closest('.col-4, .col-sm-4').hide();

                            if ($input.is(':checked')) {
                                $input.prop('checked', false);
                            }
                        }
                    } else {

                        $(this).closest('.col-4, .col-sm-4').show();
                    }
                });

                if (isAiMode && !$('input[name="theme2"]:checked').length && aiSupportedThemes.length > 0) {
                    const firstAvailable = aiSupportedThemes.find(t => $(`input[value="${t}"]`).length);
                    if (firstAvailable) {
                        $(`input[value="${firstAvailable}"]`).prop('checked', true).trigger('change');
                    }
                }

                if (isAiMode) {
                    $aiFields.slideDown(400);
                    $('html, body').animate({
                        scrollTop: $aiFields.offset().top - 100
                    }, 500);
                } else {
                    $aiFields.slideUp(400);
                }
            }

            function togglePageSelection() {
                const isAiMode = $('input[name="ai_mode"]:checked').val() == '1';
                const $pageSection = $('#pageSelectionSection');

                if (isAiMode) {
                    $pageSection.slideDown(400);

                    updatePageCheckboxesByTheme();
                } else {
                    $pageSection.slideUp(400);
                }
            }

            $aiModeRadios.on('change', function() {
                filterThemesForAI();
                togglePageSelection();
            });


            $(document).ready(function() {
                filterThemesForAI();
                togglePageSelection();
                updatePageCheckboxesByTheme();
            });

            // ==================== default page selection for each page ====================
            function updatePageCheckboxesByTheme() {
                const selectedTheme = $('input[name="theme2"]:checked').val() || 'home_one';

                $('.page-checkbox').prop('checked', false);

                let defaultPages = ['services', 'about', 'team', 'career', 'faq', 'gallery', 'portfolio', 'contact',
                    'blog', 'shop'
                ];

                if (selectedTheme === 'home_eight' || selectedTheme === 'home_fourteen') {

                    defaultPages = ['shop', 'about', 'contact', 'faq', 'blog', 'contact'];
                } else if (selectedTheme === 'home_nine') {

                    defaultPages = ['rooms', 'services', 'contact', 'faq', 'blog', 'about'];
                } else if (selectedTheme === 'home_ten') {
                    // Course Management
                    defaultPages = ['courses', 'about', 'contact', 'blog', 'faq'];
                } else if (selectedTheme === 'home_eleven') {
                    // Donation
                    defaultPages = ['about', 'causes', 'gallery', 'blog', 'contact', 'faq'];
                } else if (selectedTheme === 'home_twelve') {
                    // Portfolio 
                    defaultPages = ['portfolios', 'services', 'about', 'gallery', 'contact', 'blog'];
                }

                defaultPages.forEach(page => {
                    const $cb = $(`#page_${page}`);
                    if ($cb.length && !$cb.is(':disabled')) {
                        $cb.prop('checked', true);
                    }
                });
            }

            $(document).on('change', '.theme-radio', function() {
                updatePageCheckboxesByTheme();
            });

            $(document).ready(function() {
                updatePageCheckboxesByTheme();
            });


            function clearErrors() {
                $('.err-business_name, .err-industry_type, .err-business_info').text('');
            }

            $('#saveThemeFromModal').on('click', function() {
                clearErrors();

                const isAiMode = $('input[name="ai_mode"]:checked').val() == '1';
                const selectedTheme = $('input[name="theme2"]:checked').val();

                if (!selectedTheme) {
                    alert('Please select a theme first!');
                    return;
                }

                if (isAiMode && !aiSupportedThemes.includes(selectedTheme)) {
                    alert(
                        'This theme is not supported with AI generation yet. Please choose another theme.'
                    );
                    return;
                }

                let fd = new FormData();
                fd.append('_token', $('input[name="_token"]').val());
                fd.append('theme', selectedTheme);

                const selectedPages = ['home'];
                $('.page-checkbox:checked').each(function() {
                    const val = $(this).val();
                    if (val && val !== 'home') {
                        selectedPages.push(val);
                    }
                });

                if (isAiMode) {
                    const name = $('[name="business_name"]').val().trim();
                    const industry = $('[name="industry_type"]').val().trim();
                    const info = $('[name="business_info"]').val().trim();

                    fd.append('generate_ai_content', '1');
                    fd.append('business_name', name);
                    fd.append('industry_type', industry);
                    fd.append('business_info', info);

                    const deletePrev = $('[name="delete_prev_theme_data"]').val() || '1';
                    fd.append('delete_prev_theme_data', deletePrev);

                    selectedPages.forEach(page => {
                        fd.append('pages[]', page);
                    });
                } else {
                    fd.append('generate_ai_content', '0');
                }

                $.ajax({
                    url: "{{ route('user.theme.update') }}",
                    method: 'POST',
                    data: fd,
                    contentType: false,
                    processData: false,
                    success: function(res) {

                        if (res === 'success' || res === 'warning') {

                            $('#aigenerateModal').modal('hide');

                            const msg = isAiMode ?
                                'AI has started generating your content & images...' :
                                'Theme updated successfully!';

                            setTimeout(() => location.reload(), 2500);
                        }
                    },
                    error: function(xhr) {

                        if (xhr.responseJSON?.errors) {
                            const e = xhr.responseJSON.errors;
                            if (e.business_name) $('.err-business_name').text(e.business_name[
                                0]);
                            if (e.industry_type) $('.err-industry_type').text(e.industry_type[
                                0]);
                            if (e.business_info) $('.err-business_info').text(e.business_info[
                                0]);
                            if (e.theme) alert('Theme Error: ' + e.theme[0]);
                        } else {
                            alert('Something went wrong! Please try again.');
                        }
                    }
                });
            });

        });
    </script>
@endsection
