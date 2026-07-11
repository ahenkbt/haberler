<!-- Modal -->
<div class="modal fade" id="urlsModal{{ $vcard->id }}" tabindex="-1" role="dialog" aria-labelledby="urlsModalLabel"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="urlsModalLabel">{{ __('vCard URLs') }}
                </h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <ul>
                    <li>
                        @php
                            $pathUrl = env('WEBSITE_HOST') . '/' . $vcard->user->username . '/vcard/' . $vcard->id;
                        @endphp
                        <strong class="mr-2">{{__('Path Based URL')}}:</strong>
                        <a target="_blank" href="//{{ $pathUrl }}">{{ $pathUrl }}</a>
                    </li>
                    @if (cPackageHasSubdomain($vcard->user))
                        <li>
                            @php
                                $subUrl = $vcard->user->username . '.' . env('WEBSITE_HOST') . '/vcard/' . $vcard->id;
                            @endphp
                            <strong class="mr-2">{{__('Subdomain Based URL')}}:</strong>
                            <a target="_blank" href="//{{ $subUrl }}">{{ $subUrl }}</a>
                        </li>
                    @endif
                    @if (cPackageHasCdomain($vcard->user))
                        @php
                            $domUrl = $vcard->user
                                ->custom_domains()
                                ->where('status', 1)
                                ->orderBy('id', 'DESC')
                                ->first();
                        @endphp
                        @if (!empty($domUrl))
                            <li>
                                <strong class="mr-2">{{__('Domain Based URL')}}:</strong>
                                <a target="_blank"
                                    href="//{{ $domUrl->requested_domain }}/vcard/{{ $vcard->id }}">{{ $domUrl->requested_domain }}/vcard/{{ $vcard->id }}</a>
                            </li>
                        @endif
                    @endif
                </ul>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">{{ __('Close') }}</button>
            </div>
        </div>
    </div>
</div>
