@extends('user.layout')

{{-- this style will be applied when the direction of language is right-to-left --}}
@includeIf('user.partials.rtl-style')

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Categories') }}</h4>
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
                <a href="#">{{ __('Donation_Management') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Categories') }}</a>
            </li>
        </ul>
    </div>

    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="row">
                        <div class="col-lg-4">
                            <div class="card-title d-inline-block">
                                {{ __('Donation_Categories') }}</div>
                        </div>

                        <div class="col-lg-3">
                            @includeIf('user.partials.languages')
                        </div>

                        <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
                            <a href="#" data-toggle="modal" data-target="#createModal"
                                class="btn btn-primary btn-sm float-lg-right float-left"><i class="fas fa-plus"></i>
                                {{ __('Add_Category') }}</a>

                            <button class="btn btn-danger btn-sm float-right mr-2 d-none bulk-delete"
                                data-href="{{ route('user.donation.category.bulkDestroy') }}"><i
                                    class="flaticon-interface-5"></i> {{ __('Delete') }}</button>
                        </div>
                    </div>
                </div>

                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-12">
                            @if (count($categories) == 0)
                                <h3 class="text-center">
                                    {{ __('NO_DONATION_CATEGORY_FOUND') }}</h3>
                            @else
                                <div class="table-responsive">
                                    <table class="table table-striped mt-3">
                                        <thead>
                                            <tr>
                                                <th scope="col">
                                                    <input type="checkbox" class="bulk-check" data-val="all">
                                                </th>
                                                <th scope="col">{{ __('Image') }}</th>
                                                <th scope="col">{{ __('Icon') }}</th>
                                                <th scope="col">{{ __('Name') }}</th>
                                                <th scope="col">{{ __('Status') }}</th>
                                                @if ($userBs->theme == 'home_eleven')
                                                    <th scope="col">{{ __('Featured') }}</th>
                                                @endif
                                                <th scope="col">{{ __('Serial_Number') }}
                                                </th>
                                                <th scope="col">{{ __('Actions') }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach ($categories as $category)
                                                <tr>

                                                    <td>
                                                        <input type="checkbox" class="bulk-check"
                                                            data-val="{{ $category->id }}">
                                                    </td>
                                                    <td><img src="{{ empty($category->image) ? asset('assets/admin/img/noimage.jpg') : asset(\App\Constants\Constant::WEBSITE_CAUSE_CATEGORY_IMAGE . '/' . $category->image) }}"
                                                            alt="" class="img-thumbnail"></td>
                                                    <td><i class="{{ $category->icon }}"></i></td>
                                                    <td>
                                                        {{ strlen($category->name) > 100 ? convertUtf8(substr($category->name, 0, 100)) . '...' : convertUtf8($category->name) }}
                                                    </td>
                                                    <td>
                                                        @if ($category->status == 1)
                                                            <h2 class="d-inline-block"><span
                                                                    class="badge badge-success">{{ __('Active') }}</span>
                                                            </h2>
                                                        @else
                                                            <h2 class="d-inline-block"><span
                                                                    class="badge badge-danger">{{ __('Deactive') }}</span>
                                                            </h2>
                                                        @endif
                                                    </td>
                                                    @if ($userBs->theme == 'home_eleven')
                                                        <td>
                                                            @if ($category->is_featured == 1)
                                                                <h2 class="d-inline-block"><span
                                                                        class="badge badge-success">{{ __('Yes') }}</span>
                                                                </h2>
                                                            @else
                                                                <h2 class="d-inline-block"><span
                                                                        class="badge badge-danger">{{ __('No') }}</span>
                                                                </h2>
                                                            @endif
                                                        </td>
                                                    @endif
                                                    <td>{{ $category->serial_number }}</td>
                                                    <td>
                                                        <a class="btn btn-secondary btn-sm mr-1 editbtn" href="#"
                                                            data-toggle="modal" data-target="#editModal"
                                                            data-id="{{ $category->id }}"
                                                            data-name="{{ $category->name }}"
                                                            data-image="{{ empty($category->image) ? asset('images/default.jpg') : asset(\App\Constants\Constant::WEBSITE_CAUSE_CATEGORY_IMAGE . '/' . $category->image) }} "
                                                            data-icon="{{ $category->icon }}"
                                                            data-short_description="{{ $category->short_description }}"
                                                            data-status="{{ $category->status }}"
                                                            data-is_featured="{{ $category->is_featured }}"
                                                            data-serial_number="{{ $category->serial_number }}">
                                                            <span class="btn-label">
                                                                <i class="fas fa-edit"></i>
                                                            </span>
                                                            {{ __('Edit') }}
                                                        </a>

                                                        <form class="deleteform d-inline-block"
                                                            action="{{ route('user.donation.category.destroy') }}"
                                                            method="post">
                                                            @csrf
                                                            <input type="hidden" name="category_id"
                                                                value="{{ $category->id }}">

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
                @if (count($categories) > 0)
                    <div class="card-footer">
                        <div class="row">
                            <div class="d-inline-block mx-auto">
                                {{ $categories->appends(['language' => request()->input('language')])->links() }}
                            </div>
                        </div>
                    </div>
                @endif
            </div>
        </div>
    </div>

    {{-- create modal --}}
    @include('user.donation_management.categories.create')

    {{-- edit modal --}}
    @include('user.donation_management.categories.edit')
@endsection
@section('scripts')
    <script>
        $('.icp-dd1').iconpicker();
        $('.icp1').on('iconpickerSelected', function(event) {
            $("#inputIcon1").val($("#inicon").attr('class'));
        });
    </script>
@endsection
