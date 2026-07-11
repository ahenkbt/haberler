<?php

namespace App\Http\Controllers\User\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Traits\MiscellaneousTrait;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\HotelBooking\RoomBooking;
use Illuminate\Support\Facades\Session;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Http;

class YocoController extends Controller
{
    public function paymentProcess(Request $request, $_amount, $_title, $_success_url)
    {
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $user = getUser();
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($user->id);
        $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
        $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
        $information['currency_text'] = $currencyInfo->base_currency_text;
        $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
        $information['method'] = 'Yoco';
        $information['type'] = 'online';
        $title = $_title;
        Session::put('user_request', $request->all());
        Session::put('user_amount', $_amount);
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'yoco']])->first();
        $paydata = json_decode($paymentMethod->information, true);
        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $paydata['secret_key'],
        ])->post('https://payments.yoco.com/api/checkouts', [
            'amount' => $_amount * 100,
            'currency' => 'ZAR',
            'successUrl' => $_success_url
        ]);

        $responseData = $response->json();
        if (array_key_exists('redirectUrl', $responseData)) {
            $request->session()->put('yoco_id', $responseData['id']);
            $request->session()->put('s_key', $paydata['secret_key']);
            return redirect($responseData["redirectUrl"]);
        } else {
            if (array_key_exists('title', $request->all()) &&  $request['title'] == "Room Booking") {
                $cancel_url = route('front.user.room_booking.cancel', getParam());
            } else {
                $cancel_url = route('customer.itemcheckout.perfect_money.cancel', getParam());
            }
            return redirect($cancel_url);
        }
    }

    // return to success page
    public function successPayment(Request $request)
    {
        $requestData = Session::get('user_request');
        $keywords = getUserKeywords();

        if (array_key_exists('title', $requestData) &&  $requestData['title'] == "Room Booking") {
            $cancel_url = route('front.user.room_booking.cancel', getParam());
        } else {
            $cancel_url = route('customer.itemcheckout.perfect_money.cancel', getParam());
        }

        $user = getUser();
        $id = Session::get('yoco_id');
        $s_key = Session::get('s_key');
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'yoco']])->first();
        $paydata = json_decode($paymentMethod->information, true);
        if ($id && $paydata['secret_key'] == $s_key) {
            $txnId = $request->transactionId;
            $chargeId = $request->transactionId;

            if (array_key_exists('title', $requestData) && $requestData['title'] == "Room Booking") {

                $bookingId = $request->session()->get('bookingId');
                $bookingInfo = RoomBooking::findOrFail($bookingId);

                $bookingInfo->payment_status = 1;
                $bookingInfo->save();
                $roomBooking = new RoomBookingController();

                // generate an invoice in pdf format
                $invoice = $roomBooking->generateInvoice($bookingInfo);

                // update the invoice field information in database
                $bookingInfo->invoice = $invoice;
                $bookingInfo->save();

                // send a mail to the customer with an invoice
                $roomBooking->sendMail($bookingInfo);
                Session::forget('bookingId');
            } else {


                $order = $this->saveOrder($requestData, $txnId, $chargeId, 'Completed');
                $order_id = $order->id;
                $this->saveOrderedItems($order_id);
                $this->sendMails($order);
            }

            session()->flash('success', $keywords['successful_payment'] ?? __('successful payment'));

            Session::forget('user_request');
            Session::forget('user_amount');
            if (array_key_exists('title', $requestData) && $requestData['title'] == "Room Booking") {
                return redirect()->route('customer.success.page', [getParam(), 'room-booking']);
            }
            return redirect()->route('customer.success.page', [getParam()]);
        } else {

            session()->flash('warning', $keywords['cancel_payment'] ?? __('cancel payment'));
            return redirect($cancel_url);
        }
    }
}
