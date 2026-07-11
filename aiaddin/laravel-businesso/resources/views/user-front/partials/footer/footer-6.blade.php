   <!--====== Start Footer ======-->
   @php
     Config::set('app.timezone', $userBs->timezoneinfo->timezone);
   @endphp
   <footer class="footer-area">
     <div
       data-bg="{{ isset($userFooterData->bg_image) ? asset('assets/front/img/user/footer/' . $userFooterData->bg_image) : asset('assets/front/img/static/lawyer/footer-bg-1.jpg') }}"
       class="footer-wrapper-one lazy position-relative bg_cover pb-30">
       <div class="container">
         @if (isset($home_sections->top_footer_section) && $home_sections->top_footer_section == 1)
           <div class="footer-widget pt-80 pb-20">
             <div class="row">
               <div class="col-lg-3 col-md-6 col-sm-12">
                 <div class="widget about-widget mb-55 wow fadeInUp" data-wow-delay=".2s">

                   @if (isset($userFooterData->logo))
                     <a class="footer-logo" href="{{ route('front.user.detail.view', getParam()) }}">
                       <img class="lazy"
                         data-src="{{ asset('assets/front/img/user/footer/' . $userFooterData->logo) }}"
                         alt="Footer Logo">
                     </a>
                   @endif
                   @if (!empty($userFooterData->about_company))
                     <p>{!! replaceBaseUrl($userFooterData->about_company) ?? null !!}</p>
                   @endif
                   <div class="share">
                     <h4>{{ $keywords['Follow'] ?? 'Follow' }}</h4>
                     <ul class="social-link">
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
               @if (count($userFooterQuickLinks) > 0)
                 <div class="col-lg-3 col-md-6 col-sm-12">
                   <div class="widget footer-nav-widget mb-55 wow fadeInUp" data-wow-delay=".3s">
                     <h4 class="widget-title">{{ $keywords['Quick_Links'] ?? 'Quick Links' }}</h4>
                     <ul class="widget-link">
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
                 <div class="col-lg-3 col-md-6 col-sm-12">
                   <div class="widget recent-post-widget mb-55 wow fadeInUp" data-wow-delay=".4s">
                     <h4 class="widget-title">{{ $keywords['Latest_Blogs'] ?? 'Latest Blogs' }}</h4>
                     <ul class="post-widget-list">
                       @foreach ($userFooterRecentBlogs as $footerRecentBlog)
                         <li class="post-thumbnail-content">
                           <img class="lazy"
                             data-src="{{ asset('assets/front/img/user/blogs/' . $footerRecentBlog->image) }}"
                             class="img-fluid" alt="">
                           <div class="post-title-date">
                             <h6>
                               <a
                                 href="{{ route('front.user.blog.detail', [getParam(), $footerRecentBlog->slug, $footerRecentBlog->id]) }}">
                                 {{ strlen($footerRecentBlog->title) > 30 ? mb_substr($footerRecentBlog->title, 0, 30, 'UTF-8') . '...' : $footerRecentBlog->title }}
                               </a>
                             </h6>
                             <span class="posted-on"><i class="far fa-calendar-alt"></i><a
                                 href="{{ route('front.user.blog.detail', [getParam(), $footerRecentBlog->slug, $footerRecentBlog->id]) }}">{{ \Carbon\Carbon::parse($footerRecentBlog->created_at)->format('F j, Y') }}</a></span>
                           </div>
                         </li>
                       @endforeach
                     </ul>
                   </div>
                 </div>
               @endif
               <div class="col-lg-3 col-md-6 col-sm-12">
                 <div class="widget contact-info-widget mb-55 wow fadeInUp" data-wow-delay=".5s">
                   <h4 class="widget-title">{{ $keywords['Contact_Us'] ?? 'Contact Us' }}</h4>
                   @php
                     $phone_numbers = !empty($userContact->contact_numbers)
                         ? explode(',', $userContact->contact_numbers)
                         : [];
                     $emails = !empty($userContact->contact_mails) ? explode(',', $userContact->contact_mails) : [];
                     $addresses = !empty($userContact->contact_addresses)
                         ? explode(PHP_EOL, $userContact->contact_addresses)
                         : [];
                   @endphp
                   <div class="info-widget-content mb-10">
                     @if (count($phone_numbers) > 0)
                       <p>
                         <i class="fal fa-phone"></i>
                         @foreach ($phone_numbers as $phone_number)
                           <a href="tel: {{ $phone_number }}">{{ $phone_number }}</a>{{ !$loop->last ? ', ' : '' }}
                         @endforeach
                       </p>
                     @endif
                     @if (count($emails) > 0)
                       <p>
                         <i class="fal fa-envelope"></i>
                         @foreach ($emails as $email)
                           <a
                             href="mailto: {{ $email }}">{{ $email }}</a>{{ !$loop->last ? ', ' : '' }}
                         @endforeach
                       </p>
                     @endif
                     @if (count($addresses) > 0)
                       <p>
                         <i class="fal fa-map-marker-alt"></i>
                         @foreach ($addresses as $address)
                           <span>{{ $address }}</span>{{ !$loop->last ? ' | ' : '' }}
                         @endforeach
                       </p>
                     @endif
                   </div>
                   {{-- <div class="info-widget-content">
                                   <h4>Opening Hour</h4>
                                   <p><i class="fal fa-clock"></i>Sun - Friday, 09 am - 08 pm</p>
                                   <h5>Satarday Closed</h5>
                               </div> --}}
                 </div>
               </div>
             </div>
           </div>
         @endif
         @if (isset($home_sections->copyright_section) && $home_sections->copyright_section == 1)
           <div class="footer-copyright">
             <div class="row">
               <div class="col-lg-12">
                 <div class="copyright-text text-center">
                   <p>{!! replaceBaseUrl($userFooterData->copyright_text ?? null) !!}</p>
                 </div>
               </div>
             </div>
           </div>
         @endif
       </div>
       <a href="#" class="back-to-top" style="display: inline-block;"><i class="fas fa-angle-up"></i></a>
     </div>
   </footer>
   <!--====== End Footer ======-->
