  @extends('user-front.layout')
  @section('tab-title')
    {{ $keywords['Home'] ?? 'Home' }}
  @endsection
  @php
    Config::set('app.timezone', $userBs->timezoneinfo->timezone ?? '');
  @endphp
  @section('meta-description', !empty($userSeo) ? $userSeo->home_meta_description : '')
  @section('meta-keywords', !empty($userSeo) ? $userSeo->home_meta_keywords : '')
  @section('content')
    <!--====== Start Hero Section ======-->
    <div class="main-wrapper">

      <!-- Start Olima Banner Section -->
      @if (isset($home_sections->slider_posts) && $home_sections->slider_posts == 1)
        <section class="olima_banner hero_post_v1">
          <div class="hero_post_slide_v1">
            <!-- grid item -->
            @foreach ($sliders as $slider)
              <div class="grid_item">
                <div class="post_img">
                  <a href="{{ route('front.user.blog.detail', [getParam(), $slider->slug, $slider->id]) }}" class="d-block">
                    <img src="{{ asset('assets/front/img/user/blogs/slider/' . $slider->slider_post_image) }}"
                      class="img-fluid" alt="image">
                  </a>
                  <div class="post_overlay">
                    <div class="post_content">
                      <a href="{{ route('front.user.blogs', [getParam(), 'category' => $slider->bcategory->id]) }}"
                        class="cat_btn">{{ $slider->bcategory->name }}</a>
                      <h3>
                        <a href="{{ route('front.user.blog.detail', [getParam(), $slider->slug, $slider->id]) }}">
                          {{ strlen($slider->title) > 30 ? mb_substr($slider->title, 0, 30, 'utf-8') . '...' : $slider->title }}</a>
                      </h3>
                      <div class="post_meta">
                        <span class="eye">{{ $slider->views }}</span>
                        <span class="love">{{ $slider->bookmarks }}</span>
                        @php
                          $date = Carbon\Carbon::parse($slider->created_at);
                        @endphp
                        <span class="calender">{{ date_format($date, 'M d, Y') }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            @endforeach
          </div>
        </section>
      @endif
      <!-- End Olima Banner Section -->

      <!-- Start Olima Categories Section -->
      @if (isset($home_sections->category_section) && $home_sections->category_section == 1)
        <section class="olima_categories categories_v1 pt-130 pb-110">
          <div class="container">
            <div class="categories_slide">
              @foreach ($bcategories as $bcategory)
                <a href="{{ route('front.user.blogs', [getParam(), 'category' => $bcategory->id]) }}"
                  class="categories_box">
                  <div class="cat_img">
                    <img data-src="{{ asset('assets/front/img/user/blogs/categories/' . $bcategory->image) }}"
                      class="img-fluid lazy" alt="{{ $bcategory->name }}">
                    <div class="cat_overlay">
                      <div class="cat_content">
                        <h5>{{ $bcategory->name }}</h5>
                      </div>
                    </div>
                  </div>
                </a>
              @endforeach
            </div>
          </div>
        </section>
      @endif
      <!-- End Olima Categories Section -->

      <!-- Start Olima Featured & Latest Posts Section -->
      <section class="olima_latest_post latest_post_v1 pb-80">
        <div class="container">
          <div class="row">

            <div class="col-lg-8">
              @if (isset($home_sections->featured_section) && $home_sections->featured_section == 1)
                <div class="row">
                  <div class="col-lg-12">
                    <div class="section_title mb-50">
                      <h3>{{ @$home_text->featured_section_title }}</h3>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <!-- Featured Posts Section -->
                  <div class="col-lg-12 mb-40">
                    <div class="latest-slider-one">
                      @foreach ($featuredBlogs as $blog)
                        <div class="grid_item grid_post_big">
                          <div class="post_img">
                            <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">
                              <img
                                data-src="{{ asset('assets/front/img/user/blogs/featured/' . $blog->featured_post_image) }}"
                                class="img-fluid lazy" alt="image">
                            </a>
                            <div class="post_overlay">
                              <div class="post_content">
                                <a href="{{ route('front.user.blogs', [getParam(), 'category' => $blog->bcategory->id]) }}"
                                  class="cat_btn">{{ $blog->bcategory->name }}</a>
                                <h3>
                                  <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">
                                    {{ strlen($blog->title) > 27 ? mb_substr($blog->title, 0, 27, 'utf-8') . '...' : $blog->title }}</a>
                                </h3>
                                <div class="post_meta">
                                  <span class="eye">{{ $blog->views }}</span>
                                  <span class="love">{{ $blog->bookmarks }}</span>
                                  @php
                                    $date = Carbon\Carbon::parse($blog->created_at);
                                  @endphp
                                  <span class="calender">{{ date_format($date, 'M d, Y') }}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      @endforeach
                    </div>
                  </div>
                </div>
              @endif
              @if (isset($home_sections->latest_posts) && $home_sections->latest_posts == 1)
                <div class="row">
                  <div class="col-lg-12">
                    <div class="section_title mb-50">
                      <h3>{{ @$home_text->latest_item_section_title }}</h3>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <!-- Latest Posts Section -->
                  @foreach ($latestPosts as $blog)
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
                    <div class="col-lg-6">
                      <div class="grid_item grid_item_v2 mb-40">
                        <a class="post_img" href="{{ route('front.user.blogs', [getParam(), 'category' => $blog->bcategory->id]) }}">
                          <img data-src="{{ asset('assets/front/img/user/blogs/' . $blog->image) }}"
                                class="img-fluid lazy" alt="image">
                          <div class="post_overlay">
                            <div class="post_tag">
                              <a href="{{ route('front.user.blogs', [getParam(), 'category' => $blog->bcategory->id]) }}"
                                class="cat_btn">{{ $blog->bcategory->name }}</a>
                              <a href="{{ route('front.user.make_bookmark', ['id' => $blog->id, getParam()]) }}"
                                class="love_btn post-info-{{ $blog->id }} {{ Auth::guard('customer')->check() == true && $postBookmarked == 1 ? 'post-bookmarked' : '' }}"><i
                                  class="fas fa-heart"></i></a>
                            </div>
                          </div>
                        </a> 

                        <div class="post_content">
                          <h3>
                            <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">
                              {{ strlen($blog->title) > 27 ? mb_substr($blog->title, 0, 27, 'utf-8') . '...' : $blog->title }}</a>
                          </h3>
                          <div class="post_meta">
                            @php
                              $date = Carbon\Carbon::parse($blog->created_at);
                            @endphp
                            <span class="calender">{{ date_format($date, 'M d, Y') }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  @endforeach

                  <div class="button_box  pb-50 text-center col-12">
                    <a href="{{ route('front.user.blogs', getParam()) }}"
                      class="load-btn">{{ $keywords['Show_More'] ?? 'Show more' }}</a>
                  </div>
                </div>
              @endif
            </div>

            <div class="col-lg-4">
              <div class="olima_sidebar sidebar_v1">
                @if (isset($home_sections->intro_section) && $home_sections->intro_section == 1)
                  <div class="widget_box about_box mb-40">
                    <div class="about_img">
                      <img
                        data-src="{{ !empty($home_text->about_image) ? asset('assets/front/img/user/home_settings/' . $home_text->about_image) : asset('assets/front/img/themes/about.jpg') }}"
                        class="img-fluid lazy" alt="image">
                    </div>
                    <div class="about_content">
                      <h4>{{ @$home_text->about_title }}</h4>
                      <p>{{ @$home_text->about_content }}</p>
                      @if (isset($social_medias))
                        <div class="social_link">
                          
                            @foreach ($social_medias as $social_media)
                              <a href="{{ $social_media->url }}">
                                <i class="{{ $social_media->icon }}"></i>
                              </a>
                            @endforeach
                          
                        </div>
                      @endif
                    </div>
                    @if (isset($home_text) && !empty($home_text->about_button_url))
                      <a href="{{ $home_text->about_button_url }}"
                        class="olima_btn">{{ $home_text->about_button_text }}</a>
                    @endif
                  </div>
                @endif
                @if (isset($home_sections->popular_posts) && $home_sections->popular_posts == 1)
                  <div class="widget_box featured_post mb-40">
                    <h4>{{ @$home_text->featured_category_item_section_title }}</h4>
                    @foreach ($mostViewedblogs as $blog)
                      <div class="single_post d-flex align-items-center">
                        <div class="post_img">
                          <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">
                            <img src="{{ asset('assets/front/img/user/blogs/' . $blog->image) }}" class="img-fluid lazy"
                              alt="post image">
                          </a>
                        </div>
                        <div class="post_content">
                          <h3>
                            <a href="{{ route('front.user.blog.detail', [getParam(), $blog->slug, $blog->id]) }}">
                              {{ strlen($blog->title) > 27 ? mb_substr($blog->title, 0, 27, 'utf-8') . '...' : $blog->title }}</a>
                          </h3>
                          <div class="post_meta">
                            @php
                              $date = Carbon\Carbon::parse($blog->created_at);
                            @endphp
                            <span class="calender">{{ date_format($date, 'M d, Y') }}</span>
                            <span class="eye">{{ $blog->views }}</span>
                          </div>
                        </div>
                      </div>
                    @endforeach
                  </div>
                @endif
                @if (isset($home_sections->newsletter) && $home_sections->newsletter == 1)
                  <div class="widget_box newsletter_widget">
                    <img
                      data-src="{{ !empty($home_text->newsletter_image) ? asset('assets/front/img/user/home_settings/' . $home_text->newsletter_image) : asset('assets/front/img/themes/about.jpg') }}"
                      class="lazy" alt="icon">
                    <h4>{{ @$home_text->newsletter_title }}</h4>
                    <p>{{ @$home_text->newsletter_subtitle }}</p>
                    <form action="{{ route('front.user.subscriber', getParam()) }}" method="post"
                      enctype="multipart/form-data">
                      @csrf
                      <div class="form_group mb-4">
                        <input type="email" placeholder="{{ $keywords['Email_Address'] ?? 'Email Address' }}"
                          name="subscriber_email" required value="{{ old('subscriber_email') }}">
                        @error('subscriber_email')
                          <p class="text-danger mt-2">{{ $message }}</p>
                        @enderror
                      </div>
                      <div class="form_group">
                        <button type="submit"
                          class="olima_btn sidebar_btn">{{ $keywords['Subscribe'] ?? 'Subscribe' }}</button>
                      </div>
                    </form>
                  </div>
                @endif
              </div>
            </div>
          </div>
        </div>
      </section>
      <!-- End Olima Featured & Latest Posts Section -->

      <!-- Start Olima Gallery Section -->
      @if (isset($home_sections->gallery) && $home_sections->gallery == 1)
        <section class="olima_video video_v1 bg_image pt-130 pb-215 lazy"
          data-bg="{{ !empty($gallery_bg->gallery_bg) ? asset('assets/front/img/user/gallery/bg/' . $gallery_bg->gallery_bg) : asset('assets/front/img/themes/gallery-bg.jpg') }}">
          <div class="container-full">
            <div class="row justify-content-center">
              <div class="col-lg-6">
                <div class="section_title mb-50 text-center">
                  <h3>{{ @$home_text->causes_section_title }}</h3>
                </div>
              </div>
            </div>
            <div class="video_slide_v1">
              @foreach ($galleryItems as $item)
                <div class="grid_item">
                  <div class="post_img">
                    <img src="{{ asset('assets/front/img/user/gallery/' . $item->image) }}" class="img-fluid"
                      alt="image">
                    <div class="post_overlay">
                      <div class="play_button"
                        @if (count($galleryItems) <= 5) style="visibility: visible; opacity: 1;" @endif>
                        @if ($item->item_type == 'video')
                          <a href="{{ $item->video_link }}" class="play_btn mfp-iframe"><i
                              class="fas fa-play"></i></a>
                        @else
                          <a href="{{ asset('assets/front/img/user/gallery/' . $item->image) }}" class="play_btn"><i
                              class="fas fa-image"></i></a>
                        @endif
                      </div>
                      <div class="post_content">
                        <h3><a href="#">{{ $item->title }}</a></h3>
                      </div>
                    </div>
                  </div>
                </div>
              @endforeach
            </div>
          </div>
        </section>
      @endif
      <!-- End Olima Gallery Section -->

      <!-- Start Posts of Featured Categories Section -->
      @if (isset($home_sections->featured_category_posts) && $home_sections->featured_category_posts == 1)
        <section class="olima_vagetarian vagetarian_v1 pt-120">
          <div class="container">
            @if (count($featPostCategories) == 0)
              <div class="row text-center pb-120">
                <div class="col">
                  <h3>{{ $keywords['No_Featured_Post_Category_Found'] ?? __('No Featured Post Category Found !') }}
                  </h3>
                </div>
              </div>
            @else
              @php $langId = $userCurrentLang->id; @endphp
              @foreach ($featPostCategories as $featPostCategory)
                <div class="row align-items-center">
                  <div class="col-lg-6">
                    <div class="section_title mb-50">
                      <h3>{{ $featPostCategory->name }}</h3>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="button_box">
                      <a href="{{ route('front.user.blogs', ['category' => $featPostCategory->id, getParam()]) }}"
                        class="olima_btn">{{ $keywords['Show_More'] ?? __('Show More') }}</a>
                    </div>
                  </div>
                </div>
                @php
                  $featCatPosts = DB::table('user_blogs')
                      ->where('language_id', '=', $langId)
                      ->where('category_id', '=', $featPostCategory->id)
                      ->where('user_id', $user->id)
                      ->orderBy('serial_number', 'ASC')
                      ->limit(3)
                      ->get();
                @endphp
                @if (count($featCatPosts) == 0)
                  <div class="row text-center">
                    <div class="col pt-5 pb-3 mb-4 bg-light">
                      <h5 class="mb-5">
                        {{ $keywords['No_Post_Found_Of_This_Category'] ?? __('No Post Found Of This Category !') }}
                      </h5>
                    </div>
                  </div>
                @else
                  <div class="row">
                    @foreach ($featCatPosts as $featCatPost)
                      @auth('customer')
                        @php
                          $postBookmarked = 0;
                          foreach ($bookmarkPosts as $bookmarkPost) {
                              if ($bookmarkPost->post_id == $featCatPost->id) {
                                  $postBookmarked = 1;
                                  break;
                              }
                          }
                        @endphp
                      @endauth
                      <div class="col-lg-4 col-md-6 col-sm-12">
                        <div class="grid_item mb-40">
                          <div class="post_img">
                            <a
                              href="{{ route('front.user.blog.detail', [getParam(), $featCatPost->slug, $featCatPost->id]) }}">
                              <img data-src="{{ asset('assets/front/img/user/blogs/' . $featCatPost->image) }}"
                                class="img-fluid lazy" alt="image">
                            </a>
                            <div class="post_overlay">
                              <div class="post_tag">
                                <a href="{{ route('front.user.blogs', [getParam(), 'category' => $featPostCategory->id]) }}"
                                  class="cat_btn">{{ $featPostCategory->name }}</a>
                                <a href="{{ route('front.user.make_bookmark', ['id' => $featCatPost->id, getParam()]) }}"
                                  class="love_btn post-info-{{ $featCatPost->id }} {{ Auth::guard('customer')->check() == true && $postBookmarked == 1 ? 'post-bookmarked' : '' }}"><i
                                    class="fas fa-heart"></i></a>
                              </div>
                              <div class="post_content">
                                <h3>
                                  <a
                                    href="{{ route('front.user.blog.detail', [getParam(), $featCatPost->slug, $featCatPost->id]) }}">
                                    {{ strlen($featCatPost->title) > 30 ? mb_substr($featCatPost->title, 0, 30, 'utf-8') . '...' : $featCatPost->title }}</a>
                                </h3>
                                <div class="post_meta">
                                  @php
                                    $date = Carbon\Carbon::parse($featCatPost->created_at);
                                  @endphp
                                  <span class="calender">{{ date_format($date, 'M d, Y') }}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    @endforeach
                  </div>
                @endif
              @endforeach
            @endif
          </div>
        </section>
      @endif
      <!-- End Posts of Featured Categories Section -->

      <div class="back-top">
        <a href="#" class="back-to-top">
          <i class="far fa-angle-up"></i>
        </a>
      </div>
    </div>
    <!--====== back-to-top ======-->
    <a href="#" class="back-to-top">
      <i class="fas fa-angle-up"></i>
    </a>
  @endsection
