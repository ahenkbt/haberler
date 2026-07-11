@extends('user.layout')


@section('content')
    <div class="page-header">
        <h4 class="page-title">{{  __("Courses") }}</h4>
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
                <a href="#">{{  __("Courses") }}</a>
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
                              {{ __("Courses") }}  ( {{ $language->name . ' ' .  __('Language')  }} )
                            </div>
                        </div>

                        <div class="col-lg-3">
                            @includeIf('user.partials.languages')
                        </div>

                        <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
                            <a href="{{ route('user.course_management.create_course')  . '?language=' . request('language')  }}"
                                class="btn btn-primary btn-sm float-right"><i class="fas fa-plus"></i>
                                {{ __("Add_Course") }}</a>
                            <button class="btn btn-danger btn-sm float-right mr-2 d-none bulk-delete"
                                data-href="{{ route('user.course_management.bulk_delete_course') }}">
                                <i class="flaticon-interface-5"></i> {{__("Delete") }}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-12">
                            @if (count($courses) == 0)
                                <h3 class="text-center mt-2">
                                    {{ __("NO_COURSE_FOUND") }}</h3>
                            @else
                                @php
                                    $position = $currencyInfo->base_currency_symbol_position;
                                    $symbol = $currencyInfo->base_currency_symbol;
                                @endphp

                                <div class="table-responsive">
                                    <table class="table table-striped mt-3" id="basic-datatables">
                                        <thead>
                                            <tr>
                                                <th scope="col">
                                                    <input type="checkbox" class="bulk-check" data-val="all">
                                                </th>
                                                <th scope="col">{{ __("Title") }}</th>
                                                <th scope="col">{{ __("Category") }}</th>
                                                <th scope="col">{{ __("Instructor") }}</th>
                                                <th scope="col">{{ __("Price") }}</th>
                                                <th scope="col">{{ __("Status") }}</th>
                                                <th scope="col">{{ __("Featured") }}</th>
                                                <th scope="col">{{ __("Actions") }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach ($courses as $course)
                                                <tr>
                                                    <td>
                                                        <input type="checkbox" class="bulk-check"
                                                            data-val="{{ $course->id }}">
                                                    </td>
                                                    <td width="20%">
                                                        {{ $course->title }}
                                                    </td>
                                                    <td>
                                                        {{ $course->category }}
                                                    </td>
                                                    <td>{{ $course->instructorName }}</td>
                                                    <td>
                                                        @if ($course->pricing_type == 'free')
                                                            {{ __('Free') }}
                                                        @else
                                                            {{ $position == 'left' ? $symbol : '' }}{{ $course->current_price }}{{ $position == 'right' ? $symbol : '' }}
                                                        @endif
                                                    </td>
                                                    <td>
                                                        <form id="statusForm-{{ $course->id }}" class="d-inline-block"
                                                            action="{{ route('user.course_management.course.update_status', ['id' => $course->id, 'language' => request()->input('language')]) }}"
                                                            method="post">

                                                            @csrf
                                                            <select
                                                                class="form-control form-control-sm {{ $course->status == 'draft' ? 'bg-warning text-dark' : 'bg-primary' }}"
                                                                name="status"
                                                                onchange="document.getElementById('statusForm-{{ $course->id }}').submit()">
                                                                <option value="draft"
                                                                    {{ $course->status == 'draft' ? 'selected' : '' }}>
                                                                    {{   __("Draft") }}
                                                                </option>
                                                                <option value="published"
                                                                    {{ $course->status == 'published' ? 'selected' : '' }}>
                                                                    {{  __("Published") }}
                                                                </option>
                                                            </select>
                                                        </form>
                                                    </td>
                                                    <td>

                                                        <form id="featuredForm-{{ $course->id }}" class="d-inline-block"
                                                            action="{{ route('user.course_management.course.update_featured', ['id' => $course->id]) }}"
                                                            method="post">

                                                            @csrf
                                                            <select
                                                                class="form-control form-control-sm {{ $course->is_featured == 'yes' ? 'bg-success' : 'bg-danger' }}"
                                                                name="is_featured"
                                                                onchange="document.getElementById('featuredForm-{{ $course->id }}').submit()">
                                                                <option value="yes"
                                                                    {{ $course->is_featured == 'yes' ? 'selected' : '' }}>
                                                                    {{  __("Yes")  }}
                                                                </option>
                                                                <option value="no"
                                                                    {{ $course->is_featured == 'no' ? 'selected' : '' }}>
                                                                    {{  __("No") }}
                                                                </option>
                                                            </select>
                                                        </form>

                                                    </td>
                                                    <td>
                                                        <div class="dropdown">
                                                            <button class="btn btn-secondary dropdown-toggle btn-sm"
                                                                type="button" id="dropdownMenuButton"
                                                                data-toggle="dropdown" aria-haspopup="true"
                                                                aria-expanded="false">
                                                                {{   __("Select") }}
                                                            </button>

                                                            <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">

                                                                <a href="{{ route('user.course_management.edit_course', ['id' => $course->id, 'language' => request('language')]) }}"
                                                                    class="dropdown-item">
                                                                    {{    __("Information") }}
                                                                </a>

                                                                <a href="{{ route('user.course_management.course.modules', ['id' => $course->id, 'language' => request()->input('language')]) }}"
                                                                    class="dropdown-item">
                                                                    {{    __("Curriculum") }}
                                                                </a>

                                                                <a href="{{ route('user.course_management.course.faqs', ['id' => $course->id, 'language' => request('language')]) }}"
                                                                    class="dropdown-item">
                                                                    {{  __("FAQs") }}
                                                                </a>

                                                                <a href="{{ route('user.course_management.course.thanks_page', ['id' => $course->id, 'language' => request('language')]) }}"
                                                                    class="dropdown-item">
                                                                    {{   __("Thanks_Page") }}
                                                                </a>

                                                                <a href="{{ route('user.course_management.course.certificate_settings', ['id' => $course->id, 'language' => request('language')]) }}"
                                                                    class="dropdown-item">
                                                                    {{  __("Certificate_Settings") }}
                                                                </a>


                                                                <a target="_blank"
                                                                    href="{{ route('customer.my_course.curriculum', [Auth::guard('web')->user()->username, 'id' => $course->id, 'lesson_id' => $course->lesson_id, 'language' => request('language')]) }}"
                                                                    class="dropdown-item">
                                                                    {{  __("Preview") }}
                                                                </a>

                                                                <form class="deleteform d-block"
                                                                    action="{{ route('user.course_management.delete_course', ['id' => $course->id]) }}"
                                                                    method="post">

                                                                    @csrf
                                                                    <button type="submit" class="btn btn-sm deletebtn">
                                                                        {{   __("Delete") }}
                                                                    </button>
                                                                </form>
                                                            </div>
                                                        </div>
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
@endsection
