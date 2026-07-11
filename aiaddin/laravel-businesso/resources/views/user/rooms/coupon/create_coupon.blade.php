<div class="modal fade" id="createModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add_Coupon') }}
                </h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            <div class="modal-body">
                <form id="ajaxForm" class="modal-form" action="{{ route('user.rooms_management.store_coupon') }}"
                    method="post">
                    @csrf
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Name') }} *</label>
                                <input type="text" class="form-control" name="name"
                                    placeholder="{{ __('Enter_Coupon_Name') }}">
                                <p id="errname" class="mt-2 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Code') . '*' }}</label>
                                <input type="text" class="form-control" name="code"
                                    placeholder="{{ __('Enter_Coupon_Code') }}">
                                <p id="errcode" class="mt-2 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Coupon_Type') . '*' }}</label>
                                <select name="type" class="form-control">
                                    <option selected disabled>{{ __('Select_a_Type') }}
                                    </option>
                                    <option value="fixed">{{ __('Fixed') }}</option>
                                    <option value="percentage">{{ __('Percentage') }}
                                    </option>
                                </select>
                                <p id="errtype" class="mt-2 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Value') . '*' }}</label>
                                <input type="number" step="0.01" class="form-control" name="value"
                                    placeholder="{{ __('Enter_Coupon_Value') }}">
                                <p id="errvalue" class="mt-2 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Start_Date') . '*' }}</label>
                                <input type="text" class="form-control datepicker" name="start_date"
                                    placeholder="{{ __('Enter_Start_Date') }}">
                                <p id="errstart_date" class="mt-2 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('End_Date') . '*' }}</label>
                                <input type="text" class="form-control datepicker" name="end_date"
                                    placeholder="{{ __('Enter_End_Date') }}">
                                <p id="errend_date" class="mt-2 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Serial_Number') . '*' }}</label>
                                <input type="number" class="form-control" name="serial_number"
                                    placeholder="{{ __('Enter_Serial_Number') }}">
                                <p id="errserial_number" class="mt-2 mb-0 text-danger em"></p>
                                <p class="text-warning mt-2 mb-0">
                                    <small>{{ __('coupom_serial_number_text') }}</small>
                                </p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Rooms') }}</label>
                                <select name="rooms[]" class="form-control select2" multiple="multiple">
                                    @foreach ($rooms as $room)
                                        <option value="{{ $room->id }}">
                                            {{ $room->title }}
                                        </option>
                                    @endforeach
                                </select>
                                <p class="text-warning mt-2 mb-0">
                                    <small>
                                        {{ __('This_coupon_can_be_applied_to_this_room') }}<br>
                                        {{ __('Leave_this_field_empty_for_all_rooms') }}
                                    </small>
                                </p>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">
                    {{ __('Close') }}
                </button>
                <button id="submitBtn" type="button" class="btn btn-primary btn-sm">
                    {{ __('Save') }}
                </button>
            </div>
        </div>
    </div>
</div>
