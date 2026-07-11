<div class="modal fade" id="slider-post-modal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel"
  aria-hidden="true">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="exampleModalLabel">{{ __('Make Slider Post') }}
        </h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      <div class="modal-body">
        <form id="sliderAjaxForm" class="modal-form" action="{{ route('user.blog.update_slider') }}" method="POST">
          @csrf
          <input type="hidden" id="in_id" name="id">

          <input type="hidden" id="in_is_slider" name="is_slider">

          <div class="row">
            <div class="col-lg-12">
              <div class="form-group">
                <div class="col-md-12 showImage mb-3">
                  <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." class="img-thumbnail">
                </div>
                <input type="file" name="slider_post_image" id="image" class="form-control">
                <p class="text-warning mb-0 mt-2">**
                  {{  __('Only JPG, PNG, JPEG, SVG Images are allowed') }}</p>
                <p id="err_slider_post_image" class="mt-2 mb-0 text-danger em"></p>
                <p class="text-warning mt-2 mb-0">
                  {{ __('Upload 1030x700 pixel size image for best quality') }}.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">
          {{ __('Close') }}
        </button>
        <button type="button" class="btn btn-primary" id="sliderSubmitBtn">
          {{ __('Save') }}
        </button>
      </div>
    </div>
  </div>
</div>
