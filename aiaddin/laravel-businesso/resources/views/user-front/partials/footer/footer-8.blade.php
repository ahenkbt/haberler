 <!--====== FOOTER PART START ======-->

 <footer class="footer-area">
   @if (isset($home_sections->top_footer_section) && $home_sections->top_footer_section == 1)
     <div class="main-footer pt-90 pb-70">
       <div class="container">
         <div class="row">
           <div class="col-lg-4 col-md-4 col-sm-7">
             <div class="footer-about">
               @if (isset($userFooterData->logo))
                 <a href="{{ route('front.user.detail.view', getParam()) }}" class="footer-logo">
                   <img class="lazy" data-src="{{ asset('assets/front/img/user/footer/' . $userFooterData->logo) }}"
                     alt="Footer Logo">
                 </a>
               @endif
               @if (!empty($userFooterData->about_company))
                 <p>{!! replaceBaseUrl($userFooterData->about_company) ?? null !!}</p>
               @endif
             </div>
           </div>
           @if (count($userFooterQuickLinks) > 0)
             <div class="col-lg-4 col-md-4 col-sm-6">
               <div class="footer-list">
                 <div class="footer-list-title">
                   <h4 class="widget-title">{{ $keywords['Quick_Links'] ?? 'Quick Links' }}</h4>
                 </div>
                 <div class="footer-list-item">
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
           @if (isset($userContact))
             <div class="col-lg-4 col-md-4 col-sm-12">
               <div class="footer-contact-widget">
                 <h4 class="widget-title">{{ $keywords['Contact_Us'] ?? 'Contact Us' }}</h4>
                 <div class="contact-info">

                   @php
                     $phone_numbers = !empty($userContact->contact_numbers)
                         ? explode(',', $userContact->contact_numbers)
                         : [];
                     $emails = !empty($userContact->contact_mails) ? explode(',', $userContact->contact_mails) : [];
                     $addresses = !empty($userContact->contact_addresses)
                         ? explode(PHP_EOL, $userContact->contact_addresses)
                         : [];
                   @endphp
                   @if (count($addresses) > 0)
                     @foreach ($addresses as $address)
                       <p>
                         <i class="fas fa-map-marker-alt"></i>{{ $address }}
                       </p>
                     @endforeach
                   @endif
                   @if (count($emails) > 0)
                     <p><i class="fas fa-envelope"></i>
                       <span>
                         @foreach ($emails as $email)
                           <a href="mailto: {{ $email }}">{{ $email }}</a>{{ !$loop->last ? ', ' : '' }}
                         @endforeach
                       </span>
                     </p>
                   @endif
                   @if (count($phone_numbers) > 0)
                     <p>
                       <i class="fas fa-mobile-alt"></i>
                       <span>
                         @foreach ($phone_numbers as $phone_number)
                           <a href="tel: {{ $phone_number }}">{{ $phone_number }}</a>{{ !$loop->last ? ', ' : '' }}
                         @endforeach
                       </span>
                     </p>
                   @endif
                 </div>
               </div>
             </div>
           @endif
         </div>
       </div>
     </div>
   @endif

   @if (isset($home_sections->copyright_section) && $home_sections->copyright_section == 1)
     <div class="footer-copyright">
       <div class="container">
         <div class="col-lg-12">
           <div class="footer-copyright-item text-center">
             <p>{!! replaceBaseUrl($userFooterData->copyright_text ?? null) !!} </p>
           </div>
         </div>
       </div>
     </div>
   @endif
 </footer>

 <!--====== FOOTER PART ENDS ======-->

 <!--====== GO TO TOP PART START ======-->

 <div class="go-top-area">
   <div class="go-top-wrap">
     <div class="go-top-btn-wrap">
       <div class="go-top go-top-btn">
         <i class="fa fa-angle-double-up"></i>
         <i class="fa fa-angle-double-up"></i>
       </div>
     </div>
   </div>
 </div>

 <!--====== GO TO TOP PART ENDS ======-->
