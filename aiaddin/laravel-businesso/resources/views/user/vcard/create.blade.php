@extends('user.layout')
@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Add_vCard') }}</h4>
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
        <a href="#">{{ __('vCards_Management') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Add_vCard') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header">
          <div class="card-title d-inline-block">{{ __('Add_vCard') }}</div>
          <a class="btn btn-info btn-sm float-right d-inline-block"
            href="{{ route('user.vcard') . '?language=' . request('language') }}">
            <span class="btn-label">
              <i class="fas fa-backward"></i>
            </span>
            {{ __('Back') }}
          </a>
        </div>
        <div class="card-body pt-5 pb-5">
          <div class="row">
            <div class="col-lg-12">
              {{-- Featured image upload end --}}
              <form id="ajaxForm" class="" action="{{ route('user.vcard.store') }}" method="POST"
                enctype="multipart/form-data">
                @csrf
                <div class="row">
                  <div class="col-12">
                    <div class="form-group">
                      <label class="form-label">{{ __('Choose_a_Template') }}</label>
                      <div class="row">
                        <div class="col-2">
                          <label class="imagecheck mb-4">
                            <input name="template" type="radio" value="1" class="imagecheck-input" checked>
                            <figure class="imagecheck-figure">
                              <img src="{{ asset('assets/front/img/user/vcard-templates/1.jpg') }}" alt="title"
                                class="imagecheck-image">
                            </figure>
                          </label>
                        </div>
                        <div class="col-2">
                          <label class="imagecheck mb-4">
                            <input name="template" type="radio" value="2" class="imagecheck-input">
                            <figure class="imagecheck-figure">
                              <img src="{{ asset('assets/front/img/user/vcard-templates/2.jpg') }}" alt="title"
                                class="imagecheck-image">
                            </figure>
                          </label>
                        </div>
                        <div class="col-2">
                          <label class="imagecheck mb-4">
                            <input name="template" type="radio" value="3" class="imagecheck-input">
                            <figure class="imagecheck-figure">
                              <img src="{{ asset('assets/front/img/user/vcard-templates/3.jpg') }}" alt="title"
                                class="imagecheck-image">
                            </figure>
                          </label>
                        </div>
                        <div class="col-2">
                          <label class="imagecheck mb-4">
                            <input name="template" type="radio" value="4" class="imagecheck-input">
                            <figure class="imagecheck-figure">
                              <img src="{{ asset('assets/front/img/user/vcard-templates/4.jpg') }}" alt="title"
                                class="imagecheck-image">
                            </figure>
                          </label>
                        </div>
                        <div class="col-2">
                          <label class="imagecheck mb-4">
                            <input name="template" type="radio" value="5" class="imagecheck-input">
                            <figure class="imagecheck-figure">
                              <img src="{{ asset('assets/front/img/user/vcard-templates/5.jpg') }}" alt="title"
                                class="imagecheck-image">
                            </figure>
                          </label>
                        </div>
                        <div class="col-2">
                          <label class="imagecheck mb-4">
                            <input name="template" type="radio" value="6" class="imagecheck-input">
                            <figure class="imagecheck-figure">
                              <img src="{{ asset('assets/front/img/user/vcard-templates/6.jpg') }}" alt="title"
                                class="imagecheck-image">
                            </figure>
                          </label>
                        </div>
                        <div class="col-2">
                          <label class="imagecheck mb-4">
                            <input name="template" type="radio" value="7" class="imagecheck-input">
                            <figure class="imagecheck-figure">
                              <img src="{{ asset('assets/front/img/user/vcard-templates/7.jpg') }}" alt="title"
                                class="imagecheck-image">
                            </figure>
                          </label>
                        </div>
                        <div class="col-2">
                          <label class="imagecheck mb-4">
                            <input name="template" type="radio" value="8" class="imagecheck-input">
                            <figure class="imagecheck-figure">
                              <img src="{{ asset('assets/front/img/user/vcard-templates/8.jpg') }}" alt="title"
                                class="imagecheck-image">
                            </figure>
                          </label>
                        </div>
                        <div class="col-2">
                          <label class="imagecheck mb-4">
                            <input name="template" type="radio" value="9" class="imagecheck-input">
                            <figure class="imagecheck-figure">
                              <img src="{{ asset('assets/front/img/user/vcard-templates/9.jpg') }}" alt="title"
                                class="imagecheck-image">
                            </figure>
                          </label>
                        </div>
                        <div class="col-2">
                          <label class="imagecheck mb-4">
                            <input name="template" type="radio" value="10" class="imagecheck-input">
                            <figure class="imagecheck-figure">
                              <img src="{{ asset('assets/front/img/user/vcard-templates/10.jpg') }}" alt="title"
                                class="imagecheck-image">
                            </figure>
                          </label>
                        </div>
                      </div>
                      <p class="em text-danger em-0" id="errtemplate"></p>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <div class="col-12 mb-2">
                        <label for="image"><strong>{{ __('Profile_Image') }}
                            **</strong></label>
                      </div>
                      <div class="col-md-12 showImage mb-3">
                        <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." class="img-thumbnail">
                      </div>
                      <input type="file" name="profile_image" class="image" class="form-control image">
                      <p id="errprofile_image" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="form-group">
                      <div class="col-12 mb-2">
                        <label for="image"><strong>{{ __('Cover_Image') }}</strong></label>
                      </div>
                      <div class="col-md-12 showImage mb-3">
                        <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." class="img-thumbnail">
                      </div>
                      <input type="file" name="cover_image" class="image" class="form-control image">
                      <p id="errcover_image" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('vCard_Name') }} **</label>
                      <input type="text" class="form-control" name="vcard_name" value=""
                        placeholder="{{ __('Enter_vcard_name') }}">
                      <p class="text-warning mb-0">{{ __('vCard_Name_text') }}</p>
                      <p id="errvcard_name" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Direction') }} **</label>
                      <select name="direction" class="form-control" id="direction">
                        <option value="" selected disabled>{{ __('Select_a_Direction') }}
                        </option>
                        <option value="1">{{ __('LTR') }} ({{ __('Left_to_Right') }})
                        </option>
                        <option value="2">{{ __('RTL') }} ({{ __('Right_to_Left') }})
                        </option>
                      </select>
                      <p id="errdirection" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-lg-4">
                    <div class="form-group">
                      <label for="">{{ __('Name') }} </label>
                      <input type="text" class="form-control" name="name" value=""
                        placeholder="{{ __('Enter_name') }}">
                      <p id="errname" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-4">
                    <div class="form-group">
                      <label for="">{{ __('Company_Name') }}</label>
                      <input type="text" class="form-control" name="company" value=""
                        placeholder="{{ __('Enter_company') }}">
                      <p id="errcompany" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-4">
                    <div class="form-group">
                      <label for="">{{ __('Occupation') }}</label>
                      <input type="text" class="form-control" name="occupation" value=""
                        placeholder="{{ __('Enter_Occupation') }}">
                      <p id="erroccupation" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Email') }}</label>
                      <input type="text" class="form-control" name="email" value=""
                        placeholder="{{ __('Enter_Email') }}">
                      <p id="erremail" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Phone') }}</label>
                      <input type="text" class="form-control" name="phone" value=""
                        placeholder="{{ __('Enter_phone') }}">
                      <p class="text-warning mb-0">{{ __('Enter_Phone_Number_with') }} <strong
                          class="text-danger">{{ __('Country_Code') }}</strong></p>
                      <p id="errphone" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Address') }}</label>
                      <input type="text" class="form-control" name="address" value=""
                        placeholder="{{ __('Enter_Address') }}">
                      <p id="erraddress" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="form-group">
                      <label for="">{{ __('Website_URL') }}</label>
                      <input type="text" class="form-control" name="website_url" value=""
                        placeholder="{{ __('Enter_website_url') }}">
                      <p id="errwebsite_url" class="mb-0 text-danger em"></p>
                    </div>
                  </div>
                </div>


                <div class="row">

                  <div class="col-lg-12">
                    <div class="form-group">
                      <label for="summary">{{ __('Introduction') }}</label>
                      <textarea name="introduction" id="introduction" class="form-control" rows="4"
                        placeholder="{{ __('Enter_Introduction') }}"></textarea>
                    </div>
                  </div>
                </div>


                <div id="app">
                  {{-- Infromation Start --}}
                  <div class="row">
                    <div class="col-lg-12">
                      <div class="form-group">
                        <label for="" class="d-block mb-2">{{ __('Other_Infromation') }}</label>
                        <button class="btn btn-primary" @click="addInformation">{{ __('Add_Information') }}</button>
                      </div>
                    </div>
                  </div>


                  <div class="row no-gutters" v-for="(information, index) in infromations" :key="information.uniqid">
                    <div class="col-lg-2">
                      <div class="form-group">
                        <label for="">{{ __('Icon') }} **</label>
                        <div class="btn-group d-block">
                          <button type="button" class="btn btn-primary iconpicker-component"><i
                              :id="'vcard-icp-icon' + index" class="fa fa-fw fa-heart"></i></button>
                          <button type="button" class="vcard-icp vcard-icp-dd btn btn-primary dropdown-toggle"
                            data-selected="fa-car" data-toggle="dropdown">
                          </button>
                          <div class="dropdown-menu"></div>
                        </div>
                        <input type="hidden" name="icons[]" value="fas fa-heart">
                        <p class="em text-danger mb-0" :id="'erricons.' + index"></p>
                      </div>
                    </div>
                    <div class="col-lg-1">
                      <div class="form-group">
                        <label for="">{{ __('Link') }}</label><br>
                        <input name="links[]" class="ltr" :value="index" type="checkbox">
                        <p class="em text-danger mb-0" :id="'errlinks.' + index"></p>
                      </div>
                    </div>
                    <div class="col-lg-2">
                      <div class="form-group">
                        <label for="">{{ __('Icon_Color') }} **</label>
                        <input name="colors[]" class="jscolor form-control" value="000000" type="text">
                        <p class="em text-danger mb-0" :id="'errcolors.' + index"></p>
                      </div>
                    </div>
                    <div class="col-lg-3">
                      <div class="form-group">
                        <label for="">{{ __('Label') }} **</label>
                        <input name="labels[]" class="form-control" :class="{ rtl: information.dir == 2 }"
                          value="" type="text">
                        <p class="em text-danger mb-0" :id="'errlabels.' + index"></p>
                      </div>
                    </div>
                    <div class="col-lg-3">
                      <div class="form-group">
                        <label for="">{{ __('Value') }} **</label>
                        <input name="values[]" class="form-control" :class="{ rtl: information.dir == 2 }"
                          value="" type="text">
                        <p class="em text-danger mb-0" :id="'errvalues.' + index"></p>
                      </div>
                    </div>
                    <div class="col-lg-1">
                      <button class="btn btn-danger text-white mt-4" @click="removeInformation(index)">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                  {{-- Infromation End --}}
                </div>
              </form>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <div class="form">
            <div class="form-group from-show-notify row">
              <div class="col-12 text-center">
                <button type="submit" id="submitBtn" class="btn btn-success">{{ __('Submit') }}</button>
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
    $(document).ready(function() {
      $("select[name='direction']").on('change', function() {
        val = $(this).val();
        let $formControls = $(".form-control:not(.ltr)");

        // if RTL is selected
        if (val == 2) {
          $formControls.each(function() {
            $(this).addClass('rtl');
          });
        } else {
          $formControls.each(function() {
            $(this).removeClass('rtl');
          });
        }
      });
    });
  </script>
@endsection

@section('vuescripts')
  <script>
    $(document).on('change', '.image', function(event) {
      let $this = $(this);
      let file = event.target.files[0];
      let reader = new FileReader();
      reader.onload = function(e) {
        $(this).prev('.showImage').find('img').attr('src', e.target.result);
      };
      reader.readAsDataURL(file);
    })
  </script>
  <script>
    let app = new Vue({
      el: '#app',
      data() {
        return {
          infromations: []
        }
      },
      methods: {
        addInformation() {
          let n = Math.floor(Math.random() * 11);
          let k = Math.floor(Math.random() * 1000000);
          let m = n + k;
          let dir = document.getElementById('direction').value;
          this.infromations.push({
            uniqid: m,
            dir: dir
          });
        },
        removeInformation(index) {
          this.infromations.splice(index, 1);
        }
      },
      mounted() {
        this.$nextTick(function() {

        })
      },
      updated() {
        this.$nextTick(function() {
          $('.vcard-icp-dd').iconpicker();
          jscolor.installByClassName("jscolor");

          if ($('.vcard-icp').length > 0) {
            $('.vcard-icp').each(function(i) {
              let index = i;
              $(this).on('iconpickerSelected', function(event) {
                $("input[name='icons[]']").eq(index).val($(
                  "#vcard-icp-icon" + index).attr('class'));
              });
            });
          }
        })
      }
    });
  </script>
@endsection
