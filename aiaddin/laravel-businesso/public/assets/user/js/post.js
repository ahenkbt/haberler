"use strict";

function cloneInput(fromId, toId, event) {
    let $target = $(event.target);

    if ($target.is(':checked')) {
        $('#' + fromId + ' .form-control').each(function (i) {
            let index = i;
            let val = $(this).val();
            let $toInput = $('#' + toId + ' .form-control').eq(index);

            if ($(this).hasClass('summernote')) {
                $toInput.summernote('code', val);
            } else if ($(this).data('role') == 'tagsinput') {
                if (val.length > 0) {
                    let tags = val.split(',');
                    tags.forEach(tag => {
                        $toInput.tagsinput('add', tag);
                    });
                } else {
                    $toInput.tagsinput('removeAll');
                }
            } else {
                $toInput.val(val);
            }
        });
    } else {
        $('#' + toId + ' .form-control').each(function (i) {
            let $toInput = $('#' + toId + ' .form-control').eq(i);

            if ($(this).hasClass('summernote')) {
                $toInput.summernote('code', '');
            } else if ($(this).data('role') == 'tagsinput') {
                $toInput.tagsinput('removeAll');
            } else {
                $toInput.val('');
            }
        });
    }
}

$(document).ready(function () {
    $('#postForm').on('submit', function (e) {
        $('.request-loader').addClass('show');
        e.preventDefault();

        let action = $('#postForm').attr('action');
        let fd = new FormData(document.querySelector('#postForm'));

        $.ajax({
            url: action,
            method: 'POST',
            data: fd,
            contentType: false,
            processData: false,
            success: function (data) {
                $('.request-loader').removeClass('show');

                if (data == 'success') {
                    window.location = currUrl;
                }
            },
            error: function (error) {
                $('#postErrors').show();
                let errors = ``;

                for (let x in error.responseJSON.errors) {
                    errors += `<li>
              <p class="text-danger mb-0">${error.responseJSON.errors[x][0]}</p>
            </li>`;
                }

                $('#postErrors ul').html(errors);

                $('.request-loader').removeClass('show');

                $('html, body').animate({
                    scrollTop: $('#postErrors').offset().top - 100
                }, 1000);
            }
        });
    });

    // make any post as a slider post or not.
    $(document).on('change', '.slider-post', function () {
        let optionVal = $(this).val();
        let postInfo = $(this).data();

        console.log(optionVal);
        console.log(postInfo);

        if (optionVal == 1) {
            $('#in_id').val(postInfo.id);
            $('#in_is_slider').val(optionVal);
            $('#slider-post-modal').modal('show');
        } else {
            $('.request-loader').addClass('show');

            console.log(mainURL );
            let link = mainURL + "/user/blog/update-slider";
            let ajaxData = { id: postInfo.id, is_slider: optionVal };

            $.post(link, ajaxData, function (response) {
                if (response.data == 'successful') {
                    $('.request-loader').removeClass('show');
                    location.reload();
                }
            });
        }
    });

    // make any post as a featured post or not.
    $(document).on('change', '.featured-post', function () {
        let optionVal = $(this).val();
        let postInfo = $(this).data();

        if (optionVal == 1) {
            $('#in_post_id').val(postInfo.id);
            $('#in_is_featured').val(optionVal);
            $('#featured-post-modal').modal('show');
        } else {
            $('.request-loader').addClass('show');

            let featPostLink = mainURL + "/user/blog/update-featured";
            let ajaxData = { id: postInfo.id, is_featured: optionVal };

            $.post(featPostLink, ajaxData, function (response) {
                if (response.data == 'successful') {
                    $('.request-loader').removeClass('show');
                    location.reload();
                }
            });
        }
    });

    // featured-form submit with ajax
    $('#featuredSubmitBtn').on('click', function (e) {
        $(e.target).attr('disabled', true);
        $('.request-loader').addClass('show');

        let ajaxForm_2 = document.getElementById('featuredAjaxForm');
        let fd = new FormData(ajaxForm_2);
        let featPostURL = $('#featuredAjaxForm').attr('action');
        let fm = $('#featuredAjaxForm').attr('method');

        $.ajax({
            url: featPostURL,
            method: fm,
            data: fd,
            processData: false,
            contentType: false,
            success: function (data) {
                $(e.target).attr('disabled', false);
                $('.request-loader').removeClass('show');

                $('.em').each(function () {
                    $(this).html('');
                });

                if (data == 'success') {
                    location.reload();
                }
            },
            error: function (error) {
                $('.em').each(function () {
                    $(this).html('');
                });

                for (let x in error.responseJSON.errors) {
                    document.getElementById('err_' + x).innerHTML = error.responseJSON.errors[x][0];
                }

                $(e.target).attr('disabled', false);
                $('.request-loader').removeClass('show');
            }
        });
    });
    // slider-form submit with ajax
    $('#sliderSubmitBtn').on('click', function (e) {
        $(e.target).attr('disabled', true);
        $('.request-loader').addClass('show');

        let ajaxForm_3 = document.getElementById('sliderAjaxForm');
        let fd = new FormData(ajaxForm_3);
        let featPostURL = $('#sliderAjaxForm').attr('action');
        let fm = $('#sliderAjaxForm').attr('method');

        $.ajax({
            url: featPostURL,
            method: fm,
            data: fd,
            processData: false,
            contentType: false,
            success: function (data) {
                $(e.target).attr('disabled', false);
                $('.request-loader').removeClass('show');

                $('.em').each(function () {
                    $(this).html('');
                });

                if (data == 'success') {
                    location.reload();
                }
            },
            error: function (error) {
                $('.em').each(function () {
                    $(this).html('');
                });

                for (let x in error.responseJSON.errors) {
                    console.log(x);
                    document.getElementById('err_' + x).innerHTML = error.responseJSON.errors[x][0];
                }

                $(e.target).attr('disabled', false);
                $('.request-loader').removeClass('show');
            }
        });
    });
    //post Hero section image
    /* ***************************************************
==========Form Submit with AJAX Request Start==========
******************************************************/
    $("#submitBtn_2").on('click', function (e) {
        $(e.target).attr('disabled', true);

        $(".request-loader").addClass("show");

        let ajaxForm_2 = document.getElementById('ajaxForm_2');
        let fd = new FormData(ajaxForm_2);
        let url = $("#ajaxForm_2").attr('action');
        let method = $("#ajaxForm_2").attr('method');

        if ($("#ajaxForm_2 .summernote").length > 0) {
            $("#ajaxForm_2 .summernote").each(function (i) {
                let content = $(this).summernote('code');

                fd.delete($(this).attr('name'));
                fd.append($(this).attr('name'), content);
            });
        }

        $.ajax({
            url: url,
            method: method,
            data: fd,
            contentType: false,
            processData: false,
            success: function (data) {
                $(e.target).attr('disabled', false);
                $(".request-loader").removeClass("show");

                $(".em").each(function () {
                    $(this).html('');
                })

                if (data == "success") {
                    location.reload();
                }

                // if error occurs
                else if (typeof data.error != 'undefined') {
                    for (let x in data) {
                        if (x == 'error') {
                            continue;
                        }
                        document.getElementById('err' + x).innerHTML = data[x][0];
                    }
                }
            },
            error: function (error) {
                $(".em").each(function () {
                    $(this).html('');
                })
                for (let x in error.responseJSON.errors) {
                    document.getElementById('err' + x).innerHTML = error.responseJSON.errors[x][0];
                }
                $(".request-loader").removeClass("show");
                $(e.target).attr('disabled', false);
            }
        });
    });


});


