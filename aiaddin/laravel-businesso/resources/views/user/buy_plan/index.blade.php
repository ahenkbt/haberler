@extends('user.layout')
@php
    Config::set('app.timezone', App\Models\BasicSetting::first()->timezone);
@endphp
@section('styles')
    <link rel="stylesheet" href="{{ asset('assets/admin/css/buy_plan.css') }}">
@endsection

@php
    $user = Auth::guard('web')->user();
    $package = \App\Http\Helpers\UserPermissionHelper::currentPackagePermission($user->id);
@endphp

@section('content')
    @if (is_null($package))

        @php
            $pendingMemb = \App\Models\Membership::query()
                ->where([['user_id', '=', Auth::id()], ['status', 0]])
                ->whereYear('start_date', '<>', '9999')
                ->orderBy('id', 'DESC')
                ->first();
            $pendingPackage = isset($pendingMemb)
                ? \App\Models\Package::query()->findOrFail($pendingMemb->package_id)
                : null;
        @endphp

        @if ($pendingPackage)
            <div class="alert alert-warning">
                {{ __('buy_plan_approve_reject_text') . '.' }}
            </div>
            <div class="alert alert-warning">
                <strong> {{ __('Pending_Package') }}: </strong> {{ __($pendingPackage->title) }}
                <span class="badge badge-secondary">{{ __($pendingPackage->term) }}</span>
                <span class="badge badge-warning">{{ __('Decision_Pending') }}</span>
            </div>
        @else
            <div class="alert alert-warning">
                {{ __('membership_expired_text') . '.' }}
            </div>
        @endif
    @else
        <div class="row justify-content-center align-items-center mb-1">
            <div class="col-12">
                <div class="alert border-left border-primary text-dark">
                    @if ($package_count >= 2)
                        @if ($next_membership->status == 0)
                            <strong class="text-danger">{{ __('buy_plan_approve_reject_text') }}.</strong><br>
                        @elseif ($next_membership->status == 1)
                            <strong class="text-danger">{{ __('another_package_activate_msg') }}</strong><br>
                        @endif
                    @endif

                    <strong>{{ __('Current_Package') }}: </strong> {{ __($current_package->title) }}
                    <span class="badge badge-secondary">{{ __($current_package->term) }}</span>
                    @if ($current_membership->is_trial == 1)
                        ({{ __('Expire_Date') }}:
                        {{ Carbon\Carbon::parse($current_membership->expire_date)->format('M-d-Y') }})
                        <span class="badge badge-primary">{{ __('Trial') }}</span>
                    @else
                        ({{ __('Expire_Date') }}:
                        {{ $current_package->term === 'lifetime' ? __('lifetime') : Carbon\Carbon::parse($current_membership->expire_date)->format('M-d-Y') }})
                    @endif

                    @if ($package_count >= 2)
                        <div>
                            <strong>{{ __('Next_Package_To_Activate') }}: </strong> {{ __($next_package->title) }} <span
                                class="badge badge-secondary">{{ __($next_package->term) }}</span>
                            @if ($current_package->term != 'lifetime' && $current_membership->is_trial != 1)
                                (
                                {{ __('Activation_Date') }}:
                                {{ Carbon\Carbon::parse($next_membership->start_date)->format('M-d-Y') }},
                                {{ __('Expire_Date') }}:
                                {{ $next_package->term === 'lifetime' ? __('lifetime') : Carbon\Carbon::parse($next_membership->expire_date)->format('M-d-Y') }})
                            @endif
                            @if ($next_membership->status == 0)
                                <span class="badge badge-warning">{{ __('Decision_Pending') }}</span>
                            @endif
                        </div>
                    @endif
                </div>
            </div>
        </div>
    @endif
    <div class="row mb-5 justify-content-center">
        @foreach ($packages as $key => $package)
            <div class="col-md-3 pr-md-0 mb-5">
                <div class="card-pricing2 @if (isset($current_package->id) && $current_package->id === $package->id) card-success @else card-primary @endif">
                    <div class="pricing-header">
                        <h3 class="fw-bold d-inline-block">
                            {{ __($package->title) }}
                        </h3>
                        @if (isset($current_package->id) && $current_package->id === $package->id)
                            <h3 class="badge badge-danger d-inline-block float-right ml-2">{{ __('Current') }}</h3>
                        @endif
                        @if ($package_count >= 2 && $next_package->id == $package->id)
                            <h3 class="badge badge-warning d-inline-block float-right ml-2">{{ __('Next') }}</h3>
                        @endif
                        <span class="sub-title"></span>
                    </div>
                    <div class="price-value">
                        <div class="value">
                            <span
                                class="amount">{{ $package->price == 0 ? __('Free') : format_price($package->price) }}</span>
                            <span class="month">/{{ __($package->term) }}</span>
                        </div>
                    </div>

                    <ul class="pricing-content">
                        {{-- ===================== AI SECTION START ===================== --}}
                        @if (is_array($pFeatures) && in_array('One-Click AI Website Setup', $pFeatures))
                            @php

                                $allFeatures = !empty($package->features) ? json_decode($package->features, true) : [];
                                $hasAiFeature =
                                    is_array($allFeatures) && in_array('One-Click AI Website Setup', $allFeatures);

                                $aiEngine = $package->ai_engine ?? null;
                                $aiPages = !empty($package->ai_pages) ? json_decode($package->ai_pages, true) : [];
                                $aiGenerateLimit = $package->ai_generate_limit ?? null;

                                $engineMap = [
                                    'openai' => 'OpenAI',
                                    'gemini' => 'Gemini',
                                    'pollinations' => 'Pollinations',
                                ];

                                $engineName = $aiEngine ? $engineMap[$aiEngine] ?? ucfirst($aiEngine) : null;
                            @endphp

                            @php
                                // ========= Tooltip content build =========
                                $aiTooltip = "<div class='ai-tt'>";
                                $aiTooltip .=
                                    "<div class='ai-tt__title'>" . e(__('One-Click AI Full Site Content')) . '</div>';

                                $aiTooltip .=
                                    "<div class='ai-tt__desc'>" .
                                    e(__('This package includes AI website page generation features')) .
                                    '</div>';

                                if (!empty($engineName)) {
                                    $aiTooltip .= "<div class='ai-tt__sub'>" . e(__('Engine')) . '</div>';
                                    $aiTooltip .= "<div class='ai-tt__pill'>" . e($engineName) . '</div>';
                                }

                                if (!empty($aiGenerateLimit)) {
                                    $aiTooltip .=
                                        "<div class='ai-tt__sub'>" .
                                        e(__('AI Website Content Generation Attempts Limit')) .
                                        '</div>';

                                    if ((int) $aiGenerateLimit === 999999) {
                                        $aiTooltip .= "<div class='ai-tt__pill'>" . e(__('Unlimited')) . '</div>';
                                    } else {
                                        $aiTooltip .= "<div class='ai-tt__pill'>" . e($aiGenerateLimit) . '</div>';
                                    }
                                }

                                if (!empty($aiPages) && is_array($aiPages)) {
                                    $aiTooltip .= "<div class='ai-tt__sub'>" . e(__('Included Pages')) . '</div>';

                                    $aiTooltip .= "<ul class='ai-tt__pages'>";
                                    foreach ($aiPages as $pg) {
                                        $aiTooltip .=
                                            "<li><i class='fas fa-check'></i><span>" . e(__($pg)) . '</span></li>';
                                    }
                                    $aiTooltip .= '</ul>';
                                } else {
                                    $aiTooltip .=
                                        "<div class='ai-tt__desc' style='margin-top:8px;opacity:.85'>No AI pages configured.</div>";
                                }

                                $aiTooltip .= '</div>';
                            @endphp

                            {{-- @if ($hasAiFeature)
                                <li class="ai-hover-wrapper" data-toggle="tooltip" data-placement="top" data-html="true"
                                    data-custom-class="ai-tooltip" data-title="{{ $aiTooltip }}">

                                    @if (!empty($aiEngine))
                                        <span class="ai-icon ai-icon-check"></span>
                                    @else
                                        <span class="ai-icon ai-icon-cross"></span>
                                    @endif

                                    <span class="ai-hover-title">
                                        <span>{{ __('One-Click AI Full Site Content') }}</span>
                                        @if (!empty($engineName))
                                            <span class="ai-engine">({{ __($engineName) }})</span>
                                        @endif
                                        <i class="fas fa-info-circle ai-info"></i>
                                    </span>

                                </li>
                            @endif --}}
                        @endif

                        {{-- ===================== AI SECTION END ======================= --}}
                        <ul class="pricing-content">
                            @php
                                $features = json_decode($package->features, true);
                            @endphp

                            @if (!empty($features))
                                @foreach ($features as $feature)
                                    @continue($feature == 'One-Click AI Website Setup')
                                    <li>{{ __($feature) }}</li>

                                    {{-- AI line after Donation Management --}}
                                    @if ($feature === 'Donation Management' && $hasAiFeature)
                                        <li class="ai-hover-wrapper" data-toggle="tooltip" data-placement="top"
                                            data-html="true" data-custom-class="ai-tooltip"
                                            data-title="{!! $aiTooltip !!}">

                                            @if (!empty($aiEngine))
                                                <span class="ai-icon ai-icon-check"></span>
                                            @else
                                                <span class="ai-icon ai-icon-cross"></span>
                                            @endif

                                            <span class="ai-hover-title">
                                                <span>{{ __('One-Click AI Full Site Content') }}</span>
                                                @if (!empty($engineName))
                                                    <span class="ai-engine">({{ __($engineName) }})</span>
                                                @endif
                                                <i class="fas fa-info-circle ai-info"></i>
                                            </span>
                                        </li>
                                    @endif
                                @endforeach
                            @endif
                            @if (!empty($package->number_of_languages) && $pFeatures && in_array('Additional Language', $pFeatures))
                                <li>
                                    @if ($package->number_of_languages == 999999)
                                        {{ __('Additional Languages') }} {{ '(' . __('Unlimited') . ')' }}
                                    @elseif ($package->number_of_languages > 0)
                                        {{ $package->number_of_languages > 1 ? __('Additional Languages') : __('Additional Language') }}
                                        {{ '(' . $package->number_of_languages . ')' }}
                                    @endif
                                </li>
                            @endif
                        </ul>
                    </ul>
                    @php
                        $hasPendingMemb = \App\Http\Helpers\UserPermissionHelper::hasPendingMembership(Auth::id());
                    @endphp
                    @if ($package_count < 2 && !$hasPendingMemb)
                        <div class="px-4">
                            @if (isset($current_package->id) && $current_package->id === $package->id)
                                @if ($package->term != 'lifetime' || $current_membership->is_trial == 1)
                                    <a href="{{ route('user.plan.extend.checkout', $package->id) . '?language=' . request('language') }}"
                                        class="btn btn-success btn-lg w-75 fw-bold mb-3">{{ __('Extend') }}</a>
                                @endif
                            @else
                                <a href="{{ route('user.plan.extend.checkout', $package->id) . '?language=' . request('language') }}"
                                    class="btn btn-primary btn-block btn-lg fw-bold mb-3">{{ __('Buy_Now') }}</a>
                            @endif
                        </div>
                    @endif
                </div>
            </div>
        @endforeach
    </div>
@endsection
