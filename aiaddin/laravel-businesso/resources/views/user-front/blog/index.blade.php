 @extends('user-front.layout')

 @section('tab-title')
   {{ $keywords['Blog'] ?? 'Blog' }}
 @endsection

 @section('meta-description', !empty($userSeo) ? $userSeo->blogs_meta_description : '')
 @section('meta-keywords', !empty($userSeo) ? $userSeo->blogs_meta_keywords : '')

 @section('page-name')
   {{ $keywords['Blog'] ?? 'Blog' }}
 @endsection
 @section('br-name')
   {{ $keywords['Blog'] ?? 'Blog' }}
 @endsection

 @section('content')
   <!--====== Blog Section Start ======-->
   <section class="blog-section section-gap">
     <div class="container">
       <div class="row justify-content-center">
         <div class="col-lg-8">
           @if (count($blogs) == 0)
             <div class="bg-light py-5">
               <h3 class="text-center">{{ $keywords['No_Post_Found'] ?? __('No Post Found') }}!</h3>
             </div>
           @else
             <!-- Blog loop(Standard) -->
             <div class="blog-loop standard-blog row">
               <!-- Single Post -->
               @foreach ($blogs as $blog)
                 @auth('customer')
                   @php
                     $postBookmarked = 0;
                     foreach ($bookmarkPosts as $bookmarkPost) {
                         if ($bookmarkPost->post_id == $blog->id) {
                             $postBookmarked = 1;
                             break;
                         }
                     }
                   @endphp
                 @endauth
                 <!-- Single Post -->
                 <div class=" @if ($userBs->theme === 'home_thirteen') col-6 @else col-12 @endif ">
                   <div class="single-post-box">
                     <a class="post-thumb d-block"
                       href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">
                       <img class="w-100 lazy" data-src="{{ asset('assets/front/img/user/blogs/' . $blog->image) }}"
                         alt="Image">
                     </a>
                     @php
                       $date = \Carbon\Carbon::parse($blog->created_at);
                     @endphp
                     <div class="post-meta">
                       <ul>
                         <li><i class="fal fa-folder-tree"></i><a
                             href="{{ route('front.user.blogs', getParam()) . '?category=' . $blog->bcategory->id }}">{{ $blog->bcategory->name }}</a>
                         </li>
                         <li><i class="far fa-calendar-alt"></i><a href="#">{{ date_format($date, 'F d, Y') }}</a>
                         </li>
                         @if ($userBs->theme === 'home_thirteen')
                           <li> <a href="{{ route('front.user.make_bookmark', ['id' => $blog->id, getParam()]) }}"
                               class="love_btn post-info-{{ $blog->id }} {{ Auth::guard('customer')->check() == true && $postBookmarked == 1 ? 'post-bookmarked' : '' }}"><i
                                 class="fas fa-heart"></i></a>
                           </li>
                         @endif
                       </ul>
                     </div>
                     <div class="post-content">
                       <h3 class="title">
                         <a
                           href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">{{ strlen($blog->title) > 50 ? mb_substr($blog->title, 0, 50, 'UTF-8') . '...' : convertUtf8($blog->title) }}</a>
                       </h3>
                       <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}"
                         class="@if ($userBs->theme === 'home_four' || $userBs->theme === 'home_five') template-btn
                                                @elseif($userBs->theme === 'home_nine') btn filled-btn
                                                @else main-btn @endif ">
                         {{ $keywords['Learn_More'] ?? 'Learn More' }}
                       </a>
                     </div>
                   </div>
                 </div>
               @endforeach
             </div>
             <!-- Pagination -->
             <div>
               {{ $blogs->appends(['term' => request()->input('term'), 'category' => request()->input('category')])->links() }}
             </div>
           @endif
         </div>

         <div class="col-lg-4 col-md-8">
           <!-- sidebar -->
           <div class="sidebar">
             <!-- Search Widget -->
             <div class="widget search-widget">
               <form action="{{ route('front.user.blogs', getParam()) }}" method="GET">
                 <input type="hidden" name="category" value="{{ request()->input('category') }}">
                 <input type="text" placeholder="{{ $keywords['Search_your_keyword'] ?? 'Search your keyword' }}..."
                   name="term" value="{{ request()->input('term') }}">
                 <button type="submit"><i class="far fa-search"></i></button>
               </form>
             </div>
             <!-- Cat Widget -->
             <div class="widget cat-widget">
               <h4 class="widget-title">{{ $keywords['Categories'] ?? 'Categories' }}</h4>
               @if (count($blog_categories) == 0)
                 <h4>{{ $keywords['No_Blog_Category_Found'] ?? __('No Blog Category Found') }} !</h4>
               @else
                 <ul>
                   <li class="@if (empty(request()->input('category'))) active @endif">
                     <a href="{{ route('front.user.blogs', getParam()) }}">{{ $keywords['All'] ?? 'All' }}
                       <span>({{ $allCount }})</span></a>
                   </li>
                   @foreach ($blog_categories as $bc)
                     <li class="@if ($bc->id == request()->input('category')) active @endif"><a
                         href="{{ route('front.user.blogs', getParam()) . '?category=' . $bc->id }}">{{ $bc->name }}
                         <span>({{ $bc->blogs()->count() }})</span></a>
                     </li>
                   @endforeach
                 </ul>
               @endif
             </div>
           </div>
         </div>
       </div>
     </div>
   </section>
   <!--====== Blog Section End ======-->
 @endsection
