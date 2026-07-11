@extends('user.layout')

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Add_Quiz') }}</h4>
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
                    href="{{ route('user.course_management.courses', ['language' => $default->code]) }}">{{ __('Courses') }}</a>
            </li>
            @if (!empty($courseInfo))
                <li class="separator">
                    <i class="flaticon-right-arrow"></i>
                </li>
                <li class="nav-item">
                    <a
                        href="#">{{ strlen($courseInfo->title) > 35 ? mb_substr($courseInfo->title, 0, 35, 'UTF-8') . '...' : $courseInfo->title }}</a>
                </li>
            @endif
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a
                    href="{{ route('user.course_management.course.modules', ['id' => $courseInfo->course_id, 'language' => request('language')]) }}">{{ __('Modules') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ $module->title }}</a>
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
                <a href="#">{{ __('Add_Quiz') }}</a>
            </li>
        </ul>
    </div>

    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="row">
                        <div class="col-lg-8">
                            <div class="card-title d-inline-block">
                                {{ __('Add_Quiz') }}
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
                        <div class="col-lg-8 offset-lg-2">
                            <form id="ajaxForm"
                                action="{{ route('user.course_management.lesson.store_quiz', ['id' => $lesson->id]) }}"
                                method="POST">
                                @csrf
                                <div class="row">
                                    <div class="col">
                                        <div class="form-group">
                                            <label>{{ __('Question') }} * </label>
                                            <input class="form-control {{ $courseInfo->language->rtl == 1 ? 'rtl' : '' }}"
                                                type="text" name="question" placeholder="{{ __('Enter_Question') }}">
                                            <p class="mt-1 mb-0 text-danger em" id="errquestion"></p>
                                        </div>
                                    </div>
                                </div>

                                <div id="app">
                                    <div class="row">
                                        <div class="col">
                                            <div class="form-group">
                                                <label>{{ __('Answer') }} * </label><br>
                                                <button class="btn btn-sm btn-primary" type="button"
                                                    v-on:click="addAns()">{{ __('Add_Answer') }}</button>
                                                <p class="mt-1 mb-0 text-danger em" id="erranswer"></p>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row" v-for="(answer, index) in answers" v-bind:key="answer.uniqId">
                                        <div class="col-lg-2">
                                            <div class="form-group">
                                                <label for="">{{ __('Right_Answer') }}</label><br>
                                                <input type="checkbox" name="right_answers[]" v-bind:value="index">
                                            </div>
                                        </div>

                                        <div class="col-lg-8">
                                            <div class="form-group">
                                                <label for="">{{ __('Option') }}</label>
                                                <input type="text"
                                                    class="form-control {{ $courseInfo->language->rtl == 1 ? 'rtl' : '' }}"
                                                    name="options[]" placeholder="{{ __('Enter_Option') }}">
                                            </div>
                                        </div>

                                        <div class="col-lg-2">
                                            <button class="btn btn-danger mt-4 ml-2" v-on:click="removeAns(index)"><i
                                                    class="fas fa-times"></i></button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="card-footer">
                    <div class="row">
                        <div class="col-12 text-center">
                            <button type="submit" class="btn btn-success" id="submitBtn">
                                {{ __('Save') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection

@section('scripts')
    <script src="{{ asset('assets/user/js/quiz/create.js') }}"></script>
@endsection
