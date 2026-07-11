@extends('user-front.layout')

@section('tab-title')
    {{$keywords["Services"] ?? "Services"}}
@endsection

@section('meta-description', !empty($userSeo) ? $userSeo->services_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->services_meta_keywords : '')

@section('page-name')
{{$keywords["Our_Services"] ?? "Our Services"}}
@endsection
@section('br-name')
{{$keywords["Services"] ?? "Services"}}
@endsection

@section('content')



    <!--====== Service Section Start ======-->
    <section class="service-section service-line-shape section-gap bg-white">
        <div class="container">
            <!-- Services Boxes -->
            <div class="row service-boxes justify-content-center">
                @foreach ($services as $service)
                    <div class="col-lg-3 col-sm-6 col-10 wow fadeInUp" data-wow-duration="1500ms"
                         data-wow-delay="400ms">
                        <div class="service-box-three border-0 grey-bg">
                            <a class="icon" 
                            @if($service->detail_page == 1)
                            href="{{route('front.user.service.detail',[getParam(),'slug' => $service->slug,'id' => $service->id])}}"
                            @endif>
                                <img data-src="{{isset($service->image) ? asset('assets/front/img/user/services/'.$service->image) : asset('assets/front/img/profile/service-1.jpg')}}" class="icon lazy" alt="">
                            </a>
                            <div class="content">
                                <h5>
                                    <a 
                                    @if($service->detail_page == 1)
                                    href="{{route('front.user.service.detail',[getParam(),'slug' => $service->slug,'id' => $service->id])}}"
                                    @endif>{{$service->name}}</a>
                                </h5>
                                @if($service->detail_page == 1)
                                    <a href="{{route('front.user.service.detail',[getParam(),'slug' => $service->slug,'id' => $service->id])}}"
                                    class="service-link">
                                        <i class="fal fa-long-arrow-right"></i>
                                    </a>
                                @endif
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
        <div class="line-one">
            <img class="lazy" data-src="{{asset('assets/front/img/lines/12.png')}}" alt="line-shape">
        </div>
        <div class="line-two">
            <img class="lazy" data-src="{{asset('assets/front/img/lines/11.png')}}" alt="line-shape">
        </div>
    </section>
    <!--====== Service Section End ======-->
@endsection
