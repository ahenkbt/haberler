"use strict";

WebFont.load({
  google: { "families": ["Lato:300,400,700,900"] },
  custom: { "families": ["Flaticon", "Font Awesome 5 Solid", "Font Awesome 5 Regular", "Font Awesome 5 Brands", "simple-line-icons"], urls: [mainurl + '/assets/admin/css/fonts.min.css'] },
  active: function () {
    sessionStorage.fonts = true;
  }
});

/*****************************************************
  ==========Bootstrap Notify start==========
  ******************************************************/

function bootnotify(message, title, type) {
  var content = {};

  content.message = message;
  content.title = title;
  content.icon = 'fa fa-bell';

  $.notify(content, {
    type: type,
    placement: {
      from: 'top',
      align: 'right'
    },
    showProgressbar: true,
    time: 1000,
    allow_dismiss: true,
    delay: 4000
  });
}
/*****************************************************
==========Bootstrap Notify end==========
******************************************************/

/*****************************************************
 ==========Demo code ==========
 ******************************************************/
if (demo_mode == 'active') {
  $.ajaxSetup({
    beforeSend: function (jqXHR, settings, event) {
      if (settings.type == 'POST' && settings.url.indexOf('user/qr-code/generate') == -1) {
        if ($(".request-loader").length > 0) {
          $(".request-loader").removeClass('show');
        }
        if ($(".modal").length > 0) {
          $(".modal").modal('hide');
        }
        if ($("button[disabled='disabled']").length > 0) {
          $("button[disabled='disabled']").removeAttr('disabled');
        }
        bootnotify('This is demo version. You cannot change anything here!', 'Demo Version', 'warning')
        jqXHR.abort(event);
      }
    },
    complete: function () {
      // hide progress spinner
    }
  });
}
/*****************************************************
==========Demo code end==========
******************************************************/


function cloneInput(fromId, toId, event) {

  let $target = $(event.target);
  let $formId = $('#' + fromId);

  if ($target.is(':checked')) {
    $('#' + fromId + ' .form-control').each(function (i) {
      let index = i;
      let val = $(this).val();
      let $toInput = $('#' + toId + ' .form-control').eq(index);
      // console.log($toInput)
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
      } else if ($(this).data('role') == 'checkbox') {
        if ($(this).is(':checked')) {
          $toInput.prop('checked', true);
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

$(function ($) {

  $.ajaxSetup({
    headers: {
      'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
    }
  });

  /* ***************************************************************
  ==========disabling default behave of form submits start==========
  *****************************************************************/
  $("#ajaxEditForm").attr('onsubmit', 'return false');
  $("#ajaxForm").attr('onsubmit', 'return false');
  $(".modalform").attr('onsubmit', 'return false');
  /* *************************************************************
  ==========disabling default behave of form submits end==========
  ***************************************************************/

  // make any post as a featured post or not.
  $(document).on('change', '.featured-portfoliCat', function () {
    $('.request-loader').addClass('show');
    let catInfo = $(this).data();
    $("#featuredPortfoliCat" + catInfo.data).submit();
  });


  // get subcategory for item insert
  $(document).on('change', '.getSubCategory', function () {
    let url = $("#subcatGetterForItem").attr('value');
    let id = $(this).val();
    let code = $(this).data('code');

    var formData = new FormData();
    formData.append('url', url);
    formData.append('category_id', id);
    formData.append('code', code);
    $.ajax({
      url: url,
      method: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (response) {
        jQuery("#" + code + '_subcategory').empty();
        jQuery.each(response.subcategories, function (key, value) {
          jQuery("#" + code + '_subcategory').append('<option value="' + value.id + '">' + value.name + '</option>')
        });
      },
      error: function (data) {
        console.log('Error......');
      }
    });
  });

  // Language wise Category
  $('.category_language').on('change', function () {
    $('.request-loader').addClass('show');
    // send ajax request to get all the categories of that selected language
    $.get(mainurl + "/user/subcategory/get-categories/" + $(this).val(), function (response) {
      console.log(response, "response")
      $('.request-loader').removeClass('show');
      if ('successData' in response) {
        $('select[name="category_id"]').removeAttr('disabled');
        let categoryData = response.successData;
        let markup = `<option selected disabled>` + $Select_a_language + `</option>`;
        if (categoryData.length > 0) {
          for (let index = 0; index < categoryData.length; index++) {
            markup += `<option value="${categoryData[index].id}">${categoryData[index].name}</option>`;
          }
        } else {
          markup += `<option>` + $No_Category_Exist + `</option>`;
        }
        $('select[name="category_id"]').html(markup);
      } else {
        alert(response.errorData);
      }
    });
  });

  // Sidebar Search

  $(".sidebar-search").on('input', function () {
    let term = $(this).val().toLowerCase();

    if (term.length > 0) {
      $(".sidebar ul li.nav-item").each(function (i) {
        let menuName = $(this).find("p").text().toLowerCase();
        let $mainMenu = $(this);

        // if any main menu is matched
        if (menuName.indexOf(term) > -1) {
          $mainMenu.removeClass('d-none');
          $mainMenu.addClass('d-block');
        } else {
          let matched = 0;
          let count = 0;
          // search sub-items of the current main menu (which is not matched)
          $mainMenu.find('span.sub-item').each(function (i) {
            // if any sub-item is matched  of the current main menu, set the flag
            if ($(this).text().toLowerCase().indexOf(term) > -1) {
              count++;
              matched = 1;
            }
          });


          // if any sub-item is matched  of the current main menu (which is not matched)
          if (matched == 1) {
            $mainMenu.removeClass('d-none');
            $mainMenu.addClass('d-block');
          } else {
            $mainMenu.removeClass('d-block');
            $mainMenu.addClass('d-none');
          }
        }
      });
    } else {
      $(".sidebar ul li.nav-item").addClass('d-block');
    }
  });




  /* ***************************************************
  ==========bootstrap datepicker start==========
  ******************************************************/
  $('.datepicker').datepicker({
    autoclose: true,
    format: 'yyyy-mm-dd'
  });
  /* ***************************************************
  ==========bootstrap datepicker end==========
  ******************************************************/



  /* ***************************************************
  ==========fontawesome icon picker start==========
  ******************************************************/
  $('.icp-dd').iconpicker();

  $('.icp').on('iconpickerSelected', function (event) {
    $("#inputIcon").val($(".iconpicker-component").find('i').attr('class'));
  });
  /* ***************************************************
  ==========fontawesome icon picker upload end==========
  ******************************************************/


  /* ***************************************************
  ==========Summernote initialization start==========
  ******************************************************/
  $(".summernote").each(function (i) {
    let theight;
    let $summernote = $(this);
    if ($(this).data('height')) {
      theight = $(this).data('height');
    } else {
      theight = 200;
    }
    $('.summernote').eq(i).summernote({
      height: theight,
      dialogsInBody: true,
      dialogsFade: false,
      toolbar: [
        ['style', ['style']],
        ['font', ['bold', 'underline', 'clear']],
        ['fontname', ['fontname']],
        ['fontsize', ['fontsize']],
        ['height', ['height']],
        ['color', ['color']],
        ['para', ['ul', 'ol', 'paragraph']],
        ['table', ['table']],
        ['insert', ['link', 'picture', 'video']],
        ['view', ['fullscreen', 'codeview', 'help']],
      ],
      popover: {
        image: [
          ['image', ['resizeFull', 'resizeHalf', 'resizeQuarter', 'resizeNone']],
          ['float', ['floatLeft', 'floatRight', 'floatNone']],
          ['remove', ['removeMedia']]
        ],
        link: [
          ['link', ['linkDialogShow', 'unlink']]
        ],
        table: [
          ['add', ['addRowDown', 'addRowUp', 'addColLeft', 'addColRight']],
          ['delete', ['deleteRow', 'deleteCol', 'deleteTable']],
        ],
        air: [
          ['color', ['color']],
          ['font', ['bold', 'underline', 'clear']],
          ['para', ['ul', 'paragraph']],
          ['table', ['table']],
          ['insert', ['link', 'picture']]
        ]
      },
      callbacks: {
        onImageUpload: function (files) {
          $(".request-loader").addClass('show');

          let fd = new FormData();
          fd.append('image', files[0]);

          $.ajax({
            url: imgupload,
            method: 'POST',
            data: fd,
            contentType: false,
            processData: false,
            success: function (data) {
              $summernote.summernote('insertImage', data);
              $(".request-loader").removeClass('show');
            }
          });

        }
      }
    });
  });


  $(document).on('click', ".note-video-btn", function () {

    let i = $(this).index();

    if ($(".summernote").eq(i).parents(".modal").length > 0) {

      setTimeout(() => {
        $("body").addClass('modal-open');
      }, 500);
    }
  });


  /* ***************************************************
  ==========Summernote initialization end==========
  ******************************************************/




  $('.icp-dd').iconpicker();
  $('.icp').on('iconpickerSelected', function (event) {
    $("#inputIcon").val($(".iconpicker-component").find('i').attr('class'));
  });

  $('.icp-dd2').iconpicker();
  $('.icp2').on('iconpickerSelected', function (event) {
    $("#inputIcon2").val($(".picker").find('i').attr('class'));
  });

  /* ***************************************************
  ==========Summernote initialization end==========
  ******************************************************/



  /* ***************************************************
  ==========Bootstrap Notify start==========
  ******************************************************/
  function bootnotify(message, title, type) {
    var content = {};

    content.message = message;
    content.title = title;
    content.icon = 'fa fa-bell';

    $.notify(content, {
      type: type,
      placement: {
        from: 'top',
        align: 'right'
      },
      showProgressbar: true,
      time: 1000,
      allow_dismiss: true,
      delay: 4000,
    });
  }
  /* ***************************************************
  ==========Bootstrap Notify end==========
  ******************************************************/



  /* ***************************************************
  ==========Form Submit with AJAX Request Start==========
  ******************************************************/

  $(document).on('click', '#submitBtn', function (e) {

    $(e.target).attr('disabled', true);

    $(".request-loader").addClass("show");

    let ajaxForm = document.getElementById('ajaxForm');
    let fd = new FormData(ajaxForm);
    let url = $("#ajaxForm").attr('action');
    let method = $("#ajaxForm").attr('method');

    if ($("#ajaxForm .summernote").length > 0) {
      $("#ajaxForm .summernote").each(function (i) {
        let content = $(this).summernote('isEmpty') ? '' : $(this).summernote('code');

        fd.delete($(this).attr('name'));
        fd.append($(this).attr('name'), content);
      });
    }
    $.ajax({
      url: url,
      method: method,
      data: fd,
      contentType: false,
      processData: false,
      success: function (data) {
        $(e.target).attr('disabled', false);
        $(".request-loader").removeClass("show");

        $(".em").each(function () {
          $(this).html('');
        })
        if (data == "warning") {
          location.reload();
        }
        if (data == "success") {
          $('#ajaxForm').find('input[type="text"]').val('');
          location.reload();
        }

        // if error occurs
        // else if (typeof data.error != 'undefined') {
        //   for (let x in data) {
        //     if (x == 'error') {
        //       continue;
        //     }
        //     document.getElementById('err' + x).innerHTML  = data[x][0];
        //   }
        // }
        // Handle validation errors
        else {
          let errors = data.errors || data;
          for (let x in errors) {
            if (x == 'error') continue;
            let errorElement = $('#err' + x);
            if (errorElement.length) {
              errorElement.text(errors[x][0]);
            }
          }
        }
      },
      error: function (error) {

        $(".em").each(function () {
          $(this).html('');
        })
        console.log(error.responseJSON.errors);
        for (let x in error.responseJSON.errors) {
          document.getElementById('err' + x).innerHTML = error.responseJSON.errors[x][0];
        }
        $(".request-loader").removeClass("show");
        $(e.target).attr('disabled', false);
      }
    });
  });



  $('.submitBtn').on('click', function (e) {

    let $theForm = $(e.target).data('form');
    let $form = $('#' + $theForm);
    $(e.target).attr('disabled', true);
    $(".request-loader").addClass("show");

    let ajaxForm = document.getElementById($theForm);
    if (!ajaxForm) {
      console.error("Form element not found. Check if the data-form attribute is set correctly.");
      return;
    }

    let fd = new FormData(ajaxForm);
    let url = $("#" + $theForm).attr('action');
    let method = $("#" + $theForm).attr('method');
    if ($("#" + $theForm + " .summernote").length > 0) {
      $("#" + $theForm + " .summernote").each(function (i) {
        let content = $(this).summernote('code');
        fd.delete($(this).attr('name'));
        fd.append($(this).attr('name'), content);
      });
    }

    $.ajax({
      url: url,
      method: method,
      data: fd,
      contentType: false,
      processData: false,
      success: function (data) {
        $(e.target).attr('disabled', false);
        $(".request-loader").removeClass("show");

        $(".em").each(function () {
          $(this).html('');
        })

        if (data == "success") {
          $form.find('input[type="text"]').val('');
          location.reload();
        }
        if (data == "downgrade") {
          $('.modal').modal('hide');

          "use strict";
          var content = {};

          content.message = 'Your feature limit is over or down graded!';
          content.title = "Warning";
          content.icon = 'fa fa-bell';

          $.notify(content, {
            type: 'warning',
            placement: {
              from: 'top',
              align: 'right'
            },
            showProgressbar: true,
            time: 1000,
            delay: 4000,
          });
          $("#allLimits").modal('show');
        }

        // if error occurs
        else if (typeof data.error != 'undefined') {
          for (let x in data) {
            if (x == 'error') {
              continue;
            }
            document.getElementById('err' + x).innerHTML = data[x][0];
          }
        }
      },
      error: function (error) {
        $(".em").each(function () {
          $(this).html('');
        })
        for (let x in error.responseJSON.errors) {
          document.getElementById('err' + x).innerHTML = error.responseJSON.errors[x][0];
        }
        $(".request-loader").removeClass("show");
        $(e.target).attr('disabled', false);
      }
    });
  });


  // flash sale model  active / deactive

  $(document).on('change', '.manageFlash', function (e) {
    var $val = $(this).val()
    // $(".request-loader").addClass("show");
    var $itemId = $(this).attr('data-item-id')
    if ($val == 0) {
      let url = $("#flashForm" + $itemId).attr('action');
      let method = $("#flashForm" + $itemId).attr('method');
      console.log(url)
      $.ajax({
        url: url,
        method: method,
        data: { itemId: $itemId, val: $val },
        success: function (data) {
          if (data == "success") {
            location.reload();
          }
        },
        error: function (error) {
          $(".request-loader").removeClass("show");
        }
      });
    } else {
      $("#flashmodal" + $itemId).modal('show')
    }
  });






  // insertitem
  $('#itemForm').on('submit', function (e) {
    $('.request-loader').addClass('show');
    e.preventDefault();

    let action = $('#itemForm').attr('action');
    let fd = new FormData(document.querySelector('#itemForm'));

    $.ajax({
      url: action,
      method: 'POST',
      data: fd,
      contentType: false,
      processData: false,
      success: function (data) {
        console.log('Post Form', data);
        $('.request-loader').removeClass('show');
        // location.reload();
        if (data == 'success') {
          window.location = fullUrl;
        }
      },
      error: function (error) {
        $('#postErrors').show();
        let errors = ``;

        for (let x in error.responseJSON.errors) {
          errors += `<li>
              <p class="text-danger mb-0">${error.responseJSON.errors[x][0]}</p>
            </li>`;
        }

        $('#postErrors ul').html(errors);

        $('.request-loader').removeClass('show');

        $('html, body').animate({
          scrollTop: $('#postErrors').offset().top - 100
        }, 1000);
      }
    });
  });




  $("#permissionBtn").on('click', function () {
    $("#permissionsForm").trigger("submit");
  });

  $("#langBtn").on('click', function () {
    $("#langForm").trigger("submit");
  });
  /* ***************************************************
  ==========Form Submit with AJAX Request End==========
  ******************************************************/

  /* ***************************************************
  ==========datatables start==========
  ******************************************************/
  $('#basic-datatables').DataTable({
    responsive: true,
    ordering: false
  });
  /* ***************************************************
  ==========datatables end==========
  ******************************************************/


  /* ***************************************************
  ==========Form Prepopulate After Clicking Edit Button Start==========
  ******************************************************/
  $(".editbtn").on('click', function () {
    let datas = $(this).data();
    delete datas['toggle'];
    console.log(datas);
    for (let x in datas) {
      if ($("#in" + x).hasClass('summernote')) {
        $("#in" + x).summernote('code', datas[x]);
      } else if ($("#in" + x).hasClass('image')) {
        $("#in" + x).attr('src', datas[x]);
      } else if ($("#in" + x).data('role') == 'tagsinput') {
        if (datas[x].length > 0) {
          let arr = datas[x].split(" ");
          for (let i = 0; i < arr.length; i++) {
            $("#in" + x).tagsinput('add', arr[i]);
          }
        } else {
          $("#in" + x).tagsinput('removeAll');
        }
      }
      else if ($("input[name='" + x + "']").attr('type') == 'radio') {
        $("input[name='" + x + "']").each(function (i) {
          if ($(this).val() == datas[x]) {
            $(this).prop('checked', true);
          }
        });
      } else if (x === 'icon') {
        $(".in_" + x).val(datas[x]);
        $("#in" + x).removeAttr("class");
        $("#in" + x).addClass(datas[x]);
      }
      else {
        if ('item_type' in datas) {
          if (datas.item_type == 'image') {
            $('#imgOption').prop('checked', true);
          } else {
            $('#vidOption').prop('checked', true);
          }
        }
        if ('video_link' in datas) {
          if (datas.video_link === '') {
            $('#editVideo-input').addClass('d-none');
          } else {
            $('#editVideo-input').removeClass('d-none');
          }
        }
        $("#in" + x).val(datas[x]);
        if (datas.image) {
          $('.showEditImage img').attr('src', datas.image);
          $('#edit_image').val('');
        }
      }
    }

  });

  /* ***************************************************
  ==========Form Prepopulate After Clicking Edit Button End==========
  ******************************************************/

  /********************************************************************
    ==========Form Prepopulate After Clicking Edit Button Start=========
    ********************************************************************/
  $(".editBtn").on('click', function () {
    let datas = $(this).data();
    delete datas['toggle'];

    for (let x in datas) {
      if ($("#in_" + x).hasClass('summernote')) {
        $("#in_" + x).summernote('code', datas[x]);
      } else if ($("#in_" + x).data('role') == 'tagsinput') {
        if (datas[x].length > 0) {
          let arr = datas[x].split(" ");
          for (let i = 0; i < arr.length; i++) {
            $("#in_" + x).tagsinput('add', arr[i]);
          }
        } else {
          $("#in_" + x).tagsinput('removeAll');
        }
      } else if ($("input[name='" + x + "']").attr('type') == 'radio') {
        $("input[name='" + x + "']").each(function (i) {
          if ($(this).val() == datas[x]) {
            $(this).prop('checked', true);
          }
        });
      } else if ($("#in_" + x).hasClass('select2')) {
        $("#in_" + x).val(datas[x]);
        $("#in_" + x).trigger('change');
      } else {
        $("#in_" + x).val(datas[x]);
        $('.brand-img').attr('src', datas['brand_img']);
        $('.gallery-img').attr('src', datas['gallery_img']);
      }
    }
    // focus & blur colorpicker inputs
    setTimeout(() => {
      $(".jscolor").each(function () {
        $(this).focus();
        $(this).blur();
      });
    }, 300);
  });
  /* ***************************************************
   ==========Form Prepopulate After Clicking Edit Button End==========
   ******************************************************/



  /* ***************************************************
  ==========Form Update with AJAX Request Start==========
  ******************************************************/
  $("#updateBtn").on('click', function (e) {

    $(".request-loader").addClass("show");

    let ajaxEditForm = document.getElementById('ajaxEditForm');
    let fd = new FormData(ajaxEditForm);
    let url = $("#ajaxEditForm").attr('action');
    let method = $("#ajaxEditForm").attr('method');

    if ($("#ajaxEditForm .summernote").length > 0) {
      $("#ajaxEditForm .summernote").each(function (i) {
        let content = $(this).summernote('isEmpty') ? '' : $(this).summernote('code');
        fd.delete($(this).attr('name'));
        fd.append($(this).attr('name'), content);
      })
    }

    $.ajax({
      url: url,
      method: method,
      data: fd,
      contentType: false,
      processData: false,
      success: function (data) {

        $(".request-loader").removeClass("show");

        $(".em").each(function () {
          $(this).html('');
        })

        if (data == "success") {
          location.reload();
        }

        // if error occurs
        else if (typeof data.error != 'undefined') {
          for (let x in data) {
            if (x == 'error') {
              continue;
            }

            // let errorElement = document.getElementById('err' + x) || document.getElementById('eerr' + x);
            // console.log(errorElement);
            // if (errorElement) {
            //   errorElement.innerHTML = data[x][0];
            // } 

            // First try context-specific selector, then fall back to general
            let form = document.getElementById('ajaxEditForm');
            let errorElement = form.querySelector('#eerr' + x) ||
              form.querySelector('#err' + x) ||
              document.getElementById('eerr' + x) ||
              document.getElementById('err' + x);

            if (errorElement && Array.isArray(data[x])) {
              errorElement.innerHTML = data[x][0];
            }
          }
        }
      },
      // error: function (error) {

      //   $(".em").each(function () {
      //     $(this).html('');
      //   })

      //   for (let x in error.responseJSON.errors) {
      //     let element = document.getElementById('editErr_' + x) || document.getElementById('Eerr_' + x);
      //     if (element) {
      //       element.innerHTML = error.responseJSON.errors[x][0];
      //     }
      //   }
      //   $(".request-loader").removeClass("show");
      //   $(e.target).attr('disabled', false);
      // } 
      error: function (error) {
        $(".request-loader").removeClass("show");
        $(".em").each(function () { $(this).html(''); });

        if (error.responseJSON?.errors) {
          for (let x in error.responseJSON.errors) {
            let form = document.getElementById('ajaxEditForm');
            let errorElement = form.querySelector('#eerr' + x) ||
              form.querySelector('#err' + x) ||
              document.getElementById('eerr' + x) ||
              document.getElementById('err' + x);

            if (errorElement) {
              errorElement.innerHTML = error.responseJSON.errors[x][0];
            }
          }
        }
        $(e.target).attr('disabled', false);
      }
    });
  });


  $(".update-btn").each(function () {
    $(this).on('click', function (e) {
      let $this = $(this);

      $(".request-loader").addClass("show");

      let formId = $(this).data('form_id');
      let ajaxEditForm = document.getElementById(formId);
      let fd = new FormData(ajaxEditForm);
      let url = $("#" + formId).attr('action');
      let method = $("#" + formId).attr('method');

      if ($("#" + formId + " .summernote").length > 0) {
        $("#" + formId + " .summernote").each(function (i) {
          let content = $(this).summernote('code');
          fd.delete($(this).attr('name'));
          fd.append($(this).attr('name'), content);
        })
      }

      $.ajax({
        url: url,
        method: method,
        data: fd,
        contentType: false,
        processData: false,
        success: function (data) {
          let parentCount = $this.parents('.modal').length;
          let parentId;
          // if the form is in modal
          if (parentCount > 0) {
            parentId = $this.parents('.modal').attr('id');
          }
          // if the form is not in modal
          else {
            parentId = formId;
          }
          $(".request-loader").removeClass("show");

          $("#" + parentId).children(".em").each(function () {
            $(this).html('');
          })

          if (data == "success") {
            location.reload();
          }

          // if error occurs
          else if (typeof data.error != 'undefined') {
            for (let x in data) {
              if (x == 'error') {
                continue;
              }
              $("#" + parentId + " .eerr" + x).html(data[x][0]);
            }
          }
        },
        error: function (xhr) {
          $(".request-loader").removeClass("show");
          if (xhr.status === 400) {
            // Handle your controller's error format
            let errors = xhr.responseJSON.error;
            for (let field in errors) {
              $("#" + formId + " .eerr" + field).html(errors[field][0]);
            }
          }
        }
      });
    });
  });
  /* ***************************************************
  ==========Form Update with AJAX Request End==========
  ******************************************************/



  /* ***************************************************
  ==========Delete Using AJAX Request Start==========
  ******************************************************/
  // $('.deletebtn, .lessonDeleteBtn').on('click', function (e) {
  //   e.preventDefault();

  //   $(".request-loader").addClass("show");

  //   swal({
  //     title: $delete_title,
  //     text: $delete_subtitle,
  //     type: 'warning',
  //     buttons: {
  //       confirm: {
  //         text: $delete_btntext,
  //         className: 'btn btn-success'
  //       },
  //       cancel: {
  //         visible: true,
  //         text: $cancel_btntext,
  //         className: 'btn btn-danger'
  //       }
  //     }
  //   }).then((Delete) => {
  //     if (Delete) {
  //       $(this).parent(".deleteform").trigger('submit');
  //     } else {
  //       swal.close();
  //       $(".request-loader").removeClass("show");
  //     }
  //   });
  // });

  $('.deletebtn, .lessonDeleteBtn').on('click', function (e) {
    e.preventDefault();
    var form = $(this).closest('form'); // Get the closest form element

    $(".request-loader").addClass("show");

    swal({
      title: $delete_title,
      text: $delete_subtitle,
      type: 'warning',
      buttons: {
        confirm: {
          text: $delete_btntext,
          className: 'btn btn-success'
        },
        cancel: {
          visible: true,
          text: $cancel_btntext,
          className: 'btn btn-danger'
        }
      }
    }).then((Delete) => {
      if (Delete) {
        form.trigger('submit'); // Submit the form we stored earlier
      } else {
        swal.close();
        $(".request-loader").removeClass("show");
      }
    });
  });
  /* ***************************************************
  ==========Delete Using AJAX Request End==========
  ******************************************************/


  /* ***************************************************
  ==========Close Ticket Using AJAX Request Start==========
  ******************************************************/
  $('.close-ticket').on('click', function (e) {
    e.preventDefault();

    $(".request-loader").addClass("show");

    swal({
      title: 'Are you sure?',
      text: "You want to close this ticket!",
      type: 'warning',
      buttons: {
        confirm: {
          text: 'Yes, close it!',
          className: 'btn btn-success'
        },
        cancel: {
          visible: true,
          className: 'btn btn-danger'
        }
      }
    }).then((Delete) => {
      if (Delete) {
        swal.close();
        $(".request-loader").removeClass("show");
      } else {
        swal.close();
        $(".request-loader").removeClass("show");
      }
    });
  });
  /* ***************************************************
  ==========Delete Using AJAX Request End==========
  ******************************************************/


  /* ***************************************************
  ==========Delete Using AJAX Request Start==========
  ******************************************************/
  $(document).on('change', '.bulk-check', function () {
    let val = $(this).data('val');
    let checked = $(this).prop('checked');

    // if selected checkbox is 'all' then check all the checkboxes
    if (val == 'all') {
      if (checked) {
        $(".bulk-check").each(function () {
          $(this).prop('checked', true);
        });
      } else {
        $(".bulk-check").each(function () {
          $(this).prop('checked', false);
        });
      }
    }


    // if any checkbox is checked then flag = 1, otherwise flag = 0
    let flag = 0;
    $(".bulk-check").each(function () {
      let status = $(this).prop('checked');

      if (status) {
        flag = 1;
      }
    });

    // if any checkbox is checked then show the delete button
    if (flag == 1) {
      $(".bulk-delete").addClass('d-inline-block');
      $(".bulk-delete").removeClass('d-none');
    }
    // if no checkbox is checked then hide the delete button
    else {
      $(".bulk-delete").removeClass('d-inline-block');
      $(".bulk-delete").addClass('d-none');
    }
  });

  $('.bulk-delete').on('click', function () {

    swal({
      title: $delete_title,
      text: $delete_subtitle,
      type: 'warning',
      buttons: {
        confirm: {
          text: $delete_btntext,
          className: 'btn btn-success'
        },
        cancel: {
          visible: true,
          text: $cancel_btntext,
          className: 'btn btn-danger'
        }
      }
    }).then((Delete) => {
      if (Delete) {
        $(".request-loader").addClass('show');
        let href = $(this).data('href');
        let ids = [];

        // take ids of checked one's
        $(".bulk-check:checked").each(function () {
          if ($(this).data('val') != 'all') {
            ids.push($(this).data('val'));
          }
        });

        let fd = new FormData();
        for (let i = 0; i < ids.length; i++) {
          fd.append('ids[]', ids[i]);
        }

        $.ajax({
          url: href,
          method: 'POST',
          data: fd,
          contentType: false,
          processData: false,
          success: function (data) {

            $(".request-loader").removeClass('show');
            if (data == "success") {
              location.reload();
            }
          }
        });
      } else {
        swal.close();
      }
    });

  });
  /* ***************************************************
  ==========Delete Using AJAX Request End==========
  ******************************************************/


  //  image (id) preview js/
  $(document).on('change', '#image', function (event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
      $('.showImage img').attr('src', e.target.result);
    };
    reader.readAsDataURL(file);
  })
  //  image (class) preview js/
  $(document).on('change', '.image', function (event) {
    let $this = $(this);
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
      $this.prev('.showImage').children('img').attr('src', e.target.result);
    };
    reader.readAsDataURL(file);
  });
  $(document).on('change', '#image2', function (event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
      $('.showImage2 img').attr('src', e.target.result);
    };
    reader.readAsDataURL(file);
  })
  //  image (class) preview js/
  $(document).on('change', '.image2', function (event) {
    let $this = $(this);
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
      $this.prev('.showImage2').children('img').attr('src', e.target.result);
    };
    reader.readAsDataURL(file);
  });
  $(document).on('change', '#image3', function (event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
      $('.showImage3 img').attr('src', e.target.result);
    };
    reader.readAsDataURL(file);
  })
  //  image (class) preview js/
  $(document).on('change', '.image3', function (event) {
    let $this = $(this);
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
      $this.prev('.showImage3').children('img').attr('src', e.target.result);
    };
    reader.readAsDataURL(file);
  });
  
  // language change
  $(document).on('change', '.langBtn', function () {
    let $this = $(this);
    var $code = $(this).val();

    $.ajax({
      url: $("#setLocale").val(),
      method: 'get',
      data: {
        code: $code
      },
      success: function (data) {
        // console.log(curr_url+$this.val())
        window.location = curr_url + $this.val();
      }
    });
  })


  // datepicker & timepicker
  $("input.datepicker").datepicker();
  $('input.timepicker').timepicker();

  // select2
  if ($('.select2').length > 0) {
    $('.select2').select2();
  }

  // ai loader2
  if ($('.ai-loader2').length > 0) {

    // remove function
    function removeLoader() {
      $('.ai-loader2').fadeOut(300);
    }

    // Auto remove
    var loaderTimeout = setTimeout(function () {
      removeLoader();
    }, 300000);

    // Close icon click remove
    $('.loader2-close').on('click', function () {
      clearTimeout(loaderTimeout);
      removeLoader();
    });
  }

  
  

});

/*------------------------
   Highlight Js
  -------------------------- */
hljs.initHighlightingOnLoad();


$(document).ready(function () {

  // Desktop hover
  if (window.matchMedia('(hover: hover)').matches) {
    $('.ai-hover-wrapper').on('mouseenter', function () {
      var $pages = $(this).children('.ai-hover-pages');
      $pages.stop(true, true).slideDown(400);
    }).on('mouseleave', function () {
      var $pages = $(this).children('.ai-hover-pages');
      $pages.stop(true, true).slideUp(400);
    });
  }

  // Click (mobile + backend safe)
  $('.ai-hover-wrapper').on('click', function (e) {
    e.preventDefault();
    e.stopPropagation();

    var $pages = $(this).children('.ai-hover-pages');
    $pages.stop(true, true).slideToggle(400);
  });

});


//added by rakib
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('[data-toggle="tooltip"]').forEach(el => {
    new bootstrap.Tooltip(el, {
      container: 'body',
      boundary: 'window',
      trigger: 'hover focus'
    });
  });
});
