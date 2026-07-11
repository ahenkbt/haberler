<!--====== Footer Part Start ======-->
@php
  Config::set('app.timezone', $userBs->timezoneinfo->timezone);
@endphp
@if (
    (isset($home_sections->top_footer_section) && $home_sections->top_footer_section == 1) ||
        (isset($home_sections->copyright_section) && $home_sections->copyright_section == 1))
  <footer class="grey-bg-footer">
    <div class="container">
      <div class="footer-widget">
        @if (isset($home_sections->top_footer_section) && $home_sections->top_footer_section == 1)
          <div class="row">
            <div class="col-lg-4 col-sm-5 order-1">
              <div class="widget site-info-widget">
                @if (isset($userFooterData->logo))
                  <a class="footer-logo" href="{{ route('front.user.detail.view', getParam()) }}">
                    <img class="lazy" data-src="{{ asset('assets/front/img/user/footer/' . $userFooterData->logo) }}"
                      alt="logo">
                  </a>
                @endif
                <p>{!! isset($userFooterData->about_company)
                    ? replaceBaseUrl($userFooterData->about_company)
                    : 'Power of choice is untrammelled & when nothing prevents our being able' !!}</p>
                <ul class="social-links">
                  @if (isset($social_medias))
                    @foreach ($social_medias as $social_media)
                      <li><a href="{{ $social_media->url }}" class="facebook" target="_blank"><i
                            class="{{ $social_media->icon }}"></i></a>
                      </li>
                    @endforeach
                  @endif
                </ul>
              </div>
            </div>
            @if (isset($home_sections->newsletter_section) && $home_sections->newsletter_section == 1)
              <div class="col-lg-8 col-sm-7 order-2">
                <div class="widget newsletter-widget">
                  <h4 class="widget-title">
                    {{ $keywords['SUBSCRIBE_FOR_NEWSLETTER'] ?? 'SUBSCRIBE FOR NEWSLETTER' }}</h4>
                  <div class="newsletter-form">
                    <form action="{{ route('front.user.subscriber', getParam()) }}" method="post"
                      enctype="multipart/form-data">
                      @csrf
                      <input type="email" placeholder="{{ $keywords['Email_Address'] ?? 'Email Address' }}"
                        name="subscriber_email" required value="{{ old('subscriber_email') }}">
                      @error('subscriber_email')
                        <p class="text-danger mt-2">{{ $message }}</p>
                      @enderror
                      <button type="submit" class="main-btn">{{ $keywords['Subscribe'] ?? 'Subscribe' }}</button>
                      <div class="form-group mt-3 ">
                        @if ($userBs->is_recaptcha == 1)
                          <div class="d-block mb-4">
                            {!! NoCaptcha::renderJs() !!}
                            {!! NoCaptcha::display() !!}
                            @error('g-recaptcha-response')
                              <p id="errg-recaptcha-response"class=" text-danger err-g-recaptcha-response mt-2">
                                {{ $message }}
                              </p>
                            @enderror
                          </div>
                        @endif
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            @endif
            @if (count($userFooterQuickLinks) > 0)
              <div class="col-lg-3 col-sm-6 order-3">
                <div class="widget nav-widget">
                  <h4 class="widget-title">{{ $keywords['Quick_Links'] ?? 'Quick Links' }}</h4>
                  <ul>
                    @foreach ($userFooterQuickLinks as $quickLinkInfo)
                      <li>
                        <a href="{{ $quickLinkInfo->url }}">{{ convertUtf8($quickLinkInfo->title) }}</a>
                      </li>
                    @endforeach
                  </ul>
                </div>
              </div>
            @endif
            @if (!is_null($userContact))
              <div class="col-lg-3 order-lg-4 order-5">
                <div class="widget contact-widget">
                  <h4 class="widget-title">{{ $keywords['Contact_Us'] ?? 'Contact Us' }}</h4>
                  <ul class="contact-infos">
                    @php
                      $phone_numbers = !empty($userContact->contact_numbers)
                          ? explode(',', $userContact->contact_numbers)
                          : [];
                      $emails = !empty($userContact->contact_mails) ? explode(',', $userContact->contact_mails) : [];
                      $addresses = !empty($userContact->contact_addresses)
                          ? explode(PHP_EOL, $userContact->contact_addresses)
                          : [];
                    @endphp
                    @if (count($phone_numbers) > 0)
                      <li><i class="far fa-phone mr-0"></i>
                        @foreach ($phone_numbers as $phone_number)
                          <a href="tel: {{ $phone_number }}">{{ $phone_number }}</a>{{ !$loop->last ? ', ' : '' }}
                        @endforeach
                      </li>
                    @endif
                    @if (count($emails) > 0)
                      <li><i class="far fa-envelope-open mr-0"></i>
                        @foreach ($emails as $email)
                          <a href="mailto: {{ $email }}">{{ $email }}</a>{{ !$loop->last ? ', ' : '' }}
                        @endforeach
                      </li>
                    @endif
                    @if (count($addresses) > 0)
                      @foreach ($addresses as $address)
                        <li>
                          <i class="far fa-map-marker-alt mr-0"></i> {{ $address }}
                        </li>
                      @endforeach
                    @endif
                  </ul>
                </div>
              </div>
            @endif
            @if (count($userFooterRecentBlogs) > 0)
              <div class="col-lg-6 col-sm-6 order-lg-5 order-4">
                <div class="widget insta-feed-widget">
                  <h4 class="widget-title">{{ $keywords['Latest_Blogs'] ?? 'Latest Blogs' }}</h4>
                  <div class="post-loops">
                    @foreach ($userFooterRecentBlogs as $footerRecentBlog)
                      <div class="single-post dis-flex mb-4">
                        <div class="post-thumb">
                          <img class="lazy"
                            data-src="{{ asset('assets/front/img/user/blogs/' . $footerRecentBlog->image) }}"
                            alt="Image" height="60" width="80">
                        </div>
                        <div class="post-desc post">
                          <span class="date"><i
                              class="far fa-calendar-alt mar-right-4"></i>{{ \Carbon\Carbon::parse($footerRecentBlog->created_at)->format('F j, Y') }}</span>
                          <a
                            href="{{ route('front.user.blog.detail', [getParam(), $footerRecentBlog->slug, $footerRecentBlog->id]) }}">
                            {{ strlen($footerRecentBlog->title) > 30 ? mb_substr($footerRecentBlog->title, 0, 30, 'UTF-8') . '...' : $footerRecentBlog->title }}
                          </a>
                        </div>
                      </div>
                    @endforeach
                  </div>
                </div>
              </div>
            @endif
          </div>
        @endif
      </div>
      @if (isset($home_sections->copyright_section) && $home_sections->copyright_section == 1)
        <div class="footer-copyright text-center">
          <p class="copyright-text">
            <span>{!! replaceBaseUrl($userFooterData->copyright_text ?? null) !!}</span>
          </p>
          <a href="#" class="back-to-top"><i class="far fa-angle-up"></i></a>
        </div>
      @endif
    </div>

    @if (isset($home_sections->top_footer_section) && $home_sections->top_footer_section == 1)
      <!-- Lines -->
      <img data-src="{{ asset('assets/front/user/img/lines/09.png') }}" alt="line-shape" class="line-three lazy">
      <img data-src="{{ asset('assets/front/user/img/lines/10.png') }}" alt="line-shape" class="line-four lazy">
    @endif
  </footer>
@endif
<!--====== Footer Part end ======-->
