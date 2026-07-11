@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Quote'] ?? 'Quote' }}
@endsection

@section('meta-description', !empty($userSeo) ? $userSeo->quote_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->quote_meta_keywords : '')

@section('page-name')
  {{ $keywords['Quote'] ?? 'Quote' }}
@endsection
@section('br-name')
  {{ $keywords['Quote'] ?? 'Quote' }}
@endsection

@section('content')
  @php
    config(['app.locale' => $userCurrentLang->code]);
  @endphp
  <!--====== Contact Section start ======-->
  <section class="contact-section contact-page section-gap">
    <div class="container">
      <div class="user-form">
        <div class="contact-form grey-bg mb-40">
          <div class="row no-gutters justify-content-center">
            <div class="col-10">
              <form action="{{ route('front.user.sendquote', getParam()) }}" method="POST" enctype="multipart/form-data">
                @csrf
                <input type="hidden" name="id" value="{{ $user->id }}">
                <div class="row">
                  <div class="col-lg-6 mt-30">
                    <div class="input-group">
                      <label>{{ $keywords['Name'] ?? 'Name' }} <span>**</span></label>
                      <input name="name" type="text" value="{{ old('name') }}"
                        placeholder="{{ $keywords['Enter_Name'] ?? 'Enter Name' }}" class="">
                    </div>

                    @if ($errors->has('name'))
                      <p class="text-danger mb-0">{{ $errors->first('name') }}</p>
                    @endif
                  </div>
                  <div class="col-lg-6 mt-30">
                    <div class="input-group">
                      <label>{{ $keywords['Email_Address'] ?? 'Email Address' }}
                        <span>**</span></label>
                      <input name="email" type="text" value="{{ old('email') }}"
                        placeholder="{{ $keywords['Enter_Email_Address'] ?? 'Enter Email Address' }}"
                        class="form_control">
                    </div>

                    @if ($errors->has('email'))
                      <p class="text-danger mb-0">{{ $errors->first('email') }}</p>
                    @endif
                  </div>
                  @foreach ($inputs as $input)
                    @if ($input->type == 1)
                      <div class="col-lg-6 mt-30">
                        <div class="input-group">
                          <label>{{ $input->label }} @if ($input->required == 1)
                              <span>**</span>
                            @endif
                          </label>
                          <input type="text" placeholder="{{ $input->placeholder }}" name="{{ $input->name }}"
                            value="{{ old("$input->name") }}" class="form_control">
                        </div>

                        @if ($errors->has("$input->name"))
                          <div>
                            <p class="mb-0 text-danger">{{ $errors->first("$input->name") }}
                            </p>
                          </div>
                        @endif
                      </div>
                    @endif
                    @if ($input->type == 2)
                      <div class="col-lg-6 mt-30">
                        <div class="input-group select">
                          <label>{{ $input->label }} @if ($input->required == 1)
                              <span>**</span>
                            @endif
                          </label>
                          <select name="{{ $input->name }}" class="form_control">
                            <option value="" selected disabled>{{ $input->placeholder }}
                            </option>
                            @foreach ($input->quote_input_options as $option)
                              <option value="{{ $option->name }}"
                                {{ old("$input->name") == $option->name ? 'selected' : '' }}>
                                {{ $option->name }}</option>
                            @endforeach>

                          </select>
                        </div>

                        @if ($errors->has("$input->name"))
                          <div>
                            <p class="mb-0 text-danger">{{ $errors->first("$input->name") }}
                            </p>
                          </div>
                        @endif
                      </div>
                    @endif
                    @if ($input->type == 3)
                      <div class="col-12 mt-30">
                        <label>{{ $input->label }} @if ($input->required == 1)
                            <span>**</span>
                          @endif
                        </label>
                        <div class="form_checkbox d-flex">
                          @foreach ($input->quote_input_options as $option)
                            <div class="single-checkbox mr-4">
                              <input type="checkbox" name="{{ $input->name }}[]" value="{{ $option->name }}"
                                {{ is_array(old("$input->name")) && in_array($option->name, old("$input->name")) ? 'checked' : '' }}
                                id="option{{ $option->id }}" class="sq-16">
                              <label for="option{{ $option->id }}">{{ $option->name }}</label>
                            </div>
                          @endforeach
                        </div>

                        @if ($errors->has("$input->name"))
                          <div>
                            <p class="mb-0 text-danger">{{ $errors->first("$input->name") }}
                            </p>
                          </div>
                        @endif
                      </div>
                    @endif
                    @if ($input->type == 4)
                      <div class="col-12 mt-30">
                        <div class="input-group textarea">
                          <label>{{ $input->label }} @if ($input->required == 1)
                              <span>**</span>
                            @endif
                          </label>
                          <textarea placeholder="{{ $input->placeholder }}" name="{{ $input->name }}">{{ old("$input->name") }}</textarea>
                        </div>

                        @if ($errors->has("$input->name"))
                          <div>
                            <p class="mb-0 text-danger">{{ $errors->first("$input->name") }}
                            </p>
                          </div>
                        @endif
                      </div>
                    @endif
                    @if ($input->type == 6)
                      <div class="col-lg-6 mt-30">
                        <label>{{ $input->label }} @if ($input->required == 1)
                            <span>**</span>
                          @endif
                        </label>
                        <input class="datepicker" name="{{ $input->name }}" type="text"
                          value="{{ old("$input->name") }}" placeholder="{{ $input->placeholder }}" autocomplete="off">

                        @if ($errors->has("$input->name"))
                          <div>
                            <p class="mb-0 text-danger">{{ $errors->first("$input->name") }}
                            </p>
                          </div>
                        @endif
                      </div>
                    @endif

                    @if ($input->type == 7)
                      <div class="col-lg-6 mt-30">
                        <label>{{ $input->label }} @if ($input->required == 1)
                            <span>**</span>
                          @endif
                        </label>
                        <input class="timepicker" name="{{ $input->name }}" type="text"
                          value="{{ old("$input->name") }}" placeholder="{{ $input->placeholder }}" autocomplete="off">


                        @if ($errors->has("$input->name"))
                          <div>
                            <p class="mb-0 text-danger">{{ $errors->first("$input->name") }}
                            </p>
                          </div>
                        @endif
                      </div>
                    @endif
                    @if ($input->type == 5)
                      <div class="col-lg-6 mt-30">
                        <div class="form-group mb-0">
                          <label class="d-block">{{ $input->label }} @if ($input->required == 1)
                              <span>**</span>
                            @endif
                          </label>
                          <input type="file" name="{{ $input->name }}" value="" class="form-control">
                        </div>
                        <p class="text-warning mb-0">
                          **
                          {{ $keywords['Only_zip_file_is_allowed'] ?? 'Only zip file is allowed' }}
                        </p>

                        @if ($errors->has("$input->name"))
                          <div>
                            <p class="mb-0 text-danger">{{ $errors->first("$input->name") }}
                            </p>
                          </div>
                        @endif
                      </div>
                    @endif
                  @endforeach
                  <div class="col-lg-6 mt-30">
                    <div class="form_group">

                      @if ($userBs->is_recaptcha == 1)
                        <div class="d-block mb-4">
                          {!! NoCaptcha::renderJs() !!}
                          {!! NoCaptcha::display() !!}
                          @if ($errors->has('g-recaptcha-response'))
                            @php
                              $errmsg = $errors->first('g-recaptcha-response');
                            @endphp
                            <p class="text-danger mb-0 mt-2">{{ __("$errmsg") }}</p>
                          @endif
                        </div>
                      @endif
                    </div>
                  </div>
                  <div class="col-lg-12 text-center mt-40">
                    <button type="submit" class="main-btn template-btn">{{ $keywords['Submit'] ?? 'Submit' }}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
@endsection
