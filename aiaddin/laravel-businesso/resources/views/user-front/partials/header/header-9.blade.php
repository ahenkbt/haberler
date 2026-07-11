 @php
     
     $phone_numbers = !empty($userContact->contact_numbers) ? explode(',', $userContact->contact_numbers) : [];
     $emails = !empty($userContact->contact_mails) ? explode(',', $userContact->contact_mails) : [];
 @endphp
 <header>
     <div class="header-top-area section-bg">
         <div class="container-fluid">
             <div class="row align-items-center">
                 <div class="col-xl-4 col-lg-7 offset-xl-3 col-md-6 d-md-block d-none">
                     <ul class="top-contact-info list-inline">
                         <li>
                             <i class="far fa-map-marker-alt"></i>{{ @$userContact->contact_addresses }}
                         </li>
                         @if (count($phone_numbers) > 0)
                             @foreach ($phone_numbers as $phone_number)
                                 @if ($loop->last)
                                     <li>
                                         <i class="far fa-phone"></i>
                                         {{ $phone_number }}
                                     </li>
                                 @endif
                             @endforeach
                         @endif

                     </ul>
                 </div>
                 <div class="col-xl-5 col-lg-5 col-md-6">
                     <div class="top-right">
                         <ul class="top-menu list-inline d-inline">
                             @if (in_array('Ecommerce', $packagePermissions) ||
                                     in_array('Hotel Booking', $packagePermissions) ||
                                     in_array('Course Management', $packagePermissions) ||
                                     in_array('Donation Management', $packagePermissions))
                                 @guest('customer')
                                     <li>
                                         <a href="{{ route('customer.login', getParam()) }}">
                                             <i class="fas fa-sign-in-alt mr-2"></i> {{ $keywords['Login'] ?? __('Login') }}
                                         </a>
                                     </li>
                                     <li>
                                         <a href="{{ route('customer.signup', getParam()) }}">
                                             <i class="fas fa-user-plus mr-2"></i>
                                             {{ $keywords['Signup'] ?? __('Singup') }}
                                         </a>
                                     </li>
                                 @endguest

                                 @auth('customer')
                                     <li>
                                         <a href="{{ route('customer.dashboard', getParam()) }}">

                                             <i class="far fa-tachometer-fast mr-2"></i>
                                             {{ $keywords['Dashboard'] ?? __('Dashboard') }}
                                         </a>
                                     </li>

                                     <li>
                                         <a href="{{ route('customer.logout', getParam()) }}">
                                             <i class="fas fa-sign-out-alt mr-2"></i>
                                             {{ $keywords['Logout'] ?? __('Logout') }}
                                         </a>
                                     </li>
                                 @endauth
                             @endif

                         </ul>
                         @if (isset($social_medias))
                             <ul class="top-social-icon list-inline d-md-inline-block d-none">

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
             </div>
         </div>
     </div>
     <div class="header-menu-area">
         <div class="container-fluid">
             <div class="row align-items-center">
                 <div class="col-lg-2 col-md-4 col-7">
                     <div class="logo">
                         <a href="{{ route('front.user.detail.view', getParam()) }}">
                             @if (!empty($userBs->logo))
                                 <img class="lazy" data-src="{{ asset('assets/front/img/user/' . $userBs->logo) }}"
                                     alt="website logo">
                             @endif
                         </a>
                     </div>
                 </div>
                 <div class="col-lg-10 col-md-8 col-5">
                     <div class="menu-right-area text-right">
                         <div class="lang-select">
                             <div class="lang-img">
                                 <img class="lazy"
                                     data-src=" {{ asset('assets/front/img/theme9') }}/icons/languages.png"
                                     alt="flag" width="45">
                             </div>
                             <div class="lang-option">
                                 <form action="{{ route('changeUserLanguage', getParam()) }}" id="userLangForms">
                                     @csrf
                                     <input type="hidden" name="username" value="{{ $user->username }}">
                                     <select class="nice-select" name="code" id="lang-code"
                                         onchange="this.form.submit()">
                                         @foreach ($userLangs as $userLang)
                                             <option {{ $userCurrentLang->id == $userLang->id ? 'selected' : '' }}
                                                 value="{{ $userLang->code }}">
                                                 {{ convertUtf8($userLang->name) }}</option>
                                         @endforeach
                                     </select>
                                 </form>
                             </div>
                         </div>
                         <nav class="main-menu">
                             <ul class="list-inline">

                                 @php
                                     $links = json_decode($userMenus, true);
                                 @endphp
                                 @foreach ($links as $link)
                                     @php
                                         $href = getUserHref($link);
                                     @endphp
                                     @if (!array_key_exists('children', $link))
                                         <li><a href="{{ $href }}"
                                                 target="{{ $link['target'] }}">{{ $link['text'] }}</a></li>
                                     @else
                                         <li class="have-submenu">
                                             <a href="{{ $href }}"
                                                 target="{{ $link['target'] }}">{{ $link['text'] }}</a>
                                             <ul class="submenu">
                                                 @foreach ($link['children'] as $level2)
                                                     @php
                                                         $l2Href = getUserHref($level2);
                                                     @endphp
                                                     <li><a href="{{ $l2Href }}"
                                                             target="{{ $level2['target'] }}">{{ $level2['text'] }}</a>
                                                     </li>
                                                 @endforeach
                                             </ul>
                                         </li>
                                     @endif
                                 @endforeach

                             </ul>
                         </nav>
                     </div>
                 </div>
             </div>
             <div class="mobilemenu"></div>
         </div>
     </div>
 </header>
