{{-- room modal --}}
<div class="modal fade" id="roomModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLabel">{{ __('All_Rooms') }}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            <div class="modal-body">
                <form id="roomSelectForm"
                    action="{{ route('user.room_bookings.get_booked_dates') . '?language=' . request('language') }}"
                    method="GET">
                    <div class="row">
                        <div class="col-lg-12">
                            <div class="form-group">
                                <select name="room_id" class="form-control" id="selected-room">
                                    <option selected disabled>{{ __('Select_a_Room') }}
                                    </option>
                                    @foreach ($roomInfos as $roomInfo)
                                        <option value="{{ $roomInfo->room_id }}">{{ $roomInfo->title }}</option>
                                    @endforeach
                                </select>
                                <p id="err_room_id" class="mt-1 mb-0 ml-1 text-danger em"></p>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button type="button" id="roomBookingNextBtn" class="btn btn-sm btn-primary">
                    {{ __('Next') }}
                </button>
            </div>
        </div>
    </div>
</div>
