(function ($) {
    "use strict";
    function toggleDetails(val, shortDetailsId, extLinkId) {

        if (val == 1) {
           $("#" + shortDetailsId).hide();
           $("#" + extLinkId).show();
        } else {
           $("#" + extLinkId).hide();
           $("#" + shortDetailsId).show();
        }
      }
         $(".editbtn").on('click', function() {
            setTimeout(() => {
              let $elstatus = $('#ajaxEditForm .elstatus:checked');
              let val = $elstatus.val();
              let shortDetailsId = $elstatus.data('short_details_id');
              let extLinkId = $elstatus.data('ext_link_id');
              toggleDetails(val, shortDetailsId, extLinkId);
            }, 300);
         });
        $(".elstatus").on('change', function() {
           let val = $(this).val();
           let shortDetailsId = $(this).data('short_details_id');
           let extLinkId = $(this).data('ext_link_id');
           toggleDetails(val, shortDetailsId, extLinkId);
        });
})(jQuery);