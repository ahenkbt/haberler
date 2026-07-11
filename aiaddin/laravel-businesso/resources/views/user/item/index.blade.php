@extends('user.layout')

@php
  $selLang = \App\Models\Language::where([
      ['code', \Illuminate\Support\Facades\Session::get('currentLangCode')],
  ])->first();
  $userLanguages = \App\Models\User\Language::where('user_id', Auth::guard('web')->user()->id)->get();
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
    <h4 class="page-title">{{ __('Items') }}</h4>
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
        <a href="#">{{ __('Shop_Management') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Manage_Items') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Items') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">

      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-2">
              <div class="card-title d-inline-block">{{ __('Items') }}</div>
            </div>
            <div class="col-lg-3">
              @includeIf('user.partials.languages')
            </div>
            <div class="col-lg-3">
              <input type="text" class="form-control" value="{{ request('title') }}"
                placeholder="{{ __('Search_title') }}" id="_title" name="search">
            </div>
            <div class="col-lg-4 ">
              <a href="{{ route('user.item.type') }}" class="btn btn-primary float-right btn-sm"><i
                  class="fas fa-plus"></i> {{ __('Add_Item') }}</a>
              <button class="btn btn-danger float-right btn-sm mr-2 d-none bulk-delete"
                data-href="{{ route('user.item.bulk.delete') }}"><i class="flaticon-interface-5"></i>
                {{ __('Delete') }}</button>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-lg-12">
              @if (count($items) == 0)
                <h3 class="text-center">{{ __('NO_ITEMS_FOUND') }}</h3>
              @else
                <div class="table-responsive">
                  <table class="table table-striped mt-3">
                    <thead>
                      <tr>
                        <th scope="col">
                          <input type="checkbox" class="bulk-check" data-val="all">
                        </th>
                        <th scope="col">{{ __('Title') }}</th>
                        <th>{{ __('Price') }}
                          (@if (!empty($userBs->base_currency_symbol))
                            {{ $userBs->base_currency_symbol }}
                          @endif)
                        </th>
                        <th scope="col">{{ __('Type') }}</th>
                        <th scope="col">{{ __('Variations') }}</th>
                        <th scope="col">{{ __('Category') }}</th>
                        <th scope="col">{{ __('Stock') }}</th>
                        @if (
                            $userBs->theme != 'home_nine' &&
                                $userBs->theme != 'home_ten' &&
                                $userBs->theme != 'home_eleven' &&
                                $userBs->theme != 'home_twelve')
                          <th>{{ __('Featured') }}</th>
                        @endif

                        @if ($userBs->theme == 'home_eight')
                          <th>{{ __('Special_Offers') }}</th>
                        @endif
                        <th>{{ __('Flash') }}</th>
                        <th scope="col">{{ __('Actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @foreach ($items as $key => $item)
                        <tr>
                          <td>
                            <input type="checkbox" class="bulk-check" data-val="{{ $item->item_id }}">
                          </td>
                          <td>
                            <a href="{{ route('front.user.item_details', ['slug' => $item->slug, Auth::guard('web')->user()->username]) }}"
                              target="_blank">
                              {{ strlen($item->title) > 30 ? mb_substr($item->title, 0, 30, 'utf-8') . '...' : $item->title }}
                            </a>
                          </td>
                          <td>{{ $item->current_price }}</td>
                          <td class="text-capitalize">{{ $item->type }}</td>
                          <td class="">
                            @if ($item->type == 'physical')
                              <a class="btn btn-secondary btn-sm"
                                href="{{ route('user.item.variations', $item->item_id) . '?language=' . request()->input('language') }}">
                                <span class="btn-label">
                                  {{ __('Manage') }}
                                </span>
                              </a>
                            @else
                              <i class="text-muted">{{ __('digital_item') }}</i>
                            @endif
                          </td>
                          <td>
                            {{ convertUtf8($item->category ? $item->category : '') }}
                          </td>
                          <td>
                            @php
                              $variations = App\Models\User\UserItemVariation::where('item_id', $item->item_id)
                                  ->where('language_id', $lang->id)
                                  ->get();
                              if (count($variations) == 0) {
                                  $variations = null;
                              }
                              $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);
                            @endphp
                            @if ($item->type == 'physical' && empty($variations))
                              {{ $item->stock }}
                            @elseif(!empty($variations))
                              <i class="text-muted">{{ __('check_variations') }}</i>
                            @else
                              <i class="text-muted">{{ __('digital_item') }}</i>
                            @endif
                          </td>
                          @if (
                              $userBs->theme != 'home_nine' &&
                                  $userBs->theme != 'home_ten' &&
                                  $userBs->theme != 'home_eleven' &&
                                  $userBs->theme != 'home_twelve')
                            <td>
                              <form class="d-inline-block" action="{{ route('user.item.feature') }}"
                                id="featureForm{{ $item->item_id }}" method="POST">
                                @csrf
                                <input type="hidden" name="item_id" value="{{ $item->item_id }}">
                                <select name="is_feature" id=""
                                  class="form-control form-control-sm  @if ($item->is_feature) bg-success @else bg-danger @endif"
                                  onchange="document.getElementById('featureForm{{ $item->item_id }}').submit();">
                                  <option value="1" {{ $item->is_feature == 1 ? 'selected' : '' }}>
                                    {{ __('Yes') }}
                                  </option>
                                  <option value="0" {{ $item->is_feature == 0 ? 'selected' : '' }}>
                                    {{ __('No') }}
                                  </option>
                                </select>
                              </form>
                            </td>
                          @endif
                          @if ($userBs->theme == 'home_eight')
                            <td>
                              <form class="d-inline-block" action="{{ route('user.item.specialOffer') }}"
                                id="specialOffer{{ $item->item_id }}" method="POST">
                                @csrf
                                <input type="hidden" name="item_id" value="{{ $item->item_id }}">
                                <select name="special_offer" id=""
                                  class="form-control form-control-sm  @if ($item->special_offer == 1) bg-success @else bg-danger @endif"
                                  onchange="document.getElementById('specialOffer{{ $item->item_id }}').submit();">
                                  <option value="1" {{ $item->special_offer == 1 ? 'selected' : '' }}>
                                    {{ __('Yes') }}
                                  </option>
                                  <option value="0" {{ $item->special_offer == 0 ? 'selected' : '' }}>
                                    {{ __('No') }}
                                  </option>
                                </select>
                              </form>
                            </td>
                          @endif
                          <td>
                            <form class="d-inline-block" action="{{ route('user.item.flash.remove') }}"
                              id="flashForm{{ $item->item_id }}" method="POST">
                              @csrf
                              <input type="hidden" name="item_id" value="{{ $item->item_id }}">
                              <select name="special_offer" id="" data-item-id="{{ $item->item_id }}"
                                class="form-control manageFlash form-control-sm  @if ($isFlash == 1) bg-success @else bg-danger @endif">
                                <option value="1" {{ $isFlash == 1 ? 'selected' : '' }}>
                                  {{ __('Yes') }}
                                </option>
                                <option value="0" {{ $isFlash == 0 ? 'selected' : '' }}>
                                  {{ __('No') }}
                                </option>
                              </select>
                            </form>
                            @if ($isFlash)
                              <a class="btn btn-sm btn-primary" href="javascript:void(0)" data-toggle="modal"
                                data-target="#flashmodal{{ $item->item_id }}">
                                {{ __('Edit') }}
                              </a>
                            @endif
                          </td>
                          <td>
                            <div class="dropdown">
                              <button class="btn btn-info btn-sm dropdown-toggle" type="button"
                                id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true"
                                aria-expanded="false">
                                {{ __('Actions') }}
                              </button>
                              <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">

                                <a class="dropdown-item "
                                  href="{{ route('user.item.edit', $item->item_id) . '?language=' . request()->input('language') }}">{{ __('Edit') }}
                                </a>
                                <form class="deleteform d-block" action="{{ route('user.item.delete') }}"
                                  method="post">
                                  @csrf
                                  <input type="hidden" name="item_id" value="{{ $item->item_id }}">
                                  <button type="submit" class="deletebtn">
                                    {{ __('Delete') }}
                                  </button>
                                </form>
                              </div>
                            </div>
                            <!-- Flash Sale Modal -->
                            <div class="modal fade" id="flashmodal{{ $item->item_id }}" tabindex="-1" role="dialog"
                              aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                              <div class="modal-dialog modal-dialog-centered" role="document">
                                <div class="modal-content">
                                  <div class="modal-header">
                                    <h5 class="modal-title" id="exampleModalLongTitle">
                                      {{ __('Flash_Sale_Setting') }}
                                    </h5>

                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                      <span aria-hidden="true">&times;</span>
                                    </button>
                                  </div>
                                  <div class="modal-body">
                                    <form class="modal-form " id="modalform{{ $item->item_id }}"
                                      enctype="multipart/form-data"
                                      action="{{ route('user.item.setFlashSale', $item->item_id) }}" method="POST">
                                      @csrf

                                      <div class="form-group">
                                        <label for="">{{ __('Start_Date') }}
                                          **</label>
                                        <input type="text" value="{{ $item->start_date }}" name="start_date"
                                          class="form-control datepicker" autocomplete="off" placeholder="">
                                        <p id="errstart_date" class=" mb-0 text-danger em">
                                        </p>
                                      </div>
                                      <div class="form-group">
                                        <label for="">{{ __('Start_Time') }}
                                          **</label>
                                        <input type="text" name="start_time" value="{{ $item->start_time }}"
                                          class="form-control timepicker" autocomplete="off" placeholder="">
                                        <p id="errstart_time" class=" mb-0 text-danger em">
                                        </p>
                                      </div>
                                      <div class="form-group">
                                        <label for="">{{ __('End_Date') }}
                                          **</label>
                                        <input type="text" name="end_date" value="{{ $item->end_date }}"
                                          class="form-control datepicker" autocomplete="off" placeholder="">
                                        <p id="errend_date" class=" mb-0 text-danger em">
                                        </p>
                                      </div>
                                      <div class="form-group">
                                        <label for="">{{ __('End_Time') }}
                                          **</label>
                                        <input type="text" name="end_time" value="{{ $item->end_time }}"
                                          class="form-control timepicker" autocomplete="off" placeholder="">
                                        <p id="errend_time" class=" mb-0 text-danger em">
                                        </p>
                                      </div>
                                      <div class="form-group">
                                        <label for="">{{ __('Discount') }}
                                          **</label>
                                        <div class="input-group">
                                          <input type="number" name="flash_percentage"
                                            value="{{ $item->flash_percentage }}" class="form-control "
                                            aria-describedby="basic-addon1" autocomplete="off" placeholder="">
                                          <div class="input-group-prepend">
                                            <span class="input-group-text" id="basic-addon1">%</span>
                                          </div>
                                        </div>
                                        <p id="errflash_percentage" class=" mb-0 text-danger em">
                                        </p>
                                      </div>
                                      <div class="modal-footer">
                                        <button type="button" class="btn btn-secondary"
                                          data-dismiss="modal">{{ __('Close') }}</button>
                                        <button type="submit" data-form="modalform{{ $item->item_id }}"
                                          class="submitBtn btn btn-primary">{{ __('Submit') }}</button>
                                      </div>
                                    </form>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      @endforeach
                    </tbody>
                  </table>
                  <nav class="pagination-nav pull-right {{ $items->count() > 15 ? 'mb-4' : '' }}">
                    {{ $items->appends(['language' => request()->input('language')])->links() }}
                  </nav>
                </div>
              @endif
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <form id="searchForm" class="d-none"
    action="{{ route('user.item.index') . '?language=' . request()->input('language') }}" method="get">
    <input type="hidden" id="language" name="language"
      value="{{ !empty(request()->input('language')) ? request()->input('language') : '' }}">
    <input type="hidden" id="title" name="title"
      value="{{ !empty(request()->input('title')) ? request()->input('title') : '' }}">
    <button id="searchButton" type="submit"></button>
  </form>
@endsection
@section('scripts')
  <script>
    "use strict";
    let language = '';
    let vcard = '';
    let title = '';
    $(document).on('change', "#userLanguage", function() {
      language = $(this).val();
      var title = '<?= request('title') ?>';
      location.href = "?language=" + language + "&title=" + title;
    })
    $(document).on('change', '#_title', function() {
      title = $(this).val();
      $('#title').val(title);
      $('#searchButton').click();
    })
  </script>
@endsection
