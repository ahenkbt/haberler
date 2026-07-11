@extends('user.layout')

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('vCard_Services') }}</h4>
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
        <a href="#">{{ __('vCards') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ $vcard->vcard_name }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Services') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">{{ __('vCard_Services') }}
              </div>
            </div>
            <div class="col-lg-4 offset-lg-4 mt-2 mt-lg-0">
              <a href="{{ route('user.vcard') . '?language=' . request('language') }}"
                class="btn btn-secondary float-right btn-sm ml-2"><i class="fas fa-backward"></i>
                {{ __('Back') }}</a>
              <a href="#" class="btn btn-primary float-right btn-sm" data-toggle="modal"
                data-target="#createModal"><i class="fas fa-plus"></i>
                {{ __('Add_Service') }}</a>
              <button class="btn btn-danger float-right btn-sm mr-2 d-none bulk-delete"
                data-href="{{ route('user.vcard.bulkServiceDelete') }}"><i class="flaticon-interface-5"></i>
                {{ __('Delete') }}</button>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (count($services) == 0)
                <h3 class="text-center">{{ __('NO_SERVICE_FOUND') }}</h3>
              @else
                <div class="table-responsive">
                  <table class="table table-striped mt-3" id="basic-datatables">
                    <thead>
                      <tr>
                        <th scope="col">
                          <input type="checkbox" class="bulk-check" data-val="all">
                        </th>
                        <th scope="col">{{ __('Image') }}</th>
                        <th scope="col">{{ __('Title') }}</th>
                        <th scope="col">{{ __('Serial_Number') }}
                        </th>
                        <th scope="col">{{ __('Actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($services as $key => $service)
                        <tr>
                          <td>
                            <input type="checkbox" class="bulk-check" data-val="{{ $service->id }}">
                          </td>
                          <td><img src="{{ asset('assets/front/img/user/services/' . $service->image) }}" alt=""
                              width="80"></td>
                          <td>
                            {{ strlen($service->title) > 30 ? mb_substr($service->title, 0, 30, 'UTF-8') . '...' : $service->title }}
                          </td>
                          <td>
                            {{ $service->serial_number }}
                          </td>
                          <td>
                            <a href="#" class="btn btn-warning btn-sm editbtn" data-toggle="modal"
                              data-target="#editModal" data-service_id="{{ $service->id }}"
                              data-title="{{ $service->title }}"
                              data-external_link_status="{{ $service->external_link_status }}"
                              data-external_link="{{ $service->external_link }}"
                              data-short_details="{{ $service->short_details }}"
                              data-serial_number="{{ $service->serial_number }}"
                              data-image="{{ asset('assets/front/img/user/services/' . $service->image) }}">
                              <span class="btn-label">
                                <i class="fas fa-edit"></i>
                              </span>
                              {{ __('Edit') }}
                            </a>
                            <form class="deleteform d-inline-block" action="{{ route('user.vcard.serviceDelete') }}"
                              method="post">
                              @csrf
                              <input type="hidden" name="service_id" value="{{ $service->id }}">
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

  @includeIf('user.vcard.services.create')
  @includeIf('user.vcard.services.edit')
@endsection

@section('scripts')
  <script>
    function toggleDetails(val, shortDetailsId, extLinkId) {

      if (val == 1) {
        $("#" + shortDetailsId).hide();
        $("#" + extLinkId).show();
      } else {
        $("#" + extLinkId).hide();
        $("#" + shortDetailsId).show();
      }
    }
    $(document).ready(function() {
      $(".editbtn").on('click', function() {
        setTimeout(() => {
          let $elstatus = $('#ajaxEditForm .elstatus:checked');
          let val = $elstatus.val();
          let shortDetailsId = $elstatus.data('short_details_id');
          let extLinkId = $elstatus.data('ext_link_id');
          toggleDetails(val, shortDetailsId, extLinkId);
        }, 300);
      });
      $(".elstatus").on('change', function() {
        let val = $(this).val();
        let shortDetailsId = $(this).data('short_details_id');
        let extLinkId = $(this).data('ext_link_id');
        toggleDetails(val, shortDetailsId, extLinkId);
      });
    });
  </script>
@endsection
