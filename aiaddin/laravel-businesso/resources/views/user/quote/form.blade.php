@extends('user.layout')

@php
  $setLang = \App\Models\User\Language::where([
      ['code', request()->input('language')],
      ['user_id', Auth::id()],
  ])->first();
  $userDefaultLang = \App\Models\User\Language::where([['user_id', Auth::id()], ['is_default', 1]])->first();
  $userLanguages = \App\Models\User\Language::where('user_id', Auth::id())->get();
@endphp

@if (!empty($setLang) && $setLang->rtl == 1)
  @section('styles')
    <style>
      form input,
      form textarea,
      form select,
      select {
        direction: rtl;
      }

      form .note-editor.note-frame .note-editing-area .note-editable {
        direction: rtl;
        text-align: right;
      }
    </style>
  @endsection
@endif

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Form_Builder') }}</h4>
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
        <a href="#">{{ __('Quote_Management') }}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Form_Builder') }}</a>
      </li>
    </ul>
  </div>

  <div class="row" id="app">
    <div class="col-lg-7">
      <div class="card">
        <div class="card-header">
          <div class="row">
            <div class="col-lg-8">
              <div class="card-title">{{ __('Input_Fields') }}</div>
            </div>
            <div class="col-lg-4">

            </div>
          </div>
        </div>
        <div class="card-body">
          <p class="text-warning">** {{ __('Do_not_create') }} <strong
              class="text-danger">{{ __('Name_and_Email') }}</strong>
            {{ __('input_field_it_will_be_in_the_Request_a_Quote_form_By_default') }}</p>

          @if (count($inputs) > 0)
            <div id="sortable">
              @foreach ($inputs as $key => $input)
                {{-- input type text --}}
                @if ($input->type == 1)
                  <form class="ui-state-default" action="{{ route('user.quote.inputDelete') }}" method="post"
                    data-id="{{ $input->id }}">
                    {{ csrf_field() }}
                    <input type="hidden" name="input_id" value="{{ $input->id }}">
                    <div class="form-group">
                      <label for="">{{ $input->label }} @if ($input->required == 1)
                          <span>**</span>
                        @elseif($input->required == 0)
                          ({{ __('Optional') }})
                        @endif
                      </label>
                      <div class="row">
                        <div class="col-md-10">
                          <input class="form-control" type="text" name="" value=""
                            placeholder="{{ $input->placeholder }}">
                        </div>
                        <div class="col-md-1">
                          <a class="btn btn-warning btn-sm"
                            href="{{ route('user.quote.inputEdit', $input->id) . '?language=' . request()->input('language') }}">
                            <i class="fas fa-edit"></i>
                          </a>
                        </div>
                        <div class="col-md-1">
                          <button class="btn btn-danger btn-sm" type="submit">
                            <i class="fa fa-times"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                @elseif ($input->type == 2)
                  <form class="ui-state-default" action="{{ route('user.quote.inputDelete') }}" method="post"
                    data-id="{{ $input->id }}">
                    {{ csrf_field() }}
                    <input type="hidden" name="input_id" value="{{ $input->id }}">
                    <div class="form-group">
                      <label for="">{{ $input->label }} @if ($input->required == 1)
                          <span>**</span>
                        @elseif($input->required == 0)
                          ({{ __('Optional') }})
                        @endif
                      </label>
                      <div class="row">
                        <div class="col-md-10">
                          <select class="form-control" name="">
                            <option value="" selected disabled>{{ $input->placeholder }}
                            </option>
                            @foreach ($input->quote_input_options as $key => $option)
                              <option value="">{{ $option->name }}</option>
                            @endforeach
                          </select>
                        </div>

                        <div class="col-md-1">
                          <a class="btn btn-warning btn-sm"
                            href="{{ route('user.quote.inputEdit', $input->id) . '?language=' . request()->input('language') }}">
                            <i class="fas fa-edit"></i>
                          </a>
                        </div>
                        <div class="col-md-1">
                          <button class="btn btn-danger btn-sm" type="submit">
                            <i class="fa fa-times"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                @elseif ($input->type == 3)
                  <form class="ui-state-default" action="{{ route('user.quote.inputDelete') }}" method="post"
                    data-id="{{ $input->id }}">
                    {{ csrf_field() }}
                    <input type="hidden" name="input_id" value="{{ $input->id }}">
                    <div class="form-group">
                      <label for="">{{ $input->label }} @if ($input->required == 1)
                          <span>**</span>
                        @elseif($input->required == 0)
                          ({{ __('Optional') }})
                        @endif
                      </label>
                      <div class="row">
                        <div class="col-md-10">
                          @foreach ($input->quote_input_options as $key => $option)
                            <div class="custom-control custom-checkbox">
                              <input type="checkbox" id="customRadio{{ $option->id }}" name="customRadio"
                                class="custom-control-input">
                              <label class="custom-control-label"
                                for="customRadio{{ $option->id }}">{{ $option->name }}</label>
                            </div>
                          @endforeach
                        </div>
                        <div class="col-md-1">
                          <a class="btn btn-warning btn-sm"
                            href="{{ route('user.quote.inputEdit', $input->id) . '?language=' . request()->input('language') }}">
                            <i class="fas fa-edit"></i>
                          </a>
                        </div>
                        <div class="col-md-1">
                          <button type="submit" class="btn btn-danger btn-sm">
                            <i class="fa fa-times"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                @elseif ($input->type == 4)
                  <form class="ui-state-default" action="{{ route('user.quote.inputDelete') }}" method="post"
                    data-id="{{ $input->id }}">
                    {{ csrf_field() }}
                    <input type="hidden" name="input_id" value="{{ $input->id }}">
                    <div class="form-group">
                      <label for="">{{ $input->label }} @if ($input->required == 1)
                          <span>**</span>
                        @elseif($input->required == 0)
                          ({{ __('Optional') }})
                        @endif
                      </label>
                      <div class="row">
                        <div class="col-md-10">
                          <textarea class="form-control" name="" rows="5" cols="80"
                            placeholder="{{ $input->placeholder }}"></textarea>
                        </div>
                        <div class="col-md-1">
                          <a class="btn btn-warning btn-sm"
                            href="{{ route('user.quote.inputEdit', $input->id) . '?language=' . request()->input('language') }}">
                            <i class="fas fa-edit"></i>
                          </a>
                        </div>
                        <div class="col-md-1">
                          <button type="submit" class="btn btn-danger btn-sm">
                            <i class="fa fa-times"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                @elseif ($input->type == 6)
                  <form class="ui-state-default" action="{{ route('user.quote.inputDelete') }}" method="post"
                    data-id="{{ $input->id }}">
                    {{ csrf_field() }}
                    <input type="hidden" name="input_id" value="{{ $input->id }}">
                    <div class="form-group">
                      <label for="">{{ $input->label }} @if ($input->required == 1)
                          <span>**</span>
                        @elseif($input->required == 0)
                          ({{ __('Optional') }})
                        @endif
                      </label>
                      <div class="row">
                        <div class="col-md-10">
                          <input type="text" class="form-control datepicker" autocomplete="off"
                            placeholder="{{ $input->placeholder }}">
                        </div>
                        <div class="col-md-1">
                          <a class="btn btn-warning btn-sm"
                            href="{{ route('user.quote.inputEdit', $input->id) . '?language=' . request()->input('language') }}">
                            <i class="fas fa-edit"></i>
                          </a>
                        </div>
                        <div class="col-md-1">
                          <button type="submit" class="btn btn-danger btn-sm">
                            <i class="fa fa-times"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                @elseif ($input->type == 7)
                  <form class="ui-state-default" action="{{ route('user.quote.inputDelete') }}" method="post"
                    data-id="{{ $input->id }}">
                    {{ csrf_field() }}
                    <input type="hidden" name="input_id" value="{{ $input->id }}">
                    <div class="form-group">
                      <label for="">{{ $input->label }} @if ($input->required == 1)
                          <span>**</span>
                        @elseif($input->required == 0)
                          ({{ __('Optional') }})
                        @endif
                      </label>
                      <div class="row">
                        <div class="col-md-10">
                          <input type="text" class="form-control timepicker" autocomplete="off"
                            placeholder="{{ $input->placeholder }}">
                        </div>
                        <div class="col-md-1">
                          <a class="btn btn-warning btn-sm"
                            href="{{ route('user.quote.inputEdit', $input->id) . '?language=' . request()->input('language') }}">
                            <i class="fas fa-edit"></i>
                          </a>
                        </div>
                        <div class="col-md-1">
                          <button type="submit" class="btn btn-danger btn-sm">
                            <i class="fa fa-times"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                @elseif ($input->type == 5)
                  <form class="ui-state-default" action="{{ route('user.quote.inputDelete') }}" method="post"
                    data-id="{{ $input->id }}">
                    {{ csrf_field() }}
                    <input type="hidden" name="input_id" value="{{ $input->id }}">
                    <div class="form-group">
                      <label for="">{{ $input->label }} @if ($input->required == 1)
                          <span>**</span>
                        @elseif($input->required == 0)
                          ({{ __('Optional') }})
                        @endif
                      </label>
                      <div class="row">
                        <div class="col-md-10">
                          <input type="file">
                        </div>
                        <div class="col-md-1">
                          <a class="btn btn-warning btn-sm"
                            href="{{ route('user.quote.inputEdit', $input->id) . '?language=' . request()->input('language') }}">
                            <i class="fas fa-edit"></i>
                          </a>
                        </div>
                        <div class="col-md-1">
                          <button type="submit" class="btn btn-danger btn-sm">
                            <i class="fa fa-times"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                @endif
              @endforeach
            </div>
          @endif
        </div>
      </div>
    </div>

    <div class="col-lg-5">
      <div class="card">
        <div class="card-header">
          <div class="card-title">{{ __('Create_Input') }}</div>
        </div>

        <form id="ajaxForm" action="{{ route('user.quote.form.store') }}" method="post"
          enctype="multipart/form-data">
          {{ csrf_field() }}
          <input type="hidden" name="language_id" value="{{ $lang_id }}">
          <div class="form-group">
            <label for=""><strong>{{ __('Field_Type') }}</strong></label>
            <div class="">
              <div class="form-check form-check-inline">
                <input name="type" class="form-check-input" type="radio" id="inlineRadio1" value="1"
                  v-model="type" @change="typeChange()">
                <label class="form-check-label" for="inlineRadio1">{{ __('Text_Field') }}</label>
              </div>
              <div class="form-check form-check-inline">
                <input name="type" class="form-check-input" type="radio" id="inlineRadio2" value="2"
                  v-model="type" @change="typeChange()">
                <label class="form-check-label" for="inlineRadio2">{{ __('Select') }}</label>
              </div>
              <div class="form-check form-check-inline">
                <input name="type" class="form-check-input" type="radio" id="inlineRadio3" value="3"
                  v-model="type" @change="typeChange()">
                <label class="form-check-label" for="inlineRadio3">{{ __('Checkbox') }}</label>
              </div>
              <div class="form-check form-check-inline">
                <input name="type" class="form-check-input" type="radio" id="inlineRadio4" value="4"
                  v-model="type" @change="typeChange()">
                <label class="form-check-label" for="inlineRadio4">{{ __('Textarea') }}</label>
              </div>
              <div class="form-check form-check-inline">
                <input name="type" class="form-check-input" type="radio" id="inlineRadio6" value="6"
                  v-model="type" @change="typeChange()">
                <label class="form-check-label" for="inlineRadio6">{{ __('Datepicker') }}</label>
              </div>
              <div class="form-check form-check-inline">
                <input name="type" class="form-check-input" type="radio" id="inlineRadio7" value="7"
                  v-model="type" @change="typeChange()">
                <label class="form-check-label" for="inlineRadio7">{{ __('Timepicker') }}</label>
              </div>
              <div class="form-check form-check-inline">
                <input name="type" class="form-check-input" type="radio" id="inlineRadio5" value="5"
                  v-model="type" @change="typeChange()">
                <label class="form-check-label" for="inlineRadio5">{{ __('File') }}</label>
              </div>
            </div>
            <p id="errtype" class="mb-0 text-danger em"></p>
          </div>

          <div class="form-group">
            <label>{{ __('Required') }} </label>
            <div class="selectgroup w-100">
              <label class="selectgroup-item">
                <input type="radio" name="required" value="1" class="selectgroup-input" checked>
                <span class="selectgroup-button">{{ __('Yes') }}</span>
              </label>
              <label class="selectgroup-item">
                <input type="radio" name="required" value="0" class="selectgroup-input">
                <span class="selectgroup-button">{{ __('No') }}</span>
              </label>
            </div>
            <p id="errrequired" class="mb-0 text-danger em"></p>
          </div>

          <div class="form-group">
            <label for=""><strong>{{ __('Label_Name') }}</strong></label>
            <div class="">
              <input type="text" class="form-control" name="label" value=""
                placeholder="{{ __('Enter_Label_Name') }}">
            </div>
            <p id="errlabel" class="mb-0 text-danger em"></p>
          </div>

          <div class="form-group" v-if="placeholdershow">
            <label for=""><strong>{{ __('Placeholder') }}</strong></label>
            <div class="">
              <input type="text" class="form-control" name="placeholder" value=""
                placeholder="{{ __('Enter_Placeholder') }}">
            </div>
            <p id="errplaceholder" class="mb-0 text-danger em"></p>
          </div>


          <div class="form-group" v-if="counter > 0" id="optionarea">
            <label for=""><strong>{{ __('Options') }}</strong></label>
            <div class="row mb-2 counterrow" v-for="n in counter" :id="'counterrow' + n">
              <div class="col-md-10">
                <input type="text" class="form-control" name="options[]" value=""
                  placeholder="{{ __('Option_label') }}">
              </div>

              <div class="col-md-1">
                <button type="button" class="btn btn-danger btn-md text-white btn-sm" @click="removeOption(n)"><i
                    class="fa fa-times"></i></button>
              </div>
            </div>
            <p id="erroptions.0" class="mb-2 text-danger em"></p>
            <button type="button" class="btn btn-success btn-sm text-white" @click="addOption()"><i
                class="fa fa-plus"></i> {{ __('Add_Option') }}</button>
          </div>

          <div class="form-group text-center">
            <button id="submitBtn" type="submit" class="btn btn-primary btn-sm">{{ __('ADD_FIELD') }}</button>
          </div>
        </form>

      </div>

    </div>
  </div>
@endsection

@section('scripts')
  <script>
    "use strict";
    var orderUpdateUrl = "{{ route('user.quote.orderUpdate') }}";
  </script>
  <script src="{{ asset('assets/front/user/js/quote.js') }}"></script>
@endsection
