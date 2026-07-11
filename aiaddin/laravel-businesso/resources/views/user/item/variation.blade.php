@extends('user.layout')


@if (!empty($input->language) && $input->language->rtl == 1)
    @section('styles')
        <style>
            form input,
            form textarea,
            form select {
                direction: rtl;
            }

            .nicEdit-main {
                direction: rtl;
                text-align: right;
            }
        </style>
    @endsection
@endif

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{  __('Item_Variation')  }}</h4>
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
                <a href="{{ route('user.item.index') . '?language=' . $language->code }}">{{  __('Items')  }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a title="{{ $item->title }}"
                    href="#">{{ strlen($item->title) > 20 ? mb_substr($item->title, 0, 20, 'UTF-8') . '...' : $item->title }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{  __('Variations')  }}</a>
            </li>
        </ul>
    </div>
    <div class="card">
        {{-- @dump($variations) --}}
        <div class="card-header">
            <div class="card-title">
                <div class="row">
                    <div class="col-lg-11">
                        {{ $item->title }}
                    </div>
                    <div class="col-lg-1 text-right">
                        <a class="btn btn-primary"
                            href="{{ route('user.item.index') . '?language=' . request()->input('language') }}">{{  __('Back')  }}</a>
                    </div>

                    <div class="alert alert-danger pb-1" id="postErrors" style="display: none;">
                        <button type="button" class="close" data-dismiss="alert">×</button>
                        <ul></ul>
                    </div>

                </div>
            </div>
        </div>
        <div class="card-body">
            <form id="ajaxForm" action="{{ route('user.item.variation.store') }}" method="post"
                enctype="multipart/form-data">
                @csrf
                <input type="hidden" value="{{ $item_id }}" name="item_id">

                <div class="js-repeater">
                    <div class="mb-3">
                        <label class="form-label mb-2">{{  __('Variations')  }}</label>
                        <br>
                        <button class="btn btn-primary js-repeater-add" type="button">+ {{  __('Add_Varient')  }}</button>
                    </div>
                    <div id="js-repeater-container">
                        {{-- @dump($languages) --}}
                        @foreach ($variations as $key => $lwVariaion)
                            <div class="js-repeater-item" data-item="{{ $key }}">
                                <div class="mb-3 row align-items-end">
                                    @for ($i = 0; $i < count($languages); $i++)
                                        <div class="col-2">
                                            <label for="form" class="form-label mb-1">{{  __('Variation_Name')  }}
                                                ({{ $languages[$i]->code }})
                                            </label>
                                            <div class=" mb-2">
                                                <input required value="{{ $lwVariaion[$i]['variant_name'] ?? '' }}"
                                                    type="text" class="form-control" placeholder=""
                                                    name="{{ $languages[$i]->code }}_variation_{{ $key }}">
                                                <input type="hidden" value="{{ $key }}"
                                                    name="variation_helper[]">
                                            </div>
                                        </div>
                                    @endfor
                                    <button class="btn btn-danger btn-sm js-repeater-remove mb-2 mr-2" type="button"
                                        onclick="$(this).parents('.js-repeater-item').remove()">X
                                    </button>
                                    <button class="btn btn-success btn-sm js-repeater-child-add mb-2" type="button"
                                        data-it="{{ $key }}">{{  __('Add_Option')  }} 
                                    </button>

                                    <div class="repeater-child-list mt-2 col-12" id="options{{ $key }}">

                                        @php
                                            $op = json_decode($lwVariaion[0]['option_name']);
                                            $op_price = json_decode($lwVariaion[0]['option_price']);
                                            $op_stock = json_decode($lwVariaion[0]['option_stock']);
                                        @endphp
                                        @if ($op)
                                            @foreach ($op as $opIn => $w)
                                                <div class="repeater-child-item mb-3" id="options{{ $key }}">
                                                    <div class="row align-items-start">
                                                        @php
                                                            $opArr = [];
                                                            for ($i = 0; $i < count($languages); $i++) {
                                                                $opArr[$i] = json_decode($lwVariaion[$i]['option_name'] ?? '');
                                                            }
                                                        @endphp
                                                        @for ($i = 0; $i < count($languages); $i++)
                                                            <div class="col-2 ">
                                                                <label for="form" class="form-label mb-1">{{  __('Option_Name')  }} 
                                                                    ({{ $languages[$i]->code }})
                                                                </label>
                                                                <input
                                                                    name="{{ $languages[$i]->code }}_options1_{{ $key }}[]"
                                                                    type="text" class="form-control"
                                                                    value="{{ $opArr[$i][$opIn] ?? '' }}" placeholder=""
                                                                    required>
                                                            </div>
                                                        @endfor
                                                        <div class="col-2 ">
                                                            <label for="form" class="form-label mb-1">{{  __('Price')  }} 
                                                                ({{ $userBs->base_currency_symbol }})</label>
                                                            <input name="options2_{{ $key }}[]" type="number"
                                                                class="form-control" value="{{ $op_price[$opIn] }}"
                                                                placeholder="0" required>
                                                            <p class="text-warning">{{  __('this_price_will_be_added_with_main_item_price') }}</p>
                                                        </div>
                                                        <div class="col-2 ">
                                                            <label for="form" class="form-label mb-1">{{  __('Stock')  }}</label>
                                                            <input name="options3_{{ $key }}[]" type="number"
                                                                class="form-control" value="{{ $op_stock[$opIn] }}"
                                                                placeholder="0" required>
                                                        </div>
                                                        <div class="col-2">
                                                            <button class="btn btn-danger js-repeater-child-remove btn-sm"
                                                                type="button"
                                                                onclick="$(this).parents('.repeater-child-item').remove()">X</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            @endforeach
                                        @endif
                                        {{-- @endforeach --}}
                                        {{-- @endfor --}}
                                    </div>
                                </div>
                            </div>
                        @endforeach
                    </div>
                </div>

                <div class="s">
                    <button id="submitBtn" type="submit" class="btn btn-success btn-md">{{ __('Submit')  }}</button>
                </div>
            </form>
        </div>
    </div>
@endsection

@section('scripts')

<script>
    let $variation_name = "{{ __('Variation_Name') }}";
    let $ad_option = "{{ __('Add_Option')  }}";
    let $option_name = "{{ __('Option_Name')  }}";
    let $Price = "{{  __('Price')  }}";
    let $this_price_will_be_added_with_main_item_price = "{{  __('this_price_will_be_added_with_main_item_price') }}";
    let $Stock = "{{  __('Stock')  }}";
</script>

    <script>
        $(document).ready(function() {
            const languages = <?= $languages ?>;
            let symbol = "{{ $userBs->base_currency_symbol }}";
            var addItem = function(key) {
                rpItemNode = '';
                let it = $(".js-repeater-item:last-child").index() + 1;

                rpItemNode += `<div class="js-repeater-item" data-item="${it}">
                        <div class="mb-3 row align-items-end">`
                for (var Itemkey in languages) {
                    rpItemNode += `<div class="col-2" >
                            <label for="form" class="form-label mb-1">`+ $variation_name + `(${languages[Itemkey].code})</label>
                            <div class=" mb-2">
                                <input type="text" required class="form-control" placeholder="" name="${languages[Itemkey].code}_variation_${it}">
                                <input type="hidden" name="variation_helper[]" value="${it}">
                            </div>
                            </div>`
                }
                rpItemNode += `<button class="btn btn-danger btn-sm js-repeater-remove mb-2 mr-2" type="button"
                                        onclick="$(this).parents('.js-repeater-item').remove()">X</button>
                                <button class="btn btn-success btn-sm js-repeater-child-add mb-2" type="button" data-it="${it}">` + $ad_option + `</button>
                            <div class="repeater-child-list mt-2 col-12" id="options${it}"></div>
                        </div>
                    </div>`;
                $("#js-repeater-container").append(rpItemNode);
            };
            /* find elements */
            var repeater = $(".js-repeater");
            var key = 0;
            var addBtn = repeater.find('.js-repeater-add');
            var items = $(".js-repeater-item");
            var it = $(".js-repeater-item").index();

            if (key <= 0) {
                // items.remove();
                /* handle click and add items */
                addBtn.on("click", function() {
                    key++;
                    addItem(key, it);
                });
            }

            $(document).on('click', '.js-repeater-child-add', function() {
                option = ''
                let it = $(this).data('it');
                let cit = $(this).parent().find(".repeater-child-item:last-child").index();
                console.log('cit', cit);
                let parent = $(this).parent().find("#options" + it);

                option += `<div class="repeater-child-item mb-3" id="options${it +''+ cit}">
                <div class="row align-items-start">`
                for (var optionkey in languages) {
                    option += `<div class="col-2 ">
                        <label for="form" class="form-label mb-1">` + $option_name + ` (${languages[optionkey].code})</label>
                        <input required name="${languages[optionkey].code}_options1_${it}[]" type="text" class="form-control"
                            placeholder="">
                    </div>`
                }
                option += `<div class="col-2 ">
                        <label for="form" class="form-label mb-1">` + $Price +` (${symbol})</label>
                        <input required name="options2_${it}[]" type="number" class="form-control" value="0" placeholder="0">
                        <span class="text-warning">` + $this_price_will_be_added_with_main_item_price + `</span>
                    </div>
                    <div class="col-2 ">
                        <label for="form" class="form-label mb-1">` + $Stock + `</label>
                        <input required name="options3_${it}[]" type="number" class="form-control" value="0" placeholder="0">
                    </div>
                    <div class="col-2">
                        <button class="btn btn-danger js-repeater-child-remove btn-sm" type="button"
                            onclick="$(this).parents('.repeater-child-item').remove()">X</button>
                    </div>
                    </div>
                </div>`;
                $(parent).append(option);
            })
        });
    </script>
@endsection
