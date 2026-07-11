(function ($) {
    "use strict";
    $('input[name="is_trial"]').on('change', function () {
        if ($(this).val() == 1) {
            $('#trial_day').show();
        } else {
            $('#trial_day').hide();
        }
        $('#trial_days_2').val(null);
        $('#trial_days_1').val(null);
    });


})(jQuery); 


(function ($) {
    "use strict";

    function toggleAIWebsiteSetup() {
        const wrapper = $('#aiWebsiteSetupWrapper');
        const enabled = $('#OneClickAIWebsiteSetup').is(':checked');

        if (enabled) {
            wrapper.removeClass('ai-setup-hidden').addClass('ai-setup-visible');
        } else {
            wrapper.removeClass('ai-setup-visible').addClass('ai-setup-hidden');

            // clear AI selections when disabled
            $('input[name="ai_engines[]"]').prop('checked', false);
            $('input[name="ai_pages[]"]').prop('checked', false);
        }
    }

    // On load
    $(document).ready(function () {
        toggleAIWebsiteSetup();
    });

    // On change
    $(document).on('change', '#OneClickAIWebsiteSetup', function () {
        toggleAIWebsiteSetup();
    });

})(jQuery);
