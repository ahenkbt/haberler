@extends('user-front.layout')

{{-- @section('pageHeading')
    {{ $keywords['my_courses'] ?? __('My Courses') }}
@endsection --}}

@section('tab-title')
  {{ $keywords['Donations'] ?? __('Donations') }}
@endsection

@section('page-name')
  {{ $keywords['Donations'] ?? __('Donations') }}
@endsection
@section('br-name')
  {{ $keywords['Donations'] ?? __('Donations') }}
@endsection


@section('content')


  <!-- Start User Enrolled Course Section -->
  <section class="user-dashbord pt-100 pb-60">
    <div class="container">
      <div class="row">
        @includeIf('user-front.customer.side-navbar')
        <div class="col-lg-9">
          <div class="row">
            <div class="col-lg-12">
              <div class="user-profile-details">
                <div class="account-info">
                  <div class="title">
                    <h4>{{ $keywords['Donations'] ?? __('Donations') }}</h4>
                  </div>
                  <div class="main-info">
                    <div class="main-table">
                      <div class="table-responsiv">
                        <table id="donationTable" class="dataTables_wrapper dt-responsive table-striped dt-bootstrap4"
                          style="width:100%">
                          <thead>
                            <tr>
                              <th>{{ $keywords['Transaction_Id'] ?? __('Transaction ID') }}
                              </th>
                              <th>{{ $keywords['Cause'] ?? __('Cause') }}</th>
                              <th>{{ $keywords['Amount'] ?? __('Amount') }}</th>
                              <th>{{ $keywords['Gateway'] ?? __('Gateway') }}</th>
                              <th>{{ $keywords['Payment'] ?? __('Payment') }}</th>
                            </tr>
                          </thead>
                          <tbody>
                            @if ($donations)
                              @foreach ($donations as $donation)
                                <tr>
                                  <td>{{ $donation->transaction_id }}</td>
                                  <td>
                                    @if ($donation->slug != null && $donation->title != null)
                                      <a href="{{ route('front.user.causesDetails', [getParam(), $donation->slug]) }}">
                                        {{ strlen($donation->title > 20) ? mb_substr($donation->title, 0, 20, 'UTF-8') . '...' : $donation->title }}
                                      </a>
                                    @else
                                      {{ '---' }}
                                    @endif
                                  </td>
                                  <td>
                                    {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                    {{ $donation->amount }}
                                    {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                  </td>
                                  <td>{{ $donation->payment_method }}</td>
                                  <td>
                                    @if ($donation->status == 'completed')
                                      <span
                                        class="badge badge-success">{{ $keywords['Completed'] ?? __('Completed') }}</span>
                                    @elseif ($donation->status == 'pending')
                                      <span
                                        class="badge badge-warning">{{ $keywords['Pending'] ?? __('Pending') }}</span>
                                    @elseif ($donation->status == 'rejected')
                                      <span
                                        class="badge badge-danger">{{ $keywords['Rejected'] ?? __('Rejected') }}</span>
                                    @endif
                                  </td>
                                </tr>
                              @endforeach
                            @else
                              <tr class="text-center">
                                <td colspan="4">
                                  {{ $keywords['NO_DONATION_FOUND'] ?? __('No Donation Found') }}
                                </td>
                              </tr>
                            @endif
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <!--    footer section start   -->
@endsection

@section('scripts')
  <script>
    $(document).ready(function() {
      $('#donationTable').DataTable({
        responsive: true,
        ordering: false
      });
    });
  </script>
@endsection
