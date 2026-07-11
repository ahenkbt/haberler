<div class="modal fade" id="addVideoModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add_Video') }}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            <div class="modal-body">
                <form id="video-dropzone" enctype="multipart/form-data" class="dropzone mt-2 mb-0">
                    @csrf
                    <div class="fallback"></div>
                </form>
                <p class="em text-danger mt-3 mb-0" id="err_vid"></p>

                <form action="{{ route('user.course_management.lesson.store_video', ['id' => $lesson->id]) }}"
                    class="d-none" method="POST" id="videoForm">
                    @csrf
                    <div id="video-original-name"></div>
                    <div id="video-unique-name"></div>
                    <div id="video-duration"></div>
                </form>
                <p class="text-warning mb-0">{{ __('Only_mp4_videos_are_allowed') }}</p>
                <p class="em text-danger mt-3 mb-0" id="err_video_content"></p>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">
                    {{ __('Close') }}
                </button>
                <button type="button" class="btn btn-sm btn-primary" id="videoSubmitBtn">
                    {{ __('Save') }}
                </button>
            </div>
        </div>
    </div>
</div>
