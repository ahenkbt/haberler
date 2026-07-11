@extends('user.layout')

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{  __('Social_Links') }}</h4>
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
        <a href="#">{{  __('Basic_Settings')}}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{  __('Social_Links') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <form id="socialForm" action="{{route('user.social.update')}}" method="post">
          <div class="card-header">
            <div class="card-title d-inline-block">{{   __('Edit_Social_Link')}}</div>
            <a class="btn btn-info btn-sm float-right d-inline-block" href="{{route('user.social.index') . '?language=' . request('language')}}">
                <span class="btn-label">
                    <i class="fas fa-backward"></i>
                </span>
                {{  __('Back') }}
			</a>
          </div>
          <div class="card-body pt-5 pb-5">
            <div class="row">
              <div class="col-lg-6 offset-lg-3">
                @csrf
                <input type="hidden" name="socialid" value="{{$social->id}}">
                <div class="form-group">
                  <label for="">{{    __('Social_Icon') }} **</label>
                  <div class="btn-group d-block">
                      <button type="button" class="btn btn-primary iconpicker-component"><i class="{{$social->icon}}"></i></button>
                      <button type="button" class="icp icp-dd btn btn-primary dropdown-toggle"
                              data-selected="fa-car" data-toggle="dropdown">
                      </button>
                      <div class="dropdown-menu"></div>
                  </div>
                  <input id="inputIcon" type="hidden" name="icon" value="{{$social->icon}}">
                  @if ($errors->has('icon'))
                    <p class="mb-0 text-danger">{{$errors->first('icon')}}</p>
                  @endif
                  <div class="mt-2">
                    <small>{{  __('Social_Icon_nb_text') }}</small>
                  </div>
                </div>
                <div class="form-group">
                  <label for="">{{  __('URL')   }} **</label>
                  <input type="text" class="form-control" name="url" value="{{$social->url}}" placeholder="{{  __('Enter_URL_of_Social_Media_Account')  }}">
                  @if ($errors->has('url'))
                    <p class="mb-0 text-danger">{{$errors->first('url')}}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label for="">{{  __('Serial_Number') }} **</label>
                  <input type="number" class="form-control" name="serial_number" value="{{$social->serial_number}}" placeholder="{{  __('Enter_Serial_Number')}}">
                  @if ($errors->has('serial_number'))
                    <p class="mb-0 text-danger">{{$errors->first('serial_number')}}</p>
                  @endif
                  <p class="text-warning"><small>{{   __('Social_link_Serial_Number_text') }}</small></p>
                </div>
              </div>
            </div>
          </div>
          <div class="card-footer pt-3">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-lg-3 col-md-3 col-sm-12">

                </div>
                <div class="col-12 text-center">
                  <button type="submit" id="displayNotif" class="btn btn-success">{{  __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>

@endsection
