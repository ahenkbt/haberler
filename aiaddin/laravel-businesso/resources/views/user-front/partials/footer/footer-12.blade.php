 @php
   $emails = !empty($userContact->contact_mails) ? explode(',', $userContact->contact_mails) : [];
 @endphp
 <footer class="footer-area">
   <div class="footer-wrapper-one">
     <div class="container">
       <div class="row justify-content-center">
         <div class="col-lg-8">
           <div class="footer-content text-center">
             <span class="sub-title">{{ $keywords['Stay_Connected'] ?? __('Stay Connected') }} </span>
             @if (count($emails) > 0)
               @foreach ($emails as $email)
                 @if ($loop->last)
                   <h5> <a href="mailto: {{ $email }}"> <i class="ti-email"></i>
                       {{ $email }} </a></h5>
                 @endif
               @endforeach
             @endif
             @if (isset($social_medias))
               <ul class="social-link">
                 @foreach ($social_medias as $social_media)
                   <li><a href="{{ $social_media->url }}"><i class="{{ $social_media->icon }}"></i></a>
                   </li>
                 @endforeach
               </ul>
             @endif
           </div>
         </div>
       </div>
     </div>
   </div>
 </footer>
