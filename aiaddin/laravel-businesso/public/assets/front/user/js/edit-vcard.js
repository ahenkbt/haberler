(function ($) {
    "use strict";
    $("select[name='direction']").on('change', function() {
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

     let app = new Vue({
        el: '#app',
        data() {
            return  {
                infromations: []
            }
        },
        methods: {
           setIcon(value, index) {
              let information = this.infromations[index];
              information.icon = value;
              this.$set(this.infromations, index, information);
           },
           setColor($event, index) {
              let information = this.infromations[index];
              information.color = $event.target.value;
              this.$set(this.infromations, index, information);
           },
           addIcpEvent() {
              let _this = this;
              this.$nextTick(function () {
                 let _this = this;
                 if ($('.vcard-icp').length > 0) {
                    $('.vcard-icp').each(function(i) {
                       let index = i;
                       let vIndex = $(this).data('vue_index');
                       $(this).on('iconpickerSelected', function(event){
                          let val = $("#vcard-icp-icon" + index).attr('class');
                          $("input[name='icons[]']").eq(index).val(val);
                          _this.setIcon(val, vIndex);
                       });
                    });
                 }
              })
           },
            uniqid() {
                let n = Math.floor(Math.random() * 11);
                let k = Math.floor(Math.random() * 1000000);
                let m = n + k;
                return m;
            },
            addInformation() {
                let _this = this;
                let uniqid = this.uniqid();
                let dir = document.getElementById('direction').value;
                this.infromations.push({uniqid: uniqid, icon: 'fas fa-heart', color: '000000', label: '', value: '', dir: dir, link: 0});
    
                 // initialize icon picker & color picker for newly added inputs only, also add event to all icon pickers 
                 this.$nextTick(function () {
                    $('#vcard-icp' + uniqid).iconpicker();
                    jscolor.installByClassName("jscolor" + uniqid);
                    _this.addIcpEvent();
                 })
            },
            removeInformation(index) {
                this.infromations.splice(index, 1);
            }
        },
        mounted() {
           this.$nextTick(function () {
    
           })
        },
        created() {
            $.get(vcardInfoUrl, (datas) => {
                let _this = this;
                for (let i = 0; i < datas.length; i++) {
                    datas[i].dir = direction;
                    _this.infromations.push(datas[i]);
                }
                // initialize icon picker & color picker, also add event to all icon pickers    
                setTimeout(function() {
                    $('.vcard-icp').iconpicker();
                    jscolor.installByClassName("jscolor");
                    _this.addIcpEvent();
                }, 1000);
            });
        }
    });     
})(jQuery);

