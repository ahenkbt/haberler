<!--====== FOOTER 3 PART START ======-->
<section class="footer-3-area pt-100">
    <div class="container">
        @if (isset($home_sections->top_footer_section) && $home_sections->top_footer_section == 1)
            <div class="row">
                <div class="col-lg-3 col-md-6 col-sm-6">
                    <div class="footer-item mt-30">
                        @if (!empty($userFooterData->logo))
                            <a href="{{ route('front.user.detail.view', getParam()) }}"><img class="lazy"
                                    data-src="{{ asset('assets/front/img/user/footer/' . $userFooterData->logo) }}"
                                    alt="logo"> </a>
                        @endif
                        @if (!empty($userFooterData->about_company))
                            <p>{!! replaceBaseUrl($userFooterData->about_company) ?? null !!}</p>
                        @endif
                        @if (isset($social_medias))
                            <div class="footer-social">
                                <ul>
                                    @foreach ($social_medias as $social_media)
                                        <li>
                                            <a href="{{ $social_media->url }}">
                                                <i class="{{ $social_media->icon }}"></i>
                                            </a>
                                        </li>
                                    @endforeach
                                </ul>
                            </div>
                        @endif
                    </div>
                </div>
                @if (in_array('Service', $packagePermissions) &&
                        isset($home_sections->featured_services_section) &&
                        $home_sections->featured_services_section == 1)
                    <div class="col-lg-3 col-md-6 col-sm-6">
                        <div class="footer-item mt-30">
                            <div class="footer-title">
                                <h4 class="title">{{ $home_text->service_title ?? '' }}</h4>
                            </div>
                            <div class="footer-list">
                                <ul>
                                    @foreach ($fservices as $service)
                                        <li> <i class="{{ $service->icon }}"></i> <a href="#">{{ $service->name }}
                                            </a>
                                        </li>
                                    @endforeach
                                </ul>
                            </div>
                        </div>
                    </div>
                @endif
                @if (count($userFooterQuickLinks) > 0)
                    <div class="col-lg-3 col-md-6 col-sm-6">
                        <div class="footer-item mt-30">
                            <div class="footer-title">
                                <h4 class="title">{{ $keywords['Quick_Links'] ?? 'Quick Links' }}</h4>
                            </div>
                            <div class="footer-list">
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
                    </div>
                @endif
                <div class="col-lg-3 col-md-6 col-sm-6">
                    <div class="footer-item mt-30">
                        <div class="footer-title">
                            <h4 class="title">{{ $keywords['newsletter'] ?? 'NEWSLETTER' }}</h4>
                        </div>
                        <div class="footer-text pt-15">
                            <p>
                                {!! replaceBaseUrl($userFooterData->newsletter_text ?? null) !!}
                            </p>
                        </div>
                        <div class="footer-form">
                            <div class="input-box">
                                <form action="{{ route('front.user.subscriber', getParam()) }}" method="post"
                                    enctype="multipart/form-data">
                                    @csrf
                                    <input name="subscriber_email" required type="text"
                                        placeholder="{{ $keywords['Email_Address'] ?? 'Email Address' }}"
                                        value="{{ old('subscriber_email') }}">
                                        @error('subscriber_email')
                                        <p class="text-danger mt-2">{{ $message }}</p>
                                        @enderror
                                    <div class="form-group mt-3 mb-0">
                                        @if ($userBs->is_recaptcha == 1)
                                            <div class="d-block  ">
                                                {!! NoCaptcha::renderJs() !!}
                                                {!! NoCaptcha::display() !!}
                                                @error('g-recaptcha-response')
                                                    <p
                                                        id="errg-recaptcha-response"class=" text-danger err-g-recaptcha-response ">
                                                        {{ $message }}
                                                    </p>
                                                @enderror
                                            </div>
                                        @endif
                                    </div>
                                    <button type="submit"
                                        class="main-btn">{{ $keywords['SUBSCRIBE'] ?? 'SUBSCRIBE' }}</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        @endif
        @if (isset($home_sections->copyright_section) && $home_sections->copyright_section == 1)
            <div class="row">
                <div class="col-lg-12 text-center">
                    <div class="footer-last justify-content-between align-items-center">
                        <p class="mt-30">{!! replaceBaseUrl($userFooterData->copyright_text ?? null) !!}</p>
                    </div>
                </div>
            </div>
        @endif
    </div>
</section>

<!--====== FOOTER 3 PART ENDS ======-->

<!--====== BACK TO TOP ======-->
<div class="back-to-top">
    <a href="">
        <i class="far fa-angle-up"></i>
    </a>
</div>
<!--====== BACK TO TOP ======-->
