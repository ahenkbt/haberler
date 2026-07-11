@extends('user.layout')
@php
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::id()],
      ['is_default', 1],
  ])->first();
  $userLanguages = \App\Models\User\Language::where('user_id', \Illuminate\Support\Facades\Auth::id())->get();
  $permissions = \App\Http\Helpers\UserPermissionHelper::packagePermission(Auth::id());
  $permissions = json_decode($permissions, true);
@endphp

@includeIf('user.partials.rtl-style')

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Section_Customization') }}</h4>
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
        <a href="#">{{ __('Home_Page') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Section_Customization') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <form class="" action="{{ route('user.sections.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Customize_Sections') }}</div>
              </div>
            </div>
          </div>
          <div class="card-body pt-5 pb-5">
            <div class="row">
              <div class="col-lg-6 offset-lg-3">
                @csrf
                @if ($userBs->theme == 'home_thirteen')
                  <div class="form-group">
                    <label>{{ __('Slider Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="slider_posts" value="1" class="selectgroup-input"
                          {{ isset($sections->slider_posts) && $sections->slider_posts == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="slider_posts" value="0" class="selectgroup-input"
                          {{ !isset($sections->slider_posts) || $sections->slider_posts == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (
                    $userBs->theme == 'home_six' ||
                        $userBs->theme == 'home_one' ||
                        $userBs->theme == 'home_two' ||
                        $userBs->theme == 'home_nine' ||
                        $userBs->theme == 'home_eleven' ||
                        $userBs->theme == 'home_twelve' ||
                        $userBs->theme == 'home_thirteen' ||
                        $userBs->theme == 'home_three')
                  <div class="form-group">
                    <label>{{ __('About_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="intro_section" value="1" class="selectgroup-input"
                          {{ isset($sections->intro_section) && $sections->intro_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="intro_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->intro_section) || $sections->intro_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif

                @if (!empty($permissions) && in_array('Hotel Booking', $permissions) && $userBs->theme == 'home_nine')
                  <div class="form-group">
                    <label>{{ __('Featured_Rooms_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="rooms_section" value="1" class="selectgroup-input"
                          {{ isset($sections->rooms_section) && $sections->rooms_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="rooms_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->rooms_section) || $sections->rooms_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (
                    !empty($permissions) &&
                        in_array('Portfolio', $permissions) &&
                        ($userBs->theme == 'home_one' ||
                            $userBs->theme == 'home_two' ||
                            $userBs->theme == 'home_four' ||
                            $userBs->theme == 'home_five' ||
                            $userBs->theme == 'home_six' ||
                            $userBs->theme == 'home_seven' ||
                            $userBs->theme == 'home_twelve' ||
                            $userBs->theme == 'home_three'))
                  <div class="form-group">
                    <label>{{ __('Portfolio_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="portfolio_section" value="1" class="selectgroup-input"
                          {{ isset($sections->portfolio_section) && $sections->portfolio_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="portfolio_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->portfolio_section) || $sections->portfolio_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (
                    !empty($permissions) &&
                        in_array('Service', $permissions) &&
                        ($userBs->theme == 'home_one' ||
                            $userBs->theme == 'home_two' ||
                            $userBs->theme == 'home_three' ||
                            $userBs->theme == 'home_four' ||
                            $userBs->theme == 'home_five' ||
                            $userBs->theme == 'home_six' ||
                            $userBs->theme == 'home_nine' ||
                            $userBs->theme == 'home_twelve' ||
                            $userBs->theme == 'home_seven'))
                  <div class="form-group">
                    <label>{{ __('Featured_Services_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_services_section" value="1" class="selectgroup-input"
                          {{ isset($sections->featured_services_section) && $sections->featured_services_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_services_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->featured_services_section) || $sections->featured_services_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif

                @if ($userBs->theme == 'home_one' || $userBs->theme == 'home_three' || $userBs->theme == 'home_nine')
                  <div class="form-group">
                    <label>{{ __('Why_Choose_Us_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="why_choose_us_section" value="1" class="selectgroup-input"
                          {{ isset($sections->why_choose_us_section) && $sections->why_choose_us_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="why_choose_us_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->why_choose_us_section) || $sections->why_choose_us_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (!empty($permissions) && in_array('Portfolio', $permissions) && $userBs->theme == 'home_twelve')
                  <div class="form-group">
                    <label>{{ __('Job_and_Education_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="job_education_section" value="1" class="selectgroup-input"
                          {{ isset($sections->job_education_section) && $sections->job_education_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="job_education_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->job_education_section) || $sections->job_education_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (
                    $userBs->theme == 'home_one' ||
                        $userBs->theme == 'home_two' ||
                        $userBs->theme == 'home_four' ||
                        $userBs->theme == 'home_five' ||
                        $userBs->theme == 'home_six' ||
                        $userBs->theme == 'home_seven' ||
                        $userBs->theme == 'home_nine' ||
                        $userBs->theme == 'home_ten' ||
                        $userBs->theme == 'home_eleven' ||
                        $userBs->theme == 'home_twelve' ||
                        $userBs->theme == 'home_three')
                  @if (!empty($permissions) && in_array('Counter Information', $permissions))
                    <div class="form-group">
                      <label>{{ __('Counter_Info_Section') }} **</label>
                      <div class="selectgroup w-100">
                        <label class="selectgroup-item">
                          <input type="radio" name="counter_info_section" value="1" class="selectgroup-input"
                            {{ isset($sections->counter_info_section) && $sections->counter_info_section == 1 ? 'checked' : '' }}>
                          <span class="selectgroup-button">{{ __('Active') }}</span>
                        </label>
                        <label class="selectgroup-item">
                          <input type="radio" name="counter_info_section" value="0" class="selectgroup-input"
                            {{ !isset($sections->counter_info_section) || $sections->counter_info_section == 0 ? 'checked' : '' }}>
                          <span class="selectgroup-button">{{ __('Deactive') }}</span>
                        </label>
                      </div>
                    </div>
                  @endif
                @endif

                @if (
                    $userBs->theme == 'home_one' ||
                        $userBs->theme == 'home_two' ||
                        $userBs->theme == 'home_four' ||
                        $userBs->theme == 'home_five' ||
                        $userBs->theme == 'home_nine' ||
                        $userBs->theme == 'home_ten' ||
                        $userBs->theme == 'home_seven')
                  <div class="form-group">
                    <label>{{ __('Video_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="video_section" value="1" class="selectgroup-input"
                          {{ isset($sections->video_section) && $sections->video_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="video_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->video_section) || $sections->video_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif



                @if (
                    $userBs->theme == 'home_one' ||
                        $userBs->theme == 'home_six' ||
                        $userBs->theme == 'home_seven' ||
                        $userBs->theme == 'home_three')
                  <div class="form-group">
                    <label>{{ __('Team_Members_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="team_members_section" value="1" class="selectgroup-input"
                          {{ isset($sections->team_members_section) && $sections->team_members_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="team_members_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->team_members_section) || $sections->team_members_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif

                @if (
                    !empty($permissions) &&
                        in_array('Skill', $permissions) &&
                        ($userBs->theme == 'home_one' || $userBs->theme == 'home_twelve'))
                  <div class="form-group">
                    <label>{{ __('Skills_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="skills_section" value="1" class="selectgroup-input"
                          {{ isset($sections->skills_section) && $sections->skills_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="skills_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->skills_section) || $sections->skills_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (
                    $userBs->theme == 'home_one' ||
                        $userBs->theme == 'home_two' ||
                        $userBs->theme == 'home_six' ||
                        $userBs->theme == 'home_seven' ||
                        $userBs->theme == 'home_nine' ||
                        $userBs->theme == 'home_ten' ||
                        $userBs->theme == 'home_eleven' ||
                        $userBs->theme == 'home_twelve' ||
                        $userBs->theme == 'home_three')
                  @if (!empty($permissions) && in_array('Testimonial', $permissions))
                    <div class="form-group">
                      <label>{{ __('Testimonial_Section') }} **</label>
                      <div class="selectgroup w-100">
                        <label class="selectgroup-item">
                          <input type="radio" name="testimonials_section" value="1" class="selectgroup-input"
                            {{ isset($sections->testimonials_section) && $sections->testimonials_section == 1 ? 'checked' : '' }}>
                          <span class="selectgroup-button">{{ __('Active') }}</span>
                        </label>
                        <label class="selectgroup-item">
                          <input type="radio" name="testimonials_section" value="0" class="selectgroup-input"
                            {{ !isset($sections->testimonials_section) || $sections->testimonials_section == 0 ? 'checked' : '' }}>
                          <span class="selectgroup-button">{{ __('Deactive') }}</span>
                        </label>
                      </div>
                    </div>
                  @endif
                @endif
                @if (
                    !empty($permissions) &&
                        in_array('Blog', $permissions) &&
                        ($userBs->theme == 'home_one' ||
                            $userBs->theme == 'home_two' ||
                            $userBs->theme == 'home_four' ||
                            $userBs->theme == 'home_five' ||
                            $userBs->theme == 'home_six' ||
                            $userBs->theme == 'home_eleven' ||
                            $userBs->theme == 'home_twelve' ||
                            $userBs->theme == 'home_seven'))
                  <div class="form-group">
                    <label>{{ __('Blog_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="blogs_section" value="1" class="selectgroup-input"
                          {{ isset($sections->blogs_section) && $sections->blogs_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="blogs_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->blogs_section) || $sections->blogs_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (isset($userBs->theme) &&
                        ($userBs->theme === 'home_three' ||
                            $userBs->theme === 'home_four' ||
                            $userBs->theme === 'home_five' ||
                            $userBs->theme === 'home_seven'))
                  <div class="form-group">
                    <label>{{ __('FAQ_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="faq_section" value="1" class="selectgroup-input"
                          {{ isset($sections->faq_section) && $sections->faq_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="faq_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->faq_section) || $sections->faq_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (isset($userBs->theme) &&
                        ($userBs->theme === 'home_three' ||
                            $userBs->theme === 'home_four' ||
                            $userBs->theme === 'home_five' ||
                            $userBs->theme === 'home_six' ||
                            $userBs->theme === 'home_twelve' ||
                            $userBs->theme === 'home_seven'))
                  <div class="form-group">
                    <label>{{ __('Contact_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="contact_section" value="1" class="selectgroup-input"
                          {{ isset($sections->contact_section) && $sections->contact_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="contact_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->contact_section) || $sections->contact_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (isset($userBs->theme) &&
                        ($userBs->theme === 'home_three' ||
                            $userBs->theme === 'home_two' ||
                            $userBs->theme === 'home_seven' ||
                            $userBs->theme === 'home_four' ||
                            $userBs->theme === 'home_five' ||
                            $userBs->theme === 'home_two' ||
                            $userBs->theme === 'home_six'))
                  <div class="form-group">
                    <label>{{ __('Work_Process_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="work_process_section" value="1" class="selectgroup-input"
                          {{ isset($sections->work_process_section) && $sections->work_process_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="work_process_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->work_process_section) || $sections->work_process_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (
                    $userBs->theme == 'home_one' ||
                        $userBs->theme == 'home_two' ||
                        $userBs->theme == 'home_six' ||
                        $userBs->theme == 'home_eight' ||
                        $userBs->theme == 'home_nine' ||
                        $userBs->theme == 'home_eleven' ||
                        $userBs->theme == 'home_three')
                  <div class="form-group">
                    @if ($userBs->theme == 'home_eleven')
                      <label>{{ __('Donor_Section') }} **</label>
                    @else
                      <label>{{ __('Brands_Section') }} **</label>
                    @endif
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="brand_section" value="1" class="selectgroup-input"
                          {{ isset($sections->brand_section) && $sections->brand_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="brand_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->brand_section) || $sections->brand_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (
                    $userBs->theme == 'home_one' ||
                        $userBs->theme == 'home_two' ||
                        $userBs->theme == 'home_three' ||
                        $userBs->theme == 'home_four' ||
                        $userBs->theme == 'home_five' ||
                        $userBs->theme == 'home_six' ||
                        $userBs->theme == 'home_seven' ||
                        $userBs->theme == 'home_thirteen')
                  <div class="form-group">
                    <label>{{ __('Top_Footer_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="top_footer_section" value="1" class="selectgroup-input"
                          {{ isset($sections->top_footer_section) && $sections->top_footer_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="top_footer_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->top_footer_section) || $sections->top_footer_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (
                    $userBs->theme == 'home_six' ||
                        $userBs->theme == 'home_three' ||
                        $userBs->theme == 'home_eight' ||
                        $userBs->theme == 'home_ten' ||
                        $userBs->theme == 'home_eleven')
                  <div class="form-group">
                    <label>{{ __('Newsletter_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="newsletter_section" value="1" class="selectgroup-input"
                          {{ isset($sections->newsletter_section) && $sections->newsletter_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="newsletter_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->newsletter_section) || $sections->newsletter_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (
                    $userBs->theme == 'home_eight' ||
                        $userBs->theme == 'home_ten' ||
                        $userBs->theme == 'home_eleven' ||
                        $userBs->theme == 'home_thirteen')
                  <div class="form-group">
                    <label>{{ __('Category_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="category_section" value="1" class="selectgroup-input"
                          {{ isset($sections->category_section) && $sections->category_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="category_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->category_section) || $sections->category_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if ($userBs->theme == 'home_ten')
                  <div class="form-group">
                    <label>{{ __('Call_To_Action_Section_Status') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="call_to_action_section_status" value="1"
                          class="selectgroup-input"
                          {{ isset($sections->call_to_action_section_status) && $sections->call_to_action_section_status == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="call_to_action_section_status" value="0"
                          class="selectgroup-input"
                          {{ !isset($sections->call_to_action_section_status) || $sections->call_to_action_section_status == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                  @if (!empty($permissions) && in_array('Course Management', $permissions))
                    <div class="form-group">
                      <label>{{ __('Featured_Course_Section') }} **</label>
                      <div class="selectgroup w-100">
                        <label class="selectgroup-item">
                          <input type="radio" name="featured_courses_section_status" value="1"
                            class="selectgroup-input"
                            {{ isset($sections->featured_courses_section_status) && $sections->featured_courses_section_status == 1 ? 'checked' : '' }}>
                          <span class="selectgroup-button">{{ __('Active') }}</span>
                        </label>
                        <label class="selectgroup-item">
                          <input type="radio" name="featured_courses_section_status" value="0"
                            class="selectgroup-input"
                            {{ !isset($sections->featured_courses_section_status) || $sections->featured_courses_section_status == 0 ? 'checked' : '' }}>
                          <span class="selectgroup-button">{{ __('Deactive') }}</span>
                        </label>
                      </div>
                    </div>
                  @endif
                @endif
                @if ($userBs->theme == 'home_eight')
                  <div class="form-group">
                    <label>{{ __('Slider_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="slider_section" value="1" class="selectgroup-input"
                          {{ isset($sections->slider_section) && $sections->slider_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="slider_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->slider_section) || $sections->slider_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (
                    $userBs->theme == 'home_eight' ||
                        $userBs->theme == 'home_ten' ||
                        $userBs->theme == 'home_eleven' ||
                        $userBs->theme == 'home_thirteen')
                  <div class="form-group">
                    <label>{{ __('Features_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_section" value="1" class="selectgroup-input"
                          {{ isset($sections->featured_section) && $sections->featured_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->featured_section) || $sections->featured_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif

                @if ($userBs->theme == 'home_thirteen')
                  <div class="form-group">
                    <label>{{ __('Latest Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="latest_posts" value="1" class="selectgroup-input"
                          {{ isset($sections->latest_posts) && $sections->latest_posts == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="latest_posts" value="0" class="selectgroup-input"
                          {{ !isset($sections->latest_posts) || $sections->latest_posts == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>{{ __('Popular Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="popular_posts" value="1" class="selectgroup-input"
                          {{ isset($sections->popular_posts) && $sections->popular_posts == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="popular_posts" value="0" class="selectgroup-input"
                          {{ !isset($sections->popular_posts) || $sections->popular_posts == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>{{ __('Newsletter Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="newsletter" value="1" class="selectgroup-input"
                          {{ isset($sections->newsletter) && $sections->newsletter == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="newsletter" value="0" class="selectgroup-input"
                          {{ !isset($sections->newsletter) || $sections->newsletter == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>{{ __('Gallery Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="gallery" value="1" class="selectgroup-input"
                          {{ isset($sections->gallery) && $sections->gallery == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="gallery" value="0" class="selectgroup-input"
                          {{ !isset($sections->gallery) || $sections->gallery == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>{{ __('Featured Category Blog Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_category_posts" value="1" class="selectgroup-input"
                          {{ isset($sections->featured_category_posts) && $sections->featured_category_posts == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_category_posts" value="0" class="selectgroup-input"
                          {{ !isset($sections->featured_category_posts) || $sections->featured_category_posts == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if ($userBs->theme == 'home_fourteen')
                  <div class="form-group">
                    <label>{{ __('Features_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_section" value="1" class="selectgroup-input"
                          {{ isset($sections->featured_section) && $sections->featured_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->featured_section) || $sections->featured_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>{{ __('Flash_Sale_Items_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="flashsale_item_section" value="1" class="selectgroup-input"
                          {{ isset($sections->flashsale_item_section) && $sections->flashsale_item_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="flashsale_item_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->flashsale_item_section) || $sections->flashsale_item_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>{{ __('Offer_Banner_Section_(_Top_)') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="offer_banner_section" value="1" class="selectgroup-input"
                          {{ isset($sections->offer_banner_section) && $sections->offer_banner_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="offer_banner_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->offer_banner_section) || $sections->offer_banner_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>{{ __('Featured Categories Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_category_section" value="1"
                          class="selectgroup-input"
                          {{ isset($sections->featured_category_section) && $sections->featured_category_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_category_section" value="0"
                          class="selectgroup-input"
                          {{ !isset($sections->featured_category_section) || $sections->featured_category_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>


                  <div class="form-group">
                    <label>{{ __('Feature_Items_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_item_section" value="1" class="selectgroup-input"
                          {{ isset($sections->featured_item_section) && $sections->featured_item_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_item_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->featured_item_section) || $sections->featured_item_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>{{ __('Featured Category Items Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_category_item" value="1" class="selectgroup-input"
                          {{ isset($sections->featured_category_item) && $sections->featured_category_item == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_category_item" value="0" class="selectgroup-input"
                          {{ !isset($sections->featured_category_item) || $sections->featured_category_item == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>{{ __('Top_Rated_Items_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="toprated_item_section" value="1" class="selectgroup-input"
                          {{ isset($sections->toprated_item_section) && $sections->toprated_item_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="toprated_item_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->toprated_item_section) || $sections->toprated_item_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>{{ __('Offer_Banner_Section_(_Bottom_)') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="bottom_offer_banner_section" value="1"
                          class="selectgroup-input"
                          {{ isset($sections->bottom_offer_banner_section) && $sections->bottom_offer_banner_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="bottom_offer_banner_section" value="0"
                          class="selectgroup-input"
                          {{ !isset($sections->bottom_offer_banner_section) || $sections->bottom_offer_banner_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>


                  <div class="form-group">
                    <label>{{ __('On Sale Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="on_sale_section" value="1" class="selectgroup-input"
                          {{ isset($sections->on_sale_section) && $sections->on_sale_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="on_sale_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->on_sale_section) || $sections->on_sale_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>{{ __('Top_Footer_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="top_footer_section" value="1" class="selectgroup-input"
                          {{ isset($sections->top_footer_section) && $sections->top_footer_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="top_footer_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->top_footer_section) || $sections->top_footer_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif

                @if (!empty($permissions) && in_array('Donation Management', $permissions) && $userBs->theme == 'home_eleven')
                  <div class="form-group">
                    <label>{{ __('Causes_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="causes_section" value="1" class="selectgroup-input"
                          {{ isset($sections->causes_section) && $sections->causes_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="causes_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->causes_section) || $sections->causes_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if ($userBs->theme == 'home_eight')
                  <div class="form-group">
                    <label>{{ __('Offer_Banner_Section_(_Top_)') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="offer_banner_section" value="1" class="selectgroup-input"
                          {{ isset($sections->offer_banner_section) && $sections->offer_banner_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="offer_banner_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->offer_banner_section) || $sections->offer_banner_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if ($userBs->theme == 'home_eight')
                  <div class="form-group">
                    <label>{{ __('Offer_Banner_Section_(_Left_)') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="left_offer_banner_section" value="1"
                          class="selectgroup-input"
                          {{ isset($sections->left_offer_banner_section) && $sections->left_offer_banner_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="left_offer_banner_section" value="0"
                          class="selectgroup-input"
                          {{ !isset($sections->left_offer_banner_section) || $sections->left_offer_banner_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if ($userBs->theme == 'home_eight')
                  <div class="form-group">
                    <label>{{ __('Offer_Banner_Section_(_Bottom_)') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="bottom_offer_banner_section" value="1"
                          class="selectgroup-input"
                          {{ isset($sections->bottom_offer_banner_section) && $sections->bottom_offer_banner_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="bottom_offer_banner_section" value="0"
                          class="selectgroup-input"
                          {{ !isset($sections->bottom_offer_banner_section) || $sections->bottom_offer_banner_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (!empty($permissions) && in_array('Ecommerce', $permissions) && $userBs->theme == 'home_eight')
                  <div class="form-group">
                    <label>{{ __('Feature_Items_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_item_section" value="1" class="selectgroup-input"
                          {{ isset($sections->featured_item_section) && $sections->featured_item_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="featured_item_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->featured_item_section) || $sections->featured_item_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (!empty($permissions) && in_array('Ecommerce', $permissions) && $userBs->theme == 'home_eight')
                  <div class="form-group">
                    <label>{{ __('New_Items_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="new_item_section" value="1" class="selectgroup-input"
                          {{ isset($sections->new_item_section) && $sections->new_item_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="new_item_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->new_item_section) || $sections->new_item_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (!empty($permissions) && in_array('Ecommerce', $permissions) && $userBs->theme == 'home_eight')
                  <div class="form-group">
                    <label>{{ __('Top_Rated_Items_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="toprated_item_section" value="1" class="selectgroup-input"
                          {{ isset($sections->toprated_item_section) && $sections->toprated_item_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="toprated_item_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->toprated_item_section) || $sections->toprated_item_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (!empty($permissions) && in_array('Ecommerce', $permissions) && $userBs->theme == 'home_eight')
                  <div class="form-group">
                    <label>{{ __('Best_Seller_Items_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="bestseller_item_section" value="1" class="selectgroup-input"
                          {{ isset($sections->bestseller_item_section) && $sections->bestseller_item_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="bestseller_item_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->bestseller_item_section) || $sections->bestseller_item_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (!empty($permissions) && in_array('Ecommerce', $permissions) && $userBs->theme == 'home_eight')
                  <div class="form-group">
                    <label>{{ __('Special_Items_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="special_item_section" value="1" class="selectgroup-input"
                          {{ isset($sections->special_item_section) && $sections->special_item_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="special_item_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->special_item_section) || $sections->special_item_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                @if (!empty($permissions) && in_array('Ecommerce', $permissions) && $userBs->theme == 'home_eight')
                  <div class="form-group">
                    <label>{{ __('Flash_Sale_Items_Section') }} **</label>
                    <div class="selectgroup w-100">
                      <label class="selectgroup-item">
                        <input type="radio" name="flashsale_item_section" value="1" class="selectgroup-input"
                          {{ isset($sections->flashsale_item_section) && $sections->flashsale_item_section == 1 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Active') }}</span>
                      </label>
                      <label class="selectgroup-item">
                        <input type="radio" name="flashsale_item_section" value="0" class="selectgroup-input"
                          {{ !isset($sections->flashsale_item_section) || $sections->flashsale_item_section == 0 ? 'checked' : '' }}>
                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                      </label>
                    </div>
                  </div>
                @endif
                <div class="form-group">
                  <label>{{ __('Copyright_Section') }} **</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="copyright_section" value="1" class="selectgroup-input"
                        {{ isset($sections->copyright_section) && $sections->copyright_section == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="copyright_section" value="0" class="selectgroup-input"
                        {{ !isset($sections->copyright_section) || $sections->copyright_section == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-12 text-center">
                  <button type="submit" id="displayNotif" class="btn btn-success">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
@endsection
