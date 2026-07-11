"use strict";

$(document).ready(function () {
    $(".editbtnAd").on('click', function () {
        let datas = $(this).data();
        delete datas['toggle'];
        for (let x in datas) {
            if ($("#in" + x).hasClass('summernote')) {
                $("#in" + x).summernote('code', datas[x]);
            } else if ($("#in" + x).data('role') == 'tagsinput') {
                if (datas[x].length > 0) {
                    let arr = datas[x].split(" ");
                    for (let i = 0; i < arr.length; i++) {
                        $("#in" + x).tagsinput('add', arr[i]);
                    }
                } else {
                    $("#in" + x).tagsinput('removeAll');
                }
            }
            else if ($("input[name='" + x + "']").attr('type') == 'radio') {
                $("input[name='" + x + "']").each(function (i) {
                    if ($(this).val() == datas[x]) {
                        $(this).prop('checked', true);
                    }
                });
            }
            else {
                $("#in_" + x).val(datas[x]);
                $('.in_image').attr('src', datas['image']);
            }
        }

        if ('edit' in datas && datas.edit === 'editAdvertisement') {
            if (datas.ad_type === 'banner') {
                if (!$('#edit-script-input').hasClass('d-none')) {
                    $('#edit-script-input').addClass('d-none');
                }

                $('#edit-image-input').removeClass('d-none');
                $('#edit-url-input').removeClass('d-none');
            } else {
                if (
                    !$('#edit-image-input').hasClass('d-none') &&
                    !$('#edit-url-input').hasClass('d-none')
                ) {
                    $('#edit-image-input').addClass('d-none');
                    $('#edit-url-input').addClass('d-none');
                }

                $('#edit-script-input').removeClass('d-none');
            }
        }
    });
    $('.ad-type').change(function () {
        let adType = $(this).val();

        if (adType == 'banner') {
            if (!$('#script-input').hasClass('d-none')) {
                $('#script-input').addClass('d-none');
            }

            $('#image-input').removeClass('d-none');
            $('#url-input').removeClass('d-none');
        } else {
            if (
                !$('#image-input').hasClass('d-none') &&
                !$('#url-input').hasClass('d-none')
            ) {
                $('#image-input').addClass('d-none');
                $('#url-input').addClass('d-none');
            }

            $('#script-input').removeClass('d-none');
        }
    });


    $('.edit-ad-type').change(function () {
        let adType = $(this).val();

        if (adType == 'banner') {
            if (!$('#edit-script-input').hasClass('d-none')) {
                $('#edit-script-input').addClass('d-none');
            }

            $('#edit-image-input').removeClass('d-none');
            $('#edit-url-input').removeClass('d-none');
        } else {
            if (
                !$('#edit-image-input').hasClass('d-none') &&
                !$('#edit-url-input').hasClass('d-none')
            ) {
                $('#edit-image-input').addClass('d-none');
                $('#edit-url-input').addClass('d-none');
            }

            $('#edit-script-input').removeClass('d-none');
        }
    });
});