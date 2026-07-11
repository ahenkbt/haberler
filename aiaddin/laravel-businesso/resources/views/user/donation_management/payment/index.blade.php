@extends('user.layout')

@php
  $selLang = \App\Models\Language::where([
      ['code', \Illuminate\Support\Facades\Session::get('currentLangCode')],
  ])->first();
@endphp
@if (!empty($selLang) && $selLang->rtl == 1)
  @section('styles')
    <style>
      form:not(.modal-form) input,
      form:not(.modal-form) textarea,
      form:not(.modal-form) select,
      select[name='language'] {
        direction: rtl;
      }

      form:not(.modal-form) .note-editor.note-frame .note-editing-area .note-editable {
        direction: rtl;
        text-align: right;
      }
    </style>
  @endsection
@endif

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Donation_History') }}</h4>
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
        <a href="#">{{ __('Donation_History') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">
                {{ __('Donation_History') }}</div>
            </div>
            <div class="col-lg-3">
              @includeIf('user.partials.languages')
            </div>
            <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
              <button class="btn btn-danger float-right btn-sm ml-2 mt-2 d-none bulk-delete"
                data-href="{{ route('user.donation.payment.bulk.delete') }}"><i class="flaticon-interface-5"></i>
                {{ __('Delete') }}</button>
              <form action="{{ url()->current() }}" class="d-inline-block float-right">
                <input class="form-control" type="text" name="search"
                  placeholder="{{ __('Search_by_Transaction_ID') }}"
                  value="{{ request()->input('search') ? request()->input('search') : '' }}">
              </form>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (count($donations) == 0)
                <h3 class="text-center">{{ __('NO_DONATION_FOUND') }}
                </h3>
              @else
                <div class="table-responsive">
                  <table class="table table-striped mt-3">
                    <thead>
                      <tr>
                        <th scope="col">
                          <input type="checkbox" class="bulk-check" data-val="all">
                        </th>
                        <th scope="col">
                          {{ __('Transaction ID') }}</th>
                        <th scope="col">{{ __('Amount') }}</th>
                        <th scope="col">
                          {{ __('Payment_Status') }}</th>
                        <th scope="col">
                          {{ __('Payment_Method') }}</th>
                        <th scope="col">{{ __('Receipt') }}</th>
                        <th scope="col">{{ __('Actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($donations as $key => $donation)
                        <tr>
                          <td>
                            <input type="checkbox" class="bulk-check" data-val="{{ $donation->id }}">
                          </td>
                          <td>
                            {{ convertUtf8(strlen($donation->transaction_id)) > 30 ? convertUtf8(substr($donation->transaction_id, 0, 30)) . '...' : convertUtf8($donation->transaction_id) }}
                          </td>
                          <td>{{ $donation->currency_symbol . ' ' . convertUtf8($donation->amount) }}
                          </td>
                          <td>
                            @if ($donation->transaction_details !== 'offline')
                              @if ($donation->status == 'pending')
                                <span class="badge badge-warning">{{ __('Pending') }}</span>
                              @elseif ($donation->status == 'completed')
                                <span class="badge badge-success">{{ __('Success') }}</span>
                              @endif
                            @else
                              <form id="statusForm{{ $donation->id }}" class="d-inline-block"
                                action="{{ route('user.donation.payment.log.update') }}" method="post">
                                @csrf
                                <input type="hidden" name="id" value="{{ $donation->id }}">
                                <select
                                  class="form-control form-control-sm
                                                            @if ($donation->status == 'completed') bg-success
                                                            @elseif ($donation->status == 'pending')
                                                                bg-warning
                                                            @elseif ($donation->status == 'rejected')
                                                                bg-danger @endif
                                                                "
                                  name="status"
                                  onchange="document.getElementById('statusForm{{ $donation->id }}').submit();">
                                  <option value="pending" {{ $donation->status == 'pending' ? 'selected' : '' }}>
                                    {{ __('Pending') }}
                                  </option>
                                  <option value="success" {{ $donation->status == 'completed' ? 'selected' : '' }}>
                                    {{ __('Success') }}
                                  </option>
                                  <option value="rejected" {{ $donation->status == 'rejected' ? 'selected' : '' }}>
                                    {{ __('Rejected') }}
                                  </option>
                                </select>
                              </form>
                            @endif
                          </td>
                          <td>{{ convertUtf8($donation->payment_method) }}</td>
                          <td>
                            @if (!empty($donation->receipt))
                              <a class="btn btn-sm btn-info" href="#" data-toggle="modal"
                                data-target="#receiptModal{{ $donation->id }}">{{ __('Show') }}</a>
                            @else
                              {{ ' -' }}
                            @endif
                          </td>
                          <td>
                            @if (!empty($donation->name !== 'anonymous'))
                              <a class="btn btn-sm btn-info" href="#" data-toggle="modal"
                                data-target="#detailsModal{{ $donation->id }}">{{ __('Details') }}</a>
                            @else
                            @endif
                            <form class="deleteform d-inline-block" action="{{ route('user.donation.payment.delete') }}"
                              method="post">
                              @csrf
                              <input type="hidden" name="payment_id" value="{{ $donation->id }}">
                              <button type="submit" class="deletebtn btn btn-sm btn-danger">
                                {{ __('Delete') }}
                              </button>
                            </form>
                          </td>
                        </tr>
                        <div class="modal fade" id="receiptModal{{ $donation->id }}" tabindex="-1" role="dialog"
                          aria-labelledby="exampleModalLabel" aria-hidden="true">
                          <div class="modal-dialog" role="document">
                            <div class="modal-content">
                              <div class="modal-header">
                                <h5 class="modal-title" id="exampleModalLabel">
                                  {{ __('Receipt_Image') }}
                                </h5>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                  <span aria-hidden="true">&times;</span>
                                </button>
                              </div>
                              <div class="modal-body">
                                <img
                                  src="{{ asset(\App\Constants\Constant::WEBSITE_DONATION_ATTACHMENT . '/' . $donation->receipt) }}"
                                  alt="Receipt" width="100%">
                              </div>
                              <div class="modal-footer">
                                <button type="button" class="btn btn-secondary"
                                  data-dismiss="modal">{{ __('Close') }}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="modal fade" id="detailsModal{{ $donation->id }}" tabindex="-1" role="dialog"
                          aria-labelledby="exampleModalLabel" aria-hidden="true">
                          <div class="modal-dialog" role="document">
                            <div class="modal-content">
                              <div class="modal-header">
                                <h5 class="modal-title" id="exampleModalLabel">
                                  {{ __('Donation_Details') }}
                                </h5>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                  <span aria-hidden="true">&times;</span>
                                </button>
                              </div>
                              <div class="modal-body">
                                <label>{{ __('Cause') }}</label>

                                <p>{{ $donation->title }}</p>
                                <label>{{ __('Name') }}</label>
                                <p>{{ $donation->name }}</p>
                                <label>{{ __('Email') }}</label>
                                <p>{{ $donation->email }}</p>
                                <label>{{ __('Phone') }}</label>
                                <p>{{ $donation->phone }}</p>
                              </div>
                              <div class="modal-footer">
                                <button type="button" class="btn btn-secondary"
                                  data-dismiss="modal">{{ __('Close') }}
                                </button>
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
        <div class="card-footer">
          <div class="row">
            <div class="d-inline-block mx-auto">
              {{ $donations->appends(['language' => request()->input('language')])->links() }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
@endsection
@section('scripts')
  <script>
    $(document).ready(function() {
      // make input fields RTL
      $("select[name='lang_id']").on('change', function() {
        $(".request-loader").addClass("show");
        let url = "{{ url('/') }}/user/rtlcheck/" + $(this).val();
        $.get(url, function(data) {
          $(".request-loader").removeClass("show");
          if (data == 1) {
            $("form input").each(function() {
              if (!$(this).hasClass('ltr')) {
                $(this).addClass('rtl');
              }
            });
            $("form select").each(function() {
              if (!$(this).hasClass('ltr')) {
                $(this).addClass('rtl');
              }
            });
            $("form textarea").each(function() {
              if (!$(this).hasClass('ltr')) {
                $(this).addClass('rtl');
              }
            });
            $("form .summernote").each(function() {
              $(this).siblings('.note-editor').find('.note-editable')
                .addClass('rtl text-right');
            });

          } else {
            $("form input, form select, form textarea").removeClass('rtl');
            $("form.modal-form .summernote").siblings('.note-editor').find(
              '.note-editable').removeClass('rtl text-right');
          }
        })
      });

      // translatable portfolios will be available if the selected language is not 'Default'
      $("#language").on('change', function() {
        let language = $(this).val();
        if (language == 0) {
          $("#translatable").attr('disabled', true);
        } else {
          $("#translatable").removeAttr('disabled');
        }
      });
    });
  </script>
@endsection
