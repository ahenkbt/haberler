    <!--====== FOOTER PART START ======-->
    <footer class="footer-area">
        <div class="container">
            @if (isset($home_sections->top_footer_section) && $home_sections->top_footer_section == 1)
                <div class="row pb-5">
                    <div class="col-lg-4 col-md-5">
                        <div class="footer-item about-footer-item mt-30">
                            @if (isset($userFooterData->logo))
                                <div class="footer-title">
                                    <img data-src="{{ asset('assets/front/img/user/footer/' . $userFooterData->logo) }}"
                                        class="lazy" alt="website logo">
                                </div>
                            @endif
                            <div class="about-content">

                                @if (!empty($userFooterData->about_company))
                                    <p>{!! replaceBaseUrl($userFooterData->about_company) ?? null !!}</p>
                                @endif

                            </div>
                        </div>
                    </div>
                    @if (count($userFooterQuickLinks) > 0)
                        <div class="col-lg-4 col-md-7">
                            <div class="footer-item mt-30">
                                <div class="footer-title item-2">
                                    <i class="fal fa-link"></i>
                                    <h4 class="title"> {{ $keywords['Useful_Links'] ?? 'Useful Links' }} </h4>
                                </div>
                                <div class="footer-list-area">
                                    <div class="footer-list d-block d-sm-flex">
                                        <ul>
                                            @foreach ($userFooterQuickLinks as $quickLinkInfo)
                                                <li>
                                                    <a href="{{ $quickLinkInfo->url }}" target="_blank">
                                                        <i class="fal fa-angle-right"></i>
                                                        {{ convertUtf8($quickLinkInfo->title) }}
                                                    </a>
                                                </li>
                                            @endforeach

                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    @endif
                    <div class="col-lg-4">
                        @if (count($userFooterRecentBlogs) > 0)
                            <div class="footer-item mt-30">
                                <div class="footer-title item-3">
                                    <i class="fal fa-blog"></i>
                                    <h4 class="title">{{ $keywords['Latest_Blogs'] ?? __('Latest Blogs') }}</h4>
                                </div>
                                <div class="footer-instagram">
                                    <div class="instagram-item">
                                        @foreach ($userFooterRecentBlogs as $footerBlogInfo)
                                            <div class="item mt-20 d-flex align-items-center">
                                                <div class="blog-img mr-4">
                                                    <img data-src="{{ asset('assets/front/img/user/blogs/' . $footerBlogInfo->image) }}"
                                                        class="lazy" alt="image">
                                                </div>

                                                <div class="blog-info">
                                                    <h6 class="blog-title">
                                                        <a
                                                            href="{{ route('front.user.blog.detail', [getParam(), 'slug' => $footerBlogInfo->slug, 'id' => $footerBlogInfo->id]) }}">
                                                            {{ strlen($footerBlogInfo->title) > 40 ? mb_substr($footerBlogInfo->title, 0, 40, 'UTF-8') . '...' : $footerBlogInfo->title }}
                                                        </a>
                                                    </h6>
                                                    <span class="mt-1">
                                                        {{ date_format($footerBlogInfo->created_at, 'F d, Y') }} </span>
                                                </div>
                                            </div>
                                        @endforeach
                                    </div>
                                </div>
                            </div>
                        @endif
                    </div>
                </div>
            @endif
            @if (isset($home_sections->copyright_section) && $home_sections->copyright_section == 1)
                <div class="row border-top text-center pt-5">
                    <div class="col">
                        <p class="text-light">
                            {!! replaceBaseUrl($userFooterData->copyright_text ?? null) !!}
                        </p>
                    </div>
                </div>
            @endif
        </div>
    </footer>
    <!--====== FOOTER PART ENDS ======-->
