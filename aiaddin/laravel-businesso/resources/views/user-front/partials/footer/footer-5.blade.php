  <!--====== Template Footer Start ======-->
  <footer class="template-footer bg-color-secondary text-white-version">

      <div class="container">
          @if (isset($home_sections->top_footer_section) && $home_sections->top_footer_section == 1)
              <div class="footer-widgets-area">
                  <div class="row">
                      <div class="col-lg-3 col-md-6">
                          <div class="widget contact-widget">
                              <div class="contact-content">
                                  @if (isset($userFooterData->logo))
                                      <a class="footer-logo mb-4"
                                          href="{{ route('front.user.detail.view', getParam()) }}">
                                          <img class="lazy"
                                              data-src="{{ asset('assets/front/img/user/footer/' . $userFooterData->logo) }}"
                                              alt="Footer Logo">
                                      </a>
                                  @endif
                                  @if (!empty($userFooterData->about_company))
                                      <p>{!! replaceBaseUrl($userFooterData->about_company) ?? null !!}</p>
                                  @endif
                              </div>
                          </div>
                      </div>
                      @if (count($userFooterQuickLinks) > 0)
                          <div class="col-lg-3 col-md-6 col-sm-6">
                              <div class="widget nav-widget pl-lg-4">
                                  <h4 class="widget-title">{{ $keywords['Quick_Links'] ?? 'Quick Links' }}</h4>
                                  <ul>
                                      @foreach ($userFooterQuickLinks as $quickLinkInfo)
                                          <li>
                                              <a href="{{ $quickLinkInfo->url }}">
                                                  {{ convertUtf8($quickLinkInfo->title) }}
                                              </a>
                                          </li>
                                      @endforeach
                                  </ul>
                              </div>
                          </div>
                      @endif
                      @if (count($userFooterRecentBlogs) > 0)
                          <div class="col-lg-2 col-md-6 col-sm-6">
                              <div class="widget nav-widget">
                                  <h4 class="widget-title">{{ $keywords['Latest_Blogs'] ?? 'Latest Blogs' }}</h4>
                                  <ul>
                                      @foreach ($userFooterRecentBlogs as $footerRecentBlog)
                                          <li><a
                                                  href="{{ route('front.user.blog.detail', [getParam(), $footerRecentBlog->slug, $footerRecentBlog->id]) }}">
                                                  {{ strlen($footerRecentBlog->title) > 30 ? mb_substr($footerRecentBlog->title, 0, 30, 'UTF-8') . '...' : $footerRecentBlog->title }}
                                              </a></li>
                                      @endforeach
                                  </ul>
                              </div>
                          </div>
                      @endif
                      <div class="col-lg-4 col-md-6">
                          <div class="widget newsletters-widget pl-xl-4">
                              <h4 class="widget-title">{{ $keywords['newsletter'] ?? 'NEWSLETTER' }}</h4>
                              <p>
                                  {!! replaceBaseUrl($userFooterData->newsletter_text ?? null) !!}
                              </p>
                              <div class="newsletter-form">
                                  <form action="{{ route('front.user.subscriber', getParam()) }}" method="post"
                                      enctype="multipart/form-data">
                                      @csrf
                                      <div class="form-inner position-relative">
                                          <input type="email"
                                              placeholder="{{ $keywords['Email_Address'] ?? 'Email Address' }}"
                                              name="subscriber_email" required value="{{ old('subscriber_email') }}">
                                              @error('subscriber_email')
                                              <p class="text-danger mt-2">{{ $message }}</p>
                                              @enderror
                                          <button type="submit">{{ $keywords['SUBSCRIBE'] ?? 'SUBSCRIBE' }} <i
                                                  class="far fa-long-arrow-right"></i></button>
                                      </div>
                                      <div class="form-group mt-3 ">
                                          @if ($userBs->is_recaptcha == 1)
                                              <div class="d-block mb-4">
                                                  {!! NoCaptcha::renderJs() !!}
                                                  {!! NoCaptcha::display() !!}
                                                  @error('g-recaptcha-response')
                                                      <p
                                                          id="errg-recaptcha-response"class=" text-danger err-g-recaptcha-response mt-2">
                                                          {{ $message }}
                                                      </p>
                                                  @enderror
                                              </div>
                                          @endif
                                      </div>
                                  </form>
                              </div>
                              <ul class="social-links">
                                  <li><span>{{ $keywords['Follow'] ?? 'Follow' }}</span></li>
                                  @if (isset($social_medias))
                                      @foreach ($social_medias as $social_media)
                                          <li>
                                              <a href="{{ $social_media->url }}">
                                                  <i class="{{ $social_media->icon }}"></i>
                                              </a>
                                          </li>
                                      @endforeach
                                  @endif
                              </ul>
                          </div>
                      </div>
                  </div>
              </div>
          @endif
          @if (isset($home_sections->copyright_section) && $home_sections->copyright_section == 1)
              <div class="copyright-area">
                  {!! replaceBaseUrl($userFooterData->copyright_text ?? null) !!}
              </div>
          @endif
      </div>
  </footer>
  <!--====== Template Footer End ======-->
