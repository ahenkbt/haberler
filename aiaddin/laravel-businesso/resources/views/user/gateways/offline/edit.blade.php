<div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Edit_Gateway') }}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <form id="ajaxEditForm" class="" action="{{ route('user.gateway.offline.update') }}"
                    method="POST">
                    @csrf
                    <input id="inogateway_id" type="hidden" name="ogateway_id" value="">
                    <div class="form-group">
                        <label for="">{{ __('Name') }} **</label>
                        <input id="inname" type="text" class="form-control" name="name" value=""
                            placeholder="{{ __('Enter_name') }}">
                        <p id="eerrname" class="mb-0 text-danger em"></p>
                    </div>

                    <div class="form-group">
                        <label for="">{{ __('Short_Description') }}</label>
                        <textarea id="inshort_description" class="form-control" name="short_description" rows="3" cols="80"
                            placeholder="{{ __('Enter_short_description') }}"></textarea>
                        <p id="eerrshort_description" class="mb-0 text-danger em"></p>
                    </div>

                    <div class="form-group">
                        <label for="">{{ __('Instructions') }}</label>
                        <textarea id="ininstructions" class="form-control summernote" name="instructions" rows="3" cols="80"
                            placeholder="{{ __('Enter_instructions') }}" data-height="150"></textarea>
                    </div>

                    <div class="row">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>{{ __('Receipt_Image') }} **</label>
                                <div class="selectgroup w-100">
                                    <label class="selectgroup-item">
                                        <input type="radio" name="is_receipt" value="1"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('Active') }}</span>
                                    </label>
                                    <label class="selectgroup-item">
                                        <input type="radio" name="is_receipt" value="0"
                                            class="selectgroup-input">
                                        <span class="selectgroup-button">{{ __('Deactive') }}</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Serial_Number') }} **</label>
                                <input id="inserial_number" type="number" class="form-control" name="serial_number"
                                    value="" placeholder="{{ __('Enter_Serial_Number') }}">
                                <p id="eerrserial_number" class="mb-0 text-danger em"></p>
                                <p class="text-warning"><small>{{ __('offline_gateway_serial_no_text') }}</small></p>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">{{ __('Close') }}</button>
                <button id="updateBtn" type="button" class="btn btn-primary">{{ __('Save_Changes') }}</button>
            </div>
        </div>
    </div>
</div>
