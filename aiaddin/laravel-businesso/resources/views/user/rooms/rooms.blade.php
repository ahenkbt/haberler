@extends('user.layout')
@php
  $default = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::id()],
      ['is_default', 1],
  ])->first();
@endphp
{{-- this style will be applied when the direction of language is right-to-left --}}
@includeIf('user.partials.rtl-style')
@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Rooms') }}</h4>
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
        <a href="#">{{ __('Hotel_Management') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Rooms') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-4">
              <div class="card-title d-inline-block">{{ __('Rooms') }}</div>
            </div>
            <div class="col-lg-3">
              @includeIf('user.partials.languages')
            </div>
            <div class="col-lg-4 offset-lg-1 mt-2 mt-lg-0">
              <a href="{{ route('user.rooms_management.create_room') . '?language=' . request('language') }}"
                class="btn btn-primary btn-sm float-right"><i class="fas fa-plus"></i>
                {{ __('Add_Room') }}</a>

              <button class="btn btn-danger btn-sm float-right mr-2 d-none bulk-delete"
                data-href="{{ route('user.rooms_management.bulk_delete_room') }}"><i class="flaticon-interface-5"></i>
                {{ __('Delete') }}</button>
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (count($roomContents) == 0)
                <h3 class="text-center">{{ __('NO_ROOM_FOUND') }}</h3>
              @else
                <div class="table-responsive">
                  <table class="table table-striped mt-3" id="basic-datatables">
                    <thead>
                      <tr>
                        <th scope="col">
                          <input type="checkbox" class="bulk-check" data-val="all">
                        </th>
                        <th scope="col">{{ __('Title') }}</th>
                        @if ($roomSetting->room_category_status == 1)
                          <th scope="col">{{ __('Category') }}</th>
                        @endif
                        <th scope="col">{{ __('Status') }}</th>
                        @if ($userBs->theme != 'home_ten')
                          <th scope="col">{{ __('Featured') }}</th>
                        @endif
                        <th scope="col">{{ __('Rent') }}</th>
                        <th scope="col">{{ __('Actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($roomContents as $roomContent)
                        <tr>
                          <td>
                            <input type="checkbox" class="bulk-check" data-val="{{ $roomContent->room_id }}">
                          </td>
                          <td>
                            {{ strlen($roomContent->title) > 30 ? mb_substr($roomContent->title, 0, 30, 'utf-8') . '...' : $roomContent->title }}
                          </td>
                          @if ($roomSetting->room_category_status == 1)
                            <td>{{ $roomContent->roomCategory->name }}</td>
                          @endif
                          <td>
                            @if ($roomContent->room->status == 1)
                              <span class="badge bg-success">
                                <b>{{ __('Show') }}</b></span>
                            @else
                              <span class="badge bg-danger"><b>{{ __('Hide') }}</b></span>
                            @endif

                          </td>
                          @if ($userBs->theme != 'home_ten')
                            <td>
                              <form id="featureForm{{ $roomContent->room_id }}" class="d-inline-block"
                                action="{{ route('user.rooms_management.update_featured_room') }}" method="post">
                                @csrf
                                <input type="hidden" name="roomId" value="{{ $roomContent->room_id }}">

                                <select
                                  class="form-control {{ $roomContent->room->is_featured == 1 ? 'bg-success' : 'bg-danger' }}"
                                  name="is_featured"
                                  onchange="document.getElementById('featureForm{{ $roomContent->room_id }}').submit();">
                                  <option value="1" {{ $roomContent->room->is_featured == 1 ? 'selected' : '' }}>
                                    {{ __('Yes') }}
                                  </option>
                                  <option value="0" {{ $roomContent->room->is_featured == 0 ? 'selected' : '' }}>
                                    {{ __('No') }}
                                  </option>
                                </select>
                              </form>
                            </td>
                          @endif
                          <td>
                            {{ $currencyInfo->base_currency_symbol_position == 'left' ? $currencyInfo->base_currency_symbol : '' }}
                            {{ $roomContent->room->rent }}
                            {{ $currencyInfo->base_currency_symbol_position == 'right' ? $currencyInfo->base_currency_symbol : '' }}
                          </td>
                          <td>
                            <a class="btn btn-secondary btn-sm mr-1"
                              href="{{ route('user.rooms_management.edit_room', $roomContent->room_id) . '?language=' . request('language') }}">
                              <i class="fas fa-edit"></i>
                            </a>

                            <form class="deleteform d-inline-block"
                              action="{{ route('user.rooms_management.delete_room') }}" method="post">
                              @csrf
                              <input type="hidden" name="room_id" value="{{ $roomContent->room_id }}">

                              <button type="submit" class="btn btn-danger btn-sm deletebtn">
                                <i class="fas fa-trash"></i>
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
@endsection
