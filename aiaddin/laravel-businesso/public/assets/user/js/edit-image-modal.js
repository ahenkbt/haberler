(function ($) {
    "use strict";
    //  image (id) preview js/
    $(document).on('change', '#edit_image', function (event) {
        const targetClass = $('.showEditImage img');
        targetClass.removeClass("post-img");
        let file = event.target.files[0];
        let reader = new FileReader();
        reader.onload = function (e) {
            $('.showEditImage img').attr('src', e.target.result);
        };
        reader.readAsDataURL(file);
    });
})(jQuery);
