<div class="modal fade" id="addTextModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add_Text') }}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            <div class="modal-body">
                <form action="{{ route('user.course_management.lesson.store_text', ['id' => $lesson->id]) }}"
                    method="POST" id="textForm">
                    @csrf
                    <div class="form-group {{ $language->rtl == 1 ? 'rtl text-right' : '' }}">
                        <textarea name="text" class="form-control summernote" placeholder="Enter Text" data-height="300"></textarea>
                        <p class="em text-danger mt-2 mb-0 ltr text-left" id="err_text"></p>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">
                    {{ __('Close') }}
                </button>
                <button type="button" class="btn btn-sm btn-primary" id="textSubmitBtn">
                    {{ __('Save') }}
                </button>
            </div>
        </div>
    </div>
</div>
