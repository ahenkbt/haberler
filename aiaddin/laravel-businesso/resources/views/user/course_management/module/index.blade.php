@extends('user.layout')

{{-- this style will be applied when the direction of language is right-to-left --}}
@includeIf('user.partials.rtl-style')
@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Modules') }}</h4>
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
                <a href="#">{{ __('Course_Management') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a
                    href="{{ route('user.course_management.courses', ['language' => $defaultLang->code]) }}">{{ __('Courses') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            @if (!empty($courseInformation))
                <li class="nav-item">
                    <a
                        href="#">{{ strlen($courseInformation->title) > 35 ? mb_substr($courseInformation->title, 0, 35, 'UTF-8') . '...' : $courseInformation->title }}</a>
                </li>
            @endif
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Modules') }}</a>
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
                                {{ __('Modules') }} ( {{ $language->name . ' ' . __('Language') }} )
                            </div>
                        </div>

                        <div class="col-lg-3">
                            @includeIf('user.partials.languages')
                        </div>

                        <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
                            <a class="btn btn-info btn-sm float-right ml-2"
                                href="{{ route('user.course_management.courses', ['language' => request('language')]) }}">
                                <span class="btn-label">
                                    <i class="fas fa-backward"></i>
                                </span>
                                {{ __('Back') }}
                            </a>

                            <a href="#" data-toggle="modal" data-target="#createModal"
                                class="btn btn-primary btn-sm float-lg-right float-left"><i class="fas fa-plus"></i>
                                {{ __('Add_Module') }}</a>

                            <button class="btn btn-danger float-right btn-sm mr-2 d-none bulk-delete"
                                data-href="{{ route('user.course_management.course.bulk_delete_module') }}">
                                <i class="flaticon-interface-5"></i> {{ __('Delete') }}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-12">
                            @if (count($modules) == 0)
                                <h3 class="text-center mt-2">{{ __('NO_MODULE_FOUND') }}
                                </h3>
                            @else
                                <div class="table-responsive">
                                    <table class="table table-striped mt-3" id="basic-datatables">
                                        <thead>
                                            <tr>
                                                <th scope="col">
                                                    <input type="checkbox" class="bulk-check" data-val="all">
                                                </th>
                                                <th scope="col">{{ __('Title') }}</th>
                                                <th scope="col">{{ __('Status') }}</th>
                                                <th scope="col">{{ __('Serial_Number') }}
                                                </th>
                                                <th scope="col">{{ __('Actions') }}</th>
                                                <th scope="col">{{ __('Lesson') }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach ($modules as $module)
                                                <tr>
                                                    <td>
                                                        <input type="checkbox" class="bulk-check"
                                                            data-val="{{ $module->id }}">
                                                    </td>
                                                    <td width="20%">
                                                        {{ $module->title }}
                                                    </td>
                                                    <td>
                                                        @if ($module->status == 'draft')
                                                            <span
                                                                class="badge badge-warning">{{ __(ucfirst($module->status)) }}</span>
                                                        @else
                                                            <span
                                                                class="badge badge-primary">{{ __(ucfirst($module->status)) }}</span>
                                                        @endif
                                                    </td>
                                                    <td>{{ $module->serial_number }}</td>
                                                    <td>

                                                        <a class="btn btn-secondary btn-sm mr-1 editbtn" href="#"
                                                            data-toggle="modal" data-target="#editModal"
                                                            data-id="{{ $module->id }}"
                                                            data-title="{{ $module->title }}"
                                                            data-status="{{ $module->status }}"
                                                            data-serial_number="{{ $module->serial_number }}">
                                                            <span class="btn-label">
                                                                <i class="fas fa-edit"></i>
                                                            </span>
                                                            {{ __('Edit') }}
                                                        </a>

                                                        <form class="deleteform d-inline-block"
                                                            action="{{ route('user.course_management.course.delete_module', ['id' => $module->id]) }}"
                                                            method="post">

                                                            @csrf
                                                            <button type="submit" class="btn btn-danger btn-sm deletebtn">
                                                                <span class="btn-label">
                                                                    <i class="fas fa-trash"></i>
                                                                </span>
                                                                {{ __('Delete') }}
                                                            </button>
                                                        </form>
                                                    </td>
                                                    <td>
                                                        <a href="#" data-toggle="modal"
                                                            data-target="#createLessonModal-{{ $module->id }}"
                                                            class="btn btn-primary btn-sm mr-1">
                                                            <span class="btn-label">
                                                                <i class="fas fa-plus"></i>
                                                            </span>
                                                            {{ __('Add') }}
                                                        </a>

                                                        <a href="#" data-toggle="modal"
                                                            data-target="#viewLessonModal-{{ $module->id }}"
                                                            class="btn btn-success btn-sm">
                                                            <span class="btn-label">
                                                                <i class="fas fa-eye"></i>
                                                            </span>
                                                            {{ __('View') }}
                                                        </a>

                                                        {{-- create modal (lesson) --}}
                                                        @include('user.course_management.lesson.create')

                                                        {{-- view modal (lesson) --}}
                                                        @include('user.course_management.lesson.index')
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
    @include('user.course_management.module.create')

    {{-- edit modal --}}
    @include('user.course_management.module.edit')

    {{-- edit modal (lesson) --}}
    @include('user.course_management.lesson.edit')
@endsection
@section('scripts')
    <script>
        // Form Pre Populate After Click The Edit Button(Lesson) Start
        $('.lessonEditBtn').on('click', function(event) {
            event.preventDefault();

            let datas = $(this).data();

            for (const key in datas) {
                $('#lesson_' + key).val(datas[key]);
            }

            $('#viewLessonModal-' + datas.module_id).modal('hide');
            $('#lessonEditModal').modal('show');
        });
        // Form Prepopulate After Click The Edit Button(Lesson) End


        // Lesson Update with AJAX Request Start
        $('#lessonUpdateBtn').on('click', function() {
            $('.request-loader').addClass('show');

            let form = $('#lessonEditForm')[0];
            let fd = new FormData(form);
            let url = $('#lessonEditForm').attr('action');
            let type = $('#lessonEditForm').attr('method');

            $.ajax({
                url: url,
                type: type,
                data: fd,
                contentType: false,
                processData: false,
                success: function(data) {
                    $('.request-loader').removeClass('show');

                    $('.em').each(function() {
                        $(this).html('');
                    });

                    if (data == 'success') {
                        location.reload();
                    }
                },
                error: function(error) {
                    $('.em').each(function() {
                        $(this).html('');
                    });

                    for (let x in error.responseJSON.errors) {
                        $('#lessonEdit_error_' + x).text(error.responseJSON.errors[x][0]);
                    }

                    $('.request-loader').removeClass('show');
                }
            });
        });
        // Lesson Update with AJAX Request End


        // Lesson Delete Using AJAX Request Start
        $('.lessonDeleteBtn').on('click', function(event) {
            event.preventDefault();
            $('.request-loader').addClass('show');
            let $this = $(this);

            swal({
                title: 'Are you sure?',
                text: "You won't be able to revert this!",
                type: 'warning',
                buttons: {
                    confirm: {
                        text: 'Yes, delete it',
                        className: 'btn btn-success'
                    },
                    cancel: {
                        visible: true,
                        className: 'btn btn-danger'
                    }
                }
            }).then((Delete) => {
                if (Delete) {
                    $this.parents('.lessonDeleteForm').submit();
                } else {
                    swal.close();
                    $('.request-loader').removeClass('show');
                }
            });
        });
        // Lesson Delete Using AJAX Request End


        function storeLesson(event, moduleId) {
            event.preventDefault();
            $('.request-loader').addClass('show');

            let lessonForm = $('#lessonForm-' + moduleId)[0];
            let fd = new FormData(lessonForm);
            let url = $('#lessonForm-' + moduleId).attr('action');
            let type = $('#lessonForm-' + moduleId).attr('method');

            $.ajax({
                url: url,
                type: type,
                data: fd,
                contentType: false,
                processData: false,
                success: function(data) {
                    $('.request-loader').removeClass('show');
                    $('.em').each(function() {
                        $(this).html('');
                    });
                    if (data == 'success') {
                        location.reload();
                    }
                },
                error: function(error) {
                    $('.em').each(function() {
                        $(this).html('');
                    });
                    for (let x in error.responseJSON.errors) {
                        $('#err_' + x + '-' + moduleId).text(error.responseJSON.errors[x][0]);
                    }
                    $('.request-loader').removeClass('show');
                }
            });
        }
    </script>
@endsection
