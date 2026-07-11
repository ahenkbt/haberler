@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Team'] ?? 'Team' }}
@endsection

@section('meta-description', !empty($userSeo) ? $userSeo->team_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->team_meta_keywords : '')

@section('page-name')
  {{ $keywords['Team_Members'] ?? 'Team Members' }}
@endsection
@section('br-name')
  {{ $keywords['Team'] ?? 'Team' }}
@endsection

@section('content')

  <!--====== Team Section Start ======-->
  <section class="team-section inner-section-gap">
    <div class="container">

      <!-- Team Boxes -->
      <div class="row team-members justify-content-center">
        @foreach ($members as $member)
          <div class="col-lg-3 col-md-4 col-tiny-12">
            <div class="team-member mt-0 mb-40">
              <div class="member-picture-wrap">
                <div class="member-picture">
                  <img class="lazy img-fluid" data-src="{{ asset('/assets/front/img/user/team/' . $member->image) }}"
                    alt="TeamMember">
                  <div class="social-icons">
                    @isset($member->facebook)
                      <a href="{{ $member->facebook }}" target="_blank">
                        <i class="fab fa-facebook-f"></i>
                      </a>
                    @endisset
                    @isset($member->twitter)
                      <a href="{{ $member->twitter }}" target="_blank">
                        <i class="fab fa-twitter"></i>
                      </a>
                    @endisset
                    @isset($member->linkedin)
                      <a href="{{ $member->linkedin }}" target="_blank">
                        <i class="fab fa-linkedin"></i>
                      </a>
                    @endisset
                    @isset($member->instagram)
                      <a href="{{ $member->instagram }}" target="_blank">
                        <i class="fab fa-instagram"></i>
                      </a>
                    @endisset
                  </div>
                </div>
              </div>
              <div class="member-desc">
                <h3 class="name"><a href="javascript:void(0)">{{ convertUtf8($member->name) }}</a></h3>
                <span class="pro">{{ convertUtf8($member->rank) }}</span>
              </div>
            </div>
          </div>
        @endforeach
      </div>
    </div>
  </section>
  <!--====== Team Section End ======-->
@endsection
