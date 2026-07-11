@extends('user.layout')

@php
  $userLanguages = \App\Models\User\Language::where('user_id', \Illuminate\Support\Facades\Auth::id())->get();
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::id()],
      ['is_default', 1],
  ])->first();
@endphp
@includeIf('user.partials.rtl-style')
@php
  $permissions = \App\Http\Helpers\UserPermissionHelper::packagePermission(Auth::user()->id);
  $permissions = json_decode($permissions, true);
@endphp

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Home_Sections') }}</h4>
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
        <a href="#">{{ __('Home_Sections') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-10">
              <div class="card-title d-inline-block">{{ __('Home_Sections') }}
              </div>
            </div>
            <div class="col-lg-2">
              @includeIf('user.partials.languages')
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-8 offset-lg-2">
              <form id="ajaxForm" action="{{ route('user.home.page.text.update') }}" method="post"
                enctype="multipart/form-data">
                @csrf
                <input type="hidden" name="id" value="{{ $home_setting->id }}">
                <input type="hidden" name="language_id" value="{{ $home_setting->language_id }}">

                @if (
                    ($userBs->theme == 'home_one' && (!empty($permissions) && in_array('Skill', $permissions))) ||
                        $userBs->theme == 'home_twelve')
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Skills_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Skills_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="skills_title">
                            <input type="text" class="form-control" name="skills_title"
                              placeholder="{{ __('Enter_skills_title') }}" value="{{ $home_setting->skills_title }}">
                            <p id="errskills_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pl-0">
                          <div class="form-group">
                            <label for="">{{ __('Skills_Section_Subtitle') }}</label>
                            <input type="hidden" name="types[]" value="skills_subtitle">
                            <input type="text" class="form-control" name="skills_subtitle"
                              placeholder="{{ __('Enter_skills_subtitle') }}"
                              value="{{ $home_setting->skills_subtitle }}">
                            <p id="errskills_subtitle" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                      <div class="form-group">
                        <label for="">{{ __('Skills_Section_Content') }}</label>
                        <input type="hidden" name="types[]" value="skills_content">
                        <textarea class="form-control" name="skills_content" rows="5" placeholder="">{{ $home_setting->skills_content }}</textarea>
                        <p id="errskills_content" class="mb-0 text-danger em"></p>
                      </div>
                      @if ($userBs->theme == 'home_twelve')
                        <div class="form-group">
                          <div class="col-12 mb-2">
                            <label for="logo"><strong>{{ __('Skill_Image') }}</strong></label>
                          </div>

                          <div class="col-md-12 showSkillImage mb-3">
                            <img
                              src="{{ $home_setting->skills_image ? asset('assets/front/img/user/home_settings/' . $home_setting->skills_image) : asset('assets/admin/img/noimage.jpg') }}"
                              alt="..." class="img-thumbnail">
                          </div>
                          <input type="file" name="skills_image" id="skillsImage" class="form-control ">
                          <p id="errskills_image" class="mb-0 text-danger em"></p>
                        </div>
                      @endif
                    </div>
                  </div>
                @endif
                @if ($userBs->theme == 'home_nine')
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Featuded_Rooms_Section') }}
                        </h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Rooms_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="rooms_section_title">
                            <input type="text" class="form-control" name="rooms_section_title"
                              placeholder="{{ __('Enter_title') }}" value="{{ $home_setting->rooms_section_title }}">
                            <p id="errrooms_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pl-0">
                          <div class="form-group">
                            <label for="">{{ __('Rooms_Section_Subtitle') }}</label>
                            <input type="hidden" name="types[]" value="rooms_section_subtitle">
                            <input type="text" class="form-control" name="rooms_section_subtitle"
                              placeholder="{{ __('Enter_subtitle') }}"
                              value="{{ $home_setting->rooms_section_subtitle }}">
                            <p id="errrooms_section_subtitle" class="mb-0 text-danger em"></p>
                          </div>
                        </div>

                        <div class="col-lg-12 ">
                          <div class="form-group">
                            <label for="">{{ __('Rooms_Section_Content') }}</label>
                            <input type="hidden" name="types[]" value="rooms_section_content">
                            <textarea name="rooms_section_content" id="" class="form-control" rows="4"
                              placeholder="{{ __('Enter_Content') }}">{{ $home_setting->rooms_section_content }}</textarea>
                            <p id="errrooms_section_content" class="mb-0 text-danger em">
                            </p>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                @endif
                @if (!empty($permissions) && in_array('Donation Management', $permissions) && $userBs->theme == 'home_eleven')
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Featuded_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Featured_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="featured_section_title">
                            <input type="text" class="form-control" name="featured_section_title"
                              placeholder="{{ __('Enter_featured_title') }}"
                              value="{{ $home_setting->featured_section_title }}">
                            <p id="errfeatured_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pl-0">
                          <div class="form-group">
                            <label for="">{{ __('Featured_Section_Subtitle') }}</label>
                            <input type="hidden" name="types[]" value="featured_section_subtitle">
                            <input type="text" class="form-control" name="featured_section_subtitle"
                              placeholder="{{ __('Enter_featured_subtitle') }}"
                              value="{{ $home_setting->featured_section_subtitle }}">
                            <p id="errfeatured_section_subtitle" class="mb-0 text-danger em">
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                @endif

                @if (!empty($permissions) && in_array('Course Management', $permissions) && $userBs->theme == 'home_ten')
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Featured_Course_Section') }}
                        </h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Featured_Course_Title') }}</label>
                            <input type="hidden" name="types[]" value="featured_course_section_title">
                            <input type="text" class="form-control" name="featured_course_section_title"
                              placeholder="{{ __('Enter_title') }}"
                              value="{{ $home_setting->featured_course_section_title }}">
                            <p id="errfeatured_course_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>

                      </div>
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
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Service_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Service_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="service_title">
                            <input type="text" class="form-control" name="service_title"
                              placeholder="{{ __('Enter_service_title') }}"
                              value="{{ $home_setting->service_title }}">
                            <p id="errservice_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pl-0">
                          <div class="form-group">
                            <label for="">{{ __('Service_Section_Subtitle') }}</label>
                            <input type="hidden" name="types[]" value="service_subtitle">
                            <input type="text" class="form-control" name="service_subtitle"
                              placeholder="{{ __('Enter_service_subtitle') }}"
                              value="{{ $home_setting->service_subtitle }}">
                            <p id="errservice_subtitle" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                @endif
                @if ($userBs->theme == 'home_twelve')
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Job_and_Education_Section') }}
                        </h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Job_and_Education_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="job_education_title">
                            <input type="text" class="form-control" name="job_education_title"
                              placeholder="{{ __('Enter_title') }}" value="{{ $home_setting->job_education_title }}">
                            <p id="errjob_education_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pl-0">
                          <div class="form-group">
                            <label for="">{{ __('Job_and_Education_Section_Subtitle') }}</label>
                            <input type="hidden" name="types[]" value="job_education_subtitle">
                            <input type="text" class="form-control" name="job_education_subtitle"
                              placeholder="{{ __('Enter_Subtitle') }}"
                              value="{{ $home_setting->job_education_subtitle }}">
                            <p id="errjob_education_subtitle" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                      @if (isset($userBs->theme) && ($userBs->theme === 'home_two' || $userBs->theme === 'home_three'))
                        <div class="row">
                          <div class="col-lg-6 pr-0">
                            <div class="form-group">
                              <label for="">{{ __('View_All_Portfolio_Text') }}</label>
                              <input type="hidden" name="types[]" value="view_all_portfolio_text">
                              <input type="text" class="form-control" name="view_all_portfolio_text"
                                placeholder="{{ __('Enter_view_all_portfolio_text') }}"
                                value="{{ $home_setting->view_all_portfolio_text }}">
                              <p id="errview_all_portfolio_text" class="mb-0 text-danger em">
                              </p>
                            </div>
                          </div>
                        </div>
                      @endif
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
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Portfolio_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Portfolio_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="portfolio_title">
                            <input type="text" class="form-control" name="portfolio_title"
                              placeholder="{{ __('Enter_portfolio_title') }}"
                              value="{{ $home_setting->portfolio_title }}">
                            <p id="errportfolio_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pl-0">
                          <div class="form-group">
                            <label for="">{{ __('Portfolio_Section_Subtitle') }}</label>
                            <input type="hidden" name="types[]" value="portfolio_subtitle">
                            <input type="text" class="form-control" name="portfolio_subtitle"
                              placeholder="{{ __('Enter_Portfolio_Subtitle') }}"
                              value="{{ $home_setting->portfolio_subtitle }}">
                            <p id="errportfolio_subtitle" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                      @if (isset($userBs->theme) && ($userBs->theme === 'home_two' || $userBs->theme === 'home_three'))
                        <div class="row">
                          <div class="col-lg-6 pr-0">
                            <div class="form-group">
                              <label for="">{{ __('View_All_Portfolio_Text') }}</label>
                              <input type="hidden" name="types[]" value="view_all_portfolio_text">
                              <input type="text" class="form-control" name="view_all_portfolio_text"
                                placeholder="{{ __('Enter_view_all_portfolio_text') }}"
                                value="{{ $home_setting->view_all_portfolio_text }}">
                              <p id="errview_all_portfolio_text" class="mb-0 text-danger em">
                              </p>
                            </div>
                          </div>
                        </div>
                      @endif
                    </div>
                  </div>
                @endif
                @if ($userBs->theme != 'home_fourteen' && $userBs->theme != 'home_thirteen')
                  @if (
                      $userBs->theme != 'home_eight' ||
                          ($userBs->theme != 'home_ten' && !empty($permissions) && in_array('Testimonial', $permissions)))
                    <div class="row">
                      <div class="col-12">
                        <div class="form-group">
                          <br>
                          <h3 class="text-warning">
                            {{ __('Testimonial_Section') }}
                          </h3>
                          <hr class="border-top">
                        </div>
                        @if ($userBs->theme == 'home_six' || $userBs->theme == 'home_one' || $userBs->theme == 'home_ten')
                          <div class="form-group">
                            <div class="col-12 mb-2">
                              <label for="logo"><strong>{{ __('Testimonial_Image') }}</strong></label>
                            </div>
                            <div class="col-md-12 showTestimonialImage mb-3">
                              <img
                                src="{{ $home_setting->testimonial_image ? asset('assets/front/img/user/home_settings/' . $home_setting->testimonial_image) : asset('assets/admin/img/noimage.jpg') }}"
                                alt="..." class="img-thumbnail">
                            </div>
                            <input type="file" name="testimonial_image" id="testimonial_image"
                              class="form-control">
                            <p id="errtestimonial_image" class="mb-0 text-danger em"></p>
                          </div>
                        @endif
                        @if ($userBs->theme != 'home_ten')
                          <div class="row">
                            <div class="col-lg-6 pr-0">
                              <div class="form-group">
                                <label for="">{{ __('Testimonial_Section_Title') }}</label>
                                <input type="hidden" name="types[]" value="testimonial_title">
                                <input type="text" class="form-control" name="testimonial_title" placeholder=""
                                  value="{{ $home_setting->testimonial_title }}">
                                <p id="errtestimonial_title" class="mb-0 text-danger em"></p>
                              </div>
                            </div>
                            <div class="col-lg-6 pl-0">
                              <div class="form-group">
                                <label for="">{{ __('Testimonial_Section_Subtitle') }}</label>
                                <input type="hidden" name="types[]" value="testimonial_subtitle">
                                <input type="text" class="form-control" name="testimonial_subtitle" placeholder=""
                                  value="{{ $home_setting->testimonial_subtitle }}">
                                <p id="errtestimonial_subtitle" class="mb-0 text-danger em">
                                </p>
                              </div>
                            </div>
                          </div>
                        @endif
                      </div>
                    </div>
                  @endif
                @endif
                @if ($userBs->theme == 'home_fourteen')
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Flash_Sale_Section') }}
                        </h3>
                        <hr class="border-top">
                      </div>
                      <div class="col-lg-12 pr-0">
                        <div class="form-group">
                          <label for="">{{ __('Flash_Sale_Section_Title') }}</label>
                          <input type="hidden" name="types[]" value="flash_sale_title">
                          <input type="text" class="form-control" name="flash_sale_title" placeholder=""
                            value="{{ $home_setting->flash_sale_title }}">
                          <p id="errflash_sale_title" class="mb-0 text-danger em"></p>
                        </div>
                      </div>
                    </div>
                  </div>
                @endif
                @if ($userBs->theme == 'home_six' || $userBs->theme == 'home_ten')
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Counter_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <div class="col-12 mb-2">
                              <label for="logo"><strong>{{ __('Counter_Section_Image') }}</strong></label>
                            </div>
                            <div class="col-md-12 showImage  mb-3">
                              <img
                                src="{{ $home_setting->counter_section_image ? asset('assets/front/img/user/home_settings/' . $home_setting->counter_section_image) : asset('assets/admin/img/noimage.jpg') }}"
                                alt="..." class="img-thumbnail">
                            </div>
                            <input type="hidden" name="types[]" value="counter_section_image">
                            <input type="file" name="counter_section_image" class="image" class="form-control">
                            <p id="errcounter_section_image" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                @endif
                @if ($userBs->theme == 'home_eleven' && (!empty($permissions) && in_array('Donation Management', $permissions)))
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Donor_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Donor_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="donor_title">
                            <input type="text" class="form-control" name="donor_title"
                              placeholder="{{ __('Enter_donor_title') }}" value="{{ $home_setting->donor_title }}">
                            <p id="errdonor_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>
                @endif
                @if ($userBs->theme != 'home_fourteen' && $userBs->theme != 'home_thirteen')
                  @if (
                      $userBs->theme != 'home_eight' &&
                          $userBs->theme != 'home_three' &&
                          $userBs->theme != 'home_nine' &&
                          $userBs->theme != 'home_ten' &&
                          (!empty($permissions) && in_array('Blog', $permissions)))
                    <div class="row">
                      <div class="col-12">
                        <div class="form-group">
                          <br>
                          <h3 class="text-warning">
                            {{ __('Blog_Section') }}</h3>
                          <hr class="border-top">
                        </div>
                        <div class="row">
                          <div class="col-lg-6 pr-0">
                            <div class="form-group">
                              <label for="">{{ __('Blog_Section_Title') }}</label>
                              <input type="hidden" name="types[]" value="blog_title">
                              <input type="text" class="form-control" name="blog_title"
                                placeholder="{{ __('Enter_blog_keyword') }}" value="{{ $home_setting->blog_title }}">
                              <p id="errblog_title" class="mb-0 text-danger em"></p>
                            </div>
                          </div>
                          <div class="col-lg-6 pl-0">
                            <div class="form-group">
                              <label for="">{{ __('Blog_Section_Subtitle') }}</label>
                              <input type="hidden" name="types[]" value="blog_subtitle">
                              <input type="text" class="form-control" name="blog_subtitle"
                                placeholder="{{ __('Enter_blog_title') }}" value="{{ $home_setting->blog_subtitle }}">
                              <p id="errblog_subtitle" class="mb-0 text-danger em"></p>
                            </div>
                          </div>
                        </div>
                        @if ($userBs->theme !== 'home_eleven' && $userBs->theme !== 'home_twelve')
                          <div class="row">
                            <div class="col-lg-6 pr-0">
                              <div class="form-group">
                                <label for="">{{ __('View_All_Blog_Text') }}</label>
                                <input type="hidden" name="types[]" value="view_all_blog_text">
                                <input type="text" class="form-control" name="view_all_blog_text"
                                  placeholder="{{ __('Enter_view_all_blog_text') }}"
                                  value="{{ $home_setting->view_all_blog_text }}">
                                <p id="errview_all_blog_text" class="mb-0 text-danger em"></p>
                              </div>
                            </div>
                          </div>
                        @endif
                      </div>
                    </div>
                  @endif
                @endif

                @if (isset($userBs->theme) &&
                        ($userBs->theme === 'home_three' ||
                            $userBs->theme === 'home_four' ||
                            $userBs->theme === 'home_five' ||
                            $userBs->theme === 'home_seven'))
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('FAQ_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      @if ($userBs->theme == 'home_three')
                        <div class="form-group">
                          <div class="col-12 mb-2">
                            <label for="logo"><strong>{{ __('FAQ_Section_Image') }}</strong></label>
                          </div>
                          <div class="col-md-12 showFAQSectionImage mb-3">
                            <img
                              src="{{ $home_setting->faq_section_image ? asset('assets/front/img/user/home_settings/' . $home_setting->faq_section_image) : asset('assets/admin/img/noimage.jpg') }}"
                              alt="..." class="img-thumbnail">
                          </div>
                          <input type="hidden" name="types[]" value="faq_section_image">
                          <input type="file" name="faq_section_image" id="faq_section_image" class="form-control">
                          <p id="errfaq_section_image" class="mb-0 text-danger em"></p>
                        </div>
                      @endif
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('FAQ_Section_Title') }}*</label>
                            <input type="hidden" name="types[]" value="faq_section_title">
                            <input type="text" class="form-control" name="faq_section_title"
                              placeholder="{{ __('Enter_faq_section_title') }}"
                              value="{{ $home_setting->faq_section_title }}">
                            <p id="errfaq_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pl-0">
                          <div class="form-group">
                            <label for="">{{ __('FAQ_Section_Subtitle') }}*</label>
                            <input type="hidden" name="types[]" value="faq_section_subtitle">
                            <input type="text" class="form-control" name="faq_section_subtitle"
                              placeholder="{{ __('Enter_faq_section_subtitle') }}"
                              value="{{ $home_setting->faq_section_subtitle }}">
                            <p id="errfaq_section_subtitle" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                @endif
                @if ($userBs->theme == 'home_ten' || $userBs->theme == 'home_eleven' || $userBs->theme == 'home_fourteen')
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Categories_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Categories_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="category_section_title">
                            <input type="text" class="form-control" name="category_section_title"
                              placeholder="{{ __('Enter_Categories_section_title') }}"
                              value="{{ $home_setting->category_section_title }}">
                            <p id="errcategory_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        @if ($userBs->theme == 'home_eleven')
                          <div class="col-lg-6 pr-0">
                            <div class="form-group">
                              <label for="">{{ __('Categories_Section_Subtitle') }}</label>
                              <input type="hidden" name="types[]" value="category_section_subtitle">
                              <input type="text" class="form-control" name="category_section_subtitle"
                                placeholder="{{ __('Enter_Categories_section_subtitle') }}"
                                value="{{ $home_setting->category_section_subtitle }}">
                              <p id="errcategory_section_subtitle" class="mb-0 text-danger em">
                              </p>
                            </div>
                          </div>
                        @endif
                      </div>
                    </div>
                  </div>
                @endif
                @if (!empty($permissions) && in_array('Ecommerce', $permissions) && $userBs->theme == 'home_fourteen')
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Featuded_Item_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Featured_Item_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="featured_item_section_title">
                            <input type="text" class="form-control" name="featured_item_section_title"
                              placeholder="{{ __('Enter_featured_item_title') }}"
                              value="{{ $home_setting->featured_item_section_title }}">
                            <p id="errfeatured_item_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                @endif
                @if (!empty($permissions) && in_array('Ecommerce', $permissions) && $userBs->theme == 'home_fourteen')
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Featured_Category_Item_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-12 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Featured_Category_Item_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="featured_category_item_section_title">
                            <input type="text" class="form-control" name="featured_category_item_section_title"
                              placeholder="{{ __('Enter_Featuded_Category_Item_Section_Title') }}"
                              value="{{ $home_setting->featured_category_item_section_title }}">
                            <p id="errfeatured_category_item_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Top_Rated_Item_Section') }}
                        </h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Top_Rated_Item_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="toprated_item_title">
                            <input type="text" class="form-control" name="toprated_item_title"
                              placeholder="{{ __('Top_Rated_item_section_title') }}"
                              value="{{ $home_setting->toprated_item_title }}">
                            <p id="errtoprated_item_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <div class="col-12 mb-2">
                              <label for="logo"><strong>{{ __('Top_Rated_Item_Section_Image') }}</strong></label>
                            </div>
                            <div class="col-md-12 showImage  mb-3">
                              <img
                                src="{{ $home_setting->counter_section_image ? asset('assets/front/img/user/home_settings/' . $home_setting->counter_section_image) : asset('assets/admin/img/noimage.jpg') }}"
                                alt="..." class="img-thumbnail">
                            </div>
                            <input type="hidden" name="types[]" value="counter_section_image">
                            <input type="file" name="counter_section_image" class="image" class="form-control">
                            <p id="errcounter_section_image" class="mb-0 text-danger em">
                            </p>
                          </div>
                        </div>
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Image_Title') }}</label>
                            <input type="hidden" name="types[]" value="featured_course_section_title">
                            <input type="text" class="form-control" name="featured_course_section_title"
                              placeholder="{{ __('Enter_title') }}"
                              value="{{ $home_setting->featured_course_section_title }}">
                            <p id="errfeatured_course_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Button Name') }}</label>
                            <input type="hidden" name="types[]" value="faq_section_title">
                            <input type="text" class="form-control" name="faq_section_title"
                              placeholder="{{ __('Enter_faq_section_title') }}"
                              value="{{ $home_setting->faq_section_title }}">
                            <p id="errfaq_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Button Link') }}</label>
                            <input type="hidden" name="types[]" value="faq_section_subtitle">
                            <input type="text" class="form-control" name="faq_section_subtitle"
                              placeholder="{{ __('Enter_faq_section_subtitle') }}"
                              value="{{ $home_setting->faq_section_subtitle }}">
                            <p id="errfaq_section_subtitle" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('On_Sale_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('On_Sale_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="on_sale_section_title">
                            <input type="text" class="form-control" name="on_sale_section_title"
                              placeholder="{{ __('Enter_On_Sale_Section_Title') }}"
                              value="{{ $home_setting->on_sale_section_title }}">
                            <p id="erron_sale_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <div class="col-12 mb-2">
                              <label for="logo"><strong>{{ __('On_Sale_Section_Image') }}</strong></label>
                            </div>
                            <div class="col-md-12 showImage  mb-3">
                              <img
                                src="{{ $home_setting->on_sale_section_image ? asset('assets/front/img/user/home_settings/' . $home_setting->on_sale_section_image) : asset('assets/admin/img/noimage.jpg') }}"
                                alt="..." class="img-thumbnail">
                            </div>
                            <input type="hidden" name="types[]" value="on_sale_section_image">
                            <input type="file" name="on_sale_section_image" class="image" class="form-control">
                            <p id="erron_sale_section_image" class="mb-0 text-danger em">
                            </p>
                          </div>
                        </div>
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('On_Sale_image_Subtitle') }}</label>
                            <input type="hidden" name="types[]" value="on_sale_section_subtitle">
                            <input type="text" class="form-control" name="on_sale_section_subtitle"
                              placeholder="{{ __('Enter_On_Sale_Section_Section_Subtitle') }}"
                              value="{{ $home_setting->on_sale_section_subtitle }}">
                            <p id="erron_sale_section_subtitle" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('On_Sale_Image_Button_Name') }}</label>
                            <input type="hidden" name="types[]" value="on_sale_section_section_button_name">
                            <input type="text" class="form-control" name="on_sale_section_section_button_name"
                              placeholder="{{ __('Enter_On_Sale_Section_Section_Button_Name') }}"
                              value="{{ $home_setting->on_sale_section_section_button_name }}">
                            <p id="erron_sale_section_section_button_name" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('On_Sale_Image_Button_Link') }}</label>
                            <input type="hidden" name="types[]" value="on_sale_section_section_button_link">
                            <input type="text" class="form-control" name="on_sale_section_section_button_link"
                              placeholder="{{ __('Enter_On_Sale_Image_Button_Link') }}"
                              value="{{ $home_setting->on_sale_section_section_button_link }}">
                            <p id="erron_sale_section_section_button_link" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                @endif

                @if (!empty($permissions) && in_array('Blog', $permissions) && $userBs->theme == 'home_thirteen')
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Featuded_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-12 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Featured_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="featured_section_title">
                            <input type="text" class="form-control" name="featured_section_title"
                              placeholder="{{ __('Enter_featured_title') }}"
                              value="{{ $home_setting->featured_section_title }}">
                            <p id="errfeatured_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Latest_Item_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-12 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Latest_Item_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="latest_item_section_title">
                            <input type="text" class="form-control" name="latest_item_section_title"
                              placeholder="{{ __('Enter_Latest_Item_Section_Title') }}"
                              value="{{ $home_setting->latest_item_section_title }}">
                            <p id="latest_item_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>



                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Popular Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-12 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Popular Section Title') }}</label>
                            <input type="hidden" name="types[]" value="featured_category_item_section_title">
                            <input type="text" class="form-control" name="featured_category_item_section_title"
                              placeholder="{{ __('Enter Popular Section Title') }}"
                              value="{{ $home_setting->featured_category_item_section_title }}">
                            <p id="errfeatured_category_item_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Gallery Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-12 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Gallery Section Title') }}</label>
                            <input type="hidden" name="types[]" value="causes_section_title">
                            <input type="text" class="form-control" name="causes_section_title"
                              placeholder="{{ __('Enter Gallery Section Title') }}"
                              value="{{ $home_setting->causes_section_title }}">
                            <p id="errcauses_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Newsletter_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-12">
                          <div class="form-group">
                            <div class="row">
                              <div class="col-12 mb-2">
                                <label for="logo"><strong>{{ __('Newsletter_Image') }}</strong></label>
                              </div>
                              <div class="col-md-12 showNewsletterImage mb-3">
                                <img
                                  src="{{ $home_setting->newsletter_image ? asset('assets/front/img/user/home_settings/' . $home_setting->newsletter_image) : asset('assets/admin/img/noimage.jpg') }}"
                                  alt="..." class="img-thumbnail">
                              </div>
                              <input type="hidden" name="types[]" value="newsletter_image">
                              <input type="file" name="newsletter_image" id="newsletter_image"
                                class="form-control">
                              <p id="errnewsletter_image" class="mb-0 text-danger em">
                              </p>
                            </div>
                          </div>
                        </div>
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Newsletter_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="newsletter_title">
                            <input type="text" class="form-control" name="newsletter_title"
                              placeholder="{{ __('Newsletter_section_title') }}"
                              value="{{ $home_setting->newsletter_title }}">
                            <p id="errnewsletter_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Newsletter_Section_Subtitle') }}</label>
                            <input type="hidden" name="types[]" value="newsletter_subtitle">
                            @if ($userBs->theme == 'home_ten')
                              <textarea class="form-control" placeholder="{{ __('Newsletter_section_subtitle') }}" name="newsletter_subtitle"
                                id=""rows="4">{{ $home_setting->newsletter_subtitle }}</textarea>
                            @else
                              <input type="text" class="form-control" name="newsletter_subtitle"
                                placeholder="{{ __('Newsletter_section_subtitle') }}"
                                value="{{ $home_setting->newsletter_subtitle }}">
                            @endif
                            <p id="errnewsletter_subtitle" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                @endif

                @if ($userBs->theme == 'home_eleven')
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Causes_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Causes_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="causes_section_title">
                            <input type="text" class="form-control" name="causes_section_title"
                              placeholder="{{ __('Enter_causes_section_title') }}"
                              value="{{ $home_setting->causes_section_title }}">
                            <p id="errcauses_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        @if ($userBs->theme == 'home_eleven')
                          <div class="col-lg-6 pr-0">
                            <div class="form-group">
                              <label for="">{{ __('Causes_Section_Subtitle') }}</label>
                              <input type="hidden" name="types[]" value="causes_section_subtitle">
                              <input type="text" class="form-control" name="causes_section_subtitle"
                                placeholder="{{ __('Enter_causes_section_subtitle') }}"
                                value="{{ $home_setting->causes_section_subtitle }}">
                              <p id="errcauses_section_subtitle" class="mb-0 text-danger em">
                              </p>
                            </div>
                          </div>
                        @endif
                      </div>
                    </div>
                  </div>
                @endif
                @if (
                    $userBs->theme == 'home_three' ||
                        $userBs->theme == 'home_four' ||
                        $userBs->theme == 'home_five' ||
                        $userBs->theme == 'home_six' ||
                        $userBs->theme == 'home_seven')
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Quote_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Quote_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="quote_section_title">
                            <input type="text" class="form-control" name="quote_section_title"
                              placeholder="{{ __('Enter_quote_section_title') }}"
                              value="{{ $home_setting->quote_section_title }}">
                            <p id="errquote_section_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pl-0">
                          <div class="form-group">
                            <label for="">{{ __('Quote_Section_Subtitle') }}</label>
                            <input type="hidden" name="types[]" value="quote_section_subtitle">
                            <input type="text" class="form-control" name="quote_section_subtitle"
                              placeholder="{{ __('Enter_quote_section_subtitle') }}"
                              value="{{ $home_setting->quote_section_subtitle }}">
                            <p id="errquote_section_subtitle" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
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
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Contact_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        @if ($userBs->theme !== 'home_twelve')
                          <div class="col-lg-6 pr-0">
                            <div class="form-group">
                              <div class="col-12 mb-2">
                                <label for="logo"><strong>{{ __('Contact_Section_Image') }}</strong></label>
                              </div>
                              <div class="col-md-12 showImage  mb-3">
                                <img
                                  src="{{ $home_setting->contact_section_image ? asset('assets/front/img/user/home_settings/' . $home_setting->contact_section_image) : asset('assets/admin/img/noimage.jpg') }}"
                                  alt="..." class="img-thumbnail">
                              </div>
                              <input type="hidden" name="types[]" value="contact_section_image">
                              <input type="file" name="contact_section_image" class="image" class="form-control">
                              <p id="errcontact_section_image" class="mb-0 text-danger em">
                              </p>
                            </div>
                          </div>
                        @endif
                      </div>
                      @if ($userBs->theme != 'home_four' && $userBs->theme != 'home_five')
                        <div class="row">
                          <div class="col-lg-6 pr-0">
                            <div class="form-group">
                              <label for="">{{ __('Contact_Section_Title') }}</label>
                              <input type="hidden" name="types[]" value="contact_section_title">
                              <input type="text" class="form-control" name="contact_section_title"
                                placeholder="{{ __('Enter_contact_Section_title') }}"
                                value="{{ $home_setting->contact_section_title }}">
                              <p id="errcontact_section_title" class="mb-0 text-danger em">
                              </p>
                            </div>
                          </div>
                          <div class="col-lg-6 pl-0">
                            <div class="form-group">
                              <label for="">{{ __('contact_Section_Subtitle') }}</label>
                              <input type="hidden" name="types[]" value="contact_section_subtitle">
                              <input type="text" class="form-control" name="contact_section_subtitle"
                                placeholder="{{ __('Enter_contact_Section_subtitle') }}"
                                value="{{ $home_setting->contact_section_subtitle }}">
                              <p id="errcontact_section_subtitle" class="mb-0 text-danger em">
                              </p>
                            </div>
                          </div>
                        </div>
                      @endif
                    </div>
                  </div>
                @endif
                <div class="row">
                  @if ($userBs->theme == 'home_eight')
                    <div class="col-6">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Feature_Item_Section') }}
                        </h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-12 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Feature_Item_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="feature_item_title">
                            <input type="text" class="form-control" name="feature_item_title"
                              placeholder="{{ __('Feature_item_section_title') }}"
                              value="{{ $home_setting->feature_item_title }}">
                            <p id="errfeature_item_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  @endif
                  @if ($userBs->theme == 'home_eight')
                    <div class="col-6">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('New_Item_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-12 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('New_Item_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="new_item_title">
                            <input type="text" class="form-control" name="new_item_title"
                              placeholder="{{ __('New_item_section_title') }}"
                              value="{{ $home_setting->new_item_title }}">
                            <p id="errnew_item_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  @endif
                  @if ($userBs->theme == 'home_eight')
                    <div class="col-6">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Best_Seller_Item_Section') }}
                        </h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-12 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Best_Seller_Item_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="bestseller_item_title">
                            <input type="text" class="form-control" name="bestseller_item_title"
                              placeholder="{{ __('Best_Seller_item_section_title') }}"
                              value="{{ $home_setting->bestseller_item_title }}">
                            <p id="errbestseller_item_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Top_Rated_Item_Section') }}
                        </h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-12 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Top_Rated_Item_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="toprated_item_title">
                            <input type="text" class="form-control" name="toprated_item_title"
                              placeholder="{{ __('Top_Rated_item_section_title') }}"
                              value="{{ $home_setting->toprated_item_title }}">
                            <p id="errtoprated_item_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  @endif
                  @if ($userBs->theme == 'home_eight')
                    <div class="col-6">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Special_Item_Section') }}
                        </h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-12 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Special_Item_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="special_item_title">
                            <input type="text" class="form-control" name="special_item_title"
                              placeholder="{{ __('Special_item_section_title') }}"
                              value="{{ $home_setting->special_item_title }}">
                            <p id="errspecial_item_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  @endif
                  @if ($userBs->theme == 'home_eight')
                    <div class="col-6">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Flash_Sale_Item_Section') }}
                        </h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        <div class="col-lg-12 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Flash_Sale_Item_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="flashsale_item_title">
                            <input type="text" class="form-control" name="flashsale_item_title"
                              placeholder="{{ __('Flash_Sale_item_section_title') }}"
                              value="{{ $home_setting->flashsale_item_title }}">
                            <p id="errflashsale_item_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  @endif
                </div>
                @if ($userBs->theme == 'home_eight' || $userBs->theme == 'home_ten' || $userBs->theme == 'home_eleven')
                  <div class="row">
                    <div class="col-12">
                      <div class="form-group">
                        <br>
                        <h3 class="text-warning">
                          {{ __('Newsletter_Section') }}</h3>
                        <hr class="border-top">
                      </div>
                      <div class="row">
                        @if ($userBs->theme == 'home_ten')
                          <div class="col-12">
                            <div class="form-group">
                              <div class="row">
                                <div class="col-12 mb-2">
                                  <label for="logo"><strong>{{ __('Newsletter_Image') }}</strong></label>
                                </div>
                                <div class="col-md-12 showNewsletterImage mb-3">
                                  <img
                                    src="{{ $home_setting->newsletter_image ? asset('assets/front/img/user/home_settings/' . $home_setting->newsletter_image) : asset('assets/admin/img/noimage.jpg') }}"
                                    alt="..." class="img-thumbnail">
                                </div>
                                <input type="hidden" name="types[]" value="newsletter_image">
                                <input type="file" name="newsletter_image" id="newsletter_image"
                                  class="form-control">
                                <p id="errnewsletter_image" class="mb-0 text-danger em">
                                </p>
                              </div>
                            </div>
                          </div>
                          <div class="col-12">
                            <div class="form-group">
                              <div class="row">
                                <div class="col-12 mb-2">
                                  <label
                                    for="logo"><strong>{{ __('Newsletter_Background_Image') }}</strong></label>
                                </div>
                                <div class="col-md-12 showNewsletterImage2 mb-3">
                                  <img
                                    src="{{ $home_setting->newsletter_snd_image ? asset('assets/front/img/user/home_settings/' . $home_setting->newsletter_snd_image) : asset('assets/admin/img/noimage.jpg') }}"
                                    alt="..." class="img-thumbnail">
                                </div>
                                <input type="hidden" name="types[]" value="newsletter_snd_image">
                                <input type="file" name="newsletter_snd_image" id="newsletter_image2"
                                  class="form-control">
                                <p id="errnewsletter_snd_image" class="mb-0 text-danger em">
                                </p>
                              </div>
                            </div>
                          </div>
                        @endif
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Newsletter_Section_Title') }}</label>
                            <input type="hidden" name="types[]" value="newsletter_title">
                            <input type="text" class="form-control" name="newsletter_title"
                              placeholder="{{ __('Newsletter_section_title') }}"
                              value="{{ $home_setting->newsletter_title }}">
                            <p id="errnewsletter_title" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                        <div class="col-lg-6 pr-0">
                          <div class="form-group">
                            <label for="">{{ __('Newsletter_Section_Subtitle') }}</label>
                            <input type="hidden" name="types[]" value="newsletter_subtitle">
                            @if ($userBs->theme == 'home_ten')
                              <textarea class="form-control" placeholder="{{ __('Newsletter_section_subtitle') }}" name="newsletter_subtitle"
                                id=""rows="4">{{ $home_setting->newsletter_subtitle }}</textarea>
                            @else
                              <input type="text" class="form-control" name="newsletter_subtitle"
                                placeholder="{{ __('Newsletter_section_subtitle') }}"
                                value="{{ $home_setting->newsletter_subtitle }}">
                            @endif
                            <p id="errnewsletter_subtitle" class="mb-0 text-danger em"></p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                @endif
              </form>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <div class="form">
            <div class="form-group from-show-notify row">
              <div class="col-12 text-center">
                <button type="submit" id="submitBtn" class="btn btn-success">{{ __('Update') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
@endsection

@section('scripts')
  <script src="{{ asset('assets/admin/js/home-sections.js') }}"></script>
@endsection
