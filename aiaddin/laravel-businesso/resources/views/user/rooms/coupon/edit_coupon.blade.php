<div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Edit_Coupon') }}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            <div class="modal-body">
                <form id="ajaxEditForm" class="modal-form" action="{{ route('user.rooms_management.update_coupon') }}"
                    method="post">
                    @csrf
                    <input type="hidden" id="in_id" name="id">

                    <div class="row no-gutters">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Name') }} * </label>
                                <input type="text" id="in_name" class="form-control" name="name"
                                    placeholder="{{ __('Enter_Coupon_Name') }}">
                                <p id="Eerr_name" class="mt-2 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Code') . '*' }}</label>
                                <input type="text" id="in_code" class="form-control" name="code"
                                    placeholder="{{ __('Enter_Coupon_Code') }}">
                                <p id="Eerr_code" class="mt-2 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Coupon_Type') . '*' }}</label>
                                <select name="type" id="in_type" class="form-control">
                                    <option disabled>{{ __('Select_a_Type') }}</option>
                                    <option value="fixed">{{ __('Fixed') }}</option>
                                    <option value="percentage">{{ __('Percentage') }}
                                    </option>
                                </select>
                                <p id="Eerr_type" class="mt-2 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Value') . '*' }}</label>
                                <input type="number" step="0.01" id="in_value" class="form-control" name="value"
                                    placeholder="{{ __('Enter_Coupon_Value') }}">
                                <p id="Eerr_value" class="mt-2 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Start_Date') . '*' }}</label>
                                <input type="text" id="in_start_date" class="form-control datepicker"
                                    name="start_date" placeholder="{{ __('Enter_Start_Date') }}">
                                <p id="Eerr_start_date" class="mt-2 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('End_Date') . '*' }}</label>
                                <input type="text" id="in_end_date" class="form-control datepicker" name="end_date"
                                    placeholder="{{ __('Enter_End_Date') }}">
                                <p id="Eerr_end_date" class="mt-2 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Serial_Number') . '*' }}</label>
                                <input type="number" id="in_serial_number" class="form-control" name="serial_number"
                                    placeholder="{{ __('Enter_Serial_Number') }}">
                                <p id="Eerr_serial_number" class="mt-2 mb-0 text-danger em"></p>
                                <p class="text-warning mt-2 mb-0">
                                    <small>{{ __('coupom_serial_number_text') }}</small>
                                </p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __('Rooms') }}</label>
                                <select name="rooms[]" class="form-control select2" multiple="multiple"
                                    id="in_rooms">
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
                <button id="updateBtn" type="button" class="btn btn-primary btn-sm">
                    {{ __('Update') }}
                </button>
            </div>
        </div>
    </div>
</div>
