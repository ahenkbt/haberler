"use strict";
$(document).ready(function () {
    // make input fields RTL
    $("select[name='user_language_id']").on('change', function () {
        $(".request-loader").addClass("show");
        let url = "{{url('/')}}/user/rtlcheck/" + $(this).val();
        $.get(url, function (data) {
            $(".request-loader").removeClass("show");
            if (data == 1) {
                $("form.create input").each(function () {
                    if (!$(this).hasClass('ltr')) {
                        $(this).addClass('rtl');
                    }
                });
                $("form.create select").each(function () {
                    if (!$(this).hasClass('ltr')) {
                        $(this).addClass('rtl');
                    }
                });
                $("form.create textarea").each(function () {
                    if (!$(this).hasClass('ltr')) {
                        $(this).addClass('rtl');
                    }
                });
                $("form.create .nicEdit-main").each(function () {
                    $(this).addClass('rtl text-right');
                });

            } else {
                $("form.create input, form.create select, form.create textarea").removeClass('rtl');
                $("form.create .nicEdit-main").removeClass('rtl text-right');
            }
        })
    });

    $(".newEditBtn").on('click', function () {
        let datas = $(this).data();
        console.log(datas);
        delete datas['toggle'];

        // send a get request to fetch all the categories of selected language
        if ('edit' in datas && datas.edit === 'editGallery') {
            let urlParams = new URLSearchParams(window.location.search);
            let langCode = urlParams.get('language');

            let url = mainURL + '/user/gallery-management/edit-item/get-categories/' + langCode;

            $.get(url, function (response) {
                if (response && response.successData) {
                    let categoryData = response.successData;
                    let markup = `<option selected disabled>Select a Category</option>`;

                    if (categoryData.length > 0) {
                        for (let index = 0; index < categoryData.length; index++) {
                            markup += `<option value="${categoryData[index].id}">${categoryData[index].name}</option>`;
                        }
                    } else {
                        markup += `<option>No Category Exist</option>`;
                    }

                    $('select[name="gallery_category_id"]').html(markup);
                    $('#in_' + 'gallery_category_id').val(datas.gallery_category_id);
                } else {
                    alert(response.errorData);
                }
            });
        }

        for (let x in datas) {
            if ($("#in_" + x).hasClass('summernote')) {
                $("#in_" + x).summernote('code', datas[x]);
            } else if ($("#in_" + x).data('role') == 'tagsinput') {
                if (datas[x].length > 0) {
                    let arr = datas[x].split(" ");
                    for (let i = 0; i < arr.length; i++) {
                        $("#in_" + x).tagsinput('add', arr[i]);
                    }
                } else {
                    $("#in_" + x).tagsinput('removeAll');
                }
            } else if ($("input[name='" + x + "']").attr('type') == 'radio') {
                $("input[name='" + x + "']").each(function (i) {
                    if ($(this).val() == datas[x]) {
                        $(this).prop('checked', true);
                    }
                });
            } else {
                $("#in_" + x).val(datas[x]);
                $('.in_image').attr('src', datas['image']);
            }
        }


        if ('item_type' in datas) {
            if (datas.item_type == 'image') {
                $('#imgOption').prop('checked', true);
            } else {
                $('#vidOption').prop('checked', true);
            }
        }

        if ('video_link' in datas) {
            if (datas.video_link === '') {
                $('#editVideo-input').addClass('d-none');
            } else {
                $('#editVideo-input').removeClass('d-none');
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


        // focus & blur colorpicker inputs
        setTimeout(() => {
            $(".jscolor").each(function () {
                $(this).focus();
                $(this).blur();
            });
        }, 300);
    });
});
