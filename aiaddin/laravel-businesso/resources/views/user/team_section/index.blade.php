@extends('user.layout')

@php
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::id()],
      ['is_default', 1],
  ])->first();
  $userLanguages = \App\Models\User\Language::where('user_id', \Illuminate\Support\Facades\Auth::id())->get();
@endphp

@includeIf('user.partials.rtl-style')

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Team_Section') }}</h4>
    <ul class="breadcrumbs">
      <li class="nav-home">
        <a href="{{ route('user-dashboard') . '?language=' . request('language') }}">
          <i class="flaticon-home"></i>
        </a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Home_Page') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Team_Section') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-12">
      <div class="card">
        <div class="card-body">
          <div class="row justify-content-center">
            <div class="col-lg-3">
              @includeIf('user.partials.languages')
            </div>
          </div>
        </div>
      </div>
    </div>
    @if (
        $userBs->theme == 'home_one' ||
            $userBs->theme == 'home_three' ||
            $userBs->theme == 'home_six' ||
            $userBs->theme == 'home_seven')
      <div class="col-md-5">
        <div class="card">
          <div class="card-header">
            <div class="row">
              <div class="col-lg-10">
                <div class="card-title">{{ __('Update_Team_Section') }}</div>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="row">
              <div class="col-lg-12">
                <form id="teamSecForm"
                  action="{{ route('user.update_team_section', ['language' => request()->input('language')]) }}"
                  method="POST" enctype="multipart/form-data">
                  @csrf
                  <input type="hidden" name="language" value="{{ request()->input('language') }}">
                  <div class="form-group">
                    <label for="team_section_title">{{ __('Team_Section_Title') }} * </label>
                    <input id="team_section_title" type="text" class="form-control" name="team_section_title"
                      value="{{ $data->team_section_title ?? '' }}">
                    @if ($errors->has('team_section_title'))
                      <p class="mt-2 mb-0 text-danger">{{ $errors->first('team_section_title') }}</p>
                    @endif
                  </div>

                  <div class="form-group">
                    <label for="team_section_subtitle">{{ __('Team_Section_Subtitle') }} * </label>
                    <input id="team_section_subtitle" type="text" class="form-control" name="team_section_subtitle"
                      value="{{ $data->team_section_subtitle ?? '' }}">
                    @if ($errors->has('team_section_subtitle'))
                      <p class="mt-2 mb-0 text-danger">{{ $errors->first('team_section_subtitle') }}
                      </p>
                    @endif
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="row">
              <div class="col-12 text-center">
                <button type="submit" form="teamSecForm" class="btn btn-success">
                  {{ __('Update') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    @endif

    <div class=" @if (
        $userBs->theme == 'home_one' ||
            $userBs->theme == 'home_three' ||
            $userBs->theme == 'home_six' ||
            $userBs->theme == 'home_seven') col-lg-7 @else col-lg-12 @endif ">
      <div class="card">
        <div class="card-header">
          <div class="card-title d-inline-block">{{ __('Members') }}</div>
          <a href="{{ route('user.team_section.create_member') }}?language={{ request()->input('language') }}"
            class="btn btn-primary btn-sm float-right"><i class="fas fa-plus"></i> {{ __('Add_Member') }}</a>
        </div>

        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (count($memberInfos) == 0)
                <h3 class="text-center">{{ __('NO_MEMBER_FOUND') }}</h3>
              @else
                <div class="table-responsive">
                  <table class="table table-striped mt-3">
                    <thead>
                      <tr>
                        <th scope="col">{{ __('Image') }}</th>
                        <th scope="col">{{ __('Name') }}</th>
                        <th scope="col">{{ __('Rank') }}</th>
                        @if (
                            $userBs->theme == 'home_one' ||
                                $userBs->theme == 'home_three' ||
                                $userBs->theme == 'home_six' ||
                                $userBs->theme == 'home_seven')
                          <th scope="col">{{ __('Featured') }}</th>
                        @endif
                        <th scope="col">{{ __('Actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($memberInfos as $memberInfo)
                        <tr>
                          <td>
                            @if (!is_null($memberInfo->image))
                              <img src="{{ asset('/assets/front/img/user/team/' . $memberInfo->image) }}" alt="user"
                                width="40">
                            @else
                              -
                            @endif
                          </td>
                          <td>{{ $memberInfo->name ?? '-' }}</td>
                          <td>{{ $memberInfo->rank ?? '-' }}</td>
                          @if (
                              $userBs->theme == 'home_one' ||
                                  $userBs->theme == 'home_three' ||
                                  $userBs->theme == 'home_six' ||
                                  $userBs->theme == 'home_seven')
                            <td>
                              <form id="featureForm{{ $memberInfo->id }}" class="d-inline-block"
                                action="{{ route('user.team_section.member.feature') }}" method="post">
                                @csrf
                                <input type="hidden" name="member_id" value="{{ $memberInfo->id }}">
                                <select
                                  class="form-control {{ $memberInfo->featured == 1 ? 'bg-success' : 'bg-danger' }}"
                                  name="featured"
                                  onchange="document.getElementById('featureForm{{ $memberInfo->id }}').submit();">
                                  <option value="1" {{ $memberInfo->featured == 1 ? 'selected' : '' }}>
                                    {{ __('Yes') }}
                                  </option>
                                  <option value="0" {{ $memberInfo->featured == 0 ? 'selected' : '' }}>
                                    {{ __('No') }}
                                  </option>
                                </select>
                              </form>
                            </td>
                          @endif
                          <td>
                            <a class="btn btn-secondary btn-sm mr-1"
                              href="{{ route('user.team_section.edit_member', $memberInfo->id) . '?language=' . request()->input('language') }}">
                              <i class="fas fa-edit"></i>
                            </a>

                            <form class="deleteform d-inline-block"
                              action="{{ route('user.team_section.delete_member') }}" method="post">
                              @csrf
                              <input type="hidden" name="member_id" value="{{ $memberInfo->id }}">

                              <button type="submit" class="btn btn-danger btn-sm deletebtn">
                                <i class="fas fa-trash"></i>
                              </button>
                            </form>
                          </td>
                        </tr>
                      @endforeach
                    </tbody>
                  </table>
                </div>
              @endif
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
@endsection
