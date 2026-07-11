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
                <a href="#">{{ __('Course_Enrolments') }}</a>
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
                                        placeholder=" {{ __('From') }}"
                                        value="{{ request()->input('from_date') ? request()->input('from_date') : '' }}"
                                        required autocomplete="off">
                                </div>

                                <div class="form-group">
                                    <label for="">{{ __('To') }}</label>
                                    <input class="form-control datepicker ml-1" type="text" name="to_date"
                                        placeholder="{{ __('To') }}"
                                        value="{{ request()->input('to_date') ? request()->input('to_date') : '' }}"
                                        required autocomplete="off">
                                </div>

                                <div class="form-group">
                                    <label for="">{{ __('Payment_Method') }}</label>
                                    <select name="payment_method" class="form-control ml-1">
                                        <option value="" selected>{{ __('All') }}</option>
                                        @if (!empty($onPms))
                                            @foreach ($onPms as $onPm)
                                                <option value="{{ $onPm->keyword }}"
                                                    {{ request()->input('payment_method') == $onPm->keyword ? 'selected' : '' }}>
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
                                        <option value="Pending"
                                            {{ request()->input('payment_status') == 'Pending' ? 'selected' : '' }}>
                                            {{ __('Pending') }}</option>
                                        <option value="Completed"
                                            {{ request()->input('payment_status') == 'Completed' ? 'selected' : '' }}>
                                            {{ __('Completed') }}</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <button type="submit"
                                        class="btn btn-primary btn-sm ml-1">{{ __('Submit') }}</button>
                                </div>
                            </form>
                        </div>
                        <div class="col-lg-2">
                            <form action="{{ route('user.course_enrolments.export') }}"
                                class="form-inline justify-content-end">
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
                            @if (count($enrolments) > 0)
                                <div class="table-responsive">
                                    <table class="table table-striped mt-3">
                                        <thead>
                                            <tr>
                                                <th scope="col">{{ __('Order') }}</th>
                                                <th scope="col">{{ __('Course') }}</th>
                                                <th scope="col">{{ __('Price') }}</th>
                                                <th scope="col">{{ __('Discount') }}</th>
                                                <th scope="col">{{ __('Total') }}</th>
                                                <th scope="col">{{ __('Name') }}</th>
                                                <th scope="col">{{ __('Email') }}</th>
                                                <th scope="col">{{ __('Phone') }}</th>
                                                <th scope="col">{{ __('City') }}</th>
                                                <th scope="col">{{ __('State') }}</th>
                                                <th scope="col">{{ __('Country') }}</th>
                                                <th scope="col">{{ __('Gateway') }}</th>
                                                <th scope="col">{{ __('Payment') }}</th>
                                                <th scope="col">{{ __('Date') }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach ($enrolments as $key => $enrolment)
                                                <tr>
                                                    <td>#{{ $enrolment->order_id }}</td>

                                                    @php
                                                        $courseInfo = $enrolment->course
                                                            ->courseInformation()
                                                            ->where('language_id', $deLang->id)
                                                            ->select('title', 'slug')
                                                            ->first();
                                                        $title = $courseInfo->title;
                                                        $slug = $courseInfo->slug;
                                                    @endphp
                                                    <td><a href="{{ route('front.user.course.details', [Auth::guard('web')->user()->username, 'slug' => $slug]) }}"
                                                            target="_blank">{{ strlen($title) > 35 ? mb_substr($title, 0, 35, 'utf-8') . '...' : $title }}</a>
                                                    </td>

                                                    <td>{{ $abs->base_currency_symbol_position == 'left' ? $abs->base_currency_symbol : '' }}{{ round($enrolment->course_price, 2) }}{{ $abs->base_currency_symbol_position == 'right' ? $abs->base_currency_symbol : '' }}
                                                    </td>

                                                    <td>{{ $abs->base_currency_symbol_position == 'left' ? $abs->base_currency_symbol : '' }}{{ round($enrolment->discount, 2) }}{{ $abs->base_currency_symbol_position == 'right' ? $abs->base_currency_symbol : '' }}
                                                    </td>

                                                    <td>{{ $abs->base_currency_symbol_position == 'left' ? $abs->base_currency_symbol : '' }}{{ round($enrolment->grand_total, 2) }}{{ $abs->base_currency_symbol_position == 'right' ? $abs->base_currency_symbol : '' }}
                                                    </td>

                                                    <td>{{ $enrolment->billing_first_name }}</td>
                                                    <td>{{ $enrolment->billing_email }}</td>
                                                    <td>{{ $enrolment->billing_contact_number }}</td>
                                                    <td>{{ $enrolment->billing_city }}</td>
                                                    <td>{{ $enrolment->billing_state }}</td>
                                                    <td>{{ $enrolment->billing_country }}</td>
                                                    <td>{{ ucfirst($enrolment->payment_method) }}</td>
                                                    <td>
                                                        @if ($enrolment->payment_status == 'Pending')
                                                            <span
                                                                class="badge badge-warning">{{ __('Pending') }}</span>
                                                        @elseif ($enrolment->payment_status == 'Completed')
                                                            <span
                                                                class="badge badge-success">{{ __('Completed') }}</span>
                                                        @endif
                                                    </td>
                                                    <td>
                                                        {{ $enrolment->created_at }}
                                                    </td>
                                                </tr>


                                                {{-- Receipt Modal --}}
                                                <div class="modal fade" id="receiptModal{{ $enrolment->id }}"
                                                    tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel"
                                                    aria-hidden="true">
                                                    <div class="modal-dialog" role="document">
                                                        <div class="modal-content">
                                                            <div class="modal-header">
                                                                <h5 class="modal-title" id="exampleModalLabel">
                                                                    {{ __('Receipt_Image') }}
                                                                </h5>
                                                                <button type="button" class="close" data-dismiss="modal"
                                                                    aria-label="Close">
                                                                    <span aria-hidden="true">&times;</span>
                                                                </button>
                                                            </div>
                                                            <div class="modal-body">
                                                                <img src="{{ asset('assets/front/receipt/' . $enrolment->receipt) }}"
                                                                    alt="Receipt" width="100%">
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

                @if (!empty($enrolments))
                    <div class="card-footer">
                        <div class="row">
                            <div class="d-inline-block mx-auto">
                                {{ $enrolments->links() }}
                            </div>
                        </div>
                    </div>
                @endif
            </div>
        </div>
    </div>

@endsection
