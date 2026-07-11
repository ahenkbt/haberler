<?php

namespace App\Http\Controllers\User\Payment;

use Illuminate\Http\Request;
use App\Models\User\UserPackage;
use App\Models\User\BasicSetting;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\RoomBookingController;
use Illuminate\Support\Facades\Config;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Session;
use App\Http\Helpers\UserPermissionHelper;
use Cartalyst\Stripe\Laravel\Facades\Stripe;
use App\Http\Controllers\Front\UserCheckoutController;
use App\Models\User\HotelBooking\RoomBooking;
use App\Traits\MiscellaneousTrait;

class StripeController extends Controller
{
    use MiscellaneousTrait;
    public function __construct()
    {
        //Set Spripe Keys
        $stripe = UserPaymentGeteway::whereKeyword('stripe')->where('user_id', getUser()->id)->first();
        $stripeConf = json_decode($stripe->information, true);
        Config::set('services.stripe.key', $stripeConf["key"]);
        Config::set('services.stripe.secret', $stripeConf["secret"]);
    }

    public function paymentProcess(Request $request, $_amount, $_title, $_success_url, $_cancel_url)
    {
        $keywords = getUserKeywords();
        $title = $_title;
        $price = $_amount;
        $price = round($price, 2);
        $cancel_url = $_cancel_url;
        $user = getUser();

        if ($title == 'Room Booking') {
            $roomBooking = new RoomBookingController();
            $calculatedData = $roomBooking->calculation($request);
            $currencyInfo = MiscellaneousTrait::getCurrencyInfo($user->id);
            
            if ($currencyInfo->base_currency_text !== 'USD') {
                $rate = $currencyInfo->base_currency_rate;
                $convertedTotal = round(($calculatedData['total'] / $rate), 2);
            }

            $price = $currencyInfo->base_currency_text === 'USD' ? $calculatedData['total'] : $convertedTotal;
        }

        Session::put('user_request', $request->all());

        $stripe = Stripe::make(Config::get('services.stripe.secret'));

        $token = $request['stripeToken'];
        if (!isset($token)) {
            return back()->with('error', $keywords['stripe_token_error'] ?? __('Token problem with your payment token.'));
        }
        

        if ($price < .5) {
            $minAmountMsg = $keywords['minimum_amount_error'] ?? __('Amount must be at least {amount} USD.');
            return back()->with('error', str_replace('{amount}', '$0.50', $minAmountMsg));
        }
        $charge = $stripe->charges()->create([
            'card' => $token,
            'currency' =>  "USD",
            'amount' => $price,
            'description' => $title,
        ]);


        if ($charge['status'] == 'succeeded') {

            $txnId = UserPermissionHelper::uniqidReal(8);
            $chargeId = $request->paymentId;

            if ($title == 'Room Booking') {

                $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
                $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
                $information['currency_text'] = $currencyInfo->base_currency_text;
                $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
                $information['method'] = 'Stripe';
                $information['type'] = 'online';
                // store the room booking information in database
                $booking_details = $roomBooking->storeData($request, $information);
                // update the payment status for room booking in database
                $bookingInfo = RoomBooking::findOrFail($booking_details->id);

                $bookingInfo->update(['payment_status' => 1]);

                // generate an invoice in pdf format
                $invoice = $roomBooking->generateInvoice($bookingInfo);

                // update the invoice field information in database
                $bookingInfo->update(['invoice' => $invoice]);

                // send a mail to the customer with an invoice
                $roomBooking->sendMail($bookingInfo);
            } else {

                $order = $this->saveOrder($request, $txnId, $chargeId, 'Completed');
                $order_id = $order->id;
                $this->saveOrderedItems($order_id);
                $this->sendMails($order);
            }


            session()->flash('success', $keywords['successful_payment'] ?? __('successful payment'));
            Session::forget('user_request');
            Session::forget('user_amount');
            Session::forget('user_paypal_payment_id');

            if ($title == 'Room Booking') {
                return redirect()->route('customer.success.page', [getParam(), 'room-booking']);
            }
            return redirect()->route('customer.success.page', [getParam()]);
        }
        return redirect($cancel_url)->with('error', $keywords['invalid_card_info'] ?? __('Please enter valid credit card information.'));
    }
    public function cancelPayment()
    {
        $keywords = getUserKeywords();
        session()->flash('warning', $keywords['cancel_payment'] ?? __('cancel_payment'));
        return redirect()->route('front.user.pricing', getParam());
    }
}
