    @php
        $langDirection = $be->default_language_direction;
        if(request()->has('language')) {
            $language = \App\Models\Language::where('code', request('language'))->first();
            if($language) {
                $langDirection = $language->rtl;
            }
        }
        if($langDirection == 1) {
            $langDirection = 'rtl';
        } else {
            $langDirection = 'ltr';
        }
    @endphp
    <div class="modal fade" id="addModalTenantDashboardKeyword" tabindex="-1" role="dialog"
        aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="exampleModalLongTitle">{{ __('Add User Dashboard Keyword') }}</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>

                <div class="modal-body">
                    <form id="userAddKeyword" action="{{ route('admin.language.add_keyword.user.dashboard') }}"
                        method="POST">
                        @csrf
                        <div class="form-group">
                            <label for="">{{ __('Keyword') . ' **' }}</label>
                            <input type="text" class="form-control {{ $langDirection }}" name="user_keyword"
                                placeholder="{{ __('Enter Keyword') }}">
                            <p id="erruser_keyword" class="mt-1 mb-0 text-danger em"></p>
                        </div>
                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">
                        {{ __('Close') }}
                    </button>
                    <button data-form="userAddKeyword" type="submit" class="submitBtn btn btn-primary btn-sm">
                        {{ __('Submit') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
