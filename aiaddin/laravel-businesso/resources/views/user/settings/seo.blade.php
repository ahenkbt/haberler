@extends('user.layout')

@php
  $selLang = \App\Models\Language::where([
      ['code', \Illuminate\Support\Facades\Session::get('currentLangCode')],
  ])->first();
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::id()],
      ['is_default', 1],
  ])->first();
  $userLanguages = \App\Models\User\Language::where('user_id', \Illuminate\Support\Facades\Auth::id())->get();

  $packageFeatures = App\Http\Helpers\UserPermissionHelper::packagePermission(Auth::id());
  $packageFeatures = json_decode($packageFeatures, true);

@endphp
@if (!empty($selLang) && $selLang->rtl == 1)
  @section('styles')
    <style>
      form:not(.modal-form) input,
      form:not(.modal-form) textarea,
      form:not(.modal-form) select,
      select[name='userLanguage'] {
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
    <h4 class="page-title">{{ __('SEO_Informations') }}</h4>
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
        <a href="#">{{ __('Basic_Settings') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('SEO_Informations') }}</a>
      </li>
    </ul>
  </div>

  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <form
          action="{{ route('user.basic_settings.update_seo_informations', ['language' => request()->input('language')]) }}"
          method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-9">
                <div class="card-title">{{ __('Update_SEO_Informations') }}</div>
              </div>
              <div class="col-lg-3">
              </div>
            </div>
          </div>

          <div class="card-body pt-5 pb-5">
            <div class="row">

              <div class="col-lg-6">
                <div class="form-group">
                  <label>{{ __('Meta_Keywords_For_Home_Page') }}</label>
                  <input class="form-control" name="home_meta_keywords" value="{{ $data->home_meta_keywords }}"
                    placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                </div>

                <div class="form-group">
                  <label>{{ __('Meta_Description_For_Home_Page') }}</label>
                  <textarea class="form-control" name="home_meta_description" rows="5"
                    placeholder="{{ __('Enter_Meta_Description') }}">{{ $data->home_meta_description }}</textarea>
                </div>
              </div>

              <div class="col-lg-6">
                <div class="form-group">
                  <label>{{ __('Meta_Keywords_For_Blog_Page') }}</label>
                  <input class="form-control" name="blogs_meta_keywords" value="{{ $data->blogs_meta_keywords }}"
                    placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                </div>

                <div class="form-group">
                  <label>{{ __('Meta_Description_For_Blog_Page') }}</label>
                  <textarea class="form-control" name="blogs_meta_description" rows="5"
                    placeholder="{{ __('Enter_Meta_Description') }}">{{ $data->blogs_meta_description }}</textarea>
                </div>
              </div>

              <div class="col-lg-6">
                <div class="form-group">
                  <label>{{ __('Meta_Keywords_For_Services_Page') }}</label>
                  <input class="form-control" name="services_meta_keywords" value="{{ $data->services_meta_keywords }}"
                    placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                </div>

                <div class="form-group">
                  <label>{{ __('Meta_Description_For_Services_Page') }}</label>
                  <textarea class="form-control" name="services_meta_description" rows="5"
                    placeholder="{{ __('Enter_Meta_Description') }}">{{ $data->services_meta_description }}</textarea>
                </div>
              </div>

              <div class="col-lg-6">
                <div class="form-group">
                  <label>{{ __('Meta_Keywords_For_Portfolios_Page') }}</label>
                  <input class="form-control" name="portfolios_meta_keywords"
                    value="{{ $data->portfolios_meta_keywords }}" placeholder="{{ __('Enter_Meta_Keywords') }}"
                    data-role="tagsinput">
                </div>

                <div class="form-group">
                  <label>{{ __('Meta_Description_For_Portfolios_Page') }}</label>
                  <textarea class="form-control" name="portfolios_meta_description" rows="5"
                    placeholder="{{ __('Enter_Meta_Description') }}">{{ $data->portfolios_meta_description }}</textarea>
                </div>
              </div>


              <div class="col-lg-6">
                <div class="form-group">
                  <label>{{ __('Meta_Keywords_For_Jobs_Page') }}</label>
                  <input class="form-control" name="jobs_meta_keywords" value="{{ $data->jobs_meta_keywords }}"
                    placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                </div>

                <div class="form-group">
                  <label>{{ __('Meta_Description_For_Jobs_Page') }}</label>
                  <textarea class="form-control" placeholder="{{ __('Enter_Meta_Description') }}" name="jobs_meta_description"
                    rows="5">{{ $data->jobs_meta_description }}</textarea>
                </div>
              </div>

              <div class="col-lg-6">
                <div class="form-group">
                  <label>{{ __('Meta_Keywords_For_Team_Page') }}</label>
                  <input class="form-control" name="team_meta_keywords" value="{{ $data->team_meta_keywords }}"
                    placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                </div>

                <div class="form-group">
                  <label>{{ __('Meta_Description_For_Team_Page') }}</label>
                  <textarea class="form-control" name="team_meta_description" placeholder="{{ __('Enter_Meta_Description') }}"
                    rows="5">{{ $data->team_meta_description }}</textarea>
                </div>
              </div>

              <div class="col-lg-6">
                <div class="form-group">
                  <label>{{ __('Meta_Keywords_For_FAQ_Page') }}</label>
                  <input class="form-control" name="faqs_meta_keywords" value="{{ $data->faqs_meta_keywords }}"
                    placeholder="{{ __('Enter_Meta_Keywords') }}"data-role="tagsinput">
                </div>

                <div class="form-group">
                  <label>{{ __('Meta_Description_For_FAQ_Page') }}</label>
                  <textarea class="form-control" name="faqs_meta_description" placeholder="{{ __('Enter_Meta_Description') }}"
                    rows="5">{{ $data->faqs_meta_description }}</textarea>
                </div>
              </div>

              <div class="col-lg-6">
                <div class="form-group">
                  <label>{{ __('Meta_Keywords_For_Contact_Page') }}</label>
                  <input class="form-control" name="contact_meta_keywords" value="{{ $data->contact_meta_keywords }}"
                    placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                </div>

                <div class="form-group">
                  <label>{{ __('Meta_Description_For_Contact_Page') }}</label>
                  <textarea class="form-control" name="contact_meta_description" placeholder="{{ __('Enter_Meta_Description') }}"
                    rows="5">{{ $data->contact_meta_description }}</textarea>
                </div>
              </div>
              <div class="col-lg-6">
                <div class="form-group">
                  <label>{{ __('Meta_Keywords_For_Shop_Page') }}</label>
                  <input class="form-control" name="shop_meta_keywords" value="{{ $data->shop_meta_keywords }}"
                    placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                </div>
                <div class="form-group">
                  <label>{{ __('Meta_Description_For_Shop_Page') }}</label>
                  <textarea class="form-control" name="shop_meta_description" placeholder="{{ __('Enter_Meta_Description') }}"
                    rows="5">{{ $data->shop_meta_description }}</textarea>
                </div>
              </div>
              <div class="col-lg-6">
                <div class="form-group">
                  <label>{{ __('Meta_Keywords_For_Item_Details_Page') }}</label>
                  <input class="form-control" name="item_details_meta_keywords"
                    value="{{ $data->item_details_meta_keywords }}" placeholder="{{ __('Enter_Meta_Keywords') }}"
                    data-role="tagsinput">
                </div>
                <div class="form-group">
                  <label>{{ __('Meta_Description_For_Item_Details_Page') }}</label>
                  <textarea class="form-control" name="item_details_meta_description" placeholder="{{ __('Enter_Meta_Description') }}"
                    rows="5">{{ $data->item_details_meta_description }}</textarea>
                </div>
              </div>
              <div class="col-lg-6">
                <div class="form-group">
                  <label>{{ __('Meta_Keywords_For_Cart_Page') }}</label>
                  <input class="form-control" name="cart_meta_keywords" value="{{ $data->cart_meta_keywords }}"
                    placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                </div>
                <div class="form-group">
                  <label>{{ __('Meta_Description_For_Cart_Page') }}</label>
                  <textarea class="form-control" name="cart_meta_description" placeholder="{{ __('Enter_Meta_Description') }}"
                    rows="5">{{ $data->cart_meta_description }}</textarea>
                </div>
              </div>
              <div class="col-lg-6">
                <div class="form-group">
                  <label>{{ __('Meta_Keywords_For_Checkout_Page') }}</label>
                  <input class="form-control" name="checkout_meta_keywords"
                    value="{{ $data->checkout_meta_keywords }}" placeholder="{{ __('Enter_Meta_Keywords') }}"
                    data-role="tagsinput">
                </div>
                <div class="form-group">
                  <label>{{ __('Meta_Description_For_Checkout_Page') }}</label>
                  <textarea class="form-control" name="checkout_meta_description" placeholder="{{ __('Enter_Meta_Description') }}"
                    rows="5">{{ $data->checkout_meta_description }}</textarea>
                </div>
              </div>
              <div class="col-lg-6">
                <div class="form-group">
                  <label>{{ __('Meta_Keywords_For_Login_Page') }}</label>
                  <input class="form-control" name="meta_keyword_login" value="{{ $data->meta_keyword_login }}"
                    placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                </div>
                <div class="form-group">
                  <label>{{ __('Meta_Description_For_Login_Page') }}</label>
                  <textarea class="form-control" name="meta_description_login" placeholder="{{ __('Enter_Meta_Description') }}"
                    rows="5">{{ $data->meta_description_login }}</textarea>
                </div>
              </div>
              <div class="col-lg-6">
                <div class="form-group">
                  <label>{{ __('Meta_Keywords_For_Signup_Page') }}</label>
                  <input class="form-control" name="meta_keyword_signup" value="{{ $data->meta_keyword_signup }}"
                    placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                </div>
                <div class="form-group">
                  <label>{{ __('Meta_Description_For_Signup_Page') }}</label>
                  <textarea class="form-control" name="meta_description_signup" placeholder="{{ __('Enter_Meta_Description') }}"
                    rows="5">{{ $data->meta_description_signup }}</textarea>
                </div>
              </div>
              @if (in_array('Hotel Booking', $packageFeatures))
                <div class="col-lg-6">
                  <div class="form-group">
                    <label>{{ __('Meta_Keywords_For_Rooms_Page') }}</label>
                    <input class="form-control" name="meta_keyword_rooms" value="{{ $data->meta_keyword_rooms }}"
                      placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                  </div>
                  <div class="form-group">
                    <label>{{ __('Meta_Description_For_Rooms_Page') }}</label>
                    <textarea class="form-control" name="meta_description_rooms" placeholder="{{ __('Enter_Meta_Description') }}"
                      rows="5">{{ $data->meta_description_rooms }}</textarea>
                  </div>
                </div>
                <div class="col-lg-6">
                  <div class="form-group">
                    <label>{{ __('Meta_Keywords_For_Rooms_Details_Page') }}</label>
                    <input class="form-control" name="meta_keyword_room_details"
                      value="{{ $data->meta_keyword_room_details }}" placeholder="{{ __('Enter_Meta_Keywords') }}"
                      data-role="tagsinput">
                  </div>
                  <div class="form-group">
                    <label>{{ __('Meta_Description_For_Rooms_Details_Page') }}</label>
                    <textarea class="form-control" name="meta_description_room_details"
                      placeholder="{{ __('Enter_Meta_Description') }}" rows="5">{{ $data->meta_description_room_details }}</textarea>
                  </div>
                </div>
              @endif
              @if (in_array('Course Management', $packageFeatures))
                <div class="col-lg-6">
                  <div class="form-group">
                    <label>{{ __('Meta_Keywords_For_Course_Page') }}</label>
                    <input class="form-control" name="meta_keyword_course" value="{{ $data->meta_keyword_course }}"
                      placeholder="{{ __('Enter_Meta_Keywords') }}" data-role="tagsinput">
                  </div>
                  <div class="form-group">
                    <label>{{ __('Meta_Description_For_Course_Page') }}</label>
                    <textarea class="form-control" name="meta_description_course" placeholder="{{ __('Enter_Meta_Description') }}"
                      rows="5">{{ $data->meta_description_course }}</textarea>
                  </div>
                </div>
                <div class="col-lg-6">
                  <div class="form-group">
                    <label>{{ __('Meta_Keywords_For_Course_Details_Page') }}</label>
                    <input class="form-control" name="meta_keyword_course_details"
                      value="{{ $data->meta_keyword_course_details }}" placeholder="{{ __('Enter_Meta_Keywords') }}"
                      data-role="tagsinput">
                  </div>
                  <div class="form-group">
                    <label>{{ __('Meta_Description_For_Course_Details_Page') }}</label>
                    <textarea class="form-control" name="meta_description_course_details"
                      placeholder="{{ __('Enter_Meta_Description') }}" rows="5">{{ $data->meta_description_course_details }}</textarea>
                  </div>
                </div>
              @endif

            </div>
          </div>

          <div class="card-footer">
            <div class="form">
              <div class="row">
                <div class="col-12 text-center">
                  <button type="submit"
                    class="btn btn-success {{ $data == null ? 'd-none' : '' }}">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  </div>
@endsection
