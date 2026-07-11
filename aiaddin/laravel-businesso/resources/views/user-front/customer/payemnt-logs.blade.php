@extends('user-front.common.layout')

@section('tab-title')
  {{ $keywords['payment_log'] ?? __('Payment Log') }}
@endsection

@section('page-name')
  {{ $keywords['payment_log'] ?? __('Payment Log') }}
@endsection
@section('br-name')
  {{ $keywords['payment_log'] ?? __('Payment Log') }}
@endsection

@section('content')
  <!--====== PAGE BANNER PART START ======-->
  <section class="page-banner"
    style="background: linear-gradient(to right, #{{ $websiteInfo->breadcrumb_color1 }} 0%, #{{ $websiteInfo->breadcrumb_color2 }} 100%);">
    <div class="container">
      <div class="page-banner-content text-center">
        <h4 class="title">{{ $currentLanguageInfo->pageHeading->paymentlog ?? __('My Payment Logs') }}
        </h4>
      </div>
    </div>
  </section>
  <!--====== PAGE BANNER PART ENDS ======-->
  <!--====== PROFILE PART START ======-->
  <section class="profile-area pt-70 pb-120">
    <div class="container">
      <div class="row">
        @includeIf('user-front.user.side-navbar')
        <div class="col-lg-9">
          <div class="profile-my-ads mt-50">
            <div class="profile-sidebar-title">
              <h4 class="title p-title">
                {{ $currentLanguageInfo->pageHeading->paymentlog ?? __('My Payment Logs') }}
                <form action="{{ url()->current() }}" class="d-inline-block float-right p-form">
                  <input class="form-control" type="text" name="search"
                    placeholder="{{ $keywords['Search_by_Transaction_ID'] ?? 'Search by Transaction ID' }}"
                    value="{{ request()->input('search') ? request()->input('search') : '' }}">
                </form>
              </h4>

            </div>
            <div class="profile-ads-table table-responsive mt-30">
              <table class="table table-striped mt-3">
                <thead>
                  <tr>
                    <th scope="col">{{ $keywords['Transaction_Id'] ?? 'Transaction Id' }}</th>
                    <th scope="col">{{ $keywords['Amount'] ?? 'Amount' }}</th>
                    <th scope="col">{{ $keywords['Payment_Status'] ?? 'Payment Status' }}</th>
                    <th scope="col">{{ $keywords['Payment_Method'] ?? 'Payment Method' }}</th>
                    <th scope="col">{{ $keywords['Receipt'] ?? 'Receipt' }}</th>
                    <th scope="col">{{ $keywords['Actions'] ?? 'Actions' }}</th>
                  </tr>
                </thead>
                <tbody>
                  @foreach ($memberships as $key => $membership)
                    <tr>
                      <td>
                        {{ strlen($membership->transaction_id) > 30 ? mb_substr($membership->transaction_id, 0, 30, 'UTF-8') . '...' : $membership->transaction_id }}
                      </td>
                      @php
                        $bex = json_decode($membership->settings);
                      @endphp
                      <td>
                        @if ($membership->price == 0)
                          {{ $keywords['Free'] ?? 'Free' }}
                        @else
                          {{ format_price($membership->price) }}
                        @endif
                      </td>
                      <td>

                        @if ($membership->status == 1)
                          <h3 class="d-inline-block badge badge-success">
                            {{ $keywords['Success'] ?? 'Success' }}</h3>
                        @elseif ($membership->status == 0)
                          <h3 class="d-inline-block badge badge-warning">
                            {{ $keywords['Pending'] ?? 'Pending' }}</h3>
                        @elseif ($membership->status == 2)
                          <h3 class="d-inline-block badge badge-danger">
                            {{ $keywords['Rejected'] ?? 'Rejected' }}</h3>
                        @endif
                      </td>
                      <td>{{ $membership->payment_method }}</td>

                      <td>
                        @if (!empty($membership->receipt))
                          <a class="btn btn-sm btn-info" href="#" data-toggle="modal"
                            data-target="#receiptModal{{ $membership->id }}">{{ $keywords['Show'] ?? 'Show' }}</a>
                        @else
                          -
                        @endif
                      </td>
                      <td>
                        @if (!empty($membership->name !== 'anonymous'))
                          <a class="btn btn-sm btn-info" href="#" data-toggle="modal"
                            data-target="#detailsModal{{ $membership->id }}">{{ $keywords['details'] ?? 'Detail' }}
                          </a>
                        @else
                          -
                        @endif
                      </td>
                    </tr>
                    <div class="modal fade" id="receiptModal{{ $membership->id }}" tabindex="-1" role="dialog"
                      aria-labelledby="exampleModalLabel" aria-hidden="true">
                      <div class="modal-dialog" role="document">
                        <div class="modal-content">
                          <div class="modal-header">
                            <h5 class="modal-title" id="exampleModalLabel">
                              {{ $keywords['Receipt_Image'] ?? 'Receipt Image' }}
                            </h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                              <span aria-hidden="true">&times;</span>
                            </button>
                          </div>
                          <div class="modal-body">
                            <img class="lazy"
                              data-src="{{ asset('assets/front/img/membership/receipt/' . $membership->receipt) }}"
                              alt="Receipt" width="100%">
                          </div>
                          <div class="modal-footer">
                            <button type="button" class="btn btn-secondary"
                              data-dismiss="modal">{{ $keywords['Close'] ?? 'Close' }}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="modal fade" id="detailsModal{{ $membership->id }}" tabindex="-1" role="dialog"
                      aria-labelledby="exampleModalLabel" aria-hidden="true">
                      <div class="modal-dialog" role="document">
                        <div class="modal-content">
                          <div class="modal-header">
                            <h5 class="modal-title" id="exampleModalLabel">
                              {{ $keywords['Owner_Details'] ?? 'Owner Details' }}
                            </h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                              <span aria-hidden="true">&times;</span>
                            </button>
                          </div>
                          <div class="modal-body">
                            <h3 class="text-warning">
                              {{ $keywords['Member_details'] ?? 'Member details' }}
                            </h3>
                            <label>{{ $keywords['Name'] ?? 'Name' }}</label>
                            <p>{{ $membership->user->first_name . ' ' . $membership->user->last_name }}
                            </p>
                            <label>{{ $keywords['Email'] ?? 'Email' }}</label>
                            <p>{{ $membership->user->email }}</p>
                            <label>{{ $keywords['Phone'] ?? 'Phone' }}</label>
                            <p>{{ $membership->user->phone }}</p>
                            <h3 class="text-warning">
                              {{ $keywords['Payment_details'] ?? 'Payment_details' }}</h3>
                            <p><strong>{{ $keywords['Cost'] ?? 'Cost' }}: </strong>
                              {{ $membership->price == 0 ? 'Free' : $membership->price }}
                            </p>
                            <p><strong>{{ $keywords['Currency'] ?? 'Currency' }}: </strong>
                              {{ $membership->currency }}
                            </p>
                            <p><strong>{{ $keywords['Method'] ?? 'Method' }}: </strong>
                              {{ $membership->payment_method }}
                            </p>
                            <h3 class="text-warning">
                              {{ $keywords['Package_details'] ?? 'Package details' }}</h3>
                            <p><strong>{{ $keywords['Title'] ?? 'Title' }} :
                              </strong>{{ !empty($membership->package) ? $membership->package->title : '' }}
                            </p>
                            <p><strong>{{ $keywords['Term'] ?? 'Term' }} : </strong>
                              {{ !empty($membership->package) ? $membership->package->term : '' }}
                            </p>
                            <p><strong>{{ $keywords['Start_Date'] ?? 'Start Date' }}:
                              </strong>{{ \Illuminate\Support\Carbon::parse($membership->start_date)->format('M-d-Y') }}
                            </p>
                            <p>
                              <strong>{{ $keywords['End_Date'] ?? 'End Date' }}:
                              </strong>{{ \Illuminate\Support\Carbon::parse($membership->expire_date)->format('M-d-Y') }}
                            </p>
                            <p>
                              <strong>{{ $keywords['Purchase_Type'] ?? 'Purchase Type' }} :
                              </strong>
                              @if ($membership->is_trial == 1)
                                {{ $keywords['Trial'] ?? 'Trial' }}
                              @else
                                {{ $membership->price == 0 ? __('Free') : __('Regular') }}
                              @endif
                            </p>
                          </div>
                          <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">
                              {{ $keywords['Close'] ?? 'Close' }}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  @endforeach
                </tbody>
              </table>
            </div>
            <div class="card-footer">
              <div class="row">
                <div class="d-inline-block mx-auto">
                  {{ $memberships->links() }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <!--====== PROFILE PART ENDS ======-->
@endsection
