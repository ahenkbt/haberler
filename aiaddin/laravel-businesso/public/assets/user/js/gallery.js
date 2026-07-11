"use strict";

$(document).ready(function () {
    // show input field according to radio button (image/video)
    $('.createItemRadioBtn').on('click', function () {
        let radioBtnVal = $('input[name="item_type"]:checked').val();

        if (radioBtnVal === 'video') {
            $('#video-msg').removeClass('d-none');
            $('#video-input').removeClass('d-none');
        } else {
            $('#video-msg').addClass('d-none');
            $('#video-input').addClass('d-none');
        }
    });


    $('.editItemRadioBtn').on('click', function () {
        let radioBtnVal = $('input[name="edit_item_type"]:checked').val();

        if (radioBtnVal === 'video') {
            $('#editVideo-msg').removeClass('d-none');
            $('#editVideo-input').removeClass('d-none');
        } else {
            $('#editVideo-msg').addClass('d-none');
            $('#editVideo-input').addClass('d-none');
        }
    });


    $('#gallery_language').on('change', function () {
        $('.request-loader').addClass('show');

        // send ajax request to get all the categories of that selected language
        $.get(mainURL + "/user/gallery-management/get-categories/" + $(this).val(), function (response) {
            console.log(response, "response")

            $('.request-loader').removeClass('show');

            if ('successData' in response) {
                $('select[name="gallery_category_id"]').removeAttr('disabled');

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
            } else {
                alert(response.errorData);
            }
        });
    });
});
