@extends('front.layout')

@section('pagename')
    - {{ __('Listings') }}
@endsection

@section('meta-description', !empty($seo) ? $seo->profiles_meta_description : '')
@section('meta-keywords', !empty($seo) ? $seo->profiles_meta_keywords : '')

@section('breadcrumb-title')
    {{ __('Listings') }}
@endsection
@section('breadcrumb-link')
    {{ __('Listings') }}
@endsection

@section('content')


    <!--====== Start saas-featured-users section ======-->


    <div class="user-profile-area ptb-120">
        <div class="container">
            <div class="search-filter mb-5">
                <form action="{{ route('front.user.view') }}">
                    <div class="row align-items-center">
                        <div class="col-lg-5">
                            <div class="search-box mt-2">
                                <input type="text" class="form-control" placeholder="{{ __('Search by company name') }}"
                                    name="company" value="{{ request()->input('company') }}">
                            </div>
                        </div>
                        <div class="col-lg-5 ">
                            <div class="search-box mt-2">
                                <input type="text" class="form-control" placeholder="{{ __('Search by location') }}"
                                    name="location" value="{{ request()->input('location') }}">
                            </div>
                        </div>
                        <div class="col-lg-2  ">
                            <div class="search-box mt-2">
                                <button type="submit" class="btn btn-lg btn-primary w-100">
                                    {{ $keywords['submit'] ?? __('Submit') }}</button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="row">

                @foreach ($users as $user)
                    <div class="col-lg-4 col-sm-6">
                        <div class="card text-center mb-30">

                            <div class="icon mx-auto">
                                @if (isset($user->photo))
                                    <img class="lazyload" data-src="{{ asset('assets/front/img/user/' . $user->photo) }}"
                                        alt="User">
                                @else
                                    <img class="lazyload" data-src="{{ asset('assets/admin/img/propics/blank_user.jpg') }}"
                                        alt="User">
                                @endif
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">{{ $user->company_name }}</h4>
                                <div class="social-link">
                                    @foreach ($user->social_media as $social)
                                        <a href="{{ $social->url }}" class="facebook" target="_blank"><i
                                                class="{{ $social->icon }}"></i></a>
                                    @endforeach
                                </div>
                                <div class="btn-groups justify-content-center">

                                    <a @if ($user->status == 0) title="Account deactivated" @endif target="_blank"
                                        href=" @if ($user->status == 1) {{ detailsUrl($user) }} @else # @endif"
                                        class="btn btn-sm btn-outline @if ($user->status == 0) cursor-not-allowed @endif">
                                        {{ __('Website') }}</a>

                                    @guest
                                        <a href="{{ route('user.follow', ['id' => $user->id]) }}"
                                            class="btn btn-sm btn-primary">{{ __('Follow') }}
                                        </a>
                                    @endguest

                                    @if (Auth::check() && Auth::id() != $user->id)
                                        @if (App\Models\User\Follower::where('follower_id', Auth::id())->where('following_id', $user->id)->count() > 0)
                                            <a href="{{ route('user.unfollow', $user->id) }}"
                                                class="btn btn-sm btn-primary">{{ __('Unfollow') }}
                                            </a>
                                        @else
                                            <a href="{{ route('user.follow', ['id' => $user->id]) }}"
                                                class="btn btn-sm btn-primary">{{ __('Follow') }}
                                            </a>
                                        @endif
                                    @endif

                                </div>
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
            <nav class="pagination-nav" data-aos="fade-up">
                <ul class="pagination justify-content-center mb-0">
                    {{ $users->appends(['company' => request()->input('company'), 'location' => request()->input('location')])->links() }}
                </ul>
            </nav>
        </div>
    </div>
    <!--====== End saas-featured-users section ======-->
@endsection
