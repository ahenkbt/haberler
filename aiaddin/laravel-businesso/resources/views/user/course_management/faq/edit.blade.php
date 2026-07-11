<div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Edit_FAQ') }}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            <div class="modal-body">
                <form id="ajaxEditForm" class="modal-form"
                    action="{{ route('user.course_management.course.update_faq') }}" method="post">

                    @csrf
                    <input type="hidden" id="inid" name="id">

                    <div class="form-group">
                        <label for="">{{ __('Question') }} * </label>
                        <input type="text" id="inquestion" class="form-control" name="question"
                            placeholder="{{ __('Enter_Question') }}">
                        <p id="editErr_question" class="mt-1 mb-0 text-danger em"></p>
                    </div>

                    <div class="form-group">
                        <label for="">{{ __('Answer') }} * </label>
                        <textarea class="form-control" id="inanswer" name="answer" rows="5" cols="80"
                            placeholder="{{ __('Enter_Answer') }}"></textarea>
                        <p id="editErr_answer" class="mt-1 mb-0 text-danger em"></p>
                    </div>

                    <div class="form-group">
                        <label for="">{{ __('Serial_Number') }} * </label>
                        <input type="number" id="inserial_number" class="form-control" name="serial_number"
                            placeholder="{{ __('Enter_FAQ_Serial_Number') }}">
                        <p id="editErr_serial_number" class="mt-1 mb-0 text-danger em"></p>
                        <p class="text-warning mt-2 mb-0">
                            <small>{{ __('Faq_Serial_Number_text') }}</small>
                        </p>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">
                    {{ __('Close') }}
                </button>
                <button id="updateBtn" type="button" class="btn btn-primary btn-sm">
                    {{ __('Update') }}
                </button>
            </div>
        </div>
    </div>
</div>
