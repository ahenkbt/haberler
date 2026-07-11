(function($) {
  'use strict';
  if ($("#timepicker-example").length) {
    $('#timepicker-example').datetimepicker({
      format: 'HH:mm'
    });
  }
  if ($("#timepicker-bitis").length) {
    $('#timepicker-bitis').datetimepicker({
      format: 'HH:mm'
    });
  }
  if ($("#timepicker-baslangic").length) {
    $('#timepicker-baslangic').datetimepicker({
      format: 'HH:mm'
    });
  }
  if ($(".color-picker").length) {
    $('.color-picker').asColorPicker();
  }
  if ($(".datepicker-popup").length) {
    $('.datepicker-popup').datepicker({
		enableOnReadonly: true,
		format: 'dd-mm-yyyy',
		startDate: new Date(),
		autoclose: true,
		todayHighlight: true,
		todayHighlight: true,
    });
  }
  if ($(".ihale-tarih").length) {
    $('.ihale-tarih').datepicker({
		enableOnReadonly: true,
		format: 'yyyy-mm-dd',
		autoclose: true,
		todayHighlight: true,
		todayHighlight: true,
    });
  }
  if ($("#datepicker-popup").length) {
    $('#datepicker-popup').datepicker({
		enableOnReadonly: true,
		format: 'dd-mm-yyyy',
		startDate: new Date(),
		autoclose: true,
		todayHighlight: true,
		todayHighlight: true,
    });
  }
  if ($("#datepicker-multi").length) {
    $('#datepicker-multi').datepicker({
		enableOnReadonly: true,
		multidate: true,
		format: 'dd-mm-yyyy',
		multidateSeparator: ", ",
		startDate: new Date(),
		todayHighlight: true,
    });
  }
  if ($("#inline-datepicker").length) {
    $('#inline-datepicker').datepicker({
      enableOnReadonly: true,
      todayHighlight: true,
    });
  }
  if ($(".datepicker-autoclose").length) {
    $('.datepicker-autoclose').datepicker({
      autoclose: true
    });
  }
  if ($('input[name="date-range"]').length) {
    $('input[name="date-range"]').daterangepicker();
  }
  if ($('input[name="date-time-range"]').length) {
    $('input[name="date-time-range"]').daterangepicker({
      timePicker: true,
      timePickerIncrement: 30,
      locale: {
        format: 'MM/DD/YYYY h:mm A'
      }
    });
  }
})(jQuery);