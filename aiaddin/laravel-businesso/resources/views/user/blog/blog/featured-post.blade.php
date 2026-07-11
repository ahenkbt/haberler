<div class="modal fade" id="featured-post-modal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel"
  aria-hidden="true">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="exampleModalLabel">{{ __('Make Featured Post') }}
        </h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      <div class="modal-body">
        <form id="featuredAjaxForm" class="modal-form" action="{{ route('user.blog.update_featured') }}" method="POST"
          enctype="multipart/form-data">
          @csrf
          <input type="hidden" id="in_post_id" name="id">

          <input type="hidden" id="in_is_featured" name="is_featured">

          <div class="row">
            <div class="col-lg-12">
              <div class="form-group">
                <div class="col-md-12 showImage mb-3">
                  <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." class="img-thumbnail">
                </div>
                <input type="file" name="featured_post_image" id="image" class="form-control">
                <p class="text-warning mb-0 mt-2">
                  {{ __('** Only JPG, PNG, JPEG, SVG Images are allowed') }}</p>
                <p id="errfeatured_post_image" class="mt-2 mb-0 text-danger em"></p>
                <p class="text-warning mt-2 mb-0">
                  {{ __('Upload 770x508 pixel size image for best quality.') }}
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
        <button type="button" class="btn btn-primary" id="featuredSubmitBtn">
          {{ __('Save') }}
        </button>
      </div>
    </div>
  </div>
</div>
