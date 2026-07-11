  @extends('user-front.layout')
  @section('tab-title')
    {{ $keywords['Home'] ?? 'Home' }}
  @endsection
  @php
    Config::set('app.timezone', $userBs->timezoneinfo->timezone ?? '');
  @endphp
  @section('meta-description', !empty($userSeo) ? $userSeo->home_meta_description : '')
  @section('meta-keywords', !empty($userSeo) ? $userSeo->home_meta_keywords : '')
  @section('content')
    <!--====== Start Hero Section ======-->
    <div class="main-wrapper">
      <!--====== Start Hero Section ======-->
      <section class="hero-area">
        <div class="hero-wrapper-one bg_cover lazy"
          data-bg="{{ empty($static->img) ? asset('assets/front/img/themes/P-banner.jpg') : asset('assets/front/img/hero_static/' . $static->img) }} ">
          <div id="particles-js"></div>
          <div class="container">
            <div class="row justify-content-center">
              <div class="col-lg-8">
                <div class="hero-content text-center">
                  @if (empty($static->title))
                    <h1> {{ __('Federico Chiesa') }}</h1>
                    <h4> <span id="typed"></span>
                    </h4>
                    <div class="type-string">

                      <p>{{ __("Hi I'm, UI/UX Designer") }}</p>
                      <p>{{ __("Hi I'm, Graphic Designer") }}</p>
                      <p>{{ __("Hi I'm, Banner Designer") }}</p>

                    </div>

                    <a href="#" class="main-btn filled-btn">
                      {{ __('Hire Me') }}
                    </a>
                  @else
                    <h1>{{ $static->title }}</h1>
                    <h4> <span id="typed"></span>
                    </h4>
                    <div class="type-string">
                      @php
                        $designations = explode(',', @$static->designation);
                      @endphp
                      @if (count($designations) > 1)
                        @foreach ($designations as $designation)
                          <p>{{ $designation }}</p>
                        @endforeach

                      @endif
                    </div>
                    @if (!empty($static->btn_url))
                      <a href="{{ $static->btn_url }}" class="main-btn filled-btn">
                        {{ empty($static->btn_name) ? 'Hire Me' : $static->btn_name }}
                      </a>
                    @endif
                  @endif
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <!--====== End Hero Section ======-->
      @if (isset($home_sections->intro_section) && $home_sections->intro_section == 1)
        <!--====== Start About Section ======-->
        <section class="about-area pb-80 pt-120">
          <div class="container">
            <div class="row align-items-center">
              <div class="col-lg-6">
                <div class="about-img-box mb-40">
                  <img
                    data-src="{{ !empty($home_text->about_image) ? asset('assets/front/img/user/home_settings/' . $home_text->about_image) : asset('assets/front/img/themes/about.jpg') }}"
                    class="lazy" alt="About Image">
                </div>
              </div>
              <div class="col-lg-6">
                <div class="about-content-box mb-40">
                  <div class="section-title mb-20">
                    <span class="sub-title">{{ @$home_text->about_title }}</span>
                    <h2>{{ @$home_text->about_subtitle }}</h2>
                  </div>
                  <p>{{ @$home_text->about_content }}</p>
                  @if (isset($userBs->cv))
                    <a href="{{ asset('assets/front/img/user/cv/' . $userBs->cv) }}" class="main-btn"
                      download="{{ getParam() }}.pdf">{{ $keywords['Download_CV'] ?? __(' Download CV') }}</a>
                  @endif
                </div>
              </div>
            </div>
          </div>
        </section>
        <!--====== End About Section ======-->
      @endif

      <!--====== Start Skills Section ======-->
      @if (in_array('Skill', $packagePermissions) &&
              isset($home_sections->skills_section) &&
              $home_sections->skills_section == 1)

        @php
          $isSkillsTextEmpty =
              empty($home_text->skills_title) &&
              empty($home_text->skills_subtitle) &&
              empty($home_text->skills_content);
          $isSkillsEmpty = empty($skills) || count($skills) == 0;
          $skillsImage = !empty($home_text->skills_image)
              ? asset('assets/front/img/user/home_settings/' . $home_text->skills_image)
              : asset('assets/front/img/themes/skill.jpg');
        @endphp

        <section class="skills-area">
          <div class="container">
            <div class="row align-items-center">
              <div class="col-lg-6">
                <div class="skills-content-box">
                  <div class="section-title mb-20">
                    @if ($isSkillsTextEmpty)
                      <span class="sub-title">This is the Skills section</span>
                      <h2>Skills will be displayed here</h2>
                    @else
                      <span class="sub-title">{{ $home_text->skills_title }}</span>
                      <h2>{{ $home_text->skills_subtitle }}</h2>
                    @endif
                  </div>

                  @if (!$isSkillsTextEmpty)
                    <p>{{ $home_text->skills_content }}</p>
                  @endif

                  <ul class="skill-list">
                    @if (!$isSkillsEmpty)
                      @foreach ($skills as $skill)
                        <li class="single-skill">
                          <h5>{{ $skill->title }} <span>{{ $skill->percentage . '%' }}</span></h5>
                          <div class="progress">
                            <div class="progress-bar"
                              style="width: {{ $skill->percentage . '%' }}; background-color: #{{ $skill->color }}">
                            </div>
                          </div>
                        </li>
                      @endforeach
                    @endif
                  </ul>
                </div>
              </div>

              <div class="col-lg-6">
                <div class="skills-img-box">
                  <img data-src="{{ $skillsImage }}" class="lazy" alt="Skill Image">
                </div>
              </div>
            </div>
          </div>
        </section>
      @endif
      <!--====== End Skills Section ======-->

      <!--====== Start Service Section ======-->
      @if (in_array('Service', $packagePermissions) &&
              isset($home_sections->featured_services_section) &&
              $home_sections->featured_services_section == 1)

        @php
          $isServiceTextEmpty = empty($home_text->service_title) && empty($home_text->service_subtitle);
          $isServicesEmpty = empty($services) || count($services) == 0;
        @endphp

        <section class="service-area pt-120 pb-80">
          <div class="container">
            <div class="row justify-content-center">
              <div class="col-lg-8">
                <div class="section-title text-center mb-45">
                  @if ($isServiceTextEmpty)
                    <span class="sub-title">This is the Services section</span>
                    <h2>Services will be displayed here</h2>
                  @else
                    <span class="sub-title">{{ $home_text->service_title }}</span>
                    <h2>{{ $home_text->service_subtitle }}</h2>
                  @endif
                </div>
              </div>
            </div>

            @if ($isServicesEmpty)
              <div class="row">
                <div class="col-12 text-center">
                  <h3 class="text-dark">{{ $keywords['NO_SERVICE_FOUND'] ?? __('NO SERVICE FOUND!') }}</h3>
                </div>
              </div>
            @else
              <div class="row">
                @foreach ($services as $service)
                  <div class="col-lg-4 col-md-6 col-sm-12">
                    <div class="service-item service-item-one mb-40">
                      <a class="service-img d-block"
                        @if ($service->detail_page == 1) href="{{ route('front.user.service.detail', [getParam(), 'slug' => $service->slug, 'id' => $service->id]) }}" @endif>
                        <img data-src="{{ asset('assets/front/img/user/services/' . $service->image) }}" class="lazy"
                          alt="Service Image">
                      </a>
                      <div class="service-content">
                        <h4 class="title">
                          <a
                            @if ($service->detail_page == 1) href="{{ route('front.user.service.detail', [getParam(), 'slug' => $service->slug, 'id' => $service->id]) }}" @endif>{{ $service->name }}</a>
                        </h4>
                      </div>
                    </div>
                  </div>
                @endforeach
              </div>
            @endif
          </div>
        </section>
      @endif

      <!--====== End Service Section ======-->

      <!--====== Start Resume Section ======-->
      @if (in_array('Portfolio', $packagePermissions) &&
              isset($home_sections->job_education_section) &&
              $home_sections->job_education_section == 1)

        @php
          $isSectionTitleEmpty = empty($home_text->job_education_title) && empty($home_text->job_education_subtitle);
          $isEducationsEmpty = empty($educations) || count($educations) == 0;
          $isJobsEmpty = empty($job_experiences) || count($job_experiences) == 0;
        @endphp

        <section class="resume-area light-bg pt-120 pb-200">
          <div class="container">
            <div class="row justify-content-center">
              <div class="col-lg-8">
                <div class="section-title text-center mb-45">
                  @if ($isSectionTitleEmpty)
                    <span class="sub-title">This is the Job & Education section</span>
                    <h2>Portfolio details will be displayed here</h2>
                  @else
                    <span class="sub-title">{{ $home_text->job_education_title }}</span>
                    <h2>{{ $home_text->job_education_subtitle }}</h2>
                  @endif
                </div>
              </div>
            </div>

            <div class="row align-items-center">

              <div class="col-lg-5">
                <div class="resume-title text-center">
                  <h5>{{ $keywords['Education'] ?? __('Education') }}</h5>
                </div>

                @if ($isEducationsEmpty)
                  <div class="text-center mb-30">
                    <p>{{ $keywords['no_education_found'] ?? 'No education records found.' }}</p>
                  </div>
                @else
                  @foreach ($educations as $education)
                    <div class="resume-item mb-30">
                      <div class="resume-content">
                        <h5>{{ $education->degree_name }}</h5>
                        <span class="date">
                          {{ \Carbon\Carbon::parse($education->start_date)->format('M j, Y') }} -
                          @if (!empty($education->end_date))
                            {{ \Carbon\Carbon::parse($education->end_date)->format('M j, Y') }}
                          @else
                            {{ $keywords['Present'] ?? 'Present' }}
                          @endif
                        </span>
                        <p>{!! nl2br($education->short_description) !!}</p>
                      </div>
                    </div>
                  @endforeach
                @endif
              </div>

              <div class="col-lg-2">
                <div class="resume-line text-center">
                  <img class="lazy" data-src="{{ asset('assets/front/img/themes/line.png') }}" alt="line image">
                </div>
              </div>

              <div class="col-lg-5">
                <div class="resume-title text-center">
                  <h5>{{ $keywords['Job'] ?? __('Job') }}</h5>
                </div>

                @if ($isJobsEmpty)
                  <div class="text-center mb-30">
                    <p>{{ $keywords['no_job_found'] ?? 'No job records found.' }}</p>
                  </div>
                @else
                  @foreach ($job_experiences as $job_experience)
                    <div class="resume-item mb-30">
                      <div class="resume-content">
                        <h5>{{ $job_experience->designation }} [{{ $job_experience->company_name }}]
                        </h5>
                        <span class="date">
                          {{ \Carbon\Carbon::parse($job_experience->start_date)->format('M j, Y') }}
                          -
                          @if ($job_experience->is_continue == 0)
                            {{ \Carbon\Carbon::parse($job_experience->end_date)->format('M j, Y') }}
                          @else
                            {{ $keywords['Present'] ?? 'Present' }}
                          @endif
                        </span>
                        <p>{!! nl2br($job_experience->content) !!}</p>
                      </div>
                    </div>
                  @endforeach
                @endif
              </div>

            </div>
          </div>
        </section>
      @endif
      <!--====== End Resume Section ======-->

      <!--====== Start Counter Section ======-->
      @if (isset($home_sections->counter_info_section) && $home_sections->counter_info_section == 1)
        @php
          $isCountInfosEmpty = empty($countInfos) || count($countInfos) == 0;
        @endphp

        <section class="counter-area">
          <div class="container">
            <div class="counter-wrapper-one bg_cover lazy" data-bg="{{ asset('assets/img/counter-bg.jpg') }}">
              <div class="row">
                @if ($isCountInfosEmpty)
                  <div class="col-12 text-center">
                    <h3 class="text-light">
                      {{ $keywords['no_information_found'] ?? __('No counter Information Found') }}!
                    </h3>
                  </div>
                @else
                  @foreach ($countInfos as $counter)
                    <div class="col-lg-3 col-md-6 col-sm-12">
                      <div class="counter-item counter-item-one text-center mb-30">
                        <div class="content">
                          <h2>
                            <span class="count">{{ $counter->count }}</span> +
                          </h2>
                          <h5>{{ $counter->title }}</h5>
                        </div>
                      </div>
                    </div>
                  @endforeach
                @endif
              </div>
            </div>
          </div>
        </section>
      @endif
      <!--====== End Counter Section ======-->

      @if (in_array('Portfolio', $packagePermissions) &&
              isset($home_sections->portfolio_section) &&
              $home_sections->portfolio_section == 1)
        <!--====== Start Project Section ======-->
        <section class="portfolio-area pt-120 pb-90" id="masonry-portfolio">
          <div class="container">
            <div class="row justify-content-center">
              <div class="col-lg-8">
                <div class="section-title text-center mb-45">
                  <span class="sub-title">{{ @$home_text->portfolio_title }}</span>
                  <h2>{{ @$home_text->portfolio_subtitle }}</h2>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-lg-12">
                <div class="portfolio-filter-button text-center">
                  @if (count($portfolios) > 0)
                    <ul class="filter-btn mb-60 wow fadeInUp">
                      <li data-filter="*" class="active"> {{ $keywords['All'] ?? 'All' }} </li>
                      @foreach ($portfolio_categories as $category)
                        <li data-filter=".cat-{{ $category->id }}">
                          {{ convertUtf8($category->name) }}
                        </li>
                      @endforeach

                    </ul>
                  @else
                    <h3 class="text-dark">
                      {{ $keywords['NO_PORTFOLIO_FOUND'] ?? __('NO PORTFOLIO FOUND!') }} </h3>
                  @endif
                </div>
              </div>
            </div>
            @if (count($portfolios) > 0)
              <div class="row masonry-row">
                @foreach ($portfolios as $portfolio)
                  <div class="col-lg-6 portfolio-column cat-{{ $portfolio->bcategory->id }}">
                    <div class="portfolio-item portfolio-item-one mb-30">
                      <div class="portfolio-img">
                        <a href="{{ route('front.user.portfolio.detail', [getParam(), $portfolio->slug, $portfolio->id]) }}"
                          class="d-block">
                          <img src="{{ asset('assets/front/img/user/portfolios/' . $portfolio->image) }}"
                            alt="Image">
                        </a>
                        <div class="portfolio-content">
                          <h4 class="title">
                            <a
                              href="{{ route('front.user.portfolio.detail', [getParam(), $portfolio->slug, $portfolio->id]) }}">{{ strlen($portfolio->title) > 30 ? mb_substr($portfolio->title, 0, 30, 'UTF-8') . '...' : $portfolio->title }}</a>
                          </h4>
                        </div>
                      </div>
                    </div>
                  </div>
                @endforeach
              </div>
            @endif
          </div>
        </section>
      @endif
      <!--====== End Project Section ======-->

      <!--====== Start Testimonial Section ======-->
      @if (in_array('Testimonial', $packagePermissions) &&
              isset($home_sections->testimonials_section) &&
              $home_sections->testimonials_section == 1)
        <section class="testimonial-area pt-120 pb-120 light-bg">
          <div class="container">
            <div class="row justify-content-center">
              <div class="col-lg-8">
                <div class="section-title text-center mb-45">
                  <span class="sub-title">{{ @$home_text->testimonial_title }}</span>
                  <h2>{{ @$home_text->testimonial_subtitle }}</h2>
                </div>
              </div>
            </div>
            <div class="testimonial-slider-one">
              @forelse ($testimonials as $testimonial)
                <div class="testimonial-item testimonial-item-one">
                  <div class="testimonial-content">
                    <div class="tm-author-info d-flex">
                      <div class="author-thumb">
                        <img src="{{ asset('assets/front/img/user/testimonials/' . $testimonial->image) }}"
                          alt="">
                      </div>
                      <div class="author-info">
                        <h5>{{ $testimonial->name }}</h5>
                        <span class="position">{{ $testimonial->occupation }}</span>
                      </div>
                    </div>
                    <p>{!! replaceBaseUrl($testimonial->content) !!}</p>
                  </div>
                </div>
              @empty
                <div class="col-12 text-center  p-0">
                  <h3 class="text-dark">
                    {{ $keywords['NO_TESTIMONIAL_FOUND'] ?? __('NO TESTIMONIAL FOUND!') }} </h3>
                </div>
              @endforelse

            </div>
          </div>
        </section>
      @endif
      <!--====== End Testimonial Section ======-->

      <!--====== Start Blog Section ======-->
      @if (in_array('Blog', $packagePermissions) && isset($home_sections->blogs_section) && $home_sections->blogs_section == 1)
        <section class="blog-area pt-120 pb-80">
          <div class="container">
            <div class="row justify-content-center">
              <div class="col-lg-8">
                <div class="section-title text-center mb-45">
                  <span class="sub-title">{{ @$home_text->blog_title }}</span>
                  <h2>{{ @$home_text->blog_subtitle }}</h2>
                </div>
              </div>
            </div>
            <div class="row">
              @forelse ($blogs as $blog)
                <div class="col-lg-4 col-md-6 col-sm-12">
                  <div class="blog-post-item blog-post-item-one mb-40">
                    <a class="post-thumbnail d-block"
                      href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">
                      <img class="lazy" data-src="{{ asset('assets/front/img/user/blogs/') . '/' . $blog->image }}"
                        alt="Blog Image">
                    </a>
                    <div class="entry-content">
                      <h3 class="title">
                        <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">
                          {!! strlen($blog->title) > 40 ? mb_substr($blog->title, 0, 40, 'UTF-8') . '...' : $blog->title !!}</a>
                      </h3>
                      <div class="post-meta">
                        <ul>
                          <li>
                            <span>
                              <i class="fas fa-user"></i>
                              by
                              <a>{{ $user->last_name }}</a>
                            </span>
                          </li>
                          <li>
                            <span>
                              <i class="fas fa-calendar-alt"></i>
                              <a>{{ \Carbon\Carbon::parse($blog->created_at)->toFormattedDateString() }}</a>
                            </span>
                          </li>
                        </ul>
                      </div>
                      <p>{!! strlen(strip_tags($blog->content)) > 80
                          ? mb_substr(strip_tags($blog->content), 0, 80, 'UTF-8') . '...'
                          : strip_tags($blog->content) !!}</p>
                    </div>
                  </div>
                </div>
              @empty
                <div class="col-12 text-center">
                  <h3 class="text-dark">
                    {{ $keywords['No_Blog_Found'] ?? __('No Blog Found !') }} </h3>
                </div>
              @endforelse
            </div>
          </div>
        </section>
      @endif
      <!--====== End Blog Section ======-->

      <!--====== Start Contact Section ======-->
      @if (isset($home_sections->contact_section) && $home_sections->contact_section == 1)
        <section id="contact" class="contact-area light-bg pt-120 pb-120">
          <div class="container">
            <div class="row justify-content-center">
              <div class="col-lg-8">
                <div class="section-title text-center mb-45">
                  <span class="sub-title">{{ @$home_text->contact_section_title }}</span>
                  <h2>{{ @$home_text->contact_section_subtitle }}</h2>
                </div>
              </div>
            </div>
            <div class="row justify-content-center">
              <div class="col-lg-9">
                <div class="contact-form-wrap">
                  <form action="{{ route('front.contact.message', getParam()) }}" method="POST">
                    @csrf
                    <input type="hidden" name="id" value="{{ $user->id }}">
                    <div class="row">
                      <div class="col-lg-4 col-md-6 col-sm-12">
                        <div class="form_group">
                          <input type="text" name="fullname" value="{{ old('fullname') }}" class="form_control"
                            placeholder="Name" name="fullname" required="">
                          @error('fullname')
                            <p class="mb-0 ml-3 text-danger">{{ $message }}</p>
                          @enderror
                        </div>
                      </div>
                      <div class="col-lg-4 col-md-6 col-sm-12">
                        <div class="form_group">
                          <input type="email" class="form_control" name="email" value="{{ old('email') }}"
                            placeholder="Email Address" name="email" required="">
                          @error('email')
                            <p class="mb-0 ml-3 text-danger">{{ $message }}</p>
                          @enderror
                        </div>
                      </div>
                      <div class="col-lg-4 col-md-6 col-sm-12">
                        <div class="form_group">
                          <input type="text" class="form_control" value="{{ old('subject') }}"
                            placeholder="Subject" name="subject" name="subject" required>
                          @error('subject')
                            <p class="mb-0 ml-3 text-danger">{{ $message }}</p>
                          @enderror
                        </div>
                      </div>
                      <div class="col-lg-12">
                        <div class="form_group">
                          <textarea class="form_control" name="message" placeholder="Message" name="message">{{ old('message') }}</textarea>
                          @error('message')
                            <p class="mb-0 ml-3 text-danger">{{ $message }}</p>
                          @enderror
                        </div>
                      </div>
                      <div class="col form_group">
                        @if ($userBs->is_recaptcha == 1)
                          <div class="d-block mb-4">
                            {!! NoCaptcha::renderJs() !!}
                            {!! NoCaptcha::display() !!}
                            @if ($errors->has('g-recaptcha-response'))
                              @php
                                $errmsg = $errors->first('g-recaptcha-response');
                              @endphp
                              <p class="text-danger mb-0 mt-2">{{ __("$errmsg") }}</p>
                            @endif
                          </div>
                        @endif
                      </div>
                      <div class="col-lg-12">
                        <div class="form_group text-center">
                          <button type="submit"
                            class="main-btn arrow-btn">{{ $keywords['Send_Message'] ?? __('Send Message') }}</button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      @endif
      <!--====== End Contact Section ======-->
    </div>
    <!--====== back-to-top ======-->
    <a href="#" class="back-to-top">
      <i class="fas fa-angle-up"></i>
    </a>
  @endsection
