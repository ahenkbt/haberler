@extends('user.layout')
@includeIf('user.partials.rtl-style')
@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Edit_Room') }}</h4>
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
        <a href="#">{{ __('Edit_Room') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="card-title d-inline-block">{{ __('Edit_Room') }}</div>
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
              <div class="px-2">
                <label class="mb-2" for=""><strong>{{ __('Slider_Images') . '*' }}</strong></label>

                @php
                  $sliderImages = json_decode($room->slider_imgs);
                @endphp

                @if (count($sliderImages) > 0)
                  <div id="reload-slider-div">
                    <div class="row">
                      <div class="col-12">
                        <table class="table table-striped" id="imgtable">
                          @foreach ($sliderImages as $key => $sliderImage)
                            <tr class="trdb" id="{{ 'slider-image-' . $key }}">
                              <td>
                                <div class="thumbnail">
                                  <img style="width: 150px;"
                                    src="{{ asset('assets/img/rooms/slider-images/' . $sliderImage) }}"
                                    alt="slider image">
                                </div>
                              </td>
                              <td>
                                <button type="button" class="btn btn-danger pull-right rmvbtndb"
                                  onclick="rmvStoredImg({{ $room->id }}, {{ $key }})">
                                  <i class="fa fa-times"></i>
                                </button>
                              </td>
                            </tr>
                          @endforeach
                        </table>
                      </div>
                    </div>
                  </div>
                @endif

                <form id="slider-dropzone" enctype="multipart/form-data" class="dropzone mt-2 mb-0">
                  @csrf
                  <div class="fallback"></div>
                </form>
                <p class="em text-warning mt-3 mb-0">{{ __('Room_Slider_Images_warning_text') }}</p>
                <p class="em text-danger mt-3 mb-0" id="err_slider_image"></p>
              </div>

              <form id="roomForm" action="{{ route('user.rooms_management.update_room', ['id' => $room->id]) }}"
                method="POST">
                @csrf
                <div id="slider-image-id"></div>
                {{-- featured image start --}}
                <div class="form-group">
                  <div class="col-12 mb-2">
                    <label for="image"><strong>{{ __('Featured_Image') }} **</strong></label>
                  </div>
                  <div class="col-md-12 showImage mb-3">
                    <img src="{{ asset('assets/img/rooms/feature-images/' . $room->featured_img) }}" alt="..."
                      class="img-thumbnail ">
                  </div>
                  <input type="file" name="featured_img" id="image" class="form-control ">
                  <p id="errfeatured_img" class="mb-0 text-danger em"></p>
                </div>
                {{-- featured image end --}}


                <div class="row">
                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Room_Status') . '*' }}</label>
                      <select name="status" class="form-control">
                        <option disabled selected>{{ __('Select a Status') }}</option>
                        <option value="1" {{ $room->status == 1 ? 'selected' : '' }}>
                          {{ __('Show') }}
                        </option>
                        <option value="0" {{ $room->status == 0 ? 'selected' : '' }}>
                          {{ __('Hide') }}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Rent_per_Night') }} ({{ __('in') }}
                        {{ $userBs->base_currency_text }})
                        *</label>
                      <input type="number" class="form-control" name="rent" placeholder="{{ __('Enter_Room_Rent') }}"
                        value="{{ $room->rent }}">
                    </div>
                  </div>

                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Quantity') . '*' }}</label>
                      <input type="number" class="form-control" name="quantity"
                        placeholder="{{ __('Enter_no_of_rooms') }}" value="{{ $room->quantity }}">
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Beds') . '*' }}</label>
                      <input type="number" class="form-control" name="bed"
                        placeholder="{{ __('Enter_no_of_beds') }}" value="{{ $room->bed }}">
                    </div>
                  </div>
                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Baths') . '*' }}</label>
                      <input type="number" class="form-control" name="bath"
                        placeholder="{{ __('Enter_on_of_bath') }}" value="{{ $room->bath }}">
                    </div>
                  </div>

                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Max_Guests') }}</label>
                      <input type="number" class="form-control" name="max_guests"
                        placeholder="{{ __('Enter_maximum_guests') }}" value="{{ $room->max_guests }}">
                      <p class="text-warning mb-0">
                        {{ __('Leave_blank_if_you_want_to_make_it_unlimited') }}
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label>{{ __('Latitude') }}</label>
                      <input type="text" class="form-control" name="latitude"
                        placeholder="{{ __('Enter_latitude_for_map') }}" value="{{ $room->latitude }}">
                      <p class="text-warning mb-0">{{ __('Will_be_used_to_show_in_google_map') }}
                      </p>
                    </div>
                  </div>

                  <div class="col-lg-6">
                    <div class="form-group">
                      <label>{{ __('Longitude') }}</label>
                      <input type="text" class="form-control" name="longitude"
                        placeholder="{{ __('Enter_longitude_for_map') }}" value="{{ $room->longitude }}">
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
                        placeholder="{{ __('Enter_Address') }}" value="{{ $room->address }}">
                    </div>
                  </div>

                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Phone') }}</label>
                      <input type="text" class="form-control" name="phone" placeholder="{{ __('Enter_Phone') }}"
                        value="{{ $room->phone }}">
                    </div>
                  </div>

                  <div class="col-lg-4">
                    <div class="form-group">
                      <label>{{ __('Email') }}</label>
                      <input type="email" class="form-control" name="email" placeholder="{{ __('Enter_Email') }}"
                        value="{{ $room->email }}">
                    </div>
                  </div>
                </div>

                <div id="accordion" class="custom-accordion mt-5">
                  @foreach ($languages as $language)
                    @php
                      $roomContent = $language->roomDetails()->where('room_id', $room->id)->first();
                      $title = !empty($roomContent) ? $roomContent->title : '';
                      $categoryId = !empty($roomContent) ? $roomContent->room_category_id : '';
                      $summary = !empty($roomContent) ? $roomContent->summary : '';
                      $description = !empty($roomContent) ? $roomContent->description : '';
                      $meta_keywords = !empty($roomContent) ? $roomContent->meta_keywords : '';
                      $meta_description = !empty($roomContent) ? $roomContent->meta_description : '';
                    @endphp

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
                            @if ($roomSetting->room_category_status == 1) col-lg-6
                            @elseif ($roomSetting->room_category_status == 0)
                            col-lg-12 @endif
                            ">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Room_Title') . '*' }}</label>
                                <input type="text" class="form-control {{ ltrClass($language) }}"
                                  name="{{ $language->code }}_title" placeholder="{{ __('Enter_Title') }}"
                                  value="{{ !empty($roomContent->title) ? $roomContent->title : '' }}">
                              </div>
                            </div>

                            @if ($roomSetting->room_category_status == 1)
                              <div class="col-lg-6">
                                <div class="form-group {{ rtlClass($language) }}">
                                  @php
                                    $categories = App\Models\User\HotelBooking\RoomCategory::where(
                                        'language_id',
                                        $language->id,
                                    )
                                        ->where('status', 1)
                                        ->get();
                                  @endphp

                                  <label>{{ __('Category') . '*' }}</label>
                                  <select name="{{ $language->code }}_category" class="form-control">
                                    <option disabled selected value="">
                                      {{ __('Select_a_Category') }}
                                    </option>

                                    @foreach ($categories as $category)
                                      <option value="{{ $category->id }}"
                                        {{ $categoryId == $category->id ? 'selected' : '' }}>
                                        {{ $category->name }}</option>
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

                                  if (!empty($roomContent->amenities) && $roomContent->amenities != '[]') {
                                      $amenityData = json_decode($roomContent->amenities, true);
                                  } else {
                                      $amenityData = [];
                                  }
                                @endphp

                                <label class="d-block">{{ __('Room_Amenities') . '*' }}</label>

                                @if (!empty($amenities))
                                  @foreach ($amenities as $amenity)
                                    <div class="d-inline mr-3">
                                      <input type="checkbox" class="mr-1 {{ ltrClass($language) }}"
                                        name="{{ $language->code }}_amenities[]" value="{{ $amenity->id }}"
                                        @if (!empty($amenityData)) {{ in_array($amenity->id, $amenityData) ? 'checked' : '' }} @endif
                                        id="amenity{{ $amenity->id }}">
                                      <label for="amenity{{ $amenity->id }}">{{ $amenity->name }}</label>
                                    </div>
                                  @endforeach
                                @endif
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col-lg-12">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Summary') . '*' }}</label>
                                <textarea class="form-control {{ ltrClass($language) }}" name="{{ $language->code }}_summary"
                                  placeholder="{{ __('Enter_Summary') }}" rows="3">{{ $summary }}</textarea>
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col-lg-12">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Room_Description') . '*' }}</label>
                                <textarea class="form-control summernote {{ ltrClass($language) }}" name="{{ $language->code }}_description"
                                  placeholder="{{ __('Enter_room_descriptions') }}" data-height="300" id="{{ $language->code }}RoomDesc">{{ replaceBaseUrl($description, 'summernote') }}</textarea>
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col-lg-12">
                              <div class="form-group {{ rtlClass($language) }}">
                                <label>{{ __('Meta_Keywords') }}</label>
                                <input class="form-control {{ ltrClass($language) }}"
                                  name="{{ $language->code }}_meta_keywords"
                                  placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput"
                                  value="{{ $meta_keywords }}">
                              </div>
                            </div>
                          </div>

                          <div class="row">
                            <div class="col-lg-12">
                              <div class="form-group  {{ rtlClass($language) }} ">
                                <label>{{ __('Meta_Description') }}</label>
                                <textarea class="form-control {{ ltrClass($language) }}" name="{{ $language->code }}_meta_description"
                                  rows="5" placeholder="{{ __('Enter_Meta_Description') }}">{{ $meta_description }}</textarea>
                              </div>
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
                {{ __('Update') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  @php
    $successMsg = __('Success');
    $errorMsg = __('Error');
  @endphp
@endsection

@section('scripts')
  <script>
    let successMsg = "{{ $successMsg }}"
    let errorMsg = "{{ $errorMsg }}"
    const imgUpUrl = "{{ route('user.rooms_management.upload_slider_image') }}";
    const imgRmvUrl = "{{ route('user.rooms_management.remove_slider_image') }}";
    const imgDetachUrl = "{{ route('user.rooms_management.detach_slider_image') }}";
  </script>
  <script type="text/javascript" src="{{ asset('assets/admin/js/slider-image.js') }}"></script>
  <script src="{{ asset('assets/admin/js/admin-room.js') }}"></script>
@endsection
