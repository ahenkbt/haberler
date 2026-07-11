@extends('user.layout')

@section('content')
    <div class="page-header">
        <h4 class="page-title">
            @if (request()->path() == 'admin/product/pending/orders')
                {{ __('Pending')  }}
            @elseif (request()->path() == 'admin/product/all/orders')
                {{ __('All')  }}
            @elseif (request()->path() == 'admin/product/processing/orders')
            {{ __('Processing')  }}
            @elseif (request()->path() == 'admin/product/completed/orders')
                {{ __('Completed')  }}
            @elseif (request()->path() == 'admin/product/rejected/orders')
                {{ __('Rejcted')  }}
            @endif
            {{ __('Orders')  }}
        </h4>
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
                <a href="#">{{ __('Shop_Management')  }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Manage_Orders')  }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">
                    @if (request()->path() == 'admin/product/pending/orders')
                        {{ __('Pending')  }}
                    @elseif (request()->path() == 'admin/product/all/orders')
                        {{ __('All')  }}
                    @elseif (request()->path() == 'admin/product/processing/orders')
                        {{ __('Processing')  }}
                    @elseif (request()->path() == 'admin/product/completed/orders')
                        {{ __('Completed')  }}
                    @elseif (request()->path() == 'admin/product/rejected/orders')
                        {{ __('Rejcted')  }}
                    @elseif (request()->path() == 'admin/product/search/orders')
                        {{ __('Search')  }}
                    @endif
                    {{ __('Orders')  }}
                </a>
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
                                @if (request()->path() == 'admin/product/item/orders')
                                    {{ __('Pending')  }}
                                @elseif (request()->path() == 'admin/item/all/orders')
                                     {{ __('All')  }}
                                @elseif (request()->path() == 'admin/item/processing/orders')
                                    {{ __('Processing')  }}
                                @elseif (request()->path() == 'admin/item/completed/orders')
                                    {{ __('Completed')  }}
                                @elseif (request()->path() == 'admin/item/rejected/orders')
                                    {{ __('Rejcted')  }}
                                @elseif (request()->path() == 'admin/item/search/orders')
                                    {{ __('Search')  }}
                                @endif
                                {{ __('Orders')  }}
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <button class="btn btn-danger float-right btn-md ml-4 d-none bulk-delete"
                                data-href="{{ route('user.item.order.bulk.delete') }}"><i class="flaticon-interface-5"></i>
                                {{ __('Delete')  }}</button>
                            <form action="{{ url()->current() }}" class="d-inline-block float-right">
                                <input class="form-control" type="text" name="search"
                                    placeholder="{{ __('Search_by_Order_Number')   }}"
                                    value="{{ request()->input('search') ? request()->input('search') : '' }}">
                            </form>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-12">
                            @if (count($orders) == 0)
                                <h3 class="text-center">{{ __('NO_ORDER_FOUND') }}</h3>
                            @else
                                <div class="table-responsive">
                                    <table class="table table-striped mt-3">
                                        <thead>
                                            <tr>
                                                <th scope="col">
                                                    <input type="checkbox" class="bulk-check" data-val="all">
                                                </th>
                                                <th scope="col">{{__('Order_Number') }}</th>
                                                <th scope="col">{{__('Gateway') }}</th>
                                                <th scope="col">{{__('Total') }}</th>
                                                <th scope="col">{{__('Order_Status') }}</th>
                                                <th scope="col">{{__('Payment_Status') }}</th>
                                                <th scope="col">{{__('Receipt') }}</th>
                                                <th scope="col">{{__('Actions') }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach ($orders as $key => $order)
                                                <tr>
                                                    <td>
                                                        <input type="checkbox" class="bulk-check"
                                                            data-val="{{ $order->id }}">
                                                    </td>
                                                    <td>#{{ $order->order_number }}</td>
                                                    <td>{{ $order->method }}</td>
                                                    <td>{{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                                        {{ round($order->total, 2) }}
                                                        {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                                    </td>
                                                    <td>
                                                        <form id="statusForm{{ $order->id }}" class="d-inline-block"
                                                            action="{{ route('user.item.orders.status') }}" method="post">
                                                            @csrf
                                                            <input type="hidden" name="order_id"
                                                                value="{{ $order->id }}">
                                                            <select
                                                                class="form-control form-control-sm
                                                                @if ($order->order_status == 'Pending') bg-warning
                                                                @elseif ($order->order_status == 'processing')
                                                                    bg-primary
                                                                @elseif ($order->order_status == 'completed')
                                                                    bg-success
                                                                @elseif ($order->order_status == 'rejected')
                                                                    bg-danger @endif
                                                                "
                                                                name="order_status"
                                                                onchange="document.getElementById('statusForm{{ $order->id }}').submit();">
                                                                <option value="Pending"
                                                                    {{ $order->order_status == 'Pending' ? 'selected' : '' }}>
                                                                    {{__('Pending') }}</option>
                                                                <option value="processing"
                                                                    {{ $order->order_status == 'processing' ? 'selected' : '' }}>
                                                                    {{__('Processing') }}</option>
                                                                <option value="completed"
                                                                    {{ $order->order_status == 'completed' ? 'selected' : '' }}>
                                                                    {{__('Completed') }}</option>
                                                                <option value="rejected"
                                                                    {{ $order->order_status == 'rejected' ? 'selected' : '' }}>
                                                                    {{__('Rejected') }}</option>
                                                            </select>
                                                        </form>
                                                    </td>
                                                    <td>
                                                        @if ($order->gateway_type != 'offline')
                                                            @if ($order->payment_status == 'Completed')
                                                                <span class="badge badge-success">{{__('Completed') }}</span>
                                                            @elseif($order->payment_status == 'Pending')
                                                                <span class="badge badge-warning">{{__('Pending') }}</span>
                                                            @endif
                                                        @elseif ($order->gateway_type == 'offline')
                                                            <form action="{{ route('user.item.paymentStatus') }}"
                                                                id="paymentStatusForm{{ $order->id }}" method="POST">
                                                                @csrf
                                                                <input type="hidden" name="order_id"
                                                                    value="{{ $order->id }}">
                                                                <select
                                                                    class="form-control-sm text-white border-0   @if ($order->payment_status == 'Completed') bg-success  @elseif($order->payment_status == 'Pending') bg-warning @elseif ($order->payment_status == 'rejected') bg-danger @endif "
                                                                    name="payment_status"
                                                                    onchange="document.getElementById('paymentStatusForm{{ $order->id }}').submit();">
                                                                    <option value="Pending"
                                                                        {{ $order->payment_status == 'Pending' ? 'selected' : '' }}>
                                                                        {{__('Pending') }}</option>
                                                                    <option value="Completed"
                                                                        {{ $order->payment_status == 'Completed' ? 'selected' : '' }}>
                                                                        {{__('Completed') }}</option>
                                                                    <option value="rejected"
                                                                        {{ $order->payment_status == 'rejected' ? 'selected' : '' }}>
                                                                        {{__('Rejected') }}</option>
                                                                </select>
                                                            </form>
                                                        @endif
                                                    </td>
                                                    <td>
                                                        @if (!empty($order->receipt))
                                                            <a class="btn btn-sm btn-info" href="#"
                                                                data-toggle="modal"
                                                                data-target="#receiptModal{{ $order->id }}">{{__('Show') }}</a>
                                                        @else
                                                            -
                                                        @endif
                                                    </td>
                                                    <td>
                                                        <div class="dropdown">
                                                            <button class="btn btn-info btn-sm dropdown-toggle"
                                                                type="button" id="dropdownMenuButton"
                                                                data-toggle="dropdown" aria-haspopup="true"
                                                                aria-expanded="false">
                                                                {{__('Actions') }}
                                                            </button>
                                                            <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                                                                <a class="dropdown-item"
                                                                    href="{{ route('user.item.details', $order->id) }}"
                                                                    target="_blank">{{__('Details') }}</a>
                                                                <a class="dropdown-item"
                                                                    href="{{ asset('assets/front/invoices/' . $order->invoice_number) }}"
                                                                    target="_blank">{{__('Invoice') }}</a>
                                                                <form class="deleteform d-block"
                                                                    action="{{ route('user.item.order.delete') }}"
                                                                    method="post">
                                                                    @csrf
                                                                    <input type="hidden" name="order_id"
                                                                        value="{{ $order->id }}">
                                                                    <button type="submit" class=" d-block deletebtn">
                                                                        {{__('Delete') }}
                                                                    </button>
                                                                </form>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {{-- Receipt Modal --}}
                                                <div class="modal fade" id="receiptModal{{ $order->id }}"
                                                    tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel"
                                                    aria-hidden="true">
                                                    <div class="modal-dialog" role="document">
                                                        <div class="modal-content">
                                                            <div class="modal-header">
                                                                <h5 class="modal-title" id="exampleModalLabel">{{__('Receipt_Image') }}</h5>
                                                                <button type="button" class="close"
                                                                    data-dismiss="modal" aria-label="Close">
                                                                    <span aria-hidden="true">&times;</span>
                                                                </button>
                                                            </div>
                                                            <div class="modal-body">
                                                                <img src="{{ asset('assets/front/receipt/' . $order->receipt) }}"
                                                                    alt="Receipt" width="100%">
                                                            </div>
                                                            <div class="modal-footer">
                                                                <button type="button" class="btn btn-secondary"
                                                                    data-dismiss="modal">{{__('Close') }}</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            @endforeach
                                        </tbody>
                                    </table>
                                </div>

                                <!-- Send Mail Modal -->
                                <div class="modal fade" id="mailModal" tabindex="-1" role="dialog"
                                    aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                                    <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
                                        <div class="modal-content">
                                            <div class="modal-header">
                                                <h5 class="modal-title" id="exampleModalLongTitle">{{__('Send_Mail') }}</h5>
                                                <button type="button" class="close" data-dismiss="modal"
                                                    aria-label="Close">
                                                    <span aria-hidden="true">&times;</span>
                                                </button>
                                            </div>
                                            <div class="modal-body">
                                                <form id="ajaxEditForm" class=""
                                                    action="{{ route('user.orders.mail') }}" method="POST">
                                                    @csrf
                                                    <div class="form-group">
                                                        <label for="">{{__('Client_Mail') }} **</label>
                                                        <input id="inemail" type="text" class="form-control"
                                                            name="email" value="" placeholder="{{__('Enter_email') }}">
                                                        <p id="eerremail" class="mb-0 text-danger em"></p>
                                                    </div>
                                                    <div class="form-group">
                                                        <label for="">{{__('Subject') }} **</label>
                                                        <input id="insubject" type="text" class="form-control"
                                                            name="subject" value="" placeholder="{{__('Enter_subject') }}">
                                                        <p id="eerrsubject" class="mb-0 text-danger em"></p>
                                                    </div>
                                                    <div class="form-group">
                                                        <label for="">{{__('Message') }} **</label>
                                                        <textarea id="inmessage" class="form-control summernote" name="message" placeholder="{{__('Enter_message') }}"
                                                            data-height="150"></textarea>
                                                        <p id="eerrmessage" class="mb-0 text-danger em"></p>
                                                    </div>
                                                </form>
                                            </div>
                                            <div class="modal-footer">
                                                <button type="button" class="btn btn-secondary"
                                                    data-dismiss="modal">{{__('Close') }}</button>
                                                <button id="updateBtn" type="button" class="btn btn-primary">{{__('Send_Mail') }}</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            @endif
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="row">
                        <div class="d-inline-block mx-auto">
                            {{ $orders->appends(['search' => request()->input('search')])->links() }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
