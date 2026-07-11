<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * Indicates whether the XSRF-TOKEN cookie should be set on the response.
     *
     * @var bool
     */
    protected $addHttpCookie = true;

    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array
     */
    protected $except = [
        '/*paytm/payment-status*',
        '/user/membership/mercadopago/cancel',
        '/user/membership/mercadopago/success',
        '*/user/membership/razorpay/success',
        '*/user/membership/razorpay/cancel',
        '/user/membership/instamojo/cancel',
        '/*flutterwave/success',
        '/user/membership/flutterwave/cancel',
        '/user/membership/mollie/cancel',

        '/membership/paytm/payment-status*',
        '/membership/mercadopago/cancel',
        '/membership/mercadopago/success',
        '/membership/razorpay/success',
        '/membership/razorpay/cancel',
        '/membership/instamojo/cancel',
        '/membership/flutterwave/success',
        '/membership/flutterwave/cancel',
        '/membership/mollie/cancel',
        '/membership/phonepe/success',
        '*/paytabs/success',
        '*/paytabs/notify',
        '*/iyzico/success',
        '*/iyzico/notify',

        '*/room_booking/paytm/notify',
        '*/room_booking/flutterwave/notify',
        '*/room_booking/razorpay/notify',
        '*/room_booking/mercadopago/notify*',
        '*/room_booking/phonepe/notify*',
        '*/item-checkout/phonepe/success*',
        '*/item-checkout/phonepe/cancel*',

        '*/course-enrolment/flutterwave/notify',
        '*/course-enrolment/razorpay/notify',
        '*/course-enrolment/paytm/notify',
        '*/course-enrolment/mercadopago/notify*',
        '*/course-enrolment/phonepe/notify*',

        '*/cause-donation/flutterwave/notify*',
        '*/cause-donation/razorpay/notify',
        '*/cause-donation/paytm/notify',
        '*/cause-donation/phonepe/notify',
    ];
}
