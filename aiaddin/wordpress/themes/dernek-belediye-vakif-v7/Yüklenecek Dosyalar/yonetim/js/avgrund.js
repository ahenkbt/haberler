(function($) {
  'use strict';
  $(function() {
    $('#show').avgrund({
      height: 500,
      holderClass: 'custom',
      showClose: true,
      showCloseText: 'x',
      onBlurContainer: '.container-scroller',
      template: '<p>Bu işlemi gerçekten yapmak istiyor musunuz ?</p>' +
        '<div class="text-center mt-4">' +
        '<a href="#" target="_blank" class="btn btn-success mr-2">Great!</a>' +
        '<a href="#" target="_blank" class="btn btn-light">Cancel</a>' +
        '</div>'
    });
  })
})(jQuery);