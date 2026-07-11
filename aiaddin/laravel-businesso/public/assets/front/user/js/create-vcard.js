"use strict";
(function ($) {
    $(document).on('change', "select[name='direction']", function() {
        let val = $(this).val();
        let $formControls = $(".form-control:not(.ltr)");

        // if RTL is selected
        if (val == 2) {
          $formControls.each(function() {
            $(this).addClass('rtl');
          });
        } else {
          $formControls.each(function() {
            $(this).removeClass('rtl');
          });
        }
    });

    $(document).on('change', '.image', function (event) {
        let $this = $(this);
        let file = event.target.files[0];
        let reader = new FileReader();
        reader.onload = function (e) {
              $(this).prev('.showImage').find('img').attr('src', e.target.result);
        };
        reader.readAsDataURL(file);
     })

})(jQuery);

let app = new Vue({
    el: '#app',
    data() {
        return  {
            infromations: []
        }
    },
    methods: {
        addInformation() {
            let n = Math.floor(Math.random() * 11);
            let k = Math.floor(Math.random() * 1000000);
            let m = n + k;
            let dir = document.getElementById('direction').value;
            this.infromations.push({uniqid: m, dir: dir});
        },
        removeInformation(index) {
            this.infromations.splice(index, 1);
        }
    },
    mounted() {
       this.$nextTick(function () {

       })
    },
    updated() {
       this.$nextTick(function () {
          $('.vcard-icp-dd').iconpicker();
          jscolor.installByClassName("jscolor");

          if ($('.vcard-icp').length > 0) {
             $('.vcard-icp').each(function(i) {
                let index = i;
                $(this).on('iconpickerSelected', function(event){
                   $("input[name='icons[]']").eq(index).val($("#vcard-icp-icon" + index).attr('class'));
                });
             });
          }
       })
    }
});