@extends('admin.layout')

@section('content')
    <div class="page-header">
        <h4 class="page-title">
            {{ __('Registered Users') }}
        </h4>
        <ul class="breadcrumbs">
            <li class="nav-home">
                <a href="{{ route('admin.dashboard') }}">
                    <i class="flaticon-home"></i>
                </a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Users vCards') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">

            <div class="card">
                <div class="card-header">
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="card-title">
                                {{ __('Users vCards') }}
                            </div>
                        </div>
                        <div class="col-lg-6 mt-2 mt-lg-0">
                            <form action="{{ url()->full() }}" class="float-lg-right float-none">
                                <input type="text" name="term" class="form-control min-w-250"
                                    value="{{ request()->input('term') }}" placeholder="{{__('Search by Vcard Name / Email')}}">
                            </form>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-12">
                            @if (count($vcards) == 0)
                                <h3 class="text-center">{{ __('NO VCARD FOUND') }}</h3>
                            @else
                                <div class="table-responsive">
                                    <table class="table table-striped mt-3">
                                        <thead>
                                            <tr>
                                                <th scope="col">{{ __('Vcard Name') }}</th>
                                                <th scope="col">{{ __('Preview') }}</th>
                                                <th scope="col">{{ __('Preview Template') }}</th>
                                                <th scope="col">{{ __('Status') }}</th>
                                                <th scope="col">{{ __('Action') }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach ($vcards as $key => $vcard)
                                                <tr>
                                                    <td> <a target="_blank"
                                                            href="{{ route('front.user.vcard', [$vcard->user->username, $vcard->id]) }}">
                                                            {{ $vcard->vcard_name }} </a></td>

                                                    <td><button class="btn btn-primary btn-sm" data-toggle="modal"
                                                            data-target="#urlsModal{{ $vcard->id }}"><i
                                                                class="fas fa-link"></i> {{ __('URLs') }}</button></td>

                                                    <td>
                                                        <div class="d-inline-block">
                                                            <select data-user_id="{{ $vcard->id }}"
                                                                class="template-select form-control form-control-sm {{ $vcard->preview_template == 1 ? 'bg-success' : 'bg-danger' }}"
                                                                name="preview_template">
                                                                <option value="1"
                                                                    {{ $vcard->preview_template == 1 ? 'selected' : '' }}>
                                                                    {{ __('Yes') }}</option>
                                                                <option value="0"
                                                                    {{ $vcard->preview_template == 0 ? 'selected' : '' }}>
                                                                    {{ __('No') }}</option>
                                                            </select>
                                                        </div>
                                                        @if ($vcard->preview_template == 1)
                                                            <button type="button" class="btn btn-primary btn-sm"
                                                                data-toggle="modal"
                                                                data-target="#templateImgModal{{ $vcard->id }}">{{ __('Edit') }}</button>
                                                        @endif
                                                    </td>
                                                    <td>
                                                        <div class="d-inline-block">
                                                            <form id="vcardForm{{ $vcard->id }}" class="d-inline-block"
                                                                action="{{ route('register.user.vcard.status') }}"
                                                                method="post">
                                                                @csrf
                                                                <select data-user_id="{{ $vcard->id }}"
                                                                    onchange="document.getElementById('vcardForm{{ $vcard->id }}').submit();"
                                                                    class=" form-control form-control-sm {{ $vcard->status == 1 ? 'bg-success' : 'bg-danger' }}"
                                                                    name="status">
                                                                    <option value="1"
                                                                        {{ $vcard->status == 1 ? 'selected' : '' }}>
                                                                        {{ __('Show') }}</option>
                                                                    <option value="0"
                                                                        {{ $vcard->status == 0 ? 'selected' : '' }}>
                                                                        {{ __('Hide') }}</option>
                                                                </select>
                                                                <input type="hidden" name="vcard_id"
                                                                    value="{{ $vcard->id }}">
                                                            </form>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <form class="deleteform d-block"
                                                            action="{{ route('register.user.vcard.delete') }}"
                                                            method="post">
                                                            @csrf
                                                            <input type="hidden" name="vcard_id"
                                                                value="{{ $vcard->id }}">
                                                            <button type="submit" class="deletebtn btn btn-danger btn-sm">
                                                                {{ __('Delete') }}
                                                            </button>
                                                        </form>
                                                    </td>
                                                    @includeIf('admin.register_user.vcard.preview')
                                                    @includeIf('admin.register_user.vcard.template-modal')
                                                    @includeIf('admin.register_user.vcard.edit-template-modal')


                                                </tr>
                                            @endforeach
                                        </tbody>
                                    </table>
                                </div>
                            @endif
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="row">
                        <div class="d-inline-block mx-auto">
                            {{ $vcards->appends(['term' => request()->input('term')])->links() }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>


@endsection
