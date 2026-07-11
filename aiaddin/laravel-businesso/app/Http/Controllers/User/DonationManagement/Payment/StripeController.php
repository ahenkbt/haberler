<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Http\Controllers\Front\DonationManagement\DonationController;
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
    public function donationProcess(Request $request, $causeId, $userId)
    {
        // card validation start
        $rules = [
            // 'card_number' => 'required',
            // 'cvc_number' => 'required',
            // 'expiry_month' => 'required',
            'stripeToken' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }
        // card validation end
        $amount = (int) $request->amount;
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // changing the currency before redirect to Stripe
        if ($currencyInfo->base_currency_text !== 'USD') {
            $rate = floatval($currencyInfo->base_currency_rate);
            $convertedTotal = round(($amount / $rate), 2);
        }

        $stripeTotal = $currencyInfo->base_currency_text === 'USD' ? $amount : $convertedTotal;

        $arrData = array(
            'name' => empty($request["checkbox"]) ? $request["name"] : "anonymous",
            'email' => empty($request["checkbox"]) ? $request["email"] : "anoymous",
            'phone' => empty($request["checkbox"]) ? $request["phone"] : "anoymous",
            'causeId' => $causeId,
            'amount' => $amount,
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
                    $cause = new DonationController();
                    // store the course enrolment information in database
                    $donationDetails = $cause->store($arrData, $userId);

                    // generate an invoice in pdf format
                    $invoice = $cause->generateInvoice($donationDetails,  $userId);

                    // then, update the invoice field info in database
                    $donationDetails->update(['invoice' => $invoice]);
                    if ($donationDetails->email) {
                        // send a mail to the customer with the invoice
                        $cause->sendMail($donationDetails, $userId);
                    }
                    return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
                } else {
                    return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
                }
            } catch (CardErrorException $e) {
                session()->flash('error', $e->getMessage());

                return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
            }
        } catch (UnauthorizedException $e) {
            session()->flash('error', $e->getMessage());
            return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        }
    }
}
