@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Job_Details'] ?? 'Job Details' }}
@endsection

@section('og-meta')

  @if (isset($userBs->logo))
    <meta property="og:image" content="{{ asset('assets/front/img/user/' . $userBs->logo) }}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1024">
    <meta property="og:image:height" content="1024">
  @endif

@endsection

@section('meta-description', $job->meta_description)
@section('meta-keywords', $job->meta_keywords)

@section('page-name')
  {{ $job->title }}
@endsection
@section('br-name')
  {{ $keywords['Job_Details'] ?? 'Job Details' }}
@endsection

@section('content')
  @php
    $status = explode(',', $job->employment_status);
  @endphp
  <section class="job-details-section inner-section-gap">
    <div class="container">
      <div class="row">
        <div class="col-lg-8">
          <div class="job-details-wrapper">
            <div class="job-details">
              <h3 class="title">{{ $job->title }}</h3>
              <div class="info">
                <strong class="label">{{ $keywords['Vacancy'] ?? 'Vacancy' }}</strong>
                <div class="desc text-dark">{{ $job->vacancy < 10 ? '0' . $job->vacancy : $job->vacancy }}
                </div>
              </div>
              @if (!empty($job->job_responsibilities))
                <div class="info">
                  <strong class="label">{{ $keywords['Job_Responsibilities'] ?? 'Job Responsibilities' }}</strong>
                  <div class="desc summernote-content">
                    {!! replaceBaseUrl($job->job_responsibilities) !!}
                  </div>
                </div>
              @endif
              <div class="info">
                <strong class="label">{{ $keywords['Employment_Status'] ?? 'Employment Status' }}</strong>
                @foreach ($status as $st)
                  <div class="desc text-dark">{{ $st }}</div>
                @endforeach
              </div>
              @if (!empty($job->educational_requirements))
                <div class="info">
                  <strong
                    class="label">{{ $keywords['Educational_Requirements'] ?? 'Educational Requirements' }}</strong>
                  <div class="desc summernote-content">
                    {!! replaceBaseUrl($job->educational_requirements) !!}
                  </div>
                </div>
              @endif
              @if (!empty($job->experience_requirements))
                <div class="info">
                  <strong class="label">{{ $keywords['Experience_Requirements'] ?? 'Experience Requirements' }}</strong>
                  <div class="desc summernote-content">
                    {!! replaceBaseUrl($job->experience_requirements) !!}
                  </div>
                </div>
              @endif
              @if (!empty($job->additional_requirements))
                <div class="info">
                  <strong class="label">{{ $keywords['Additional_Requirements'] ?? 'Additional Requirements' }}</strong>
                  <div class="desc summernote-content">
                    {!! replaceBaseUrl($job->additional_requirements) !!}
                  </div>
                </div>
              @endif
              <div class="info">
                <strong class="label">{{ $keywords['Job_Location'] ?? 'Job Location' }}</strong>
                <div class="desc text-dark">
                  {{ $job->job_location }}
                </div>
              </div>
              <div class="info">
                <strong class="label">{{ $keywords['Salary'] ?? 'Salary' }}</strong>
                <div class="desc summernote-content">
                  {!! replaceBaseUrl($job->salary) !!}
                </div>
              </div>
              @if (!empty($job->benefits))
                <div class="info">
                  <strong
                    class="label">{{ $keywords['Compensation_&_Other_Benefits'] ?? 'Compensation & Other Benefits' }}</strong>
                  <div class="desc summernote-content">
                    {!! replaceBaseUrl($job->benefits) !!}
                  </div>
                </div>
              @endif
              @if (!empty($job->read_before_apply))
                <div class="info">
                  <strong class="label">{{ $keywords['Read_Before_Apply'] ?? 'Read Before Apply' }}</strong>
                  <div class="desc summernote-content">
                    {!! replaceBaseUrl($job->read_before_apply) !!}
                  </div>
                </div>
              @endif
              <div class="info">
                <strong class="label">{{ $keywords['Email_Address'] ?? 'Email Address' }}</strong>
                <div class="desc">
                  {{ $keywords['Send_your_CV_to'] ?? 'Send your CV to' }} <strong
                    class="color-primary">{{ $job->email }}</strong>
                </div>
              </div>
            </div>
            <div class="post-footer d-md-flex align-items-md-center justify-content-md-between">
              <div class="post-share">
                <ul class="d-flex align-items-center">
                  <li class="title mr-2">{{ $keywords['Share'] ?? 'Share' }}</li>
                  <li><a href="//www.facebook.com/sharer/sharer.php?u={{ urlencode(url()->current()) }}"><i
                        class="fab fa-facebook-f mr-2"></i></a></li>
                  <li><a
                      href="//twitter.com/intent/tweet?text=my share text&amp;url={{ urlencode(url()->current()) }}"><i
                        class="fab fa-twitter mr-2"></i></a></li>
                  <li><a
                      href="//www.linkedin.com/shareArticle?mini=true&amp;url={{ urlencode(url()->current()) }}&amp;title={{ convertUtf8($job->title) }}"><i
                        class="fab fa-linkedin-in mr-2"></i></a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <!-- sidebar -->
          <div class="sidebar">
            <!-- Search Widget -->
            <div class="widget search-widget">
              <form action="{{ route('front.user.jobs', getParam()) }}" method="GET">
                <input type="hidden" name="category" value="{{ request()->input('category') }}">
                <input type="text" placeholder="{{ $keywords['Search_your_keyword'] ?? 'Search your keyword' }}..."
                  name="term" value="{{ request()->input('term') }}">
                <button type="submit"><i class="far fa-search"></i></button>
              </form>
            </div>
            <!-- Cat Widget -->
            <div class="widget cat-widget">
              <h4 class="widget-title">{{ $keywords['Categories'] ?? 'Categories' }}</h4>
              <ul>
                <li class="@if (empty(request()->input('category'))) active @endif"><a
                    href="{{ route('front.user.jobs', getParam()) }}">{{ $keywords['All'] ?? 'All' }}
                    <span>({{ $allCount }})</span></a></li>
                @foreach ($job_categories as $bc)
                  <li class="@if ($bc->id == request()->input('category')) active @endif">
                    <a href="{{ route('front.user.jobs', getParam()) . '?category=' . $bc->id }}">{{ $bc->name }}
                      <span>({{ $bc->jobs()->count() }})</span>
                    </a>
                  </li>
                @endforeach
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
@endsection
