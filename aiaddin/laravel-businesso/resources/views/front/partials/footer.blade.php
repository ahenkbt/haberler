<!--====== Start Footer ======-->
<footer class="footer-area bg-primary-light">
    @if ($bs->top_footer_section == 1)
        <div class="footer-top pt-120 pb-90">
            <div class="container">
                <div class="row gx-xl-5 justify-content-between">
                    <div class="col-xl-3 col-lg-4 col-md-6 col-sm-12">
                        <div class="footer-widget" data-aos="fade-up" data-aos-delay="100">
                            <div class="navbar-brand">
                                <a href="{{ route('front.index') }}">
                                    <img class="lazyload" data-src="{{ asset('assets/front/img/' . $bs->footer_logo) }}"
                                        alt="">
                                </a>
                            </div>
                            <p>{{ $bs->footer_text }}</p>
                        </div>
                    </div>
                    @php
                        $ulinks = App\Models\Ulink::where('language_id', $currentLang->id)
                            ->orderby('id', 'desc')
                            ->get();
                    @endphp
                    <div class="col-xl-2 col-lg-2 col-md-3 col-sm">
                        <div class="footer-widget" data-aos="fade-up" data-aos-delay="200">
                            <h5>{{ $bs->useful_links_title }}</h5>
                            <ul class="footer-links">
                                @foreach ($ulinks as $ulink)
                                    <li><a href="{{ $ulink->url }}">{{ $ulink->name }}</a></li>
                                @endforeach
                            </ul>
                        </div>
                    </div>
                    <div class="col-xl-3 col-lg-4 col-md-6 col-sm-12">
                        <div class="footer-widget" data-aos="fade-up" data-aos-delay="400">
                            <h5>{{ __('Contact Us') }}</h5>
                            <ul class="info-list">
                                <li>
                                    <i class="fal fa-map-marker-alt"></i>
                                    @php
                                        $addresses = explode(PHP_EOL, $be->contact_addresses);
                                    @endphp
                                    <span>
                                        @foreach ($addresses as $address)
                                            {{ $address }}
                                            @if (!$loop->last)
                                                |
                                            @endif
                                        @endforeach
                                    </span>
                                </li>

                                <li>
                                    <i class="fal fa-phone-plus"></i>
                                    <div>
                                        @php
                                            $phones = explode(',', $be->contact_numbers);
                                        @endphp
                                        @foreach ($phones as $phone)
                                            <a href="tel:{{ $phone }}" title="{{ $phone }}">
                                                {{ $phone }}
                                            </a>
                                            @if (!$loop->last)
                                                ,
                                            @endif
                                        @endforeach
                                    </div>
                                </li>
                                <li>
                                    <i class="fal fa-envelope"></i>
                                    <div>
                                        @php
                                            $mails = explode(',', $be->contact_mails);
                                        @endphp
                                        @foreach ($mails as $mail)
                                            <a href="mailto:{{ $mail }}" title="{{ $mail }}">
                                                {{ $mail }}
                                            </a>
                                            @if (!$loop->last)
                                                ,
                                            @endif
                                        @endforeach
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div class="col-xl-3 col-lg-4 col-md-6 col-sm-12">
                        <div class="footer-widget" data-aos="fade-up" data-aos-delay="300">
                            <h5>{{ $bs->newsletter_title }}</h5>
                            <p class="lh-1 mb-20">{{ $bs->newsletter_subtitle }}</p>
                            <div class="newsletter-form">
                                <form id="newsletterForm" class="subscribeForm" action="{{ route('front.subscribe') }}"
                                    method="POST">
                                    @csrf
                                    <div class="form-group">
                                        <input class="form-control radius-sm"
                                            placeholder="{{ __('Enter Your Email') }}" type="email" name="email"
                                            required="" autocomplete="off">
                                        <button class="newsletter-btn btn btn-md btn-primary radius-sm no-animation"
                                            type="submit"><i class="fal fa-paper-plane"></i></button>
                                    </div>
                                    <p id="erremail" class="text-danger mb-0 err-email"></p>
                                    <div class="form-group mt-3 ">
                                        @if ($bs->is_recaptcha == 1)
                                            <div class="d-block mb-4">
                                                {!! NoCaptcha::renderJs() !!}
                                                {!! NoCaptcha::display() !!}

                                                <p
                                                    id="errg-recaptcha-response"class=" text-danger err-g-recaptcha-response mt-2">
                                                </p>

                                            </div>
                                        @endif
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    @endif
    @if ($bs->copyright_section == 1)
        <div class="copy-right-area border-top">
            <div class="container">
                <div class="copy-right-content">
                    <div class="social-link justify-content-center mb-2">
                        @foreach ($socials as $social)
                            <a href="{{ $social->url }}" target="_blank" title="instagram"><i
                                    class="{{ $social->icon }}"></i></a>
                        @endforeach

                    </div>

                    <span>
                        {!! replaceBaseUrl($bs->copyright_text) !!}
                    </span>
                </div>
            </div>
        </div>
    @endif
</footer>
<!--====== End Footer ======-->
