<!-- Modal -->
<div class="modal fade" id="templateImgModal{{ $vcard->id }}" tabindex="-1" role="dialog"
    aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Edit Preview Template') }}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body text-left">
                <form action="{{ route('register.user.vcard.updateTemplate') }}"
                    id="editTemplateForm{{ $vcard->id }}" method="POST" enctype="multipart/form-data">
                    @csrf
                    <input type="hidden" name="vcard_id" value="{{ $vcard->id }}">
                    <div class="form-group">
                        <label for="">{{ __('Preview Image') }} **</label>
                        <div class="col-md-12 showImage mb-3">
                            <img src="{{ asset('assets/front/img/template-previews/vcard/' . $vcard->template_img) }}"
                                alt="..." class="img-thumbnail">
                        </div>
                        <input type="file" name="preview_image" class="image" class="form-control image">
                        <p class="eerrpreview_image mb-0 text-danger em"></p>
                    </div>
                    <div class="form-group">
                        <label for="">{{ __('Template Name') }} **</label>
                        <input type="text" class="form-control" name="template_name"
                            value="{{ $vcard->template_name }}" placeholder="{{ __('Enter Template Name') }}">
                        <p id="eerrtemplate_name" class="mb-0 text-danger em"></p>

                    </div>
                    <div class="form-group">
                        <label>{{ __('Show In Home') }}**</label>
                        <div class="selectgroup w-100">
                            <label class="selectgroup-item">
                                <input type="radio" name="show_in_home" value="1" class="selectgroup-input"
                                    {{ $vcard->show_in_home == 1 ? 'checked' : '' }}>
                                <span class="selectgroup-button">{{ __('Show') }}</span>
                            </label>
                            <label class="selectgroup-item">
                                <input type="radio" name="show_in_home" value="0" class="selectgroup-input"
                                    {{ $vcard->show_in_home == 0 ? 'checked' : '' }}>
                                <span class="selectgroup-button">{{ __('Hide') }}</span>
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="">{{ __('Serial Number') }} **</label>
                        <input type="number" class="form-control" name="serial_number"
                            value="{{ $vcard->template_serial_number }}"
                            placeholder="{{ __('Enter Serial Number') }}">
                        <p class="eerrserial_number mb-0 text-danger em"></p>
                        <p class="text-warning">
                            <small>{{ __('The higher the serial number is, the later the template will be shown.') }}</small>
                        </p>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary update-btn"
                    data-form_id="editTemplateForm{{ $vcard->id }}">{{ __('Update') }}</button>
            </div>
        </div>
    </div>
</div>
