 <!-- ========= Start Footer ========= -->
 @if (isset($home_sections->top_footer_section) && $home_sections->top_footer_section == 1)
   <footer class="footer border-top pt-60 bg-cover bg-img"
     data-bg-image="{{ isset($userFooterData->bg_image) ? asset('assets/front/img/user/footer/' . $userFooterData->bg_image) : asset('assets/front/img/static/lawyer/footer-bg-1.jpg') }}">
     <div class="container">
       <div class="footer-top">
         <div class="row">
           <div class="col-xl-3 col-lg-3">
             <div class="footer-widget mb-30">
               <!-- logo -->
               <div class="footer-logo mb-24">
                 <a href="{{ route('front.user.detail.view', getParam()) }}">
                   <img class="lazyload blur-up"
                     src="@if (isset($userFooterData) && $userFooterData->logo) {{ asset('assets/front/img/user/footer/' . $userFooterData->logo) }} @endif "
                     alt="logo">
                 </a>
               </div>
               @if (isset($userFooterData))
                 <p class="fw-medium mb-20">{{ $userFooterData->about_company }}</p>
               @endif
             </div>
           </div>
           @if (count($userFooterQuickLinks) > 0)
             <div class="col-xl-3 col-lg-3 col-sm-6">
               <!-- footer-widget -->
               <div class="footer-widget mb-30">
                 <h5 class="mb-24 fw-semibold">{{ $keywords['Quick_Links'] ?? 'Quick Links' }}</h5>
                 <div class="footer-widget-item">
                   <ul class="reset-ul">
                     @foreach ($userFooterQuickLinks as $quickLinkInfo)
                       <li><a class="mb-2 fw-medium" href="{{ $quickLinkInfo->url }}">
                           {{ convertUtf8($quickLinkInfo->title) }}</a></li>
                     @endforeach
                   </ul>
                 </div>
               </div>
             </div>
           @endif
           <div class="col-xl-3 col-lg-3 col-sm-6">
             <!-- footer-widget -->
             <div class="footer-widget mb-30">
               <h5 class="mb-24 fw-semibold">{{ $keywords['Category'] ?? 'Category' }}</h5>
               <div class="footer-widget-item">
                 <ul class="reset-ul">
                   @foreach ($footerCategories as $category)
                     <li><a class="mb-2 fw-medium"
                         href="{{ route('front.user.shop', getParam()) . '?category=' . urlencode($category->slug) }}">{{ $category->name }}</a>
                     </li>
                   @endforeach
                 </ul>
               </div>
             </div>
           </div>

           <div class="col-xl-3 col-lg-3 col-sm-6">
             <!-- footer-widget -->
             <div class="footer-widget mb-30">
               <h5 class="mb-24 fw-semibold"> {{ $keywords['SUBSCRIBE_FOR_NEWSLETTER'] ?? 'SUBSCRIBE FOR NEWSLETTER' }}
               </h5>
               <div class="footer-subscribe-widget mb-24">
                 <form action="{{ route('front.user.subscriber', getParam()) }}" method="post"
                   enctype="multipart/form-data">
                   @csrf
                   <div class="subscribe-group-btn subscribe">
                     <input type="email" placeholder="{{ $keywords['Email_Address'] ?? 'Email Address' }}"
                       name="subscriber_email" required value="{{ old('subscriber_email') }}">
                     @error('subscriber_email')
                       <p class="text-danger mt-2">{{ $message }}</p>
                     @enderror
                     <button type="submit" class="subscribe-btn">{{ $keywords['Subscribe'] ?? 'Subscribe' }}</button>
                   </div>
                 </form>
               </div>
               @if (isset($social_medias))
                 <div class="socials mb-3">
                   @foreach ($social_medias as $social_media)
                     @php
                       $class_name = str_replace(['fab fa-', 'fas fa-', 'far fa-', '-f'], '', $social_media->icon);
                     @endphp
                     <a target="_blank" class="{{ $class_name }}" href="{{ $social_media->url }}"><i
                         class="{{ $social_media->icon }}"></i></a>
                   @endforeach
                 </div>
               @endif
             </div>
           </div>
         </div>
       </div>
     </div>
     <div class="footer-copyright border-top">

       <!-- footer-copyright -->
       @if (isset($home_sections->copyright_section) && $home_sections->copyright_section == 1)
         <div class="container">
           <div class="row">
             <div class="col-12">
               <div class="copyright-content text-center">
                 @if (isset($userFooterData))
                   {!! $userFooterData->copyright_text !!}
                 @endif
               </div>
             </div>
           </div>
         </div>
       @endif
     </div>
   </footer>
 @endif
 <!-- ========= End Footer ========= -->
