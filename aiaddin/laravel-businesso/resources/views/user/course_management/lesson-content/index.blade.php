@extends('user.layout')

@php
  use App\Models\User\Language;
  $default = Language::where('is_default', 1)
      ->where('user_id', Auth::guard('web')->user()->id)
      ->first();
@endphp

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Contents') }}</h4>
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
          href="{{ route('user.course_management.courses', ['language' => request('language')]) }}">{{ __('Courses') }}</a>
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
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">
                {{ __('Contents') }} {{ $language->name }} ( {{ __('Language') }} )
              </div>
            </div>

            <div class="col-lg-8 mt-2 mt-lg-0">
              <a href="{{ route('user.course_management.course.modules', ['id' => request()->input('course'), 'language' => request('language')]) }}"
                class="btn btn-info btn-sm float-lg-right float-left"><i class="fas fa-backward"></i>
                {{ __('Back') }}</a>
              <a href="{{ route('user.course_management.lesson.create_quiz', ['id' => $lesson->id, 'course' => request()->input('course'), 'language' => request('language')]) }}"
                class="btn btn-primary btn-sm float-lg-right float-left mr-2"><i class="fas fa-plus"></i>
                {{ __('Add_Quiz') }}</a>
              <a href="#" data-toggle="modal" data-target="#addCodeModal"
                class="btn btn-primary btn-sm float-lg-right float-left mr-2"><i class="fas fa-plus"></i>
                {{ __('Add_Code') }}</a>
              <a href="#" data-toggle="modal" data-target="#addTextModal"
                class="btn btn-primary btn-sm float-lg-right float-left mr-2"><i class="fas fa-plus"></i>
                {{ __('Add_Text') }}</a>
              <a href="#" data-toggle="modal" data-target="#addFileModal"
                class="btn btn-primary btn-sm float-lg-right float-left mr-2"><i class="fas fa-plus"></i>
                {{ __('Add_File') }}</a>
              <a href="#" data-toggle="modal" data-target="#addVideoModal"
                class="btn btn-primary btn-sm float-lg-right float-left mr-2"><i class="fas fa-plus"></i>
                {{ __('Add_Video') }}</a>
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="row">
            <div class="col">
              @if (count($contents) == 0)
                <h3 class="text-center mb-0">{{ __('No_Content_Found') }}
                </h3>
              @else
                <div class="alert alert-warning text-center mb-0" role="alert">
                  <strong class="text-dark">{{ __('Drag_and_drop_to_sort_the_contents_of_this_lesson') }}</strong>
                </div>
              @endif
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  @if (count($contents) > 0)
    <div id="sort-content">
      @foreach ($contents as $content)
        <div class="row">
          <div class="col">
            <div class="card ui-state-default" data-id="{{ $content->id }}">
              <div class="card-header">
                <div class="row">
                  <div class="col-lg-8">
                    @if ($content->type == 'video')
                      <div class="card-title">{{ $content->video_original_name }}</div>
                    @elseif ($content->type == 'file')
                      <div class="card-title">{{ $content->file_original_name }}</div>
                    @elseif ($content->type == 'text')
                      <div class="card-title">{{ __('Text') }}</div>
                    @elseif ($content->type == 'code')
                      <div class="card-title">{{ __('Code') }}</div>
                    @elseif ($content->type == 'quiz')
                      <div class="card-title">{{ __('Quiz') }}</div>
                    @endif
                  </div>

                  <div class="col-lg-4">
                    @if ($content->type != 'quiz')
                      <form class="deleteform"
                        action="{{ route('user.course_management.lesson.delete_content', ['id' => $content->id]) }}"
                        method="POST">

                        @csrf
                        <button type="submit" class="btn btn-sm btn-danger float-right deletebtn">
                          <span class="btn-label">
                            <i class="fas fa-trash"></i>
                          </span>
                          {{ __('Delete') }}
                        </button>
                      </form>
                    @endif

                    @if ($content->type == 'file')
                      <form action="{{ route('user.course_management.lesson.download_file', ['id' => $content->id]) }}"
                        method="GET">
                        <button type="submit" class="btn btn-sm btn-success float-right mr-2">
                          <span class="btn-label">
                            <i class="fas fa-download"></i>
                          </span>
                          {{ __('Download') }}
                        </button>
                      </form>
                    @endif

                    @if ($content->type == 'text' || $content->type == 'code')
                      <a href="#" class="btn btn-sm btn-secondary float-right mr-2 editbtn text-light"
                        data-toggle="modal"
                        data-target="{{ $content->type == 'text' ? '#editTextModal' : '#editCodeModal' }}"
                        @if ($content->type == 'text') data-id="{{ $content->id }}" @else data-content_id="{{ $content->id }}" @endif
                        @if ($content->type == 'text') data-text="{{ $content->text }}" @else data-code="{{ $content->code }}" @endif>
                        <span class="btn-label">
                          <i class="fas fa-edit"></i>
                        </span>
                        {{ __('Edit') }}
                      </a>
                    @endif

                    @if ($content->type == 'video')
                      <a href="#" class="btn btn-sm btn-secondary float-right mr-2 editbtn text-light"
                        data-toggle="modal" data-target="#videoPreview{{ $content->id }}">
                        <span class="btn-label">
                          <i class="fas fa-image"></i>
                        </span>
                        {{ __('Preview_Image') }}
                      </a>

                      <!-- Modal -->
                      <div class="modal fade" id="videoPreview{{ $content->id }}" tabindex="-1" role="dialog"
                        aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                          <div class="modal-content">
                            <div class="modal-header">
                              <h5 class="modal-title" id="exampleModalLongTitle">
                                {{ __('Edit_Preview_Template') }}
                              </h5>
                              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                              </button>
                            </div>
                            <div class="modal-body text-left">
                              <form action="{{ route('user.course_management.lesson.video_preview') }}"
                                id="editTemplateForm{{ $content->id }}" method="POST" enctype="multipart/form-data">
                                @csrf
                                <input type="hidden" name="content_id" value="{{ $content->id }}">
                                <div class="form-group">
                                  <label for="">{{ __('Video_Preview') }}
                                    **</label>
                                  <div class="col-md-12 showImage mb-3">
                                    <img
                                      src="{{ $content->video_preview ? asset(\App\Constants\Constant::WEBSITE_LESSON_CONTENT_VIDEO_PREVIEW . '/' . $content->video_preview) : asset('assets/admin/img/noimage.jpg') }}"
                                      alt="..." class="img-thumbnail">
                                  </div>
                                  <input type="file" name="video_preview" class="image"
                                    class="form-control image">
                                  <p class="eerrvideo_preview mb-0 text-danger em"></p>
                                  <p class="text-warning mb-0">
                                    {{ __('Upload_850_X_480_image_for_best_quality') }}
                                  </p>
                                </div>
                              </form>
                            </div>
                            <div class="modal-footer">
                              <button type="button" class="btn btn-secondary update-btn"
                                data-form_id="editTemplateForm{{ $content->id }}">{{ __('Update') }}</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    @endif

                    @if ($content->type == 'quiz')
                      <a href="{{ route('user.course_management.lesson.manage_quiz', ['id' => $lesson->id, 'course' => request()->input('course'), 'language' => $language->code]) }}"
                        class="btn btn-sm btn-info float-right text-light">
                        <span class="btn-label">
                          <i class="fas fa-cog"></i>
                        </span>
                        {{ __('Manage') }}
                      </a>
                    @endif
                  </div>
                </div>
              </div>

              @if ($content->type == 'video' || $content->type == 'text' || $content->type == 'code')
                <div class="card-body">
                  <div class="row">
                    <div class="col">
                      @if ($content->type == 'video')
                        <div class="video-box text-center">
                          <video width="400" controls
                            poster="{{ $content->video_preview ? asset(\App\Constants\Constant::WEBSITE_LESSON_CONTENT_VIDEO_PREVIEW . '/' . $content->video_preview) : asset('assets/tenant/image/static/default_video_preview.jpeg') }}">

                            <source
                              src="{{ asset(\App\Constants\Constant::WEBSITE_LESSON_CONTENT_VIDEO . '/' . $content->video_unique_name) }}"
                              type="video/mp4">
                            {{ __('Your_browser_does_not_support_HTML_video') }}
                          </video>
                        </div>
                      @elseif ($content->type == 'text')
                        <div class="code-box">
                          <div class="{{ $language->rtl == 1 ? 'rtl' : '' }}">
                            {!! replaceBaseUrl($content->text, 'summernote') !!}
                          </div>
                        </div>
                      @elseif ($content->type == 'code')
                        <div class="code-box">
                          <pre><code>{{ $content->code }}</code></pre>
                        </div>
                      @endif
                    </div>
                  </div>
                </div>
              @endif
            </div>
          </div>
        </div>
      @endforeach
    </div>
  @endif

  {{-- add video modal --}}
  @include('user.course_management.lesson-content.video')
  {{-- add file modal --}}
  @include('user.course_management.lesson-content.file')
  {{-- add text modal --}}
  @include('user.course_management.lesson-content.create-text')
  {{-- edit text modal --}}
  @include('user.course_management.lesson-content.edit-text')
  {{-- add code modal --}}
  @include('user.course_management.lesson-content.create-code')
  {{-- edit code modal --}}
  @include('user.course_management.lesson-content.edit-code')
@endsection

@section('scripts')
  <script>
    "use strict";
    const vidUpUrl = "{{ route('user.course_management.lesson.upload_video') }}";
    const vidRmvUrl = "{{ route('user.course_management.lesson.remove_video') }}";
    const fileUpUrl = "{{ route('user.course_management.lesson.upload_file') }}";
    const fileRmvUrl = "{{ route('user.course_management.lesson.remove_file') }}";
    const sortContentUrl = "{{ route('user.course_management.lesson.sort_contents') }}";
  </script>

  <script type="text/javascript" src="{{ asset('assets/user/js/dropzone-video-upload.js') }}"></script>
  <script type="text/javascript" src="{{ asset('assets/user/js/dropzone-file-upload.js') }}"></script>
  <script type="text/javascript" src="{{ asset('assets/user/js/partial.js') }}"></script>
@endsection
