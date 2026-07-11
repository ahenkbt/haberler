@extends('user.layout')

@section('content')
    <div class="page-header">
        <h4 class="page-title">
            {{ __('Report') }}
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
                <a href="#">{{ __('Donation_Management') }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __('Report') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-md-12">

            <div class="card">
                <div class="card-header p-1">
                    <div class="row">
                        <div class="col-lg-10">
                            <form action="{{ url()->full() }}" class="form-inline">
                                <div class="form-group">
                                    <label for="">{{ __('From') }}</label>
                                    <input class="form-control datepicker" type="text" name="from_date"
                                        placeholder="{{ __('From') }}"
                                        value="{{ request()->input('from_date') ? request()->input('from_date') : '' }}"
                                        required autocomplete="off" />
                                </div>

                                <div class="form-group">
                                    <label for="">{{ __('To') }}</label>
                                    <input class="form-control datepicker ml-1" type="text" name="to_date"
                                        placeholder="{{ __('To') }}"
                                        value="{{ request()->input('to_date') ? request()->input('to_date') : '' }}"
                                        required autocomplete="off" />
                                </div>

                                <div class="form-group">
                                    <label for="">{{ __('Payment_Method') }}</label>
                                    <select name="payment_method" class="form-control ml-1">
                                        <option value="" selected>{{ __('All') }}</option>
                                        @if (!empty($onPms))
                                            @foreach ($onPms as $onPm)
                                                <option value="{{ $onPm->name }}"
                                                    {{ request()->input('payment_method') == $onPm->name ? 'selected' : '' }}>
                                                    {{ $onPm->name }}</option>
                                            @endforeach
                                        @endif
                                        @if (!empty($offPms))
                                            @foreach ($offPms as $offPm)
                                                <option value="{{ $offPm->name }}"
                                                    {{ request()->input('payment_method') == $offPm->name ? 'selected' : '' }}>
                                                    {{ $offPm->name }}</option>
                                            @endforeach
                                        @endif
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label for="">{{ __('Payment_Status') }}</label>
                                    <select name="payment_status" class="form-control ml-1">
                                        <option value="" selected>{{ __('All') }}</option>
                                        <option value="pending"
                                            {{ request()->input('payment_status') == 'pending' ? 'selected' : '' }}>
                                            {{ __('Pending') }}
                                        </option>
                                        <option value="completed"
                                            {{ request()->input('payment_status') == 'completed' ? 'selected' : '' }}>
                                            {{ __('Success') }}
                                        </option>
                                        <option value="rejected"
                                            {{ request()->input('payment_status') == 'rejected' ? 'selected' : '' }}>
                                            {{ __('Rejected') }}</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <button type="submit" class="btn btn-primary btn-sm ml-1">{{ __('Submit') }}</button>
                                </div>
                            </form>
                        </div>
                        <div class="col-lg-2">
                            <form action="{{ route('user.donation.export') }}" class="form-inline justify-content-end">
                                <div class="form-group">
                                    <button type="submit" class="btn btn-success btn-sm ml-1"
                                        title="CSV Format">{{ __('Export') }}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-12">
                            @if (count($donations) > 0)
                                <div class="table-responsive">
                                    <table class="table table-striped mt-3">
                                        <thead>
                                            <tr>
                                                <th scope="col">{{ __('Donation_ID') }}
                                                </th>
                                                <th scope="col">{{ __('Name') }}</th>
                                                <th scope="col">{{ __('Email') }}</th>
                                                <th scope="col">{{ __('Phone') }}</th>
                                                <th scope="col">{{ __('Event') }}</th>
                                                <th scope="col">{{ __('Amount') }}</th>
                                                <th scope="col">{{ __('Gateway') }}</th>
                                                <th scope="col">
                                                    {{ __('Payment Status') }}</th>
                                                <th scope="col">{{ __('Date') }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach ($donations as $key => $donation)
                                                <tr>
                                                    <td>#{{ $donation->transaction_id }}</td>
                                                    <td>{{ $donation->name ? $donation->name : '-' }}</td>
                                                    <td>{{ $donation->email ? $donation->email : '-' }}</td>
                                                    <td>{{ $donation->phone ? $donation->phone : '-' }}</td>

                                                    <td>{{ strlen($donation->title) > 20 ? mb_substr($donation->title, 0, 20, 'utf-8') . '...' : $donation->title }}
                                                    </td>
                                                    <td>{{ $curencyInfo->base_currency_symbol_position == 'left' ? $curencyInfo->base_currency_symbol : '' }}{{ $donation->amount }}{{ $curencyInfo->base_currency_symbol_position == 'right' ? $curencyInfo->base_currency_symbol : '' }}
                                                    </td>
                                                    <td>{{ $donation->payment_method }}</td>
                                                    <td>
                                                        @if ($donation->status == 'completed')
                                                            <span class="badge badge-success">{{ __('Success') }}</span>
                                                        @elseif ($donation->status == 'pending')
                                                            <span class="badge badge-warning">{{ __('Pending') }}</span>
                                                        @elseif ($donation->status == 'rejected')
                                                            <span class="badge badge-danger">{{ __('Rejected') }}</span>
                                                        @endif
                                                    </td>
                                                    <td>{{ $donation->created_at }}</td>
                                                </tr>
                                            @endforeach
                                        </tbody>
                                    </table>
                                </div>
                            @endif
                        </div>
                    </div>
                </div>

                @if (!empty($donations))
                    <div class="card-footer">
                        <div class="row">
                            <div class="d-inline-block mx-auto">
                                {{ $donations->appends(request()->input())->links() }}
                            </div>
                        </div>
                    </div>
                @endif
            </div>
        </div>
    </div>

@endsection
