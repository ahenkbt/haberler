@extends('user.layout')

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Mail_Subscribers') }}</h4>
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
                <a href="#">{{ __('Subscribers') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Mail_Information_For_Subscribers') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">

            <div class="card">
                <form action="{{ route('user.mail.subscriber') }}" method="post">
                    @csrf
                    <div class="card-header">
                        <div class="card-title">{{ __('Mail_Information') }}</div>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-lg-8 offset-lg-2">
                                <div class="form-group">
                                    <label for="email">{{ __('Reply_To') }} **</label>
                                    <input id="email" type="email" class="form-control" name="email"
                                        value="{{ $info->email ?? Auth::user()->email }}"
                                        placeholder="{{ __('Enter_Email_Address') }}">
                                    @if ($errors->has('email'))
                                        <p class="text-danger mb-0">{{ $errors->first('email') }}</p>
                                    @endif
                                </div>
                                <div class="form-group">
                                    <label for="from-name">{{ __('From_Name') }} **</label>
                                    <input id="from-name" type="text" class="form-control" name="from_name"
                                        value="{{ $info->from_name ?? Auth::user()->company_name }}"
                                        placeholder="{{ __('Enter_From_name') }}">
                                    @if ($errors->has('from_name'))
                                        <p class="text-danger mb-0">{{ $errors->first('from_name') }}</p>
                                    @endif
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer text-center">
                        <button type="submit" class="btn btn-success">
                            {{ __('save') }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
@endsection
