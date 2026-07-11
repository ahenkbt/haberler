// $(function ($) {
    "use strict";
    // $(document).ready(function (){
    console.log("dropzone");
    // myDropzone is the configuration for the element that has an id attribute
    // with the value my-dropzone (or myDropzone)
    Dropzone.options.myDropzone = {
        acceptedFiles: '.png, .jpg, .jpeg',
        url: uploadSliderImage,
        success: function (file, response) {
            $("#sliders").append(`<input type="hidden" name="image[]" id="slider${response.file_id}" value="${response.file_id}">`);
            // Create the remove button
            var removeButton = Dropzone.createElement("<button class='btn btn-xs rmv-btn'><i class='fa fa-times'></i></button>");
            // Capture the Dropzone instance as closure.
            var _this = this;
            // Listen to the click event
            removeButton.addEventListener("click", function (e) {
                // Make sure the button click doesn't submit the form:
                e.preventDefault();
                e.stopPropagation();
                _this.removeFile(file);
                rmvImg(response.file_id);
            });
            // Add the button to the file preview element.
            file.previewElement.appendChild(removeButton);
            if (typeof response.error != 'undefined') {
                if (typeof response.file != 'undefined') {
                    document.getElementById('errpreimg').innerHTML = response.file[0];
                }
            }
        }
    };
    
    function rmvImg(file_Id) {
        const csrf = document.querySelector('meta[name="csrf-token"]').content;
        $.ajax({
            url: rmvSliderImage,
            type: 'POST',
            headers: {'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')},
            data: {'value': file_Id, '_token': csrf},
            success: function (data) {
                const ele = document.getElementById("slider" + file_Id);
                ele.remove();
            },
            error: function (e) {
                console.log(e);
            }
        });
    }
    
    function rmvdbimg(key, id) {
        $(".request-loader").addClass("show");
        $.ajax({
            url: rmvDbSliderImage,
            type: 'POST',
            headers: {'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')},
            data: {
                key: key,
                id: id
            },
            success: function (data) {
                $(".request-loader").removeClass("show");
                $("#trdb" + key).remove();
                var content = {};
    
                content.message = 'Slider image deleted successfully!';
                content.title = 'Success';
                content.icon = 'fa fa-bell';
    
                $.notify(content, {
                    type: 'success',
                    placement: {
                        from: 'top',
                        align: 'right'
                    },
                    time: 1000,
                    delay: 0,
                });
            }
        });
    }
    // });
    // });