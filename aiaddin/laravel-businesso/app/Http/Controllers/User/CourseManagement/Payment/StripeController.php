<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Cartalyst\Stripe\Exception\CardErrorException;
use Cartalyst\Stripe\Exception\UnauthorizedException;
use Cartalyst\Stripe\Laravel\Facades\Stripe;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Validator;

class StripeController extends Controller
{
    use MiscellaneousTrait;
    public function enrolmentProcess(Request $request, $courseId, $userId)
    {
        // card validation start
        $rules = [
            'stripeToken' => 'required',
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }
        // card validation end

        $enrol = new EnrolmentController();

        // do calculation
        $calculatedData = $enrol->calculation($request, $courseId, $userId);

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // changing the currency before redirect to Stripe
        if ($currencyInfo->base_currency_text !== 'USD') {
            $rate = floatval($currencyInfo->base_currency_rate);
            $convertedTotal = round(($calculatedData['grandTotal'] / $rate), 2);
        }

        $stripeTotal = $currencyInfo->base_currency_text === 'USD' ? $calculatedData['grandTotal'] : $convertedTotal;

        $arrData = array(
            'courseId' => $courseId,
            'coursePrice' => $calculatedData['coursePrice'],
            'discount' => $calculatedData['discount'],
            'grandTotal' => $calculatedData['grandTotal'],
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => 'Stripe',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        try {
            // initialize stripe
            $stripe = new Stripe();
            $data = UserPaymentGeteway::query()
                ->where('keyword', 'stripe')
                ->where('user_id', $userId)
                ->first();
            $stripeData = json_decode($data->information, true);

            $secret = $stripeData['secret'];
            $key = $stripeData['key'];
            config([
                // in case you would like to overwrite values inside config/services.php
                'services.stripe.secret' => $secret,
                'services.stripe.key' => $key,
            ]);
            $stripe = Stripe::make(Config::get('services.stripe.secret'));

            try {
                // generate token
                $token = $request['stripeToken'];
                if (!isset($token)) {
                    return back()->with('error', 'Token Problem With Your Token.');
                }
                // generate charge
                $charge = $stripe->charges()->create([
                    'card' => $token,
                    'currency' => 'USD',
                    'amount' => $stripeTotal
                ]);

                if ($charge['status'] == 'succeeded') {
                    // store the course enrolment information in database
                    $enrolmentInfo = $enrol->storeData($arrData, $userId);

                    // generate an invoice in pdf format
                    $invoice = $enrol->generateInvoice($enrolmentInfo, $courseId, $userId);

                    // then, update the invoice field info in database
                    $enrolmentInfo->update(['invoice' => $invoice]);

                    // send a mail to the customer with the invoice
                    $enrol->sendMail($enrolmentInfo, $userId);

                    return redirect()->route('front.user.course_enrolment.complete', [getParam(), 'id' => $courseId]);
                } else {
                    return redirect()->route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
                }
            } catch (CardErrorException $e) {
                session()->flash('error', $e->getMessage());

                return redirect()->route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
            }
        } catch (UnauthorizedException $e) {
            session()->flash('error', $e->getMessage());
            return redirect()->route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
        }
    }
}
