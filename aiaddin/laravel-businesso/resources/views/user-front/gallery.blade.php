 @extends('user-front.layout')

 @section('tab-title')
   {{ $keywords['Gallery'] ?? 'Gallery' }}
 @endsection

 @section('meta-description', !empty($userSeo) ? $userSeo->blogs_meta_description : '')
 @section('meta-keywords', !empty($userSeo) ? $userSeo->blogs_meta_keywords : '')

 @section('page-name')
   {{ $keywords['Gallery'] ?? 'Gallery' }}
 @endsection
 @section('br-name')
   {{ $keywords['Gallery'] ?? 'Gallery' }}
 @endsection


 {{-- @dd($userBs); --}}
 @section('content')
   <!-- Start Olima Breadcrumb Section -->
   <section class="olima_breadcrumb bg_image lazy d-none">
     <div class="container">
       <div class="row align-items-center">
         <div class="col-lg-7">
           <div class="breadcrumb-title">
             <h1>{{ !empty($pageHeading) ? $pageHeading->gallery_title : 'Gallery' }}</h1>
           </div>
         </div>
         <div class="col-lg-5">
           <div class="breadcrumb-link">
             <ul>
               <li class="text-uppercase"><a
                   href="{{ route('front.user.detail.view', getParam()) }}">{{ $keywords['Home'] ?? __('Home') }}</a></li>
               <li class="active text-uppercase">{{ !empty($pageHeading) ? $pageHeading->gallery_title : 'Gallery' }}</li>
             </ul>
           </div>
         </div>
       </div>
     </div>
   </section>
   <!-- End Olima Breadcrumb Section -->

   <!-- Start Olima Gallery Section -->
   <section class="gallery-area-v1 section-gap" id="masonry-gallery">
     <div class="container">
       @if ($userBs->gallery_category_status == 1 && count($galleryCategories) > 0)
         <div class="row justify-content-center">
           <div class="col-lg-10">
             <div class="filter-nav text-center mb-40">
               <ul class="filter-btn">
                 <li data-filter="*" class="active">{{ $keywords['All'] ?? 'All' }}</li>

                 @foreach ($galleryCategories as $category)
                   @php
                     $filterValue = '.gcat' . $category->id;
                   @endphp

                   <li data-filter="{{ $filterValue }}">{{ $category->name }}</li>
                 @endforeach
               </ul>
             </div>
           </div>
         </div>
       @endif

       @if (count($items) == 0)
         <div class="row text-center">
           <div class="col py-5 bg-light">
             <h2>
               {{ $keywords['No_Gallery_Item_Found'] ?? __('No Gallery Item Found') . '!' }}
             </h2>
           </div>
         </div>
       @else
         <div class="masonry-row">

           <div class="row">
             @foreach ($items as $item)
               @php
                 $category = !is_null($item->gallery_category_id) ? $item->itemCategory()->first() : null;
                 $name = !is_null($item->gallery_category_id) ? 'gcat' . $category->id : __('All');
               @endphp

               <div class="col-lg-4 col-md-6 col-sm-12 gallery-column {{ $name }}">
                 <div class="gallery-item mb-30">
                   <div class="gallery-img">
                     @if ($item->item_type == 'image')
                       <a href="{{ asset('assets/front/img/user/gallery/' . $item->image) }}" class="img-popup">
                         <img src="{{ asset('assets/front/img/user/gallery/' . $item->image) }}" alt="image">
                         <i class="fas fa-image"></i>
                       </a>
                     @else
                       <a href="{{ $item->video_link }}" class="img-popup mfp-iframe">
                         <img src="{{ asset('assets/front/img/user/gallery/' . $item->image) }}" alt="image">
                         <i class="fas fa-play"></i>
                       </a>
                     @endif
                   </div>
                 </div>
               </div>
             @endforeach
           </div>
         </div>
       @endif

       @if (is_array($packagePermissions) && in_array('Advertisement', $packagePermissions))
         @if (!empty(showAd(3)))
           <div class="mx-auto text-center mb-4">
             {!! showAd(3) !!}
           </div>
         @endif
       @endif
     </div>
   </section>
   <!-- End Olima Gallery Section -->
 @endsection
