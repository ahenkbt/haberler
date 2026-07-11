@extends('admin.layout')

@section('styles')
<link rel="stylesheet" href="{{asset('assets/admin/css/codemirror.css')}}">
@endsection

@section('content')
  <div class="page-header">
    <h4 class="page-title">{{__('Custom CSS')}}</h4>
    <ul class="breadcrumbs">
      <li class="nav-home">
        <a href="{{route('admin.dashboard')}}">
          <i class="flaticon-home"></i>
        </a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{__('Basic Settings')}}</a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{__('Custom CSS')}}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    <div class="col-md-12">
        <div class="card">
            <div class="card-header">
                <div class="card-title d-inline-block">{{__('Custom CSS')}}</div>
            </div>
            <div class="card-body">
                <div class="alert-primary alert">{{ __('Please do not use') }} <strong class="text-danger">&lt;style&gt;&lt;/style&gt;</strong> {{ __('tag here') . '.' }} {{ __('Put the CSS code only') }}</div>
                <form action="{{route('admin.css.update')}}" id="cssForm" method="POST">
                    @csrf
                    <div class="row justify-content-center">
                        <div class="col-lg-12">
                            <div class="editor-holder">
                                <div class="scroller">
                                    <textarea id="customCss" name="custom_css">{{$abe->custom_css}}</textarea>
                                    <pre><code class="syntax-highight html"></code></pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="card-footer">
                <div class="form">
                    <div class="form-group from-show-notify row">
                        <div class="col-12 text-center">
                            <button type="submit" form="cssForm" class="btn btn-success">{{__('Update')}}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>      
    </div>
  </div>

@endsection


@section('scripts')
<script src="{{asset('assets/admin/js/plugin/codemirror/codemirror.js')}}"></script>
<script src="{{asset('assets/admin/js/plugin/codemirror/css.js')}}"></script>
<script src="{{asset('assets/admin/js/plugin/codemirror/show-hint.js')}}"></script>
<script src="{{asset('assets/admin/js/plugin/codemirror/css-hint.js')}}"></script>
<script>
    (function($) {
        "use strict";

        var editor = CodeMirror.fromTextArea(document.getElementById("customCss"), {
            lineNumbers: true,
            mode: "css",
            matchBrackets: true,
            theme: 'monokai',
            extraKeys: {"Ctrl-Space": "autocomplete"}
        });
    })(jQuery);
</script>
@endsection
