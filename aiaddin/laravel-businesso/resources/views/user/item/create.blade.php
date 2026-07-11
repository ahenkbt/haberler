@extends('user.layout')
@section('content')
  @php
    $type = request()->input('type');
  @endphp
  <div class="page-header">
    <h4 class="page-title">{{ __('Add_Item') }}</h4>
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
        <a href="#">{{ __('Add_Item') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="card-title d-inline-block">{{ __('Add_Item') }}</div>
        </div>
        <div class="card-body pt-5 pb-5">
          <div class="row">
            <div class="col-lg-8 offset-lg-2">
              <div class="alert alert-danger pb-1" id="postErrors" style="display: none;">
                <button type="button" class="close" data-dismiss="alert">×</button>
                <ul></ul>
              </div>
              <div class="px-2">
                <label for="" class="mb-2"><strong>{{ __('Slider_Images') }}
                    *</strong></label>
                <form action="{{ route('user.item.slider') }}" id="my-dropzone" enctype="multipart/form-data"
                  class="dropzone create">
                  @csrf
                  <div class="fallback">
                  </div>
                </form>
                <p class="em text-danger mb-0" id="err_slider_images"></p>
              </div>
              <form id="itemForm" class="" action="{{ route('user.item.store') }}" method="post"
                enctype="multipart/form-data">
                @csrf

                <input type="hidden" name="type" value="{{ request()->input('type') }}">

                {{-- START: Featured Image --}}
                <div class="form-group">
                  <div class="col-12 mb-2">
                    <label for="image"><strong>{{ __('Thumbnail') }} *</strong></label>
                  </div>
                  <div class="col-md-12 showImage mb-3">
                    <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." class="img-thumbnail">
                  </div>
                  <input type="file" name="thumbnail" id="image" class="form-control">
                  <p id="errthumbnail" class="mb-0 text-danger em"></p>
                </div>
                {{-- END: Featured Image --}}

                {{-- slider images / --}}
                <div id="sliders"></div>
                {{-- slider images / --}}


                @if ($type == 'physical')
                  <div class="row">
                    <div class="col-lg-12">
                      <div class="form-group">
                        <label for="">{{ __('Stock_Item') }} </label>
                        <input type="number" id="productStock" class="form-control" name="stock" value=""
                          placeholder="{{ __('Enter_Item_Stock') }}">
                        <p id="errstock" class="mb-0 text-danger em"></p>
                        <p class="mb-0 text-warning">
                          {{ __('Stock_Item_warning_text') }}
                        </p>
                      </div>
                    </div>
                  </div>
                @endif
                @if ($type == 'digital')
                  <div class="form-group">
                    <label for="">{{ __('Type') }} *</label>
                    <select name="file_type" class="form-control" id="fileType">
                      <option value="upload" selected>{{ __('File_Upload') }}</option>
                      <option value="link">{{ __('File_Download_Link') }}</option>
                    </select>
                    <p id="errfile_type" class="mb-0 text-danger em"></p>
                  </div>
                  <div class="row">
                    <div class="col-12">
                      <div id="downloadFile" class="form-group">
                        <label for="">{{ __('Downloadable_File') }} *</label>
                        <br>
                        <input name="download_file" type="file">
                        <p class="mb-0 text-warning">{{ __('Only_zip_file_is_allowed') }}.</p>
                        <p id="errdownload_file" class="mb-0 text-danger em"></p>
                      </div>
                      <div id="downloadLink" class="form-group" style="display: none">
                        <label for="">{{ __('Downloadable_Link') }} *</label>
                        <input name="download_link" type="text" class="form-control">
                        <p id="errdownload_link" class="mb-0 text-danger em"></p>
                      </div>
                    </div>
                  </div>
                @endif
                <div class="row">
                  @if ($type == 'physical')
                    <div class="col-lg-4">
                      <div class="form-group">
                        <label for=""> {{ __('Product_Sku') }} *</label>
                        <input type="text" class="form-control" name="sku"
                          value="{{ rand(1000000, 9999999) }}" placeholder="{{ __('Enter_Product_sku') }}">
                        <p id="errsku" class="mb-0 text-danger em"></p>
                      </div>
                    </div>
                  @endif
                  <div class="col-lg-4">
                    <div class="form-group">
                      <label for="">{{ __('Status') }} *</label>
                      <select class="form-control" name="status">
                        <option value="" selected disabled>{{ __('Select_a_status') }}</option>
                        <option value="1">{{ __('Show') }}</option>
                        <option value="0">{{ __('Hide') }}</option>
                      </select>
                      <p id="errstatus" class="mb-0 text-danger em"></p>
                    </div>
                  </div>

                  <div class="col-lg-4">
                    <div class="form-group">
                      <label for="">{{ __('Current_Price') }} (@if (!empty($userBs->base_currency_symbol))
                          {{ $userBs->base_currency_symbol }}
                        @endif)
                        *</label>
                      <input type="text" class="form-control" name="current_price" value=""
                        placeholder="{{ __('Enter_Current_Price') }}">
                      <p id="errcurrent_price" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-4">
                    <div class="form-group">
                      <label for="">{{ __('Previous_Price') }} (@if (!empty($userBs->base_currency_symbol))
                          {{ $userBs->base_currency_symbol }}
                        @endif)</label>
                      <input type="text" class="form-control" name="previous_price" value=""
                        placeholder="{{ __('Enter_Previous_Price') }}">
                      <p id="errprevious_price" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>

                <div id="accordion" class="mt-3 custom-accordion px-2">
                  @foreach ($languages as $language)
                    <div class="version">
                      <div class="version-header mt-3" id="heading{{ $language->id }}">
                        <h5 class="mb-0">
                          <button type="button" class="btn accordion-btn" data-toggle="collapse"
                            data-target="#collapse{{ $language->id }}"
                            aria-expanded="{{ $language->is_default == 1 ? 'true' : 'false' }}"
                            aria-controls="collapse{{ $language->id }}">
                            {{ $language->name . ' ' . __('Language') }}
                            {{ $language->is_default == 1 ? __('(Default)') : '' }}

                            <span class="caret"></span>
                          </button>
                        </h5>
                      </div>
                      <div id="collapse{{ $language->id }}"
                        class="collapse {{ $language->is_default == 1 ? 'show' : '' }}"
                        aria-labelledby="heading{{ $language->id }}" data-parent="#accordion">
                        <div class="version-body">
                          <div class="row">
                            @php
                              $categories = App\Models\User\UserItemCategory::where('language_id', $language->id)
                                  ->where('user_id', Auth::guard('web')->user()->id)
                                  ->where('status', 1)
                                  ->orderBy('name', 'asc')
                                  ->get();
                            @endphp
                            <input hidden id="subcatGetterForItem" value="{{ route('user.item.subcatGetter') }}">
                            <div class="col-lg-6">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Category') }}*</label>
                                <select data-code="{{ $language->code }}" name="{{ $language->code }}_category"
                                  class="form-control getSubCategory ">
                                  <option value="" disabled selected>{{ __('Select_Category') }}
                                  </option>
                                  @foreach ($categories as $category)
                                    <option value="{{ $category->id }}">
                                      {{ $category->name }}</option>
                                  @endforeach
                                </select>
                              </div>
                            </div>
                            <div class="col-lg-6">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Subcategory') }}</label>
                                <select data-code="{{ $language->code }}" name="{{ $language->code }}_subcategory"
                                  id="{{ $language->code }}_subcategory" class="form-control ">
                                  <option value="" selected disabled>{{ __('Select_Subcategory') }}
                                  </option>
                                </select>
                              </div>
                            </div>

                            <div class="col-lg-12">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Title') }}*</label>
                                <input type="text" class="form-control {{ ltrClass($language) }} "
                                  name="{{ $language->code }}_title" placeholder="{{ __('Enter_Title') }}">
                              </div>
                            </div>
                          </div>
                          <div class="row">
                            <div class="col-lg-12 ">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label for="">{{ __('Tags') }} </label>
                                <input type="text" class="form-control {{ ltrClass($language) }}"
                                  name="{{ $language->code }}_tags" value="" data-role="tagsinput"
                                  placeholder="{{ __('Enter_tags') }}">
                              </div>
                            </div>
                            <div class="col-lg-12">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Summary') }}</label>
                                <textarea class="form-control {{ ltrClass($language) }}" name="{{ $language->code }}_summary"
                                  placeholder="{{ __('Enter_Summary') }}"></textarea>
                              </div>
                            </div>
                          </div>
                          <div class="row">
                            <div class="col-lg-12">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Description') }}</label>
                                <textarea id="{{ $language->code }}_PostContent" class="form-control summernote {{ ltrClass($language) }}"
                                  name="{{ $language->code }}_description" placeholder="{{ __('Enter_Content') }}" data-height="300"></textarea>
                              </div>
                            </div>
                          </div>
                          <div class="row">
                            <div class="col-lg-12">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Meta_keyword') }}</label>
                                <input class="form-control {{ ltrClass($language) }}"
                                  name="{{ $language->code }}_keyword" placeholder="{{ __('Enter_Meta_Keywords') }}"
                                  data-role="tagsinput">
                              </div>
                            </div>
                          </div>
                          <div class="row">
                            <div class="col-lg-12">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Meta_Descroption') }}</label>
                                <textarea class="form-control {{ ltrClass($language) }}" name="{{ $language->code }}_meta_keyword" rows="5"
                                  placeholder="{{ __('Enter_Meta_Description') }}"></textarea>
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col-lg-12">
                              @php $currLang = $language; @endphp
                              @foreach ($languages as $lang)
                                @continue($lang->id == $currLang->id)
                                <div class="form-check py-0">
                                  <label class="form-check-label">
                                    <input class="form-check-input" type="checkbox"
                                      onchange="cloneInput('collapse{{ $currLang->id }}', 'collapse{{ $lang->id }}', event)">
                                    <span class="form-check-sign">{{ __('Clone_for') }}
                                      <strong class="text-capitalize text-secondary">{{ $lang->name }}</strong>
                                      {{ __('language') }}</span>
                                  </label>
                                </div>
                              @endforeach
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  @endforeach
                </div>
              </form>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <div class="form">
            <div class="form-group from-show-notify row">
              <div class="col-12 text-center">
                <button type="submit" form="itemForm" class="btn btn-success">{{ __('Submit') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
@endsection
@section('scripts')
  <script>
    "use strict";
    let $selectacategory = "{{ __('Select a category') }}"
    const currUrl = "{{ url()->current() }}";
    const fullUrl = "{!! url()->full() !!}";
    const uploadSliderImage = "{{ route('user.item.slider') }}";
    const rmvSliderImage = "{{ route('user.item.slider-remove') }}";
    const rmvDbSliderImage = "{{ route('user.item.db-slider-remove') }}";
  </script>

  @if ($type == 'digital')
    <script>
      $(document).ready(function() {
        $("select[name='file_type']").on('change', function() {
          let type = $(this).val();
          if (type == 'link') {
            $("#downloadFile input").attr('disabled', true);
            $("#downloadFile").hide();
            $("#downloadLink").show();
            $("#downloadLink input").removeAttr('disabled');
          } else {
            $("#downloadLink input").attr('disabled', true);
            $("#downloadLink").hide();
            $("#downloadFile").show();
            $("#downloadFile input").removeAttr('disabled');
          }
        });
      });
    </script>
  @endif
  <script>
    $(document).ready(function() {
      // services load according to language selection
      $("select[name='language_id']").on('change', function() {

        $("#category").removeAttr('disabled');

        let langid = $(this).val();
        let url = "{{ url('/') }}/admin/product/" + langid + "/getcategory";
        // console.log(url);
        $.get(url, function(data) {
          // console.log(data);
          let options = `<option value="" disabled selected>` + $selectacategory + `</option>`;
          for (let i = 0; i < data.length; i++) {
            options += `<option value="${data[i].id}">${data[i].name}</option>`;
          }

          $(".categoryData").html(options);

        });
      });
      $("select[name='language_id']").on('change', function() {
        $(".request-loader").addClass("show");
        let url = "{{ url('/') }}/admin/rtlcheck/" + $(this).val();

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
            $("form .summernote").siblings('.note-editor').find('.note-editable')
              .removeClass('rtl text-right');
          }
        })
      });

      // translatable portfolios will be available if the selected language is not 'Default'
      $("#language").on('change', function() {
        let language = $(this).val();
        // console.log(language);
        if (language == 0) {
          $("#translatable").attr('disabled', true);
        } else {
          $("#translatable").removeAttr('disabled');
        }
      });
    });
    var today = new Date();
    $("#submissionDate").datepicker({
      autoclose: true,
      endDate: today,
      todayHighlight: true
    });
    $("#startDate").datepicker({
      autoclose: true,
      endDate: today,
      todayHighlight: true
    });
  </script>
  @php
    $test = $languages->pluck('code')->toArray();
    // dump($test);
  @endphp

  <script src="{{ asset('assets/admin/js/dropzone-slider.js') }}"></script>
@endsection
