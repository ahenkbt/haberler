(function ($) {
    "use strict";

    $(document).on('change', '#about_image', function (event) {
        var file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            $('.showAboutImage img').attr('src', e.target.result);
        };

        reader.readAsDataURL(file);
    })
    $(document).on('change', '#about_video_image', function (event) {
        var file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            $('.showAboutVideoImage img').attr('src', e.target.result);
        };

        reader.readAsDataURL(file);
    })
    $(document).on('change', '#testimonial_image', function (event) {
        var file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            $('.showTestimonialImage img').attr('src', e.target.result);
        };

        reader.readAsDataURL(file);
    })
    $(document).on('change', '#skillsImage', function (event) {
        var file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            $('.showSkillImage img').attr('src', e.target.result);
        };

        reader.readAsDataURL(file);
    })
    
    $(document).on('change', '#newsletter_image', function (event) {
        var file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            $('.showNewsletterImage img').attr('src', e.target.result);
        };

        reader.readAsDataURL(file);
    })

    $(document).on('change', '#newsletter_image2', function (event) {
        var file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            $('.showNewsletterImage2 img').attr('src', e.target.result);
        };

        reader.readAsDataURL(file);
    })

    $(document).on('change', '#achievement_image', function (event) {
        var file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            $('.showAchievementImage img').attr('src', e.target.result);
        };

        reader.readAsDataURL(file);
    })
    $(document).on('change', '#faq_section_image', function (event) {
        var file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            $('.showFAQSectionImage img').attr('src', e.target.result);
        };

        reader.readAsDataURL(file);
    })
    $(document).on('change', '#quote_section_image', function (event) {
        var file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            $('.showQuoteSectionImage img').attr('src', e.target.result);
        };

        reader.readAsDataURL(file);
    })
})(jQuery); 
