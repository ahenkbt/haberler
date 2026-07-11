@if (isset($home_sections->top_footer_section) && $home_sections->top_footer_section == 1)
  <footer class="olima_footer footer_v1 white_gray_bg pt-100 pb-90">
    <div class="footer_widget">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-lg-4 col-md-6 col-sm-12">
            <div class="widget_box useful_link_widget">
              @if (count($userFooterQuickLinks) > 0)
                <ul class="widget_link">
                  @foreach ($userFooterQuickLinks as $quickLinkInfo)
                    <li>
                      <a href="{{ $quickLinkInfo->url }}"> {{ convertUtf8($quickLinkInfo->title) }}</a>
                    </li>
                  @endforeach
                </ul>
              @endif
              @if (count($social_medias) > 0)
                <ul class="social_link">
                  @foreach ($social_medias as $item)
                    <li>
                      <a href="{{ $item->url }}">
                        <i class="{{ $item->icon }}"></i>
                      </a>
                    </li>
                  @endforeach
                </ul>
              @endif
            </div>
          </div>
          <div class="col-lg-5 col-md-6 col-sm-12">
            <div class="widget_box about_box">
              <a href="{{ route('front.user.detail.view', getParam()) }}">
                <img
                  data-src="@if (isset($userFooterData) && $userFooterData->logo) {{ asset('assets/front/img/user/footer/' . $userFooterData->logo) }} @endif "
                  class="img-fluid lazy" alt="website footer logo">
              </a>
              @if (isset($userFooterData))
                <p>{{ $userFooterData->about_company }}</p>
              @endif
            </div>
          </div>
          @if (isset($home_sections->copyright_section) && $home_sections->copyright_section == 1)
            <div class="col-lg-3 col-md-6 col-sm-12">
              <div class="widget_box copyright_box">
                @if (isset($userFooterData))
                  <p>
                    <span style="color:rgb(102,102,102);font-family:Roboto;font-size:14px;text-align:right;">
                      {!! $userFooterData->copyright_text !!}</span>
                    <br>
                  </p>
                @endif
              </div>
            </div>
          @endif
        </div>
      </div>
    </div>
  </footer>
@endif
