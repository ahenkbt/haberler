(function ($) {
    "use strict";
    $(".edit-btn").on('click', function () {
        let datas = $(this).data();
        delete datas['toggle'];
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
                $('.brand-img').attr('src', datas['brandimg']);
                $('.gallery-img').attr('src', datas['gallery_img']);
            }
        }

    });
    //  image (id) preview js/
    $(document).on('change', '#edit_image', function (event) {
        const targetClass = $('.showEditImage img');
        targetClass.removeClass("brand-img");
        targetClass.removeClass("gallery-img");
        let file = event.target.files[0];
        let reader = new FileReader();
        reader.onload = function (e) {
            $('.showEditImage img').attr('src', e.target.result);
        };
        reader.readAsDataURL(file);
    });
})(jQuery);