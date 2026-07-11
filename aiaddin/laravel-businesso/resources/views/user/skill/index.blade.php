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
    <h4 class="page-title">{{ __('Skills') }}</h4>
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
        <a href="#">{{ __('Skill_Page') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Skills') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">{{ __('Skills') }}</div>
            </div>
            <div class="col-lg-3">
              @includeIf('user.partials.languages')
            </div>
            <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
              @if (!is_null($userDefaultLang))
                <a href="#" class="btn btn-primary float-right btn-sm" data-toggle="modal"
                  data-target="#createModal"><i class="fas fa-plus"></i> {{ __('Add_Skill') }}</a>
                <button class="btn btn-danger float-right btn-sm mr-2 d-none bulk-delete"
                  data-href="{{ route('user.skill.bulk.delete') }}"><i class="flaticon-interface-5"></i>
                  {{ __('Delete') }}</button>
              @endif
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (is_null($userDefaultLang))
                <h3 class="text-center">{{ __('NO_LANGUAGE_FOUND') }}</h3>
              @else
                @if (count($skills) == 0)
                  <h3 class="text-center">{{ __('NO_SKILL_FOUND') }}</h3>
                @else
                  <div class="table-responsive">
                    <table class="table table-striped mt-3" id="basic-datatables">
                      <thead>
                        <tr>
                          <th scope="col">
                            <input type="checkbox" class="bulk-check" data-val="all">
                          </th>
                          @if ($userBs->theme !== 'home_twelve')
                            <th scope="col">{{ __('Icon') }}</th>
                          @endif
                          <th scope="col">{{ __('Title') }}</th>
                          <th scope="col">{{ __('Language') }}</th>
                          <th scope="col">{{ __('Percentage') }}</th>
                          <th scope="col">{{ __('Actions') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        @foreach ($skills as $key => $skill)
                          <tr>
                            <td>
                              <input type="checkbox" class="bulk-check" data-val="{{ $skill->id }}">
                            </td>
                            @if ($userBs->theme !== 'home_twelve')
                              <td><i class="{{ $skill->icon ?? 'fa fa-fw fa-heart' }}"></i>
                              </td>
                            @endif
                            <td>
                              {{ strlen($skill->title) > 30 ? mb_substr($skill->title, 0, 30, 'UTF-8') . '...' : $skill->title }}
                            </td>
                            <td>{{ $skill->language->name }}</td>
                            <td>{{ $skill->percentage }}</td>
                            <td>
                              <a class="btn btn-secondary btn-sm"
                                href="{{ route('user.skill.edit', $skill->id) . '?language=' . $skill->language->code }}">
                                <span class="btn-label">
                                  <i class="fas fa-edit"></i>
                                </span>
                                {{ __('Edit') }}
                              </a>
                              <form class="deleteform d-inline-block" action="{{ route('user.skill.delete') }}"
                                method="post">
                                @csrf
                                <input type="hidden" name="skill_id" value="{{ $skill->id }}">
                                <button type="submit" class="btn btn-danger btn-sm deletebtn">
                                  <span class="btn-label">
                                    <i class="fas fa-trash"></i>
                                  </span>
                                  {{ __('Delete') }}
                                </button>
                              </form>
                            </td>
                          </tr>
                        @endforeach
                      </tbody>
                    </table>
                  </div>
                @endif
              @endif
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
  <!-- Create Skill Modal -->
  <div class="modal fade" id="createModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add_Skill') }}</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <form id="ajaxForm" enctype="multipart/form-data" class="modal-form" action="{{ route('user.skill.store') }}"
            method="POST">
            @csrf
            <div class="form-group">
              <label for="">{{ __('Language') }} **</label>
              <select id="language" name="user_language_id" class="form-control">
                <option value="" selected disabled>{{ __('Select_a_language') }}</option>
                @foreach ($userLanguages as $lang)
                  <option value="{{ $lang->id }}">{{ $lang->name }}</option>
                @endforeach
              </select>
              <p id="erruser_language_id" class="mb-0 text-danger em"></p>
            </div>
            @if ($userBs->theme !== 'home_twelve')
              <div class="form-group">
                <label for="">{{ __('Icon') }}</label>
                <div class="btn-group d-block">
                  <button type="button" class="btn btn-primary iconpicker-component"><i
                      class="fa fa-fw fa-heart"></i></button>
                  <button type="button" class="icp icp-dd btn btn-primary dropdown-toggle" data-selected="fa-car"
                    data-toggle="dropdown"></button>
                  <div class="dropdown-menu"></div>
                </div>
                <input type="hidden" id="inputIcon" name="icon">
                <p id="erricon" class="mt-1 mb-0 text-danger em"></p>
                <div class="text-warning mt-2">
                  <small>{{ __('Click_on_the_dropdown_icon_to_select_a_icon') }}</small>
                </div>
              </div>
            @endif
            <div class="row">
              <div class="col-lg-6">
                <div class="form-group">
                  <label for="">{{ __('Title') }} **</label>
                  <input type="text" class="form-control" name="title" value=""
                    placeholder="{{ __('Enter Title') }}">
                  <p id="errtitle" class="mb-0 text-danger em"></p>
                </div>
              </div>
              <div class="col-lg-6">
                <div class="form-group">
                  <label for="percentage">{{ __('Percentage') }}**</label>
                  <input id="percentage" type="number" class="form-control"
                    placeholder="{{ __('Enter_skill_percentage') }}" name="percentage" value="" min="1"
                    max="100"
                    onkeyup="if(parseInt(this.value)>100 || parseInt(this.value)<=0 ){this.value =100; return false;}">
                  <p id="errpercentage" class="mb-0 text-danger em"></p>
                  <p class="text-warning mb-0">
                    <small>{{ __('The_percentage_should_between_1_to_100') }}</small>
                  </p>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-lg-6">
                <div class="form-group">
                  <label for="">{{ __('Color') }} **</label>
                  <input type="text" name="color" value="#F78058" class="form-control jscolor">
                </div>
              </div>
              <div class="col-lg-6">
                <div class="form-group">
                  <label for="">{{ __('Serial_Number') }} **</label>
                  <input type="number" class="form-control" placeholder="{{ __('Enter_Serial_Number') }}"
                    name="serial_number" value="">
                  <p id="errserial_number" class="mb-0 text-danger em"></p>
                  <p class="text-warning mb-0">
                    <small>{{ __('Skill_Serial_Number_text') }}</small>
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">{{ __('Close') }}</button>
          <button id="submitBtn" type="button" class="btn btn-primary">{{ __('Submit') }}</button>
        </div>
      </div>
    </div>
  </div>
@endsection
