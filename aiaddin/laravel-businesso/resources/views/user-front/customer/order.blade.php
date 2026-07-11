@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['myOrders'] ?? __('My Orders') }}
@endsection

@section('page-name')
  {{ $keywords['myOrders'] ?? __('myOrders') }}
@endsection
@section('br-name')
  {{ $keywords['myOrders'] ?? __('myOrders') }}
@endsection
@section('content')
  <section class="user-dashbord pt-100 pb-60">
    <div class="container">
      <div class="row">
        @includeIf('user-front.customer.side-navbar')
        <div class="col-lg-9">
          <div class="row">
            <div class="col-lg-12">
              <div class="user-profile-details mb-40">
                <div class="account-info">
                  <div class="title mb-2">
                    <h4>{{ $keywords['myOrders'] ?? __('My Orders') }}</h4>
                  </div>
                  <div class="main-info">
                    <div class="main-table">
                      <div class="table-responsive">
                        <table id="order_table" class="dataTables_wrapper table-striped dt-bootstrap4" style="width:100%">
                          <thead>
                            <tr>
                              <th>{{ $keywords['order_number'] ?? __('order number') }}</th>
                              <th>{{ $keywords['date'] ?? __('date') }}</th>
                              <th>{{ $keywords['total'] ?? __('total') }}</th>
                              <th>{{ $keywords['Status'] ?? __('status') }}</th>
                              <th>{{ $keywords['action'] ?? __('action') }}</th>
                            </tr>
                          </thead>
                          <tbody>
                            @if ($orders)
                              @foreach ($orders as $order)
                                <tr>
                                  <td>{{ $order->order_number }}</td>
                                  <td>{{ $order->created_at->format('d-m-Y') }}</td>
                                  <td>
                                    {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                    {{ $order->total }}
                                    {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                  </td>
                                  <td> <span
                                      class="front-status-btn {{ $order->order_status }}">{{ $keywords[$order->order_status] ?? $order->order_status }}</span>
                                  </td>
                                  <td>
                                    <a href="{{ route('customer.orders-details', ['id' => $order->id, getParam()]) }}"
                                      class="btn base-bg">{{ $keywords['details'] ?? __('Details') }}</a>
                                  </td>
                                </tr>
                              @endforeach
                            @else
                              <tr class="text-center">
                                <td colspan="4">
                                  {{ $keywords['no_items'] ?? __('No Items found!') }}
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
@endsection
@section('scripts')
  <script>
    $(document).ready(function() {
      $('#order_table').DataTable({
        ordering: false
      });
    });
  </script>
@endsection
