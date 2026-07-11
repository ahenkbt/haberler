@extends('user.layout')
@php
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::guard('web')->user()->id],
      ['is_default', 1],
  ])->first();
  $userLanguages = \App\Models\User\Language::where(
      'user_id',
      \Illuminate\Support\Facades\Auth::guard('web')->user()->id,
  )->get();
@endphp
@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Offer Banner') }}</h4>
    <ul class="breadcrumbs">
      <li class="nav-home">
        <a href="{{ route('user-dashboard') }}">
          <i class="flaticon-home"></i>
        </a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Home Page') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Offer Banner') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">

      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">{{ __('Offer Banner') }}</div>
            </div>
            <div class="col-lg-3">
              @includeIf('user.partials.languages')
            </div>
            <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
              <a href="#" class="btn btn-primary float-lg-right float-left" data-toggle="modal"
                data-target="#createModal"><i class="fas fa-plus"></i> {{ __('Add Banner') }}</a>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (count($offers) == 0)
                <h3 class="text-center">{{ __('NO OFFER BANNER  FOUND') }}</h3>
              @else
                <div class="table-responsive">
                  <table class="table table-striped mt-3" id="basic-datatables">
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">{{ __('Icon') }}</th>
                        <th scope="col">{{ __('position') }}</th>
                        <th scope="col">{{ __('Text 1') }}</th>
                        <th scope="col">{{ __('Text 2') }}</th>
                        @if (!$userBs->theme == 'home_fourteen')
                          <th scope="col">{{ __('Text 3') }}</th>
                        @endif
                        <th scope="col">{{ __('Actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($offers as $key => $feature)
                        <tr>
                          <td>{{ $loop->iteration }}</td>
                          <td>
                            <img
                              src="{{ $feature->image ? asset('assets/front/img/user/offers/' . $feature->image) : asset('assets/admin/img/noimage.jpg') }}"
                              alt="..." class="img-thumbnail">
                          </td>
                          <td>{{ $feature->position }}</td>
                          <td>{{ $feature->text_1 }}</td>
                          <td>{{ $feature->text_2 }}</td>
                          @if (!$userBs->theme == 'home_fourteen')
                            <td>{{ $feature->text_3 }}</td>
                          @endif
                          <td>
                            <a class="btn btn-secondary btn-sm"
                              href="{{ route('user.offerBanner.edit', $feature->id) . '?language=' . request()->input('language') }}">
                              <span class="btn-label">
                                <i class="fas fa-edit"></i>
                              </span>
                              {{ __('Edit') }}
                            </a>
                            <form class="deleteform d-inline-block" action="{{ route('user.offerBanner.delete') }}"
                              method="post">
                              @csrf
                              <input type="hidden" name="offer_id" value="{{ $feature->id }}">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>


  <!-- Create Feature Modal -->
  <div class="modal fade" id="createModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add Offer Banner') }}</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <form id="ajaxForm" class="modal-form" action="{{ route('user.offerBanner.store') }}"
            enctype="multipart/form-data" method="POST">
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

            <div class="form-group">
              <div class="col-12 mb-2">
                <label for="image"><strong>{{ __('Image') }} **</strong></label>
              </div>
              <div class="col-md-12 showImage mb-3">
                <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." class="img-thumbnail">
              </div>
              <input type="file" name="image" id="image" class="form-control">
              <p id="errimage" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Text 1') }} @if (!$userBs->theme == 'home_fourteen')
                  **
                @endif
              </label>
              <input class="form-control" name="text_1" placeholder="{{ __('Enter Text 1') }}">
              <p id="errtext_1" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Text 2') }} @if (!$userBs->theme == 'home_fourteen')
                  **
                @endif
              </label>
              <input class="form-control" name="text_2" placeholder="{{ __('Enter Text 2') }}">
              <p id="errtext_2" class="mb-0 text-danger em"></p>
            </div>
            @if (!$userBs->theme == 'home_fourteen')
              <div class="form-group">
                <label for="">{{ __('Text 3') }} **</label>
                <input class="form-control" name="text_3" placeholder="{{ __('Enter Text 3') }}">
                <p id="errtext_3" class="mb-0 text-danger em"></p>
              </div>
            @endif
            @if ($userBs->theme == 'home_fourteen')
              <div class="form-group">
                <label for="">{{ __('Button Name') }} **</label>
                <input class="form-control" name="btn_name" placeholder="{{ __('Enter Button Name') }}">
                <p id="errbtn_name" class="mb-0 text-danger em"></p>
              </div>
            @endif
            <div class="form-group">
              <label for="">{{ __('Url') }} **</label>
              <input class="form-control" name="url" type="url" placeholder="{{ __('Url') }}">
              <p id="errurl" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group">
              <label for="">{{ __('Position') }} **</label>
              <select name="position" id="" class="form-control">
                <option value="">{{ __('select position') }}</option>
                <option value="top">{{ __('Top') }}</option>
                <option value="bottom">{{ __('Bottom') }}</option>
                @if (!$userBs->theme == 'home_fourteen')
                  <option value="left">{{ __('Left') }}</option>
                @endif
              </select>
              <p id="errposition" class="mb-0 text-danger em"></p>
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
