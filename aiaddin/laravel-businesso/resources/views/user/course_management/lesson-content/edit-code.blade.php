<div class="modal fade" id="editCodeModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Edit_Code') }}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            <div class="modal-body">
                <form action="{{ route('user.course_management.lesson.update_code') }}" method="POST"
                    id="editCodeForm">

                    @csrf
                    <input type="hidden" id="incontent_id" name="id">

                    <div class="form-group">
                        <textarea name="code" class="form-control" placeholder="{{ __('Enter_Code') }}" rows="15" id="incode"></textarea>
                        <p class="em text-danger mt-2 mb-0" id="editErr_code"></p>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">
                    {{ __('Close') }}
                </button>
                <button type="button" class="btn btn-sm btn-primary" id="codeUpdateBtn">
                    {{ __('Update') }}
                </button>
            </div>
        </div>
    </div>
</div>
