@extends('user.layout')
{{-- this style will be applied when the direction of language is right-to-left --}}
@includeIf('user.partials.rtl-style')
@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Add_Room') }}</h4>
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
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Add_Room') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="card-title d-inline-block">{{ __('Add_Room') }}</div>
          <a class="btn btn-info btn-sm float-right d-inline-block"
            href="{{ route('user.rooms_management.rooms') . '?language=' . request('language') }}">
            <span class="btn-label">
              <i class="fas fa-backward" style="font-size: 12px;"></i>
            </span>
            {{ __('Back') }}
          </a>
        </div>

        <div class="card-body pt-5 pb-5">
          <div class="row">
            <div class="col-lg-8 offset-lg-2">
              <div class="alert alert-danger pb-1" id="roomErrors" style="display: none;">
                <button type="button" class="close" data-dismiss="alert">×</button>
                <ul></ul>
              </div>
              <div style="margin-left: 10px;">
                <label for=""><strong>{{ __('Slider_Images') . '*' }}</strong></label>
                <form id="slider-dropzone" enctype="multipart/form-data" class="dropzone mt-2 mb-0">
                  @csrf
                  <div class="fallback"></div>
                </form>
                <p class="text-warning mt-3 mb-0">
                  {{ __('Room_Slider_Images_warning_text') }}</p>
                <p class="em text-danger mt-3 mb-0" id="err_slider_image"></p>
              </div>


              <form id="roomForm" action="{{ route('user.rooms_management.store_room') }}" method="POST">
                @csrf

                <div id="slider-image-id"></div>


                {{-- featured image start --}}
                <div class="form-group">
                  <div class="col-12 mb-2">
                    <label for="image"><strong>{{ __('Featured_Image') }} **</strong></label>
                  </div>
                  <div class="col-md-12 showImage mb-3">
                    <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." class="img-thumbnail ">
                  </div>
                  <input type="file" name="featured_img" id="image" class="form-control ">
                  <p id="errfeatured_img" class="mb-0 text-danger em"></p>
                </div>

                <div class="row">
                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Room_Status') . '*' }}</label>
                      <select name="status" class="form-control">
                        <option selected disabled>{{ __('Select_a_status') }}</option>
                        <option value="1">{{ __('Show') }}</option>
                        <option value="0">{{ __('Hide') }}</option>
                      </select>
                    </div>
                  </div>

                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Rent_per_Night') }} ({{ __('in') }}
                        {{ $currencyInfo->base_currency_text . ' *' }} )
                      </label>
                      <input type="number" step="0.01" class="form-control" name="rent"
                        placeholder="{{ __('Enter_Room_Rent') }}">
                    </div>
                  </div>

                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Quantity') . '*' }}</label>
                      <input type="number" class="form-control" name="quantity"
                        placeholder="{{ __('Enter_no_of_rooms') }}">
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Beds') . '*' }}</label>
                      <input type="number" class="form-control" name="bed"
                        placeholder="{{ __('Enter_no_of_beds') }}">
                    </div>
                  </div>

                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Baths') . '*' }}</label>
                      <input type="number" class="form-control" name="bath"
                        placeholder="{{ __('Enter_on_of_bath') }}">
                    </div>
                  </div>

                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Max_Guests') }}</label>
                      <input type="number" class="form-control" name="max_guests"
                        placeholder="{{ __('Enter_maximum_guests') }}">
                      <p class="text-warning mb-0">
                        {{ __('Leave_blank_if_you_want_to_make_it_unlimited') }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label>{{ __('Latitude') }}</label>
                      <input type="text" class="form-control" name="latitude"
                        placeholder="{{ __('Enter_latitude_for_map') }}">
                      <p class="text-warning mb-0">{{ __('Will_be_used_to_show_in_google_map') }}
                      </p>
                    </div>
                  </div>

                  <div class="col-lg-6">
                    <div class="form-group">
                      <label>{{ __('Longitude') }}</label>
                      <input type="text" class="form-control" name="longitude"
                        placeholder="{{ __('Enter_longitude_for_map') }}">
                      <p class="text-warning mb-0">{{ __('Will_be_used_to_show_in_google_map') }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Address') }}</label>
                      <input type="text" class="form-control" name="address"
                        placeholder="{{ __('Enter_Address') }}">
                    </div>
                  </div>

                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Phone') }}</label>
                      <input type="text" class="form-control" name="phone"
                        placeholder="{{ __('Enter_Phone') }}">
                    </div>
                  </div>

                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Email') }}</label>
                      <input type="email" class="form-control" name="email"
                        placeholder="{{ __('Enter_Email') }}">
                    </div>
                  </div>
                </div>

                <div id="accordion" class="custom-accordion mt-5">
                  @foreach ($languages as $language)
                    <div class="version">
                      <div class="version-header" id="heading{{ $language->id }}">
                        <h5 class="mb-0">
                          <button type="button" class="btn accordion-btn" data-toggle="collapse"
                            data-target="#collapse{{ $language->id }}"
                            aria-expanded="{{ $language->is_default == 1 ? 'true' : 'false' }}"
                            aria-controls="collapse{{ $language->id }}">
                            {{ $language->name . ' ' . __('Language') }}
                            {{ $language->is_default == 1 ? __('Default') : '' }}
                          </button>
                        </h5>
                      </div>

                      <div id="collapse{{ $language->id }}"
                        class="collapse {{ $language->is_default == 1 ? 'show' : '' }}"
                        aria-labelledby="heading{{ $language->id }}" data-parent="#accordion">
                        <div class="version-body">
                          <div class="row">
                            <div
                              class="
                            @if ($roomSetting->room_category_status == 0) col-lg-12
                            @else
                            col-lg-6 @endif">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Room_Title') . '*' }}</label>
                                <input type="text" class="form-control {{ ltrClass($language) }}"
                                  name="{{ $language->code }}_title" placeholder="{{ __('Enter_Title') }}">
                              </div>
                            </div>

                            @if ($roomSetting->room_category_status == 1)
                              <div class="col-lg-6">
                                <div class="form-group {{ rtlClass($language) }}">
                                  @php
                                    $categories = App\Models\User\HotelBooking\RoomCategory::where([
                                        ['language_id', $language->id],
                                        ['user_id', Auth::guard('web')->user()->id],
                                    ])
                                        ->where('status', 1)
                                        ->get();
                                  @endphp

                                  <label>{{ __('Category') . '*' }}</label>
                                  <select name="{{ $language->code }}_category" class="form-control">
                                    <option selected disabled>
                                      {{ __('Select_a_Category') }}
                                    </option>

                                    @foreach ($categories as $category)
                                      <option value="{{ $category->id }}">
                                        {{ $category->name }}
                                      </option>
                                    @endforeach
                                  </select>
                                </div>
                              </div>
                            @endif
                          </div>

                          <div class="row">
                            <div class="col-lg-12">
                              <div class="form-group {{ rtlClass($language) }}">
                                @php
                                  $amenities = App\Models\User\HotelBooking\RoomAmenity::where(
                                      'language_id',
                                      $language->id,
                                  )
                                      ->orderBy('serial_number', 'asc')
                                      ->get();
                                @endphp

                                <label>{{ __('Room_Amenities') . '*' }}</label>
                                <div>
                                  @foreach ($amenities as $amenity)
                                    <div class="d-inline mr-3 {{ ltrClass($language) }}">
                                      <input type="checkbox" class="mr-1" name="{{ $language->code }}_amenities[]"
                                        value="{{ $amenity->id }}" id="amenity{{ $amenity->id }}">
                                      <label for="amenity{{ $amenity->id }}">{{ $amenity->name }}</label>
                                    </div>
                                  @endforeach
                                </div>
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col-lg-12">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Summary') . '*' }}</label>
                                <textarea class="form-control {{ ltrClass($language) }}" name="{{ $language->code }}_summary"
                                  placeholder="{{ __('Enter_Summary') }}" rows="3"></textarea>
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col-lg-12">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Room_Description') . '*' }}</label>
                                <textarea id="{{ $language->code }}DescriptionSummernote" class="form-control summernote {{ ltrClass($language) }}"
                                  name="{{ $language->code }}_description" placeholder="{{ __('Enter_room_descriptions') }}" data-height="300"></textarea>
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col-lg-12">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Meta_Keywords') }}</label>
                                <input class="form-control {{ ltrClass($language) }}"
                                  name="{{ $language->code }}_meta_keywords"
                                  placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col-lg-12">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Meta_Description') }}</label>
                                <textarea class="form-control {{ ltrClass($language) }}" name="{{ $language->code }}_meta_description"
                                  rows="5" placeholder="{{ __('Enter_Meta_Description') }}"></textarea>
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col-12">
                              @php
                                $currLang = $language;
                              @endphp
                              @foreach ($languages as $language)
                                @continue($currLang->id == $language->id)

                                <div class="form-check py-0">
                                  <label class="form-check-label">
                                    <input class="form-check-input" type="checkbox" value=""
                                      onchange="cloneInput('collapse{{ $currLang->id }}', 'collapse{{ $language->id }}', event)">
                                    <span class="form-check-sign">{{ __('Clone_for') }}
                                      <strong class="text-capitalize text-secondary">{{ $language->name }}</strong>
                                      {{ __('Language') }}</span>
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
          <div class="row">
            <div class="col-12 text-center">
              <button type="submit" form="roomForm" class="btn btn-success">
                {{ __('Save') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
@endsection

@section('scripts')
  <script>
    const imgUpUrl = "{{ route('user.rooms_management.upload_slider_image') }}";
    const imgRmvUrl = "{{ route('user.rooms_management.remove_slider_image') }}";
    const baseUrl = "{{ url('') }}";
  </script>
  <script src="{{ asset('assets/admin/js/slider-image.js') }}"></script>
  <script src="{{ asset('assets/admin/js/admin-room.js') }}"></script>
@endsection
