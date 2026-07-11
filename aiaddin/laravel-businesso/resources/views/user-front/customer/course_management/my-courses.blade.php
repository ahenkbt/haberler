@extends('user-front.layout')

{{-- @section('pageHeading')
    {{ $keywords['my_courses'] ?? __('My Courses') }}
@endsection --}}

@section('tab-title')
  {{ $keywords['my_courses'] ?? __('My Courses') }}
@endsection

@section('page-name')
  {{ $keywords['my_courses'] ?? __('My Courses') }}
@endsection
@section('br-name')
  {{ $keywords['my_courses'] ?? __('My Courses') }}
@endsection


@section('content')


  <!-- Start User Enrolled Course Section -->
  <section class="user-dashbord pt-100 pb-60">
    <div class="container">
      <div class="row">
        @includeIf('user-front.customer.side-navbar')

        <div class="col-lg-9">
          <div class="row">
            <div class="col-lg-12">
              <div class="account-info">
                <div class="title">
                  <h4>{{ $keywords['all_courses'] ?? __('All Courses') }}</h4>
                </div>

                <div class="main-info">
                  <div class="main-table">
                    @if (count($enrolments) == 0)
                      <h5 class="text-center mt-3">
                        {{ $keywords['no_course_found'] ?? __('No Course Found') . '!' }}</h5>
                    @else
                      <div class="table-responsive">
                        <table id="erolled-course-table" class="table table-striped table-bordered" style="width:100%">
                          <thead>
                            <tr>
                              <th>{{ $keywords['course'] ?? __('Course') }}</th>
                              <th>{{ $keywords['duration'] ?? __('Duration') }}</th>
                              <th>{{ $keywords['price'] ?? __('Price') }}</th>
                              <th>{{ $keywords['Actions'] ?? __('Action') }}</th>
                            </tr>
                          </thead>
                          <tbody>
                            @foreach ($enrolments as $enrolment)
                              @if (!empty($enrolment->slug))
                                <tr>
                                  <td width="35%">
                                    <a target="_blank"
                                      href="{{ route('front.user.course.details', [getParam(), 'slug' => $enrolment->slug]) }}">
                                      @if (strlen($enrolment->title > 30))
                                        {{ mb_substr($enrolment->title, 0, 30, 'UTF-8') . '...' }}
                                      @else
                                        {{ $enrolment->title }}
                                      @endif
                                    </a>
                                  </td>

                                  @php
                                    $period = $enrolment->course->duration;
                                    $array = explode(':', $period);
                                    $hour = $array[0];
                                    $courseDuration = \Carbon\Carbon::parse($period);
                                  @endphp

                                  <td>{{ $hour == '00' ? '00' : $courseDuration->format('h') }}h
                                    {{ $courseDuration->format('i') }}m</td>
                                  <td>
                                    @if (!is_null($enrolment->course_price))
                                      {{ $enrolment->currency_symbol_position == 'left' ? $enrolment->currency_symbol : '' }}{{ $enrolment->course_price }}{{ $enrolment->currency_symbol_position == 'right' ? $enrolment->currency_symbol : '' }}
                                    @else
                                      {{ $keywords['Free'] ?? __('Free') }}
                                    @endif
                                  </td>

                                  <td><a
                                      href="{{ route('customer.my_course.curriculum', [getParam(), 'id' => $enrolment->course_id, 'lesson_id' => $enrolment->lesson_id]) }}"
                                      class="btn">{{ $keywords['curriculum'] ?? __('Curriculum') }}</a>
                                  </td>
                                </tr>
                              @endif
                            @endforeach
                          </tbody>
                        </table>
                      </div>
                    @endif
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <!-- End User Enrolled Course Section -->
@endsection
@section('scripts')
  <script>
    //===== initialize bootstrap dataTable
    $('#erolled-course-table').DataTable({
      ordering: false,
      responsive: true
    });
  </script>
@endsection
