<!-- Create Project Modal -->
<div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
  aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Edit_vCard_Project') }}</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">

        <form id="ajaxEditForm" enctype="multipart/form-data" class="modal-form"
          action="{{ route('user.vcard.projectUpdate') }}" method="POST">
          @csrf
          <input id="inproject_id" type="hidden" name="project_id">
          <div class="row">
            <div class="col-lg-12">
              <div class="form-group">
                <div class="col-12 mb-2">
                  <label for="image"><strong>{{ __('Image') }}*</strong></label>
                </div>
                <div class="col-md-12 showImage mb-3">
                  <img id="inimage" src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..."
                    class="img-thumbnail image">
                </div>
                <input type="file" name="image" id="image" class="form-control">
                <p id="eerrimage" class="mb-0 text-danger em"></p>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label for="">{{ __('Title') }} **</label>
            <input id="intitle" type="text" class="form-control {{ $vcard->direction == 2 ? 'rtl' : '' }}"
              name="title" placeholder="{{ __('Enter_title') }}" value="">
            <p id="eerrtitle" class="mb-0 text-danger em"></p>
          </div>

          <div id="editApp">
            <div class="form-group">
              <label class="form-label">{{ __('External_Link_Status') }} **</label>
              <div class="selectgroup w-100">
                <label class="selectgroup-item">
                  <input type="radio" name="external_link_status" value="1" class="selectgroup-input elstatus"
                    data-short_details_id="eshortDetails" data-ext_link_id="eextLink">
                  <span class="selectgroup-button">{{ __('Active') }}</span>
                </label>
                <label class="selectgroup-item">
                  <input type="radio" name="external_link_status" value="0" class="selectgroup-input elstatus"
                    data-short_details_id="eshortDetails" data-ext_link_id="eextLink">
                  <span class="selectgroup-button">{{ __('Deactive') }}</span>
                </label>
              </div>
            </div>
            <div class="form-group" id="eextLink" style="display: none;">
              <label for="">{{ __('External_Link') }}</label>
              <input type="text" id="inexternal_link" class="form-control" name="external_link">
              <p class="text-warning mb-0">{{ __('External_Link_Text') }}</p>
              <p id="errexternal_link" class="mb-0 text-danger em"></p>
            </div>
            <div class="form-group" id="eshortDetails" style="display: none;">
              <label for="">{{ __('Short_Details') }}</label>
              <textarea id="inshort_details" class="form-control {{ $vcard->direction == 2 ? 'rtl' : '' }}" name="short_details"
                rows="4" cols="80" placeholder="{{ __('Enter_short_details') }}"></textarea>
              <p class="text-warning mb-0">{{ __('External_Link_Text') }}</p>
              <p id="eerrshort_details" class="mb-0 text-danger em"></p>
            </div>
          </div>

          <div class="form-group">
            <label for="">{{ __('Serial_Number') }} **</label>
            <input id="inserial_number" type="number" class="form-control" name="serial_number" value=""
              placeholder="{{ __('Enter_Serial_Number') }}">
            <p id="eerrserial_number" class="mb-0 text-danger em"></p>
            <p class="text-warning mb-0"><small>{{ __('project_serial_numer_msg') }}.</small></p>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">{{ __('Close') }}</button>
        <button id="updateBtn" type="button" class="btn btn-primary">{{ __('Update') }}</button>
      </div>
    </div>
  </div>
</div>
