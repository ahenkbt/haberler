'use strict';

function cloneInput(fromId, toId, event) {
  let $target = $(event.target);

  if ($target.is(':checked')) {
    $('#' + fromId + ' .form-control').each(function (i) {
      let index = i;
      let val = $(this).val();
      let $toInput = $('#' + toId + ' .form-control').eq(index);

      if ($(this).hasClass('summernote')) {
        $toInput.summernote('code', val);
      } else if ($(this).data('role') == 'tagsinput') {
        if (val.length > 0) {
          let tags = val.split(',');
          tags.forEach(tag => {
            $toInput.tagsinput('add', tag);
          });
        } else {
          $toInput.tagsinput('removeAll');
        }
      } else {
        $toInput.val(val);
      }
    });
  } else {
    $('#' + toId + ' .form-control').each(function (i) {
      let $toInput = $('#' + toId + ' .form-control').eq(i);

      if ($(this).hasClass('summernote')) {
        $toInput.summernote('code', '');
      } else if ($(this).data('role') == 'tagsinput') {
        $toInput.tagsinput('removeAll');
      } else {
        $toInput.val('');
      }
    });
  }
}

$(document).ready(function () {
  // cause form
  $('#causeForm').on('submit', function (e) {
    $('.request-loader').addClass('show');
    e.preventDefault();
    let action = $(this).attr('action');
    let fd = new FormData($(this)[0]);

    $.ajax({
      url: action,
      method: 'POST',
      data: fd,
      contentType: false,
      processData: false,
      success: function (data) {
        $('.request-loader').removeClass('show');
        if (data == 'success') {
          location.reload();
        }
      },
      error: function (error) {
        let errors = ``;
        for (let x in error.responseJSON.errors) {
          errors += `<li>
                                  <p class="text-danger mb-0">${error.responseJSON.errors[x][0]}</p>
                              </li>`;
        }

        if (error?.responseJSON?.exception) {
          errors += `<li>
                                  <p class="text-danger mb-0">${error?.responseJSON?.exception}</p>
                              </li>`;
        }

        $('#causeErrors').removeClass('dis-none');
        $('#causeErrors ul').html(errors);
        $('#causeErrors').show();
        $('.request-loader').removeClass('show');
        $('html, body').animate({
          scrollTop: $('#causeErrors').offset().top - 100
        }, 1000);
      }
    });
  });

});
