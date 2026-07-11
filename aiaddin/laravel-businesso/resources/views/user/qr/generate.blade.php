@extends('user.layout')

@section('styles')
    <style>
        @font-face {
            font-family: "Lato-Regular";
            src: url({{ asset('assets/front/fonts/Lato-Regular.ttf') }});
        }
    </style>
@endsection

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __('QR_Code_Builder') }}</h4>
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
                <a href="#">{{ __('QR_Code_Builder') }}</a>
            </li>
        </ul>
    </div>
    <div class="row">
        <div class="col-lg-7">
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">{{ __('QR_Code_Builder') }}</h4>
                </div>
                <div class="card-body">
                    <form id="qrGeneratorForm" method="POST" enctype="multipart/form-data">
                        @csrf
                        <div class="row">
                            <div class="col-lg-6">
                                <div class="form-group">
                                    @php
                                        $qrUrl = !empty($abs->qr_url) ? $abs->qr_url : url(Auth::user()->username);
                                    @endphp
                                    <label for="">{{ __('URL') }} **</label>
                                    <input type="text" class="form-control" name="url" value="{{ $qrUrl }}"
                                        onchange="generateQr()">
                                    <p class="text-warning mb-0">{{ __('QR_Code_will_be_generated_for_this_URL') }}</p>
                                </div>
                            </div>
                            <div class="col-lg-6">
                                <div class="form-group">
                                    <label for="">{{ __('Color') }}</label>
                                    @php
                                        if (empty($abs->qr_color)) {
                                            $qrColor = '000000';
                                        } else {
                                            $qrColor = $abs->qr_color;
                                        }
                                    @endphp
                                    <input type="text" class="form-control jscolor" name="color"
                                        value="{{ $qrColor }}" onchange="generateQr()">
                                    <p class="mb-0 text-warning">
                                        {{ __('If_the_QR_Code_cannot_be_scanned_then_choose_a_darker_color') }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-lg-6">
                                <div class="form-group">
                                    <label for="">{{ __('Size') }}</label>
                                    <input class="form-control p-0 range-slider" name="size" type="range"
                                        min="200" max="350" value="{{ $abs->qr_size }}" onchange="generateQr()">
                                    <span class="text-dark size-text float-right">{{ $abs->qr_size }}</span>
                                </div>
                            </div>
                            <div class="col-lg-6">
                                <div class="form-group">
                                    <label for="">{{ __('White_Space') }}</label>
                                    <input class="form-control p-0 range-slider" name="margin" type="range"
                                        min="0" max="5" value="{{ $abs->qr_margin }}"
                                        onchange="generateQr()">
                                    <span class="text-dark size-text float-right">{{ $abs->qr_margin }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-lg-6">
                                <div class="form-group">
                                    <label for="">{{ __('Style') }}</label>
                                    <select name="style" class="form-control" onchange="generateQr()">
                                        <option value="square" {{ $abs->qr_style == 'square' ? 'selected' : '' }}>
                                            {{ __('Square') }}</option>
                                        <option value="round" {{ $abs->qr_style == 'round' ? 'selected' : '' }}>
                                            {{ __('Round') }}</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-lg-6">
                                <div class="form-group">
                                    <label for="">{{ __('Eye_Style') }}</label>
                                    <select name="eye_style" class="form-control" onchange="generateQr()">
                                        <option value="square" {{ $abs->qr_eye_style == 'square' ? 'selected' : '' }}>
                                            {{ __('Square') }}</option>
                                        <option value="circle" {{ $abs->qr_eye_style == 'circle' ? 'selected' : '' }}>
                                            {{ __('Circle') }}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="">{{ __('Type') }}</label>
                            <select name="type" class="form-control" onchange="generateQr()">
                                <option value="default" {{ $abs->qr_type == 'default' ? 'selected' : '' }}>
                                    {{ __('Default') }}</option>
                                <option value="image" {{ $abs->qr_type == 'image' ? 'selected' : '' }}>
                                    {{ __('Image') }}</option>
                                <option value="text" {{ $abs->qr_type == 'text' ? 'selected' : '' }}>{{ __('Text') }}
                                </option>
                            </select>
                        </div>
                        <div id="type-image" class="types">
                            <div class="form-group">
                                <div class="col-12 mb-2">
                                    <label for="image"><strong> {{ __('Image') }}</strong></label>
                                </div>
                                <div class="col-md-12 showImage mb-3">
                                    <img src="{{ $abs->qr_inserted_image ? asset('assets/user/img/qr/' . $abs->qr_inserted_image) : asset('assets/admin/img/noimage.jpg') }}"
                                        alt="..." class="img-thumbnail qr">
                                </div>
                                <input type="file" name="image" id="image" class="form-control"
                                    onchange="generateQr()">
                            </div>
                            <div class="form-group">
                                <label for="">{{ __('Image_Size') }}</label>
                                <input class="form-control p-0 range-slider" name="image_size" type="range"
                                    min="1" max="20" value="{{ $abs->qr_inserted_image_size }}"
                                    onchange="generateQr()">
                                <span
                                    class="text-dark size-text float-right d-block">{{ $abs->qr_inserted_image_size }}</span>
                                <p class="mb-0 text-warning">
                                    {{ __('If_the_QR_Code_cannot_be_scanned_then_reduce_this_size') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="">{{ __('Image_Horizontal_Position') }}</label>
                                <input class="form-control p-0 range-slider" name="image_x" type="range"
                                    min="0" max="100" value="{{ $abs->qr_inserted_image_x }}"
                                    onchange="generateQr()">
                                <span class="text-dark size-text float-right">{{ $abs->qr_inserted_image_x }}</span>
                            </div>
                            <div class="form-group">
                                <label for="">{{ __('Image_Vertical_Position') }}</label>
                                <input class="form-control p-0 range-slider" name="image_y" type="range"
                                    min="0" max="100" value="{{ $abs->qr_inserted_image_y }}"
                                    onchange="generateQr()">
                                <span class="text-dark size-text float-right">{{ $abs->qr_inserted_image_y }}</span>
                            </div>
                        </div>
                        <div id="type-text" class="types">
                            <div class="form-group">
                                <label>{{ __('Text') }}</label>
                                <input type="text" name="text" value="{{ $abs->qr_text }}" class="form-control"
                                    onchange="generateQr()">
                            </div>
                            <div class="form-group">
                                <label>{{ __('Text_Color') }} </label>
                                @php
                                    if (empty($abs->qr_text_color)) {
                                        $qrTextColor = '000000';
                                    } else {
                                        $qrTextColor = $abs->qr_text_color;
                                    }
                                @endphp
                                <input type="text" name="text_color" value="{{ $qrTextColor }}"
                                    class="form-control jscolor" onchange="generateQr()">
                            </div>
                            <div class="form-group">
                                <label for="">{{ __('Text_Size') }}</label>
                                <input class="form-control p-0 range-slider" name="text_size" type="range"
                                    min="1" max="15" value="{{ $abs->qr_text_size }}"
                                    onchange="generateQr()">
                                <span class="text-dark size-text float-right d-block">{{ $abs->qr_text_size }}</span>
                                <p class="mb-0 text-warning">
                                    {{ __('If_the_QR_Code_cannot_be_scanned_then_reduce_this_size') }}</p>
                            </div>
                            <div class="form-group">
                                <label for="">{{ __('Text_Horizontal_Position') }}</label>
                                <input class="form-control p-0 range-slider" name="text_x" type="range"
                                    min="0" max="100" value="{{ $abs->qr_text_x }}"
                                    onchange="generateQr()">
                                <span class="text-dark size-text float-right">{{ $abs->qr_text_x }}</span>
                            </div>
                            <div class="form-group">
                                <label for="">{{ __('Text_Vertical_Position') }}</label>
                                <input class="form-control p-0 range-slider" name="text_y" type="range"
                                    min="0" max="100" value="{{ $abs->qr_text_y }}"
                                    onchange="generateQr()">
                                <span class="text-dark size-text float-right">{{ $abs->qr_text_y }}</span>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <div class="col-lg-5">
            <div class="card bg-white">
                <div class="card-header border-bottom">
                    <h4 class="card-title d-inline-block text-dark">{{ __('Preview') }}</h4>
                    <button class="btn btn-success float-right" data-toggle="modal"
                        data-target="#saveModal">{{ __('Save') }}</button>
                    <form action="{{ route('user.qrcode.clear') }}" class="d-inline-block float-right mr-2">
                        <button class="btn btn-danger" type="submit">{{ __('Clear') }}</button>
                    </form>
                </div>
                <div class="card-body text-center py-5">
                    <div class="p-3 border-rounded d-inline-block border bg-light">
                        <img id="preview" src="{{ asset('assets/user/img/qr/' . $abs->qr_image) }}" alt="">
                    </div>
                </div>
                <div class="card-footer text-center border-top">
                    <a id="downloadBtn" class="btn btn-success" download="qr-image.png"
                        href="{{ asset('assets/user/img/qr/' . $abs->qr_image) }}">{{ __('Download_Image') }}</a>
                </div>
            </div>
            <span id="text-size" class="invisible">{{ $abs->text }}</span>
        </div>
    </div>

    <!-- Modal -->
    <div class="modal fade" id="saveModal" tabindex="-1" role="dialog" aria-labelledby="saveModalTitle"
        aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Save_QR_Code') }}</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <form action="{{ route('user.qrcode.save') }}" method="POST" id="qrSaveForm">
                        @csrf
                        <label for="">{{ __('Name') }} **</label>
                        <input name="name" type="text" class="form-control" required>
                        <p class="text-warning mb-0">
                            {{ __('This_name_will_be_used_to_identify_this_specific_QR_Code_from_the_QR_Codes_List') }}</p>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">{{ __('Close') }}</button>
                    <button type="submit" form="qrSaveForm" class="btn btn-success">{{ __('Save') }}</button>
                </div>
            </div>
        </div>
    </div>
@endsection
@section('scripts')
    <script type="text/javascript">
        function loadDiv(type) {
            $(".types").removeClass('d-block');
            $(".types").addClass('d-none');
            $("#" + "type-" + type).removeClass("d-none");
            $("#" + "type-" + type).addClass("d-block");
        }


        $(document).ready(function() {
            let type = $("select[name='type']").val();
            loadDiv(type);

            $(".range-slider").on("input", function() {
                $(this).next(".size-text").html($(this).val());
            });

        });

        function generateQr() {

            loadDiv($("select[name='type']").val());
            $(".request-loader").addClass('show');

            let fd = new FormData(document.getElementById('qrGeneratorForm'));
            fd.append('size', $("input[name='size']").val());
            fd.append('margin', $("input[name='margin']").val());
            fd.append('image_size', $("input[name='image_size']").val());
            fd.append('image_x', $("input[name='image_x']").val());
            fd.append('image_y', $("input[name='image_y']").val());
            if ($("select[name='type']").val() == 'text') {
                $("#text-size").text($("input[name='text']").val());
                let fontSize = ($("input[name='size']").val() * $("input[name='text_size']").val()) / 100;
                $("#text-size").css({
                    "font-size": fontSize,
                    "font-family": "Lato-Regular"
                });
                let textWidth = $("#text-size").width() == 0 ? 1 : $("#text-size").width();
                fd.append('text_width', textWidth);
            }

            $(".range-slider").attr('disabled', true);

            $.ajax({
                url: "{{ route('user.qrcode.generate') }}",
                type: 'POST',
                data: fd,
                contentType: false,
                processData: false,
                success: function(data) {
                    $(".request-loader").removeClass('show');
                    $(".range-slider").attr('disabled', false);

                    if (data == "url_empty") {
                        bootnotify("URL field cannot be empty", "Warning", "warning");
                    } else {
                        $("#preview").attr('src', data);
                        $("#downloadBtn").attr('href', data);
                    }

                }
            });
        }
    </script>
@endsection
