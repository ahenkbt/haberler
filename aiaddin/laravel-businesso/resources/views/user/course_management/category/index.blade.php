@extends('user.layout')

{{-- this style will be applied when the direction of language is right-to-left --}}
@includeIf('user.partials.rtl-style')


@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __("Categories") }}</h4>
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
                <a href="#">{{   __("Course_Management") }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __("Categories") }}</a>
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
                                {{  __("Course_Categories") }}</div>
                        </div>

                        <div class="col-lg-3">
                            @includeIf('user.partials.languages') 
                        </div>

                        <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">

                            <a href="#" data-toggle="modal" data-target="#createModal"
                                class="btn btn-primary btn-sm float-lg-right float-left"><i class="fas fa-plus"></i>
                                {{   __("Add_Category") }}
                            </a>

                            <button class="btn btn-danger btn-sm float-right mr-2 d-none bulk-delete"
                                data-href="{{ route('user.course_management.bulk_delete_category') }}">
                                <i class="flaticon-interface-5"></i> {{ __("Delete") }}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-12">
                            @if (count($categories) == 0)
                                <h3 class="text-center mt-2">
                                    {{  __("NO_COURSE_CATEGORY_FOUND") }}</h3>
                            @else
                                <div class="table-responsive">
                                    <table class="table table-striped mt-3" id="basic-datatables">
                                        <thead>
                                            <tr>
                                                <th scope="col">
                                                    <input type="checkbox" class="bulk-check" data-val="all">
                                                </th>
                                                <th scope="col">{{ __("Icon") }}</th>
                                                <th scope="col">{{ __("Name") }}</th>
                                                <th scope="col">{{ __("Status") }}</th>
                                                <th scope="col">{{ __("Serial_Number") }}
                                                </th>

                                                <th scope="col">{{ __("Featured") }}</th>

                                                <th scope="col">{{ __("Actions") }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach ($categories as $category)
                                                <tr>
                                                    <td>
                                                        <input type="checkbox" class="bulk-check"
                                                            data-val="{{ $category->id }}">
                                                    </td>
                                                    <td><i class="{{ $category->icon }}"></i></td>
                                                    <td>
                                                        {{ strlen($category->name) > 50 ? mb_substr($category->name, 0, 50, 'UTF-8') . '...' : $category->name }}
                                                    </td>
                                                    <td>
                                                        @if ($category->status == 1)
                                                            <h2 class="d-inline-block"><span
                                                                    class="badge badge-success">{{ __("Active") }}</span>
                                                            </h2>
                                                        @else
                                                            <h2 class="d-inline-block"><span
                                                                    class="badge badge-danger">{{ __("Deactive") }}</span>
                                                            </h2>
                                                        @endif
                                                    </td>
                                                    <td>{{ $category->serial_number }}</td>
                                                    <td>
                                                        <form id="featuredForm-{{ $category->id }}" class="d-inline-block"
                                                            action="{{ route('user.course_management.category.update_featured', ['id' => $category->id]) }}"
                                                            method="post">

                                                            @csrf
                                                            <select
                                                                class="form-control form-control-sm {{ $category->is_featured == 1 ? 'bg-success' : 'bg-danger' }}"
                                                                name="is_featured"
                                                                onchange="document.getElementById('featuredForm-{{ $category->id }}').submit()">
                                                                <option value="1"
                                                                    {{ $category->is_featured == 1 ? 'selected' : '' }}>
                                                                    {{ __("Yes") }}
                                                                </option>
                                                                <option value="0"
                                                                    {{ $category->is_featured != 1 ? 'selected' : '' }}>
                                                                    {{ __("No") }}
                                                                </option>
                                                            </select>
                                                        </form>
                                                    </td>
                                                    <td>

                                                        <a class="btn btn-secondary btn-sm mr-1 editbtn" href="#"
                                                            data-toggle="modal" data-target="#editModal"
                                                            data-id="{{ $category->id }}"
                                                            data-icon="{{ $category->icon }}"
                                                            data-color="{{ $category->color }}"
                                                            data-name="{{ $category->name }}"
                                                            data-status="{{ $category->status }}"
                                                            data-serial_number="{{ $category->serial_number }}">
                                                            <span class="btn-label">
                                                                <i class="fas fa-edit"></i>
                                                            </span>
                                                            {{ __("Edit") }}
                                                        </a>

                                                        <form class="deleteform d-inline-block"
                                                            action="{{ route('user.course_management.delete_category', ['id' => $category->id]) }}"
                                                            method="post">

                                                            @csrf
                                                            <button type="submit" class="btn btn-danger btn-sm deletebtn">
                                                                <span class="btn-label">
                                                                    <i class="fas fa-trash"></i>
                                                                </span>
                                                                {{ __("Delete") }}
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

                <div class="card-footer"></div>
            </div>
        </div>
    </div>

    {{-- create modal --}}
    @include('user.course_management.category.create')

    {{-- edit modal --}}
    @include('user.course_management.category.edit')
@endsection
