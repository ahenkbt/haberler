@extends('user.layout')

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{  __('Custom_Domain')  }}</h4>
        <ul class="breadcrumbs">
            <li class="nav-home">
                <a href="{{route('user-dashboard') . '?language=' . request('language')}}">
                    <i class="flaticon-home"></i>
                </a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{  __('Domains_and_URLs')   }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{  __('Custom_Domain')   }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">
            <!-- Custom Domain Request Modal -->
            <div class="modal fade" id="customDomainModal" tabindex="-1" role="dialog"
                 aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="exampleModalLongTitle">{{  __('Request_Custom_Domain')   }}</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            @if (cPackageHasCdomain(Auth::user()))
                                @if (Auth::user()->custom_domains()->where('status', 1)->count() > 0)
                                    <div class="alert alert-warning">
                                        {{  __('You_already_have_a_custom_domain')   }}
                                        (<a target="_blank" href="//{{getCdomain(Auth::user())}}">{{getCdomain(Auth::user())}}</a>)
                                        {{  __('connected_with_your_portfolio_website')   }} <br>
                                        {{  __('domain_connection_warning_message')  }}
                                        (<a target="_blank" href="//{{getCdomain(Auth::user())}}">{{getCdomain(Auth::user())}}</a>)
                                        {{  __('will_be_removed')   }}
                                    </div>
                                @endif
                            @endif
                            <form action="{{route('user-domain-request')}}" id="customDomainRequestForm" method="POST">
                                @csrf
                                <div class="form-group">
                                    <label for="">{{  __('Custom_Domain')   }}</label>
                                    <input type="text" class="form-control" name="custom_domain"
                                           placeholder="example.com" required>
                                    <p class="text-secondary mb-0"><i class="fas fa-exclamation-circle"></i> {{  __('Do_not_use')   }}
                                        <strong class="text-danger">http://</strong> or <strong class="text-danger">https://</strong></p>
                                    <p class="text-secondary mb-0"><i class="fas fa-exclamation-circle"></i>
                                        {{   __('The_valid_format_will_be_exactly_like_this_one')   }} - <strong
                                            class="text-danger">domain.tld, www.domain.tld</strong> {{__('or')}} <strong
                                            class="text-danger">subdomain.domain.tld, www.subdomain.domain.tld</strong></strong>
                                    </p>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">{{  __('Close')  }}</button>
                            <button type="submit" class="btn btn-primary" form="customDomainRequestForm">
                                {{   __('Send_Request')  }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            @if (session()->has('domain-success'))
                <div class="alert alert-success bg-success text-white">
                    <p class="mb-0">{!! nl2br(session()->get('domain-success')) !!}</p>
                </div>
            @endif

            @if ($errors->has('custom_domain'))
                <div class="alert alert-danger bg-danger text-white">
                    <p class="mb-0">{!! $errors->first('custom_domain') !!}</p>
                </div>
            @endif

            <div class="card">
                <div class="card-header">
                    <div class="row">
                        <div class="col-lg-4">
                            <div class="card-title d-inline-block">{{  __('Custom_Domain')   }}</div>
                        </div>
                        <div class="offset-lg-4 col-lg-4 text-right">
                            @if (empty($rcDomain) || $rcDomain->status != 0)
                                <button class="btn btn-primary" data-toggle="modal" data-target="#customDomainModal">
                                    {{  __('Request_Custom_Domain')   }}
                                </button>
                            @endif
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-12">
                            @if (empty($rcDomain))
                                <h3 class="text-center">{{  __('Requested_custom_domain_not_available')   }}</h3>
                            @else
                                <div class="table-responsive">
                                    <table class="table table-striped mt-3">
                                        <thead>
                                        <tr>
                                            <th scope="col">{{  __('Requested_Domain')   }}</th>
                                            <th scope="col">{{  __('Current_Domain')   }}</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        <tr>
                                            <td>
                                                @if ($rcDomain->status == 0)
                                                    <a href="//{{$rcDomain->requested_domain}}"
                                                       target="_blank">{{$rcDomain->requested_domain}}</a>
                                                @else
                                                    -
                                                @endif
                                            </td>
                                            <td>
                                                @if (getCdomain(Auth::user()))
                                                    @php
                                                        $cdomain = getCdomain(Auth::user());
                                                    @endphp
                                                    <a target="_blank" href="//{{$cdomain}}">{{$cdomain ?? '-'}}</a>
                                                @else
                                                    -
                                                @endif
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            @endif
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h4 class="mb-0"><strong>{{ $be->cname_record_section_title }}</strong></h4>
                </div>
                <div class="card-body">
                    {!! $be->cname_record_section_text !!}
                </div>
            </div>
        </div>
    </div>
@endsection
