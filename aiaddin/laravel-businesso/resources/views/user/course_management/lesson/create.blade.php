<div class="modal fade" id="createLessonModal-{{ $module->id }}" tabindex="-1" role="dialog"
    aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add_Lesson') }}
                </h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            <div class="modal-body">
                <form id="lessonForm-{{ $module->id }}" class="modal-form"
                    action="{{ route('user.course_management.module.store_lesson', ['id' => $module->id]) }}"
                    method="post" onsubmit="storeLesson(event, {{ $module->id }})">
                    @csrf
                    <div class="form-group">
                        <label for="">{{ __('Title') }} * </label>
                        <input type="text" class="form-control" name="title"
                            placeholder="{{ __('Enter_Lesson_Title') }}">
                        <p id="err_title-{{ $module->id }}" class="mt-1 mb-0 text-danger em"></p>
                    </div>

                    <div class="form-group">
                        <label for="">{{ __('Status') }} * </label>
                        <select name="status" class="form-control">
                            <option selected disabled>
                                {{ __('Select_Lesson_Status') }}</option>
                            <option value="draft">{{ __('Draft') }}</option>
                            <option value="published">{{ __('Published') }}</option>
                        </select>
                        <p id="err_status-{{ $module->id }}" class="mt-1 mb-0 text-danger em"></p>
                    </div>

                    <div class="form-group">
                        <label for="">{{ __('Serial_Number') }} * </label>
                        <input type="number" class="form-control" name="serial_number"
                            placeholder="{{ __('Enter_Lesson_Serial_Number') }}">
                        <p id="err_serial_number-{{ $module->id }}" class="mt-1 mb-0 text-danger em"></p>
                        <p class="text-warning mt-2 mb-0">
                            <small>{{ __('Lesson_Serial_Number_text') }}</small>
                        </p>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">
                    {{ __('Close') }}
                </button>
                <button form="lessonForm-{{ $module->id }}" type="submit" class="btn btn-primary btn-sm">
                    {{ __('Save') }}
                </button>
            </div>
        </div>
    </div>
</div>
