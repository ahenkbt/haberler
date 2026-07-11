@extends('user-front.layout')
@section('tab-title')
    {{ $keywords['Page_Not_Found'] ?? 'Page Not Found' }}
@endsection
@section('page-name')
    {{ $keywords['Page_Not_Found'] ?? 'Page Not Found' }}
@endsection
@section('br-name')
    {{ $keywords['404'] ?? '404' }}
@endsection

@section('content')
    <!--    Error section start   -->
    <div class="error-section my-5">
        <div class="container">
            <div class="row">
                <div class="col-lg-6">
                    <div class="not-found">
                        <img src="{{ asset('assets/front/img/404.svg') }}" alt="404">
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="error-txt my-5">
                        <div class="oops">
                            <img src="{{ asset('assets/front/img/oops.png') }}" alt="" class="img-fluid">
                        </div>
                        <h2> {{ $keywords['You_are_lost'] ?? 'You are lost' }}...</h2>
                        <p> {{ $keywords['The_page_you_are_looking_for_might_have_been_moved,_renamed,_or_might_never_existed'] ?? 'The page you are looking for might have been moved, renamed, or might never existed.' }}
                        </p>
                        <a href="{{ route('front.user.detail.view', getParam()) }}" class="go-home-btn">
                            {{ $keywords['Back_home'] ?? 'Back home' }}</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!--    Error section end   -->
@endsection
