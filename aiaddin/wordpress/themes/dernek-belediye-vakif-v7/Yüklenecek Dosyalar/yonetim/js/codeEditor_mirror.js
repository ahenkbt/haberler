(function($) {
  'use strict';
  if ($('textarea[name=whatsapp]').length) {
    var editableCodeMirror = CodeMirror.fromTextArea(document.getElementById('whatsapp'), {
		lineNumbers: true,
        matchBrackets: true,
        mode: "text/x-php",
        indentUnit: 4,
        indentWithTabs: true,
		lineWrapping: true,
        theme : "material"
    });
  }
  if ($('textarea[name=ekstra]').length) {
    var editableCodeMirror = CodeMirror.fromTextArea(document.getElementById('ekstra'), {
		lineNumbers: true,
        matchBrackets: true,
        mode: "text/x-php",
        indentUnit: 4,
        indentWithTabs: true,
		lineWrapping: true,
        theme : "material"
    });
  }
  if ($('textarea[name=google_analytics]').length) {
    var editableCodeMirror = CodeMirror.fromTextArea(document.getElementById('google_analytics'), {
		lineNumbers: false,
        matchBrackets: true,
        mode: "text/html",
        indentUnit: 4,
        indentWithTabs: true,
		lineWrapping: true,
        theme : "material"
    });
  }
  if ($('textarea[name=dogrulama_kodu]').length) {
    var editableCodeMirror = CodeMirror.fromTextArea(document.getElementById('dogrulama_kodu'), {
		lineNumbers: false,
        matchBrackets: true,
        mode: "text/html",
        indentUnit: 4,
        indentWithTabs: true,
		lineWrapping: true,
        theme : "material"
    });
  }
  if ($('textarea[name=google_maps]').length) {
    var editableCodeMirror = CodeMirror.fromTextArea(document.getElementById('google_maps'), {
		lineNumbers: false,
        matchBrackets: true,
        mode: "text/html",
        indentUnit: 4,
        indentWithTabs: true,
		lineWrapping: true,
        theme : "material"
    });
  }
  if ($('textarea[name=canli_destek]').length) {
    var editableCodeMirror = CodeMirror.fromTextArea(document.getElementById('canli_destek'), {
		lineNumbers: false,
        matchBrackets: true,
        mode: "text/html",
        indentUnit: 4,
        indentWithTabs: true,
		lineWrapping: true,
        theme : "material"
    });
  }
})(jQuery);