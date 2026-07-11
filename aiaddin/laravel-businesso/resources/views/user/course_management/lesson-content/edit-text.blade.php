<div class="modal fade" id="editTextModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Edit_Text') }}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            <div class="modal-body">
                <form action="{{ route('user.course_management.lesson.update_text') }}" method="POST"
                    id="editTextForm">

                    @csrf
                    <input type="hidden" id="inid" name="id">

                    <div class="form-group {{ $language->direction == 1 ? 'rtl text-right' : '' }}">
                        <textarea name="text" class="form-control summernote" placeholder="{{ __('Enter_Text') }}" data-height="300"
                            id="intext"></textarea>
                        <p class="em text-danger mt-2 mb-0" id="editErr_text"></p>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">
                    {{ __('Close') }}
                </button>
                <button type="button" class="btn btn-sm btn-primary" id="textUpdateBtn">
                    {{ __('Update') }}
                </button>
            </div>
        </div>
    </div>
</div>
