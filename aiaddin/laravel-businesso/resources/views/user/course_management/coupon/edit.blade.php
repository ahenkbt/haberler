<div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">{{  __("Edit_Coupon") }}
                </h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            <div class="modal-body">
                <form id="ajaxEditForm" class="modal-form" action="{{ route('user.course_management.update_coupon') }}"
                    method="post">

                    @csrf
                    <input type="hidden" id="in_id" name="id">

                    <div class="row no-gutters">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __("Name") }} * </label>
                                <input type="text" id="in_name" class="form-control" name="name"
                                    placeholder="{{ __("Enter_Coupon_Name")}}">
                                <p id="Eerr_name" class="mt-1 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __("Code") }} * </label>
                                <input type="text" id="in_code" class="form-control" name="code"
                                    placeholder="{{ __("Enter_Coupon_Code") }}">
                                <p id="Eerr_code" class="mt-1 mb-0 text-danger em"></p>
                            </div>
                        </div>
                    </div>

                    <div class="row no-gutters">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __("Coupon_Type") }} * </label>
                                <select name="type" id="in_type" class="form-control">
                                    <option disabled>{{ __("Select_a_Type") }}</option>
                                    <option value="fixed">{{  __("Fixed")  }}</option>
                                    <option value="percentage">{{ __("Percentage")  }}
                                    </option>
                                </select>
                                <p id="Eerr_type" class="mt-1 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __("Value") }} * </label>
                                <input type="number" step="0.01" id="in_value" class="form-control" name="value"
                                    placeholder="{{ __("Enter_Coupon_Value")}}">
                                <p id="Eerr_value" class="mt-1 mb-0 text-danger em"></p>
                            </div>
                        </div>
                    </div>

                    <div class="row no-gutters">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __("Start_Date") }} * </label>
                                <input type="text" id="in_start_date" class="form-control datepicker"
                                    name="start_date" placeholder="{{ __("Enter_Start_Date")}}">
                                <p id="Eerr_start_date" class="mt-1 mb-0 text-danger em"></p>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="">{{ __("End_Date") }} * </label>
                                <input type="text" id="in_end_date" class="form-control datepicker" name="end_date"
                                    placeholder="{{ __("Enter_End_Date") }}">
                                <p id="Eerr_end_date" class="mt-1 mb-0 text-danger em"></p>
                            </div>
                        </div>
                    </div>
                    <div class="row no-gutters">
                        <div class="col-lg-12">
                            <div class="form-group">
                                <label for="">{{ __("Courses")  }}</label>
                                <select id="in_courses" class="select2" name="courses[]" multiple="multiple"
                                    placeholder="{{ __("Select_Courses") }}">
                                    @foreach ($courses as $course)
                                        @php
                                            $courseInfo = $course
                                                ->courseInformation()
                                                ->where('language_id', $deLang->id)
                                                ->select('title', 'id')
                                                ->first();
                                                if (!$courseInfo) continue;
                                            $title = $courseInfo->title;
                                            $id = $course->id;
                                        @endphp
                                        <option value="{{ $id }}">
                                            {{ $title }}
                                        </option>
                                    @endforeach
                                </select>
                                <p class="mb-0 text-warning">{{__("This_coupon_can_be_applied_to_these_courses") }}</p>
                                <p class="mb-0 text-warning">{{__("Leave_this_field_blank_for_all_courses") }}</p>
                                <p id="Eerr_courses" class="mt-1 mb-0 text-danger em"></p>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">
                     {{ __("Close")  }}
                </button>
                <button id="updateBtn" type="button" class="btn btn-sm btn-primary">
                    {{ __("Save")  }}
                </button>
            </div>
            
        </div>
    </div>
</div>
