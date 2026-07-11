@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Career'] ?? 'Career' }}
@endsection

@section('meta-description', !empty($userSeo) ? $userSeo->jobs_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->jobs_meta_keywords : '')

@section('page-name')
  {{ $keywords['Career'] ?? 'Career' }}
@endsection
@section('br-name')
  {{ $keywords['Career'] ?? 'Career' }}
@endsection

@section('content')
  <!--====== Job Part Start ======-->
  <section class="job-list-area-section section-gap">
    <div class="container">
      <div class="row">
        <div class="col-lg-8">
          <div class="job-list-wrapper">
            <div class="row">
              @foreach ($jobs as $job)
                <div class="col-lg-12">
                  <a class="single-job d-block"
                    href="{{ route('front.user.job.detail', [getParam(), $job->slug, $job->id]) }}">
                    <h3>{{ $job->title }}</h3>
                    <p class="deadline">
                      <strong>
                        <i class="far fa-calendar-alt"></i>
                        {{ $keywords['Deadline'] ?? 'Deadline' }}:
                      </strong>
                      {{ \Carbon\Carbon::parse($job->deadline)->toFormattedDateString() }}
                    </p>
                    @if (!empty($job->educational_requirements))
                      <p class="education">
                        <strong>
                          <i class="fas fa-graduation-cap"></i>
                          {{ $keywords['Educational_Experience'] ?? 'Educational Experience' }}:
                        </strong>
                        {!! strlen(strip_tags($job->educational_requirements)) > 200
                            ? mb_substr(strip_tags($job->educational_requirements), 0, 200, 'UTF-8') . '...'
                            : strip_tags($job->educational_requirements) !!}
                      </p>
                    @endif
                    <p class="experience">
                      <strong>
                        <i class="fas fa-briefcase"></i>
                        {{ $keywords['Work_Experience'] ?? 'Work Experience' }}:
                      </strong>
                      <span>
                        {{ $job->experience }}
                        @if ($job->experience > 1)
                          {{ $keywords['years'] ?? 'years' }}
                        @else
                          {{ $keywords['year'] ?? 'year' }}
                        @endif
                      </span>
                    </p>
                  </a>
                </div>
              @endforeach
            </div>
            <!-- Pagination -->
            <div>
              {{ $jobs->appends(['term' => request()->input('term'), 'category' => request()->input('category')])->links() }}
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
