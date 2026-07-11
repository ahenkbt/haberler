<div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">
                    {{ __('Update_Donation_Category') }}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            <div class="modal-body">
                <form id="ajaxEditForm" class="modal-form" action="{{ route('user.donation.category.update') }}"
                    method="post">
                    @csrf
                    <input type="hidden" name="category_id" id="inid">
                    <div class="row">
                        <div class="col-lg-12">
                            <div class="form-group">
                                <div class="col-12 mb-2">
                                    <label for="image"><strong>{{ __('Image') }} * </strong></label>
                                </div>
                                <div class="col-md-12 mb-3 showImage">
                                    <img src="{{ asset('assets/admin/img/noimage.jpg') }}" alt="..." id="inimage"
                                        class="image img-thumbnail img-fluid">
                                </div>
                                <input type="file" name="image" id="image" class="form-control">
                                <p class="text-warning mb-0">{{ __('JPG_PNG_JPEG_SVG_images_are_allowed') }}
                                </p>
                                <p class="em text-danger mb-0" id="errimage"></p>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="">{{ __('Icon') }} * </label>
                        <div class="btn-group d-block">
                            <button type="button" class="btn btn-primary iconpicker-component"><i class=""
                                    id="inicon"></i></button>
                            <button type="button" class="icp1 icp-dd1 btn btn-primary dropdown-toggle"
                                data-selected="fa-car" data-toggle="dropdown"></button>
                            <div class="dropdown-menu"></div>
                        </div>
                        <input type="hidden" id="inputIcon1" name="icon" class="in_icon">
                        <p id="err_icon" class="mt-1 mb-0 text-danger em"></p>
                        <div class="text-warning mt-2">
                            <small>{{ __('Click_on_the_dropdown_icon_to_select_a_icon') }}</small>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="">{{ __('Category_Name') }} * </label>
                        <input type="text" id="inname" class="form-control" name="name"
                            placeholder="{{ __('Enter_Category_Name') }}">
                        <p id="editErr_name" class="mt-1 mb-0 text-danger em"></p>
                    </div>
                    <div class="form-group">
                        <label for="">{{ __('Category_Short_Description') }} * </label>

                        <textarea name="short_description" id="inshort_description" class="form-control"
                            placeholder="{{ __('Enter_Category_Description') }}" rows="3"></textarea>
                        <p id="editErr_short_description" class="mt-1 mb-0 text-danger em"></p>
                    </div>

                    <div class="form-group">
                        <label for="">{{ __('Category_Status') }} * </label>
                        <select name="status" id="instatus" class="form-control">
                            <option disabled>{{ __('Select_a_Status') }}</option>
                            <option value="1">{{ __('Active') }}</option>
                            <option value="0">{{ __('Deactive') }}</option>
                        </select>
                        <p id="editErr_status" class="mt-1 mb-0 text-danger em"></p>
                    </div>
                    @if ($userBs->theme == 'home_eleven')
                        <div class="form-group">
                            <label>{{ __('Featured') }} * </label>
                            <div class="selectgroup w-100">
                                <label class="selectgroup-item">
                                    <input type="radio" name="is_featured" value="1" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Yes') }}</span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="radio" name="is_featured" value="0" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('No') }}</span>
                                </label>
                            </div>
                            <p id="editErr_is_featured" class="mb-0 text-danger em"></p>

                        </div>
                    @endif
                    <div class="form-group">
                        <label for="">{{ __('Category_Serial_Number') }} * </label>
                        <input type="number" id="inserial_number" class="form-control " name="serial_number"
                            placeholder="{{ __('Enter_Category_Serial_Number') }}">
                        <p id="editErr_serial_number" class="mt-1 mb-0 text-danger em"></p>
                        <p class="text-warning mt-2">
                            <small>{{ __('donation_category_serial_number_text') }}</small>
                        </p>
                    </div>
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
