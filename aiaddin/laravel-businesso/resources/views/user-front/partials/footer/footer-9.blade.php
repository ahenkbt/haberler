<!-- Footer Start -->
<footer>
  <div class="container">
    @if (isset($home_sections->top_footer_section) && $home_sections->top_footer_section == 1)
      <div class="footer-top">
        <div class="row">
          <div class="col-lg-4 col-md-6">
            <div class="widget footer-widget">
              @if (isset($userFooterData->logo))
                <div class="footer-logo">
                  <img class="lazy" data-src="{{ asset('assets/front/img/user/footer/' . $userFooterData->logo) }}"
                    alt="footer logo">
                </div>
              @endif
              @if (!empty($userFooterData->about_company))
                <p>{!! replaceBaseUrl($userFooterData->about_company) ?? null !!}</p>
              @endif
              @if (isset($social_medias))
                <ul class="social-icons">
                  @foreach ($social_medias as $social_media)
                    <li>
                      <a href="{{ $social_media->url }}">
                        <i class="{{ $social_media->icon }}"></i>
                      </a>
                    </li>
                  @endforeach
                </ul>
              @endif
            </div>
          </div>
          @if (count($userFooterQuickLinks) > 0)
            <div class="col-lg-4 col-md-6">
              <div class="widget footer-widget">
                <h4 class="widget-title">{{ $keywords['Quick_Links'] ?? 'Quick Links' }}</h4>
                <ul class="nav-widget clearfix">
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
            <div class="col-lg-4">
              <div class="widget footer-widget">
                <h4 class="widget-title">{{ $keywords['Recent_Blogs'] ?? __('Recent Blogs') }}</h4>
                <ul class="recent-post">
                  @foreach ($userFooterRecentBlogs as $footerBlogInfo)
                    <li>
                      <h6>
                        <a
                          href="{{ route('front.user.blog.detail', [getParam(), $footerBlogInfo->slug, $footerBlogInfo->id]) }}">
                          {{ strlen($footerBlogInfo->title) > 40 ? mb_substr($footerBlogInfo->title, 0, 40, 'UTF-8') . '...' : $footerBlogInfo->title }}
                        </a>
                      </h6>

                      <span class="recent-post-date">{{ date_format($footerBlogInfo->created_at, 'F d, Y') }}</span>
                    </li>
                  @endforeach

                </ul>
              </div>
            </div>
          @endif
        </div>
      </div>
    @endif
    @if (isset($home_sections->copyright_section) && $home_sections->copyright_section == 1)
      <div class="footer-bottom">
        <div class="row text-center">
          <div class="col-md-12">
            <p class="copy-right text-center">
            <p>{!! replaceBaseUrl($userFooterData->copyright_text ?? null) !!}</p>
          </div>
        </div>
      </div>
    @endif
  </div>
</footer>
<!-- Footer End -->
