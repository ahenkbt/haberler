$(document).ready(function () {
  'use strict';

  // add selected icon into an input field of a form
  $('#socialForm').on('submit', function (e) {
    e.preventDefault();

    $('#inputIcon').val($('.iconpicker-component').find('i').attr('class'));
    document.getElementById('socialForm').submit();
  });


  // toggle bookmark heart to a post
  $('.love_btn, .btn_heart').on('click', function (event) {
    event.preventDefault();

    let bookmarkURL = $(this).attr('href');

    let data = {
      _token: document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    };

    $.post(bookmarkURL, data, function (response) {
      if ('fail' in response) {
        let loginURL = mainurl + '/user/login?redirect_for=bookmark';

        window.location.href = loginURL;
      } else if ('success' in response) {
        let id = response.postId;

        if (response.status == 'bookmarked') {
          $('.post-info-' + id).addClass('post-bookmarked');
        } else if (response.status == 'removed') {
          $('.post-info-' + id).removeClass('post-bookmarked');
        }

        if ($('#bookmark-info-' + id).length) {
          $('#bookmark-info-' + id).text(response.totalBookmark);
        }

        toastr['success'](response.success);
      }
    });
  });

});
