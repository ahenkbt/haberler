<div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Update_FAQ') }}
                </h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            <div class="modal-body">
                <form id="ajaxEditForm" class="modal-form" action="{{ route('user.faq_management.update_faq') }}"
                    method="post">
                    @csrf
                    <input type="hidden" name="faq_id" id="in_id">

                    <div class="form-group">
                        <label for="">{{ __('Question') }}*</label>
                        <input type="text" id="in_question" class="form-control" name="question"
                            placeholder="{{ __('Enter_Question') }}">
                        <p id="eerrquestion" class="mt-1 mb-0 text-danger em"></p>
                    </div>

                    <div class="form-group">
                        <label for="">{{ __('Answer') }} *</label>
                        <textarea class="form-control" id="in_answer" name="answer" rows="5" cols="80"
                            placeholder="{{ __('Enter_Answer') }}"></textarea>
                        <p id="eerranswer" class="mt-1 mb-0 text-danger em"></p>
                    </div>

                    @if (
                        $userBs->theme == 'home_three' ||
                            $userBs->theme == 'home_four' ||
                            $userBs->theme == 'home_five' ||
                            $userBs->theme == 'home_seven')
                        <div class="form-group">
                            <label>{{ __('Featured') }}</label>
                            <div class="selectgroup w-100">
                                <label class="selectgroup-item">
                                    <input type="radio" name="featured" value="1" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('Yes') }} </span>
                                </label>
                                <label class="selectgroup-item">
                                    <input type="radio" name="featured" value="0" class="selectgroup-input">
                                    <span class="selectgroup-button">{{ __('No') }} </span>
                                </label>
                            </div>
                        </div>
                    @endif

                    <div class="form-group">
                        <label for="">{{ __('Serial_Number') }}*</label>
                        <input type="number" id="in_serial_number" class="form-control" name="serial_number"
                            placeholder="{{ __('Enter_FAQ_Serial_Number') }}">
                        <p id="eerrserial_number" class="mt-1 mb-0 text-danger em"></p>
                        <p class="text-warning mt-2">
                            <small>{{ __('Faq_Serial_Number_text') }}</small>
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
