@extends('user.layout')

@php
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::id()],
      ['is_default', 1],
  ])->first();
  $userLanguages = \App\Models\User\Language::where('user_id', \Illuminate\Support\Facades\Auth::id())->get();
@endphp

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Page_Lists') }}</h4>
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
        <a href="#">{{ __('Pages') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Page_Lists') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">

      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">{{ __('Page_Lists') }}</div>
            </div>
            <div class="col-lg-3">
              @includeIf('user.partials.languages')
            </div>
            <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
              <a href="{{ route('user.page.create') . '?language=' . request()->input('language') }}"
                class="btn btn-primary float-lg-right float-left btn-sm"><i class="fas fa-plus"></i>
                {{ __('Add_Page') }}</a>
              <button class="btn btn-danger float-right btn-sm mr-2 d-none bulk-delete"
                data-href="{{ route('user.page.bulk.delete') }}"><i class="flaticon-interface-5"></i>
                {{ __('Delete') }}</button>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (count($apages) == 0)
                <h2 class="text-center">{{ __('NO_PAGE_ADDED') }}</h2>
              @else
                <div class="table-responsive">
                  <table class="table table-striped mt-3" id="basic-datatables">
                    <thead>
                      <tr>
                        <th scope="col">
                          <input type="checkbox" class="bulk-check" data-val="all">
                        </th>
                        <th scope="col">{{ __('Name') }}</th>
                        <th scope="col">{{ __('URL') }} </th>
                        <th scope="col">{{ __('Actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($apages as $key => $apage)
                        <tr>
                          <td>
                            <input type="checkbox" class="bulk-check" data-val="{{ $apage->id }}">
                          </td>
                          <td>{{ $apage->name }}</td>
                          <td>
                            <button class="btn btn-primary btn-sm" data-toggle="modal"
                              data-target="#urlsModal{{ $apage->id }}"><i class="fas fa-link"></i>
                              {{ __('URLs') }}</button>
                          </td>
                          <td>
                            <a class="btn btn-secondary btn-sm"
                              href="{{ route('user.page.edit', $apage->id) . '?language=' . request()->input('language') }}">
                              <i class="fas fa-edit"></i>
                            </a>
                            <form class="d-inline-block deleteform" action="{{ route('user.page.delete') }}"
                              method="post">
                              @csrf
                              <input type="hidden" name="pageid" value="{{ $apage->id }}">
                              <button type="submit" class="btn btn-danger btn-sm deletebtn">
                                <i class="fas fa-trash"></i>
                              </button>
                            </form>
                          </td>
                        </tr>

                        <!-- Modal -->
                        <div class="modal fade" id="urlsModal{{ $apage->id }}" tabindex="-1" role="dialog"
                          aria-labelledby="urlsModalLabel" aria-hidden="true">
                          <div class="modal-dialog modal-dialog-centered" role="document">
                            <div class="modal-content">
                              <div class="modal-header">
                                <h5 class="modal-title" id="urlsModalLabel">{{ __('Page_URLs') }}</h5>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                  <span aria-hidden="true">&times;</span>
                                </button>
                              </div>
                              <div class="modal-body">
                                <ul>
                                  <li>
                                    @php
                                      $pathUrl =
                                          env('WEBSITE_HOST') . '/' . Auth::user()->username . '/' . $apage->slug;
                                    @endphp
                                    <strong class="mr-2">{{ __('Path_Based_URL') }}:</strong>
                                    <a target="_blank" href="//{{ $pathUrl }}">{{ $pathUrl }}</a>
                                  </li>
                                  @if (cPackageHasSubdomain(Auth::user()))
                                    <li>
                                      @php
                                        $subUrl =
                                            Auth::user()->username . '.' . env('WEBSITE_HOST') . '/' . $apage->slug;
                                      @endphp
                                      <strong class="mr-2">{{ __('Subdomain_Based_URL') }}:</strong>
                                      <a target="_blank" href="//{{ $subUrl }}">{{ $subUrl }}</a>
                                    </li>
                                  @endif
                                  @if (cPackageHasCdomain(Auth::user()))
                                    @php
                                      $domUrl = Auth::user()
                                          ->custom_domains()
                                          ->where('status', 1)
                                          ->orderBy('id', 'DESC')
                                          ->first();
                                    @endphp
                                    @if (!empty($domUrl))
                                      <li>
                                        <strong class="mr-2">{{ __('Domain_Based_URL') }}:</strong>
                                        <a target="_blank"
                                          href="//{{ $domUrl->requested_domain }}/{{ $apage->slug }}">{{ $domUrl->requested_domain }}/{{ $apage->slug }}</a>
                                      </li>
                                    @endif
                                  @endif
                                </ul>
                              </div>
                              <div class="modal-footer">
                                <button type="button" class="btn btn-secondary"
                                  data-dismiss="modal">{{ __('Close') }}</button>
                              </div>
                            </div>
                          </div>
                        </div>
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
