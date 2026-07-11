"use strict";

function loadDiv(type) {
    $(".types").removeClass('d-block');
    $(".types").addClass('d-none');
    $("#" + "type-" + type).removeClass("d-none");
    $("#" + "type-" + type).addClass("d-block");
  }

function generateQr() {
  
    loadDiv($("select[name='type']").val());
    $(".request-loader").addClass('show');

    let fd = new FormData(document.getElementById('qrGeneratorForm'));
    fd.append('size', $("input[name='size']").val());
    fd.append('margin', $("input[name='margin']").val());
    fd.append('image_size', $("input[name='image_size']").val());
    fd.append('image_x', $("input[name='image_x']").val());
    fd.append('image_y', $("input[name='image_y']").val());
    if ($("select[name='type']").val() == 'text') {
      $("#text-size").text($("input[name='text']").val());
      let fontSize = ($("input[name='size']").val() * $("input[name='text_size']").val()) / 100;
      $("#text-size").css({"font-size": fontSize, "font-family": "Lato-Regular"});
      let textWidth = $("#text-size").width() == 0 ? 1 : $("#text-size").width();
      fd.append('text_width', textWidth);
    }
    
    $(".range-slider").attr('disabled', true);
    
    $.ajax({
        url: qrGenUrl,
        type: 'POST',
        data: fd,
        contentType: false,
        processData: false,
        success: function(data) {
          $(".request-loader").removeClass('show');
          $(".range-slider").attr('disabled', false);

          if(data == "url_empty") {
            bootnotify("URL field cannot be empty", "Warning", "warning");
          } else {
            $("#preview").attr('src', data);
            $("#downloadBtn").attr('href', data);
          }

        }
    });

}

(function ($) {
    
    let type = $("select[name='type']").val();
    loadDiv(type);
  
    $(".range-slider").on("input", function() {
        $(this).next(".size-text").html($(this).val());
    });

})(jQuery);
