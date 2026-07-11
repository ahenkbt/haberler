@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Causes'] ?? 'Causes' }}
@endsection

@section('meta-description', !empty($userSeo) ? $userSeo->meta_description_course : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->meta_keyword_course : '')

@section('page-name')
  {{ $keywords['Causes'] ?? 'Causes' }}
@endsection
@section('br-name')
  {{ $keywords['Causes'] ?? 'Causes' }}
@endsection

@section('content')
  <section class="work-area work-area-v1 work-area-v5">
    <div class="container">
      <div class="row">
        <div class="col-lg-8">
          <div class="row">
            @forelse ($causes as $cause)
              <div class="col-lg-6 col-md-6">
                <div class="single-work-box">
                  <div class="single-work-img">
                    <img src="{{ asset(\App\Constants\Constant::WEBSITE_CAUSE_IMAGE . '/' . $cause->image) }}"
                      alt="">
                  </div>
                  <div class="single-work-content">
                    <h3><a
                        href="{{ route('front.user.causesDetails', [getParam(), 'slug' => $cause->slug]) }}">{{ strlen($cause->title) > 23 ? mb_substr($cause->title, 0, 23, 'UTF-8') . '...' : $cause->title }}</a>
                    </h3>
                    <div class="progress-bar-area">
                      <div class="progress-bar">
                        <div class="progress-bar-inner wow slideInLeft"
                          style="width: {{ $cause->goal_percentage . '%' }}">
                          <div class="progress-bar-style"></div>
                        </div>
                      </div>
                    </div>
                    <div class="work-meta">
                      <span class="mission">
                        <span>{{ $keywords['goal'] . ':' ?? __('Goal') . ':' }}</span>
                        @if ($userBs->base_currency_symbol_position == 'left')
                          {{ $userBs->base_currency_symbol . formatNumber($cause->goal_amount) }}
                        @elseif($userBs->base_currency_symbol_position == 'right')
                          {{ formatNumber($cause->goal_amount) . $userBs->base_currency_symbol }}
                        @endif

                      </span>
                      <span class="goal">
                        <span>{{ $keywords['raised'] . ':' ?? __('Raised') . ':' }}</span>
                        @if ($userBs->base_currency_symbol_position == 'left')
                          {{ $userBs->base_currency_symbol . formatNumber($cause->raised_amount) }}
                        @elseif($userBs->base_currency_symbol_position == 'right')
                          {{ formatNumber($cause->raised_amount) . $userBs->base_currency_symbol }}
                        @endif
                      </span>
                      <h2 class="absolute-counter">{{ $cause->goal_percentage . '%' }}</h2>
                    </div>
                    <a href="{{ route('front.user.causesDetails', [getParam(), 'slug' => $cause->slug]) }}"
                      class="btn work-btn btn-bg-1"> {{ $keywords['read_more'] ?? __('read_more') }}
                      <i class="fa fa-arrow-right"></i></a>
                  </div>
                </div>
              </div>
            @empty
              <div class="col-lg-12">
                <h3 class="text-center mb-30">
                  {{ $keywords['no_cause_found'] ?? __('No Cause Found') . '!' }}
                </h3>
                {{-- Spacer --}}
                <div class="pb-20"></div>
              </div>
            @endforelse
          </div>

        </div>
        <div class="col-lg-4">
          <div class="widget-box widget-category border p-4">
            <h4 class="widget-title">{{ $keywords['Categories'] ?? __('Categories') }}</h4>
            <ul class="category-list mt-4 text-bold">
              @foreach ($categories as $category)
                <li><a href="{{ route('front.user.causes', getParam()) . '?category=' . $category->slug }}">
                    {{ $category->name }} <span>&nbsp;
                      {{ '(' . $category->total . ')' }}</span></a>
                </li>
              @endforeach

            </ul>
          </div>
        </div>


      </div>
      <div class="row">
        <div class="col-md-12">
          <div class="nusafe-pagination text-center">
            {{ $causes->links() }}

          </div>
        </div>
      </div>

    </div>
  </section>
@endsection

@section('scripts')


@endsection
