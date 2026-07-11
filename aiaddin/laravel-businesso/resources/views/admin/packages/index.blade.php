@extends('admin.layout')

@php
    use App\Models\Language;
    $selLang = Language::where('code', request()->input('language'))->first();
@endphp
@if (!empty($selLang) && $selLang->rtl == 1)
    @section('styles')
        <style>
            form:not(.modal-form) input,
            form:not(.modal-form) textarea,
            form:not(.modal-form) select,
            select[name='language'] {
                direction: rtl;
            }

            form:not(.modal-form) .note-editor.note-frame .note-editing-area .note-editable {
                direction: rtl;
                text-align: right;
            }
        </style>
    @endsection
@endif

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Packages') }}</h4>
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
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="row">
                        <div class="col-lg-4">
                            <div class="card-title d-inline-block">{{ __('Package Page') }}</div>
                        </div>
                        <div class="col-lg-4 offset-lg-4 mt-2 mt-lg-0">
                            <a href="#" class="btn btn-primary float-right btn-sm" data-toggle="modal"
                                data-target="#createModal"><i class="fas fa-plus"></i>
                                {{ __('Add Package') }}</a>
                            <button class="btn btn-danger float-right btn-sm mr-2 d-none bulk-delete"
                                data-href="{{ route('admin.package.bulk.delete') }}"><i class="flaticon-interface-5"></i>
                                {{ __('Delete') }}
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-12">
                            @if (count($packages) == 0)
                                <h3 class="text-center">{{ __('NO PACKAGE FOUND YET') }}</h3>
                            @else
                                <div class="table-responsive">
                                    <table class="table table-striped mt-3" id="basic-datatables">
                                        <thead>
                                            <tr>
                                                <th scope="col">
                                                    <input type="checkbox" class="bulk-check" data-val="all">
                                                </th>
                                                <th scope="col">{{ __('Title') }}</th>
                                                <th scope="col">{{ __('Cost') }}</th>
                                                <th scope="col">{{ __('Status') }}</th>
                                                <th scope="col">{{ __('Actions') }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>

                                            @foreach ($packages as $key => $package)
                                                <tr>
                                                    <td>
                                                        <input type="checkbox" class="bulk-check"
                                                            data-val="{{ $package->id }}">
                                                    </td>
                                                    <td>{{ strlen($package->title) > 30 ? mb_substr($package->title, 0, 30, 'UTF-8') . '...' : __($package->title) }}
                                                        <span
                                                            class="badge text-capitalize @if ($package->term == 'monthly') badge-info @elseif($package->term == 'yearly')badge-primary @else badge-success @endif nav-pills ">{{ __($package->term) }}</span>
                                                    </td>
                                                    <td>
                                                        @if ($package->price == 0)
                                                            {{ __('Free') }}
                                                        @else
                                                            {{ format_price($package->price) }}
                                                        @endif

                                                    </td>
                                                    <td>
                                                        @if ($package->status == 1)
                                                            <h2 class="d-inline-block">
                                                                <span
                                                                    class="badge badge-success">{{ __('Active') }}</span>
                                                            </h2>
                                                        @else
                                                            <h2 class="d-inline-block">
                                                                <span
                                                                    class="badge badge-danger">{{ __('Deactive') }}</span>
                                                            </h2>
                                                        @endif
                                                    </td>
                                                    <td>
                                                        <a class="btn btn-secondary btn-sm"
                                                            href="{{ route('admin.package.edit', $package->id) . '?language=' . request()->input('language') }}">
                                                            <span class="btn-label">
                                                                <i class="fas fa-edit"></i>
                                                            </span>
                                                            {{ __('Edit') }}
                                                        </a>
                                                        <form class="deleteform d-inline-block"
                                                            action="{{ route('admin.package.delete') }}" method="post">
                                                            @csrf
                                                            <input type="hidden" name="package_id"
                                                                value="{{ $package->id }}">
                                                            <button type="submit" class="btn btn-danger btn-sm deletebtn">
                                                                <span class="btn-label">
                                                                    <i class="fas fa-trash"></i>
                                                                </span>
                                                                {{ __('Delete') }}
                                                            </button>
                                                        </form>
                                                    </td>
                                                </tr>
                                            @endforeach
                                        </tbody>
                                    </table>
                                </div>
                            @endif
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Create Blog Modal -->
    <div class="modal fade" id="createModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
        aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add Package') }}</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">

                    <form id="ajaxForm" enctype="multipart/form-data" class="modal-form"
                        action="{{ route('admin.package.store') }}" method="POST">
                        @csrf
                        <div class="form-group">
                            <label for="">{{ __('Icon') }} **</label>
                            <div class="btn-group d-block">
                                <button type="button" class="btn btn-primary iconpicker-component"><i
                                        class="fa fa-fw fa-heart"></i></button>
                                <button type="button" class="icp icp-dd btn btn-primary dropdown-toggle"
                                    data-selected="fa-car" data-toggle="dropdown">
                                </button>
                                <div class="dropdown-menu"></div>
                            </div>
                            <input id="inputIcon" type="hidden" name="icon" value="fas fa-heart">
                            <p id="erricon" class="mb-0 text-danger em"></p>
                            <div class="mt-2">
                                <small
                                    class="text-warning">{{ '*' . __('Click on the dropdown sign to select a icon') . '.' }}</small>
                            </div>
                            <p id="erricon" class="mb-0 text-danger em"></p>
                        </div>
                        <div class="form-group">
                            <label for="title">{{ __('Package title') }}*</label>
                            <input id="title" type="text" class="form-control" name="title"
                                placeholder="{{ __('Enter Package title') }}" value="">
                            <p id="errtitle" class="mb-0 text-danger em"></p>
                        </div>
                        {{-- <div class="form-group">
                            <label for="subtitle">{{ __('Package subtitle') }}</label>
                            <input id="subtitle" type="text" class="form-control" name="subtitle"
                                placeholder="{{ __('Enter Package subtitle') }}" value="">
                            <p id="errsubtitle" class="mb-0 text-danger em"></p>
                        </div> --}}
                        <div class="form-group">
                            <label for="price">{{ __('Price') }} ({{ $bex->base_currency_text }})*</label>
                            <input id="price" type="number" class="form-control" name="price"
                                placeholder="{{ __('Enter Package price') }}" value="">
                            <p class="text-warning">
                                <small>{{ __('If price is 0 , than it will appear as free') }}</small>
                            </p>
                            <p id="errprice" class="mb-0 text-danger em"></p>
                        </div>
                        <div class="form-group">
                            <label for="term">{{ __('Package term') }}*</label>
                            <select id="term" name="term" class="form-control" required>
                                <option value="" selected disabled>{{ __('Choose a Package term') }}</option>
                                <option value="monthly">{{ __('monthly') }}</option>
                                <option value="yearly">{{ __('yearly') }}</option>
                                <option value="lifetime">{{ __('lifetime') }}</option>
                            </select>
                            <p id="errterm" class="mb-0 text-danger em"></p>
                        </div>

                        <div class="form-group">
                            <label class="form-label">{{ __('Package Features') }}</label>
                            <div class="selectgroup selectgroup-pills">
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Custom Domain"
                                        class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Custom Domain') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Subdomain"
                                        class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Subdomain') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="vCard" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('vCard') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="QR Builder"
                                        class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('QR Builder') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Follow/Unfollow"
                                        class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Follow/Unfollow') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Request a Quote"
                                        class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Request a Quote') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Blog" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Blog') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Portfolio"
                                        class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Portfolio') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Custom Page"
                                        class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Custom Page') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Counter Information"
                                        class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Counter Information') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Skill" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Skill') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Service" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Service') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Testimonial"
                                        class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Testimonial') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Career" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Career') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Team" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Team') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Plugins" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Plugins') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Ecommerce"
                                        class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Ecommerce') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="Hotel Booking"
                                        class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Hotel Booking') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input id="CourseManagement" type="checkbox" name="features[]"
                                        value="Course Management" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Course Management') }}</span>
                                </label>

                                <label class="selectgroup-item">
                                    <input id="DonationManagement" type="checkbox" name="features[]"
                                        value="Donation Management" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Donation Management') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="checkbox" name="features[]" value="One-Click AI Website Setup"
                                        id="OneClickAIWebsiteSetup" class="selectgroup-input">
                                    <span class="selectgroup-button">
                                        {{ __('One-Click AI Full Site Content') }}
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div id="aiWebsiteSetupWrapper" class="ai-setup-hidden">

                            <div class="form-group">
                                <div class="mt-2">
                                    <label class="form-label d-block mb-2">
                                        {{ __('AI Engine') }} <span class="text-danger">*</span>
                                    </label>

                                    <div class="selectgroup selectgroup-pills">

                                        {{-- OpenAI (Paid) --}}
                                        <label class="selectgroup-item">
                                            <input type="radio" name="ai_engine" value="openai"
                                                class="selectgroup-input">
                                            <span
                                                class="selectgroup-button d-flex align-items-center justify-content-between">
                                                <span>{{ __('OpenAI') }}</span>
                                                <span class="badge badge-danger ml-2">{{ __('Paid') }}</span>
                                            </span>
                                        </label>

                                        {{-- Gemini (Paid) --}}
                                        <label class="selectgroup-item">
                                            <input type="radio" name="ai_engine" value="gemini"
                                                class="selectgroup-input">
                                            <span
                                                class="selectgroup-button d-flex align-items-center justify-content-between">
                                                <span>{{ __('Gemini') }}</span>
                                                <span class="badge badge-danger ml-2">{{ __('Paid') }}</span>
                                            </span>
                                        </label>

                                        {{-- Pollinations (Free) --}}
                                        <label class="selectgroup-item">
                                            <input type="radio" name="ai_engine" value="pollinations"
                                                class="selectgroup-input">
                                            <span
                                                class="selectgroup-button d-flex align-items-center justify-content-between">
                                                <span>{{ __('Pollinations') }}</span>
                                                <span class="badge badge-success ml-2">{{ __('Free') }}</span>
                                            </span>
                                        </label>

                                    </div>

                                    <p id="errai_engine" class="mb-0 text-danger em"></p>
                                    <small class="text-warning d-block mt-2">
                                        {{ '*' . __('Paid AI engines require a valid API key and active billing') . '. ' . __('Free engines do not require any API key') . '.' }}
                                    </small>

                                    <small class="text-warning d-block mt-1">
                                        {{ '*' . __('If One-Click AI Website Setup is enabled, you must select an AI Engine and at least one AI Generated Page') . '.' }}
                                    </small>
                                </div>
                            </div>

                            {{-- AI Pages (Subtitles) --}}
                            <div class="form-group">
                                <label
                                    class="form-label d-block mb-2">{{ __('AI will generate content for selected pages') }}<span
                                        class="text-danger">*</span> </label>

                                <div class="selectgroup selectgroup-pills d-flex flex-wrap">

                                    <label class="selectgroup-item">
                                        <input type="checkbox" name="ai_pages[]" value="Home Page"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('Home') }}</span>
                                    </label>

                                    <label class="selectgroup-item">
                                        <input type="checkbox" name="ai_pages[]" value="About Page"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('About') }}</span>
                                    </label>

                                    <label class="selectgroup-item">
                                        <input type="checkbox" name="ai_pages[]" value="Services Page"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('Services') }}</span>
                                    </label>

                                    <label class="selectgroup-item">
                                        <input type="checkbox" name="ai_pages[]" value="Team Page"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('Team') }}</span>
                                    </label>

                                    <label class="selectgroup-item">
                                        <input type="checkbox" name="ai_pages[]" value="Career Page"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('Career') }}</span>
                                    </label>

                                    <label class="selectgroup-item">
                                        <input type="checkbox" name="ai_pages[]" value="FAQ Page"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('FAQ') }}</span>
                                    </label>

                                    <label class="selectgroup-item">
                                        <input type="checkbox" name="ai_pages[]" value="Gallery Page"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('Gallery') }}</span>
                                    </label>

                                    <label class="selectgroup-item">
                                        <input type="checkbox" name="ai_pages[]" value="Blog Page"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('Blog') }}</span>
                                    </label>

                                    <label class="selectgroup-item">
                                        <input type="checkbox" name="ai_pages[]" value="Portfolio Page"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('Portfolio') }}</span>
                                    </label>

                                    <label class="selectgroup-item">
                                        <input type="checkbox" name="ai_pages[]" value="Contact Page"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('Contact') }}</span>
                                    </label>

                                    <label class="selectgroup-item">
                                        <input type="checkbox" name="ai_pages[]" value="Shop Page"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('Shop') }}</span>
                                    </label>

                                    <label class="selectgroup-item">
                                        <input type="checkbox" name="ai_pages[]" value="Course Page"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('Courses') }}</span>
                                    </label>

                                    <label class="selectgroup-item">
                                        <input type="checkbox" name="ai_pages[]" value="Room Page"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('Rooms') }}</span>
                                    </label>

                                    <label class="selectgroup-item">
                                        <input type="checkbox" name="ai_pages[]" value="Cause Page"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('Causes') }}</span>
                                    </label>
                                    <small class="text-warning d-block mt-2">
                                        {{ '*' . __('Some general website content is common for all pages and will be automatically generated') . ', ' . __('even if it is not specific to a selected page') }}
                                    </small>

                                </div>

                                <p id="errai_pages" class="mb-0 text-danger em"></p>
                            </div>

                            {{-- AI Content Generate Limit --}}
                            <div class="form-group">
                                <label class="form-label d-block mb-2">
                                    {{ __('AI Website Content Generation Attempts Limit') }} <span class="text-danger">*</span>
                                </label>

                                <input type="number" name="ai_generate_limit" class="form-control" min="1"
                                    placeholder="{{ __('e.g. 10') }}"
                                    value="{{ old('ai_generate_limit', $package->ai_generate_limit ?? '') }}">

                                <p id="errai_generate_limit" class="mb-0 text-danger em"></p>

                                    <small class="text-warning d-block mt-2">
                                            {{'*'. __('Set how many times user can generate full site content using AI in this package') . '.' }}
                                        </small>
                            </div>
                        </div>

                        <div class="form-group" id="max_video_size" style="display: none;">
                            <label for="products ">{{ __('Maximum Size of Single Video') }} (MB) *</label>
                            <input id="products " type="number" class="form-control" name="video_size_limit"
                                placeholder="{{ __('Enter max video size') }}">
                            <p class="text-warning">
                                <small>{{ __('Enter 999999 , then it will appear as unlimited') }}</small>
                            </p>
                            <p id="errvideo_size_limit" class="mb-0 text-danger em"></p>
                        </div>
                        <div class="form-group" id="max_file_size" style="display: none;">
                            <label for="products1">{{ __('Maximum Size of Single File') }} (MB) *</label>
                            <input id="products1" type="number" class="form-control" name="file_size_limit"
                                placeholder="{{ __('Enter max file size') }}">
                            <p class="text-warning">
                                <small>{{ __('Enter 999999 , then it will appear as unlimited') }}</small>
                            </p>
                            <p id="errfile_size_limit" class="mb-0 text-danger em"></p>
                        </div>
                        <div class="form-group v-card-box vcrd-none">
                            <label for="">{{ __('Number of vcards') }} * </label>
                            <input type="number" class="form-control" name="number_of_vcards" value="">
                            <p id="errnumber_of_vcards" class="mb-0 text-danger em"></p>
                            <p class="text-warning">{{ __('Enter 999999 , then it will appear as unlimited') }}</p>
                        </div>
                        <div class="form-group">
                            <label class="form-label">{{ __('Featured') }} *</label>
                            <div class="selectgroup w-100">
                                <label class="selectgroup-item">
                                    <input type="radio" name="featured" value="1" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Yes') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="radio" name="featured" value="0" class="selectgroup-input"
                                        checked>
                                    <span class="selectgroup-button">{{ __('No') }}</span>
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">{{ __('Trial') }} *</label>
                            <div class="selectgroup w-100">
                                <label class="selectgroup-item">
                                    <input type="radio" name="is_trial" value="1" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Yes') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="radio" name="is_trial" value="0" class="selectgroup-input"
                                        checked>
                                    <span class="selectgroup-button">{{ __('No') }}</span>
                                </label>
                            </div>
                        </div>
                        <div class="form-group" id="trial_day" style="display: none">
                            <label for="trial_days">{{ __('Trial days') }}*</label>
                            <input id="trial_days" type="number" class="form-control" name="trial_days"
                                placeholder="{{ __('Enter trial days') }}" value="">
                            <p id="errtrial_days" class="mb-0 text-danger em"></p>
                        </div>
                        <div class="form-group">
                            <label for="status">{{ __('Status') }}*</label>
                            <select id="status" class="form-control" name="status">
                                <option value="" selected disabled>{{ __('Select a status') }}</option>
                                <option value="1">{{ __('Active') }}</option>
                                <option value="0">{{ __('Deactive') }}</option>
                            </select>
                            <p id="errstatus" class="mb-0 text-danger em"></p>
                        </div>
                        <div class="form-group">
                            <label for="status">{{ __('Additional Languages Limit') }}*</label>
                            <input type="number" class="form-control" name="number_of_languages" value=""
                                placeholder="{{ __('Enter number of languages') }}">
                            <p id="errnumber_of_languages" class="mb-0 text-danger em"></p>
                            <p class="text-warning">{{ __('Enter 999999 , then it will appear as unlimited') }}</p>
                        </div>
                        <div class="form-group">
                            <label for="">{{ __('Meta Keywords') }}</label>
                            <input type="text" class="form-control" name="meta_keywords" value=""
                                data-role="tagsinput">
                        </div>
                        <div class="form-group">
                            <label for="meta_description">{{ __('Meta Description') }}</label>
                            <textarea id="meta_description" type="text" class="form-control" name="meta_description" rows="5">
                            </textarea>
                        </div>
                        <div class="form-group  ">
                            <label for="">{{ __('Serial Number') }} * </label>
                            <input type="number" class="form-control" name="serial_number" value="">
                            <p id="errserial_number" class="mb-0 text-danger em"></p>
                            <p class="text-warning">
                                {{ __('The higher the serial number is, the later the feature will be shown.') }}
                            </p>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">{{ __('Close') }}</button>
                    <button id="submitBtn" type="button" class="btn btn-primary">{{ __('Submit') }}</button>
                </div>
            </div>
        </div>
    </div>
@endsection

@section('scripts')
    <script src="{{ asset('assets/admin/js/packages.js') }}"></script>
@endsection
