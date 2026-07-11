@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['curriculum'] ?? __('Curriculum') }}
@endsection

{{-- @section('page-name')
    {{ $keywords['curriculum'] ?? __('Curriculum') }}
@endsection
@section('br-name')
    {{ $keywords['curriculum'] ?? __('Curriculum') }}
@endsection --}}
@section('styles')
  {{-- <link rel="stylesheet" href=" {{ asset('assets/front/user/css/course-curriculum.css') }}" /> --}}
@endsection
@section('content')
  <!--====== CURRICULUM PART START ======-->
  <section class="course-video-section">
    <div class="course-navigation">
      <div class="navigation-container d-flex align-items-center justify-content-between">
        <div class="course-nav-left d-flex justify-content-between align-items-center">
          <a href="{{ route('customer.my_courses', getParam()) }}" class="prev"><i
              class="far fa-angle-left"></i>{{ $keywords['my_courses'] ?? __('My Courses') }}</a>
          <a href="#" class="course-nav-btn"><i class="far fa-bars"></i></a>
        </div>

        <div class="course-nav-right">
          @if ($certificateStatus == 1)
            <a href="{{ route('customer.my_course.get_certificate', [getParam(), 'id' => request()->route('id')]) }}"
              class="certificate"><i class="far fa-diploma"></i>{{ $keywords['certificate'] ?? __('Certificate') }}</a>
          @endif
        </div>
      </div>
    </div>

    <div class="course-videos-area">
      <div class="container-fluid p-0">
        <div class="course-wrapper-video d-flex">
          <div class="course-videos-sidebar">
            <div class="course-video-nav mt-15">
              @if (isset($modules))
                @foreach ($modules as $key => $module)
                  <div class="course-section">
                    <h5 class="heading">{{ $module->title }}</h5>

                    @php $lessons = $module->lessons; @endphp

                    <ul class="list">
                      @if (!empty($lessons))
                        @foreach ($lessons as $lesson)
                          @php
                            $lessonPeriod = $lesson->duration;
                            $lessonDuration = \Carbon\Carbon::parse($lessonPeriod);
                          @endphp

                          <li>
                            <a href="{{ route('customer.my_course.curriculum', [getParam(), 'id' => request()->route('id'), 'lesson_id' => $lesson->id]) }}"
                              class="
                            @if (request()->input('lesson_id') == $lesson->id) active @endif
                            @if (Auth::guard('customer')->check() &&
                                    $lesson->lesson_complete()->where('customer_id', Auth::guard('customer')->user()->id)->count() > 0) lesson-complete @endif"
                              id="lesson-{{ $lesson->id }}">
                              <span>{{ $lesson->title }}
                                {{-- {{ '(' . $lessonDuration->format('i') . ':' }}{{ $lessonDuration->format('s') . ')' }} --}}
                                @if (is_null($lesson->duration))
                                  {{ '(00:00:00)' }}
                                @else
                                  {{ '(' . $lesson->duration . ')' }}
                                @endif
                              </span>

                            </a>
                          </li>
                        @endforeach
                      @endif
                    </ul>
                  </div>
                @endforeach
              @endif
            </div>
          </div>

          <div class="course-videos-wrapper">
            <div class="title mb-20">
              <h4>{{ $courseTitle ?? '' }}</h4>
            </div>
            @if (!empty($lessonContents))
              @foreach ($lessonContents as $lessonContent)
                @php $contentType = $lessonContent->type; @endphp

                @switch($contentType)
                  @case('video')
                    <div class="video-box">
                      <video id="videoId{{ $lessonContent->id }}" class="video-js vjs-16-9" controls preload="none"
                        data-setup="{}" onplay="videoCompletion(this.id, {{ $lessonContent->id }})"
                        poster="{{ $lessonContent->video_preview ? asset(\App\Constants\Constant::WEBSITE_LESSON_CONTENT_VIDEO_PREVIEW . '/' . $lessonContent->video_preview) : asset('assets/tenant/image/static/default_video_preview.jpeg') }}">
                        <source
                          src="{{ asset(\App\Constants\Constant::WEBSITE_LESSON_CONTENT_VIDEO . '/' . $lessonContent->video_unique_name) }}"
                          type="video/mp4">
                      </video>
                    </div>
                  @break

                  @case('file')
                    <div class="download-box">
                      <h4>{{ $lessonContent->file_original_name }}</h4>
                      <form class="d-inline-block"
                        action="{{ route('customer.my_course.curriculum.download_file', [getParam(), 'id' => $lessonContent->id]) }}"
                        method="POST">
                        @csrf
                        <button type="submit"><span><i
                              class="fal fa-download"></i></span>{{ $keywords['download'] ?? __('Download') }}</button>
                      </form>
                    </div>
                  @break

                  @case('text')
                    <div class="content-box">
                      {!! replaceBaseUrl($lessonContent->text) !!}
                    </div>
                  @break

                  @case('code')
                    <div class="content-box text-left" dir="ltr">
                      <pre class="mb-0"><code>{{ $lessonContent->code }}</code></pre>
                    </div>
                  @break

                  @case('quiz')
                    <div class="quiz-content-box" id="quiz-content" data-content_id="{{ $lessonContent->id }}"
                      data-completion_status="{{ $lessonContent->completion_status }}">
                      <span class="span">{{ $keywords['quiz'] ?? __('Quiz') }}</span>

                      @foreach ($quizzes as $quiz)
                        <div class="quiz-box @if (!$loop->first) dis-none @endif">
                          <span>{{ $loop->iteration . '/' . count($quizzes) }}</span>
                          <h4>{{ $quiz->question }}</h4>
                          <input type="hidden" value="{{ $quiz->id }}" class="quiz-id">

                          <p class="mb-3 text-left" id="{{ 'quiz-status-' . $quiz->id }}"></p>

                          @php $answers = json_decode($quiz->answers); @endphp

                          <div class="quiz-option">
                            <ul>
                              @foreach ($answers as $answer)
                                <li class="quiz-answer {{ 'quiz-option-' . $quiz->id }}" data-ans="{{ $answer->option }}">
                                  {{ $answer->option }}</li>
                              @endforeach
                            </ul>
                          </div>
                        </div>
                      @endforeach

                      <div id="quiz-complete" class="dis-none mt-3">
                        <div id="quiz-complete-icon">
                          <i class="fas fa-check-circle text-success"></i>
                        </div>
                        <p>{{ $keywords['you_scored'] ?? __('You scored') }} <span
                            id="correct-ans-count"></span>/{{ count($quizzes) }} (<span id="result-percentage"></span>%)</p>
                        <a
                          href="{{ url()->current() . '?lesson_id=' . request()->input('lesson_id') . '&quiz=retake' }}">{{ $keywords['retake_quiz'] ?? __('Retake Quiz') }}</a>
                      </div>
                      <button class="btn btn-sm btn-info dis-none"
                        id="check-btn">{{ $keywords['check'] ?? __('Check') }}</button>
                      <button class="btn btn-sm btn-primary dis-none"
                        id="next-btn">{{ $keywords['next'] ?? __('Next') }}</button>
                    </div>
                  @break

                  @default
                @endswitch
              @endforeach
            @endif
          </div>

          <a id="scroll-to-quiz" href="#quiz-content"></a>
        </div>
      </div>
    </div>
  </section>
  <!--====== CURRICULUM PART END ======-->
@endsection

@section('scripts')
  <script>
    "use strict";
    const checkAnsUrl = "{{ route('customer.my_course.curriculum.check_ans', getParam()) }}";
    const quizStatus = "{{ request()->input('quiz') }}";
    const numOfQuiz = {{ !empty($quizzes) ? count($quizzes) : 0 }};
    const courseId = {{ request()->route('id') }};
    const lessonId = {{ request()->input('lesson_id') }};
    const quizScoreUrl = "{{ route('customer.my_course.curriculum.store_quiz_score', getParam()) }}";
    const contentCompletionUrl = "{{ route('customer.my_course.curriculum.content_completion', getParam()) }}";
    const certificateStatus = {{ $certificateStatus }};

    //===== course navigation
    $('.course-nav-btn').on('click', function(event) {
      $('.course-videos-sidebar').slideToggle((300));
    });
  </script>

  {{-- highlight js --}}
  <script type="text/javascript" src="{{ asset('assets/tenant/js/highlight.pack.js') }}"></script>
  <script type="text/javascript" src="{{ asset('assets/tenant/js/lesson/lesson-content.js') }}"></script>
@endsection
