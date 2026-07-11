@extends('user.layout')
@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Manage_Quiz') }}</h4>
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
                <a href="#">{{ __('Course') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Module') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Lesson') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a
                    href="#">{{ strlen($lesson->title) > 20 ? mb_substr($lesson->title, 0, 20, 'UTF-8') . '...' : $lesson->title }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Manage_Quiz') }}</a>
            </li>
        </ul>
    </div>

    <div class="row">
        <div class="col">
            <div class="card">
                <div class="card-header">
                    <div class="row">
                        <div class="col-lg-8">
                            <div class="card-title d-inline-block">
                                {{ __('Quizzes') }} ({{ $language->name . ' ' . __('Language') }})
                            </div>
                        </div>

                        <div class="col-lg-4 mt-2 mt-lg-0">
                            <a class="btn btn-info btn-sm float-right"
                                href="{{ route('user.course_management.lesson.contents', ['id' => $lesson->id, 'course' => request()->input('course'), 'language' => request('language')]) }}">
                                <span class="btn-label">
                                    <i class="fas fa-backward"></i>
                                </span>
                                {{ __('Back') }}
                            </a>
                        </div>
                    </div>
                </div>

                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-12">
                            @if (count($quizzes) == 0)
                                <h3 class="text-center mt-2">{{ __('NO_QUIZ_FOUND') }} !</h3>
                            @else
                                <div class="table-responsive">
                                    <table class="table table-striped mt-3" id="basic-datatables">
                                        <thead>
                                            <tr>
                                                <th scope="col">{{ '#' }}</th>
                                                <th scope="col">{{ __('Question') }}</th>
                                                <th scope="col">{{ __('Actions') }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach ($quizzes as $quiz)
                                                <tr>
                                                    <td>{{ $loop->iteration }}</td>
                                                    <td>
                                                        {{ strlen($quiz->question) > 50 ? mb_substr($quiz->question, 0, 50, 'UTF-8') . '...' : $quiz->question }}
                                                    </td>
                                                    <td>
                                                        <a class="btn btn-secondary btn-sm mr-1"
                                                            href="{{ route('user.course_management.lesson.edit_quiz', ['lessonId' => $lesson->id, 'quizId' => $quiz->id, 'language' => request('language')]) }}">
                                                            <span class="btn-label">
                                                                <i class="fas fa-edit"></i>
                                                            </span>
                                                            {{ __('Edit') }}
                                                        </a>

                                                        <form class="deleteform d-inline-block"
                                                            action="{{ route('user.course_management.lesson.delete_quiz', ['id' => $quiz->id]) }}"
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
