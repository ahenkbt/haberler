<!-- footer-aria-html-code -->
<footer class="nusafe-footer footer-v1 black-bg">
  <div class="container">
    <div class="container">
      <div class="footer-widgets-area">
        <div class="row">
          <div class="col-lg-3 col-md-6">
            <div class="widget contact-widget">
              <div class="contact-content">
                <a class="footer-logo d-block mb-4" href="{{ route('front.user.detail.view', getParam()) }}">
                  <img class="lazy img-fluid"
                    data-src="@if (isset($userFooterData) && $userFooterData->logo) {{ asset('assets/front/img/user/footer/' . $userFooterData->logo) }} @endif "
                    alt="Footer Logo">
                </a>
                <p>
                  @if (isset($userFooterData))
                    {{ $userFooterData->about_company }}
                  @endif
                </p>
              </div>
            </div>
          </div>

          @if (count($userFooterQuickLinks) > 0)
            <div class="col-lg-2 col-md-6 col-sm-6">
              <div class="widget nav-widget pl-lg-4">
                <h4 class="widget-title">{{ $keywords['Quick_Links'] ?? 'Quick Links' }}</h4>
                <ul>
                  @foreach ($userFooterQuickLinks as $quickLinkInfo)
                    <li> <a href="{{ $quickLinkInfo->url }}">
                        {{ convertUtf8($quickLinkInfo->title) }}
                      </a> </li>
                  @endforeach
                </ul>
              </div>
            </div>
          @endif
          @if (count($userFooterRecentBlogs) > 0)
            <div class="col-lg-3 col-md-6 col-sm-6">
              <div class="widget nav-widget">
                <h4 class="widget-title">{{ $keywords['Latest_Blogs'] ?? 'Latest Blogs' }}</h4>
                <ul>
                  @foreach ($userFooterRecentBlogs as $blog)
                    <li>
                      <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">
                        {{ strlen($blog->title) > 35 ? mb_substr($blog->title, 0, 35, 'UTF-8') . '...' : $blog->title }}
                      </a>
                    </li>
                  @endforeach
                </ul>
              </div>
            </div>
          @endif
          @if (isset($home_sections->newsletter_section) && $home_sections->newsletter_section == 1)
            <div class="col-lg-4 col-md-6">
              <div class="widget newsletters-widget pl-xl-4">
                <h4 class="widget-title">{{ @$home_text->newsletter_title }}</h4>
                <p> {{ @$home_text->newsletter_subtitle }} </p>
                <div class="newsletter-form">
                  <form action="{{ route('front.user.subscriber', getParam()) }}" method="post"
                    enctype="multipart/form-data">
                    @csrf
                    <div class="form-inner position-relative">
                      <input type="email" placeholder="{{ $keywords['Email_Address'] ?? 'Email Address' }}"
                        name="subscriber_email" required="" value="{{ old('subscriber_email') }}">
                      @error('subscriber_email')
                        <p class="text-danger mt-2">{{ $message }}</p>
                      @enderror
                      <button type="submit">{{ $keywords['Subscribe'] ?? 'Subscribe' }}</ <i
                          class="far fa-long-arrow-right"></i></button>
                    </div>
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
                @if (count($social_medias) > 0)
                  <ul class="social-links">
                    <li><span> {{ $keywords['Follow'] ?? 'Follow' }}</span></li>
                    @foreach ($social_medias as $item)
                      <li>
                        <a href="{{ $item->url }}"> <i class="{{ $item->icon }}"></i>
                        </a>
                      </li>
                    @endforeach
                  </ul>
                @endif
              </div>
            </div>
          @endif
        </div>
      </div>
      @if (isset($home_sections->copyright_section) && $home_sections->copyright_section == 1)
        <div class="copyright-area">
          @if (isset($userFooterData))
            {!! $userFooterData->copyright_text !!}
          @endif
        </div>
      @endif
    </div>
  </div>
</footer>
