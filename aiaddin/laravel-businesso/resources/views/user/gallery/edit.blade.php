<div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
  aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Edit Item') }}</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      {{-- <div class="modal-body">
        <form id="ajaxEditForm" class="modal-form" action="{{ route('user.gallery_management.update_item') }}"
          method="POST">
          @csrf
          <input type="hidden" id="inid" name="id">
          <div class="form-group">
            <div class="d-sm-inline mr-5">
              <input type="radio" class="mr-1 editItemRadioBtn" id="imgOption" name="edit_item_type" value="image">
              <label for="">{{ __('Image') }}</label>
            </div>
            <div class="d-sm-inline">
              <input type="radio" class="mr-1 editItemRadioBtn" id="vidOption" name="edit_item_type" value="video">
              <label for="">{{ __('Video') }}</label>
            </div>
          </div>
          <div class="form-group">
            <div class="col-12 mb-2">
              <label for="">{{ __('Image') . '*' }}</label>
            </div>
            <div class="col-md-12 showEditImage mb-3">
              <img src="#" alt="..." class="in_image img-thumbnail">
            </div>
            <input type="file" name="image" id="edit_image" class="form-control image">
            @if ($errors->has('image'))
              <p class="mt-2 mb-0 text-danger">{{ $errors->first('image') }}</p>
            @endif
          </div>

          <div class="form-group" id="editVideo-input">
            <label for="">{{ __('Video Link') . '*' }}</label>
            <input type="url" id="in_video_link" class="form-control ltr" name="video_link"
              placeholder="{{ __('Enter Video Link') }}">
            <p id="editErr_video_link" class="mt-1 mb-0 text-danger em"></p>
            <p class="text-warning mt-2 mb-0">
              <small>{{ __('Link will be formatted automatically after submitting the form.') }}</small>
            </p>
          </div>
          @if ($userBs->gallery_category_status == 1)
            <div class="form-group">
              <label for="in_gallery_category_id">{{ $keywords['Category'] ?? __('Category*') }}</label>
              <select name="gallery_category_id" id="in_gallery_category_id" class="form-control">
                <option disabled>{{ $keywords['Select_a_Category'] ?? __('Select a Category') }}
                </option>
              </select>
            </div>
          @endif
          <div class="row no-gutters">
            <div class="col-lg-6">
              <div class="form-group">
                <label for="">{{ __('Title') . '*' }}</label>
                <input type="text" id="in_title" class="form-control" name="title"
                  placeholder="{{ __('Enter Title') }}">
                <p id="editErr_title" class="mt-1 mb-0 text-danger em"></p>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label for="">{{ __('Serial Number') . '*' }}</label>
                <input type="number" id="in_serial_number" class="form-control ltr" name="serial_number"
                  placeholder="{{ __('Enter Serial Number') }}">
                <p id="editErr_serial_number" class="mt-1 mb-0 text-danger em"></p>
              </div>
            </div>
          </div>
          <p class="text-warning ml-2 mb-0">
            <small>{{ __('The higher the serial number is, the later the  item will be shown.') }}</small>
          </p>
        </form>
      </div> --}}
      <div class="modal-body">
        <form id="ajaxEditForm" class="modal-form" action="{{ route('user.gallery_management.update_item') }}"
          method="POST">
          @csrf
          <input type="hidden" id="in_id" name="id">
          <div class="form-group">
            <div class="d-sm-inline mr-5">
              <input type="radio" class="mr-1 editItemRadioBtn" id="imgOption" name="edit_item_type" value="image">
              <label for="">{{ $keywords['Image'] ?? __('Image') }}</label>
            </div>
            <div class="d-sm-inline">
              <input type="radio" class="mr-1 editItemRadioBtn" id="vidOption" name="edit_item_type" value="video">
              <label for="">{{ $keywords['Video'] ?? __('Video') }}</label>
            </div>
          </div>
          <div class="form-group">
            <div class="col-12 mb-2">
              <label for="">{{ $keywords['Image'] ?? __('Image*') }}</label>
            </div>
            <div class="col-md-12 showImage mb-3">
              <img src="#" alt="..." class="in_image img-thumbnail">
            </div>
            <input type="file" name="image" id="image" class="form-control image">
            @if ($errors->has('image'))
              <p class="mt-2 mb-0 text-danger">{{ $errors->first('image') }}</p>
            @endif
          </div>
          <div class="form-group" id="editVideo-input">
            <label for="">{{ __('Video Link*') }}</label>
            <input type="url" id="in_video_link" class="form-control ltr" name="video_link"
              placeholder="{{ __('Enter Video Link') }}">
            <p id="editErr_video_link" class="mt-1 mb-0 text-danger em"></p>
            <p class="text-warning mt-2 mb-0">
              <small>{{ $keywords['Video_Link_Text'] ?? __('Link will be formatted automatically after submitting the form.') }}</small>
            </p>
          </div>
          @if ($userBs->gallery_category_status == 1)
            <div class="form-group">
              <label for="in_gallery_category_id">{{ $keywords['Category'] ?? __('Category*') }}</label>
              <select name="gallery_category_id" id="in_gallery_category_id" class="form-control">
                <option disabled>{{ $keywords['Select_a_Category'] ?? __('Select a Category') }}
                </option>
              </select>
            </div>
          @endif
          <div class="row no-gutters">
            <div class="col-lg-6">
              <div class="form-group">
                <label for="">{{ $keywords['Title'] ?? __('Title*') }}</label>
                <input type="text" id="in_title" class="form-control" name="title"
                  placeholder="{{ $keywords['Enter_Title'] ?? __('Enter Title') }}">
                <p id="editErr_title" class="mt-1 mb-0 text-danger em"></p>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label for="">{{ $keywords['Serial_Number'] ?? __('Serial Number*') }}</label>
                <input type="number" id="in_serial_number" class="form-control ltr" name="serial_number"
                  placeholder="{{ $keywords['Enter_Serial_Number'] ?? __('Enter Serial Number') }}">
                <p id="editErr_serial_number" class="mt-1 mb-0 text-danger em"></p>
              </div>
            </div>
          </div>
          <p class="text-warning ml-2 mb-0">
            <small>{{ $keywords['Serial_Number_Text'] ?? __('*The higher the serial number is, the later the  item will be shown.') }}</small>
          </p>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">
          {{ __('Close') }}
        </button>
        <button id="updateBtn" type="button" class="btn btn-primary">
          {{ __('Update') }}
        </button>
      </div>
    </div>
  </div>
</div>
