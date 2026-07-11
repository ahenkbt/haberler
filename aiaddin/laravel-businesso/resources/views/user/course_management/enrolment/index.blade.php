@extends('user.layout')

@section('styles')
    <style>
        .dis-none {
            display: none;
        }
    </style>
@endsection
@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('Course_Management') }}</h4>
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
                <a href="#">{{ __('Course_Enrolments')  }}</a>
            </li>
        </ul>
    </div>

    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="row">
                        <div class="col-lg-4">
                            <div class="card-title">{{ __('Course_Enrolments') }}</div>
                        </div>

                        <div class="col-lg-6 offset-lg-2">
                            <button class="btn btn-danger btn-sm float-right d-none bulk-delete ml-3 mt-1"
                                data-href="{{ route('user.course_enrolments.bulk_delete') }}">
                                <i class="flaticon-interface-5"></i> {{ __('Delete')  }}
                            </button>

                            <form class="float-right ml-3" action="{{ route('user.course_enrolments') }}" method="GET">
                                <input type="hidden" name="status"
                                    value="{{ !empty(request()->input('status')) ? request()->input('status') : '' }}">
                                <div class="row">
                                    <div class="col-lg-6">
                                        <input name="order_id" type="text" class="form-control"
                                            placeholder="{{ __('Search_By_Order_ID') }}"
                                            value="{{ !empty(request()->input('order_id')) ? request()->input('order_id') : '' }}">
                                    </div>
                                    <div class="col-lg-6 pl-0">
                                        <input name="course" type="text" class="form-control"
                                            placeholder="{{ __('Search_By_Course_Name') }}"
                                            value="{{ !empty(request()->input('course')) ? request()->input('course') : '' }}">
                                    </div>
                                </div>
                                <button class="dis-none" type="submit"></button>
                            </form>

                            <form id="searchByStatusForm" class="float-right d-flex flex-row align-items-center"
                                action="{{ route('user.course_enrolments') }}" method="GET">
                                <input type="hidden" name="order_id"
                                    value="{{ !empty(request()->input('order_id')) ? request()->input('order_id') : '' }}">
                                <input type="hidden" name="course"
                                    value="{{ !empty(request()->input('course')) ? request()->input('course') : '' }}">
                                <label class="mr-2">{{ __('Payment')  }}</label>
                                <select class="form-control" name="status"
                                    onchange="document.getElementById('searchByStatusForm').submit()">
                                    <option value="" {{ empty(request()->input('status')) ? 'selected' : '' }}>
                                        {{ __('All')  }}
                                    </option>
                                    <option value="completed"
                                        {{ request()->input('status') == 'completed' ? 'selected' : '' }}>
                                        {{ __('Completed')  }}
                                    </option>
                                    <option value="pending"
                                        {{ request()->input('status') == 'pending' ? 'selected' : '' }}>
                                        {{ __('Pending')  }}
                                    </option>
                                    <option value="rejected"
                                        {{ request()->input('status') == 'rejected' ? 'selected' : '' }}>
                                        {{ __('Rejected')  }}
                                    </option>
                                </select>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-12">
                            @if (count($enrolments) == 0)
                                <h3 class="text-center mt-2">
                                    {{ __('NO_ENROLMENT_FOUND') }}</h3>
                            @else
                                <div class="table-responsive">
                                    <table class="table table-striped mt-3">
                                        <thead>
                                            <tr>
                                                <th scope="col">
                                                    <input type="checkbox" class="bulk-check" data-val="all">
                                                </th>
                                                <th scope="col">{{ __('Order_ID') }}</th>
                                                <th scope="col">{{ __('Course') }}</th>
                                                <th scope="col">{{ __('Username')  }}</th>
                                                <th scope="col">{{ __('Paid_Via') }}</th>
                                                <th scope="col">
                                                    {{ __('Payment_Status') }}</th>
                                                <th scope="col">{{ __('Attachment')  }}</th>
                                                <th scope="col">{{ __('Actions')  }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach ($enrolments as $enrolment)
                                                <tr>
                                                    <td>
                                                        <input type="checkbox" class="bulk-check"
                                                            data-val="{{ $enrolment->id }}">
                                                    </td>
                                                    <td>{{ '#' . $enrolment->order_id }}</td>

                                                    @php
                                                        $course = $enrolment->course()->first();
                                                        $courseInfo = $course
                                                            ->courseInformation()
                                                            ->where('user_id', Auth::guard('web')->user()->id)
                                                            ->where('language_id', $defaultLang->id)
                                                            ->first();

                                                            if(!$courseInfo) continue;
                                                            
                                                        $title = $courseInfo->title;
                                                        $slug = $courseInfo->slug;
                                                        $user = $enrolment->userInfo()->first();
                                                    @endphp

                                                    <td>
                                                        <a href="{{ route('front.user.course.details', [$user->username, 'slug' => $slug]) }}"
                                                            target="_blank">
                                                            {{ strlen($title) > 35 ? mb_substr($title, 0, 35, 'utf-8') . '...' : $title }}
                                                        </a>
                                                    </td>

                                                    <td>
                                                        <a
                                                            href="{{ route('register.customer.view', [$enrolment->customer->id]) }}">{{ $enrolment->customer->username }}</a>
                                                    </td>
                                                    <td>{{ !is_null($enrolment->payment_method) ? $enrolment->payment_method : '-' }}
                                                    </td>
                                                    <td>
                                                        @if ($enrolment->gateway_type == 'online' && $enrolment->payment_status != 'free')
                                                            @if ($enrolment->payment_method == 'Iyzico' && $enrolment->payment_status == 'pending')
                                                                <h2 class="d-inline-block"><span
                                                                        class="badge badge-warning">{{ __('Pending')  }}</span>
                                                                </h2>
                                                            @else
                                                                <h2 class="d-inline-block"><span
                                                                        class="badge badge-success">{{ __('Completed')  }}</span>
                                                                </h2>
                                                            @endif
                                                        @elseif ($enrolment->payment_status == 'free')
                                                            <h2 class="d-inline-block"><span
                                                                    class="badge badge-primary">{{ __('Free')  }}</span>
                                                            </h2>
                                                        @elseif ($enrolment->gateway_type == 'offline')
                                                            <form id="paymentStatusForm-{{ $enrolment->id }}"
                                                                class="d-inline-block"
                                                                action="{{ route('user.course_enrolment.update_payment_status', ['id' => $enrolment->id]) }}"
                                                                method="post">
                                                                @csrf
                                                                <select
                                                                    class="form-control form-control-sm @if ($enrolment->payment_status == 'completed') bg-success @elseif ($enrolment->payment_status == 'pending') bg-warning text-dark @else bg-danger @endif"
                                                                    name="payment_status"
                                                                    onchange="document.getElementById('paymentStatusForm-{{ $enrolment->id }}').submit()">
                                                                    <option value="completed"
                                                                        {{ $enrolment->payment_status == 'completed' ? 'selected' : '' }}>
                                                                        {{ __('Completed')  }}
                                                                    </option>
                                                                    <option value="pending"
                                                                        {{ $enrolment->payment_status == 'pending' ? 'selected' : '' }}>
                                                                        {{ __('Pending')  }}
                                                                    </option>
                                                                    <option value="rejected"
                                                                        {{ $enrolment->payment_status == 'rejected' ? 'selected' : '' }}>
                                                                        {{ __('Rejected')  }}
                                                                    </option>
                                                                </select>
                                                            </form>
                                                        @else
                                                            -
                                                        @endif
                                                    </td>
                                                    <td>
                                                        @if (!is_null($enrolment->attachment))
                                                            <a class="btn btn-sm btn-info" href="#"
                                                                data-toggle="modal"
                                                                data-target="#attachmentModal-{{ $enrolment->id }}">
                                                                {{ __('Show')  }}
                                                            </a>
                                                        @else
                                                            -
                                                        @endif
                                                    </td>
                                                    <td>
                                                        <div class="dropdown">
                                                            <button class="btn btn-secondary btn-sm dropdown-toggle"
                                                                type="button" id="dropdownMenuButton"
                                                                data-toggle="dropdown" aria-haspopup="true"
                                                                aria-expanded="false">
                                                                {{ __('Select')  }}
                                                            </button>

                                                            <div class="dropdown-menu"
                                                                aria-labelledby="dropdownMenuButton">
                                                                <a href="{{ route('user.course_enrolment.details', ['id' => $enrolment->id]) . '?language=' . request('language') }}"
                                                                    class="dropdown-item">
                                                                    {{ __('Details')  }}
                                                                </a>

                                                                <a href="{{ asset(\App\Constants\Constant::WEBSITE_ENROLLMENT_INVOICE . '/' . $enrolment->invoice) }}"
                                                                    class="dropdown-item" target="_blank">
                                                                    {{ __('Invoice')  }}
                                                                </a>

                                                                <form class="deleteform d-inline-block"
                                                                    action="{{ route('user.course_enrolment.delete', ['id' => $enrolment->id]) }}"
                                                                    method="post">

                                                                    @csrf
                                                                    <button type="submit" class="deletebtn">
                                                                        {{ __('Delete')  }}
                                                                    </button>
                                                                </form>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>

                                                @includeIf('user.course_management.enrolment.show-attachment')
                                            @endforeach
                                        </tbody>
                                    </table>
                                </div>
                            @endif
                        </div>
                    </div>
                </div>

                <div class="card-footer text-center">
                    <div class="d-inline-block mt-3">
                        {{ $enrolments->appends([
                                'order_id' => request()->input('order_id'),
                                'status' => request()->input('status'),
                                'course' => request()->input('course'),
                            ])->links() }}
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
