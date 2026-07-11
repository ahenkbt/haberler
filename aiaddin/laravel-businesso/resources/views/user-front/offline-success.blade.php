<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Success!</title>
    <link rel="stylesheet" type="text/css" href="{{ asset('assets/front/css/plugin.min.css') }}" />
    <link rel="stylesheet" type="text/css" href="{{ asset('assets/front/css/success.css') }}" />
    <!-- base color change -->
    <link href="{{ asset('assets/front/css/style-base-color.php') . '?color=' . $bs->base_color }}" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('assets/front/css/cookie-alert.css') }}">

</head>

<body>
    <div class="container">
        <div class="row">
            <div class="col-md-6 mx-auto" id="mt">
                <div class="payment">
                    <div class="payment_header">
                        <div class="check">
                            <i class="fa fa-check" aria-hidden="true"></i>
                        </div>
                    </div>
                    <div class="content">
                        <h1>{{ __('Success') }}</h1>
                        @if (isset($request))
                            <p class="paragraph-text">
                                {{ $keywords['user_offline_payment_success_text'] ?? '' }}
                            </p>
                            <a
                                href="{{ route('front.user.detail.view', getParam()) }}">{{ $keywords['Go_to_Home'] ?? __('Go to Home') }}</a>
                        @else
                            <p class="paragraph-text">
                                {{ $keywords['tenant_offline_payment_success_text'] ?? '' }}
                            </p>
                            <a
                                href="{{ route('customer.dashboard', getParam()) }}">{{ $keywords['Go_to_Dashboard'] ?? 'Go to Dashboard' }}</a>
                        @endif
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>

</html>
